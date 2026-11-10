let csrfToken = '';

export type User = { id: number; username: string; role: 'admin' | 'editor' };

function setCsrf(token: string) {
  csrfToken = token || '';
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch('/api' + path, { credentials: 'include', ...init, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || (data && data.ok === false)) {
    throw new ApiError((data && data.error) || '请求失败 (' + res.status + ')', res.status);
  }
  return data;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path: string, body?: unknown) => request(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: 'DELETE' }),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request('/upload', { method: 'POST', body: form });
  }
};

export async function login(username: string, password: string) {
  const data = await api.post('/auth/login', { username, password });
  setCsrf(data.csrf);
  return data.user as User;
}

export async function me() {
  const data = await api.get('/auth/me');
  setCsrf(data.csrf);
  return data.user as User;
}

export async function logout() {
  try { await api.post('/auth/logout'); } finally { setCsrf(''); }
}
