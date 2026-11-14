'use strict';
// SM173 — isolamento do civ5 entre duas contas SINTÉTICAS no Auth e Firestore Emulators (somente localhost).
// A conta A é tratada como dono nesta página de teste: o UID e o e-mail do dono são substituídos no HTML SERVIDO
// (o mesmo tipo de substituição que o build de homologação faz). A conta B é uma conta comum (não dono).
// Verifica: B não lê, não grava, não sobrescreve nem sincroniza o civ5 de A; A volta com os dados intactos.
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const PROJECT = 'demo-carteira-qa-emulator';
const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8080';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MARK_A = 'ISO-SM173-DADO-DA-CONTA-A';
const EMAIL_A = 'sm173.a.synthetic@example.invalid';
const EMAIL_B = 'sm173.b.synthetic@example.invalid';
const PASS = `sm173-${randomUUID()}-ephemeral`;

let harness;
let browser;
const accounts = {};

async function signUp(email) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
    signal: AbortSignal.timeout(8000),
  });
  assert.equal(res.ok, true, `signUp ${email}: HTTP ${res.status}`);
  return res.json();
}

async function markEmailVerified(email, idToken) {
  const send = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(send.ok, true, 'sendOobCode');
  const list = await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`, { signal: AbortSignal.timeout(5000) })).json();
  const entry = (list.oobCodes || []).find(c => c.email === email);
  assert.ok(entry, `oobCode para ${email}`);
  const upd = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: entry.oobCode }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(upd.ok, true, 'accounts:update');
}

async function newAppPage() {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const requests = [];
  const pageErrors = [];
  const port = new URL(harness.url).port;
  const base = `http://127.0.0.1:${port}/`;
  // HTML servido com o dono de teste (conta A) no lugar do dono de produção/homologação.
  await page.route(url => url.origin === `http://127.0.0.1:${port}` && (url.pathname === '/' || url.pathname === '/index.html'), async route => {
    const res = await fetch(base);
    let html = await res.text();
    html = html.replace(/const OWNER_FIREBASE_UID = '[^']+';/, `const OWNER_FIREBASE_UID = '${accounts.a.uid}';`)
      .replace(/const OWNER_FIREBASE_EMAIL = '[^']+';/, `const OWNER_FIREBASE_EMAIL = '${EMAIL_A}';`);
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });
  await page.route(url => url.origin === AUTH || url.origin === FIRESTORE, route => route.continue());
  page.on('request', r => requests.push({ url: r.url(), method: r.method() }));
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`${base}?qaAuthEmulator=1&qaFirestoreEmulator=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof FB !== 'undefined' && FB.ready === true && FB.authResolved === true, null, { timeout: 30000 });
  return { context, page, requests, pageErrors };
}

async function signInWithEmail(page, email) {
  await page.evaluate(async ({ email, pass }) => {
    if (FB.user) await FB.auth.signOut();
    await FB.auth.signInWithEmailAndPassword(email, pass);
  }, { email, pass: PASS });
}

const readLocal = page => page.evaluate(() => ({
  civ5: localStorage.getItem('civ5'),
  owner: localStorage.getItem('civ5_owner'),
  pending: localStorage.getItem('civ5_pending_owner'),
  backup: localStorage.getItem('civ5_legacy_backup'),
}));

async function cloudDoc(page, uid) {
  return page.evaluate(async uid => {
    const s = await FB.db.collection('portfolios').doc(uid).get({ source: 'server' });
    return s.exists ? s.data() : null;
  }, uid);
}

before(async () => {
  harness = await startLocalHttpServer(path.join(__dirname, '..'));
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const a = await signUp(EMAIL_A);
  const b = await signUp(EMAIL_B);
  await markEmailVerified(EMAIL_A, a.idToken);
  await markEmailVerified(EMAIL_B, b.idToken);
  accounts.a = { uid: a.localId, email: EMAIL_A };
  accounts.b = { uid: b.localId, email: EMAIL_B };
});

after(async () => {
  await browser?.close();
  if (harness?.server) {
    harness.server.closeAllConnections();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

test('SM173 duas contas sintéticas: B não lê, não grava e não sobrescreve o civ5 de A; A volta intacta', async () => {
  const app = await newAppPage();
  try {
    // 1) A (dono de teste) grava um lançamento e sincroniza.
    await signInWithEmail(app.page, EMAIL_A);
    await app.page.waitForFunction(() => FB.access.allowed === true && FB.cloudLoaded === true, null, { timeout: 40000 });
    await app.page.evaluate(mark => {
      S.aportes.push({ id: 'iso-sm173-a', ticker: mark, qty: 1, price: 10, date: '2026-11-14', operation: 'compra', type: 'Ação', sector: 'Teste' });
      save();
    }, MARK_A);
    await app.page.waitForFunction(() => FB.pendingCloudSave === false, null, { timeout: 40000 });
    const aLocal = await readLocal(app.page);
    assert.ok(aLocal.civ5 && aLocal.civ5.includes(MARK_A), 'A gravou no civ5');
    assert.ok(aLocal.owner, 'A vinculou o civ5 ao escopo');
    assert.equal(aLocal.pending, null, 'pendência limpa após envio confirmado');
    const aCloud = await cloudDoc(app.page, accounts.a.uid);
    assert.ok(aCloud && JSON.stringify(aCloud.aportes).includes(MARK_A), 'A sincronizou na própria nuvem');
    const before = aLocal.civ5;

    // 2) B entra: não é dono; não pode ler, gravar ou sobrescrever o civ5 de A.
    const requestsBeforeB = app.requests.length;
    await signInWithEmail(app.page, EMAIL_B);
    await app.page.waitForFunction(() => FB.user && FB.authResolved === true && FB.access.loaded === true, null, { timeout: 40000 });
    const bState = await app.page.evaluate(() => ({ allowed: FB.access.allowed, mode: FB.accountMode, text: document.body.innerText.slice(0, 4000) }));
    assert.equal(bState.allowed, false, 'B não recebe acesso de dono');
    assert.equal(bState.text.includes(MARK_A), false, 'B não vê o lançamento de A');
    const bLocalAfterLogin = await readLocal(app.page);
    assert.equal(bLocalAfterLogin.civ5, before, 'civ5 de A intacto após B entrar');
    assert.equal(bLocalAfterLogin.owner, aLocal.owner, 'vínculo de A intacto');
    const bWrite = await app.page.evaluate(() => { const ok = save(); return { ok, civ5Unchanged: localStorage.getItem('civ5') }; });
    assert.equal(bWrite.ok, false, 'B não consegue gravar no civ5 de A');
    assert.equal(bWrite.civ5Unchanged, before, 'gravação de B não altera o civ5 de A');
    const bUpload = await app.page.evaluate(() => uploadLocalToCloud(false));
    assert.ok(!(bUpload && bUpload.pass), 'B não envia dados locais');
    const bDoc = await cloudDoc(app.page, accounts.b.uid);
    assert.equal(bDoc, null, 'nenhum documento de B foi criado com dados de A');
    const requestsWhileB = app.requests.slice(requestsBeforeB).filter(r => r.url.includes(`/portfolios/${accounts.a.uid}`));
    assert.equal(requestsWhileB.length, 0, 'B não lê nem grava o documento de A');
    assert.equal(app.pageErrors.filter(m => /civ5|Cannot read/.test(m)).length, 0, 'sem erros de persistência em B');

    // 3) A volta: dados intactos, sem dados de B, sem duplicação.
    await signInWithEmail(app.page, EMAIL_A);
    await app.page.waitForFunction(() => FB.access.allowed === true && FB.cloudLoaded === true, null, { timeout: 40000 });
    const aBack = await readLocal(app.page);
    assert.equal(aBack.civ5, before, 'civ5 de A preservado após o retorno');
    const occurrences = (aBack.civ5.match(new RegExp(MARK_A, 'g')) || []).length;
    assert.equal(occurrences, 1, 'lançamento de A aparece uma vez (sem duplicação)');
    const aCloud2 = await cloudDoc(app.page, accounts.a.uid);
    const cloudCount = (JSON.stringify(aCloud2.aportes).match(new RegExp(MARK_A, 'g')) || []).length;
    assert.equal(cloudCount, 1, 'nuvem de A com um único lançamento');
  } finally {
    await app.context.close();
  }
});
