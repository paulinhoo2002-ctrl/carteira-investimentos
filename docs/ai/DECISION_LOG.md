# Decision Log

## 2026-09-06 - Phase 4 automation foundation

- DECISION: treat quote refresh, supported import preview, RF maturity alerts,
  duplicate detection and exact-identity navigation as existing automation
  anchors, not new parallel engines.
- DECISION: keep automatic persistent dividend insertion, cloud backup, sync
  conflict changes and provider migration outside this wave.
- SAFETY: no silent financial write, automatic buy/sell, approximate matching or
  background external fetch without explicit scope.
- STATUS: `PHASE_4_FOUNDATION=READY_FOR_REVIEW`; no publication, PR, merge or
  deploy was performed.

## 2026-09-06 - Phase 4A read-only import foundation

- DECISION: add only pure import identity/fingerprint/reconciliation helpers;
  keep the existing B3/broker parser and preview flow unchanged.
- CONTRACT: explicit assetId > ISIN > exact ticker/code > exact normalized
  security identity; approximate matching remains forbidden.
- SAFETY: fingerprints are deterministic, reconciliation is ephemeral, and no
  real import write, financial calculation, persistence or schema change exists.
- TESTS: exact identity, malformed values, same-source fingerprints,
  duplicate confidence and quantity reconciliation are covered.

## 2026-09-06 - Phase 4B historical B3 preview foundation

- DECISION: keep historical B3 income, movement, custody and brokerage-note
  analysis in a read-only preview model and reuse the Phase 4A identity engine.
- CONTRACT: current position, transaction history, income history, custody
  history and corporate events remain separate domains; unknown and unsupported
  events never become automatic writes.
- SAFETY: duplicate, conflict and review states remain explicit; current
  quantities, average prices, targets, metadata and persisted history are not
  changed.
- TESTS: source detection, supported income normalization, batch/file
  idempotency, historical totals, reconciliation, movement taxonomy, custody
  matching, brokerage-note identity, report readiness and 1k/5k/10k scaling are
  covered.

## 2026-09-06 - Phase 4C historical reconstruction

- DECISION: add a read-only cross-source reconstruction layer instead of
  redefining the current portfolio from historical imports.
- CONTRACT: only verified BUY/SELL events contribute to expected position;
  transfers, lending, unknown events, unsupported corporate events and
  unconfirmed subscriptions remain outside the position calculation.
- SAFETY: economic-event duplicates, source conflicts, position differences and
  coverage gaps remain explicit review states; no automatic resolution or write
  path exists.
- TESTS: taxonomy, verified-history reconstruction, cross-source matching,
  three-way reconciliation, explanations, 2019-2026 coverage, conflict/session
  reports, corporate-event audit and 10k/25k/50k scale are covered.

## 2026-09-06 - Phase 4D professional brokerage/reporting foundation

- DECISION: model brokerage notes, operations, fees, position protection and
  report contracts in a read-only canonical layer; Inter is supported, B3 is
  partial and untested brokers remain unknown.
- CONTRACT: note and operation identities are deterministic, economic events
  are linked without persistence, and fees remain unallocated at note level.
- SAFETY: B3/app positions cannot overwrite each other, average price is not
  recalculated, and conflicting note content stays critical/review-required.
- TESTS: note identity, operation deduplication, fee safety, financial
  cross-checks, position protection, event graph, severity, reporting and
  100/500/1000 plus 10k/50k scale are covered.

## 2026-09-06 - Phase 4H first real pilot preparation

- DECISION: prepare, but do not execute, a small first pilot around one
  calendar month of `B3_DIVIDENDS_XLSX` after real export evidence exists.
- CONTRACT: only explicit `EQUITY_DIVIDEND`, `JCP` and `FII_INCOME` are eligible
  for the first pilot; RF interest/coupon is read-only optional and excluded
  from the first pilot. Principal, ambiguous RF/corporate events and unknown
  events block automatic classification.
- SAFETY: the manual row review, exact identity, duplicate states, backup and
  targeted snapshot sequence, zero position/average-price impact, same-file
  reimport and rollback proof are defined. No real write entrypoint is enabled.
- STATUS: `CAN_EXECUTE_REAL_PILOT_WRITE=false`, `FULL_HISTORY_IMPORT_READY=false`,
  no live file or real data was used.

## 2026-09-06 - Phase 3 final release and lifelong usability audit

- DECISION: release readiness requires the repeated local gates and full browser
  matrix, not historical reports alone.
- DECISION: do not globally enlarge auxiliary text or rewrite legacy CSS; no
  critical financial information or action was harmed by the measured findings.
- DECISION: keep Patrimônio as a monthly list and backup-age visibility as a
  protected backlog item; neither has a safe source for invented data.
- EVIDENCE: 7 viewports x 5 routes without overflow, page errors or request
  failures; root 78/78, modern 750/750, finance 80/80 and persistence 32/32.
- SAFETY: Finance Core, Persistence Core, schema, backup/import, auth/cloud and
  real data remained untouched.

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

## 2026-09-06 - Dividendos canonical wave frozen

- DECISION: Preserve the primary Dividendos canon as the product contract while
  correcting the desktop typography conflict and protecting the existing
  official data/rendering paths.
- PRESERVED: `passiveIncomeGoalStats()`, `dividendMonthlyHistoryRows()`,
  `dividendAnnualMatrixData()`, existing export/review/filter/tooltip handlers,
  persistence, schema, Finance Core and real data.
- RESULT: five KPIs, monthly history, multi-year evolution, top assets and
  annual summary remain the approved hierarchy across desktop and mobile.
- STATUS: `DIVIDENDOS_VISUAL=FROZEN`,
  `DIVIDENDOS_INFORMATION_CONTRACT=FROZEN`,
  `DIVIDENDOS_INTERACTION_CONTRACT=FROZEN`.
- EVIDENCE: `Refs/visual-canon/dividendos-canonical.png`, focused regression
  lock and browser evidence under `qa-screenshots/dividendos-final/`.

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

## 2026-09-04 - Product usability release consolidation

- DECISION: consolidar em uma única integração limpa somente os cinco commits
  aprovados do ciclo de usabilidade, sobre `origin/main` após o PR #350.
- SCOPE: Análise dedicada, navegação RF sem duplicação, filtro de performance,
  busca global read-only, navegação contextual, Auditoria com identidade exata
  e refinamento mobile do IRPF.
- SAFETY: não houve alteração em Finance Core, persistência, schema,
  backup/importação, autenticação, cloud sync ou dados reais.
- RESULT: `PRODUCT_USABILITY_RELEASE=READY_FOR_PR`; o próximo trabalho é
  `SETTINGS_SAFETY_REVIEW`, sem iniciá-lo nesta integração.
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

## 2026-09-04 - Ativos visual reference lock

- `DECISION`: usar `Refs/visual-canon/Tela de aportes e ativos.png` como
  referencia de tela para Ativos, sem reproduzir a arquitetura de Aportes.
- `SCOPE`: ajustes locais de hierarquia, densidade, iconografia e legibilidade;
  sem formulas, Finance Core, persistencia, schema ou dados reais.
- `STATUS`: `ATIVOS_REFERENCE_LOCK=READY_FOR_FINAL_USER_APPROVAL`; a aprovacao
  visual do usuario continua pendente.

## 2026-09-04 - Ativos final reference polish

- DECISION: a tabela de posicoes e o conteudo primario da tela de Ativos em
  desktop. Os cards de categoria servem como leitura compacta e secundária.
- DECISION: reutilizar `allocationActualByType()` para a alocacao por classe,
  sem nova regra de negocio ou calculo de carteira. Em 1920px o modulo acompanha
  a tabela; em notebook ele permanece logo apos as posicoes para nao comprimir
  valores financeiros.
- BOUNDARY: RF continua rota dedicada e resumo dentro de Todos os ativos;
  Analise continua rota dedicada. Nenhuma aba interna foi reaberta.
- STATUS: `ATIVOS_FINAL_REFERENCE_POLISH=READY_FOR_FINAL_USER_APPROVAL`.

## 2026-09-04 - Ativos reference lock freeze

- DECISION: congelar a reconstrução visual de Ativos após aprovação do usuário.
- CONTRACT: `ATIVOS_PRIMARY_CONTENT=FROZEN`, `ATIVOS_DENSITY=FROZEN`,
  `ATIVOS_ICON_LANGUAGE=FROZEN` e `ALLOCATION_PANEL=FROZEN`.
- PRESERVED: filtros, busca, ordenação, expansão, menus contextuais com IDs
  únicos, fontes oficiais de resultado, RF dedicado, resumo RF e rota dedicada
  de Análise.
- NEXT: `NEXT_VISUAL_TARGET=APORTES`; sem push, PR, merge ou deploy nesta rodada.

## 2026-09-06 - Phase 3.3 Dividendos hardening

- DECISION: manter o Dividendos canônico aprovado como contrato congelado;
  nenhuma nova direção visual foi criada.
- TESTS: os 12 smoke tests legados foram migrados individualmente para o
  contrato atual: chips independentes por grupo, matriz `.div-mat-table` e
  lançamento operacional disponível na visão `Recebimentos`.
- COVERAGE: cinco KPIs, filtros anuais, matriz Jan-Dez, valores futuros e
  ausentes explícitos, evolução, top pagadores, resumo anual, exportação,
  responsividade e fluxo de registro continuam protegidos.
- MOBILE: rolagem real em 390x844 e 430x932 revelou KPIs, histórico, gráfico,
  top pagadores e resumo anual sem conteúdo encoberto pela navegação inferior.
- BACKLOG: busca global, alertas de qualidade/maturidade, RF e fricção mobile
  já possuem cobertura/implementação. O atalho transação -> ativo foi autorizado
  nesta fase como navegação somente leitura por identidade exata.
- SAFETY: Finance Core, Persistence Core, schema, backup/import, auth/cloud e
  dados reais permaneceram intocados.

## 2026-09-06 - Phase 3.3 productivity hardening

- DECISION: resultados de movimentação na busca global mantêm a abertura oficial
  de Aportes e passam a oferecer `Ver ativo` somente quando `assetId` explícito
  ou ticker exato único resolve um ativo atual.
- SAFETY: matching aproximado, criação automática de ativo e mutação financeira
  são proibidos; a ação usa `openRentabilityAsset()` e preserva o editor oficial.
- STATUS: `TRANSACTION_TO_ASSET=FROZEN_FUNCTIONAL_IMPROVEMENT`;
  `EXPLICIT_ASSET_IDENTITY=true`; `APPROXIMATE_MATCHING=false`.

## 2026-09-06 - Phase 4H.7 source linkage shadow proof

- DECISION: adopt `ONE_ECONOMIC_INCOME_EVENT` for coexistence between B3
  payment evidence and Yahoo market-reference evidence.
- SOURCE: B3 is the financial source of truth; Yahoo cannot create a second
  receipt when it can be linked to the same event.
- HISTORICAL FIXTURE RESULT: this phase reported 21 high-confidence
  cross-source pairs, zero exact links and no silent many-to-one links. V39
  later proved that the 21st pair (KNUQ11) lacked independent identity and
  superseded the executable contract with 20 links plus one deferred ambiguity.
- PRESERVATION: TEPP11 remains a new B3-only event of `R$ 85,37`; DIVD11 and
  NDIV11 remain ETF review items. Existing records and audit history remain
  untouched.
- SAFETY: the proof is in-memory with sanitized fixtures only. No schema,
  persistence, financial formula, private data or real pilot write changed.
- NEXT: any durable source-evidence linkage requires separate schema,
  persistence, migration-preview and rollback authorization.

## 2026-09-06 - Phase 4H.8 completion and governance correction

- STATUS: `PHASE_4H_8=COMPLETE` in test-mode only; additive source linkage is
  covered without changing production readers or persistence core.
- HISTORICAL FIXTURE FINANCE: this phase treated `R$ 2.488,47` as 21 linked
  events. V39 supersedes that synthetic count: only 20 links are identity-safe;
  KNUQ11 is one visible deferred no-op. Linked/deferred evidence contributes
  `R$ 0,00`; only TEPP11 contributes `R$ 85,37`.
- GOVERNANCE: preserve `df9daa3` exactly and record it as a partial H8 commit;
  its Phase 4H.7 message label is historically inaccurate and is not rewritten.
- SAFETY: no private files, real backup, XLSX, schema, persistence, finance,
  UI or real user data entered the completion commits.

## 2026-09-07 - Phase 4H protected recovery read-back contract

- DECISION: `PersistenceCore` remains the sole JSON serializer/parser. The
  protected recovery adapter may unwrap and type-check the storage envelope,
  but must never parse an object or coerce one with `String(...)`.
- CONTRACT: `safeGetLocalStorageItem()` returns `{ok,value}`;
  `value` must be `string|null`; read-back returns a plain canonical object.
  Wrong types, malformed JSON, double encoding and promise-like values fail
  closed before sync.
- INCIDENT: V6 reached mutation and therefore consumed its single-use
  authorization. A read-back type mismatch raised `"[object Object]" is not
  valid JSON`; targeted rollback restored `329/329/0`; cloud sync stayed
  blocked.
- NEXT: use a fresh authenticated manifest and a new explicit single-use
  authorization. V6 must never be retried.
