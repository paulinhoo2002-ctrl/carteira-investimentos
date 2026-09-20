const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'v250-runtime.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('V250 versiona app shell e evita cache indefinido de HTML e scripts', () => {
  assert.match(sw, /SW_VERSION = 'v250\.1'/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /cache: 'no-store'/);
  assert.match(sw, /request\.destination === 'script'/);
  assert.match(sw, /GET_V250_VERSION/);
  assert.match(sw, /carteira-investimentos-backup/);
  assert.match(index, /__EXPECTED_SERVICE_WORKER_CACHE__='carteira-investimentos-v250\.1'/);
});

test('V250 runtime expõe telemetria sanitizada e bloqueia writes offline', () => {
  assert.match(runtime, /__V250_PERF__/);
  assert.match(runtime, /duplicateRequestCount/);
  assert.match(runtime, /checkVersionCoherence/);
  assert.match(runtime, /Offline/);
  assert.match(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /localStorage\.setItem/);
  assert.doesNotMatch(runtime, /fetch\([^)]*method:\s*['"](?:POST|PUT|PATCH|DELETE)/i);
});

test('V250 mantém contrato PWA instalável sem hostname de preview', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  assert.doesNotMatch(manifest.start_url, /vercel\.app|preview/i);
});
