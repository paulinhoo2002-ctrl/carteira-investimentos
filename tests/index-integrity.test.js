const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html preserves the application document and bootstrap shell', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<html\b/i);
  assert.match(html, /<head\b/i);
  assert.match(html, /<body\b/i);
  assert.match(html, /function\s+go\s*\(/);
  assert.match(html, /class=["'][^"']*tabs-desktop/);
  assert.match(html, /<\/html>/i);
});
