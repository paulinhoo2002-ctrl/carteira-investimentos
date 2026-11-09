const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');
const chrome = require('./helpers/chrome-path').resolveChromePath();

async function withDashboard(run, viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV289VisualFixture(page, 'baseline');
    await page.waitForSelector('.premium-dashboard', { state: 'visible' });
    await run(page);
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

const SYNTHETIC = [
  { id: 'T1', date: '2026-01-10', ticker: 'QAAA3', operation: 'compra', qty: 10, price: 100 },
  { id: 'T2', date: '2026-03-05', ticker: 'QAFI11', operation: 'venda', qty: 2, price: 50 },
  { id: 'T3', date: '2026-02-01', ticker: 'QAAA3', operation: 'compra', qty: 5, price: 101 },
  { id: 'T4', date: 'invalida', ticker: 'QANODATE', operation: 'compra', qty: 1, price: 7 },
  { id: 'T5', date: '2026-02-20', ticker: 'QANOVALUE', operation: 'compra' },
  { id: 'T6', date: '2025-12-01', ticker: 'QAOLD1', operation: 'compra', qty: 1, price: 1 },
  { id: 'T7', date: '2025-11-01', ticker: 'QAOLD2', operation: 'compra', qty: 1, price: 1 },
];

test('Dashboard - lançamentos recentes: ordem, limite, dado ausente e sem tabela', async () => {
  await withDashboard(async page => {
    await page.evaluate(rows => { S.aportes = rows; render(); }, SYNTHETIC);
    const panel = page.locator('.home-recent');
    assert.equal(await panel.count(), 1);
    assert.equal(await page.locator('.premium-dashboard table').count(), 0, 'Dashboard não pode ter tabela completa');
    const rows = await page.locator('.home-recent-row .home-recent-asset').allInnerTexts();
    assert.deepEqual(rows, ['QAFI11', 'QANOVALUE', 'QAAA3', 'QAAA3', 'QAOLD1'], 'mais recentes primeiro, máximo 5, data inválida por último');
    const noValue = await page.locator('.home-recent-row', { hasText: 'QANOVALUE' }).locator('.home-recent-value').innerText();
    assert.equal(noValue.trim(), '—', 'valor ausente nunca vira R$ 0,00');
    assert.ok(await page.locator('.home-recent button', { hasText: 'Ver Lançamentos' }).count());
  });
});

test('Dashboard - lançamentos recentes: estado vazio', async () => {
  await withDashboard(async page => {
    await page.evaluate(() => { S.aportes = []; render(); });
    assert.match(await page.locator('.home-recent-empty').innerText(), /Nenhum lançamento/);
  });
});

test('Dashboard - lançamentos recentes: privacidade oculta valores e quantidades', async () => {
  await withDashboard(async page => {
    await page.evaluate(rows => { S.aportes = rows; S.hideValues = true; render(); }, SYNTHETIC);
    const text = await page.locator('.home-recent').innerText();
    assert.doesNotMatch(text, /R\$\s*[\d.,]+/, 'valor monetário vazou');
    assert.doesNotMatch(text, /\b10 un\.|\b5 un\./, 'quantidade vazou');
    assert.match(text, /QAFI11/, 'ticker continua visível');
  });
});

test('Dashboard - lançamentos recentes: sem overflow em 390px', async () => {
  await withDashboard(async page => {
    await page.evaluate(rows => { S.aportes = rows; render(); }, SYNTHETIC);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }, { width: 390, height: 844 });
});
