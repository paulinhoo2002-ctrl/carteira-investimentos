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

  assert.match(currentState, /- fase atual: 206;/);
  assert.match(currentState, /- nome: Metas financeiras;/);
  assert.match(currentState, /- branch atual: `feat\/phase-206-financial-goals`;/);
  assert.match(currentState, /- SHA-base: `95383ba6f75be0fc7bc70472b1ec039bc9bf7308`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
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
  assert.match(currentState, /- 204C, 208, 210 e 212 nao autorizadas[.;]/);
  assert.match(currentState, /- Fases 208, 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);

  assert.match(phase204b, /## 22\. Fase 204B - Historico mensal premium de dividendos/);
  assert.match(phase204b, /Estado final:/);
  assert.match(phase204b, /- fase concluida;/);
  assert.match(phase204b, /- branch original: `feat\/phase-204b-monthly-income-history`;/);
  assert.match(phase204b, /- SHA-base: `63b7206be2908e8f6eca5c8590948513c3d55005`;/);
  assert.match(phase204b, /- PR `#207` merged e closed;/);
  assert.match(phase204b, /- modo: squash;/);
  assert.match(phase204b, /- SHA final: `06d921b78a9411a709726a8f4cad8725bcb56899`;/);
  assert.match(phase204b, /- titulo final: `feat: cria historico mensal premium de dividendos`;/);
  assert.match(phase204b, /- nenhuma implementacao ativa;/);
  assert.match(phase204b, /- nenhuma formula financeira nova;/);
  assert.match(phase204b, /- nenhum schema novo;/);
  assert.match(phase204b, /- nenhum snapshot;/);
  assert.match(phase204b, /- nenhuma evolucao patrimonial;/);
  assert.match(phase204b, /- nenhum deploy manual;/);
  assert.match(phase204b, /- Fase 204A funcional e documentalmente concluida;/);
  assert.match(phase204b, /- Fase 204B funcional e documentalmente encerrada;/);
  assert.match(phase204b, /- 204C, 206, 208, 210 e 212 nao autorizadas\./);
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
  assert.match(documentation, /## Encerramento/);
  assert.match(documentation, /data oficial de recebimento/);
  assert.match(documentation, /nao existe status persistido separado para previsto\/recebido nesta fonte/);
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
  assert.equal(documentation.includes('Rollback final:'), true);
  assert.equal(documentation.includes('git revert 06d921b78a9411a709726a8f4cad8725bcb56899'), true);
  assert.equal(documentation.includes('git revert 313c71146181a58157e6236ef3305ca259d6ca5f'), false);
  assert.equal(documentation.includes('\uFFFD'), false);
  assert.match(documentation, /204C nao iniciada;/);
  assert.match(documentation, /Fase 206 nao iniciada\./);
}

test('fase 204B fica documentariamente encerrada', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const documentation = readUtf8WithoutBom('docs/phase-204b-monthly-income-history.md');
  assertPhase204BMonthlyIncomeHistory(roadmap, documentation);
});

module.exports = {
  assertPhase204BMonthlyIncomeHistory,
};
