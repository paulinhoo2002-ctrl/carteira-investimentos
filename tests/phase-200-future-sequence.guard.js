const assert = require('node:assert/strict');

function extractSequenceSection(roadmap) {
  const startMarker = '## 11. Sequencia planejada apos a Fase 200';
  const endMarker = '## 12. Radar estrategico - mudancas de alto impacto';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois da sequencia`);
  return roadmap.slice(start, end);
}

function extractCurrentStateSection(roadmap) {
  const startMarker = '## Estado e governanca';
  const endMarker = 'Base de referencia desta fase:';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois do estado`);
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
  const currentState = extractCurrentStateSection(roadmap);
  const phase200 = extractPhase200Section(roadmap);

  assert.match(currentState, /- fase atual: nenhuma;/);
  assert.match(currentState, /- branch atual: main;/);
  assert.match(currentState, /- SHA-base: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(currentState, /- situacao: Fase 200 concluida e aguardando nova autorizacao;/);
  assert.match(currentState, /- PR atual: nenhuma;/);
  assert.match(currentState, /- implementacao ativa: nenhuma;/);
  assert.match(currentState, /- PR `#200` merged e closed;/);
  assert.match(currentState, /- SHA final da Fase 200: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(currentState, /- resultado: refinamento confiavel da tela de Dividendos concluido;/);
  assert.match(currentState, /- correcao de 768px registrada como concluida;/);
  assert.match(currentState, /- nenhuma Fase 202 ativa\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('fase atual: 200;'), false, 'Estado atual nao pode ficar em desenvolvimento');
  assert.equal(currentState.includes('PR atual: pendente;'), false, 'Estado atual nao pode ficar com PR pendente');
  assert.equal(currentState.includes('implementacao ativa: refinamento confiavel da tela de Dividendos;'), false, 'Estado atual nao pode manter implementacao ativa');

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
    '### Fase 202 — Painel consolidado de desempenho dos ativos',
    '- objetivo: mostrar melhores e piores ativos;',
    '- resultado em reais e percentual;',
    '- filtros por classe;',
    '- ordenacao;',
    '- usar somente numeros oficiais existentes;',
    '- nao duplicar calculos financeiros;',
    '- estado: planejada e nao autorizada.',
    '### Fase 204 — Evolução patrimonial',
    '- objetivo: mostrar patrimonio por periodo, aportes, rendimentos e crescimento acumulado;',
    '- usar somente historico real disponivel;',
    '- nao inventar valores passados;',
    '- estado: planejada e nao autorizada.',
    '### Fase 206 — Metas financeiras',
    '- objetivo: acompanhar meta de R$ 1 milhao e renda passiva de R$ 4 mil mensais;',
    '- separar valores reais de projecoes;',
    '- nao misturar meta com simulacao;',
    '- estado: planejada e nao autorizada.',
    '### Fase 208 — Qualidade dos dados',
    '- objetivo: localizar registros incompletos, duplicados ou inconsistentes;',
    '- diferenciar zero de ausente;',
    '- nao corrigir automaticamente;',
    '- estado: planejada e nao autorizada.',
    '### Fase 210 — Relatório executivo mensal',
    '- objetivo: consolidar patrimonio, aportes, dividendos, distribuicao, desempenho e metas;',
    '- permitir impressao ou PDF;',
    '- preservar as fontes oficiais dos calculos;',
    '- estado: planejada e nao autorizada.',
    '### Fase 212 — Desempenho e manutenção técnica',
    '- objetivo: melhorar desempenho e manutencao;',
    '- revisar cache e service worker;',
    '- reduzir complexidade desnecessaria;',
    '- evitar reescrita ampla sem beneficio comprovado;',
    '- estado: planejada e nao autorizada.',
    '- a Fase 200 foi redefinida por decisao explicita;',
    '- o painel consolidado de desempenho dos ativos foi movido para a Fase 202;',
    '- a sequencia futura planejada inclui 202, 204, 206, 208, 210 e 212.',
  ];

  for (const line of expected) {
    assert.equal(section.includes(line), true, `Sequencia futura precisa conter: ${line}`);
  }
}

module.exports = {
  assertPhase200RoadmapClosed,
  assertPhase200FutureSequence,
};
