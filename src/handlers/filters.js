'use strict';
const { isAdmin } = require('./utils');
const {
  addFilter, getFilters, removeFilter, removeAllFilters,
  addBlacklistWord, getBlacklist, removeBlacklistWord,
  getBlacklistMode, setBlacklistMode,
  getChatSettings, addWarn, getWarns, resetWarns,
  getNote,
} = require('../db/database');

// ── Filter commands ───────────────────────────────────────────────

async function addFilterCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (args.length < 2) return ctx.reply('Usage: /filter [keyword] [response]');
  const keyword  = args[0].toLowerCase();
  const response = args.slice(1).join(' ');
  addFilter(ctx.chat.id, keyword, response);
  await ctx.replyWithMarkdown(`✅ Filter *${keyword}* added.`);
}

async function stopFilterCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args[0]) return ctx.reply('Usage: /stop [keyword]');
  removeFilter(ctx.chat.id, args[0].toLowerCase());
  await ctx.replyWithMarkdown(`✅ Filter *${args[0]}* removed.`);
}

async function stopAllFiltersCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  removeAllFilters(ctx.chat.id);
  await ctx.reply('✅ All filters removed.');
}

async function listFiltersCommand(ctx) {
  const fs = getFilters(ctx.chat.id);
  if (!fs.length) return ctx.reply('No active filters.');
  const text = '🔍 *Active filters:*\n' + fs.map(f => `• \`${f.keyword}\``).join('\n');
  await ctx.replyWithMarkdown(text);
}

// ── Blacklist commands ────────────────────────────────────────────

async function blacklistCommand(ctx) {
  const chatId = ctx.chat.id;
  const words  = getBlacklist(chatId);
  const mode   = getBlacklistMode(chatId);
  if (!words.length) return ctx.replyWithMarkdown(`🚫 No blacklisted words.\nMode: *${mode}*`);
  const text = `🚫 *Blacklisted words* (mode: ${mode}):\n` + words.map(w => `• \`${w}\``).join('\n');
  await ctx.replyWithMarkdown(text);
}

async function addBlacklistCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args.length) return ctx.reply('Usage: /addblacklist [word]');
  for (const word of args) addBlacklistWord(ctx.chat.id, word.toLowerCase());
  await ctx.reply(`✅ Added ${args.length} word(s) to blacklist.`);
}

async function rmBlacklistCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args[0]) return ctx.reply('Usage: /rmblacklist [word]');
  removeBlacklistWord(ctx.chat.id, args[0].toLowerCase());
  await ctx.replyWithMarkdown(`✅ Removed *${args[0]}* from blacklist.`);
}

async function blacklistModeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const valid = ['delete','warn','mute','kick','ban'];
  const args  = ctx.args || [];
  if (!args[0] || !valid.includes(args[0])) {
    const mode = getBlacklistMode(ctx.chat.id);
    return ctx.replyWithMarkdown(
      `Current blacklist mode: *${mode}*\nUsage: /blacklistmode [${valid.join('/')}]`
    );
  }
  setBlacklistMode(ctx.chat.id, args[0]);
  await ctx.replyWithMarkdown(`✅ Blacklist mode set to *${args[0]}*.`);
}

// ── Message handler (filters + blacklist + #notes) ─────────────────

async function handleMessage(ctx) {
  const msg    = ctx.message;
  const chatId = ctx.chat?.id;
  if (!msg?.text || !chatId) return;

  const textLower = msg.text.toLowerCase();

  // #note shortcut
  if (textLower.startsWith('#')) {
    const noteName = textLower.slice(1).split(/\s/)[0];
    const content  = getNote(chatId, noteName);
    if (content) return ctx.replyWithMarkdown(`📌 *${noteName}*\n\n${content}`);
  }

  // Filters
  for (const f of getFilters(chatId)) {
    if (textLower.includes(f.keyword)) return ctx.reply(f.response);
  }

  // Blacklist
  const blWords = getBlacklist(chatId);
  for (const word of blWords) {
    if (textLower.includes(word)) {
      const mode = getBlacklistMode(chatId);
      try { await ctx.deleteMessage(); } catch {}

      const uid = msg.from.id;
      const mention = `<a href="tg://user?id=${uid}">${msg.from.first_name}</a>`;

      if (mode === 'warn') {
        const settings = getChatSettings(chatId);
        const limit    = settings.warn_limit || 3;
        const count    = addWarn(chatId, uid);
        if (count >= limit) {
          resetWarns(chatId, uid);
          await ctx.telegram.banChatMember(chatId, uid);
          await ctx.replyWithHTML(`🚫 ${mention} was banned (blacklist + warn limit).`);
        } else {
          await ctx.replyWithHTML(`⚠️ ${mention} warned for blacklisted word. (${count}/${limit})`);
        }
      } else if (mode === 'mute') {
        await ctx.telegram.restrictChatMember(chatId, uid, { permissions: { can_send_messages: false } });
        await ctx.replyWithHTML(`🔇 ${mention} muted for blacklisted word.`);
      } else if (mode === 'kick') {
        await ctx.telegram.banChatMember(chatId, uid);
        await ctx.telegram.unbanChatMember(chatId, uid);
      } else if (mode === 'ban') {
        await ctx.telegram.banChatMember(chatId, uid);
        await ctx.replyWithHTML(`🚫 ${mention} banned for blacklisted word.`);
      }
      break;
    }
  }
}

module.exports = {
  addFilterCommand, stopFilterCommand, stopAllFiltersCommand, listFiltersCommand,
  blacklistCommand, addBlacklistCommand, rmBlacklistCommand, blacklistModeCommand,
  handleMessage,
};
