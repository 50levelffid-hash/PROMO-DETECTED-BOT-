'use strict';
/**
 * GalaxyBot — Node.js / Telegraf entry point
 * Run:  BOT_TOKEN=xxx node src/index.js
 * Render: set BOT_TOKEN env var, start command = node src/index.js
 */

const { Telegraf } = require('telegraf');

// ── Handlers ──────────────────────────────────────────────────────
const { startCommand, aboutCommand, donateCommand, buttonCallback } = require('./handlers/start');
const { helpCommand, helpCallback }                                  = require('./handlers/help');
const {
  banCommand, unbanCommand, kickCommand,
  muteCommand, unmuteCommand, tmuteCommand, tbanCommand,
  purgeCommand, deleteCommand, pinCommand, unpinCommand, unpinAllCommand,
} = require('./handlers/moderation');
const {
  warnCommand, unwarnCommand, warnsCommand, resetWarnsCommand,
  warnLimitCommand, warnModeCommand, warnsCallback,
} = require('./handlers/warns');
const {
  saveNoteCommand, getNoteCommand, listNotesCommand,
  clearNoteCommand, clearAllNotesCommand, notesCallback,
} = require('./handlers/notes');
const {
  addFilterCommand, stopFilterCommand, stopAllFiltersCommand, listFiltersCommand,
  blacklistCommand, addBlacklistCommand, rmBlacklistCommand, blacklistModeCommand,
  handleMessage,
} = require('./handlers/filters');
const {
  trackMember, welcomeCommand, setWelcomeCommand, resetWelcomeCommand,
  goodbyeCommand, setGoodbyeCommand, resetGoodbyeCommand,
  cleanWelcomeCommand, welcomeMuteCommand, welcomeCallback,
} = require('./handlers/welcome');
const {
  promoteCommand, demoteCommand, setTitleCommand, adminsCommand, inviteLinkCommand,
  rulesCommand, setRulesCommand, clearRulesCommand, rulesCallback,
  idCommand, infoCommand, chatInfoCommand,
  languageCommand, setLanguageCommand, langCallback,
  settingsCommand, settingsCallback,
  privacyCommand, privacyCallback,
  slapCommand, hugCommand, rollCommand, flipCommand, shrugCommand,
} = require('./handlers/misc');

// ── Init ──────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN environment variable is not set!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ── Commands ──────────────────────────────────────────────────────

// Start & About
bot.command('start',   startCommand);
bot.command('help',    helpCommand);
bot.command('about',   aboutCommand);
bot.command('donate',  donateCommand);

// Language
bot.command('language', languageCommand);
bot.command('setlang',  setLanguageCommand);

// Settings
bot.command('settings', settingsCommand);

// Moderation
bot.command('ban',      banCommand);
bot.command('unban',    unbanCommand);
bot.command('kick',     kickCommand);
bot.command('mute',     muteCommand);
bot.command('unmute',   unmuteCommand);
bot.command('tmute',    tmuteCommand);
bot.command('tban',     tbanCommand);
bot.command('warn',     warnCommand);
bot.command('unwarn',   unwarnCommand);
bot.command('warns',    warnsCommand);
bot.command('resetwarns',  resetWarnsCommand);
bot.command('warnlimit',   warnLimitCommand);
bot.command('warnmode',    warnModeCommand);
bot.command('purge',    purgeCommand);
bot.command('del',      deleteCommand);
bot.command('pin',      pinCommand);
bot.command('unpin',    unpinCommand);
bot.command('unpinall', unpinAllCommand);

// Admin
bot.command('promote',    promoteCommand);
bot.command('demote',     demoteCommand);
bot.command('title',      setTitleCommand);
bot.command('admins',     adminsCommand);
bot.command('adminlist',  adminsCommand);
bot.command('invitelink', inviteLinkCommand);

// Filters
bot.command('filter',       addFilterCommand);
bot.command('stop',         stopFilterCommand);
bot.command('stopall',      stopAllFiltersCommand);
bot.command('filters',      listFiltersCommand);
bot.command('blacklist',    blacklistCommand);
bot.command('addblacklist', addBlacklistCommand);
bot.command('rmblacklist',  rmBlacklistCommand);
bot.command('blacklistmode',blacklistModeCommand);

// Notes
bot.command('save',     saveNoteCommand);
bot.command('get',      getNoteCommand);
bot.command('notes',    listNotesCommand);
bot.command('saved',    listNotesCommand);
bot.command('clear',    clearNoteCommand);
bot.command('clearall', clearAllNotesCommand);

// Welcome
bot.command('welcome',      welcomeCommand);
bot.command('setwelcome',   setWelcomeCommand);
bot.command('resetwelcome', resetWelcomeCommand);
bot.command('goodbye',      goodbyeCommand);
bot.command('setgoodbye',   setGoodbyeCommand);
bot.command('resetgoodbye', resetGoodbyeCommand);
bot.command('cleanwelcome', cleanWelcomeCommand);
bot.command('welcomemute',  welcomeMuteCommand);

// Rules
bot.command('rules',      rulesCommand);
bot.command('setrules',   setRulesCommand);
bot.command('clearrules', clearRulesCommand);

// Privacy
bot.command('privacypolicy', privacyCommand);

// Info
bot.command('id',       idCommand);
bot.command('info',     infoCommand);
bot.command('chatinfo', chatInfoCommand);

// Fun
bot.command('slap',  slapCommand);
bot.command('hug',   hugCommand);
bot.command('roll',  rollCommand);
bot.command('flip',  flipCommand);
bot.command('shrug', shrugCommand);

// ── Callback Queries ──────────────────────────────────────────────
bot.action(/^start_/,    buttonCallback);
bot.action(/^help_/,     helpCallback);
bot.action(/^lang_/,     langCallback);
bot.action(/^settings_/, settingsCallback);
bot.action(/^rules_/,    rulesCallback);
bot.action(/^privacy_/,  privacyCallback);
bot.action(/^warns_/,    warnsCallback);
bot.action(/^welcome_/,  welcomeCallback);
bot.action(/^notes_/,    notesCallback);

// ── Message handler (filters, blacklist, #notes) ───────────────────
bot.on('text', handleMessage);

// ── Chat member updates (welcome / goodbye) ────────────────────────
bot.on('chat_member', trackMember);

// ── Error handler ─────────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error(`[Error] for update ${ctx.updateType}:`, err);
});

// ── Launch ────────────────────────────────────────────────────────
bot.launch({
  allowedUpdates: ['message', 'callback_query', 'chat_member'],
}).then(() => {
  console.log('✅ GalaxyBot is running...');
}).catch(err => {
  console.error('❌ Failed to launch bot:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
