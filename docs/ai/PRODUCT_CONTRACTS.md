# Product Contracts

## Core rule

The UI consumes canonical values. It does not recalculate, approximate or
duplicate the financial engine. A visual change may alter composition, spacing,
labels and disclosure, but not the meaning or source of a value.

## Financial sources

| Concern | Canonical source/path | UI rule |
|---|---|---|
| Portfolio/patrimony | `patrimonySnapshot()` and official aggregate helpers in `index.html` | Do not rebuild totals in markup |
| Invested/current/result | `assetAppliedValue()`, `assetCurrentValue()`, `assetAnalysisRows()` and FinanceCore paths | Preserve sign, zero and missing semantics |
| Asset return | `assetRentabPct()` / official asset analysis rows | Do not derive a second percentage |
| Fixed income | `rfValues()`, `rfIntelligenceSnapshot()`, `rfEvents` and official RF handlers | Preserve identity, event and maturity contracts |
| Dividends | `proventoStats()` and official dividend/history builders | Preserve type filters, history and links |
| Goals | `passiveIncomeGoalStats()`, goal helpers and `metasTab()` | No invented targets or metrics |
| Contributions | Aportes state, movement contracts and official summary helpers | Preserve session mode and movement meaning |
| Returns/benchmarks | `rentabilidadeTab()` and official benchmark paths | No parallel contribution or benchmark calculation |

## Identity and actions

- Asset identity is stable `asset.id` where available.
- A unique ticker is not a substitute for an ambiguous or stale ID.
- `go()` is the canonical route mechanism; `edA(id)` and existing RF editors are
  canonical action handlers.
- Related routes must use the accepted current contract, including
  `renda-fixa` rather than the historical alias `rendaFixa`.

## Persistence and data

- `persistence-core.js` owns serialization and storage boundaries.
- Default legacy keys are `civ5` and `civ5_cfg`; theme is `carteira_theme`.
- Firebase, localStorage, backups, imports and migration compatibility are
  protected contracts.
- `testMode` is deterministic in-memory behavior, not proof of production
  persistence.
- Never mix fixture data with real user data or silently repair records in UI.

## Feature preservation matrix

| Area | Must preserve |
|---|---|
| Ativos | buy/sell, edit, expand, search/filter, result sign and asset identity |
| Renda Fixa | events, maturity, applied/current/result, edit/redemption flows |
| Dividendos | official types, history, review queue, RF links, filters and actions |
| Aportes | movement contracts, official summaries and session mode behavior |
| Metas | goal values, progress, dates and contribution actions |
| Rentabilidade | datasets, order, scale, benchmarks and contextual asset actions |
| Rebalancear | drift sign, target and canonical contribution priority |
| Auditoria | findings, severity, selectors, filters and review actions |
| Reports | readonly contracts, exports, session context and asset rows |

## Safe visual scope

Allowed without a financial phase: CSS, layout, typography, spacing, semantic
labels, accessible focus, responsive disclosure and rendering of existing
values. Not allowed: new formulas, inferred identities, new persistence,
schema changes, write handlers, or changes to zero-versus-absence behavior.
