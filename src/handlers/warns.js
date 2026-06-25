'use strict';
const { Markup } = require('telegraf');
const { isAdmin, resolveTarget } = require('./utils');
const { getChatSettings, updateChatSetting, addWarn, getWarns, resetWarns, removeOneWarn } = require('../db/database');
const { getString } = require('../locales');

function lang(chatId) { return getChatSettings(chatId).language || 'en'; }

async function warnCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const chatId = ctx.chat.id;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return ctx.reply(getString(lang(chatId), 'reply_required'));

  const settings = getChatSettings(chatId);
  const limit = settings.warn_limit || 3;
  const mode  = settings.warn_mode  || 'ban';
  const count = addWarn(chatId, userId);
  const l     = settings.language || 'en';

  if (count >= limit) {
    resetWarns(chatId, userId);
    if (mode === 'ban') {
      await ctx.telegram.banChatMember(chatId, userId);
      await ctx.replyWithHTML(getString(l, 'warn_banned', { user: mention }));
    } else if (mode === 'kick') {
      await ctx.telegram.banChatMember(chatId, userId);
      await ctx.telegram.unbanChatMember(chatId, userId);
      await ctx.replyWithHTML(`👢 ${mention} was kicked after reaching the warn limit.`);
    } else if (mode === 'mute') {
      await ctx.telegram.restrictChatMember(chatId, userId, { permissions: { can_send_messages: false } });
      await ctx.replyWithHTML(`🔇 ${mention} was muted after reaching the warn limit.`);
    }
  } else {
    await ctx.replyWithHTML(
      getString(l, 'warn_given', { user: mention, count, limit }),
      Markup.inlineKeyboard([[Markup.button.callback('✅ Remove Warn', `warns_remove_${userId}`)]])
    );
  }
}

async function unwarnCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  const newCount = removeOneWarn(ctx.chat.id, userId);
  await ctx.replyWithHTML(`✅ Removed one warn from ${mention}. Now at ${newCount} warns.`);
}

async function warnsCommand(ctx) {
  const chatId = ctx.chat.id;
  let { userId, mention } = await resolveTarget(ctx);
  if (!userId) {
    userId  = ctx.from.id;
    mention = `<a href="tg://user?id=${userId}">${ctx.from.first_name}</a>`;
  }
  const count = getWarns(chatId, userId);
  const limit = getChatSettings(chatId).warn_limit || 3;
  await ctx.replyWithHTML(`⚠️ ${mention} has <b>${count}/${limit}</b> warnings.`);
}

async function resetWarnsCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  resetWarns(ctx.chat.id, userId);
  await ctx.replyWithHTML(`✅ Reset all warnings for ${mention}.`);
}

async function warnLimitCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const chatId = ctx.chat.id;
  const args = ctx.args || [];
  if (!args[0]) {
    const limit = getChatSettings(chatId).warn_limit || 3;
    return ctx.replyWithMarkdown(`Current warn limit: *${limit}*`);
  }
  const limit = Math.max(1, parseInt(args[0], 10));
  if (isNaN(limit)) return ctx.reply('Usage: /warnlimit [number]');
  updateChatSetting(chatId, 'warn_limit', limit);
  await ctx.replyWithMarkdown(`✅ Warn limit set to *${limit}*.`);
}

async function warnModeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args[0] || !['ban','kick','mute'].includes(args[0])) {
    return ctx.reply('Usage: /warnmode [ban|kick|mute]');
  }
  updateChatSetting(ctx.chat.id, 'warn_mode', args[0]);
  await ctx.replyWithMarkdown(`✅ Warn mode set to *${args[0]}*.`);
}

async function warnsCallback(ctx) {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Admins only.', { show_alert: true });
  const data = ctx.callbackQuery.data;
  if (data.startsWith('warns_remove_')) {
    const userId = parseInt(data.replace('warns_remove_', ''), 10);
    removeOneWarn(ctx.chat.id, userId);
    await ctx.answerCbQuery('✅ Warn removed.', { show_alert: true });
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  }
}

module.exports = { warnCommand, unwarnCommand, warnsCommand, resetWarnsCommand, warnLimitCommand, warnModeCommand, warnsCallback };
