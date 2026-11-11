import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_PASSWORD, ADMIN_USER, DATA_DIR } from '../config.ts';
import { ensureAdminUser } from './auth.ts';

// 去掉容易混淆的 0/O、1/l/I，避免手抄密码出错
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function randomPassword(length = 20) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

/**
 * 首次启动创建管理员：优先用 ADMIN_PASSWORD；未设置时生成随机密码，
 * 写入 DATA_DIR/admin-initial.txt（权限 600），控制台只提示文件路径，不打印明文。
 */
export function ensureInitialAdmin(db) {
  const fromEnv = Boolean(ADMIN_PASSWORD);
  const password = fromEnv ? ADMIN_PASSWORD : randomPassword();
  const { created } = ensureAdminUser(db, ADMIN_USER, password);
  if (!created) return { created: false, generated: false, file: null };
  if (fromEnv) return { created: true, generated: false, file: null };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, 'admin-initial.txt');
  fs.writeFileSync(
    file,
    'username=' + ADMIN_USER + '\npassword=' + password + '\ncreated=' + new Date().toISOString() + '\n',
    { mode: 0o600 }
  );
  try { fs.chmodSync(file, 0o600); } catch { /* Windows 上 chmod 无实际作用 */ }
  return { created: true, generated: true, file };
}
