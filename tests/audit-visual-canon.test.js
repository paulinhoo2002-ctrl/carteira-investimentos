const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('fila de prioridades ordena findings oficiais sem alterar ordem interna', () => {
  const start = source.indexOf('function dataQualityPriorityIssues(');
  const end = source.indexOf('function renderDataQualityPriorityCard(', start);
  assert.ok(start >= 0 && end > start);
  const context = {
    dataQualitySeverityRank(value) {
      return value === 'critical' ? 3 : value === 'warning' ? 2 : value === 'info' ? 1 : 0;
    },
    Math,
    Number,
    Array,
  };
  vm.runInNewContext(source.slice(start, end), context);
  const issues = [
    { id: 'info-first', severity: 'info' },
    { id: 'warning', severity: 'warning' },
    { id: 'critical', severity: 'critical' },
    { id: 'info-second', severity: 'info' },
  ];
  assert.deepEqual(context.dataQualityPriorityIssues(issues, 4).map(issue => issue.id), [
    'critical', 'warning', 'info-first', 'info-second',
  ]);
});

test('Auditoria expõe fila prioritária e restante em disclosure visual', () => {
  assert.match(source, /O que merece atenção/);
  assert.match(source, /Ver todas as pendências/);
  assert.match(source, /remainingIssues\.map\(renderDataQualityIssueCard\)/);
  assert.match(source, /data-quality-priority-list/);
});

test('reconciliação RF preserva cinco contadores em composição própria', () => {
  assert.match(source, /data-quality-summary data-quality-rf-summary/);
  for (const label of ['Vinculados', 'Apenas eventos RF', 'Links quebrados', 'Possiveis duplicidades', 'Legacy sem vinculo']) {
    assert.match(source, new RegExp(label));
  }
});

test('ações da fila continuam usando resolvedor canônico e não criam escrita', () => {
  assert.match(source, /dataQualityPriorityIssues\(filtered,5\)/);
  assert.match(source, /dataQualityRunAction\(issue\)/);
  assert.match(source, /dataQualityResolveAction\(issue\)/);
  assert.match(source, /if\(action\.level===4\) return;/);
});

test('Auditoria identifica somente o destino atual, sem ativar Relatórios', () => {
  assert.match(source, /const parentActive=navTabActive\(items\[0\]\?\.\[0\]\) \|\|/);
  assert.match(source, /navTabActive\('auditoria'\) && items\.some/);
  assert.match(source, /<summary class="tab\$\{parentActive\?' on':''\}/);
});

test('filtros secundários permanecem disponíveis em disclosure progressivo', () => {
  assert.match(source, /function clearDataQualityFilters\(\)/);
  assert.match(source, /<details class="data-quality-more-filters">/);
  assert.match(source, /data-quality-more-filters-body/);
  assert.match(source, /activeFilterCount/);
});

test('fila prioritária reduz exposição mobile sem alterar os cinco findings', () => {
  assert.match(source, /priorityIssues\.slice\(0,3\)/);
  assert.match(source, /toggleDataQualityPriorities\(\)/);
  assert.match(source, /Ver mais \$\{hiddenPriorityCount\}/);
  assert.match(source, /const prioritySet=new Set\(priorityIssues\)/);
});
