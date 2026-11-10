import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, sanitizeHtml } from '../src/lib/sanitize.ts';

test('escapeHtml escapes markup characters', () => {
  assert.equal(escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
});

test('sanitizeHtml neutralises scripts', () => {
  assert.equal(
    sanitizeHtml('a<script>alert(1)</script>b'),
    'a&lt;script&gt;alert(1)&lt;/script&gt;b'
  );
});

test('sanitizeHtml keeps only allow-listed inline tags', () => {
  assert.equal(
    sanitizeHtml('12 个片区，<br>一张<em>网络</em><img src=x onerror=alert(1)>'),
    '12 个片区，<br>一张<em>网络</em>&lt;img src=x onerror=alert(1)&gt;'
  );
});

test('sanitizeHtml drops attributes on allowed tags', () => {
  assert.equal(sanitizeHtml('<b onclick="x">粗</b>'), '<b>粗</b>');
});
