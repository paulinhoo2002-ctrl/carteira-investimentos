const assert = require('node:assert/strict');

function extractCurrentStateSection(roadmap) {
  const startMarker = '## Estado e governanca';
  const endMarker = 'Base de referencia desta fase:';
  const start = roadmap.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir no roadmap`);
  const end = roadmap.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois do estado`);
  return roadmap.slice(start, end);
}

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
  const currentState = extractCurrentStateSection(roadmap);
  const phase202 = extractPhase202Section(roadmap);

  assert.match(currentState, /- fase atual: nenhuma;/);
  assert.match(currentState, /- branch atual: main;/);
  assert.match(currentState, /- SHA-base: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;/);
  assert.match(currentState, /- situacao: Fase 202 concluida e aguardando nova autorizacao;/);
  assert.match(currentState, /- PR atual: nenhuma;/);
  assert.match(currentState, /- implementacao ativa: nenhuma;/);
  assert.match(currentState, /- PR `#202` merged e closed \(encerramento funcional da fase 202\);/);
  assert.match(currentState, /- modo de merge: squash;/);
  assert.match(currentState, /- SHA final da Fase 202: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;/);
  assert.match(currentState, /- resultado: painel consolidado de desempenho dos ativos concluido;/);
  assert.match(currentState, /- nenhuma Fase 204 ativa;/);
  assert.match(currentState, /- PR `#200` merged e closed;/);
  assert.match(currentState, /- SHA final da Fase 200: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(currentState, /- resultado: refinamento confiavel da tela de Dividendos concluido;/);
  assert.match(currentState, /- correcao de 768px registrada como concluida;/);
  assert.match(currentState, /- nenhuma Fase 199 funcional;/);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('ciclo de modernizacao readonly encerrado'), false);
  assert.equal(currentState.includes('Fase 200 ativa'), false);
  assert.equal(currentState.includes('Fase 195'), false);

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
  assert.match(phase202, /## Conclusao funcional/);
  assert.match(phase202, /- nova area Ativos -> Desempenho;/);
  assert.match(phase202, /- melhores e piores ativos;/);
  assert.match(phase202, /- resultado em reais e percentual;/);
  assert.match(phase202, /- filtros por classe;/);
  assert.match(phase202, /- ordenacao;/);
  assert.match(phase202, /- dados insuficientes tratados explicitamente;/);
  assert.match(phase202, /- base completa exige valor atual e valor aplicado;/);
  assert.match(phase202, /- zero real preservado;/);
  assert.match(phase202, /- funcoes financeiras oficiais reutilizadas\./);
  assert.match(phase202, /## Riscos observados/);
  assert.match(phase202, /## Validacoes registradas/);
}

function assertPhase202FutureSequence(roadmap) {
  const section = extractFutureSequenceSection(roadmap);
  const expected = [
    '### Fase 204 - Evolucao patrimonial',
    '- objetivo: mostrar patrimonio por periodo, aportes, rendimentos e crescimento acumulado;',
    '- usar somente historico real disponivel;',
    '- nao inventar valores passados;',
    '- estado: planejada e nao autorizada.',
    '### Fase 206 - Metas financeiras',
    '- objetivo: acompanhar meta de R$ 1 milhao e renda passiva de R$ 4 mil mensais;',
    '- separar valores reais de projecoes;',
    '- nao misturar meta com simulacao;',
    '- estado: planejada e nao autorizada.',
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
    '- a sequencia pode ser reordenada somente por decisao explicita;',
    '- nenhuma dessas fases esta automaticamente autorizada;',
    '- cada fase exige objetivo, branch, PR, validacao e autorizacao;',
    '- nao existe Fase 199 funcional;',
    '- a Fase 200 foi redefinida por decisao explicita;',
    '- a sequencia futura planejada inclui 204, 206, 208, 210 e 212.',
  ];

  for (const line of expected) {
    assert.equal(section.includes(line), true, `Sequencia futura precisa conter: ${line}`);
  }
  assert.equal(section.includes('### Fase 202 - Painel consolidado de desempenho dos ativos'), false, 'Sequencia futura nao pode citar a Fase 202 ativa');
}

module.exports = {
  assertPhase202RoadmapClosed,
  assertPhase202FutureSequence,
};
