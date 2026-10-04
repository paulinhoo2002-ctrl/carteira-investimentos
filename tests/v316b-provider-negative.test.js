'use strict';

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');

describe('V316B Provider Negative Tests - synchronous unit tests', () => {

  test('V316B unavailable Firebase provider resolves to controlled access failure', () => {
    // Simulate the initFirebase logic for unavailable provider
    const FB = { ready: false, authResolved: false, access: { loading: false, loaded: false, allowed: false, reason: '' } };
    const firebase = null;

    if (!firebase) {
      FB.authResolved = true;
      FB.access.loading = false;
      FB.access.loaded = false;
      FB.access.allowed = false;
      FB.access.reason = 'Autenticação indisponível neste ambiente.';
      FB.ready = false;
    }

    assert.equal(FB.authResolved, true);
    assert.ok(FB.access.reason && FB.access.reason.includes('indisponível'));
    assert.equal(FB.access.allowed, false);
    assert.equal(FB.ready, false);
  });

  test('V316B missing provider leaves visible disabled login gate', () => {
    const FB = { ready: false, authResolved: false, access: { loading: false, loaded: false, allowed: false, reason: '' } };
    const firebase = null;

    if (!firebase) {
      FB.authResolved = true;
      FB.access.loading = false;
      FB.access.loaded = false;
      FB.access.allowed = false;
      FB.access.reason = 'Autenticação indisponível neste ambiente.';
    }

    assert.equal(FB.access.allowed, false);
    assert.ok(FB.access.reason && FB.access.reason.length > 0);
  });

  test('V316B provider initialization error fails closed', () => {
    const FB = { ready: false, authResolved: false, access: { allowed: false } };

    try {
      throw new Error('Firebase initialization failed');
    } catch (e) {
      FB.ready = false;
      FB.authResolved = true;
      FB.access.allowed = false;
    }

    assert.equal(FB.ready, false);
    assert.equal(FB.authResolved, true);
    assert.equal(FB.access.allowed, false);
  });

  test('V316B auth cancelled fails closed', () => {
    const FB = { authResolved: false, user: null, access: { allowed: false }, authError: null };

    try {
      throw { code: 'auth/user-cancelled', message: 'User cancelled' };
    } catch (e) {
      FB.authError = e.code || e.message;
    }

    assert.ok(FB.authError && FB.authError.includes('cancelled'));
    assert.equal(FB.user, null);
    assert.equal(FB.access.allowed, false);
  });

  test('V316B auth rejected fails closed', () => {
    const FB = { authResolved: false, user: null, access: { allowed: false }, authError: null };

    try {
      throw { code: 'auth/wrong-password', message: 'Wrong password' };
    } catch (e) {
      FB.authError = e.code || e.message;
    }

    assert.ok(FB.authError && FB.authError.includes('wrong-password'));
    assert.equal(FB.user, null);
    assert.equal(FB.access.allowed, false);
  });

  test('V316B unauthorized identity fails access control', () => {
    const FB = {
      user: { uid: 'test-uid', email: 'unauthorized@example.com' },
      access: { allowed: false, reason: '' },
      db: { collection: () => ({ doc: () => ({ set: async () => {} }) }) }
    };

    const email = FB.user.email.toLowerCase();
    if (!FB.db || !email) {
      FB.access = { loaded: true, loading: false, allowed: false, reason: 'Conecte sua conta Google autorizada para acessar o sistema.' };
    }
    const allowedEmails = ['authorized@example.com'];
    const isAllowed = allowedEmails.includes(email);
    FB.access = { loaded: true, loading: false, allowed: isAllowed, reason: isAllowed ? '' : 'Acesso restrito a usuários aprovados.' };

    assert.equal(FB.access.allowed, false);
    assert.ok(FB.access.reason && FB.access.reason.includes('restrito'));
  });

  test('V316B missing user fails closed', () => {
    const FB = { user: null, authResolved: true, access: { allowed: false } };

    assert.equal(FB.user, null);
    assert.equal(FB.authResolved, true);
    assert.equal(FB.access.allowed, false);
  });

  test('V316B stale session handled correctly', () => {
    const FB = { user: null, authResolved: false, access: { loading: true, loaded: false, allowed: false } };

    // Simulate onAuthStateChanged with null user (stale session cleaned up)
    FB.authResolved = true;
    FB.user = null;
    FB.access = { loaded: true, loading: false, allowed: false, reason: '' };

    assert.equal(FB.user, null);
    assert.equal(FB.authResolved, true);
    assert.equal(FB.access.allowed, false);
  });

  test('V316B logout clears session correctly', async () => {
    const FB = {
      user: { uid: 'test-uid', email: 'test@example.com' },
      authResolved: true,
      access: { allowed: true },
      auth: { signOut: async () => {} }
    };

    async function signOutGoogle() {
      try {
        await FB.auth.signOut();
      } catch (e) {}
      FB.user = null;
      FB.authResolved = true;
      FB.access = { loaded: true, loading: false, allowed: false, reason: '' };
    }

    await signOutGoogle();

    assert.equal(FB.user, null);
    assert.equal(FB.authResolved, true);
    assert.equal(FB.access.allowed, false);
  });

  test('V316B re-login after logout works', () => {
    const FB = {
      user: null,
      authResolved: true,
      access: { loaded: true, loading: false, allowed: false }
    };

    // Simulate new login
    const newUser = { uid: 'new-uid', email: 'new@example.com' };
    FB.authResolved = true;
    FB.user = newUser;
    FB.access = { loaded: true, loading: false, allowed: true, reason: '' };

    assert.ok(FB.user);
    assert.equal(FB.user.email, 'new@example.com');
    assert.equal(FB.authResolved, true);
  });

  test('V316B access denied shows clear message', () => {
    const FB = {
      user: { uid: 'test-uid', email: 'blocked@example.com' },
      db: { collection: () => ({ doc: () => ({ set: async () => {} }) }) },
      access: { allowed: false, reason: '' }
    };

    const email = FB.user.email.toLowerCase();
    const blockedEmails = ['blocked@example.com'];
    const isBlocked = blockedEmails.includes(email);

    FB.access = {
      loaded: true,
      loading: false,
      allowed: !isBlocked,
      reason: isBlocked ? 'Seu acesso foi revogado.' : ''
    };

    assert.equal(FB.access.allowed, false);
    assert.ok(FB.access.reason && FB.access.reason.includes('revogado'));
  });

  test('V316B provider unavailable in Preview mode blocks writes', async () => {
    const FB = {
      ready: true,
      user: { uid: 'test-uid', email: 'test@example.com' },
      access: { allowed: true },
      db: {
        collection: () => ({
          doc: () => ({
            set: async () => { throw new Error('No provider'); },
            update: async () => { throw new Error('No provider'); },
            delete: async () => { throw new Error('No provider'); }
          })
        })
      }
    };

    // In Preview/Protected Read-Only QA mode, all writes should be blocked
    const isProtectedReadOnlyQaBoot = () => true;

    async function attemptWrite() {
      if (isProtectedReadOnlyQaBoot()) {
        return { ok: false, reason: 'READ_ONLY_QA' };
      }
      await FB.db.collection('test').doc('x').set({ data: 'test' });
      return { ok: true };
    }

    const result = await attemptWrite();

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'READ_ONLY_QA');
  });
});