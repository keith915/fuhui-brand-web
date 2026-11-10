import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { openDb } from '../src/db/index.ts';
import { cleanupSessions, createSession, destroySession, ensureAdminUser, getSession, hashPassword, verifyPassword } from '../src/lib/auth.ts';

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-auth-'));
  return { db: openDb(path.join(dir, 'app.db')), dir };
}

test('password hashing round-trips and rejects wrong passwords', () => {
  const { salt, hash } = hashPassword('CorrectHorse1');
  assert.equal(verifyPassword('CorrectHorse1', salt, hash), true);
  assert.equal(verifyPassword('WrongHorse1', salt, hash), false);
  const other = hashPassword('CorrectHorse1');
  assert.notEqual(other.salt, salt);
  assert.equal(verifyPassword('CorrectHorse1', other.salt, other.hash), true);
});

test('ensureAdminUser only creates the first account', () => {
  const { db } = tempDb();
  const first = ensureAdminUser(db, 'admin', 'pass12345');
  assert.equal(first.created, true);
  const second = ensureAdminUser(db, 'other', 'pass12345');
  assert.equal(second.created, false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
});

test('sessions can be created, read and destroyed', () => {
  const { db } = tempDb();
  ensureAdminUser(db, 'admin', 'pass12345');
  const user = db.prepare('SELECT id FROM users').get();
  const session = createSession(db, user.id, { ip: '127.0.0.1', ua: 'test' });
  const loaded = getSession(db, session.id);
  assert.equal(loaded.user.username, 'admin');
  assert.equal(loaded.csrf, session.csrf);
  destroySession(db, session.id);
  assert.equal(getSession(db, session.id), null);
});

test('disabled users lose their session', () => {
  const { db } = tempDb();
  ensureAdminUser(db, 'admin', 'pass12345');
  const user = db.prepare('SELECT id FROM users').get();
  const session = createSession(db, user.id);
  db.prepare('UPDATE users SET disabled = 1 WHERE id = ?').run(user.id);
  assert.equal(getSession(db, session.id), null);
});
