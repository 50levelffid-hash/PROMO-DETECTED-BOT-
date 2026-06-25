'use strict';
/**
 * db/database.js — SQLite persistence layer (better-sqlite3)
 * Mirrors the Python database.py exactly.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../GalaxyBot.db');
const db = new Database(DB_PATH);

// Enable WAL for better concurrency
db.pragma('journal_mode = WAL');

// ── Schema ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_settings (
    chat_id     INTEGER PRIMARY KEY,
    language    TEXT    DEFAULT 'en',
    warn_limit  INTEGER DEFAULT 3,
    warn_mode   TEXT    DEFAULT 'ban',
    welcome_msg TEXT    DEFAULT '',
    goodbye_msg TEXT    DEFAULT '',
    clean_welcome INTEGER DEFAULT 0,
    welcome_mute  INTEGER DEFAULT 0,
    rules       TEXT    DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS user_warns (
    chat_id INTEGER,
    user_id INTEGER,
    count   INTEGER DEFAULT 0,
    PRIMARY KEY (chat_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    chat_id    INTEGER,
    name       TEXT,
    content    TEXT,
    PRIMARY KEY (chat_id, name)
  );

  CREATE TABLE IF NOT EXISTS filters (
    chat_id  INTEGER,
    keyword  TEXT,
    response TEXT,
    PRIMARY KEY (chat_id, keyword)
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    chat_id INTEGER,
    word    TEXT,
    PRIMARY KEY (chat_id, word)
  );

  CREATE TABLE IF NOT EXISTS blacklist_mode (
    chat_id INTEGER PRIMARY KEY,
    mode    TEXT DEFAULT 'delete'
  );
`);

// ── Chat Settings ─────────────────────────────────────────────────
function getChatSettings(chatId) {
  let row = db.prepare('SELECT * FROM chat_settings WHERE chat_id = ?').get(chatId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO chat_settings (chat_id) VALUES (?)').run(chatId);
    row = db.prepare('SELECT * FROM chat_settings WHERE chat_id = ?').get(chatId);
  }
  return row;
}

function updateChatSetting(chatId, key, value) {
  // Whitelist allowed keys to prevent SQL injection
  const allowed = ['language','warn_limit','warn_mode','welcome_msg','goodbye_msg',
                   'clean_welcome','welcome_mute','rules'];
  if (!allowed.includes(key)) throw new Error(`Invalid setting key: ${key}`);
  db.prepare(
    `INSERT INTO chat_settings (chat_id, ${key}) VALUES (?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET ${key} = excluded.${key}`
  ).run(chatId, value);
}

// ── Warns ─────────────────────────────────────────────────────────
function addWarn(chatId, userId) {
  db.prepare(
    `INSERT INTO user_warns (chat_id, user_id, count) VALUES (?, ?, 1)
     ON CONFLICT(chat_id, user_id) DO UPDATE SET count = count + 1`
  ).run(chatId, userId);
  return db.prepare('SELECT count FROM user_warns WHERE chat_id = ? AND user_id = ?')
           .get(chatId, userId).count;
}

function getWarns(chatId, userId) {
  const row = db.prepare('SELECT count FROM user_warns WHERE chat_id = ? AND user_id = ?')
                .get(chatId, userId);
  return row ? row.count : 0;
}

function resetWarns(chatId, userId) {
  db.prepare('UPDATE user_warns SET count = 0 WHERE chat_id = ? AND user_id = ?')
    .run(chatId, userId);
}

function removeOneWarn(chatId, userId) {
  db.prepare(
    'UPDATE user_warns SET count = MAX(0, count - 1) WHERE chat_id = ? AND user_id = ?'
  ).run(chatId, userId);
  return getWarns(chatId, userId);
}

// ── Notes ─────────────────────────────────────────────────────────
function saveNote(chatId, name, content) {
  db.prepare(
    `INSERT INTO notes (chat_id, name, content) VALUES (?, ?, ?)
     ON CONFLICT(chat_id, name) DO UPDATE SET content = excluded.content`
  ).run(chatId, name.toLowerCase(), content);
}

function getNote(chatId, name) {
  const row = db.prepare('SELECT content FROM notes WHERE chat_id = ? AND name = ?')
                .get(chatId, name.toLowerCase());
  return row ? row.content : null;
}

function listNotes(chatId) {
  return db.prepare('SELECT name FROM notes WHERE chat_id = ? ORDER BY name')
           .all(chatId).map(r => r.name);
}

function deleteNote(chatId, name) {
  db.prepare('DELETE FROM notes WHERE chat_id = ? AND name = ?').run(chatId, name.toLowerCase());
}

function deleteAllNotes(chatId) {
  db.prepare('DELETE FROM notes WHERE chat_id = ?').run(chatId);
}

// ── Filters ───────────────────────────────────────────────────────
function addFilter(chatId, keyword, response) {
  db.prepare(
    `INSERT INTO filters (chat_id, keyword, response) VALUES (?, ?, ?)
     ON CONFLICT(chat_id, keyword) DO UPDATE SET response = excluded.response`
  ).run(chatId, keyword.toLowerCase(), response);
}

function getFilters(chatId) {
  return db.prepare('SELECT keyword, response FROM filters WHERE chat_id = ? ORDER BY keyword')
           .all(chatId);
}

function removeFilter(chatId, keyword) {
  db.prepare('DELETE FROM filters WHERE chat_id = ? AND keyword = ?')
    .run(chatId, keyword.toLowerCase());
}

function removeAllFilters(chatId) {
  db.prepare('DELETE FROM filters WHERE chat_id = ?').run(chatId);
}

// ── Blacklist ─────────────────────────────────────────────────────
function addBlacklistWord(chatId, word) {
  db.prepare('INSERT OR IGNORE INTO blacklist (chat_id, word) VALUES (?, ?)')
    .run(chatId, word.toLowerCase());
}

function getBlacklist(chatId) {
  return db.prepare('SELECT word FROM blacklist WHERE chat_id = ? ORDER BY word')
           .all(chatId).map(r => r.word);
}

function removeBlacklistWord(chatId, word) {
  db.prepare('DELETE FROM blacklist WHERE chat_id = ? AND word = ?')
    .run(chatId, word.toLowerCase());
}

function getBlacklistMode(chatId) {
  const row = db.prepare('SELECT mode FROM blacklist_mode WHERE chat_id = ?').get(chatId);
  return row ? row.mode : 'delete';
}

function setBlacklistMode(chatId, mode) {
  db.prepare(
    `INSERT INTO blacklist_mode (chat_id, mode) VALUES (?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET mode = excluded.mode`
  ).run(chatId, mode);
}

module.exports = {
  getChatSettings, updateChatSetting,
  addWarn, getWarns, resetWarns, removeOneWarn,
  saveNote, getNote, listNotes, deleteNote, deleteAllNotes,
  addFilter, getFilters, removeFilter, removeAllFilters,
  addBlacklistWord, getBlacklist, removeBlacklistWord, getBlacklistMode, setBlacklistMode,
};
