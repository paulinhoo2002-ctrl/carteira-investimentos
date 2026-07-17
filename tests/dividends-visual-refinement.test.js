const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

test('aba dividendos preserva ordem visual confiavel', () => {
  const indexHtml = read('index.html');
  const roadmap = read('docs/project-phases-roadmap.md');
  const phase200Doc = read('docs/phase-200-dividends-trustworthy-overview.md');

  assert.match(indexHtml, /function dividendMonthlyTimeline\(\)/);
  assert.match(indexHtml, /passiveIncomeGoalStats\(\)/);
  assert.match(indexHtml, /div-timeline-summary-title/);
  assert.match(indexHtml, /div-timeline-card\.current/);
  assert.match(indexHtml, /div-monthly-table-block/);
  assert.match(indexHtml, /div-monthly-scroll-note/);

  const overviewStart = indexHtml.indexOf('const overviewBody=');
  const bodyStart = indexHtml.indexOf('const body=', overviewStart);
  const overviewBlock = overviewStart >= 0 && bodyStart > overviewStart
    ? indexHtml.slice(overviewStart, bodyStart)
    : indexHtml;

  assert.match(overviewBlock, /\$\{dividendSummaryCards\(\)\}\s*\$\{monthlySection\}/s);
  assert.equal(overviewBlock.includes('${dividendOverviewRecentPanel(rows)}'), false);
  assert.equal(overviewBlock.includes('Histórico recente'), false);
  assert.equal(overviewBlock.includes('Meta de renda passiva'), false);
  assert.equal(overviewBlock.includes('${dividendGoalProgress()}'), false);
  assert.equal(overviewBlock.includes("${mode==='overview'?dividendGoalProgress():''}"), false);

  assert.match(indexHtml, /@media\(max-width:768px\)\{/);
  assert.match(indexHtml, /div-premium-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(indexHtml, /div-timeline\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(indexHtml, /aria-label="Tabela de hist.*rico mensal com rolagem horizontal"/);

  const currentState = section(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  assert.match(currentState, /- fase atual: 200;/);
  assert.match(currentState, /- nome: Refinamento confiavel da tela de Dividendos;/);
  assert.match(currentState, /- branch atual: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(currentState, /- SHA-base: `8951891a0ffa15edade8867a3e7078ac63c09b73`;/);
  assert.match(currentState, /- situacao: em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: refinamento confiavel da tela de Dividendos;/);
  assert.match(currentState, /- risco residual principal: responsividade em 768px;/);
  assert.match(currentState, /- nenhuma Fase 199 funcional;/);

  assert.match(roadmap, /## 18\. Fase 200 - refinamento confiavel da tela de Dividendos/);
  assert.match(roadmap, /## 11\. Sequencia planejada apos a Fase 200/);
  assert.match(roadmap, /- a Fase 200 e a fase atual; a sequencia futura comeca em 202\./);

  const phase200Start = roadmap.indexOf('## 18. Fase 200 - refinamento confiavel da tela de Dividendos');
  assert.equal(phase200Start >= 0, true, 'Secao da Fase 200 precisa existir');
  const phase200 = roadmap.slice(phase200Start);
  assert.match(phase200, /Objetivo:/);
  assert.match(phase200, /- revisar a composicao de "Recebido no mes" com dados oficiais, sem novo calculo financeiro;/);
  assert.match(phase200, /- remover "Historico recente" da visao geral;/);
  assert.match(phase200, /- manter "Historico mensal" como primeira secao principal da pagina;/);
  assert.match(phase200, /- corrigir o comportamento em 768px sem mexer em schema, dependencias ou fontes de verdade;/);
  assert.match(phase200, /- preservar edicao, exclusao, filtros, historico e acessibilidade\./);
  assert.match(phase200, /- branch atual: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(phase200, /- SHA-base: `8951891a0ffa15edade8867a3e7078ac63c09b73`;/);
  assert.match(phase200, /- situacao: em desenvolvimento;/);
  assert.match(phase200, /- PR atual: pendente;/);
  assert.match(phase200, /- head de revisao: consultavel na futura PR;/);
  assert.match(phase200, /- SHA final na main: pendente de merge;/);
  assert.match(phase200, /- validacao visual em desktop, tablet e mobile sem overflow horizontal global;/);
  assert.match(phase200Doc, /- "Recebido no mes" fica claro e auditavel;/);
  assert.match(phase200Doc, /- "Historico recente" sai da visao geral;/);
  assert.match(phase200Doc, /- "Historico mensal" fica logo abaixo dos cards de resumo;/);
  assert.match(phase200, /- `Recebido no mes` claramente explicado e sem ambiguidade de composicao;/);
  assert.match(phase200, /- `Historico mensal` em destaque na visao geral;/);
  assert.match(phase200, /- `Historico recente` fora da visao geral;/);
  assert.match(phase200, /- nenhum dado funcional removido\./);
});
