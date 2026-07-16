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
  assert.match(indexHtml, /aria-label="Tabela de histórico mensal com rolagem horizontal"/);
  assert.match(indexHtml, /\.hist-monthly\{min-width:1140px\}/);
  assert.match(indexHtml, /<th>Total<\/th>/);
  assert.match(indexHtml, /div-monthly-scroll-note/);
  assert.match(overviewBlock, /\$\{dividendSummaryCards\(\)\}\s*\$\{monthlySection\}\s*\$\{dividendOverviewRecentPanel\(rows\)\}/s);
  assert.equal(overviewBlock.includes('Meta de renda passiva'), false);
  assert.equal(overviewBlock.includes('${dividendGoalProgress()}'), false);
  assert.equal(overviewBlock.includes("${mode==='overview'?dividendGoalProgress():''}"), false);
});

test('roadmap registra a fase 192 e preserva o encerramento documental da 191', () => {
  const roadmapPath = path.join(repoRoot, 'docs', 'project-phases-roadmap.md');
  const roadmapBuffer = fs.readFileSync(roadmapPath);
  const roadmap = roadmapBuffer.toString('utf8');

  assert.equal(
    roadmapBuffer.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    false,
    'docs/project-phases-roadmap.md nao pode conter BOM',
  );
  assert.match(roadmap, /fase atual: 192/);
  assert.match(roadmap, /branch atual: `feat\/dividends-visual-refinement`/);
  assert.match(roadmap, /SHA-base: `b86169016207362981ffedddeaa456fb908d1841`/);
  assert.match(roadmap, /situacao: em desenvolvimento/);
  assert.match(roadmap, /PR atual: pendente/);
  assert.match(roadmap, /a PR #191 foi apenas o encerramento documental/);
  assert.match(roadmap, /nao existe Fase 191 funcional/);
  assert.match(roadmap, /18\. 192 - refinamento visual e responsivo da aba Dividendos/);
  assert.match(roadmap, /## 14\. Fase 192 - refinamento visual e responsivo da aba Dividendos/);
  assert.match(roadmap, /corrigir o corte da coluna Total no historico mensal/);
  assert.match(roadmap, /a fase 190 permanece concluida/);
  assert.equal(roadmap.includes('Fase 191 -'), false);
});
