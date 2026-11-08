'use strict';
// Fase 1b (Lote B) — F-03 e F-04: variação diária sobre o fechamento anterior e
// variação desconhecida nunca tratada como zero. Fixtures 100% sintéticas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');

const repo = path.join(__dirname, '..');
const chrome = require('./helpers/chrome-path').resolveChromePath();

async function withPage(fn, { width = 1440 } = {}) {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyRichFixture(page);
    await fn(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

const signedNumber = text => {
  const negative = /[-\u2212]/.test(text);
  const value = Number(String(text).replace(/[^\d,]/g, '').replace(',', '.'));
  return negative ? -value : value;
};

// Calcula o cartão com um conjunto de posições/cotações e devolve valor, nota, dica e estado.
async function dailyCard(page, assets, quotes, { hide = false } = {}) {
  return page.evaluate(({ assets, quotes, hide }) => {
    S.assets = assets; S.quotes = quotes; S.hideValues = hide;
    const html = dashboardDailyVariation({});
    if (!html) return { empty: true };
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const card = doc.querySelector('.premium-metric');
    return {
      empty: false,
      value: card.querySelector('.premium-metric-value').textContent,
      note: card.querySelector('.premium-metric-note').textContent,
      tip: card.getAttribute('title') || '',
      partial: !!card.querySelector('.state-partial'),
    };
  }, { assets, quotes, hide });
}
const asset = (ticker, qty, extra = {}) => ({ id: `QA_${ticker}`, ticker, name: `Ativo sintético ${ticker}`, type: 'Ação', asset_type: 'Ação', qty, avg_price: 10, current_price: 10, ...extra });

test('F-04 - quoteDailyChangePercent: ausência/invalidez => null; zero verdadeiro => 0; escala em pontos percentuais', async () => {
  await withPage(async page => {
    const cases = [
      [{ regularMarketChangePercent: 1.82, regularMarketPrice: 10 }, 10, 1.82],
      [{ regularMarketChangePercent: -2.31, regularMarketPrice: 10 }, 10, -2.31],
      [{ regularMarketChangePercent: 0, regularMarketPrice: 10 }, 10, 0],
      [{ regularMarketChangePercent: '0', regularMarketPrice: 10 }, 10, 0],
      [{ regularMarketChangePercent: '1.5', regularMarketPrice: 10 }, 10, 1.5],
      [{ regularMarketChangePercent: -99.9, regularMarketPrice: 10 }, 10, -99.9],
      [{ regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: null, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: undefined, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: '', regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: '   ', regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: 'abc', regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: NaN, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: Infinity, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: true, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: {}, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: -100, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: -150, regularMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: 1.2, postMarketPrice: 10 }, 10, null],
      [{ regularMarketChangePercent: 1.2, regularMarketPrice: 10, regularMarketPreviousClose: 9.9 }, 9.9, null],
      [{ regularMarketChangePercent: 1.2, regularMarketPrice: 0 }, 0, null],
      [null, 10, null],
    ];
    const results = await page.evaluate(list => list.map(([q, price]) => quoteDailyChangePercent(q, price)), cases);
    results.forEach((result, index) => assert.equal(result, cases[index][2], `caso ${index}: ${JSON.stringify(cases[index][0])}`));
    assert.ok(Object.is(results[2], 0) || results[2] === 0);
  });
});

test('F-03 - fórmula sobre o fechamento anterior: positivo, negativo, zero, múltiplos ativos', async () => {
  await withPage(async page => {
    // +10%: preço 110 => fechamento anterior 100 => 100 × (110−100) = +1.000 (a fórmula antiga daria 1.100)
    let card = await dailyCard(page, [asset('QAAA3', 100)], { QAAA3: { price: 110, change: 10 } });
    assert.equal(signedNumber(card.value), 1000);
    assert.match(card.note, /1 ativo\(s\) com cotação · \+10,00%/);
    assert.equal(card.partial, false);
    // -10%: preço 90 => anterior 100 => 50 × (90−100) = -500; -10,00%
    card = await dailyCard(page, [asset('QABB4', 50)], { QABB4: { price: 90, change: -10 } });
    assert.equal(signedNumber(card.value), -500);
    assert.match(card.note, /-10,00%/);
    // zero verdadeiro: conta como posição válida, variação 0
    card = await dailyCard(page, [asset('QACC3', 10)], { QACC3: { price: 50, change: 0 } });
    assert.equal(card.empty, false);
    assert.equal(signedNumber(card.value), 0);
    assert.match(card.note, /1 ativo\(s\) com cotação · 0,00%/);
    // dois ativos: ponderado pela base do fechamento anterior
    // A: 100 × 110/1,10 = 10.000 (delta +1.000) ; B: 10 × 40 /0,80 → preço 40 com -20% => anterior 50 => delta -100, base 500
    card = await dailyCard(page, [asset('QAAA3', 100), asset('QABB4', 10)], { QAAA3: { price: 110, change: 10 }, QABB4: { price: 40, change: -20 } });
    assert.equal(signedNumber(card.value), 900);
    assert.match(card.note, /2 ativo\(s\) com cotação · \+8,57%/); // 900 / (10.000 + 500) = 8,5714%
  });
});

test('F-03 - fixture sintética rica: R$ 219,76 / +0,35% (antes: R$ 224,15 / +0,36%)', async () => {
  await withPage(async page => {
    const card = await page.evaluate(() => {
      const html = dashboardDailyVariation({});
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return { value: doc.querySelector('.premium-metric-value').textContent, note: doc.querySelector('.premium-metric-note').textContent };
    });
    assert.equal(signedNumber(card.value), 219.76);
    assert.match(card.note, /7 ativo\(s\) com cotação · \+0,35%/);
  });
});

test('F-04 - ausente/inválido fica fora do cálculo e da cobertura; cobertura parcial é explícita', async () => {
  await withPage(async page => {
    const full = [asset('QAAA3', 100), asset('QABB4', 10), asset('QACC3', 10)];
    const card = await dailyCard(page, full, {
      QAAA3: { price: 110, change: 10 },
      QABB4: { price: 40, change: -20 },
      QACC3: { price: 50, change: null },
    });
    assert.equal(signedNumber(card.value), 900, 'QACC3 (null) não pode contribuir com zero nem com base');
    assert.match(card.note, /2 de 3 ativo\(s\) com variação do dia · \+8,57%/);
    assert.equal(card.partial, true);
    assert.match(card.tip, /não representa necessariamente toda a carteira/);
    // privacidade: a cobertura parcial continua dita, sem valores
    const hidden = await dailyCard(page, full, { QAAA3: { price: 110, change: 10 }, QABB4: { price: 40, change: -20 }, QACC3: { price: 50, change: null } }, { hide: true });
    assert.equal(hidden.note, 'Valores protegidos · cobertura parcial');
    // todos desconhecidos => sem cartão de valor (o painel mostra "—")
    const none = await dailyCard(page, full, { QAAA3: { price: 110, change: null }, QABB4: { price: 40 }, QACC3: { price: 50, change: undefined } });
    assert.equal(none.empty, true);
  });
});

test('F-04/F-03 - limites inválidos são excluídos', async () => {
  await withPage(async page => {
    const base = asset('QAAA3', 100);
    const cases = [
      [{ price: 0, change: 5 }], [{ price: -10, change: 5 }], [{ price: 110 }], [{ price: 110, change: -100 }],
      [{ price: 110, change: -150 }], [{ price: 110, change: NaN }], [{ price: '110', change: 10 }], [{ price: 110, change: '10' }],
    ];
    for (const [quote] of cases) {
      const card = await dailyCard(page, [base], { QAAA3: quote });
      assert.equal(card.empty, true, JSON.stringify(quote));
    }
    const zeroQty = await dailyCard(page, [asset('QAAA3', 0)], { QAAA3: { price: 110, change: 10 } });
    assert.equal(zeroQty.empty, true);
    const missing = await dailyCard(page, [base], {});
    assert.equal(missing.empty, true);
  });
});

test('Painel de rentabilidade mostra "—" com motivo quando nenhuma variação do dia é válida', async () => {
  await withPage(async page => {
    await page.evaluate(() => { Object.keys(S.quotes).forEach(key => { S.quotes[key].change = null; }); go('dashboard'); });
    await page.waitForTimeout(250);
    const card = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.premium-metric')].find(item => item.querySelector('.premium-metric-label')?.textContent === 'Variação diária');
      return el ? { value: el.querySelector('.premium-metric-value').textContent, note: el.querySelector('.premium-metric-note').textContent } : null;
    });
    assert.deepEqual(card, { value: '—', note: 'Sem variação do dia disponível nas posições' });
  });
});

test('Preço atual válido continua no patrimônio mesmo com variação desconhecida', async () => {
  await withPage(async page => {
    const before = await page.evaluate(() => { const c = cx(); return { tC: c.tC, tI: c.tI, tG: c.tG, tGP: c.tGP }; });
    const after = await page.evaluate(() => {
      Object.keys(S.quotes).forEach(key => { S.quotes[key].change = null; });
      const c = cx();
      go('dashboard');
      return { tC: c.tC, tI: c.tI, tG: c.tG, tGP: c.tGP };
    });
    assert.deepEqual(after, before);
    await page.waitForTimeout(250);
    const patrimonio = await page.evaluate(() => [...document.querySelectorAll('.premium-metric')].find(el => el.querySelector('.premium-metric-label')?.textContent === 'Patrimônio atual')?.querySelector('.premium-metric-value').textContent);
    assert.match(patrimonio, /82\.557,00/);
  });
});

async function runIngestion(page, { yahoo, brapi }) {
  return page.evaluate(async ({ yahoo, brapi }) => {
    // Executa o fetchQuotes real, trocando apenas a rede e as gravações do teste (nada é persistido).
    // A rede da brapi é simulada em window.fetch porque a CSP do app não libera brapi.dev (achado F-10).
    window.isLocalTestMode = () => false;
    window.isProtectedReadOnlyQaBoot = () => false;
    window.save = () => {};
    window.fetchQuotesYahoo = async () => yahoo;
    if (brapi) {
      S.brapiToken = 'QA_SYNTHETIC_NOT_A_SECRET';
      const realFetch = window.fetch.bind(window);
      window.fetch = (url, options) => (/brapi.dev/.test(String(url))
        ? Promise.resolve(new Response(JSON.stringify({ results: brapi }), { status: 200, headers: { 'content-type': 'application/json' } }))
        : realFetch(url, options));
    }
    S.quotes = {};
    await fetchQuotes(false);
    const out = {};
    Object.keys(S.quotes).forEach(key => { out[key] = { price: S.quotes[key].price, change: S.quotes[key].change, isNull: S.quotes[key].change === null, type: typeof S.quotes[key].change }; });
    const prices = {};
    S.assets.forEach(a => { prices[a.ticker] = a.current_price; });
    return { quotes: out, prices };
  }, { yahoo, brapi: brapi || null });
}

test('F-04 - ingestão Yahoo: null para ausente/inválido, 0 para zero informado, preço válido preservado', async () => {
  await withPage(async page => {
    const now = Math.floor(Date.now() / 1000);
    const yahoo = [
      { symbol: 'QAAA3.SA', regularMarketPrice: 40, regularMarketChangePercent: 1.82, regularMarketTime: now },
      { symbol: 'QABB4.SA', regularMarketPrice: 26, regularMarketChangePercent: 0, regularMarketTime: now },
      { symbol: 'QACC3.SA', regularMarketPrice: 62, regularMarketTime: now },
      { symbol: 'QADD3.SA', regularMarketPrice: 45, regularMarketChangePercent: null, regularMarketTime: now },
      { symbol: 'QAFI11.SA', regularMarketPrice: 104, regularMarketChangePercent: '', regularMarketTime: now },
      { symbol: 'QAFJ11.SA', postMarketPrice: 75, regularMarketChangePercent: 1.2, regularMarketTime: now },
      { symbol: 'QAET11.SA', regularMarketPrice: 140, regularMarketChangePercent: -2.31, regularMarketTime: now },
    ];
    const { quotes, prices } = await runIngestion(page, { yahoo });
    assert.equal(quotes.QAAA3.change, 1.82);
    assert.equal(quotes.QABB4.change, 0);
    assert.equal(quotes.QABB4.type, 'number');
    assert.equal(quotes.QACC3.isNull, true);
    assert.equal(quotes.QADD3.isNull, true);
    assert.equal(quotes.QAFI11.isNull, true);
    assert.equal(quotes.QAFJ11.isNull, true, 'preço de pós-mercado não pareia com o percentual do pregão');
    assert.equal(quotes.QAET11.change, -2.31);
    // preço válido segue valendo para o patrimônio, mesmo sem variação
    assert.equal(quotes.QACC3.price, 62);
    assert.equal(prices.QACC3, 62);
    assert.equal(quotes.QAFJ11.price, 75);
    assert.equal(prices.QAFJ11, 75);
  });
});

test('F-04 - ingestão brapi (fallback): mesma regra de null/0 e pareamento com regularMarketPrice', async () => {
  await withPage(async page => {
    const now = Math.floor(Date.now() / 1000);
    const brapi = [
      { symbol: 'QAAA3', regularMarketPrice: 41.18, regularMarketChangePercent: -1.39, regularMarketTime: now },
      { symbol: 'QABB4', regularMarketPrice: 25, regularMarketChangePercent: 0, regularMarketTime: now },
      { symbol: 'QACC3', regularMarketPrice: 61, regularMarketTime: now },
      { symbol: 'QADD3', price: 44, regularMarketChangePercent: 2, regularMarketTime: now },
    ];
    const { quotes, prices } = await runIngestion(page, { yahoo: [], brapi });
    assert.equal(quotes.QAAA3.change, -1.39);
    assert.equal(quotes.QABB4.change, 0);
    assert.equal(quotes.QABB4.type, 'number');
    assert.equal(quotes.QACC3.isNull, true);
    assert.equal(quotes.QADD3.isNull, true, 'preço veio de `price`, não de regularMarketPrice');
    assert.equal(prices.QACC3, 61);
    assert.equal(prices.QADD3, 44);
  });
});

test('Semântica documentada: exemplo oficial da brapi (PETR4) confere com price×c/(100+c)', () => {
  // Documentação brapi.dev/docs: regularMarketPrice 41,18; regularMarketChange -0,58; regularMarketChangePercent -1,39.
  const price = 41.18; const change = -1.39; const documentedChange = -0.58;
  const previous = price / (1 + change / 100);
  assert.ok(Math.abs((price - previous) - documentedChange) < 0.005, `delta ${(price - previous).toFixed(4)} ≠ ${documentedChange}`);
  const naive = price * change / 100;
  assert.ok(Math.abs(naive - documentedChange) > 0.005, 'a fórmula antiga não reproduz o exemplo documentado');
});

test('Sem regressão de contrato: nenhuma gravação nem consumo restante de "|| 0" no change; quotes não é persistido', () => {
  const source = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert.doesNotMatch(source, /change:\s*Number\(q\.regularMarketChangePercent\)\s*\|\|\s*0/);
  assert.equal((source.match(/change:quoteDailyChangePercent\(q,price\)/g) || []).length, 2, 'os dois pontos de ingestão usam o helper');
  const persisted = source.split('\n').filter(line => line.includes('localStorage.setItem(STOR'));
  assert.ok(persisted.length > 0);
  persisted.forEach(line => assert.doesNotMatch(line, /quotes/));
  // Persistência e Finance Core não referenciam cotações (S.quotes é só memória).
  ['finance-core.js', 'persistence-core.js'].forEach(file => {
    assert.doesNotMatch(fs.readFileSync(path.join(repo, file), 'utf8'), /quotes/, `${file} não pode depender de S.quotes`);
  });
});
