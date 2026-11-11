import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export type PagesConfig = {
  enabled: boolean;
  token: string;
  repo: string;
  branch: string;
  remote: string;
  distDir: string;
  workDir: string;
};

export function pagesConfigFromEnv(distDir, dataDir) {
  const env = process.env;
  return {
    enabled: env.FH_PAGES_DEPLOY === '1',
    token: env.FH_PAGES_TOKEN || '',
    repo: String(env.FH_PAGES_REPO || '').trim(),
    branch: String(env.FH_PAGES_BRANCH || 'gh-pages').trim(),
    remote: String(env.FH_PAGES_REMOTE || '').trim(),
    distDir,
    workDir: path.join(dataDir, 'pages-work')
  };
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '' }
  }).trim();
}

function scrub(text) {
  return String(text || '').replace(/https:\/\/[^\s@]+@/g, 'https://***@');
}

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += fs.statSync(full).size;
    }
  }
  return { files, bytes };
}

export function deployToPages(cfg, label) {
  if (!cfg.enabled) return { skipped: true, reason: 'FH_PAGES_DEPLOY 未开启' };
  if (!cfg.token) throw new Error('缺少 FH_PAGES_TOKEN');
  if (!cfg.remote && !REPO_RE.test(cfg.repo)) throw new Error('FH_PAGES_REPO 需要写成 owner/repo，当前为 "' + cfg.repo + '"');
  const remote = cfg.remote || 'https://github.com/' + cfg.repo + '.git';
  if (!fs.existsSync(cfg.distDir) || !fs.readdirSync(cfg.distDir).length) {
    throw new Error('dist 为空，跳过 Pages 推送');
  }

  fs.rmSync(cfg.workDir, { recursive: true, force: true, maxRetries: 2 });
  fs.mkdirSync(cfg.workDir, { recursive: true });
  fs.cpSync(cfg.distDir, cfg.workDir, { recursive: true });
  // 分支托管需要关闭 Jekyll，避免下划线开头的资源被吞
  fs.writeFileSync(path.join(cfg.workDir, '.nojekyll'), '');

  const stamp = new Date().toISOString();
  const message = 'deploy: ' + (label || 'manual') + ' ' + stamp;

  git(cfg.workDir, ['init', '-q', '-b', cfg.branch]);
  git(cfg.workDir, ['add', '-A']);
  git(cfg.workDir, ['-c', 'user.name=fuhui-pages-bot', '-c', 'user.email=pages@localhost', 'commit', '-q', '-m', message]);

  const auth = Buffer.from('x-access-token:' + cfg.token).toString('base64');
  const startedAt = Date.now();
  try {
    git(cfg.workDir, [
      '-c', 'http.extraheader=Authorization: basic ' + auth,
      'push', '-q', '--force', remote,
      'HEAD:' + cfg.branch
    ]);
  } catch (err) {
    const detail = scrub(err && (err.stderr || err.message));
    throw new Error('推送到 GitHub Pages 失败：' + (detail || 'git push 返回非零').slice(0, 800));
  }

  const stat = countFiles(cfg.workDir);
  return {
    ok: true,
    repo: cfg.repo || remote,
    branch: cfg.branch,
    commit: git(cfg.workDir, ['rev-parse', 'HEAD']),
    files: stat.files,
    bytes: stat.bytes,
    elapsedMs: Date.now() - startedAt,
    pushedAt: stamp
  };
}
