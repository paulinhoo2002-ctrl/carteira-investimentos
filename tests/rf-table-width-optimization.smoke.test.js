const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');
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

const EXPECTED_HEADERS = ['Ticker', 'Tipo', 'Aplicado', 'Atual', 'Resultado da posição', 'Rendimentos recebidos', 'Resultado econômico total', 'Rentabilidade total', 'Vencimento', 'Situação'];

for (const viewport of viewports) {
  test(`RF table width - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    let browser;
    let context;
    let page;
    try {
      const { chromium } = await import('playwright-core');
      browser = await chromium.launch({ executablePath, headless: true });
      context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.width <= 430,
        hasTouch: viewport.width <= 430,
      });
      page = await context.newPage();
    const errors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => requestFailures.push(request.url()));

      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await applyV289VisualFixture(page, 'baseline');
      await page.evaluate(() => go('renda-fixa'));
      const detail = page.getByTestId('rf-position-detail');
      await detail.locator(':scope > summary').click();
      await page.waitForSelector('.rf-table tbody tr', { state: 'attached', timeout: 5000 });

      const snapshot = await page.evaluate(() => {
        const wrap = document.querySelector('.rf-table-wrap');
        const table = document.querySelector('.rf-table');
        const wrapRect = wrap.getBoundingClientRect();
        const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
        const rows = [...table.querySelectorAll('tbody tr')];
        const visible = element => !!element && element.getBoundingClientRect().width > 0 && getComputedStyle(element).display !== 'none';
        const tableVisible = visible(wrap);
        const firstRow = rows[0];
        const tds = firstRow ? [...firstRow.querySelectorAll('td')] : [];
        const position = document.querySelector('.premium-rf-position-row');
        const buttons = position ? [...position.querySelectorAll('.premium-rf-row-actions button')]
          .filter(b => b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().height > 0)
          .map(b => {
            const r = b.getBoundingClientRect();
            return { text: b.textContent.trim(), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, right: Math.round(r.right * 10) / 10 };
          }) : [];
        const numericCells = tds.filter(td => td.classList.contains('rf-right') && /\d/.test(td.querySelector('.rf-strong')?.textContent.trim() || td.textContent.trim()));
        const wrappedNumbers = tableVisible ? numericCells.filter(td => {
          const numericText = td.querySelector('.rf-strong')?.textContent.trim() || td.textContent.trim();
          const span = document.createElement('span');
          span.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit';
          span.textContent = numericText;
          document.body.appendChild(span);
          const textW = span.getBoundingClientRect().width;
          document.body.removeChild(span);
          return textW > td.getBoundingClientRect().width - 2;
        }).map(td => td.textContent.trim()) : [];
        const metrics = (() => {
          const asset = S.assets.find(item => isRendaFixaAsset(item) && Number(rfPrincipalBalance(item).value) > 0);
          return asset ? {
            id: rfAssetEventId(asset),
            applied: assetAppliedValue(asset),
            current: assetCurrentValue(asset),
            juros: assetJurosValue(asset),
            rentab: assetRentabPct(asset),
            liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price,
            balance: rfPrincipalBalance(asset).value,
          } : null;
        })();
        const cards = [...document.querySelectorAll('.rf-responsive-card')];
        const cardList = document.querySelector('.rf-responsive-cards');
        const tableWrap = document.querySelector('.rf-table-wrap');
        return {
          headers,
          rowCount: rows.length,
          positionButtons: buttons,
          wrapClientW: wrap.clientWidth,
          wrapScrollW: wrap.scrollWidth,
          overflowTable: wrap.scrollWidth > wrap.clientWidth,
          overflowPage: document.documentElement.scrollWidth > window.innerWidth,
          wrappedNumbers,
          adaptiveVisible: visible(cardList),
          tableVisible,
          adaptiveCount: cards.length,
          adaptiveCardBounds: cards.map(card => {
            const rect = card.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width, clipped: card.scrollWidth > card.clientWidth };
          }),
          firstSummary: cards[0]?.querySelector('summary')?.innerText || '',
          summaryHeight: cards[0]?.querySelector('summary')?.getBoundingClientRect().height || 0,
          metrics,
        };
      });

      assert.deepEqual(snapshot.headers, EXPECTED_HEADERS, `colunas incorretas em ${viewport.label}`);
      assert.ok(snapshot.rowCount > 0, `sem linhas RF em ${viewport.label}`);
      assert.ok(snapshot.metrics, `ativo RF elegivel ausente em ${viewport.label}`);
      if (viewport.width <= 1024) {
        assert.equal(snapshot.adaptiveVisible, true, `cards adaptaveis ausentes em ${viewport.label}`);
        assert.equal(snapshot.tableVisible, false, `tabela densa apresentada em ${viewport.label}`);
        assert.ok(snapshot.adaptiveCount > 0, `sem cards RF em ${viewport.label}`);
        assert.ok(snapshot.adaptiveCardBounds.every(rect => rect.left >= 0 && rect.right <= viewport.width && !rect.clipped), `card fora da viewport ou com corte interno em ${viewport.label}`);
        assert.ok(snapshot.summaryHeight >= 44, `alvo do expansor < 44px em ${viewport.label}`);
        assert.match(snapshot.firstSummary, /Atual/);
        assert.match(snapshot.firstSummary, /Vencimento/);
        const firstCard = page.locator('.rf-responsive-card').first();
        const summary = firstCard.locator('summary');
        assert.ok(await summary.getAttribute('aria-label'), `expansor sem nome acessivel em ${viewport.label}`);
        await summary.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('.rf-responsive-card')?.open === true);
        const focusVisible = await summary.evaluate(element => document.activeElement === element && getComputedStyle(element).outlineStyle !== 'none' && parseFloat(getComputedStyle(element).outlineWidth) >= 2);
        assert.equal(focusVisible, true, `foco visivel ausente no expansor em ${viewport.label}`);
        const details = await firstCard.locator('.rf-responsive-card-details').innerText();
        for (const label of ['Capital aplicado informado', 'Rendimentos recebidos', 'Resultado econômico total', 'Rentabilidade total', 'Vencimento']) {
          assert.ok(details.includes(label), `${label} inacessivel no detalhe em ${viewport.label}`);
        }
        const detailBounds = await firstCard.locator('.rf-responsive-card-details').evaluate(element => ({
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          fields: [...element.querySelectorAll('dt,dd')].map(field => {
            const rect = field.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          }),
        }));
        assert.ok(detailBounds.left >= 0 && detailBounds.right <= viewport.width && detailBounds.scrollWidth <= detailBounds.width, `detalhes fora do viewport ou cortados em ${viewport.label}`);
        assert.ok(detailBounds.fields.every(field => field.left >= 0 && field.right <= viewport.width), `campo detalhado fora do viewport em ${viewport.label}`);
        await summary.click();
        await page.waitForFunction(() => document.querySelector('.rf-responsive-card')?.open === false);
      } else {
        assert.equal(snapshot.adaptiveVisible, false, `cards adaptaveis exibidos em desktop ${viewport.label}`);
        assert.equal(snapshot.tableVisible, true, `tabela desktop ausente em ${viewport.label}`);
      }
      assert.deepEqual(snapshot.positionButtons.map(b => b.text), ['Detalhes', 'Movimentar', 'Resgatar', '✎ Editar'], `acoes da posicao incorretas em ${viewport.label}`);
      for (const button of snapshot.positionButtons) {
        assert.ok(button.h >= 44, `touch target < 44px: ${button.text} h=${button.h}`);
        if (viewport.width <= 430) assert.ok(button.w >= 44, `touch target < 44px: ${button.text} w=${button.w}`);
      }
      assert.deepEqual(snapshot.wrappedNumbers, [], `valores numericos quebrados em ${viewport.label}`);

      if (viewport.width >= 1366) {
        assert.equal(snapshot.overflowTable, false, `scroll interno da tabela em ${viewport.label} (scrollWidth=${snapshot.wrapScrollW} clientWidth=${snapshot.wrapClientW})`);
      }
      assert.equal(snapshot.overflowPage, false, `overflow horizontal da pagina em ${viewport.label}`);

      const id = snapshot.metrics.id;

      const moveButton = page.locator('.premium-rf-position-row:first-child button', { hasText: 'Movimentar' });
      if (viewport.width <= 430) {
        await moveButton.focus();
        await page.keyboard.press('Enter');
      } else {
        await moveButton.click();
      }
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      await page.locator('.premium-rf-position-row:first-child button', { hasText: 'Resgatar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      const after = await page.evaluate(id => {
        const asset = S.assets.find(item => rfAssetEventId(item) === id);
        return asset ? {
          id: rfAssetEventId(asset),
          applied: assetAppliedValue(asset),
          current: assetCurrentValue(asset),
          juros: assetJurosValue(asset),
          rentab: assetRentabPct(asset),
          liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price,
          balance: rfPrincipalBalance(asset).value,
        } : null;
      }, id);
      assert.deepEqual(after, snapshot.metrics, `dados financeiros mudaram em ${viewport.label}`);

      assert.equal(errors.length, 0, `console errors em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(pageErrors.length, 0, `page errors em ${viewport.label}: ${pageErrors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `request failures em ${viewport.label}: ${requestFailures.join(' | ')}`);
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
      harness.server.close();
    }
  });
}
