'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { BOOT_STEPS, runBoot, SETTINGS_SYNC_POLICY, classifySetting, MODES } = require('../auth/boot');
const { createFirestoreRealDataSource } = require('../auth/data-source');
const ui = require('../auth/boot-ui');

const session = { realDataCache: 'CACHED-REAL-PANEL' };
function makeDeps(over = {}) {
  const calls = [];
  return {
    calls, session,
    initFirebase: async () => calls.push('initFirebase'),
    resolveAuthUser: async () => { calls.push('resolveAuthUser'); return over.authUser !== undefined ? over.authUser : { uid: 'synthetic-owner', emailVerified: true }; },
    showLoading: () => calls.push('showLoading'),
    loadAuthorization: async () => { calls.push('loadAuthorization'); return over.authorization !== undefined ? over.authorization : { enabled: true, blocked: false, role: 'owner' }; },
    createRealSource: (uid, opts) => { calls.push(`createRealSource:${uid}:${opts.accountMode}`); return { type: 'FIRESTORE_REAL', uid }; },
    clearRealCache: () => { calls.push('clearRealCache'); delete session.realDataCache; },
    loadPortfolio: async source => { calls.push('loadPortfolio'); return { loadedFrom: source.type }; },
    render: state => calls.push(`render:${state.accountMode}`),
    ...over.deps,
  };
}

test('authorized owner boot order resolves authorization before portfolio read', async () => {
  const deps = makeDeps();
  const result = await runBoot(deps);
  assert.deepEqual(result.log, BOOT_STEPS);
  assert.equal(result.accountMode, MODES.REAL);
  assert.ok(deps.calls.indexOf('loadAuthorization') < deps.calls.findIndex(x => x.startsWith('createRealSource')));
  assert.ok(deps.calls.findIndex(x => x.startsWith('createRealSource')) < deps.calls.indexOf('loadPortfolio'));
});
test('UNAUTHENTICATED_CANNOT_ACCESS_REAL_PORTFOLIO', async () => {
  const deps = makeDeps({ authUser: null });
  const result = await runBoot(deps);
  assert.equal(result.accountMode, MODES.LOGIN_REQUIRED);
  assert.equal(deps.calls.includes('loadPortfolio'), false);
  assert.equal(deps.calls.some(x => x.startsWith('createRealSource')), false);
  assert.equal(deps.calls.includes('clearRealCache'), true);
});
test('UNAUTHORIZED_CANNOT_ACCESS_REAL_PORTFOLIO', async () => {
  const deps = makeDeps({ authorization: null });
  const result = await runBoot(deps);
  assert.equal(result.accountMode, MODES.BLOCKED);
  assert.equal(deps.calls.includes('loadPortfolio'), false);
  assert.equal(deps.calls.some(x => x.startsWith('createRealSource')), false);
});
test('OWNER_CAN_ACCESS_REAL_PORTFOLIO', async () => {
  const deps = makeDeps();
  const result = await runBoot(deps);
  assert.equal(result.accountMode, MODES.REAL);
  assert.equal(deps.calls.includes('loadPortfolio'), true);
});
test('AUTH_FAILURE_FAILS_CLOSED and clears cached state without reading portfolio', async () => {
  const deps = makeDeps({ deps: { loadAuthorization: async () => { throw new Error('authorization unavailable'); } } });
  const result = await runBoot(deps);
  assert.equal(result.accountMode, MODES.AUTH_FAILURE);
  assert.equal(deps.calls.includes('loadPortfolio'), false);
  assert.equal(deps.calls.some(x => x.startsWith('createRealSource')), false);
  assert.equal(deps.calls.includes('clearRealCache'), true);
});
test('failed real portfolio load clears cached state and renders fail closed', async () => {
  const deps = makeDeps({ deps: { loadPortfolio: async () => { throw new Error('portfolio unavailable'); } } });
  const result = await runBoot(deps);
  assert.equal(result.accountMode, MODES.AUTH_FAILURE);
  assert.equal(deps.calls.includes('clearRealCache'), true);
  assert.ok(deps.calls.includes('render:AUTH_FAILURE'));
});
test('Firestore source requires explicit REAL mode', () => {
  const db = { collection: () => ({ doc: () => ({ get: async () => ({}) }) }) };
  assert.throws(() => createFirestoreRealDataSource('uid', db), /ACCOUNT_MODE=REAL/);
  assert.throws(() => createFirestoreRealDataSource('uid', db, { accountMode: 'BLOCKED' }), /ACCOUNT_MODE=REAL/);
  assert.equal(createFirestoreRealDataSource('uid', db, { accountMode: 'REAL' }).type, 'FIRESTORE_REAL');
});
test('login/loading/blocked templates contain no financial values or demo affordances', () => {
  const loading = ui.renderLoadingHtml();
  const login = ui.renderLoginHtml({ appName: 'Carteira' });
  const blocked = ui.renderBlockedHtml();
  assert.match(loading, /Verificando sua conta/);
  assert.match(login, /Continuar com Google/);
  assert.match(blocked, /Acesso não autorizado/);
  for (const html of [loading, login, blocked]) {
    assert.doesNotMatch(html, /R\$/);
    assert.doesNotMatch(html, /demonstração|dados fictícios|auth-demo/i);
  }
  assert.doesNotMatch(ui.renderLoginHtml(), /demo/i);
});
test('settings remain classified with unknown keys local', () => {
  assert.equal(classifySetting('theme'), 'SYNC_ACCOUNT');
  assert.equal(classifySetting('selectedTab'), 'DEVICE_LOCAL');
  assert.equal(classifySetting('brandNewSetting'), 'UNCLASSIFIED_DO_NOT_SYNC');
  assert.ok(SETTINGS_SYNC_POLICY.DEVICE_LOCAL.includes('temporaryUiState'));
});
