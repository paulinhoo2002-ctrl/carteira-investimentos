# Decision Log

## 2026-09-03 - Legacy app remains authoritative

- DECISION: Treat `index.html` as the source of truth for the real product.
- WHY: It owns the global state, route dispatch, legacy handlers and current
  production behavior.
- STATUS: Active.
- SOURCE/EVIDENCE: `AGENTS.md`, `docs/ai/PROJECT_MEMORY.md`, code audit.

## 2026-09-03 - Modern host remains readonly

- DECISION: Keep `modern/src` isolated and readonly.
- WHY: Modern tests and project governance protect it from becoming a second
  financial or persistence engine.
- STATUS: Frozen unless a dedicated migration phase is approved.
- SOURCE/EVIDENCE: `AGENTS.md`, `docs/ai/ARCHITECTURE.md`, package scripts.

## 2026-09-03 - Visual canon is internal

- DECISION: Dashboard and Dividendos define the shared dark premium language;
  no third visual language is allowed.
- WHY: This preserves approved hierarchy, density, accessibility and financial
  legibility across screens.
- STATUS: Active.
- SOURCE/EVIDENCE: `DESIGN.md`, `docs/visual/NORTH-STAR.md`,
  `docs/ai/PROJECT_MEMORY.md`, approved project history.

## 2026-09-03 - Canonical image gap is explicit

- DECISION: Do not invent or silently add `Refs/visual-canon` screenshots.
- WHY: The requested dashboard and Dividendos files are absent from the
  repository; written canon and approved history are the available evidence.
- STATUS: Open documentation gap.
- SOURCE/EVIDENCE: filesystem audit of `Refs/visual-canon`.

## 2026-09-03 - Financial and persistence boundaries are frozen

- DECISION: UI work must consume official helpers and preserve Finance Core,
  Persistence Core, schema, handlers, identity and real data.
- WHY: The application manages personal financial records and has a long
  history of explicit protection decisions.
- STATUS: Active.
- SOURCE/EVIDENCE: `docs/ai/FINANCIAL_RULES.md`, `AGENTS.md`, code audit.

## 2026-09-03 - Foundation reset is documentation-only

- DECISION: This phase creates project memory and bootstrap guidance only.
- WHY: New features or bug fixes would mix discovery with implementation and
  make the repository baseline harder to reason about.
- STATUS: Complete for this audit.
- SOURCE/EVIDENCE: current audit request and resulting documentation diff.

## 2026-09-03 - Canonical visual migration 01 is pending visual acceptance

- DECISION: Apply a scoped canonical visual layer to the legacy Sidebar,
  Dashboard and Dividendos without changing product engines.
- WHY: The approved primary references require a shared dark shell, compact
  KPI rhythm, stronger analytical hierarchy and responsive density.
- PRESERVED: Official financial helpers, datasets, handlers, routes,
  persistence, schema, protected screens and modern frontend isolation.
- STATUS: Implemented pending user visual approval; no screen is frozen.
- EVIDENCE: `qa-screenshots/canonical-visual-migration-01/` and focused/browser
  validation executed on 2026-09-03.

## 2026-09-03 - Canonical visual migration 01 final acceptance

- DECISION: Mark the scoped Dashboard and Dividendos convergence ready for
  final user approval, without freezing either screen yet.
- PRESERVED: Official financial sources, calculations, handlers, routes,
  persistence, schema and modern frontend isolation.
- REFINED: Dashboard vertical density and simultaneous gain/loss panels;
  Dividendos semantic KPI treatment, flat Top ativos ranking and Total geral
  annual summary center.
- STATUS: Ready for final user approval.
- EVIDENCE: `qa-screenshots/canonical-visual-migration-01/acceptance-final/`;
  focused 31/31, root 75/75, modern 750/750, finance 80/80 and persistence
  31/31 passed on 2026-09-03.

## 2026-09-03 - RF orphan chain is reconciled

- DECISION: Do not recover the orphan RF chain into the canonical workspace.
- WHY: The fixed-rate identity, readonly projection, valuation supplements,
  modern bridge and regression tests are already present; the canonical state
  also contains the newer CDI path and coverage.
- STATUS: Complete.
- SOURCE/EVIDENCE: independent inspection of commits
  `31d0d11e`, `a87078ec`, `42c31355`, `4e882816`, current RF sources/tests,
  and local browser proof of legacy RF values plus the modern readonly route.
- PROTECTIONS: No product code, Finance Core, Persistence Core, schema or
  real data changed for this reconciliation.

## 2026-09-03 - Canonical Dashboard, Dividendos and Sidebar frozen

- DECISION: Freeze the approved visual implementation for Dashboard,
  Dividendos and Sidebar against the primary canonical references.
- WHY: Required browser smoke, focused tests, full gates and visual review
  confirmed the approved density, hierarchy, financial legibility and
  responsive behavior.
- STATUS: Frozen.
- REFERENCE: `Refs/visual-canon/dashboard-canonical.png` and
  `Refs/visual-canon/dividendos-canonical.png`.
- BOUNDARY: Future redesign or visual reinterpretation requires explicit user
  authorization. This freeze does not alter financial engines, persistence,
  schema, handlers or real data.

## 2026-09-03 - Canonical Ativos frozen

- DECISION: Freeze the approved Ativos visual implementation as the canonical
  asset-screen baseline.
- PRESERVED: Official asset-analysis and RF helper sources, PM/current/
  applied/result/rentability/participation values, filters, sorting, actions,
  identity contracts, persistence, schema and real data.
- RESULT: `CANONICAL_VISUAL_MIGRATION_02=COMPLETE` and
  `ATIVOS_VISUAL=FROZEN`.
- KNOWN GAP: The main Ativos screen has no performance filter; classify it as
  `NON_BLOCKING_FUTURE_ENHANCEMENT`, not as a release regression.
- EVIDENCE: `qa-screenshots/canonical-visual-migration-02/final/`, focused
  Ativos/RF tests and full required gates on 2026-09-03.
- BOUNDARY: Dashboard, Dividendos, Sidebar and Ativos remain frozen unless
  the user explicitly authorizes a new visual phase.

## 2026-09-04 - Ativos performance filter

- DECISION: Implement the compact Ativos performance filter with the semantic
  states Todos, Positivos, Negativos and Neutros.
- SOURCE: Classification reads the existing official `assetAnalysisRows()`
  result path, preserving the established variable-asset valuation/result
  contract; `assetJurosValue()` is not used for Acoes, FIIs or ETFs.
- BEHAVIOR: Performance composes with search, class filtering and existing
  sorting; the filter count includes it and Limpar filtros resets it.
- SAFETY: Incomplete results are unclassified rather than neutral, valid zero
  remains neutral, and no Finance Core, persistence, schema or real data was
  changed.
- EVIDENCE: Focused deterministic smoke plus browser QA at 390, 430, 768,
  1366 and 1920 pixels; screenshots in
  `qa-screenshots/product-usability-01/`.

## 2026-09-04 - Freeze Ativos performance filter

- `ATIVOS_PERFORMANCE_FILTER=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `INCOMPLETE_DATA_NOT_NEUTRAL=true`
- `FILTER_COMBINATION_SUPPORTED=true`; `FILTER_COUNT_SUPPORTED=true`;
  `CLEAR_FILTERS_SUPPORTED=true`.
- The filter remains within the frozen Ativos identity and uses
  `assetAnalysisRows()` as the official result source. No Finance Core,
  persistence, schema or real-data contract was reopened.
- Next mission: `PRODUCT_USABILITY_IMPROVEMENTS_02` for global search,
  contextual navigation links and small navigation improvements only.

## 2026-09-04 - RF navigation duplication removed

- DECISION: Remove only the `Renda Fixa` subtab from Ativos and keep the
  dedicated sidebar entry.
- EVIDENCE: Both entry points rendered the same official `rendaFixaTab()` with
  identical RF KPIs, review queue, maturity groups, position rows and actions.
- PRESERVED: The RF summary card/group inside `Todos os ativos`; the dedicated
  RF renderer; `go('renda-fixa')`; `rfIntelligenceSnapshot()`; official RF
  helpers; editing, review, maturity, history and explicit asset actions.
- RISK: `RF_UNIQUE_FEATURE_LOSS_RISK=LOW`; no financial, persistence, schema or
  real-data contract changed.
- CLASSIFICATION: Minimal navigation/architecture correction, not a visual
  redesign of the frozen Ativos screen.

## 2026-09-04 - Análise promoted to a dedicated destination

- `ANALYSIS_ROUTE_DECISION=DEDICATED_ROUTE`
- `ANALYSIS_ROUTE=analise`
- `ANALYSIS_RENDERER=assetAnalysisBlock`
- `ANALYSIS_DATA_SOURCE=assetAnalysisRows`
- `ANALYSIS_FEATURE_LOSS=0`
- `MOBILE_ANALYSIS_ACCESS=Mais`
- `FUNDS_LABEL_DECISION=RENAME_TO_ANALISE`
- WHY: the existing analysis was hidden as an Ativos inner state and exposed
  under the misleading `Fundos` label. A direct route improves information
  architecture without duplicating calculations or persistence.
- PRESERVED: financial helpers, datasets, asset actions, storage, schema,
  frozen screens and the original analysis renderer.

## 2026-09-04 - Freeze Analysis and navigation architecture

- DECISION: Freeze the dedicated Análise route and the approved navigation
  architecture.
- CONTRACT: `ANALYSIS_ROUTE=analise`, `assetAnalysisRows()` remains the sole
  analysis source, and `assetConcentrationAlert()` remains the concentration
  rule source.
- NAVIGATION: Renda Fixa and Análise are dedicated destinations; neither is an
  Ativos inner tab. The RF summary inside `Todos os ativos` remains available.
- MOBILE: The bottom navigation stays compact; Análise is available from the
  `Mais seções` menu with accessible labels and touch targets.
- BOUNDARY: No financial formulas, persistence, schema, real data or frozen
  visual surfaces were changed for this freeze.

## 2026-09-04 - Product usability improvements 02

- DECISION: Improve global search discovery and add only three contextual links
  from Análise: Ativos, Rentabilidade and Rebalancear.
- SEARCH: `portfolioSearchOpen()` remains the entrypoint and
  `portfolioSearchBuildEntries()` remains the sole in-memory index over the
  existing official sources. Search stays read-only; no destructive action was
  exposed.
- UX: Análise is grouped under Navegação, supports existing normalized aliases,
  displays a result count and uses `Nenhum resultado encontrado.` for no-match.
- SAFETY: Enter continues to use normal route/editor handlers; no financial
  formula, persistence, schema, real data or frozen visual identity changed.
- STATUS: `GLOBAL_SEARCH_REFINEMENT=FROZEN_FUNCTIONAL_IMPROVEMENT` and
  `CONTEXTUAL_NAVIGATION=FROZEN_FUNCTIONAL_IMPROVEMENT` after user approval.
- NEXT: `SECONDARY_SURFACE_REFINEMENT_01_IRPF`; Configurações, Backup, Import
  and Restore remain a separate protected safety program.

## 2026-09-04 - IRPF secondary surface refinement

- DECISION: Keep the IRPF surface as an auxiliary fiscal report and apply only
  a small readability correction to critical values on desktop/mobile.
- PRESERVED: Existing `irpfBuildYearReport()`, year selection, CSV/PDF exports,
  official fiscal wording and the separate backup/import flows.
- RESULT: Summary and mobile financial values no longer apply ellipsis;
  focused IRPF smoke and five-viewport browser QA passed.
- BOUNDARY: No tax formula, Finance Core, persistence, schema or real data was
  changed. Next surface is `SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA`.

## 2026-09-04 - IRPF visual freeze

- DECISION: Freeze the approved IRPF auxiliary report presentation.
- CONTRACT: `IRPF_ROUTE=irpf`, `IRPF_RENDERER=irpfTabPremium()` and
  `IRPF_DATA_SOURCE=irpfBuildYearReport()` remain canonical.
- PRESERVED: year selection, CSV/PDF outputs, fiscal sections, explicit
  incomplete-data messaging and the separation from backup/import flows.
- RESULT: `IRPF_VISUAL=FROZEN`; no fiscal engine, persistence, schema or real
  data changed. Next official mission is
  `SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA`.

## 2026-09-04 - Auditoria secondary surface refinement

- DECISION: ativar `dataQualityTab()` como renderer efetivo da rota
  `auditoria`, preservando `dataAuditTab()` como alias publico de compatibilidade.
- SOURCE: `dataQualitySnapshot()` e seus analisadores oficiais continuam como
  unica fonte de achados, severidade, categoria e identidade.
- SAFETY: `dataQualityResolveAction()` permanece responsavel por revalidacao
  de identidade, fallback de rota e bloqueio de registro incorreto; nenhuma
  acao destrutiva ou reparo automatico foi criado.
- UX: a fila prioritaria exibe primeiro os achados mais relevantes, filtros
  secundarios ficam em disclosure e o mobile reduz a exposicao inicial sem
  esconder a fila completa.
- STATUS: `AUDITORIA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.

## 2026-09-04 - Auditoria visual and safety freeze

- DECISION: congelar a apresentacao da Auditoria e o contrato de seguranca das
  acoes apos aprovacao visual e de seguranca do usuario.
- CONTRACT: `AUDIT_ROUTE=auditoria`, `AUDIT_RENDERER=dataQualityTab()` e
  `AUDIT_DATA_SOURCE=dataQualitySnapshot()`; `dataAuditTab()` permanece alias.
- SAFETY: niveis `EXACT`, `CONTEXT`, `GENERAL` e `INFO` nao foram
  reinterpretados. Revalidacao de identidade, protecao contra registro
  incorreto e fallback seguro continuam obrigatorios.
- RESULT: `AUDITORIA_VISUAL=FROZEN` e `AUDITORIA_ACTION_SAFETY=FROZEN`, sem
  alteracao de Finance Core, persistencia, schema ou dados reais.
- NEXT: `PRODUCT_SAFETY_REVIEW_01_CONFIGURACOES`, review-first e separado de
  qualquer mudanca em backup/importacao/restore.

## 2026-09-04 - Safety hardening 01

- DECISION: endurecer reset de carteira e validação de backup sem redesign de
  Configurações.
- RESET: `resetPortfolio()` limpa `S.rfEvents`, `rfMovementEditor` e
  `rfEventEditor`, mantendo confirmação, palavra de segurança e escopo da
  carteira ativa.
- BACKUP: `parseBackupRaw()` aceita payloads atuais versão 1 e formatos legados
  reconhecidos, mas rejeita versão incompatível, meta/data/storage inválidos e
  campos conhecidos com tipos incorretos antes da confirmação.
- SAFETY: `applyStorageTransaction()` e rollback permanecem inalterados; nenhum
  reset ou importação real foi executado.
- TESTS: baseline atualizado para `ROOT=75/75`, `MODERN=750/750`,
  `FINANCE=80/80` e `PERSISTENCE=32/32`.
- NEXT: `PRODUCT_SAFETY_REVIEW_02_CONFIGURACOES_VISUAL`.

## 2026-09-04 - Configuracoes visual e hierarquia de seguranca

- DECISION: separar visualmente a fixture local da `Zona de risco` e tornar
  explicita a diferenca entre backup restauravel e relatorio analitico.
- SCOPE: apenas `settingsTab()`; nenhum handler de backup, importacao,
  restore, reset, autenticacao ou sincronizacao foi modificado.
- ACCESSIBILITY: o controle de ocultar valores recebeu nome acessivel e
  manteve suporte a foco, teclado e estado `aria-checked`.
- RESULT: `CONFIGURACOES_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.

## 2026-09-04 - Product usability improvements 02 follow-up

- DECISION: manter a busca global como descoberta e navegacao somente leitura.
- SAFETY: selecionar ativo, movimentacao ou provento na busca navega para a
  area oficial, mas nao abre editor nem acao de mutacao.
- CONTEXT: os links da Analise continuam restritos a Ativos, Rentabilidade e
  Rebalancear; nenhuma nova formula, fonte financeira ou fluxo de persistencia
  foi criado.
- VALIDATION: testes focados, suites completas e browser QA nas cinco larguras


## 2026-09-04 - Auditoria safety freeze

- DECISION: congelar o contrato funcional de seguranca da Auditoria sem alterar formula, persistencia, schema ou dados reais.
- CONTRACT: AUDIT_ROUTE=auditoria, AUDIT_RENDERER=dataQualityTab(), AUDIT_DATA_SOURCE=dataQualitySnapshot(), severidade em issue.severity.
- SAFETY: entityId + identityKey, fallback para rota geral quando stale/divergente, editor oficial somente para alvo exato e informativos somente leitura.
- NEXT: IRPF_PRODUCT_REVIEW, sem push, PR, merge ou deploy nesta rodada.
## 2026-09-04 - IRPF functional freeze

- DECISION: congelar o contrato funcional e a legibilidade mobile do IRPF após
  aprovação explícita do usuário.
- CONTRACT: `IRPF_FUNCTIONAL_REVIEW=FROZEN`, com rota `irpf`, renderer
  `irpfTabPremium()` e fonte `irpfBuildYearReport(year)`.
- SAFETY: IRPF permanece auxiliar e somente leitura; CSV/PDF não são declaração
  automática. Não houve nova lógica tributária, persistência, schema, backup/
  importação ou alteração de dados reais.
- DATA: zeros válidos continuam distintos de ausência; dados incompletos são
  explicitados; RF mantém `rfIntelligenceSnapshot()` e ativos variáveis não
  usam helper de RF.
- MOBILE: `IRPF_MOBILE_PATTERN=FROZEN`, preservando quantidade, PM, custo e
  valor de referência quando oficialmente disponíveis.
- NEXT: `NEXT_RECOMMENDED_ACTION=RELEASE_CONSOLIDATION`.

## 2026-09-04 - Dashboard final freeze and reference process

- `DASHBOARD_VISUAL=FROZEN`, `DASHBOARD_REFERENCE_LOCK=FROZEN` e
  `DASHBOARD_CHART_INTERACTION=FROZEN` apos aprovacao do usuario.
- `PRIMARY_CANON=Refs/visual-canon/dashboard-canonical.png` permanece alvo
  estrutural; `Tela Principal.png` e apenas `SECONDARY_QUALITY_REFERENCE`.
- `VISUAL_REFERENCE_LOCK_PROCESS=ACTIVE`: comparar referencia primaria,
  declarar escopo, registrar evidencias nos cinco breakpoints e separar
  aprovacao visual de testes/builds.
- Proximo alvo recomendado: `INVENTARIO_DE_REFERENCIAS`, sem iniciar nesta
  rodada. `SITE_REFINEMENT_WAVE_04` permanece fora deste commit.
