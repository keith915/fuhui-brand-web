import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

export async function storeImage(buffer, origName, uploadDir) {
  const pipeline = sharp(buffer, { limitInputPixels: 50_000_000 }).rotate();
  const meta = await pipeline.metadata();
  const base = crypto.randomUUID();
  const filename = base + '.webp';
  const mFilename = base + '-m.webp';

  const main = await pipeline.clone()
    .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const small = await pipeline.clone()
    .resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), main.data);
  fs.writeFileSync(path.join(uploadDir, mFilename), small.data);

  return {
    filename,
    mFilename,
    width: main.info.width,
    height: main.info.height,
    mWidth: small.info.width,
    mHeight: small.info.height,
    bytes: main.data.length + small.data.length,
    mime: 'image/webp',
    origName: String(origName || '').slice(0, 200),
    sourceWidth: meta.width || main.info.width,
    sourceHeight: meta.height || main.info.height
  };
}
