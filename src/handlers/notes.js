'use strict';
const { Markup } = require('telegraf');
const { isAdmin } = require('./utils');
const { saveNote, getNote, listNotes, deleteNote, deleteAllNotes } = require('../db/database');

async function saveNoteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (args.length < 2) return ctx.reply('Usage: /save [name] [content]');
  const name    = args[0].toLowerCase();
  const content = args.slice(1).join(' ');
  saveNote(ctx.chat.id, name, content);
  await ctx.replyWithMarkdown(`📌 Note *${name}* saved.`);
}

async function getNoteCommand(ctx) {
  const args = ctx.args || [];
  if (!args[0]) return ctx.reply('Usage: /get [name]');
  const name    = args[0].toLowerCase();
  const content = getNote(ctx.chat.id, name);
  if (content) await ctx.replyWithMarkdown(`📌 *${name}*\n\n${content}`);
  else         await ctx.replyWithMarkdown(`❌ Note *${name}* not found.`);
}

async function listNotesCommand(ctx) {
  const names = listNotes(ctx.chat.id);
  if (!names.length) return ctx.reply('No notes saved yet.');
  const buttons = names.map(n => [Markup.button.callback(`#${n}`, `notes_get_${n}`)]);
  await ctx.replyWithMarkdown(
    `📋 *Saved notes (${names.length}):*`,
    Markup.inlineKeyboard(buttons)
  );
}

async function clearNoteCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  const args = ctx.args || [];
  if (!args[0]) return ctx.reply('Usage: /clear [name]');
  deleteNote(ctx.chat.id, args[0].toLowerCase());
  await ctx.replyWithMarkdown(`🗑 Note *${args[0]}* deleted.`);
}

async function clearAllNotesCommand(ctx) {
  if (!await isAdmin(ctx)) return;
  await ctx.replyWithMarkdown(
    '⚠️ Are you sure you want to delete *all* notes?',
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Yes, clear all', 'notes_clearall_confirm'), Markup.button.callback('❌ Cancel', 'notes_clearall_cancel')],
    ])
  );
}

async function notesCallback(ctx) {
  const data    = ctx.callbackQuery.data;
  const chatId  = ctx.chat.id;

  if (data.startsWith('notes_get_')) {
    const name    = data.replace('notes_get_', '');
    const content = getNote(chatId, name);
    if (content) {
      await ctx.answerCbQuery();
      await ctx.replyWithMarkdown(`📌 *${name}*\n\n${content}`);
    } else {
      await ctx.answerCbQuery('Note not found.', { show_alert: true });
    }
  } else if (data === 'notes_clearall_confirm') {
    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Admins only.', { show_alert: true });
    deleteAllNotes(chatId);
    await ctx.editMessageText('🗑 All notes deleted.');
  } else if (data === 'notes_clearall_cancel') {
    await ctx.editMessageText('❌ Cancelled.');
  }
}

module.exports = { saveNoteCommand, getNoteCommand, listNotesCommand, clearNoteCommand, clearAllNotesCommand, notesCallback };
