const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const helperSource = fs.readFileSync(path.join(root, 'v250-offline-session.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

function loadHelper() {
  const context = { crypto: {}, TextEncoder, Date, Uint8Array };
  vm.runInNewContext(helperSource, context);
  return context.V250OfflineSession;
}

test('offline session marker is metadata-only and fails closed for cold offline', () => {
  const helper = loadHelper();
  const storage = makeStorage({ civ5: JSON.stringify({ assets: [{ id: 'fixture' }] }) });
  assert.equal(helper.snapshotHasData(storage), true);
  assert.equal(helper.eligible({ online: false, marker: null, hasSnapshot: true }), false);
  assert.equal(helper.eligible({ online: true, marker: { eligible: true }, hasSnapshot: true }), false);
  assert.equal(helper.eligible({ online: false, marker: { eligible: true }, hasSnapshot: true }), true);
});

test('offline session marker can be cleared by explicit logout without touching portfolio payload', () => {
  const helper = loadHelper();
  const storage = makeStorage({
    civ5: JSON.stringify({ assets: [{ id: 'fixture' }] }),
    [helper.KEY]: JSON.stringify({ version: 1, eligible: true, scope: 'fixture' }),
  });
  helper.clear(storage);
  assert.equal(storage.getItem(helper.KEY), null);
  assert.match(storage.getItem('civ5'), /fixture/);
});

test('trusted marker is not created without a local portfolio snapshot', () => {
  const helper = loadHelper();
  const storage = makeStorage();
  assert.equal(helper.snapshotHasData(storage), false);
  assert.equal(helper.eligible({ online: false, marker: { eligible: true }, hasSnapshot: false }), false);
});

test('V250B source contract gates offline shell before Firebase access gate', () => {
  assert.match(index, /v250-offline-session\.js/);
  assert.match(index, /function isV250OfflineCachedSession\(\)/);
  assert.match(index, /if\(isV250OfflineCachedSession\(\)\) return false;/);
  assert.match(index, /clearV250OfflineEligibility\(\)/);
  assert.match(index, /typeof isV250OfflineCachedSession==='function' && isV250OfflineCachedSession\(\) && !protectedLocalRecoveryWrite/);
  assert.match(index, /rememberV250TrustedSnapshot/);
  assert.match(index, /FB\.user && !isV250OfflineCachedSession\(\) && !CloudSyncState\.isDataConfirmed/);
  assert.match(index, /window\.addEventListener\('online',\(\)=>\{[\s\S]*?if\(!FB\.user\)/);
});

test('V250B service worker ships the offline session helper in the versioned shell', () => {
  assert.match(sw, /'\.\/v250-offline-session\.js'/);
  assert.match(sw, /const SW_VERSION = 'v250\.1'/);
});

test('V250B source contains no credential persistence primitive', () => {
  assert.doesNotMatch(helperSource, /accessToken|refreshToken|storageState|password|cookie/i);
  assert.doesNotMatch(index, /V250OfflineSession[\s\S]{0,500}(accessToken|refreshToken|storageState|password)/i);
});
