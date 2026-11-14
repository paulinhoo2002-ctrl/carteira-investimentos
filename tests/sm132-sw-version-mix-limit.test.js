'use strict';
// SM132 — caso limite: HTML B já recebido da rede, script A em cache, disjuntor ativo, depois rede travada >20 s ou offline.
// Mede o comportamento real; não presume resultado.
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };

const INDEX_A = '<!doctype html><html><head><script src="/app.js"></script></head><body><div id="ver">A</div></body></html>';
const INDEX_B = '<!doctype html><html><head><script src="/app.js"></script></head><body><div id="ver">B</div></body></html>';
const APP_A = 'window.appVersion="A";';
const APP_B = 'window.appVersion="B";';

function startServer() {
  let delayMs = 0;
  let delayPaths = [];
  let serveVersion = 'A';
  const hits = {};
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === '/__delay') {
      delayMs = Number(u.searchParams.get('ms') || 0);
      delayPaths = (u.searchParams.get('paths') || '').split(',').filter(Boolean);
      res.end('ok');
      return;
    }
    if (u.pathname === '/__version') {
      serveVersion = u.searchParams.get('v') || 'A';
      res.end('ok:' + serveVersion);
      return;
    }
    if (u.pathname === '/__hits') {
      res.end(String(hits[u.searchParams.get('path') || ''] || 0));
      return;
    }
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    if (p === '/sw.js') { res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-cache' }); res.end(require('fs').readFileSync(path.join(repo, 'sw.js'))); return; }
    hits[p] = (hits[p] || 0) + 1;
    const send = () => {
      let body;
      if (p === '/index.html') body = serveVersion === 'B' ? INDEX_B : INDEX_A;
      else if (p === '/app.js') body = serveVersion === 'B' ? APP_B : APP_A;
      // SM156 (R3): o SW exige todo o APP_SHELL. O fixture serve os demais recursos do shell com 200 (conteúdo neutro),
      // como uma aplicação real; um 404 aqui faria a instalação ser recusada e o teste aguardar um SW que nunca ativa.
      else body = '/* fixture asset */';
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    };
    if (delayMs && delayPaths.some(d => p.includes(d))) setTimeout(send, delayMs); else send();
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => server.close(),
  })));
}

async function withApp(browser, base, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  try { return await fn(page, ctx); } finally { await ctx.close(); }
}

async function setDelay(page, base, ms, paths) {
  await page.request.get(`${base}/__delay?ms=${ms}&paths=${paths}`);
}
async function setVersion(page, base, v) {
  await page.request.get(`${base}/__version?v=${v}`);
}

let server;
let browser;
test.before(async () => {
  server = await startServer();
  browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});


async function prime(page) {
  await setVersion(page, server.base, 'A');
  await setDelay(page, server.base, 0, '');
  await page.goto(`${server.base}/`, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready));
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1000);
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'SW real deve controlar a página');
  assert.equal((await readApp(page)).ver, 'A'); // popula o cache com app.js A
  // disjuntor ativo: navegação travada
  await setDelay(page, server.base, 30000, 'index.html');
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1000);
  // HTML B já recebido da rede
  await setDelay(page, server.base, 0, '');
  await setVersion(page, server.base, 'B');
  return 'B';
}
const readApp = page => page.evaluate(async () => {
  const t0 = Date.now();
  try { const r = await fetch('/app.js', { cache: 'no-store' }); const m = (await r.text()).match(/appVersion="([AB])"/); return { ver: m && m[1], status: r.status, ms: Date.now() - t0 }; }
  catch (e) { return { ver: null, error: String(e), ms: Date.now() - t0 }; }
});

// Navegação real recebe HTML B; o script app.js B fica pendente (rede travada) enquanto A está em cache.
async function reloadWithHungScript(page, hangMs) {
  await setDelay(page, server.base, hangMs, 'app.js');
  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => document.getElementById('ver') && document.getElementById('ver').textContent === 'B', null, { timeout: 15000 });
}
const pageState = page => page.evaluate(() => ({ html: document.getElementById('ver').textContent, js: window.appVersion || null }));

test('HTML B recebido + rede trava >20 s no script: nunca HTML B com JS A', { timeout: 90000 }, async () => {
  await withApp(browser, server.base, async page => {
    await prime(page);
    await reloadWithHungScript(page, 40000);
    await page.waitForTimeout(25000);
    const st = await pageState(page);
    console.log('[SM132 limite travada>20s]', JSON.stringify(st));
    assert.ok(!(st.html === 'B' && st.js === 'A'), 'mistura HTML B + JS A');
  });
});

test('HTML B recebido + rede offline: nunca HTML B com JS A', { timeout: 60000 }, async () => {
  await withApp(browser, server.base, async (page, ctx) => {
    await prime(page);
    await reloadWithHungScript(page, 40000);
    await ctx.setOffline(true);
    await page.waitForTimeout(3000);
    const st = await pageState(page);
    console.log('[SM132 limite offline]', JSON.stringify(st));
    assert.ok(!(st.html === 'B' && st.js === 'A'), 'mistura HTML B + JS A');
  });
});

test('offline puro (HTML e JS do mesmo cache A) continua funcionando', { timeout: 60000 }, async () => {
  await withApp(browser, server.base, async (page, ctx) => {
    await prime(page);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    const st = await pageState(page);
    console.log('[SM132 offline puro]', JSON.stringify(st));
    assert.deepEqual(st, { html: 'A', js: 'A' });
  });
});
