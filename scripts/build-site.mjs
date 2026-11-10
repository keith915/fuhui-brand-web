import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/src/db/index.ts';
import { buildSite } from '../server/src/lib/build.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || path.join(ROOT, 'dist');
const db = openDb(path.join(ROOT, 'data', 'app.db'));

fs.rmSync(outDir, { recursive: true, force: true });
const result = buildSite(db, {
  outDir,
  templateFile: path.join(ROOT, 'index.html'),
  fragmentDir: path.join(ROOT, 'site', 'fragments'),
  sourceRoot: ROOT,
  uploadDir: path.join(ROOT, 'data', 'uploads'),
  projectRoot: ROOT
});
console.log(JSON.stringify({ ...result, missing: result.missing.slice(0, 20) }, null, 2));
if (result.missing.length) {
  console.error('缺少资源，构建不完整');
  process.exit(1);
}
