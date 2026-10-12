'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server.js');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => { try { fs.accessSync(candidate); return true; } catch { return false; } });
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
]) {
  test(`V262 Renda Fixa layout and trust controls remain usable at ${viewport.width}px`, async () => {
    const executablePath = browserPath();
    assert.ok(executablePath, 'Chrome/Edge não encontrado');
    const harness = await startLocalHttpServer(require('node:path').join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('renda-fixa'));
      await page.waitForSelector('.premium-rf-position-row', { state: 'visible' });
      const layout = await page.evaluate(() => {
        const vw = window.innerWidth;
        const rows = [...document.querySelectorAll('.premium-rf-position-row')];
        const mainWidths = rows.map(row => row.querySelector('.premium-rf-row-main')?.getBoundingClientRect().width || 0);
        return {
          overflow: document.documentElement.scrollWidth - vw,
          rowCount: rows.length,
          narrowMainRows: mainWidths.filter(width => width < 180).length,
          gridColumns: getComputedStyle(document.querySelector('.premium-rf-grid')).gridTemplateColumns,
        };
      });
      assert.ok(layout.rowCount > 0, 'nenhuma posição de renda fixa renderizada');
      assert.equal(layout.narrowMainRows, 0, `nomes espremidos em ${viewport.width}px`);
      assert.equal(layout.overflow, 0, `overflow horizontal de renda fixa em ${viewport.width}px`);
      const issuerSelect=page.getByLabel('Filtrar por instituição');
      const issuerOption=await issuerSelect.locator('option').evaluateAll(options=>options.find(option=>option.value)?.value||'');
      assert.ok(issuerOption, 'nenhuma instituição sintética disponível para validar o filtro');
      await issuerSelect.selectOption(issuerOption);
      const issuerSnapshot=await page.locator('.premium-rf-position-row .premium-rf-row-issuer').allTextContents();
      assert.ok(issuerSnapshot.length > 0, 'filtro por instituição não retornou posições');
      assert.ok(issuerSnapshot.every(text=>text.includes(issuerOption)), 'filtro exibiu posição de outra instituição');
      const productSelect=page.getByLabel('Filtrar por produto de renda fixa');
      const category=await page.locator('.premium-rf-position-row .premium-rf-row-main .premium-rf-row-meta').first().evaluate(node=>node.textContent.trim().split(' · ')[0]);
      const categoryOption=await productSelect.locator('option').evaluateAll((options,selected)=>options.find(option=>option.value===selected)?.value||'',category);
      assert.ok(categoryOption, 'tipo do produto visível não aparece no filtro');
      await productSelect.selectOption(categoryOption);
      const categoryRows=await page.locator('.premium-rf-position-row').evaluateAll(rows=>rows.map(row=>row.querySelector('.premium-rf-row-main .premium-rf-row-meta')?.textContent.trim().split(' · ')[0]));
      assert.ok(categoryRows.length > 0, 'filtro por produto não retornou posições');
      assert.ok(categoryRows.every(value=>value===category), 'filtro exibiu posição de outro produto');
      await productSelect.selectOption('');
      await issuerSelect.selectOption('');
      await page.getByLabel('Buscar título de renda fixa').fill('CDI');
      await page.waitForTimeout(180);
      await page.getByLabel('Filtrar status do valuation').selectOption('UNAVAILABLE');
      await page.getByLabel('Ordenar posições de renda fixa').selectOption('value-desc');
      const snapshot = await page.evaluate(() => ({
        controls: document.querySelectorAll('.premium-rf-controls input, .premium-rf-controls select').length,
        selectWidths: [...document.querySelectorAll('.premium-rf-controls select')].map(node=>Math.round(node.getBoundingClientRect().width)),
        trustBar: !!document.querySelector('.premium-rf-trust-bar'),
        unavailableCopy: document.body.textContent.includes('Indisponível'),
        visiblePositions: document.querySelector('.premium-rf-panel .premium-rf-panel-badge')?.textContent.trim(),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        headings: [...document.querySelectorAll('h1,h2')].filter(node => node.offsetParent).map(node => node.textContent.trim()),
      }));
      assert.equal(snapshot.controls, 5);
      if(viewport.width>=768) assert.ok(Math.min(...snapshot.selectWidths)>=190, `filtros estreitos demais em ${viewport.width}px: ${snapshot.selectWidths.join(', ')}`);
      assert.equal(snapshot.trustBar, true);
      assert.equal(snapshot.unavailableCopy, true);
      assert.equal(snapshot.overflow, false);
      assert.match(snapshot.visiblePositions, /^\d+\/\d+ posições$/);
      assert.ok(snapshot.headings.includes('Renda Fixa'));
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
