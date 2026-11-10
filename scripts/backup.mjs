import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/src/db/index.ts';
import { copyDir } from '../server/src/lib/build.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keep = Number(process.env.BACKUP_KEEP || 14);
const dir = path.join(ROOT, 'backups');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.mkdirSync(dir, { recursive: true });

const dbFile = path.join(dir, 'app-' + stamp + '.db');
const db = openDb(path.join(ROOT, 'data', 'app.db'));
db.exec("VACUUM INTO '" + dbFile.replace(/'/g, "''") + "'");
console.log('db backup:', dbFile);

const uploads = path.join(ROOT, 'data', 'uploads');
if (fs.existsSync(uploads)) {
  const target = path.join(dir, 'uploads-' + stamp);
  copyDir(uploads, target);
  console.log('uploads backup:', target);
}

const entries = fs.readdirSync(dir).sort();
const groups = new Map();
for (const name of entries) {
  const m = /^(app|uploads)-([0-9]+)/.exec(name);
  if (!m) continue;
  if (!groups.has(m[2])) groups.set(m[2], []);
  groups.get(m[2]).push(name);
}
const stamps = [...groups.keys()].sort().reverse();
for (const old of stamps.slice(keep)) {
  for (const name of groups.get(old)) {
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}
console.log('backups kept:', Math.min(stamps.length, keep));
