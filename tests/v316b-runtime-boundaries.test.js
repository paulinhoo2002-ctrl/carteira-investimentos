'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function runtime(startMarker, endMarker, context, call) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `runtime boundary ${startMarker}`);
  return vm.runInNewContext(`${html.slice(start, end)}\n${call}`, context);
}

test('V316B actual access log guard prevents Firestore writes in Preview QA', async () => {
  let writes = 0;
  const context = {
    isProtectedReadOnlyQaBoot: () => true,
    FB: { db: { collection: () => { writes++; throw new Error('write path reached'); } } },
  };
  const result = await runtime('async function recordAccessAttempt(', 'function portfolioRef(', context,
    "recordAccessAttempt({uid:'synthetic-user'},true,'test')");
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'PROTECTED_READ_ONLY_QA_BOOT');
  assert.equal(writes, 0);
});

test('V316B actual save blocks even protected recovery override on Preview', () => {
  let writes = 0;
  const errors = [];
  const context = {
    S: {}, FB: {}, STOR: 'synthetic-state', normalizeGoals: () => [],
    PersistenceCore: { serializeStoredState: () => '{}', buildStoredState: () => ({}) },
    window: { __FIREBASE_DEPLOYMENT__: { mode: 'preview' }, ProtectedLocalCloudAuthority: {
      readMarker: () => ({}), fingerprintState: () => 'synthetic-fingerprint',
      createMarker: () => ({ synthetic: true }),
    } },
    globalThis: {}, isV250OfflineCachedSession: () => false,
    isLocalTestMode: () => false,
    isProtectedReadOnlyQaBoot: () => true,
    syncWalletFromState: () => {},
    localStorage: { getItem: () => null, setItem: () => { writes++; } },
    toast: () => {}, debugError: (...args) => errors.push(args),
  };
  const result = runtime('function save(){', 'async function releaseCloudSyncAfterSuccessfulReconciliation(', context,
    'save({queueCloud:false,__protectedLocalRecoveryWrite:true})');
  assert.equal(result, false);
  assert.equal(writes, 0);
  assert.equal(errors.length, 0, String(errors[0]?.[1]));
});

test('V316B actual queueCloudSave leaves cloud write queue untouched in Preview QA', () => {
  const FB = { pendingCloudSave: false };
  runtime('function queueCloudSave(){', 'async function uploadLocalToCloud(', {
    FB, isProtectedReadOnlyQaBoot: () => true, isAuthoritativeLocalRecoveryBoot: () => false,
  }, 'queueCloudSave()');
  assert.equal(FB.pendingCloudSave, false);
});

test('V316B actual uploadLocalToCloud returns before Firestore access in Preview QA', async () => {
  let reads = 0;
  const result = await runtime('async function uploadLocalToCloud(', 'async function signInGoogle(){', {
    isV250OfflineCachedSession: () => false,
    isProtectedReadOnlyQaBoot: () => true,
    portfolioRef: () => { reads++; throw new Error('Firestore path reached'); },
  }, 'uploadLocalToCloud(false)');
  assert.equal(result.pass, false);
  assert.equal(result.reason, 'PROTECTED_READ_ONLY_QA_BOOT');
  assert.equal(reads, 0);
});

test('V316B actual startCloudSync refuses write mode in Preview QA', () => {
  let refs = 0;
  runtime('function startCloudSync(', 'function stopCloudSync(', {
    isLocalTestMode: () => false, isAuthoritativeLocalRecoveryBoot: () => false,
    isProtectedReadOnlyQaBoot: () => true,
    portfolioRef: () => { refs++; throw new Error('Firestore path reached'); },
  }, 'startCloudSync({readOnlyOnly:false})');
  assert.equal(refs, 0);
});

test('V316B actual Google login stays disabled without Firebase provider', async () => {
  let popup = 0;
  let notices = 0;
  await runtime('async function signInGoogle(){', 'async function signOutGoogle(){', {
    isLocalTestMode: () => false,
    FB: { ready: false, auth: { signInWithPopup: () => { popup++; } } },
    alert: () => { notices++; },
  }, 'signInGoogle()');
  assert.equal(popup, 0);
  assert.equal(notices, 1);
});

test('V316B actual Google provider rejection keeps access denied and reports controlled error', async () => {
  let notices = 0;
  const FB = {
    ready: true, access: { allowed: false },
    auth: { signInWithPopup: async () => { throw new Error('synthetic provider rejection'); } },
  };
  await runtime('async function signInGoogle(){', 'async function signOutGoogle(){', {
    isLocalTestMode: () => false, FB,
    firebase: { auth: { GoogleAuthProvider: function () {} } },
    firebaseAuthPersistenceReady: Promise.resolve(),
    debugWarn: () => {}, alert: () => { notices++; },
  }, 'signInGoogle()');
  assert.equal(FB.access.allowed, false);
  assert.equal(notices, 1);
});
