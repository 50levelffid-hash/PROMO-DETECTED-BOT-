import json
import re
import time
import urllib.request
import urllib.parse
import random
import os
from datetime import datetime, timedelta
from collections import defaultdict

# ====== CONFIG ======
BOT_TOKEN = "8282366957:AAHbm5b_YSji4d5LWgnxnD8-Iw4SkpiVmD0"
SUPER_ADMIN_ID = 6346250222

DATA_FILE = "bot_data.json"

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {
        "block_words": [
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
        "mute_duration": 2,
        "banned_users": []
    }

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

bot_data = load_data()

# ====== LINK PATTERN — har tarah ki link detect karega ======
LINK_PATTERN = re.compile(
    r"(https?://|www\.|t\.me/|telegram\.me/|bit\.ly|tinyurl|youtu\.be|"
    r"instagram\.com|facebook\.com|twitter\.com|x\.com|discord\.gg|"
    r"wa\.me|whatsapp\.com|[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/[^\s]*)"
)

# ====== MENTION BOT PATTERN ======
# Agar message @ se shuru ho aur bot par khatam ho
def is_at_mention_ending_at_bot(text: str, bot_username: str) -> bool:
    text = text.strip()
    if not text.startswith("@"):
        return False
    bot_user = bot_username.lstrip("@").lower()
    # Last word check karo
    last_word = text.split()[-1].lstrip("@").lower()
    return last_word == bot_user

# ====== DUPLICATE MESSAGE TRACKER ======
# { (chat_id, user_id): [(text, timestamp), ...] }
user_message_log: dict = defaultdict(list)
SPAM_WINDOW_SECONDS = 60   # 1 min window
SPAM_THRESHOLD      = 2    # 2 ya zyada same messages

def is_spam_duplicate(chat_id: int, user_id: int, text: str) -> bool:
    key = (chat_id, user_id)
    now = time.time()
    # Purani entries clean karo
    user_message_log[key] = [
        (t, ts) for t, ts in user_message_log[key]
        if now - ts < SPAM_WINDOW_SECONDS
    ]
    # Same text count karo
    same_count = sum(1 for t, _ in user_message_log[key] if t == text.strip().lower())
    user_message_log[key].append((text.strip().lower(), now))
    return same_count >= (SPAM_THRESHOLD - 1)  # Agar pehle se 1+ hai aur ab fir aaya

# ====== REACTIONS ======
NORMAL_REACTIONS    = ["👍","❤️","🔥","🥰","👏","😁","🤔","🎉","🤩","💯","😎","🙏","⚡","🌟","😂"]
VIOLATION_REACTIONS = ["🤬","🚫","😡","👎","💀","🤦","😤","🙅"]

def send_reaction(chat_id, message_id, emoji):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/setMessageReaction"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "message_id": message_id,
        "reaction": json.dumps([{"type": "emoji", "emoji": emoji}])
    }).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

# ====== RESTRICTION MESSAGES ======
RESTRICTION_MESSAGES = [
    "⛔ {name} ka message delete hua! Aisa content allowed nahi hai. {duration} ke liye mute kiya gaya.",
    "🚫 {name}, yeh group ke rules ke khilaf hai! Tumhe {duration} ke liye mute kiya gaya.",
    "❌ Warning! {name} ne prohibited content bheja. {duration} mute.",
    "🔇 {name} ko {duration} ke liye mute kiya gaya. Spam/selling/links allowed nahi!",
    "⚠️ {name} — Rule violation! Message delete + {duration} mute laga diya.",
    "🛑 {name}, links/selling/DM ki permission nahi hai. {duration} mute.",
    "🔕 {name} muted for {duration}. Dobara aisa kiya toh ban hoga!",
    "💢 {name} ka message remove kiya gaya. {duration} tak kuch nahi bol sakte.",
]

def get_random_restriction_msg(name, label):
    template = random.choice(RESTRICTION_MESSAGES)
    return template.format(name=name, duration=label)

# ====== HELPERS ======
def clean_text(text):
    return re.sub(r"\s+", "", text.lower())

def is_blocked(text):
    text_clean = clean_text(text)
    return any(word in text_clean for word in bot_data["block_words"])

def has_link(text):
    return bool(LINK_PATTERN.search(text))

def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates?timeout=30"
    if offset:
        url += f"&offset={offset}"
    with urllib.request.urlopen(url, timeout=35) as response:
        return json.loads(response.read())

def delete_message(chat_id, message_id):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteMessage"
    data = urllib.parse.urlencode({"chat_id": chat_id, "message_id": message_id}).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

def send_message(chat_id, text, parse_mode="HTML", reply_markup=None):
    url    = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    params = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        params["reply_markup"] = json.dumps(reply_markup)
    data = urllib.parse.urlencode(params).encode()
    try:
        with urllib.request.urlopen(url, data) as response:
            result = json.loads(response.read())
            return result.get("result", {}).get("message_id")
    except:
        return None

def answer_callback(callback_id, text=""):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/answerCallbackQuery"
    data = urllib.parse.urlencode({"callback_query_id": callback_id, "text": text}).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

def edit_message_text(chat_id, message_id, text, parse_mode="HTML", reply_markup=None):
    url    = f"https://api.telegram.org/bot{BOT_TOKEN}/editMessageText"
    params = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        params["reply_markup"] = json.dumps(reply_markup)
    data = urllib.parse.urlencode(params).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

# ====== MUTE DURATION PARSER ======
def parse_mute_duration(args_str: str):
    """
    Parse karo: '2 days', '3 hours', '10 min', '1h', '2d', '30m', etc.
    Returns: (total_minutes: int, display_label: str)
    Default: bot_data mute_duration minutes
    """
    if not args_str:
        return bot_data["mute_duration"], f"{bot_data['mute_duration']} minute(s)"

    args_str = args_str.strip().lower()
    pattern  = re.compile(r"(\d+)\s*(day|days|d|hour|hours|h|min|minute|minutes|m)")
    matches  = pattern.findall(args_str)

    if not matches:
        # Sirf number? minutes maan lo
        if args_str.isdigit():
            val = int(args_str)
            return val, f"{val} minute(s)"
        return bot_data["mute_duration"], f"{bot_data['mute_duration']} minute(s)"

    total_minutes = 0
    label_parts   = []

    for val_str, unit in matches:
        val = int(val_str)
        if unit in ("day", "days", "d"):
            total_minutes += val * 1440
            label_parts.append(f"{val} day(s)")
        elif unit in ("hour", "hours", "h"):
            total_minutes += val * 60
            label_parts.append(f"{val} hour(s)")
        else:  # min, minute, minutes, m
            total_minutes += val
            label_parts.append(f"{val} minute(s)")

    label = " + ".join(label_parts)
    return total_minutes, label

def mute_user(chat_id, user_id, minutes=None):
    if minutes is None:
        minutes = bot_data["mute_duration"]
    until_time = int((datetime.utcnow() + timedelta(minutes=minutes)).timestamp())
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/restrictChatMember"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "user_id": user_id,
        "permissions": json.dumps({
            "can_send_messages": False,
            "can_send_media_messages": False,
            "can_send_other_messages": False,
            "can_add_web_page_previews": False
        }),
        "until_date": until_time
    }).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

def unmute_user(chat_id, user_id):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/restrictChatMember"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "user_id": user_id,
        "permissions": json.dumps({
            "can_send_messages": True,
            "can_send_media_messages": True,
            "can_send_other_messages": True,
            "can_add_web_page_previews": True
        })
    }).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

def ban_user(chat_id, user_id):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/banChatMember"
    data = urllib.parse.urlencode({"chat_id": chat_id, "user_id": user_id}).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

def unban_user(chat_id, user_id):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/unbanChatMember"
    data = urllib.parse.urlencode({"chat_id": chat_id, "user_id": user_id, "only_if_banned": True}).encode()
    try:
        urllib.request.urlopen(url, data)
    except:
        pass

def get_chat_member(chat_id, user_id):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/getChatMember"
    data = urllib.parse.urlencode({"chat_id": chat_id, "user_id": user_id}).encode()
    try:
        with urllib.request.urlopen(url, data) as response:
            result = json.loads(response.read())
            return result.get("result", {})
    except:
        return {}

def is_admin(chat_id, user_id):
    if user_id == SUPER_ADMIN_ID:
        return True
    try:
        member = get_chat_member(chat_id, user_id)
        return member.get("status") in ["administrator", "creator"]
    except:
        return False

def get_bot_info():
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
    with urllib.request.urlopen(url) as response:
        result = json.loads(response.read())
        return result.get("result", {})

def get_chat_administrators(chat_id):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/getChatAdministrators"
    data = urllib.parse.urlencode({"chat_id": chat_id}).encode()
    try:
        with urllib.request.urlopen(url, data) as response:
            result = json.loads(response.read())
            return result.get("result", [])
    except:
        return []

# ====== SUPER ADMIN PRIVATE MENU ======
def send_super_admin_menu(chat_id):
    keyboard = {
        "inline_keyboard": [
            [{"text": "➕ Word Add Karo",  "callback_data": "menu_addword"},
             {"text": "➖ Word Hatao",      "callback_data": "menu_removeword"}],
            [{"text": "📋 Words List",      "callback_data": "menu_listwords"},
             {"text": "⏱️ Mute Time Set",  "callback_data": "menu_setmute"}],
            [{"text": "⏱️ Mute Info",       "callback_data": "menu_muteinfo"}]
        ]
    }
    send_message(chat_id,
        "👑 <b>Super Admin Menu</b>\n\n"
        "Neeche buttons se settings manage karo:\n\n"
        "Ya group mein yeh commands use karo:\n"
        "/addword [word] — word block karo\n"
        "/removeword [word] — word hatao\n"
        "/listwords — saari list dekho\n"
        "/setmute [min] — default mute time badlo\n"
        "/mute [time] — e.g. /mute 2days, /mute 3hours, /mute 10min\n"
        "/unmute [reply] — unmute karo\n"
        "/ban [reply] — ban karo\n"
        "/unban [reply] — unban karo\n"
        "/adminpanel — full panel",
        reply_markup=keyboard
    )

# ====== CALLBACK HANDLER ======
pending_action = {}

def handle_callback(callback):
    query_id  = callback["id"]
    data      = callback.get("data", "")
    from_user = callback.get("from", {})
    user_id   = from_user.get("id")
    chat_id   = callback["message"]["chat"]["id"]
    msg_id    = callback["message"]["message_id"]

    if user_id != SUPER_ADMIN_ID:
        answer_callback(query_id, "❌ Sirf super admin ke liye!")
        return

    answer_callback(query_id)

    if data == "menu_addword":
        pending_action[user_id] = "addword"
        send_message(chat_id, "✏️ Ab jo word block karna hai wo bhejo:")

    elif data == "menu_removeword":
        pending_action[user_id] = "removeword"
        send_message(chat_id, "✏️ Jo word hatana hai wo bhejo:")

    elif data == "menu_listwords":
        words  = bot_data["block_words"]
        chunks = [words[i:i+50] for i in range(0, len(words), 50)]
        for i, chunk in enumerate(chunks):
            send_message(chat_id, f"🔒 <b>Blocked Words (Part {i+1}):</b>\n" + ", ".join(chunk))

    elif data == "menu_setmute":
        pending_action[user_id] = "setmute"
        send_message(chat_id, f"⏱️ Current mute: <b>{bot_data['mute_duration']} min</b>\nNaya mute time (minutes mein) bhejo:")

    elif data == "menu_muteinfo":
        send_message(chat_id, f"⏱️ Current default mute: <b>{bot_data['mute_duration']} minutes</b>")

def handle_pending_dm(chat_id, user_id, text):
    global bot_data
    action = pending_action.get(user_id)
    if not action:
        return False

    if action == "addword":
        new_word = clean_text(text)
        if new_word in bot_data["block_words"]:
            send_message(chat_id, f"⚠️ <b>{text}</b> pehle se blocked list mein hai.")
        else:
            bot_data["block_words"].append(new_word)
            save_data(bot_data)
            send_message(chat_id, f"✅ Word <b>{text}</b> add ho gaya!")
        del pending_action[user_id]
        return True

    elif action == "removeword":
        rem_word = clean_text(text)
        if rem_word in bot_data["block_words"]:
            bot_data["block_words"].remove(rem_word)
            save_data(bot_data)
            send_message(chat_id, f"✅ Word <b>{text}</b> remove ho gaya!")
        else:
            send_message(chat_id, f"⚠️ <b>{text}</b> list mein nahi tha.")
        del pending_action[user_id]
        return True

    elif action == "setmute":
        if text.strip().isdigit():
            bot_data["mute_duration"] = int(text.strip())
            save_data(bot_data)
            send_message(chat_id, f"✅ Default mute: <b>{bot_data['mute_duration']} minutes</b>")
        else:
            send_message(chat_id, "❌ Sirf number bhejo (e.g. 5)")
        del pending_action[user_id]
        return True

    return False

# ====== ADMIN PANEL ======
def send_admin_panel(chat_id):
    panel_text = (
        "🛡️ <b>Admin Panel - ModBot</b>\n\n"
        "<b>📋 Word Management:</b>\n"
        "/addword [word] — block word add karo\n"
        "/removeword [word] — block word hatao\n"
        "/listwords — saare blocked words dekho\n\n"
        "<b>⏱️ Mute System:</b>\n"
        "/setmute [minutes] — default mute time\n"
        "/mute 2days — 2 din ke liye mute\n"
        "/mute 3hours — 3 ghante ke liye mute\n"
        "/mute 10min — 10 minute ke liye mute\n"
        "/mute 1day 2hours — combine bhi kar sakte ho\n"
        "/unmute — reply karke unmute karo\n\n"
        "<b>🔨 Ban System:</b>\n"
        "/ban — reply karke ban karo\n"
        "/unban — reply karke unban karo\n\n"
        "<b>ℹ️ Info:</b>\n"
        "/info — reply karke user ID dekho\n"
        "/adminpanel — yeh panel dubara\n"
        "/muteinfo — current mute duration\n\n"
        "<b>📌 Note:</b> Ye commands sirf admins ke liye hain."
    )
    send_message(chat_id, panel_text)

# ====== COMMAND HANDLER ======
def handle_command(message, chat_id, user_id, text):
    global bot_data

    cmd = text.split()[0].split("@")[0].lower()

    if cmd == "/start":
        if user_id == SUPER_ADMIN_ID and message["chat"]["type"] == "private":
            send_super_admin_menu(chat_id)
        return

    # /info — reply pe user ID
    if cmd == "/info":
        if "reply_to_message" not in message:
            msg_id = send_message(chat_id, "❗ Kisi message ka reply karke /info likho.")
            time.sleep(4)
            delete_message(chat_id, msg_id)
            return
        target      = message["reply_to_message"]["from"]
        target_id   = target.get("id", "N/A")
        target_name = target.get("first_name", "User")
        target_uname = target.get("username", "")
        uname_str   = f"@{target_uname}" if target_uname else "N/A"
        info_msg = (
            f"👤 <b>User Info:</b>\n"
            f"Name: <b>{target_name}</b>\n"
            f"Username: {uname_str}\n"
            f"User ID: <code>{target_id}</code>"
        )
        msg_id = send_message(chat_id, info_msg)
        time.sleep(10)
        delete_message(chat_id, msg_id)
        return

    # Admin-only commands below
    if not is_admin(chat_id, user_id):
        return

    if cmd == "/adminpanel":
        send_admin_panel(chat_id)

    elif cmd == "/addword":
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            send_message(chat_id, "❗ Usage: /addword [word]")
            return
        new_word = clean_text(parts[1])
        if new_word in bot_data["block_words"]:
            send_message(chat_id, f"⚠️ <b>{parts[1]}</b> pehle se blocked hai.")
        else:
            bot_data["block_words"].append(new_word)
            save_data(bot_data)
            send_message(chat_id, f"✅ <b>{parts[1]}</b> blocked list mein add ho gaya!")

    elif cmd == "/removeword":
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            send_message(chat_id, "❗ Usage: /removeword [word]")
            return
        rem_word = clean_text(parts[1])
        if rem_word in bot_data["block_words"]:
            bot_data["block_words"].remove(rem_word)
            save_data(bot_data)
            send_message(chat_id, f"✅ <b>{parts[1]}</b> remove ho gaya!")
        else:
            send_message(chat_id, f"⚠️ <b>{parts[1]}</b> list mein nahi tha.")

    elif cmd == "/listwords":
        words  = bot_data["block_words"]
        chunks = [words[i:i+50] for i in range(0, len(words), 50)]
        for i, chunk in enumerate(chunks):
            send_message(chat_id, f"🔒 <b>Blocked Words (Part {i+1}):</b>\n" + ", ".join(chunk))

    elif cmd == "/setmute":
        parts = text.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip().isdigit():
            send_message(chat_id, "❗ Usage: /setmute [minutes]")
            return
        bot_data["mute_duration"] = int(parts[1].strip())
        save_data(bot_data)
        send_message(chat_id, f"✅ Default mute: <b>{bot_data['mute_duration']} minutes</b>")

    elif cmd == "/muteinfo":
        send_message(chat_id, f"⏱️ Default mute: <b>{bot_data['mute_duration']} minutes</b>")

    elif cmd == "/mute":
        if "reply_to_message" not in message:
            send_message(chat_id, "❗ Kisi message ka reply karke /mute [time] likho.\nExample: /mute 2days")
            return
        target_user = message["reply_to_message"]["from"]
        target_id   = target_user["id"]
        target_name = target_user.get("first_name", "User")

        if is_admin(chat_id, target_id):
            send_message(chat_id, "⛔ Admin ko mute nahi kar sakte!")
            return

        # /mute ke baad jo bhi hai wo duration hai
        parts    = text.split(maxsplit=1)
        args_str = parts[1] if len(parts) > 1 else ""
        duration, label = parse_mute_duration(args_str)

        mute_user(chat_id, target_id, duration)
        send_message(chat_id, f"🔇 <b>{target_name}</b> ko <b>{label}</b> ke liye mute kiya gaya.")

    elif cmd == "/unmute":
        if "reply_to_message" not in message:
            send_message(chat_id, "❗ Kisi message ka reply karke /unmute likho.")
            return
        target_user = message["reply_to_message"]["from"]
        target_id   = target_user["id"]
        target_name = target_user.get("first_name", "User")
        unmute_user(chat_id, target_id)
        send_message(chat_id, f"✅ <b>{target_name}</b> unmute ho gaya!")

    elif cmd == "/ban":
        if "reply_to_message" not in message:
            send_message(chat_id, "❗ Kisi message ka reply karke /ban likho.")
            return
        target_user = message["reply_to_message"]["from"]
        target_id   = target_user["id"]
        target_name = target_user.get("first_name", "User")

        if is_admin(chat_id, target_id):
            send_message(chat_id, "⛔ Admin ko ban nahi kar sakte!")
            return

        ban_user(chat_id, target_id)
        if str(target_id) not in bot_data["banned_users"]:
            bot_data["banned_users"].append(str(target_id))
            save_data(bot_data)
        send_message(chat_id, f"🔨 <b>{target_name}</b> ban ho gaya!")

    elif cmd == "/unban":
        if "reply_to_message" not in message:
            send_message(chat_id, "❗ Kisi message ka reply karke /unban likho.")
            return
        target_user = message["reply_to_message"]["from"]
        target_id   = target_user["id"]
        target_name = target_user.get("first_name", "User")
        unban_user(chat_id, target_id)
        if str(target_id) in bot_data["banned_users"]:
            bot_data["banned_users"].remove(str(target_id))
            save_data(bot_data)
        send_message(chat_id, f"✅ <b>{target_name}</b> unban ho gaya!")

# ====== VIOLATION HANDLER — Instant delete ======
def handle_violation(chat_id, message_id, user_id, first_name, reason_label, mute_minutes=None, mute_label=None):
    """
    Message turant delete karo, reaction do, mute karo.
    0.1s se pehle delete — fire and forget pattern.
    """
    # Reaction pehle (non-blocking try)
    try:
        send_reaction(chat_id, message_id, random.choice(VIOLATION_REACTIONS))
    except:
        pass

    # Instant delete — no sleep before this
    delete_message(chat_id, message_id)

    # Mute if needed
    if mute_minutes:
        mute_user(chat_id, user_id, mute_minutes)
        label = mute_label or f"{mute_minutes} minute(s)"
        warn_id = send_message(chat_id, get_random_restriction_msg(first_name, label))
        print(f"[VIOLATION] {first_name} ({user_id}) | Reason: {reason_label} | Mute: {label}")
        time.sleep(5)
        if warn_id:
            delete_message(chat_id, warn_id)
    else:
        warn_id = send_message(chat_id, f"🚫 <b>{first_name}</b>, yeh allowed nahi hai. Message delete kiya gaya.")
        time.sleep(4)
        if warn_id:
            delete_message(chat_id, warn_id)

# ====== MAIN LOOP ======
print("✅ ModBot is running...")

try:
    bot_info     = get_bot_info()
    BOT_USERNAME = bot_info.get("username", "")
    BOT_ID       = bot_info.get("id")
    print(f"Bot: @{BOT_USERNAME} (ID: {BOT_ID})")
except Exception as e:
    print(f"Bot info error: {e}")
    BOT_USERNAME = ""
    BOT_ID       = None

last_update_id = None

while True:
    try:
        updates = get_updates(last_update_id)

        for update in updates.get("result", []):
            last_update_id = update["update_id"] + 1

            # ── Callback query ──
            if "callback_query" in update:
                handle_callback(update["callback_query"])
                continue

            if "message" not in update:
                continue

            message    = update["message"]
            chat_id    = message["chat"]["id"]
            chat_type  = message["chat"]["type"]
            user       = message.get("from", {})
            user_id    = user.get("id")
            text       = message.get("text", "") or message.get("caption", "") or ""
            first_name = user.get("first_name", "User")
            message_id = message["message_id"]

            # ── Super admin DM ──
            if chat_type == "private" and user_id == SUPER_ADMIN_ID:
                if not text.startswith("/"):
                    if handle_pending_dm(chat_id, user_id, text):
                        continue
                else:
                    handle_command(message, chat_id, user_id, text)
                continue

            # ── Private (non-admin) — ignore ──
            if chat_type == "private":
                continue

            # ── GROUP MESSAGE HANDLING ──

            # Admin / Owner ka message — kuch mat karo, sirf commands handle karo
            if is_admin(chat_id, user_id):
                if text.startswith("/"):
                    handle_command(message, chat_id, user_id, text)
                # Forward bhi delete nahi karenge admin ka
                continue

            # ── FORWARD MESSAGE — directly delete, no info ──
            if (
                "forward_from" in message or
                "forward_sender_name" in message or
                "forward_from_chat" in message or
                "forward_origin" in message
            ):
                delete_message(chat_id, message_id)
                warn_id = send_message(chat_id, f"🚫 <b>{first_name}</b>, forwarded messages allowed nahi hain!")
                print(f"[FWD DELETE] {first_name} ({user_id})")
                time.sleep(4)
                if warn_id:
                    delete_message(chat_id, warn_id)
                continue

            if not text:
                continue

            # ── Non-admin commands ──
            if text.startswith("/"):
                cmd = text.split()[0].split("@")[0].lower()
                if cmd == "/info":
                    handle_command(message, chat_id, user_id, text)
                continue

            # ── BOT MENTION: @ se start, bot par khatam ──
            if BOT_USERNAME and is_at_mention_ending_at_bot(text, BOT_USERNAME):
                handle_violation(chat_id, message_id, user_id, first_name, "bot_mention")
                continue

            # ── SPAM: 1 min mein same message 2+ baar ──
            if is_spam_duplicate(chat_id, user_id, text):
                handle_violation(
                    chat_id, message_id, user_id, first_name,
                    "spam_duplicate",
                    mute_minutes=2,
                    mute_label="2 minute(s)"
                )
                continue

            # ── LINK DETECTION — beech mein bhi ──
            if has_link(text):
                handle_violation(
                    chat_id, message_id, user_id, first_name,
                    "link_detected",
                    mute_minutes=bot_data["mute_duration"],
                    mute_label=f"{bot_data['mute_duration']} minute(s)"
                )
                continue

            # ── BLOCKED WORDS ──
            if is_blocked(text):
                handle_violation(
                    chat_id, message_id, user_id, first_name,
                    "blocked_word",
                    mute_minutes=bot_data["mute_duration"],
                    mute_label=f"{bot_data['mute_duration']} minute(s)"
                )
                continue

            # ── Normal message — positive reaction ──
            try:
                send_reaction(chat_id, message_id, random.choice(NORMAL_REACTIONS))
            except:
                pass

        time.sleep(0.5)

    except Exception as e:
        print(f"Main loop error: {e}")
        time.sleep(5)
