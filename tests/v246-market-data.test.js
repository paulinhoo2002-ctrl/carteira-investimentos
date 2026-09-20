const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../market-data-2');

test('Market Data 2 normaliza cotação com provenance e freshness', () => {
  const now = Date.parse('2026-09-19T12:00:00Z');
  const quote = M.normalizeQuote({ symbol: 'PETR4.SA', regularMarketPrice: 39.5, regularMarketTime: now / 1000, provider: 'yahoo-chart' }, { now });
  assert.deepEqual({ ticker: quote.ticker, price: quote.price, source: quote.source, status: quote.status, fallbackUsed: quote.fallbackUsed }, { ticker: 'PETR4', price: 39.5, source: 'yahoo-chart', status: 'FRESH', fallbackUsed: false });
});

test('falha, ausência e stale nunca viram zero', () => {
  const now = Date.parse('2026-09-19T12:00:00Z');
  assert.equal(M.normalizeQuote({ symbol: 'PETR4', error: 'OFFLINE' }, { now }).price, null);
  assert.equal(M.freshness({ marketTime: '2026-09-17T00:00:00Z' }, { now, staleAfterMs: 60_000 }).status, 'STALE');
  assert.equal(M.freshness({}, { now }).status, 'UNKNOWN');
});

test('coordinator deduplica chamadas simultâneas e mantém last-known-good', async () => {
  let calls = 0;
  const provider = { name: 'primary', rank: 1, getQuote: async () => { calls += 1; return { ticker: 'PETR4', price: 40, marketTime: '2026-09-19T12:00:00Z', provider: 'primary' }; } };
  const coordinator = M.createCoordinator({ providers: [provider], now: () => Date.parse('2026-09-19T12:00:00Z') });
  const [a, b] = await Promise.all([coordinator.getQuote('PETR4'), coordinator.getQuote('petr4')]);
  assert.equal(calls, 1);
  assert.equal(a.price, 40);
  assert.equal(b.price, 40);
});

test('fallback e last-known-good preservam valor factual', async () => {
  let failed = false;
  let clock = Date.parse('2026-09-19T12:00:00Z');
  const provider = { name: 'primary', rank: 1, getQuote: async () => { if (failed) return { ticker: 'PETR4', error: 'OFFLINE' }; return { ticker: 'PETR4', price: 40, marketTime: '2026-09-19T12:00:00Z' }; } };
  const coordinator = M.createCoordinator({ providers: [provider], now: () => clock });
  assert.equal((await coordinator.getQuote('PETR4')).price, 40);
  failed = true;
  clock += 25 * 60 * 60 * 1000;
  const last = await coordinator.getQuote('PETR4');
  assert.equal(last.price, 40);
  assert.equal(last.lastKnownGood, true);
  assert.notEqual(last.price, 0);
});

test('coordinator usa cache dentro da janela e respeita staleAfterMs', async () => {
  let clock = 1_700_000_000_000;
  let calls = 0;
  const coordinator = M.createCoordinator({
    now: () => clock,
    staleAfterMs: 60_000,
    providers: [{ name: 'primary', getQuote: async () => { calls += 1; return { price: 10, marketTime: clock, source: 'primary' }; } }],
  });
  const first = await coordinator.getQuote('ABCD3');
  const cached = await coordinator.getQuote('ABCD3');
  assert.equal(first.status, 'FRESH');
  assert.equal(cached.cacheHit, true);
  assert.equal(calls, 1);
  clock += 61_000;
  const refreshed = await coordinator.getQuote('ABCD3');
  assert.equal(refreshed.cacheHit, undefined);
  assert.equal(calls, 2);
});

test('coordinator identifica fallback pela ordem e preserva source', async () => {
  const coordinator = M.createCoordinator({
    providers: [
      { name: 'primary', getQuote: async () => ({ error: 'timeout' }) },
      { name: 'fallback', getQuote: async () => ({ price: 12, marketTime: Date.now(), currency: 'BRL' }) },
    ],
  });
  const quote = await coordinator.getQuote('EFGH3');
  assert.equal(quote.source, 'fallback');
  assert.equal(quote.fallbackUsed, true);
  assert.equal(quote.price, 12);
});

test('provider failure is isolated and invalid response never becomes zero', async () => {
  const coordinator = M.createCoordinator({
    providers: [{ name: 'primary', getQuote: async ticker => ticker === 'BAD3' ? { price: 0 } : { price: 8, marketTime: Date.now(), source: 'primary' } }],
  });
  const [good, bad] = await coordinator.getQuotes(['GOOD3', 'BAD3']);
  assert.equal(good.price, 8);
  assert.equal(bad.price, null);
  assert.notEqual(bad.price, 0);
  assert.equal(bad.status, 'ERROR');
});

test('manual asset fields remain outside quote normalization', () => {
  const asset = { ticker: 'MAN3', current_price: 10, dy: 7.5, dySource: 'manual', price_target: 14, note: 'preserve' };
  const quote = M.normalizeQuote({ price: 11, marketTime: Date.now(), source: 'primary' }, { ticker: asset.ticker });
  assert.deepEqual(asset, { ticker: 'MAN3', current_price: 10, dy: 7.5, dySource: 'manual', price_target: 14, note: 'preserve' });
  assert.equal(quote.price, 11);
});
