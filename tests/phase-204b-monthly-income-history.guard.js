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
  assert.equal(text.includes('Hist\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  assert.equal(text.includes('Evolu\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  assert.equal(text.includes('Patrim\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  assert.equal(text.includes('Composi\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  assert.equal(text.includes('Dividend\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  assert.equal(text.includes('Conclus\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  assert.equal(text.includes('Encerr\u00c3'), false, `${relativePath} nao pode conter mojibake em acentos`);
  return text;
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

function assertPhase204BMonthlyIncomeHistory(roadmap, documentation) {
  const currentState = extractSection(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  const phase204b = extractSection(roadmap, '## 22. Fase 204B - Historico mensal premium de dividendos', '## 11. Sequencia planejada apos a Fase 202');

  assert.match(currentState, /- fase atual: 204B;/);
  assert.match(currentState, /- nome: Historico mensal premium de dividendos;/);
  assert.match(currentState, /- branch atual: `feat\/phase-204b-monthly-income-history`;/);
  assert.match(currentState, /- SHA-base: `63b7206be2908e8f6eca5c8590948513c3d55005`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: historico mensal premium;/);
  assert.match(currentState, /- alteracao funcional autorizada exclusivamente para a Fase 204B;/);
  assert.match(currentState, /- Fase 204A funcional e documentalmente concluida;/);
  assert.match(currentState, /- 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);

  assert.match(phase204b, /## 22\. Fase 204B - Historico mensal premium de dividendos/);
  assert.match(phase204b, /Objetivo:/);
  assert.match(phase204b, /Inventario tecnico:/);
  assert.match(phase204b, /Fonte oficial:/);
  assert.match(phase204b, /Regras:/);
  assert.match(phase204b, /Layout e acessibilidade:/);
  assert.match(phase204b, /Performance:/);
  assert.match(phase204b, /Riscos:/);
  assert.match(phase204b, /Testes:/);
  assert.match(phase204b, /Rollback:/);
  assert.match(phase204b, /Conclusao Caveman:/);
  assert.match(phase204b, /Conclusao Impeccable:/);
  assert.match(phase204b, /Fase 204B/);
  assert.equal(phase204b.includes('Fase 204C'), false);
  assert.equal(phase204b.includes('Fase 206'), false);
  assert.equal(phase204b.includes('Fase 208'), false);
  assert.equal(phase204b.includes('Fase 210'), false);
  assert.equal(phase204b.includes('Fase 212'), false);
  assert.equal(phase204b.includes('\uFFFD'), false);

  assert.match(documentation, /# Fase 204B - Historico mensal premium de dividendos/);
  assert.match(documentation, /## Objetivo/);
  assert.match(documentation, /## Inventario tecnico/);
  assert.match(documentation, /## Fonte oficial/);
  assert.match(documentation, /## Data oficial usada/);
  assert.match(documentation, /## Regras de inclusao e exclusao/);
  assert.match(documentation, /## Agrupamento mensal/);
  assert.match(documentation, /## Zero versus ausente/);
  assert.match(documentation, /## Tratamento de moeda/);
  assert.match(documentation, /## Filtros/);
  assert.match(documentation, /## Expansao/);
  assert.match(documentation, /## Comparacao mensal/);
  assert.match(documentation, /## Estados vazios/);
  assert.match(documentation, /## Acessibilidade/);
  assert.match(documentation, /## Responsividade/);
  assert.match(documentation, /## Performance/);
  assert.match(documentation, /## Riscos/);
  assert.match(documentation, /## Testes/);
  assert.match(documentation, /## Rollback/);
  assert.match(documentation, /## Conclusao Caveman/);
  assert.match(documentation, /## Conclusao Impeccable/);
  assert.match(documentation, /data oficial de recebimento/);
  assert.match(documentation, /Regras de inclusao e exclusao/);
  assert.match(documentation, /Agrupamento mensal/);
  assert.match(documentation, /Zero versus ausente/);
  assert.match(documentation, /Tratamento de moeda/);
  assert.match(documentation, /Filtros/);
  assert.match(documentation, /Expansao/);
  assert.match(documentation, /Comparacao mensal/);
  assert.match(documentation, /Estados vazios/);
  assert.match(documentation, /Mostrar mais/);
  assert.match(documentation, /Mostrar menos/);
  assert.match(documentation, /Nenhum provento recebido ainda\./);
  assert.match(documentation, /Nenhum recebimento encontrado para os filtros selecionados\./);
  assert.match(documentation, /sem inventar historico/i);
  assert.equal(documentation.includes('\uFFFD'), false);
}

test('fase 204B fica documentada e ativa', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const documentation = readUtf8WithoutBom('docs/phase-204b-monthly-income-history.md');
  assertPhase204BMonthlyIncomeHistory(roadmap, documentation);
});

module.exports = {
  assertPhase204BMonthlyIncomeHistory,
};
