'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const blockStart = html.indexOf('// SM173-BEGIN');
const blockEnd = html.indexOf('// SM173-END', blockStart);
assert.ok(blockStart >= 0 && blockEnd > blockStart, 'CIV5 implementation block exists');
const civ5Block = html.slice(blockStart, blockEnd);
const saveStart = html.indexOf('\nfunction save(){') + 1;
const saveEnd = html.indexOf('\n}\nasync function releaseCloudSyncAfterSuccessfulReconciliation', saveStart) + 2;
assert.ok(saveStart > 0 && saveEnd > saveStart, 'production save() function exists');
const saveSource = html.slice(saveStart, saveEnd);

function storage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('auth callback awaits CIV5 binding before access resolution and local hydration', () => {
  const start = html.indexOf('FB.auth.onAuthStateChanged(async user=>{');
  const end = html.indexOf('if(!FB.authResolved){', start);
  assert.ok(start >= 0 && end > start, 'Firebase auth callback exists');
  const callback = html.slice(start, end);
  const userSet = callback.indexOf('FB.user = user || null;');
  const bind = callback.indexOf('await civ5BindIdentity(FB.user);');
  const access = callback.indexOf('await loadAccessControl(user,authSession);');
  const hydrate = callback.indexOf('hydrateAuthorizedLocalState();');
  assert.ok(userSet >= 0, 'session user is assigned');
  assert.ok(bind > userSet, 'session user is assigned before binding');
  assert.ok(access > bind, 'authorization resolution waits until CIV5 identity binding completes');
  assert.ok(hydrate > access, 'local portfolio hydration follows the authorization decision');
});

test('slow CIV5 hash blocks save until the real identity binding completes', async () => {
  let finishDigest;
  const st = storage();
  const ctx = {
    STOR: 'civ5',
    localStorage: st,
    FB: { user: { uid: 'qa-user-synthetic' }, app: { options: { projectId: 'carteira-homolog-sm118' } }, accountMode: 'REAL' },
    S: {},
    crypto: { subtle: { digest: () => new Promise(resolve => { finishDigest = resolve; }) } },
    TextEncoder,
    isAccessAdmin: () => true,
    render() {},
    load() {},
    window: {},
    isLocalTestMode: () => false,
    isLocalTestReadOnlyMode: () => false,
    isV250OfflineCachedSession: () => false,
    isProtectedReadOnlyQaBoot: () => false,
    isAuthoritativeLocalRecoveryBoot: () => false,
    canEditFromThisTab: () => true,
    syncWalletFromState() {},
    normalizeGoals(value) { return value; },
    PersistenceCore: { serializeStoredState: () => '{"synthetic":true}' },
    queueCloudSave() {},
    toast() {},
    debugError() {},
    Promise, Object, String, Number, Array, JSON, Map, Set, Error,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`${civ5Block}\n${saveSource}\nthis.__api={civ5BindIdentity,civ5Gate,save};`, ctx);

  const binding = ctx.__api.civ5BindIdentity(ctx.FB.user);
  assert.equal(ctx.__api.civ5Gate(), 'IDENTITY_UNCONFIRMED');
  assert.equal(ctx.__api.save(), false, 'save remains fail-closed while identity hashing is pending');
  assert.equal(st.getItem('civ5'), null, 'premature save changes no financial storage');

  finishDigest(new Uint8Array(32).buffer);
  await binding;
  assert.equal(ctx.__api.civ5Gate(), 'ok', 'normal binding completes the existing owner check');
  assert.equal(ctx.__api.save(), true, 'save succeeds only after identity is bound');
  assert.equal(st.getItem('civ5'), '{"synthetic":true}');
});

test('CIV5 diagnostics are QA-host-only and contain status codes but no identity or finance values', () => {
  const st = storage();
  const qa = {
    STOR: 'civ5',
    localStorage: st,
    FB: { authResolved: true, localPortfolioLoaded: false, cloudLoaded: false, user: { uid: 'private-synthetic-uid' } },
    window: { location: { hostname: 'carteira-homolog-c5785e6-preview.vercel.app' } },
    crypto: globalThis.crypto,
    TextEncoder,
    isAccessAdmin: () => false,
    render() {}, load() {},
    console: { info(_label, entry) { qa.logs.push(entry); } },
    logs: [],
    Promise, Object, String, Number, Array, JSON, Map, Set, Error,
  };
  qa.globalThis = qa;
  vm.createContext(qa);
  vm.runInContext(`${civ5Block}\nthis.__api={civ5QaTrace,civ5QaDiagnosticsEnabled};`, qa);
  assert.equal(qa.__api.civ5QaDiagnosticsEnabled(), true);
  qa.__api.civ5QaTrace('save_blocked', 'FOREIGN_SCOPE');
  const entry = qa.window.__CIV5_QA_DIAGNOSTIC__()[0];
  assert.equal(entry.gateCode, 'FOREIGN_SCOPE');
  assert.equal(entry.authResolved, true);
  assert.equal(entry.identityBound, false);
  assert.deepEqual(Object.keys(entry).sort(), [
    'authResolved', 'cloudHydrated', 'event', 'gateCode', 'identityBound',
    'localHydrated', 'sequence', 'storageAvailable',
  ].sort());
  assert.equal(qa.logs.length, 1);

  const prod = { ...qa, window: { location: { hostname: 'carteira-investimentos-delta.vercel.app' } }, logs: [] };
  prod.console = { info(_label, entry) { prod.logs.push(entry); } };
  prod.globalThis = prod;
  vm.createContext(prod);
  vm.runInContext(`${civ5Block}\nthis.__api={civ5QaTrace,civ5QaDiagnosticsEnabled};`, prod);
  assert.equal(prod.__api.civ5QaDiagnosticsEnabled(), false);
  prod.__api.civ5QaTrace('save_blocked', 'FOREIGN_SCOPE');
  assert.equal(prod.logs.length, 0);
  assert.equal(prod.window.__CIV5_QA_DIAGNOSTIC__, undefined);
});
