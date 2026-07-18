const assert = require('node:assert/strict');

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

function assertRoadmap204AClosed(roadmap) {
  const currentState = extractSection(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  const baseRef = extractSection(roadmap, 'Base de referencia desta fase:', '## 1. Historico confirmado das fases readonly');
  const phase204a = extractSection(roadmap, '## 21. Fase 204A - Dashboard executivo com destaques da carteira', '## 11. Sequencia planejada apos a Fase 202');
  const futureSequence = extractSection(roadmap, '## 11. Sequencia planejada apos a Fase 202', '## 12. Radar estrategico - mudancas de alto impacto');

  assert.match(currentState, /- fase atual: nenhuma;/);
  assert.match(currentState, /- nome: nenhuma;/);
  assert.match(currentState, /- branch atual: main;/);
  assert.match(currentState, /- SHA-base: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;/);
  assert.match(currentState, /- situacao: Fase 204A concluida e aguardando nova autorizacao;/);
  assert.match(currentState, /- PR atual: nenhuma;/);
  assert.match(currentState, /- implementacao ativa: nenhuma;/);
  assert.match(currentState, /- nenhuma alteracao funcional autorizada;/);
  assert.match(currentState, /- PR `#205` merged e closed \(encerramento funcional da Fase 204A\);/);
  assert.match(currentState, /- modo de merge: squash;/);
  assert.match(currentState, /- SHA final da Fase 204A: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;/);
  assert.match(currentState, /- resultado: Dashboard executivo com Destaques da carteira concluido;/);
  assert.match(currentState, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(currentState, /- Fase 204 documental concluida;/);
  assert.match(currentState, /- Fase 204A funcional concluida;/);
  assert.match(currentState, /- 204B, 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);
  assert.match(currentState, /- Fases 206, 208, 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('card Destaques da carteira'), false);

  assert.match(baseRef, /- branch: main/);
  assert.match(baseRef, /- HEAD \/ `origin\/main`: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`/);
  assert.match(baseRef, /- PR `#205`: merged e closed \(encerramento funcional da Fase 204A\)/);
  assert.match(baseRef, /- PR `#204`: merged e closed \(encerramento documental da fase 204\)/);
  assert.match(baseRef, /- workspace: limpo apos o merge/);
  assert.match(baseRef, /- modern\/dist fora do indice/);

  assert.match(phase204a, /Estado final:/);
  assert.match(phase204a, /- fase concluida;/);
  assert.match(phase204a, /- branch original: `feat\/phase-204a-dashboard-highlights`;/);
  assert.match(phase204a, /- SHA-base: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(phase204a, /- PR `#205` merged e closed;/);
  assert.match(phase204a, /- modo: squash;/);
  assert.match(phase204a, /- SHA final: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;/);
  assert.match(phase204a, /- titulo: `feat: cria destaques da carteira no dashboard`;/);
  assert.match(phase204a, /- nenhuma implementacao ativa;/);
  assert.match(phase204a, /- nenhuma formula financeira nova;/);
  assert.match(phase204a, /- nenhum schema novo;/);
  assert.match(phase204a, /- nenhum deploy manual;/);
  assert.match(phase204a, /- 204B, 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);
  assert.match(phase204a, /Resultado final:/);
  assert.match(phase204a, /- card Destaques da carteira integrado;/);
  assert.match(phase204a, /- Maiores altas e Maiores baixas;/);
  assert.match(phase204a, /- tres ativos por aba;/);
  assert.match(phase204a, /- Ver todos abre Ativos -> Desempenho;/);
  assert.match(phase204a, /- dados oficiais da Fase 202 reutilizados;/);
  assert.match(phase204a, /- zero e ausente preservados;/);
  assert.match(phase204a, /- base incompleta fora do ranking;/);
  assert.match(phase204a, /- 390px e 768px empilhados sem overflow;/);
  assert.match(phase204a, /- 1366px e 1920px lado a lado;/);
  assert.match(phase204a, /- shell moderno readonly preservado[.;]/);
  assert.match(phase204a, /Rollback:/);
  assert.match(phase204a, /git revert `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;/);

  assert.match(futureSequence, /- a Fase 204A foi concluida e nao faz parte desta sequencia planejada;/);
  assert.equal(futureSequence.includes('- a Fase 204A esta em implementacao funcional e nao faz parte desta sequencia planejada;'), false);
  assert.match(futureSequence, /- a sequencia pode ser reordenada somente por risco encontrado na auditoria;/);
  assert.match(futureSequence, /- nenhuma dessas fases esta automaticamente autorizada;/);
  assert.match(futureSequence, /- cada fase exige objetivo, branch, PR, validacao e autorizacao;/);
  assert.match(futureSequence, /- nao existe Fase 199 funcional;/);
  assert.match(futureSequence, /- a Fase 200 foi redefinida por decisao explicita;/);
  assert.match(futureSequence, /- a sequencia futura planejada inclui 206, 208, 210 e 212\./);
  assert.equal(futureSequence.includes('### Fase 204A - Dashboard executivo com destaques da carteira'), false);
}

function assertPhase204ADocumentation(audit) {
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
  assert.match(audit, /## Encerramento/);
  assert.match(audit, /PR `#205`;/);
  assert.match(audit, /titulo: `feat: cria destaques da carteira no dashboard`;/);
  assert.match(audit, /modo: squash;/);
  assert.match(audit, /SHA final: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;/);
  assert.match(audit, /data do encerramento: `2026-07-18`;/);
  assert.match(audit, /validacao visual concluida em 390px, 768px, 1366px e 1920px;/);
  assert.match(audit, /rollback: `git revert 8ab97be06a3b377c6fe1911cb42e2d57a6546275`;/);
  assert.match(audit, /204B nao iniciada\./);
}

module.exports = {
  assertPhase204ADocumentation,
  assertRoadmap204AClosed,
};
