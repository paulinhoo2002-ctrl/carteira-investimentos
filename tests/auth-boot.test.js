'use strict';

/**
 * AUTH-DEMO Phase 2 — boot security order, routing, transitions, UI templates,
 * demo persistence/interaction, settings policy and privacy guards.
 * Module-level (no emulator, no browser): P6-P18, P24, P26, P27, P31, P32.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { BOOT_STEPS, runBoot, SETTINGS_SYNC_POLICY, classifySetting, MODES } = require('../auth/boot');
const { createFirestoreRealDataSource, createLocalDemoDataSource, createMemoryStorage } = require('../auth/data-source');
const { generateDemoPortfolio, generateDemoIrpfState, assertDemoSafety } = require('../auth/demo-portfolio');
const ui = require('../auth/boot-ui');

const MOCK_DB = { collection: () => ({ doc: () => ({ get: async () => ({}), set: async () => {}, onSnapshot: () => () => {} }) }) };

function makeDeps(over = {}) {
  const calls = [];
  const realSource = { type: 'FIRESTORE_REAL', uid: 'uid-1' };
  const demoSource = { type: 'LOCAL_DEMO' };
  const session = { realDataCache: 'CACHED-REAL-PANEL' };
  const deps = {
    calls,
    initFirebase: async () => calls.push('initFirebase'),
    resolveAuthUser: async () => {
      calls.push('resolveAuthUser');
      return over.authUser !== undefined ? over.authUser : { uid: 'uid-1', emailVerified: true };
    },
    showLoading: () => calls.push('showLoading'),
    loadAuthorization: async () => {
      calls.push('loadAuthorization');
      return over.authorization !== undefined ? over.authorization : { enabled: true, blocked: false, role: 'owner' };
    },
    createRealSource: (uid, opts) => {
      calls.push('createRealSource:' + uid + ':' + (opts && opts.accountMode));
      return realSource;
    },
    createDemoSource: () => { calls.push('createDemoSource'); return demoSource; },
    clearRealCache: () => { calls.push('clearRealCache'); delete session.realDataCache; },
    loadPortfolio: async (src) => {
      calls.push('loadPortfolio:' + (src && src.type));
      return { loadedFrom: src && src.type };
    },
    render: (s) => calls.push('render:' + s.accountMode),
    session, realSource, demoSource,
  };
  return Object.assign(deps, over.deps || {});
}

// ===== P6: boot order =====

test('P6: boot follows the exact security order (REAL path)', async () => {
  const s = await runBoot(makeDeps());
  assert.deepEqual(s.log, BOOT_STEPS);
  assert.equal(s.accountMode, MODES.REAL);
});

test('P6: REAL_DATA_FETCH_BEFORE_AUTHORIZATION=0 — portfolio only after authorization, mode and source', async () => {
  const deps = makeDeps();
  await runBoot(deps);
  const c = deps.calls;
  const authz = c.indexOf('loadAuthorization');
  const src = c.indexOf('createRealSource:uid-1:REAL');
  const fetch = c.indexOf('loadPortfolio:FIRESTORE_REAL');
  const render = c.indexOf('render:REAL');
  assert.ok(authz >= 0 && src > authz && fetch > src && render > fetch, `order: ${c.join(',')}`);
});

test('P6: runBoot requires deps (fail closed)', async () => {
  await assert.rejects(() => runBoot(null), /deps/);
});

// ===== P8/P9/P10/P11: routing =====

test('P8: LOGIN_REQUIRED — login screen, no source, no portfolio load, cache cleared', async () => {
  const deps = makeDeps({ authUser: null });
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.LOGIN_REQUIRED);
  assert.equal(s.source, null);
  assert.equal(deps.calls.some((x) => x.startsWith('loadPortfolio')), false);
  assert.equal(deps.calls.some((x) => x.startsWith('createRealSource')), false);
  assert.equal(deps.calls.some((x) => x.startsWith('createDemoSource')), false);
  assert.ok(deps.calls.includes('clearRealCache'));
  assert.equal(deps.session.realDataCache, undefined, 'cached real state must be dropped');
});

test('P10: DEMO (unverified) — local demo source, zero real source construction', async () => {
  const deps = makeDeps({ authUser: { uid: 'u-demo', emailVerified: false } });
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.DEMO);
  assert.equal(s.source.type, 'LOCAL_DEMO');
  assert.equal(deps.calls.some((x) => x.startsWith('createRealSource')), false);
  assert.equal(deps.calls.includes('loadPortfolio:LOCAL_DEMO'), true);
  assert.ok(deps.calls.includes('clearRealCache'));
  assert.equal(deps.session.realDataCache, undefined);
});

test('P10: registry missing/unauthorized — DEMO, never REAL', async () => {
  const deps = makeDeps({ authorization: null });
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.DEMO);
  assert.equal(deps.calls.some((x) => x.startsWith('createRealSource')), false);
});

test('P11: BLOCKED — no data source, no portfolio load, no auto-DEMO', async () => {
  const deps = makeDeps({ authorization: { enabled: true, blocked: true, role: 'user' } });
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.BLOCKED);
  assert.equal(s.source, null);
  assert.equal(s.portfolio, null);
  assert.equal(deps.calls.some((x) => x.startsWith('createDemoSource')), false, 'blocked must not fall into demo');
  assert.equal(deps.calls.some((x) => x.startsWith('loadPortfolio')), false);
});

test('P9: REAL requires verified email — unverified authorized user routes DEMO', async () => {
  const deps = makeDeps({ authUser: { uid: 'uid-1', emailVerified: false } });
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.DEMO);
  assert.equal(deps.calls.some((x) => x.startsWith('createRealSource')), false);
});

// ===== P26/P27: transitions =====

test('P26: DEMO→REAL — real source selected, demo data NOT migrated or read', async () => {
  const demoStorage = createMemoryStorage();
  demoStorage.setItem('demo-key', '{"mutated":true}');
  const deps = makeDeps(); // authorized → REAL
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.REAL);
  assert.equal(deps.calls.some((x) => x.startsWith('createDemoSource')), false);
  assert.equal(demoStorage.getItem('demo-key'), '{"mutated":true}', 'demo state untouched by REAL boot');
});

test('P27: REAL→revoked — cached real cleared BEFORE demo render', async () => {
  const deps = makeDeps({ authorization: { enabled: false, blocked: false, role: 'user' } });
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.DEMO);
  assert.equal(deps.calls.some((x) => x.startsWith('createRealSource')), false);
  assert.equal(deps.session.realDataCache, undefined);
  assert.ok(deps.calls.indexOf('clearRealCache') < deps.calls.indexOf('render:DEMO'));
});

// ===== P18: real source hard guard =====

test('P18: FirestoreRealDataSource refuses construction unless ACCOUNT_MODE=REAL', () => {
  assert.throws(() => createFirestoreRealDataSource('uid', MOCK_DB), /ACCOUNT_MODE=REAL/);
  assert.throws(() => createFirestoreRealDataSource('uid', MOCK_DB, { accountMode: 'DEMO' }), /ACCOUNT_MODE=REAL/);
  assert.throws(() => createFirestoreRealDataSource('uid', MOCK_DB, { accountMode: 'BLOCKED' }), /ACCOUNT_MODE=REAL/);
  const ds = createFirestoreRealDataSource('uid', MOCK_DB, { accountMode: 'REAL' });
  assert.equal(ds.type, 'FIRESTORE_REAL');
  assert.equal(ds.uid, 'uid');
});

// ===== P7/P8/P12/P13/P28: boot UI templates =====

test('P7: loading state says "Verificando sua conta..." with live region, no values', () => {
  const html = ui.renderLoadingHtml();
  assert.ok(html.includes('Verificando sua conta...'));
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.ok(!html.includes('R$'));
});

test('P8: login renders Google; e-mail only when configured; appName escaped', () => {
  const plain = ui.renderLoginHtml({ appName: '<script>x</script>' });
  assert.ok(plain.includes('Continuar com Google'));
  assert.ok(!plain.includes('Entrar com e-mail'), 'unconfigured provider must stay hidden');
  assert.ok(!plain.includes('<script>'), 'appName must be escaped');
  const withEmail = ui.renderLoginHtml({ emailAuthConfigured: true });
  assert.ok(withEmail.includes('Entrar com e-mail'));
});

test('P11/P28: blocked screen — concise, no values, no mode jargon', () => {
  const html = ui.renderBlockedHtml();
  const visibleText = html.replace(/<[^>]*>/g, ' ').toLowerCase(); // copy only, not CSS classes
  assert.ok(html.includes('Acesso indisponível'));
  assert.ok(!visibleText.includes('r$'));
  assert.ok(!visibleText.includes('account mode'));
  assert.ok(!visibleText.includes('blocked'));
});

test('P12/P13: demo badge and reset control copy', () => {
  const badge = ui.renderDemoBadgeHtml();
  assert.ok(badge.includes('Modo demonstração'));
  assert.ok(badge.includes('Dados fictícios'));
  const reset = ui.renderDemoResetHtml();
  assert.ok(reset.includes('Restaurar demonstração'));
  assert.match(reset, /data-confirm="1"/);
});

test('esc escapes HTML metacharacters', () => {
  const escaped = ui.esc('<script>alert("x")&\'</script>');
  assert.ok(!escaped.includes('<script'), 'raw <script must not survive');
  assert.ok(escaped.includes('lt;script'));
  assert.ok(escaped.includes('quot;x'));
  assert.ok(escaped.includes('amp;'));
  assert.ok(escaped.includes('#39;'));
});

// ===== P24: settings sync classification =====

test('P24: settings classified; unknown stays local (fail closed)', () => {
  assert.equal(classifySetting('theme'), 'SYNC_ACCOUNT');
  assert.equal(classifySetting('goals'), 'SYNC_ACCOUNT');
  assert.equal(classifySetting('selectedTab'), 'DEVICE_LOCAL');
  assert.equal(classifySetting('brandNewSetting'), 'UNCLASSIFIED_DO_NOT_SYNC');
  assert.ok(SETTINGS_SYNC_POLICY.SYNC_ACCOUNT.includes('rentabilidadeBenchmark'));
  assert.ok(SETTINGS_SYNC_POLICY.DEVICE_LOCAL.includes('temporaryUiState'));
});

// ===== P31: demo privacy guards =====

test('P31: demo fixture/state pass privacy guard; generic guards reject synthetic fake injections', () => {
  assert.ok(assertDemoSafety(generateDemoPortfolio()));
  assert.ok(assertDemoSafety(generateDemoIrpfState()));
  const base = () => JSON.parse(JSON.stringify(generateDemoPortfolio()));
  let c = base(); c.doc = 'package1_v2';
  assert.throws(() => assertDemoSafety(c), /production package/);
  c = base(); c.file = 'movimentacao-2026-01-01-00-00-00.xlsx';
  assert.throws(() => assertDemoSafety(c), /private export/);
  c = base(); c.project = 'fake-prod-project-999999';
  assert.throws(() => assertDemoSafety(c, { forbiddenProjectIds: ['fake-prod-project-999999'] }), /production project/);
  c = base(); c.file2 = 'PosicaoDetalhadaSintetica.xlsx';
  assert.throws(() => assertDemoSafety(c), /private export/);
  c = base(); c.path = 'C:/x/_backups/y';
  assert.throws(() => assertDemoSafety(c), /private evidence/);
});

// ===== P15: demo local persistence + reset =====

test('P15: demo persists locally, reset restores exact synthetic fixture', async () => {
  const storage = createMemoryStorage();
  const ds = createLocalDemoDataSource('demo-key-p15', storage);
  assert.equal(await ds.load(), null);
  await ds.save(generateDemoPortfolio());
  const loaded = await ds.load();
  assert.ok(loaded.wallets.length > 0);
  // local mutation persists
  loaded.wallets[0].assets.push({ ticker: 'DEMO9', type: 'Ação', qty: 10, avg_price: 1, current_price: 1 });
  await ds.save(loaded);
  assert.equal((await ds.load()).wallets[0].assets.length, generateDemoPortfolio().wallets[0].assets.length + 1);
  // reset → deterministic default fixture restored exactly
  ds.reset();
  assert.equal(await ds.load(), null);
  await ds.save(generateDemoPortfolio());
  const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.updatedAt; delete c.updatedAtLocal; return c; };
  assert.deepEqual(strip(await ds.load()), strip(generateDemoPortfolio()));
});

// ===== P16: demo interaction (local-only) =====

test('P16: synthetic purchase/sale/income edits persist locally and stay safe', async () => {
  const storage = createMemoryStorage();
  const ds = createLocalDemoDataSource('demo-key-p16', storage);
  await ds.save(generateDemoPortfolio());
  const p = await ds.load();
  p.aportes.push({ id: 99, date: '2026-10-16', walletId: 'demo-wallet-001', amount: 111, note: 'compra sintética' });
  p.proventos.push({ id: 99, date: '2026-10-16', ticker: 'DEMO3', type: 'Dividendo', amount: 12.34, walletId: 'demo-wallet-001' });
  p.wallets[0].assets[0].qty -= 10; // synthetic sale
  await ds.save(p);
  const q = await ds.load();
  assert.equal(q.aportes.length, generateDemoPortfolio().aportes.length + 1);
  assert.ok(q.proventos.some((x) => x.ticker === 'DEMO3' && x.amount === 12.34));
  assert.ok(assertDemoSafety(q), 'mutated demo state must remain synthetic-safe');
});

// ===== P32: zero-cost structural proof =====

test('P32: DEMO boot constructs no Firestore source (DEMO_FIRESTORE_READS=0, WRITES=0)', async () => {
  const deps = makeDeps({ authUser: { uid: 'u-demo', emailVerified: false } });
  deps.createRealSource = () => { throw new Error('real source must not be constructed in DEMO'); };
  const s = await runBoot(deps);
  assert.equal(s.accountMode, MODES.DEMO);
  assert.equal(s.source.type, 'LOCAL_DEMO');
});
