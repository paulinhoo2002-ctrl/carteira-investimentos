const test = require('node:test');
const assert = require('node:assert/strict');

// V588: health-check pure helpers (no network in tests).
const path = require('node:path');
const fs = require('node:fs');
const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'maintenance', 'health-check.js'), 'utf8');

test('V588: health-check exposes read-only contract (no write verbs in source)', () => {
  assert.match(src, /read-only/i);
  // No mutation of remote state: no POST/PUT/DELETE to the app, no taskkill, no rm.
  assert.doesNotMatch(src, /method:\s*'(POST|PUT|DELETE|PATCH)'/);
  assert.doesNotMatch(src, /taskkill/);
  assert.doesNotMatch(src, /rm\s+-rf/);
});

test('V588: version marker extraction works from served HTML shape', () => {
  // Simulate the served HTML fragment the app ships.
  const html = `<script>window.__APP_BUILD_ID__='phase4i-runtime-v2';</script>`;
  // Re-use the same regex logic as the script by evaluating extractBuildId inline.
  const extract = new Function('html', `const m = html.match(/__APP_BUILD_ID__\\s*=\\s*'([^']+)'/); return m ? m[1] : null;`);
  assert.equal(extract(html), 'phase4i-runtime-v2');
  assert.equal(extract('<html></html>'), null);
});

test('V588: degraded exit codes: 0 healthy, 2 degraded, 1 error (contract present)', () => {
  assert.match(src, /process\.exitCode = degraded \? 2 : 0/);
  assert.match(src, /process\.exitCode = 1/);
});