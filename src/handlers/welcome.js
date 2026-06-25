'use strict';
const { Markup } = require('telegraf');
const { isAdmin } = require('./utils');
const { getChatSettings, updateChatSetting } = require('../db/database');

function formatWelcome(template, user, chat) {
  return template
    .replace(/{first}/g,    user.first_name || '')
    .replace(/{last}/g,     user.last_name  || '')
    .replace(/{fullname}/g, [user.first_name, user.last_name].filter(Boolean).join(' '))
    .replace(/{username}/g, user.username ? `@${user.username}` : (user.first_name || ''))
    .replace(/{mention}/g,  `<a href="tg://user?id=${user.id}">${user.first_name}</a>`)
    .replace(/{chatname}/g, chat.title || '');
}

// Called on chat_member updates
async function trackMember(ctx) {
  const result = ctx.chatMember;
  if (!result) return;
  const { chat, old_chat_member: oldMember, new_chat_member: newMember } = result;
  const user   = newMember.user;
  const oldSt  = oldMember.status;
  const newSt  = newMember.status;
  const settings = getChatSettings(chat.id);

  // Joined
  if (['left','kicked'].includes(oldSt) && ['member','restricted'].includes(newSt)) {
    const tpl  = settings.welcome_msg || '👋 Welcome, {mention}! Please read the /rules.';
    const text = formatWelcome(tpl, user, chat);

    if (settings.welcome_mute) {
      await ctx.telegram.restrictChatMember(chat.id, user.id, { permissions: { can_send_messages: false } });
      await ctx.telegram.sendMessage(chat.id, text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('✅ I agree – Unmute me', `welcome_unmute_${user.id}`)]]),
      });
    } else {
      await ctx.telegram.sendMessage(chat.id, text, { parse_mode: 'HTML' });
    }
  }

  // Left / kicked
  if (['left','kicked'].includes(newSt) && ['member','restricted','administrator'].includes(oldSt)) {
    const tpl  = settings.goodbye_msg || '👋 Goodbye, {mention}!';
    const text = formatWelcome(tpl, user, chat);
    await ctx.telegram.sendMessage(chat.id, text, { parse_mode: 'HTML' });
  }
}

async function welcomeCommand(ctx) {
  const settings = getChatSettings(ctx.chat.id);
  const msg   = settings.welcome_msg || '(default)';
  const muted = settings.welcome_mute  ? 'on' : 'off';
  const clean = settings.clean_welcome ? 'on' : 'off';
  await ctx.replyWithMarkdown(
    `👋 *Welcome settings*\n\nMessage:\n\`${msg}\`\n\nWelcome Mute: *${muted}*\nClean Welcome: *${clean}*`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Edit Welcome', 'welcome_edit')],
      [Markup.button.callback('🔄 Reset', 'welcome_reset')],
    ])
  );
}

async function setWelcomeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args.length) return ctx.reply('Usage: /setwelcome [message]\n\nVariables: {first} {last} {fullname} {username} {mention} {chatname}');
  updateChatSetting(ctx.chat.id, 'welcome_msg', args.join(' '));
  await ctx.reply('✅ Welcome message updated.');
}

async function resetWelcomeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  updateChatSetting(ctx.chat.id, 'welcome_msg', '');
  await ctx.reply('✅ Welcome message reset to default.');
}

async function goodbyeCommand(ctx) {
  const settings = getChatSettings(ctx.chat.id);
  const msg = settings.goodbye_msg || '(default)';
  await ctx.replyWithMarkdown(`👋 *Goodbye message:*\n\n\`${msg}\``);
}

async function setGoodbyeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args.length) return ctx.reply('Usage: /setgoodbye [message]');
  updateChatSetting(ctx.chat.id, 'goodbye_msg', args.join(' '));
  await ctx.reply('✅ Goodbye message updated.');
}

async function resetGoodbyeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  updateChatSetting(ctx.chat.id, 'goodbye_msg', '');
  await ctx.reply('✅ Goodbye message reset.');
}

async function cleanWelcomeCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args[0] || !['on','off'].includes(args[0])) return ctx.reply('Usage: /cleanwelcome [on|off]');
  updateChatSetting(ctx.chat.id, 'clean_welcome', args[0] === 'on' ? 1 : 0);
  await ctx.replyWithMarkdown(`✅ Clean welcome set to *${args[0]}*.`);
}

async function welcomeMuteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args[0] || !['on','off'].includes(args[0])) return ctx.reply('Usage: /welcomemute [on|off]');
  updateChatSetting(ctx.chat.id, 'welcome_mute', args[0] === 'on' ? 1 : 0);
  await ctx.replyWithMarkdown(`✅ Welcome mute set to *${args[0]}*.`);
}

async function welcomeCallback(ctx) {
  const data   = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;

  if (data.startsWith('welcome_unmute_')) {
    const uid = parseInt(data.replace('welcome_unmute_', ''), 10);
    if (ctx.from.id !== uid) return ctx.answerCbQuery('This button is not for you.', { show_alert: true });
    await ctx.telegram.restrictChatMember(chatId, uid, {
      permissions: { can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true },
    });
    await ctx.answerCbQuery('✅ You have been unmuted! Welcome!', { show_alert: true });
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } else if (data === 'welcome_reset') {
    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Admins only.', { show_alert: true });
    updateChatSetting(chatId, 'welcome_msg', '');
    await ctx.answerCbQuery('✅ Reset.', { show_alert: true });
  } else if (data === 'welcome_edit') {
    await ctx.answerCbQuery();
    await ctx.reply('Send /setwelcome [your message] to update the welcome text.\n\nVariables: {first} {last} {fullname} {username} {mention} {chatname}');
  }
}

module.exports = {
  trackMember, welcomeCommand, setWelcomeCommand, resetWelcomeCommand,
  goodbyeCommand, setGoodbyeCommand, resetGoodbyeCommand,
  cleanWelcomeCommand, welcomeMuteCommand, welcomeCallback,
};
