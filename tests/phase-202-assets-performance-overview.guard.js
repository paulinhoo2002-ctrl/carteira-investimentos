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

function assertPhase202RoadmapOpen(roadmap) {
  const currentState = extractCurrentStateSection(roadmap);
  const phase202 = extractPhase202Section(roadmap);

  assert.match(currentState, /- fase atual: 202;/);
  assert.match(currentState, /- branch atual: `feat\/phase-202-assets-performance-overview`;/);
  assert.match(currentState, /- SHA-base: `9cb53a259dbafefe92704f976c31264698651a09`;/);
  assert.match(currentState, /- situacao: Fase 202 em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: painel consolidado de desempenho dos ativos;/);
  assert.match(currentState, /- PR `#200` merged e closed;/);
  assert.match(currentState, /- SHA final da Fase 200: `3c784714265505efa763e624bbaf8bacaa467ba0`;/);
  assert.match(currentState, /- resultado: refinamento confiavel da tela de Dividendos concluido;/);
  assert.match(currentState, /- correcao de 768px registrada como concluida;/);
  assert.match(currentState, /- nenhuma Fase 199 funcional;/);
  assert.match(currentState, /- nenhuma Fase 204 ativa[.;]/);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);

  assert.match(phase202, /## 19\. Fase 202 - Painel consolidado de desempenho dos ativos/);
  assert.match(phase202, /- fase atual: 202;/);
  assert.match(phase202, /- nome da fase: Painel consolidado de desempenho dos ativos;/);
  assert.match(phase202, /- branch original: `feat\/phase-202-assets-performance-overview`;/);
  assert.match(phase202, /- SHA-base: `9cb53a259dbafefe92704f976c31264698651a09`;/);
  assert.match(phase202, /- situacao: em desenvolvimento;/);
  assert.match(phase202, /- PR atual: pendente;/);
  assert.match(phase202, /- implementacao ativa: painel consolidado de desempenho dos ativos;/);
  assert.match(phase202, /- nenhuma Fase 204 ativa[.;]/);
  assert.match(phase202, /- leitura consolidada de desempenho;/);
  assert.match(phase202, /- comparacao rapida entre ativos;/);
  assert.match(phase202, /- explicabilidade sobre fonte oficial, dados suficientes e zero versus ausente;/);
  assert.match(phase202, /- responsividade em 390px, 768px, 1366px e 1920px;/);
  assert.match(phase202, /- sem nova formula financeira\./);
  assert.match(phase202, /- duplicar calculos oficiais;/);
  assert.match(phase202, /- inventar cotacao, preco medio ou patrimonio;/);
  assert.match(phase202, /- alterar schema, Firebase\/Auth, storage ou dependencias;/);
  assert.match(phase202, /- iniciar a Fase 204\./);
  assert.match(phase202, /- reverter os commits da fase e remover os documentos criados por ela\./);
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
    '- a sequencia pode ser reordenada somente por risco encontrado na auditoria;',
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
  assertPhase202RoadmapOpen,
  assertPhase202FutureSequence,
};
