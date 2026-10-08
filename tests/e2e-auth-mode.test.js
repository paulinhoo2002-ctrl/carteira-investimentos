const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('index.html', 'utf8');

test('test mode requires the trusted QA marker, local host, and explicit flag', () => {
  assert.match(source, /window\.__LOCAL_QA_RUNTIME__==='local-synthetic-v1'/);
  assert.match(source, /location\.hostname==='localhost'/);
  assert.match(source, /location\.hostname==='127\.0\.0\.1'/);
  assert.match(source, /get\('testMode'\)==='1'/);
  assert.match(source, /trustedQaRuntime && loopbackHost && params\.get\('testMode'\)==='1'/);
  assert.match(source, /Object\.defineProperty\(window,'__LOCAL_TEST_MODE__',\{value:testMode,writable:false,configurable:false\}\)/);
});

test('production keeps the normal Firebase authentication path', () => {
  assert.match(source, /if\(!isLocalTestMode\(\)\) return;/);
  assert.match(source, /initFirebase\(\)/);
  assert.match(source, /signInGoogle\(\)/);
});

test('local mode bypasses the access gate without initializing Firebase', () => {
  assert.match(source, /function shouldShowAccessGate\(\)\{\s*if\(isLocalTestMode\(\)\) return false;/);
  assert.match(source, /\}else if\(isLocalTestMode\(\)\)\{\s*initializeLocalTestFixture\(\)/);
});

test('local mode uses the deterministic fixture and disables remote sync', () => {
  assert.match(source, /function localTestFixtureWallet\(\)/);
  assert.match(source, /function applyLocalTestFixture\(runtimeToken\)/);
  assert.doesNotMatch(source, /const LOCAL_TEST_FIXTURE_BOOT_TOKEN/);
  assert.match(source, /if\(isLocalTestMode\(\)\) return;/);
  assert.match(source, /Sem Firebase, sincronização, importação\/exportação ou persistência financeira/);
});

test('local mode visibly identifies itself', () => {
  assert.match(source, /TESTE LOCAL/);
  assert.match(source, /dados sintéticos em memória/);
  assert.match(source, /isLocalTestReadOnlyMode\(\).*SOMENTE LEITURA/);
});

test('local mode blocks real-data backup and import actions', () => {
  assert.match(source, /function importBackup\(\)\{ if\(isLocalTestMode\(\)/);
  assert.match(source, /function triggerBackupImport\(\)\{ if\(isLocalTestMode\(\)/);
});

test('capture harness must reject the authentication gate', () => {
  assert.match(source, /Entre com Google para continuar/);
  assert.match(source, /shouldShowAccessGate\(\)/);
});
