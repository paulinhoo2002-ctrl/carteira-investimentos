const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);
  const text = buffer.toString('utf8');
  for (const token of ['\uFFFD', '\u00C3', '\u00C2', '\u0153']) {
    assert.equal(text.includes(token), false, `${relativePath} nao pode conter mojibake`);
  }
  return text;
}

test('fase 208 encerrada documentalmente no roadmap', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const doc = readUtf8WithoutBom('docs/phase-208-data-quality.md');
  const changedFiles = require('node:child_process')
    .execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { cwd: repoRoot, encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const indexedDist = require('node:child_process')
    .execFileSync('git', ['ls-files', 'modern/dist'], { cwd: repoRoot, encoding: 'utf8' })
    .trim();

  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- branch atual: main;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- nenhuma alteracao funcional autorizada;/);
  assert.match(roadmap, /- PR `#211` merged e closed \(encerramento funcional da Fase 208\);/);
  assert.match(roadmap, /- SHA final da Fase 208: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`;/);
  assert.match(roadmap, /- Fase 208 funcional e documentalmente encerrada;/);
  assert.match(roadmap, /- 204C, 210 e 212 nao autorizadas;/);
  assert.match(roadmap, /futuras melhorias visuais no Dashboard e em Dividendos sao apenas intencao/i);
  assert.match(roadmap, /nenhuma fase visual definitiva foi numerada ou autorizada/i);

  assert.match(doc, /- status: concluida;/);
  assert.match(doc, /- PR funcional: `#211`;/);
  assert.match(doc, /- modo de merge: squash;/);
  assert.match(doc, /- SHA final na main: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`;/);
  assert.match(doc, /auditoria readonly de qualidade dos dados concluida/i);
  assert.match(doc, /zero preservado/i);
  assert.match(doc, /ausencia diferenciada de zero/i);
  assert.match(doc, /sem snapshot persistido/i);
  assert.match(doc, /sem schema novo/i);
  assert.match(doc, /sem formula financeira concorrente/i);
  assert.match(doc, /sem alteracao de dados/i);
  assert.match(doc, /overflow de 768px corrigido/i);
  assert.match(doc, /git revert 4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575/);

  assert.equal(changedFiles.includes('index.html'), false, 'encerramento documental nao pode alterar index.html');
  assert.equal(indexedDist, '', 'modern/dist deve permanecer fora do indice');
});
