'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

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
  assert.match(html, /const snap = await FB\.db\.collection\('meta'\)\.doc\('access'\)\.get\(\);\s*if\(authSession && !authSession\.isCurrent\(\)\) return false;/);
  assert.match(html, /const snap = await FB\.db\.collection\('authorizedUsers'\)\.doc\(user\.uid\)\.get\(\);\s*if\(authSession && !authSession\.isCurrent\(\)\) return 'AUTH_FAILURE';/);
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
