'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function switchWallet(id){');
const end = html.indexOf('function createWallet(){', start);
assert.ok(start >= 0 && end > start);

test('wallet switch restores previous state on failed save and succeeds once after reload', () => {
  const wallets = [
    { id: 'synthetic-a', name: 'A', assets: [{ ticker: 'SYN-A' }] },
    { id: 'synthetic-b', name: 'B', assets: [{ ticker: 'SYN-B' }] },
  ];
  const state = { wallets, activeWalletId: 'synthetic-a', assets: [{ ticker: 'SYN-A' }] };
  let fail = true;
  let durableId = 'synthetic-a';
  let writes = 0;
  const context = {
    S: state,
    ensureWallets() {},
    syncWalletFromState() {
      const active = state.wallets.find(wallet => wallet.id === state.activeWalletId);
      active.assets = JSON.parse(JSON.stringify(state.assets));
    },
    syncStateFromWallet(wallet) { state.assets = JSON.parse(JSON.stringify(wallet.assets)); },
    activeWallet() { return state.wallets.find(wallet => wallet.id === state.activeWalletId); },
    save() {
      if (fail || state._financialWriteQuarantined) {
        state._financialWriteQuarantined = true;
        return false;
      }
      writes += 1;
      durableId = state.activeWalletId;
      return true;
    },
    render() {},
    toast() {},
    isProtectedReadOnlyQaBoot: () => false,
  };
  vm.runInNewContext(html.slice(start, end), context);
  context.switchWallet('synthetic-b');
  assert.equal(state.activeWalletId, 'synthetic-a');
  assert.equal(state.assets[0].ticker, 'SYN-A');
  assert.equal(durableId, 'synthetic-a');
  assert.equal(writes, 0);
  context.switchWallet('synthetic-b');
  assert.equal(state.activeWalletId, 'synthetic-a');
  state._financialWriteQuarantined = false; // simulated reload after persisted state check
  fail = false;
  context.switchWallet('synthetic-b');
  assert.equal(state.activeWalletId, 'synthetic-b');
  assert.equal(state.assets[0].ticker, 'SYN-B');
  assert.equal(durableId, 'synthetic-b');
  assert.equal(writes, 1);
});
