'use strict';

const { chromium } = require('playwright-core');
const { selectFirebaseConfig } = require('../../firebase-config-selector.js');
const EXPECTED_QA_PROJECT_ID = 'carteira-invest-qa-v316';

function isFirebaseServiceRequest(raw) {
  const host = new URL(raw).hostname;
  return host === 'firestore.googleapis.com' || host === 'identitytoolkit.googleapis.com'
    || host === 'securetoken.googleapis.com' || host === 'firebaseinstallations.googleapis.com'
    || host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com'
    || host.endsWith('.firebaseapp.com') || host.endsWith('.firebaseio.com');
}

function readSourceProductionProjectId(source) {
  return String(source || '').match(/const firebaseConfig = \{\s*projectId:\s*["']([a-z][a-z0-9-]*[a-z0-9])["']\s*\};/)?.[1] || '';
}

function resolvePreviewQaBoundary(hostname, deployment, sourceProductionProjectId, expectedProjectId) {
  const productionProjectId = deployment?.productionProjectId;
  const qaProjectId = deployment?.config?.projectId;
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(sourceProductionProjectId || '')
    || productionProjectId !== sourceProductionProjectId
    || !/^[a-z][a-z0-9-]*[a-z0-9]$/.test(qaProjectId || '')
    || (expectedProjectId && expectedProjectId !== qaProjectId)) {
    throw new Error('Preview QA project ID could not be verified');
  }
  const selected = selectFirebaseConfig(hostname, deployment, { projectId: sourceProductionProjectId });
  if (selected !== deployment.config) throw new Error('Preview did not select its isolated QA config');
  return { ...deployment.config, productionProjectId };
}

function unsafeFirebaseRequest(raw, qa, method = 'GET') {
  const url = new URL(raw);
  const host = url.hostname;
  if (raw.includes(qa.productionProjectId)) return 'PRODUCTION_PROJECT_REQUEST';
  if (host === 'firestore.googleapis.com') {
    const database = url.searchParams.get('database') || '';
    if (!url.pathname.includes(`/projects/${qa.projectId}/`)
      && !database.startsWith(`projects/${qa.projectId}/`)) return 'OTHER_FIRESTORE_PROJECT';
    if (isFirestoreWriteRequest(raw, method)) return 'FIRESTORE_WRITE';
    return null;
  }
  if (host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com'
    || host.endsWith('.firebaseio.com')) return 'UNEXPECTED_FIREBASE_DATA_REQUEST';
  if (['identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'firebaseinstallations.googleapis.com'].includes(host)
    && url.searchParams.get('key') !== qa.apiKey) return 'OTHER_FIREBASE_API_KEY';
  if (host.endsWith('.firebaseapp.com') && host !== qa.authDomain) return 'OTHER_AUTH_DOMAIN';
  if (host.endsWith('.firebaseapp.com') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) return 'UNEXPECTED_AUTH_DOMAIN_WRITE';
  return null;
}

function isFirestoreWriteRequest(raw, method = 'GET') {
  const url = new URL(raw);
  if (url.hostname !== 'firestore.googleapis.com') return false;
  if (/\/Write\/channel$|\/documents:(?:commit|batchWrite)$/.test(url.pathname)) return true;
  const verb = String(method).toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(verb)) return false;
  return !(verb === 'POST' && /\/Listen\/channel$|\/documents:(?:runQuery|batchGet|runAggregationQuery)$/.test(url.pathname));
}

function createProviderQaMetrics() {
  return {
    firebaseRequests: 0,
    qaFirestoreReads: 0,
    productionFirebaseRequests: 0,
    nonQaFirebaseRequests: 0,
    appFirestoreWrites: 0,
    financialStorageWriteAttempts: 0,
    preBoundaryFirebaseRequests: 0,
  };
}

function recordProviderQaRequest(metrics, raw, method = 'GET', qa = null) {
  if (!isFirebaseServiceRequest(raw)) return null;
  metrics.firebaseRequests++;
  const url = new URL(raw);
  const firestoreWrite = url.hostname === 'firestore.googleapis.com' && isFirestoreWriteRequest(raw, method);
  if (firestoreWrite) metrics.appFirestoreWrites++;
  if (!qa) {
    metrics.preBoundaryFirebaseRequests++;
    return 'FIREBASE_REQUEST_BEFORE_QA_BOUNDARY';
  }
  const reason = unsafeFirebaseRequest(raw, qa, method);
  if (url.href.includes(qa.productionProjectId)
    || ['PRODUCTION_PROJECT_REQUEST', 'OTHER_FIRESTORE_PROJECT', 'OTHER_FIREBASE_API_KEY', 'OTHER_AUTH_DOMAIN'].includes(reason)) {
    metrics.productionFirebaseRequests++;
  }
  if (reason && reason !== 'FIRESTORE_WRITE') metrics.nonQaFirebaseRequests++;
  if (url.hostname === 'firestore.googleapis.com' && !firestoreWrite && !reason) metrics.qaFirestoreReads++;
  return reason;
}

function classifyBrowserGateState({ hostname, pathname = '/', title = '', providerError = '', hasDescriptor = false }) {
  const host = String(hostname || '').toLowerCase();
  const path = String(pathname || '').toLowerCase();
  const text = `${title}\n${providerError}`.toLowerCase();
  if (host === 'accounts.google.com' || host.endsWith('.accounts.google.com')) return 'GOOGLE_AUTH_REQUIRED';
  if (host === 'vercel.com' || host.endsWith('.vercel.com') || path.includes('/sso-api/')
    || /vercel.*(sign in|log in|auth|protect|verify)|(?:sign in|log in|auth|protect|verify).*vercel/.test(text)) return 'VERCEL_AUTH_REQUIRED';
  if (hasDescriptor) return 'PREVIEW_DESCRIPTOR_READY';
  if (/autentica[cç][aã]o indispon[ií]vel|firebase configuration.*(missing|invalid)|qa.*config.*(missing|invalid)/i.test(text)) {
    return 'PREVIEW_CONFIG_INVALID';
  }
  return 'DESCRIPTOR_UNAVAILABLE';
}

function gateError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function shouldPreserveQaBrowserForError(error) {
  return ['GOOGLE_AUTH_REQUIRED', 'VERCEL_AUTH_REQUIRED'].includes(error?.code);
}

function resolveAuthenticatedBrowserEndpoint(raw) {
  if (!raw) throw gateError('VERCEL_AUTH_REQUIRED', 'Set QA_BROWSER_CDP_ENDPOINT to the already-authenticated local Chromium endpoint; the harness will not launch an unauthenticated replacement browser');
  let endpoint;
  try { endpoint = new URL(raw); } catch { throw gateError('VERCEL_AUTH_REQUIRED', 'Authenticated browser endpoint is invalid'); }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname);
  if (endpoint.protocol !== 'http:' || !loopback || endpoint.pathname !== '/' || endpoint.search || endpoint.hash
    || endpoint.username || endpoint.password) {
    throw gateError('VERCEL_AUTH_REQUIRED', 'Authenticated browser endpoint must be a plain loopback HTTP endpoint');
  }
  return endpoint.origin;
}

async function run(urlText, expectedProjectId) {
  const url = new URL(urlText);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) throw new Error('Exact HTTPS Preview root required');
  const cdpEndpoint = resolveAuthenticatedBrowserEndpoint(process.env.QA_BROWSER_CDP_ENDPOINT);
  let browser;
  try { browser = await chromium.connectOverCDP(cdpEndpoint); }
  catch { throw gateError('VERCEL_AUTH_REQUIRED', 'Could not attach to the already-authenticated local browser context'); }
  const context = browser.contexts()[0];
  if (!context) {
    await browser.close().catch(() => {});
    throw gateError('VERCEL_AUTH_REQUIRED', 'Authenticated browser context is unavailable');
  }
  let page;
  const violations = [];
  const authPopups = new Set();
  const metrics = createProviderQaMetrics();
  let qa = null;
  let preserveBrowser = false;
  try {
    await context.route('**/*', route => {
      const request = route.request();
      const reason = recordProviderQaRequest(metrics, request.url(), request.method(), qa);
      if (reason) { violations.push(reason); return route.abort(); }
      return route.continue();
    });
    page = await context.newPage();
    await page.addInitScript(() => {
      window.__V316_FINANCIAL_STORAGE_WRITES__ = 0;
      const guardedKeys = new Set(['civ5', 'civ5_cfg', 'portfolioValuationSnapshotsV1', 'portfolioExternalCashFlowsV1']);
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (guardedKeys.has(String(key))) {
          window.__V316_FINANCIAL_STORAGE_WRITES__++;
          throw new Error('V316 QA financial storage write blocked');
        }
        return original.call(this, key, value);
      };
      const originalRemove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (guardedKeys.has(String(key))) {
          window.__V316_FINANCIAL_STORAGE_WRITES__++;
          throw new Error('V316 QA financial storage removal blocked');
        }
        return originalRemove.call(this, key);
      };
      Storage.prototype.clear = function () {
        window.__V316_FINANCIAL_STORAGE_WRITES__++;
        throw new Error('V316 QA local storage clear blocked');
      };
    });
    page.on('popup', popup => authPopups.add(popup));
    try {
      await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    } catch (error) {
      const gateState = await page.evaluate(() => ({
        hostname: location.hostname,
        pathname: location.pathname,
        title: document.title,
        providerError: typeof FB !== 'undefined' ? FB.access?.reason || '' : '',
        hasDescriptor: Boolean(window.__FIREBASE_DEPLOYMENT__) && typeof window.__FIREBASE_DEPLOYMENT__ === 'object',
      })).then(classifyBrowserGateState).catch(() => 'DESCRIPTOR_UNAVAILABLE');
      if (gateState === 'VERCEL_AUTH_REQUIRED' || gateState === 'GOOGLE_AUTH_REQUIRED') {
        console.log(`${gateState}: waiting in the current authenticated browser context.`);
      } else {
        throw gateError(gateState, `Preview navigation did not reach its descriptor: ${error.message}`);
      }
    }

    // Keep the same browser window/context alive while Preview SSO is pending.
    let firebaseDeploymentFound = false;
    let lastGateState = '';
    const startedAt = Date.now();
    while (!firebaseDeploymentFound) {
      try {
        firebaseDeploymentFound = await page.evaluate(() => Boolean(window.__FIREBASE_DEPLOYMENT__)
          && typeof window.__FIREBASE_DEPLOYMENT__ === 'object');
      } catch (e) {
        // page might be navigating, ignore
      }
      if (!firebaseDeploymentFound) {
        const gateState = await page.evaluate(() => ({
          hostname: location.hostname,
          pathname: location.pathname,
          title: document.title,
          providerError: typeof FB !== 'undefined' ? FB.access?.reason || '' : '',
          hasDescriptor: Boolean(window.__FIREBASE_DEPLOYMENT__) && typeof window.__FIREBASE_DEPLOYMENT__ === 'object',
        })).then(classifyBrowserGateState).catch(() => 'DESCRIPTOR_UNAVAILABLE');
        if (gateState !== lastGateState) {
          console.log(`${gateState}: waiting in the current browser window; no credentials are read or stored.`);
          lastGateState = gateState;
        }
        if (gateState === 'PREVIEW_CONFIG_INVALID') {
          throw gateError(gateState, 'Preview is serving an incomplete or invalid QA configuration');
        }
        if (gateState === 'DESCRIPTOR_UNAVAILABLE' && Date.now() - startedAt > 30000) {
          throw gateError(gateState, 'Preview descriptor did not become available within 30 seconds');
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    const deployment = await page.evaluate(() => window.__FIREBASE_DEPLOYMENT__);
    const source = await page.evaluate(() => Array.from(document.scripts, script => script.textContent || '').join('\n'));
    const sourceProductionProjectId = readSourceProductionProjectId(source);
    try {
      qa = resolvePreviewQaBoundary(url.hostname, deployment, sourceProductionProjectId, expectedProjectId);
    } catch (error) {
      throw gateError('PREVIEW_CONFIG_INVALID', error.message);
    }
    if (await page.evaluate(() => window.__V316_FINANCIAL_STORAGE_WRITES__ || 0) !== 0) {
      throw new Error('Preview attempted financial storage writes before QA boundary validation');
    }
    metrics.financialStorageWriteAttempts += await page.evaluate(() => window.__V316_FINANCIAL_STORAGE_WRITES__ || 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof FB !== 'undefined' && FB.ready, null, { timeout: 30000 })
      .catch(() => { throw gateError('FIREBASE_QA_AUTH_FAILED', 'QA Firebase Auth did not become ready'); });
    const hasRestoredUser = await page.evaluate(() => Boolean(FB.user));
    if (!hasRestoredUser) {
      const loginButton = page.getByRole('button', { name: /Entrar com Google/i }).first();
      if (!(await loginButton.isVisible().catch(() => false)) || !(await loginButton.isEnabled().catch(() => false))) {
        throw gateError('GOOGLE_AUTH_REQUIRED', 'Google QA login is not available in the authenticated browser context');
      }
      await loginButton.click();
      console.log('GOOGLE_AUTH_REQUIRED: complete sign-in in the dedicated QA browser window; this harness will keep waiting without closing it.');
    }
    try {
      await page.waitForFunction(() => typeof FB !== 'undefined' && FB.user && FB.access.allowed && FB.cloudLoaded,
        null, { timeout: 0 });
    } catch {
      const googleAuthPending = [...authPopups].some(candidate =>
        /(^|\.)accounts\.google\.com\//i.test(candidate.url()));
      if (googleAuthPending) {
        throw gateError('GOOGLE_AUTH_REQUIRED', 'Google QA sign-in remains open in the current browser context');
      }
      throw gateError('FIREBASE_QA_AUTH_FAILED', 'QA identity was not granted read-only access before timeout');
    }
    const beforePersistenceReload = await page.evaluate(() => ({
      projectId: firebase.app().options.projectId,
      financialStorageWrites: window.__V316_FINANCIAL_STORAGE_WRITES__,
      readOnly: window.__PROTECTED_READ_ONLY_QA_BOOT__ === true,
      accessAllowed: FB.access.allowed === true,
      financialCounts: {
        assets: Array.isArray(S.assets) ? S.assets.length : -1,
        contributions: Array.isArray(S.aportes) ? S.aportes.length : -1,
        income: Array.isArray(S.proventos) ? S.proventos.length : -1,
        fixedIncomeEvents: Array.isArray(S.rfEvents) ? S.rfEvents.length : -1,
      },
    }));
    if (beforePersistenceReload.projectId !== qa.projectId || !beforePersistenceReload.readOnly
      || !beforePersistenceReload.accessAllowed || beforePersistenceReload.financialStorageWrites !== 0
      || violations.length) throw new Error('QA boundary failed before persistence reload');
    metrics.financialStorageWriteAttempts += beforePersistenceReload.financialStorageWrites;
    if (metrics.productionFirebaseRequests !== 0 || metrics.appFirestoreWrites !== 0) {
      throw new Error('QA network boundary observed a production Firebase request or Firestore write');
    }
    if (Object.values(beforePersistenceReload.financialCounts).some(count => count !== 0)) {
      throw gateError('QA_DATA_NOT_CLEAN', 'QA identity loaded financial records; read-only certification stopped');
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof FB !== 'undefined' && FB.user && FB.access.allowed && FB.cloudLoaded,
      null, { timeout: 30000 }).catch(() => { throw gateError('FIREBASE_QA_AUTH_FAILED', 'Authorized QA session did not persist after reload'); });
    const state = await page.evaluate(() => ({
      projectId: firebase.app().options.projectId,
      financialStorageWrites: window.__V316_FINANCIAL_STORAGE_WRITES__,
      readOnly: window.__PROTECTED_READ_ONLY_QA_BOOT__ === true,
      accessAllowed: FB.access.allowed === true,
      financialCounts: {
        assets: Array.isArray(S.assets) ? S.assets.length : -1,
        contributions: Array.isArray(S.aportes) ? S.aportes.length : -1,
        income: Array.isArray(S.proventos) ? S.proventos.length : -1,
        fixedIncomeEvents: Array.isArray(S.rfEvents) ? S.rfEvents.length : -1,
      },
    }));
    if (state.projectId !== qa.projectId || !state.readOnly || !state.accessAllowed
      || state.financialStorageWrites !== 0 || violations.length) throw new Error('Provider QA boundary failed');
    metrics.financialStorageWriteAttempts += state.financialStorageWrites;
    if (metrics.productionFirebaseRequests !== 0 || metrics.appFirestoreWrites !== 0) {
      throw new Error('QA network boundary observed a production Firebase request or Firestore write');
    }
    if (Object.values(state.financialCounts).some(count => count !== 0)) {
      throw gateError('QA_DATA_NOT_CLEAN', 'QA identity loaded financial records after session restoration');
    }
    await page.evaluate(() => signOutGoogle());
    await page.waitForFunction(() => typeof FB !== 'undefined' && !FB.user && !FB.access.allowed,
      null, { timeout: 15000 });
    metrics.financialStorageWriteAttempts += await page.evaluate(() => window.__V316_FINANCIAL_STORAGE_WRITES__ || 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof FB !== 'undefined' && !FB.user && !FB.access.allowed,
      null, { timeout: 30000 });
    metrics.financialStorageWriteAttempts += await page.evaluate(() => window.__V316_FINANCIAL_STORAGE_WRITES__ || 0);
    if (violations.length || metrics.productionFirebaseRequests !== 0 || metrics.appFirestoreWrites !== 0
      || metrics.financialStorageWriteAttempts !== 0) {
      throw new Error('Provider QA write/request boundary failed');
    }
    if (metrics.firebaseRequests === 0 || metrics.qaFirestoreReads === 0) {
      throw new Error('Provider QA did not capture Firebase authentication and Firestore read requests');
    }
    console.log(`PROVIDER_QA_PASS ${JSON.stringify(metrics)}`);
  } catch (error) {
    if (shouldPreserveQaBrowserForError(error)) {
      preserveBrowser = true;
      console.error('QA_BROWSER_PRESERVED: finish authentication in the dedicated QA window; do not share credentials or MFA.');
    }
    throw error;
  } finally {
    if (!preserveBrowser) {
      await page?.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  run(process.argv[2], EXPECTED_QA_PROJECT_ID).catch(error => {
    console.error(`${error.code || 'FIREBASE_QA_AUTH_FAILED'}: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { EXPECTED_QA_PROJECT_ID, classifyBrowserGateState, createProviderQaMetrics, isFirebaseServiceRequest, isFirestoreWriteRequest, readSourceProductionProjectId, recordProviderQaRequest, resolveAuthenticatedBrowserEndpoint, resolvePreviewQaBoundary, shouldPreserveQaBrowserForError, unsafeFirebaseRequest };
