const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertPhase202FutureSequence, assertPhase202RoadmapClosed } = require('./phase-202-assets-performance-overview.guard');

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
  const currentStateStart = roadmap.indexOf('## Estado e governanca');
  const currentStateEnd = roadmap.indexOf('Base de referencia desta fase:', currentStateStart);
  const currentState = currentStateStart >= 0 && currentStateEnd > currentStateStart
    ? roadmap.slice(currentStateStart, currentStateEnd)
    : roadmap;

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
  assert.match(currentState, /- fase atual: 204B;/);
  assert.match(currentState, /- nome: Historico mensal premium de dividendos;/);
  assert.match(currentState, /- branch atual: `feat\/phase-204b-monthly-income-history`;/);
  assert.match(currentState, /- SHA-base: `63b7206be2908e8f6eca5c8590948513c3d55005`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: historico mensal premium;/);
  assert.match(currentState, /- alteracao funcional autorizada exclusivamente para a Fase 204B;/);

  assert.match(indexHtml, /@media\(max-width:768px\)\{/);
  assert.match(indexHtml, /div-premium-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(indexHtml, /div-timeline\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(indexHtml, /div-month-history-toggle/);
  assert.match(indexHtml, /div-month-history-body/);
  assert.match(indexHtml, /div-month-history-summary/);
  assert.match(indexHtml, /div-monthly-table-block/);

  assertPhase202RoadmapClosed(roadmap);
  assertPhase202FutureSequence(roadmap);

  const phase200DocState = section(phase200Doc, '## Estado final', '## Redefinicao autorizada');
  const phase200DocRedef = section(phase200Doc, '## Redefinicao autorizada', '## Escopo');
  const phase200DocFinish = section(phase200Doc, '## Conclusao', '## Rollback');

  assert.match(phase200DocState, /- fase concluida;/);
  assert.match(phase200DocState, /- branch original: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(phase200DocState, /- PR: `#200`;/);
  assert.match(phase200DocState, /- modo: squash;/);
  assert.match(phase200DocState, /- SHA final: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(phase200DocState, /- implementacao ativa: nenhuma;/);
  assert.match(phase200DocState, /- resultado: concluido;/);
  assert.match(phase200DocState, /- nenhuma formula financeira nova;/);
  assert.match(phase200DocState, /- nenhuma alteracao de schema;/);
  assert.match(phase200DocState, /- nenhuma dependencia nova;/);
  assert.match(phase200DocState, /- nenhuma Fase 202 iniciada\./);

  assert.match(phase200DocRedef, /- esta fase foi redefinida por decisao explicita;/);
  assert.match(phase200DocRedef, /- o objetivo anterior de painel consolidado de desempenho dos ativos nao foi cancelado;/);
  assert.match(phase200DocRedef, /- esse objetivo foi movido para a Fase 202, ainda nao autorizada;/);
  assert.match(phase200DocRedef, /- motivo: tratar primeiro o risco real identificado em 768px e melhorar a confiabilidade da tela de Dividendos;/);
  assert.match(phase200DocRedef, /- nenhuma funcionalidade de desempenho de ativos foi iniciada;/);

  assert.match(phase200DocFinish, /- refinamento confiavel da tela de Dividendos concluido;/);
  assert.match(phase200DocFinish, /- correcao de 768px registrada como concluida;/);
  assert.match(phase200DocFinish, /- nenhuma Fase 202 ativa\./);
});
