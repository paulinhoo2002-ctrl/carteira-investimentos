'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'legacy', 'js', 'screens', 'settings.js');

function renderSettings({ testMode = true, readOnly = true, hideValues = false } = {}) {
  const calls = [];
  const context = {
    S: {
      wallets: [{ id: 'synthetic-wallet-1', name: 'Carteira Sintética' }],
      assets: [{ id: 'synthetic-asset-1' }],
      aportes: [], proventos: [], rfEvents: [], hideValues,
    },
    FB: { user: null, ready: false, syncInFlight: false },
    PWA: { installed: true, prompt: null },
    THEME: 'dark', APP_NAME: 'Carteira Sintética', RESET_IN_FLIGHT: false,
    CloudSyncState: { isDataConfirmed: () => false },
    ensureWallets: () => calls.push('ensureWallets'),
    activeWallet: () => context.S.wallets[0],
    activeWalletIndex: () => 0,
    cloudSyncState: () => null,
    cloudStatusText: () => 'Offline',
    canManageSecurity: () => false,
    isLocalTestMode: () => testMode,
    isLocalTestReadOnlyMode: () => readOnly,
    esc: value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
  };
  assert.equal(fs.existsSync(modulePath), true, 'settings renderer module must exist');
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  return { markup: context.settingsTab(), calls };
}

test('real settings renderer shows synthetic read-only state without enabling fixture restore', () => {
  const { markup, calls } = renderSettings();
  assert.deepEqual(calls, ['ensureWallets']);
  assert.match(markup, /Modo de teste local/);
  assert.match(markup, /Carteira Sintética/);
  assert.match(markup, /Bloqueado no modo somente leitura/);
  assert.doesNotMatch(markup, /onclick="restoreLocalTestData()"/);
  assert.ok(markup.includes('onclick="resetPortfolio(event)"'));
});

test('real settings renderer preserves hidden-value preference and offline account state', () => {
  const { markup } = renderSettings({ testMode: false, readOnly: false, hideValues: true });
  assert.match(markup, /Mostrar valores/);
  assert.match(markup, /aria-checked="true"/);
  assert.match(markup, /Faça login para sincronizar na nuvem/);
  assert.doesNotMatch(markup, /Desconectar/);
});
