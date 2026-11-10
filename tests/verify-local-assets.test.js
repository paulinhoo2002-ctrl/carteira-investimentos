'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { verifyLocalAssets, extractLocalScriptSrcs, isExternalOrDynamic } = require('../scripts/verify-local-assets');

test('extractLocalScriptSrcs: extrai src de scripts locais', () => {
  const html = '<script src="finance-core.js"></script><script src="https://cdn.external.com/lib.js"></script>';
  const srcs = extractLocalScriptSrcs(html);
  assert.deepStrictEqual(srcs, ['finance-core.js', 'https://cdn.external.com/lib.js']);
});

test('isExternalOrDynamic: detecta URLs externas', () => {
  assert.strictEqual(isExternalOrDynamic('https://cdn.external.com/lib.js'), true);
  assert.strictEqual(isExternalOrDynamic('http://example.com/script.js'), true);
});

test('isExternalOrDynamic: detecta recursos dinâmicos', () => {
  assert.strictEqual(isExternalOrDynamic('{{asset.js}}'), true);
  assert.strictEqual(isExternalOrDynamic('data:text/javascript,foo'), true);
  assert.strictEqual(isExternalOrDynamic('blob:uuid'), true);
});

test('isExternalOrDynamic: scripts locais não são externos', () => {
  assert.strictEqual(isExternalOrDynamic('finance-core.js'), false);
  assert.strictEqual(isExternalOrDynamic('subdir/asset.js'), false);
});

test('verifyLocalAssets: passa quando todos os scripts locais existem', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-guard-'));
  try {
    fs.writeFileSync(path.join(tmp, 'index.html'), '<script src="a.js"></script><script src="b.js"></script>');
    fs.writeFileSync(path.join(tmp, 'a.js'), 'console.log("a");');
    fs.writeFileSync(path.join(tmp, 'b.js'), 'console.log("b");');

    const result = verifyLocalAssets({ htmlFile: path.join(tmp, 'index.html'), root: tmp, failOnMissing: false });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.missing.length, 0);
    assert.strictEqual(result.present.length, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifyLocalAssets: detecta script ausente', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-guard-'));
  try {
    fs.writeFileSync(path.join(tmp, 'index.html'), '<script src="missing.js"></script>');

    assert.throws(
      () => verifyLocalAssets({ htmlFile: path.join(tmp, 'index.html'), root: tmp, failOnMissing: true }),
      /missing\.js/
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifyLocalAssets: remove query string antes de verificar disco', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-guard-'));
  try {
    fs.writeFileSync(path.join(tmp, 'index.html'), '<script src="a.js?v=1"></script>');
    fs.writeFileSync(path.join(tmp, 'a.js'), 'console.log("a");');

    const result = verifyLocalAssets({ htmlFile: path.join(tmp, 'index.html'), root: tmp, failOnMissing: false });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.missing.length, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('verifyLocalAssets: pula recursos externos', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-guard-'));
  try {
    fs.writeFileSync(path.join(tmp, 'index.html'), '<script src="https://cdn.com/lib.js"></script><script src="local.js"></script>');
    fs.writeFileSync(path.join(tmp, 'local.js'), 'console.log("local");');

    const result = verifyLocalAssets({ htmlFile: path.join(tmp, 'index.html'), root: tmp, failOnMissing: false });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.externalOrDynamic, 1);
    assert.strictEqual(result.local, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
