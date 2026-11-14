'use strict';
// SM156 — R1 (SDK parcial/tardio) e R2 (falha de SDK recuperável). Chrome real com SDKs simulados (mocks) e
// servidor local. Nenhuma rede externa: todo tráfego fora do servidor local e dos três SDKs é abortado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');

const repo = path.join(__dirname, '..');
const { resolveChromePath } = require('./helpers/chrome-path');
// Ausência de navegador falha de forma explícita (regra do helper): nunca vira teste pulado.
const EXE = resolveChromePath();
const SDK = { app: 'firebase-app-compat.js', auth: 'firebase-auth-compat.js', firestore: 'firebase-firestore-compat.js' };

// Mocks mínimos: app registra inicializações, auth registra assinaturas e chamadas; firestore expõe a instância.
const MOCK = {
  app: `(function(){window.firebase=window.firebase||{};window.firebase.apps=window.firebase.apps||[];
window.firebase.initializeApp=function(c){window.__INIT__=(window.__INIT__||0)+1;var a={name:'[DEFAULT]',options:c};window.firebase.apps.push(a);return a;};})();`,
  auth: `(function(){var A={currentUser:null,
onAuthStateChanged:function(cb){window.__SUBS__=(window.__SUBS__||0)+1;setTimeout(function(){cb(null);},0);return function(){};},
onIdTokenChanged:function(cb){setTimeout(function(){cb(null);},0);return function(){};},
setPersistence:function(){return Promise.resolve();},signOut:function(){return Promise.resolve();},
signInWithEmailAndPassword:function(){return Promise.reject(new Error('mock'));}};
window.firebase.auth=function(){window.__AUTHCALLS__=(window.__AUTHCALLS__||0)+1;return A;};window.firebase.auth.Auth={Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'}};})();`,
  firestore: `(function(){var D={collection:function(){return D},doc:function(){return D},where:function(){return D},orderBy:function(){return D},limit:function(){return D},
enablePersistence:function(){return Promise.resolve()},settings:function(){},onSnapshot:function(){return function(){}},
get:function(){return Promise.resolve({exists:false,data:function(){return null}})},set:function(){return Promise.resolve()},update:function(){return Promise.resolve()},useEmulator:function(){}};
window.firebase.firestore=function(){return D};window.firebase.firestore.FieldValue={serverTimestamp:function(){return null},arrayUnion:function(){return null},increment:function(){return null}};})();`,
};

function serveRepo(port) {
  return http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(repo, rel);
    if (!file.startsWith(repo) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
  }).listen(port, '127.0.0.1');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// plan: { app|auth|firestore: { delay, fail: 'always'|'once'|null } }; hang = nunca responde.
async function scenario(browser, port, plan, { settleMs = 14000, offlineStart = false, goOnlineAt = null, checkAt = null } = {}) {
  const origin = `http://127.0.0.1:${port}`;
  const server = serveRepo(port);
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1366, height: 768 } });
  const seen = { app: 0, auth: 0, firestore: 0 };
  const failedOnce = { app: false, auth: false, firestore: false };
  let offline = offlineStart;
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    const key = Object.keys(SDK).find(k => url.includes(SDK[k]));
    if (!key || !url.includes('gstatic.com')) return route.abort('blockedbyclient');
    if (offline) return route.abort('internetdisconnected');
    seen[key]++;
    const cfg = plan[key] || {};
    if (cfg.hang) return;                       // nunca responde
    if (cfg.fail === 'always' || (cfg.fail === 'once' && !failedOnce[key])) { failedOnce[key] = true; return route.abort('failed'); }
    await sleep(cfg.delay || 0);
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK[key] });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  if (goOnlineAt !== null) {
    await sleep(goOnlineAt);
    offline = false;                          // a conexão volta: as requisições do SDK passam a funcionar
    await page.evaluate(() => window.dispatchEvent(new Event('online'))).catch(() => {});
  }
  if (checkAt !== null) await sleep(checkAt);
  await sleep(settleMs);
  const state = await page.evaluate(() => {
    const fb = typeof FB !== 'undefined' ? FB : null;
    return {
      initCount: window.__INIT__ || 0,
      authSubs: window.__SUBS__ || 0,
      hasApp: !!(fb && fb.app), hasAuth: !!(fb && fb.auth), hasDb: !!(fb && fb.db),
      authResolved: fb ? fb.authResolved : null,
      allowed: fb ? fb.access.allowed : null,
      accountMode: fb ? fb.accountMode : null,
      reason: fb ? fb.access.reason : null,
    };
  });
  await ctx.close();
  server.close();
  return { state, seen, errors };
}

// Estado final esperado de uma sessão recuperada: login disponível, sem acesso concedido, sem duplicação.
function assertRecoveredLoginReady(state) {
  assert.equal(state.hasApp, true, 'FB.app deve existir');
  assert.equal(state.hasAuth, true, 'FB.auth deve ser recuperado');
  assert.equal(state.hasDb, true, 'FB.db deve ser recuperado');
  assert.equal(state.authResolved, true);
  assert.equal(state.accountMode, 'LOGIN_REQUIRED', 'deve voltar ao login normal, não AUTH_FAILURE');
  assert.equal(state.allowed, false, 'nenhum acesso concedido sem autenticação');
  assert.equal(state.initCount, 1, 'Firebase App inicializado uma única vez');
  assert.equal(state.authSubs, 1, 'uma única assinatura de autenticação');
}

test('R1 tudo rápido: inicialização normal, sem duplicação', async t => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4641, { app: { delay: 0 }, auth: { delay: 0 }, firestore: { delay: 0 } }, { settleMs: 3000 });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R1 App antes de 8 s; Auth e Firestore depois do timeout: recupera sem recarga', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4642, { app: { delay: 500 }, auth: { delay: 9500 }, firestore: { delay: 9700 } });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R1 Auth antes de 8 s; Firestore depois do timeout: recupera sem recarga', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4643, { app: { delay: 0 }, auth: { delay: 0 }, firestore: { delay: 9500 } });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R1 todos depois de 8 s: recupera sem recarga', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4644, { app: { delay: 9500 }, auth: { delay: 9500 }, firestore: { delay: 9500 } });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R1 rede sem resposta: nenhum acesso concedido e nenhuma inicialização', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4645, { app: { hang: true }, auth: { hang: true }, firestore: { hang: true } }, { settleMs: 12000 });
    assert.equal(r.state.allowed, false, 'sem SDK não há acesso');
    assert.equal(r.state.hasAuth, false);
    assert.equal(r.state.initCount, 0);
  } finally { await browser.close(); }
});

test('R1 repetição da inicialização: chamadas extras não duplicam app, listeners nem assinaturas', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const origin = 'http://127.0.0.1:4646';
  const server = serveRepo(4646);
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      const key = Object.keys(SDK).find(k => url.includes(SDK[k]));
      if (!key || !url.includes('gstatic.com')) return route.abort('blockedbyclient');
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK[key] });
    });
    const page = await ctx.newPage();
    await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await page.evaluate(() => { window.initFirebase(); window.initFirebase(); window.initFirebase(); });
    await sleep(1000);
    const state = await page.evaluate(() => ({ initCount: window.__INIT__, authSubs: window.__SUBS__, authCalls: window.__AUTHCALLS__ }));
    assert.equal(state.initCount, 1, 'initializeApp não pode repetir');
    assert.equal(state.authSubs, 1, 'onAuthStateChanged não pode assinar de novo');
    assert.equal(state.authCalls, 1, 'firebase.auth() não pode ser recriado');
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});

test('R2 falha de App (uma vez): recupera automaticamente sem recarga', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4647, { app: { fail: 'once' }, auth: { delay: 0 }, firestore: { delay: 0 } });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R2 falha de Auth (uma vez): recupera automaticamente sem recarga', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4648, { app: { delay: 0 }, auth: { fail: 'once' }, firestore: { delay: 0 } });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R2 falha de Firestore (uma vez): recupera automaticamente sem recarga', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4649, { app: { delay: 0 }, auth: { delay: 0 }, firestore: { fail: 'once' } });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});

test('R2 falha permanente: retentativas limitadas, sem loop, e estado de falha sem acesso', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4650, { app: { delay: 0 }, auth: { fail: 'always' }, firestore: { delay: 0 } }, { settleMs: 14000 });
    assert.equal(r.state.allowed, false, 'falha permanente não concede acesso');
    assert.equal(r.state.hasAuth, false);
    assert.ok(r.seen.auth >= 2, 'deve haver retentativa controlada (seen.auth=' + r.seen.auth + ')');
    assert.ok(r.seen.auth <= 3, 'sem loop: no máximo 3 tentativas por carregamento (seen.auth=' + r.seen.auth + ')');
    assert.match(String(r.state.reason || ''), /carregar|autentica|recarr|conex/i, 'estado de falha deve orientar a ação');
  } finally { await browser.close(); }
});

test('R2 queda de conectividade durante o carregamento do SDK: recupera ao voltar', async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  try {
    const r = await scenario(browser, 4651, { app: { delay: 0 }, auth: { delay: 0 }, firestore: { delay: 0 } }, { offlineStart: true, goOnlineAt: 3000, settleMs: 6000 });
    assertRecoveredLoginReady(r.state);
  } finally { await browser.close(); }
});
