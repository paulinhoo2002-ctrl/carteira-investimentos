'use strict';
// SM185 — integridade do catálogo B3 local: o arquivo versionado precisa ser exatamente o que o gerador produz a partir do snapshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { buildCatalog, render } = require('../scripts/build-b3-catalog.js');

const ROOT = path.join(__dirname, '..');
const sourcePath = path.join(ROOT, 'data', 'b3-catalog', 'source-2026-11-16.json');
const catalogPath = path.join(ROOT, 'b3-catalog.js');

function loadCatalog() {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(catalogPath, 'utf8'), ctx);
  assert.ok(ctx.B3Catalog, 'B3Catalog exposto no escopo global');
  return ctx.B3Catalog;
}

test('b3-catalog.js é exatamente o resultado do gerador a partir do snapshot versionado (sem drift)', () => {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const expected = render(source, buildCatalog(source));
  assert.equal(fs.readFileSync(catalogPath, 'utf8'), expected, 'regenerar com scripts/build-b3-catalog.js e revisar o diff');
});

test('catálogo: códigos válidos, sem duplicatas, ordenados e sem rejeições', () => {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const { tickers, rejected } = buildCatalog(source);
  assert.equal(rejected.length, 0, 'nenhum código do snapshot rejeitado');
  assert.equal(new Set(tickers).size, tickers.length, 'sem duplicatas');
  assert.deepEqual(tickers, [...tickers].sort(), 'ordenado');
  assert.ok(tickers.every(code => /^[A-Z0-9]{4,7}$/.test(code) && /[A-Z]/.test(code) && /\d/.test(code)));
});

test('catálogo reconhece códigos reais e recusa códigos inexistentes ou de controle', () => {
  const catalog = loadCatalog();
  for (const real of ['BBAS3', 'MXRF11', 'PETR4', 'ITUB4', 'HGLG11', 'BOVA11', 'BBAS3F']) {
    assert.equal(catalog.has(real), true, `${real} deve existir no catálogo`);
  }
  for (const fake of ['ZZNX3', 'ZZQA1', 'XXXX3', 'BBAS9', 'TESTE']) {
    assert.equal(catalog.has(fake), false, `${fake} não deve existir no catálogo`);
  }
  assert.equal(catalog.has('bbas3'), true, 'normalização de caixa');
  assert.match(catalog.version, /^\d{4}-\d{2}-\d{2}-\d+$/, 'versão rastreável (data-quantidade)');
});
