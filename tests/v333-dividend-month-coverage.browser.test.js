const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`Dividendos: cobertura desconhecida nunca vira zero (${viewport.width})`, async () => {
    const root = path.join(__dirname, '..');
    const server = await startLocalHttpServer(root);
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
    try {
      const page = await browser.newPage({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
      const firebase = [], errors = [];
      page.on('request', req => { if (/firestore|firebaseio|identitytoolkit|securetoken/.test(req.url())) firebase.push(req.url()); });
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(server.url + '&testReadOnly=1', { waitUntil: 'networkidle' });
      await applyV289VisualFixture(page, 'baseline');
      await page.evaluate(() => {
        const year = new Date().getFullYear() - 1;
        S.proventos = [{ id: 'QA_COVERAGE', ticker: 'QAFI11', type: 'Rendimento', date: `${year}-01-10`, value: 100, state: 'PAID', source: 'QA_SYNTHETIC' }];
        go('dividendos');
        setDividendViewMode('monthly');
        setDividendMonthlyHistoryView('matrix');
      });
      const matrix = page.locator('.div-mat-table');
      await matrix.waitFor();
      assert.match(await matrix.textContent(), /Parcial/);
      assert.equal(await matrix.locator('td.mat-zero').count(), 0);
      assert.match(await matrix.locator('.mat-mean').textContent(), /—/);
      assert.match(await matrix.locator('.mat-year').textContent(), /0\/12 completos/);
      assert.ok(await matrix.locator('[title="Cobertura de dados não confirmada para este mês."]').count() >= 11);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false);
      const out = path.join(root, '.qa-state/v333/month-coverage');
      await fs.mkdir(out, { recursive: true });
      await page.screenshot({ path: path.join(out, `dividendos-${viewport.width}.png`), fullPage: true });
      await matrix.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `matriz-${viewport.width}.png`), fullPage: true });
      await page.evaluate(() => setDividendViewMode('overview'));
      const kpis = await page.locator('.div-exec-kpis').textContent();
      assert.match(kpis, /Cobertura confirmada: 0\/12 meses/);
      assert.match(kpis, /Estimativa · somente meses completos/);
      const result = await page.evaluate(() => dividendAnnualMatrixData([], { '2024-01': { state: 'COMPLETE', fullMonthConfirmed: true, source: 'QA_SYNTHETIC_FULL_MONTH' } })[0]);
      assert.equal(result.months[0].total, 0);
      assert.equal(result.months[1].total, null);
      assert.deepEqual(firebase, []);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      server.server.closeAllConnections();
      await new Promise(resolve => server.server.close(resolve));
    }
  });
}
