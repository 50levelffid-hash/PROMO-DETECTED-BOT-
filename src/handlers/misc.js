'use strict';
const { Markup } = require('telegraf');
const { isAdmin, resolveTarget } = require('./utils');
const { getChatSettings, updateChatSetting } = require('../db/database');
const { getString, LANGUAGE_NAMES } = require('../locales');

// ── ADMIN ─────────────────────────────────────────────────────────

async function promoteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  try {
    await ctx.telegram.promoteChatMember(ctx.chat.id, userId, {
      can_delete_messages: true, can_restrict_members: true,
      can_pin_messages: true, can_invite_users: true,
    });
    await ctx.replyWithHTML(`👮 ${mention} has been promoted to admin.`);
  } catch (e) { await ctx.reply(`❌ Failed to promote: ${e.message}`); }
}

async function demoteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  if (!userId) return;
  try {
    await ctx.telegram.promoteChatMember(ctx.chat.id, userId, {
      can_delete_messages: false, can_restrict_members: false,
      can_pin_messages: false, can_invite_users: false, can_manage_chat: false,
    });
    await ctx.replyWithHTML(`✅ ${mention} has been demoted.`);
  } catch (e) { await ctx.reply(`❌ Failed to demote: ${e.message}`); }
}

async function setTitleCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const { userId, mention } = await resolveTarget(ctx);
  const args = ctx.args || [];
  const title = args.slice(1).join(' ');
  if (!userId || !title) return ctx.reply('Usage: /title [reply] [title text]');
  try {
    await ctx.telegram.setChatAdministratorCustomTitle(ctx.chat.id, userId, title);
    await ctx.replyWithMarkdown(`✅ Set title *${title}* for ${mention}.`);
  } catch (e) { await ctx.reply(`❌ Failed: ${e.message}`); }
}

async function adminsCommand(ctx) {
  try {
    const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id);
    const lines = admins.map(a => {
      const u    = a.user;
      let name   = u.first_name + (u.last_name ? ` ${u.last_name}` : '');
      if (a.custom_title) name += ` [${a.custom_title}]`;
      if (u.username)     name += ` @${u.username}`;
      return `${a.status === 'creator' ? '👑' : '👮'} ${name}`;
    });
    await ctx.replyWithMarkdown('👮 *Admins in this chat:*\n\n' + lines.join('\n'));
  } catch (e) { await ctx.reply(`❌ Failed: ${e.message}`); }
}

async function inviteLinkCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  try {
    const link = await ctx.telegram.exportChatInviteLink(ctx.chat.id);
    await ctx.reply(`🔗 Invite link:\n${link}`);
  } catch (e) { await ctx.reply(`❌ Failed: ${e.message}`); }
}

// ── RULES ─────────────────────────────────────────────────────────

async function rulesCommand(ctx) {
  const settings = getChatSettings(ctx.chat.id);
  const rules    = settings.rules || '';
  if (!rules) return ctx.reply('❌ No rules have been set for this group.\n\nAdmins can use /setrules to add rules.');
  await ctx.replyWithMarkdown(
    `📜 *Group Rules*\n\n${rules}`,
    Markup.inlineKeyboard([[Markup.button.callback('✅ I have read the rules', 'rules_ack')]])
  );
}

async function setRulesCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args.length) return ctx.reply('Usage: /setrules [rules text]');
  updateChatSetting(ctx.chat.id, 'rules', args.join(' '));
  await ctx.reply('✅ Rules updated.');
}

async function clearRulesCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  updateChatSetting(ctx.chat.id, 'rules', '');
  await ctx.reply('✅ Rules cleared.');
}

async function rulesCallback(ctx) {
  const data = ctx.callbackQuery.data;
  if (data === 'rules_ack') {
    await ctx.answerCbQuery('✅ Thanks for reading the rules!', { show_alert: true });
  } else if (data === 'rules_show') {
    const settings = getChatSettings(ctx.chat.id);
    const rules    = settings.rules || '';
    if (rules) {
      await ctx.editMessageText(`📜 *Group Rules*\n\n${rules}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('✅ I have read the rules', 'rules_ack')]]),
      });
    } else {
      await ctx.answerCbQuery('No rules set for this group.', { show_alert: true });
    }
  }
}

// ── INFO ──────────────────────────────────────────────────────────

async function idCommand(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const lang   = getChatSettings(chatId).language || 'en';
  await ctx.replyWithMarkdown(getString(lang, 'id_msg', { user_id: userId, chat_id: chatId }));
}

async function infoCommand(ctx) {
  let { userId } = await resolveTarget(ctx);
  let user;
  if (!userId) {
    user = ctx.from;
  } else {
    try {
      const m = await ctx.telegram.getChatMember(ctx.chat.id, userId);
      user = m.user;
    } catch {
      return ctx.reply('❌ Could not find user.');
    }
  }
  const mention = `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
  const lines = [
    `👤 <b>User Info</b>`,
    `• Name: ${mention}`,
    `• ID: <code>${user.id}</code>`,
  ];
  if (user.username) lines.push(`• Username: @${user.username}`);
  if (user.language_code) lines.push(`• Language: ${user.language_code}`);
  lines.push(`• Bot: ${user.is_bot ? 'Yes' : 'No'}`);
  await ctx.replyWithHTML(lines.join('\n'));
}

async function chatInfoCommand(ctx) {
  const chat    = ctx.chat;
  const members = await ctx.telegram.getChatMembersCount(chat.id);
  const lines   = [
    `📢 <b>Chat Info</b>`,
    `• Name: ${chat.title}`,
    `• ID: <code>${chat.id}</code>`,
    `• Type: ${chat.type}`,
    `• Members: ${members}`,
  ];
  if (chat.username) lines.push(`• Username: @${chat.username}`);
  await ctx.replyWithHTML(lines.join('\n'));
}

// ── LANGUAGE ──────────────────────────────────────────────────────

function langKeyboard() {
  const buttons = Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
    [Markup.button.callback(name, `lang_set_${code}`)]
  ));
  buttons.push([Markup.button.callback('🔙 Back', 'start_back')]);
  return Markup.inlineKeyboard(buttons);
}

async function languageCommand(ctx) {
  const chatId  = ctx.chat.id;
  const lang    = getChatSettings(chatId).language || 'en';
  const current = LANGUAGE_NAMES[lang] || lang;
  await ctx.replyWithMarkdown(
    `${getString(lang, 'lang_prompt')}\n\nCurrent language: *${current}*`,
    langKeyboard()
  );
}

async function setLanguageCommand(ctx) {
  const chatId = ctx.chat.id;
  if (!await isAdmin(ctx)) {
    const lang = getChatSettings(chatId).language || 'en';
    return ctx.reply(getString(lang, 'admin_only'));
  }
  const args = ctx.args || [];
  if (!args[0] || !LANGUAGE_NAMES[args[0]]) {
    return ctx.reply(`Usage: /setlang [code]\nAvailable: ${Object.keys(LANGUAGE_NAMES).join(', ')}`);
  }
  updateChatSetting(chatId, 'language', args[0]);
  await ctx.replyWithMarkdown(getString(args[0], 'lang_set'));
}

async function langCallback(ctx) {
  const data   = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;

  if (data === 'lang_menu') {
    const lang    = getChatSettings(chatId).language || 'en';
    const current = LANGUAGE_NAMES[lang] || lang;
    await ctx.editMessageText(
      `${getString(lang, 'lang_prompt')}\n\nCurrent language: *${current}*`,
      { parse_mode: 'Markdown', ...langKeyboard() }
    );
  } else if (data.startsWith('lang_set_')) {
    const newLang = data.replace('lang_set_', '');
    if (LANGUAGE_NAMES[newLang]) {
      if (!await isAdmin(ctx)) return ctx.answerCbQuery(getString('en', 'admin_only'), { show_alert: true });
      updateChatSetting(chatId, 'language', newLang);
      await ctx.answerCbQuery(`✅ Language set to ${LANGUAGE_NAMES[newLang]}`, { show_alert: true });
    }
  }
}

// ── SETTINGS ──────────────────────────────────────────────────────

function settingsKeyboard(settings) {
  const lang      = settings.language || 'en';
  const langName  = LANGUAGE_NAMES[lang] || lang;
  const wmStatus  = settings.welcome_mute  ? '✅' : '❌';
  const cwStatus  = settings.clean_welcome ? '✅' : '❌';
  const warnLimit = settings.warn_limit || 3;
  const warnMode  = settings.warn_mode  || 'ban';
  return Markup.inlineKeyboard([
    [Markup.button.callback(`🌐 Language: ${langName}`, 'lang_menu')],
    [Markup.button.callback(`Welcome Mute: ${wmStatus}`, 'settings_toggle_welcome_mute'), Markup.button.callback(`Clean Welcome: ${cwStatus}`, 'settings_toggle_clean_welcome')],
    [Markup.button.callback(`⚠️ Warn Limit: ${warnLimit}`, 'settings_warn_limit'), Markup.button.callback(`🔨 Warn Mode: ${warnMode}`, 'settings_warn_mode')],
    [Markup.button.callback('📜 View Rules', 'rules_show')],
    [Markup.button.callback('🔒 Privacy Policy', 'privacy_show')],
  ]);
}

async function settingsCommand(ctx) {
  const settings = getChatSettings(ctx.chat.id);
  await ctx.replyWithMarkdown('⚙️ *Group Settings*\n\nTap a button to change settings:', settingsKeyboard(settings));
}

async function settingsCallback(ctx) {
  const data   = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Admins only.', { show_alert: true });

  if (data === 'settings_toggle_welcome_mute') {
    const s = getChatSettings(chatId);
    updateChatSetting(chatId, 'welcome_mute', s.welcome_mute ? 0 : 1);
  } else if (data === 'settings_toggle_clean_welcome') {
    const s = getChatSettings(chatId);
    updateChatSetting(chatId, 'clean_welcome', s.clean_welcome ? 0 : 1);
  } else if (data === 'settings_warn_limit') {
    const s     = getChatSettings(chatId);
    const limit = s.warn_limit || 3;
    updateChatSetting(chatId, 'warn_limit', limit >= 10 ? 3 : limit + 1);
  } else if (data === 'settings_warn_mode') {
    const s     = getChatSettings(chatId);
    const modes = ['ban','kick','mute'];
    const mode  = s.warn_mode || 'ban';
    updateChatSetting(chatId, 'warn_mode', modes[(modes.indexOf(mode) + 1) % modes.length]);
  }

  const updated = getChatSettings(chatId);
  try { await ctx.editMessageReplyMarkup(settingsKeyboard(updated).reply_markup); } catch {}
  await ctx.answerCbQuery();
}

// ── PRIVACY ───────────────────────────────────────────────────────

const PRIVACY_TEXT = `🔒 *Privacy Policy & Terms of Service*

*1. Data We Collect*
• Telegram user IDs and chat IDs (for functionality only)
• Warning counts and note content you explicitly save
• Language preferences and group settings

*2. How We Use Your Data*
• To provide group moderation features
• Data is never sold or shared with third parties

*3. Data Storage*
• All data is stored locally on the bot server
• Admins can delete all data with /clearall

*4. User Rights*
• You may request deletion of your data at any time

*5. Legal Compliance*
• This bot complies with Telegram's Terms of Service

By using this bot, you agree to these terms.`;

async function privacyCommand(ctx) {
  await ctx.replyWithMarkdown(PRIVACY_TEXT, Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'start_back')],
  ]));
}

async function privacyCallback(ctx) {
  const data = ctx.callbackQuery.data;
  if (data === 'privacy_show') {
    await ctx.editMessageText(PRIVACY_TEXT, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'start_back')]]) });
  }
  await ctx.answerCbQuery();
}

// ── FUN ───────────────────────────────────────────────────────────

const SLAP_TEMPLATES = [
  '{user} slaps {target} around a bit with a large trout 🐟',
  '{user} gives {target} a powerful slap! 👋',
  '{user} slaps {target} with a rubber chicken 🐔',
  '{user} bonks {target} on the head! 🔨',
];
const HUG_TEMPLATES = [
  '{user} gives {target} a warm hug! 🤗',
  '{user} squeezes {target} tightly! 🫂',
  '{user} wraps {target} in a big bear hug! 🐻',
  '{user} sends {target} a virtual hug! 💗',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function userMention(u) { return `<a href="tg://user?id=${u.id}">${u.first_name}</a>`; }

async function slapCommand(ctx) {
  const user   = userMention(ctx.from);
  const replied = ctx.message.reply_to_message;
  const target  = replied ? userMention(replied.from) : (ctx.args?.length ? `<b>${ctx.args.join(' ')}</b>` : '<b>the air</b>');
  await ctx.replyWithHTML(pick(SLAP_TEMPLATES).replace('{user}', user).replace('{target}', target));
}

async function hugCommand(ctx) {
  const user   = userMention(ctx.from);
  const replied = ctx.message.reply_to_message;
  const target  = replied ? userMention(replied.from) : (ctx.args?.length ? `<b>${ctx.args.join(' ')}</b>` : '<b>everyone</b>');
  await ctx.replyWithHTML(pick(HUG_TEMPLATES).replace('{user}', user).replace('{target}', target));
}

async function rollCommand(ctx) {
  const sides  = Math.max(2, parseInt(ctx.args?.[0], 10) || 6);
  const result = Math.ceil(Math.random() * sides);
  await ctx.replyWithMarkdown(`🎲 Rolled a ${sides}-sided die: *${result}*`);
}

async function flipCommand(ctx) {
  await ctx.replyWithMarkdown(`🪙 Coin flip: *${Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🌟'}*`);
}

async function shrugCommand(ctx) {
  await ctx.reply('¯\\_(ツ)_/¯');
}

module.exports = {
  // admin
  promoteCommand, demoteCommand, setTitleCommand, adminsCommand, inviteLinkCommand,
  // rules
  rulesCommand, setRulesCommand, clearRulesCommand, rulesCallback,
  // info
  idCommand, infoCommand, chatInfoCommand,
  // language
  languageCommand, setLanguageCommand, langCallback,
  // settings
  settingsCommand, settingsCallback,
  // privacy
  privacyCommand, privacyCallback,
  // fun
  slapCommand, hugCommand, rollCommand, flipCommand, shrugCommand,
};
