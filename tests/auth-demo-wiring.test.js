'use strict';

/**
 * AUTH-DEMO Phase 2 — index.html wiring structural contract (P1-P12).
 * Grep-based like tests/e2e-auth-mode.test.js: proves the secure boot is
 * wired into the REAL app (not just modules), preserving existing contracts.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

test('P1: auth boot modules load in dependency order before app scripts', () => {
  const i1 = html.indexOf('<script src="auth/account-mode.js">');
  const i2 = html.indexOf('<script src="auth/data-source.js">');
  const i3 = html.indexOf('<script src="auth/demo-portfolio.js">');
  const i4 = html.indexOf('<script src="auth/boot.js">');
  const i5 = html.indexOf('<script src="auth/boot-ui.js">');
  assert.ok(i1 >= 0 && i2 > i1 && i3 > i2 && i4 > i3 && i5 > i4, `auth script order broken: ${i1},${i2},${i3},${i4},${i5}`);
});

test('P2: single authoritative account-mode decision inside onAuthStateChanged', () => {
  assert.match(html, /FB\.accountMode = await resolveAccountModeCompat\(FB\.user, ok\);/);
  assert.match(html, /if\(FB\.accountMode === 'BLOCKED'\)\{/);
  assert.match(html, /if\(FB\.accountMode === 'DEMO'\)\{\s*enterDemoMode\(\);\s*return;/);
});

test('P2: protected offline cached session wins BEFORE mode routing (regression guard)', () => {
  const off = html.indexOf('offline cached session wins before any mode routing');
  const mode = html.indexOf('single authoritative account-mode decision');
  assert.ok(off > 0 && mode > off, 'offline branch must precede mode resolution');
});

test('P3/P13: demo mode never starts cloud listener and never writes cloud', () => {
  assert.match(html, /function startCloudSync\(\{readOnlyOnly=false\}=\{\}\)\{\s*\r?\n\s*if\(isLocalTestMode\(\) \|\| isAuthoritativeLocalRecoveryBoot\(\)\) return;\s*\r?\n\s*if\(FB\.accountMode && FB\.accountMode!=='REAL'\) return;/);
  assert.match(html, /function queueCloudSave\(\)\{[\s\S]*?if\(FB\.accountMode && FB\.accountMode!=='REAL'\) return;/);
  assert.ok(html.includes('DEMO_MODE_NO_CLOUD_WRITES'));
  assert.match(html, /function enterDemoMode\(\)\{\s*\r?\n\s*stopCloudSync\(false\); \/\/ real listener never survives into DEMO/);
});

test('P5: authorization loading state says "Verificando sua conta..."', () => {
  assert.ok(html.includes('Verificando sua conta...'));
});

test('P4: existing login gate contract preserved', () => {
  assert.ok(html.includes('Entre com Google para continuar'));
  assert.match(html, /function shouldShowAccessGate\(\)\{\s*if\(isLocalTestMode\(\)\) return false;/);
});

test('P8/P9: persistent demo badge + reset control wired in header authBox', () => {
  assert.match(html, /if\(FB\.accountMode === 'DEMO'\)\{\s*\r?\n\s*return `<span class="note-pill" role="status"[\s\S]*?Modo demonstração · Dados fictícios[\s\S]*?onclick="resetDemoPortfolio\(\)"/);
  assert.match(html, /function resetDemoPortfolio\(\)\{[\s\S]*?FB\.demoSource\.reset/);
});

test('P11: blocked mode renders dedicated blocked screen (no demo fallback)', () => {
  assert.match(html, /if\(FB\.accountMode === 'BLOCKED' && window\.AuthBootUi\)\{[\s\S]*?AuthBootUi\.renderBlockedHtml\(\)/);
});

test('P12: logout/mode change clears in-memory real state before gate renders', () => {
  assert.match(html, /if\(FB\.accountMode === 'REAL' \|\| FB\.accountMode === 'BLOCKED'\) clearRealStateInMemory\(\);/);
  assert.match(html, /function clearRealStateInMemory\(\)\{\s*\r?\n\s*S\.assets = \[\];/);
});

test('P6: owner compatibility adapter — registry → legacy access → admin allowlist', () => {
  assert.match(html, /async function resolveAccountModeCompat\(user, accessOk\)\{[\s\S]*?authorizedUsers[\s\S]*?isAccessAdmin\(email\)\) authorization = \{ enabled: true, blocked: false, role: 'owner' \};[\s\S]*?else if\(accessOk\) authorization = \{ enabled: true, blocked: false, role: 'user' \};/);
});

test('P7: demo hydration uses the canonical wallet state path', () => {
  assert.match(html, /function enterDemoMode\(\)\{[\s\S]*?normalizeWalletEntry\(wallet, 'Carteira Demonstração'\)[\s\S]*?syncStateFromWallet\(S\.wallets\[0\]\);/);
});

test('sw.js: auth modules included in APP_SHELL (offline shell)', () => {
  for (const f of ['auth/account-mode.js', 'auth/data-source.js', 'auth/demo-portfolio.js', 'auth/boot.js', 'auth/boot-ui.js']) {
    assert.ok(sw.includes(`'./${f}'`), `missing ${f}`);
  }
});
