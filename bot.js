/**
 * ModBot — Node.js (Render ready)
 * Python se convert kiya gaya
 * npm install node-fetch  (ek baar)
 * Start: node bot.js
 */

const fs       = require("fs");
const https    = require("https");
const http     = require("http");

// ── Render ke liye dummy HTTP server (port bind) ──────────────────────────────
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => res.end("ModBot running")).listen(PORT, () =>
  console.log(`HTTP server on port ${PORT}`)
);

// ====== CONFIG ======
const BOT_TOKEN     = process.env.BOT_TOKEN     || "8282366957:AAHbm5b_YSji4d5LWgnxnD8-Iw4SkpiVmD0";
const SUPER_ADMIN_ID = parseInt(process.env.SUPER_ADMIN_ID || "6346250222");
const DATA_FILE     = "bot_data.json";

// ====== DATA ======
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch {}
  }
  return {
    block_words: [
      "sell","selling","buy","purchase","order","available","instock",
      "limitedoffer","discount","offer","cheap","bestprice","price",
      "rate","deal","shop","store","reseller","wholesale","retail",
      "panelsell","panelavailable","toolsell","hacksell",
      "paidhack","freehack","premiumhack","modapk","apksell",
      "serviceavailable","paidservice","cheapservice",
      "dm","dmm","dmme","pm","pmme","inbox","msgme","messageme",
      "contactme","textme","telegramme","whatsappme","callme",
      "reachme","pingme","joinnow","joinfast","clicklink",
      "payment","pay","upi","upiid","gpay","phonepe","paytm",
      "bitcoin","crypto","transfer","sendmoney","cash",
      "advancepayment","fullpayment","onlypayment",
      "promo","promotion","advertise","ads","sponsored",
      "branddeal","collab","collaboration","marketing",
      "boost","growfast","followers","subscribers",
      "increaselikes","increaseviews",
      "earnmoney","makemoney","quickmoney","instantearning",
      "workfromhome","onlinejob","guaranteedincome",
      "noinvestment","proofavailable","screenshotproof","trustedseller",
      "bc","mc","bkl","madarchod","behenchod","chutiya",
      "gandu","lund","lawda","bhosdike","harami",
      "kamine","kutte","saale","randi","randwa",
      "fuck","fucker","shit","bitch","asshole",
      "bastard","dick","pussy","slut",
      "linkinbio","clickhere","visitnow","checkbio",
      "subscribenow","followme","likesharesubscribe",
      "viral","trending","hotdeal","limitedtime",
      "actfast","dontmiss","exclusive",
      "cheapprice","lowestprice","bestdeal",
      "guarantee","moneyback","refund","offerends",
      "todayonly","hurryup","stocklimited",
      "client","customer","dealdone","project",
      "business","agency","service","provider",
      "lelo","khareedlo","bechraha","bechrha",
      "sasta","mehenga","offerhai","jaldilo",
      "msgkaro","dmkaro","contactkaro",
      "paisebhejo","paymentkaro","orderkaro"
    ],
    mute_duration: 2,
    banned_users: []
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let botData = loadData();

// ====== LINK PATTERN ======
const LINK_PATTERN = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|bit\.ly|tinyurl|youtu\.be|instagram\.com|facebook\.com|twitter\.com|x\.com|discord\.gg|wa\.me|whatsapp\.com|[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}\/[^\s]*)/i;

// ====== REACTIONS ======
const NORMAL_REACTIONS    = ["👍","❤️","🔥","🥰","👏","😁","🤔","🎉","🤩","💯","😎","🙏","⚡","🌟","😂"];
const VIOLATION_REACTIONS = ["🤬","🚫","😡","👎","💀","🤦","😤","🙅"];

const RESTRICTION_MESSAGES = [
  "⛔ {name} ka message delete hua! Aisa content allowed nahi hai. {duration} ke liye mute kiya gaya.",
  "🚫 {name}, yeh group ke rules ke khilaf hai! Tumhe {duration} ke liye mute kiya gaya.",
  "❌ Warning! {name} ne prohibited content bheja. {duration} mute.",
  "🔇 {name} ko {duration} ke liye mute kiya gaya. Spam/selling/links allowed nahi!",
  "⚠️ {name} — Rule violation! Message delete + {duration} mute laga diya.",
  "🛑 {name}, links/selling/DM ki permission nahi hai. {duration} mute.",
  "🔕 {name} muted for {duration}. Dobara aisa kiya toh ban hoga!",
  "💢 {name} ka message remove kiya gaya. {duration} tak kuch nahi bol sakte.",
];

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getRestrictionMsg(name, duration) {
  return randomChoice(RESTRICTION_MESSAGES)
    .replace("{name}", name).replace("{duration}", duration);
}

// ====== SPAM TRACKER ======
const userMsgLog = new Map(); // key: "chatId:userId" → [{text, ts}]
const SPAM_WINDOW = 60000; // 1 min ms
const SPAM_THRESH = 2;

function isSpamDuplicate(chatId, userId, text) {
  const key  = `${chatId}:${userId}`;
  const now  = Date.now();
  const norm = text.trim().toLowerCase();
  let   log  = (userMsgLog.get(key) || []).filter(e => now - e.ts < SPAM_WINDOW);
  const cnt  = log.filter(e => e.text === norm).length;
  log.push({ text: norm, ts: now });
  userMsgLog.set(key, log);
  return cnt >= (SPAM_THRESH - 1);
}

// ====== HELPERS ======
function cleanText(t) { return t.replace(/\s+/g, "").toLowerCase(); }
function isBlocked(t) {
  const c = cleanText(t);
  return botData.block_words.some(w => c.includes(w));
}
function hasLink(t) { return LINK_PATTERN.test(t); }
function sleep(ms)  { return new Promise(r => setTimeout(r, ms)); }

function isAtMentionBot(text, botUsername) {
  const t = text.trim();
  if (!t.startsWith("@")) return false;
  const bot  = botUsername.replace(/^@/, "").toLowerCase();
  const last = t.split(/\s+/).at(-1).replace(/^@/, "").toLowerCase();
  return last === bot;
}

// ====== TELEGRAM API ======
function apiCall(method, params = {}) {
  return new Promise((resolve) => {
    const body  = JSON.stringify(params);
    const opts  = {
      hostname: "api.telegram.org",
      path:     `/bot${BOT_TOKEN}/${method}`,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
    });
    req.on("error", () => resolve({}));
    req.write(body);
    req.end();
  });
}

async function getUpdates(offset) {
  const params = { timeout: 30 };
  if (offset != null) params.offset = offset;
  return apiCall("getUpdates", params);
}

async function sendMessage(chatId, text, extra = {}) {
  const r = await apiCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
  return r?.result?.message_id || null;
}

async function deleteMessage(chatId, msgId) {
  await apiCall("deleteMessage", { chat_id: chatId, message_id: msgId });
}

async function editMessage(chatId, msgId, text, extra = {}) {
  await apiCall("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", ...extra });
}

async function answerCallback(id, text = "") {
  await apiCall("answerCallbackQuery", { callback_query_id: id, text });
}

async function sendReaction(chatId, msgId, emoji) {
  await apiCall("setMessageReaction", {
    chat_id: chatId, message_id: msgId,
    reaction: [{ type: "emoji", emoji }]
  });
}

async function muteUser(chatId, userId, minutes) {
  const until = Math.floor(Date.now() / 1000) + minutes * 60;
  await apiCall("restrictChatMember", {
    chat_id: chatId, user_id: userId,
    permissions: { can_send_messages: false, can_send_media_messages: false,
                   can_send_other_messages: false, can_add_web_page_previews: false },
    until_date: until
  });
}

async function unmuteUser(chatId, userId) {
  await apiCall("restrictChatMember", {
    chat_id: chatId, user_id: userId,
    permissions: { can_send_messages: true, can_send_media_messages: true,
                   can_send_other_messages: true, can_add_web_page_previews: true }
  });
}

async function banUser(chatId, userId) {
  await apiCall("banChatMember", { chat_id: chatId, user_id: userId });
}

async function unbanUser(chatId, userId) {
  await apiCall("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
}

async function getChatMember(chatId, userId) {
  const r = await apiCall("getChatMember", { chat_id: chatId, user_id: userId });
  return r?.result || {};
}

async function isAdmin(chatId, userId) {
  if (userId === SUPER_ADMIN_ID) return true;
  try {
    const m = await getChatMember(chatId, userId);
    return ["administrator","creator"].includes(m.status);
  } catch { return false; }
}

async function getBotInfo() {
  const r = await apiCall("getMe");
  return r?.result || {};
}

// ====== MUTE DURATION PARSER ======
function parseMuteDuration(str) {
  if (!str || !str.trim()) return [botData.mute_duration, `${botData.mute_duration} minute(s)`];
  str = str.trim().toLowerCase();
  const pat = /(\d+)\s*(day|days|d|hour|hours|h|min|minute|minutes|m)/g;
  let match, total = 0, parts = [];
  while ((match = pat.exec(str)) !== null) {
    const val  = parseInt(match[1]);
    const unit = match[2];
    if (["day","days","d"].includes(unit))          { total += val*1440; parts.push(`${val} day(s)`); }
    else if (["hour","hours","h"].includes(unit))   { total += val*60;   parts.push(`${val} hour(s)`); }
    else                                             { total += val;      parts.push(`${val} minute(s)`); }
  }
  if (total === 0) {
    if (/^\d+$/.test(str.trim())) { const v = parseInt(str); return [v, `${v} minute(s)`]; }
    return [botData.mute_duration, `${botData.mute_duration} minute(s)`];
  }
  return [total, parts.join(" + ")];
}

// ====== PENDING ACTIONS (private DM flow) ======
const pendingAction = new Map(); // userId → action string

// ====== SUPER ADMIN MENU ======
async function sendSuperAdminMenu(chatId) {
  await sendMessage(chatId,
    "👑 <b>Super Admin Menu</b>\n\n"
    + "Neeche buttons se settings manage karo:\n\n"
    + "Ya group mein yeh commands use karo:\n"
    + "/addword [word] — word block karo\n"
    + "/removeword [word] — word hatao\n"
    + "/listwords — saari list dekho\n"
    + "/setmute [min] — default mute time badlo\n"
    + "/mute [time] — e.g. /mute 2days, /mute 3hours\n"
    + "/unmute [reply] — unmute karo\n"
    + "/ban [reply] — ban karo\n"
    + "/unban [reply] — unban karo\n"
    + "/adminpanel — full panel",
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: "➕ Word Add Karo", callback_data: "menu_addword" },
           { text: "➖ Word Hatao",     callback_data: "menu_removeword" }],
          [{ text: "📋 Words List",    callback_data: "menu_listwords" },
           { text: "⏱️ Mute Time Set", callback_data: "menu_setmute" }],
          [{ text: "⏱️ Mute Info",      callback_data: "menu_muteinfo" }]
        ]
      })
    }
  );
}

// ====== ADMIN PANEL ======
async function sendAdminPanel(chatId) {
  await sendMessage(chatId,
    "🛡️ <b>Admin Panel - ModBot</b>\n\n"
    + "<b>📋 Word Management:</b>\n"
    + "/addword [word] — block word add karo\n"
    + "/removeword [word] — block word hatao\n"
    + "/listwords — saare blocked words dekho\n\n"
    + "<b>⏱️ Mute System:</b>\n"
    + "/setmute [minutes] — default mute time\n"
    + "/mute 2days | /mute 3hours | /mute 10min\n"
    + "/unmute — reply karke unmute karo\n\n"
    + "<b>🔨 Ban System:</b>\n"
    + "/ban — reply karke ban karo\n"
    + "/unban — reply karke unban karo\n\n"
    + "<b>ℹ️ Info:</b>\n"
    + "/info — reply karke user ID dekho\n"
    + "/adminpanel — yeh panel dubara\n"
    + "/muteinfo — current mute duration\n\n"
    + "<b>📌 Note:</b> Ye commands sirf admins ke liye hain."
  );
}

// ====== CALLBACK HANDLER ======
async function handleCallback(cb) {
  const qid    = cb.id;
  const data   = cb.data || "";
  const userId = cb.from?.id;
  const chatId = cb.message?.chat?.id;
  const msgId  = cb.message?.message_id;

  if (userId !== SUPER_ADMIN_ID) {
    await answerCallback(qid, "❌ Sirf super admin ke liye!");
    return;
  }
  await answerCallback(qid);

  if (data === "menu_addword") {
    pendingAction.set(userId, "addword");
    await sendMessage(chatId, "✏️ Ab jo word block karna hai wo bhejo:");
  } else if (data === "menu_removeword") {
    pendingAction.set(userId, "removeword");
    await sendMessage(chatId, "✏️ Jo word hatana hai wo bhejo:");
  } else if (data === "menu_listwords") {
    const words = botData.block_words;
    for (let i = 0; i < words.length; i += 50) {
      await sendMessage(chatId,
        `🔒 <b>Blocked Words (Part ${Math.floor(i/50)+1}):</b>\n` + words.slice(i, i+50).join(", "));
    }
  } else if (data === "menu_setmute") {
    pendingAction.set(userId, "setmute");
    await sendMessage(chatId,
      `⏱️ Current mute: <b>${botData.mute_duration} min</b>\nNaya mute time (minutes mein) bhejo:`);
  } else if (data === "menu_muteinfo") {
    await sendMessage(chatId, `⏱️ Current default mute: <b>${botData.mute_duration} minutes</b>`);
  }
}

// ====== PENDING DM HANDLER ======
async function handlePendingDm(chatId, userId, text) {
  const action = pendingAction.get(userId);
  if (!action) return false;

  if (action === "addword") {
    const w = cleanText(text);
    if (botData.block_words.includes(w)) {
      await sendMessage(chatId, `⚠️ <b>${text}</b> pehle se blocked list mein hai.`);
    } else {
      botData.block_words.push(w);
      saveData(botData);
      await sendMessage(chatId, `✅ Word <b>${text}</b> add ho gaya!`);
    }
  } else if (action === "removeword") {
    const w   = cleanText(text);
    const idx = botData.block_words.indexOf(w);
    if (idx !== -1) {
      botData.block_words.splice(idx, 1);
      saveData(botData);
      await sendMessage(chatId, `✅ Word <b>${text}</b> remove ho gaya!`);
    } else {
      await sendMessage(chatId, `⚠️ <b>${text}</b> list mein nahi tha.`);
    }
  } else if (action === "setmute") {
    if (/^\d+$/.test(text.trim())) {
      botData.mute_duration = parseInt(text.trim());
      saveData(botData);
      await sendMessage(chatId, `✅ Default mute: <b>${botData.mute_duration} minutes</b>`);
    } else {
      await sendMessage(chatId, "❌ Sirf number bhejo (e.g. 5)");
    }
  }

  pendingAction.delete(userId);
  return true;
}

// ====== COMMAND HANDLER ======
async function handleCommand(message, chatId, userId, text) {
  const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();

  if (cmd === "/start") {
    if (userId === SUPER_ADMIN_ID && message.chat.type === "private")
      await sendSuperAdminMenu(chatId);
    return;
  }

  if (cmd === "/info") {
    if (!message.reply_to_message) {
      const m = await sendMessage(chatId, "❗ Kisi message ka reply karke /info likho.");
      await sleep(4000); deleteMessage(chatId, m);
      return;
    }
    const t   = message.reply_to_message.from;
    const un  = t.username ? `@${t.username}` : "N/A";
    const m   = await sendMessage(chatId,
      `👤 <b>User Info:</b>\nName: <b>${t.first_name||"User"}</b>\nUsername: ${un}\nUser ID: <code>${t.id}</code>`);
    await sleep(10000); deleteMessage(chatId, m);
    return;
  }

  // Admin-only aage se
  const admin = await isAdmin(chatId, userId);
  if (!admin) return;

  if (cmd === "/adminpanel") {
    await sendAdminPanel(chatId);

  } else if (cmd === "/addword") {
    const parts = text.split(/\s+/, 2);
    if (parts.length < 2) { await sendMessage(chatId, "❗ Usage: /addword [word]"); return; }
    const w = cleanText(parts[1]);
    if (botData.block_words.includes(w)) {
      await sendMessage(chatId, `⚠️ <b>${parts[1]}</b> pehle se blocked hai.`);
    } else {
      botData.block_words.push(w); saveData(botData);
      await sendMessage(chatId, `✅ <b>${parts[1]}</b> blocked list mein add ho gaya!`);
    }

  } else if (cmd === "/removeword") {
    const parts = text.split(/\s+/, 2);
    if (parts.length < 2) { await sendMessage(chatId, "❗ Usage: /removeword [word]"); return; }
    const w = cleanText(parts[1]);
    const i = botData.block_words.indexOf(w);
    if (i !== -1) { botData.block_words.splice(i,1); saveData(botData);
      await sendMessage(chatId, `✅ <b>${parts[1]}</b> remove ho gaya!`);
    } else { await sendMessage(chatId, `⚠️ <b>${parts[1]}</b> list mein nahi tha.`); }

  } else if (cmd === "/listwords") {
    const words = botData.block_words;
    for (let i = 0; i < words.length; i += 50)
      await sendMessage(chatId,
        `🔒 <b>Blocked Words (Part ${Math.floor(i/50)+1}):</b>\n` + words.slice(i,i+50).join(", "));

  } else if (cmd === "/setmute") {
    const parts = text.split(/\s+/, 2);
    if (parts.length < 2 || !/^\d+$/.test(parts[1])) {
      await sendMessage(chatId, "❗ Usage: /setmute [minutes]"); return;
    }
    botData.mute_duration = parseInt(parts[1]); saveData(botData);
    await sendMessage(chatId, `✅ Default mute: <b>${botData.mute_duration} minutes</b>`);

  } else if (cmd === "/muteinfo") {
    await sendMessage(chatId, `⏱️ Default mute: <b>${botData.mute_duration} minutes</b>`);

  } else if (cmd === "/mute") {
    if (!message.reply_to_message) {
      await sendMessage(chatId, "❗ Kisi message ka reply karke /mute [time] likho.\nExample: /mute 2days");
      return;
    }
    const target = message.reply_to_message.from;
    if (await isAdmin(chatId, target.id)) {
      await sendMessage(chatId, "⛔ Admin ko mute nahi kar sakte!"); return;
    }
    const parts = text.split(/\s+/);
    const [dur, label] = parseMuteDuration(parts.slice(1).join(" "));
    await muteUser(chatId, target.id, dur);
    await sendMessage(chatId, `🔇 <b>${target.first_name||"User"}</b> ko <b>${label}</b> ke liye mute kiya gaya.`);

  } else if (cmd === "/unmute") {
    if (!message.reply_to_message) {
      await sendMessage(chatId, "❗ Kisi message ka reply karke /unmute likho."); return;
    }
    const target = message.reply_to_message.from;
    await unmuteUser(chatId, target.id);
    await sendMessage(chatId, `✅ <b>${target.first_name||"User"}</b> unmute ho gaya!`);

  } else if (cmd === "/ban") {
    if (!message.reply_to_message) {
      await sendMessage(chatId, "❗ Kisi message ka reply karke /ban likho."); return;
    }
    const target = message.reply_to_message.from;
    if (await isAdmin(chatId, target.id)) {
      await sendMessage(chatId, "⛔ Admin ko ban nahi kar sakte!"); return;
    }
    await banUser(chatId, target.id);
    const sid = String(target.id);
    if (!botData.banned_users.includes(sid)) { botData.banned_users.push(sid); saveData(botData); }
    await sendMessage(chatId, `🔨 <b>${target.first_name||"User"}</b> ban ho gaya!`);

  } else if (cmd === "/unban") {
    if (!message.reply_to_message) {
      await sendMessage(chatId, "❗ Kisi message ka reply karke /unban likho."); return;
    }
    const target = message.reply_to_message.from;
    await unbanUser(chatId, target.id);
    const sid = String(target.id);
    const i   = botData.banned_users.indexOf(sid);
    if (i !== -1) { botData.banned_users.splice(i,1); saveData(botData); }
    await sendMessage(chatId, `✅ <b>${target.first_name||"User"}</b> unban ho gaya!`);
  }
}

// ====== VIOLATION HANDLER ======
async function handleViolation(chatId, msgId, userId, name, reason, muteMins = null, muteLabel = null) {
  // Reaction + instant delete (parallel)
  sendReaction(chatId, msgId, randomChoice(VIOLATION_REACTIONS)).catch(() => {});
  await deleteMessage(chatId, msgId);

  if (muteMins) {
    muteUser(chatId, userId, muteMins).catch(() => {});
    const label  = muteLabel || `${muteMins} minute(s)`;
    const warnId = await sendMessage(chatId, getRestrictionMsg(name, label));
    console.log(`[VIOLATION] ${name} (${userId}) | ${reason} | Mute: ${label}`);
    await sleep(5000);
    if (warnId) deleteMessage(chatId, warnId);
  } else {
    const warnId = await sendMessage(chatId, `🚫 <b>${name}</b>, yeh allowed nahi hai. Message delete kiya gaya.`);
    await sleep(4000);
    if (warnId) deleteMessage(chatId, warnId);
  }
}

// ====== MAIN POLLING LOOP ======
async function main() {
  console.log("✅ ModBot is running...");
  const botInfo    = await getBotInfo();
  const BOT_USERNAME = botInfo.username || "";
  const BOT_ID       = botInfo.id;
  console.log(`Bot: @${BOT_USERNAME} (ID: ${BOT_ID})`);

  let lastUpdateId = null;

  while (true) {
    try {
      const res = await getUpdates(lastUpdateId);

      for (const update of (res.result || [])) {
        lastUpdateId = update.update_id + 1;

        // ── Callback ──
        if (update.callback_query) {
          handleCallback(update.callback_query).catch(console.error);
          continue;
        }

        if (!update.message) continue;

        const message   = update.message;
        const chatId    = message.chat.id;
        const chatType  = message.chat.type;
        const user      = message.from || {};
        const userId    = user.id;
        const text      = message.text || message.caption || "";
        const firstName = user.first_name || "User";
        const msgId     = message.message_id;

        // ── Super admin DM ──
        if (chatType === "private" && userId === SUPER_ADMIN_ID) {
          if (!text.startsWith("/")) {
            if (await handlePendingDm(chatId, userId, text)) continue;
          } else {
            handleCommand(message, chatId, userId, text).catch(console.error);
          }
          continue;
        }

        // ── Private non-admin ignore ──
        if (chatType === "private") continue;

        // ── Admin message ──
        if (await isAdmin(chatId, userId)) {
          if (text.startsWith("/"))
            handleCommand(message, chatId, userId, text).catch(console.error);
          continue;
        }

        // ── Forwarded message ──
        if (message.forward_from || message.forward_sender_name ||
            message.forward_from_chat || message.forward_origin) {
          deleteMessage(chatId, msgId);
          const wId = await sendMessage(chatId, `🚫 <b>${firstName}</b>, forwarded messages allowed nahi hain!`);
          console.log(`[FWD DELETE] ${firstName} (${userId})`);
          await sleep(4000);
          if (wId) deleteMessage(chatId, wId);
          continue;
        }

        if (!text) continue;

        // ── Non-admin /info ──
        if (text.startsWith("/")) {
          const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();
          if (cmd === "/info") handleCommand(message, chatId, userId, text).catch(console.error);
          continue;
        }

        // ── Bot mention ──
        if (BOT_USERNAME && isAtMentionBot(text, BOT_USERNAME)) {
          handleViolation(chatId, msgId, userId, firstName, "bot_mention").catch(console.error);
          continue;
        }

        // ── Spam duplicate ──
        if (isSpamDuplicate(chatId, userId, text)) {
          handleViolation(chatId, msgId, userId, firstName, "spam_duplicate", 2, "2 minute(s)").catch(console.error);
          continue;
        }

        // ── Link ──
        if (hasLink(text)) {
          handleViolation(chatId, msgId, userId, firstName, "link_detected",
            botData.mute_duration, `${botData.mute_duration} minute(s)`).catch(console.error);
          continue;
        }

        // ── Blocked word ──
        if (isBlocked(text)) {
          handleViolation(chatId, msgId, userId, firstName, "blocked_word",
            botData.mute_duration, `${botData.mute_duration} minute(s)`).catch(console.error);
          continue;
        }

        // ── Normal — positive reaction ──
        sendReaction(chatId, msgId, randomChoice(NORMAL_REACTIONS)).catch(() => {});
      }

    } catch (e) {
      console.error("Main loop error:", e.message);
      await sleep(5000);
    }
  }
}

main().catch(console.error);
