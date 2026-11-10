const ALLOWED = new Set(['br', 'b', 'strong', 'em']);

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escape everything, then restore a small allow-list of inline tags.
 * Attributes are always dropped, so onerror/style/script cannot survive.
 */
export function sanitizeHtml(value) {
  const input = String(value == null ? '' : value);
  let out = '';
  let cursor = 0;
  const tagRe = /<[^>]*>/g;
  let match;
  while ((match = tagRe.exec(input))) {
    out += escapeHtml(input.slice(cursor, match.index));
    const m = /^<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>$/.exec(match[0]);
    const name = m ? m[2].toLowerCase() : '';
    if (m && ALLOWED.has(name)) {
      const closed = m[1] === '/';
      out += closed ? '</' + name + '>' : '<' + name + '>';
    } else {
      out += escapeHtml(match[0]);
    }
    cursor = match.index + match[0].length;
  }
  out += escapeHtml(input.slice(cursor));
  return out;
}

export function plainText(value) {
  return escapeHtml(String(value == null ? '' : value).replace(/<[^>]*>/g, ''));
}
