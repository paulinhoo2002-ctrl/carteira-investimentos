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

function assertPhase200FutureSequence(roadmap) {
  const section = extractSequenceSection(roadmap);
  const expected = [
    '### Fase 202 - Painel consolidado de desempenho dos ativos',
    '- objetivo: mostrar melhores e piores ativos;',
    '- resultado em reais e percentual;',
    '- filtros por classe;',
    '- ordenacao;',
    '- usar somente numeros oficiais existentes;',
    '- nao duplicar calculos financeiros;',
    '- estado: planejada e nao autorizada.',
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
    '- a Fase 200 foi redefinida por decisao explicita;',
    '- o painel consolidado de desempenho dos ativos foi movido para a Fase 202;',
    '- a sequencia futura planejada inclui 202, 204, 206, 208, 210 e 212.',
  ];

  for (const line of expected) {
    assert.equal(section.includes(line), true, `Sequencia futura precisa conter: ${line}`);
  }
}

module.exports = {
  assertPhase200FutureSequence,
};
