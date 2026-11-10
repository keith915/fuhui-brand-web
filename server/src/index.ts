import crypto from 'node:crypto';
import { buildApp } from './app.ts';
import { cleanupSessions, ensureAdminUser } from './lib/auth.ts';
import { ADMIN_PASSWORD, ADMIN_USER, HOST, PORT } from './config.ts';

const app = await buildApp();
const db = app.db;

const initialPassword = ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
const { created } = ensureAdminUser(db, ADMIN_USER, initialPassword);
if (created) {
  app.log.warn('已创建初始管理员 ' + ADMIN_USER + '，初始密码：' + initialPassword + '（请登录后立即修改）');
  console.log('\n[初始化] 管理员账号 ' + ADMIN_USER + ' / 初始密码 ' + initialPassword + '\n');
}

const timer = setInterval(() => cleanupSessions(db), 30 * 60 * 1000);
timer.unref();

const close = async () => {
  try { await app.close(); } finally { process.exit(0); }
};
process.on('SIGINT', close);
process.on('SIGTERM', close);

await app.listen({ port: PORT, host: HOST });
console.log('admin: http://' + HOST + ':' + PORT + '/admin/');
