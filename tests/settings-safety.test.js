const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function extractResetPortfolio() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('async function resetPortfolio(){');
  const end = html.indexOf('// ══════════════════════════════════════', start + 10);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return html.slice(start, end);
}

function makeHarness({ confirm = true, typed = 'LIMPAR' } = {}) {
  const calls = [];
  const context = {
    S: {
      assets: [{ id: 'a1' }], aportes: [{ id: 'm1' }], proventos: [{ id: 'p1' }],
      rfEvents: [{ id: 'rf1' }], divGoal: 100, goals: { patrimonio: { target: 1 } },
      learnMeta: { PETR4: {} }, apHistoryOpen: false, apSearch: 'x', apSearchTimer: null,
      rentPeriod: '12m', rentType: 'all', rentBench: 'CDI', tab: 'settings',
      showA: true, editId: 'a1', _fa: {}, showP: true, editPId: 'p1', _fp: {},
      showD: true, editDId: 'd1', _fd: {}, brokerNoteImport: {}, brokerNoteImportSuccess: {},
      noteReview: {}, b3Review: {}, b3MovementReview: {}, rfPositionReview: {},
      b3ProventosReview: {}, rfEventEditor: {}, rfMovementEditor: {}
    },
    FB: { user: null },
    canEditFromThisTab: () => true,
    activeWallet: () => ({ name: 'Principal' }),
    normalizeGoals: () => ({ patrimonio: { target: 0 } }),
    syncWalletFromState: () => calls.push('syncWalletFromState'),
    save: () => calls.push('save'),
    saveConfig: () => calls.push('saveConfig'),
    uploadLocalToCloud: async () => calls.push('uploadLocalToCloud'),
    render: () => calls.push('render'),
    toast: message => calls.push(`toast:${message}`),
    confirm: () => confirm,
    prompt: () => typed,
    clearTimeout: () => {}
  };
  const fn = vm.runInNewContext(`${extractResetPortfolio()}\nresetPortfolio;`, context);
  return { context, fn, calls };
}

test('resetPortfolio clears RF events and RF editor state without real data access', async () => {
  const harness = makeHarness();
  await harness.fn();
  assert.equal(harness.context.S.rfEvents.length, 0);
  assert.equal(harness.context.S.rfEventEditor, null);
  assert.equal(harness.context.S.rfMovementEditor, null);
  assert.ok(harness.calls.includes('save'));
  assert.equal(harness.context.FB.user, null);
});

test('resetPortfolio cancellation preserves RF events', async () => {
  const harness = makeHarness({ confirm: false });
  await harness.fn();
  assert.deepEqual(harness.context.S.rfEvents, [{ id: 'rf1' }]);
  assert.deepEqual(harness.calls, []);
});

test('resetPortfolio rejects wrong confirmation word without mutation', async () => {
  const harness = makeHarness({ typed: 'CONFIRMO' });
  await harness.fn();
  assert.deepEqual(harness.context.S.rfEvents, [{ id: 'rf1' }]);
  assert.deepEqual(harness.context.S.assets, [{ id: 'a1' }]);
  assert.deepEqual(harness.calls, []);
});
