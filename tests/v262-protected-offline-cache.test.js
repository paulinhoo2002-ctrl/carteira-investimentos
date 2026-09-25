const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const test = require('node:test');

const root = path.join(__dirname, '..');
const helperSource = fs.readFileSync(path.join(root, 'v250-offline-session.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    writes,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => { writes.push(key); values.set(key, String(value)); },
    removeItem: key => values.delete(key),
  };
}

function loadHelper() {
  const context = { crypto: webcrypto, TextEncoder, Date, Uint8Array };
  vm.runInNewContext(helperSource, context);
  return context.V250OfflineSession;
}

function stateWithActiveWallet(activeWalletId = 'real-wallet') {
  return {
    wallets: [
      { id: 'empty-wallet', name: 'Empty', assets: [], aportes: [], proventos: [], rfEvents: [] },
      { id: 'real-wallet', name: 'Main', assets: [{ id: 'asset-1', type: 'Renda Fixa' }], aportes: [], proventos: [], rfEvents: [] },
    ],
    activeWalletId,
    assets: [{ id: 'asset-1', type: 'Renda Fixa' }],
    aportes: [],
    proventos: [],
    rfEvents: [{ id: 'rf-event-1', sourceAsOf: '2026-09-24' }],
    goals: {},
    brapiToken: 'must-not-be-cached',
    settings: { apiKey: 'must-not-be-cached' },
  };
}

test('protected offline snapshot round-trips the selected wallet by stable id without writing civ5', async () => {
  const helper = loadHelper();
  const storage = makeStorage({ civ5: JSON.stringify({ wallets: [], activeWalletId: 'empty-wallet' }) });
  const saved = await helper.writeReadOnlySnapshot(storage, {
    scope: 'user-scope-a',
    state: stateWithActiveWallet(),
    asOf: '2026-09-24T12:00:00.000Z',
  });

  assert.ok(saved);
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.writes[0], helper.SNAPSHOT_KEY);
  assert.equal(storage.getItem('civ5'), JSON.stringify({ wallets: [], activeWalletId: 'empty-wallet' }));

  const restored = await helper.readReadOnlySnapshot(storage, { scope: 'user-scope-a', signature: saved.signature });
  assert.equal(restored.state.activeWalletId, 'real-wallet');
  assert.equal(restored.state.wallets.length, 1);
  assert.equal(restored.state.wallets[0].id, 'real-wallet');
  assert.equal(restored.state.wallets[0].assets.length, 1);
  assert.equal(restored.asOf, '2026-09-24T12:00:00.000Z');
  assert.equal(JSON.stringify(restored).includes('must-not-be-cached'), false);
  assert.equal(JSON.stringify(restored).includes('apiKey'), false);
});

test('protected offline snapshot rejects another user and a mismatched signature', async () => {
  const helper = loadHelper();
  const storage = makeStorage();
  const saved = await helper.writeReadOnlySnapshot(storage, {
    scope: 'user-scope-a', state: stateWithActiveWallet(), asOf: null,
  });

  assert.equal(await helper.readReadOnlySnapshot(storage, { scope: 'user-scope-b' }), null);
  assert.equal(await helper.readReadOnlySnapshot(storage, { scope: 'user-scope-a', signature: 'wrong' }), null);
  assert.ok(saved);
});

test('protected offline snapshot fails closed on corruption or missing active wallet', async () => {
  const helper = loadHelper();
  const storage = makeStorage();
  assert.equal(await helper.writeReadOnlySnapshot(storage, {
    scope: 'user-scope-a', state: stateWithActiveWallet('missing-wallet'), asOf: null,
  }), null);

  const saved = await helper.writeReadOnlySnapshot(storage, {
    scope: 'user-scope-a', state: stateWithActiveWallet(), asOf: null,
  });
  const record = JSON.parse(storage.getItem(helper.SNAPSHOT_KEY));
  record.state.activeWalletId = 'empty-wallet';
  storage.setItem(helper.SNAPSHOT_KEY, JSON.stringify(record));
  assert.equal(await helper.readReadOnlySnapshot(storage, { scope: 'user-scope-a', signature: saved.signature }), null);
});

test('protected QA caches only confirmed authenticated read state and restores it before offline UI', () => {
  assert.match(index, /function persistProtectedReadOnlyOfflineSnapshot\(/);
  assert.match(index, /async function restoreProtectedReadOnlyOfflineSnapshot\(/);
  assert.match(index, /if\(isProtectedReadOnlyQaBoot\(\)\) return false;/);
  assert.match(index, /persistProtectedReadOnlyOfflineSnapshot\(\)/);
  assert.match(index, /restoreProtectedReadOnlyOfflineSnapshot\(FB\.user\)/);
  assert.match(index, /readOnlyOfflineSnapshotReady/);
  assert.match(index, /clearReadOnlySnapshot\?\.\(localStorage\)/);
  assert.match(index, /navigator\.onLine===false && await restoreProtectedReadOnlyOfflineSnapshot\(FB\.user\)/);
  assert.match(index, /cachedWalletId && S\.wallets\.some\(wallet=>String\(wallet\.id\|\|'\'\)===cachedWalletId\)/);
  assert.match(index, /if\(isProtectedReadOnlyQaBoot\(\)\) return;/);
});
