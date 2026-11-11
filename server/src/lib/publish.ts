import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSite, copyDir } from './build.ts';
import { deployToPages, pagesConfigFromEnv } from './pages.ts';
import { nowIso, tx } from '../db/index.ts';

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

export function takeSnapshot(db, label) {
  const payload = {
    blocks: db.prepare('SELECT * FROM i18n_blocks').all(),
    metrics: db.prepare('SELECT * FROM metrics').all(),
    panels: db.prepare('SELECT * FROM panels').all(),
    news: db.prepare('SELECT * FROM news').all()
  };
  const info = db.prepare('INSERT INTO content_snapshots (payload, label, created_at) VALUES (?, ?, ?)')
    .run(JSON.stringify(payload), String(label || ''), nowIso());
  return Number(info.lastInsertRowid);
}

export function restoreSnapshot(db, snapshotId) {
  const row = db.prepare('SELECT payload FROM content_snapshots WHERE id = ?').get(snapshotId);
  if (!row) {
    const err = new Error('版本不存在');
    err.statusCode = 404;
    throw err;
  }
  const data = JSON.parse(row.payload);
  tx(db, () => {
    db.exec('DELETE FROM i18n_blocks');
    db.exec('DELETE FROM metrics');
    db.exec('DELETE FROM panels');
    db.exec('DELETE FROM news');
    const ib = db.prepare('INSERT INTO i18n_blocks (key, zh, en, kind, grp, label, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const b of data.blocks) ib.run(b.key, b.zh, b.en, b.kind, b.grp, b.label, b.updated_at);
    const im = db.prepare('INSERT INTO metrics (id, sort, label_zh, label_en, value_zh, value_en, unit_zh, unit_en, source, period, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const m of data.metrics) im.run(m.id, m.sort, m.label_zh, m.label_en, m.value_zh, m.value_en, m.unit_zh, m.unit_en, m.source, m.period, m.visible);
    const ip = db.prepare('INSERT INTO panels (id, sort, kicker_zh, kicker_en, title_zh, title_en, desc_zh, desc_en, image, image_m, img_w, img_h, alt_zh, alt_en, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of data.panels) ip.run(p.id, p.sort, p.kicker_zh, p.kicker_en, p.title_zh, p.title_en, p.desc_zh, p.desc_en, p.image, p.image_m, p.img_w, p.img_h, p.alt_zh, p.alt_en, p.published);
    const inn = db.prepare('INSERT INTO news (id, date, kind_zh, kind_en, title_zh, title_en, summary_zh, summary_en, published, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const n of data.news) inn.run(n.id, n.date, n.kind_zh, n.kind_en, n.title_zh, n.title_en, n.summary_zh, n.summary_en, n.published, n.sort);
  });
  return { restored: true, snapshotId };
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function retrySync(fn, attempts = 12, delayMs = 150) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      if (!['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(err.code)) throw err;
      sleepSync(delayMs);
    }
  }
  throw lastErr;
}

function pruneReleases(dir, keep = 8) {
  try {
    const names = fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();
    for (const name of names.slice(keep)) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  } catch {}
}

export function createPublisher(db, paths) {
  let busy = false;

  function publish(label = 'manual') {
    if (busy) {
      const err = new Error('正在发布中，请稍候');
      err.statusCode = 409;
      throw err;
    }
    busy = true;
    const startedAt = nowIso();
    const logInfo = db.prepare('INSERT INTO publish_log (started_at, status) VALUES (?, ?)').run(startedAt, 'running');
    const logId = Number(logInfo.lastInsertRowid);
    const t0 = Date.now();
    try {
      const snapshotId = takeSnapshot(db, label);
      const tmp = path.join(paths.dataDir, 'build-tmp');
      fs.rmSync(tmp, { recursive: true, force: true });
      const result = buildSite(db, {
        outDir: tmp,
        templateFile: paths.templateFile,
        fragmentDir: paths.fragmentDir,
        sourceRoot: paths.root,
        uploadDir: paths.uploadDir,
        projectRoot: paths.root,
        siteOrigin: paths.siteOrigin || ''
      });
      if (result.missing.length) {
        const err = new Error('构建产物缺少资源：' + result.missing.slice(0, 6).join(', '));
        err.statusCode = 500;
        throw err;
      }
      fs.mkdirSync(paths.releasesDir, { recursive: true });
      const releaseDir = path.join(paths.releasesDir, stamp());
      const hadDist = fs.existsSync(paths.distDir);
      if (hadDist) {
        try { copyDir(paths.distDir, releaseDir); } catch (err) { /* archive is best-effort */ }
      }
      retrySync(() => {
        if (fs.existsSync(paths.distDir)) {
          for (const entry of fs.readdirSync(paths.distDir)) {
            fs.rmSync(path.join(paths.distDir, entry), { recursive: true, force: true, maxRetries: 2 });
          }
        }
        copyDir(tmp, paths.distDir);
      });
      pruneReleases(paths.releasesDir);

      // 可选：把 dist 推到 GitHub Pages 的 gh-pages 分支。失败不影响本机发布结果。
      let pages = null;
      const pagesCfg = pagesConfigFromEnv(paths.distDir, paths.dataDir);
      if (pagesCfg.enabled) {
        try {
          pages = deployToPages(pagesCfg, label);
        } catch (err) {
          pages = { ok: false, error: String(err && err.message || err).slice(0, 800) };
        }
      }

      db.prepare('UPDATE publish_log SET finished_at = ?, status = ?, build_ms = ?, release_dir = ?, pages_status = ?, pages_error = ?, pages_commit = ? WHERE id = ?')
        .run(nowIso(), 'ok', Date.now() - t0, hadDist ? releaseDir : '',
          pages ? (pages.ok ? 'ok' : 'failed') : '', pages && pages.error ? pages.error : '',
          pages && pages.commit ? pages.commit : '', logId);
      return { ok: true, logId, snapshotId, buildMs: Date.now() - t0, enKeys: result.enKeys, panels: result.panels, news: result.news, bytes: result.bytes, pages };
    } catch (err) {
      db.prepare('UPDATE publish_log SET finished_at = ?, status = ?, error = ?, build_ms = ? WHERE id = ?')
        .run(nowIso(), 'failed', String(err.message || err).slice(0, 2000), Date.now() - t0, logId);
      throw err;
    } finally {
      busy = false;
    }
  }

  return { publish, isBusy: () => busy };
}
