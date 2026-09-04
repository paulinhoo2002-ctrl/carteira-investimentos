# Project State

Snapshot date: 2026-09-03

## Identity

- Repository: `paulinhoo2002-ctrl/carteira-investimentos`
- Workspace: `C:\Projetos\carteira-investimentos`
- Authoritative product: personal investment portfolio control application.
- Architecture: legacy SPA plus an isolated modern readonly host.
- This repository is independent from `C:\Projetos\carteira-2.0`.

## Git state

- Branch: `feat/visual-product-north-star`
- Local HEAD: `c53085d689930a1ca1cffd17fdf3bc58d6bbb356`
- `origin/main`: `ea9d6fc2d9ff4bf6935db9f5ae335efc16134cef`
- Remote: `https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git`
- Working tree at audit start: modified `index.html` and
  `tests/dashboard-patrimony-chart-correction.test.js`; untracked `Refs/`,
  `.tmp-reconcile.patch` and `docs/ai/patrimony-north-star-cycle2.md`.
- Those changes are historical/current work and are intentionally preserved.

## Current product state

- `index.html` remains the source of truth for the real application.
- Dashboard, Dividendos, Ativos and Rentabilidade have approved North Star
  direction in project history; the other legacy screens share the same visual
  language but should be changed incrementally.
- The latest local release lineage is Real Use Refinement 02, merged through
  PR #347 in `origin/main` (`ea9d6fc`).
- Financial values, formulas, persisted records and real data are protected.
- The modern React/Vite host is readonly and must not become a parallel write
  path without a separately approved phase.

## Visual canon assets

- `VISUAL_CANON_ASSETS=AVAILABLE`
- `DASHBOARD_CANONICAL_REFERENCE=true`
- `DIVIDENDS_CANONICAL_REFERENCE=true`
- Canonical files live in `Refs/visual-canon/` and are not product data.
- `VISUAL_REFERENCE_LIBRARY=READY`
- `PRIMARY_CANON_COUNT=2`
- `SECONDARY_REFERENCE_COUNT=1`
- `SCREEN_REFERENCE_COUNT=4`
- `PATTERN_REFERENCE_COUNT=0`
- `REJECTED_CONFLICT_COUNT=0`
- `DUPLICATE_COUNT=0`
- `DUPLICATE_HASHES_REPORTED=true`
- Full inventory and priority rules: `docs/ai/VISUAL_REFERENCE_INDEX.md`.

## Frozen boundaries

Do not change without an explicit phase and evidence:

- `finance-core.js` and financial formulas;
- `persistence-core.js`, storage keys, Firebase, backup/import and migration;
- schema and zero-versus-absence semantics;
- real portfolio, dividend, fixed-income and goal data;
- `sw.js`, `manifest.json`, `firestore.rules` and `modern/src`;
- handlers or canonical identity contracts merely to satisfy visual work.

## Known documentation gaps

- `CHANGELOG.md` stops before the latest North Star and Real Use work, so it is
  historical/partial rather than a complete release ledger.

## Next mission boundary

Use `docs/ai/NEXT_STEP.md`. This audit creates project memory only; it does not
start a feature, visual migration or release operation.

## 2026-09-03 - Canonical visual migration 01

- `CANONICAL_VISUAL_MIGRATION_01=READY_FOR_FINAL_USER_APPROVAL`
- `DASHBOARD_CANONICAL_IMPLEMENTATION=READY_FOR_USER_APPROVAL`
- Dashboard and Dividendos received a scoped legacy CSS alignment against the
  two primary canonical screenshots.
- Dashboard desktop performance rows now follow the canonical PM/current/
  variation/result/bar contract without increasing the approved height budget.
- Final acceptance refined Dashboard vertical density and Dividendos semantic
  KPI icons, flat Top ativos ranking and Total geral donut center.
- Financial helpers, datasets, handlers, routes, persistence and protected
  areas were preserved.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-01/acceptance-final/`; screens are
  not frozen yet.

## 2026-09-03 - RF orphan reconciliation

- `RF_ORPHAN_RECONCILIATION=COMPLETE`
- `RF_ORPHAN_RECOVERY_NEEDED=false`
- The orphan chain `31d0d11e -> a87078ec -> 42c31355 -> 4e882816` contains
  fixed-rate identity, readonly projection, supplement and test concepts that
  are already present in the canonical state.
- The canonical state is newer for CDI parsing, daily factors, valuation and
  related integration coverage.
- No product, financial, persistence, schema or real-data delta was recovered.

## 2026-09-03 - Canonical visual freeze

- `DASHBOARD_VISUAL=FROZEN`
- `DIVIDENDS_VISUAL=FROZEN`
- `SIDEBAR_VISUAL=FROZEN`
- Frozen references: `Refs/visual-canon/dashboard-canonical.png` and
  `Refs/visual-canon/dividendos-canonical.png`.
- The frozen Dashboard contract preserves the five-KPI executive row,
  patrimonio evolution, class composition, compact passive income, simultaneous
  highs/lows, PM/current/variation/result and approved responsive density.
- The frozen Dividendos contract preserves five semantic KPIs, monthly history,
  multi-year income chart, compact top-assets ranking, annual total donut and
  approved tooltip/mobile behavior.
- The frozen Sidebar contract preserves the dark shell, green active state,
  desktop navigation hierarchy, Reports grouping and mobile bottom navigation.
- Future visual changes to these areas require explicit user authorization.

## 2026-09-03 - Canonical visual migration 02: Ativos

- `CANONICAL_VISUAL_MIGRATION_02=COMPLETE`
- `ATIVOS_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- `ATIVOS_VISUAL=FROZEN`
- Ativos now keeps the professional positions table open by default, with
  individual result, rentabilidade and portfolio weight visible from the
  official analysis rows.
- Variable-asset result display uses the existing current-minus-applied
  values already exposed by the product; fixed-income rows preserve the
  official RF helpers and actions.
- The RF desktop table is responsively contained at the notebook breakpoint;
  its financial columns remain visible and the action family stays inside
  the table bounds.
- No financial engine, dataset, persistence, schema, handler or protected
  modern frontend area changed. Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-02/`.
- `ATIVOS_PERFORMANCE_FILTER=IMPLEMENTED`
- `ATIVOS_PERFORMANCE_FILTER_CLASSIFICATION=OFFICIAL_RESULT_SIGN`
- `ATIVOS_PERFORMANCE_FILTER=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `INCOMPLETE_DATA_NOT_NEUTRAL=true`
- `FILTER_COMBINATION_SUPPORTED=true`
- `FILTER_COUNT_SUPPORTED=true`
- `CLEAR_FILTERS_SUPPORTED=true`
- O filtro combina busca, classe e ordenacao sem alterar a fonte oficial de
  resultado; dados incompletos permanecem fora de Positivos, Negativos e
  Neutros, sem serem convertidos em zero.
- O estado vazio usa a mensagem explicita `Nenhum ativo corresponde aos
  filtros.` e Limpar filtros restaura busca, classe, revisao e performance.
- Evidencia local desta melhoria: `qa-screenshots/product-usability-01/`.

## 2026-09-03 - Canonical visual migration 03: Renda Fixa

- `RENDA_FIXA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- The dedicated `renda-fixa` view now exposes applied value, current value,
  result, rentability and maturity in its compact position rows.
- Incomplete current values remain explicitly marked for update and never
  display a fabricated result.
- The position list uses the existing official RF snapshot rows; no financial
  formula, event ledger, persistence path, schema, handler or protected screen
  changed. Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-03/`.
- The screen is not frozen until explicit user approval.

## 2026-09-03 - Fixed income visual freeze

- `RENDA_FIXA_VISUAL=FROZEN`
- `RF_SOURCE_OF_TRUTH=rfIntelligenceSnapshot()`
- `RF_APPLIED_SOURCE=rfValues().applied`
- `RF_CURRENT_SOURCE=rfValues().current`
- `RF_RESULT_SOURCE=rfValues().profit`
- `RF_RETURN_SOURCE=rfIntelligenceSnapshot().pct`
- `RF_MATURITY_SOURCE=assetRfMaturityDate()`
- The approved dedicated RF contract preserves explicit values, identity,
  review/editor flows, official helpers and collapsed secondary sections.
- `RF_SECONDARY_SECTIONS_DENSITY=ACCEPTED_COLLAPSED_STRUCTURE`

## 2026-09-03 - Canonical visual migration 04: Aportes

- `APORTES_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Aportes recebeu um refinamento visual escopado: hierarquia do cabeçalho,
  resumo 2x2 responsivo, estados ativos das abas/filtros, densidade das
  superfícies e proteção de valores financeiros completos.
- As fontes oficiais de movimentações, handlers, identidade de ativo,
  duplicação permitida e persistência foram preservados.
- Dashboard, Dividendos, Ativos, Renda Fixa e Sidebar não foram alterados por
  esta migração. A tela Aportes ainda não está congelada.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-04/`.

## 2026-09-03 - Aportes visual freeze

- `APORTES_VISUAL=FROZEN`
- The approved Aportes contract preserves the compact dark canonical shell,
  responsive KPI grid, monthly contribution rhythm, search, existing tabs and
  actions, class distribution, latest contributions and mobile bottom navigation.
- Official movement/contribution sources, create/edit/delete behavior, identity
  validation, wrong-record protection and the restricted duplicate-contribution
  contract remain unchanged.
- Critical financial values remain protected from ellipsis and the page has no
  horizontal overflow at the approved mobile and desktop viewports.
- `STALE_HARNESS_SELECTOR=.dashboard-master-primary`
- `STALE_HARNESS_DEBT=NON_BLOCKING_TEST_HARNESS_DEBT`
- Dashboard, Dividendos, Ativos, Renda Fixa and Sidebar remain frozen.

## 2026-09-03 - Canonical visual migration 05: Rentabilidade

- `RENTABILIDADE_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Rentabilidade recebeu um refinamento visual escopado: título simples,
  hierarquia compacta de performance e cores semânticas para carteira e
  benchmark.
- O renderer continua usando `rentabilityHistory(...)`, `assetRentabPct(...)`
  e o benchmark interno existente; períodos, tooltips e fontes oficiais foram
  preservados.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes e Sidebar não foram
  alterados por esta migração. A tela Rentabilidade ainda não está congelada.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-05/`.

## 2026-09-03 - Rentabilidade visual freeze

- `RENTABILIDADE_VISUAL=FROZEN`
- The approved contract preserves the compact dark shell, canonical KPI cards,
  comparative performance chart, green portfolio series, blue benchmark series,
  official period controls, exact-value tooltips and responsive mobile layout.
- `RETURN_SOURCE=rentabilityHistory()`
- `PERIOD_SOURCE=S.rentPeriod`
- `BENCHMARK_SOURCE=RENT_BENCH / rentBenchSeries()`
- `ASSET_RETURN_SOURCE=assetRentabPct()`
- No parallel return formula, invented metric, fabricated benchmark data,
  Finance Core, persistence or schema change was introduced.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes and Sidebar remain frozen.

## 2026-09-03 - Canonical visual migration 06: Rebalancear

- `REBALANCEAR_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Rebalancear recebeu refinamento visual escopado: hero mais compacto,
  controles com largura estável, CTA de simulação sem roxo legado, leitura
  rápida discreta e valores tabulares protegidos.
- O fluxo continua read-only e usa `rebalanceContributionDistribution(...)`,
  `allocationGoalItems()` e `allocationActualByType()` como fontes oficiais.
- Simulações, sugestões e cenários não persistem operações nem alteram a
  carteira. Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade e
  Sidebar não foram alterados por esta migração.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-06/`.

## 2026-09-03 - Rebalancear visual freeze

- `REBALANCEAR_VISUAL=FROZEN`
- `REBALANCE_READ_ONLY=true`
- `REBALANCE_ENGINE=rebalanceContributionDistribution()`
- `TARGET_ALLOCATION_SOURCE=allocationGoalItems()`
- `CURRENT_ALLOCATION_SOURCE=allocationActualByType()`
- `SUGGESTION_SOURCE=rebalanceAssetSuggestions()`
- O contrato congelado mantém hero de simulacao compacto, CTA primario verde,
  comparacao Atual vs ideal, leitura rapida discreta, aviso analitico e layout
  responsivo sem overflow horizontal.
- A tela nao compra, vende, cria movimentos, altera carteira, altera metas ou
  persiste operacoes durante simulacoes.
- `FILTERS_WORK=NOT_IMPLEMENTED`; `SORTING_WORKS=ENGINE_DETERMINISTIC`;
  `DETAIL_EXPANSION_WORKS=PASS`; `MODE_SWITCH_WORKS=PASS`.
- A linguagem aprovada e analitica: Aporte sugerido, Prioridade, Desvio e
  Atual vs ideal. Termos transacionais nao foram introduzidos.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade e Sidebar
  permanecem congelados e sem alteracoes nesta fase.

## 2026-09-03 - Canonical visual migration 07: Metas

- `METAS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Metas recebeu refinamento visual escopado: KPIs compactos, resumo de metas
  mais denso, progresso com leitura semantica e layout responsivo para desktop,
  tablet e mobile.
- A cadeia oficial permanece `S.goals` -> `financialGoalsSnapshot()` /
  `getGoalsSnapshot()` -> `createHostGoalsReadonlySource` -> adapter/runtime
  readonly. Nenhum estado paralelo, formula nova ou dado fake foi criado.
- Os fluxos existentes de edicao, remocao, configuracao de alocacao e ponte
  readonly foram preservados. Valores indisponiveis continuam explicitos.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear e Sidebar nao foram alterados por esta migracao.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-07/`.

## 2026-09-03 - Metas visual freeze

- `METAS_VISUAL=FROZEN`
- O contrato aprovado mantém shell premium escuro, cabecalho compacto, quatro
  KPIs no desktop, grade responsiva em duas colunas no mobile, faixas de status
  de Patrimonio e Renda Passiva, progresso oficial e distribuicao da carteira.
- `GOALS_SOURCE_OF_TRUTH=S.goals`
- `GOALS_SNAPSHOT_SOURCE=financialGoalsSnapshot() / getGoalsSnapshot()`
- `MODERN_GOALS_BRIDGE=createHostGoalsReadonlySource()`
- Nao ha estado paralelo, dados fake ou formulas paralelas. Handlers oficiais de
  edicao/remocao e a ponte moderna readonly permanecem preservados.
- `METAS_FOCUSED_HARNESS_DEBT=phase-206-financial-goals missing rentabilityHistory in isolated harness`
- O debito acima e `NON_BLOCKING_TEST_HARNESS_DEBT`; nao e evidencia de regressao
  de Metas e nao foi mascarado.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear e Sidebar permanecem congelados.

## 2026-09-03 - Canonical visual migration 08: Relatorios

- `RELATORIOS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Relatorios recebeu refinamento visual escopado: hierarquia analitica mais
  clara, densidade compacta para desktop/mobile e CTA de exportacao explicito.
- `REPORTS_ROUTE=relatorios`; `REPORTS_RENDERER=reportsTab()`;
  `REPORT_DATA_SOURCE=reportsSnapshot()`.
- `ANALYTICAL_REPORT != BACKUP`: exportacoes analiticas continuam usando os
  exporters baseados em `reportsSnapshot()`, enquanto backup/importacao seguem
  no fluxo separado de `backupManagerModal()` e `backupPayload()`.
- Nenhum tipo de relatorio, calculo financeiro, persistencia, schema ou dado
  real foi alterado. O smoke legado que esperava "Resumo da valuation" foi
  alinhado ao texto atual "Resumo da avaliacao oficial".
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-08/`.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear, Metas e Sidebar permanecem congelados.

## 2026-09-04 - Analysis and navigation freeze

- `ANALYSIS_VISUAL=FROZEN`
- `NAVIGATION_ARCHITECTURE=FROZEN`
- `ANALYSIS_ROUTE=analise`; `ANALYSIS_DATA_SOURCE=assetAnalysisRows()`;
  `CONCENTRATION_RULE_SOURCE=assetConcentrationAlert()`.
- A Análise permanece uma área analítica dedicada, sem recomendação automática,
  sem segundo motor e com estados vazios explícitos.
- Renda Fixa e Análise não são subabas de Ativos. A entrada dedicada de Renda
  Fixa, o resumo RF em Todos os ativos e o menu mobile compacto permanecem.
- Backlog preservado: filtro de performance em Ativos (P1), links contextuais e
  revisão de segurança de Configurações/backup/importação (P2), consistência de
  ícones e estados vazios restantes (P3).

## 2026-09-04 - Análise como destino próprio

- `PRODUCT_IMPROVEMENT_MODE=ACTIVE`
- `ANALYSIS_SIDEBAR_DECISION=DEDICATED_ROUTE_REUSING_OFFICIAL_RENDERER`
- `ANALYSIS_ROUTE=analise`
- `ANALYSIS_RENDERER=assetAnalysisBlock`
- `ANALYSIS_DATA_SOURCE=assetAnalysisRows`
- O atalho enganoso `Fundos` foi removido da navegação principal; o renderer
  continua preservado e acessível pela rota dedicada.
- `MOBILE_ANALYSIS_ACCESS=Mais`
- `FUNDS_LABEL_DECISION=RENAME_TO_ANALISE`

## 2026-09-04 - Product UX and navigation review

- `RF_NAVIGATION_DECISION=REMOVE_RF_FROM_ATIVOS`: o atalho `Renda Fixa` das
  subabas de Ativos foi removido porque reproduzia integralmente o renderer
  oficial `rendaFixaTab()` e a mesma fila de revisao, vencimentos, posicoes,
  resultados, rentabilidade e acoes.
- A entrada `Renda Fixa` da sidebar permanece acessivel e agora navega
  diretamente com `go('renda-fixa')`. O grupo de resumo de Renda Fixa dentro de
  `Todos os ativos` permanece, pois oferece leitura consolidada por classe e
  nao duplica a tela dedicada.
- Nenhuma capacidade de RF foi perdida: edicao, review queue, vencimento,
  emissor/indexador, resultado, rentabilidade, historico e acoes continuam no
  renderer oficial. `RF_UNIQUE_FEATURE_LOSS_RISK=LOW`.
- A alteracao e uma correcao minima de arquitetura de navegacao; a identidade
  visual, tabela principal, filtros e layout congelado de Ativos permanecem
  intactos.
- O teste de touch targets foi alinhado para entrar pela rota oficial, sem
  reintroduzir o seletor removido.
- Recomendações futuras: concluir a aprovacao da subsuperficie Fundos/Analise;
  depois auditar Configuracoes com revisao de seguranca para backup/importacao;
  por fim revisar a nomenclatura `Fundos` versus `Analise` na sidebar sem
  misturar essa decisao com telas congeladas.

## 2026-09-04 - Fundos / Analise subsurface refinement

- `FUNDOS_ANALISE_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- A subsuperficie `ativos` com `assetsInnerTab=analise` recebeu apenas ajuste
  de densidade e legibilidade: paineis nao esticam por conteudo vazio, o acento
  visual segue a semantica verde e valores analiticos nao sofrem ellipsis em
  mobile.
- A analise continua derivando de `assetAnalysisRows()` e dos helpers oficiais;
  nenhuma fonte financeira, formula, persistencia, schema ou dado real foi
  alterado.
- `ATIVOS_MAIN_CHANGED=false`; a tabela principal, filtros, cards de categoria,
  RF-inside-Ativos e o layout congelado permanecem intactos.
- Browser evidence is stored under `qa-screenshots/fundos-analise/`.

## 2026-09-03 - Relatorios visual freeze

- `RELATORIOS_VISUAL=FROZEN`
- O contrato aprovado mantém shell premium escuro, cabecalho compacto,
  seletor de periodo, CTA analitico de exportacao, cinco KPIs financeiros,
  evolucao patrimonial, distribuicao, movimentacoes, renda/proventos, renda
  fixa, qualidade dos dados, historico e exportacoes explicitas.
- `REPORT_DATA_SOURCE=reportsSnapshot()` e os tipos oficiais permanecem
  `complete`, `assets`, `proventos`, `fixed`, `patrimony`, `audit` e `irpf`.
- `ANALYTICAL_REPORT_BACKUP_SEPARATION=REQUIRED`: relatorio analitico,
  exportacao de dados, backup e importacao continuam conceitos e fluxos
  distintos. `backupManagerModal()` e `backupPayload()` permanecem preservados.
- `STALE_REPORTS_HARNESS_FIX=VALID_STALE_HARNESS_FIX`: o smoke foi alinhado
  de "Resumo da valuation" para "Resumo da avaliacao oficial" sem reverter a
  terminologia atual do produto.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear, Metas e Sidebar permanecem congelados.

## 2026-09-04 - Product usability improvements 02 follow-up

- `GLOBAL_SEARCH_REFINEMENT=READY_FOR_FINAL_USER_APPROVAL`.
- A busca global permanece somente navegacional: resultados de ativos,
  movimentacoes e proventos levam as suas areas oficiais sem abrir editores ou
  expor acoes destrutivas diretamente na busca.
- `CONTEXTUAL_NAVIGATION=READY_FOR_FINAL_USER_APPROVAL`; os tres links de
  contexto da Analise permanecem limitados a Ativos, Rentabilidade e
  Rebalancear.
- O filtro de busca continua usando `portfolioSearchBuildEntries()` e as
  fontes oficiais existentes, sem formula, persistencia, schema ou dado real
  novo.


## 2026-09-04 - Auditoria safety freeze

AUDIT_SAFETY_REVIEW=FROZEN.
Auditoria permanece na rota auditoria, renderizada por dataQualityTab() e alimentada por dataQualitySnapshot(). Os cartoes exibem referencia de identidade derivada do registro oficial, com tipo, contexto disponivel e ID quando presente, sem metadados ficticios.

AUDIT_IDENTITY_CONTRACT=entityId + identityKey e AUDIT_WRONG_RECORD_PROTECTION=enabled: a acao so abre o editor quando ID e chave conferem com o estado atual; remocao, reordenacao, duplicidade ambigua ou registro stale recuam para a rota geral.
Os niveis EXACT, CONTEXT, GENERAL e INFO permanecem distintos. A Auditoria nao executa correcoes automaticamente e nao altera Finance Core, persistencia, schema ou dados reais.
## 2026-09-04 - IRPF functional freeze

- `IRPF_FUNCTIONAL_REVIEW=FROZEN`
- `IRPF_MOBILE_PATTERN=FROZEN`; quantidade, PM, custo e valor de referência
  permanecem acessíveis quando oficiais.
- `IRPF_TAX_LOGIC_CHANGED=false`; `VALID_ZERO_PRESERVED=true`;
  `MISSING_DATA_EXPLICIT=true`.
- `IRPF_GROUPING_SOURCE=irpfTaxBucket() / irpfProventoCategory()`;
  `IRPF_TOTALS_SOURCE=report.totals / irpfSummaryMetrics()`;
  `IRPF_EXPORT_SOURCE=irpfExportCSV() / irpfExportPdf()`;
  `IRPF_REFERENCE_PERIOD=S.irpfYear`.
- IRPF permanece relatório auxiliar, somente leitura e não constitui declaração
  automática. RF mantém `rfIntelligenceSnapshot()` e ativos variáveis não usam
  helper de RF.
- `NEXT_RECOMMENDED_ACTION=RELEASE_CONSOLIDATION`.
