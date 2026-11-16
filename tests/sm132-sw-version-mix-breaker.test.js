'use strict';
// SM132 — risco de mistura de versões COM disjuntor já ativo.
// Cenário:
//  1. Versão A carregada: scripts em cache.
//  2. Rede travada → timeout na navegação → disjuntor ativo (60s).
//  3. Versão B publicada no servidor (mesmo URL de script).
//  4. Durante a janela de 60s do disjuntor, solicitar script com cópia em cache (versão A).
//  5. fetchNetworkWithTimeout retorna cache (A) porque Date.now() < networkDegradedUntil,
//     mesmo com a versão B disponível na rede → MISTURA HTML B + JS A.
const assert = require('node:assert/strict');
const fs = require('node:fs');
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
    hits[p] = (hits[p] || 0) + 1;
    const send = () => {
      let body;
      if (p === '/index.html') body = serveVersion === 'B' ? INDEX_B : INDEX_A;
      else if (p === '/app.js') body = serveVersion === 'B' ? APP_B : APP_A;
      else { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    };
    if (delayMs && delayPaths.some(d => p.includes(d))) setTimeout(send, delayMs); else send();
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    base: `http://127.0.0.1:${server.address().port}`,
    hits: p => hits[p] || 0,
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

test('mistura de versões com disjuntor ativo: script servido do cache (A) durante degradação com versão B na rede', async () => {
  await withApp(browser, server.base, async page => {
    // 1. Versão A: carregar página completa (SW instala, app.js v1 em cache)
    await setVersion(page, server.base, 'A');
    await setDelay(page, server.base, 0, '');
    await page.goto(`${server.base}/?testMode=1`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const v1 = await page.evaluate(() => window.appVersion);
    assert.equal(v1, 'A', 'primeira carga deve ser versão A');

    // 2. Ativar disjuntor: rede travada na navegação (delay 30s > 4s timeout).
    await setDelay(page, server.base, 30000, 'index.html');
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1000); // garantir que o disjuntor ativou (timeout de 4s + margem)

    // 3. Publicar versão B (mesmo URL) enquanto disjuntor está ativo (60s).
    await setVersion(page, server.base, 'B');
    await setDelay(page, server.base, 0, ''); // rede saudável para app.js, mas disjuntor impede consulta

    // 4. Solicitar app.js SEM cache-busting: cópia v1 em cache + disjuntor ativo →
    //    fetchNetworkWithTimeout retorna cache (A) porque Date.now() < networkDegradedUntil,
    //    mesmo com a versão B disponível na rede → MISTURA HTML B + JS A.
    const appVer = await page.evaluate(async () => {
      const t0 = Date.now();
      const r = await fetch('/app.js', { cache: 'no-store' }).then(async res => {
        const text = await res.text();
        const m = text.match(/appVersion="([AB])"/);
        return m ? m[1] : null;
      }).catch(() => null);
      return { ver: r, ms: Date.now() - t0 };
    });
    console.log('[SM132 versão-disjuntor] app.js durante degradação:', JSON.stringify(appVer));
    // Sem mistura: mesmo com disjuntor ativo, a rede é verificada (1 s) antes de
    // servir o cache. Versão B na rede => script B carregado, não a cópia A do cache.
    assert.equal(appVer.ver, 'B', 'script deve ser versão B (rede verificada antes de servir cache durante degradação)');
    assert.ok(appVer.ms < 12000, 'resposta deve ser rápida (rede ou cache): ' + appVer.ms + ' ms');
  });
});
