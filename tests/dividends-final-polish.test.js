const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

test('dividendos final polish usa fontes oficiais e preserva os fluxos', () => {
  const indexHtml = read('index.html');
  const roadmap = read('docs/project-phases-roadmap.md');

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
  assert.equal(indexHtml.includes('score: Number(row?.score) || 0'), false);
  assert.equal(indexHtml.includes('current.totalValue + amount'), false);
  assert.equal(indexHtml.includes('reduce((sum,row)=>sum+row.value,0)'), true, 'calculos oficiais antigos permanecem');

  const overviewStart = indexHtml.indexOf('const overviewBody=');
  const bodyStart = indexHtml.indexOf('const body=', overviewStart);
  const overviewBlock = overviewStart >= 0 && bodyStart > overviewStart
    ? indexHtml.slice(overviewStart, bodyStart)
    : indexHtml;

  assert.equal(overviewBlock.includes('Meta de renda passiva'), false);
  assert.equal(overviewBlock.includes('${dividendGoalProgress()}'), false);
  assert.equal(overviewBlock.includes("${mode==='overview'?dividendGoalProgress():''}"), false);

  const roadmapCurrent = assertSection(roadmap, '### Estado atual', '### Fase 189');
  const roadmapPhase194Start = roadmap.indexOf('## 15. Fase 194 - finalizacao objetiva da aba Dividendos');
  assert.equal(roadmapPhase194Start >= 0, true, 'Seção da Fase 194 precisa existir');
  const roadmapPhase194 = roadmap.slice(roadmapPhase194Start);

  assert.match(roadmapCurrent, /- fase atual: nenhuma;/);
  assert.match(roadmapCurrent, /- branch atual: main;/);
  assert.match(roadmapCurrent, /- SHA-base: `78e7da439cd8a041f13498d0924d1f107acf72e3`;/);
  assert.match(roadmapCurrent, /- situacao: Fase 194 concluida e aguardando nova autorizacao;/);
  assert.match(roadmapCurrent, /- PR atual: nenhuma;/);
  assert.match(roadmapCurrent, /- implementacao ativa: nenhuma;/);
  assert.match(roadmapCurrent, /- Fase 194 concluida pela PR #194;/);
  assert.match(roadmapCurrent, /- a PR #193 foi apenas o encerramento documental da fase 192;/);
  assert.match(roadmapCurrent, /- a fase 195 nao existe sem autorizacao explicita\./);

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

  assert.match(roadmap, /- estado: Concluida;/);
  assert.match(roadmap, /- PR: `#192`;/);
  assert.equal(roadmap.includes('Fase 193 -'), false);
  assert.equal(roadmap.includes('Fase 195 -'), false);
});
