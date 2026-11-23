'use strict';
// Diferenças intencionais de tokens do golden. Cada mudança declara a contagem EXATA de partida (from)
// e de chegada (to) de um token em um estado/rota. Se a contagem real de partida não bater com `from`,
// a diferença é recusada: nenhuma remoção acontece "por ocorrência" sem verificação.
function applyTokenChanges(tokens, changes, label) {
  const out = [...tokens];
  for (const change of changes) {
    const count = out.filter(token => token === change.token).length;
    if (count !== change.from) {
      throw new Error(`${label}: "${change.token}" tem ${count} ocorrência(s), mas a diferença ${change.id || ''} declara from=${change.from}`);
    }
    const delta = change.to - change.from;
    if (delta < 0) {
      for (let i = 0; i < -delta; i += 1) out.splice(out.indexOf(change.token), 1);
    } else {
      for (let i = 0; i < delta; i += 1) out.push(change.token);
    }
  }
  return out.sort();
}

// Constrói a lista esperada de uma rota: referência + acréscimos aprovados + mudanças declaradas (ordem do golden).
function expectedRouteTokens(golden, state, route) {
  const key = `${state}/${route}`;
  const additions = [];
  const changes = [];
  golden.intentionalDifferences.forEach(item => {
    (item.tokenAdditions || []).forEach(entry => {
      if (`${entry.state}/${entry.route}` === key) additions.push(...entry.tokens);
    });
    (item.tokenChanges || []).forEach(entry => {
      if (`${entry.state}/${entry.route}` === key) changes.push({ ...entry, id: item.id });
    });
  });
  const base = [...golden.expected[state].routeTokens[route], ...additions].sort();
  return applyTokenChanges(base, changes, key);
}

module.exports = { applyTokenChanges, expectedRouteTokens };
