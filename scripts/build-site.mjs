import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/src/db/index.ts';
import { buildSite } from '../server/src/lib/build.ts';
import { DB_PATH, UPLOAD_DIR } from '../server/src/config.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || path.join(ROOT, 'dist');
const dbPath = DB_PATH;

/* 全新检出（CI / 首次部署）没有 data/app.db：先用 site 源文件播种，避免构建出空页面 */
if (!fs.existsSync(dbPath)) {
  console.log('[build-site] 未找到 ' + dbPath + '，先执行 seed-from-site');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'seed-from-site.mjs')], { stdio: 'inherit' });
}

const db = openDb(dbPath);

fs.rmSync(outDir, { recursive: true, force: true });
const result = buildSite(db, {
  outDir,
  templateFile: path.join(ROOT, 'index.html'),
  fragmentDir: path.join(ROOT, 'site', 'fragments'),
  sourceRoot: ROOT,
  uploadDir: UPLOAD_DIR,
  projectRoot: ROOT
});
console.log(JSON.stringify({ ...result, missing: result.missing.slice(0, 20) }, null, 2));
if (result.missing.length) {
  console.error('缺少资源，构建不完整');
  process.exit(1);
}
