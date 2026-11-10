import { fail, guardCsrf, ok } from '../lib/http.ts';
import { hashPassword } from '../lib/auth.ts';
import { nowIso } from '../db/index.ts';
import { restoreSnapshot } from '../lib/publish.ts';
import { z } from 'zod';

export async function systemRoutes(app, ctx) {
  const { db, requireAuth, requireAdmin, publisher } = ctx;

  app.get('/api/healthz', async (req, reply) => {
    return ok(reply, { status: 'ok', time: nowIso() });
  });

  app.get('/api/publish/status', { preHandler: requireAuth }, async (req, reply) => {
    const last = db.prepare('SELECT * FROM publish_log ORDER BY id DESC LIMIT 1').get() || null;
    return ok(reply, { busy: publisher.isBusy(), last });
  });

  app.get('/api/publish/log', { preHandler: requireAuth }, async (req, reply) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const logs = db.prepare('SELECT * FROM publish_log ORDER BY id DESC LIMIT ?').all(limit);
    const snapshots = db.prepare('SELECT id, label, created_at FROM content_snapshots ORDER BY id DESC LIMIT ?').all(limit);
    return ok(reply, { logs, snapshots });
  });

  app.post('/api/publish', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 120) : 'manual';
    try {
      const result = publisher.publish(label);
      return ok(reply, result);
    } catch (err) {
      return fail(reply, err.message || '发布失败', err.statusCode || 500);
    }
  });

  app.post('/api/publish/rollback/:id', { preHandler: requireAdmin }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(reply, '无效的版本 ID', 422);
    try {
      restoreSnapshot(db, id);
      const result = publisher.publish('rollback:' + id);
      return ok(reply, { ...result, rolledBackTo: id });
    } catch (err) {
      return fail(reply, err.message || '回滚失败', err.statusCode || 500);
    }
  });

  app.get('/api/users', { preHandler: requireAdmin }, async (req, reply) => {
    return ok(reply, { users: db.prepare('SELECT id, username, role, disabled, created_at FROM users ORDER BY id').all() });
  });

  const userSchema = z.object({
    username: z.string().min(2).max(64).regex(/^[A-Za-z0-9_.-]+$/, '只能用字母数字与 _ . -'),
    password: z.string().min(8).max(200),
    role: z.enum(['admin', 'editor']).default('editor')
  });

  app.post('/api/users', { preHandler: requireAdmin }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) return fail(reply, parsed.error.issues[0]?.message || '参数不合法', 422);
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(parsed.data.username);
    if (exists) return fail(reply, '用户名已存在', 409);
    const { salt, hash } = hashPassword(parsed.data.password);
    const info = db.prepare('INSERT INTO users (username, pass_hash, salt, role, disabled, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .run(parsed.data.username, hash, salt, parsed.data.role, nowIso());
    return ok(reply, { user: db.prepare('SELECT id, username, role, disabled, created_at FROM users WHERE id = ?').get(Number(info.lastInsertRowid)) }, 201);
  });

  app.patch('/api/users/:id', { preHandler: requireAdmin }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const id = Number(req.params.id);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) return fail(reply, '账号不存在', 404);
    const parsed = z.object({
      password: z.string().min(8).max(200).optional(),
      role: z.enum(['admin', 'editor']).optional(),
      disabled: z.boolean().optional()
    }).safeParse(req.body);
    if (!parsed.success) return fail(reply, parsed.error.issues[0]?.message || '参数不合法', 422);
    const body = parsed.data;
    if (body.disabled && req.user.id === id) return fail(reply, '不能停用当前登录账号', 409);
    if (body.role === 'editor' && req.user.id === id) return fail(reply, '不能降级当前登录账号', 409);
    if (body.password) {
      const { salt, hash } = hashPassword(body.password);
      db.prepare('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?').run(hash, salt, id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    }
    if (body.role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, id);
    if (body.disabled != null) db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(body.disabled ? 1 : 0, id);
    return ok(reply, { user: db.prepare('SELECT id, username, role, disabled, created_at FROM users WHERE id = ?').get(id) });
  });

  app.delete('/api/users/:id', { preHandler: requireAdmin }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const id = Number(req.params.id);
    if (req.user.id === id) return fail(reply, '不能删除当前登录账号', 409);
    const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND disabled = 0").get().n;
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (!target) return fail(reply, '账号不存在', 404);
    if (target.role === 'admin' && admins <= 1) return fail(reply, '至少保留一个管理员', 409);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return ok(reply, { deleted: id });
  });
}
