'use strict';

/**
 * Account mode resolver — pure, testable, fail-closed.
 *
 * AUTH != AUTHORIZATION:
 *   Authentication = Firebase Auth (identity confirmed)
 *   Authorization = separate registry (access granted)
 *
 * Account modes:
 *   LOGIN_REQUIRED → not authenticated
 *   REAL            → authenticated + email verified + authorized
 *   BLOCKED         → authenticated but not authorized
 *   AUTH_FAILURE    → authentication/authorization validation failed
 *
 * Fail-closed: malformed authorization data → BLOCKED (never silently grant REAL).
 */
(function exposeAccountMode(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AccountMode = api;
})(typeof globalThis === 'object' ? globalThis : this, function createAccountMode(){

  const MODES = Object.freeze({
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    REAL: 'REAL',
    BLOCKED: 'BLOCKED',
    AUTH_FAILURE: 'AUTH_FAILURE',
  });

  /** Normalize email: trim + lowercase. */
  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  /**
   * Resolve account mode.
   * @param {object} params
   * @param {object|null} params.authUser - Firebase Auth user (or null)
   * @param {boolean} params.emailVerified - user.emailVerified
   * @param {object|null} params.authorization - authorization registry record
   * @param {boolean} params.authorization.enabled
   * @param {string|null} params.authorization.role - 'owner'|'user'|'viewer'|'admin'
   * @param {boolean} params.authorization.blocked
   * @returns {string} one of MODES
   */
  function resolveAccountMode({ authUser, emailVerified, authorization }) {
    // No auth user → must log in
    if (!authUser || !authUser.uid) return MODES.LOGIN_REQUIRED;

    // Authorization must be a valid object; fail closed on malformed data
    if (authorization === null || authorization === undefined) return MODES.BLOCKED;
    if (typeof authorization !== 'object') return MODES.BLOCKED; // malformed → fail closed

    // Explicitly blocked takes precedence over everything
    if (authorization.blocked === true) return MODES.BLOCKED;

    // Must have a valid role
    const VALID_ROLES = new Set(['owner', 'user', 'viewer', 'admin']);
    if (!VALID_ROLES.has(authorization.role)) return MODES.BLOCKED;

    // Must be enabled
    if (authorization.enabled === false) return MODES.BLOCKED;

    // Must have verified email for REAL access
    if (!emailVerified) return MODES.BLOCKED;

    return MODES.REAL;
  }

  /** Check if the mode allows real (Firestore) portfolio access. */
  function canAccessRealPortfolio(mode) {
    return mode === MODES.REAL;
  }

  /** Check if the mode is blocked. */
  function isBlockedMode(mode) {
    return mode === MODES.BLOCKED || mode === MODES.AUTH_FAILURE;
  }

  /** Portuguese label for UI. */
  function modeLabel(mode) {
    switch (mode) {
      case MODES.REAL: return 'Conta real';
      case MODES.BLOCKED: return 'Acesso não autorizado';
      case MODES.AUTH_FAILURE: return 'Falha ao validar acesso';
      case MODES.LOGIN_REQUIRED: return 'Entrar';
      default: return 'Desconhecido';
    }
  }

  return { MODES, normalizeEmail, resolveAccountMode, canAccessRealPortfolio, isBlockedMode, modeLabel };
});
