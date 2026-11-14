'use strict';
// SM173 — isolamento do civ5 entre duas contas SINTÉTICAS no Auth e Firestore Emulators (somente localhost).
// A conta A é tratada como dono SOMENTE neste harness: o UID e o e-mail do dono são substituídos no HTML servido
// (o mesmo tipo de substituição que o build de homologação faz). O código do app não é enfraquecido.
// A conta B é uma conta comum (não dono). Verifica: B não lê, não grava, não sobrescreve nem envia o civ5 de A;
// A volta com os dados intactos e sem duplicação; nenhuma requisição de B usa o documento de A.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright-core');

const PROJECT = 'demo-carteira-qa-emulator';
const AUTH = 'http://127.0.0.1:9099';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const RUN = randomUUID().slice(0, 8);
const EMAIL_A = `sm173.a.${RUN}@example.invalid`;
const EMAIL_B = `sm173.b.${RUN}@example.invalid`;
const PASS = `sm173-${RUN}-ephemeral`;
const MARK_A = `ISO-SM173-DADO-A-${RUN}`;

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

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };

// Servidor local próprio (127.0.0.1). O documento alterado (dono = conta A de teste) é servido por HTTP real,
// não por interceptação, para que o Chrome trate a página como origem local e permita as chamadas ao emulador.
function startAppServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/') rel = '/index.html';
      const file = path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end(); return; }
        let body = buf;
        if (rel === '/index.html') {
          let html = buf.toString('utf8');
          html = html.replace(/const OWNER_FIREBASE_UID = '[^']+';/, `const OWNER_FIREBASE_UID = '${accounts.a.uid}';`)
            .replace(/const OWNER_FIREBASE_EMAIL = '[^']+';/, `const OWNER_FIREBASE_EMAIL = '${EMAIL_A}';`);
          body = Buffer.from(html, 'utf8');
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function newAppPage() {
  const appServer = await startAppServer();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const requests = [];
  const pageErrors = [];
  page.on('request', r => requests.push({ url: r.url(), method: r.method() }));
  page.on('pageerror', e => pageErrors.push(e.message));
  const port = appServer.address().port;
  await page.goto(`http://127.0.0.1:${port}/?qaAuthEmulator=1&qaFirestoreEmulator=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof FB !== 'undefined' && FB.ready === true && FB.authResolved === true, null, { timeout: 30000 });
  return { context, page, requests, pageErrors, appServer };
}

async function signInWithEmail(page, email) {
  await page.evaluate(async ({ email, pass }) => {
    if (FB.user) await FB.auth.signOut();
    await FB.auth.signInWithEmailAndPassword(email, pass);
  }, { email, pass: PASS });
}

async function waitOwnerAllowed(page) {
  await page.waitForFunction(() => FB.access.allowed === true && FB.cloudLoaded === true, null, { timeout: 40000 });
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
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const a = await signUp(EMAIL_A);
  const b = await signUp(EMAIL_B);
  await markEmailVerified(EMAIL_A, a.idToken);
  await markEmailVerified(EMAIL_B, b.idToken);
  accounts.a = { uid: a.localId };
  accounts.b = { uid: b.localId };
});

after(async () => {
  await browser?.close();
});

test('SM173 duas contas sintéticas: B não lê, não grava e não sobrescreve o civ5 de A; A volta intacta', async () => {
  const app = await newAppPage();
  try {
    // 1) A (dono de teste) grava um lançamento e sincroniza.
    await signInWithEmail(app.page, EMAIL_A);
    await waitOwnerAllowed(app.page);
    await app.page.evaluate(mark => {
      S.aportes.push({ id: 'iso-sm173-a', ticker: mark, qty: 1, price: 10, date: '2026-11-14', operation: 'compra', type: 'Ação', sector: 'Teste' });
      save();
    }, MARK_A);
    await app.page.waitForFunction(() => FB.pendingCloudSave === false, null, { timeout: 40000 }).catch(async e => { const d = await app.page.evaluate(() => ({ pending: FB.pendingCloudSave, inFlight: FB.syncInFlight, cloudLoaded: FB.cloudLoaded, seq: FB.civ5EditSeq, lastErr: FB.lastCloudError ? String(FB.lastCloudError.message || FB.lastCloudError).slice(0, 200) : null, state: cloudSyncState().status, scope: CIV5_SCOPE ? 'set' : null, owner: localStorage.getItem('civ5_owner') ? 'set' : null, pendKey: localStorage.getItem('civ5_pending_owner') ? 'set' : null, pageErr: [] })); throw new Error('DIAG ' + JSON.stringify(d) + ' :: ' + e.message.slice(0, 120)); });
    const aLocal = await readLocal(app.page);
    assert.ok(aLocal.civ5 && aLocal.civ5.includes(MARK_A), 'A gravou no civ5');
    assert.ok(aLocal.owner, 'A vinculou o civ5 ao escopo');
    assert.equal(aLocal.pending, null, 'pendência limpa após envio confirmado');
    const aCloud = await cloudDoc(app.page, accounts.a.uid);
    assert.ok(aCloud && JSON.stringify(aCloud.aportes).includes(MARK_A), 'A sincronizou na própria nuvem');
    const aSnapshot = aLocal.civ5;

    // 2) B entra: não é dono; não pode ler, gravar ou sobrescrever o civ5 de A.
    const requestsBeforeB = app.requests.length;
    await signInWithEmail(app.page, EMAIL_B);
    await app.page.waitForFunction(() => FB.user && FB.authResolved === true && FB.access.loaded === true, null, { timeout: 40000 });
    const bAllowed = await app.page.evaluate(() => FB.access.allowed);
    assert.equal(bAllowed, false, 'B não recebe acesso de dono');
    const bText = await app.page.evaluate(() => document.body.innerText.slice(0, 4000));
    assert.equal(bText.includes(MARK_A), false, 'B não vê o lançamento de A');
    const bLocal = await readLocal(app.page);
    assert.equal(bLocal.civ5, aSnapshot, 'civ5 de A intacto após B entrar');
    assert.equal(bLocal.owner, aLocal.owner, 'vínculo de A intacto');
    const bSave = await app.page.evaluate(() => save());
    assert.equal(bSave, false, 'B não consegue gravar no civ5 de A');
    assert.equal((await readLocal(app.page)).civ5, aSnapshot, 'tentativa de gravação de B não altera o civ5 de A');
    const bUpload = await app.page.evaluate(() => uploadLocalToCloud(false));
    assert.ok(!(bUpload && bUpload.pass), 'B não envia dados locais');
    assert.equal(await cloudDoc(app.page, accounts.b.uid), null, 'nenhum documento de B com dados de A');
    const requestsWhileB = app.requests.slice(requestsBeforeB).filter(r => r.url.includes(`/portfolios/${accounts.a.uid}`));
    assert.equal(requestsWhileB.length, 0, 'B não lê nem grava o documento de A');

    // 3) A volta: dados intactos, sem dados de B, sem duplicação.
    await signInWithEmail(app.page, EMAIL_A);
    await waitOwnerAllowed(app.page);
    const aBack = await readLocal(app.page);
    assert.equal(aBack.civ5, aSnapshot, 'civ5 de A preservado após o retorno');
    assert.equal((aBack.civ5.match(new RegExp(MARK_A, 'g')) || []).length, 1, 'lançamento de A aparece uma vez no local');
    const aCloud2 = await cloudDoc(app.page, accounts.a.uid);
    assert.equal((JSON.stringify(aCloud2.aportes).match(new RegExp(MARK_A, 'g')) || []).length, 1, 'nuvem de A com um único lançamento');
    assert.deepEqual(app.pageErrors.filter(m => /civ5|Cannot read/.test(m)), [], 'sem erros de persistência');
  } finally {
    await app.context.close();
    app.appServer.closeAllConnections();
    await new Promise(resolve => app.appServer.close(resolve));
  }
});
