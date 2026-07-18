const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertRoadmap204AClosed } = require('./phase-204a-documentary-closure.guard');
const { assertPhase202FutureSequence, assertPhase202RoadmapClosed } = require('./phase-202-assets-performance-overview.guard');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertUtf8WithoutBom(relativePath) {
  const buffer = fs.readFileSync(path.join(repoRoot, relativePath));
  assert.equal(buffer[0], 0x23, `${relativePath} precisa comecar com # e sem BOM`);
}

function assertNoMojibake(text, label) {
  for (const token of ['\uFFFD', '\u00C3', '\u00C2', '\u0153']) {
    assert.equal(text.includes(token), false, `${label} nao pode conter ${token}`);
  }
}

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

test('documentacao da estrategia e limpa e rastreavel', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const inventory = read('docs/modern-architecture-inventory.md');
  const adr = read('docs/adr/ADR-001-modernization-strategy.md');
  const matrix = read('docs/modernization-decision-matrix.md');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/modern-architecture-inventory.md');
  assertUtf8WithoutBom('docs/adr/ADR-001-modernization-strategy.md');
  assertUtf8WithoutBom('docs/modernization-decision-matrix.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assertNoMojibake(roadmap, 'roadmap');

  assertRoadmap204AClosed(roadmap);
  const currentState = section(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
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
  const phase192 = section(roadmap, '## 14. Fase 192 - refinamento visual e responsivo da aba Dividendos', '## 15. Fase 194 - finalizacao objetiva da aba Dividendos');
  assert.match(currentState, /- PR `#202` merged e closed \(encerramento funcional da fase 202\);/);
  assert.match(currentState, /- modo de merge: squash;/);
  assert.match(currentState, /- SHA final da Fase 202: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;/);
  assert.match(currentState, /- resultado: painel consolidado de desempenho dos ativos concluido;/);
  assert.match(currentState, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(currentState, /- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(currentState, /- resultado: auditoria de evolucao patrimonial e dashboard executivo concluida;/);
  assert.match(currentState, /- Fase 204 documental concluida;/);
  assert.match(currentState, /- 204C, 208, 210 e 212 nao autorizadas;/);
  assert.match(currentState, /- PR `#200` merged e closed;/);
  assert.match(currentState, /- SHA final da Fase 200: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(currentState, /- resultado: refinamento confiavel da tela de Dividendos concluido;/);
  assert.match(currentState, /- correcao de 768px registrada como concluida;/);
  assert.match(currentState, /- nenhuma Fase 199 funcional;/);
  assert.match(currentState, /- Fase 194 concluida pela PR #194;/);
  assert.match(currentState, /Fases 208, 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('ciclo de modernizacao readonly encerrado'), false);
  assert.equal(currentState.includes('Fase 200 ativa'), false);
  assert.equal(currentState.includes('Fase 195'), false);

  assert.match(phase192, /- estado: Concluida;/);
  assert.match(phase192, /- PR: `#192`;/);
  assert.match(phase192, /- SHA final na main: `bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assert.match(phase192, /- titulo: `feat: refina visual da aba dividendos`;/);
  assert.match(phase192, /- modo: squash;/);
  assert.match(phase192, /- resultado: correcao da coluna Total, rolagem horizontal controlada, Historico mensal reposicionado, card redundante de meta removido e hierarquia visual melhorada;/);
  assert.match(phase192, /- rollback: `git revert bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assertPhase202RoadmapClosed(roadmap);
  assertPhase202FutureSequence(roadmap);

  assert.match(roadmap, /## 10\. Fase 190 - decisao arquitetural da modernizacao/);
  assert.match(roadmap, /- inventario arquitetural consolidado com fronteiras, responsabilidades e riscos;/);
  assert.match(roadmap, /- ADR com a estrategia recomendada e as opcoes avaliadas;/);
  assert.match(roadmap, /- matriz de decisao com criterios, notas e justificativa;/);
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
  assert.match(roadmap, /## 17\. Fase 198 - auditoria geral do sistema em producao/);
  assert.match(roadmap, /Estado final:/);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- situacao: Fase 198 concluida;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#198`: merged e closed \(encerramento da auditoria\);/);
  assert.match(roadmap, /- resultado: apto com ressalvas;/);
  assert.match(roadmap, /- risco residual principal: responsividade em 768px;/);
  assert.match(roadmap, /## 18\. Fase 200 - refinamento confiavel da tela de Dividendos/);

  assertNoMojibake(inventory, 'inventario');
  assert.match(inventory, /Inventario arquitetural da modernizacao/);
  assert.match(inventory, /`index\.html`/);
  assert.match(inventory, /`modern\/src\/features\/contributions\/ContributionsReadonlyPage\.tsx`/);
  assert.match(inventory, /O legado continua sendo a unica fonte de verdade/);

  assertNoMojibake(adr, 'adr');
  assert.match(adr, /ADR-001 - Estrategia de modernizacao do frontend/);
  assert.match(adr, /Opcao B - Expandir readonly gradualmente/);
  assert.match(adr, /Adotar a \*\*Opcao B - expandir readonly gradualmente\*\*/);
  assert.match(adr, /criterios para futuras fases de escrita/i);
  assert.match(adr, /Rollback/);

  assertNoMojibake(matrix, 'matriz');
  assert.match(matrix, /Matriz de decisao da modernizacao/);
  assert.match(matrix, /\| Criterio \| A \| B \| C \| D \| E \| Nota \|/);
  assert.match(matrix, /A decisao recomendada continua sendo a Opcao B/);
  assert.match(matrix, /Risco de perda de dados/);
  assert.match(matrix, /Reversibilidade/);
});
