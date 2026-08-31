const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('index.html', 'utf8');

test('test mode is restricted to local hosts and an explicit flag', () => {
  assert.match(source, /location\.hostname==='localhost'/);
  assert.match(source, /location\.hostname==='127\.0\.0\.1'/);
  assert.match(source, /get\('testMode'\)==='1'/);
  assert.match(source, /window\.__LOCAL_TEST_MODE__=testMode/);
});

test('production keeps the normal Firebase authentication path', () => {
  assert.match(source, /if\(!isLocalTestMode\(\)\) return;/);
  assert.match(source, /initFirebase\(\)/);
  assert.match(source, /signInGoogle\(\)/);
});

test('local mode bypasses the access gate without initializing Firebase', () => {
  assert.match(source, /function shouldShowAccessGate\(\)\{\s*if\(isLocalTestMode\(\)\) return false;/);
  assert.match(source, /\}else if\(isLocalTestMode\(\)\)\{\s*applyLocalTestFixture\(\)/);
});

test('local mode uses the deterministic fixture and disables remote sync', () => {
  assert.match(source, /function localTestFixtureWallet\(\)/);
  assert.match(source, /function applyLocalTestFixture\(\)/);
  assert.match(source, /if\(isLocalTestMode\(\)\) return;/);
  assert.match(source, /Sem Firebase, sem sync, sem importação\/exportação e sem localStorage/);
});

test('local mode visibly identifies itself', () => {
  assert.match(source, /Modo de teste local/);
  assert.match(source, /Dados determinísticos em memória/);
});

test('local mode blocks real-data backup and import actions', () => {
  assert.match(source, /function importBackup\(\)\{ if\(isLocalTestMode\(\)/);
  assert.match(source, /function triggerBackupImport\(\)\{ if\(isLocalTestMode\(\)/);
});

test('capture harness must reject the authentication gate', () => {
  assert.match(source, /Entre com Google para continuar/);
  assert.match(source, /shouldShowAccessGate\(\)/);
});
