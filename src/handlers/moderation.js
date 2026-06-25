'use strict';
const { isAdmin, resolveTarget, parseTime } = require('./utils');
const { getChatSettings } = require('../db/database');
const { getString } = require('../locales');

function lang(chatId) {
  return getChatSettings(chatId).language || 'en';
}

async function banCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return ctx.reply(getString(lang(ctx.chat.id), 'reply_required'));
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, userId);
    await ctx.replyWithHTML(getString(lang(ctx.chat.id), 'ban_success', { user: mention }));
  } catch (e) {
    await ctx.reply(`❌ Failed to ban: ${e.message}`);
  }
}

async function unbanCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  try {
    await ctx.telegram.unbanChatMember(ctx.chat.id, userId);
    await ctx.replyWithHTML(getString(lang(ctx.chat.id), 'unban_success', { user: mention }));
  } catch (e) {
    await ctx.reply(`❌ Failed to unban: ${e.message}`);
  }
}

async function kickCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, userId);
    await ctx.telegram.unbanChatMember(ctx.chat.id, userId);
    await ctx.replyWithHTML(getString(lang(ctx.chat.id), 'kick_success', { user: mention }));
  } catch (e) {
    await ctx.reply(`❌ Failed to kick: ${e.message}`);
  }
}

async function muteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, userId, { permissions: { can_send_messages: false } });
    await ctx.replyWithHTML(getString(lang(ctx.chat.id), 'mute_success', { user: mention }));
  } catch (e) {
    await ctx.reply(`❌ Failed to mute: ${e.message}`);
  }
}

async function unmuteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
      permissions: {
        can_send_messages: true, can_send_media_messages: true,
        can_send_polls: true, can_send_other_messages: true,
        can_add_web_page_previews: true,
      },
    });
    await ctx.replyWithHTML(getString(lang(ctx.chat.id), 'unmute_success', { user: mention }));
  } catch (e) {
    await ctx.reply(`❌ Failed to unmute: ${e.message}`);
  }
}

async function tmuteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  const args = ctx.args || [];
  const timeArg = args[args.length - 1];
  const secs = parseTime(timeArg);
  if (!secs) return ctx.reply('Usage: /tmute [user] [time] — e.g. 30m, 2h, 1d');
  const until = Math.floor(Date.now() / 1000) + secs;
  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
      permissions: { can_send_messages: false },
      until_date: until,
    });
    await ctx.replyWithHTML(`🔇 ${mention} muted for <code>${timeArg}</code>.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to temp-mute: ${e.message}`);
  }
}

async function tbanCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  const args = ctx.args || [];
  const timeArg = args[args.length - 1];
  const secs = parseTime(timeArg);
  if (!secs) return ctx.reply('Usage: /tban [user] [time] — e.g. 30m, 2h, 1d');
  const until = Math.floor(Date.now() / 1000) + secs;
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, userId, { until_date: until });
    await ctx.replyWithHTML(`🚫 ${mention} banned for <code>${timeArg}</code>.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to temp-ban: ${e.message}`);
  }
}

async function purgeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  let n = 10;
  if (args[0]) n = Math.min(parseInt(args[0], 10) || 10, 100);
  const msgId = ctx.message.message_id;
  const ids = [];
  for (let i = msgId - n; i <= msgId; i++) if (i > 0) ids.push(i);
  try {
    await ctx.telegram.deleteMessages(ctx.chat.id, ids);
  } catch {
    await ctx.reply('⚠️ Could not delete all messages (bot may lack permission).');
  }
}

async function deleteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const replied = ctx.message?.reply_to_message;
  if (!replied) return ctx.reply('Reply to a message to delete it.');
  try {
    await ctx.telegram.deleteMessage(ctx.chat.id, replied.message_id);
    await ctx.deleteMessage();
  } catch {
    await ctx.reply('❌ Could not delete the message.');
  }
}

async function pinCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const replied = ctx.message?.reply_to_message;
  if (!replied) return ctx.reply('Reply to a message to pin it.');
  try {
    await ctx.telegram.pinChatMessage(ctx.chat.id, replied.message_id);
  } catch (e) {
    await ctx.reply(`❌ Failed to pin: ${e.message}`);
  }
}

async function unpinCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  try { await ctx.telegram.unpinChatMessage(ctx.chat.id); } catch {}
}

async function unpinAllCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  try {
    await ctx.telegram.unpinAllChatMessages(ctx.chat.id);
    await ctx.reply('📌 All messages unpinned.');
  } catch (e) {
    await ctx.reply(`❌ Failed: ${e.message}`);
  }
}

module.exports = {
  banCommand, unbanCommand, kickCommand,
  muteCommand, unmuteCommand,
  tmuteCommand, tbanCommand,
  purgeCommand, deleteCommand,
  pinCommand, unpinCommand, unpinAllCommand,
};
