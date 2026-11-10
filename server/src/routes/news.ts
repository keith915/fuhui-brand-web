import { z } from 'zod';
import { fail, guardCsrf, ok, parseBody } from '../lib/http.ts';
import { nowIso } from '../db/index.ts';

const newsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  kind_zh: z.string().max(32).default('新闻'),
  kind_en: z.string().max(32).default('News'),
  title_zh: z.string().min(1).max(200),
  title_en: z.string().max(200).default(''),
  summary_zh: z.string().max(500).default(''),
  summary_en: z.string().max(500).default(''),
  published: z.boolean().default(true),
  sort: z.number().int().min(0).max(9999).default(0)
});

export async function newsRoutes(app, ctx) {
  const { db, requireAuth } = ctx;

  app.get('/api/news', { preHandler: requireAuth }, async (req, reply) => {
    return ok(reply, { news: db.prepare('SELECT * FROM news ORDER BY date DESC, sort ASC, id DESC').all() });
  });

  app.post('/api/news', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const parsed = parseBody(newsSchema, req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    const n = parsed.data;
    const info = db.prepare('INSERT INTO news (date, kind_zh, kind_en, title_zh, title_en, summary_zh, summary_en, published, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(n.date, n.kind_zh, n.kind_en, n.title_zh, n.title_en, n.summary_zh, n.summary_en, n.published ? 1 : 0, n.sort);
    return ok(reply, { news: db.prepare('SELECT * FROM news WHERE id = ?').get(Number(info.lastInsertRowid)) }, 201);
  });

  app.put('/api/news/:id', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(reply, '无效的动态 ID', 422);
    const existing = db.prepare('SELECT id FROM news WHERE id = ?').get(id);
    if (!existing) return fail(reply, '动态不存在', 404);
    const parsed = parseBody(newsSchema, req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    const n = parsed.data;
    db.prepare('UPDATE news SET date = ?, kind_zh = ?, kind_en = ?, title_zh = ?, title_en = ?, summary_zh = ?, summary_en = ?, published = ?, sort = ? WHERE id = ?')
      .run(n.date, n.kind_zh, n.kind_en, n.title_zh, n.title_en, n.summary_zh, n.summary_en, n.published ? 1 : 0, n.sort, id);
    return ok(reply, { news: db.prepare('SELECT * FROM news WHERE id = ?').get(id) });
  });

  app.patch('/api/news/:id/publish', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const id = Number(req.params.id);
    const parsed = parseBody(z.object({ published: z.boolean() }), req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    const res = db.prepare('UPDATE news SET published = ? WHERE id = ?').run(parsed.data.published ? 1 : 0, id);
    if (!res.changes) return fail(reply, '动态不存在', 404);
    return ok(reply, { news: db.prepare('SELECT * FROM news WHERE id = ?').get(id) });
  });

  app.delete('/api/news/:id', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const id = Number(req.params.id);
    const res = db.prepare('DELETE FROM news WHERE id = ?').run(id);
    if (!res.changes) return fail(reply, '动态不存在', 404);
    return ok(reply, { deleted: id, at: nowIso() });
  });
}
