'use strict';
/**
 * utils.js — Shared helpers (mirrors handlers/utils.py)
 */

/**
 * Returns true if the sender is a group admin or creator.
 * In private chats, always returns true.
 */
async function isAdmin(ctx) {
  const chat = ctx.chat;
  if (!chat || chat.type === 'private') return true;
  try {
    const member = await ctx.telegram.getChatMember(chat.id, ctx.from.id);
    return ['administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

/**
 * Resolves target user from reply or first arg (@username / user_id).
 * Returns { userId, mention } or { userId: null, mention: null }.
 */
async function resolveTarget(ctx) {
  const msg = ctx.message;

  // From reply
  if (msg?.reply_to_message?.from) {
    const u = msg.reply_to_message.from;
    return { userId: u.id, mention: mentionHtml(u) };
  }

  // From args
  const args = ctx.args || [];
  if (args.length > 0) {
    const arg = args[0];
    const numId = parseInt(arg, 10);
    if (!isNaN(numId)) {
      return { userId: numId, mention: `<a href="tg://user?id=${numId}">${numId}</a>` };
    }
    // @username lookup
    const username = arg.replace(/^@/, '');
    try {
      const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, username);
      if (chatMember?.user) {
        return { userId: chatMember.user.id, mention: mentionHtml(chatMember.user) };
      }
    } catch { /* not found */ }
  }

  return { userId: null, mention: null };
}

/**
 * Build an HTML mention for a user object.
 */
function mentionHtml(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || String(user.id);
  return `<a href="tg://user?id=${user.id}">${escapeHtml(name)}</a>`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parse time strings like '30m', '2h', '1d' → seconds.
 * Returns null if not parseable.
 */
function parseTime(arg) {
  if (!arg) return null;
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  const unit = arg.slice(-1).toLowerCase();
  const num  = parseInt(arg.slice(0, -1), 10);
  if (units[unit] && !isNaN(num) && num > 0) return num * units[unit];
  return null;
}

module.exports = { isAdmin, resolveTarget, mentionHtml, escapeHtml, parseTime };
