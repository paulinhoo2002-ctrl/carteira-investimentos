const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function loadCompatibilityAliases() {
  const start = source.indexOf('function dataAuditSeverityLabel(severity){ return dataQualitySeverityLabel(severity); }');
  const end = source.indexOf('function rentBenchRate(name){', start);
  assert.ok(start >= 0, 'aliases dataAudit precisam existir');
  assert.ok(end > start, 'fim dos aliases dataAudit precisa existir');

  const context = {
    S: {},
    dataQualitySeverityLabel: (value) => `quality:${value}`,
    dataQualitySnapshot: () => ({ summary: { totalRecords: 1 }, issues: [], alerts: ['ok'] }),
    dataQualityTab: () => '<section data-quality>ok</section>',
    dataQualityRouteForEntity: () => 'auditoria',
    dataQualityActionLabel: () => 'Abrir',
    esc: (value) => String(value ?? ''),
    setDataQualitySeverity: (value) => `severity:${value}`,
    setDataQualityCategory: (value) => `category:${value}`,
    rerunDataQuality: () => 'rerun',
    renderDataQualityIssueCard: (value) => `card:${value}`,
  };
  context.window = context;
  vm.runInNewContext(source.slice(start, end), context, { timeout: 1000 });
  context.dataQualityTab = () => '<section data-quality>ok</section>';
  return context;
}

test('aliases dataAudit continuam disponiveis e delegam para Data Quality', () => {
  const runtime = loadCompatibilityAliases();

  for (const name of [
    'dataAuditSeverityLabel',
    'dataAuditAlerts',
    'dataAuditSnapshot',
    'setDataAuditSeverity',
    'setDataAuditArea',
    'rerunDataAudit',
    'renderAuditAlertCard',
    'dataAuditTab',
  ]) {
    assert.equal(typeof runtime[name], 'function', `${name} precisa continuar publico`);
  }

  assert.equal(runtime.dataAuditSeverityLabel('warning'), 'quality:warning');
  assert.deepEqual(runtime.dataAuditAlerts(), ['ok']);
  assert.deepEqual(runtime.dataAuditSnapshot(), { summary: { totalRecords: 1 }, issues: [], alerts: ['ok'] });
  assert.equal(runtime.setDataAuditSeverity('critical'), 'severity:critical');
  assert.equal(runtime.setDataAuditArea('Ativos'), 'category:Ativos');
  assert.equal(runtime.rerunDataAudit(), 'rerun');
  assert.match(runtime.renderAuditAlertCard({ severity: 'warning' }), /data-quality-issue/);
  assert.equal(runtime.dataAuditTab(), '<section data-quality>ok</section>');
});

test('relatorios continuam consumindo os nomes publicos dataAudit', () => {
  assert.match(source, /const audit=dataAuditSnapshot\(\)/);
  assert.match(source, /return dataAuditSnapshot\(\)\.alerts\.map/);
  assert.match(source, /if\(S\.tab==='auditoria'\) return dataAuditTab\(\)/);
});
