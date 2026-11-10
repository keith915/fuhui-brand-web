import { fail, guardCsrf, ok } from '../lib/http.ts';
import { storeImage } from '../lib/media.ts';
import { nowIso } from '../db/index.ts';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/octet-stream']);

function sniffImage(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length > 12 && buffer.subarray(4, 12).toString('ascii').includes('ftypavi')) return 'image/avif';
  return null;
}

export async function mediaRoutes(app, ctx) {
  const { db, requireAuth, uploadDir } = ctx;

  app.post('/api/upload', { preHandler: requireAuth }, async (req, reply) => {
    if (!guardCsrf(req, reply)) return;
    let file;
    try {
      file = await req.file();
    } catch (err) {
      return fail(reply, err.code === 'FST_REQ_FILE_TOO_LARGE' ? '图片不能超过 8MB' : '上传失败，请重试', 413);
    }
    if (!file) return fail(reply, '未收到文件', 422);
    if (!ALLOWED_MIME.has(file.mimetype)) return fail(reply, '仅支持 JPG / PNG / WebP 图片', 415);
    let buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      return fail(reply, '图片不能超过 8MB', 413);
    }
    const sniffed = sniffImage(buffer);
    if (!sniffed) return fail(reply, '仅支持 JPG / PNG / WebP 图片', 415);
    let stored;
    try {
      stored = await storeImage(buffer, file.filename, uploadDir);
    } catch {
      return fail(reply, '图片解析失败，请换一张 JPG/PNG/WebP', 422);
    }
    const variants = JSON.stringify({ m: { file: stored.mFilename, width: stored.mWidth, height: stored.mHeight } });
    const info = db.prepare('INSERT INTO media (filename, orig_name, mime, width, height, bytes, variants, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(stored.filename, stored.origName, stored.mime, stored.width, stored.height, stored.bytes, variants, nowIso());
    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(Number(info.lastInsertRowid));
    return ok(reply, { media: row, url: 'media/' + stored.filename, urlM: 'media/' + stored.mFilename });
  });

  app.get('/api/media', { preHandler: requireAuth }, async (req, reply) => {
    return ok(reply, { media: db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 200').all() });
  });
}
