# IR2026 — Fundação fiscal local (LEGACY)

Módulo local-only do domínio fiscal de 2026. Nenhuma escrita hospedada; dados
reais permanecem em `.qa-state/` (gitignored); o repo público carrega apenas
schema, engine, fixtures sintéticas, testes e metadados de certificação não
sensíveis.

## Contratos centrais

- `FISCAL_START_YEAR=2026`; 2019–2025 = HISTORICAL_ANALYTICAL (suporte), nunca base fiscal completa.
- `CURRENT_AVG_COST != FISCAL_COST`; `FIFO != FISCAL_LEDGER`; `UNKNOWN != ZERO`;
  `PARTIAL != COMPLETE`; `EXPECTED != RECEIVED`.
- Custo médio ponderado por ativo RV (regra versionada, `NEEDS_CURRENT_LEGAL_SOURCE`);
  RF é por instrumento (fluxo de caixa), nunca custo médio agregado.
- Transfers nunca realizam resultado; custo sem continuidade documentada fica `FISCAL_COST_UNKNOWN`.
- Evento `UNKNOWN` carrega impacto declarado (`AFFECTS_*`), nunca bloqueia tudo.
- `TAX_DUE=NOT_CALCULATED` até regras legais certificadas + abertura oficial.

## Abertura fiscal (OPENING_FISCAL_2026_V1)

`ir2026/scripts/build-opening-v1.js` reconstrói a posição/custo de 31/12/2025
por replay determinístico da janela completa do export oficial de movimentações
(2019-11 → 2025-12-31) usando a mesma engine certificada do ledger
(`opening-fiscal.js` + `tax-ledger.js`), e produz:

- **View DERIVED** (reconciliação): qty/custo por ativo com classificação de
  evidência `DERIVED` (replay limpo, sem flags), `PARTIAL` (replay com eventos
  desconhecidos/transfers/corporate parciais), `UNKNOWN` (posição anterior à
  cobertura do export → `MISSING_OPENING_EVIDENCE`, nunca zero, nunca sintética),
  `NOT_APPLICABLE` (encerrado antes de 2026). Nada é `CERTIFIED`: não existe
  documento oficial de posição/custo de 31/12/2025.
- **Matriz forense das 61 vendas de 2026**: por venda, estado anterior (qty/custo
  fiscal), custo removido e resultado **SIMULATED_DERIVED** apenas quando o custo
  é derivado-limpo; resultado autoritativo permanece nulo (P6/P19).
- **Detecção determinística de day trade** (`day-trade.js`): compra+venda do
  mesmo ativo no mesmo dia (granularidade diária do export); classificação por
  relação de eventos, nunca por descrição. Overlay `CORP_DAY_TRADE` da engine
  continua autoritativo.
- **Inventário de evidência**: taxas (não itemizadas no export — valores são de
  liquidação), IRRF (0 linhas — ausência ≠ zero), perdas anteriores (UNKNOWN:
  cobertura pré-2019-11 ausente + sem declaração anterior evidenciada).
- Artefato privado: `.qa-state/ir2026/opening-evidence/opening-fiscal-2026-v1.json`
  (hash determinístico, rodado 2×). Resumo público não sensível:
  `ir2026/opening-v1-summary.json`.

A view conservativa do produto (`conservativeOpening` em
`scripts/build-fiscal-2026.js` → dry-run) permanece intocada: custo UNKNOWN até
haver documento oficial. A view DERIVED nunca a substitui.

## Evidência que desbloquearia CERTIFIED

1. Posição/custo oficial de 31/12/2025 (informe de rendimentos da corretora,
   extrato anual com custo de aquisição por ativo).
2. Informe com prejuízos acumulados a compensar (por bucket).
3. Extrato/relatório de IRRF por operação/mês.
4. Taxas de corretagem/B3 itemizadas por operação.

## Cobertura atual (metadados, sem valores)

Ver `opening-v1-summary.json` (gerado pelo runner). Held candidates 32:
DERIVED 7, PARTIAL 20, UNKNOWN 5; custo com valor derivado 84,38%
(limpo 21,88%). Vendas 2026: 61 total, 11 DERIVED_SIMULATION, 50 BLOCKED.
