const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe } = require('../fixed-income-display.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('V190 Renda Fixa keeps a semantic page heading and provenance helper', () => {
  assert.match(html, /<h1 class="premium-rf-title">Renda Fixa<\/h1>/);
  assert.match(html, /globalThis\.FixedIncomeDisplay\?\.describe/);
  assert.match(html, /fixed-income-display\.js/);
});

test('V190 fixed-income display describes fallback without changing valuation', () => {
  assert.deepEqual(describe({ source: 'valor aplicado', isFallback: true }), {
    label: 'Fallback do valor aplicado',
    tone: 'warn',
    note: 'Referência preservada por compatibilidade; não representa uma atualização de mercado.'
  });
  assert.equal(describe({ authority: 'MANUAL_AUTHORITATIVE' }).label, 'Valor manual autoritativo');
  assert.equal(describe({ source: 'rf_liquid_value' }).label, 'Valor informado');
});

test('V190 Import Center has a semantic heading and live simulation result', () => {
  assert.match(fs.readFileSync(path.join(root, 'import-center-view.js'), 'utf8'), /<h1 class="import-center-title"/);
  assert.match(fs.readFileSync(path.join(root, 'import-center-preview-renderer.js'), 'utf8'), /role="status" aria-live="polite"/);
});
