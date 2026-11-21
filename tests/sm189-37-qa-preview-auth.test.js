'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.qa-preview.rules'), 'utf8');
const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.firebaserc'), 'utf8')).projects;
const deployConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase.qa-preview.json'), 'utf8'));
const usersSource = html.match(/const QA_PREVIEW_USERS = Object\.freeze\((\{[\s\S]*?\})\);/)?.[1];
assert.ok(usersSource, 'exact QA identities must be configured');
const users = new Function(`return (${usersSource});`)();
const entries = Object.entries(users);
const emailC = 'qa-c-sm189-37@exemplo-invalido.test';
const emailD = 'qa-d-sm189-37@exemplo-invalido.test';
const googleEmail = 'psmarquesdossantos@gmail.com';

function selectConfig(hostname) {
  const source = html.slice(html.indexOf('const FIREBASE_QA_PROJECT_ID'), html.indexOf('let FB = {'));
  return new Function('firebaseConfig', 'firebaseQaPreviewConfig', 'location',
    `${source}\nreturn activeFirebaseConfig();`)(
      html.match(/const firebaseConfig = \{[\s\S]*?\n\};/)[0] && {
        projectId: 'carteira-de-investimento-16725',
        authDomain: 'carteira-de-investimento-16725.firebaseapp.com'
      },
      { projectId: 'carteira-invest-qa-v316', authDomain: 'carteira-invest-qa-v316.firebaseapp.com' },
      { hostname }
    );
}

function isAllowedQaIdentity(user, enabled = true) {
  const source = html.match(/function isQaPreviewAccount\(user\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source, 'QA identity guard must exist');
  return new Function('QA_PREVIEW_USERS', 'isQaPreviewEnvironment', 'normalizeEmail', 'user',
    `${source}\nreturn isQaPreviewAccount(user);`)(
      users, () => enabled, value => String(value || '').trim().toLowerCase(), user
    );
}

test('only the named QA Preview host maps to the isolated project; all other unknown hosts fail closed', () => {
  assert.equal(aliases.default, 'carteira-de-investimento-16725');
  assert.equal(aliases.qa, 'carteira-invest-qa-v316');
  assert.equal(deployConfig.firestore.rules, 'firestore.qa-preview.rules');
  assert.equal(selectConfig('carteira-homolog-c5785e6.vercel.app').projectId, 'carteira-invest-qa-v316');
  assert.equal(selectConfig('carteira-homolog-c5785e6-jd01eb6md-paulinhoo2002-ctrls-projects.vercel.app').projectId, 'carteira-invest-qa-v316');
  assert.equal(selectConfig('carteira-investimentos-delta.vercel.app').projectId, 'carteira-de-investimento-16725');
  for (const host of ['localhost', 'exemplo.invalid', 'outro-preview.vercel.app', 'carteira-investimentos-git-pr.vercel.app']) {
    assert.equal(selectConfig(host), null, host);
  }
});

test('Preview QA allowlist requires the exact UID and normalized email and is inactive elsewhere', () => {
  assert.equal(entries.length, 3);
  const [uidC, configuredC] = entries.find(([, account]) => account.email === emailC);
  const [uidD, configuredD] = entries.find(([, account]) => account.email === emailD);
  const [googleUid, googleAccount] = entries.find(([, account]) => account.email === googleEmail);
  assert.ok(uidC && uidD && uidC !== uidD);
  assert.equal(configuredC.providerId, 'password');
  assert.equal(configuredD.providerId, 'password');
  assert.equal(googleAccount.providerId, 'google.com');
  assert.equal(googleAccount.emailVerified, true);
  assert.notEqual(googleUid, uidC);
  assert.notEqual(googleUid, uidD);
  assert.equal(isAllowedQaIdentity({ uid: uidC, email: emailC.toUpperCase(), providerData: [{ providerId: 'password' }] }), true);
  assert.equal(isAllowedQaIdentity({ uid: uidD, email: emailD, providerData: [{ providerId: 'password' }] }), true);
  assert.equal(isAllowedQaIdentity({ uid: googleUid, email: googleEmail, emailVerified: true, providerData: [{ providerId: 'google.com' }] }), true);
  assert.equal(isAllowedQaIdentity({ uid: googleUid, email: googleEmail, emailVerified: false, providerData: [{ providerId: 'google.com' }] }), false);
  assert.equal(isAllowedQaIdentity({ uid: googleUid, email: googleEmail, emailVerified: true, providerData: [{ providerId: 'password' }] }), false);
  assert.equal(isAllowedQaIdentity({ uid: uidC, email: emailD, providerData: [{ providerId: 'password' }] }), false);
  assert.equal(isAllowedQaIdentity({ uid: 'unlisted-synthetic-user', email: emailC, providerData: [{ providerId: 'password' }] }), false);
  assert.equal(isAllowedQaIdentity({ uid: uidC, email: emailC, providerData: [{ providerId: 'password' }] }, false), false);
});

test('choosing a synthetic QA account fills its exact email and clears the password field', () => {
  const source = html.slice(html.indexOf('function selectQaPreviewAccount()'), html.indexOf('async function signInQaPreview()'));
  assert.notEqual(source.indexOf('function selectQaPreviewAccount()'), -1, 'account selection helper must exist');
  const selectedUid = entries.find(([, account]) => account.email === emailC)[0];
  const elements = {
    'qa-preview-account': { value: selectedUid },
    'qa-preview-email': { value: '' },
    'qa-preview-password': { value: 'temporary synthetic test value' }
  };
  new Function('QA_PREVIEW_USERS', 'document', `${source}\nreturn selectQaPreviewAccount();`)(users, { getElementById: id => elements[id] });
  assert.equal(elements['qa-preview-email'].value, emailC);
  assert.equal(elements['qa-preview-password'].value, '');
});

test('QA password and Google login use Firebase Auth only in the explicit QA runtime', () => {
  const login = html.slice(html.indexOf('async function signInQaPreview()'), html.indexOf('async function signOutGoogle()'));
  assert.match(login, /if\(!isQaPreviewEnvironment\(\) \|\| !FB\.ready\)/);
  assert.match(login, /FB\.auth\.signInWithEmailAndPassword\(email,password\)/);
  assert.match(login, /QA_PREVIEW_USERS\[selectedUid\]/);
  assert.doesNotMatch(login, /createUserWithEmailAndPassword|signUp|localStorage|sessionStorage|console\.(log|error)/);
  const google = html.slice(html.indexOf('async function signInGoogle()'), html.indexOf('async function signInQaPreview()'));
  assert.match(google, /new firebase\.auth\.GoogleAuthProvider\(\)/);
  const qaGoogle = html.slice(html.indexOf('async function signInQaGoogle()'), html.indexOf('function selectQaPreviewAccount()'));
  assert.match(qaGoogle, /if\(!isQaPreviewEnvironment\(\) \|\| !FB\.ready\)/);
  assert.match(qaGoogle, /signInWithPopup\(provider\)/);
  assert.match(qaGoogle, /isQaPreviewAccount\(result\.user\)/);
  assert.match(qaGoogle, /signOut\(\)/);
  const boot = html.slice(html.indexOf('function initFirebase()'), html.indexOf('async function loadAccessControl('));
  const projectGuard = boot.indexOf('if(!appConfig)');
  const initialize = boot.indexOf('firebase.initializeApp(appConfig)');
  assert.notEqual(projectGuard, -1, 'missing Firebase host/project guard');
  assert.notEqual(initialize, -1, 'missing Firebase initialization');
  assert.ok(projectGuard < initialize, 'host and project must be validated before Firebase initializes');
});

test('QA users are not treated as administrators and are checked before private Firestore access', () => {
  assert.match(html, /function canManageSecurity\(\)\{\s*return isAccessAdmin\(FB\.user\);/);
  const gate = html.slice(html.indexOf('async function loadAccessControl('), html.indexOf('async function recordAccessAttempt('));
  const identityGuard = gate.indexOf('if(!isAuthorizedAppUser(user))');
  const databaseGuard = gate.indexOf('if(!FB.db)');
  assert.notEqual(identityGuard, -1, 'missing authorized-user guard');
  assert.notEqual(databaseGuard, -1, 'missing Firestore availability guard');
  assert.ok(identityGuard < databaseGuard, 'identity check must precede Firestore access');
  assert.doesNotMatch(gate, /collection\(|doc\(|get\(/);
  const resolver = html.slice(html.indexOf('async function resolveAccountModeCompat('), html.indexOf('function clearRealStateInMemory('));
  assert.match(resolver, /role:qaPreviewAccount\?'user':'owner'/);
});

test('the QA login form is labeled, accessible, and never asks the app to save a password', () => {
  assert.match(html, /id="qa-preview-account"[^>]*aria-describedby="qa-preview-login-error"/);
  assert.match(html, /id="qa-preview-email" type="email" autocomplete="username"[^>]*readonly/);
  assert.match(html, /id="qa-preview-password" type="password" autocomplete="current-password"/);
  assert.match(html, /id="qa-preview-login-error" role="status" aria-live="polite"/);
  assert.match(html, /if\(passwordInput\) passwordInput\.value='';/);
  assert.match(html, /A senha não é salva pelo app\./);
  assert.match(html, /Continuar com Google no QA/);
});

test('QA Firestore rules require the exact UID/email pair and deny cross-user and anonymous access', () => {
  for (const [uid, account] of entries) {
    const pair = new RegExp(`request\\.auth\\.uid == "${uid}"\\s*&&\\s*request\\.auth\\.token\\.email == "${account.email}"`);
    assert.match(rules, pair, `rules must bind UID ${uid} to its own email`);
  }
  const google = entries.find(([, account]) => account.email === googleEmail);
  assert.match(rules, new RegExp(`\\(request\\.auth\\.uid == "${google[0]}"\\s*&&\\s*request\\.auth\\.token\\.email == "${googleEmail}"\\s*&&\\s*request\\.auth\\.token\\.email_verified == true\\)`));
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.match(rules, /function canAccessOwnDocument\(userId\)/);
  assert.match(rules, /match \/portfolios\/\{userId\}[\s\S]*?allow read, write: if canAccessOwnDocument\(userId\);/);
  assert.match(rules, /match \/users\/\{userId\}[\s\S]*?allow read, write: if canAccessOwnDocument\(userId\);/);
  assert.match(rules, /match \/meta\/access[\s\S]*?allow read, write: if isAdmin\(\);/);
  assert.doesNotMatch(rules, /allow read, write: if isSignedIn\(\);/);
});
