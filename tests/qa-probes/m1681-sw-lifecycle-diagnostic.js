// M1681 — Diagnóstico instrumentado do ciclo SW old release → new release
// Registra: install, waiting, activate, controllerchange, caches, estado do reg.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const currentVersion = swSource.match(/var SW_VERSION = '([^']+)'/)?.[1];
console.log('SW_VERSION no sw.js:', currentVersion);

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(c => { try { fs.accessSync(c); return true; } catch { return false; } });
}

(async () => {
  const executablePath = resolveBrowser();
  if (!executablePath) { console.log('SEM NAVEGADOR'); process.exit(2); }
  const { chromium } = await import('playwright-core');

  const oldWorker = swSource.replace("var SW_VERSION = '" + currentVersion + "'", "var SW_VERSION = 'v17'") + '\n// release A';
  let release = 'A';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    console.log(`  [server ${release}] ${req.method} ${url.pathname}`);
    res.setHeader('Content-Type', url.pathname === '/sw.js' || url.pathname === '/fixture.js' ? 'text/javascript' : 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') return res.end(release === 'A' ? oldWorker : swSource + '\n// release B');
    if (url.pathname === '/fixture.js') return res.end("document.body.dataset.release='" + release + "';");
    return res.end(`<!doctype html><h1>Release ${release}</h1><script src="/fixture.js"></script><script>
navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(reg){
  function logState(tag){
    Promise.all([reg.installing, reg.waiting, reg.active].map(function(s){return s ? s.state : 'null';})).then(function(states){
      console.log('[PAGE-SW] ' + tag + ' installing=' + states[0] + ' waiting=' + states[1] + ' active=' + states[2] + ' controller=' + (navigator.serviceWorker.controller ? 'YES' : 'null'));
    });
  }
  reg.addEventListener('updatefound', function(){ console.log('[PAGE-SW] updatefound'); logState('updatefound'); });
  reg.installing && reg.installing.addEventListener('statechange', function(e){ console.log('[PAGE-SW] installing worker statechange -> ' + e.target.state); logState('statechange'); });
  reg.active && reg.active.addEventListener('statechange', function(e){ console.log('[PAGE-SW] active worker statechange -> ' + e.target.state); });
  navigator.serviceWorker.addEventListener('controllerchange', function(){ console.log('[PAGE-SW] controllerchange'); });
  logState('registered');
}).catch(function(e){ console.log('[PAGE-SW] register FAILED: ' + e.message); });
</script>`);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';

  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', m => console.log('  [console] ' + m.type() + ': ' + m.text()));
  page.on('pageerror', e => console.log('  [pageerror] ' + e.message));

  try {
    console.log('--- FASE A: goto inicial');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then(Boolean), null, { timeout: 30000 });
    console.log('--- FASE A: registrado');
    await new Promise(r => setTimeout(r, 3000)); // dar tempo a install/activate
    const stateA = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        installing: reg.installing ? reg.installing.state : null,
        waiting: reg.waiting ? reg.waiting.state : null,
        active: reg.active ? reg.active.state : null,
        controller: !!navigator.serviceWorker.controller,
        caches: await caches.keys(),
      };
    });
    console.log('--- FASE A estado:', JSON.stringify(stateA));

    console.log('--- reload 1');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    const ctrl1 = await page.evaluate(() => !!navigator.serviceWorker.controller);
    console.log('--- controller após reload 1:', ctrl1);
    const keys1 = await page.evaluate(() => caches.keys());
    console.log('--- caches após reload 1:', JSON.stringify(keys1));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise(r => server.close(() => r()));
  }
  console.log('--- DIAGNÓSTICO CONCLUÍDO');
})().catch(e => { console.log('FALHA DO DIAGNÓSTICO: ' + e.message); process.exit(1); });