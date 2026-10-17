'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { MODES, normalizeEmail, resolveAccountMode, canAccessRealPortfolio, isDemoMode, isBlockedMode, modeLabel } =
  require('../auth/account-mode');
const { SOURCE_TYPES, createFirestoreRealDataSource, createLocalDemoDataSource } =
  require('../auth/data-source');
const { generateDemoPortfolio, generateDemoIrpfState, assertDemoSafety } =
  require('../auth/demo-portfolio');

// ===== B2/B6: ACCOUNT MODE RESOLVER =====

test('B6: unauthenticated user → LOGIN_REQUIRED', () => {
  assert.equal(resolveAccountMode({ authUser: null, emailVerified: false, authorization: null }), MODES.LOGIN_REQUIRED);
  assert.equal(resolveAccountMode({ authUser: undefined, emailVerified: false, authorization: null }), MODES.LOGIN_REQUIRED);
  assert.equal(resolveAccountMode({ authUser: { uid: '' }, emailVerified: false, authorization: null }), MODES.LOGIN_REQUIRED);
});

test('B6: authenticated + verified + authorized owner → REAL', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-001' },
    emailVerified: true,
    authorization: { enabled: true, role: 'owner', blocked: false },
  }), MODES.REAL);
});

test('B4: authenticated + NOT verified email → DEMO (not REAL)', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-002' },
    emailVerified: false,
    authorization: { enabled: true, role: 'owner', blocked: false },
  }), MODES.DEMO);
});

test('B2: authenticated + authorized but explicitly blocked → BLOCKED', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-003' },
    emailVerified: true,
    authorization: { enabled: true, role: 'user', blocked: true },
  }), MODES.BLOCKED);
});

test('B2: authenticated + no authorization record → DEMO', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-004' },
    emailVerified: true,
    authorization: null,
  }), MODES.DEMO);
});

test('B6: malformed authorization (string) → BLOCKED (fail closed)', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-005' },
    emailVerified: true,
    authorization: 'invalid-string',
  }), MODES.BLOCKED);
});

test('B6: invalid role → DEMO', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-006' },
    emailVerified: true,
    authorization: { enabled: true, role: 'superadmin-invalid', blocked: false },
  }), MODES.DEMO);
});

test('B6: enabled=false → DEMO', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-007' },
    emailVerified: true,
    authorization: { enabled: false, role: 'owner', blocked: false },
  }), MODES.DEMO);
});

test('B6: blocked takes precedence over verified email', () => {
  assert.equal(resolveAccountMode({
    authUser: { uid: 'test-uid-008' },
    emailVerified: true,
    authorization: { enabled: true, role: 'owner', blocked: true },
  }), MODES.BLOCKED);
});

// ===== B4: EMAIL NORMALIZATION =====

test('B4: email normalization trims and lowercases', () => {
  assert.equal(normalizeEmail('  USER@Example.COM  '), 'user@example.com');
  assert.equal(normalizeEmail('MiXeD@CaSe.CoM'), 'mixed@case.com');
  assert.equal(normalizeEmail(''), '');
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
});

// ===== B2: MODE CHECKS =====

test('B2: canAccessRealPortfolio only for REAL', () => {
  assert.ok(canAccessRealPortfolio(MODES.REAL));
  assert.ok(!canAccessRealPortfolio(MODES.DEMO));
  assert.ok(!canAccessRealPortfolio(MODES.BLOCKED));
  assert.ok(!canAccessRealPortfolio(MODES.LOGIN_REQUIRED));
});

test('B2: isDemoMode and isBlockedMode work correctly', () => {
  assert.ok(isDemoMode(MODES.DEMO));
  assert.ok(!isDemoMode(MODES.REAL));
  assert.ok(isBlockedMode(MODES.BLOCKED));
  assert.ok(!isBlockedMode(MODES.REAL));
});

test('B2: Portuguese mode labels', () => {
  assert.equal(modeLabel(MODES.REAL), 'Conta real');
  assert.equal(modeLabel(MODES.DEMO), 'Modo demonstração');
  assert.equal(modeLabel(MODES.BLOCKED), 'Conta bloqueada');
  assert.equal(modeLabel(MODES.LOGIN_REQUIRED), 'Entrar');
});

// ===== B8: DATA SOURCE CONTRACTS =====

test('B8: FirestoreRealDataSource requires UID and DB', () => {
  assert.throws(() => createFirestoreRealDataSource(null, {}), /UID/);
  assert.throws(() => createFirestoreRealDataSource('uid', null), /db/);
});

test('B8: LocalDemoDataSource creates with default key', () => {
  const ds = createLocalDemoDataSource();
  assert.equal(ds.type, SOURCE_TYPES.LOCAL_DEMO);
  assert.equal(ds.uid, null);
  assert.ok(typeof ds.load === 'function');
  assert.ok(typeof ds.save === 'function');
  assert.ok(typeof ds.reset === 'function');
});

test('B8: LocalDemoDataSource never has Firestore type', () => {
  const ds = createLocalDemoDataSource();
  assert.notEqual(ds.type, SOURCE_TYPES.FIRESTORE_REAL);
});

test('B8: data sources are frozen (immutable)', () => {
  const real = createFirestoreRealDataSource('uid', { collection: () => ({ doc: () => ({ get: async () => ({}) }) }) }, { accountMode: 'REAL' });
  const demo = createLocalDemoDataSource('test-key');
  assert.ok(Object.isFrozen(real));
  assert.ok(Object.isFrozen(demo));
});

// ===== B14: SYNTHETIC DEMO PORTFOLIO =====

test('B14: demo portfolio has synthetic assets only', () => {
  const demo = generateDemoPortfolio();
  assert.ok(demo.wallets.length > 0);
  assert.ok(demo.wallets[0].assets.length >= 6);
  // All tickers must be DEMO-prefixed or contain DEMO
  for (const asset of demo.wallets[0].assets) {
    assert.ok(asset.ticker.includes('DEMO') || asset.ticker.includes('demo'),
      `ticker ${asset.ticker} must be synthetic`);
  }
});

test('B14: demo portfolio includes stocks, FIIs, and fixed income', () => {
  const demo = generateDemoPortfolio();
  const assets = demo.wallets[0].assets;
  assert.ok(assets.some(a => a.type === 'Ação'));
  assert.ok(assets.some(a => a.type === 'FII'));
  assert.ok(assets.some(a => a.type === 'Renda Fixa'));
});

test('B14: demo has aportes, proventos, goals', () => {
  const demo = generateDemoPortfolio();
  assert.ok(demo.aportes.length > 0);
  assert.ok(demo.proventos.length > 0);
  assert.ok(demo.goals.length > 0);
});

test('B16: demo IRPF state is clearly demonstrative', () => {
  const irpf = generateDemoIrpfState();
  assert.equal(irpf.status, 'DEMONSTRATIVO');
  assert.equal(irpf.label, 'Dados fictícios');
  assert.ok(irpf.explanation.includes('fictício'));
  assert.ok(irpf.explanation.includes('demonstração'));
});

// ===== B32: PRIVACY / SAFETY GUARDS =====

test('B32: demo portfolio passes safety check (no real UID, tickers, values)', () => {
  const demo = generateDemoPortfolio();
  assert.ok(assertDemoSafety(demo));
});

test('B32: demo IRPF state passes safety check', () => {
  const irpf = generateDemoIrpfState();
  assert.ok(assertDemoSafety(irpf));
});

test('B32: safety check requires the synthetic provenance marker', () => {
  const clone = JSON.parse(JSON.stringify(generateDemoPortfolio()));
  delete clone.fixtureSource;
  assert.throws(() => assertDemoSafety(clone), /provenance/);
});

test('B32: safety check rejects non-synthetic asset namespace (generic, no real tickers used)', () => {
  const clone = JSON.parse(JSON.stringify(generateDemoPortfolio()));
  clone.wallets[0].assets[0].ticker = 'XXXX3'; // synthetic fake, not a real ticker
  assert.throws(() => assertDemoSafety(clone), /namespace/);
});

test('B32: safety check rejects UID-shaped identity generically (fake tokens)', () => {
  const clone = JSON.parse(JSON.stringify(generateDemoPortfolio()));
  clone.someIdentity = 'a'.repeat(28); // fake UID-shaped token
  assert.throws(() => assertDemoSafety(clone), /UID-shaped/);
  const clone2 = JSON.parse(JSON.stringify(generateDemoPortfolio()));
  clone2.ownerUid = 'real-owner-style-value'; // no DEMO marker — must be rejected
  assert.throws(() => assertDemoSafety(clone2), /identity field/);
});

test('B32: safety check rejects hosted paths and production artifacts (synthetic fakes)', () => {
  const base = () => JSON.parse(JSON.stringify(generateDemoPortfolio()));
  let c = base(); c.docPath = 'projects/fake-project/databases/(default)/documents/portfolios/aaaaaaaaaaaaaaaaaaaa';
  assert.throws(() => assertDemoSafety(c), /document path/);
  c = base(); c.pkg = 'package1_v2';
  assert.throws(() => assertDemoSafety(c), /production package/);
  c = base(); c.evidence = 'x/.qa-state/y';
  assert.throws(() => assertDemoSafety(c), /private evidence/);
  c = base(); c.backup = 'C:/x/_backups/y';
  assert.throws(() => assertDemoSafety(c), /private evidence/);
  c = base(); c.exportFile = 'movimentacao-2026-01-01-00-00-00.xlsx';
  assert.throws(() => assertDemoSafety(c), /private export/);
  c = base(); c.exportFile2 = 'PosicaoDetalhadaSintetica.xlsx';
  assert.throws(() => assertDemoSafety(c), /private export/);
});

test('B32: safety check rejects production project id only via configuration boundary', () => {
  const clone = JSON.parse(JSON.stringify(generateDemoPortfolio()));
  clone.project = 'fake-prod-project-999999';
  assert.throws(() => assertDemoSafety(clone, { forbiddenProjectIds: ['fake-prod-project-999999'] }), /production project/);
});

// ===== B7: NO PREMATURE REAL FETCH =====

test('B7: REAL mode can access real portfolio, others cannot', () => {
  assert.ok(canAccessRealPortfolio(MODES.REAL));
  assert.ok(!canAccessRealPortfolio(MODES.DEMO));
  assert.ok(!canAccessRealPortfolio(MODES.BLOCKED));
  assert.ok(!canAccessRealPortfolio(MODES.LOGIN_REQUIRED));
});

// ===== B17: DEMO → REAL TRANSITION SEMANTICS =====

test('B17: demo portfolio is separate from real (different source types)', () => {
  const demoSource = createLocalDemoDataSource('demo-key');
  assert.notEqual(demoSource.type, SOURCE_TYPES.FIRESTORE_REAL);
  // Demo data source has no UID (can't accidentally write to real path)
  assert.equal(demoSource.uid, null);
});

// ===== B11: CONCURRENT WRITE MODEL (design-level) =====

test('B11: Firestore data source uses merge (not whole-document replace)', async () => {
  let setOptions = null;
  const mockDb = {
    collection: () => ({
      doc: () => ({
        set: async (data, opts) => { setOptions = opts; },
        get: async () => ({ exists: true, data: () => ({}) }),
        onSnapshot: () => () => {},
      }),
    }),
  };
  const ds = createFirestoreRealDataSource('test-uid', mockDb, { accountMode: 'REAL' });
  await ds.save({ test: true });
  assert.ok(setOptions && setOptions.merge === true, 'save must use merge:true, not whole-document replace');
});

// ===== B30: LOGGING SAFETY =====

test('B30: mode label never contains tokens or credentials', () => {
  for (const mode of Object.values(MODES)) {
    const label = modeLabel(mode);
    assert.ok(!label.includes('token'));
    assert.ok(!label.includes('password'));
    assert.ok(!label.includes('secret'));
  }
});
