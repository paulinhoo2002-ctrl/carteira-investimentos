const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');

const chrome = require('./helpers/chrome-path').resolveChromePath();

async function withDividends(run, viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyRichFixture(page); // fixture 100% sintética com vários anos
    await page.evaluate(() => go('dividendos'));
    await page.waitForSelector('.fp-dividends', { state: 'visible' });
    await run(page);
    assert.deepEqual(errors, [], 'sem erros de página');
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

test('Dividendos premium - gráfico de evolução: 12M, 24M e Tudo com dados de vários anos', async () => {
  await withDividends(async page => {
    const bars = () => page.locator('.fp-income-chart .fp-bar');
    assert.equal(await bars().count(), 12, 'janela padrão de 12 meses');
    assert.equal(await page.locator('.fp-income-chart .fp-segmented button[aria-pressed="true"]').innerText(), '12M');

    await page.locator('.fp-income-chart .fp-segmented button', { hasText: '24M' }).click();
    assert.equal(await bars().count(), 24, 'janela de 24 meses');
    assert.equal(await page.locator('.fp-income-chart .fp-segmented button[aria-pressed="true"]').innerText(), '24M');

    await page.locator('.fp-income-chart .fp-segmented button', { hasText: 'Tudo' }).click();
    assert.ok((await bars().count()) > 24, 'histórico completo tem mais de 24 meses');

    // cada barra expõe valor no tooltip e a tabela acessível espelha a série
    const tips = await bars().evaluateAll(nodes => nodes.map(node => node.getAttribute('data-tip')));
    assert.ok(tips.every(tip => /R\$|sem registro/.test(tip)), 'tooltips com valor ou "sem registro"');
    const srRows = await page.locator('.fp-income-chart .fp-sr-only tbody tr').count();
    assert.equal(srRows, await bars().count(), 'tabela para leitores de tela com uma linha por barra');
  });
});

test('Dividendos premium - mês em andamento é identificado e nunca vira zero silencioso', async () => {
  await withDividends(async page => {
    assert.equal(await page.locator('.fp-income-chart .fp-bar[data-state="current"]').count(), 1);
    const tip = await page.locator('.fp-income-chart .fp-bar[data-state="current"]').getAttribute('data-tip');
    assert.match(tip, /mês em andamento/);
    assert.match(await page.locator('.fp-income-chart .fp-legend').innerText(), /Mês em andamento \(parcial\)/);
  });
});

test('Dividendos premium - rosca anual e ranking de pagadores usam só recebidos', async () => {
  await withDividends(async page => {
    const segments = await page.locator('.dividend-annual-summary .canon-donut-seg').count();
    assert.ok(segments >= 3, `rosca com um segmento por ano (encontrado ${segments})`);
    const labels = await page.locator('.dividend-annual-summary .canon-donut-seg').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.ok(labels.every(label => /R\$/.test(label) && /%/.test(label)), 'cada fatia declara valor e percentual');

    const names = await page.locator('.fp-top-payers .fp-payer-name').allInnerTexts();
    assert.equal(names.length, 5, 'ranking limitado a 5');
    const values = await page.locator('.fp-top-payers .fp-payer-value').allInnerTexts();
    const parsed = values.map(text => Number(text.replace(/[^\d,]/g, '').replace(',', '.')));
    assert.deepEqual([...parsed].sort((a, b) => b - a), parsed, 'ordenado do maior para o menor');
    assert.ok(names.every(name => name.startsWith('QA')), 'somente tickers sintéticos');
  });
});

test('Dividendos premium - privacidade oculta gráfico, ranking e valores', async () => {
  await withDividends(async page => {
    await page.evaluate(() => { S.hideValues = true; render(); });
    const chart = await page.locator('.fp-income-chart').innerText();
    assert.doesNotMatch(chart, /R\$\s*[\d.,]+/);
    assert.equal(await page.locator('.fp-income-chart .fp-bar').count(), 0, 'barras não existem no DOM quando ocultas');
    const payers = await page.locator('.fp-top-payers').innerText();
    assert.doesNotMatch(payers, /R\$\s*[\d.,]+/);
    assert.equal(await page.locator('.fp-top-payers .fp-payer-track').count(), 0, 'proporções protegidas não aparecem');
    const attrs = await page.evaluate(() => [...document.querySelectorAll('#root [aria-label],#root [title],#root [data-tip]')]
      .flatMap(node => ['aria-label', 'title', 'data-tip'].map(name => node.getAttribute(name) || ''))
      .filter(value => /R\$\s*\d/.test(value)));
    assert.deepEqual(attrs, [], 'atributos acessíveis sem valores monetários');
  });
});

test('Dividendos premium - sem overflow e sem corte em 360, 390, 768, 1366 e 1920px', async () => {
  for (const width of [360, 390, 768, 1366, 1920]) {
    await withDividends(async page => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow em ${width}px`);
      // Mobile: o rolável é o contêiner interno; o documento não pode ser mais alto que a janela (sem rolagem fantasma em branco).
      if (width <= 430) assert.equal(await page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1), true, `documento mais alto que a janela em ${width}px`);
      const kpis = await page.locator('.dividend-kpis-canon-grid .dividend-executive-kpi').count();
      assert.equal(kpis, 4, 'quatro indicadores principais');
    }, { width, height: width < 700 ? 844 : 900 });
  }
});
