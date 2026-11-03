// M1111-M1112 — QA visual real: 8 telas principais em 4 resoluções
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWS = [
  { name: 'dashboard', call: "go('dashboard')" },
  { name: 'patrimonio', call: "go('patrimonio')" },
  { name: 'ativos', call: "go('ativos')" },
  { name: 'dividendos', call: "go('dividendos')" },
  { name: 'renda-fixa', call: "go('renda-fixa')" },
  { name: 'metas', call: "go('metas')" },
  { name: 'relatorios', call: "go('relatorios')" },
  { name: 'settings', call: "go('settings')" },
];

const VIEWPORTS = [
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'desktop_1366', width: 1366, height: 768 },
  { name: 'desktop_1920', width: 1920, height: 1080 },
];

const SCREENSHOT_DIR = path.join(ROOT, 'tests', 'screenshots', 'm1111_qa_visual');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const localOrigin = new URL(harness.url).origin;
    await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin || r.request().url().includes('cdn.jsdelivr') ? r.continue() : r.abort());
    await page.goto(harness.url, { waitUntil: 'load', timeout: 60000 });

    for (const view of VIEWS) {
      await page.evaluate(view.call);
      await page.waitForTimeout(1500);
      const fileName = `${view.name}_${vp.name}.png`;
      const filePath = path.join(SCREENSHOT_DIR, fileName);
      await page.screenshot({ path: filePath, fullPage: true });
      results.push({ view: view.name, viewport: vp.name, file: filePath, size: fs.statSync(filePath).size });
    }
    await context.close();
  }

  await browser.close();
  await new Promise(r => harness.server.close(r));
  console.log(JSON.stringify({ screenshots: results, total: results.length, dir: SCREENSHOT_DIR }, null, 1));
  process.exit(0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 200)); process.exit(1); });
