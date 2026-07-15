const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { createServer } = require('vite');

const hostHtmlPath = path.join(__dirname, '..', 'modern', 'host.html');
const rootIndexPath = path.join(__dirname, '..', 'index.html');
const hostSmokePath = path.join(__dirname, 'modern-host.smoke.test.js');
const hostModulePath = path.join(__dirname, '..', 'modern', 'src', 'host.tsx');
const hostSourceModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'bootstrap',
  'hostLegacyReportsReadonlySource.ts',
);
const refreshControllerModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsRefreshController.ts',
);
const mountModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'mountModernApp.ts');
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernReportsRuntime.ts');
const appModulePath = path.join(__dirname, '..', 'modern', 'src', 'App.tsx');

async function loadMountModule() {
  return import(pathToFileURL(mountModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

async function loadRefreshControllerModule() {
  return import(pathToFileURL(refreshControllerModulePath).href);
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', 'modern', relativePath), 'utf8');
}

test('host experimental exists and keeps modern app isolated', () => {
  assert.equal(fs.existsSync(hostHtmlPath), true, 'Missing host.html');

  const hostHtml = fs.readFileSync(hostHtmlPath, 'utf8');
  const rootIndexHtml = fs.readFileSync(rootIndexPath, 'utf8');
  const hostSmokeText = fs.readFileSync(hostSmokePath, 'utf8');
  const hostTsx = fs.readFileSync(hostModulePath, 'utf8');
  const hostSourceTs = fs.readFileSync(hostSourceModulePath, 'utf8');
  const mountTsx = fs.readFileSync(mountModulePath, 'utf8');
  const runtimeTs = fs.readFileSync(runtimeModulePath, 'utf8');
  const refreshControllerTs = fs.readFileSync(refreshControllerModulePath, 'utf8');
  const appTsx = fs.readFileSync(appModulePath, 'utf8');

  assert.match(hostHtml, /Host experimental/);
  assert.match(hostHtml, /src="\/src\/host-entry\.tsx"/);
  assert.match(hostHtml, /host-entry\.tsx/);
  assert.match(hostHtml, /readonly-report-page-contract\.js/);
  assert.match(rootIndexHtml, /readonly-report-page-contract\.js/);
  assert.match(hostTsx, /createHostLegacyReportsReadonlySource/);
  assert.match(hostTsx, /createConnectedReportsDemoSource/);
  assert.match(hostTsx, /readReadonlyReportSessionContext/);
  assert.match(hostTsx, /buildReadonlyReportSessionSearch/);
  assert.match(hostTsx, /createReportsRefreshController/);
  assert.match(hostTsx, /createNullReportsSource/);
  assert.match(hostTsx, /strictSourceWiring/);
  assert.match(hostTsx, /buildReportAssetRowModule/);
  assert.match(hostTsx, /createHostExperimentalAssets/);
  assert.match(hostTsx, /experimentalAssets/);
  assert.match(hostTsx, /createModernReportsRuntime/);
  assert.match(hostTsx, /mountModernApp/);
  assert.match(hostTsx, /AppComponent: App/);
  assert.match(hostTsx, /reportsRefreshController/);
  assert.match(hostTsx, /bootstrapHost/);
  assert.match(hostTsx, /isHostPage/);
  assert.match(read('src/host-entry.tsx'), /bootstrapHost/);
  assert.match(hostSourceTs, /createLegacyReportsReadonlySource/);
  assert.match(hostSourceTs, /buildReportAssetRow/);
  assert.match(hostSourceTs, /HOST_LEGACY_REPORTS_ASSETS/);
  assert.match(hostSourceTs, /legacy\/reports-readonly-source\.js/);
  assert.match(hostSourceTs, /report-asset-row\.js/);
  assert.equal(hostSourceTs.includes('loadBuildReportAssetRowModule'), false);
  assert.equal(hostSourceTs.includes('globalThis'), false);
  assert.match(
    rootIndexHtml,
    /function isActiveWalletHostMode\(\)\{\s*try\{\s*return \(location\.hostname==='localhost' \|\| location\.hostname==='127\.0\.0\.1'\) && new URLSearchParams\(location\.search\)\.get\('activeWalletHost'\)==='1' && new URLSearchParams\(location\.search\)\.get\('testMode'\)==='1';/,
  );
  assert.match(hostSmokeText, /MODERN_HOST_URL/);
  assert.match(hostSmokeText, /CI/);
  assert.match(hostSmokeText, /assert\.fail\('MODERN_HOST_URL required for host smoke test in CI'\)/);
  assert.match(refreshControllerTs, /createReportsRefreshController/);
  assert.match(refreshControllerTs, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(refreshControllerTs, /subscribe/);
  assert.match(refreshControllerTs, /refresh/);
  assert.match(refreshControllerTs, /getState/);
  assert.match(mountTsx, /export function mountModernApp/);
  assert.match(mountTsx, /Elemento root nao encontrado para a base moderna\./);
  assert.match(mountTsx, /Adapter moderno invalido\./);
  assert.match(mountTsx, /Componente moderno invalido\./);
  assert.match(mountTsx, /Base moderna ja montada neste root\./);
  assert.match(mountTsx, /WeakMap/);
  assert.match(mountTsx, /mountedRoots/);
  assert.match(runtimeTs, /createConnectedReportsDemoSource/);
  assert.match(appTsx, /reportsAdapter: ReadOnlyReportsAdapter/);
  assert.match(appTsx, /initialPageId\?: ModernPageId/);
  assert.match(appTsx, /onActivePageIdChange\?: \(pageId: ModernPageId\) => void/);
  assert.equal(hostSourceTs.includes('READONLY_REPORT_PAGE_IDS=new Set'), false);
  for (const forbidden of [
    'legacy/reports-readonly-source.js',
    '@legacy-reports-readonly-source',
    'globalThis',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'firebase',
    'auth',
    /\bsync\b/,
    'backup',
    'postMessage',
    'BroadcastChannel',
    'CustomEvent',
    'window.',
  ]) {
    const matchesHost = forbidden instanceof RegExp ? forbidden.test(hostTsx) : hostTsx.includes(forbidden);
    const matchesMount = forbidden instanceof RegExp ? forbidden.test(mountTsx) : mountTsx.includes(forbidden);

    assert.equal(matchesHost, false, `Forbidden host reference found: ${forbidden}`);
    assert.equal(matchesMount, false, `Forbidden mount reference found: ${forbidden}`);
  }

  assert.equal(hostTsx.includes('document.getElementById'), true);
  assert.equal(hostTsx.includes('window'), false);
  assert.equal(mountTsx.includes('window'), false);
  assert.equal(mountTsx.includes("from '../App'"), false);
  assert.equal(appTsx.includes('legacyReportsReadonlyIntegration'), false);
  assert.equal(hostSourceTs.includes('localStorage'), false);
  assert.equal(hostSourceTs.includes('sessionStorage'), false);
  assert.equal(hostSourceTs.includes('indexedDB'), false);
  assert.equal(hostSourceTs.includes('firebase'), false);
  assert.equal(hostSourceTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(hostSourceTs), false);
  assert.equal(hostSourceTs.includes('backup'), false);
  assert.equal(refreshControllerTs.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(refreshControllerTs.includes('@legacy-reports-readonly-source'), false);
  assert.equal(refreshControllerTs.includes('localStorage'), false);
  assert.equal(refreshControllerTs.includes('sessionStorage'), false);
  assert.equal(refreshControllerTs.includes('indexedDB'), false);
  assert.equal(refreshControllerTs.includes('firebase'), false);
  assert.equal(refreshControllerTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(refreshControllerTs), false);
  assert.equal(refreshControllerTs.includes('backup'), false);
  assert.equal(refreshControllerTs.includes('setInterval'), false);
  assert.equal(refreshControllerTs.includes('setTimeout'), false);
  assert.equal(refreshControllerTs.includes('requestAnimationFrame'), false);
  assert.equal(refreshControllerTs.includes('MutationObserver'), false);
  assert.equal(refreshControllerTs.includes('WebSocket'), false);
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

test('refresh controller keeps snapshot frozen and preserves listeners', async () => {
  const { createReportsRefreshController } = await loadRefreshControllerModule();
  let refreshIndex = 0;
  const snapshots = [
    {
      generatedAt: '2026-07-14T10:30:00.000Z',
      notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
      summary: { totalValue: 900, itemCount: 0, averageVariationPct: 0.14 },
      items: [],
    },
    {
      generatedAt: '2026-07-14T10:31:00.000Z',
      notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
      summary: { totalValue: 910, itemCount: 0, averageVariationPct: 0.14 },
      items: [],
    },
  ];
  const source = {
    getSnapshot() {
      return snapshots[Math.min(refreshIndex, snapshots.length - 1)];
    },
  };

  const controller = createReportsRefreshController({
    source,
    onRefresh() {
      refreshIndex += 1;
    },
  });

  let calls = 0;
  const unsubscribe = controller.subscribe(() => {
    calls += 1;
  });

  const initial = controller.getSnapshot();
  controller.refresh();
  const afterRefresh = controller.getSnapshot();

  assert.equal(calls, 1);
  assert.notEqual(afterRefresh, initial);
  assert.equal(Object.isFrozen(afterRefresh), true);

  unsubscribe();
  controller.refresh();
  assert.equal(calls, 1);
});

test('host experimental strict wiring fails with explicit error', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { bootstrapHost } = await viteServer.ssrLoadModule('/src/host.tsx');

    await assert.rejects(
      () =>
        bootstrapHost({
          rootElement: {},
          strictSourceWiring: true,
          legacyModule: null,
          buildReportAssetRowModule: null,
        }),
      /Fonte readonly experimental indisponivel\./,
    );
  } finally {
    await viteServer.close();
  }
});
