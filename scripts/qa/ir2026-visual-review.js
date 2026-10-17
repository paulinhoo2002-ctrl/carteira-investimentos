'use strict';
// Visual review: IRPF tab at 390/1366/1920, light+dark
const { startLocalHttpServer } = require('../../tests/local-http-server');
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join('.qa-state', 'ir2026', 'visual-review');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startLocalHttpServer(process.cwd(), 0, { syntheticQa: true });
  const url = server.url;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const viewports = [{ w: 390, h: 844 }, { w: 1366, h: 768 }, { w: 1920, h: 1080 }];
  const themes = ['light', 'dark'];
  const results = [];
  for (const theme of themes) {
    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      // Set theme via localStorage before reload
      await page.evaluate(t => { localStorage.setItem('theme', t); }, theme);
      await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
      // Navigate to IRPF tab
      await page.evaluate(() => { try { go('irpf'); } catch (e) { /* nav may differ */ } });
      await page.waitForTimeout(1500);
      // Check IRPF readiness panel is rendered
      const readiness = await page.evaluate(() => {
        const el = document.querySelector('.ir2026-readiness');
        if (!el) return { present: false };
        const text = el.innerText;
        return {
          present: true,
          hasBloqueada: text.includes('BLOQUEADA'),
          hasNaoCalculado: text.includes('Não calculado'),
          hasOverflow: el.scrollWidth > el.clientWidth,
          bodyOverflow: document.body.scrollWidth > window.innerWidth,
          hasR$0: text.includes('R$ 0,00'),
          hasPackage: text.includes('Package'),
          text: text.substring(0, 300),
        };
      });
      // Take screenshot
      const name = `irpf-${theme}-${vp.w}.png`;
      await page.screenshot({ path: path.join(OUT, name), fullPage: false });
      results.push({ theme, viewport: vp.w, ...readiness });
      await ctx.close();
    }
  }
  await browser.close();
  server.server.close();
  for (const r of results) {
    console.log(`\n=== ${r.theme.toUpperCase()} @ ${r.viewport}px ===`);
    console.log(`  present: ${r.present}`);
    if (r.present) {
      console.log(`  BLOQUEADA: ${r.hasBloqueada}`);
      console.log(`  Não calculado: ${r.hasNaoCalculado}`);
      console.log(`  overflow in panel: ${r.hasOverflow}`);
      console.log(`  body overflow: ${r.bodyOverflow}`);
      console.log(`  has R$ 0,00: ${r.hasR$0}`);
      console.log(`  has Package naming: ${r.hasPackage}`);
    }
  }
  console.log(`\nScreenshots saved to: ${OUT}`);
}

main().catch(e => { console.error('VISUAL REVIEW FAILED:', e.message); process.exit(1); });