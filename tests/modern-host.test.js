const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const hostHtmlPath = path.join(__dirname, '..', 'modern', 'host.html');
const hostModulePath = path.join(__dirname, '..', 'modern', 'src', 'host.tsx');
const mountModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'mountModernApp.ts');
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernReportsRuntime.ts');
const appModulePath = path.join(__dirname, '..', 'modern', 'src', 'App.tsx');

async function loadMountModule() {
  return import(pathToFileURL(mountModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', 'modern', relativePath), 'utf8');
}

test('host experimental exists and keeps modern app isolated', () => {
  assert.equal(fs.existsSync(hostHtmlPath), true, 'Missing host.html');

  const hostHtml = fs.readFileSync(hostHtmlPath, 'utf8');
  const hostTsx = fs.readFileSync(hostModulePath, 'utf8');
  const mountTsx = fs.readFileSync(mountModulePath, 'utf8');
  const runtimeTs = fs.readFileSync(runtimeModulePath, 'utf8');
  const appTsx = fs.readFileSync(appModulePath, 'utf8');

  assert.match(hostHtml, /Host experimental/);
  assert.match(hostHtml, /src="\/src\/host\.tsx"/);
  assert.match(hostTsx, /createModernReportsRuntime/);
  assert.match(hostTsx, /mountModernApp/);
  assert.match(hostTsx, /AppComponent: App/);
  assert.match(mountTsx, /export function mountModernApp/);
  assert.match(mountTsx, /Elemento root nao encontrado para a base moderna\./);
  assert.match(mountTsx, /Adapter moderno invalido\./);
  assert.match(mountTsx, /Componente moderno invalido\./);
  assert.match(mountTsx, /Base moderna ja montada neste root\./);
  assert.match(mountTsx, /WeakMap/);
  assert.match(mountTsx, /mountedRoots/);
  assert.match(runtimeTs, /createConnectedReportsDemoSource/);
  assert.match(appTsx, /reportsAdapter: ReadOnlyReportsAdapter/);

  for (const forbidden of [
    'legacy/reports-readonly-source.js',
    '@legacy-reports-readonly-source',
    'globalThis',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'firebase',
    'auth',
    'sync',
    'backup',
    'postMessage',
    'BroadcastChannel',
    'CustomEvent',
    'window.',
  ]) {
    assert.equal(hostTsx.includes(forbidden), false, `Forbidden host reference found: ${forbidden}`);
    assert.equal(mountTsx.includes(forbidden), false, `Forbidden mount reference found: ${forbidden}`);
  }

  assert.equal(hostTsx.includes('document.getElementById'), true);
  assert.equal(hostTsx.includes('window'), false);
  assert.equal(mountTsx.includes('window'), false);
  assert.equal(mountTsx.includes("from '../App'"), false);
  assert.equal(appTsx.includes('legacyReportsReadonlyIntegration'), false);
});

test('mountModernApp controlled errors and repeat mount guard', async () => {
  const { mountModernApp } = await loadMountModule();

  assert.throws(
    () => mountModernApp({ rootElement: null, reportsAdapter: { getSnapshot() {} } }),
    /Elemento root nao encontrado para a base moderna\./,
  );

  assert.throws(
    () => mountModernApp({ rootElement: {}, reportsAdapter: null }),
    /Adapter moderno invalido\./,
  );

  assert.throws(
    () => mountModernApp({ rootElement: {}, reportsAdapter: { getSnapshot() {} }, AppComponent: null }),
    /Componente moderno invalido\./,
  );
});

test('host runtime keeps demo source available', async () => {
  const { createModernReportsRuntime } = await loadRuntimeModule();
  const runtime = createModernReportsRuntime();

  assert.equal(typeof runtime.reportsAdapter.getSnapshot, 'function');
  assert.match(read('src/host.tsx'), /createModernReportsRuntime/);
});
