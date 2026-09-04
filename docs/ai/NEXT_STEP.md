# Next Step

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
