import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildApp } from '../src/app.ts';
import { openDb } from '../src/db/index.ts';
import { ensureAdminUser } from '../src/lib/auth.ts';

async function makeApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-api-'));
  const db = openDb(path.join(dir, 'app.db'));
  ensureAdminUser(db, 'admin', 'pass12345');
  const app = await buildApp({
    db,
    dataDir: dir,
    dbPath: path.join(dir, 'app.db'),
    distDir: path.join(dir, 'dist'),
    adminDist: path.join(dir, 'admin-dist'),
    uploadDir: path.join(dir, 'uploads'),
    releasesDir: path.join(dir, 'releases')
  });
  return { app, dir };
}

async function login(app) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'admin', password: 'pass12345' }
  });
  const body = res.json();
  const raw = res.headers['set-cookie'];
  const cookie = (Array.isArray(raw) ? raw[0] : String(raw)).split(';')[0];
  return { cookie, csrf: body.csrf };
}

test('unauthenticated API access is rejected', async () => {
  const { app } = await makeApp();
  const res = await app.inject({ method: 'GET', url: '/api/news' });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test('login rejects wrong password and accepts the seeded one', async () => {
  const { app } = await makeApp();
  const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'nope' } });
  assert.equal(bad.statusCode, 401);
  const good = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'pass12345' } });
  assert.equal(good.statusCode, 200);
  assert.equal(good.json().user.username, 'admin');
  await app.close();
});

test('writes require a csrf token', async () => {
  const { app } = await makeApp();
  const { cookie } = await login(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/news',
    cookies: { fh_sid: cookie.split('=')[1] },
    payload: { date: '2026-11-10', title_zh: '测试' }
  });
  assert.equal(res.statusCode, 403);
  await app.close();
});

test('news can be created, published, toggled and deleted', async () => {
  const { app } = await makeApp();
  const { cookie, csrf } = await login(app);
  const headers = { cookie, 'x-csrf-token': csrf };
  const created = await app.inject({
    method: 'POST',
    url: '/api/news',
    headers,
    payload: { date: '2026-11-10', kind_zh: '新闻', kind_en: 'News', title_zh: '联调动态', title_en: 'Smoke', summary_zh: '摘要', summary_en: 'Summary', published: true }
  });
  assert.equal(created.statusCode, 201);
  const id = created.json().news.id;

  const list = await app.inject({ method: 'GET', url: '/api/news', headers: { cookie } });
  assert.equal(list.json().news.length, 1);

  const toggled = await app.inject({
    method: 'PATCH',
    url: '/api/news/' + id + '/publish',
    headers,
    payload: { published: false }
  });
  assert.equal(toggled.json().news.published, 0);

  const removed = await app.inject({ method: 'DELETE', url: '/api/news/' + id, headers });
  assert.equal(removed.statusCode, 200);
  await app.close();
});

test('blocks are updated only for existing keys', async () => {
  const { app } = await makeApp();
  const { cookie, csrf } = await login(app);
  await app.inject({ method: 'GET', url: '/api/blocks', headers: { cookie } });
  const updated = await app.inject({
    method: 'PUT',
    url: '/api/blocks',
    headers: { cookie, 'x-csrf-token': csrf },
    payload: { blocks: [{ key: 'not.exists', zh: 'x', en: 'x' }] }
  });
  assert.equal(updated.json().updated, 0);
  await app.close();
});

test('publishing produces a static page and a log row', async () => {
  const { app, dir } = await makeApp();
  const { cookie, csrf } = await login(app);
  const res = await app.inject({ method: 'POST', url: '/api/publish', headers: { cookie, 'x-csrf-token': csrf }, payload: {} });
  assert.equal(res.statusCode, 200);
  const html = fs.readFileSync(path.join(dir, 'dist', 'index.html'), 'utf8');
  assert.ok(html.includes('FH_I18N_EN'));
  const log = await app.inject({ method: 'GET', url: '/api/publish/log', headers: { cookie } });
  assert.equal(log.json().logs.length, 1);
  assert.equal(log.json().logs[0].status, 'ok');
  await app.close();
});
