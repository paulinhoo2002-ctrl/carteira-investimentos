'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

test('slow typing preserves search focus and caret across real Ativos and RF rerenders', async () => {
  const harness = await startLocalHttpServer(path.resolve(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(harness.url + '&testReadOnly=1');
    await page.waitForFunction(() => typeof go === 'function');
    for (const [route, label, query, state] of [['ativos','Buscar ativo por ticker ou nome','TEST','assetsSearch'], ['renda-fixa','Buscar título de renda fixa','TEST','rfSearch']]) {
      await page.evaluate(route => go(route), route);
      const filters = page.getByRole('button', { name: /Filtros de renda fixa/ });
      if (await filters.count()) {
        await page.waitForFunction(() => {
          const element = document.querySelector('.premium-rf-current-value');
          return element?.isConnected && parseFloat(getComputedStyle(element).fontSize) >= 22;
        });
        const valueSize = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.premium-rf-current-value')).fontSize));
        assert.ok(valueSize >= 22, 'current balance must dominate the action labels');
        assert.equal(await filters.getAttribute('aria-expanded'), 'false');
        assert.ok((await filters.boundingBox()).height >= 44);
        const controls = page.locator('#rf-reading-controls');
        assert.equal(await controls.isVisible(), false);
        await page.setViewportSize({ width: 1366, height: 768 });
        assert.equal(await controls.isVisible(), true, 'desktop must expose controls even after resizing');
        await page.setViewportSize({ width: 390, height: 844 });
        await filters.focus();
        await filters.press('Enter');
        assert.equal(await filters.getAttribute('aria-expanded'), 'true');
        assert.equal(await filters.evaluate(element => document.activeElement === element), true);
        assert.equal(await controls.isVisible(), true);
      }
      const input = page.getByRole('searchbox', { name: label, exact: true });
      await input.fill('');
      await input.pressSequentially(query, { delay: 220 });
      await page.waitForTimeout(250);
      assert.equal(await input.inputValue(), route === 'ativos' ? query.toLowerCase() : query);
      assert.equal(await input.evaluate(element => document.activeElement === element), true);
      assert.equal(await input.evaluate(element => element.selectionStart), query.length);
      assert.equal(await page.evaluate(state => S[state], state), route === 'ativos' ? query.toLowerCase() : query);
    }
  } finally {
    await browser.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});
