const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
const CHROME = resolveChromePath();
const VIEWPORTS = [[360, 800], [390, 844], [430, 932], [768, 1024], [1280, 720], [1366, 768], [1440, 900], [1920, 1080]];
const SCREENSHOT_DIR = process.env.SM189_60_SCREENSHOT_DIR || path.join(ROOT, '.qa-state', 'sm189-60', 'after');

async function inspectLayout(page) {
  return page.evaluate(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const financialValues = [...document.querySelectorAll(
      '.reports-kpi .value,.patrimonio-kpi-value,.assets-kpi-card strong,.quick-movement-preview-value'
    )].filter(visible);
    const clippedValues = financialValues.filter(element => element.scrollWidth > element.clientWidth + 1)
      .map(element => (element.innerText || element.textContent || '').trim());
    const primaryLabels = [...document.querySelectorAll('.reports-premium-kpis .reports-kpi .label,.patrimonio-kpi-label')]
      .filter(visible).map(element => parseFloat(getComputedStyle(element).fontSize));
    const smallTargets = [...document.querySelectorAll(
      '.reports-filter button,.patrimonio-periods button,.assets-premium-shell>.sh button,[role="dialog"] button'
    )].filter(visible).map(element => {
      const rect = element.getBoundingClientRect();
      return { label: (element.innerText || element.getAttribute('aria-label') || '').trim(), width: rect.width, height: rect.height };
    }).filter(target => target.width < 44 || target.height < 44);
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
      clippedValues,
      primaryLabels,
      smallTargets,
      invalidText: /\b(?:NaN|Infinity|undefined|null)\b/.test(document.body.innerText),
    };
  });
}

test('SM189.60: telas essenciais cabem e permanecem utilizáveis em oito viewports e dois temas', async t => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const pageErrors = [];
  const firebaseRequests = [];
  const screenshots = [];
  const resetVisualPosition = async page => page.locator('.shell').evaluate(element => {
    element.scrollTop = 0;
    document.activeElement?.blur?.();
  });
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => harness.server.close(resolve));
  });

  for (const [width, height] of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      page.on('pageerror', error => pageErrors.push(`${width}/${theme}: ${error.message}`));
      page.on('request', request => {
        if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseio\.com/i.test(request.url())) {
          firebaseRequests.push(request.url());
        }
      });
      await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.evaluate(() => window.__LOCAL_QA_RUNTIME__), 'local-synthetic-v1', 'QA sintético local ativo');
      await page.evaluate(themeName => {
        document.documentElement.dataset.theme = themeName;
        document.documentElement.style.colorScheme = themeName;
      }, theme);
      assert.equal(await page.evaluate(() => window.visualViewport?.scale ?? 1), 1, 'zoom do navegador em 100%');

      await page.evaluate(() => go('relatorios'));
      await page.waitForSelector('.reports-premium-shell');
      let state = await inspectLayout(page);
      assert.equal(state.overflow, false, `overflow em Relatórios ${width} ${theme}`);
      assert.deepEqual(state.clippedValues, [], `valor financeiro cortado em Relatórios ${width} ${theme}`);
      assert.equal(state.invalidText, false, `texto financeiro inválido em Relatórios ${width} ${theme}`);
      assert.deepEqual(state.smallTargets, [], `alvo de toque menor que 44px em Relatórios ${width} ${theme}`);
      assert.equal(await page.locator('.reports-premium-kpis .reports-kpi').count(), 4);
      assert.equal(await page.locator('.reports-data-overview,.reports-analysis-details,.reports-activity-details,.reports-fiscal-details,#reports-export-details').evaluateAll(nodes => nodes.every(node => !node.open)), true);
      assert.ok(state.primaryLabels.every(size => size >= 12), `rótulo principal abaixo de 12px em Relatórios ${width} ${theme}`);
      await page.locator('.reports-data-overview > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.reports-data-overview').evaluate(node => node.open), true, 'Conferência abre por teclado');
      await page.locator('.reports-integrity-disclosure > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.reports-integrity-disclosure').evaluate(node => node.open), true, 'Cobertura abre por teclado');
      assert.equal(await page.locator('.reports-integrity-disclosure .reports-reconciliation').first().evaluate(node => node.getBoundingClientRect().height > 0), true, 'reconciliação acessível dentro do disclosure pai');
      await page.keyboard.press('Enter');
      await page.locator('.reports-data-overview > summary').focus();
      await page.keyboard.press('Enter');
      await page.locator('.reports-analysis-details > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.reports-analysis-details').evaluate(node => node.open), true, 'detalhe de análise abre por teclado');
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: 'Exportar', exact: true }).click();
      assert.equal(await page.locator('#reports-export-details').evaluate(node => node.open), true, 'CTA abre formatos de exportação');
      await page.locator('#reports-export-details').evaluate(node => { node.open = false; });
      if (theme === 'light') {
        await resetVisualPosition(page);
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        const screenshot = path.join(SCREENSHOT_DIR, `reports-${width}x${height}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);
      }

      await page.evaluate(() => go('patrimonio'));
      await page.waitForSelector('.patrimonio-premium');
      state = await inspectLayout(page);
      assert.equal(state.overflow, false, `overflow em Patrimônio ${width} ${theme}`);
      assert.deepEqual(state.clippedValues, [], `valor financeiro cortado em Patrimônio ${width} ${theme}`);
      assert.equal(state.invalidText, false, `texto financeiro inválido em Patrimônio ${width} ${theme}`);
      assert.equal(await page.locator('.patrimonio-kpi').count(), 4);
      assert.ok(state.primaryLabels.every(size => size >= 12), `rótulo principal abaixo de 12px em Patrimônio ${width} ${theme}`);
      const periods = await page.locator('.patrimonio-periods button').evaluateAll(buttons => buttons.map(button => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      assert.ok(periods.every(box => box.width >= 44 && box.height >= 44), `alvo do período menor que 44px em Patrimônio ${width} ${theme}`);
      if (theme === 'light') {
        await resetVisualPosition(page);
        const screenshot = path.join(SCREENSHOT_DIR, `patrimonio-${width}x${height}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);
      }

      await page.evaluate(() => go('ativos'));
      await page.waitForSelector('.assets-premium-shell');
      state = await inspectLayout(page);
      assert.equal(state.overflow, false, `overflow em Ativos ${width} ${theme}`);
      assert.deepEqual(state.clippedValues, [], `valor financeiro cortado em Ativos ${width} ${theme}`);
      assert.equal(state.invalidText, false, `texto financeiro inválido em Ativos ${width} ${theme}`);
      assert.equal(await page.locator('.assets-kpi-card').count(), 4);
      const groups = page.locator('#ativosAccordion details.accordion-category');
      if (await groups.count()) assert.equal(await groups.evaluateAll(nodes => nodes.every(node => !node.open)), true, 'grupos começam recolhidos');
      if (theme === 'light') {
        await resetVisualPosition(page);
        const screenshot = path.join(SCREENSHOT_DIR, `ativos-${width}x${height}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);
      }

      for (const [kind, confirmName] of [['compra', 'Confirmar compra'], ['venda', 'Confirmar venda']]) {
        await page.evaluate(kindName => openQuickMovement(kindName), kind);
        const dialog = page.getByRole('dialog', { name: 'Nova movimentação' });
        await dialog.waitFor({ state: 'visible' });
        assert.equal(await dialog.getByRole('button', { name: confirmName, exact: true }).count(), 1, `CTA ${confirmName} presente`);
        const touchTargets = await dialog.locator('button').evaluateAll(buttons => buttons.filter(button => {
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        }).map(button => ({ label: button.innerText.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
        assert.deepEqual(touchTargets, [], `${kind} tem alvos de toque com pelo menos 44px em ${width} ${theme}`);
        const order = await dialog.locator('input,select').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
        if (kind === 'compra') {
          assert.ok(order[0] === 'Data' && order[1] === 'Ticker' && order[2] === 'Tipo de ativo', 'ordem dos campos da compra compreensível');
        } else {
          assert.ok(order[0] === 'Data' && order[1] === 'Ativo para venda', 'ordem dos campos da venda compreensível');
        }
        const fieldOrder = await dialog.locator('input,select').evaluateAll(nodes => {
          const visible = nodes.filter(node => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          });
          const labels = nodes => nodes.map(node => node.getAttribute('aria-label'));
          return {
            dom: labels(visible),
            visual: labels([...visible].sort((a, b) => {
              const first = a.getBoundingClientRect();
              const second = b.getBoundingClientRect();
              return Math.abs(first.top - second.top) > 2 ? first.top - second.top : first.left - second.left;
            })),
          };
        });
        assert.deepEqual(fieldOrder.dom, fieldOrder.visual, `${kind}: ordem do teclado acompanha a ordem visual`);
        const tabStart = kind === 'compra' ? 'Ticker' : 'Ativo para venda';
        const tabNext = kind === 'compra' ? 'Tipo de ativo' : 'Venda parcial';
        await dialog.locator(`[aria-label="${tabStart}"]`).focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim()), tabNext, `${kind}: Tab segue a ordem visual dos campos e ações`);
        await dialog.locator('[aria-label="Observação"]').focus();
        const finalField = await dialog.locator('[aria-label="Observação"]').boundingBox();
        const actionButton = await dialog.getByRole('button', { name: confirmName, exact: true }).boundingBox();
        assert.ok(finalField && actionButton && finalField.y + finalField.height <= actionButton.y, `${kind}: último campo alcançável sem ficar coberto pela confirmação`);
        state = await inspectLayout(page);
        assert.equal(state.overflow, false, `overflow no modal ${kind} ${width} ${theme}`);
        if (theme === 'light') {
          fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
          const screenshot = path.join(SCREENSHOT_DIR, `${kind}-${width}x${height}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          screenshots.push(screenshot);
        }
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog', { name: 'Nova movimentação' }).count(), 0, `Escape fecha modal ${kind}`);
      }
      await page.close();
    }
  }

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(firebaseRequests, [], 'QA local sintético não acessou Firebase');
  if (process.env.SM189_60_SCREENSHOT_DIR) assert.ok(screenshots.length > 0);
});
