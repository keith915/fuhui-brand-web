import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { openDb, nowIso } from '../server/src/db/index.ts';
import { DB_PATH, ADMIN_USER } from '../server/src/config.ts';
import { ensureInitialAdmin } from '../server/src/lib/admin-bootstrap.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

const LABELS = {
  'meta.title': '页面标题（SEO）',
  'meta.desc': '页面描述（SEO）',
  'hero.label': '首屏小标签',
  'hero.lead': '首屏主标题',
  'panel.cta': '长卷「预约现场」按钮',
  'svc.label': '服务体系标签',
  'svc.title': '服务体系标题',
  'svc.lead': '运营主体简介',
  'svc.body': '服务体系正文',
  'svc.cta': '聊聊需求按钮',
  'f1.name': '服务线 1 名称',
  'f1.desc': '服务线 1 描述',
  'f2.name': '服务线 2 名称',
  'f2.desc': '服务线 2 描述',
  'f3.name': '服务线 3 名称',
  'f3.desc': '服务线 3 描述',
  'news.label': '动态标签',
  'news.title': '动态标题',
  'contact.label': '联系标签',
  'contact.title': '联系标题',
  'contact.lead': '联系引导语',
  'contact.hotline': '招商热线标签',
  'contact.hotlineValue': '招商热线号码',
  'contact.addrTitle': '办公地址标签',
  'contact.addr': '办公地址',
  'contact.hours': '服务时间标签',
  'contact.hoursValue': '服务时间',
  'foot.legal': '版权信息',
  'foot.top': '回到顶部'
};

function skipString(source, i) {
  const quote = source[i];
  i += 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === quote) return i;
    i += 1;
  }
  return i;
}

function extractEnDict(source) {
  const start = source.indexOf('const I18N');
  if (start < 0) throw new Error('app.js 中未找到 I18N 字典');
  let i = source.indexOf('{', start);
  const begin = i;
  let depth = 0;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '\u0060') { i = skipString(source, i); continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const literal = source.slice(begin, i + 1);
  const obj = new Function('return (' + literal + ')')();
  return obj.en || {};
}

function groupOf(el) {
  let node = el;
  while (node && node.tagName) {
    if (node.tagName === 'SECTION' && node.id) return node.id;
    if (node.tagName === 'HEADER') return 'header';
    if (node.tagName === 'FOOTER') return 'footer';
    if (node.tagName === 'HEAD') return 'meta';
    node = node.parentElement;
  }
  return 'misc';
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const en = extractEnDict(appSource);
const { document } = parseHTML(html);

const skipKey = /^(fig\d+\.|p\d+\.|n\d+\.|alt\.panel\d+$)/;

const blocks = [];
const seen = new Set();
for (const el of document.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-aria], [data-i18n-alt], [data-i18n-meta]')) {
  let key = null;
  let kind = 'plain';
  let zh = '';
  if (el.hasAttribute('data-i18n-html')) {
    key = el.getAttribute('data-i18n-html');
    kind = 'html';
    zh = el.innerHTML;
  } else if (el.hasAttribute('data-i18n')) {
    key = el.getAttribute('data-i18n');
    zh = el.textContent;
  } else if (el.hasAttribute('data-i18n-aria')) {
    key = el.getAttribute('data-i18n-aria');
    zh = el.getAttribute('aria-label') || '';
  } else if (el.hasAttribute('data-i18n-alt')) {
    key = el.getAttribute('data-i18n-alt');
    zh = el.getAttribute('alt') || '';
  } else if (el.hasAttribute('data-i18n-meta')) {
    key = el.getAttribute('data-i18n-meta');
    zh = el.getAttribute('content') || '';
  }
  if (!key || seen.has(key) || skipKey.test(key)) continue;
  seen.add(key);
  blocks.push({ key, zh: zh.trim(), en: en[key] || '', kind, grp: groupOf(el), label: LABELS[key] || '' });
}

const metrics = [];
[...document.querySelectorAll('.figures .figure')].forEach((fig, i) => {
  const id = i + 1;
  metrics.push({
    id,
    sort: i,
    label_zh: (fig.querySelector('dt')?.textContent || '').trim(),
    label_en: en['fig' + id + '.dt'] || '',
    value_zh: (fig.querySelector('.figure__value')?.textContent || '').trim(),
    value_en: en['fig' + id + '.value'] || '',
    unit_zh: (fig.querySelector('.figure__unit')?.textContent || '').trim(),
    unit_en: en['fig' + id + '.unit'] || '',
    source: '',
    period: '',
    visible: 1
  });
});

const SRC = {
  1: '福田区 2026 新质产业「十大社区、百万空间、千亿资金」阶段成果（2026.04）',
  2: '同上：18 栋政府产权楼宇数据完成梳理',
  3: '福汇发展客户端接口 /api/config 的 areas 字段',
  4: '福汇发展客户端接口 /api/spaces：写字楼、产业园、孵化器'
};
for (const m of metrics) m.source = SRC[m.id] || '';
metrics[0].period = '2026.04';

const panels = [];
[...document.querySelectorAll('.chapter__panels article.panel')].forEach((el, i) => {
  const img = el.querySelector('.panel__media img');
  const srcset = img?.getAttribute('srcset') || '';
  const m = /(\S+)\s+1100w/.exec(srcset);
  panels.push({
    id: i,
    sort: i,
    kicker_zh: (el.querySelector('.panel__kicker')?.textContent || '').trim(),
    kicker_en: en['p' + i + '.kicker'] || '',
    title_zh: (el.querySelector('.panel__title')?.innerHTML || '').trim(),
    title_en: en['p' + i + '.title'] || '',
    desc_zh: (el.querySelector('.panel__desc')?.textContent || '').trim(),
    desc_en: en['p' + i + '.desc'] || '',
    image: img?.getAttribute('src') || '',
    image_m: m ? m[1] : '',
    img_w: Number(img?.getAttribute('width')) || 0,
    img_h: Number(img?.getAttribute('height')) || 0,
    alt_zh: img?.getAttribute('alt') || '',
    alt_en: en['alt.panel' + i] || '',
    published: 1
  });
});

const news = [];
[...document.querySelectorAll('.news-list > li')].forEach((el, i) => {
  const id = i + 1;
  const time = el.querySelector('time');
  news.push({
    id,
    date: time?.getAttribute('datetime') || '',
    kind_zh: (el.querySelector('.news-list__kind')?.textContent || '').trim(),
    kind_en: en['n' + id + '.kind'] || '',
    title_zh: (el.querySelector('h3')?.textContent || '').trim(),
    title_en: en['n' + id + '.title'] || '',
    summary_zh: (el.querySelector('p')?.textContent || '').trim(),
    summary_en: en['n' + id + '.desc'] || '',
    published: 1,
    sort: i
  });
});

const missingEn = blocks.filter((b) => !b.en).map((b) => b.key);

if (dryRun) {
  console.log(JSON.stringify({ blocks: blocks.length, metrics: metrics.length, panels: panels.length, news: news.length, missingEn }, null, 2));
  console.log(JSON.stringify({ blocks, metrics, panels, news }, null, 2).slice(0, 4000));
  process.exit(0);
}

const db = openDb(DB_PATH);
const now = nowIso();

if (force) {
  db.exec('DELETE FROM i18n_blocks');
  db.exec('DELETE FROM metrics');
  db.exec('DELETE FROM panels');
  db.exec('DELETE FROM news');
}

db.exec('BEGIN IMMEDIATE');
try {
  const ib = db.prepare('INSERT OR REPLACE INTO i18n_blocks (key, zh, en, kind, grp, label, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const b of blocks) ib.run(b.key, b.zh, b.en, b.kind, b.grp, b.label, now);
  const im = db.prepare('INSERT OR REPLACE INTO metrics (id, sort, label_zh, label_en, value_zh, value_en, unit_zh, unit_en, source, period, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const m of metrics) im.run(m.id, m.sort, m.label_zh, m.label_en, m.value_zh, m.value_en, m.unit_zh, m.unit_en, m.source, m.period, m.visible);
  const ip = db.prepare('INSERT OR REPLACE INTO panels (id, sort, kicker_zh, kicker_en, title_zh, title_en, desc_zh, desc_en, image, image_m, img_w, img_h, alt_zh, alt_en, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of panels) ip.run(p.id, p.sort, p.kicker_zh, p.kicker_en, p.title_zh, p.title_en, p.desc_zh, p.desc_en, p.image, p.image_m, p.img_w, p.img_h, p.alt_zh, p.alt_en, p.published);
  const inn = db.prepare('INSERT OR REPLACE INTO news (id, date, kind_zh, kind_en, title_zh, title_en, summary_zh, summary_en, published, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const n of news) inn.run(n.id, n.date, n.kind_zh, n.kind_en, n.title_zh, n.title_en, n.summary_zh, n.summary_en, n.published, n.sort);
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}

const ensured = ensureInitialAdmin(db);
console.log('seed ok:', blocks.length, 'blocks,', metrics.length, 'metrics,', panels.length, 'panels,', news.length, 'news');
console.log('missing english:', missingEn.length ? missingEn.join(', ') : 'none');
if (ensured.created) {
  if (ensured.file) {
    console.log('initial admin: ' + ADMIN_USER + ' / 随机密码已写入 ' + ensured.file + '（登录后立即修改，并删除该文件）');
  } else {
    console.log('initial admin: ' + ADMIN_USER + ' / 使用 ADMIN_PASSWORD 环境变量（登录后立即修改）');
  }
}
console.log('db:', DB_PATH);
