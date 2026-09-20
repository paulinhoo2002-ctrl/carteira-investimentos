const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../corporate-events-shadow');

test('normaliza split com impactos explícitos e provenance', () => {
  const event = E.normalizeEvent({
    source: 'B3', sourceReference: 'b3-2026-001', eventDate: '2026-09-01',
    type: 'desdobramento', assetBefore: 'ABCD3', ratio: '1:2',
    sourceUrl: 'https://example.invalid/event', confidence: 'HIGH'
  });
  assert.equal(event.eventType, 'SPLIT');
  assert.deepEqual(event.ratio, { from: 1, to: 2 });
  assert.equal(event.quantityEffect, 'MULTIPLY');
  assert.equal(event.identityEffect, 'NONE');
  assert.equal(event.status, 'NORMALIZED');
  assert.equal(event.provenance.source, 'B3');
  assert.equal(event.classificationConfidence, 'HIGH');
});

test('simula split preservando custo total e sem escrever posição oficial', () => {
  const event = E.normalizeEvent({ type: 'SPLIT', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:2', quantityBefore: 100 });
  const result = E.simulateEvent(event, { assetId: 'a1', ticker: 'ABCD3', quantity: 100, costBasis: 12345 });
  assert.equal(result.expectedQuantity, 200);
  assert.equal(result.expectedCostBasis, 12345);
  assert.equal(result.expectedAveragePrice, 61.725);
  assert.equal(result.currentOfficialQuantity, 100);
  assert.equal(result.status, 'SIMULATED');
  assert.equal(result.writes, 0);
});

test('ticker change preserves lineage instead of synthesizing sell and buy', () => {
  const event = E.normalizeEvent({ type: 'mudança de ticker', eventDate: '2026-08-01', assetBefore: 'OLD3', assetAfter: 'NEW3' });
  const result = E.simulateEvent(event, { ticker: 'OLD3', quantity: 40, costBasis: 8000 });
  assert.equal(event.eventType, 'TICKER_CHANGE');
  assert.equal(result.expectedAsset, 'NEW3');
  assert.equal(result.expectedQuantity, 40);
  assert.equal(result.identityTransformation, 'REPLACE');
  assert.equal(result.syntheticTransactions.length, 0);
});

test('unknown ratio is review-required and never guessed', () => {
  const event = E.normalizeEvent({ type: 'merger', eventDate: '2026-07-01', assetBefore: 'OLD3', assetAfter: 'NEW3' });
  const result = E.simulateEvent(event, { ticker: 'OLD3', quantity: 40, costBasis: 8000 });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.expectedQuantity, null);
  assert.equal(result.quantityEffect, 'UNKNOWN');
});

test('subscription rights distinguish grant, exercise and expiry', () => {
  const base = { eventDate: '2026-06-01', assetBefore: 'ABCD3', ratio: '1:10' };
  assert.equal(E.simulateEvent(E.normalizeEvent({ ...base, type: 'direito recebido' }), { ticker: 'ABCD3', quantity: 100 }).expectedQuantity, 100);
  assert.equal(E.simulateEvent(E.normalizeEvent({ ...base, type: 'direito expirado' }), { ticker: 'ABCD3', quantity: 100 }).expectedQuantity, 100);
  assert.equal(E.simulateEvent(E.normalizeEvent({ ...base, type: 'subscrição exercida', quantityDelta: 10 }), { ticker: 'ABCD3', quantity: 100 }).expectedQuantity, 110);
});

test('reconcilia match e mismatch contra posição oficial sem sobrescrevê-la', () => {
  const event = E.normalizeEvent({ type: 'SPLIT', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:2', quantityBefore: 100 });
  const match = E.reconcileEvent(event, { ticker: 'ABCD3', quantity: 200, costBasis: 12345 });
  const mismatch = E.reconcileEvent(event, { ticker: 'ABCD3', quantity: 190, costBasis: 12345 });
  assert.equal(match.status, 'MATCH');
  assert.equal(mismatch.status, 'MISMATCH');
  assert.equal(mismatch.currentOfficialQuantity, 190);
  assert.equal(mismatch.officialPositionMutated, false);
});

test('deduplica evento exato, relaciona fontes e marca conflito de ratio', () => {
  const input = [
    { source: 'B3', sourceReference: 'b3-a', type: 'SPLIT', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:2' },
    { source: 'BROKER', sourceReference: 'broker-a', type: 'desdobramento', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:2' },
    { source: 'NEWS', sourceReference: 'news-a', type: 'SPLIT', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:3' }
  ];
  const batch = E.processShadowEvents(input, { positions: { ABCD3: { ticker: 'ABCD3', quantity: 200, costBasis: 10000 } } });
  assert.equal(batch.events.length, 1);
  assert.equal(batch.events[0].sources.length, 2);
  assert.equal(batch.conflicts.length, 1);
  assert.equal(batch.events[0].status, 'REVIEW_REQUIRED');
  assert.equal(batch.writes, 0);
});

test('processamento é idempotente e preserva UNKNOWN sem converter em zero', () => {
  const input = [{ source: 'B3', type: 'SPLIT', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:2' }];
  const first = E.processShadowEvents(input, { positions: { ABCD3: { ticker: 'ABCD3', quantity: 200, costBasis: null } } });
  const repeated = E.processShadowEvents([...input, ...input], { positions: { ABCD3: { ticker: 'ABCD3', quantity: 200, costBasis: null } } });
  assert.deepEqual(repeated.reconciliations, first.reconciliations);
  assert.equal(first.reconciliations[0].expectedCostBasis, null);
  assert.equal(first.reconciliations[0].expectedQuantity, 200);
  assert.equal(first.officialPositionWrites, 0);
});

test('tax effect desconhecido e custo shadow não entram em ledger oficial', () => {
  const result = E.processShadowEvents([{ type: 'bonificação', eventDate: '2026-05-01', assetBefore: 'ABCD3', ratio: '1:10' }], { positions: { ABCD3: { ticker: 'ABCD3', quantity: 100, costBasis: 10000 } } });
  assert.equal(result.events[0].taxEffect, 'UNKNOWN');
  assert.equal(result.events[0].status, 'REVIEW_REQUIRED');
  assert.equal(result.officialCostBasisWrites, 0);
  assert.equal(result.officialDividendLedgerWrites, 0);
});

test('reverse split e merger com ratio calculam quantidade sem transações sintéticas', () => {
  const reverse = E.simulateEvent(E.normalizeEvent({ type: 'grupamento', eventDate: '2026-04-01', assetBefore: 'ABCD3', ratio: '10:1' }), { ticker: 'ABCD3', quantity: 100, costBasis: 10000 });
  assert.equal(reverse.expectedQuantity, 10);
  assert.equal(reverse.expectedCostBasis, 10000);
  const merger = E.simulateEvent(E.normalizeEvent({ type: 'fusão', eventDate: '2026-03-01', assetBefore: 'OLD3', assetAfter: 'NEW3', ratio: '1:2' }), { ticker: 'OLD3', quantity: 50, costBasis: 5000 });
  assert.equal(merger.expectedQuantity, 100);
  assert.equal(merger.expectedAsset, 'NEW3');
  assert.equal(merger.syntheticTransactions.length, 0);
});

test('spinoff com ratio desconhecido não inventa posição ou custo', () => {
  const result = E.simulateEvent(E.normalizeEvent({ type: 'spin-off', eventDate: '2026-02-01', assetBefore: 'OLD3', assetAfter: 'NEW3' }), { ticker: 'OLD3', quantity: 80, costBasis: 8000 });
  assert.equal(result.expectedQuantity, null);
  assert.equal(result.expectedCostBasis, 8000);
  assert.equal(result.status, 'REVIEW_REQUIRED');
});

test('processa histórico grande com dedupe linear e sem writes oficiais', () => {
  const input = Array.from({ length: 2500 }, (_, index) => ({
    source: 'B3', sourceReference: `b3-${index}`, type: 'SPLIT', eventDate: '2026-01-01', assetBefore: `A${String(index).padStart(4, '0')}`, ratio: '1:2'
  }));
  const batch = E.processShadowEvents(input, { positions: {} });
  assert.equal(batch.events.length, 2500);
  assert.equal(batch.writes, 0);
  assert.equal(batch.officialPositionWrites, 0);
});
