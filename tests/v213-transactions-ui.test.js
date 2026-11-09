const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('loads the V213 transaction trust helper before the application', () => {
  assert.match(html, /<script src="v213-transaction-trust\.js"><\/script>/);
});

test('keeps accessible read-only transaction productivity controls', () => {
  assert.match(html, /aria-label="Buscar aportes por ticker/);
  assert.match(html, /aria-label="Ordenar histórico de movimentações"/);
  assert.match(html, /function setAportesSort\(sort\)/);
  assert.match(html, /function setAportesFilter\(filter\)/);
  assert.match(html, /Mostrando \$\{from\}–\$\{to\} de \$\{total\} movimentações/);
});

// Contrato V16: filtro por tipo e ordenação por data de Lançamentos validados pelo comportamento (a UI usa lógica própria).
test('transaction list filters by kind and sorts most recent first (behavioral)', async () => {
  const path = require('node:path');
  const { chromium } = require('playwright-core');
  const { startLocalHttpServer } = require('./local-http-server');
  const { applyRichFixture } = require('./helpers/fp-rich-fixture');
  const chrome = require('./helpers/chrome-path').resolveChromePath();
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(5000);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyRichFixture(page);
    await page.evaluate(() => go('aportes'));
    // filtro "Venda": só vendas, na mesma quantidade do ledger
    const vendas = await page.evaluate(() => S.aportes.filter(item => item.operation === 'venda').length);
    await page.locator('.aporte-filter-chip', { hasText: 'Venda' }).first().click();
    const kinds = await page.locator('.aporte-history-card .aporte-kind').allInnerTexts();
    assert.equal(kinds.length, vendas);
    assert.ok(kinds.every(label => /Venda/i.test(label)), 'somente vendas no filtro Venda');
    // sem filtro, ordenação "Mais recentes": datas não crescentes
    await page.locator('.aporte-filter-chip', { hasText: 'Todos' }).first().click();
    const dates = await page.locator('.aporte-history-card .aporte-history-date').allInnerTexts();
    const chronological = dates.map(text => { const [day, month, year] = text.trim().split('/'); return `${year}-${month}-${day}`; });
    assert.ok(chronological.length > 3, 'lista renderizada');
    assert.deepEqual([...chronological].sort().reverse(), chronological, 'mais recentes primeiro');
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('keeps transaction writes behind explicit existing actions', () => {
  assert.match(html, /onclick='edP\(/);
  assert.match(html, /onclick='repeatContribution\(/);
  assert.match(html, /deleteMovementLaunch\(/);
});
