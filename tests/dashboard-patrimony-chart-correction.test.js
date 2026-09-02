const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('function dashboardEvolutionPanel(data){');
const end = source.indexOf('\nfunction dashboardIncomePanel(data){', start);
const panel = source.slice(start, end);

test('evolucao patrimonial nao apresenta aportes como patrimonio historico', () => {
  assert.ok(start >= 0 && end > start, 'painel patrimonial precisa existir');
  assert.match(panel, /histórico patrimonial ainda não disponível/i);
  assert.match(panel, /Patrimônio consolidado/);
  assert.doesNotMatch(panel, /Aportes líquidos acumulados/);
  assert.doesNotMatch(panel, /lineChart\(/);
  assert.doesNotMatch(panel, /fmtP\(/);
});
