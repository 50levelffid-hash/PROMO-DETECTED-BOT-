'use strict';
const { Markup } = require('telegraf');

const HELP_SECTIONS = {
  main: {
    title: '📚 *GalaxyBot Help — Categories*',
    text: 'Choose a category below to see the available commands:',
  },
  moderation: {
    title: '🛡 *Moderation Commands*',
    text: `/ban [reply/username] — Ban a user
/unban [reply/username] — Unban a user
/kick [reply/username] — Kick a user
/mute [reply/username] — Mute a user
/unmute [reply/username] — Unmute a user
/tmute [user] [time] — Temp mute (1h, 30m)
/tban [user] [time] — Temp ban
/purge [n] — Delete last n messages
/del — Delete replied message
/pin — Pin replied message
/unpin — Unpin current pinned message
/unpinall — Unpin all messages`,
  },
  warns: {
    title: '⚠️ *Warn Commands*',
    text: `/warn [reply/username] — Warn a user
/unwarn [reply/username] — Remove one warn
/warns [reply/username] — Show warns
/resetwarns [reply/username] — Reset all warns
/warnlimit [n] — Set warn limit (default 3)
/warnmode [ban/kick/mute] — Action on limit hit`,
  },
  notes: {
    title: '📌 *Notes Commands*',
    text: `/save [name] [content] — Save a note
/get [name] — Get a saved note
/notes — List all notes
/clear [name] — Delete a note
/clearall — Delete all notes

You can also use #notename to retrieve notes.`,
  },
  filters: {
    title: '🔍 *Filter Commands*',
    text: `/filter [keyword] [response] — Add a filter
/stop [keyword] — Remove a filter
/stopall — Remove all filters
/filters — List active filters`,
  },
  welcome: {
    title: '👋 *Welcome Commands*',
    text: `/welcome — Show welcome settings
/setwelcome [msg] — Set welcome message
/resetwelcome — Reset to default
/goodbye — Show goodbye settings
/setgoodbye [msg] — Set goodbye message
/resetgoodbye — Reset goodbye
/cleanwelcome [on/off] — Delete old welcome msgs
/welcomemute [on/off] — Mute new members

*Variables:* {first} {last} {fullname} {username} {mention} {chatname}`,
  },
  rules: {
    title: '📜 *Rules Commands*',
    text: `/rules — Show group rules
/setrules [text] — Set group rules
/clearrules — Remove rules`,
  },
  blacklist: {
    title: '🚫 *Blacklist Commands*',
    text: `/blacklist — Show blacklisted words
/addblacklist [word] — Add a word
/rmblacklist [word] — Remove a word
/blacklistmode [delete/warn/mute/kick/ban] — Set action`,
  },
  fun: {
    title: '🎲 *Fun Commands*',
    text: `/slap [reply] — Slap someone
/hug [reply] — Hug someone
/roll — Roll a dice 🎲
/flip — Flip a coin 🪙
/shrug — Shrug ¯\\_(ツ)_/¯`,
  },
  admin: {
    title: '👮 *Admin Commands*',
    text: `/promote [reply/username] — Promote to admin
/demote [reply/username] — Demote admin
/title [reply/username] [title] — Set custom title
/admins — List all admins
/invitelink — Get group invite link`,
  },
  info: {
    title: 'ℹ️ *Info Commands*',
    text: `/id — Show your ID and chat ID
/info [reply/username] — Show user info
/chatinfo — Show chat info
/admins — List admin users`,
  },
};

function mainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛡 Moderation', 'help_moderation'), Markup.button.callback('⚠️ Warns', 'help_warns')],
    [Markup.button.callback('📌 Notes', 'help_notes'), Markup.button.callback('🔍 Filters', 'help_filters')],
    [Markup.button.callback('👋 Welcome', 'help_welcome'), Markup.button.callback('📜 Rules', 'help_rules')],
    [Markup.button.callback('🚫 Blacklist', 'help_blacklist'), Markup.button.callback('🎲 Fun', 'help_fun')],
    [Markup.button.callback('👮 Admin', 'help_admin'), Markup.button.callback('ℹ️ Info', 'help_info')],
  ]);
}

function backKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Help', 'help_main')]]);
}

async function helpCommand(ctx) {
  const sec = HELP_SECTIONS.main;
  await ctx.replyWithMarkdown(`${sec.title}\n\n${sec.text}`, mainKeyboard());
}

async function helpCallback(ctx) {
  const section = ctx.callbackQuery.data.replace('help_', '');
  const sec = HELP_SECTIONS[section] || HELP_SECTIONS.main;
  const text = `${sec.title}\n\n${sec.text}`;
  const kb = section === 'main' ? mainKeyboard() : backKeyboard();
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb });
  await ctx.answerCbQuery();
}

module.exports = { helpCommand, helpCallback };
