const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
  assert.match(currentState, /- SHA-base: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`;/);
  assert.match(currentState, /- situacao: Fase 208 concluida e aguardando nova autorizacao;/);
  assert.match(currentState, /- PR atual: nenhuma;/);
  assert.match(currentState, /- implementacao ativa: nenhuma;/);
  assert.match(currentState, /- nenhuma alteracao funcional autorizada;/);
  assert.match(currentState, /- PR `#205` merged e closed \(encerramento funcional da Fase 204A\);/);
  assert.match(currentState, /- PR `#207` merged e closed \(encerramento funcional da Fase 204B\);/);
  assert.match(currentState, /- modo de merge da Fase 204B: squash;/);
  assert.match(currentState, /- SHA final da Fase 204B: `06d921b78a9411a709726a8f4cad8725bcb56899`;/);
  assert.match(currentState, /- resultado: Historico mensal premium de dividendos concluido;/);
  assert.match(currentState, /- Fase 204A funcional e documentalmente concluida;/);
  assert.match(currentState, /- Fase 204B funcional e documentalmente encerrada;/);
  assert.match(currentState, /- PR `#209` merged e closed \(encerramento funcional da Fase 206\);/);
  assert.match(currentState, /- modo de merge da Fase 206: squash;/);
  assert.match(currentState, /- SHA final da Fase 206: `8225262a27bdfc4a58c526b2e7d8c113774f638b`;/);
  assert.match(currentState, /- resultado: acompanhamento de metas financeiras concluido;/);
  assert.match(currentState, /- Fases 204A, 204B e 206 funcional e documentalmente encerradas;/);
  assert.match(currentState, /- 204C, 210 e 212 nao autorizadas[.;]/);
  assert.match(currentState, /- nenhuma Fase 199 funcional;/);
  assert.match(currentState, /- Fase 196 concluida pela PR #196;/);
  assert.match(currentState, /- Fase 194 concluida pela PR #194;/);
  assert.match(currentState, /- uma branch por fase/);
  assert.match(currentState, /- uma PR por objetivo/);
  assert.match(currentState, /- Caveman: ativo/);
  assert.match(currentState, /- Impeccable: ativo/);
  assert.match(currentState, /- sem merge sem autorizacao/);
  assert.match(currentState, /- sem deploy manual/);
  assert.match(currentState, /- nao iniciar a fase seguinte antes de fechar a atual/);
  assert.match(currentState, /- preservacao de dados, schema, Firebase\/Auth e compatibilidade continua obrigatoria/);
  assert.match(currentState, /- `modern\/dist` fora do indice/);
  assert.match(currentState, /- Fases 210 e 212 continuam planejadas e nao autorizadas\./);
  assert.match(currentState, /- Fase 208 concluida e nao faz parte desta sequencia planejada\./);
  assert.match(currentState, /Qualquer proxima fase exige definicao de objetivo e autorizacao explicita\./);
  assert.equal(currentState.includes('card Destaques da carteira'), false);

  assert.match(baseRef, /- branch: main/);
  assert.match(baseRef, /- HEAD \/ `origin\/main`: `4c73ed85f1f602b89fc3f7fe1a42e3d34d0a2575`/);
  assert.match(baseRef, /- PR `#207`: merged e closed \(encerramento funcional da Fase 204B\)/);
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
  assert.match(futureSequence, /- a Fase 204B foi concluida e nao faz parte desta sequencia planejada;/);
  assert.match(futureSequence, /- a sequencia pode ser reordenada somente por risco encontrado na auditoria;/);
  assert.match(futureSequence, /- nenhuma dessas fases esta automaticamente autorizada;/);
  assert.match(futureSequence, /- cada fase exige objetivo, branch, PR, validacao e autorizacao;/);
  assert.match(futureSequence, /- nao existe Fase 199 funcional;/);
  assert.match(futureSequence, /- a Fase 200 foi redefinida por decisao explicita;/);
  assert.match(futureSequence, /- a Fase 206 foi concluida e nao faz parte desta sequencia planejada;/);
  assert.match(futureSequence, /- a Fase 208 foi concluida e nao faz parte desta sequencia planejada;/);
  assert.match(futureSequence, /- a sequencia futura planejada inclui 204C, 210 e 212\./);
  assert.equal(futureSequence.includes('- a sequencia futura planejada inclui 204C, 208, 210 e 212.'), false);
  assert.equal(futureSequence.includes('- a sequencia futura planejada inclui 204, 208, 210 e 212.'), false);
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

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const buffer = fs.readFileSync(filePath);

  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);

  const text = buffer.toString('utf8');
  assert.equal(text.includes('ï¿½'), false, `${relativePath} nao pode conter mojibake`);
  return text;
}

test('fase 204A fica documentariamente encerrada', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const documentation = readUtf8WithoutBom('docs/phase-204a-dashboard-highlights.md');

  assertRoadmap204AClosed(roadmap);
  assertPhase204ADocumentation(documentation);
  assert.match(
    roadmap,
    /\| 204A \| Dashboard executivo com destaques da carteira \| Concluida \| `#205` \| `8ab97be06a3b377c6fe1911cb42e2d57a6546275` \| `index\.html`, `docs\/phase-204a-dashboard-highlights\.md`, `tests\/phase-204a-dashboard-highlights\.test\.js`, `tests\/phase-204a-dashboard-highlights\.guard\.js` \| reutilizacao da base oficial da Fase 202 sem formula financeira nova \| destaques dependem da disponibilidade e completude dos dados atuais \| `git revert 8ab97be06a3b377c6fe1911cb42e2d57a6546275` \|/,
  );
  assert.match(
    roadmap,
    /\| 204B \| Historico mensal premium de dividendos \| Concluida \| `#207` \| `06d921b78a9411a709726a8f4cad8725bcb56899` \| `index\.html`, `docs\/phase-204b-monthly-income-history\.md`, `tests\/phase-204b-monthly-income-history\.test\.js`, `tests\/phase-204b-monthly-income-history\.guard\.js` \| consolidacao somente de proventos reais com data oficial nao futura, sem historico inventado \| contrato atual nao possui status persistido separado de previsto e recebido \| `git revert 06d921b78a9411a709726a8f4cad8725bcb56899` \|/,
  );
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- nenhuma alteracao funcional autorizada;/);
  assert.match(roadmap, /- 204C, 210 e 212 nao autorizadas[.;]/);
});

module.exports = {
  assertPhase204ADocumentation,
  assertRoadmap204AClosed,
};
