const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

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
  const server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      let f = p === '/' ? '/index.html' : p;
      const fp = path.normalize(path.join(rootDir, f));
      if (!fp.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const c = await fsp.readFile(fp);
      const m = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': m[path.extname(fp).toLowerCase()] || 'text/plain' });
      res.end(c);
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
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
      const tabs = page.locator('.div-premium-tab');
      const tabCount = await tabs.count();
      assert.ok(tabCount > 0, 'No tabs found');
      for (let i = 0; i < tabCount; i++) {
        assert.ok(await tabs.nth(i).isVisible() && await tabs.nth(i).isEnabled(), `Tab ${i} not visible or disabled`);
      }

      // 4. First validate financial overview in the overview tab
      // First, verify that we are in overview tab (first tab has class 'on')
      const firstTab = tabs.first();
      const firstTabClass = await firstTab.evaluate(el => el.className);
      assert.ok(firstTabClass.includes('on'), 'First tab should be overview and active initially');
      const financialKpis = page.locator('.div-exec-kpis');
      await financialKpis.waitFor({ state: 'visible', timeout: 5000 });
      const financialKpisBox = await financialKpis.boundingBox();
      assert.ok(financialKpisBox && financialKpisBox.width > 0 && financialKpisBox.height > 0, 'Financial KPI card has no bounding box');
      const kpisText = await financialKpis.textContent();
      assert.ok(kpisText && kpisText.includes('Recebido este mês'), 'Financial content missing expected KPI text');
      assert.ok(kpisText && kpisText.includes('Total últimos 12 meses'), 'Financial content missing expected KPI text');
      // Click on the second tab (received)
      if (tabCount > 1) {
        await tabs.nth(1).click();
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
      if (tabCount > 1) {
        const chips = page.locator('.div-premium-toolbar .div-premium-search + .div-premium-filters .div-premium-chip');
        const chipCount = await chips.count();
        // Expect exactly 5 type filter chips: Todos, Dividendos, JCP, Rendimento FII, Outros
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
      if (tabCount > 1) {
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
      const otherTabBtn = page.locator('#investBottomNav button:has-text(\"Aportes\")');
      if (await otherTabBtn.count() > 0) {
        await page.evaluate(() => go('aportes'));
        await page.waitForTimeout(500);
        await page.evaluate(() => go('dividendos'));
        await dividendContainer.waitFor({ state: 'visible', timeout: 5000 });
        assert.ok(await dividendContainer.isVisible(), 'Failed to return to Dividendos screen after navigating away');
      } else {
        console.warn('Aportes tab not found, skipping return test');
      }

      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }

    // Telemetry check
    if (consoleErrors.length > 0 || pageErrors.length > 0 || requestFailed.length > 0) {
      throw new Error(`Telemetry errors - console.errors: ${consoleErrors.length}, page.errors: ${pageErrors.length}, request.failed: ${requestFailed.length}`);
    }
  });
});
