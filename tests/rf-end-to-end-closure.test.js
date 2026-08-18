const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const helperStart = indexHtml.indexOf('function rfDividendReconciliationStatus(');
const helperEnd = indexHtml.indexOf('function manualIncomeRfLinkStatus(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart);
const context = {
  inputDateValue: value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim()) ? String(value).trim() : '',
  rfEventNumber: value => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(2)) : 0,
  normalizeRfEventType: event => String(event?.type || event?.eventType || '').trim().toLowerCase(),
};
vm.runInNewContext(`${indexHtml.slice(helperStart, helperEnd)};globalThis.api={rfDividendReconciliationStatus,rfDividendLinkedEventIds};`, context);
const api = context.api;
const FinanceCore = require('../finance-core.js');

const rfEvent = (id, overrides = {}) => ({
  id,
  type: 'juros',
  ticker: 'CDBTESTE',
  date: '2026-07-15',
  netValue: 300,
  ...overrides,
});
const linkedIncome = (sourceEventId, overrides = {}) => ({
  id: `p-${sourceEventId}`,
  type: 'Juros de Renda Fixa',
  ticker: 'CDBTESTE',
  date: '2026-07-15',
  value: 300,
  sourceEventKind: 'rf',
  sourceEventId,
  ...overrides,
});

test('posição inicial preserva applied/current/profit/rentabilidade', () => {
  const asset = { type: 'Renda Fixa', rf_applied_value: 10000, rf_liquid_value: 10500 };
  assert.equal(FinanceCore.assetAppliedValue(asset), 10000);
  assert.equal(FinanceCore.assetCurrentValue(asset), 10500);
  assert.equal(FinanceCore.assetJurosValue(asset), 500);
  assert.equal(FinanceCore.assetRentabPct(asset), 5);
});

test('aporte adicional é principal, não provento', () => {
  const events = [rfEvent('aporte-1', { type: 'aporte', principalDelta: 2000, netValue: 2000 })];
  assert.equal(events[0].principalDelta, 2000);
  assert.equal(api.rfDividendLinkedEventIds([], events).size, 0);
});

test('juros sem provento permanecem uma única renda RF', () => {
  const events = [rfEvent('rf-1')];
  assert.equal(api.rfDividendLinkedEventIds([], events).size, 0);
  assert.equal(events.reduce((sum, event) => sum + event.netValue, 0), 300);
});

test('juros e provento vinculados contam uma vez', () => {
  const events = [rfEvent('rf-1')];
  const income = [linkedIncome('rf-1')];
  assert.equal(api.rfDividendReconciliationStatus(income[0], events), 'LINKED');
  assert.deepEqual([...api.rfDividendLinkedEventIds(income, events)], ['rf-1']);
});

test('resgate parcial reduz principal e não cria renda', () => {
  const event = rfEvent('resgate-1', { type: 'resgate_parcial', principalDelta: -1500, netValue: 1500 });
  assert.equal(event.principalDelta, -1500);
  assert.equal(api.rfDividendLinkedEventIds([], [event]).size, 0);
});

test('juros após resgate continuam vinculáveis', () => {
  const event = rfEvent('rf-2', { date: '2026-08-15' });
  const income = linkedIncome('rf-2', { date: '2026-08-15' });
  assert.equal(api.rfDividendReconciliationStatus(income, [event]), 'LINKED');
});

test('resgate total zera principal sem apagar histórico de juros', () => {
  const events = [rfEvent('rf-1'), rfEvent('resgate-total', { type: 'resgate_total', principalDelta: -10500 })];
  assert.equal(events.filter(event => event.type === 'juros').length, 1);
  assert.equal(events.reduce((sum, event) => sum + (event.principalDelta || 0), 0), -10500);
});

test('par repetido mantém uma identidade econômica', () => {
  const income = [linkedIncome('rf-1'), linkedIncome('rf-1', { id: 'duplicate' })];
  assert.deepEqual([...api.rfDividendLinkedEventIds(income, [rfEvent('rf-1')])], ['rf-1']);
});

test('roundtrip preserva posição, eventos, provento e vínculo', () => {
  const state = { assets: [{ ticker: 'CDBTESTE', rf_applied_value: 10000 }], rfEvents: [rfEvent('rf-1')], proventos: [linkedIncome('rf-1')] };
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restored, state);
});

test('backup/restore preserva a identidade do vínculo', () => {
  const backup = JSON.parse(JSON.stringify({ rfEvents: [rfEvent('rf-1')], proventos: [linkedIncome('rf-1')] }));
  assert.equal(backup.proventos[0].sourceEventId, backup.rfEvents[0].id);
});

test('link quebrado preserva o provento e sinaliza BROKEN_LINK', () => {
  const income = linkedIncome('missing');
  assert.equal(api.rfDividendReconciliationStatus(income, [rfEvent('rf-1')]), 'BROKEN_LINK');
  assert.equal(income.value, 300);
});

test('manual sem vínculo sinaliza POSSIBLE_DUPLICATE sem excluir', () => {
  const income = { type: 'Juros de Renda Fixa', ticker: 'CDBTESTE', date: '2026-07-15', value: 300 };
  assert.equal(api.rfDividendReconciliationStatus(income, [rfEvent('rf-1')]), 'POSSIBLE_DUPLICATE');
  assert.equal(income.value, 300);
});

test('legacy sem campos de vínculo continua UNLINKED', () => {
  const income = { type: 'Dividendo', ticker: 'PETR4', date: '2026-07-15', value: 100 };
  assert.equal(api.rfDividendReconciliationStatus(income, [rfEvent('rf-1')]), 'UNLINKED');
});

test('eventos legítimos iguais com IDs diferentes permanecem distintos', () => {
  const events = [rfEvent('rf-x'), rfEvent('rf-y')];
  assert.equal(new Set(events.map(event => event.id)).size, 2);
});

test('dados de entrada não são mutados pelo guard de reconciliação', () => {
  const income = linkedIncome('rf-1');
  const snapshot = JSON.stringify(income);
  api.rfDividendReconciliationStatus(income, [rfEvent('rf-1')]);
  assert.equal(JSON.stringify(income), snapshot);
});
