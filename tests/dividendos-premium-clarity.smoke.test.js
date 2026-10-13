const { chromium } = require('playwright-core');
const path = require('path');
const { startLocalHttpServer } = require('./local-http-server');
const fs = require('node:fs');
const assert = require('node:assert/strict');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => { try { fs.accessSync(candidate); return true; } catch { return false; } });
}

async function startServer(rootDir) {
  return startLocalHttpServer(rootDir);
}

(async () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ];

  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'Chrome/Edge not found');

  for (const vp of viewports) {
    const harness = await startServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => go('dividendos'));
    await page.waitForFunction(() => document.querySelector('.div-premium') !== null, { timeout: 10000 });

    // KPI label check (overview)
    const labels = await page.$$eval('.dividend-executive-kpi-label', els => els.map(e => e.textContent.trim()));
    assert.ok(labels.some(label => label.startsWith('Recebido')), 'KPI de recebimentos realizados não encontrado');

    // Open the "Recebimentos" tab, where the premium filter toolbar renders
    await page.evaluate(() => setDividendViewMode('received'));
    await page.waitForSelector('.div-premium-toolbar', { state: 'visible', timeout: 10000 });

    // Clear filters button initially disabled
    const clearBtn = page.locator('.div-premium-toolbar button:has-text("Limpar filtros")');
    await clearBtn.waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await clearBtn.isDisabled(), true, 'Clear filters button should be disabled on load');

    // Apply first non‑all chip
    const chip = page.locator('.div-premium-chip:not(.on)').first();
    await chip.click();
    const activeAfterChip = await page.$$eval('.div-premium-chip.on', els => els.filter(e => !e.closest('.div-collapsible')).map(e => e.textContent.trim()));
    assert.equal(activeAfterChip.length, 3, 'Each independent filter group should keep one active chip');
    assert.ok(activeAfterChip[0].includes('Dividendos'), `Unexpected active chip after selecting: ${activeAfterChip[0]}`);
    assert.equal(await clearBtn.isDisabled(), false, 'Clear filters button should be enabled after applying a filter');

    // Clear via the toolbar button
    await clearBtn.click();
    const activeChips = await page.$$eval('.div-premium-chip.on', els => els.filter(e => !e.closest('.div-collapsible')).map(e => e.textContent.trim()));
    assert.equal(activeChips.length, 3, 'Each independent filter group should keep one active chip after clear');
    assert.ok(activeChips[0].includes('Todos'), 'Active chip after clear should be "Todos"');
    const searchVal = await page.$eval('#dividend-premium-search', el => el.value);
    assert.equal(searchVal.trim(), '', 'Search input not cleared after clearing filters');

    // Touch target size warnings (non‑fatal)
    const targets = await page.$$eval('.div-premium-chip, button:has-text("Limpar filtros"), button.btn.bp', els =>
      els.map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim(), width: r.width, height: r.height };
      }).filter(t => t.width > 0 && t.height > 0)
    );
    for (const t of targets) {
      if (t.width < 44 || t.height < 44) console.warn(`Touch target "${t.text}" too small: ${t.width}x${t.height}`);
    }

    assert.equal(errors.length, 0, `telemetry errors: ${errors.join(' | ')}`);
    await context.close();
    await browser.close();
    await harness.server.close();
    console.log(`✅ Viewport ${vp.width}x${vp.height} passed`);
  }
})();
