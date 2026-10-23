'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

test('auth modules load in order and the Demo fixture is absent', () => {
  const expected = ['auth/account-mode.js', 'auth/data-source.js', 'auth/boot.js', 'auth/boot-ui.js'];
  const positions = expected.map(file => html.indexOf(`<script src="${file}">`));
  assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])));
  assert.doesNotMatch(html, /auth\/demo-portfolio\.js|DemoPortfolio|enterDemoMode|resetDemoPortfolio|createLocalDemoDataSource/);
  assert.doesNotMatch(sw, /auth\/demo-portfolio\.js/);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'auth', 'demo-portfolio.js')), false);
});

test('unauthenticated users reach login; private route content remains behind access gate', () => {
  assert.match(html, /function shouldShowAccessGate\(\)\{\s*if\(isLocalTestMode\(\)\) return false;/);
  assert.match(html, /if\(shouldShowAccessGate\(\)\) return accessGateBox\(\);/);
  assert.match(html, /Entre com Google para continuar/);
  assert.doesNotMatch(html, /Modo demonstração|Dados fictícios para demonstração/);
});

test('portfolio reads start only after the REAL account-mode decision', () => {
  const auth = html.indexOf("FB.accountMode = await resolveAccountModeCompat(user, ok, authSession);");
  const startSync = html.indexOf('startCloudSync({readOnlyOnly:', auth);
  assert.ok(auth > 0 && startSync > auth, 'real cloud sync must follow authorization decision');
  assert.match(html, /if\(FB\.accountMode === 'BLOCKED' \|\| FB\.accountMode === 'AUTH_FAILURE'\)\{[\s\S]*?return;/);
  assert.doesNotMatch(html.slice(auth, startSync), /enterDemoMode|createDemoSource/);
});

test('stale auth callbacks cannot reuse another session authorization result', () => {
  const callbackStart = html.indexOf('FB.auth.onAuthStateChanged(async user=>{');
  const callbackEnd = html.indexOf("if(!FB.authResolved){", callbackStart);
  const callback = html.slice(callbackStart, callbackEnd);
  assert.ok(callbackStart >= 0 && callbackEnd > callbackStart, 'auth callback source exists');
  assert.match(callback, /const authSession = authSessionGuard\.begin\(user\);\s*stopCloudSync\(false\);/);
  assert.match(callback, /const ok = await loadAccessControl\(user,authSession\);\s*if\(!authSession\.isCurrent\(\) \|\| FB\.user\?\.uid !== user\.uid\) return;/);
  assert.match(callback, /resolveAccountModeCompat\(user, ok, authSession\)/);
  assert.match(callback, /await recordAccessAttempt\(user, ok, FB\.access\.reason\);\s*if\(!authSession\.isCurrent\(\) \|\| FB\.user\?\.uid !== user\.uid\) return;/);
  assert.match(html, /async function loadAccessControl\(user,authSession=null\)\{\s*if\(authSession && !authSession\.isCurrent\(\)\) return false;/);
  const resolver = html.slice(html.indexOf('async function resolveAccountModeCompat('), html.indexOf('function clearRealStateInMemory('));
  assert.doesNotMatch(resolver, /authorizedUsers/);
});

test('owner-only authorization checks UID and verified email before any private read', () => {
  assert.ok(/const OWNER_FIREBASE_UID = '[^']+';/.test(html), 'owner UID constant is configured');
  assert.ok(/const OWNER_FIREBASE_EMAIL = '[^']+';/.test(html), 'authorized owner email is configured');
  assert.ok(/function isAccessAdmin\(user\)\{\s*return !!user && user\.uid === OWNER_FIREBASE_UID && normalizeEmail\(user\.email\) === OWNER_FIREBASE_EMAIL && user\.emailVerified === true/.test(html), 'admin identity requires exact UID, authorized email, and verification');
  const gate = html.slice(html.indexOf('async function loadAccessControl('), html.indexOf('async function recordAccessAttempt('));
  const identityCheck = gate.indexOf('if(!isAccessAdmin(user))');
  assert.ok(identityCheck >= 0, 'owner identity must be checked');
  assert.ok(identityCheck < gate.indexOf('if(!FB.db)'), 'identity check must precede database access');
  assert.ok(!/collection\(|normalizeAccessList|allowedEmails|allowedDomains/.test(gate), 'access lists and database reads cannot grant access');
  const resolver = html.slice(html.indexOf('async function resolveAccountModeCompat('), html.indexOf('function clearRealStateInMemory('));
  assert.ok(/if\(!isAccessAdmin\(user\) \|\| !accessOk\) return 'BLOCKED';/.test(resolver), 'resolver rejects non-owner before REAL');
  assert.ok(!/authorizedUsers|else if\(accessOk\)/.test(resolver), 'no alternate authorization registry or access-list grant exists');
  const accessLog = html.slice(html.indexOf('async function recordAccessAttempt('), html.indexOf('function portfolioRef('));
  assert.match(accessLog, /if\(!allowed \|\| !isAccessAdmin\(user\)\) return;/, 'denied identities must not trigger access-log writes');
});

test('exclusive owner policy does not expose an inert email or domain allowlist editor', () => {
  assert.match(html, /Acesso exclusivo do proprietário/);
  assert.doesNotMatch(html, /saveAccessSettings|accessSettingsModal|acc-emails|acc-domains|allowedEmails|allowedDomains/);
  assert.doesNotMatch(html, /collection\(['"]meta['"]\)\.doc\(['"]access['"]\)\.set/);
});

test('production Firestore rules scope all data paths to verified owner identity', () => {
  const ownerUid = html.match(/const OWNER_FIREBASE_UID = '([^']+)';/)?.[1];
  const ownerEmail = html.match(/const OWNER_FIREBASE_EMAIL = '([^']+)';/)?.[1];
  assert.ok(ownerUid, 'owner UID constant is configured');
  assert.ok(ownerEmail, 'authorized owner email is configured');
  assert.ok(/function isOwnerAccount\(\)[\s\S]*?request\.auth != null[\s\S]*?request\.auth\.uid == "[^"]+"[\s\S]*?request\.auth\.token\.email_verified == true[\s\S]*?request\.auth\.token\.email == "[^"]+"/.test(rules), 'rules require authenticated exact owner, authorized email, and verified email');
  assert.ok(rules.includes(`request.auth.uid == "${ownerUid}"`), 'rules UID matches the client owner identity');
  assert.ok(rules.includes(`request.auth.token.email == "${ownerEmail}"`), 'rules email matches the client owner identity');
  assert.ok(/function isOwner\(userId\)[\s\S]*?isOwnerAccount\(\)[\s\S]*?userId == request\.auth\.uid/.test(rules), 'owner paths cannot be selected by another UID');
  assert.ok(/match \/portfolios\/\{userId\}[\s\S]*?allow read, write: if isOwner\(userId\);/.test(rules), 'portfolio path is owner-only');
  assert.ok(/match \/users\/\{userId\}[\s\S]*?allow read, write: if isOwner\(userId\);/.test(rules), 'user path is owner-only');
  assert.ok(/match \/meta\/access[\s\S]*?allow read, write: if isOwnerAccount\(\);/.test(rules), 'admin metadata is owner-only');
  assert.ok(!/allow read, write: if isSignedIn\(\)/.test(rules), 'no broad signed-in rule exists');
});

test('authorization failures are distinct and never fall back to a local fixture', () => {
  assert.match(html, /FB\.accountMode='AUTH_FAILURE'/);
  assert.match(html, /if\(!window\.AccountMode \|\| !FB\.db \|\| FB\.access\?\.authFailure\) return 'AUTH_FAILURE';/);
  assert.match(html, /authFailure:true/);
  assert.doesNotMatch(html, /demo_portfolio_v1|LOCAL_DEMO|DEMO_MODE_NO_CLOUD_WRITES/);
});

test('logout clears in-memory portfolio and derived account values before rendering login', () => {
  assert.match(html, /function signOutGoogle\(\)\{[\s\S]*?clearRealStateInMemory\(\);\s*FB\.user=null;\s*FB\.accountMode='LOGIN_REQUIRED';[\s\S]*?render\(\);[\s\S]*?FB\.auth\.signOut\(\)/);
  assert.match(html, /function signOutGoogle\(\)\{[\s\S]*?authSessionGuard\.begin\(null\);\s*clearV250OfflineEligibility\(\);\s*stopCloudSync\(false\);\s*clearRealStateInMemory\(\);/);
  assert.match(html, /function clearRealStateInMemory\(\)\{[\s\S]*?Object\.assign\(S, cloneData\(DEFAULT_RUNTIME_STATE\)\);\s*S\.assets=\[\];\s*S\.wallets=\[\];\s*S\.aportes=\[\];\s*S\.proventos=\[\];\s*S\.rfEvents=\[\];[\s\S]*?window\.__V76_RUNTIME__=\{snapshots:\[\],flows:\[\]/);
});

test('service worker app shell contains only the remaining authentication modules', () => {
  for (const file of ['auth/account-mode.js', 'auth/data-source.js', 'auth/boot.js', 'auth/boot-ui.js']) {
    assert.ok(sw.includes(`'./${file}'`), `missing ${file}`);
  }
});
