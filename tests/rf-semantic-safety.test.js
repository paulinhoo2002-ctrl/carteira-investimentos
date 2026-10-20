'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.notEqual(from, -1, `missing section start: ${start}`);
  assert.notEqual(to, -1, `missing section end: ${end}`);
  return source.slice(from, to);
}

const eventFunctions = section('function rfEventTextCandidates(', 'function rfEventTypeLabel(')
  + section('function rfEventNumber(', 'function normalizeRfEvents(')
  + section('function normalizeRfEvents(', 'function getRfAssetByEventId(')
  + section('function rfEventTotals(', 'function rfIncomeByAsset(')
  + section('function rfPassiveIncomeRows(', 'function passiveIncomeCombinedRows(')
  + section('function rfEventEvidenceStatus(', 'function rfPositionResultText(');
const eventHistoryUi = section('function rfEventHistoryCards(', 'function rfMaturityReviewGroups(');

function createEventContext(events = []) {
  const context = {
    S: { rfEvents: events },
    rfPosNorm(value) {
      return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    },
    cleanAssetCode(value) { return String(value ?? '').trim(); },
    inputDateValue(value) { return String(value ?? '').slice(0, 10); },
    parseAnyDate(value) { return value ? new Date(`${value}T12:00:00Z`) : null; },
    toISODate(value) { return value instanceof Date ? value.toISOString().slice(0, 10) : ''; },
    findRfAssetByEventLink() { return null; },
    assetRfName(asset) { return asset?.name || ''; },
  };
  vm.runInNewContext(`${eventFunctions};globalThis.api={normalizeRfEventType,normalizeRfEvents,rfEventTotals,rfPassiveIncomeRows,rfEventEvidenceStatus};`, context);
  return context.api;
}

test('unknown positive movement is not inferred as interest income', () => {
  const api = createEventContext([{ id: 'unknown-positive', grossValue: 80, netValue: 80 }]);
  assert.equal(api.normalizeRfEventType({ grossValue: 80, netValue: 80 }), 'outro');
  assert.equal(api.rfPassiveIncomeRows().length, 0);
  const totals = api.rfEventTotals([{ grossValue: 80, netValue: 80 }]);
  assert.equal(totals.grossValue, 80, 'recorded amount stays visible');
  assert.equal(totals.incomeGrossValue, 0, 'unclassified amount is not certified as income');
});

test('IR description containing juros remains tax and is excluded from income', () => {
  const event = { id: 'ir-movi', description: 'IR - Pgto Juros MOVI18', grossValue: 100, netValue: 100 };
  const api = createEventContext([event]);
  assert.equal(api.normalizeRfEventType(event), 'ir');
  assert.equal(api.rfPassiveIncomeRows().length, 0);
  const totals = api.rfEventTotals([event]);
  assert.equal(totals.incomeGrossValue, 0);
  assert.equal(totals.eventEvidenceCounts.tax, 1);
  assert.equal(totals.eventEvidenceCounts.income, 0);
});

test('unrecognized explicit movement type is not inferred from an interest description', () => {
  const event = { type: 'movimentacao', description: 'Pagamento de juros', grossValue: 80, netValue: 80 };
  const api = createEventContext([event]);
  assert.equal(api.normalizeRfEventType(event), 'outro');
  assert.equal(api.rfPassiveIncomeRows().length, 0);
});

test('redemptions and amortizations are not income', () => {
  const api = createEventContext([
    { id: 'redeem', type: 'resgate_total', grossValue: 200, netValue: 200, principalDelta: 200 },
    { id: 'amort', type: 'amortizacao', grossValue: 50, netValue: 50, principalDelta: 50 },
  ]);
  assert.equal(api.rfPassiveIncomeRows().length, 0);
});

test('explicit coupon is classified as income', () => {
  const api = createEventContext([{ id: 'coupon', type: 'juros', grossValue: 100, ir: 10, netValue: 90 }]);
  assert.equal(api.rfPassiveIncomeRows().length, 1);
  assert.equal(api.rfPassiveIncomeRows()[0].value, 90);
});

test('event ledger labels cross-type amounts as recorded totals, not income', () => {
  assert.match(eventHistoryUi, /Líquido registrado/);
  assert.match(eventHistoryUi, /Soma dos eventos; pode incluir principal/);
  assert.match(eventHistoryUi, /Soma dos eventos registrados/);
  assert.doesNotMatch(eventHistoryUi, /Recebido no caixa/);
});

test('income, tax, and principal evidence use independent event scopes', () => {
  const api = createEventContext();
  const row = api.rfEventTotals([
    { type: 'juros', grossValue: 100, ir: 10, netValue: 90 },
    { type: 'amortizacao', principalDelta: 25, netValue: 25 },
  ]);
  assert.equal(api.rfEventEvidenceStatus(row, 'income'), 'Parcial');
  assert.equal(api.rfEventEvidenceStatus(row, 'tax'), 'Parcial');
  assert.equal(api.rfEventEvidenceStatus(row, 'principal'), 'Parcial');
  const couponOnly = api.rfEventTotals([{ type: 'juros', grossValue: 100, netValue: 100 }]);
  assert.equal(api.rfEventEvidenceStatus(couponOnly, 'tax'), 'Indisponível');
  assert.equal(api.rfEventEvidenceStatus(couponOnly, 'principal'), 'Indisponível');
});

test('missing fixed-income applied basis does not produce a position result', () => {
  const snapshotSource = section('function rfIntelligenceSnapshot(){', 'function rfEventStatusBadge(');
  const context = {
    S: { assets: [{ id: 'unknown-basis', type: 'Renda Fixa', current_price: 100 }], rfEvents: [] },
    isRendaFixaAsset(asset) { return asset?.type === 'Renda Fixa'; },
    rfEconomicEvidenceForAsset() { return null; },
    rfValues() { return { applied: 0, appliedState: { state: 'missing' }, current: 100, profit: null, hasExplicitCurrent: true }; },
    rfIncomeByAsset() { return { grossValue: 0, ir: 0, iof: 0, netValue: 0, principalDelta: 0, count: 0, eventEvidenceCounts: { income: 0, tax: 0, principal: 0 } }; },
    assetRfMaturityDate() { return ''; }, parseAnyDate() { return null; }, rfCategoryLabel() { return 'Debênture'; },
    assetRfContractRate() { return ''; }, assetRfCurrentValueMeta() { return { trustStatus: 'MANUAL_AUTHORITATIVE' }; },
    assetRfName(asset) { return asset.ticker || 'Título'; }, assetRfSubtype() { return ''; }, assetRfIndexerLabel() { return '—'; },
    rfBucketLabel() { return 'Sem vencimento'; },
  };
  vm.runInNewContext(`${snapshotSource};globalThis.api=rfIntelligenceSnapshot;`, context);
  const result = context.api();
  assert.equal(result.assets[0].appliedKnown, false);
  assert.equal(result.totalProfit, null);
});

test('position result does not become total return when principal was returned', () => {
  const snapshotSource = section('function rfIntelligenceSnapshot(){', 'function rfEventStatusBadge(');
  const context = {
    S: { assets: [{ id: 'principal-returned', type: 'Renda Fixa', ticker: 'MOVI18' }], rfEvents: [{ type: 'amortizacao', principalDelta: 25, netValue: 25 }] },
    isRendaFixaAsset() { return true; },
    rfEconomicEvidenceForAsset() { return null; },
    rfValues() { return { applied: 100, appliedState: { state: 'value' }, current: 110, profit: 10, hasExplicitCurrent: true }; },
    rfIncomeByAsset() { return { grossValue: 25, ir: 0, iof: 0, netValue: 25, principalDelta: 25, count: 1, eventEvidenceCounts: { income: 0, tax: 0, principal: 1 } }; },
    assetRfMaturityDate() { return ''; }, parseAnyDate() { return null; }, rfCategoryLabel() { return 'Debênture'; },
    assetRfContractRate() { return ''; }, assetRfCurrentValueMeta() { return { trustStatus: 'MANUAL_AUTHORITATIVE' }; },
    assetRfName(asset) { return asset.ticker || 'Título'; }, assetRfSubtype() { return ''; }, assetRfIndexerLabel() { return '—'; },
    rfBucketLabel() { return 'Sem vencimento'; },
  };
  vm.runInNewContext(`${snapshotSource};globalThis.api=rfIntelligenceSnapshot;`, context);
  const result = context.api();
  assert.equal(result.assets[0].profit, 10);
  assert.equal(result.assets[0].resultWithEvents, null);
  assert.equal(result.totalResultWithEvents, null);
});

test('MOVIDA and CRA stay partial instead of closing by arithmetic', () => {
  const snapshotSource = section('function rfIntelligenceSnapshot(){', 'function rfEventStatusBadge(');
  for (const ticker of ['MOVI18', 'CRA024004SB']) {
    const context = {
      S: { assets: [{ id: ticker, type: 'Renda Fixa', ticker }], rfEvents: [] },
      isRendaFixaAsset() { return true; },
    rfEconomicEvidenceForAsset() { return null; },
      rfValues() { return { applied: 100, appliedState: { state: 'value' }, current: 110, profit: 10, hasExplicitCurrent: true }; },
      rfIncomeByAsset() { return { grossValue: 100, ir: 10, iof: 0, netValue: 90, principalDelta: 0, count: 1, incomeGrossValue: 100, incomeIr: 10, incomeIof: 0, incomeNetValue: 90, eventEvidenceCounts: { income: 1, tax: 1, principal: 0 } }; },
      assetRfMaturityDate() { return ''; }, parseAnyDate() { return null; }, rfCategoryLabel() { return 'Debênture'; },
      assetRfContractRate() { return ''; }, assetRfCurrentValueMeta() { return { trustStatus: 'MANUAL_AUTHORITATIVE' }; },
      assetRfName(asset) { return asset.ticker; }, assetRfSubtype() { return ''; }, assetRfIndexerLabel() { return '—'; },
      rfBucketLabel() { return 'Sem vencimento'; },
    };
    vm.runInNewContext(`${snapshotSource};globalThis.api=rfIntelligenceSnapshot;`, context);
    const result = context.api();
    assert.equal(result.assets[0].resultWithEvents, null, `${ticker} must remain partial`);
    assert.equal(result.totalResultWithEvents, null, `${ticker} must not contribute to a global total return`);
  }
});

test('recorded tax does not change position result into an income-adjusted return', () => {
  const snapshotSource = section('function rfIntelligenceSnapshot(){', 'function rfEventStatusBadge(');
  const context = {
    S: { assets: [{ id: 'tax-only', type: 'Renda Fixa' }], rfEvents: [] },
    isRendaFixaAsset() { return true; },
    rfEconomicEvidenceForAsset() { return null; },
    rfValues() { return { applied: 100, appliedState: { state: 'value' }, current: 90, profit: -10, hasExplicitCurrent: true }; },
    rfIncomeByAsset() { return { grossValue: 0, ir: 5, iof: 0, netValue: -5, principalDelta: 0, count: 1, incomeGrossValue: 0, incomeIr: 0, incomeIof: 0, incomeNetValue: 0, eventEvidenceCounts: { income: 0, tax: 1, principal: 0 } }; },
    assetRfMaturityDate() { return ''; }, parseAnyDate() { return null; }, rfCategoryLabel() { return 'CDB'; },
    assetRfContractRate() { return ''; }, assetRfCurrentValueMeta() { return { trustStatus: 'MANUAL_AUTHORITATIVE' }; },
    assetRfName() { return 'CDB'; }, assetRfSubtype() { return ''; }, assetRfIndexerLabel() { return '—'; },
    rfBucketLabel() { return 'Sem vencimento'; },
  };
  vm.runInNewContext(`${snapshotSource};globalThis.api=rfIntelligenceSnapshot;`, context);
  const result = context.api();
  assert.equal(result.assets[0].profit, -10);
  assert.equal(result.assets[0].resultWithEvents, null);
});

test('Dashboard does not certify result when any applied basis is missing', () => {
  const dashboardSource = section('function cx(){', 'function proventoStats(){');
  const context = {
    S: { assets: [{ id: 'unknown-basis', type: 'Renda Fixa' }] },
    assetAppliedValue() { return 0; }, assetCurrentValue() { return 100; },
    isRendaFixaAsset(asset) { return asset?.type === 'Renda Fixa'; },
    rfEconomicEvidenceForAsset() { return null; },
    rfValues() { return { hasExplicitApplied: false, appliedState: { state: 'missing' } }; },
    hasOwnFiniteNumber(asset, keys) { return keys.some(key => Object.hasOwn(asset, key) && asset[key] !== '' && Number.isFinite(Number(asset[key]))); },
  };
  vm.runInNewContext(`${dashboardSource};globalThis.api=cx;`, context);
  const result = context.api();
  assert.equal(result.appliedComplete, false);
  assert.equal(typeof result.tG, 'number');
  context.S.assets = [{ id: 'closed-position', type: 'Ação', qty: 0 }];
  assert.equal(context.api().appliedComplete, true, 'zero quantity needs no average cost');
  context.S.assets = [{ id: 'localized-average', type: 'Ação', qty: 1, avg_price: '10,50' }];
  assert.equal(context.api().appliedComplete, false, 'localized text is not parsed differently from FinanceCore');
});

test('Dashboard labels result unavailable when applied coverage is incomplete', () => {
  const dashboardSource = section('function package2FiniteNumber(value){', 'function package2ExecutivePanel(');
  const context = {
    S: { hideValues: false },
    dashboardCurrentValueAvailability() { return { state: 'AVAILABLE', note: 'Valores atuais informados' }; },
    passiveIncomeMonthKey() { return '2026-10'; },
    passiveIncomeMonthSummary() { return { month: '2026-10', total: null, coverage: 'UNKNOWN' }; },
    passiveIncomeValue() { return '—'; },
    dashboardEconomicResultStatus() { return '<div>Resultado total: Em consolidação</div>'; },
    assetSignedMoneyText(value) { return `R$ ${value}`; },
    fmtP(value) { return `${value}%`; }, fmt(value) { return `R$ ${value}`; },
    dashboardMetricCard(_icon, label, value, note) { return `${label}|${value}|${note}`; },
    dashboardMetricIcon() { return ''; },
  };
  vm.runInNewContext(`${dashboardSource};globalThis.api=executiveKPIs;`, context);
  const html = context.api({ portfolio: { tI: 0, tC: 100, tG: 100, tGP: 100, appliedComplete: false } });
  assert.match(html, /Resultado da posição\|—/);
  assert.match(html, /Base aplicada parcial ou indisponível/);
  assert.doesNotMatch(html, /Resultado da posição\|R\$ 100/);
});
