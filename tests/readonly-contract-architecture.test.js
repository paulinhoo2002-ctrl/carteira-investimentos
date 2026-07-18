const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { assertPhase202FutureSequence, assertPhase202RoadmapClosed } = require('./phase-202-assets-performance-overview.guard');

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
const readonlyReportsContractRuntimeFilename = 'reportsReadonlyContract.mjs';
const readonlyReportsContractTypesFilename = 'reportsReadonlyContract.d.ts';
const readonlyReportsBridgeRuntimeFilename = 'reportsReadonlyBridge.mjs';
const readonlyReportsBridgeTypesFilename = 'reportsReadonlyBridge.d.ts';
const readonlyReportsAdapterRuntimeFilename = 'reportsSnapshotAdapter.mjs';
const readonlyReportsAdapterTypesFilename = 'reportsSnapshotAdapter.d.ts';
const incomeReadonlyContractRuntimeFilename = 'incomeReadonlyContract.mjs';
const incomeReadonlyContractTypesFilename = 'incomeReadonlyContract.d.ts';
const incomeReadonlyBridgeRuntimeFilename = 'incomeReadonlyBridge.mjs';
const incomeReadonlyBridgeTypesFilename = 'incomeReadonlyBridge.d.ts';
const incomeReadonlyAdapterRuntimeFilename = 'incomeSnapshotAdapter.mjs';
const incomeReadonlyAdapterTypesFilename = 'incomeSnapshotAdapter.d.ts';
const incomeReadonlyPageFilename = 'IncomeReadonlyPage.tsx';
const incomeReadonlyViewModelFilename = 'readonlyIncomeViewModel.ts';
const incomeRefreshControllerFilename = 'incomeRefreshController.ts';
const modernNavigationRuntimeFilename = 'navigation.mjs';
const modernNavigationTypesFilename = 'navigation.d.ts';

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

function assertIncomeFilesUseReceivedValueOnly(text, label) {
  assert.equal(text.includes('grossValue'), false, `${label} nao pode conter grossValue`);
  assert.equal(text.includes('netValue'), false, `${label} nao pode conter netValue`);
  assert.match(text, /receivedValue/);
}

function assertNoCompleteReadonlyPageList(text, label) {
  assert.equal(
    containsAllReadonlyPageIds(text),
    false,
    `${label} nao pode conter a lista completa de IDs readonly`,
  );
}

function assertIncomeSnapshotBuilderUsesReceivedValueOnly(indexHtml) {
  const start = indexHtml.indexOf('getIncomeSnapshot(){');
  const end = indexHtml.indexOf('setTimeout(()=>{', start);
  const block = start >= 0 && end > start ? indexHtml.slice(start, end) : indexHtml;

  assert.equal(block.includes('grossValue: value'), false, 'getIncomeSnapshot nao pode duplicar grossValue');
  assert.equal(block.includes('netValue: value'), false, 'getIncomeSnapshot nao pode duplicar netValue');
  assert.match(block, /receivedValue: value/);
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

function assertTypeDeclarationsNoRuntime(text, label) {
  for (const token of ['module.exports', 'require(', 'Object.freeze(', 'deepFreeze(']) {
    assert.equal(text.includes(token), false, `${label} nao pode conter implementacao runtime: ${token}`);
  }

  assert.equal(/(?<!declare\s)function\s+[A-Za-z_]/.test(text), false, `${label} nao pode conter definicao runtime de funcao`);
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

function assertImportsReadOnlyReportsContract(text, label, requiredTokens = []) {
  for (const token of requiredTokens) {
    assert.match(text, new RegExp(token));
  }

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
  assert.match(packageJson.scripts['test:modern'], /tests\/modern-assets-readonly-page\.test\.js/);
  assert.match(packageJson.scripts['test:modern'], /tests\/modern-fixed-income-readonly-page\.test\.js/);
  assert.match(packageJson.scripts['test:modern'], /tests\/modern-income-readonly-page\.test\.js/);
  assert.match(packageJson.scripts['test:modern'], /tests\/modern-contributions-explainable-page\.test\.js/);
  assert.match(packageJson.scripts['test:modern'], /tests\/readonly-contract-architecture\.test\.js/);
  assert.match(packageJson.scripts['test:modern'], /tests\/readonly-reports-data-contract\.test\.js/);
  assert.match(packageJson.scripts.test, /node --test tests\/readonly-contract-architecture\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/readonly-reports-data-contract\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/dividends-visual-refinement\.test\.js/);
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

function extractRoadmapPhaseSection(roadmap, startMarker, endMarker) {
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);

  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);

  return roadmap.slice(start, end);
}

function assertRoadmapPhaseShas(roadmap) {
  assert.match(roadmap, /\| 186 \|[^|]*\| Concluida \| `#186` \| `6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f` \|/);
  assert.match(roadmap, /\| 187 \|[^|]*\| Concluida \| `#187` \| `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` \|/);
  assert.match(roadmap, /\| 188 \|[^|]*\| Concluida \| `#188` \| `2c6489fb190e215fd69074071aceba8cf2638e39` \|/);
  assert.match(roadmap, /\| 189 \|[^|]*\| Concluida \| `#189` \| `0372cc4e04d66f713474b8d0b41ef2750d380061` \|/);
  assert.match(roadmap, /\| 190 \|[^|]*\| Concluida \| `#190` \| `1e72ef28350f10835a8fd92cbdadcebdb969b8cf` \|/);
  assertPhase202RoadmapClosed(roadmap);

  const phase186 = extractRoadmapPhaseSection(roadmap, '### Fase 186', '### Fase 185');

  assert.match(phase186, /- SHA final na main: `6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f`;/);
  assert.match(phase186, /- rollback: `git revert 6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f`/);
  assert.equal(phase186.includes('0df41a41b9c6ba3d435044f60e69b3fa86cac27c'), false, 'Fase 186 nao pode citar SHA da Fase 187 como fechamento');
}

function assertRoadmapCurrentPhase198State(roadmap) {
  const currentState = extractRoadmapPhaseSection(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');

  assertPhase202RoadmapClosed(roadmap);
  assert.match(currentState, /- fase atual: 208;/);
  assert.match(currentState, /- nome: Qualidade dos dados;/);
  assert.match(currentState, /- branch atual: `feat\/phase-208-data-quality`;/);
  assert.match(currentState, /- SHA-base: `8c8f2c47a5fd07f4af80f952709dd1fc8866bf49`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: auditoria de qualidade dos dados;/);
  assert.match(currentState, /- alteracao funcional autorizada exclusivamente para a Fase 208;/);
  assert.match(currentState, /- PR `#205` merged e closed \(encerramento funcional da Fase 204A\);/);
  assert.match(currentState, /- PR `#207` merged e closed \(encerramento funcional da Fase 204B\);/);
  assert.match(currentState, /- modo de merge da Fase 204B: squash;/);
  assert.match(currentState, /- SHA final da Fase 204B: `06d921b78a9411a709726a8f4cad8725bcb56899`;/);
  assert.match(currentState, /- resultado: Historico mensal premium de dividendos concluido;/);
  assert.match(currentState, /- Fase 204A funcional e documentalmente concluida;/);
  assert.match(currentState, /- Fase 204B funcional e documentalmente encerrada;/);
  assert.match(currentState, /- PR `#209` merged e closed \(encerramento funcional da Fase 206\);/);
  assert.match(currentState, /- modo de merge da Fase 206: squash;/);
  assert.match(currentState, /- SHA final da Fase 206: `8225262a27bdfc4a58c526b2e7d8c113774f638b`;/);
  assert.match(currentState, /- resultado: acompanhamento de metas financeiras concluido;/);
  assert.match(currentState, /- Fases 204A, 204B e 206 funcional e documentalmente encerradas;/);

  assert.match(roadmap, /18\. 192 - refinamento visual e responsivo da aba Dividendos/);
  assert.match(roadmap, /## 14\. Fase 192 - refinamento visual e responsivo da aba Dividendos/);
  assert.match(roadmap, /- estado: Concluida;/);
  assert.match(roadmap, /- PR: `#192`;/);
  assert.match(roadmap, /- SHA final na main: `bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assert.match(roadmap, /- titulo: `feat: refina visual da aba dividendos`;/);
  assert.match(roadmap, /- modo: squash;/);
  assert.match(roadmap, /- rollback: `git revert bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assert.match(roadmap, /## 15\. Fase 194 - finalizacao objetiva da aba Dividendos/);
  assert.match(roadmap, /Estado final:/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 194 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#194`: merged e closed \(encerramento funcional da fase 194\);/);
  assert.match(roadmap, /- a fase 195 nao existe sem autorizacao explicita\./);
  assert.match(roadmap, /- nao existe Fase 191 funcional\./);
  assert.match(roadmap, /- a fase 190 permanece concluida;/);
  assert.match(roadmap, /- a PR #191 foi apenas o encerramento documental;/);
  assert.match(roadmap, /- a PR #193 foi apenas o encerramento documental da fase 192;/);
  assert.match(roadmap, /Fases 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(roadmap, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(roadmap.includes('Fase 191 -'), false, 'Roadmap nao pode criar fase 191 funcional');
  assert.equal(roadmap.includes('Fase 193 -'), false, 'Roadmap nao pode abrir Fase 193 funcional');
  assert.match(roadmap, /## 16\. Fase 196 - estabilizacao do teste basico da interface/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 196 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#196`: merged e closed \(encerramento funcional da fase 196\);/);
  assert.match(roadmap, /## 17\. Fase 198 - auditoria geral do sistema em producao/);
  assert.match(roadmap, /Estado final:/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 198 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#198`: merged e closed \(encerramento da auditoria\);/);
  assert.match(roadmap, /- resultado: apto com ressalvas;/);
  assert.match(roadmap, /- risco residual principal: responsividade em 768px;/);
  assert.match(roadmap, /## 18\. Fase 200 - refinamento confiavel da tela de Dividendos/);
  assert.match(roadmap, /## 11\. Sequencia planejada apos a Fase 202/);
  assertPhase202FutureSequence(roadmap);
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
    assetsReadonlyTsx: read('modern/src/features/reports/AssetsReadonlyPage.tsx'),
    readonlyViewModelTs: read('modern/src/features/reports/readonlyReportsViewModel.ts'),
    fixedIncomeReadonlyTsx: read('modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx'),
    fixedIncomeViewModelTs: read('modern/src/features/fixed-income/readonlyFixedIncomeViewModel.ts'),
    incomeReadonlyTsx: read('modern/src/features/income/IncomeReadonlyPage.tsx'),
    incomeViewModelTs: read('modern/src/features/income/readonlyIncomeViewModel.ts'),
    fixedIncomeContractJs: read('modern/src/features/fixed-income/fixedIncomeReadonlyContract.mjs'),
    fixedIncomeContractTypes: read('modern/src/features/fixed-income/fixedIncomeReadonlyContract.d.ts'),
    fixedIncomeBridgeJs: read('modern/src/features/fixed-income/fixedIncomeReadonlyBridge.mjs'),
    fixedIncomeBridgeTypes: read('modern/src/features/fixed-income/fixedIncomeReadonlyBridge.d.ts'),
    fixedIncomeAdapterJs: read('modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs'),
    fixedIncomeAdapterTypes: read('modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.d.ts'),
    fixedIncomeIntegrationTs: read('modern/src/features/fixed-income/legacyFixedIncomeReadonlyIntegration.ts'),
    fixedIncomeSourceTs: read('modern/src/bootstrap/hostFixedIncomeReadonlySource.ts'),
    fixedIncomeRuntimeTs: read('modern/src/bootstrap/modernFixedIncomeRuntime.ts'),
    incomeContractJs: read('modern/src/features/income/incomeReadonlyContract.mjs'),
    incomeContractTypes: read('modern/src/features/income/incomeReadonlyContract.d.ts'),
    incomeBridgeJs: read('modern/src/features/income/incomeReadonlyBridge.mjs'),
    incomeBridgeTypes: read('modern/src/features/income/incomeReadonlyBridge.d.ts'),
    incomeAdapterJs: read('modern/src/features/income/incomeSnapshotAdapter.mjs'),
    incomeAdapterTypes: read('modern/src/features/income/incomeSnapshotAdapter.d.ts'),
    incomeIntegrationTs: read('modern/src/features/income/legacyIncomeReadonlyIntegration.ts'),
    incomeSourceTs: read('modern/src/bootstrap/hostIncomeReadonlySource.ts'),
    incomeRuntimeTs: read('modern/src/bootstrap/modernIncomeRuntime.ts'),
    incomeRefreshControllerTs: read('modern/src/features/income/incomeRefreshController.ts'),
    contributionsReadonlyTsx: read('modern/src/features/contributions/ContributionsReadonlyPage.tsx'),
    contributionsViewModelTs: read('modern/src/features/contributions/readonlyContributionsViewModel.ts'),
    contributionsContractJs: read('modern/src/features/contributions/contributionsReadonlyContract.mjs'),
    contributionsIntegrationTs: read('modern/src/features/contributions/legacyContributionsReadonlyIntegration.ts'),
    contributionsSourceTs: read('modern/src/bootstrap/hostContributionsReadonlySource.ts'),
    contributionsRuntimeTs: read('modern/src/bootstrap/modernContributionsRuntime.ts'),
    dataContractJs: read('modern/src/features/reports/reportsReadonlyContract.mjs'),
    dataContractTypes: read('modern/src/features/reports/reportsReadonlyContract.d.ts'),
    bridgeJs: read('modern/src/features/reports/reportsReadonlyBridge.mjs'),
    bridgeTypes: read('modern/src/features/reports/reportsReadonlyBridge.d.ts'),
    adapterJs: read('modern/src/features/reports/reportsSnapshotAdapter.mjs'),
    adapterTypes: read('modern/src/features/reports/reportsSnapshotAdapter.d.ts'),
    integrationTs: read('modern/src/features/reports/legacyReportsReadonlyIntegration.ts'),
    navigationJs: read('modern/src/types/navigation.mjs'),
    navigationTypes: read('modern/src/types/navigation.d.ts'),
    readonlySessionTs: read('modern/src/features/reports/readonlyReportSessionContext.ts'),
    viteConfigTs: read('modern/vite.config.ts'),
    roadmap: read('docs/project-phases-roadmap.md'),
    modernArchitectureInventory: read('docs/modern-architecture-inventory.md'),
    modernArchitectureDecision: read('docs/adr/ADR-001-modernization-strategy.md'),
    modernizationDecisionMatrix: read('docs/modernization-decision-matrix.md'),
    docs: read('docs/legacy-assets-runtime-map.md'),
    packageJson,
  };
}

test('arquitetura readonly consolidada continua unica e guardrails entram no npm test', () => {
  const snapshot = loadArchitectureSnapshot();
  const reportsRoot = path.join(modernRoot, 'src', 'features', 'reports');
  const typesRoot = path.join(modernRoot, 'src', 'types');

  for (const file of [
    readonlyReportsContractRuntimeFilename,
    readonlyReportsBridgeRuntimeFilename,
    readonlyReportsAdapterRuntimeFilename,
  ]) {
    assert.equal(fs.existsSync(path.join(reportsRoot, file)), true, `${file} precisa existir como runtime canonico`);
  }

  for (const file of [
    readonlyReportsContractTypesFilename,
    readonlyReportsBridgeTypesFilename,
    readonlyReportsAdapterTypesFilename,
  ]) {
    assert.equal(fs.existsSync(path.join(reportsRoot, file)), true, `${file} precisa existir como tipagem`);
  }

  for (const file of [
    incomeReadonlyContractRuntimeFilename,
    incomeReadonlyBridgeRuntimeFilename,
    incomeReadonlyAdapterRuntimeFilename,
  ]) {
    assert.equal(fs.existsSync(path.join(modernRoot, 'src', 'features', 'income', file)), true, `${file} precisa existir como runtime canonico`);
  }

  for (const file of [
    incomeReadonlyContractTypesFilename,
    incomeReadonlyBridgeTypesFilename,
    incomeReadonlyAdapterTypesFilename,
  ]) {
    assert.equal(fs.existsSync(path.join(modernRoot, 'src', 'features', 'income', file)), true, `${file} precisa existir como tipagem`);
  }

  assert.equal(fs.existsSync(path.join(modernRoot, 'src', 'features', 'income', incomeReadonlyPageFilename)), true, `${incomeReadonlyPageFilename} precisa existir`);
  assert.equal(fs.existsSync(path.join(modernRoot, 'src', 'features', 'income', incomeReadonlyViewModelFilename)), true, `${incomeReadonlyViewModelFilename} precisa existir`);
  assert.equal(fs.existsSync(path.join(modernRoot, 'src', 'features', 'income', incomeRefreshControllerFilename)), true, `${incomeRefreshControllerFilename} precisa existir`);

  assert.equal(fs.existsSync(path.join(typesRoot, modernNavigationRuntimeFilename)), true, 'navigation.mjs precisa existir como runtime canonico');
  assert.equal(fs.existsSync(path.join(typesRoot, modernNavigationTypesFilename)), true, 'navigation.d.ts precisa existir como tipagem');

  assertCanonicalContract(snapshot.contractJs);
  assertLegacyConsumerFallback(snapshot.indexHtml);
  assertModernSessionContext(snapshot.readonlySessionTs);
  assertHostHtmlOrder(snapshot.hostHtml);
  assertViteCopy(snapshot.viteConfigTs);
  assertPackageScripts(snapshot.packageJson);
  assertDocsNoDuplicateList(snapshot.docs);
  assertRoadmapPhaseShas(snapshot.roadmap);
  assertRoadmapCurrentPhase198State(snapshot.roadmap);
  assertModernDistIgnored();
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'modern-architecture-inventory.md')), true, 'Inventario arquitetural precisa existir');
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'adr', 'ADR-001-modernization-strategy.md')), true, 'ADR da estrategia precisa existir');
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'modernization-decision-matrix.md')), true, 'Matriz de decisao precisa existir');
  assertShellIsolation({
    'modern/index.html': snapshot.modernIndexHtml,
    'modern/src/main.tsx': snapshot.mainTsx,
    'modern/src/App.tsx': snapshot.appTsx,
    'modern/src/bootstrap/mountModernApp.ts': snapshot.mountModernAppTs,
    'modern/src/features/reports/AssetsReadonlyPage.tsx': snapshot.assetsReadonlyTsx,
    'modern/src/features/reports/readonlyReportsViewModel.ts': snapshot.readonlyViewModelTs,
    'modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx': snapshot.fixedIncomeReadonlyTsx,
    'modern/src/features/fixed-income/readonlyFixedIncomeViewModel.ts': snapshot.fixedIncomeViewModelTs,
    'modern/src/features/income/IncomeReadonlyPage.tsx': snapshot.incomeReadonlyTsx,
    'modern/src/features/income/readonlyIncomeViewModel.ts': snapshot.incomeViewModelTs,
  });
  assertReadOnlyReportsContract(snapshot.dataContractJs);
  assertImportsReadOnlyReportsContract(
    snapshot.bridgeJs,
    'modern/src/features/reports/reportsReadonlyBridge.mjs',
    ['reportsReadonlyContract'],
  );
  assertImportsReadOnlyReportsContract(
    snapshot.adapterJs,
    'modern/src/features/reports/reportsSnapshotAdapter.mjs',
    ['reportsReadonlyBridge'],
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
  assertNoCompleteReadonlyPageList(snapshot.assetsReadonlyTsx, 'modern/src/features/reports/AssetsReadonlyPage.tsx');
  assertNoCompleteReadonlyPageList(snapshot.readonlyViewModelTs, 'modern/src/features/reports/readonlyReportsViewModel.ts');
  assertNoCompleteReadonlyPageList(snapshot.incomeReadonlyTsx, 'modern/src/features/income/IncomeReadonlyPage.tsx');
  assertNoCompleteReadonlyPageList(snapshot.incomeViewModelTs, 'modern/src/features/income/readonlyIncomeViewModel.ts');
  assertNoCompleteReadonlyPageList(snapshot.incomeContractJs, 'modern/src/features/income/incomeReadonlyContract.mjs');
  assertNoCompleteReadonlyPageList(snapshot.incomeBridgeJs, 'modern/src/features/income/incomeReadonlyBridge.mjs');
  assertNoCompleteReadonlyPageList(snapshot.incomeAdapterJs, 'modern/src/features/income/incomeSnapshotAdapter.mjs');
  assertNoCompleteReadonlyPageList(snapshot.incomeIntegrationTs, 'modern/src/features/income/legacyIncomeReadonlyIntegration.ts');
  assertNoCompleteReadonlyPageList(snapshot.incomeSourceTs, 'modern/src/bootstrap/hostIncomeReadonlySource.ts');
  assertNoCompleteReadonlyPageList(snapshot.incomeRuntimeTs, 'modern/src/bootstrap/modernIncomeRuntime.ts');
  assertNoCompleteReadonlyPageList(snapshot.incomeRefreshControllerTs, 'modern/src/features/income/incomeRefreshController.ts');
  assertNoCompleteReadonlyPageList(snapshot.contributionsReadonlyTsx, 'modern/src/features/contributions/ContributionsReadonlyPage.tsx');
  assertNoCompleteReadonlyPageList(snapshot.contributionsViewModelTs, 'modern/src/features/contributions/readonlyContributionsViewModel.ts');
  assertNoCompleteReadonlyPageList(snapshot.contributionsContractJs, 'modern/src/features/contributions/contributionsReadonlyContract.mjs');
  assertNoCompleteReadonlyPageList(snapshot.contributionsIntegrationTs, 'modern/src/features/contributions/legacyContributionsReadonlyIntegration.ts');
  assertNoCompleteReadonlyPageList(snapshot.contributionsSourceTs, 'modern/src/bootstrap/hostContributionsReadonlySource.ts');
  assertNoCompleteReadonlyPageList(snapshot.contributionsRuntimeTs, 'modern/src/bootstrap/modernContributionsRuntime.ts');
  assertNoCompleteReadonlyPageList(snapshot.bridgeJs, 'modern/src/features/reports/reportsReadonlyBridge.mjs');
  assertNoCompleteReadonlyPageList(snapshot.adapterJs, 'modern/src/features/reports/reportsSnapshotAdapter.mjs');
  assertNoCompleteReadonlyPageList(snapshot.integrationTs, 'modern/src/features/reports/legacyReportsReadonlyIntegration.ts');
  assertNoCompleteReadonlyPageList(snapshot.readonlySessionTs, 'modern/src/features/reports/readonlyReportSessionContext.ts');

  assertIncomeSnapshotBuilderUsesReceivedValueOnly(snapshot.indexHtml);

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
  assertNoLocalReadOnlyReportsContract(snapshot.assetsReadonlyTsx, 'modern/src/features/reports/AssetsReadonlyPage.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.readonlyViewModelTs, 'modern/src/features/reports/readonlyReportsViewModel.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeReadonlyTsx, 'modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeViewModelTs, 'modern/src/features/fixed-income/readonlyFixedIncomeViewModel.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeContractJs, 'modern/src/features/fixed-income/fixedIncomeReadonlyContract.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeBridgeJs, 'modern/src/features/fixed-income/fixedIncomeReadonlyBridge.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeAdapterJs, 'modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeIntegrationTs, 'modern/src/features/fixed-income/legacyFixedIncomeReadonlyIntegration.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeSourceTs, 'modern/src/bootstrap/hostFixedIncomeReadonlySource.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.fixedIncomeRuntimeTs, 'modern/src/bootstrap/modernFixedIncomeRuntime.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeReadonlyTsx, 'modern/src/features/income/IncomeReadonlyPage.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeViewModelTs, 'modern/src/features/income/readonlyIncomeViewModel.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeContractJs, 'modern/src/features/income/incomeReadonlyContract.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeBridgeJs, 'modern/src/features/income/incomeReadonlyBridge.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeAdapterJs, 'modern/src/features/income/incomeSnapshotAdapter.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeIntegrationTs, 'modern/src/features/income/legacyIncomeReadonlyIntegration.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeSourceTs, 'modern/src/bootstrap/hostIncomeReadonlySource.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeRuntimeTs, 'modern/src/bootstrap/modernIncomeRuntime.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.incomeRefreshControllerTs, 'modern/src/features/income/incomeRefreshController.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.contributionsReadonlyTsx, 'modern/src/features/contributions/ContributionsReadonlyPage.tsx');
  assertNoLocalReadOnlyReportsContract(snapshot.contributionsViewModelTs, 'modern/src/features/contributions/readonlyContributionsViewModel.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.contributionsContractJs, 'modern/src/features/contributions/contributionsReadonlyContract.mjs');
  assertNoLocalReadOnlyReportsContract(snapshot.contributionsIntegrationTs, 'modern/src/features/contributions/legacyContributionsReadonlyIntegration.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.contributionsSourceTs, 'modern/src/bootstrap/hostContributionsReadonlySource.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.contributionsRuntimeTs, 'modern/src/bootstrap/modernContributionsRuntime.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.integrationTs, 'modern/src/features/reports/legacyReportsReadonlyIntegration.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.readonlySessionTs, 'modern/src/features/reports/readonlyReportSessionContext.ts');
  assertNoLocalReadOnlyReportsContract(snapshot.navigationJs, 'modern/src/types/navigation.mjs');

  assertIncomeFilesUseReceivedValueOnly(snapshot.incomeReadonlyTsx, 'modern/src/features/income/IncomeReadonlyPage.tsx');
  assertIncomeFilesUseReceivedValueOnly(snapshot.incomeViewModelTs, 'modern/src/features/income/readonlyIncomeViewModel.ts');
  assertIncomeFilesUseReceivedValueOnly(snapshot.incomeContractJs, 'modern/src/features/income/incomeReadonlyContract.mjs');
  assertIncomeFilesUseReceivedValueOnly(snapshot.incomeIntegrationTs, 'modern/src/features/income/legacyIncomeReadonlyIntegration.ts');

  assertTypeDeclarationsNoRuntime(snapshot.dataContractTypes, 'modern/src/features/reports/reportsReadonlyContract.d.ts');
  assertTypeDeclarationsNoRuntime(snapshot.bridgeTypes, 'modern/src/features/reports/reportsReadonlyBridge.d.ts');
  assertTypeDeclarationsNoRuntime(snapshot.adapterTypes, 'modern/src/features/reports/reportsSnapshotAdapter.d.ts');
  assertTypeDeclarationsNoRuntime(snapshot.navigationTypes, 'modern/src/types/navigation.d.ts');
  assertTypeDeclarationsNoRuntime(snapshot.fixedIncomeContractTypes, 'modern/src/features/fixed-income/fixedIncomeReadonlyContract.d.ts');
  assertTypeDeclarationsNoRuntime(snapshot.fixedIncomeBridgeTypes, 'modern/src/features/fixed-income/fixedIncomeReadonlyBridge.d.ts');
  assertTypeDeclarationsNoRuntime(snapshot.fixedIncomeAdapterTypes, 'modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.d.ts');

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
  assertNoForbiddenTokens(snapshot.assetsReadonlyTsx, 'modern/src/features/reports/AssetsReadonlyPage.tsx');
  assertNoForbiddenTokens(snapshot.readonlyViewModelTs, 'modern/src/features/reports/readonlyReportsViewModel.ts');
  assertNoForbiddenTokens(snapshot.fixedIncomeReadonlyTsx, 'modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
  assertNoForbiddenTokens(snapshot.fixedIncomeViewModelTs, 'modern/src/features/fixed-income/readonlyFixedIncomeViewModel.ts');
  assertNoForbiddenTokens(snapshot.fixedIncomeContractJs, 'modern/src/features/fixed-income/fixedIncomeReadonlyContract.mjs');
  assertNoForbiddenTokens(snapshot.fixedIncomeBridgeJs, 'modern/src/features/fixed-income/fixedIncomeReadonlyBridge.mjs');
  assertNoForbiddenTokens(snapshot.fixedIncomeAdapterJs, 'modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs');
  assertNoForbiddenTokens(snapshot.fixedIncomeIntegrationTs, 'modern/src/features/fixed-income/legacyFixedIncomeReadonlyIntegration.ts');
  assertNoForbiddenTokens(snapshot.fixedIncomeSourceTs, 'modern/src/bootstrap/hostFixedIncomeReadonlySource.ts');
  assertNoForbiddenTokens(snapshot.fixedIncomeRuntimeTs, 'modern/src/bootstrap/modernFixedIncomeRuntime.ts');
  assertNoForbiddenTokens(snapshot.incomeReadonlyTsx, 'modern/src/features/income/IncomeReadonlyPage.tsx');
  assertNoForbiddenTokens(snapshot.incomeViewModelTs, 'modern/src/features/income/readonlyIncomeViewModel.ts');
  assertNoForbiddenTokens(snapshot.incomeContractJs, 'modern/src/features/income/incomeReadonlyContract.mjs');
  assertNoForbiddenTokens(snapshot.incomeBridgeJs, 'modern/src/features/income/incomeReadonlyBridge.mjs');
  assertNoForbiddenTokens(snapshot.incomeAdapterJs, 'modern/src/features/income/incomeSnapshotAdapter.mjs');
  assertNoForbiddenTokens(snapshot.incomeIntegrationTs, 'modern/src/features/income/legacyIncomeReadonlyIntegration.ts');
  assertNoForbiddenTokens(snapshot.incomeSourceTs, 'modern/src/bootstrap/hostIncomeReadonlySource.ts');
  assertNoForbiddenTokens(snapshot.incomeRuntimeTs, 'modern/src/bootstrap/modernIncomeRuntime.ts');
  assertNoForbiddenTokens(snapshot.incomeRefreshControllerTs, 'modern/src/features/income/incomeRefreshController.ts');
  assertNoForbiddenTokens(snapshot.contributionsReadonlyTsx, 'modern/src/features/contributions/ContributionsReadonlyPage.tsx');
  assertNoForbiddenTokens(snapshot.contributionsViewModelTs, 'modern/src/features/contributions/readonlyContributionsViewModel.ts');
  assertNoForbiddenTokens(snapshot.contributionsContractJs, 'modern/src/features/contributions/contributionsReadonlyContract.mjs');
  assertNoForbiddenTokens(snapshot.contributionsIntegrationTs, 'modern/src/features/contributions/legacyContributionsReadonlyIntegration.ts');
  assertNoForbiddenTokens(snapshot.contributionsSourceTs, 'modern/src/bootstrap/hostContributionsReadonlySource.ts');
  assertNoForbiddenTokens(snapshot.contributionsRuntimeTs, 'modern/src/bootstrap/modernContributionsRuntime.ts');
  assertNoForbiddenTokens(snapshot.bridgeJs, 'modern/src/features/reports/reportsReadonlyBridge.mjs');
  assertNoForbiddenTokens(snapshot.adapterJs, 'modern/src/features/reports/reportsSnapshotAdapter.mjs');
  assertNoForbiddenTokens(snapshot.integrationTs, 'modern/src/features/reports/legacyReportsReadonlyIntegration.ts');
  assertNoForbiddenTokens(snapshot.navigationJs, 'modern/src/types/navigation.mjs');

  assert.equal(snapshot.indexHtml.includes('score: Number(row?.score) || 0'), false, 'index.html nao pode tratar score ausente como zero');
  assert.match(snapshot.contributionsContractJs, /isNullableNumber\(value\.score\)/);
  assert.equal(snapshot.contributionsReadonlyTsx.includes('candidate.score.toFixed(1)'), false, 'contributions page nao pode exigir score numerico');
  assert.match(snapshot.contributionsReadonlyTsx, /O legado nao forneceu uma justificativa detalhada\./);

  assert.equal(fs.existsSync(path.join(modernRoot, 'src/features/reports/reportsReadonlyContract.ts')), false, 'reportsReadonlyContract.ts nao pode permanecer');
  assert.equal(fs.existsSync(path.join(modernRoot, 'src/features/reports/reportsReadonlyBridge.ts')), false, 'reportsReadonlyBridge.ts nao pode permanecer');
  assert.equal(fs.existsSync(path.join(modernRoot, 'src/features/reports/reportsSnapshotAdapter.ts')), false, 'reportsSnapshotAdapter.ts nao pode permanecer');
  assert.equal(fs.existsSync(path.join(modernRoot, 'src/types/navigation.ts')), false, 'navigation.ts nao pode permanecer');
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
