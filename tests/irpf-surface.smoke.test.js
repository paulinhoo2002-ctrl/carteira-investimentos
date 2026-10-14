const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');

test('IRPF preserva rota, leitura auxiliar, exportacoes e layout responsivo', async () => {
  const executable = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(file => {
    try { require('node:fs').accessSync(file); return true; } catch { return false; }
  });
  assert.ok(executable, 'Chrome/Edge nao encontrado');

  const harness = await startLocalHttpServer(ROOT, 0, { syntheticQa: true });
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  try {
    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      S.aportes = [{ date: '2026-01-10', ticker: 'PETR4', type: 'Ação', qty: 3, price: 10, operation: 'compra' }];
      S.assets = [{ ticker: 'PETR4', type: 'Ação', qty: 3, avg_price: 10, current_price: 12 }];
      S.proventos = [];
      S.rfEvents = [];
      S.goals = {};
    });
    await page.evaluate(() => go('irpf'));
    await page.waitForFunction(() => S.tab === 'irpf', { timeout: 5000 });
    await page.waitForTimeout(500);

    const snapshot = await page.evaluate(() => ({
      route: S.tab,
      title: document.querySelector('.irpf-title')?.textContent?.trim(),
      csv: [...document.querySelectorAll('.irpf-shell button')].some(button => button.textContent.includes('CSV')),
      pdf: [...document.querySelectorAll('.irpf-shell button')].some(button => button.textContent.includes('PDF')),
      sections: document.querySelectorAll('.irpf-section').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      backupManager: typeof backupManagerModal === 'function',
      backupPayload: typeof backupPayload === 'function',
      mobileRows: document.querySelectorAll('.irpf-mobile-row').length,
      positionMobile: [...document.querySelectorAll('.irpf-mobile-row')].some(row => row.textContent.includes('Qtd.') && row.textContent.includes('PM')),
      yearAccessibleName: document.querySelector('#irpf-year-report')?.getAttribute('aria-label'),
    }));

    assert.equal(snapshot.route, 'irpf');
    assert.equal(snapshot.title, 'Relatório IRPF 2026');
    assert.equal(snapshot.csv, true);
    assert.equal(snapshot.pdf, true);
    assert.equal(snapshot.sections, 6);
    assert.equal(snapshot.overflow, false);
    assert.equal(snapshot.backupManager, true);
    assert.equal(snapshot.backupPayload, true);
    assert.ok(snapshot.mobileRows >= 1);
    assert.equal(snapshot.positionMobile, true);
    assert.equal(snapshot.yearAccessibleName, 'Ano-calendário do relatório');
  } finally {
    await browser.close();
    harness.server.close();
  }
});