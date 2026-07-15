const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const docPath = path.join(repoRoot, 'docs', 'legacy-assets-runtime-map.md');
const indexHtmlPath = path.join(repoRoot, 'index.html');
const financeCorePath = path.join(repoRoot, 'finance-core.js');
const reportAssetRowPath = path.join(repoRoot, 'report-asset-row.js');
const legacyReportsSourcePath = path.join(repoRoot, 'legacy', 'reports-readonly-source.js');
const readonlyPageContractPath = path.join(repoRoot, 'readonly-report-page-contract.js');
const modernBaseTestPath = path.join(repoRoot, 'tests', 'modern-base.test.js');
const modernHostSourceTestPath = path.join(repoRoot, 'tests', 'modern-host-source.test.js');
const modernHostTestPath = path.join(repoRoot, 'tests', 'modern-host.test.js');
const legacyContractFallbackToken = ['fallback', 'ReadonlyReportPageContract'].join('');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

test('documentacao referencia arquivos e funcoes reais', () => {
  const doc = read(docPath);

  [
    'index.html',
    'finance-core.js',
    'persistence-core.js',
    'report-asset-row.js',
    'legacy/reports-readonly-source.js',
    'readonly-report-page-contract.js',
    'reportsReadonlyContract.mjs',
    'reportAssetRows()',
    'buildReportAssetRow()',
    'assetAppliedValue()',
    'assetCurrentValue()',
    'metaTicker()',
    'normalizeType()',
    'Plano para a Fase 174',
    'Fase 178 - navegacao controlada para o relatorio readonly real',
    'Fase 179 - contexto visual de sessao no relatorio readonly',
    'Fase 180 - contrato unico das paginas readonly seguras',
    'Fase 185 - contrato tipado e versionado dos dados de relatorio readonly',
    'readonlyReportPage',
    'getReadonlyReportPageContract',
    'READONLY_REPORT_PAGE_IDS',
    'DEFAULT_READONLY_REPORT_PAGE_ID',
    'normalizeReadonlyReportPageId',
    'isReadonlyReportPageId',
    'READ_ONLY_REPORTS_CONTRACT_VERSION',
    'normalizeReadOnlyReportsSnapshot',
    'ReadOnlyReportsSnapshot',
  ].forEach((token) => {
    assert.ok(doc.includes(token), `Documento deve citar ${token}`);
  });
});

test('estrutura canonica e ordem de scripts continuam no index legado', () => {
  const indexHtml = read(indexHtmlPath);
  const readonlyReportPageContract = read(readonlyPageContractPath);

  assert.match(indexHtml, /<script src="finance-core\.js"><\/script>/);
  assert.match(indexHtml, /<script src="persistence-core\.js"><\/script>\s*<script src="report-asset-row\.js"><\/script>/);
  assert.match(indexHtml, /<script src="readonly-report-page-contract\.js"><\/script>/);
  assert.match(indexHtml, /function syncStateFromWallet\(w\)\{/);
  assert.match(indexHtml, /function syncWalletFromState\(\)\{/);
  assert.match(indexHtml, /function save\(\)\{/);
  assert.match(indexHtml, /function load\(\)\{/);
  assert.match(indexHtml, /function reportAssetRows\(\)\{/);
  assert.match(indexHtml, /return \(S\.assets\|\|\[\]\)\.map\(asset=>buildReportAssetRow\(asset,\{/);
  assert.match(indexHtml, /assetAppliedValue,\s*assetCurrentValue,\s*metaTicker,\s*normalizeType/);
  assert.match(indexHtml, /getReadonlyReportPageContract/);
  assert.equal(indexHtml.includes('ReadonlyReportPageContract.normalizeReadonlyReportPageId'), false);
  assert.equal(indexHtml.includes('ReadonlyReportPageContract.DEFAULT_READONLY_REPORT_PAGE_ID'), false);
  assert.equal(indexHtml.includes(legacyContractFallbackToken), false);
  assert.equal(indexHtml.includes(['readonlyReportPageContract', 'FromGlobal'].join('')), false);
  assert.equal(indexHtml.includes('READONLY_REPORT_SESSION_PAGE_IDS=new Set'), false);
  assert.equal(indexHtml.includes('normalizeReadonlyReportSessionPageId'), false);
  assert.match(indexHtml, /window\.FinanceCore\.configure\(\{ isRendaFixaAsset, rfValues \}\);/);
  assert.match(readonlyReportPageContract, /READONLY_REPORT_PAGE_IDS/);
  assert.match(readonlyReportPageContract, /DEFAULT_READONLY_REPORT_PAGE_ID/);
  assert.match(readonlyReportPageContract, /isReadonlyReportPageId/);
  assert.match(readonlyReportPageContract, /normalizeReadonlyReportPageId/);
  assert.match(readonlyReportPageContract, /getReadonlyReportPageContract/);
});

test('funcoes financeiras canonicas permanecem disponiveis', () => {
  const financeCore = read(financeCorePath);

  [
    'function configure(nextDeps={})',
    'function assetAppliedValue(a)',
    'function assetCurrentValue(a)',
    'function assetJurosValue(a)',
    'function assetRentabPct(a)',
  ].forEach((token) => {
    assert.ok(financeCore.includes(token), `finance-core deve conter ${token}`);
  });
});

test('buildReportAssetRow continua como unica implementacao financeira da linha', () => {
  const reportAssetRow = read(reportAssetRowPath);
  const legacyReportsSource = read(legacyReportsSourcePath);

  assert.equal(countMatches(reportAssetRow, /function buildReportAssetRow\(asset, deps\)/g), 1);
  assert.equal(countMatches(legacyReportsSource, /function buildReportAssetRow\s*\(/g), 0);
  assert.match(legacyReportsSource, /resolveBuildReportAssetRow\(deps\)/);
});

test('testes modernos existentes continuam cobrindo o isolamento do runtime', () => {
  const modernBaseTest = read(modernBaseTestPath);
  const modernHostSourceTest = read(modernHostSourceTestPath);
  const modernHostTest = read(modernHostTestPath);

  assert.match(modernBaseTest, /buildReportAssetRow/);
  assert.match(modernHostSourceTest, /globalThis/);
  assert.match(modernHostTest, /reportsRefreshController/);
});
