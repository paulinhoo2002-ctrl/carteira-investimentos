const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vercelSource = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

test('service worker owns a versioned cache and never clears app data', () => {
  assert.match(swSource, /carteira-investimentos-v18/);
  assert.match(swSource, /startsWith\('carteira-investimentos-'\)/);
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

test('old release to new release clears only the old app cache', async () => {
  const { chromium } = await import('playwright-core');
  let release = 'A';
  const oldWorker = swSource.replace('carteira-investimentos-v18', 'carteira-investimentos-v17') + '\n// release A';
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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then(Boolean));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.body.dataset.release), 'A');
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['carteira-investimentos-v17']);

    release = 'B';
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then(reg => Boolean(reg.waiting)));
    await page.evaluate(async () => { (await navigator.serviceWorker.getRegistration()).waiting.postMessage({ type: 'SKIP_WAITING' }); });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.body.dataset.release), 'B');
    assert.deepEqual(await page.evaluate(() => caches.keys()), ['carteira-investimentos-v18']);
  } finally {
    await context.close();
    await browser.close();
    server.close();
  }
});
