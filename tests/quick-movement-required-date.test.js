const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function source(name, next) {
  const start = indexHtml.indexOf(`function ${name}(`);
  const end = indexHtml.indexOf(next, start);
  assert.ok(start >= 0 && end > start, `${name} source not found`);
  return indexHtml.slice(start, end);
}

const builderSource = source('quickMovementBuildAporteFromFields', 'function saveQuickMovement');
const dateHelpers = source('inputDateValue', 'function parseAnyDate');

function build(kind, values, draft = {}) {
  const context = {
    S: { quickMovementDraft: { kind, ...draft } },
    document: { getElementById(id) { return { value: values[id] ?? '' }; } },
    normalizeQuickMovementKind: value => String(value || 'compra'),
    inputDateValue: undefined,
    brDate: value => value ? `BR:${value}` : 'FALLBACK',
    quickMovementNumberField: () => ({ ok: true, value: 10 }),
    normalizeMetadataTicker: value => String(value || '').trim().toUpperCase(),
    normalizeType: (value, fallback = 'Ação') => String(value || '').trim() || fallback,
    resolveAssetMetadata: () => ({ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }),
    quickMovementSaleAssetById: () => null,
    quickMovementContract: () => null,
  };
  vm.runInNewContext(`${dateHelpers}\n${builderSource}\nthis.build=quickMovementBuildAporteFromFields;`, context);
  return context.build(kind);
}

test('sessão nova mantém o default de hoje e apagar a data preserva vazio no draft', () => {
  assert.match(indexHtml, /date:today/);
  assert.match(indexHtml, /rfAppDate:today/);
  assert.match(indexHtml, /draft\.date!==undefined\?draft\.date:new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
  assert.match(indexHtml, /draft\.rfAppDate!==undefined\?draft\.rfAppDate:new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
});

test('compra sem data retorna erro inline mapeado para qm-dt', () => {
  const result = build('compra', { 'qm-dt': '', 'qm-ti': 'PETR4', 'qm-qty': '10', 'qm-price': '20' });
  assert.equal(result.error, 'Preencha a data da movimentação.');
  assert.equal(result.field, 'qm-dt');
});

test('provento sem data retorna erro inline mapeado para qm-dt', () => {
  const result = build('provento', { 'qm-dt': '', 'qm-ti': 'MXRF11', 'qm-value': '10,50' });
  assert.equal(result.error, 'Preencha a data da movimentação.');
  assert.equal(result.field, 'qm-dt');
});

test('renda fixa sem data de aplicação retorna erro em qm-rf-app-date', () => {
  const result = build('renda-fixa', { 'qm-rf-name': 'CDB Banco X', 'qm-rf-app-date': '' }, { date: '2026-08-15', rfAppDate: '' });
  assert.equal(result.error, 'Preencha a data da aplicação.');
  assert.equal(result.field, 'qm-rf-app-date');
});

test('data válida é preservada sem fallback silencioso', () => {
  const result = build('compra', { 'qm-dt': '2026-08-20', 'qm-ti': 'PETR4', 'qm-qty': '10', 'qm-price': '20' });
  assert.equal(result.reg.date, '2026-08-20');
});

test('ARIA continua mapeando o erro de data para o campo correto', () => {
  const modalDate = /id="qm-dt"[^>]*oninput="setQuickMovementField\('date', this.value\)"/;
  const modalRfDate = /id="qm-rf-app-date"[^>]*\$\{qmErrOn\('qm-rf-app-date'\)\}/;
  assert.match(indexHtml, modalDate);
  assert.match(indexHtml, modalRfDate);
  assert.match(indexHtml, /field:'qm-rf-app-date'/);
});
