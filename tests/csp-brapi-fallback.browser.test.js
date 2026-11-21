'use strict';
// F-10 — a CSP efetivamente aplicada no navegador (meta do index.html + cabeçalho do servidor de teste,
// que reproduz o vercel.json) deve permitir o fallback brapi.dev e continuar bloqueando outros domínios.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');

async function withPage(fn) {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage();
    const violations = [];
    page.on('console', message => { if (/Content Security Policy/i.test(message.text())) violations.push(message.text().slice(0, 220)); });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyRichFixture(page);
    await fn(page, violations);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

test('CSP no navegador: fetch a brapi.dev é permitido e a rede é a única coisa simulada', async () => {
  await withPage(async (page, violations) => {
    await page.route(/brapi\.dev/, route => route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results: [{ symbol: 'QAAA3', regularMarketPrice: 41.18, regularMarketChangePercent: -1.39 }] }),
    }));
    const outcome = await page.evaluate(async () => {
      try {
        const response = await fetch('https://brapi.dev/api/quote/QAAA3?range=1d&interval=1d&fundamental=true', { headers: { Authorization: 'Bearer QA_SYNTHETIC_NOT_A_SECRET' } });
        const json = await response.json();
        return { ok: true, change: json.results[0].regularMarketChangePercent };
      } catch (error) { return { ok: false, error: String(error) }; }
    });
    assert.deepEqual(outcome, { ok: true, change: -1.39 });
    assert.deepEqual(violations, [], 'nenhuma violação de CSP para brapi.dev');
  });
});

test('CSP no navegador: o fallback real de fetchQuotes chega à brapi sem violar a CSP', async () => {
  await withPage(async (page, violations) => {
    await page.route(/brapi\.dev/, route => route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results: [{ symbol: 'QAAA3', regularMarketPrice: 41.18, regularMarketChangePercent: -1.39, regularMarketTime: Math.floor(Date.now() / 1000) }] }),
    }));
    const quote = await page.evaluate(async () => {
      window.isLocalTestMode = () => false;
      window.isProtectedReadOnlyQaBoot = () => false;
      window.save = () => {};
      window.fetchQuotesYahoo = async () => [];
      S.brapiToken = 'QA_SYNTHETIC_NOT_A_SECRET';
      S.quotes = {};
      await fetchQuotes(false);
      return S.quotes.QAAA3 || null;
    });
    assert.ok(quote, 'a cotação do fallback brapi foi gravada');
    assert.equal(quote.price, 41.18);
    assert.equal(quote.change, -1.39);
    assert.deepEqual(violations, []);
  });
});

test('CSP no navegador: domínios fora da lista continuam bloqueados (não ampliou permissão)', async () => {
  await withPage(async (page, violations) => {
    const blocked = await page.evaluate(async () => {
      const results = {};
      for (const url of ['https://api.brapi.com.br/api/quote/QAAA3', 'https://exemplo-nao-permitido.test/x']) {
        try { await fetch(url); results[url] = 'permitido'; } catch (error) { results[url] = 'bloqueado'; }
      }
      return results;
    });
    assert.equal(blocked['https://api.brapi.com.br/api/quote/QAAA3'], 'bloqueado');
    assert.equal(blocked['https://exemplo-nao-permitido.test/x'], 'bloqueado');
    assert.ok(violations.length >= 2, 'o navegador registrou as violações esperadas');
  });
});

test('CSP: demais restrições de segurança preservadas em index.html, vercel.json e servidor de teste', () => {
  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(repo, 'vercel.json'), 'utf8'));
  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const headers = JSON.stringify(vercel);
  for (const policy of [meta, headers]) {
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /base-uri 'self'/);
    assert.match(policy, /form-action 'self'/);
    assert.match(policy, /https:\/\/brapi\.dev/);
    assert.doesNotMatch(policy, /api\.brapi\.com\.br/);
    assert.doesNotMatch(policy, /connect-src[^;"]*\s\*[\s;"]/);
  }
  assert.match(headers, /frame-ancestors 'none'/);
  const connectOf = text => (text.match(/connect-src ([^;"]*)/) || [])[1].split(/\s+/).filter(Boolean).sort();
  assert.deepEqual(connectOf(meta), connectOf(headers), 'meta e cabeçalho com a mesma lista de connect-src');
});
