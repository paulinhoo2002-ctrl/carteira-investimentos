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

test('fase 208 documentada com governanca e sem persistencia de auditoria', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const doc = readUtf8WithoutBom('docs/phase-208-data-quality.md');
  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html')).toString('utf8');

  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- nome: nenhuma;/);
  assert.match(roadmap, /- branch atual: main;/);
  assert.match(roadmap, /- SHA-base: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`;/);
  assert.match(roadmap, /- situacao: Fase 208 concluida e aguardando nova autorizacao;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- nenhuma alteracao funcional autorizada;/);
  assert.match(roadmap, /- Fase 208 concluida e nao faz parte desta sequencia planejada\./);
  assert.match(roadmap, /- PR `#211` merged e closed \(encerramento funcional da Fase 208\);/);
  assert.match(roadmap, /- SHA final da Fase 208: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`;/);
  assert.match(roadmap, /- Fases 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(roadmap, /- a sequencia futura planejada inclui 204C, 210 e 212\./);
  assert.equal(roadmap.includes('a sequencia futura planejada inclui 204C, 208, 210 e 212.'), false);
  assert.equal(roadmap.includes('a sequencia futura planejada inclui 204, 208, 210 e 212.'), false);

  assert.match(doc, /# Fase 208 - Qualidade dos dados/);
  assert.match(doc, /## Inventario tecnico/);
  assert.match(doc, /## Modelo de resultado/);
  assert.match(doc, /## Zero versus ausente/);
  assert.match(doc, /## Severidades/);
  assert.match(doc, /## Duplicidade conservadora/);
  assert.match(doc, /## Ausencia de correcao automatica/);
  assert.match(doc, /## Acessibilidade/);
  assert.match(doc, /## Responsividade/);
  assert.match(doc, /## Performance/);
  assert.match(doc, /## Rollback/);
  assert.match(doc, /## Conclusao Caveman/);
  assert.match(doc, /## Conclusao Impeccable/);
  assert.match(doc, /sem qualquer correcao automatica/i);
  assert.match(doc, /nao e persistido/i);
  assert.match(doc, /nenhum schema novo/i);

  assert.match(indexHtml, /function dataQualitySnapshot\(\)/);
  assert.match(indexHtml, /function dataQualityTab\(\)/);
  assert.match(indexHtml, /function renderDataQualityIssueCard\(issue\)/);
  assert.match(indexHtml, /function dataAuditTab\(\)/);
  assert.equal(indexHtml.includes('dataQualitySnapshot(){'), true);
  assert.equal(indexHtml.includes('dataQualityTab(){'), true);
});

test('auditoria de qualidade evita grid desktop no breakpoint tablet', () => {
  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html')).toString('utf8');

  assert.match(indexHtml, /@media\(min-width:641px\) and \(max-width:900px\)/);
  assert.match(indexHtml, /\.data-quality-issue\{[^}]*grid-template-columns:1fr 1fr[^}]*min-width:0/);
  assert.match(indexHtml, /\.data-quality-issue>div:nth-child\(6\)[^}]*grid-column:1\/-1/);
  assert.match(indexHtml, /\.data-quality-action \.btn\{[^}]*width:100%[^}]*white-space:normal/);
});
