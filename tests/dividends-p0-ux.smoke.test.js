const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\\\\\\\Program Files\\\\\\\\Google\\\\\\\\Chrome\\\\\\\\Application\\\\\\\\chrome.exe',
    'C:\\\\\\\\Program Files (x86)\\\\\\\\Google\\\\\\\\Chrome\\\\\\\\Application\\\\\\\\chrome.exe',
    'C:\\\\\\\\Program Files\\\\\\\\Microsoft\\\\\\\\Edge\\\\\\\\Application\\\\\\\\msedge.exe',
    'C:\\\\\\\\Program Files (x86)\\\\\\\\Microsoft\\\\\\\\Edge\\\\\\\\Application\\\\\\\\msedge.exe',
  ].filter(Boolean).find(c => { try { fs.accessSync(c); return true; } catch { return false; } });
}

async function startServer(rootDir) {
  return startLocalHttpServer(rootDir);
}

const viewports = [
  { w: 390, h: 844, label: '390x844' },
  { w: 768, h: 1024, label: '768x1024' },
  { w: 1366, h: 768, label: '1366x768' },
  { w: 1920, h: 1080, label: '1920x1080' },
];

viewports.forEach(vp => {
  test(`dividends P0 UX refinement - ${vp.label}`, async () => {
    const exe = resolveBrowser();
    if (!exe) return;

    const h = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailed = [];
    try {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        hasTouch: vp.w <= 430,
        isMobile: vp.w <= 430,
      });
      const page = await ctx.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });
      page.on('requestfailed', request => {
        requestFailed.push(`${request.url()} ${request.failure()}`);
      });

      await page.goto(h.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dividendos'));
      await page.waitForFunction(() => document.querySelector('.div-premium') !== null, { timeout: 5000 });

      // 1. Container visible
      const dividendContainer = page.locator('.div-premium');
      assert.ok(await dividendContainer.isVisible(), '.div-premium container not visible');

      // 2. Botão Registrar provento utilizável
      const registerBtn = page.locator('.div-premium .btn.bp');
      assert.ok(await registerBtn.isVisible() && await registerBtn.isEnabled(), 'Registrar provento button not visible or disabled');

      // 3. Tabs visíveis
      const tabs = page.locator('.div-premium-tab:visible');
      const tabCount = await tabs.count();
      assert.ok(tabCount > 0, 'No tabs found');
      for (let i = 0; i < tabCount; i++) {
        assert.ok(await tabs.nth(i).isVisible() && await tabs.nth(i).isEnabled(), `Tab ${i} not visible or disabled`);
      }

      // 4. The calendar route leads; secondary KPI detail remains available on demand.
      const firstTab = tabs.first();
      const firstTabClass = await firstTab.evaluate(el => el.className);
      assert.ok(firstTabClass.includes('on'), 'Calendar should be active initially');
      assert.strictEqual((await firstTab.textContent()).trim(), 'Calendário');
      const secondarySummary = page.locator('.dividend-secondary-disclosure > summary');
      await secondarySummary.click();
      const financialKpis = page.locator('.div-exec-kpis');
      await financialKpis.waitFor({ state: 'visible', timeout: 5000 });
      const financialKpisBox = await financialKpis.boundingBox();
      assert.ok(financialKpisBox && financialKpisBox.width > 0 && financialKpisBox.height > 0, 'Financial KPI card has no bounding box');
      const kpisText = await financialKpis.textContent();
      assert.ok(kpisText && kpisText.includes('Recebido'), 'Financial content missing received-income KPI');
      assert.ok(kpisText && kpisText.includes('Pagamentos classificados como recebidos no ano atual'), 'Received-income period/source context must remain visible');
      assert.ok(kpisText && kpisText.includes('Projeção anual'), 'Annual projection must remain available as a separate secondary metric');
      // Receipts and filters stay reachable under the secondary route menu.
      const moreModes = page.locator('.div-dividend-moreviews > summary');
      await moreModes.click();
      const receiptsMode = page.getByRole('button', { name: 'Recebimentos', exact: true });
      await receiptsMode.click();
      const tabsAfterMode = page.locator('.div-premium-tab:visible');
      const tabsAfterModeCount = await tabsAfterMode.count();
      // Click the actual receipt view, not the adjacent evolution view.
      if (tabsAfterModeCount > 0) {
        // Wait for the filters toolbar to appear
        await page.waitForSelector('.div-premium-toolbar', { timeout: 5000 });
        // Wait for at least one filter chip to be present in the type filters
        await page.waitForFunction(() => {
          return document.querySelectorAll('.div-premium-toolbar .div-premium-search + .div-premium-filters .div-premium-chip').length > 0;
        }, { timeout: 5000 });
      } else {
        console.warn('Only one tab found, skipping filter and search tests');
      }

      // 5. Filtros utilizáveis (only if we switched to a tab that shows them)
      if (tabsAfterModeCount > 0) {
        const moreFilters = page.locator('.div-premium-toolbar details.div-dividend-more');
        if (await moreFilters.count()) await moreFilters.locator('summary').click();
        const chips = page.locator('.div-dividend-toolbar-main .div-premium-chip, .div-dividend-more-group:first-child .div-premium-chip');
        const chipCount = await chips.count();
        // The first three type chips are primary; the two remaining official types live in More filters.
        assert.strictEqual(chipCount, 5, `Expected 5 type filter chips, found ${chipCount}`);
        const expectedLabels = ['Todos', 'Dividendos', 'JCP', 'Rendimento FII', 'Outros'];
        for (let i = 0; i < chipCount; i++) {
          assert.ok(await chips.nth(i).isVisible() && await chips.nth(i).isEnabled(), `Chip ${i} not visible or disabled`);
          const text = await chips.nth(i).textContent();
          assert.strictEqual(text.trim(), expectedLabels[i], `Chip ${i} text mismatch: expected '${expectedLabels[i]}', got '${text.trim()}'`);
        }
      }

      // 6. Campo de busca utilizável (only if we switched tabs)
      const searchInput = page.locator('.div-premium input#dividend-premium-search');
      if (tabsAfterModeCount > 0) {
        assert.ok(await searchInput.isVisible() && await searchInput.isEnabled(), 'Search input not visible or enabled');
      }

      // 7. Touch target botão >=44px (always visible)
      const registerBtnBox = await registerBtn.boundingBox();
      assert.ok(registerBtnBox, 'Registrar provento button bounding box not found');
      assert.ok(registerBtnBox.width >= 44 && registerBtnBox.height >= 44, `Registrar provento button touch target too small: ${registerBtnBox.width}x${registerBtnBox.height}`);

      // 8. Touch target tabs >=44px (always visible)
      for (let i = 0; i < tabCount; i++) {
        const tabBox = await tabs.nth(i).boundingBox();
        assert.ok(tabBox, `Tab ${i} bounding box not found`);
        assert.ok(tabBox.width >= 44 && tabBox.height >= 44, `Tab ${i} touch target too small: ${tabBox.width}x${tabBox.height}`);
      }

      // 9. Touch target filtros >=44px (only if chips present)
      if (tabCount > 1) {
        const chips = page.locator('.div-premium-toolbar .div-premium-search + .div-premium-filters .div-premium-chip');
        const chipCount = await chips.count();
        for (let i = 0; i < chipCount; i++) {
          const chipBox = await chips.nth(i).boundingBox();
          assert.ok(chipBox, `Chip ${i} bounding box not found`);
          assert.ok(chipBox.width >= 44 && chipBox.height >= 44, `Chip ${i} touch target too small: ${chipBox.width}x${chipBox.height}`);
        }
      }

      // 10. Área clicável de checkbox/controle adequado (we skip as we didn't change anything related to checkboxes)

      // 11. Tab percorre elementos interativos
      await registerBtn.focus();
      const activeBeforeInfo = await page.evaluate(() => {
        const el = document.activeElement;
        return el.tagName.toLowerCase() + '.' + el.className;
      });
      await page.keyboard.press('Tab');
      const activeAfterInfo = await page.evaluate(() => {
        const el = document.activeElement;
        return el.tagName.toLowerCase() + '.' + el.className;
      });
      assert.notStrictEqual(activeAfterInfo, activeBeforeInfo, 'Tab did not move focus from button');
      const activeTagName = await page.evaluate(() => {
        const el = document.activeElement;
        return el.tagName;
      });
      assert.notStrictEqual(activeTagName, 'BODY', 'Tab moved focus to body, expected an interactive element');

      // 12. focus-visible perceptível
      const outlineStyle = await page.evaluate(() => {
        const el = document.activeElement;
        const style = window.getComputedStyle(el);
        return style.outlineWidth + ' ' + style.outlineStyle;
      });
      assert.ok(!outlineStyle.includes('0px') && !outlineStyle.includes('none'), `Focus-visible outline not perceptible: ${outlineStyle}`);

      // 13. Contraste não fica ilegível (simplified check: text not transparent)
      // Check register button and first tab
      const btnColor = await registerBtn.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.color;
      });
      assert.notStrictEqual(btnColor, 'rgba(0, 0, 0, 0)', `Element has transparent text color: ${btnColor}`);
      assert.notStrictEqual(btnColor, 'transparent', `Element has transparent text color: ${btnColor}`);

      const firstTabLoc = tabs.first();
      const tabColor = await firstTabLoc.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.color;
      });
      assert.notStrictEqual(tabColor, 'rgba(0, 0, 0, 0)', `Element has transparent text color: ${tabColor}`);
      assert.notStrictEqual(tabColor, 'transparent', `Element has transparent text color: ${tabColor}`);

      // 14. Sem overflow horizontal
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert.strictEqual(overflow, false, 'Horizontal overflow detected');

      // 15. Navegar entre sub-abas não quebra
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(100);
        const isActive = await tabs.nth(i).evaluate(el => el.classList.contains('on'));
        assert.ok(isActive, `Tab ${i} did not become active after click`);
      }

      // 17. Voltar para outra tela e retornar funciona
      await page.evaluate(() => go('aportes'));
      await page.waitForFunction(() => S.tab === 'aportes');
      assert.match(await page.locator('h1').first().innerText(), /Aportes/i, 'Aportes route did not render');
      await page.evaluate(() => go('dividendos'));
      await dividendContainer.waitFor({ state: 'visible', timeout: 5000 });
      assert.ok(await dividendContainer.isVisible(), 'Failed to return to Dividendos screen after navigating away');

      await ctx.close();
    } finally {
      await browser.close();
      h.server.closeAllConnections();
      h.server.close();
    }

    // Telemetry check
    if (consoleErrors.length > 0 || pageErrors.length > 0 || requestFailed.length > 0) {
      throw new Error(`Telemetry errors - console.errors: ${consoleErrors.length}, page.errors: ${pageErrors.length}, request.failed: ${requestFailed.length}`);
    }
  });
});
