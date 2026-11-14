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
  assert.match(swSource, /SW_VERSION = 'v252\.0'/);
  assert.match(indexSource, /__EXPECTED_SERVICE_WORKER_CACHE__='carteira-investimentos-v252.0'/);
  assert.match(swSource, /cacheName\.startsWith\('carteira-investimentos-'\)/);
  assert.doesNotMatch(swSource, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(swSource, /indexedDB\.deleteDatabase\s*\(/);
  assert.doesNotMatch(swSource, /caches\.keys\(\)\.then\(delete/);
  assert.match(indexSource, /register\('sw\.js',\{updateViaCache:'none'\}\)/);
});

test('hosting policy revalidates the worker and navigation shell', () => {
  const headers = Object.fromEntries(vercelSource.headers.map(rule => [rule.source, rule.headers]));
  const headerMap = (list) => Object.fromEntries((list || []).map(h => [h.key, h.value]));

  // /sw.js: must never be cached and must allow root scope registration
  const sw = headerMap(headers['/sw.js']);
  assert.equal(sw['Cache-Control'], 'no-cache, no-store, must-revalidate');
  assert.equal(sw['Service-Worker-Allowed'], '/');

  // /index.html: no-cache plus the full security header set
  const idx = headerMap(headers['/index.html']);
  assert.equal(idx['Cache-Control'], 'no-cache, no-store, must-revalidate');
  assert.equal(idx['X-Content-Type-Options'], 'nosniff');
  assert.equal(idx['X-Frame-Options'], 'DENY');
  assert.equal(idx['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(idx['Permissions-Policy'], 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()');
  assert.match(idx['Content-Security-Policy'], /frame-ancestors\s+'none'/);
  assert.match(idx['Content-Security-Policy'], /base-uri\s+'self'/);
  assert.match(idx['Content-Security-Policy'], /form-action\s+'self'/);
  assert.match(idx['Content-Security-Policy'], /connect-src[^;]*firestore\.googleapis\.com/);
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
  const currentVersion = swSource.match(/var SW_VERSION = '([^']+)'/)?.[1];
  assert.ok(currentVersion, 'service worker version is declared');
  const currentStaticCache = 'carteira-investimentos-static-' + currentVersion;
  const currentDynamicCache = 'carteira-investimentos-dynamic-' + currentVersion;
  const currentApiCache = 'carteira-investimentos-api-' + currentVersion;
  const currentAnalyticsCache = 'carteira-investimentos-analytics-' + currentVersion;
  let release = 'A';
  const oldWorker = swSource.replace("var SW_VERSION = '" + currentVersion + "'", "var SW_VERSION = 'v17'") + '\n// release A';
  const newWorker = swSource + '\n// release B';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    res.setHeader('Content-Type', url.pathname === '/sw.js' || url.pathname === '/fixture.js' ? 'text/javascript' : 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') return res.end(release === 'A' ? oldWorker : newWorker);
    if (url.pathname === '/fixture.js') return res.end("document.body.dataset.release='" + release + "';");
    return res.end("<!doctype html><h1>Release " + release + "</h1><script src=\"/fixture.js\"></script><script>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});</script>");
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  let context;
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then(Boolean), null, { timeout: 60000 });
    // Race fix (BUG_TEST_HARNESS): esperar o worker ativar/claim ANTES do reload.
    // Se o reload iniciar antes da ativação, a navegação não é controlada e
    // navigator.serviceWorker.controller permanece null nessa instância da página.
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 });
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 });
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(await page.evaluate(() => document.body.dataset.release), 'A');
    const releaseAKeys = await page.evaluate(() => caches.keys());
    // Contrato real do SW v252: caches da família da versão antiga (static/analytics/dynamic de v17)
    assert.ok(releaseAKeys.length > 0, 'release A must have caches');
    for (const key of releaseAKeys) {
      assert.ok(key.endsWith('-v17'), 'release A cache must belong to the v17 family: ' + key);
    }
    assert.ok(releaseAKeys.includes('carteira-investimentos-static-v17'), 'release A static cache present');

    release = 'B';
    // Sinal determinístico de takeover: o claim do worker novo dispara controllerchange na página.
    await page.evaluate(() => {
      window.__swBClaimed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { window.__swBClaimed = true; }, { once: true });
    });
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    // Contrato real do SW v252: skipWaiting() é chamado DENTRO do install, então o
    // novo worker nunca permanece em waiting. Caches dynamic/api são lazy (criados
    // sob demanda pelo fetch handler); este fixture não faz requisições de API, e o
    // dynamicCache só nasce após uma navegação pelo worker novo. A condição
    // determinística de progresso é: staticCache novo presente E família v17 removida.
    await page.waitForFunction(({ staticCache }) => caches.keys().then(keys => (
      keys.includes(staticCache) && !keys.some(k => k.includes('v17'))
    )), { staticCache: currentStaticCache }, { timeout: 30000 });
    // Espera o claim do worker novo ANTES de recarregar: sem isso, o reload pode
    // navegar não-controlado (antes do clients.claim) e o dynamicCache nunca nasce.
    await page.waitForFunction(() => window.__swBClaimed === true, null, { timeout: 30000 });
    // Recarrega pela rota do novo worker: staleWhileRevalidate em '/' cria o dynamicCache novo.
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(await page.evaluate(() => document.body.dataset.release), 'B');
    const finalKeys = await page.evaluate(() => caches.keys());
    assert.ok(finalKeys.includes(currentStaticCache), 'static cache ' + currentStaticCache + ' present');
    assert.ok(finalKeys.includes(currentDynamicCache), 'dynamic cache ' + currentDynamicCache + ' present');
    assert.ok(finalKeys.includes(currentAnalyticsCache), 'analytics cache ' + currentAnalyticsCache + ' present');
    // apiCache é lazy e este fixture não dispara requisições de API: sua ausência aqui
    // é o comportamento esperado, não uma falha.
    assert.ok(!finalKeys.some(k => k.includes('v17')), 'old v17 caches cleared: ' + JSON.stringify(finalKeys));
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(() => resolve()));
  }
});