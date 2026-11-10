import * as fs from 'node:fs';
import * as path from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { openDb } from './db/index.ts';
import { COOKIE_NAME, getSession } from './lib/auth.ts';
import { createPublisher } from './lib/publish.ts';
import { authRoutes } from './routes/auth.ts';
import { contentRoutes } from './routes/content.ts';
import { newsRoutes } from './routes/news.ts';
import { mediaRoutes } from './routes/media.ts';
import { systemRoutes } from './routes/system.ts';
import { ADMIN_DIST, DATA_DIR, DB_PATH, DIST_DIR, FRAGMENT_DIR, ROOT, TEMPLATE_FILE, UPLOAD_DIR, RELEASES_DIR } from './config.ts';

export async function buildApp(opts = {}) {
  const cfg = {
    root: opts.root || ROOT,
    dataDir: opts.dataDir || DATA_DIR,
    dbPath: opts.dbPath || DB_PATH,
    distDir: opts.distDir || DIST_DIR,
    adminDist: opts.adminDist || ADMIN_DIST,
    uploadDir: opts.uploadDir || UPLOAD_DIR,
    releasesDir: opts.releasesDir || RELEASES_DIR,
    templateFile: opts.templateFile || TEMPLATE_FILE,
    fragmentDir: opts.fragmentDir || FRAGMENT_DIR
  };

  const db = opts.db || openDb(cfg.dbPath);
  const app = Fastify({
    logger: opts.logger === false ? false : { level: process.env.LOG_LEVEL || 'info' },
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024
  });

  app.decorate('db', db);
  const publisher = createPublisher(db, cfg);
  app.decorate('publisher', publisher);

  const requireAuth = async (req, reply) => {
    const sid = req.cookies ? req.cookies[COOKIE_NAME] : null;
    const session = sid ? getSession(db, sid) : null;
    if (!session) {
      reply.code(401).send({ ok: false, error: '未登录或会话已过期' });
      return;
    }
    req.session = session;
    req.user = session.user;
  };
  const requireAdmin = async (req, reply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;
    if (!req.user || req.user.role !== 'admin') {
      reply.code(403).send({ ok: false, error: '需要管理员权限' });
    }
  };

  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false });
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  await app.register(rateLimit, { global: false });

  fs.mkdirSync(cfg.uploadDir, { recursive: true });
  fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true });

  const ctx = { db, publisher, requireAuth, requireAdmin, uploadDir: cfg.uploadDir, paths: cfg };

  await app.register(async (scope) => { await authRoutes(scope, ctx); });
  await app.register(async (scope) => { await contentRoutes(scope, ctx); });
  await app.register(async (scope) => { await newsRoutes(scope, ctx); });
  await app.register(async (scope) => { await mediaRoutes(scope, ctx); });
  await app.register(async (scope) => { await systemRoutes(scope, ctx); });

  const hasDist = fs.existsSync(cfg.distDir);
  if (hasDist) {
    await app.register(fastifyStatic, {
      root: cfg.distDir,
      prefix: '/',
      index: ['index.html'],
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
      }
    });
  }
  if (fs.existsSync(cfg.adminDist)) {
    await app.register(fastifyStatic, {
      root: cfg.adminDist,
      prefix: '/admin/',
      decorateReply: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
      }
    });
  }
  await app.register(fastifyStatic, {
    root: cfg.uploadDir,
    prefix: '/media/',
    decorateReply: false,
    maxAge: '7d'
  });

  app.get('/admin', async (req, reply) => reply.redirect('/admin/'));

  app.setNotFoundHandler(async (req, reply) => {
    const url = req.raw.url || '';
    if (req.method === 'GET' && url.startsWith('/admin') && fs.existsSync(path.join(cfg.adminDist, 'index.html'))) {
      reply.type('text/html').send(fs.readFileSync(path.join(cfg.adminDist, 'index.html'), 'utf8'));
      return;
    }
    if (url.startsWith('/api/')) {
      reply.code(404).send({ ok: false, error: '接口不存在' });
      return;
    }
    reply.code(404).type('text/plain; charset=utf-8').send(
      hasDist ? '404 Not Found' : '站点尚未发布：请运行 npm run seed && npm run build:site'
    );
  });

  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    reply.code(status).send({
      ok: false,
      error: status >= 500 ? '服务器内部错误：' + (err.message || '') : (err.message || '请求失败')
    });
  });

  return app;
}
