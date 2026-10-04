'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const PROJECT = 'demo-carteira-qa-emulator';
const EMAIL = 'qa.synthetic@example.invalid';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const QUERY = '?qaAuthEmulator=1&qaFirestoreEmulator=1&protectedReadOnlyQa=1';
const DATA_HOSTS = /(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebasestorage\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|(?:^|\.)firebaseio\.com)(?::\d+)?(?:\/|$)/i;
const DATA_REQUEST_URL = /^https?:\/\/[^/]*(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebasestorage\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|firebaseio\.com)(?::\d+)?(?:\/|$)/i;
const ROUTES = ['dashboard', 'ativos', 'dividendos', 'renda-fixa', 'confiabilidade'];
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1366, height: 768 }];

let harness;
let browser;

async function firestoreRequest(pathname, body) {
  const response = await fetch(`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/${pathname}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.ok, true, `Firestore emulator seed failed with HTTP ${response.status}`);
  return response.json();
}

async function seedAccessDocument() {
  await firestoreRequest('meta/access', { fields: {
    enabled: { booleanValue: true },
    allowedEmails: { arrayValue: { values: [{ stringValue: EMAIL }] } },
    blockedEmails: { arrayValue: { values: [] } },
    allowedDomains: { arrayValue: { values: [] } },
  } });
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

async function waitForAccess(page) {
  await page.waitForFunction(email => FB?.user?.email === email && FB?.access?.loaded === true && FB?.access?.allowed === true, EMAIL, { timeout: 20000 });
}

function firebaseDataRequests(app) {
  return app.requests.filter(({ url }) => DATA_HOSTS.test(new URL(url).hostname));
}

before(async () => {
  harness = await startLocalHttpServer(path.join(__dirname, '..'));
  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--host-resolver-rules=MAP qa-non-loopback.invalid 127.0.0.1'] });
  await seedAccessDocument();
});

after(async () => {
  await browser?.close();
  if (harness?.server) {
    harness.server.closeAllConnections();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

test('V311: real Firebase Auth + Firestore emulator session renders protected routes read-only', async () => {
  const app = await newPage();
  try {
    await waitForFirebase(app);
    assert.equal(await app.page.evaluate(() => FB.app.options.projectId), PROJECT);

    const passphrase = `qa-${randomUUID()}-ephemeral`;
    await app.page.evaluate(async ({ email, passphrase }) => {
      await FB.auth.createUserWithEmailAndPassword(email, passphrase);
    }, { email: EMAIL, passphrase });
    await waitForAccess(app.page);

    const identity = await app.page.evaluate(() => ({ authenticated: !!FB.user, email: FB.user?.email || '', allowed: FB.access.allowed }));
    assert.deepEqual(identity, { authenticated: true, email: EMAIL, allowed: true });
    assert.ok(app.requests.some(({ url }) => url.startsWith('http://127.0.0.1:9099/')));
    assert.ok(app.requests.some(({ url }) => url.startsWith('http://127.0.0.1:8080/')));
    const emulatorNotice = app.page.locator('.firebase-emulator-warning');
    assert.match(await emulatorNotice.innerText(), /Running in emulator mode/i);
    await emulatorNotice.evaluate(element => element.remove());

    for (const viewport of VIEWPORTS) {
      await app.page.setViewportSize(viewport);
      for (const route of ROUTES) {
        if (viewport.width === 390 && route === 'ativos') await app.page.locator('#investBottomNav > button').nth(1).click();
        else if (viewport.width === 390 && route === 'dividendos') await app.page.locator('#investBottomNav > button').nth(2).click();
        else if (viewport.width === 390 && route === 'renda-fixa') await app.page.locator('#investBottomNav > button').nth(3).click();
        else if (viewport.width === 390 && route === 'confiabilidade') {
          await app.page.locator('#investBottomNav > button').nth(4).click();
          await app.page.locator('#investMenuDrawer button').filter({ hasText: 'Confiabilidade' }).click();
        } else await app.page.evaluate(route => go(route), route);
        await app.page.waitForFunction(route => S.tab === route, route);
        const state = await app.page.evaluate(() => ({
          authenticated: !!FB.user && FB.access.allowed,
          gateVisible: document.body.innerText.includes('Entre com Google para continuar'),
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: innerWidth,
          financialStorageWrites: window.__V311_FINANCIAL_STORAGE_WRITES__,
          clippedInteractiveControls: (() => {
            const clipped = [];
            const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]')];
            for (const element of controls) {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) continue;
              if (rect.right <= 0 || rect.left >= innerWidth || rect.bottom <= 0 || rect.top >= innerHeight) continue;
              let ancestor = element.parentElement;
              while (ancestor) {
                const ancestorStyle = getComputedStyle(ancestor);
                const bounds = ancestor.getBoundingClientRect();
                const clipLeft = bounds.left + ancestor.clientLeft;
                const clipTop = bounds.top + ancestor.clientTop;
                const clipRight = clipLeft + ancestor.clientWidth;
                const clipBottom = clipTop + ancestor.clientHeight;
                const clipsX = ['hidden', 'clip'].includes(ancestorStyle.overflowX);
                const clipsY = ['hidden', 'clip'].includes(ancestorStyle.overflowY);
                if ((clipsX && (rect.left < clipLeft - 1 || rect.right > clipRight + 1)) || (clipsY && (rect.top < clipTop - 1 || rect.bottom > clipBottom + 1))) {
                  clipped.push({ control: element.outerHTML.slice(0, 160), rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, clipper: ancestor.tagName.toLowerCase() + (ancestor.id ? '#' + ancestor.id : '') + (ancestor.className ? '.' + String(ancestor.className).trim().replace(/\\s+/g, '.') : ''), clipAxes: { x: ancestorStyle.overflowX, y: ancestorStyle.overflowY }, clipRect: { left: clipLeft, right: clipRight, top: clipTop, bottom: clipBottom } });
                  break;
                }
                ancestor = ancestor.parentElement;
              }
              if (rect.left < -1 || rect.right > innerWidth + 1) clipped.push({ control: element.outerHTML.slice(0, 160), rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, clipper: 'viewport' });
            }
            return [...new Set(clipped)];
          })(),
        }));
        assert.equal(state.authenticated, true, `${route} at ${viewport.width}: auth lost`);
        assert.equal(state.gateVisible, false, `${route} at ${viewport.width}: login gate returned`);
        assert.ok(state.documentWidth <= state.viewportWidth, `${route} at ${viewport.width}: document overflow`);
        assert.ok(state.bodyWidth <= state.viewportWidth, `${route} at ${viewport.width}: body overflow`);
        assert.equal(state.financialStorageWrites, 0);
        assert.deepEqual(state.clippedInteractiveControls, [], `${route} at ${viewport.width}: clipped interactive controls`);
      }
    }

    assert.deepEqual(firebaseDataRequests(app), []);
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
