'use strict';
const { Markup } = require('telegraf');
const { getChatSettings } = require('../db/database');
const { getString, LANGUAGE_NAMES } = require('../locales');

const BOT_USERNAME = process.env.BOT_USERNAME || 'YourBotUsername';

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📚 Help', 'help_main'), Markup.button.callback('🌐 Language', 'lang_menu')],
    [Markup.button.callback('⚙️ Settings', 'settings_main'), Markup.button.callback('📜 Rules', 'rules_show')],
    [Markup.button.callback('🔒 Privacy Policy', 'privacy_show'), Markup.button.callback('💝 Donate', 'start_donate')],
    [Markup.button.url('➕ Add me to your group', `https://t.me/${BOT_USERNAME}?startgroup=true`)],
  ]);
}

async function startCommand(ctx) {
  const chatId = ctx.chat.id;
  const settings = getChatSettings(chatId);
  const lang = settings.language || 'en';
  const name = ctx.from.first_name || 'there';
  const text = getString(lang, 'start_msg', { name });
  await ctx.replyWithMarkdown(text, mainMenu());
}

async function aboutCommand(ctx) {
  const text = `🌹 *GalaxyBot*\n\nA feature\\-rich Telegram group management bot\\.\n\n• Multi\\-language support\n• Moderation \\(ban, kick, mute, warns\\)\n• Notes & Filters\n• Welcome & Goodbye messages\n• Rules management\n• Blacklist & Anti\\-spam\n\nBuilt with Node\\.js & Telegraf\\.`;
  await ctx.reply(text.replace(/\\-/g, '-').replace(/\\./g, '.'), { parse_mode: 'Markdown' });
}

async function donateCommand(ctx) {
  await ctx.replyWithMarkdown(
    '💝 *Support GalaxyBot*\n\nIf you find this bot useful, consider supporting its development!\n\nYour support helps keep the servers running and enables new features.',
    Markup.inlineKeyboard([[Markup.button.url('❤️ Support', 'https://example.com/donate')]])
  );
}

async function buttonCallback(ctx) {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;
  const settings = getChatSettings(chatId);
  const lang = settings.language || 'en';

  if (data === 'start_donate') {
    await ctx.editMessageText(
      '💝 *Support GalaxyBot*\n\nYour support is appreciated!',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'start_back')]]) }
    );
  } else if (data === 'start_back') {
    const text = getString(lang, 'start_msg', { name: ctx.from.first_name });
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...mainMenu() });
  }
  await ctx.answerCbQuery();
}

module.exports = { startCommand, aboutCommand, donateCommand, buttonCallback, mainMenu };
