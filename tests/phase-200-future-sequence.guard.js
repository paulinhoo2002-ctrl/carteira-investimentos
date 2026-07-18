const assert = require('node:assert/strict');
const { assertRoadmap204AClosed } = require('./phase-204a-documentary-closure.guard');

function extractSequenceSection(roadmap) {
  const startMarker = '## 11. Sequencia planejada apos a Fase 202';
  const endMarker = '## 12. Radar estrategico - mudancas de alto impacto';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois da sequencia`);
  return roadmap.slice(start, end);
}

function extractPhase200Section(roadmap) {
  const startMarker = '## 18. Fase 200 - refinamento confiavel da tela de Dividendos';
  const nextMarker = '## 19.';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const next = roadmap.indexOf(nextMarker, start + startMarker.length);
  return next > start ? roadmap.slice(start, next) : roadmap.slice(start);
}

function assertPhase200RoadmapClosed(roadmap) {
  const phase200 = extractPhase200Section(roadmap);
  assertRoadmap204AClosed(roadmap);

  assert.match(phase200, /Estado final:/);
  assert.match(phase200, /- fase concluida;/);
  assert.match(phase200, /- branch original: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(phase200, /- PR: `#200`;/);
  assert.match(phase200, /- modo: squash;/);
  assert.match(phase200, /- SHA final: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(phase200, /- implementacao ativa: nenhuma;/);
  assert.match(phase200, /- resultado: concluido;/);
  assert.match(phase200, /- nenhuma formula financeira nova;/);
  assert.match(phase200, /- nenhuma alteracao de schema;/);
  assert.match(phase200, /- nenhuma dependencia nova;/);
  assert.match(phase200, /- nenhuma Fase 202 iniciada\./);
  assert.match(phase200, /Redefinicao autorizada:/);
  assert.match(phase200, /- esta fase foi redefinida por decisao explicita;/);
  assert.match(phase200, /- o objetivo anterior de painel consolidado de desempenho dos ativos nao foi cancelado;/);
  assert.match(phase200, /- esse objetivo foi movido para a Fase 202, ainda nao autorizada;/);
  assert.match(phase200, /- nenhuma funcionalidade de desempenho de ativos foi iniciada;/);
  assert.match(phase200, /Conclusao:/);
  assert.match(phase200, /- refinamento confiavel da tela de Dividendos concluido;/);
  assert.match(phase200, /- correcao de 768px registrada como concluida;/);
  assert.match(phase200, /- nenhuma Fase 202 ativa\./);
}

function assertPhase200FutureSequence(roadmap) {
  const section = extractSequenceSection(roadmap);
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
    '- a Fase 206 foi concluida e nao faz parte desta sequencia planejada;',
    '- a sequencia futura planejada inclui 204, 208, 210 e 212.',
    '- a Fase 200 foi redefinida por decisao explicita;',
    '- o painel consolidado de desempenho dos ativos foi movido para a Fase 202;',
  ];

  for (const line of expected) {
    assert.equal(section.includes(line), true, `Sequencia futura precisa conter: ${line}`);
  }
  assert.equal(section.includes('### Fase 204 - Evolucao patrimonial'), false, 'Sequencia futura nao pode manter a Fase 204 como planejada');
  assert.equal(section.includes('### Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo'), false, 'Sequencia futura nao pode citar a Fase 204 atual');
  assert.equal(section.includes('- a sequencia pode ser reordenada somente por decisao explicita;'), false, 'Sequencia futura nao pode usar a regra antiga');
}

module.exports = {
  assertPhase200RoadmapClosed,
  assertPhase200FutureSequence,
};
