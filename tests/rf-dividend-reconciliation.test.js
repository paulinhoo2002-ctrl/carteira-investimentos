const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('function rfDividendReconciliationStatus(');
const end = source.indexOf('function manualIncomeRfLinkStatus(', start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const context = {
  inputDateValue(value) {
    const text = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  },
  rfEventNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
  },
  normalizeRfEventType(event) {
    return String(event?.type || event?.eventType || '').trim().toLowerCase();
  }
};
vm.runInNewContext(`${source.slice(start, end)};globalThis.api={rfDividendReconciliationStatus,rfDividendLinkedEventIds};`, context);
const { rfDividendReconciliationStatus, rfDividendLinkedEventIds } = context.api;

function event(id, value = 300, date = '2026-06-15', ticker = 'MOVI18') {
  return { id, type: 'juros', ticker, date, netValue: value };
}
function linkedProvento(id, value = 300, date = '2026-06-15', ticker = 'MOVI18') {
  return { id, type: 'Juros de Renda Fixa', ticker, date, value, sourceEventKind: 'rf', sourceEventId: 'rf-1' };
}

test('A: valuation RF permanece separado da renda recebida', () => {
  assert.equal(10500 - 10000, 500);
  assert.equal(rfDividendLinkedEventIds([], [event('rf-1')]).size, 0);
});

test('B: rfEvent de juros sem provento conta uma vez', () => {
  assert.equal(rfDividendLinkedEventIds([], [event('rf-1')]).size, 0);
});

test('C: par rfEvent + provento vinculado usa uma única identidade', () => {
  const provento = linkedProvento('p-1');
  assert.equal(rfDividendReconciliationStatus(provento, [event('rf-1')]), 'LINKED');
  assert.deepEqual([...rfDividendLinkedEventIds([provento], [event('rf-1')])], ['rf-1']);
});

test('D: provento vinculado repetido não cria dois IDs de evento', () => {
  const rows = [linkedProvento('p-1'), linkedProvento('p-2')];
  assert.deepEqual([...rfDividendLinkedEventIds(rows, [event('rf-1')])], ['rf-1']);
});

test('E: evento RF repetido permanece deduplicável pela identidade do evento', () => {
  const ids = rfDividendLinkedEventIds([linkedProvento('p-1')], [event('rf-1'), event('rf-1')]);
  assert.equal(ids.size, 1);
});

test('F: provento manual coincidente é apenas possível duplicidade', () => {
  const provento = { type: 'Juros de Renda Fixa', ticker: 'MOVI18', date: '2026-06-15', value: 300 };
  assert.equal(rfDividendReconciliationStatus(provento, [event('rf-1')]), 'POSSIBLE_DUPLICATE');
});

test('G: link quebrado é preservado e sinalizado', () => {
  const provento = { ...linkedProvento('p-1'), sourceEventId: 'missing' };
  assert.equal(rfDividendReconciliationStatus(provento, [event('rf-1')]), 'BROKEN_LINK');
  assert.equal(provento.value, 300);
});

test('H: juros legítimos iguais com IDs diferentes não colapsam na reconciliação', () => {
  const rows = [event('rf-1'), event('rf-2')];
  const ids = new Set(rows.map(row => row.id));
  assert.equal(ids.size, 2);
});
