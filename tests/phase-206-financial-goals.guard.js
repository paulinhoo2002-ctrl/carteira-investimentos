const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);
  const text = buffer.toString('utf8');
  assert.equal(text.includes('\uFFFD'), false, `${relativePath} nao pode conter caractere de substituicao`);
  assert.equal(text.includes('\u00C3'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('\u00C2'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('\u0153'), false, `${relativePath} nao pode conter mojibake`);
  return text;
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

function assertPhase206Roadmap(roadmap) {
  const currentState = extractSection(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  const phase206 = extractSection(roadmap, '## 23. Fase 206 - Metas financeiras', '## 11. Sequencia planejada apos a Fase 202');

  assert.match(currentState, /- fase atual: 206;/);
  assert.match(currentState, /- nome: Metas financeiras;/);
  assert.match(currentState, /- branch atual: `feat\/phase-206-financial-goals`;/);
  assert.match(currentState, /- SHA-base: `95383ba6f75be0fc7bc70472b1ec039bc9bf7308`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: `#209`;/);
  assert.match(currentState, /- implementacao ativa: metas financeiras;/);
  assert.match(currentState, /- alteracao funcional autorizada exclusivamente para a Fase 206;/);
  assert.match(currentState, /- Fase 206 funcional em desenvolvimento;/);
  assert.match(currentState, /- 204C, 208, 210 e 212 nao autorizadas[.;]/);
  assert.match(currentState, /- Fases 208, 210 e 212 continuam planejadas e nao autorizadas\./);

  assert.match(phase206, /Objetivo:/);
  assert.match(phase206, /acompanhar meta patrimonial de R\$ 1\.000\.000 e meta de renda passiva de R\$ 4\.000 mensais/);
  assert.match(phase206, /patrimonio atual confiavel vem de `cx\(\)`;/);
  assert.match(phase206, /renda passiva atual confiavel vem do histórico mensal real da Fase 204B;/);
  assert.match(phase206, /meta patrimonial de R\$ 1\.000\.000/);
  assert.match(phase206, /meta de renda passiva de R\$ 4\.000 mensais/);
  assert.match(phase206, /nenhuma nova formula financeira;/);
  assert.match(phase206, /nenhuma criacao de snapshot;/);
  assert.match(phase206, /nenhuma evolucao patrimonial historica\./);
}

function assertPhase206Documentation(doc) {
  assert.match(doc, /# Fase 206 - Metas financeiras/);
  assert.match(doc, /## Objetivo/);
  assert.match(doc, /## Inventario tecnico/);
  assert.match(doc, /## Fonte oficial do patrimonio/);
  assert.match(doc, /## Fonte oficial da renda passiva/);
  assert.match(doc, /## Metas existentes/);
  assert.match(doc, /## Decisao/);
  assert.match(doc, /## Regras de progresso/);
  assert.match(doc, /## Valor que falta/);
  assert.match(doc, /## Projecao/);
  assert.match(doc, /## Estados visuais/);
  assert.match(doc, /## Acessibilidade/);
  assert.match(doc, /## Responsividade/);
  assert.match(doc, /## Performance/);
  assert.match(doc, /## Riscos/);
  assert.match(doc, /## Testes/);
  assert.match(doc, /## Rollback/);
  assert.match(doc, /## Conclusao Caveman/);
  assert.match(doc, /## Conclusao Impeccable/);
  assert.match(doc, /R\$ 1\.000\.000/);
  assert.match(doc, /R\$ 4\.000/);
  assert.match(doc, /Patrimonio atual indisponivel/);
  assert.match(doc, /Meta atingida/);
  assert.match(doc, /Opcao A - reutilizar metas ja persistidas/);
  assert.match(doc, /evitar historico inventado/i);
  assert.match(doc, /snapshot novo/i);
}

test('fase 206 fica documentada e com governanca rastreavel', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const doc = readUtf8WithoutBom('docs/phase-206-financial-goals.md');

  assertPhase206Roadmap(roadmap);
  assertPhase206Documentation(doc);
  assert.equal(roadmap.includes('Fase 206 funcional em desenvolvimento;'), true);
  assert.equal(roadmap.includes('PR atual: `#209`;'), true);
  assert.equal(doc.includes('Nenhuma fase futura esta automaticamente autorizada.'), false);
  assert.equal(doc.includes('\uFFFD'), false);
});

module.exports = {
  assertPhase206Documentation,
  assertPhase206Roadmap,
};
