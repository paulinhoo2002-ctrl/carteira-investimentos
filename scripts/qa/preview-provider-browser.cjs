'use strict';

const { chromium } = require('playwright-core');
const { runPublicPreviewSmoke } = require('./preview-provider-smoke.cjs');

function unsafeFirebaseRequest(raw, qa, method = 'GET') {
  const url = new URL(raw);
  const host = url.hostname;
  if (raw.includes(qa.productionProjectId)) return 'PRODUCTION_PROJECT_REQUEST';
  if (host === 'firestore.googleapis.com') {
    const database = url.searchParams.get('database') || '';
    if (!url.pathname.includes(`/projects/${qa.projectId}/`)
      && !database.startsWith(`projects/${qa.projectId}/`)) return 'OTHER_FIRESTORE_PROJECT';
    if (/\/Write\/channel$|\/documents:(?:commit|batchWrite)$/.test(url.pathname)) return 'FIRESTORE_WRITE';
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return null;
    if (method === 'POST' && /\/Listen\/channel$|\/documents:runQuery$/.test(url.pathname)) return null;
    return 'FIRESTORE_WRITE';
  }
  if (host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com'
    || host.endsWith('.firebaseio.com')) return 'UNEXPECTED_FIREBASE_DATA_REQUEST';
  if (['identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'firebaseinstallations.googleapis.com'].includes(host)
    && url.searchParams.get('key') !== qa.apiKey) return 'OTHER_FIREBASE_API_KEY';
  if (host.endsWith('.firebaseapp.com') && host !== qa.authDomain) return 'OTHER_AUTH_DOMAIN';
  if (host.endsWith('.firebaseapp.com') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) return 'UNEXPECTED_AUTH_DOMAIN_WRITE';
  return null;
}

async function run(urlText, expectedProjectId) {
  const url = new URL(urlText);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) throw new Error('Exact HTTPS Preview root required');
  await runPublicPreviewSmoke(url.href, expectedProjectId);
  const response = await fetch(url.href, { redirect: 'error' });
  const html = await response.text();
  const deployment = JSON.parse(html.match(/window\.__FIREBASE_DEPLOYMENT__=(\{[^;]+\});/)[1]);
  const qaProjectId = deployment.config?.projectId;
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(qaProjectId || '')
    || (expectedProjectId && expectedProjectId !== qaProjectId)) throw new Error('Preview QA project ID could not be verified');
  const qa = { ...deployment.config, productionProjectId: deployment.productionProjectId };
  const browser = await chromium.launch({ headless: false,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const violations = [];
  try {
    await context.addInitScript(() => {
      window.__V316_FINANCIAL_STORAGE_WRITES__ = 0;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'civ5') {
          window.__V316_FINANCIAL_STORAGE_WRITES__++;
          throw new Error('V316 QA financial storage write blocked');
        }
        return original.call(this, key, value);
      };
    });
    await context.route('**/*', route => {
      const request = route.request();
      const reason = unsafeFirebaseRequest(request.url(), qa, request.method());
      if (reason) { violations.push(reason); return route.abort(); }
      return route.continue();
    });
    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    console.log('Complete Google QA sign-in in the isolated browser. No credentials are read by this script.');
    await page.waitForFunction(() => typeof FB !== 'undefined' && FB.user && FB.access.allowed && FB.cloudLoaded,
      null, { timeout: 180000 });
    const state = await page.evaluate(() => ({
      projectId: firebase.app().options.projectId,
      financialStorageWrites: window.__V316_FINANCIAL_STORAGE_WRITES__,
      readOnly: window.__PROTECTED_READ_ONLY_QA_BOOT__ === true,
      accessAllowed: FB.access.allowed === true,
    }));
    if (state.projectId !== qaProjectId || !state.readOnly || !state.accessAllowed
      || state.financialStorageWrites !== 0 || violations.length) throw new Error('Provider QA boundary failed');
    await page.evaluate(() => signOutGoogle());
    await page.waitForFunction(() => typeof FB !== 'undefined' && !FB.user && !FB.access.allowed,
      null, { timeout: 15000 });
    if (violations.length || await page.evaluate(() => window.__V316_FINANCIAL_STORAGE_WRITES__) !== 0) {
      throw new Error('Provider QA write/request boundary failed');
    }
    console.log('PROVIDER_QA_PASS: isolated project, authorized read-only login, logout, zero production requests and zero financial writes.');
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run(process.argv[2], process.argv[3]).catch(error => {
    console.error(`Provider QA blocked: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { unsafeFirebaseRequest };
