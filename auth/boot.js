'use strict';

/**
 * Authorization-first boot controller (Phase 2 — mission P6).
 *
 * Order is LAW (BOOT_STEPS): Firebase init → resolve auth → loading UI →
 * emailVerified → authorization registry → ACCOUNT_MODE → data source →
 * portfolio load → render. Portfolio data is only ever fetched AFTER mode
 * resolution: REAL_DATA_FETCH_BEFORE_AUTHORIZATION=0.
 *
 * Fail-closed: any failed check stops boot in a safe state — never falls
 * back to another UID, legacy global data, or cached real state. On DEMO or
 * BLOCKED/LOGIN_REQUIRED the host must drop cached real data
 * (clearRealCache) before any rendering.
 */
(function exposeBoot(root, factory){
  const api = factory(
    (typeof module === 'object' && module.exports)
      ? require('./account-mode')
      : (root && root.AccountMode) || {}
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AuthBoot = api;
})(typeof globalThis === 'object' ? globalThis : this, function createBoot(accountMode){

  const resolveAccountMode = accountMode.resolveAccountMode;
  const MODES = accountMode.MODES;

  const BOOT_STEPS = Object.freeze([
    'INIT_FIREBASE',        // 1
    'RESOLVE_AUTH',         // 2
    'SHOW_LOADING',         // 3
    'INSPECT_EMAIL_VERIFIED', // 4
    'LOAD_AUTHORIZATION',   // 5
    'RESOLVE_ACCOUNT_MODE', // 6
    'SELECT_DATA_SOURCE',   // 7
    'LOAD_PORTFOLIO',       // 8 — only after 6/7
    'RENDER',               // 9
  ]);

  /**
   * Run the boot sequence. All capabilities are injected by the host app.
   * Returns the session; throws BOOT_FAIL_CLOSED:* on guard violations.
   */
  async function runBoot(deps) {
    if (!deps || typeof deps !== 'object') throw new TypeError('runBoot requires deps');
    const log = [];
    const step = (name) => log.push(name);

    await deps.initFirebase(); step('INIT_FIREBASE');                 // 1
    const authUser = await deps.resolveAuthUser(); step('RESOLVE_AUTH'); // 2
    deps.showLoading(); step('SHOW_LOADING');                          // 3
    const emailVerified = deps.getEmailVerified
      ? deps.getEmailVerified(authUser)
      : Boolean(authUser && authUser.emailVerified);
    step('INSPECT_EMAIL_VERIFIED');                                    // 4
    const authorization = authUser && authUser.uid
      ? await deps.loadAuthorization(authUser)   // own registry path only
      : null;
    step('LOAD_AUTHORIZATION');                                        // 5
    const mode = resolveAccountMode({ authUser, emailVerified, authorization });
    step('RESOLVE_ACCOUNT_MODE');                                      // 6

    // 7 — data source selection with hard fail-closed guards.
    let source = null;
    if (mode === MODES.REAL) {
      if (!authUser || !authUser.uid) {
        throw new Error('BOOT_FAIL_CLOSED:REAL_WITHOUT_UID');
      }
      source = deps.createRealSource(authUser.uid, { accountMode: MODES.REAL });
    } else if (mode === MODES.DEMO) {
      source = deps.createDemoSource();
      if (deps.clearRealCache) deps.clearRealCache(); // revocation/flash safety
    } else {
      // LOGIN_REQUIRED / BLOCKED: no data source, no data load.
      if (deps.clearRealCache) deps.clearRealCache();
    }
    step('SELECT_DATA_SOURCE');

    // 8 — portfolio load ONLY after mode + source; never for BLOCKED/LOGIN.
    let portfolio = null;
    if (mode === MODES.REAL || mode === MODES.DEMO) {
      portfolio = await deps.loadPortfolio(source);
    }
    step('LOAD_PORTFOLIO');

    // 9
    deps.render({ accountMode: mode, source, portfolio, authUser, authorization, emailVerified, log });
    step('RENDER');

    return { accountMode: mode, source, portfolio, authUser, authorization, emailVerified, log };
  }

  /**
   * P24 — settings sync classification. Fail-closed: anything not explicitly
   * classified SYNC_ACCOUNT stays local (never synced blindly).
   */
  const SETTINGS_SYNC_POLICY = Object.freeze({
    SYNC_ACCOUNT: ['theme', 'currency', 'locale', 'goals', 'divGoal', 'dashboardPeriod', 'rentabilidadeBenchmark'],
    DEVICE_LOCAL: ['selectedTab', 'openModal', 'temporaryUiState', 'scrollPosition', 'browserCacheFlags'],
  });

  function classifySetting(key) {
    if (SETTINGS_SYNC_POLICY.SYNC_ACCOUNT.includes(key)) return 'SYNC_ACCOUNT';
    if (SETTINGS_SYNC_POLICY.DEVICE_LOCAL.includes(key)) return 'DEVICE_LOCAL';
    return 'UNCLASSIFIED_DO_NOT_SYNC';
  }

  return { BOOT_STEPS, runBoot, SETTINGS_SYNC_POLICY, classifySetting, MODES };
});
