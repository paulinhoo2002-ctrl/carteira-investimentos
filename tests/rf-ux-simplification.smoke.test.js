const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { chromium } = require('playwright-core');

const URL = 'http://127.0.0.1:4173/index.html?testMode=1';
const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(path => { try { fs.accessSync(path); return true; } catch { return false; } });
}

for (const viewport of viewports) {
  test(`RF UX simplification - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    if (!executablePath) return;
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.width <= 430,
      isMobile: viewport.width <= 430,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => requestFailures.push(request.url()));

    try {
      await page.goto(URL, { waitUntil: 'networkidle' });
      await page.evaluate(() => { go('aportes'); openQuickMovement('renda-fixa'); });
      await page.waitForFunction(() => document.querySelector('.rf-quick-tabs'));

      const aplicar = await page.evaluate(() => ({
        active: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(),
        tabHeights: [...document.querySelectorAll('[role="tab"]')].map(tab => tab.getBoundingClientRect().height),
        summary: !!document.querySelector('.rf-quick-summary'),
        existingSelect: !!document.querySelector('#qm-rf-existing-asset'),
        cta: document.querySelector('.rf-quick-continue')?.textContent.trim(),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }));
      assert.equal(aplicar.active, 'Aplicar');
      assert.equal(aplicar.summary, true);
      assert.equal(aplicar.existingSelect, true);
      assert.equal(aplicar.cta, 'Continuar aplicação');
      assert.equal(aplicar.overflow, false);
      assert.ok(aplicar.tabHeights.every(height => height >= 44));

      await page.evaluate(() => document.querySelector('.rf-quick-continue').click());
      await page.waitForSelector('.rf-event-editor');
      assert.equal(await page.evaluate(() => document.querySelector('#rfmv-rf-movi18-mode')?.value), 'aporte');

      await page.evaluate(() => { closeRfMovementEditor(); setRfQuickTab('resgatar'); });
      await page.waitForFunction(() => document.querySelector('.rf-quick-continue')?.textContent.includes('resgate'));
      const resgatar = await page.evaluate(() => ({
        active: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(),
        summary: !!document.querySelector('.rf-quick-summary'),
        mode: document.querySelector('#qm-rf-existing-mode')?.value,
        cta: document.querySelector('.rf-quick-continue')?.textContent.trim(),
      }));
      assert.equal(resgatar.active, 'Resgatar');
      assert.equal(resgatar.summary, true);
      assert.equal(resgatar.mode, 'resgate_parcial');
      assert.equal(resgatar.cta, 'Continuar resgate');

      await page.evaluate(() => document.querySelector('.rf-quick-continue').click());
      await page.waitForSelector('.rf-event-editor');
      assert.equal(await page.evaluate(() => document.querySelector('#rfmv-rf-movi18-mode')?.value), 'resgate_parcial');

      await page.evaluate(() => { closeRfMovementEditor(); setRfQuickTab('novo'); });
      await page.waitForFunction(() => document.querySelector('.rf-new-title-section'));
      const novo = await page.evaluate(() => ({
        active: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(),
        existingSelect: !!document.querySelector('#qm-rf-existing-asset'),
        form: !!document.querySelector('.rf-new-title-section'),
        save: [...document.querySelectorAll('button')].find(button => button.getAttribute('onclick') === 'saveQuickMovement()')?.textContent.trim(),
      }));
      assert.equal(novo.active, 'Novo título');
      assert.equal(novo.existingSelect, false);
      assert.equal(novo.form, true);
      assert.equal(novo.save, 'Salvar renda fixa');
      await page.evaluate(() => closeQuickMovement());
      assert.equal(await page.evaluate(() => document.querySelector('.note-overlay') === null), true);

      assert.deepEqual(consoleErrors, []);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(requestFailures, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
