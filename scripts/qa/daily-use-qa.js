'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../../tests/local-http-server');
const { applyV289VisualFixture } = require('../../tests/helpers/v289-visual-fixtures');
const ROOT = path.resolve(__dirname, '../..');
const ROUTES = ['dashboard', 'patrimonio', 'ativos', 'dividendos', 'renda-fixa', 'metas', 'settings'];
const WIDTHS = [320, 360, 390, 430, 768, 1024, 1366, 1440, 1536, 1920];

async function runDailyUseQa(label = 'current') {
  assert.match(label, /^[a-z0-9-]+$/);
  const output = path.join(ROOT, '.qa-state/mega19', label);
  fs.mkdirSync(output, { recursive: true });
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  const listenerCounts = async () => {
    const counts = {};
    for (const expression of ['window','document']) {
      const {result} = await session.send('Runtime.evaluate',{expression});
      counts[expression] = (await session.send('DOMDebugger.getEventListeners',{objectId:result.objectId})).listeners.length;
    }
    return counts;
  };
  const errors = [], warnings = [], failures = [];
  page.on('pageerror', error => errors.push(error.name));
  page.on('console', message => { if (message.type() === 'error') errors.push('console'); if (message.type() === 'warning') warnings.push('console'); });
  page.on('requestfailed', request => { if (request.url().startsWith(new URL(harness.url).origin)) failures.push('local-request'); });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(harness.url).origin ? route.continue() : route.abort());
  await page.addInitScript(() => {
    window.__DAILY_LONG_TASKS__ = [];
    new PerformanceObserver(list => window.__DAILY_LONG_TASKS__.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true });
  });
  try {
    const url = harness.url + '&testReadOnly=1';
    const boot = async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'));
      return page.evaluate(() => ({ usableMs: performance.now(), domNodes: document.querySelectorAll('*').length, requests: performance.getEntriesByType('resource').length, cacheHits: performance.getEntriesByType('resource').filter(entry => entry.transferSize === 0 && entry.decodedBodySize > 0).length }));
    };
    const cold = await boot();
    const warm = await boot();
    await applyV289VisualFixture(page);
    const listenersAtBoot = await listenerCounts();
    const routes = [];
    for (const route of ROUTES) {
      const samples = [];
      for (let i = 0; i < 3; i++) samples.push(await page.evaluate(route => { const start = performance.now(); go(route); return performance.now() - start; }, route));
      routes.push({ route, medianRenderMs: samples.sort((a,b) => a-b)[1], domNodes: await page.locator('*').count() });
      assert.equal(await page.evaluate(() => S.tab), route, 'navigation must reach ' + route);
    }
    await page.evaluate(() => go('ativos'));
    await page.getByRole('searchbox', { name: 'Buscar ativo por ticker ou nome', exact: true }).fill('QAAA');
    await page.waitForFunction(() => S.assetsSearch === 'qaaa');
    assert.ok(await page.getByText('QAAA3', { exact: true }).count() > 0);
    await page.getByRole('button', { name: 'Detalhes', exact: true }).first().click();
    await page.getByRole('button', { name: 'Voltar para a tela anterior', exact: true }).click();
    assert.equal(await page.evaluate(() => S.tab), 'ativos');
    await page.getByRole('searchbox', { name: 'Buscar ativo por ticker ou nome', exact: true }).fill('');
    await page.waitForFunction(() => S.assetsSearch === '');
    await page.getByRole('button', { name: /^Filtros / }).click();
    await page.getByRole('checkbox', { name: 'FIIs', exact: true }).check();
    assert.ok(await page.getByText('QAFI11', { exact: true }).count() > 0);
    await page.getByRole('checkbox', { name: 'Todos os tipos', exact: true }).check();
    await page.evaluate(() => go('dividendos'));
    await page.getByRole('group', { name: 'Filtrar por ano', exact: true }).getByRole('button', { name: 'Todos', exact: true }).click();
    await page.evaluate(() => go('renda-fixa'));
    await page.getByRole('combobox', { name: 'Ordenar posições de renda fixa', exact: true }).selectOption('maturity-asc');
    await page.evaluate(() => go('settings'));
    await page.evaluate(() => go('dashboard'));
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    // Initialize browser/Axe instrumentation before measuring repeated app navigation.
    await page.evaluate(() => axe.run(document));
    const listenersBefore = await listenerCounts();
    const layouts = [];
    const accessibility = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => applyTheme(theme), theme);
        await page.waitForTimeout(250); // The product transitions theme colors for 200ms.
        for (const route of ROUTES) {
          await page.evaluate(route => go(route), route);
          const layout = await page.evaluate(() => {
            const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
            const targets = [...document.querySelectorAll('#investBottomNav button,.assets-premium-filter-btn,.assets-premium-sort select,.premium-rf-filter-toggle,.premium-rf-controls input,.premium-rf-controls select,.premium-rf-row-actions button')].filter(element => element.getBoundingClientRect().height > 0);
            return { overflow: document.documentElement.scrollWidth > innerWidth, duplicateIds: ids.filter((id,i) => ids.indexOf(id) !== i), shortEssentialTargets: targets.filter(element => {const rect=element.getBoundingClientRect();return rect.height<44 || rect.width<44;}).map(element=>element.className) };
          });
          layouts.push({ width, theme, route, ...layout });
          if ([390,1366].includes(width)) accessibility.push({ width, theme, route, ...(await page.evaluate(async () => {
            const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } });
            return { critical:result.violations.filter(item=>item.impact==='critical').map(item=>item.id), serious:result.violations.filter(item=>item.impact==='serious').map(item=>({id:item.id,selectors:item.nodes.flatMap(node=>node.target)})) };
          })) });
          if (['before','after'].includes(label) && [390,768,1366,1920].includes(width)) await page.screenshot({ path: path.join(output, `${route}-${width}-${theme}.png`) });
        }
      }
    }
    await page.evaluate(() => go('dashboard'));
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !/\bsrc\s*=/.test(match[1]));
    const report = { mode: 'SYNTHETIC_READONLY_NOT_HOSTED_AUTH', htmlBytes: Buffer.byteLength(html), inlineJsBytes: inlineScripts.reduce((sum,match) => sum+Buffer.byteLength(match[2]),0), inlineJsLines: inlineScripts.reduce((sum,match) => sum+match[2].split('\n').length,0), cold, warm, routes, layouts, consoleErrors: errors.length, consoleWarnings: warnings.length, localRequestFailures: failures.length, longTasks: await page.evaluate(() => window.__DAILY_LONG_TASKS__), dailyUseSearch: 'PASS' };
    report.accessibility = accessibility;
    report.listeners = { boot:listenersAtBoot, before:listenersBefore, after:await listenerCounts() };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)+'\n');
    assert.equal(errors.length, 0, 'daily-use must not emit console/page errors');
    assert.equal(failures.length, 0, 'local requests must succeed');
    assert.ok(layouts.every(item=>!item.overflow), 'routes must not overflow at 320–1920px');
    assert.ok(layouts.every(item=>!item.duplicateIds.length), 'rendered IDs must be unique');
    assert.ok(layouts.every(item=>!item.shortEssentialTargets.length), 'essential controls must meet the 44px touch target');
    assert.ok(accessibility.every(item=>!item.critical.length&&!item.serious.length), 'Axe must have zero critical and serious findings');
    assert.deepEqual(report.listeners.after,report.listeners.before,'navigation must not accumulate global listeners');
    return report;
  } finally {
    await browser.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
}
module.exports = { runDailyUseQa };
if (require.main === module) runDailyUseQa(process.argv[2] || 'current').then(report => console.log(JSON.stringify({ cold:report.cold, warm:report.warm, routes:report.routes, overflow:report.layouts.filter(item=>item.overflow), duplicates:report.layouts.filter(item=>item.duplicateIds.length), consoleErrors:report.consoleErrors },null,2))).catch(error=>{ console.error(error.message); process.exitCode=1; });
