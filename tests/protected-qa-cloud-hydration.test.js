'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return html.slice(start, end);
}

function makeHarness({ protectedQa = true } = {}) {
  const storageWrites = [];
  const debug = [];
  const state = {
    wallets: [],
    activeWalletId: 'wallet-1',
    assets: [],
    aportes: [],
    proventos: [],
    rfEvents: [],
    goals: {},
    tab: 'dashboard',
    divGoal: 0,
    learnMeta: {}
  };
  const context = {
    S: state,
    STOR: 'civ5',
    FB: { pendingCloudSave: false, applying: false },
    window: {
      ProtectedLocalCloudAuthority: null,
      ProtectedRealPilotReadiness: null,
      ProtectedIncomeLinkage: {
        mergeReferenceIncomeEvents: (_local, cloud) => cloud
      }
    },
    localStorage: {
      getItem: () => null,
      setItem: (...args) => storageWrites.push(args),
      removeItem: () => {}
    },
    document: { documentElement: { dataset: {} } },
    isProtectedReadOnlyQaBoot: () => protectedQa,
    isAuthoritativeLocalRecoveryBoot: () => false,
    markProtectedLocalMarkerMismatch: () => null,
    debugInfo: (...args) => debug.push(args),
    cloudSnapshotSignature: () => JSON.stringify({ assets: state.assets.length }),
    normalizeWalletEntry: (wallet) => wallet,
    syncStateFromWallet: (wallet) => {
      state.assets = wallet?.assets || [];
      state.aportes = wallet?.aportes || [];
      state.proventos = wallet?.proventos || [];
      state.rfEvents = wallet?.rfEvents || [];
    },
    normalizeRfEvents: (events) => events,
    normalizeGoals: (goals = {}) => goals,
    rebuildLearnMeta: () => {}
  };
  vm.runInNewContext(`${extract('async function applyCloudData(d){', 'function startCloudSync')}`, context);
  return { context, storageWrites, debug };
}

test('protected QA hydrates a real cloud snapshot into memory from an empty local state', async () => {
  const { context, storageWrites, debug } = makeHarness();
  const changed = await context.applyCloudData({
    assets: [{ ticker: 'AAA3', value: 123.45 }],
    aportes: [{ type: 'compra', date: '2026-09-19' }],
    proventos: [],
    rfEvents: [],
    updatedAtLocal: '2026-09-19T12:00:00.000Z'
  });

  assert.equal(changed, true);
  assert.equal(context.S.assets.length, 1);
  assert.equal(context.S.assets[0].ticker, 'AAA3');
  assert.equal(storageWrites.length, 0);
  assert.match(debug.map((entry) => entry[0]).join('\n'), /hidratação em memória permitida/);
});

test('protected QA source contract allows read and memory hydration but keeps persistence and writes fail-closed', () => {
  const applySource = extract('async function applyCloudData(d){', 'function startCloudSync');
  const queueSource = extract('function queueCloudSave(){', 'async function uploadLocalToCloud');
  const saveSource = extract('function save(){', 'async function releaseCloudSyncAfterSuccessfulReconciliation');

  assert.doesNotMatch(applySource, /if\(isProtectedReadOnlyQaBoot\(\)\s*\|\|\s*isAuthoritativeLocalRecoveryBoot\(\)\)/);
  assert.match(applySource, /if\(!isProtectedReadOnlyQaBoot\(\)\)\{/);
  assert.match(queueSource, /if\(isProtectedReadOnlyQaBoot\(\) \|\| isAuthoritativeLocalRecoveryBoot\(\)\) return;/);
  assert.match(saveSource, /isProtectedReadOnlyQaBoot\(\) && !protectedLocalRecoveryWrite/);
  assert.match(html, /function uploadLocalToCloud\([\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return/);
});

test('authoritative local recovery remains blocked from cloud snapshot application', async () => {
  const { context } = makeHarness({ protectedQa: false });
  context.isAuthoritativeLocalRecoveryBoot = () => true;
  const changed = await context.applyCloudData({ assets: [{ ticker: 'AAA3' }] });
  assert.equal(changed, false);
  assert.equal(context.S.assets.length, 0);
});
