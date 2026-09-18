# Next Step

## Current boot state — V197

- `CURRENT_MAIN_SHA=253c73bfcacfaac9102bea09887b5879f341a0a6`
- `LAST_MERGED_PR=373`
- `LAST_RELEASE=V196 product feedback and Import Center accessibility`
- `CURRENT_ACTIVE_MISSION=V197`
- `ACTIVE_BRANCH=feature/v197-agent-memory-product-evolution`
- `ACTIVE_WORKTREE=C:\Projetos\carteira-investimentos.worktrees\v197-agent-product`
- `PR=374`
- `PR_HEAD=87f1507391f5141734a49b312ba53a8891011f2b`
- `PR_CI=GREEN`
- `MERGE_STATUS=HUMAN_AUTHORIZATION_REQUIRED`
- `CURRENT_PRODUCT_PRIORITY=Dashboard, Ativos, Dividendos, Rentabilidade e navegação`
- `CURRENT_BLOCKERS=browser-harness pode estar ausente; usar Playwright/CDP`
- `DEFERRED_HIGH_VALUE_ITEMS=Renda Fixa e Relatórios após P1; auditoria npm sem rede`
- `LAST_VALIDATION=215/215 tests, 22/22 UI tests, build PASS, browser matrix clean`
- `LAST_UPDATED=2026-09-18`

O histórico abaixo permanece como evidência; este snapshot é o estado transitório atual.

## PHASE_4I_V39_KNUQ_DEFERRED_2026-09-12

- August source accounting is `20 linked + 1 new + 2 excluded + 1 deferred
  ambiguous = 24`; the stale synthetic 21-link expectation is invalid.
- KNUQ11 remains visible as `DEFERRED_AMBIGUOUS_NO_OP`, with zero mutation and
  zero financial delta. Resolve it later only with independent immutable
  identity evidence; ticker/date/amount proximity is insufficient.
- Before any August real authorization, rerun authenticated prewrite and bind a
  fresh manifest to HEAD, source, baseline, plan, review and provider v2 hashes.
- Class C remains a separate authorization and should run first. Do not combine
  the Class C and August authorizations.

## V50_BOOT_HYDRATION_NEXT_STEP_2026-09-13

- Duas páginas novas no perfil QA protegido não escreveram `civ5` nem
  `civ5_authority`; o estado atual permanece cloud-shaped.
- O alvo V47C aparece somente em evidência histórica com marcador V1 e não é
  persistência V2 certificada. V50 corrigiu a captura do fingerprint cloud no
  boot authoritative, o fail-closed do save protegido e `--disable-gpu` no
  launcher Chrome.
- Próximo passo: concluir validações e gerar manifesto V50. Recovery real
  continua proibido sem nova autorização single-use.

## PHASE_4H_101_SOURCE_GATE_2026-09-09

- Live protected QA is proven on disposable profile `.qa-profile-recovery`,
  CDP `9244`, with authenticated cloud read and no cloud-write capability.
- Current local source is `329/329/0` and `2685096` cents; cloud is
  `430/329/101` and `3718277` cents. The exact 101-source set is proven as
  `95` donor matches, `4` KNUQ variants and `2` post-donor events.
- Fresh source-set fingerprints:
  `eee04bae63a3969e7591b22bc50ef28f95be39f7eff7102e4a99907681dc8bf4` and
  `d5776b75af941ac805069958f05095b738c2996c776993408fedcf64f7c16210`.
- Three independent read-only prewrites passed identically. Do not execute
  recovery without a new single-use authorization bound to the final HEAD.

## PHASE_4_QA_AUTH_NONBLOCKING_2026-09-08

- Usar o perfil persistente `qa-browser-authenticated` e os comandos
  `qa:auth:status`/`qa:auth:resume` antes dos gates protegidos.
- Se o login expirar, concluir todo trabalho não autenticado e registrar apenas
  os gates reais pendentes em `.qa-state/`; não pedir confirmação repetida nem
  criar outro perfil sem justificativa.
- Após login normal, retomar a fila autenticada; recuperação e piloto continuam
  proibidos sem autorização single-use própria.

## PHASE_4_AUTOMATION_FOUNDATION_2026_09_06

- Foundation audit and safety regression locks are ready for review.
- Phase 4A read-only identity/fingerprint/reconciliation helpers are now
  implemented and covered by focused tests; real import write remains disabled.
- Phase 4B historical B3 preview/reconciliation foundation is implemented with
  explicit duplicate, unsupported, conflict and review states; no portfolio
  write is enabled.
- Phase 4C historical reconstruction is implemented as a read-only layer with
  explicit cross-source conflicts and verified BUY/SELL expected positions;
  protected write design remains a future gate.
- Phase 4D professional brokerage/reporting models are implemented read-only;
  Inter note support is tested, other brokers remain explicitly partial or
  unknown, and protected write/PDF generation remain future gates.
- Next candidate is Phase 4A: a focused read-only improvement to quote stale
  status/retry or RF contextual alerts, only after confirming the exact source
  and frozen-screen boundary.
- Imports, backup resilience, cloud sync and automatic dividend writes remain
  separately gated and were not started.

## PHASE_4E_PROTECTED_IMPORT_TRANSACTION_2026_09_06

- Test-mode-only protected coordinator is implemented and covered by focused
  rollback, idempotency, stale-preview, snapshot and reconciliation tests.
- Real user import remains disabled. No production persistence path, schema,
  finance semantics or real data was changed.
- Printable reconciliation is an HTML/CSS report foundation using native
  browser PDF printing; a dedicated PDF dependency is not justified yet.
- Next step requires separate authorization for any production write design or
  Phase 4F integration; do not infer it from fixture readiness.

## PHASE_4F_PROTECTED_IMPORT_INTEGRATION_2026_09_06

- Single end-to-end fixture pipeline is implemented and tested at 1k, 10k,
  25k and 50k synthetic events.
- Source detection is conservative; B3 movements and arbitrary PDF extraction
  remain partial/review-only where the existing parser contract is incomplete.
- No import history UI or production write path was added. The report is an
  ephemeral HTML/native-print foundation.
- Real pilot readiness remains false until a separately authorized, small,
  manually verifiable pilot contract is approved.

## PHASE_4G_PROFESSIONAL_IMPORT_CENTER_2026_09_06

- The isolated `Importar dados` route is ready for visual review in test mode.
- The route uses the existing Phase 4A--4F pipeline boundary conceptually and
  exposes conservative source support, review-required states, reconciliation,
  rollback evidence and ephemeral simulation history.
- The UI performs no real import and does not persist selected files or results.
  B3 movements, arbitrary brokerage PDFs, unknown formats and insufficient RF or
  corporate evidence remain partial/manual review items.
- Existing HTML/native-print reporting is the current report boundary; a real
  pilot, persistent import history, PDF dependency or production write remains
  separately gated.

## PHASE_4G_2_IMPORT_CENTER_FINAL_CANON_2026_09_06

- Import Center visual, information and dry-run interaction contracts are
  frozen after responsive review at 390, 430, 768, 1366 and 1920 px.
- Mobile keeps the active step visible as `Etapa N de 8`; desktop keeps all
  eight steps. Empty sessions remain compact and result safety states remain
  immediately readable.
- Do not reopen this route except for bug/regression, financial/data correctness
  or explicit user authorization. Real import remains disabled.

## PHASE_4H_7_SOURCE_LINKAGE_SHADOW_2026_09_06

- The shadow source-linkage proof is committed and covered by 11 focused tests.
- B3 remains the financial source of truth; Yahoo remains reference evidence.
- Existing Yahoo records are not deleted or rewritten. Financial totals must
  count canonical economic events once, never source evidence twice.
- The next protected boundary is a separately authorized additive persistence
  design and read-only migration preview. Do not open a real pilot write gate.

## PHASE_4H_8_ADDITIVE_SOURCE_LINKAGE_2026_09_06

- Phase 4H.8 is complete in test-mode with additive canonical event IDs and
  source evidence, deterministic reimport behavior, backup roundtrip proof,
  rollback proof and no production write path.
- The August canonical financial increment is `R$ 85,37`. The `R$ 2.488,47`
  linked value is already represented and contributes `R$ 0,00` of increment.
- Phase 4H.9 and any small real pilot remain blocked until separately
  authorized source-linkage persistence and manual review gates exist.

## PHASE_4H_8_1_PROTECTED_PILOT_GATES_2026_09_06

- Gate orchestration is implemented and tested in test-mode only.
- The hard financial invariant is 8537 cents (`R$ 85,37`).
- Technical readiness does not authorize a real write; explicit user
  authorization and a separately protected persistence phase remain required.

## PHASE_3_FINAL_AUDIT_CHECKPOINT_2026_09_06

- Publish `release/phase-3-3-final` and open the review PR after the green local
  gates; do not merge or deploy manually.
- Immediate backlog: evaluate backup-age visibility without touching the backup
  engine, and monitor global-search adoption and large-portfolio timings.
- Phase 4: prioritize only improvements backed by existing data sources and an
  approved visual contract.
- Phase 5: consider virtualization only after evidence of degradation in real
  data or a measured threshold breach.
- Measure later: real-portfolio performance, transaction-to-asset usage and
  comprehension of empty/error states.

## WHERE_WE_ARE

Project memory has been consolidated for the legacy SPA plus isolated modern
readonly host. The current checkout is preserved on
`feat/visual-product-north-star`.

## WHAT_IS_FROZEN

Finance Core, Persistence Core, schema, Firebase/storage, backups/imports,
real data, identity contracts, handlers and `modern/src`.

## WHAT_IS_NEXT

`CANONICAL_VISUAL_MIGRATION_02 - ATIVOS` is complete and frozen after user
approval. The screen now follows the frozen Dashboard and Dividendos
canon with a dense professional asset table, visible individual results,
filters, sorting, hover/popover and a mobile tap equivalent. Use the Ativos
video/reference library for behavior only; do not copy external brand
identity. Any follow-up work must preserve the official financial/data
contracts.

Ativos is not to be reopened without explicit authorization. No next screen
is selected automatically; the next roadmap item requires a new scope and
explicit product authorization before work begins.

The Dashboard, Dividendos and Sidebar visual contracts are now frozen and
require explicit user authorization for redesign or reinterpretation. RF
orphan reconciliation is complete and required no recovery.

`CANONICAL_VISUAL_MIGRATION_03 - RENDA FIXA` is complete and frozen after
user approval. The dedicated screen preserves official RF helpers, events,
identity contracts and review flows. Do not reopen Dashboard, Dividendos,
Sidebar, Ativos or Renda Fixa without explicit user authorization.

The next official candidate is `APORTES`, subject to a new explicit mission
scope and approval before implementation begins.

`CANONICAL_VISUAL_MIGRATION_04 - APORTES` is implemented and ready for final
user approval. The scope was limited to Aportes/Lançamentos; its official
movement sources, handlers, identity contracts and persistence were preserved.
After explicit user approval, `CANONICAL_VISUAL_MIGRATION_04=COMPLETE` and
`APORTES_VISUAL=FROZEN`. Do not reopen Aportes, Dashboard, Dividendos, Sidebar,
Ativos or Renda Fixa without explicit user authorization.

The next official candidate is `RENTABILIDADE`, subject to a new explicit
mission scope and approval before implementation begins.

`CANONICAL_VISUAL_MIGRATION_05 - RENTABILIDADE` is implemented and ready for
final user approval. The scope was limited to Rentabilidade; official return,
period, benchmark and asset-return sources were preserved. Do not freeze the
screen until explicit user approval. Do not reopen Dashboard, Dividendos,
Sidebar, Ativos, Renda Fixa or Aportes.

After explicit user approval, `CANONICAL_VISUAL_MIGRATION_05=COMPLETE` and
`RENTABILIDADE_VISUAL=FROZEN`. Do not reopen Rentabilidade or any previously
frozen screen without explicit user authorization.

The next official candidate is `REBALANCEAR`, subject to a new explicit mission
scope and approval before implementation begins.

`CANONICAL_VISUAL_MIGRATION_06 - REBALANCEAR` is implemented and ready for
final user approval. The scope was limited to the read-only Rebalancear screen;
allocation, target and suggestion contracts were preserved. Do not freeze the
screen until explicit user approval. Do not reopen Dashboard, Dividendos,
Sidebar, Ativos, Renda Fixa, Aportes or Rentabilidade.

`CANONICAL_VISUAL_MIGRATION_06=COMPLETE` and `REBALANCEAR_VISUAL=FROZEN`.
Rebalancear is closed for visual work unless explicitly authorized. The next
official candidate is `METAS` or `RELATORIOS`, following the roadmap decision
recorded for the next phase.

## WHAT_NOT_TO_TOUCH

Do not mix this repository with `C:\Projetos\carteira-2.0`. Do not start a
feature, alter financial logic, change persistence/schema, or publish from this
documentation phase.

## REQUIRED_FILES

Read `PROJECT_STATE.md`, `ARCHITECTURE_MAP.md`, `VISUAL_CANON.md`,
`PRODUCT_CONTRACTS.md` and `TESTING_AND_RELEASE.md` before the relevant work.

## REQUIRED_SKILLS

Use the smallest applicable set: `interface-design` for product UI,
`impeccable` for polish-only work, `playwright` or `browser-testing-with-devtools`
for browser evidence, and `doubt-driven-development` before protected
financial/persistence decisions.

## ACCEPTANCE_CRITERIA

Small reversible diff, no protected-area change, official data paths preserved,
tests/builds appropriate to scope, browser evidence at required viewports for
UI work, `git diff --check` clean, and no commit/push/PR/merge/deploy without
the phase's explicit authorization.

`CANONICAL_VISUAL_MIGRATION_07=IMPLEMENTED` and
`METAS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
Do not freeze Metas until explicit user approval. Do not reopen Dashboard,
Dividendos, Sidebar, Ativos, Renda Fixa, Aportes, Rentabilidade or Rebalancear.
The next candidate after Metas is `RELATORIOS`, subject to a new mission and
approval.

`CANONICAL_VISUAL_MIGRATION_07=COMPLETE` and `METAS_VISUAL=FROZEN`.
Metas is closed for visual work unless explicitly authorized. Do not reopen
Dashboard, Dividendos, Sidebar, Ativos, Renda Fixa, Aportes, Rentabilidade,
Rebalancear or Metas. The next official mission is `RELATORIOS`, subject to a
new scope and approval.

`CANONICAL_VISUAL_MIGRATION_08=IMPLEMENTED` and
`RELATORIOS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
Relatorios recebeu apenas refinamento de hierarquia, densidade e separacao
visual entre relatorios analiticos e backup/importacao. Nao marcar Relatorios
como congelado antes da aprovacao visual explicita do usuario. Nao reabrir
Sidebar, Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
Rebalancear ou Metas.

`CANONICAL_VISUAL_MIGRATION_08=COMPLETE` and `RELATORIOS_VISUAL=FROZEN`.
Relatorios is closed for visual work unless explicitly authorized. Do not
reopen Sidebar, Dashboard, Dividendos, Ativos, Renda Fixa, Aportes,
Rentabilidade, Rebalancear, Metas or Relatorios. The next official candidate is
`FUNDOS`, subject to a new explicit mission and approval.

`FUNDOS_ANALISE_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
The scope is limited to the `ativos` analysis subsurface
(`assetsInnerTab=analise`); the main Ativos screen remains frozen. Do not
reopen any frozen screen without explicit user authorization. After approval,
record `FUNDOS_ANALISE=COMPLETE`; the next roadmap candidate remains to be
selected from the documented unfrozen surfaces.

## POST_CANON_ROADMAP_AUDIT

`RF_NAVIGATION_DECISION=REMOVE_RF_FROM_ATIVOS` was applied as a minimal
navigation correction. The dedicated sidebar entry remains the single entry
point for the full Renda Fixa experience; the RF summary inside `Todos os
ativos` remains intentionally available. No frozen visual screen was
redesigned.

`PRODUCT_IMPROVEMENT_PHASE_02=ANALYSIS_DESTINATION_IMPLEMENTED`.
Análise agora é uma rota própria e reutiliza `assetAnalysisRows()` /
`assetAnalysisBlock()`; não há segundo motor analítico.

`NEXT_OFFICIAL_MISSION=ANALYSIS_VISUAL_AND_PRODUCT_QA` remains the next
roadmap item. After its approval, evaluate `CONFIGURACOES` only with an
explicit backup/import safety review.

## ANALYSIS_AND_NAVIGATION_FREEZE

`ANALYSIS_VISUAL=FROZEN` and `NAVIGATION_ARCHITECTURE=FROZEN`.
The canonical desktop structure is Dashboard, Ativos, Renda Fixa, Análise,
Aportes/Lançamentos, Metas, Dividendos, Rentabilidade, Rebalancear and
Relatórios. Renda Fixa and Análise are dedicated destinations, not Ativos inner
tabs. The mobile bottom navigation remains compact and exposes Análise through
`Mais seções`.

The P1 Ativos performance filter was implemented and frozen as a functional
improvement using the existing official result source. Remaining backlog is
`P2` safe contextual links and Configurações backup/import safety review, plus
`P3` icon and empty-state consistency. Do not reopen frozen surfaces without
explicit authorization.

`PRODUCT_USABILITY_IMPROVEMENTS_02` is frozen as a functional improvement:
global search discovery and contextual links passed focused and five-viewport
browser QA without new financial logic.

`NEXT_OFFICIAL_MISSION=SECONDARY_SURFACE_REFINEMENT_01_IRPF`. The following
mission must remain separate from the protected Configurações, Backup, Import
and Restore flows; those require a dedicated safety review.

`SECONDARY_SURFACE_REFINEMENT_01_IRPF=COMPLETE`. The next official mission is
`SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA`, keeping Configurações, Backup,
Import and Restore outside this scope until a dedicated safety review.

`IRPF_VISUAL=FROZEN`. Do not reopen IRPF without explicit authorization.
`NEXT_OFFICIAL_MISSION=SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA`.

`AUDITORIA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
Auditoria recebeu refinamento restrito de hierarquia, priorizacao, filtros,
estados vazios e acoes contextuais, sem alterar o contrato de identidade ou
revalidacao. Nao marcar Auditoria como congelada antes da aprovacao visual
explicita do usuario.

`SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA=COMPLETE` e
`AUDITORIA_VISUAL=FROZEN`. A proxima missao oficial e
`PRODUCT_SAFETY_REVIEW_01_CONFIGURACOES`, com revisao inicial de Configuracoes,
Backup, Importacao, Restore, Conta/Nuvem e Zona de perigo. Nao alterar
semantica de persistencia ou backup sem autorizacao explicita.

## SAFETY HARDENING 01

`SAFETY_HARDENING_01_RESET_AND_BACKUP_VALIDATION=COMPLETE`.
Reset de carteira agora remove eventos e estados transitorios de Renda Fixa.
Backups incompatíveis ou estruturalmente malformados são rejeitados antes da
confirmação, sem migração automática desconhecida.

`NEXT_OFFICIAL_MISSION=PRODUCT_SAFETY_REVIEW_02_CONFIGURACOES_VISUAL`.
O próximo escopo é somente visual: hierarquia, agrupamento, avisos, zona de
risco e UX mobile. Os contratos de backup, importação, restore, autenticação,
sincronização e reset permanecem congelados.

`PRODUCT_SAFETY_REVIEW_02_CONFIGURACOES_VISUAL=COMPLETE`.
Configurações recebeu revisão visual e de hierarquia sem alterar os fluxos
protegidos. A próxima decisão é a aprovação visual final do usuário; não
marcar Configurações como congelada antes dessa aprovação.

## PRODUCT USABILITY IMPROVEMENTS 02

`GLOBAL_SEARCH_REFINEMENT=READY_FOR_FINAL_USER_APPROVAL` e
`CONTEXTUAL_NAVIGATION=READY_FOR_FINAL_USER_APPROVAL`.
A busca global permanece somente leitura e os links contextuais da Análise
reduzem a fricção sem reabrir telas congeladas. A busca não abre editores nem
ações destrutivas diretamente.

`NEXT_RECOMMENDED_ACTION=USER_REVIEW_PRODUCT_USABILITY_02`.


## PRODUCT SAFETY REVIEW - AUDITORIA

AUDIT_SAFETY_REVIEW=FROZEN.
AUDIT_WRONG_RECORD_PROTECTION=FROZEN e AUDIT_IDENTITY_CONTRACT=FROZEN. Acoes exatas exigem revalidacao de ID e chave; registros stale recuam para a rota geral. Nao iniciar IRPF_PRODUCT_REVIEW automaticamente.
## IRPF FUNCTIONAL FREEZE

- `IRPF_FUNCTIONAL_REVIEW=FROZEN`
- `IRPF_VISUAL=FROZEN`; `IRPF_MOBILE_PATTERN=FROZEN`;
  `IRPF_TAX_LOGIC_CHANGED=false`.
- O relatório continua auxiliar e somente leitura, usando
  `irpfBuildYearReport(year)`, agrupamentos oficiais, totais oficiais e os
  exportadores CSV/PDF existentes.
- Zeros válidos permanecem distintos de ausência e dados incompletos continuam
  explícitos.
- `NEXT_RECOMMENDED_ACTION=RELEASE_CONSOLIDATION`.
- Não reabrir IRPF nem as superfícies congeladas sem autorização explícita.

## RELEASE CONSOLIDATION

- `PRODUCT_USABILITY_RELEASE=READY_FOR_PR`.
- A consolidação reúne somente as melhorias aprovadas de Análise, navegação de
  Renda Fixa, filtro de performance, busca global, links contextuais,
  segurança da Auditoria e relatório mobile do IRPF.
- `NEXT_RECOMMENDED_ACTION=SETTINGS_SAFETY_REVIEW`.
- Não iniciar o trabalho de Configurações antes da integração desta release.
## DASHBOARD VISUAL FREEZE

`DASHBOARD_VISUAL=FROZEN`, `DASHBOARD_REFERENCE_LOCK=FROZEN` e
`DASHBOARD_CHART_INTERACTION=FROZEN` apos aprovacao visual explicita.
O alvo estrutural permanente e `Refs/visual-canon/dashboard-canonical.png`;
`Tela Principal.png` permanece somente referencia secundaria de acabamento.
Nao reabrir o Dashboard sem autorizacao explicita.

`VISUAL_REFERENCE_LOCK_PROCESS=ACTIVE`: toda nova aprovacao visual deve
comparar com a referencia primaria, registrar escopo e validar browser nos
cinco breakpoints; testes/builds nao equivalem a aprovacao visual.

`NEXT_VISUAL_TARGET=INVENTARIO_DE_REFERENCIAS`; nao iniciar automaticamente.

## 2026-09-04 - Ativos visual reference lock

- `NEXT_VISUAL_TARGET=ATIVOS`.
- `ATIVOS_REFERENCE_LOCK=READY_FOR_FINAL_USER_APPROVAL`.
- Referencia: `Refs/visual-canon/Tela de aportes e ativos.png`, somente a
  porcao de Ativos.
- Nao marcar Ativos como FROZEN antes da aprovacao visual explicita.

## 2026-09-04 - Ativos final reference polish

- `ATIVOS_FINAL_REFERENCE_POLISH=READY_FOR_FINAL_USER_APPROVAL`.
- Confirmar visualmente a hierarquia final: KPIs, filtros, resumos compactos,
  tabela primaria e alocacao por classe usam a referencia de Ativos, sem copiar
  os modulos de Aportes.
- Aguardar aprovacao do usuario; sem commit, push, PR, merge ou deploy.

## 2026-09-04 - Ativos reference lock freeze

- `ATIVOS_VISUAL=FROZEN` e `ATIVOS_REFERENCE_LOCK=FROZEN` apos aprovacao explicita.
- `ATIVOS_PRIMARY_CONTENT=FROZEN`, `ATIVOS_DENSITY=FROZEN` e
  `ATIVOS_ICON_LANGUAGE=FROZEN`.
- `NEXT_VISUAL_TARGET=APORTES`; usar a porcao de Aportes de
  `Refs/visual-canon/Tela de aportes e ativos.png` sem reabrir Ativos.

## CURRENT_PHASE_3_3_LOCAL_CHECKPOINT

- Dividendos permanece congelado com contrato canônico de cinco KPIs, matriz
  histórica, evolução mensal, top pagadores, resumo anual, filtros, exportação
  e adaptação responsiva.
- Os smoke tests legados de Dividendos foram migrados para o contrato atual e
  estão verdes localmente.
- O próximo passo é uma branch limpa de release baseada no `origin/main`; este
  checkpoint não autoriza merge ou deploy.
- O atalho contextual transação -> ativo foi implementado nesta branch com
  identidade exata, sem matching aproximado e sem mutação financeira. Busca
  global, maturidade de RF e segurança de uso mobile permanecem cobertas.

## PHASE_3_3_PRODUCTIVITY_CHECKPOINT

- `TRANSACTION_TO_ASSET=IMPLEMENTED_READ_ONLY`
- `EXPLICIT_ASSET_IDENTITY=true`
- `APPROXIMATE_MATCHING=false`
- Ações de busca continuam somente leitura; Ativos, Renda Fixa, Dividendos,
  Metas, Auditoria e Análise mantêm suas rotas oficiais.
- `PUSH=false`, `PR=false`, `MERGE=false`, `DEPLOY=false` para a branch local
  `feature/phase-3-3-productivity-final`.

## PHASE_4H_REAL_PILOT_PREPARATION

- Read-only readiness contract is implemented for a future one-month
  `B3_DIVIDENDS_XLSX` pilot.
- Do not request or process a live file until the user is ready to provide the
  period and explicit pilot authorization. The gate remains closed even when
  dry-run criteria are satisfied.
- Required future evidence: exact identities, supported income types only,
  manual verification complete, no duplicate/conflict/unsupported/corporate
  blockers, valid backup and targeted snapshot, zero position/average-price
  impact, reimport proof and rollback proof.
- `FULL_HISTORY_IMPORT_READY=false`; `REAL_USER_IMPORT_ENABLED=false`;
  `REAL_USER_DATA_WRITE=false`; `PUSH=false`; `PR=false`; `MERGE=false`;
  `DEPLOY=false`.
- `NEXT_RECOMMENDED_ACTION=REQUEST_ONE_MONTH_B3_DIVIDENDS_EXPORT_ONLY_AFTER_EXPLICIT_PILOT_REVIEW`.

## PHASE_4H_TARGETED_YAHOO_RECOVERY_RUNTIME_GATE_2026_09_07

- `RECOVERY_LIVE_STATE_MISMATCH_ROOT_CAUSE=BOUND_BEFORE_CLOUD_STATE_STABILIZED`.
- Protected recovery binding is now created only after the authenticated cloud
  snapshot is applied, and the internal surface requires read-only parity with
  the executor preflight before enabling the control.
- Validated on the static legacy server at `127.0.0.1:4173`; do not use Vite
  for this runtime evidence. Three consecutive prewrite checks produced the
  same live, donor, plan and review fingerprints.
- `REAL_RECOVERY_EXECUTED=false`, `REAL_USER_DATA_WRITE=false`, and the V5
  authorization was not consumed because it was rejected before mutation.
- Next step: issue a fresh single-use targeted Yahoo recovery authorization
  bound to the latest manifest, then stop after recovery; the August pilot
  remains a separate authorization.

## PHASE_4H_CLICK_TIME_PARITY_2026_09_07

- `RECOVERY_LIVE_STATE_MISMATCH` was traced to different canonical inputs at
  display time versus click-time plan/executor preflight. The focused fix uses
  the official readiness canonical state and reuses one fresh click-time
  prepared state.
- Validate only through the legacy static-root server on port 4173. The
  internal dry-run query reaches the real prewrite entrypoint without creating
  a snapshot or mutating/persisting data.
- No real recovery has been executed. Before any new authorization, collect a
  fresh authenticated preflight manifest and ensure the click-time dry-run is
  green; August remains a separate later authorization.

## PHASE_4H_QA_HARNESS_NEXT_STEP_2026_09_07

- Use `npm.cmd run qa:browser:start` with the ignored dedicated profile, then
  complete normal authentication once if the profile is new.
- Verify with `npm.cmd run qa:browser:check` and run
  `npm.cmd run qa:auth-smoke`; do not use the everyday Chrome profile.
- Only after the native dry-run and fresh fingerprints are green may a new
  single-use targeted recovery authorization be considered. Recovery and the
  August pilot remain separate gates.

## PHASE_4H_NATIVE_PROOF_COMPLETED_2026_09_07

- Usar Chrome estável QA, não Chrome for Testing, para login Google.
- A prova nativa Playwright em CDP 9232 passou 3/3 em dry-run e permaneceu
  estável após refresh, hard refresh e reabertura de rota.
- Próximo passo: nova pré-validação read-only do recovery com o fingerprint
  vivo fresco; não executar recovery real nem piloto de agosto nesta etapa.

## PHASE_4H_SERIALIZATION_FIX_2026_09_07

- V6 foi consumida e não pode ser reutilizada. O rollback preservou
  `LIVE_COUNTS=329/329/0`; cloud sync não foi liberado.
- O read-back protegido agora valida o envelope de storage e passa somente a
  string `value` para `PersistenceCore.parseStoredState()`.
- Antes de uma nova autorização, executar `qa:phase4h-native` e
  `qa:phase4h-persistence`, congelar HEAD + fingerprints frescos e confirmar
  `99/99/0`. Recovery real e piloto de agosto permanecem bloqueados até novas
  autorizações explícitas e separadas.

## PHASE_4H_OVERNIGHT_STABILIZATION_2026_09_07

- Runtime autoritativo: Chromium Playwright dedicado, perfil persistente fora
  do repositorio, CDP localhost na porta 9333 e servidor legado estatico 4173.
- `qa:session:check` valida HEAD, servidor, CDP, auth, cloud settled, surface,
  callbacks e estabilidade de fingerprint sem expor dados privados.
- `qa:phase4h:prewrite` encadeia health, native dry-run e persistence dry-run;
  nunca cria snapshot, salva, sincroniza ou executa recovery real.
- A fingerprint viva fresca e `bfe99832c39fb365cf4953fcb161392ac6df4974e26343d8e27f53dc0cfd5fe4`;
  soak de 300s e reinicio/reconexao do navegador QA permaneceram estaveis.
- Proximo passo: solicitar nova autorizacao single-use vinculada a esse
  manifesto fresco. Nao reutilizar V6/V7 e nao executar piloto de agosto.

## PHASE_4H_V8_RECOVERY_COMPLETED_2026-09-08

- A recuperacao real V8 foi executada uma unica vez no executor protegido e
  restaurou 99 eventos Yahoo. O estado final validado e `428/329/99`, com
  incremento financeiro zero e sem mudança de posicao, PM, ativos ou RF.
- O reload autenticado preservou o estado e a reconciliacao histórica ficou em
  `21/0/0`; o plano então registrado era `24/21/1/2`. V39 provou que essa
  contagem vinha de fixture sintética e a substituiu por `24/20/1/2/1
  deferred`. Idempotencia foi aprovada em `0/0/0`.
- Backup novo: `local-imports/carteira-investimentos-post-recovery-v8-2026-09-08-07-00.json`,
  fingerprint `a2cbe73690d571621ace0eea51dc62398694b8c7741df67e67a6e40e9eb42989`.
- A autorizacao V8 esta consumida. O piloto de agosto continua sem escrita;
  proximo passo: pre-validacao/autorizacao separada do piloto.

## PHASE_4I_NATIVE_PILOT_DRYRUN_COMPLETED_2026-09-08

- A superficie interna do piloto de agosto agora possui dry-run nativo em
  `?internalPilot=1&internalPilotDryRun=1#internal-pilot`, com input DOM e
  preflight do adapter oficial. O caminho nao cria snapshot, nao muta, nao
  salva e nao sincroniza.
- Prova Playwright autenticada: handler, plano, review, autorizacao e
  preflight alcancados; 3/3 resultados identicos, estaveis em 5s/30s/60s,
  refresh e hard refresh. Manifesto `91ebe347...` e live fingerprint
  `139412caf...` permaneceram estaveis.
- Pronto para nova autorizacao single-use do piloto real. Nao executar sem
  autorizacao explicita vinculada ao manifesto completo.

## PHASE_4I_REAL_PILOT_EXECUTOR_READY_2026-09-08

- O executor real protegido foi implementado e validado somente em sandbox e
  dry-run. O contrato V39 substitui a antiga contagem sintética: são 20
  evidências de linkage, um evento TEPP11 e um KNUQ11 deferred/no-op; as
  exclusões DIVD11/NDIV11 ficam como auditoria sem eventos financeiros.
- `npm.cmd run qa:phase4i:prewrite` e o gate obrigatorio imediatamente antes de
  qualquer autorizacao. Ele prova o clique nativo tres vezes, confirma o
  manifesto e nao cria snapshot, mutacao, save ou sync.
- Proximo passo unico: congelar o HEAD final e conceder uma nova autorizacao
  single-use vinculada aos cinco fingerprints atuais. O piloto real ainda nao
  foi executado.
## PHASE_4I_CLOUD_HYDRATION_GUARD_2026-09-08

- Diagnostico autenticado encontrou que o estado local inicial `329/329/0`
  podia enfileirar upload antes de `FB.cloudLoaded`, permitindo sobrescrever o
  snapshot cloud autoritativo. O estado `329` nao era o donor oficial.
- O guard agora bloqueia uploads ate a primeira hidratacao cloud e migrações de
  bootstrap usam `save({queueCloud:false})`. Eventos com
  `sourceEventKind=reference` continuam preservados sem duplicacao.
- A conta atual nao deve ser considerada recuperada: a leitura cloud/runtime
  atual esta em `329/329/0`. O backup pos-recovery V8 permanece a evidencia
  offline `428/329/99`; nao fazer patch manual, restore amplo ou piloto.
- Proximo passo: uma operacao explicitamente autorizada para restaurar o estado
  oficial, depois revalidar runtime/local/cloud e somente entao congelar o
  manifesto Phase 4I.

## PHASE_4H_CLOUD_PERSISTENCE_COLD_RELOAD_FIX_2026-09-08

- A ultima V3 real chegou a `428/329/99` no readback local, mas o cold reload
  autenticado retornou `329/329/0`; a autorizacao foi consumida e nao pode ser
  repetida.
- O gate tecnico agora exige leitura cloud direta, payload protegido contra
  aba stale, acknowledgement de sync, rollback direcionado e nova identidade
  de runtime no cold boot. Merge em memoria nao e prova de reload.
- Nesta etapa nao houve nova escrita real, piloto ou patch manual. Nao congelar
  autorizacao enquanto a prevalidacao nao provar local/cloud/cold boot no mesmo
  estado.

## PHASE_4H_FORENSIC_430_BASELINE_2026-09-08

- Prevalidacao read-only encontrou `430/329/101` em runtime, local e cloud;
  a autorizacao de restore foi cancelada antes do snapshot.
- Os 101 registros usam `eventType=Yahoo`, mas `source` vazio. O contador
  antigo ignorava `eventType`; a classificacao generica foi corrigida para
  considerar `eventType`/`incomeType`, sem migrar dados.
- Comparacao sanitizada contra o donor: 95 identidades esperadas presentes,
  4 ausentes e 6 extras. O plano atual e `24/20/1/2`, portanto nenhum restore
  deve ser executado ate a revisao de origem.
- Cold boot preservou as mesmas 101 identidades. Recovery e piloto continuam
  bloqueados; proximo passo e congelar manifestos de revisao, nao de escrita.

## PHASE_4H_TARGETED_CORRECTION_MANIFEST_2026-09-08

- Estado autenticado confirmado em runtime, local e cloud: `430/329/101`.
  Donor: `428/329/99`. Nenhuma escrita, snapshot, save, sync ou recovery real.
- Os quatro KNUQ11 divergentes sao variantes somente de valor:
  `8067->8073`, `7929->7935`, `8964->8970` e `8274->8280` cents. Backups
  anteriores repetem os valores do donor; a planilha B3 disponivel termina
  antes desses pagamentos. A origem mais provavel e Auto Yahoo, mas o momento
  exato de criacao nao esta persistido.
- FATN11 `2026-09-08/12480` e DIVD11 `2026-09-08/3513` sao extras pos-donor
  presentes nos tres estados e mantidos como financeiros. O DIVD11 de setembro
  nao e a exclusao de agosto de `559` cents.
- Classe da proxima operacao: `C_REPLACE_4_KNUQ_AND_RECLASSIFY_OTHERS`:
  quatro `REPLACE`, 95 `RECLASSIFY` e dois extras mantidos. Alvo `430/329/101`,
  99 referencias marcadas, delta financeiro `-1017188` cents, sem impacto em
  posicao, PM, ativos ou RF. O registro histórico do clone dizia links
  `21/0/0` e plano agosto `24/21/1/2`; V39 o classificou como fixture sintética
  e o contrato executável atual é `24/20/1/2/1 deferred`.
- `npm.cmd run qa:phase4h:reconcile-prewrite` repete a pre-validacao tres
  vezes em modo somente leitura. Ainda falta autorizacao single-use para
  qualquer correcao real.

## Proximo gate Class C

O executor oficial Class C esta pronto em modo protegido e foi validado no
runtime autenticado sem escrita. A proxima acao exige nova autorizacao single-use
 vinculada ao HEAD e aos fingerprints recalculados; nao reutilizar autorizacoes antigas.

A tentativa anterior foi cancelada antes do snapshot por um símbolo ausente no
callback. O defeito foi corrigido e validado no sandbox; é necessária uma nova
autorização single-use vinculada ao novo HEAD.

## PHASE_4H_PRE_CLASS_C_LOCAL_RECOVERY_2026-09-08

- O executor seguro `TARGETED_PRE_CLASS_C_LOCAL_RECOVERY` foi implementado para
  convergir somente o estado local divergente para a ancora pre-Class-C cloud:
  `430/329/101`, zero referencias e `3718277` cents.
- O snapshot e persistido antes de uma futura mutacao, e o rollback usa slot e
  identidade original dos 99 registros. O caminho nao possui escritor cloud e
  usa `queueCloud:false` na persistencia local.
- Sandbox, rollback, idempotencia e failure-closed passaram. Nao executar a
  recovery real, Class C ou piloto de agosto nesta etapa.
- Proximo gate: abrir uma sessao autenticada segura no HEAD final sem aplicar
  cloud, rodar `npm.cmd run qa:phase4h:preclassc-recovery-prewrite` tres vezes,
  e somente entao avaliar uma autorizacao single-use nova.
## PHASE_4H_101_YAHOO_LOCAL_RECOVERY_NEXT_STEP_2026_09_09

- A base local atual é `329/329/0`, sem referências, com total de
  `2685096` centavos; o cloud autenticado observado é `430/329/101`, sem
  referências, com total de `3718277` centavos.
- A próxima recuperação, se autorizada, deve ser explicitamente aditiva para
  101 eventos Yahoo. A composição observada é 95 donor exatos, 4 variantes KNUQ
  e 2 eventos pós-donor. Não usar automaticamente o manifesto antigo de 99
  eventos nem a impressão donor que não foi reproduzida pelos bytes disponíveis.
- O executor local-only e o prewrite read-only estão implementados, mas a prova
  autenticada final e qualquer autorização single-use continuam bloqueadas até
  o QA autenticado voltar a estar disponível. Não executar recovery, Class C,
  sync ou piloto de agosto antes disso.
