const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vercelSource = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

test('service worker owns a versioned cache and never clears app data', () => {
  assert.match(swSource, /SW_VERSION = 'v250\.2'/);
  assert.match(indexSource, /__EXPECTED_SERVICE_WORKER_CACHE__='carteira-investimentos-v250\.2'/);
  assert.match(swSource, /startsWith\(CACHE_PREFIX\)/);
  assert.doesNotMatch(swSource, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(swSource, /indexedDB\.deleteDatabase\s*\(/);
  assert.doesNotMatch(swSource, /caches\.keys\(\)\.then\(delete/);
  assert.match(indexSource, /register\('sw\.js',\{updateViaCache:'none'\}\)/);
});

test('hosting policy revalidates the worker and navigation shell', () => {
  const headers = Object.fromEntries(vercelSource.headers.map(rule => [rule.source, rule.headers]));
  for (const source of ['/sw.js', '/index.html']) {
    assert.deepEqual(headers[source], [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]);
  }
});

test('modern preview entry redirects around the Vite source index without replacing the legacy root', () => {
  assert.equal(vercelSource.outputDirectory, '.');
  assert.deepEqual(
    vercelSource.redirects.filter(rule => ['/modern', '/modern/'].includes(rule.source)),
    [
      { source: '/modern', destination: '/modern/dist/host.html', permanent: false },
      { source: '/modern/', destination: '/modern/dist/host.html', permanent: false },
    ],
  );
  assert.ok(vercelSource.rewrites.some(rule => (
    rule.source === '/modern/assets/(.*)' && rule.destination === '/modern/dist/assets/$1'
  )));
});

test('old release to new release clears only the old app cache', { skip: !resolveBrowser(), skipReason: 'Chrome/Edge ausente; lifecycle real executa no step de reliability com navegador provisionado' }, async () => {
  const { chromium } = await import('playwright-core');
  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'navegador resolvido obrigatorio quando o teste executa');
  let release = 'A';
  const oldWorker = swSource.replace("SW_VERSION = 'v250.2'", "SW_VERSION = 'v17'") + '\n// release A';
  const newWorker = swSource + '\n// release B';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    res.setHeader('Content-Type', url.pathname === '/sw.js' || url.pathname === '/fixture.js' ? 'text/javascript' : 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') return res.end(release === 'A' ? oldWorker : newWorker);
    if (url.pathname === '/fixture.js') return res.end(`document.body.dataset.release='${release}';`);
    return res.end(`<!doctype html><h1>Release ${release}</h1><script src="/fixture.js"></script><script>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  let context;
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then(Boolean));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.body.dataset.release), 'A');
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['carteira-investimentos-v17']);

    release = 'B';
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    await page.evaluate(async () => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const reg = await navigator.serviceWorker.getRegistration();
        const keys = await caches.keys();
        if (keys.includes('carteira-investimentos-v250.2') && !keys.includes('carteira-investimentos-v17')) return;
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('service worker waiting/activation timeout');
    });
    await page.waitForFunction(() => caches.keys().then(keys => (
      keys.includes('carteira-investimentos-v250.2') && !keys.includes('carteira-investimentos-v17')
    )));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.body.dataset.release), 'B');
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['carteira-investimentos-v250.2']);
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(() => resolve()));
  }
});
