const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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

  const currentState = section(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  const phase192 = section(roadmap, '## 14. Fase 192 - refinamento visual e responsivo da aba Dividendos', '## 15. Fase 194 - finalizacao objetiva da aba Dividendos');

  assert.match(currentState, /- fase atual: 200;/);
  assert.match(currentState, /- nome: Refinamento confiavel da tela de Dividendos;/);
  assert.match(currentState, /- branch atual: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(currentState, /- SHA-base: `8951891a0ffa15edade8867a3e7078ac63c09b73`;/);
  assert.match(currentState, /- situacao: em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: refinamento confiavel da tela de Dividendos;/);
  assert.match(currentState, /- head de revisao: consultavel na futura PR;/);
  assert.match(currentState, /- SHA final na main: pendente de merge;/);
  assert.match(currentState, /- PR `#198` merged e closed \(encerramento da auditoria\);/);
  assert.match(currentState, /- resultado da auditoria: apto com ressalvas;/);
  assert.match(currentState, /- risco residual principal: responsividade em 768px;/);
  assert.match(currentState, /- nenhuma Fase 199 funcional;/);
  assert.match(currentState, /- Fase 194 concluida pela PR #194;/);
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
