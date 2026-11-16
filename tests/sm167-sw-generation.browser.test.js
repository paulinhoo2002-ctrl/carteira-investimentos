'use strict';
// SM167 — consistência de geração HTML/JS no navegador real com o sw.js DO REPOSITÓRIO (lógica intacta; só o APP_SHELL
// e a lista de caminhos críticos são trocados para um mini app). Cenários: atualização interrompida com e sem Date,
// atualização completa, e offline da mesma geração. Servidor local; nenhuma rede externa. Nunca pula por falta de Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const EXE = resolveChromePath();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function miniSw(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const sw = fs.readFileSync(path.join(repo, 'sw.js'), 'utf8')
    .replace(/var APP_SHELL = \[[\s\S]*?\];/, "var APP_SHELL = ['./', './index.html', './app.js'];")
    .replace(/var CRITICAL_RUNTIME_PATHS = new Set\(\[[\s\S]*?\]\);/, 'var CRITICAL_RUNTIME_PATHS = new Set([]);');
  fs.writeFileSync(path.join(outDir, 'sw.js'), sw);
  return sw;
}

function startApp(state) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      res.sendDate = !state.noDate;
      const p = req.url.split('?')[0];
      if (p === '/' || p === '/index.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
        return res.end(`<!doctype html><html><head><meta charset="utf-8"><title>G</title><script>window.GEN_HTML='${state.gen}';if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}</script></head><body><script src="./app.js"></script></body></html>`);
      }
      if (p === '/app.js') {
        const send = () => { res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-cache' }); res.end(`window.GEN_JS='${state.gen}';`); };
        if (state.interruptJsB && state.gen === 'B') {
          // Atualização interrompida: a conexão do script cai depois do prazo de rede do SW (4 s).
          return setTimeout(() => { try { req.socket.destroy(); } catch (_) {} }, 6000);
        }
        return send();
      }
      if (p === '/sw.js') { res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-cache' }); return res.end(state.swText); }
      res.writeHead(404); res.end();
    }).listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function scenario(browser, { noDate, interrupt, offlineAfter }) {
  const state = { gen: 'A', noDate, interruptJsB: false, swText: miniSw(fs.mkdtempSync(path.join(os.tmpdir(), 'sm167-sw-'))) };
  const { server, origin } = await startApp(state);
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  await ctx.route('**/*', route => (route.request().url().startsWith(origin) ? route.continue() : route.abort('blockedbyclient')));
  const page = await ctx.newPage();
  try {
    await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(4000);                                  // instala o SW com a geração A
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500); // navegação com SW ativo grava index A
    state.gen = 'B'; state.interruptJsB = !!interrupt;
    if (offlineAfter) {
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(9000);
      const online = await page.evaluate(() => ({ html: window.GEN_HTML ?? null, js: window.GEN_JS ?? null }));
      await ctx.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(5000);
      return { online, offline: await page.evaluate(() => ({ html: window.GEN_HTML ?? null, js: window.GEN_JS ?? null })) };
    }
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(interrupt ? 11000 : 6000);
    return { result: await page.evaluate(() => ({ html: window.GEN_HTML ?? null, js: window.GEN_JS ?? null })) };
  } finally {
    await ctx.close();
    server.close();
  }
}

test('atualização interrompida SEM Date e com marco: nunca HTML B com JS A (falha fechada)', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = (await scenario(browser, { noDate: true, interrupt: true })).result;
    assert.ok(!(r.html === 'B' && r.js === 'A'), 'mistura HTML B + JS A: ' + JSON.stringify(r));
    assert.equal(r.js, null, 'o script antigo não pode ser servido após a troca de geração sem Date');
  } finally { await browser.close(); }
});

test('atualização interrompida COM Date válido: nunca HTML B com JS A', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = (await scenario(browser, { noDate: false, interrupt: true })).result;
    assert.ok(!(r.html === 'B' && r.js === 'A'), 'mistura HTML B + JS A: ' + JSON.stringify(r));
  } finally { await browser.close(); }
});

test('atualização completa sem Date: HTML B + JS B', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = (await scenario(browser, { noDate: true, interrupt: false })).result;
    assert.deepEqual({ html: r.html, js: r.js }, { html: 'B', js: 'B' });
  } finally { await browser.close(); }
});

test('offline legítimo da mesma geração (sem marco): HTML A + JS A continuam abrindo', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const state = { gen: 'A', noDate: true, interruptJsB: false, swText: miniSw(fs.mkdtempSync(path.join(os.tmpdir(), 'sm167-sw-'))) };
    const { server, origin } = await startApp(state);
    const ctx = await browser.newContext({ serviceWorkers: 'allow' });
    await ctx.route('**/*', route => (route.request().url().startsWith(origin) ? route.continue() : route.abort('blockedbyclient')));
    const page = await ctx.newPage();
    try {
      await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
      await sleep(4000);
      await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
      await ctx.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(5000);
      const r = await page.evaluate(() => ({ html: window.GEN_HTML ?? null, js: window.GEN_JS ?? null, chars: (document.body.innerText || '').length }));
      assert.deepEqual({ html: r.html, js: r.js }, { html: 'A', js: 'A' }, 'offline da mesma geração deve funcionar');
    } finally { await ctx.close(); server.close(); }
  } finally { await browser.close(); }
});
