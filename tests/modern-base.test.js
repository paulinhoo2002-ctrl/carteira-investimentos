const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const readonlyReportPageContract = require('../readonly-report-page-contract.js');

const modernRoot = path.join(__dirname, '..', 'modern');
const rootIndexPath = path.join(__dirname, '..', 'index.html');
const sourceFiles = [
  'index.html',
  'README.md',
  'host.html',
  'vite.config.ts',
  'tsconfig.json',
  'src/host-entry.tsx',
  'src/App.tsx',
  'src/main.tsx',
  'src/host.tsx',
  'src/bootstrap/mountModernApp.ts',
  'src/bootstrap/hostLegacyReportsReadonlySource.ts',
  'src/bootstrap/hostBootstrap.ts',
  'src/styles.css',
  'src/bootstrap/modernReportsRuntime.ts',
  'src/features/reports/reportsRefreshController.ts',
  'src/components/AppHeader.tsx',
  'src/components/Sidebar.tsx',
  'src/components/PagePlaceholder.tsx',
  'src/features/reports/reportsReadonlyBridge.ts',
  'src/features/reports/legacyReportsReadonlyIntegration.ts',
  'src/features/reports/AssetsReportPreview.tsx',
  'src/features/reports/reportsSnapshotAdapter.ts',
  'src/features/reports/readonlyReportSessionContext.ts',
  'src/types/navigation.ts',
];

const hostExperimentalFiles = ['src/bootstrap/hostLegacyReportsReadonlySource.ts'];
const navigationModulePath = path.join(__dirname, '..', 'modern', 'src', 'types', 'navigation.ts');

function read(relativePath) {
  return fs.readFileSync(path.join(modernRoot, relativePath), 'utf8');
}

function allSourceText() {
  return sourceFiles
    .filter((file) => !hostExperimentalFiles.includes(file))
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.md'))
    .map((file) => read(file))
    .join('\n');
}

async function loadNavigationModule() {
  return import(pathToFileURL(navigationModulePath).href);
}

test('modern shell exists and stays isolated', async () => {
  for (const file of sourceFiles) {
    assert.equal(fs.existsSync(path.join(modernRoot, file)), true, `Missing file: ${file}`);
  }

  const indexHtml = read('index.html');
  const rootIndexHtml = fs.readFileSync(rootIndexPath, 'utf8');
  const hostHtml = read('host.html');
  const readme = read('README.md');
  const appTsx = read('src/App.tsx');
  const mainTsx = read('src/main.tsx');
  const hostTsx = read('src/host.tsx');
  const hostSourceTs = read('src/bootstrap/hostLegacyReportsReadonlySource.ts');
  const mountTsx = read('src/bootstrap/mountModernApp.ts');
  const stylesCss = read('src/styles.css');
  const runtimeTs = read('src/bootstrap/modernReportsRuntime.ts');
  const refreshControllerTs = read('src/features/reports/reportsRefreshController.ts');
  const viteConfigTs = read('vite.config.ts');
  const headerTsx = read('src/components/AppHeader.tsx');
  const sidebarTsx = read('src/components/Sidebar.tsx');
  const placeholderTsx = read('src/components/PagePlaceholder.tsx');
  const reportsBridgeTs = read('src/features/reports/reportsReadonlyBridge.ts');
  const reportsIntegrationTs = read('src/features/reports/legacyReportsReadonlyIntegration.ts');
  const reportsPreviewTsx = read('src/features/reports/AssetsReportPreview.tsx');
  const reportsAdapterTs = read('src/features/reports/reportsSnapshotAdapter.ts');
  const readonlySessionTs = read('src/features/reports/readonlyReportSessionContext.ts');
  const navigationTs = read('src/types/navigation.ts');
  const sessionContractJs = fs.readFileSync(path.join(__dirname, '..', 'readonly-report-page-contract.js'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const { MODERN_PAGES } = await loadNavigationModule();

  assert.match(indexHtml, /<title>Carteira de Investimentos \| Shell moderno isolado<\/title>/);
  assert.match(indexHtml, /Shell moderno isolado em React, TypeScript e Vite para a Fase 2\./);
  assert.match(
    rootIndexHtml,
    /function isActiveWalletHostMode\(\)\{\s*try\{\s*return \(location\.hostname==='localhost' \|\| location\.hostname==='127\.0\.0\.1'\) && new URLSearchParams\(location\.search\)\.get\('activeWalletHost'\)==='1' && new URLSearchParams\(location\.search\)\.get\('testMode'\)==='1';/,
  );
  assert.match(hostHtml, /Host experimental/);
  assert.match(hostHtml, /src="\/src\/host-entry\.tsx"/);
  assert.match(readme, /# Shell moderno isolado/);
  assert.match(readme, /Host experimental/);
  assert.match(readme, /Relatorios consome snapshot somente leitura por ponte e adaptador explicitos/);
  assert.match(hostHtml, /readonly-report-page-contract\.js/);
  assert.match(hostTsx, /createHostLegacyReportsReadonlySource/);
  assert.match(hostTsx, /createConnectedReportsDemoSource/);
  assert.match(hostTsx, /readReadonlyReportSessionContext/);
  assert.match(hostTsx, /buildReadonlyReportSessionSearch/);
  assert.match(hostTsx, /createReportsRefreshController/);
  assert.match(hostTsx, /createHostDiagnosticsFactory/);
  assert.match(hostTsx, /Carteira ativa real/);
  assert.match(hostTsx, /Carteira ativa vazia/);
  assert.match(hostTsx, /Fallback readonly/);
  assert.match(hostTsx, /createNullReportsSource/);
  assert.match(hostTsx, /buildReportAssetRowModule/);
  assert.match(appTsx, /interface AppProps/);
  assert.match(appTsx, /reportsAdapter: ReadOnlyReportsAdapter/);
  assert.match(appTsx, /reportsRefreshController\?\:/);
  assert.match(appTsx, /initialPageId\?: ModernPageId/);
  assert.match(appTsx, /onActivePageIdChange\?: \(pageId: ModernPageId\) => void/);
  assert.match(appTsx, /adapter=\{reportsAdapter\}/);
  assert.match(appTsx, /activePageId === 'reports'/);
  assert.match(mainTsx, /mountModernApp/);
  assert.match(mainTsx, /createModernReportsRuntime/);
  assert.match(mainTsx, /const modernReportsRuntime = createModernReportsRuntime\(\);/);
  assert.match(mainTsx, /mountModernApp\(\{/);
  assert.match(mainTsx, /AppComponent: App/);
  assert.match(hostTsx, /mountModernApp/);
  assert.match(hostTsx, /createModernReportsRuntime/);
  assert.match(hostTsx, /bootstrapHost/);
  assert.match(hostTsx, /isHostPage/);
  assert.match(hostTsx, /AppComponent: App/);
  assert.match(hostTsx, /reportsRefreshController/);
  assert.match(read('src/host-entry.tsx'), /bootstrapHost/);
  assert.match(hostSourceTs, /createLegacyReportsReadonlySource/);
  assert.match(hostSourceTs, /buildReportAssetRow/);
  assert.match(hostSourceTs, /HOST_LEGACY_REPORTS_ASSETS/);
  assert.equal(hostSourceTs.includes('loadBuildReportAssetRowModule'), false);
  assert.equal(hostSourceTs.includes('globalThis'), false);
  assert.match(mountTsx, /export function mountModernApp/);
  assert.match(mountTsx, /WeakMap/);
  assert.match(mountTsx, /Base moderna ja montada neste root\./);
  assert.match(mountTsx, /Adapter moderno invalido\./);
  assert.match(mountTsx, /Componente moderno invalido\./);
  assert.match(mountTsx, /Elemento root nao encontrado para a base moderna\./);
  assert.match(runtimeTs, /createConnectedReportsAdapter/);
  assert.match(runtimeTs, /createConnectedReportsDemoSource/);
  assert.match(runtimeTs, /reportsSource \?\? createConnectedReportsDemoSource\(\)/);
  assert.match(refreshControllerTs, /createReportsRefreshController/);
  assert.match(refreshControllerTs, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(refreshControllerTs, /ReportsReadonlyDiagnostics/);
  assert.match(refreshControllerTs, /ReportsRefreshControllerDiagnosticsFactory/);
  assert.match(refreshControllerTs, /subscribe/);
  assert.match(refreshControllerTs, /refresh/);
  assert.match(refreshControllerTs, /getState/);
  assert.match(refreshControllerTs, /Nao foi possivel atualizar a previa/);
  assert.match(stylesCss, /\.modern-menu-button:focus-visible/);
  assert.match(stylesCss, /--color-background:/);
  assert.match(stylesCss, /--color-surface:/);
  assert.match(stylesCss, /--color-text:/);
  assert.match(stylesCss, /--color-text-muted:/);
  assert.match(stylesCss, /--color-border:/);
  assert.match(stylesCss, /--color-focus:/);
  assert.match(stylesCss, /--space-4:/);
  assert.match(stylesCss, /--radius-lg:/);
  assert.match(stylesCss, /--shadow-shell:/);
  assert.match(stylesCss, /--motion-fast:/);
  assert.match(stylesCss, /outline: 3px solid var\(--color-focus\)/);
  assert.match(stylesCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesCss, /\.assets-report__table caption/);
  assert.match(stylesCss, /\.assets-report__mobile-list/);
  assert.match(stylesCss, /\.assets-report__refresh-button/);
  assert.match(stylesCss, /\.assets-report__diagnostic/);
  assert.match(stylesCss, /\.assets-report__status/);
  assert.match(stylesCss, /font-variant-numeric: tabular-nums/);
  assert.equal(stylesCss.includes('!important'), false);
  assert.equal(stylesCss.includes('url('), false);
  assert.equal(stylesCss.includes('--shell-bg'), false);
  assert.equal(stylesCss.includes('--panel-bg'), false);
  assert.equal(viteConfigTs.includes('@legacy-reports-readonly-source'), false);
  assert.match(viteConfigTs, /optimizeDeps/);
  assert.match(viteConfigTs, /reports-readonly-source\.js/);
  assert.match(viteConfigTs, /report-asset-row\.js/);
  assert.equal(viteConfigTs.includes("target: 'esnext'"), false);
  assert.equal(viteConfigTs.includes("base: './'"), true);
  assert.match(viteConfigTs, /rollupOptions/);
  assert.match(viteConfigTs, /index: resolve\(rootDir, 'index\.html'\)/);
  assert.match(viteConfigTs, /host: resolve\(rootDir, 'host\.html'\)/);
  assert.match(viteConfigTs, /server:/);
  assert.match(viteConfigTs, /fs:\s*\{\s*allow:/);
  assert.match(viteConfigTs, /resolve\(rootDir, '\.\.'\)/);
  assert.match(headerTsx, /aria-controls="modern-sidebar"/);
  assert.match(headerTsx, /aria-expanded=\{isMenuOpen\}/);
  assert.match(sidebarTsx, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(sidebarTsx, /Secoes da base moderna/);
  assert.match(placeholderTsx, /Funcionalidade real ainda nao foi migrada\./);
  assert.match(reportsBridgeTs, /READ_ONLY_REPORT_CATEGORIES/);
  assert.match(reportsBridgeTs, /READ_ONLY_REPORT_TRENDS/);
  assert.match(reportsBridgeTs, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(reportsBridgeTs, /createReadOnlyReportsBridge/);
  assert.match(reportsBridgeTs, /readSnapshot\(\)/);
  assert.match(reportsBridgeTs, /itemCount !== value\.items\.length/);
  assert.match(reportsBridgeTs, /Number\.isFinite/);
  assert.match(reportsBridgeTs, /catch/);
  assert.match(reportsIntegrationTs, /createLegacyReportsReadonlyBoundary/);
  assert.match(reportsIntegrationTs, /createConnectedReportsBridge/);
  assert.match(reportsIntegrationTs, /createConnectedReportsAdapter/);
  assert.match(reportsPreviewTsx, /Previa somente leitura de Relatorios/);
  assert.match(reportsPreviewTsx, /adapter: ReadOnlyReportsAdapter/);
  assert.match(reportsPreviewTsx, /snapshot=\{adapter\.getSnapshot\(\)\}/);
  assert.match(reportsPreviewTsx, /showRefreshButton=\{false\}/);
  assert.match(reportsPreviewTsx, /assets-report__diagnostic/);
  assert.match(reportsPreviewTsx, /aria-live="polite"/);
  assert.match(reportsPreviewTsx, /snapshot\.notice/);
  assert.match(reportsPreviewTsx, /snapshot\.summary\.totalValue/);
  assert.match(reportsPreviewTsx, /snapshot\.items\.map/);
  assert.match(reportsAdapterTs, /createReadOnlyReportsBridge/);
  assert.match(reportsAdapterTs, /READ_ONLY_REPORTS_BRIDGE/);
  assert.match(reportsAdapterTs, /export type \{ ReadOnlyReportCategory, ReadOnlyReportItem, ReadOnlyReportTrend, ReadOnlyReportsSnapshot \}/);
  assert.match(reportsAdapterTs, /export interface ReadOnlyReportsAdapter/);
  assert.match(reportsAdapterTs, /createReadOnlyReportsAdapter/);
  assert.match(reportsAdapterTs, /READ_ONLY_REPORTS_ADAPTER/);
  assert.match(reportsAdapterTs, /ReadOnlyReportsBridge/);
  assert.match(readonlySessionTs, /readonlyReportPage/);
  assert.match(readonlySessionTs, /readReadonlyReportSessionContext/);
  assert.match(readonlySessionTs, /buildReadonlyReportSessionSearch/);
  assert.match(readonlySessionTs, /buildReadonlyReportSessionUrl/);
  assert.match(readonlySessionTs, /ReadonlyReportPageContract/);
  assert.equal(readonlySessionTs.includes('withReadonlyReportSessionFallback'), false);
  assert.equal(navigationTs.includes('MODERN_PAGE_IDS'), false);
  assert.deepEqual(
    readonlyReportPageContract.READONLY_REPORT_PAGE_IDS,
    MODERN_PAGES.map((page) => page.id),
  );
  assert.match(navigationTs, /Visao geral/);
  assert.match(navigationTs, /Configuracoes/);
  assert.match(navigationTs, /Snapshot somente leitura controlado por adaptador explicito/);
  assert.match(navigationTs, /Snapshot de leitura segura/);
  assert.equal(packageJson.scripts.build, "node -e \"const fs=require('fs'); const files=['index.html','manifest.json','sw.js']; for (const f of files) { if (!fs.existsSync(f)) { throw new Error('Missing file: ' + f); } } console.log('Build OK: static app validated.');\"");
  assert.equal(packageJson.scripts.test.includes('test:modern'), false);
  assert.equal(packageJson.scripts['dev:modern'], 'vite --config modern/vite.config.ts');
  assert.equal(packageJson.scripts['build:modern'], 'vite build --config modern/vite.config.ts');
  assert.equal(packageJson.scripts['test:modern'], 'node --experimental-strip-types --test tests/modern-base.test.js tests/modern-host.test.js tests/modern-host-source.test.js tests/modern-reports-bridge.test.js tests/modern-reports-integration.test.js tests/modern-reports-refresh.test.js tests/legacy-assets-active-wallet-host.test.js tests/readonly-report-session-context.test.js');
  assert.equal(fs.existsSync(path.join(modernRoot, 'dist')), true, 'Expected modern/dist to remain present after modern build');

  const allText = allSourceText();
  for (const forbidden of [
    'firebase',
    'auth',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    /\bsync\b/,
    'backup',
    'fetch(',
    'axios',
    'XMLHttpRequest',
    'setInterval',
    'setTimeout',
    'requestAnimationFrame',
    'MutationObserver',
    'WebSocket',
  ]) {
    const matches = forbidden instanceof RegExp ? forbidden.test(allText) : allText.includes(forbidden);
    assert.equal(matches, false, `Forbidden reference found: ${forbidden}`);
  }

  for (const file of [appTsx, mainTsx, hostTsx, headerTsx, sidebarTsx, placeholderTsx, reportsPreviewTsx, reportsAdapterTs, navigationTs]) {
    assert.equal(/from\s+['"`]\.\.\/\.\.\//.test(file), false, 'Legacy import path found');
    assert.equal(/from\s+['"`]\/(?!node_modules)/.test(file), false, 'Absolute import path found');
  }

  assert.equal(appTsx.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(appTsx.includes('@legacy-reports-readonly-source'), false);
  assert.equal(mainTsx.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(mainTsx.includes('@legacy-reports-readonly-source'), false);
  assert.equal(hostTsx.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(hostTsx.includes('@legacy-reports-readonly-source'), false);
  assert.equal(hostTsx.includes('report-asset-row.js'), false);
  assert.equal(reportsPreviewTsx.includes('createConnectedReportsDemoSource'), false);
  assert.equal(reportsPreviewTsx.includes('STATIC_REPORTS_SNAPSHOT'), false);
  assert.equal(mountTsx.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(mountTsx.includes('@legacy-reports-readonly-source'), false);
  assert.equal(mountTsx.includes("from '../App'"), false);
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
  assert.equal(runtimeTs.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(runtimeTs.includes('@legacy-reports-readonly-source'), false);
  assert.equal(reportsIntegrationTs.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(reportsIntegrationTs.includes('@legacy-reports-readonly-source'), false);
  assert.equal(reportsIntegrationTs.includes('globalThis'), false);
  assert.equal(reportsIntegrationTs.includes('localStorage'), false);
  assert.equal(reportsIntegrationTs.includes('sessionStorage'), false);
  assert.equal(reportsIntegrationTs.includes('indexedDB'), false);
  assert.equal(reportsIntegrationTs.includes('firebase'), false);
  assert.equal(reportsIntegrationTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(reportsIntegrationTs), false);
  assert.equal(reportsIntegrationTs.includes('backup'), false);
  assert.equal(reportsIntegrationTs.includes('document'), false);
  assert.equal(reportsIntegrationTs.includes('window'), false);
  assert.equal(reportsIntegrationTs.includes('assetAppliedValue'), false);
  assert.equal(reportsIntegrationTs.includes('assetCurrentValue'), false);
  assert.equal(reportsIntegrationTs.includes('totalValueCalculator'), false);
  assert.equal(reportsIntegrationTs.includes('averageVariationPctCalculator'), false);
  assert.equal(reportsIntegrationTs.includes('allocationPctCalculator'), false);
  assert.equal(readonlySessionTs.includes('localStorage'), false);
  assert.equal(readonlySessionTs.includes('sessionStorage'), false);
  assert.equal(readonlySessionTs.includes('indexedDB'), false);
  assert.equal(readonlySessionTs.includes('firebase'), false);
  assert.equal(readonlySessionTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(readonlySessionTs), false);
  assert.equal(readonlySessionTs.includes('backup'), false);
  assert.equal(readonlySessionTs.includes('READONLY_REPORT_PAGE_IDS=new Set'), false);
  assert.equal(indexHtml.includes('READONLY_REPORT_SESSION_PAGE_IDS=new Set'), false);
  assert.match(sessionContractJs, /READONLY_REPORT_PAGE_IDS/);
  assert.match(sessionContractJs, /DEFAULT_READONLY_REPORT_PAGE_ID/);
  assert.match(sessionContractJs, /normalizeReadonlyReportPageId/);
  assert.match(sessionContractJs, /isReadonlyReportPageId/);
  assert.equal(hostSourceTs.includes('localStorage'), false);
  assert.equal(hostSourceTs.includes('sessionStorage'), false);
  assert.equal(hostSourceTs.includes('indexedDB'), false);
  assert.equal(hostSourceTs.includes('firebase'), false);
  assert.equal(hostSourceTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(hostSourceTs), false);
  assert.equal(hostSourceTs.includes('backup'), false);
  assert.equal(hostSourceTs.includes('document'), false);
  assert.equal(hostSourceTs.includes('window'), false);
  assert.equal(hostSourceTs.includes('postMessage'), false);
  assert.equal(hostSourceTs.includes('BroadcastChannel'), false);
  assert.equal(hostSourceTs.includes('CustomEvent'), false);
  assert.equal(mountTsx.includes('globalThis'), false);
  assert.equal(mountTsx.includes('localStorage'), false);
  assert.equal(mountTsx.includes('sessionStorage'), false);
  assert.equal(mountTsx.includes('indexedDB'), false);
  assert.equal(mountTsx.includes('firebase'), false);
  assert.equal(mountTsx.includes('auth'), false);
  assert.equal(mountTsx.includes('sync'), false);
  assert.equal(mountTsx.includes('backup'), false);
  assert.equal(mountTsx.includes('postMessage'), false);
  assert.equal(mountTsx.includes('BroadcastChannel'), false);
  assert.equal(mountTsx.includes('CustomEvent'), false);
  assert.equal(mountTsx.includes('window.'), false);
  assert.equal(sessionContractJs.includes('localStorage'), false);
  assert.equal(sessionContractJs.includes('sessionStorage'), false);
  assert.equal(sessionContractJs.includes('indexedDB'), false);
  assert.equal(sessionContractJs.includes('firebase'), false);
  assert.equal(sessionContractJs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(sessionContractJs), false);
  assert.equal(sessionContractJs.includes('backup'), false);
  assert.equal(sessionContractJs.includes('setInterval'), false);
  assert.equal(sessionContractJs.includes('setTimeout'), false);
  assert.equal(sessionContractJs.includes('requestAnimationFrame'), false);
  assert.equal(sessionContractJs.includes('MutationObserver'), false);
  assert.equal(sessionContractJs.includes('WebSocket'), false);
});

test('modern shell exposes seven navigation options', () => {
  const navigationTs = read('src/types/navigation.ts');
  const labels = ['Visao geral', 'Ativos', 'Renda fixa', 'Proventos', 'Aportes', 'Relatorios', 'Configuracoes'];

  for (const label of labels) {
    assert.match(navigationTs, new RegExp(label));
  }

  assert.match(navigationTs, /export type ModernPageId/);
  assert.match(navigationTs, /export interface ModernPage/);
  assert.match(navigationTs, /export const MODERN_PAGES/);
  assert.match(navigationTs, /export const OVERVIEW_CARDS/);
});

test('modern reports adapter returns frozen read-only snapshot', () => {
  const bridgeFile = read('src/features/reports/reportsReadonlyBridge.ts');
  const adapterFile = read('src/features/reports/reportsSnapshotAdapter.ts');

  assert.match(bridgeFile, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(bridgeFile, /createReadOnlyReportsBridge/);
  assert.match(bridgeFile, /cloneReadOnlyReportsSnapshot/);
  assert.match(bridgeFile, /isReadOnlyReportsSnapshot/);
  assert.match(bridgeFile, /deepFreeze/);
  assert.match(bridgeFile, /React nao escreve na fonte/);
  assert.match(bridgeFile, /readonly/);
  assert.match(adapterFile, /READ_ONLY_REPORTS_ADAPTER/);
  assert.match(adapterFile, /createReadOnlyReportsAdapter/);
  assert.match(adapterFile, /ReadOnlyReportsBridge/);
  assert.equal(bridgeFile.includes('localStorage'), false);
  assert.equal(bridgeFile.includes('sessionStorage'), false);
  assert.equal(bridgeFile.includes('indexedDB'), false);
  assert.equal(adapterFile.includes('localStorage'), false);
  assert.equal(adapterFile.includes('sessionStorage'), false);
  assert.equal(adapterFile.includes('indexedDB'), false);
});
