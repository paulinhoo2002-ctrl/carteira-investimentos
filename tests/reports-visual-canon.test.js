const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Relatórios preserva períodos oficiais e contexto analítico', () => {
  assert.match(source, /setReportsPeriod\('year'\)/);
  assert.match(source, /setReportsPeriod\('12m'\)/);
  assert.match(source, /setReportsPeriod\('all'\)/);
  assert.match(source, /Relatório analítico da carteira ativa/);
  assert.match(source, /Não é backup/);
});

test('CTA de Renda Fixa usa a rota canônica', () => {
  assert.match(source, /onclick="go\('renda-fixa'\);return false">Ver Renda Fixa/);
  assert.doesNotMatch(source, /onclick="go\('ativos'\);return false">Ver Renda Fixa/);
});

test('Relatórios mantém exportação analítica separada do backup', () => {
  assert.match(source, /function exportReportCSV\(type\)/);
  assert.match(source, /function exportReportJSON\(type\)/);
  assert.match(source, /function exportBackup\(\)/);
  assert.match(source, /purpose:'Relatório para consulta e exportação\. Não substitui o backup de restauração\.'/);
});

test('valores financeiros críticos de Relatórios não usam truncamento no refinamento mobile', () => {
  assert.match(source, /\.reports-premium-shell \.reports-kpi \.value/);
  assert.match(source, /\.reports-premium-shell \.reports-data-row strong/);
  assert.match(source, /white-space:normal;overflow-wrap:anywhere;line-height:1\.08/);
});
