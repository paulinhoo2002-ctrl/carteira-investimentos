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

test('fase 204 fica registrada como auditoria documental', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const audit = read('docs/phase-204-evolution-audit.md');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-204-evolution-audit.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assert.equal(audit.startsWith('# Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo'), true);
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

  assert.match(phase204, /## 20\. Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo/);
  assert.match(phase204, /Objetivo:/);
  assert.match(phase204, /- auditar o historico real disponivel para evolucao patrimonial sem inventar snapshots retroativos;/);
  assert.match(phase204, /- separar o que pode ser mostrado agora no dashboard executivo usando apenas numeros oficiais;/);
  assert.match(phase204, /- classificar cada recurso entre implementavel agora, parcial, futuro ou nao recomendado;/);
  assert.match(phase204, /Estado final:/);
  assert.match(phase204, /- fase concluida;/);
  assert.match(phase204, /- branch original: `docs\/phase-204-evolution-audit`;/);
  assert.match(phase204, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(phase204, /- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(phase204, /- conclusao: apto com ressalvas;/);
  assert.match(phase204, /- risco residual principal: responsividade em 768px;/);
  assert.match(phase204, /Inventario resumido:/);
  assert.match(phase204, /- `patrimonySnapshot\(\)`: leitura estimada a partir do estado atual e dos aportes, nao historico patrimonial verificado\./);
  assert.match(phase204, /Classificacao tecnica:/);
  assert.match(phase204, /- A: resumo patrimonial atual, composicao por classe, melhores e piores ativos, renda passiva atual, renda fixa atual;/);
  assert.match(phase204, /- B: leituras parciais a partir de eventos com data, como aportes, proventos e movimentacoes de renda fixa;/);
  assert.match(phase204, /- C: coleta de snapshots daqui para frente, sem preenchimento retroativo;/);
  assert.match(phase204, /- D: reconstruir patrimonio historico completo sem snapshots ou inventar valores passados\./);
  assert.match(phase204, /Conclusao tecnica:/);
  assert.match(phase204, /- recomendacao: Opcao 4 - adiar o grafico patrimonial;/);
  assert.match(phase204, /- primeiro passo seguro: dashboard executivo com numeros oficiais atuais;/);
  assert.match(phase204, /- segundo passo seguro: historico mensal premium com dados reais ja registrados;/);
  assert.match(phase204, /- terceiro passo possivel: evolucao patrimonial somente se uma coleta de snapshots for autorizada[.;]/);
  assert.match(phase204, /Proposta de PRs futuras:/);
  assert.match(phase204, /- PR funcional 204A - Dashboard executivo:/);
  assert.match(phase204, /- PR funcional 204B - Historico mensal premium:/);
  assert.match(phase204, /- PR funcional 204C - Evolucao patrimonial:/);
  assert.match(phase204, /- nenhuma implementacao funcional nesta fase;/);
  assert.match(phase204, /- nenhuma formula financeira nova;/);
  assert.match(phase204, /- nenhum schema novo;/);
  assert.match(phase204, /Conclusao Caveman:/);
  assert.match(phase204, /Conclusao Impeccable:/);
  assert.match(phase204, /UTF-8 sem BOM e sem mojibake\./);

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
  assert.match(futureSequence, /- a sequencia futura planejada inclui 206, 208, 210 e 212\./);
  assert.match(futureSequence, /- a sequencia pode ser reordenada somente por risco encontrado na auditoria;/);
  assert.match(futureSequence, /- nenhuma dessas fases esta automaticamente autorizada;/);
  assert.match(futureSequence, /- cada fase exige objetivo, branch, PR, validacao e autorizacao;/);
  assert.match(futureSequence, /- nao existe Fase 199 funcional;/);
  assert.match(futureSequence, /- a Fase 200 foi redefinida por decisao explicita;/);
  assert.equal(futureSequence.includes('### Fase 204 - Evolucao patrimonial'), false, 'Fase 204 nao pode voltar para a sequencia futura');
  assert.equal(futureSequence.includes('### Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo'), false, 'Fase 204 nao deve aparecer como fase futura nesta secao');
  assert.equal(futureSequence.includes('- a sequencia pode ser reordenada somente por decisao explicita;'), false, 'regra antiga nao pode voltar');

  assert.match(audit, /# Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo/);
  assert.match(audit, /## Resumo executivo/);
  assert.match(audit, /## Estado-base/);
  assert.match(audit, /## Inventario dos dados/);
  assert.match(audit, /## Fontes oficiais/);
  assert.match(audit, /## Historico disponivel/);
  assert.match(audit, /## Limitacoes/);
  assert.match(audit, /## Classificacao A\/B\/C\/D/);
  assert.match(audit, /## Riscos/);
  assert.match(audit, /## Proposta visual/);
  assert.match(audit, /## Recomendacao tecnica/);
  assert.match(audit, /## Sequencia de PRs futuras/);
  assert.match(audit, /## Critérios de aceite/);
  assert.match(audit, /## Rollback/);
  assert.match(audit, /## Conclusao Caveman/);
  assert.match(audit, /## Conclusao Impeccable/);
  assert.match(audit, /Opcao 4 - adiar o grafico patrimonial/);
  assert.match(audit, /204A - Dashboard executivo/);
  assert.match(audit, /204B - Historico mensal premium/);
  assert.match(audit, /204C - Evolucao patrimonial/);
});
