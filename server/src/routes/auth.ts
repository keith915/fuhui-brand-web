import { z } from 'zod';
import { COOKIE_NAME, cleanupSessions, createSession, destroySession, verifyPassword } from '../lib/auth.ts';
import { SESSION_TTL_HOURS, SECURE_COOKIE } from '../config.ts';
import { fail, guardCsrf, ok, parseBody } from '../lib/http.ts';

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200)
});

export async function authRoutes(app, ctx) {
  const { db, requireAuth } = ctx;

  app.post('/api/auth/login', { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parsed = parseBody(loginSchema, req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(parsed.data.username);
    if (!user || user.disabled || !verifyPassword(parsed.data.password, user.salt, user.pass_hash)) {
      return fail(reply, '用户名或密码错误', 401);
    }
    cleanupSessions(db);
    const session = createSession(db, user.id, { ip: req.ip, ua: req.headers['user-agent'] });
    reply.setCookie(COOKIE_NAME, session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE_COOKIE,
      maxAge: SESSION_TTL_HOURS * 3600
    });
    return ok(reply, {
      user: { id: user.id, username: user.username, role: user.role },
      csrf: session.csrf
    });
  });

  app.post('/api/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    destroySession(db, req.session.id);
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return ok(reply);
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (req, reply) => {
    return ok(reply, { user: req.user, csrf: req.session.csrf });
  });
}
