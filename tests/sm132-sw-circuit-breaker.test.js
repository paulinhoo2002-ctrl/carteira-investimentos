'use strict';
// SM132 — comportamento real do Service Worker com rede lenta/travada (não é grep).
// Servidor local com atraso controlável por caminho; Chrome real; Service Worker real.
// Regressão reproduzida: após um timeout de navegação, um recurso sem cópia em cache com rede saudável
// falhava na hora (Failed to fetch) durante 60 s. Esperado: responder 200 pela rede.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };

function startServer() {
  let delayMs = 0;
  let delayPaths = [];
  const hits = {}; // contagem de requisições que chegaram à origem, por caminho (prova de rede, não de cache)
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === '/__delay') {
      delayMs = Number(u.searchParams.get('ms') || 0);
      delayPaths = (u.searchParams.get('paths') || '').split(',').filter(Boolean);
      res.end('ok');
      return;
    }
    if (u.pathname === '/__hits') {
      res.end(String(hits[u.searchParams.get('path') || ''] || 0));
      return;
    }
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    hits[p] = (hits[p] || 0) + 1;
    const file = path.join(repo, p);
    const send = () => fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(data);
    });
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

async function primeServiceWorker(page, base) {
  await page.goto(`${base}/?testMode=1`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return page.evaluate(() => !!navigator.serviceWorker.controller);
}

async function probe(page, base, label) {
  return page.evaluate(async ({ b, label }) => {
    const t0 = performance.now();
    try {
      const r = await fetch(`${b}/manifest.json?probe=${label}-${Date.now()}`);
      return { ok: r.ok, status: r.status, ms: Math.round(performance.now() - t0) };
    } catch (error) {
      return { ok: false, error: String(error.message || error), ms: Math.round(performance.now() - t0) };
    }
  }, { b: base, label });
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

test('regressão: após timeout de navegação, recurso sem cache com rede saudável responde 200 (não Failed to fetch)', async () => {
  await withApp(browser, server.base, async page => {
    assert.equal(await primeServiceWorker(page, server.base), true, 'SW deve controlar a página');
    await setDelay(page, server.base, 5000, 'index.html'); // > NAV_NETWORK_TIMEOUT_MS
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await setDelay(page, server.base, 0, '');             // rede volta a responder normalmente
    await page.waitForTimeout(300);
    const first = await probe(page, server.base, 'after-timeout');
    console.log('[SM132 medição] recurso sem cache após timeout, rede saudável:', JSON.stringify(first));
    assert.equal(first.ok, true, `esperado 200 pela rede, obtido: ${JSON.stringify(first)}`);
    assert.equal(first.status, 200);
    // Após resposta válida, o disjuntor deve reabrir: a próxima requisição sem cache também responde rápido.
    const second = await probe(page, server.base, 'after-recovery');
    console.log('[SM132 medição] segunda requisição sem cache após recuperação:', JSON.stringify(second));
    assert.equal(second.ok, true, `esperado 200 após recuperação, obtido: ${JSON.stringify(second)}`);
    assert.ok(second.ms < 2000, `recuperação lenta: ${second.ms} ms`);
  });
});

test('rede continuamente travada: nenhuma espera indefinida; navegação cai no cache dentro do prazo', async () => {
  await withApp(browser, server.base, async page => {
    assert.equal(await primeServiceWorker(page, server.base), true);
    await setDelay(page, server.base, 30000, 'index.html,manifest.json');
    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    const navMs = Date.now() - t0;
    const rendered = await page.waitForFunction(() => (document.body.innerText || '').trim().length > 40, null, { timeout: 15000 }).then(() => true).catch(() => false);
    console.log('[SM132 medição] rede travada: navegação com cache em', navMs, 'ms; renderizou:', rendered);
    assert.equal(rendered, true, 'página deve renderizar a partir do cache com rede travada');
    assert.ok(navMs < 12000, `navegação esperou demais: ${navMs} ms`);
    const stuck = await probe(page, server.base, 'stuck');
    console.log('[SM132 medição] recurso sem cache com rede travada:', JSON.stringify(stuck));
    // Teto de 20 s para recurso sem cópia (UNCACHED_NETWORK_TIMEOUT_MS): nunca espera indefinidamente.
    assert.ok(stuck.ms < 25000, `requisição travada sem limite: ${stuck.ms} ms`);
    await setDelay(page, server.base, 0, '');
  });
});

test('cópia exata em cache responde durante a janela de degradação, sem esperar rede', async () => {
  await withApp(browser, server.base, async page => {
    assert.equal(await primeServiceWorker(page, server.base), true);
    await setDelay(page, server.base, 5000, 'index.html');
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await setDelay(page, server.base, 0, '');
    const cached = await page.evaluate(async b => {
      const t0 = performance.now();
      const r = await fetch(`${b}/manifest.json`);
      return { ok: r.ok, status: r.status, ms: Math.round(performance.now() - t0) };
    }, server.base);
    console.log('[SM132 medição] cópia exata em cache na janela de degradação:', JSON.stringify(cached));
    assert.equal(cached.ok, true);
    assert.ok(cached.ms < 1000, `cópia em cache demorou ${cached.ms} ms`);
  });
});

test('offline com cache aquecido: navegação renderiza', async () => {
  await withApp(browser, server.base, async (page, ctx) => {
    assert.equal(await primeServiceWorker(page, server.base), true);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    const rendered = await page.waitForFunction(() => (document.body.innerText || '').trim().length > 40, null, { timeout: 10000 }).then(() => true).catch(() => false);
    await ctx.setOffline(false);
    assert.equal(rendered, true, 'offline deve renderizar do cache');
  });
});

// SM132 — rede lenta acima de 4 s em recurso SEM cópia em cache (regressão medida: PR falhava em 4 s; main = 200).
for (const ms of [5000, 8000]) {
  test(`recurso sem cópia com rede lenta de ${ms} ms responde 200 (prazo de 4 s não pode derrubar script novo)`, async () => {
    await withApp(browser, server.base, async page => {
      assert.equal(await primeServiceWorker(page, server.base), true);
      await setDelay(page, server.base, ms, 'fase1c-export-hashes');
      const slow = await page.evaluate(async b => {
        const t0 = performance.now();
        try { const r = await fetch(`${b}/tests/fixtures/fase1c-export-hashes.json?slow=${Date.now()}`); const body = await r.text(); return { ok: r.ok, status: r.status, bytes: body.length, ms: Math.round(performance.now() - t0) }; }
        catch (error) { return { ok: false, error: String(error.message || error), ms: Math.round(performance.now() - t0) }; }
      }, server.base);
      await setDelay(page, server.base, 0, '');
      console.log(`[SM132 medição] rede lenta ${ms} ms, sem cópia:`, JSON.stringify(slow));
      assert.equal(slow.ok, true, `rede lenta de ${ms} ms derrubou o recurso: ${JSON.stringify(slow)}`);
      assert.equal(slow.status, 200);
    });
  });
}

// SM132 — navegação dentro da janela do disjuntor deve consultar a rede quando ela responde (não servir cópia até 60 s).
test('após timeout de navegação, a navegação seguinte consulta a rede saudável', async () => {
  await withApp(browser, server.base, async page => {
    assert.equal(await primeServiceWorker(page, server.base), true);
    await setDelay(page, server.base, 5000, 'index.html');
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(6000); // a resposta atrasada termina de chegar à origem
    await setDelay(page, server.base, 0, '');
    const before = server.hits('/index.html');
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1500);
    const after = server.hits('/index.html');
    console.log('[SM132 medição] navegação na janela do disjuntor: hits na origem', before, '→', after);
    assert.ok(after > before, 'navegação com rede saudável não consultou a origem (serviu cópia em cache dentro da janela)');
  });
});
