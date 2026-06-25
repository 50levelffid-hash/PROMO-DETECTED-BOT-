# 🌹 GalaxyBot — Node.js Edition

A feature-rich Telegram Group Management Bot built with **Node.js + Telegraf**.

## ✨ Features

| Category | Commands |
|---|---|
| 🛡 Moderation | ban, unban, kick, mute, unmute, tmute, tban, purge, del, pin |
| ⚠️ Warns | warn, unwarn, warns, resetwarns, warnlimit, warnmode |
| 📌 Notes | save, get, notes, clear, clearall + #shortcut |
| 🔍 Filters | filter, stop, stopall, filters |
| 🚫 Blacklist | blacklist, addblacklist, rmblacklist, blacklistmode |
| 👋 Welcome | setwelcome, resetwelcome, goodbye, setgoodbye, cleanwelcome, welcomemute |
| 📜 Rules | rules, setrules, clearrules |
| 👮 Admin | promote, demote, title, admins, invitelink |
| ℹ️ Info | id, info, chatinfo |
| 🎲 Fun | slap, hug, roll, flip, shrug |
| 🌐 Language | language, setlang (en, tl, es, id, ar, hi) |
| ⚙️ Settings | settings (interactive inline buttons) |

---

## 🚀 Deploy to Render (Free)

### Step 1 — GitHub pe upload karo

1. GitHub par naya repo banao (e.g. `galaxybot`)
2. Ye sab files us repo mein push karo:
   ```
   src/
   package.json
   .gitignore
   README.md
   ```

### Step 2 — Render pe deploy karo

1. [render.com](https://render.com) par sign up karo (GitHub se)
2. **New → Web Service** click karo
3. Apna GitHub repo select karo
4. Ye settings karo:
   - **Name:** `galaxybot`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** Free
5. **Environment Variables** mein add karo:
   - `BOT_TOKEN` = apna Telegram bot token (BotFather se milega)
   - `BOT_USERNAME` = apna bot username (e.g. `Galaxy_accBot`)
6. **Create Web Service** click karo ✅

> **Note:** Render free tier pe service 15 min inactivity ke baad sleep ho jaati hai.
> Agar 24/7 chahiye to paid plan lo ya UptimeRobot se ping karo.

---

## 🔧 Local Development

```bash
# Clone karo
git clone https://github.com/yourname/galaxybot.git
cd galaxybot

# Dependencies install karo
npm install

# Run karo
BOT_TOKEN=your_token_here node src/index.js
```

---

## 📁 Project Structure

```
galaxybot/
├── src/
│   ├── index.js          # Main entry point
│   ├── locales.js        # Multi-language strings
│   ├── db/
│   │   └── database.js   # SQLite database layer
│   └── handlers/
│       ├── utils.js      # Shared helpers
│       ├── start.js      # /start, /about, /donate
│       ├── help.js       # /help with categories
│       ├── moderation.js # ban, kick, mute, etc.
│       ├── warns.js      # warn system
│       ├── notes.js      # notes system
│       ├── filters.js    # filters + blacklist
│       ├── welcome.js    # welcome/goodbye
│       └── misc.js       # admin, rules, info, language, fun
├── package.json
├── .gitignore
└── README.md
```
