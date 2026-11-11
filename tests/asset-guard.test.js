'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checkAssets } = require('../scripts/verify-assets.js');

function tempRoot(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-guard-'));
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), '// ok');
  }
  return dir;
}

test('positivo: arquivo local presente passa, com query e ./ tratados', () => {
  const root = tempRoot(['analytics-monte-carlo-input.js', 'v250-runtime.js']);
  const html = '<script src="./analytics-monte-carlo-input.js"></script><script src="v250-runtime.js?v=1"></script>';
  const r = checkAssets(html, root);
  assert.equal(r.checked, 2);
  assert.deepEqual(r.missing, []);
});

test('negativo: arquivo local ausente é reportado', () => {
  const root = tempRoot([]);
  const html = '<script src="analytics-monte-carlo-input.js"></script>';
  const r = checkAssets(html, root);
  assert.deepEqual(r.missing, ['analytics-monte-carlo-input.js']);
});

test('externos, data: e hash-only são ignorados, não geram falso positivo', () => {
  const root = tempRoot([]);
  const html = '<script src="https://www.gstatic.com/x.js"></script><link href="data:text/css,a"><a href="#topo"></a><script src="//cdn.example/x.js"></script>';
  const r = checkAssets(html, root);
  assert.equal(r.checked, 0);
  assert.deepEqual(r.missing, []);
  assert.ok(r.skipped.length >= 2);
});

test('referência dinâmica (template/JS) é ignorada', () => {
  const root = tempRoot([]);
  const html = '<img src="${esc(FB.user.photoURL)}"><img src="\' + url + \'">';
  const r = checkAssets(html, root);
  assert.equal(r.checked, 0);
  assert.deepEqual(r.missing, []);
});

test('o index.html real do repositório passa na guarda', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const r = checkAssets(html, root);
  assert.deepEqual(r.missing, [], 'referências locais ausentes: ' + r.missing.join(', '));
  assert.ok(r.checked > 50);
});
