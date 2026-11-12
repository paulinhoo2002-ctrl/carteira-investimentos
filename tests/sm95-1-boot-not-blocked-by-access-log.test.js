'use strict';
// SM95.1 — a escrita do log de acesso não pode bloquear a inicialização da nuvem.
// Firebase é substituído por stub local (sem rede): escrita pendente, leitura responde.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const chrome = require('./helpers/chrome-path').resolveChromePath();

const STUB = `
(function(){
  function ownerUser(){
    return { uid: (0,eval)('OWNER_FIREBASE_UID'), email: (0,eval)('OWNER_FIREBASE_EMAIL'), emailVerified: true, displayName: 'Sintetico', photoURL: '' };
  }
  var pending = function(){ return new Promise(function(){}); };
  var snapFn = function(cb){ setTimeout(function(){ cb({ exists: false, data: function(){ return {}; } }); }, 30); return function(){}; };
  var docRef = { set: pending, get: function(){ return Promise.resolve({ exists: false, data: function(){ return {}; } }); }, onSnapshot: snapFn };
  var colRef = { doc: function(){ return docRef; }, add: pending };
  var db = { collection: function(){ return colRef; }, enablePersistence: function(){ return Promise.resolve(); }, useEmulator: function(){} };
  var auth = {
    onAuthStateChanged: function(cb){ setTimeout(function(){ cb(ownerUser()); }, 0); return function(){}; },
    setPersistence: function(){ return Promise.resolve(); },
    signOut: function(){ return Promise.resolve(); },
    useEmulator: function(){}
  };
  var fb = function(){};
  fb.initializeApp = function(){ return {}; };
  fb.apps = [];
  fb.auth = function(){ return auth; };
  fb.auth.Auth = { Persistence: { LOCAL: 'LOCAL' } };
  fb.firestore = function(){ return db; };
  fb.firestore.FieldValue = { serverTimestamp: function(){ return 'ts'; }, increment: function(n){ return n; } };
  window.firebase = fb;
})();`;

async function openOwnerWithPendingAccessLog(run, stub = STUB) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.route(/gstatic\.com\/firebasejs\//, route => {
      if (/firebase-app-compat/.test(route.request().url())) return route.fulfill({ contentType: 'application/javascript', body: stub });
      return route.fulfill({ contentType: 'application/javascript', body: '' });
    });
    await page.route(/googleapis\.com|identitytoolkit/, route => route.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(harness.url.replace(/\?.*$/, ''), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => { try { return FB.authResolved === true; } catch (e) { return false; } }, null, { timeout: 15000 });
    await run(page);
    assert.deepEqual(errors, [], 'sem erros de página');
  } finally {
    await browser.close();
    harness.server.closeAllConnections();
    await new Promise(resolve => harness.server.close(resolve));
  }
}

test('escrita do log de acesso rejeitada não impede a sincronização e não gera rejeição não tratada', async () => {
  const rejectingStub = STUB.replace('set: pending,', "set: function(){ return Promise.reject(new Error('PERMISSION_DENIED sintetico')); },");
  assert.notEqual(rejectingStub, STUB);
  await openOwnerWithPendingAccessLog(async page => {
    await page.waitForFunction(() => { try { return !!FB.unsub; } catch (e) { return false; } }, null, { timeout: 5000 });
    const status = await page.evaluate(() => FB.cloudStateModel.status);
    assert.equal(status, 'EMPTY_CONFIRMED');
  }, rejectingStub);
});

test('escrita pendente do log de acesso não impede o início da sincronização com a nuvem', async () => {
  await openOwnerWithPendingAccessLog(async page => {
    await page.waitForFunction(() => { try { return !!FB.unsub; } catch (e) { return false; } }, null, { timeout: 5000 });
    const status = await page.evaluate(() => FB.cloudStateModel.status);
    assert.notEqual(status, 'AUTHENTICATING');
  });
});
