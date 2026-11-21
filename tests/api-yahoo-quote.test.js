'use strict';
// F-11 — proxy de cotações Yahoo: fechamento anterior desconhecido nunca vira variação de 0%.
// Rede 100% simulada (fetch substituído); nada é publicado nem consultado de verdade.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repo = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(repo, 'api', 'yahoo-quote.js'), 'utf8');
let handlerPromise = null;
const loadHandler = () => {
  if (!handlerPromise) handlerPromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`).then(mod => mod.default);
  return handlerPromise;
};

const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

function mockFetch({ v7 = null, v7Ok = true, chart = {} } = {}) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const text = String(url);
    calls.push(text);
    if (text.includes('/v7/finance/quote')) {
      if (v7 === 'throw') throw new Error('rede simulada indisponível');
      return { ok: v7Ok, json: async () => ({ quoteResponse: { result: v7 || [] } }) };
    }
    const match = text.match(/\/v8\/finance\/chart\/([^?]+)/);
    const symbol = match ? decodeURIComponent(match[1]) : '';
    const entry = chart[symbol];
    if (entry === 'throw') throw new Error('rede simulada indisponível');
    if (!entry) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => ({ chart: { result: [{ meta: entry }] } }) };
  };
  return calls;
}

async function call(query, { method = 'GET', headers = {} } = {}) {
  const handler = await loadHandler();
  const out = { status: 200, body: null, headers: {} };
  const res = {
    setHeader: (key, value) => { out.headers[key] = value; },
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; },
    end() { return this; },
  };
  await handler({ method, headers, query: query }, res);
  return out;
}

const resultFor = (out, symbol) => out.body.results.find(item => item.symbol === symbol);

test('v7 completo passa direto, sem chamar o fallback', async () => {
  const calls = mockFetch({ v7: [{ symbol: 'PETR4.SA', regularMarketPrice: 10, regularMarketChangePercent: 1.82, regularMarketPreviousClose: 9.82 }] });
  const out = await call({ symbols: 'PETR4' });
  assert.equal(out.status, 200);
  assert.equal(out.body.requested[0], 'PETR4.SA');
  assert.equal(resultFor(out, 'PETR4.SA').regularMarketChangePercent, 1.82);
  assert.equal(calls.filter(url => url.includes('/v8/')).length, 0);
});

test('fallback v8 com preço do pregão e fechamento anterior calcula o percentual sobre o fechamento anterior', async () => {
  mockFetch({ chart: { 'VALE3.SA': { regularMarketPrice: 10, previousClose: 9.8, regularMarketTime: 1760000000, currency: 'BRL' } } });
  const out = await call({ symbols: 'VALE3' });
  const quote = resultFor(out, 'VALE3.SA');
  assert.equal(quote.regularMarketPrice, 10);
  assert.equal(quote.regularMarketPreviousClose, 9.8);
  assert.ok(Math.abs(quote.regularMarketChangePercent - ((10 - 9.8) / 9.8) * 100) < 1e-9);
});

test('zero verdadeiro (preço = fechamento anterior) continua 0 numérico', async () => {
  mockFetch({ chart: { 'ITUB4.SA': { regularMarketPrice: 30, previousClose: 30 } } });
  const quote = resultFor(await call({ symbols: 'ITUB4' }), 'ITUB4.SA');
  assert.equal(quote.regularMarketChangePercent, 0);
  assert.equal(typeof quote.regularMarketChangePercent, 'number');
});

test('só fechamento anterior: usa como preço, mas NÃO fabrica variação (null, sem regularMarketPrice)', async () => {
  mockFetch({ chart: { 'BBAS3.SA': { previousClose: 25.5 } } });
  const quote = resultFor(await call({ symbols: 'BBAS3' }), 'BBAS3.SA');
  assert.equal(quote.regularMarketChangePercent, null);
  assert.equal(quote.regularMarketPrice, undefined);
  assert.equal(quote.regularMarketPreviousClose, 25.5);
});

test('preço do pregão sem fechamento anterior: variação desconhecida (null), preço preservado', async () => {
  mockFetch({ chart: { 'WEGE3.SA': { regularMarketPrice: 40 } } });
  const quote = resultFor(await call({ symbols: 'WEGE3' }), 'WEGE3.SA');
  assert.equal(quote.regularMarketPrice, 40);
  assert.equal(quote.regularMarketChangePercent, null);
});

test('percentual informado pelo provedor é preservado, inclusive zero e texto numérico', async () => {
  mockFetch({ chart: {
    'AAAA3.SA': { regularMarketPrice: 10, previousClose: 9.8, regularMarketChangePercent: 0 },
    'BBBB4.SA': { regularMarketPrice: 10, previousClose: 9.8, regularMarketChangePercent: '1.5' },
  } });
  const out = await call({ symbols: 'AAAA3,BBBB4' });
  assert.equal(resultFor(out, 'AAAA3.SA').regularMarketChangePercent, 0);
  assert.equal(resultFor(out, 'BBBB4.SA').regularMarketChangePercent, 1.5);
});

test('v7 sem preço do pregão + v8 só com fechamento anterior: remove preço zerado e não inventa variação', async () => {
  mockFetch({ v7: [{ symbol: 'CCCC3.SA', regularMarketPrice: 0, regularMarketChangePercent: 0 }], chart: { 'CCCC3.SA': { previousClose: 12 } } });
  const quote = resultFor(await call({ symbols: 'CCCC3' }), 'CCCC3.SA');
  assert.equal('regularMarketPrice' in quote, false);
  assert.equal(quote.regularMarketPreviousClose, 12);
  assert.equal(quote.regularMarketChangePercent, null);
});

test('caminhos de erro de rede: v7 fora do ar usa o fallback; v8 fora do ar omite o ativo', async () => {
  mockFetch({ v7Ok: false, chart: { 'DDDD3.SA': { regularMarketPrice: 5, previousClose: 5 } } });
  let out = await call({ symbols: 'DDDD3,EEEE3' });
  assert.equal(out.body.count, 1);
  assert.equal(resultFor(out, 'DDDD3.SA').regularMarketChangePercent, 0);
  mockFetch({ v7: 'throw', chart: { 'FFFF3.SA': 'throw' } });
  out = await call({ symbols: 'FFFF3' });
  assert.equal(out.status, 200);
  assert.deepEqual(out.body.results, []);
});

test('validações preservadas: símbolos ausentes 400, origem não permitida 403, OPTIONS 204, erro interno 500', async () => {
  mockFetch();
  assert.equal((await call({})).status, 400);
  assert.equal((await call({ symbols: 'PETR4' }, { headers: { origin: 'https://exemplo-malicioso.test' } })).status, 403);
  assert.equal((await call({ symbols: 'PETR4' }, { method: 'OPTIONS' })).status, 204);
  const permitted = await call({ symbols: 'PETR4' }, { headers: { origin: 'http://localhost:5173' } });
  assert.equal(permitted.headers['Access-Control-Allow-Origin'], 'http://localhost:5173');
  const broken = await call(undefined);
  assert.equal(broken.status, 500);
});

test('integração com o cliente: o helper do index.html lê null/0 do proxy sem converter ausência em zero', async () => {
  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const start = html.indexOf('function quoteDailyChangePercent(');
  const end = html.indexOf('function quoteProviderTimeMs(');
  assert.ok(start > 0 && end > start);
  const quoteDailyChangePercent = vm.runInNewContext(`${html.slice(start, end)}\nquoteDailyChangePercent;`, {});
  mockFetch({ chart: {
    'ZERO3.SA': { regularMarketPrice: 30, previousClose: 30 },
    'SOPREV3.SA': { previousClose: 25.5 },
    'SEMPREV3.SA': { regularMarketPrice: 40 },
    'ALTA3.SA': { regularMarketPrice: 10, previousClose: 9.8 },
  } });
  const out = await call({ symbols: 'ZERO3,SOPREV3,SEMPREV3,ALTA3' });
  const clientPrice = quote => Number(quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice ?? quote.regularMarketPreviousClose);
  const read = symbol => { const quote = resultFor(out, symbol); return quoteDailyChangePercent(quote, clientPrice(quote)); };
  assert.equal(read('ZERO3.SA'), 0);
  assert.equal(read('SOPREV3.SA'), null);
  assert.equal(read('SEMPREV3.SA'), null);
  assert.ok(Math.abs(read('ALTA3.SA') - ((10 - 9.8) / 9.8) * 100) < 1e-9);
});
