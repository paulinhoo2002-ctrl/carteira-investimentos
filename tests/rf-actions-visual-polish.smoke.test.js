const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer: startServer } = require('./local-http-server.js');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

const viewports = [
  { width: 360, height: 800, label: '360x800' },
  { width: 390, height: 844, label: '390x844' },
  { width: 412, height: 915, label: '412x915' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

async function measureWithoutRootClipping(page) {
  return page.evaluate(() => {
    const roots = [document.documentElement, document.body, document.querySelector('#root')].filter(Boolean);
    const saved = roots.map(element => ({ element, value: element.style.getPropertyValue('overflow-x'), priority: element.style.getPropertyPriority('overflow-x') }));
    try {
      roots.forEach(element => element.style.setProperty('overflow-x', 'visible', 'important'));
      void document.documentElement.offsetWidth;
      return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, document.scrollingElement.scrollWidth) - window.innerWidth;
    } finally {
      saved.forEach(({ element, value, priority }) => value ? element.style.setProperty('overflow-x', value, priority) : element.style.removeProperty('overflow-x'));
    }
  });
}

for (const viewport of viewports) {
  test(`Acoes RF - polish visual ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.width <= 430,
      hasTouch: viewport.width <= 430,
    });
    const page = await context.newPage();
    const errors = [];
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => requestFailures.push(request.url()));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => { go('ativos'); setAssetsInnerTab('renda-fixa'); });
      const rfActionScope = page.locator('.premium-rf-position-list .premium-rf-position-row').first();
      await rfActionScope.waitFor({ state: 'visible', timeout: 5000 });

      const before = await page.evaluate(() => {
        const firstAsset = document.querySelector('.premium-rf-position-list .premium-rf-position-row');
        const visibleRect = element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const main = firstAsset?.querySelector('.premium-rf-row-main');
        const value = firstAsset?.querySelector('.premium-rf-row-value');
        const actions = firstAsset?.querySelector('.premium-rf-row-actions');
        const important = {
          title: firstAsset?.querySelector('.premium-rf-row-title'),
          institution: firstAsset?.querySelector('.premium-rf-row-issuer'),
          current: firstAsset?.querySelector('.premium-rf-row-financial'),
          applied: [...(firstAsset?.querySelectorAll('.premium-rf-row-meta') || [])].find(item => item.textContent.includes('Valor aplicado')),
          maturity: [...(firstAsset?.querySelectorAll('.premium-rf-row-meta') || [])].find(item => item.textContent.includes('Vencimento')),
          result: [...(firstAsset?.querySelectorAll('.premium-rf-row-meta') || [])].find(item => item.textContent.includes('Resultado')),
          rentability: [...(firstAsset?.querySelectorAll('.premium-rf-row-meta') || [])].find(item => item.textContent.includes('Rentab.')),
        };
        const ticker = firstAsset?.querySelector('.premium-rf-row-title')?.textContent.split('·')[0].trim();
        const asset = S.assets.find(item => String(item.ticker || '').trim().toUpperCase() === String(ticker || '').toUpperCase() && isRendaFixaAsset(item) && Number(rfPrincipalBalance(item).value) > 0);
        const buttons = [...(firstAsset?.querySelectorAll('.premium-rf-row-actions button') || [])]
          .filter(button => button.getBoundingClientRect().width > 0);
        const metrics = asset && {
          id: rfAssetEventId(asset),
          type: asset.type,
          balance: rfPrincipalBalance(asset).value,
          applied: asset.rf_applied_value,
          liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price,
          events: (S.rfEvents || []).length,
        };
        return {
          metrics,
          readable: Object.fromEntries(Object.entries(important).map(([key, element]) => [key, Boolean(element?.textContent.trim() && visibleRect(element).width > 0 && visibleRect(element).height > 0)])),
          geometry: { row: visibleRect(firstAsset), main: main && visibleRect(main), value: value && visibleRect(value), actions: actions && visibleRect(actions) },
          buttons: buttons.map(button => {
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            return { text: button.textContent.trim(), width: rect.width, height: rect.height, font: style.fontSize, padding: style.padding };
          }),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.ok(before.metrics, `ativo RF elegivel ausente em ${viewport.label}`);
      assert.deepEqual(before.readable, { title: true, institution: true, current: true, applied: true, maturity: true, result: true, rentability: true }, `valor/label essencial ausente ou sem geometria em ${viewport.label}: ${JSON.stringify(before.readable)}`);
      assert.deepEqual(before.buttons.map(button => button.text), ['Detalhes', 'Movimentar', 'Resgatar', '✎ Editar']);
      assert.equal(before.overflow, false, `overflow horizontal em ${viewport.label}`);
      const unmaskedOverflow = await measureWithoutRootClipping(page);
      assert.ok(unmaskedOverflow <= 0, `overflow horizontal mascarado por clipping raiz em ${viewport.label}: ${unmaskedOverflow}px`);
      const { row, main, value, actions } = before.geometry;
      for (const [name, rect] of Object.entries({ row, main, value, actions })) {
        if (!rect) continue;
        assert.ok(rect.left >= -1 && rect.right <= viewport.width + 1, `${name} fora da viewport em ${viewport.label}: ${JSON.stringify(rect)}`);
      }
      const rowRegions = [['main', main], ['value', value], ['actions', actions]].filter(([, rect]) => rect);
      for (let leftIndex = 0; leftIndex < rowRegions.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < rowRegions.length; rightIndex += 1) {
          const [leftName, left] = rowRegions[leftIndex];
          const [rightName, right] = rowRegions[rightIndex];
          const overlapX = Math.min(left.right, right.right) - Math.max(left.left, right.left);
          const overlapY = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
          assert.ok(overlapX <= 0 || overlapY <= 0, `${leftName}/${rightName} colidem em ${viewport.label}`);
        }
      }
      for (const button of before.buttons) {
        assert.ok(button.width >= 44 && button.height >= 44, `touch target invalido: ${button.text} ${button.width}x${button.height}`);
      }

      await rfActionScope.getByRole('button', { name: 'Movimentar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      await rfActionScope.getByRole('button', { name: 'Resgatar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      const after = await page.evaluate(id => {
        const asset = S.assets.find(item => rfAssetEventId(item) === id);
        return { id: rfAssetEventId(asset), type: asset.type, balance: rfPrincipalBalance(asset).value, applied: asset.rf_applied_value, liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price, events: (S.rfEvents || []).length };
      }, before.metrics.id);
      assert.deepEqual(after, before.metrics, `dados financeiros mudaram em ${viewport.label}`);
      assert.equal(errors.length, 0, `console/page errors em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `request failures em ${viewport.label}: ${requestFailures.join(' | ')}`);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
