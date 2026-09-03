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
