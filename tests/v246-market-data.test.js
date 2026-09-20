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
  const provider = { name: 'primary', rank: 1, getQuote: async () => { if (failed) return { ticker: 'PETR4', error: 'OFFLINE' }; return { ticker: 'PETR4', price: 40, marketTime: '2026-09-19T12:00:00Z' }; } };
  const coordinator = M.createCoordinator({ providers: [provider], now: () => Date.parse('2026-09-19T12:00:00Z') });
  assert.equal((await coordinator.getQuote('PETR4')).price, 40);
  failed = true;
  const last = await coordinator.getQuote('PETR4');
  assert.equal(last.price, 40);
  assert.equal(last.lastKnownGood, true);
  assert.notEqual(last.price, 0);
});
