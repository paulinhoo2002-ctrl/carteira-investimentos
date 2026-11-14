'use strict';
// SM148 — cloud-sync-state.js deve estar no pré-cache do SW e carregar offline após instalação. Regressão do ReferenceError da SM147.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const repo = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(repo, 'sw.js'), 'utf8');

test('APP_SHELL inclui cloud-sync-state.js e o arquivo existe no repositório', () => {
  const block = sw.slice(sw.indexOf('var APP_SHELL = ['), sw.indexOf('];', sw.indexOf('var APP_SHELL = [')));
  assert.match(block, /'\.\/cloud-sync-state\.js'/);
  assert.ok(fs.existsSync(path.join(repo, 'cloud-sync-state.js')));
});

test('SW_VERSION e nomes de cache permanecem inalterados', () => {
  assert.match(sw, /var SW_VERSION = 'v252\.0';/);
});

test('após instalação do SW e recarga offline, CloudSyncState está disponível (navegador real)', { timeout: 120000 }, async () => {
  const { chromium } = require('playwright-core');
  const { resolveChromePath } = require('./helpers/chrome-path');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(repo, p);
    if (!f.startsWith(repo) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'allow', locale: 'pt-BR' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Primeira visita: o SW instala e assume a página sem que o script tenha passado pelo SW (mesmo cenário da SM147).
    await page.goto(base, { waitUntil: 'load' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(3000);
    assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true, 'SW deve controlar a página');
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2500);
    assert.equal(await page.evaluate(() => typeof window.CloudSyncState), 'object', 'CloudSyncState deve existir offline');
    assert.equal(errors.filter(m => /CloudSyncState/.test(m)).length, 0, 'sem ReferenceError de CloudSyncState: ' + errors.join(' | '));
    await ctx.setOffline(false);
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    assert.equal(await page.evaluate(() => typeof window.CloudSyncState), 'object', 'CloudSyncState deve existir após retorno da rede');
    assert.equal(errors.filter(m => /CloudSyncState/.test(m)).length, 0, 'sem ReferenceError após retorno da rede');
  } finally {
    await browser.close();
    server.close();
  }
});
