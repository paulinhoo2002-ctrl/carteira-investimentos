const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'maintenance', 'health-check.js'), 'utf8');

test('V674 RED: health-check compares served HTML to local index.html (normalized) for deploy divergence', () => {
  assert.match(src, /index-html-match/, 'must have an index-html-match check');
  assert.match(src, /CRLF/, 'CRLF normalization documented in source');
});

test('V674: divergence check flags DEPLOY_DIVERGED explicitly', () => {
  assert.match(src, /DEPLOY_DIVERGED/, 'must flag divergence explicitly');
});
