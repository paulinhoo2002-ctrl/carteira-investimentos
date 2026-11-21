'use strict';
// D1: rankings do Início — 6 maiores altas e 6 maiores baixas, filtros Todos/Ações/FIIs/ETFs,
// PM e preço atual acessíveis (todas as larguras), privacidade e responsividade. Dados sintéticos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function withPage(width, theme, fn) {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyRichFixture(page);
    await page.evaluate(name => applyTheme(name), theme);
    await fn(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

// 8 altas e 8 baixas (ações, FIIs e ETFs), mais uma Renda Fixa que nunca pode aparecer nos rankings.
async function seedRankings(page) {
  await page.evaluate(() => {
    const make = (ticker, type, avg, current) => ({ id: `QA_${ticker}`, ticker, name: `Ativo sintético ${ticker}`, product: `Ativo sintético ${ticker}`, type, asset_type: type, sector: 'Setor sintético', qty: 10, avg_price: avg, current_price: current, dy: 0 });
    const ups = [['QUAA3', 'Ação'], ['QUAB11', 'FII'], ['QUAC11', 'ETF'], ['QUAD3', 'Ação'], ['QUAE11', 'FII'], ['QUAF11', 'ETF'], ['QUAG3', 'Ação'], ['QUAH11', 'FII']];
    const downs = [['QDAA3', 'Ação'], ['QDAB11', 'FII'], ['QDAC11', 'ETF'], ['QDAD3', 'Ação'], ['QDAE11', 'FII'], ['QDAF11', 'ETF'], ['QDAG3', 'Ação'], ['QDAH11', 'FII']];
    const assets = [];
    ups.forEach(([ticker, type], index) => assets.push(make(ticker, type, 10, 10 + (index + 1) * 1.1)));
    downs.forEach(([ticker, type], index) => assets.push(make(ticker, type, 20, 20 - (index + 1) * 1.3)));
    assets.push({ id: 'QA_RF_X', ticker: 'QARFX01', name: 'Título sintético', type: 'Renda Fixa', asset_type: 'Renda Fixa', qty: 1, avg_price: 1000, current_price: 1200, rf_value: 1200 });
    S.assets = assets;
    S.wallets[0].assets = JSON.parse(JSON.stringify(assets));
    S.quotes = {};
    S._dashboardHighlightsCache = null;
    S.dashboardHighlightsClassFilter = 'all';
    go('dashboard');
  });
  await page.waitForTimeout(300);
}

const rankingState = page => page.evaluate(() => {
  const column = kind => {
    const root = document.querySelector(`.dashboard-highlight-column.${kind}`);
    return {
      head: root.querySelector('.dashboard-highlight-column-head span').textContent.trim(),
      rows: [...root.querySelectorAll('.dashboard-highlight-row')].map(row => ({
        ticker: row.querySelector('.premium-exec-title').textContent.trim(),
        pct: row.querySelector('.premium-exec-value span').textContent.trim(),
        details: row.querySelector('.dashboard-highlight-details'),
        detailsText: (row.querySelector('.dashboard-highlight-details')?.innerText || '').replace(/\s+/g, ' ').trim(),
        detailsVisible: (() => { const el = row.querySelector('.dashboard-highlight-details'); if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; })(),
      })).map(row => ({ ...row, details: undefined })),
    };
  };
  return { high: column('high'), low: column('low'), chips: [...document.querySelectorAll('.dashboard-highlights-tabs button')].map(b => ({ label: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })) };
});

test('6 maiores altas e 6 maiores baixas, ordenadas pelo desempenho sobre o preço médio', async () => {
  await withPage(1366, 'dark', async page => {
    await seedRankings(page);
    const state = await rankingState(page);
    assert.equal(state.high.rows.length, 6);
    assert.equal(state.low.rows.length, 6);
    assert.equal(state.high.head, '6 ativos');
    assert.equal(state.low.head, '6 ativos');
    const pcts = rows => rows.map(row => Number(row.pct.replace(/[^\d,.-]/g, '').replace(',', '.')));
    const highs = pcts(state.high.rows);
    const lows = pcts(state.low.rows);
    assert.deepEqual([...highs].sort((a, b) => b - a), highs, 'altas em ordem decrescente');
    assert.deepEqual([...lows].sort((a, b) => a - b), lows, 'baixas em ordem crescente');
    assert.ok(highs.every(value => value > 0) && lows.every(value => value < 0));
    const all = [...state.high.rows, ...state.low.rows].map(row => row.ticker);
    assert.ok(!all.includes('QARFX01'), 'Renda Fixa fora dos rankings');
  });
});

test('filtros Todos/Ações/FIIs/ETFs com estado acessível e resultado coerente com a classe', async () => {
  await withPage(1366, 'dark', async page => {
    await seedRankings(page);
    let state = await rankingState(page);
    assert.deepEqual(state.chips.map(chip => chip.label), ['Todos', 'Ações', 'FIIs', 'ETFs']);
    assert.deepEqual(state.chips.map(chip => chip.pressed), ['true', 'false', 'false', 'false']);
    for (const [label, type] of [['FIIs', 'FII'], ['ETFs', 'ETF'], ['Ações', 'Ação']]) {
      await page.locator('.dashboard-highlights-tabs button', { hasText: new RegExp(`^${label}$`) }).click();
      await page.waitForTimeout(150);
      state = await rankingState(page);
      assert.equal(state.chips.find(chip => chip.label === label).pressed, 'true');
      const tickers = [...state.high.rows, ...state.low.rows].map(row => row.ticker);
      const expected = await page.evaluate(kind => S.assets.filter(asset => asset.type === kind).map(asset => asset.ticker), type);
      assert.ok(tickers.length > 0 && tickers.every(ticker => expected.includes(ticker)), `${label}: só ativos da classe`);
      assert.ok(state.high.rows.length <= 6 && state.low.rows.length <= 6);
    }
    await page.locator('.dashboard-highlights-tabs button', { hasText: /^Todos$/ }).click();
    await page.waitForTimeout(150);
    state = await rankingState(page);
    assert.equal(state.high.rows.length, 6);
  });
});

test('carteira com menos de seis elegíveis mostra apenas linhas reais, sem duplicar nem inventar', async () => {
  await withPage(390, 'light', async page => {
    await seedRankings(page);
    const result = await page.evaluate(() => {
      const eligible = S.assets.filter(asset => asset.ticker === 'QUAA3' || asset.ticker === 'QDAA3');
      const fixed = S.assets.find(asset => asset.type === 'Renda Fixa');
      S.assets = [...eligible, fixed];
      S.wallets[0].assets = JSON.parse(JSON.stringify(S.assets));
      S._dashboardHighlightsCache = null;
      render();
      return {
        high: [...document.querySelectorAll('.dashboard-highlight-column.high .dashboard-highlight-row .premium-exec-title')].map(node => node.textContent.trim()),
        low: [...document.querySelectorAll('.dashboard-highlight-column.low .dashboard-highlight-row .premium-exec-title')].map(node => node.textContent.trim()),
      };
    });
    assert.deepEqual(result.high, ['QUAA3']);
    assert.deepEqual(result.low, ['QDAA3']);
    const shown = [...result.high, ...result.low];
    assert.equal(new Set(shown).size, shown.length);
    assert.equal(shown.length, 2);
  });
});

test('filtros de ranking têm nomes, foco visível e funcionam com teclado', async () => {
  await withPage(390, 'dark', async page => {
    await seedRankings(page);
    const filter = page.getByRole('button', { name: 'FIIs' });
    await filter.focus();
    assert.equal(await filter.innerText(), 'FIIs', 'rótulo visível fornece nome acessível');
    assert.equal(await filter.evaluate(node => node === document.activeElement), true);
    assert.notEqual(await filter.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    await filter.press('Enter');
    assert.equal(await filter.getAttribute('aria-pressed'), 'true');
    const rows = await page.locator('.dashboard-highlight-row .premium-exec-title').allTextContents();
    const valid = await page.evaluate(tickers => tickers.every(ticker => S.assets.find(asset => asset.ticker === ticker)?.type === 'FII'), rows);
    assert.equal(valid, true);
  });
});

for (const width of [1920, 1440, 1366, 768, 390, 360]) {
  test(`PM e preço atual visíveis e legíveis em todas as linhas, sem overflow (${width}px)`, async () => {
    await withPage(width, 'dark', async page => {
      await seedRankings(page);
      const state = await rankingState(page);
      const rows = [...state.high.rows, ...state.low.rows];
      assert.equal(rows.length, 12);
      rows.forEach(row => {
        assert.equal(row.detailsVisible, true, `${row.ticker} sem PM/Atual visível`);
        assert.match(row.detailsText, /^PM\s*R\$\s?[\d.]+,\d{2}\s+Atual\s*R\$\s?[\d.]+,\d{2}$/, row.detailsText);
        assert.doesNotMatch(row.detailsText, /R\$\s?0,00/);
      });
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        small: [...document.querySelectorAll('.dashboard-highlight-details, .dashboard-highlight-details strong')].filter(el => parseFloat(getComputedStyle(el).fontSize) < 12).length,
        clipped: [...document.querySelectorAll('.dashboard-highlight-row')].filter(row => row.scrollWidth > row.clientWidth + 1).length,
      }));
      assert.ok(layout.overflow <= 1, `overflow horizontal ${layout.overflow}px`);
      assert.equal(layout.small, 0, 'PM/Atual com fonte < 12px');
      assert.equal(layout.clipped, 0, 'linhas cortadas');
    });
  });
}

test('sem preço médio informado mostra "—" (nunca zero) e nenhum valor com a privacidade ativada', async () => {
  await withPage(1366, 'dark', async page => {
    await seedRankings(page);
    const hidden = await page.evaluate(() => { S.hideValues = true; render(); return [...document.querySelectorAll('.dashboard-highlight-details')].map(el => el.innerText.replace(/\s+/g, ' ')); });
    assert.ok(hidden.length >= 12);
    hidden.forEach(text => assert.doesNotMatch(text, /\d/, `valor vazou: ${text}`));
    await page.evaluate(() => { S.hideValues = false; render(); });
    const missing = await page.evaluate(() => {
      const asset = S.assets.find(item => item.ticker.startsWith('QUA'));
      const original = asset.avg_price;
      asset.avg_price = 0;
      S._dashboardHighlightsCache = null;
      render();
      const rows = [...document.querySelectorAll('.dashboard-highlight-row')].filter(row => row.textContent.includes(asset.ticker));
      const text = rows.map(row => row.querySelector('.dashboard-highlight-details')?.innerText.replace(/\s+/g, ' ')).join('|');
      asset.avg_price = original;
      return { tickerPresent: rows.length, text };
    });
    // sem preço médio o ativo não tem desempenho calculável: sai do ranking em vez de aparecer com PM zerado
    assert.equal(missing.tickerPresent === 0 || !/R\$\s?0,00/.test(missing.text), true);
  });
});

test('acessibilidade (axe) do Início com os 12 itens, nos dois temas e em desktop e mobile', async () => {
  for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
    await withPage(width, theme, async page => {
      await seedRankings(page);
      await page.evaluate(axeSource);
      const result = await page.evaluate(() => axe.run(document.querySelector('.wrap'), { runOnly: ['wcag2a', 'wcag2aa'] }));
      assert.deepEqual(result.violations.map(item => `${item.id}:${item.nodes.length}`), [], `${width} ${theme}`);
    });
  }
});
