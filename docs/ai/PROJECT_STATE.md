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
