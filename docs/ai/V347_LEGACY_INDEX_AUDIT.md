# V347 — Auditoria do index.html antigo (G:) — matriz KEEP / ADAPT / DO_NOT_COPY

Versão: v1 · 2026-10-09 · Fonte: `G:\Meu Drive\Codex\carteira-investimentos` @ `f838451` (clone do mesmo repositório, mesmo HEAD do checkout canônico) comparado com `origin/main` `6eb69f2`.

Método: `git diff f838451 origin/main` no clone em G: (leitura apenas). O delta total é 751 inserções/324 remoções em `index.html` + 54 arquivos de testes/docs.

## Matriz

### KEEP (já presente na main — nada a fazer)

- Resumo por classe de Ativos com accordion `assets-premium-*`, tabela densa desktop e cards mobile (V330+).
- Painel de insights prioritários do Dashboard (substituto V329 do antigo highlights genérico).
- Cobertura de confiança `dataTrustCoverageRow` — a main é **melhor**: distingue `UNKNOWN` explícito quando não há leitura de cobertura (o antigo podia exibir `0%` de cobertura calculada com `coverageCount==null` → agora fail-closed).
- `assetPremiumSection` — a main é **melhor**: recebe estado `expanded` explícito em vez de sniffar `matchMedia` no render (o antigo podia dessincronizar ao girar o device sem re-render).
- Rótulos de sinal de contribuição (`signalLabels` na main) mais claros que o texto cru antigo.
- Ordenação/contagem `—` para valores indisponíveis em toda a UI premium.

### ADAPT (boa ideia antiga ausente da main — candidata a reaplicação controlada)

1. **Painel "Melhores/Piores ativos" no Dashboard com filtro por classe** (`dashboard-highlight-column`, `dashboardHighlightsRows(kind, classFilter)` com chips Ação/FII/ETF).
   - Estado atual: `dashboardHighlightsRows` existe na main e é consumido por `generateOverviewAnalysis`, mas o **painel visual com colunas lado a lado e filtro por classe foi removido**; Melhores/Piores sobrevivem só em Ativos (perf cards) e no texto de overview.
   - Proposta: reapresentar as duas colunas top-5 no Dashboard usando o `dashboardHighlightsRows` atual (mesma fonte financeira), com chips de classe reaproveitados dos filtros de Ativos. Sem nenhuma fórmula nova.
   - Prioridade: média (UX de uso diário; o usuário aprovou densidade histórica).
2. **Abas de análise por ranking** (`assetRankingModeLabel`: Maiores posições / Concentração crítica / Melhores / Piores / Oportunidades) — a main mantém os modos; verificar se todos os cinco continuam navegáveis na UI (auditar em V348).

### DO_NOT_COPY (antigo pior/obsoleto — não reintroduzir)

- `dataTrustCoverageRow` antigo: `Math.round(coverage)` quando `coverageCount` ausente podia sugerir cobertura numérica de leitura incompleta — a main já corrige com `UNKNOWN` explícito.
- `assetPremiumSection` antigo com `matchMedia` no render — estado derivado de viewport dentro do render é fonte de dessincronia.
- Qualquer fórmula/estado do clone em G: cujo equivalente main já migrou para helpers canônicos (FinanceCore, PortfolioDataTrust) — o clone está 2 versões de estágio atrás da main (não contém V330/V333/V336).
- Nenhum acesso Firebase/config do clone deve ser copiado — idêntico ao main na parte antiga, mas sem os hardenings V332+ do boot sintético.

## Conclusão

Nada a reaplicar com urgência. O único ADAPT acionável é o painel de Melhores/Piores com filtro por classe no Dashboard (V348/V349), reutilizando código existente da main. Nenhum DO_NOT_COPY bloqueia o produto atual.

`READ_ONLY=true` · nenhum arquivo de G: foi alterado · nenhuma fórmula antiga copiada.
