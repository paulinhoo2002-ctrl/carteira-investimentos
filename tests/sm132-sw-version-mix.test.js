'use strict';
// SM132 — risco de mistura de versões (HTML novo + JS antigo durante janela do disjuntor).
// Cenário:
//  1. Versão A carregada: scripts em cache.
//  2. Versão B publicada: mesmo URL de script, conteúdo novo.
//  3. Navegação recebe HTML B (rede saudável).
//  4. Timeout em recurso intermediário (>4s): disjuntor ativa (60s).
//  5. Scripts carregados durante a janela: cópia exata em cache (versão A) servida.
//  6. Comparar bytes/hash do script carregado com versões A e B.
// Se mistura ocorre (script A com HTML B), é defeito a corrigir.
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
  let serveVersion = 'A'; // 'A' | 'B'
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

test('mistura de versões: HTML B com script A durante janela do disjuntor (deve ser 200 com script B)', async () => {
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

    // 2. Versão B publicada (mesmo URL). Navegação recebe HTML B, script com delay 6s (>4s timeout).
    await setVersion(page, server.base, 'B');
    await setDelay(page, server.base, 6000, 'app.js');
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(300);
    const htmlVer = await page.evaluate(() => document.getElementById('ver')?.textContent);
    const appVer = await page.evaluate(() => new Promise(resolve => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (window.appVersion) { clearInterval(iv); resolve(window.appVersion); }
        if (Date.now() - t0 > 25000) { clearInterval(iv); resolve(null); }
      }, 100);
    }));
    console.log('[SM132 versão] HTML:', htmlVer, '| script carregado:', appVer);
    // Se mistura ocorrer: HTML B + script A (do cache durante degradação).
    // Correto: HTML B + script B (rede respondeu dentro do teto de 20s ou não houve degradação indevida).
    assert.equal(htmlVer, 'B', 'HTML deve ser versão B (navegação rede)');
    assert.equal(appVer, 'B', 'script deve ser versão B, não versão A do cache durante degradação');
  });
});
