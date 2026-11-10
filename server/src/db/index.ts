import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const schemaFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

export function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(fs.readFileSync(schemaFile, 'utf8'));
  const row = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get('001');
  if (!row) {
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run('001', new Date().toISOString());
  }
  return db;
}

export function nowIso() {
  return new Date().toISOString();
}

export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}
