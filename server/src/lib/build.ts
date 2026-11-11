import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { parseHTML } from 'linkedom';
import { sanitizeHtml } from './sanitize.ts';

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function readFragment(dir, name) {
  return fs.readFileSync(path.join(dir, name), 'utf8');
}

/* fs.cpSync crashes node 25 on this host (0xC0000409); copy recursively by hand */
export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function contentHash(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  } catch {
    return 'dev';
  }
}

function collectStyleUrls(cssFile) {
  try {
    const css = fs.readFileSync(cssFile, 'utf8');
    const urls = [];
    const re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    let m;
    while ((m = re.exec(css))) urls.push(m[1]);
    return urls;
  } catch {
    return [];
  }
}

/**
 * Render the public site from SQLite into outDir.
 * The caller owns atomic swap / releases; this function only writes outDir.
 */
export function buildSite(db, opts) {
  const {
    outDir,
    templateFile,
    fragmentDir,
    sourceRoot,
    uploadDir,
    projectRoot,
    siteOrigin = ''
  } = opts;

  const origin = String(siteOrigin || '').trim().replace(/\/+$/, '');
  if (origin && !/^https?:\/\/[^/?#\s]+(\/[^?#\s]*)?$/.test(origin)) {
    throw new Error('FH_SITE_ORIGIN 格式不合法：' + origin);
  }

  const blocks = db.prepare('SELECT key, zh, en, kind FROM i18n_blocks').all();
  const blockMap = new Map(blocks.map((b) => [b.key, b]));
  const metrics = db.prepare('SELECT * FROM metrics WHERE visible = 1 ORDER BY sort, id').all();
  const panels = db.prepare('SELECT * FROM panels WHERE published = 1 ORDER BY sort, id').all();
  const news = db.prepare('SELECT * FROM news WHERE published = 1 ORDER BY date DESC, sort ASC, id DESC').all();

  const html = fs.readFileSync(templateFile, 'utf8');
  const { document } = parseHTML(html);

  // 1) fixed copy, keyed by the existing data-i18n* attributes
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const block = blockMap.get(el.getAttribute('data-i18n'));
    if (block) el.textContent = block.zh;
  }
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    const block = blockMap.get(el.getAttribute('data-i18n-html'));
    if (block) el.innerHTML = sanitizeHtml(block.zh);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const block = blockMap.get(el.getAttribute('data-i18n-aria'));
    if (block) el.setAttribute('aria-label', block.zh);
  }
  for (const el of document.querySelectorAll('[data-i18n-alt]')) {
    const block = blockMap.get(el.getAttribute('data-i18n-alt'));
    if (block) el.setAttribute('alt', block.zh);
  }
  for (const el of document.querySelectorAll('meta[data-i18n-meta]')) {
    const block = blockMap.get(el.getAttribute('data-i18n-meta'));
    if (block) el.setAttribute('content', block.zh);
  }
  for (const el of document.querySelectorAll('[data-tel]')) {
    const digits = (el.textContent || '').replace(/[^0-9+]/g, '');
    if (digits) el.setAttribute('href', 'tel:' + digits);
  }

  // 2) repeated collections
  const metricTpl = readFragment(fragmentDir, 'metric.html');
  const panelTpl = readFragment(fragmentDir, 'panel.html');
  const newsTpl = readFragment(fragmentDir, 'news-item.html');
  const cta = (blockMap.get('panel.cta') || {}).zh || '预约现场';

  const figuresEl = document.querySelector('.figures');
  if (figuresEl) {
    figuresEl.innerHTML = metrics.map((m) => fill(metricTpl, {
      id: m.id,
      label: m.label_zh,
      value: m.value_zh,
      unit: m.unit_zh
    })).join('\n');
  }

  const total = panels.length;
  const panelsEl = document.querySelector('.chapter__panels');
  if (panelsEl) {
    panelsEl.innerHTML = panels.map((p, i) => {
      const srcset = p.image_m
        ? p.image_m + ' 1100w, ' + p.image + ' ' + (p.img_w || 2200) + 'w'
        : (p.img_w ? p.image + ' ' + p.img_w + 'w' : '');
      return fill(panelTpl, {
        id: p.id,
        index: i,
        active: i === 0 ? ' is-active' : '',
        image: p.image,
        srcset: srcset ? ' srcset="' + srcset + '"' : '',
        sizes: p.img_w ? '(max-width: 900px) 100vw, ' + p.img_w + 'px' : '(max-width: 900px) 100vw, 100vw',
        width: p.img_w || 1600,
        height: p.img_h || 900,
        loading: i === 0 ? ' fetchpriority="high"' : ' loading="lazy"',
        alt: p.alt_zh,
        indexLabel: pad2(i + 1),
        total: pad2(total),
        kicker: p.kicker_zh,
        title: sanitizeHtml(p.title_zh),
        desc: p.desc_zh,
        cta
      });
    }).join('\n');
  }

  const countEl = document.querySelector('.chapter__count');
  if (countEl) countEl.innerHTML = '<b data-chapter-current>01</b> / ' + pad2(total);

  const newsEl = document.querySelector('.news-list');
  if (newsEl) {
    newsEl.innerHTML = news.map((n) => fill(newsTpl, {
      id: n.id,
      date: n.date,
      dateLabel: String(n.date).replace(/-/g, '.'),
      kind: n.kind_zh,
      title: n.title_zh,
      summary: n.summary_zh
    })).join('\n');
  }

  // 3) english dictionary for the runtime toggle
  const en = {};
  for (const b of blocks) {
    if (b.en) en[b.key] = b.kind === 'html' ? sanitizeHtml(b.en) : b.en;
  }
  for (const m of metrics) {
    if (m.label_en) en['fig' + m.id + '.dt'] = m.label_en;
    if (m.value_en) en['fig' + m.id + '.value'] = m.value_en;
    if (m.unit_en) en['fig' + m.id + '.unit'] = m.unit_en;
  }
  for (const p of panels) {
    if (p.kicker_en) en['p' + p.id + '.kicker'] = sanitizeHtml(p.kicker_en);
    if (p.title_en) en['p' + p.id + '.title'] = sanitizeHtml(p.title_en);
    if (p.desc_en) en['p' + p.id + '.desc'] = p.desc_en;
    if (p.alt_en) en['alt.panel' + p.id] = p.alt_en;
  }
  for (const n of news) {
    if (n.kind_en) en['n' + n.id + '.kind'] = n.kind_en;
    if (n.title_en) en['n' + n.id + '.title'] = n.title_en;
    if (n.summary_en) en['n' + n.id + '.desc'] = n.summary_en;
  }

  const appScript = document.querySelector('script[src^="app.js"]');
  const dictScript = document.createElement('script');
  dictScript.textContent = 'window.FH_I18N_EN=' + JSON.stringify(en).replace(/</g, '\\u003c') + ';';
  if (appScript) appScript.before(dictScript);

  // 4) cache busting
  const cssFile = path.join(sourceRoot, 'styles.css');
  const appFile = path.join(sourceRoot, 'app.js');
  const cssEl = document.querySelector('link[href^="styles.css"]');
  if (cssEl) cssEl.setAttribute('href', 'styles.css?v=' + contentHash(cssFile));
  if (appScript) appScript.setAttribute('src', 'app.js?v=' + contentHash(appFile));

  // 5) write output
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  let output = document.toString();
  if (origin) {
    output = output.split('https://example.com').join(origin);
    output = output.replace(/[ \t]*<!-- TODO: 上线前把 EXAMPLE 域名替换为正式域名[^>]*-->\r?\n/, '');
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), output, 'utf8');

  for (const name of ['styles.css', 'app.js']) {
    fs.copyFileSync(path.join(sourceRoot, name), path.join(outDir, name));
  }
  const assetsSrc = path.join(sourceRoot, 'assets');
  if (fs.existsSync(assetsSrc)) copyDir(assetsSrc, path.join(outDir, 'assets'));

  const mediaDir = path.join(outDir, 'media');
  const copied = new Set();
  for (const p of panels) {
    for (const rel of [p.image, p.image_m]) {
      if (!rel || copied.has(rel) || !rel.startsWith('media/')) continue;
      copied.add(rel);
      const from = path.join(uploadDir, path.basename(rel));
      if (fs.existsSync(from)) {
        fs.mkdirSync(mediaDir, { recursive: true });
        fs.copyFileSync(from, path.join(mediaDir, path.basename(rel)));
      }
    }
  }

  const missing = validateRefs(outDir, cssFile);
  return {
    outDir,
    enKeys: Object.keys(en).length,
    panels: panels.length,
    metrics: metrics.length,
    news: news.length,
    missing,
    bytes: fs.statSync(path.join(outDir, 'index.html')).size
  };
}

function validateRefs(outDir, cssFile) {
  const missing = [];
  const indexFile = path.join(outDir, 'index.html');
  const html = fs.readFileSync(indexFile, 'utf8');
  const refs = new Set();
  const attrRe = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = attrRe.exec(html))) refs.add(m[1]);
  const srcsetRe = /srcset="([^"]+)"/g;
  while ((m = srcsetRe.exec(html))) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.add(url);
    }
  }
  for (const cssUrl of collectStyleUrls(cssFile)) refs.add(cssUrl);

  for (const ref of refs) {
    if (!ref || /^(https?:|\/\/|#|tel:|mailto:|data:|javascript:)/i.test(ref)) continue;
    const clean = ref.split('?')[0].split('#')[0];
    if (!clean || clean.startsWith('/')) continue;
    if (!fs.existsSync(path.join(outDir, clean))) missing.push(clean);
  }
  return missing;
}

