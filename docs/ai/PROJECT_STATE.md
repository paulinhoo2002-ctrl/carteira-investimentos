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
