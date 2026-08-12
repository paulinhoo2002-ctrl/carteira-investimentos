const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ];

  const indexPath = path.resolve(__dirname, '..', 'index.html');

  for (const vp of viewports) {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    await page.goto(`file://${indexPath}`);
    await page.waitForLoadState('load');
    // navigate to Dividendos tab via global go function
    await page.click('button:has-text("Dividendos")');
    await page.waitForTimeout(500);
    await page.waitForSelector('.div-premium-metric-label', { timeout: 5000 });

    // 1. Check KPI label copy
    const labels = await page.$$eval('.div-premium-metric-label', els => els.map(e => e.textContent.trim()));
    if (!labels.includes('Recebido este mês')) {
      throw new Error('KPI label "Recebido este mês" not found');
    }

    // 2. Verify clear filters button disabled initially
    const clearBtnSel = 'button:has-text("Limpar filtros")';
    await page.waitForSelector(clearBtnSel);
    const isDisabled = await page.$eval(clearBtnSel, el => el.disabled);
    if (!isDisabled) {
      throw new Error('Clear filters button should be disabled on load');
    }

    // 3. Apply a filter (first non‑all chip)
    const chip = await page.$('.div-premium-chip:not(.on)');
    if (chip) {
      await chip.click();
    }
    // after applying filter, button should be enabled
    const enabled = await page.$eval(clearBtnSel, el => !el.disabled);
    if (!enabled) {
      throw new Error('Clear filters button not enabled after applying a filter');
    }

    // 4. Click clear filters and verify reset
    await page.click(clearBtnSel);
    // ensure all chips back to default (only 'all' should have .on)
    const activeChips = await page.$$eval('.div-premium-chip.on', els => els.map(e => e.textContent.trim()));
    if (activeChips.length !== 1 || !activeChips[0].includes('Todos')) {
      throw new Error('Filters not reset to default after clearing');
    }
    const searchVal = await page.$eval('#dividend-premium-search', el => el.value);
    if (searchVal.trim() !== '') {
      throw new Error('Search input not cleared after clearing filters');
    }

    // 5. Measure touch target sizes (chips, clear button, CTA)
    const targets = await page.$$eval('.div-premium-chip, button:has-text("Limpar filtros"), button.btn.bp', els =>
      els.map(el => {
        const rect = el.getBoundingClientRect();
        return { text: el.textContent.trim(), width: rect.width, height: rect.height };
      })
    );
    for (const t of targets) {
      if (t.width < 44 || t.height < 44) {
        console.warn(`Touch target "${t.text}" too small: ${t.width}x${t.height}`);
      }
    }

    await browser.close();
  }
  console.log('All viewport smoke checks passed');
})();
