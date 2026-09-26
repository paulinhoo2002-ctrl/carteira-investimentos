const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const aggregator = fs.readFileSync('portfolio-report-readiness.js', 'utf8');

test('V273 readiness is loaded before the report model and stays on the existing Reports route', () => {
  assert.ok(html.indexOf('<script src="portfolio-report-readiness.js"></script>') < html.indexOf('<script src="portfolio-report-model.js"></script>'));
  assert.match(html, /function reportsTab\(\)/);
  assert.match(html, /reports-v273-health/);
  assert.doesNotMatch(html, /go\(['"](?:saude-dos-dados|data-health)['"]\)/);
});

test('Reports adapters use canonical data trust and known import capability without direct storage access', () => {
  const start = html.indexOf('function v273ReportReadiness(');
  const end = html.indexOf('function v254FiscalPanel()', start);
  assert.ok(start >= 0 && end > start);
  const adapter = html.slice(start, end);
  assert.match(adapter, /PortfolioDataTrust/);
  assert.match(adapter, /ImportCenterCore\?\.capabilities/);
  assert.match(adapter, /quoteMarketTime/);
  assert.match(adapter, /sourceAsOf:sourceAsOfValues\.length===1\?sourceAsOfValues\[0\]:null/);
  assert.doesNotMatch(adapter, /localStorage|sessionStorage|fetch\s*\(|save\s*\(/);
});

test('readiness adapter resolves the canonical cash-flow classifier in its own scope', () => {
  const adapter = html.slice(html.indexOf('function v273ReportReadiness'), html.indexOf('function v273HealthEvidenceText'));
  assert.match(adapter, /const classifier\s*=\s*globalThis\.PortfolioCashFlowClassifier/);
  assert.match(adapter, /Boolean\(classifier&&Array\.isArray\(flowReadiness\.trustedExternalFlows\)\)/);
});

test('data-quality panel explains observed evidence without replacing missing values with zero', () => {
  assert.match(html, /function v273HealthEvidenceText\(label,item\)/);
  assert.match(html, /Cobertura: \$\{shown\(evidence\.coverage\)\} · Frescor:/);
  assert.match(html, /Data da fonte: \$\{shown\(evidence\.sourceAsOf\)\}/);
  assert.match(html, /Identidade da carteira: não comprovada/);
  assert.match(html, /IPCA\+ exato automático:.*não suportado/);
  assert.match(html, /flowReadinessAvailable\?flowReadiness\.trustedExternalFlows\.length:null/);
  assert.doesNotMatch(html, /v273HealthEvidenceText[\s\S]{0,1800}localStorage/);
});

test('readiness aggregator contains no storage, network, wall-clock or mutation dependencies', () => {
  assert.doesNotMatch(aggregator, /localStorage|sessionStorage|indexedDB|fetch\s*\(|Date\.now\s*\(|new Date\s*\(/);
  assert.doesNotMatch(aggregator, /\.setItem\s*\(|\.delete\s*\(|window\.|globalThis\./);
  assert.match(aggregator, /walletIdAvailable/);
  assert.match(aggregator, /PARTIAL_PRICE_COVERAGE/);
  assert.match(aggregator, /SOURCE_FRESHNESS_UNKNOWN/);
});
