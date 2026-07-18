const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertPhase202FutureSequence, assertPhase202RoadmapClosed } = require('./phase-202-assets-performance-overview.guard');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('dividendos final polish usa fontes oficiais e preserva os fluxos', () => {
  const indexHtml = read('index.html');
  const roadmap = read('docs/project-phases-roadmap.md');
  const currentStateStart = roadmap.indexOf('## Estado e governanca');
  const currentStateEnd = roadmap.indexOf('Base de referencia desta fase:', currentStateStart);
  const currentState = currentStateStart >= 0 && currentStateEnd > currentStateStart
    ? roadmap.slice(currentStateStart, currentStateEnd)
    : roadmap;

  assert.match(indexHtml, /function dividendMonthlyTimeline\(\)/);
  assert.match(indexHtml, /passiveIncomeGoalStats\(\)/);
  assert.match(indexHtml, /div-timeline-summary-title/);
  assert.match(indexHtml, /div-timeline-card\.current/);
  assert.match(indexHtml, /title="\$\{esc\(`\$\{label\}/);
  assert.match(indexHtml, /fmt\(row\.total\)/);
  assert.match(indexHtml, /aria-label="\$\{esc\(`/);
  assert.match(indexHtml, /div-asset-summary/);
  assert.match(indexHtml, /div-asset-more/);
  assert.match(indexHtml, /div-receipt-actions/);
  assert.match(indexHtml, /editDividendReceipt\(/);
  assert.match(indexHtml, /rmD\(/);
  assert.match(indexHtml, /div-receipt-note/);
  assert.match(indexHtml, /Hist.*rico mensal/);
  assert.match(indexHtml, /<th>Total<\/th>/);
  assert.match(indexHtml, /<th>M.*dia<\/th>/);
  assert.match(indexHtml, /function dividendOverviewRecentPanel\(rows\)/);
  assert.equal(indexHtml.includes('score: Number(row?.score) || 0'), false);
  assert.equal(indexHtml.includes('current.totalValue + amount'), false);
  assert.equal(indexHtml.includes('reduce((sum,row)=>sum+row.value,0)'), true, 'calculos oficiais antigos permanecem');

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
  assert.match(currentState, /- fase atual: 206;/);
  assert.match(currentState, /- nome: Metas financeiras;/);
  assert.match(currentState, /- branch atual: `feat\/phase-206-financial-goals`;/);
  assert.match(currentState, /- SHA-base: `95383ba6f75be0fc7bc70472b1ec039bc9bf7308`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: `#209`;/);
  assert.match(currentState, /- implementacao ativa: metas financeiras;/);
  assert.match(currentState, /- alteracao funcional autorizada exclusivamente para a Fase 206;/);
  assert.match(currentState, /- PR `#205` merged e closed \(encerramento funcional da Fase 204A\);/);
  assert.match(currentState, /- PR `#207` merged e closed \(encerramento funcional da Fase 204B\);/);
  assert.match(currentState, /- modo de merge da Fase 204B: squash;/);
  assert.match(currentState, /- SHA final da Fase 204B: `06d921b78a9411a709726a8f4cad8725bcb56899`;/);
  assert.match(currentState, /- resultado: Historico mensal premium de dividendos concluido;/);
  assert.match(currentState, /- Fase 204A funcional e documentalmente concluida;/);
  assert.match(currentState, /- Fase 204B funcional e documentalmente encerrada;/);
  assert.match(currentState, /- Fase 206 funcional em desenvolvimento;/);

  const roadmapPhase194Start = roadmap.indexOf('## 15. Fase 194 - finalizacao objetiva da aba Dividendos');
  assert.equal(roadmapPhase194Start >= 0, true, 'Secao da Fase 194 precisa existir');
  const roadmapPhase194 = roadmap.slice(roadmapPhase194Start);

  assertPhase202RoadmapClosed(roadmap);

  assert.match(roadmapPhase194, /Objetivo:/);
  assert.match(roadmapPhase194, /- melhorar o grafico de evolucao mensal;/);
  assert.match(roadmapPhase194, /- organizar a distribuicao por ativo;/);
  assert.match(roadmapPhase194, /- melhorar a lista de recebimentos recentes;/);
  assert.match(roadmapPhase194, /- grafico de evolucao mensal legivel e acessivel;/);
  assert.match(roadmapPhase194, /- lista de recebimentos recentes com edicao e exclusao preservadas/);
  assert.match(roadmapPhase194, /- rollback simples, mantendo as fases readonly anteriores intactas\./);
  assert.match(roadmapPhase194, /Estado final:/);
  assert.match(roadmapPhase194, /- fase atual: nenhuma;/);
  assert.match(roadmapPhase194, /- branch original: feat\/dividends-final-polish;/);
  assert.match(roadmapPhase194, /- situacao: Fase 194 concluida;/);
  assert.match(roadmapPhase194, /- PR atual: nenhuma;/);
  assert.match(roadmapPhase194, /- implementacao ativa: nenhuma;/);
  assert.match(roadmapPhase194, /- PR `#194`: merged e closed \(encerramento funcional da fase 194\);/);
  assert.match(roadmapPhase194, /- PR `#193`: merged e closed \(encerramento documental da fase 192\);/);
  assert.match(roadmapPhase194, /- a fase 194 nao deixa fase funcional ativa;/);
  assert.match(roadmapPhase194, /- a fase 195 nao existe sem autorizacao explicita\./);
  assert.match(roadmapPhase194, /evidencias validadas: 390px em coluna sem rolagem horizontal global;/);
  assertPhase202FutureSequence(roadmap);
  assert.match(roadmapPhase194, /## 16\. Fase 196 - estabilizacao do teste basico da interface/);
  assert.match(roadmapPhase194, /- fase atual: nenhuma;/);
  assert.match(roadmapPhase194, /- situacao: Fase 196 concluida;/);
  assert.match(roadmapPhase194, /- PR atual: nenhuma;/);
  assert.match(roadmapPhase194, /- implementacao ativa: nenhuma;/);
  assert.match(roadmapPhase194, /- PR `#196`: merged e closed \(encerramento funcional da fase 196\);/);
  assert.match(roadmapPhase194, /## 17\. Fase 198 - auditoria geral do sistema em producao/);
  assert.match(roadmapPhase194, /Estado final:/);
  assert.match(roadmapPhase194, /- fase atual: nenhuma;/);
  assert.match(roadmapPhase194, /- situacao: Fase 198 concluida;/);
  assert.match(roadmapPhase194, /- PR atual: nenhuma;/);
  assert.match(roadmapPhase194, /- implementacao ativa: nenhuma;/);
  assert.match(roadmapPhase194, /- PR `#198`: merged e closed \(encerramento da auditoria\);/);
  assert.match(roadmapPhase194, /- resultado: apto com ressalvas;/);
  assert.match(roadmapPhase194, /- risco residual principal: responsividade em 768px;/);
  assert.match(roadmap, /## 18\. Fase 200 - refinamento confiavel da tela de Dividendos/);
});
