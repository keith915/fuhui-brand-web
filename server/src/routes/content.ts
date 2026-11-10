import { z } from 'zod';
import { fail, guardCsrf, ok, parseBody } from '../lib/http.ts';
import { nowIso, tx } from '../db/index.ts';

const imagePath = z.string().regex(/^(assets\/img\/[A-Za-z0-9._-]+|media\/[A-Za-z0-9._-]+\.webp)?$/, '图片路径不合法').default('');

const metricSchema = z.object({
  id: z.number().int().positive().optional(),
  sort: z.number().int().min(0).max(999).default(0),
  label_zh: z.string().max(120).default(''),
  label_en: z.string().max(120).default(''),
  value_zh: z.string().max(64).default(''),
  value_en: z.string().max(64).default(''),
  unit_zh: z.string().max(32).default(''),
  unit_en: z.string().max(32).default(''),
  source: z.string().max(500).default(''),
  period: z.string().max(120).default(''),
  visible: z.boolean().default(true)
});

const panelSchema = z.object({
  id: z.number().int().min(0).optional(),
  sort: z.number().int().min(0).max(999).default(0),
  kicker_zh: z.string().max(160).default(''),
  kicker_en: z.string().max(160).default(''),
  title_zh: z.string().max(300).default(''),
  title_en: z.string().max(300).default(''),
  desc_zh: z.string().max(400).default(''),
  desc_en: z.string().max(400).default(''),
  image: imagePath,
  image_m: imagePath,
  img_w: z.number().int().min(0).max(10000).default(0),
  img_h: z.number().int().min(0).max(10000).default(0),
  alt_zh: z.string().max(300).default(''),
  alt_en: z.string().max(300).default(''),
  published: z.boolean().default(true)
});

const blocksSchema = z.object({
  blocks: z.array(z.object({
    key: z.string().min(1).max(120),
    zh: z.string().max(4000).default(''),
    en: z.string().max(4000).default('')
  })).max(300)
});

export async function contentRoutes(app, ctx) {
  const { db, requireAuth } = ctx;

  app.get('/api/blocks', { preHandler: requireAuth }, async (req, reply) => {
    const rows = db.prepare('SELECT key, zh, en, kind, grp, label, updated_at FROM i18n_blocks ORDER BY grp, key').all();
    return ok(reply, { blocks: rows });
  });

  app.put('/api/blocks', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const parsed = parseBody(blocksSchema, req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    let updated = 0;
    const stmt = db.prepare('UPDATE i18n_blocks SET zh = ?, en = ?, updated_at = ? WHERE key = ?');
    tx(db, () => {
      for (const b of parsed.data.blocks) {
        const res = stmt.run(b.zh, b.en, nowIso(), b.key);
        updated += Number(res.changes);
      }
    });
    return ok(reply, { updated });
  });

  app.get('/api/metrics', { preHandler: requireAuth }, async (req, reply) => {
    return ok(reply, { metrics: db.prepare('SELECT * FROM metrics ORDER BY sort, id').all() });
  });

  app.put('/api/metrics', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const parsed = parseBody(z.object({ metrics: z.array(metricSchema).min(1).max(8) }), req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    const items = parsed.data.metrics;
    tx(db, () => {
      const keep = [];
      const ins = db.prepare('INSERT INTO metrics (sort, label_zh, label_en, value_zh, value_en, unit_zh, unit_en, source, period, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const upd = db.prepare('UPDATE metrics SET sort = ?, label_zh = ?, label_en = ?, value_zh = ?, value_en = ?, unit_zh = ?, unit_en = ?, source = ?, period = ?, visible = ? WHERE id = ?');
      for (const m of items) {
        const vals = [m.sort, m.label_zh, m.label_en, m.value_zh, m.value_en, m.unit_zh, m.unit_en, m.source, m.period, m.visible ? 1 : 0];
        if (m.id) {
          upd.run(...vals, m.id);
          keep.push(m.id);
        } else {
          const info = ins.run(...vals);
          keep.push(Number(info.lastInsertRowid));
        }
      }
      const existing = db.prepare('SELECT id FROM metrics').all().map((r) => r.id);
      const del = db.prepare('DELETE FROM metrics WHERE id = ?');
      for (const id of existing) if (!keep.includes(id)) del.run(id);
    });
    return ok(reply, { metrics: db.prepare('SELECT * FROM metrics ORDER BY sort, id').all() });
  });

  app.get('/api/panels', { preHandler: requireAuth }, async (req, reply) => {
    return ok(reply, { panels: db.prepare('SELECT * FROM panels ORDER BY sort, id').all() });
  });

  app.put('/api/panels', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    const parsed = parseBody(z.object({ panels: z.array(panelSchema).min(1).max(12) }), req.body);
    if (!parsed.ok) return fail(reply, parsed.error, 422);
    const items = parsed.data.panels;
    tx(db, () => {
      const keep = [];
      const ins = db.prepare('INSERT INTO panels (sort, kicker_zh, kicker_en, title_zh, title_en, desc_zh, desc_en, image, image_m, img_w, img_h, alt_zh, alt_en, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const upd = db.prepare('UPDATE panels SET sort = ?, kicker_zh = ?, kicker_en = ?, title_zh = ?, title_en = ?, desc_zh = ?, desc_en = ?, image = ?, image_m = ?, img_w = ?, img_h = ?, alt_zh = ?, alt_en = ?, published = ? WHERE id = ?');
      for (const p of items) {
        const vals = [p.sort, p.kicker_zh, p.kicker_en, p.title_zh, p.title_en, p.desc_zh, p.desc_en, p.image, p.image_m, p.img_w, p.img_h, p.alt_zh, p.alt_en, p.published ? 1 : 0];
        if (p.id != null) {
          upd.run(...vals, p.id);
          keep.push(p.id);
        } else {
          const info = ins.run(...vals);
          keep.push(Number(info.lastInsertRowid));
        }
      }
      const existing = db.prepare('SELECT id FROM panels').all().map((r) => r.id);
      const del = db.prepare('DELETE FROM panels WHERE id = ?');
      for (const id of existing) if (!keep.includes(id)) del.run(id);
    });
    return ok(reply, { panels: db.prepare('SELECT * FROM panels ORDER BY sort, id').all() });
  });
}
