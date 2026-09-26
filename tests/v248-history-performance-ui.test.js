const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');

test('V248 carrega o engine histórico puro na superfície legada', () => {
  assert.match(index, /<script src="historical-performance-engine\.js"><\/script>/);
  assert.match(index, /function v248HistoricalPerformanceSnapshot\(\)/);
});

test('Rentabilidade identifica métricas e cobertura sem prometer histórico falso', () => {
  for (const label of ['Histórico auditável', 'SIMPLE_RETURN', 'TWR', 'MWR/XIRR', 'PARTIAL_COVERAGE', '31/12', 'Sem retroagir preço atual']) {
    assert.match(index, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(index, /Benchmarks históricos só aparecem quando houver série alinhada/);
});

test('painel V248 não expõe confirmação ou realização financeira', () => {
  const panel = index.slice(index.indexOf('function v248HistoricalPerformancePanel'), index.indexOf('function rentabilidadeTab'));
  assert.doesNotMatch(panel, /Aplicar|Realizar|Confirmar importação|Promover/);
  assert.match(panel, /Somente fluxos externos explícitos/);
});

test('V272 painel separa capacidade do motor da prontidão real e sinaliza escopo ausente', () => {
  assert.match(index, /portfolio-cash-flow-classifier\.js/);
  assert.match(index, /portfolio-history-sufficiency\.js/);
  assert.match(index, /function v272CashFlowReadiness\(\)/);
  assert.match(index, /historyEngine\?\.assessSufficiency/);
  const panel = index.slice(index.indexOf('function v248HistoricalPerformancePanel'), index.indexOf('function rentabilidadeTab'));
  assert.match(panel, /ENGINE_AVAILABLE/);
  assert.match(panel, /DATA_READY/);
  assert.match(panel, /carteira/i);
  assert.match(panel, /ambígu/i);
  assert.match(index, /Prontidão de performance histórica/);
  assert.match(index, /UNKNOWN não é zero/);
});
