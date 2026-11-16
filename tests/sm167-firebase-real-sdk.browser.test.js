'use strict';
// SM167 — SDK OFICIAL do Firebase (gstatic) com falha parcial e recuperação. A aplicação é montada a partir da cópia de
// trabalho com a identidade de homologação SINTÉTICA (mesma substituição do build). Nenhuma chamada de rede além do CDN
// do SDK: sem sign-in, sem emulador, sem produção. Falhas são injetadas no transporte do navegador, não no SDK.
// Requisito: Chrome instalado (resolveChromePath falha explicitamente se ausente; nunca pula).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');
const { applyHomologSubstitutions } = require('../scripts/homolog/build-homolog');

const repo = path.join(__dirname, '..');
const EXE = resolveChromePath();
const SDK_URLS = {
  app: 'firebase-app-compat.js',
  auth: 'firebase-auth-compat.js',
  firestore: 'firebase-firestore-compat.js',
};
const SDK_CFG = {
  apiKey: 'AIzaTESTFAKEKEYFORGUARD000000000000', authDomain: 'carteira-homolog-sm118.firebaseapp.com', projectId: 'carteira-homolog-sm118',
  storageBucket: 'carteira-homolog-sm118.firebasestorage.app', messagingSenderId: '735653105367', appId: '1:735653105367:web:testfake',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildLocalCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm167-app-'));
  fs.cpSync(repo, dir, {
    recursive: true,
    filter: src => !/[\\/](node_modules|\.git|output|modern|tests)([\\/]|$)/.test(src),
  });
  const source = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const html = applyHomologSubstitutions(source, {
    sdk: SDK_CFG, uid: 'SyntheticSm167Owner000001', email: 'sm167-owner@example.com', shortSha: 'sm167local000',
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return dir;
}

function serve(dir) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(dir, rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': file.endsWith('.js') || file.endsWith('.mjs') ? 'application/javascript' : file.endsWith('.json') ? 'application/json' : file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

// Falhas injetadas no transporte: 'once' aborta a primeira requisição do SDK, 'always' aborta todas.
async function openWithSdkFaults(browser, origin, faults) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1366, height: 768 } });
  const hits = { app: 0, auth: 0, firestore: 0 };
  const failedOnce = { app: false, auth: false, firestore: false };
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    if (!url.startsWith('https://www.gstatic.com/firebasejs/')) return route.abort('blockedbyclient');   // nada além do CDN do SDK
    const key = Object.keys(SDK_URLS).find(k => url.includes(SDK_URLS[k]));
    hits[key]++;
    const mode = faults[key];
    if (mode === 'always' || (mode === 'once' && !failedOnce[key])) { failedOnce[key] = true; return route.abort('failed'); }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message.slice(0, 160)));
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, hits };
}

const snapshot = page => page.evaluate(() => ({
  sdk: window.__FIREBASE_SDK_STATE__, apps: firebase.apps.length,
  hasAuth: !!(FB && FB.auth), hasDb: !!(FB && FB.db), bootstrapped: !!FB.bootstrapped, listeners: FB.listenersAttached === true,
  mode: FB.accountMode, allowed: FB.access.allowed, reason: FB.access.reason,
}));

async function waitComplete(page) {
  await page.waitForFunction(() => window.__FIREBASE_SDK_STATE__ === 'complete' && FB.bootstrapped === true, null, { timeout: 60000 }).catch(() => {});
  await sleep(500);
}

const SHARED = { dir: null, server: null, origin: null, browser: null };
test.before(async () => {
  SHARED.dir = buildLocalCopy();
  const s = await serve(SHARED.dir);
  SHARED.server = s.server; SHARED.origin = s.origin;
  SHARED.browser = await chromium.launch({ executablePath: EXE, headless: true });
});
test.after(async () => {
  if (SHARED.browser) await SHARED.browser.close();
  if (SHARED.server) SHARED.server.close();
  if (SHARED.dir) fs.rmSync(SHARED.dir, { recursive: true, force: true });
});

function assertInitialized(s, label) {
  assert.equal(s.sdk, 'complete', label + ': SDK completo');
  assert.equal(s.apps, 1, label + ': uma única Firebase App');
  assert.equal(s.hasAuth, true, label + ': Auth inicializado');
  assert.equal(s.hasDb, true, label + ': Firestore inicializado');
  assert.equal(s.bootstrapped, true, label + ': inicialização concluída');
  assert.equal(s.listeners, true, label + ': listeners anexados');
  assert.equal(s.mode, 'LOGIN_REQUIRED', label + ': login normal, sem AUTH_FAILURE');
  assert.equal(s.allowed, false, label + ': nenhum acesso sem autenticação');
}

test('SDK real: falha parcial de Auth (uma vez) recupera sem recarga', { timeout: 120000 }, async () => {
  const { ctx, page, hits } = await openWithSdkFaults(SHARED.browser, SHARED.origin, { auth: 'once' });
  await waitComplete(page);
  assertInitialized(await snapshot(page), 'auth-uma-vez');
  assert.ok(hits.auth >= 2, 'houve retentativa do SDK de auth (requisições=' + hits.auth + ')');
  assert.deepEqual(page.errors.filter(e => /ReferenceError|TypeError/.test(e)), [], 'sem erros de script');
  await ctx.close();
});

test('SDK real: falha parcial de Firestore (uma vez) recupera sem recarga', { timeout: 120000 }, async () => {
  const { ctx, page, hits } = await openWithSdkFaults(SHARED.browser, SHARED.origin, { firestore: 'once' });
  await waitComplete(page);
  assertInitialized(await snapshot(page), 'firestore-uma-vez');
  assert.ok(hits.firestore >= 2, 'houve retentativa do SDK de firestore');
  await ctx.close();
});

test('SDK real: falha parcial de App (uma vez) recupera sem recarga', { timeout: 120000 }, async () => {
  const { ctx, page, hits } = await openWithSdkFaults(SHARED.browser, SHARED.origin, { app: 'once' });
  await waitComplete(page);
  assertInitialized(await snapshot(page), 'app-uma-vez');
  assert.ok(hits.app >= 2, 'houve retentativa do SDK de app');
  await ctx.close();
});

test('SDK real: falha permanente de Auth: retentativas limitadas, estado de falha, sem acesso', { timeout: 180000 }, async () => {
  const { ctx, page, hits } = await openWithSdkFaults(SHARED.browser, SHARED.origin, { auth: 'always' });
  await sleep(15000);
  const s = await snapshot(page);
  assert.equal(s.allowed, false, 'falha permanente não concede acesso');
  assert.equal(s.hasAuth, false, 'sem Auth carregado');
  assert.ok(hits.auth >= 2 && hits.auth <= 3, 'retentativas limitadas (requisições=' + hits.auth + ')');
  assert.match(String(s.reason || ''), /carregar a autenticação/, 'estado de falha orienta a ação');
  await ctx.close();
});
