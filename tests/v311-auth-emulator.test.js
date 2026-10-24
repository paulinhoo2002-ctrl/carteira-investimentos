'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const PROJECT = 'demo-carteira-qa-emulator';
const AUTH = 'http://127.0.0.1:9099';
const EMAIL = 'qa.synthetic@example.invalid';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const QUERY = '?qaAuthEmulator=1&qaFirestoreEmulator=1&protectedReadOnlyQa=1';
const DATA_HOSTS = /(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebasestorage\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|(?:^|\.)firebaseio\.com)(?::\d+)?(?:\/|$)/i;
const DATA_REQUEST_URL = /^https?:\/\/[^/]*(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebasestorage\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|firebaseio\.com)(?::\d+)?(?:\/|$)/i;
const ROUTES = ['dashboard', 'ativos', 'dividendos', 'renda-fixa', 'confiabilidade'];
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1366, height: 768 }];

let harness;
let browser;

// Emulator-documented email verification flow (same as the auth-demo
// security suite): accounts:update with a bare {emailVerified:true} is a
// silent NO-OP on the Auth emulator — the working path is
// sendOobCode(VERIFY_EMAIL) -> oobCodes listing -> accounts:update {oobCode};
// a fresh sign-in then mints email_verified=true in the token claims.
async function markEmailVerified(email, idToken) {
  const send = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(send.ok, true, `sendOobCode failed: HTTP ${send.status} ${await send.text()}`);
  const listRes = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`, { signal: AbortSignal.timeout(5000) });
  assert.equal(listRes.ok, true, `oobCodes listing failed: HTTP ${listRes.status}`);
  const entry = ((await listRes.json()).oobCodes || []).find((c) => c.email === email);
  assert.ok(entry, `no VERIFY_EMAIL oobCode for ${email}`);
  const update = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: entry.oobCode }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(update.ok, true, `accounts:update (oobCode) failed: HTTP ${update.status} ${await update.text()}`);
}

async function newPage({ query = QUERY, hostname = '127.0.0.1', viewport = VIEWPORTS[1], invalidSession = false, unavailableEmulators = false } = {}) {
  const context = await browser.newContext({ viewport });
  if(invalidSession) await context.addInitScript(() => { if(location.origin.startsWith('http://127.0.0.1:')) localStorage.setItem('firebase:authUser:demo-api-key:[DEFAULT]', '{invalid-session'); });
  const page = await context.newPage();
  const requests = [];
  const blockedProductionRequests = [];
  const pageErrors = [];
  const consoleErrors = [];
  const httpErrors = [];
  let financialWrites = 0;
  let taxWrites = 0;
  let importWrites = 0;
  await page.route(DATA_REQUEST_URL, route => {
    blockedProductionRequests.push(route.request().url());
    return route.abort();
  });
  if (unavailableEmulators) {
    await page.route('http://127.0.0.1:9099/**', route => route.abort());
    await page.route('http://127.0.0.1:8080/**', route => route.abort());
  }
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
  page.on('request', request => {
    const url = request.url();
    requests.push({ url, method: request.method() });
    if (/127\.0\.0\.1:8080\/.*(?::commit|:write|:batchWrite)$/i.test(url) || (/127\.0\.0\.1:8080\/.*\/documents\//i.test(url) && ['PATCH', 'PUT', 'DELETE'].includes(request.method()))) financialWrites++;
    if (/127\.0\.0\.1:8080\/.*(?:tax|irpf)/i.test(url) && !['GET', 'OPTIONS'].includes(request.method())) taxWrites++;
    if (/127\.0\.0\.1:8080\/.*(?:import|broker)/i.test(url) && !['GET', 'OPTIONS'].includes(request.method())) importWrites++;
  });
  page.on('response', response => {
    if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() });
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.addInitScript(() => {
    window.__V311_FINANCIAL_STORAGE_WRITES__ = 0;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'civ5') window.__V311_FINANCIAL_STORAGE_WRITES__++;
      return originalSet.call(this, key, value);
    };
  });
  const base = harness.url.replace('127.0.0.1', hostname).replace('?testMode=1', query);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  return { context, page, requests, blockedProductionRequests, pageErrors, consoleErrors, httpErrors, get financialWrites() { return financialWrites; }, get taxWrites() { return taxWrites; }, get importWrites() { return importWrites; } };
}

async function waitForFirebase(app) {
  try {
    await app.page.waitForFunction(() => typeof FB !== 'undefined' && FB.ready === true && FB.authResolved === true, null, { timeout: 25000 });
  } catch (error) {
    const state=await app.page.evaluate(()=>({firebase:typeof window.firebase,ready:typeof FB!=='undefined'&&FB.ready,authResolved:typeof FB!=='undefined'&&FB.authResolved,authMode:window.__LOCAL_AUTH_EMULATOR_MODE__,configError:window.__LOCAL_AUTH_EMULATOR_CONFIG_ERROR__,hostname:location.hostname,body:document.body.innerText.slice(0,240)})).catch(()=>({pageUnavailable:true}));
    const routes=app.requests.map(({url})=>{const parsed=new URL(url);return `${parsed.origin}${parsed.pathname}`;});
    throw new Error(`${error.message}; boot=${JSON.stringify(state)}; pageErrors=${JSON.stringify(app.pageErrors)}; consoleErrors=${JSON.stringify(app.consoleErrors)}; requests=${JSON.stringify(routes)}`);
  }
}

async function waitForOwnerOnlyBlock(page) {
  await page.waitForFunction(email => FB?.user?.email === email && FB?.authResolved === true && FB?.access?.loaded === true && FB?.access?.allowed === false && FB?.accountMode === 'BLOCKED', EMAIL, { timeout: 20000 });
}
function firestoreEmulatorRequests(app) {
  return app.requests.filter(({ url }) => url.startsWith('http://127.0.0.1:8080/'));
}

function firebaseDataRequests(app) {
  return app.requests.filter(({ url }) => DATA_HOSTS.test(new URL(url).hostname));
}

before(async () => {
  harness = await startLocalHttpServer(path.join(__dirname, '..'));
  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--host-resolver-rules=MAP qa-non-loopback.invalid 127.0.0.1'] });
});

after(async () => {
  await browser?.close();
  if (harness?.server) {
    harness.server.closeAllConnections();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

test('V311: verified non-owner Firebase emulator session remains blocked without private reads', async () => {
  const app = await newPage();
  try {
    await waitForFirebase(app);
    assert.equal(await app.page.evaluate(() => FB.app.options.projectId), PROJECT);
    assert.equal(await app.page.locator('body').innerText().then(text => text.includes('Entre com Google para continuar')), true);
    assert.deepEqual(firestoreEmulatorRequests(app), [], 'anonymous session must not read Firestore');

    const passphrase = `qa-${randomUUID()}-ephemeral`;
    const idToken = await app.page.evaluate(async ({ email, passphrase }) => {
      const credential = await FB.auth.createUserWithEmailAndPassword(email, passphrase);
      return credential.user.getIdToken();
    }, { email: EMAIL, passphrase });
    await markEmailVerified(EMAIL, idToken);
    await app.page.evaluate(async ({ email, passphrase }) => {
      await FB.auth.signOut();
      await FB.auth.signInWithEmailAndPassword(email, passphrase);
    }, { email: EMAIL, passphrase });
    await waitForOwnerOnlyBlock(app.page);

    const identity = await app.page.evaluate(expectedEmail => ({
      authenticated: !!FB.user,
      emailMatches: FB.user?.email === expectedEmail,
      emailVerified: FB.user?.emailVerified === true,
      accountMode: FB.accountMode,
      allowed: FB.access.allowed,
      privateStateCleared: !FB.cloudLoaded && !FB.localPortfolioLoaded && S.assets.length === 0 && S.aportes.length === 0 && S.proventos.length === 0,
    }), EMAIL);
    assert.deepEqual(identity, { authenticated: true, emailMatches: true, emailVerified: true, accountMode: 'BLOCKED', allowed: false, privateStateCleared: true });
    assert.ok(app.requests.some(({ url }) => url.startsWith('http://127.0.0.1:9099/')), 'synthetic login must use the Auth emulator');
    assert.deepEqual(firestoreEmulatorRequests(app), [], 'owner-only denial must happen before any Firestore read');

    for (const route of ROUTES) {
      await app.page.evaluate(route => go(route), route);
      await app.page.waitForFunction(route => S.tab === route, route);
      const state = await app.page.evaluate(() => ({ allowed: FB.access.allowed, accountMode: FB.accountMode, cloudLoaded: FB.cloudLoaded, localPortfolioLoaded: FB.localPortfolioLoaded }));
      assert.deepEqual(state, { allowed: false, accountMode: 'BLOCKED', cloudLoaded: false, localPortfolioLoaded: false }, `${route}: direct navigation must remain blocked`);
      assert.deepEqual(firestoreEmulatorRequests(app), [], `${route}: blocked identity must not read Firestore`);
    }

    await app.page.evaluate(() => FB.auth.signOut());
    await app.page.waitForFunction(() => FB.authResolved === true && FB.user === null && FB.access.allowed === false && FB.access.loaded === false && FB.accountMode === 'LOGIN_REQUIRED');
    const logout = await app.page.evaluate(() => ({
      authenticated: !!FB.user,
      allowed: FB.access.allowed,
      accountMode: FB.accountMode,
      loginGateVisible: document.body.innerText.includes('Entre com Google para continuar'),
      privateStateCleared: !FB.cloudLoaded && !FB.localPortfolioLoaded && S.assets.length === 0 && S.aportes.length === 0 && S.proventos.length === 0,
      financialStorageWrites: window.__V311_FINANCIAL_STORAGE_WRITES__,
    }));
    assert.deepEqual(logout, { authenticated: false, allowed: false, accountMode: 'LOGIN_REQUIRED', loginGateVisible: true, privateStateCleared: true, financialStorageWrites: 0 });
    assert.deepEqual(firestoreEmulatorRequests(app), [], 'logout must not trigger Firestore reads');
    assert.deepEqual(app.blockedProductionRequests, []);
    assert.equal(app.financialWrites, 0);
    assert.equal(app.taxWrites, 0);
    assert.equal(app.importWrites, 0);
    assert.deepEqual(app.pageErrors, []);
    assert.deepEqual(app.consoleErrors, [], `console errors: ${JSON.stringify(app.consoleErrors)}; HTTP errors: ${JSON.stringify(app.httpErrors)}`);
    assert.deepEqual(app.httpErrors, [], `HTTP errors: ${JSON.stringify(app.httpErrors)}`);
  } finally {
    await app.context.close();
  }
});
test('V311: partial emulator flags fail closed without initializing Firebase', async () => {
  for (const query of ['?qaAuthEmulator=1&protectedReadOnlyQa=1', '?qaFirestoreEmulator=1&protectedReadOnlyQa=1']) {
    const app = await newPage({ query });
    try {
      const state = await app.page.evaluate(() => ({
        ready: FB.ready,
        resolved: FB.authResolved,
        allowed: FB.access.allowed,
        error: window.__LOCAL_AUTH_EMULATOR_CONFIG_ERROR__,
        gate: document.body.innerText.includes('Entre com Google para continuar'),
      }));
      assert.deepEqual(state, { ready: false, resolved: true, allowed: false, error: true, gate: true });
      assert.deepEqual(firebaseDataRequests(app), []);
      assert.deepEqual(app.blockedProductionRequests, []);
    } finally { await app.context.close(); }
  }
});

test('V311: malformed emulator session remains unauthenticated', async () => {
  const app = await newPage({ invalidSession: true });
  try {
    await waitForFirebase(app);
    const state = await app.page.evaluate(() => ({
      authenticated: !!FB.user,
      allowed: FB.access.allowed,
      gate: document.body.innerText.includes('Entre com Google para continuar'),
      invalidSessionConsumed: localStorage.getItem('firebase:authUser:demo-api-key:[DEFAULT]') === null,
    }));
    assert.deepEqual(state, { authenticated: false, allowed: false, gate: true, invalidSessionConsumed: true });
    assert.deepEqual(app.blockedProductionRequests, []);
  } finally { await app.context.close(); }
});

test('V311: unavailable Auth and Firestore emulators fail closed without production fallback', async () => {
  const app = await newPage({ unavailableEmulators: true });
  try {
    await waitForFirebase(app);
    const result = await app.page.evaluate(async () => {
      let authError = '';
      let firestoreError = '';
      try { await FB.auth.createUserWithEmailAndPassword('qa.synthetic@example.invalid', 'ephemeral-only'); }
      catch (error) { authError = String(error.code || error.message); }
      try { await FB.db.doc('meta/access').get(); }
      catch (error) { firestoreError = String(error.code || error.message); }
      return { projectId: FB.app.options.projectId, authenticated: !!FB.user, allowed: FB.access.allowed, authError, firestoreError };
    });
    assert.equal(result.projectId, PROJECT);
    assert.equal(result.authenticated, false);
    assert.equal(result.allowed, false);
    assert.notEqual(result.authError, '');
    assert.notEqual(result.firestoreError, '');
    assert.ok(app.requests.some(({ url }) => url.startsWith('http://127.0.0.1:9099/')));
    assert.ok(app.requests.some(({ url }) => url.startsWith('http://127.0.0.1:8080/')));
    assert.deepEqual(firebaseDataRequests(app), []);
    assert.deepEqual(app.blockedProductionRequests, []);
    assert.equal(app.financialWrites, 0);
    assert.equal(app.taxWrites, 0);
    assert.equal(app.importWrites, 0);
  } finally { await app.context.close(); }
});

test('V311: localhost query flags cannot bypass auth on a non-loopback origin', async () => {
  const app = await newPage({ hostname: 'qa-non-loopback.invalid', query: `${QUERY}&testMode=1&skipAuth=1` });
  try {
    await app.page.waitForFunction(() => FB.authResolved === true && FB.access.loading === false && document.body.innerText.includes('Entre com Google para continuar'));
    const state = await app.page.evaluate(() => ({
      testMode: window.__LOCAL_TEST_MODE__,
      emulatorMode: window.__LOCAL_AUTH_EMULATOR_MODE__,
      authenticated: !!FB.user,
      gate: document.body.innerText.includes('Entre com Google para continuar'),
    }));
    assert.equal(state.testMode, false);
    assert.equal(state.emulatorMode, false);
    assert.equal(state.authenticated, false);
    assert.equal(state.gate, true);
    assert.equal(app.requests.some(({ url }) => /127\.0\.0\.1:(9099|8080)/.test(url)), false);
    assert.deepEqual(app.blockedProductionRequests, [], 'non-loopback QA URL must not contact production Firebase data endpoints');
  } finally { await app.context.close(); }
});

test('V311: navigation and user URL parameters cannot create an auth session', async () => {
  const app = await newPage({ query: '?testMode=1&skipAuth=1' });
  try {
    const state = await app.page.evaluate(() => ({
      testMode: window.__LOCAL_TEST_MODE__,
      emulatorMode: window.__LOCAL_AUTH_EMULATOR_MODE__,
      authenticated: !!FB.user,
      gate: document.body.innerText.includes('Entre com Google para continuar'),
    }));
    assert.equal(state.testMode, true);
    assert.equal(state.emulatorMode, false);
    assert.equal(state.authenticated, false);
    assert.equal(state.gate, false); // testMode is an explicitly local synthetic fixture, not Firebase auth.
    assert.deepEqual(firebaseDataRequests(app), []);
    assert.deepEqual(app.blockedProductionRequests, []);
  } finally { await app.context.close(); }
});
