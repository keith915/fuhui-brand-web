import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');

const env = process.env;

export const DATA_DIR = env.FH_DATA_DIR ? path.resolve(env.FH_DATA_DIR) : path.join(ROOT, 'data');
export const DB_PATH = env.FH_DB_PATH ? path.resolve(env.FH_DB_PATH) : path.join(DATA_DIR, 'app.db');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const RELEASES_DIR = path.join(DATA_DIR, 'releases');
export const DIST_DIR = env.FH_DIST_DIR ? path.resolve(env.FH_DIST_DIR) : path.join(ROOT, 'dist');
export const TEMPLATE_FILE = path.join(ROOT, 'index.html');
export const FRAGMENT_DIR = path.join(ROOT, 'site', 'fragments');
export const ADMIN_DIST = path.join(ROOT, 'admin', 'dist');
export const PORT = Number(env.PORT || 8787);
export const HOST = env.HOST || '127.0.0.1';
export const SESSION_TTL_HOURS = Number(env.FH_SESSION_TTL_HOURS || 12);
export const SECURE_COOKIE = env.FH_SECURE_COOKIE === '1';
export const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';
export const ADMIN_USER = env.ADMIN_USER || 'admin';
