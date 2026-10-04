'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { selectFirebaseConfig } = require('../firebase-config-selector.js');
const { renderFirebaseDeployment } = require('../scripts/qa/build-firebase-deployment.cjs');

const production = Object.freeze({
  apiKey: 'synthetic-production-key',
  authDomain: 'production-project.firebaseapp.com',
  projectId: 'production-project',
  storageBucket: 'production-project.firebasestorage.app',
  messagingSenderId: '123456',
  appId: '1:123456:web:abc123',
});
const qa = Object.freeze({
  apiKey: 'synthetic-qa-key',
  authDomain: 'isolated-qa-project.firebaseapp.com',
  projectId: 'isolated-qa-project',
  storageBucket: 'isolated-qa-project.firebasestorage.app',
  messagingSenderId: '987654',
  appId: '1:987654:web:def456',
});
const html = `const firebaseConfig = {
  apiKey: "${production.apiKey}",
  authDomain: "${production.authDomain}",
  projectId: "${production.projectId}",
  storageBucket: "${production.storageBucket}",
  messagingSenderId: "${production.messagingSenderId}",
  appId: "${production.appId}"
};
/* V316_FIREBASE_DEPLOYMENT_START */
window.__FIREBASE_DEPLOYMENT__={"mode":"blocked"};
/* V316_FIREBASE_DEPLOYMENT_END */`;
const previewEnv = () => ({
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'unique-preview.example.test',
  VERCEL_BRANCH_URL: 'qa-preview.example.test',
  QA_FIREBASE_PREVIEW_ALLOWED_HOSTS: 'qa-preview.example.test',
  QA_FIREBASE_API_KEY: qa.apiKey,
  QA_FIREBASE_AUTH_DOMAIN: qa.authDomain,
  QA_FIREBASE_PROJECT_ID: qa.projectId,
  QA_FIREBASE_STORAGE_BUCKET: qa.storageBucket,
  QA_FIREBASE_MESSAGING_SENDER_ID: qa.messagingSenderId,
  QA_FIREBASE_APP_ID: qa.appId,
});

test('V316 production host selects the existing production config', () => {
  const deployment = { mode: 'production', allowedHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: production.projectId };
  assert.strictEqual(selectFirebaseConfig('carteira-investimentos-delta.vercel.app', deployment, production), production);
});

test('V316 approved Preview selects only isolated QA config', () => {
  const deployment = { mode: 'preview', allowedHosts: ['qa-preview.example.test'], productionHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: production.projectId, config: qa };
  assert.deepEqual(selectFirebaseConfig('qa-preview.example.test', deployment, production), qa);
  assert.throws(() => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', { ...deployment, allowedHosts: ['carteira-investimentos-delta.vercel.app'] }, production), /production host/);
});

test('V316 unknown host and absent deployment fail closed before Firebase initialization', () => {
  const deployment = { mode: 'production', allowedHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: production.projectId };
  assert.throws(() => selectFirebaseConfig('unknown.example.test', deployment, production), /not authorized/);
  assert.throws(() => selectFirebaseConfig('localhost', deployment, production), /not authorized/);
  assert.throws(() => selectFirebaseConfig('127.0.0.1', deployment, production), /not authorized/);
  assert.throws(() => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', null, production), /not configured/);
});

test('V316 Preview rejects partial, mixed-project and invalid QA config', () => {
  const base = { mode: 'preview', allowedHosts: ['qa-preview.example.test'], productionHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: production.projectId, config: qa };
  assert.throws(() => selectFirebaseConfig('qa-preview.example.test', { ...base, config: { ...qa, appId: '' } }, production), /invalid/);
  assert.throws(() => selectFirebaseConfig('qa-preview.example.test', { ...base, config: production }, production), /isolated/);
  assert.throws(() => selectFirebaseConfig('qa-preview.example.test', { ...base, config: { ...qa, apiKey: production.apiKey } }, production), /isolated/);
  assert.throws(() => selectFirebaseConfig('qa-preview.example.test', { ...base, config: { ...qa, authDomain: production.authDomain } }, production), /invalid/);
  assert.throws(() => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', { ...base, allowedHosts: ['carteira-investimentos-delta.vercel.app'] }, production), /production host/);
});

test('V316 rejects malformed production config on an approved production host', () => {
  const invalid = { ...production, projectId: 'Invalid_Project' };
  const deployment = { mode: 'production', allowedHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: invalid.projectId };
  assert.throws(() => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', deployment, invalid), /Production Firebase configuration is invalid/);
});

test('V316 build emits production descriptor only for production environment', () => {
  const output = renderFirebaseDeployment(html, {
    VERCEL_ENV: 'production',
    VERCEL_URL: 'production-deploy.example.test',
    VERCEL_PROJECT_PRODUCTION_URL: 'carteira-investimentos-delta.vercel.app',
  });
  assert.match(output, /"mode":"production"/);
  assert.match(output, /production-deploy\.example\.test/);
  assert.match(output, /synthetic-production-key/);
  assert.doesNotMatch(output, /synthetic-qa-key/);
});

test('V316 build strips production credentials from an approved Preview artifact', () => {
  const output = renderFirebaseDeployment(html, previewEnv());
  assert.match(output, /"mode":"preview"/);
  assert.match(output, /isolated-qa-project/);
  assert.doesNotMatch(output, /synthetic-production-key/);
  assert.doesNotMatch(output, /production-project\.firebaseapp\.com/);
  assert.doesNotMatch(output, /unique-preview\.example\.test/);
  const strippedConfig = output.match(/const firebaseConfig = (\{[^;]+\});/);
  const descriptor = output.match(/window\.__FIREBASE_DEPLOYMENT__=(\{[^;]+\});/);
  assert.ok(strippedConfig && descriptor);
  assert.deepEqual(
    selectFirebaseConfig('qa-preview.example.test', JSON.parse(descriptor[1]), vm.runInNewContext(`(${strippedConfig[1]})`)),
    qa,
  );
});

test('V316 Preview without QA provisioning remains blocked; partial config fails build', () => {
  const blocked = renderFirebaseDeployment(html, { VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'qa-preview.example.test' });
  assert.match(blocked, /"mode":"blocked"/);
  assert.doesNotMatch(blocked, /synthetic-production-key/);
  const partial = previewEnv();
  delete partial.QA_FIREBASE_APP_ID;
  assert.throws(() => renderFirebaseDeployment(html, partial), /Missing required Preview setting/);
});

test('V316 unknown build environment and unrecognized source fail closed', () => {
  assert.throws(() => renderFirebaseDeployment(html, {}), /Unknown deployment environment/);
  assert.throws(() => renderFirebaseDeployment('no marker', { VERCEL_ENV: 'preview' }), /deployment marker/);
});

test('V316 actual legacy entrypoint loads selector and renders isolated Preview artifact', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(source, /<script src="firebase-config-selector\.js"><\/script>/);
  const output = renderFirebaseDeployment(source, previewEnv());
  assert.match(output, /"mode":"preview"/);
  assert.doesNotMatch(output, /carteira-de-investimento-16725\.firebaseapp\.com/);
  const productionOutput = renderFirebaseDeployment(source, {
    VERCEL_ENV: 'production',
    VERCEL_URL: 'production-deploy.example.test',
  });
  assert.match(productionOutput, /"mode":"production"/);
  assert.match(productionOutput, /"carteira-investimentos-git-main-paulinhoo2002-ctrls-projects\.vercel\.app"/);
});

test('V316 Preview boot enables existing protected read-only QA boundary', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const boot = source.indexOf('(()=>{try{', source.indexOf('<title>'));
  const start = source.lastIndexOf('<script>', boot) + '<script>'.length;
  const end = source.indexOf('</script>', boot);
  const window = { __FIREBASE_DEPLOYMENT__: { mode: 'preview' } };
  const context = { window, location: { search: '', hostname: 'qa-preview.example.test' }, document: { documentElement: { dataset: {}, style: {} }, querySelector: () => null }, localStorage: { getItem: () => null }, URLSearchParams };
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(window.__PROTECTED_READ_ONLY_QA_BOOT__, true);
});

test('V316 Preview runtime selects QA before initializeApp and uses session persistence', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function initFirebase(){');
  const end = source.indexOf('async function loadAccessControl(', start);
  assert.ok(start >= 0 && end > start);
  let initializedProject;
  let persistence;
  const auth = { setPersistence: value => { persistence = value; return Promise.resolve(); }, onAuthStateChanged: () => {} };
  const firebase = {
    initializeApp: config => { initializedProject = config.projectId; return {}; },
    auth: Object.assign(() => auth, { Auth: { Persistence: { LOCAL: 'local', SESSION: 'session' } } }),
    firestore: () => ({ enablePersistence: () => { throw new Error('Preview persistence forbidden'); } }),
  };
  const deployment = { mode: 'preview', allowedHosts: ['qa-preview.example.test'], productionHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: production.projectId, config: qa };
  const FB = { access: {} };
  const window = { firebase, FirebaseConfigSelector: { selectFirebaseConfig }, __FIREBASE_DEPLOYMENT__: deployment, addEventListener: () => {} };
  const context = { window, firebase, FB, firebaseConfig: production, location: { hostname: 'qa-preview.example.test' }, navigator: { onLine: true }, isLocalTestMode: () => false, isLocalAuthEmulatorMode: () => false, isProtectedReadOnlyQaBoot: () => true, debugWarn: () => {}, render: () => {}, CloudSyncState: {} };
  vm.runInNewContext(`${source.slice(start, end)}\ninitFirebase()`, context);
  assert.equal(initializedProject, qa.projectId);
  assert.equal(persistence, 'session');
  assert.equal(FB.ready, true);
});

test('V316 unavailable Firebase provider resolves to a controlled access failure', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function initFirebase(){');
  const end = source.indexOf('async function loadAccessControl(', start);
  const FB = { access: {} };
  const context = { window: { firebase: null }, FB, isLocalTestMode: () => false, debugWarn: () => {}, render: () => {} };
  vm.runInNewContext(`${source.slice(start, end)}\ninitFirebase()`, context);
  assert.equal(FB.authResolved, true);
  assert.match(FB.access.reason, /indisponível/i);
});

test('V316 missing provider leaves a visible, disabled login gate', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function accessGateBox(){');
  const end = source.indexOf('function shouldShowAccessGate(){', start);
  assert.ok(start >= 0 && end > start);
  const FB = { ready: false, user: null, authResolved: true, access: { loading: false, reason: 'Autenticação indisponível neste ambiente.' } };
  const gate = vm.runInNewContext(`${source.slice(start, end)}\naccessGateBox`, { FB, esc: value => String(value) });
  assert.match(gate(), /Autenticação indisponível neste ambiente/);
  assert.match(gate(), /<button[^>]*disabled[^>]*>\s*<span[^>]*>G<\/span>/);
});
