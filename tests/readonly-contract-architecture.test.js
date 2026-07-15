const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const modernRoot = path.join(repoRoot, 'modern');

const readonlyPageIds = [
  'overview',
  'assets',
  'fixed-income',
  'provents',
  'contributions',
  'reports',
  'settings',
];

const contractFilename = ['readonly-report-page-contract', '.js'].join('');
const readonlyContractToken = ['Readonly', 'Report', 'Page', 'Contract'].join('');
const readonlyReportsContractToken = ['Readonly', 'Reports', 'Contract'].join('');
const legacyFallbackToken = ['fallback', readonlyContractToken].join('');
const createFallbackToken = ['create', readonlyContractToken, 'Fallback'].join('');
const createSafeFallbackToken = ['create', readonlyContractToken, 'Safe', 'Fallback'].join('');
const resolveSafelyToken = ['resolve', readonlyContractToken, 'Safely'].join('');
const readCandidateToken = ['read', readonlyContractToken, 'Candidate'].join('');
const readExportsToken = ['read', readonlyContractToken, 'Exports'].join('');
const fromGlobalToken = ['readonlyReportPageContract', 'FromGlobal'].join('');
const manualDeclareToken = ['declare const ', readonlyContractToken].join('');
const modernPageIdsToken = 'MODERN_PAGE_IDS';
const sessionPageIdsToken = 'SESSION_PAGE_IDS';
const readonlySessionPageIdsToken = 'READONLY_REPORT_SESSION_PAGE_IDS';
const readonlyReportsContractVersionToken = 'READ_ONLY_REPORTS_CONTRACT_VERSION';
const normalizeReadonlyReportsSnapshotToken = 'normalizeReadOnlyReportsSnapshot';
const isReadonlyReportsSnapshotToken = 'isReadOnlyReportsSnapshot';
const readonlyReportsContractFilename = 'reportsReadonlyContract.ts';

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function containsAllReadonlyPageIds(text) {
  return readonlyPageIds.every((id) => text.includes(`'${id}'`) || text.includes(`"${id}"`));
}

function forbiddenTokens() {
  return [
    legacyFallbackToken,
    createFallbackToken,
    resolveSafelyToken,
    readCandidateToken,
    readExportsToken,
    fromGlobalToken,
    manualDeclareToken,
    modernPageIdsToken,
    sessionPageIdsToken,
    readonlySessionPageIdsToken,
  ];
}

function assertNoForbiddenTokens(text, label) {
  for (const token of forbiddenTokens()) {
    assert.equal(text.includes(token), false, `${label} nao pode conter ${token}`);
  }
}

function assertNoCompleteReadonlyPageList(text, label) {
  assert.equal(
    containsAllReadonlyPageIds(text),
    false,
    `${label} nao pode conter a lista completa de IDs readonly`,
  );
}

function assertCanonicalContract(contractJs) {
  assert.match(contractJs, /getReadonlyReportPageContract/);
  assert.match(contractJs, /createReadonlyReportPageContractSafeFallback/);
  assert.match(contractJs, /readReadonlyReportPageContractGlobalCandidate/);
  assert.match(contractJs, /READONLY_REPORT_PAGE_IDS/);
  assert.match(contractJs, /DEFAULT_READONLY_REPORT_PAGE_ID/);
  assert.match(contractJs, /isReadonlyReportPageId/);
  assert.match(contractJs, /normalizeReadonlyReportPageId/);
  assert.equal(containsAllReadonlyPageIds(contractJs), true, 'Contrato precisa manter lista completa canonica');
}

function assertLegacyConsumerFallback(indexHtml) {
  const functionBlock = /function readonlyReportSessionPageIdFromLocation\(\)\{[\s\S]*?return 'reports';[\s\S]*?\}/;

  assert.match(indexHtml, /readonlyReportSessionPageIdFromLocation/);
  assert.match(indexHtml, /getReadonlyReportPageContract/);
  assert.match(indexHtml, functionBlock);
  assert.equal(indexHtml.includes(legacyFallbackToken), false, 'index.html nao pode recriar fallback local');
  assert.equal(indexHtml.includes(createFallbackToken), false, 'index.html nao pode recriar contrato local');
  assert.equal(indexHtml.includes(resolveSafelyToken), false, 'index.html nao pode recriar resolvedor local');
  assert.equal(indexHtml.includes(readCandidateToken), false, 'index.html nao pode ler candidato local');
  assert.equal(indexHtml.includes(readExportsToken), false, 'index.html nao pode ler exports locais');
  assert.equal(indexHtml.includes(fromGlobalToken), false, 'index.html nao pode usar global inseguro');
  assert.equal(indexHtml.includes(manualDeclareToken), false, 'index.html nao pode declarar contrato manual');
  assert.equal(indexHtml.includes(modernPageIdsToken), false, 'index.html nao pode recriar MODERN_PAGE_IDS');
  assert.equal(indexHtml.includes(sessionPageIdsToken), false, 'index.html nao pode recriar SESSION_PAGE_IDS');
  assert.equal(indexHtml.includes(readonlySessionPageIdsToken), false, 'index.html nao pode recriar READONLY_REPORT_SESSION_PAGE_IDS');
}

function assertModernSessionContext(readonlySessionTs) {
  assert.match(readonlySessionTs, /getReadonlyReportPageContract/);
  assert.match(
    readonlySessionTs,
    /getReadonlyReportPageContract\?\.\([\s\n]*readonlyReportPageContract,[\s\n]*\)/,
  );
  assert.match(readonlySessionTs, /\?\?\s*'reports'/);
  assert.equal(readonlySessionTs.includes('getReadonlyReportPageContract?.()'), false, 'Modern nao pode cair para chamada sem candidato');
  assert.equal(readonlySessionTs.includes(`globalThis.${readonlyContractToken}`), false, 'Modern nao pode depender do global');
  assert.equal(readonlySessionTs.includes(manualDeclareToken), false, 'Modern nao pode declarar contrato manual');
  assert.equal(readonlySessionTs.includes(legacyFallbackToken), false, 'Modern nao pode recriar fallback local');
  assert.equal(readonlySessionTs.includes(createFallbackToken), false, 'Modern nao pode recriar contrato local');
  assert.equal(readonlySessionTs.includes(resolveSafelyToken), false, 'Modern nao pode recriar resolvedor local');
  assert.equal(readonlySessionTs.includes(readCandidateToken), false, 'Modern nao pode ler candidato local');
  assert.equal(readonlySessionTs.includes(readExportsToken), false, 'Modern nao pode ler exports locais');
}

function assertShellIsolation(textByPath) {
  const forbidden = [
    contractFilename,
    readonlyContractToken,
    'getReadonlyReportPageContract',
    'readonlyReportSessionContext',
    `globalThis.${readonlyContractToken}`,
  ];

  for (const [filePath, text] of Object.entries(textByPath)) {
    for (const token of forbidden) {
      assert.equal(text.includes(token), false, `${filePath} nao pode importar ou citar ${token}`);
    }
  }
}

function assertReadOnlyReportsContract(contractTs) {
  assert.match(contractTs, /READ_ONLY_REPORTS_CONTRACT_VERSION/);
  assert.match(contractTs, /normalizeReadOnlyReportsSnapshot/);
  assert.match(contractTs, /isReadOnlyReportsSnapshot/);
  assert.match(contractTs, /READ_ONLY_REPORTS_FALLBACK_SNAPSHOT/);
  assert.match(contractTs, /ReadOnlyReportsSnapshot/);
  assert.match(contractTs, /version: READ_ONLY_REPORTS_CONTRACT_VERSION/);
  assert.match(contractTs, /generatedAt/);
  assert.match(contractTs, /notice/);
  assert.match(contractTs, /summary/);
  assert.match(contractTs, /items/);
  assert.equal(contractTs.includes('localStorage'), false);
  assert.equal(contractTs.includes('sessionStorage'), false);
  assert.equal(contractTs.includes('indexedDB'), false);
  assert.equal(contractTs.includes('firebase'), false);
  assert.equal(contractTs.includes('auth'), false);
  assert.equal(/\bsync\b/.test(contractTs), false);
  assert.equal(contractTs.includes('backup'), false);
  assert.equal(contractTs.includes('fetch('), false);
  assert.equal(contractTs.includes('setInterval'), false);
  assert.equal(contractTs.includes('setTimeout'), false);
  assert.equal(contractTs.includes('MutationObserver'), false);
}

function assertImportsReadOnlyReportsContract(text, label) {
  assert.match(text, /reportsReadonlyContract/);
  assert.equal(/function\s+normalizeReadOnlyReportsSnapshot/.test(text), false, `${label} nao pode recriar normalizeReadOnlyReportsSnapshot`);
  assert.equal(/function\s+isReadOnlyReportsSnapshot/.test(text), false, `${label} nao pode recriar isReadOnlyReportsSnapshot`);
  assert.equal(/const\s+READ_ONLY_REPORTS_CONTRACT_VERSION\s*=/.test(text), false, `${label} nao pode recriar READ_ONLY_REPORTS_CONTRACT_VERSION`);
}

function assertNoLocalReadOnlyReportsContract(text, label) {
  for (const token of [
    readonlyReportsContractVersionToken,
    normalizeReadonlyReportsSnapshotToken,
    isReadonlyReportsSnapshotToken,
    readonlyReportsContractToken,
  ]) {
    assert.equal(text.includes(token), false, `${label} nao pode recriar ${token}`);
  }
}

function assertHostHtmlOrder(hostHtml) {
  const contractScript = '<script src="../readonly-report-page-contract.js"></script>';
  const hostEntryScript = '<script type="module" src="/src/host-entry.tsx"></script>';

  assert.match(hostHtml, /readonly-report-page-contract\.js/);
  assert.match(hostHtml, /host-entry\.tsx/);
  assert.equal(hostHtml.indexOf(contractScript) > -1, true, 'Host precisa carregar contrato');
  assert.equal(hostHtml.indexOf(hostEntryScript) > -1, true, 'Host precisa carregar bootstrap');
  assert.equal(hostHtml.indexOf(contractScript) < hostHtml.indexOf(hostEntryScript), true, 'Contrato precisa vir antes do bootstrap');
  assert.equal(hostHtml.includes('type="module" src="../readonly-report-page-contract.js"'), false, 'Contrato precisa continuar classico');
  assert.equal((hostHtml.match(/readonly-report-page-contract\.js/g) || []).length, 1, 'Contrato nao pode duplicar no host');
}

function assertViteCopy(viteConfigTs) {
  assert.match(viteConfigTs, /copyReadonlyReportPageContract/);
  assert.match(viteConfigTs, /existsSync\(readonlyReportPageContractSource\)/);
  assert.match(viteConfigTs, /writeFileSync\(readonlyReportPageContractDist/);
}

function assertPackageScripts(packageJson) {
  assert.match(packageJson.scripts['test:modern'], /tests\/readonly-contract-architecture\.test\.js/);
  assert.match(packageJson.scripts['test:modern'], /tests\/readonly-reports-data-contract\.test\.js/);
  assert.match(packageJson.scripts.test, /node --test tests\/readonly-contract-architecture\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/readonly-reports-data-contract\.test\.js/);
  assert.equal(
    packageJson.scripts.test.includes('npm run test:modern'),
    false,
    'npm test nao deve depender da suite moderna completa',
  );
}

function assertDocsNoDuplicateList(docs) {
  const repeatedList = /IDs permitidos:[\s\S]*overview[\s\S]*assets[\s\S]*fixed-income[\s\S]*provents[\s\S]*contributions[\s\S]*reports[\s\S]*settings/;

  assert.match(docs, /Fase 183 - guardrails automaticos da arquitetura readonly/);
  assert.equal(repeatedList.test(docs), false, 'Docs nao podem repetir a lista completa readonly');
}

function assertModernDistIgnored() {
  const listed = execFileSync('git', ['ls-files', 'modern/dist'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(listed.trim(), '', 'modern/dist nao pode entrar no indice');
}

function loadArchitectureSnapshot() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  return {
    contractJs: read('readonly-report-page-contract.js'),
    indexHtml: read('index.html'),
    hostHtml: read('modern/host.html'),
    modernIndexHtml: read('modern/index.html'),
    mainTsx: read('modern/src/main.tsx'),
    hostEntryTsx: read('modern/src/host-entry.tsx'),
    hostTsx: read('modern/src/host.tsx'),
    mountModernAppTs: read('modern/src/bootstrap/mountModernApp.ts'),
    modernReportsRuntimeTs: read('modern/src/bootstrap/modernReportsRuntime.ts'),
    appTsx: read('modern/src/App.tsx'),
    assetsPreviewTsx: read('modern/src/features/reports/AssetsReportPreview.tsx'),
    dataContractTs: read('modern/src/features/reports/reportsReadonlyContract.ts'),
    bridgeTs: read('modern/src/features/reports/reportsReadonlyBridge.ts'),
    adapterTs: read('modern/src/features/reports/reportsSnapshotAdapter.ts'),
    integrationTs: read('modern/src/features/reports/legacyReportsReadonlyIntegration.ts'),
    navigationTs: read('modern/src/types/navigation.ts'),
    readonlySessionTs: read('modern/src/features/reports/readonlyReportSessionContext.ts'),
    viteConfigTs: read('modern/vite.config.ts'),
    docs: read('docs/legacy-assets-runtime-map.md'),
    packageJson,
  };
}

test('arquitetura readonly consolidada continua unica e guardrails entram no npm test', () => {
  const snapshot = loadArchitectureSnapshot();

  assertCanonicalContract(snapshot.contractJs);
  assertLegacyConsumerFallback(snapshot.indexHtml);
  assertModernSessionContext(snapshot.readonlySessionTs);
  assertHostHtmlOrder(snapshot.hostHtml);
  assertViteCopy(snapshot.viteConfigTs);
  assertPackageScripts(snapshot.packageJson);
  assertDocsNoDuplicateList(snapshot.docs);
  assertModernDistIgnored();
  assertShellIsolation({
    'modern/index.html': snapshot.modernIndexHtml,
    'modern/src/main.tsx': snapshot.mainTsx,
    'modern/src/App.tsx': snapshot.appTsx,
    'modern/src/bootstrap/mountModernApp.ts': snapshot.mountModernAppTs,
  });
  assertReadOnlyReportsContract(snapshot.dataContractTs);
  assertImportsReadOnlyReportsContract(
    snapshot.bridgeTs,
    'modern/src/features/reports/reportsReadonlyBridge.ts',
  );
  assertImportsReadOnlyReportsContract(
    snapshot.adapterTs,
    'modern/src/features/reports/reportsSnapshotAdapter.ts',
  );
  assertNoCompleteReadonlyPageList(snapshot.indexHtml, 'index.html');
  assertNoCompleteReadonlyPageList(snapshot.hostHtml, 'modern/host.html');
  assertNoCompleteReadonlyPageList(snapshot.modernIndexHtml, 'modern/index.html');
  assertNoCompleteReadonlyPageList(snapshot.mainTsx, 'modern/src/main.tsx');
  assertNoCompleteReadonlyPageList(snapshot.hostEntryTsx, 'modern/src/host-entry.tsx');
  assertNoCompleteReadonlyPageList(snapshot.hostTsx, 'modern/src/host.tsx');
  assertNoCompleteReadonlyPageList(snapshot.mountModernAppTs, 'modern/src/bootstrap/mountModernApp.ts');
  assertNoCompleteReadonlyPageList(snapshot.modernReportsRuntimeTs, 'modern/src/bootstrap/modernReportsRuntime.ts');
  assertNoCompleteReadonlyPageList(snapshot.appTsx, 'modern/src/App.tsx');
  assertNoCompleteReadonlyPageList(snapshot.assetsPreviewTsx, 'modern/src/features/reports/AssetsReportPreview.tsx');
  assertNoCompleteReadonlyPageList(snapshot.bridgeTs, 'modern/src/features/reports/reportsReadonlyBridge.ts');
  assertNoCompleteReadonlyPageList(snapshot.adapterTs, 'modern/src/features/reports/reportsSnapshotAdapter.ts');
  assertNoCompleteReadonlyPageList(snapshot.integrationTs, 'modern/src/features/reports/legacyReportsReadonlyIntegration.ts');
  assertNoCompleteReadonlyPageList(snapshot.readonlySessionTs, 'modern/src/features/reports/readonlyReportSessionContext.ts');

  assertNoLocalReadOnlyReportsContract(snapshot.indexHtml, 'index.html');
  assertNoLocalReadOnlyReportsContract(snapshot.hostHtml, 'modern/host.html');
  assertNoLocalReadOnlyReportsContract(snapshot.modernIndexHtml, 'modern/index.html');
  assertNoLocalReadOnlyReportsContract(snapshot.mainTsx, 'modern/src/main.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.hostEntryTsx, 'modern/src/host-entry.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.hostTsx, 'modern/src/host.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.mountModernAppTs, 'modern/src/bootstrap/mountModernApp.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.modernReportsRuntimeTs, 'modern/src/bootstrap/modernReportsRuntime.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.appTsx, 'modern/src/App.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.assetsPreviewTsx, 'modern/src/features/reports/AssetsReportPreview.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.integrationTs, 'modern/src/features/reports/legacyReportsReadonlyIntegration.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.readonlySessionTs, 'modern/src/features/reports/readonlyReportSessionContext.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.navigationTs, 'modern/src/types/navigation.ts');

  assertNoForbiddenTokens(snapshot.indexHtml, 'index.html');
  assertNoForbiddenTokens(snapshot.hostHtml, 'modern/host.html');
  assertNoForbiddenTokens(snapshot.modernIndexHtml, 'modern/index.html');
  assertNoForbiddenTokens(snapshot.mainTsx, 'modern/src/main.tsx');
  assertNoForbiddenTokens(snapshot.hostEntryTsx, 'modern/src/host-entry.tsx');
  assertNoForbiddenTokens(snapshot.hostTsx, 'modern/src/host.tsx');
  assertNoForbiddenTokens(snapshot.mountModernAppTs, 'modern/src/bootstrap/mountModernApp.ts');
  assertNoForbiddenTokens(snapshot.modernReportsRuntimeTs, 'modern/src/bootstrap/modernReportsRuntime.ts');
  assertNoForbiddenTokens(snapshot.appTsx, 'modern/src/App.tsx');
  assertNoForbiddenTokens(snapshot.assetsPreviewTsx, 'modern/src/features/reports/AssetsReportPreview.tsx');
  assertNoForbiddenTokens(snapshot.bridgeTs, 'modern/src/features/reports/reportsReadonlyBridge.ts');
  assertNoForbiddenTokens(snapshot.adapterTs, 'modern/src/features/reports/reportsSnapshotAdapter.ts');
  assertNoForbiddenTokens(snapshot.integrationTs, 'modern/src/features/reports/legacyReportsReadonlyIntegration.ts');
  assertNoForbiddenTokens(snapshot.navigationTs, 'modern/src/types/navigation.ts');
});

test('guardrail pega fallback local, lista duplicada, shell acoplado, candidato ausente e ordem errada', () => {
  assert.throws(() => assertLegacyConsumerFallback("function readonlyReportSessionPageIdFromLocation(){ return fallbackReadonlyReportPageContract(); }"));

  assert.throws(() =>
    assertShellIsolation({
      'modern/src/main.tsx': `import '${contractFilename}';`,
    }),
  );

  assert.throws(() =>
    assertModernSessionContext("const resolvedReadonlyReportPageContract=readonlyReportPageContract.getReadonlyReportPageContract?.();"),
  );

  assert.throws(() =>
    assertDocsNoDuplicateList(`IDs permitidos:\n- overview\n- assets\n- fixed-income\n- provents\n- contributions\n- reports\n- settings`),
  );

  const duplicateList = `
const allowedPages = [
  'overview',
  'assets',
  'fixed-income',
  'provents',
  'contributions',
  'reports',
  'settings',
];
`;

  assert.throws(() => assertNoCompleteReadonlyPageList(duplicateList, 'consumer ficticio'));

  assert.throws(() =>
    assertHostHtmlOrder(`<script type="module" src="/src/host-entry.tsx"></script>\n<script src="../readonly-report-page-contract.js" defer></script>`),
  );
});
