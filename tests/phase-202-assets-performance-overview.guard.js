const assert = require('node:assert/strict');
const { assertRoadmap204AClosed } = require('./phase-204a-documentary-closure.guard');

function extractPhase202Section(roadmap) {
  const startMarker = '## 19. Fase 202 - Painel consolidado de desempenho dos ativos';
  const endMarker = '## 11. Sequencia planejada apos a Fase 202';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois da Fase 202`);
  return roadmap.slice(start, end);
}

function extractFutureSequenceSection(roadmap) {
  const startMarker = '## 11. Sequencia planejada apos a Fase 202';
  const endMarker = '## 12. Radar estrategico - mudancas de alto impacto';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois da sequencia`);
  return roadmap.slice(start, end);
}

function assertPhase202RoadmapClosed(roadmap) {
  const phase202 = extractPhase202Section(roadmap);
  assertRoadmap204AClosed(roadmap);

  assert.match(phase202, /## 19\. Fase 202 - Painel consolidado de desempenho dos ativos/);
  assert.match(phase202, /Estado final:/);
  assert.match(phase202, /- fase concluida;/);
  assert.match(phase202, /- branch original: `feat\/phase-202-assets-performance-overview`;/);
  assert.match(phase202, /- PR: `#202`;/);
  assert.match(phase202, /- modo: squash;/);
  assert.match(phase202, /- SHA final: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;/);
  assert.match(phase202, /- implementacao ativa: nenhuma;/);
  assert.match(phase202, /- nenhuma formula financeira nova;/);
  assert.match(phase202, /- nenhuma alteracao de schema;/);
  assert.match(phase202, /- nenhuma dependencia nova;/);
  assert.match(phase202, /- shell moderno readonly;/);
  assert.match(phase202, /- Fase 204 nao iniciada\./);
  assert.match(phase202, /^### Conclusão funcional$/m);
  assert.equal(/^## Conclusão funcional$/m.test(phase202), false, 'Conclusão funcional nao pode voltar para nivel 2');
  assert.match(phase202, /- nova area Ativos -> Desempenho;/);
  assert.match(phase202, /- melhores e piores ativos;/);
  assert.match(phase202, /- resultado em reais e percentual;/);
  assert.match(phase202, /- filtros por classe;/);
  assert.match(phase202, /- ordenacao;/);
  assert.match(phase202, /- dados insuficientes tratados explicitamente;/);
  assert.match(phase202, /- base completa exige valor atual e valor aplicado;/);
  assert.match(phase202, /- zero real preservado;/);
  assert.match(phase202, /- funcoes financeiras oficiais reutilizadas\./);
  assert.match(phase202, /^### Riscos observados$/m);
  assert.equal(/^## Riscos observados$/m.test(phase202), false, 'Riscos observados nao pode voltar para nivel 2');
  assert.match(phase202, /^### Validações registradas$/m);
  assert.equal(/^## Validações registradas$/m.test(phase202), false, 'Validações registradas nao pode voltar para nivel 2');
}

function assertPhase202FutureSequence(roadmap) {
  const section = extractFutureSequenceSection(roadmap);
  const expected = [
    '### Fase 208 - Qualidade dos dados',
    '- objetivo: localizar registros incompletos, duplicados ou inconsistentes;',
    '- diferenciar zero de ausente;',
    '- nao corrigir automaticamente;',
    '- estado: planejada e nao autorizada.',
    '### Fase 210 - Relatorio executivo mensal',
    '- objetivo: consolidar patrimonio, aportes, dividendos, distribuicao, desempenho e metas;',
    '- permitir impressao ou PDF;',
    '- preservar as fontes oficiais dos calculos;',
    '- estado: planejada e nao autorizada.',
    '### Fase 212 - Desempenho e manutencao tecnica',
    '- objetivo: melhorar desempenho e manutencao;',
    '- revisar cache e service worker;',
    '- reduzir complexidade desnecessaria;',
    '- evitar reescrita ampla sem beneficio comprovado;',
    '- estado: planejada e nao autorizada.',
    '- a Fase 204A foi concluida e nao faz parte desta sequencia planejada;',
    '- a sequencia pode ser reordenada somente por risco encontrado na auditoria;',
    '- nenhuma dessas fases esta automaticamente autorizada;',
    '- cada fase exige objetivo, branch, PR, validacao e autorizacao;',
    '- nao existe Fase 199 funcional;',
    '- a Fase 200 foi redefinida por decisao explicita;',
    '- a Fase 206 esta em desenvolvimento e nao faz parte desta sequencia planejada;',
    '- a sequencia futura planejada inclui 208, 210 e 212.',
  ];

  for (const line of expected) {
    assert.equal(section.includes(line), true, `Sequencia futura precisa conter: ${line}`);
  }
  assert.equal(section.includes('### Fase 202 - Painel consolidado de desempenho dos ativos'), false, 'Sequencia futura nao pode citar a Fase 202 ativa');
  assert.equal(section.includes('### Fase 204 - Evolucao patrimonial'), false, 'Sequencia futura nao pode manter a Fase 204 como planejada');
  assert.equal(section.includes('### Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo'), false, 'Sequencia futura nao pode citar a Fase 204 atual');
  assert.equal(section.includes('- a sequencia pode ser reordenada somente por decisao explicita;'), false, 'Sequencia futura nao pode usar a regra antiga');
}

module.exports = {
  assertPhase202RoadmapClosed,
  assertPhase202FutureSequence,
};
