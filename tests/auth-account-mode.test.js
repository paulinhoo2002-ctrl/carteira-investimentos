'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MODES, normalizeEmail, resolveAccountMode, canAccessRealPortfolio, isBlockedMode, modeLabel, createSessionGuard } = require('../auth/account-mode');

const owner = { uid: 'synthetic-owner' };
const allowed = { enabled: true, role: 'owner', blocked: false };

test('UNAUTHENTICATED resolves to LOGIN_REQUIRED', () => {
  assert.equal(resolveAccountMode({ authUser: null, emailVerified: false, authorization: null }), MODES.LOGIN_REQUIRED);
});
test('OWNER_CAN_ACCESS_REAL_PORTFOLIO only for verified authorized user', () => {
  assert.equal(resolveAccountMode({ authUser: owner, emailVerified: true, authorization: allowed }), MODES.REAL);
  assert.equal(canAccessRealPortfolio(MODES.REAL), true);
  for (const mode of [MODES.LOGIN_REQUIRED, MODES.BLOCKED, MODES.AUTH_FAILURE]) assert.equal(canAccessRealPortfolio(mode), false);
});
test('UNAUTHORIZED_CANNOT_ACCESS_REAL_PORTFOLIO when authorization is absent or invalid', () => {
  for (const authorization of [null, undefined, 'bad', { enabled: false, role: 'owner' }, { enabled: true, role: 'unknown' }, { enabled: true, role: 'owner', blocked: true }]) {
    assert.equal(resolveAccountMode({ authUser: owner, emailVerified: true, authorization }), MODES.BLOCKED);
  }
});
test('unverified identity is blocked rather than falling back to demo', () => {
  assert.equal(resolveAccountMode({ authUser: owner, emailVerified: false, authorization: allowed }), MODES.BLOCKED);
});
test('AUTH_FAILURE remains a fail-closed state', () => {
  assert.equal(MODES.AUTH_FAILURE, 'AUTH_FAILURE');
  assert.equal(isBlockedMode(MODES.AUTH_FAILURE), true);
});
test('email normalization trims and lowercases', () => {
  assert.equal(normalizeEmail(' USER@Example.COM '), 'user@example.com');
  assert.equal(normalizeEmail(null), '');
});
test('labels contain no demo option and describe blocked access plainly', () => {
  assert.equal(modeLabel(MODES.REAL), 'Conta real');
  assert.equal(modeLabel(MODES.BLOCKED), 'Acesso não autorizado');
  assert.equal(modeLabel(MODES.AUTH_FAILURE), 'Falha ao validar acesso');
  assert.ok(!Object.values(MODES).includes('DEMO'));
});
test('stale authorization result cannot remain current after account changes', () => {
  const sessions = createSessionGuard();
  const userA = sessions.begin({ uid: 'synthetic-a' });
  const userB = sessions.begin({ uid: 'synthetic-b' });

  assert.equal(userA.isCurrent(), false);
  assert.equal(userB.isCurrent(), true);
  assert.equal(userB.uid, 'synthetic-b');
});
test('logout and same-user auth refresh invalidate older async decisions', () => {
  const sessions = createSessionGuard();
  const previous = sessions.begin({ uid: 'synthetic-owner' });
  const refreshed = sessions.begin({ uid: 'synthetic-owner' });
  assert.equal(previous.isCurrent(), false);
  assert.equal(refreshed.isCurrent(), true);

  const logout = sessions.begin(null);
  assert.equal(refreshed.isCurrent(), false);
  assert.equal(logout.isCurrent(), true);
});
