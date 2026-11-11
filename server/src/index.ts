import { buildApp } from './app.ts';
import { cleanupSessions } from './lib/auth.ts';
import { ADMIN_USER, HOST, PORT } from './config.ts';
import { ensureInitialAdmin } from './lib/admin-bootstrap.ts';

const app = await buildApp();
const db = app.db;

const admin = ensureInitialAdmin(db);
if (admin.created) {
  if (admin.file) {
    app.log.warn('已创建初始管理员 ' + ADMIN_USER + '，随机密码已写入 ' + admin.file + '（登录后立即修改，并删除该文件）');
    console.log('\n[初始化] 管理员账号 ' + ADMIN_USER + '\n[初始化] 随机密码已写入 ' + admin.file + '，查看后登录并立即修改\n');
  } else {
    app.log.warn('已创建初始管理员 ' + ADMIN_USER + '，密码来自 ADMIN_PASSWORD 环境变量（登录后立即修改）');
    console.log('\n[初始化] 管理员账号 ' + ADMIN_USER + ' / 密码来自 ADMIN_PASSWORD 环境变量\n');
  }
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
