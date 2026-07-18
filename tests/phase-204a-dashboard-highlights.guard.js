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

test('fase 204A fica registrada como dashboard executivo com destaques', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const audit = read('docs/phase-204a-dashboard-highlights.md');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-204a-dashboard-highlights.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assertNoMojibake(roadmap, 'roadmap');
  assertNoMojibake(audit, 'audit');

  const currentState = section(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  const phase204 = section(roadmap, '## 20. Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo', '## 21. Fase 204A - Dashboard executivo com destaques da carteira');
  const phase204a = section(roadmap, '## 21. Fase 204A - Dashboard executivo com destaques da carteira', '## 11. Sequencia planejada apos a Fase 202');
  const futureSequence = section(roadmap, '## 11. Sequencia planejada apos a Fase 202', '## 12. Radar estrategico - mudancas de alto impacto');

  assert.match(currentState, /- fase atual: 204A;/);
  assert.match(currentState, /- nome: Dashboard executivo com destaques da carteira;/);
  assert.match(currentState, /- branch atual: `feat\/phase-204a-dashboard-highlights`;/);
  assert.match(currentState, /- SHA-base: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: `#205`;/);
  assert.match(currentState, /- implementacao ativa: card Destaques da carteira;/);
  assert.match(currentState, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(currentState, /- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(currentState, /- resultado: auditoria de evolucao patrimonial e dashboard executivo concluida;/);
  assert.match(currentState, /- Fase 204 documental concluida;/);
  assert.match(currentState, /- 204B, 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);
  assert.match(currentState, /- PR `#202` merged e closed \(encerramento funcional da fase 202\);/);
  assert.match(currentState, /- PR `#200` merged e closed;/);
  assert.match(currentState, /- Fases 206, 208, 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('Fase 204 ativa somente como auditoria documental'), false);

  assert.match(phase204, /- fase concluida;/);
  assert.match(phase204, /- branch original: `docs\/phase-204-evolution-audit`;/);
  assert.match(phase204, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(phase204, /- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(phase204, /- conclusao: apto com ressalvas;/);
  assert.match(phase204, /- risco residual principal: responsividade em 768px;/);
  assert.match(phase204, /- Fase 204 documental concluida;/);
  assert.match(phase204, /- 204B, 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);

  assert.match(phase204a, /## 21\. Fase 204A - Dashboard executivo com destaques da carteira/);
  assert.match(phase204a, /- fase atual: 204A;/);
  assert.match(phase204a, /- nome: Dashboard executivo com destaques da carteira;/);
  assert.match(phase204a, /- branch atual: `feat\/phase-204a-dashboard-highlights`;/);
  assert.match(phase204a, /- SHA-base: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(phase204a, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(phase204a, /- PR atual: `#205`;/);
  assert.match(phase204a, /- implementacao ativa: card Destaques da carteira;/);
  assert.match(phase204a, /- Fase 204 documental concluida;/);
  assert.match(phase204a, /- 204B, 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);
  assert.match(phase204a, /- substituir o card `Maiores pagadores do mes` do Dashboard por `Destaques da carteira`;/);
  assert.match(phase204a, /- manter `Composicao por classe` ao lado;/);
  assert.match(phase204a, /- mostrar abas `Maiores altas` e `Maiores baixas`;/);
  assert.match(phase204a, /- reutilizar apenas os calculos oficiais da Fase 202;/);
  assert.match(phase204a, /- nao criar formula financeira nova[.;]/);
  assert.match(phase204a, /- zero real continua valido;/);
  assert.match(phase204a, /- dado ausente continua diferente de zero;/);
  assert.match(phase204a, /- Maiores altas: resultado percentual desc, resultado em reais desc, ticker asc;/);
  assert.match(phase204a, /- Maiores baixas: resultado percentual asc, resultado em reais asc, ticker asc;/);
  assert.match(phase204a, /- acao `Ver todos` para `Ativos -> Desempenho`;/);
  assert.match(phase204a, /- leitura confortavel em 390px, 768px, 1366px e 1920px;/);
  assert.match(phase204a, /- sem overflow horizontal relevante;/);
  assert.match(phase204a, /- foco visivel e navegacao por teclado\./);
  assert.match(phase204a, /- nenhuma formula nova;/);
  assert.match(phase204a, /- encoding preservado em UTF-8 sem BOM\./);

  assert.match(futureSequence, /### Fase 206 - Metas financeiras/);
  assert.match(futureSequence, /### Fase 208 - Qualidade dos dados/);
  assert.match(futureSequence, /### Fase 210 - Relatorio executivo mensal/);
  assert.match(futureSequence, /### Fase 212 - Desempenho e manutencao tecnica/);
  assert.match(futureSequence, /- a Fase 204A esta em implementacao funcional e nao faz parte desta sequencia planejada;/);
  assert.match(futureSequence, /- a sequencia pode ser reordenada somente por risco encontrado na auditoria;/);
  assert.match(futureSequence, /- nenhuma dessas fases esta automaticamente autorizada;/);
  assert.match(futureSequence, /- cada fase exige objetivo, branch, PR, validacao e autorizacao;/);
  assert.match(futureSequence, /- nao existe Fase 199 funcional;/);
  assert.match(futureSequence, /- a Fase 200 foi redefinida por decisao explicita;/);
  assert.match(futureSequence, /- a sequencia futura planejada inclui 206, 208, 210 e 212\./);
  assert.equal(futureSequence.includes('### Fase 204 - Evolucao patrimonial'), false);
  assert.equal(futureSequence.includes('### Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo'), false);
  assert.equal(futureSequence.includes('- a sequencia pode ser reordenada somente por decisao explicita;'), false);

  assert.match(audit, /# Fase 204A - Dashboard executivo com destaques da carteira/);
  assert.match(audit, /## Objetivo/);
  assert.match(audit, /## Fonte oficial/);
  assert.match(audit, /## Regras de inclusao/);
  assert.match(audit, /## Regras de ordenacao/);
  assert.match(audit, /## Tratamento de zero e ausente/);
  assert.match(audit, /## Layout/);
  assert.match(audit, /## Acessibilidade/);
  assert.match(audit, /## Riscos/);
  assert.match(audit, /## Testes/);
  assert.match(audit, /## Rollback/);
  assert.match(audit, /## Conclusao Caveman/);
  assert.match(audit, /## Conclusao Impeccable/);
  assert.match(audit, /Destaques da carteira/);
  assert.match(audit, /Maiores altas/);
  assert.match(audit, /Maiores baixas/);
  assert.match(audit, /Ver todos/);
  assert.match(audit, /nao iniciar 204B, 204C, 206, 208, 210 ou 212/);
});
