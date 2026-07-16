const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function readText(relativePath) {
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

test('documentacao da fase 190 e limpa e rastreavel', () => {
  const roadmap = readText('docs/project-phases-roadmap.md');
  const inventory = readText('docs/modern-architecture-inventory.md');
  const adr = readText('docs/adr/ADR-001-modernization-strategy.md');
  const matrix = readText('docs/modernization-decision-matrix.md');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/modern-architecture-inventory.md');
  assertUtf8WithoutBom('docs/adr/ADR-001-modernization-strategy.md');
  assertUtf8WithoutBom('docs/modernization-decision-matrix.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assertNoMojibake(roadmap, 'roadmap');

  assert.match(roadmap, /- fase atual: 190;/);
  assert.match(roadmap, /- branch atual: `docs\/modern-architecture-decision`/);
  assert.match(roadmap, /- SHA-base: `0372cc4e04d66f713474b8d0b41ef2750d380061`/);
  assert.match(roadmap, /- HEAD \/ `origin\/main`: `0372cc4e04d66f713474b8d0b41ef2750d380061`/);
  assert.match(roadmap, /- situacao: em desenvolvimento/);
  assert.match(roadmap, /- PR: pendente/);
  assert.match(roadmap, /- head de revisao: pendente/);
  assert.match(roadmap, /- SHA final na main: pendente de merge/);
  assert.match(roadmap, /\| 189 \| Aportes e sugestao explicavel readonly \| Concluida \| `#189` \| `0372cc4e04d66f713474b8d0b41ef2750d380061` \|/);
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
