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

const parserSource = source('parseQuickMovementNumber', 'function quickMovementNumberField');

function parse(value, options) {
  const context = {};
  vm.runInNewContext(`${parserSource}\nthis.parse = parseQuickMovementNumber;`, context);
  return context.parse(value, options);
}

test('aceita formatos numericos brasileiros e equivalentes seguros', () => {
  const cases = [
    ['10', 10],
    ['10,5', 10.5],
    ['10.50', 10.5],
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['1234.56', 1234.56],
  ];
  for (const [input, expected] of cases) {
    const result = parse(input);
    assert.equal(result.ok, true, input);
    assert.equal(result.value, expected, input);
  }
});

test('rejeita entradas parcialmente invalidas e quantidade negativa', () => {
  for (const input of ['10abc', 'abc10', '1,2,3', '--10', '10-', 'Infinity', '']) {
    assert.equal(parse(input).ok, false, input);
  }
  assert.equal(parse('-10').ok, false);
});

test('inputmode decimal cobre os campos numericos da Nova movimentacao', () => {
  for (const id of ['qm-qty', 'qm-price', 'qm-value', 'qm-rf-applied', 'qm-rf-gross', 'qm-rf-liquid', 'qm-rf-iriof', 'qm-rf-unavailable', 'qm-outro-value']) {
    const pattern = new RegExp(`id="${id}"[^>]*inputmode="decimal"`);
    assert.match(indexHtml, pattern, id);
  }
});

test('builder nao transforma quantidade negativa em valor positivo', () => {
  const builder = source('quickMovementBuildAporteFromFields', 'function saveQuickMovement');
  const context = {
    S: { quickMovementDraft: { kind: 'compra', manualType: false, manualSector: false } },
    document: { getElementById(id) { return { value: ({
      'qm-dt': '2026-08-15', 'qm-ti': 'PETR4', 'qm-qty': '-10', 'qm-price': '10'
    })[id] || '' }; } },
    normalizeQuickMovementKind: value => String(value || 'compra'),
    inputDateValue: value => String(value || ''),
    brDate: value => value,
    normalizeMetadataTicker: value => String(value || '').trim().toUpperCase(),
    normalizeType: (value, fallback = 'Ação') => String(value || '').trim() || fallback,
    resolveAssetMetadata: () => ({ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }),
    quickMovementNumberField: undefined,
    quickMovementContract: () => null,
  };
  vm.runInNewContext(`${parserSource}\n${source('quickMovementNumberField', 'function quickMovementBuildAporteFromFields')}\n${builder}\nthis.build=quickMovementBuildAporteFromFields;`, context);
  const result = context.build('compra');
  assert.equal(result.field, 'qm-qty');
  assert.equal(result.reg, undefined);
});
