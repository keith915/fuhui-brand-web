export function ok(reply, data = {}, status = 200) {
  return reply.code(status).send({ ok: true, ...data });
}

export function fail(reply, error, status = 400) {
  return reply.code(status).send({ ok: false, error: String(error || '请求失败') });
}

export function csrfValid(req) {
  const token = req.headers['x-csrf-token'];
  return Boolean(req.session && token && String(token) === req.session.csrf);
}

export function guardCsrf(req, reply) {
  if (!csrfValid(req)) {
    fail(reply, '请求校验失败，请刷新页面后重试', 403);
    return false;
  }
  return true;
}

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first ? (first.path.join('.') + ': ' + first.message) : '参数不合法' };
  }
  return { ok: true, data: result.data };
}
