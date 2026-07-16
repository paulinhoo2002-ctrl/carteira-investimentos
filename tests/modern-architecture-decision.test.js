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

  const currentState = section(roadmap, '### Estado atual', '### Fase 189');
  const phase192 = section(roadmap, '## 14. Fase 192 - refinamento visual e responsivo da aba Dividendos', '## 15. Fase 194 - finalizacao objetiva da aba Dividendos');

  assert.match(currentState, /- fase atual: 194;/);
  assert.match(currentState, /- branch atual: feat\/dividends-final-polish;/);
  assert.match(currentState, /- SHA-base: `9762faa4f42fc1c584866436131a4cdec3926565`;/);
  assert.match(currentState, /- situacao: Fase 194 em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: grafico, distribuicao por ativo e recebimentos recentes;/);
  assert.match(currentState, /- a fase 190 permanece concluida;/);
  assert.match(currentState, /- a PR #191 foi apenas o encerramento documental;/);
  assert.match(currentState, /- a PR #193 foi apenas o encerramento documental da fase 192;/);
  assert.match(currentState, /- nao existe Fase 191 funcional\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('ciclo de modernizacao readonly encerrado'), false);

  assert.match(phase192, /- estado: Concluida;/);
  assert.match(phase192, /- PR: `#192`;/);
  assert.match(phase192, /- SHA final na main: `bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);
  assert.match(phase192, /- titulo: `feat: refina visual da aba dividendos`;/);
  assert.match(phase192, /- modo: squash;/);
  assert.match(phase192, /- resultado: correcao da coluna Total, rolagem horizontal controlada, Historico mensal reposicionado, card redundante de meta removido e hierarquia visual melhorada;/);
  assert.match(phase192, /- rollback: `git revert bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;/);

  assert.equal(roadmap.includes('futura PR'), false, 'roadmap nao pode falar em futura PR');
  assert.match(roadmap, /## 10\. Fase 190 - decisao arquitetural da modernizacao/);
  assert.match(roadmap, /- inventario arquitetural consolidado com fronteiras, responsabilidades e riscos;/);
  assert.match(roadmap, /- ADR com a estrategia recomendada e as opcoes avaliadas;/);
  assert.match(roadmap, /- matriz de decisao com criterios, notas e justificativa;/);

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
