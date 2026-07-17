const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('aba dividendos preserva Total e rolagem horizontal controlada', () => {
  const indexHtml = read('index.html');
  const overviewStart = indexHtml.indexOf('const overviewBody=');
  const bodyStart = indexHtml.indexOf('const body=', overviewStart);
  const overviewBlock = overviewStart >= 0 && bodyStart > overviewStart
    ? indexHtml.slice(overviewStart, bodyStart)
    : indexHtml;

  assert.match(indexHtml, /div-monthly-table-wrap/);
  assert.match(indexHtml, /div-monthly-table-scroll/);
  assert.match(indexHtml, /aria-label="Tabela de hist.*rico mensal com rolagem horizontal"/);
  assert.match(indexHtml, /\.hist-monthly\{min-width:1140px\}/);
  assert.match(indexHtml, /<th>Total<\/th>/);
  assert.match(indexHtml, /div-monthly-scroll-note/);
  assert.match(overviewBlock, /\$\{dividendSummaryCards\(\)\}\s*\$\{monthlySection\}\s*\$\{dividendOverviewRecentPanel\(rows\)\}/s);
  assert.equal(overviewBlock.includes('Meta de renda passiva'), false);
  assert.equal(overviewBlock.includes('${dividendGoalProgress()}'), false);
  assert.equal(overviewBlock.includes("${mode==='overview'?dividendGoalProgress():''}"), false);
});

test('roadmap registra a fase 194 e preserva o encerramento documental da 192', () => {
  const roadmapPath = path.join(repoRoot, 'docs', 'project-phases-roadmap.md');
  const roadmapBuffer = fs.readFileSync(roadmapPath);
  const roadmap = roadmapBuffer.toString('utf8');

  assert.equal(
    roadmapBuffer.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    false,
    'docs/project-phases-roadmap.md nao pode conter BOM',
  );
  assert.match(roadmap, /fase atual: nenhuma/);
  assert.match(roadmap, /branch atual: main/);
  assert.match(roadmap, /SHA-base: `e358994bbc4270d0694990b4f3a713f0c20b0cba`/);
  assert.match(roadmap, /situacao: Fase 198 concluida e aguardando nova autorizacao/);
  assert.match(roadmap, /PR atual: nenhuma/);
  assert.match(roadmap, /implementacao ativa: nenhuma/);
  assert.match(roadmap, /PR `#198` merged e closed \(encerramento da auditoria\)/);
  assert.match(roadmap, /resultado da auditoria: apto com ressalvas/);
  assert.match(roadmap, /risco residual principal: responsividade em 768px/);
  assert.match(roadmap, /Fase 194 concluida pela PR #194/);
  assert.match(roadmap, /a PR #191 foi apenas o encerramento documental/);
  assert.match(roadmap, /a PR #193 foi apenas o encerramento documental da fase 192/);
  assert.match(roadmap, /nao existe Fase 191 funcional/);
  assert.match(roadmap, /PR `#194`: merged e closed \(encerramento funcional da fase 194\)/);
  assert.match(roadmap, /18\. 192 - refinamento visual e responsivo da aba Dividendos/);
  assert.match(roadmap, /## 14\. Fase 192 - refinamento visual e responsivo da aba Dividendos/);
  assert.match(roadmap, /- estado: Concluida;/);
  assert.match(roadmap, /- PR: `#192`;/);
  assert.match(roadmap, /- SHA final na main: `bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assert.match(roadmap, /- titulo: `feat: refina visual da aba dividendos`;/);
  assert.match(roadmap, /- modo: squash;/);
  assert.match(roadmap, /- resultado: correcao da coluna Total, rolagem horizontal controlada, Historico mensal reposicionado, card redundante de meta removido e hierarquia visual melhorada;/);
  assert.match(roadmap, /- rollback: `git revert bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assert.match(roadmap, /## 15\. Fase 194 - finalizacao objetiva da aba Dividendos/);
  assert.match(roadmap, /Estado final:/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 194 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#194`: merged e closed \(encerramento funcional da fase 194\);/);
  assert.match(roadmap, /- a fase 195 nao existe sem autorizacao explicita\./);
  assert.match(roadmap, /## 16\. Fase 196 - estabilizacao do teste basico da interface/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 196 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#196`: merged e closed \(encerramento funcional da fase 196\);/);
  assert.match(roadmap, /- estado: Concluida;/);
  assert.match(roadmap, /- PR: `#192`;/);
  assert.match(roadmap, /## 17\. Fase 198 - auditoria geral do sistema em producao/);
  assert.match(roadmap, /Estado final:/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 198 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#198`: merged e closed \(encerramento da auditoria\);/);
  assert.match(roadmap, /- resultado: apto com ressalvas;/);
  assert.match(roadmap, /- risco residual principal: responsividade em 768px;/);
  assert.equal(roadmap.includes('Fase 195 -'), false);
  assert.equal(roadmap.includes('Fase 191 -'), false);
  assert.equal(roadmap.includes('Fase 193 -'), false);
});
