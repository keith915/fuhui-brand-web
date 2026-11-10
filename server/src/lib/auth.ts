import crypto from 'node:crypto';
import { SESSION_TTL_HOURS } from '../config.ts';
import { nowIso } from '../db/index.ts';

export const COOKIE_NAME = 'fh_sid';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const expected = Buffer.from(String(hash), 'hex');
  const actual = crypto.scryptSync(String(password), String(salt), 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function createSession(db, userId, meta = {}) {
  const id = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const created = new Date();
  const expires = new Date(created.getTime() + SESSION_TTL_HOURS * 3600 * 1000);
  db.prepare('INSERT INTO sessions (id, user_id, csrf, created_at, expires_at, ip, ua) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, csrf, created.toISOString(), expires.toISOString(), String(meta.ip || ''), String(meta.ua || '').slice(0, 255));
  return { id, csrf, expiresAt: expires.toISOString() };
}

export function getSession(db, sessionId) {
  if (!sessionId) return null;
  const row = db.prepare(`SELECT s.id AS sid, s.csrf, s.expires_at, u.id, u.username, u.role, u.disabled
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(sessionId);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(db, sessionId);
    return null;
  }
  if (row.disabled) return null;
  return {
    id: row.sid,
    csrf: row.csrf,
    expiresAt: row.expires_at,
    user: { id: row.id, username: row.username, role: row.role }
  };
}

export function destroySession(db, sessionId) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function cleanupSessions(db) {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso());
}

export function ensureAdminUser(db, username, password) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return { created: false };
  const { salt, hash } = hashPassword(password);
  db.prepare('INSERT INTO users (username, pass_hash, salt, role, disabled, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .run(username, hash, salt, 'admin', nowIso());
  return { created: true, username };
}
