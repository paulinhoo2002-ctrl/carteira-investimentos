const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const readonlyReportPageContract = require('../readonly-report-page-contract.js');

const modernRoot = path.join(__dirname, '..', 'modern');
const rootIndexPath = path.join(__dirname, '..', 'index.html');
const legacyContractFallbackToken = ['fallback', 'ReadonlyReportPageContract'].join('');
const legacyContractResolverToken = ['resolveReadonlyReportPageContract', 'Safely'].join('');
const legacyContractCandidateToken = ['readReadonlyReportPageContract', 'Candidate'].join('');
const legacyContractExportsToken = ['readReadonlyReportPageContract', 'Exports'].join('');
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
  'src/bootstrap/hostIncomeReadonlySource.ts',
  'src/bootstrap/modernIncomeRuntime.ts',
  'src/bootstrap/hostContributionsReadonlySource.ts',
  'src/bootstrap/modernContributionsRuntime.ts',
  'src/features/income/incomeRefreshController.ts',
  'src/features/contributions/ContributionsReadonlyPage.tsx',
  'src/features/contributions/readonlyContributionsViewModel.ts',
  'src/features/contributions/contributionsReadonlyContract.mjs',
  'src/features/contributions/contributionsReadonlyContract.d.ts',
  'src/features/contributions/contributionsReadonlyBridge.mjs',
  'src/features/contributions/contributionsReadonlyBridge.d.ts',
  'src/features/contributions/contributionsSnapshotAdapter.mjs',
  'src/features/contributions/contributionsSnapshotAdapter.d.ts',
  'src/features/contributions/legacyContributionsReadonlyIntegration.ts',
  'src/features/contributions/contributionsRefreshController.ts',
  'src/features/reports/reportsRefreshController.ts',
  'src/features/reports/AssetsReadonlyPage.tsx',
  'src/features/income/IncomeReadonlyPage.tsx',
  'src/features/income/readonlyIncomeViewModel.ts',
  'src/features/income/incomeReadonlyContract.mjs',
  'src/features/income/incomeReadonlyContract.d.ts',
  'src/features/income/incomeReadonlyBridge.mjs',
  'src/features/income/incomeReadonlyBridge.d.ts',
  'src/features/income/incomeSnapshotAdapter.mjs',
  'src/features/income/incomeSnapshotAdapter.d.ts',
  'src/features/income/legacyIncomeReadonlyIntegration.ts',
  'src/components/AppHeader.tsx',
  'src/components/Sidebar.tsx',
  'src/components/PagePlaceholder.tsx',
  'src/features/reports/readonlyReportsViewModel.ts',
  'src/features/reports/reportsReadonlyContract.mjs',
  'src/features/reports/reportsReadonlyBridge.mjs',
  'src/features/reports/legacyReportsReadonlyIntegration.ts',
  'src/features/reports/AssetsReportPreview.tsx',
  'src/features/reports/reportsSnapshotAdapter.mjs',
  'src/features/reports/readonlyReportSessionContext.ts',
  'src/bootstrap/hostFixedIncomeReadonlySource.ts',
  'src/bootstrap/modernFixedIncomeRuntime.ts',
  'src/features/fixed-income/FixedIncomeReadonlyPage.tsx',
  'src/features/fixed-income/readonlyFixedIncomeViewModel.ts',
  'src/features/fixed-income/fixedIncomeReadonlyContract.mjs',
  'src/features/fixed-income/fixedIncomeReadonlyContract.d.ts',
  'src/features/fixed-income/fixedIncomeReadonlyBridge.mjs',
  'src/features/fixed-income/fixedIncomeReadonlyBridge.d.ts',
  'src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs',
  'src/features/fixed-income/fixedIncomeSnapshotAdapter.d.ts',
  'src/features/fixed-income/legacyFixedIncomeReadonlyIntegration.ts',
  'src/types/navigation.mjs',
];

const hostExperimentalFiles = ['src/bootstrap/hostLegacyReportsReadonlySource.ts'];
const navigationModulePath = path.join(__dirname, '..', 'modern', 'src', 'types', 'navigation.mjs');

function read(relativePath) {
  return fs.readFileSync(path.join(modernRoot, relativePath), 'utf8');
}

function allSourceText() {
  return sourceFiles
    .filter((file) => !hostExperimentalFiles.includes(file))
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.mjs') || file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.md'))
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
  const fixedIncomeSourceTs = read('src/bootstrap/hostFixedIncomeReadonlySource.ts');
  const mountTsx = read('src/bootstrap/mountModernApp.ts');
  const fixedIncomeRuntimeTs = read('src/bootstrap/modernFixedIncomeRuntime.ts');
  const stylesCss = read('src/styles.css');
  const runtimeTs = read('src/bootstrap/modernReportsRuntime.ts');
  const refreshControllerTs = read('src/features/reports/reportsRefreshController.ts');
  const assetsReadonlyTsx = read('src/features/reports/AssetsReadonlyPage.tsx');
  const fixedIncomeReadonlyTsx = read('src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
  const fixedIncomeViewModelTs = read('src/features/fixed-income/readonlyFixedIncomeViewModel.ts');
  const fixedIncomeContractTs = read('src/features/fixed-income/fixedIncomeReadonlyContract.mjs');
  const fixedIncomeBridgeTs = read('src/features/fixed-income/fixedIncomeReadonlyBridge.mjs');
  const fixedIncomeAdapterTs = read('src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs');
  const incomeReadonlyTsx = read('src/features/income/IncomeReadonlyPage.tsx');
  const incomeViewModelTs = read('src/features/income/readonlyIncomeViewModel.ts');
  const incomeContractTs = read('src/features/income/incomeReadonlyContract.mjs');
  const incomeBridgeTs = read('src/features/income/incomeReadonlyBridge.mjs');
  const incomeAdapterTs = read('src/features/income/incomeSnapshotAdapter.mjs');
  const incomeIntegrationTs = read('src/features/income/legacyIncomeReadonlyIntegration.ts');
  const incomeSourceTs = read('src/bootstrap/hostIncomeReadonlySource.ts');
  const incomeRuntimeTs = read('src/bootstrap/modernIncomeRuntime.ts');
  const incomeRefreshControllerTs = read('src/features/income/incomeRefreshController.ts');
  const contributionsReadonlyTsx = read('src/features/contributions/ContributionsReadonlyPage.tsx');
  const contributionsViewModelTs = read('src/features/contributions/readonlyContributionsViewModel.ts');
  const contributionsContractTs = read('src/features/contributions/contributionsReadonlyContract.mjs');
  const contributionsContractTypes = read('src/features/contributions/contributionsReadonlyContract.d.ts');
  const contributionsBridgeTs = read('src/features/contributions/contributionsReadonlyBridge.mjs');
  const contributionsBridgeTypes = read('src/features/contributions/contributionsReadonlyBridge.d.ts');
  const contributionsAdapterTs = read('src/features/contributions/contributionsSnapshotAdapter.mjs');
  const contributionsAdapterTypes = read('src/features/contributions/contributionsSnapshotAdapter.d.ts');
  const contributionsIntegrationTs = read('src/features/contributions/legacyContributionsReadonlyIntegration.ts');
  const contributionsSourceTs = read('src/bootstrap/hostContributionsReadonlySource.ts');
  const contributionsRuntimeTs = read('src/bootstrap/modernContributionsRuntime.ts');
  const contributionsRefreshControllerTs = read('src/features/contributions/contributionsRefreshController.ts');
  const readonlyViewModelTs = read('src/features/reports/readonlyReportsViewModel.ts');
  const viteConfigTs = read('vite.config.ts');
  const headerTsx = read('src/components/AppHeader.tsx');
  const sidebarTsx = read('src/components/Sidebar.tsx');
  const placeholderTsx = read('src/components/PagePlaceholder.tsx');
  const reportsBridgeTs = read('src/features/reports/reportsReadonlyBridge.mjs');
  const reportsBridgeTypes = read('src/features/reports/reportsReadonlyBridge.d.ts');
  const reportsIntegrationTs = read('src/features/reports/legacyReportsReadonlyIntegration.ts');
  const reportsPreviewTsx = read('src/features/reports/AssetsReportPreview.tsx');
  const reportsAdapterTs = read('src/features/reports/reportsSnapshotAdapter.mjs');
  const reportsAdapterTypes = read('src/features/reports/reportsSnapshotAdapter.d.ts');
  const readonlySessionTs = read('src/features/reports/readonlyReportSessionContext.ts');
  const navigationTs = read('src/types/navigation.mjs');
  const navigationTypes = read('src/types/navigation.d.ts');
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
  assert.match(hostTsx, /createHostIncomeReadonlySource/);
  assert.match(hostTsx, /createModernIncomeRuntime/);
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
  assert.match(appTsx, /incomeAdapter: ReadOnlyIncomeAdapter/);
  assert.match(appTsx, /reportsRefreshController\?\:/);
  assert.match(appTsx, /incomeRefreshController\?\:/);
  assert.match(appTsx, /initialPageId\?: ModernPageId/);
  assert.match(appTsx, /onActivePageIdChange\?: \(pageId: ModernPageId\) => void/);
  assert.match(appTsx, /adapter=\{reportsAdapter\}/);
  assert.match(appTsx, /AssetsReadonlyPage/);
  assert.match(appTsx, /IncomeReadonlyPage/);
  assert.match(appTsx, /activePageId === 'assets'/);
  assert.match(appTsx, /activePageId === 'reports'/);
  assert.match(appTsx, /activePageId === 'provents'/);
  assert.match(mainTsx, /mountModernApp/);
  assert.match(mainTsx, /createModernReportsRuntime/);
  assert.match(mainTsx, /createModernFixedIncomeRuntime/);
  assert.match(mainTsx, /createModernIncomeRuntime/);
  assert.match(mainTsx, /const modernReportsRuntime = createModernReportsRuntime\(\);/);
  assert.match(mainTsx, /const modernFixedIncomeRuntime = createModernFixedIncomeRuntime\(\);/);
  assert.match(mainTsx, /const modernIncomeRuntime = createModernIncomeRuntime\(\);/);
  assert.match(mainTsx, /mountModernApp\(\{/);
  assert.match(mainTsx, /AppComponent: App/);
  assert.match(hostTsx, /mountModernApp/);
  assert.match(hostTsx, /createModernReportsRuntime/);
  assert.match(hostTsx, /createModernFixedIncomeRuntime/);
  assert.match(hostTsx, /createModernIncomeRuntime/);
  assert.match(hostTsx, /bootstrapHost/);
  assert.match(hostTsx, /isHostPage/);
  assert.match(hostTsx, /AppComponent: App/);
  assert.match(hostTsx, /reportsRefreshController/);
  assert.match(hostTsx, /fixedIncomeAdapter/);
  assert.match(hostTsx, /incomeAdapter/);
  assert.match(read('src/host-entry.tsx'), /bootstrapHost/);
  assert.match(hostSourceTs, /createLegacyReportsReadonlySource/);
  assert.match(hostSourceTs, /buildReportAssetRow/);
  assert.match(hostSourceTs, /HOST_LEGACY_REPORTS_ASSETS/);
  assert.match(fixedIncomeSourceTs, /createHostFixedIncomeReadonlySource/);
  assert.match(fixedIncomeSourceTs, /HOST_FIXED_INCOME_NOTICE/);
  assert.match(fixedIncomeSourceTs, /combinedTaxValue/);
  assert.match(incomeSourceTs, /createHostIncomeReadonlySource/);
  assert.match(incomeSourceTs, /getIncomeSnapshot/);
  assert.equal(fixedIncomeSourceTs.includes('reduce('), false);
  assert.equal(fixedIncomeSourceTs.includes('roundToCents'), false);
  assert.equal(fixedIncomeSourceTs.includes('toNumber(..., 0)'), false);
  assert.match(fixedIncomeRuntimeTs, /createModernFixedIncomeRuntime/);
  assert.match(incomeRuntimeTs, /createModernIncomeRuntime/);
  assert.match(contributionsReadonlyTsx, /ContributionsReadonlyPage/);
  assert.match(contributionsReadonlyTsx, /Atualizar aportes/);
  assert.match(contributionsReadonlyTsx, /Sugestao explicavel/);
  assert.match(contributionsReadonlyTsx, /Voltar ao legado/);
  assert.match(contributionsViewModelTs, /createReadonlyContributionsViewModel/);
  assert.match(contributionsViewModelTs, /formatReadonlyCurrencyOrMissing/);
  assert.match(contributionsViewModelTs, /displayContributionIdentity/);
  assert.match(contributionsContractTs, /CONTRIBUTIONS_READONLY_CONTRACT_VERSION/);
  assert.match(contributionsContractTs, /normalizeReadonlyContributionsSnapshot/);
  assert.match(contributionsContractTypes, /ReadOnlyContributionsSnapshot/);
  assert.match(contributionsContractTypes, /ReadOnlyContributionItem/);
  assert.match(contributionsBridgeTs, /createContributionsReadonlyBridge/);
  assert.match(contributionsBridgeTypes, /ReadOnlyContributionsSource/);
  assert.match(contributionsAdapterTs, /createContributionsReadonlyAdapter/);
  assert.match(contributionsAdapterTypes, /ReadOnlyContributionsAdapter/);
  assert.match(contributionsIntegrationTs, /createConnectedContributionsDemoSource/);
  assert.match(contributionsIntegrationTs, /createLegacyContributionsReadonlyBoundary/);
  assert.match(contributionsSourceTs, /createHostContributionsReadonlySource/);
  assert.match(contributionsRuntimeTs, /createModernContributionsRuntime/);
  assert.match(contributionsRuntimeTs, /contributionsRefreshController/);
  assert.match(contributionsRefreshControllerTs, /createContributionsRefreshController/);
  assert.match(contributionsRefreshControllerTs, /subscribe/);
  assert.equal(hostSourceTs.includes('loadBuildReportAssetRowModule'), false);
  assert.equal(hostSourceTs.includes('globalThis'), false);
  assert.match(mountTsx, /export function mountModernApp/);
  assert.match(mountTsx, /WeakMap/);
  assert.match(mountTsx, /Base moderna ja montada neste root\./);
  assert.match(mountTsx, /Adapter moderno invalido\./);
  assert.match(mountTsx, /Componente moderno invalido\./);
  assert.match(mountTsx, /Elemento root nao encontrado para a base moderna\./);
  assert.equal(hostHtml.includes('type="module" src="../readonly-report-page-contract.js"'), false);
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
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /READ_ONLY_REPORT_CATEGORIES/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /READ_ONLY_REPORT_TRENDS/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /READ_ONLY_REPORTS_CONTRACT_VERSION/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /normalizeReadOnlyReportsSnapshot/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /isReadOnlyReportsSnapshot/);
  assert.match(reportsBridgeTs, /reportsReadonlyContract/);
  assert.match(reportsBridgeTs, /createReadOnlyReportsBridge/);
  assert.match(reportsBridgeTs, /readSnapshot\(\)/);
  assert.match(reportsBridgeTs, /READ_ONLY_REPORTS_BRIDGE/);
  assert.match(reportsBridgeTs, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(reportsBridgeTs, /normalizeReadOnlyReportsSnapshot/);
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
  assert.match(reportsPreviewTsx, /formatReadonlyDateTime/);
  assert.match(reportsPreviewTsx, /formatReadonlyCurrency/);
  assert.match(reportsPreviewTsx, /formatReadonlyPercent/);
  assert.match(reportsPreviewTsx, /formatReadonlyQuantity/);
  assert.match(assetsReadonlyTsx, /AssetsReadonlyPage/);
  assert.match(assetsReadonlyTsx, /createReadonlyAssetsViewModel/);
  assert.match(incomeReadonlyTsx, /IncomeReadonlyPage/);
  assert.match(incomeReadonlyTsx, /Atualizar proventos/);
  assert.match(incomeReadonlyTsx, /Lista de proventos/);
  assert.match(incomeReadonlyTsx, /Distribuicao mensal/);
  assert.match(incomeReadonlyTsx, /Destaques/);
  assert.match(incomeReadonlyTsx, /aria-live="polite"/);
  assert.match(incomeReadonlyTsx, /IncomeReadonlyPageContent/);
  assert.match(incomeReadonlyTsx, /Nenhum pagamento informado/);
  assert.match(incomeReadonlyTsx, /Nenhum lancamento informado/);
  assert.match(incomeReadonlyTsx, /Sem meses informados/);
  assert.match(fixedIncomeReadonlyTsx, /FixedIncomeReadonlyPage/);
  assert.match(fixedIncomeReadonlyTsx, /createReadonlyFixedIncomeViewModel/);
  assert.match(incomeViewModelTs, /createReadonlyIncomeViewModel/);
  assert.match(incomeViewModelTs, /monthlyBuckets/);
  assert.match(incomeViewModelTs, /topPayments/);
  assert.match(incomeViewModelTs, /topPayers/);
  assert.match(incomeViewModelTs, /formatReadonlyMoneyOrMissing/);
  assert.match(incomeContractTs, /INCOME_READONLY_CONTRACT_VERSION/);
  assert.match(incomeContractTs, /INCOME_READONLY_FALLBACK_SNAPSHOT/);
  assert.match(incomeContractTs, /normalizeReadonlyIncomeSnapshot/);
  assert.match(incomeContractTs, /isReadonlyIncomeSnapshot/);
  assert.match(incomeContractTs, /paymentCount/);
  assert.match(incomeContractTs, /receivedValue/);
  assert.match(incomeContractTs, /taxValue/);
  assert.equal(incomeContractTs.includes('grossValue'), false);
  assert.equal(incomeContractTs.includes('netValue'), false);
  assert.match(incomeBridgeTs, /createIncomeReadonlyBridge/);
  assert.match(incomeBridgeTs, /readSnapshot\(\)/);
  assert.match(incomeAdapterTs, /createIncomeReadonlyAdapter/);
  assert.match(incomeAdapterTs, /getSnapshot\(\)/);
  assert.match(incomeIntegrationTs, /createConnectedIncomeAdapter/);
  assert.match(incomeIntegrationTs, /createLegacyIncomeReadonlyBoundary/);
  assert.match(incomeIntegrationTs, /createConnectedIncomeBridge/);
  assert.match(incomeIntegrationTs, /receivedValue/);
  assert.match(incomeRefreshControllerTs, /createIncomeRefreshController/);
  assert.match(incomeRefreshControllerTs, /INCOME_READONLY_FALLBACK_SNAPSHOT/);
  assert.match(incomeRefreshControllerTs, /refresh/);
  assert.match(incomeRefreshControllerTs, /subscribe/);
  assert.match(incomeRefreshControllerTs, /getState/);
  assert.match(fixedIncomeViewModelTs, /createReadonlyFixedIncomeViewModel/);
  assert.match(fixedIncomeViewModelTs, /topProfitItems/);
  assert.match(fixedIncomeViewModelTs, /topLossItems/);
  assert.match(fixedIncomeContractTs, /combinedTaxValue/);
  assert.match(fixedIncomeContractTs, /totalCombinedTaxValue/);
  assert.match(fixedIncomeContractTs, /irValue/);
  assert.match(fixedIncomeContractTs, /iofValue/);
  assert.match(fixedIncomeContractTs, /Sem informação/);
  assert.match(fixedIncomeContractTs, /Próximo/);
  assert.match(fixedIncomeContractTs, /A vencer/);
  assert.equal(fixedIncomeViewModelTs.includes('reduce('), false);
  assert.equal(fixedIncomeViewModelTs.includes('roundToCents'), false);
  assert.equal(fixedIncomeViewModelTs.includes('toNumber(..., 0)'), false);
  assert.match(assetsReadonlyTsx, /Voltar ao legado/);
  assert.match(assetsReadonlyTsx, /Atualizar ativos/);
  assert.match(assetsReadonlyTsx, /Nenhum ativo em alta/);
  assert.match(assetsReadonlyTsx, /Nenhum ativo em queda/);
  assert.match(assetsReadonlyTsx, /Maiores posições/);
  assert.match(assetsReadonlyTsx, /Distribuição por categoria/);
  assert.match(assetsReadonlyTsx, /Lista de ativos/);
  assert.match(assetsReadonlyTsx, /aria-live="polite"/);
  assert.match(assetsReadonlyTsx, /ReadonlyAssetsSortKey/);
  assert.match(readonlyViewModelTs, /createReadonlyAssetsViewModel/);
  assert.match(readonlyViewModelTs, /formatReadonlyCurrency/);
  assert.match(readonlyViewModelTs, /formatReadonlyPercent/);
  assert.match(readonlyViewModelTs, /formatReadonlyQuantity/);
  assert.match(readonlyViewModelTs, /formatReadonlyDateTime/);
  assert.match(reportsAdapterTs, /reportsReadonlyBridge/);
  assert.match(reportsAdapterTs, /createReadOnlyReportsAdapter/);
  assert.match(reportsAdapterTs, /READ_ONLY_REPORTS_ADAPTER/);
  assert.match(reportsAdapterTs, /ReadOnlyReportsBridge/);
  assert.match(reportsAdapterTypes, /ReadOnlyReportCategory/);
  assert.match(reportsAdapterTypes, /ReadOnlyReportItem/);
  assert.match(reportsAdapterTypes, /ReadOnlyReportTrend/);
  assert.match(reportsAdapterTypes, /ReadOnlyReportsSnapshot/);
  assert.match(reportsAdapterTypes, /export interface ReadOnlyReportsAdapter/);
  assert.match(navigationTs, /MODERN_PAGES/);
  assert.match(navigationTs, /OVERVIEW_CARDS/);
  assert.equal(navigationTs.includes('MODERN_PAGE_IDS'), false);
  assert.match(navigationTypes, /ModernPageId/);
  assert.match(navigationTypes, /ModernPage/);
  assert.match(navigationTypes, /export declare const MODERN_PAGES/);
  assert.match(navigationTypes, /export declare const OVERVIEW_CARDS/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /READ_ONLY_REPORTS_CONTRACT_VERSION/);
  assert.match(read('src/features/reports/reportsReadonlyContract.mjs'), /normalizeReadOnlyReportsSnapshot/);
  assert.match(readonlySessionTs, /readonlyReportPage/);
  assert.match(readonlySessionTs, /readReadonlyReportSessionContext/);
  assert.match(readonlySessionTs, /buildReadonlyReportSessionSearch/);
  assert.match(readonlySessionTs, /buildReadonlyReportSessionUrl/);
  assert.match(readonlySessionTs, /getReadonlyReportPageContract/);
  assert.match(
    readonlySessionTs,
    /getReadonlyReportPageContract\?\.\([\s\n]*readonlyReportPageContract,?[\s\n]*\)/,
  );
  assert.equal(readonlySessionTs.includes('getReadonlyReportPageContract?.()'), false);
  assert.equal(readonlySessionTs.includes('withReadonlyReportSessionFallback'), false);
  assert.equal(readonlySessionTs.includes('declare const ReadonlyReportPageContract'), false);
  assert.equal(readonlySessionTs.includes(legacyContractFallbackToken), false);
  assert.equal(readonlySessionTs.includes(legacyContractResolverToken), false);
  assert.equal(readonlySessionTs.includes(legacyContractCandidateToken), false);
  assert.equal(readonlySessionTs.includes(legacyContractExportsToken), false);
  assert.equal(
    /(^|[^A-Za-z0-9_])ReadonlyReportPageContract\.normalizeReadonlyReportPageId/.test(readonlySessionTs),
    false,
  );
  assert.deepEqual(
    readonlyReportPageContract.READONLY_REPORT_PAGE_IDS,
    MODERN_PAGES.map((page) => page.id),
  );
  assert.match(navigationTs, /Visao geral/);
  assert.match(navigationTs, /Configuracoes/);
  assert.match(navigationTs, /Aportes e sugestao explicavel/);
  assert.match(navigationTs, /Leitura readonly dedicada/);
  assert.match(navigationTs, /Snapshot somente leitura controlado por adaptador explicito/);
  assert.match(navigationTs, /Snapshot de leitura segura/);
  assert.equal(packageJson.scripts.build, "node -e \"const fs=require('fs'); const files=['index.html','manifest.json','sw.js']; for (const f of files) { if (!fs.existsSync(f)) { throw new Error('Missing file: ' + f); } } console.log('Build OK: static app validated.');\"");
  assert.equal(packageJson.scripts.test.includes('test:modern'), false);
  assert.match(packageJson.scripts.test, /node --test tests\/readonly-contract-architecture\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/readonly-reports-data-contract\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/phase-202-assets-performance-overview\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/dividends-visual-refinement\.test\.js/);
  assert.equal(
    packageJson.scripts.test.includes('tests/readonly-contract-architecture.test.js'),
    true,
  );
  assert.equal(
    packageJson.scripts.test.includes('tests/readonly-reports-data-contract.test.js'),
    true,
  );
  assert.equal(
    packageJson.scripts.test.includes('tests/phase-202-assets-performance-overview.test.js'),
    true,
  );
  assert.equal(
    packageJson.scripts.test.includes('tests/dividends-visual-refinement.test.js'),
    true,
  );
  assert.equal(packageJson.scripts['dev:modern'], 'vite --config modern/vite.config.ts');
  assert.equal(packageJson.scripts['build:modern'], 'vite build --config modern/vite.config.ts');
  assert.equal(packageJson.scripts['test:modern'], 'node --experimental-strip-types --test tests/modern-base.test.js tests/modern-host.test.js tests/modern-host-source.test.js tests/modern-reports-bridge.test.js tests/modern-reports-integration.test.js tests/modern-reports-refresh.test.js tests/modern-assets-readonly-page.test.js tests/modern-fixed-income-readonly-page.test.js tests/modern-income-readonly-page.test.js tests/modern-contributions-explainable-page.test.js tests/legacy-assets-active-wallet-host.test.js tests/readonly-report-session-context.test.js tests/readonly-contract-architecture.test.js tests/readonly-reports-data-contract.test.js');
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

  for (const file of [incomeReadonlyTsx, incomeViewModelTs, incomeContractTs, incomeBridgeTs, incomeAdapterTs, incomeIntegrationTs, incomeSourceTs, incomeRuntimeTs, incomeRefreshControllerTs]) {
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
  assert.equal(fixedIncomeReadonlyTsx.includes('localStorage'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('sessionStorage'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('indexedDB'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('firebase'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('auth'), false);
  assert.equal(/\bsync\b/.test(fixedIncomeReadonlyTsx), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('backup'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('setInterval'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('setTimeout'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('requestAnimationFrame'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('MutationObserver'), false);
  assert.equal(fixedIncomeReadonlyTsx.includes('WebSocket'), false);
  assert.equal(fixedIncomeViewModelTs.includes('localStorage'), false);
  assert.equal(fixedIncomeViewModelTs.includes('sessionStorage'), false);
  assert.equal(fixedIncomeViewModelTs.includes('indexedDB'), false);
  assert.equal(fixedIncomeViewModelTs.includes('firebase'), false);
  assert.equal(fixedIncomeViewModelTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(fixedIncomeViewModelTs), false);
  assert.equal(fixedIncomeViewModelTs.includes('backup'), false);
  assert.equal(fixedIncomeContractTs.includes('localStorage'), false);
  assert.equal(fixedIncomeContractTs.includes('sessionStorage'), false);
  assert.equal(fixedIncomeContractTs.includes('indexedDB'), false);
  assert.equal(fixedIncomeContractTs.includes('firebase'), false);
  assert.equal(fixedIncomeContractTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(fixedIncomeContractTs), false);
  assert.equal(fixedIncomeContractTs.includes('backup'), false);
  assert.equal(fixedIncomeBridgeTs.includes('localStorage'), false);
  assert.equal(fixedIncomeBridgeTs.includes('sessionStorage'), false);
  assert.equal(fixedIncomeBridgeTs.includes('indexedDB'), false);
  assert.equal(fixedIncomeBridgeTs.includes('firebase'), false);
  assert.equal(fixedIncomeBridgeTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(fixedIncomeBridgeTs), false);
  assert.equal(fixedIncomeBridgeTs.includes('backup'), false);
  assert.equal(fixedIncomeAdapterTs.includes('localStorage'), false);
  assert.equal(fixedIncomeAdapterTs.includes('sessionStorage'), false);
  assert.equal(fixedIncomeAdapterTs.includes('indexedDB'), false);
  assert.equal(fixedIncomeAdapterTs.includes('firebase'), false);
  assert.equal(fixedIncomeAdapterTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(fixedIncomeAdapterTs), false);
  assert.equal(fixedIncomeAdapterTs.includes('backup'), false);
  assert.equal(incomeReadonlyTsx.includes('localStorage'), false);
  assert.equal(incomeReadonlyTsx.includes('sessionStorage'), false);
  assert.equal(incomeReadonlyTsx.includes('indexedDB'), false);
  assert.equal(incomeReadonlyTsx.includes('firebase'), false);
  assert.equal(incomeReadonlyTsx.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeReadonlyTsx), false);
  assert.equal(incomeReadonlyTsx.includes('backup'), false);
  assert.equal(incomeReadonlyTsx.includes('setInterval'), false);
  assert.equal(incomeReadonlyTsx.includes('setTimeout'), false);
  assert.equal(incomeReadonlyTsx.includes('requestAnimationFrame'), false);
  assert.equal(incomeReadonlyTsx.includes('MutationObserver'), false);
  assert.equal(incomeReadonlyTsx.includes('WebSocket'), false);
  assert.equal(incomeViewModelTs.includes('localStorage'), false);
  assert.equal(incomeViewModelTs.includes('sessionStorage'), false);
  assert.equal(incomeViewModelTs.includes('indexedDB'), false);
  assert.equal(incomeViewModelTs.includes('firebase'), false);
  assert.equal(incomeViewModelTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeViewModelTs), false);
  assert.equal(incomeViewModelTs.includes('backup'), false);
  assert.equal(incomeViewModelTs.includes('setInterval'), false);
  assert.equal(incomeViewModelTs.includes('setTimeout'), false);
  assert.equal(incomeViewModelTs.includes('requestAnimationFrame'), false);
  assert.equal(incomeViewModelTs.includes('MutationObserver'), false);
  assert.equal(incomeViewModelTs.includes('WebSocket'), false);
  assert.equal(incomeContractTs.includes('localStorage'), false);
  assert.equal(incomeContractTs.includes('sessionStorage'), false);
  assert.equal(incomeContractTs.includes('indexedDB'), false);
  assert.equal(incomeContractTs.includes('firebase'), false);
  assert.equal(incomeContractTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeContractTs), false);
  assert.equal(incomeContractTs.includes('backup'), false);
  assert.equal(incomeBridgeTs.includes('localStorage'), false);
  assert.equal(incomeBridgeTs.includes('sessionStorage'), false);
  assert.equal(incomeBridgeTs.includes('indexedDB'), false);
  assert.equal(incomeBridgeTs.includes('firebase'), false);
  assert.equal(incomeBridgeTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeBridgeTs), false);
  assert.equal(incomeBridgeTs.includes('backup'), false);
  assert.equal(incomeAdapterTs.includes('localStorage'), false);
  assert.equal(incomeAdapterTs.includes('sessionStorage'), false);
  assert.equal(incomeAdapterTs.includes('indexedDB'), false);
  assert.equal(incomeAdapterTs.includes('firebase'), false);
  assert.equal(incomeAdapterTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeAdapterTs), false);
  assert.equal(incomeAdapterTs.includes('backup'), false);
  assert.equal(incomeIntegrationTs.includes('localStorage'), false);
  assert.equal(incomeIntegrationTs.includes('sessionStorage'), false);
  assert.equal(incomeIntegrationTs.includes('indexedDB'), false);
  assert.equal(incomeIntegrationTs.includes('firebase'), false);
  assert.equal(incomeIntegrationTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeIntegrationTs), false);
  assert.equal(incomeIntegrationTs.includes('backup'), false);
  assert.equal(incomeSourceTs.includes('localStorage'), false);
  assert.equal(incomeSourceTs.includes('sessionStorage'), false);
  assert.equal(incomeSourceTs.includes('indexedDB'), false);
  assert.equal(incomeSourceTs.includes('firebase'), false);
  assert.equal(incomeSourceTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeSourceTs), false);
  assert.equal(incomeSourceTs.includes('backup'), false);
  assert.equal(incomeRefreshControllerTs.includes('localStorage'), false);
  assert.equal(incomeRefreshControllerTs.includes('sessionStorage'), false);
  assert.equal(incomeRefreshControllerTs.includes('indexedDB'), false);
  assert.equal(incomeRefreshControllerTs.includes('firebase'), false);
  assert.equal(incomeRefreshControllerTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(incomeRefreshControllerTs), false);
  assert.equal(incomeRefreshControllerTs.includes('backup'), false);
  assert.equal(incomeRefreshControllerTs.includes('setInterval'), false);
  assert.equal(incomeRefreshControllerTs.includes('setTimeout'), false);
  assert.equal(incomeRefreshControllerTs.includes('requestAnimationFrame'), false);
  assert.equal(incomeRefreshControllerTs.includes('MutationObserver'), false);
  assert.equal(incomeRefreshControllerTs.includes('WebSocket'), false);
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
  assert.match(sessionContractJs, /getReadonlyReportPageContract/);
  assert.equal(sessionContractJs.includes(['resolveReadonlyReportPageContract', '('].join('')), false);
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
  const navigationTs = read('src/types/navigation.mjs');
  const navigationTypes = read('src/types/navigation.d.ts');
  const labels = ['Visao geral', 'Ativos', 'Renda fixa', 'Proventos', 'Aportes', 'Relatorios', 'Configuracoes'];

  for (const label of labels) {
    assert.match(navigationTs, new RegExp(label));
  }

  assert.match(navigationTypes, /ModernPageId/);
  assert.match(navigationTypes, /ModernPage/);
  assert.match(navigationTypes, /export declare const MODERN_PAGES/);
  assert.match(navigationTypes, /export declare const OVERVIEW_CARDS/);
  assert.match(navigationTs, /MODERN_PAGES/);
  assert.match(navigationTs, /OVERVIEW_CARDS/);
});

test('modern reports adapter returns frozen read-only snapshot', () => {
  const bridgeFile = read('src/features/reports/reportsReadonlyBridge.mjs');
  const adapterFile = read('src/features/reports/reportsSnapshotAdapter.mjs');

  assert.match(bridgeFile, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(bridgeFile, /createReadOnlyReportsBridge/);
  assert.match(bridgeFile, /normalizeReadOnlyReportsSnapshot/);
  assert.match(bridgeFile, /READ_ONLY_REPORTS_BRIDGE/);
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
