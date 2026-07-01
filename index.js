const express = require('express');
const fs = require('fs');
const path = require('path');

// ========== CONFIG ==========
const BOT_TOKEN = process.env.BOT_TOKEN || '8282366957:AAEFm71AO2dEXh7lkawP-y4-FnH6hTq7Cy8';
const SUPER_ADMIN_ID = parseInt(process.env.SUPER_ADMIN_ID || '0', 10);
const DATA_FILE = path.join(__dirname, 'bot_data.json');

// ========== DATA PERSISTENCE ==========
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (_) { /* ignore */ }
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

// Ensure "admin" is NOT blocked (user's request)
botData.block_words = botData.block_words.filter(w => w.toLowerCase() !== 'admin');
saveData(botData);

// ========== HELPER FUNCTIONS ==========
function cleanText(text) {
  return text.replace(/\s+/g, '').toLowerCase();
}

function isBlocked(text) {
  const cleaned = cleanText(text);
  return botData.block_words.some(word => cleaned.includes(word));
}

const LINK_PATTERN = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|bit\.ly|tinyurl|youtu\.be\/|instagram\.com|facebook\.com|twitter\.com|x\.com|discord\.gg|wa\.me|whatsapp\.com|[a-zA-Z0-9\-]+\\.[a-zA-Z]{2,}\/[^\s]*)/;
function hasLink(text) {
  return LINK_PATTERN.test(text);
}

function isAtMentionEndingAtBot(text, botUsername) {
  text = text.trim();
  if (!text.startsWith('@')) return false;
  const botUser = botUsername.replace(/^@/, '').toLowerCase();
  const words = text.split(/\s+/);
  if (words.length === 0) return false;
  const lastWord = words[words.length - 1].replace(/^@/, '').toLowerCase();
  return lastWord === botUser;
}

// ========== SPAM DETECTION ==========
const userMessageLog = new Map();
const SPAM_WINDOW = 60; // seconds
const SPAM_THRESHOLD = 2;

function isSpamDuplicate(chatId, userId, text) {
  const key = `${chatId}_${userId}`;
  const now = Date.now() / 1000;
  let entries = userMessageLog.get(key) || [];
  entries = entries.filter(e => now - e.ts < SPAM_WINDOW);
  const sameCount = entries.filter(e => e.text === text.trim().toLowerCase()).length;
  entries.push({ text: text.trim().toLowerCase(), ts: now });
  userMessageLog.set(key, entries);
  return sameCount >= (SPAM_THRESHOLD - 1);
}

// ========== TELEGRAM API CALLS ==========
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function apiCall(method, params = {}) {
  const url = `${API_BASE}/${method}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  };
  const res = await fetch(url, options);
  return res.json();
}

async function sendReaction(chatId, messageId, emoji) {
  try {
    await apiCall('setMessageReaction', {
      chat_id: chatId,
      message_id: messageId,
      reaction: JSON.stringify([{ type: 'emoji', emoji }])
    });
  } catch (_) {}
}

async function deleteMessage(chatId, messageId) {
  try {
    await apiCall('deleteMessage', { chat_id: chatId, message_id: messageId });
  } catch (_) {}
}

async function sendMessage(chatId, text, parseMode = 'HTML', replyMarkup = null) {
  try {
    const params = { chat_id: chatId, text, parse_mode: parseMode };
    if (replyMarkup) params.reply_markup = replyMarkup;
    const result = await apiCall('sendMessage', params);
    return result.ok ? result.result?.message_id : null;
  } catch (_) { return null; }
}

async function editMessageText(chatId, messageId, text, parseMode = 'HTML', replyMarkup = null) {
  try {
    const params = { chat_id: chatId, message_id: messageId, text, parse_mode: parseMode };
    if (replyMarkup) params.reply_markup = replyMarkup;
    await apiCall('editMessageText', params);
  } catch (_) {}
}

async function answerCallback(callbackId, text = '') {
  try {
    await apiCall('answerCallbackQuery', { callback_query_id: callbackId, text });
  } catch (_) {}
}

// ========== MUTE / BAN ==========
function parseMuteDuration(argsStr) {
  if (!argsStr) {
    return { minutes: botData.mute_duration, label: `${botData.mute_duration} minute(s)` };
  }
  const str = argsStr.trim().toLowerCase();
  const pattern = /(\d+)\s*(day|days|d|hour|hours|h|min|minute|minutes|m)/g;
  let match;
  let totalMinutes = 0;
  const parts = [];
  while ((match = pattern.exec(str)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2];
    if (['day', 'days', 'd'].includes(unit)) {
      totalMinutes += val * 1440;
      parts.push(`${val} day(s)`);
    } else if (['hour', 'hours', 'h'].includes(unit)) {
      totalMinutes += val * 60;
      parts.push(`${val} hour(s)`);
    } else {
      totalMinutes += val;
      parts.push(`${val} minute(s)`);
    }
  }
  if (parts.length === 0 && /^\d+$/.test(str)) {
    totalMinutes = parseInt(str, 10);
    parts.push(`${totalMinutes} minute(s)`);
  }
  if (parts.length === 0) {
    return { minutes: botData.mute_duration, label: `${botData.mute_duration} minute(s)` };
  }
  return { minutes: totalMinutes, label: parts.join(' + ') };
}

async function muteUser(chatId, userId, minutes) {
  const until = Math.floor(Date.now() / 1000) + minutes * 60;
  try {
    await apiCall('restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      permissions: JSON.stringify({
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      }),
      until_date: until
    });
  } catch (_) {}
}

async function unmuteUser(chatId, userId) {
  try {
    await apiCall('restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      permissions: JSON.stringify({
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      })
    });
  } catch (_) {}
}

async function banUser(chatId, userId) {
  try {
    await apiCall('banChatMember', { chat_id: chatId, user_id: userId });
  } catch (_) {}
}

async function unbanUser(chatId, userId) {
  try {
    await apiCall('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
  } catch (_) {}
}

async function getChatMember(chatId, userId) {
  try {
    const res = await apiCall('getChatMember', { chat_id: chatId, user_id: userId });
    return res.ok ? res.result : {};
  } catch (_) { return {}; }
}

async function isAdmin(chatId, userId) {
  if (userId === SUPER_ADMIN_ID) return true;
  const member = await getChatMember(chatId, userId);
  return ['administrator', 'creator'].includes(member.status);
}

async function getBotInfo() {
  const res = await apiCall('getMe');
  return res.ok ? res.result : {};
}

// ========== RESTRICTION MESSAGES ==========
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

function getRandomRestrictionMsg(name, label) {
  const template = RESTRICTION_MESSAGES[Math.floor(Math.random() * RESTRICTION_MESSAGES.length)];
  return template.replace(/{name}/g, name).replace(/{duration}/g, label);
}

// ========== VIOLATION HANDLER ==========
async function handleViolation(chatId, messageId, userId, firstName, reason, muteMinutes = null, muteLabel = null) {
  // Reaction
  try {
    const emojis = ['🤬','🚫','😡','👎','💀','🤦','😤','🙅'];
    await sendReaction(chatId, messageId, emojis[Math.floor(Math.random() * emojis.length)]);
  } catch (_) {}

  // Delete immediately
  await deleteMessage(chatId, messageId);

  if (muteMinutes) {
    await muteUser(chatId, userId, muteMinutes);
    const label = muteLabel || `${muteMinutes} minute(s)`;
    const warnId = await sendMessage(chatId, getRandomRestrictionMsg(firstName, label));
    console.log(`[VIOLATION] ${firstName} (${userId}) | ${reason} | Mute: ${label}`);
    // Auto-delete warning after 5 seconds
    setTimeout(() => {
      if (warnId) deleteMessage(chatId, warnId);
    }, 5000);
  } else {
    const warnId = await sendMessage(chatId, `🚫 <b>${firstName}</b>, yeh allowed nahi hai. Message delete kiya gaya.`);
    setTimeout(() => {
      if (warnId) deleteMessage(chatId, warnId);
    }, 4000);
  }
}

// ========== PENDING ACTIONS (for super admin DM) ==========
const pendingAction = {};

// ========== COMMAND HANDLING ==========
async function handleCommand(message, chatId, userId, text) {
  const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();

  if (cmd === '/start') {
    if (userId === SUPER_ADMIN_ID && message.chat.type === 'private') {
      await sendSuperAdminMenu(chatId);
    }
    return;
  }

  // /info (reply to get user ID)
  if (cmd === '/info') {
    if (!message.reply_to_message) {
      const msgId = await sendMessage(chatId, '❗ Kisi message ka reply karke /info likho.');
      setTimeout(() => { if (msgId) deleteMessage(chatId, msgId); }, 4000);
      return;
    }
    const target = message.reply_to_message.from;
    const targetId = target?.id || 'N/A';
    const targetName = target?.first_name || 'User';
    const targetUname = target?.username ? `@${target.username}` : 'N/A';
    const infoMsg = `👤 <b>User Info:</b>\nName: <b>${targetName}</b>\nUsername: ${targetUname}\nUser ID: <code>${targetId}</code>`;
    const msgId = await sendMessage(chatId, infoMsg);
    setTimeout(() => { if (msgId) deleteMessage(chatId, msgId); }, 10000);
    return;
  }

  // Admin-only commands
  if (!(await isAdmin(chatId, userId))) return;

  switch (cmd) {
    case '/adminpanel':
      await sendAdminPanel(chatId);
      break;
    case '/addword': {
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, '❗ Usage: /addword [word]');
        return;
      }
      const newWord = cleanText(parts.slice(1).join(' '));
      if (botData.block_words.includes(newWord)) {
        await sendMessage(chatId, `⚠️ <b>${parts.slice(1).join(' ')}</b> pehle se blocked hai.`);
      } else {
        botData.block_words.push(newWord);
        saveData(botData);
        await sendMessage(chatId, `✅ <b>${parts.slice(1).join(' ')}</b> blocked list mein add ho gaya!`);
      }
      break;
    }
    case '/removeword': {
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, '❗ Usage: /removeword [word]');
        return;
      }
      const remWord = cleanText(parts.slice(1).join(' '));
      const idx = botData.block_words.indexOf(remWord);
      if (idx !== -1) {
        botData.block_words.splice(idx, 1);
        saveData(botData);
        await sendMessage(chatId, `✅ <b>${parts.slice(1).join(' ')}</b> remove ho gaya!`);
      } else {
        await sendMessage(chatId, `⚠️ <b>${parts.slice(1).join(' ')}</b> list mein nahi tha.`);
      }
      break;
    }
    case '/listwords': {
      const words = botData.block_words;
      const chunks = [];
      for (let i = 0; i < words.length; i += 50) {
        chunks.push(words.slice(i, i + 50));
      }
      for (let i = 0; i < chunks.length; i++) {
        await sendMessage(chatId, `🔒 <b>Blocked Words (Part ${i+1}):</b>\n${chunks[i].join(', ')}`);
      }
      break;
    }
    case '/setmute': {
      const parts = text.split(/\s+/);
      if (parts.length < 2 || !/^\d+$/.test(parts[1])) {
        await sendMessage(chatId, '❗ Usage: /setmute [minutes]');
        return;
      }
      botData.mute_duration = parseInt(parts[1], 10);
      saveData(botData);
      await sendMessage(chatId, `✅ Default mute: <b>${botData.mute_duration} minutes</b>`);
      break;
    }
    case '/muteinfo':
      await sendMessage(chatId, `⏱️ Default mute: <b>${botData.mute_duration} minutes</b>`);
      break;
    case '/mute': {
      if (!message.reply_to_message) {
        await sendMessage(chatId, '❗ Kisi message ka reply karke /mute [time] likho.\nExample: /mute 2days');
        return;
      }
      const target = message.reply_to_message.from;
      const targetId = target.id;
      const targetName = target.first_name || 'User';
      if (await isAdmin(chatId, targetId)) {
        await sendMessage(chatId, '⛔ Admin ko mute nahi kar sakte!');
        return;
      }
      const parts = text.split(/\s+/);
      const argsStr = parts.slice(1).join(' ');
      const { minutes, label } = parseMuteDuration(argsStr);
      await muteUser(chatId, targetId, minutes);
      await sendMessage(chatId, `🔇 <b>${targetName}</b> ko <b>${label}</b> ke liye mute kiya gaya.`);
      break;
    }
    case '/unmute': {
      if (!message.reply_to_message) {
        await sendMessage(chatId, '❗ Kisi message ka reply karke /unmute likho.');
        return;
      }
      const target = message.reply_to_message.from;
      const targetId = target.id;
      const targetName = target.first_name || 'User';
      await unmuteUser(chatId, targetId);
      await sendMessage(chatId, `✅ <b>${targetName}</b> unmute ho gaya!`);
      break;
    }
    case '/ban': {
      if (!message.reply_to_message) {
        await sendMessage(chatId, '❗ Kisi message ka reply karke /ban likho.');
        return;
      }
      const target = message.reply_to_message.from;
      const targetId = target.id;
      const targetName = target.first_name || 'User';
      if (await isAdmin(chatId, targetId)) {
        await sendMessage(chatId, '⛔ Admin ko ban nahi kar sakte!');
        return;
      }
      await banUser(chatId, targetId);
      if (!botData.banned_users.includes(String(targetId))) {
        botData.banned_users.push(String(targetId));
        saveData(botData);
      }
      await sendMessage(chatId, `🔨 <b>${targetName}</b> ban ho gaya!`);
      break;
    }
    case '/unban': {
      if (!message.reply_to_message) {
        await sendMessage(chatId, '❗ Kisi message ka reply karke /unban likho.');
        return;
      }
      const target = message.reply_to_message.from;
      const targetId = target.id;
      const targetName = target.first_name || 'User';
      await unbanUser(chatId, targetId);
      const idx = botData.banned_users.indexOf(String(targetId));
      if (idx !== -1) {
        botData.banned_users.splice(idx, 1);
        saveData(botData);
      }
      await sendMessage(chatId, `✅ <b>${targetName}</b> unban ho gaya!`);
      break;
    }
  }
}

// ========== SUPER ADMIN MENU ==========
async function sendSuperAdminMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '➕ Word Add Karo', callback_data: 'menu_addword' },
       { text: '➖ Word Hatao', callback_data: 'menu_removeword' }],
      [{ text: '📋 Words List', callback_data: 'menu_listwords' },
       { text: '⏱️ Mute Time Set', callback_data: 'menu_setmute' }],
      [{ text: '⏱️ Mute Info', callback_data: 'menu_muteinfo' }]
    ]
  };
  await sendMessage(chatId,
    '👑 <b>Super Admin Menu</b>\n\nNeeche buttons se settings manage karo:\n\nYa group mein yeh commands use karo:\n' +
    '/addword [word] — word block karo\n' +
    '/removeword [word] — word hatao\n' +
    '/listwords — saari list dekho\n' +
    '/setmute [min] — default mute time badlo\n' +
    '/mute [time] — e.g. /mute 2days, /mute 3hours, /mute 10min\n' +
    '/unmute [reply] — unmute karo\n' +
    '/ban [reply] — ban karo\n' +
    '/unban [reply] — unban karo\n' +
    '/adminpanel — full panel',
    'HTML', keyboard
  );
}

async function sendAdminPanel(chatId) {
  const panelText =
    '🛡️ <b>Admin Panel - ModBot</b>\n\n' +
    '<b>📋 Word Management:</b>\n' +
    '/addword [word] — block word add karo\n' +
    '/removeword [word] — block word hatao\n' +
    '/listwords — saare blocked words dekho\n\n' +
    '<b>⏱️ Mute System:</b>\n' +
    '/setmute [minutes] — default mute time\n' +
    '/mute 2days — 2 din ke liye mute\n' +
    '/mute 3hours — 3 ghante ke liye mute\n' +
    '/mute 10min — 10 minute ke liye mute\n' +
    '/mute 1day 2hours — combine bhi kar sakte ho\n' +
    '/unmute — reply karke unmute karo\n\n' +
    '<b>🔨 Ban System:</b>\n' +
    '/ban — reply karke ban karo\n' +
    '/unban — reply karke unban karo\n\n' +
    '<b>ℹ️ Info:</b>\n' +
    '/info — reply karke user ID dekho\n' +
    '/adminpanel — yeh panel dubara\n' +
    '/muteinfo — current mute duration\n\n' +
    '<b>📌 Note:</b> Ye commands sirf admins ke liye hain.';
  await sendMessage(chatId, panelText);
}

// ========== CALLBACK HANDLER ==========
async function handleCallback(callback) {
  const queryId = callback.id;
  const data = callback.data || '';
  const user = callback.from || {};
  const userId = user.id;
  const chatId = callback.message?.chat?.id;
  const msgId = callback.message?.message_id;

  if (userId !== SUPER_ADMIN_ID) {
    await answerCallback(queryId, '❌ Sirf super admin ke liye!');
    return;
  }
  await answerCallback(queryId);

  switch (data) {
    case 'menu_addword':
      pendingAction[userId] = 'addword';
      await sendMessage(chatId, '✏️ Ab jo word block karna hai wo bhejo:');
      break;
    case 'menu_removeword':
      pendingAction[userId] = 'removeword';
      await sendMessage(chatId, '✏️ Jo word hatana hai wo bhejo:');
      break;
    case 'menu_listwords': {
      const words = botData.block_words;
      const chunks = [];
      for (let i = 0; i < words.length; i += 50) {
        chunks.push(words.slice(i, i + 50));
      }
      for (let i = 0; i < chunks.length; i++) {
        await sendMessage(chatId, `🔒 <b>Blocked Words (Part ${i+1}):</b>\n${chunks[i].join(', ')}`);
      }
      break;
    }
    case 'menu_setmute':
      pendingAction[userId] = 'setmute';
      await sendMessage(chatId, `⏱️ Current mute: <b>${botData.mute_duration} min</b>\nNaya mute time (minutes mein) bhejo:`);
      break;
    case 'menu_muteinfo':
      await sendMessage(chatId, `⏱️ Current default mute: <b>${botData.mute_duration} minutes</b>`);
      break;
  }
}

async function handlePendingDm(chatId, userId, text) {
  const action = pendingAction[userId];
  if (!action) return false;

  if (action === 'addword') {
    const newWord = cleanText(text);
    if (botData.block_words.includes(newWord)) {
      await sendMessage(chatId, `⚠️ <b>${text}</b> pehle se blocked list mein hai.`);
    } else {
      botData.block_words.push(newWord);
      saveData(botData);
      await sendMessage(chatId, `✅ Word <b>${text}</b> add ho gaya!`);
    }
    delete pendingAction[userId];
    return true;
  } else if (action === 'removeword') {
    const remWord = cleanText(text);
    const idx = botData.block_words.indexOf(remWord);
    if (idx !== -1) {
      botData.block_words.splice(idx, 1);
      saveData(botData);
      await sendMessage(chatId, `✅ Word <b>${text}</b> remove ho gaya!`);
    } else {
      await sendMessage(chatId, `⚠️ <b>${text}</b> list mein nahi tha.`);
    }
    delete pendingAction[userId];
    return true;
  } else if (action === 'setmute') {
    if (/^\d+$/.test(text.trim())) {
      botData.mute_duration = parseInt(text.trim(), 10);
      saveData(botData);
      await sendMessage(chatId, `✅ Default mute: <b>${botData.mute_duration} minutes</b>`);
    } else {
      await sendMessage(chatId, '❌ Sirf number bhejo (e.g. 5)');
    }
    delete pendingAction[userId];
    return true;
  }
  return false;
}

// ========== MAIN UPDATE PROCESSOR ==========
let lastUpdateId = 0;
let botUsername = '';
let botId = null;

async function processUpdate(update) {
  try {
    // Callback query
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return;
    }
    if (!update.message) return;
    const message = update.message;
    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const user = message.from || {};
    const userId = user.id;
    const text = message.text || message.caption || '';
    const firstName = user.first_name || 'User';
    const messageId = message.message_id;

    // Super admin DM
    if (chatType === 'private' && userId === SUPER_ADMIN_ID) {
      if (!text.startsWith('/')) {
        const handled = await handlePendingDm(chatId, userId, text);
        if (handled) return;
      } else {
        await handleCommand(message, chatId, userId, text);
      }
      return;
    }

    // Private chats (non-admin) – ignore
    if (chatType === 'private') return;

    // Group: admin messages – only commands
    if (await isAdmin(chatId, userId)) {
      if (text.startsWith('/')) {
        await handleCommand(message, chatId, userId, text);
      }
      return;
    }

    // ---------- NON-ADMIN GROUP MESSAGES ----------

    // Forwarded messages
    if (message.forward_from || message.forward_sender_name || message.forward_from_chat || message.forward_origin) {
      await deleteMessage(chatId, messageId);
      const warnId = await sendMessage(chatId, `🚫 <b>${firstName}</b>, forwarded messages allowed nahi hain!`);
      console.log(`[FWD DELETE] ${firstName} (${userId})`);
      setTimeout(() => { if (warnId) deleteMessage(chatId, warnId); }, 4000);
      return;
    }

    if (!text) return;

    // Non-admin commands – only /info allowed for non-admins
    if (text.startsWith('/')) {
      const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
      if (cmd === '/info') {
        await handleCommand(message, chatId, userId, text);
      }
      return;
    }

    // Bot mention (@...bot)
    if (botUsername && isAtMentionEndingAtBot(text, botUsername)) {
      await handleViolation(chatId, messageId, userId, firstName, 'bot_mention');
      return;
    }

    // Spam duplicate
    if (isSpamDuplicate(chatId, userId, text)) {
      await handleViolation(chatId, messageId, userId, firstName, 'spam_duplicate', 2, '2 minute(s)');
      return;
    }

    // Link detection
    if (hasLink(text)) {
      await handleViolation(chatId, messageId, userId, firstName, 'link_detected', botData.mute_duration, `${botData.mute_duration} minute(s)`);
      return;
    }

    // Blocked words
    if (isBlocked(text)) {
      await handleViolation(chatId, messageId, userId, firstName, 'blocked_word', botData.mute_duration, `${botData.mute_duration} minute(s)`);
      return;
    }

    // Normal message – positive reaction
    try {
      const emojis = ['👍','❤️','🔥','🥰','👏','😁','🤔','🎉','🤩','💯','😎','🙏','⚡','🌟','😂'];
      await sendReaction(chatId, messageId, emojis[Math.floor(Math.random() * emojis.length)]);
    } catch (_) {}
  } catch (err) {
    console.error('Error processing update:', err);
  }
}

// ========== POLLING LOOP ==========
async function pollUpdates() {
  try {
    const url = `${API_BASE}/getUpdates?timeout=30&offset=${lastUpdateId}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.ok && data.result) {
      for (const update of data.result) {
        lastUpdateId = update.update_id + 1;
        await processUpdate(update);
      }
    }
  } catch (err) {
    console.error('Polling error:', err);
  }
}

// ========== START BOT & EXPRESS SERVER ==========
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('ModBot is running!');
});

app.listen(port, () => {
  console.log(`Web server listening on port ${port}`);
});

async function init() {
  try {
    const info = await getBotInfo();
    if (info && info.username) {
      botUsername = info.username;
      botId = info.id;
      console.log(`Bot: @${botUsername} (ID: ${botId})`);
    } else {
      console.warn('Could not fetch bot info. Check BOT_TOKEN.');
    }
  } catch (e) {
    console.error('Bot info error:', e);
  }

  // Start polling every 1 second
  setInterval(pollUpdates, 1000);
  // Immediate first poll
  await pollUpdates();
}

init();
