# Wave B Freeze Record

Date: 2026-09-04

## Approved surfaces

- `DIVIDENDOS_VISUAL=FROZEN`
- `REBALANCEAR_VISUAL=FROZEN`
- `ANALISE_VISUAL=FROZEN`
- `DIVIDENDOS_REFERENCE_LOCK=FROZEN`
- `REBALANCEAR_REFERENCE_LOCK=FROZEN`
- `ANALISE_REFERENCE_LOCK=FROZEN`

Reference fidelity: Dividendos `90`, Rebalancear `89`, Análise `89`.

## Protected contracts

- Dividendos keeps its official historical, chart, ranking and annual-summary
  sources, including valid-zero semantics.
- Rebalancear remains readonly. It uses `rebalanceContributionDistribution()`,
  `allocationGoalItems()`, `allocationActualByType()` and
  `rebalanceAssetSuggestions()` without persistence writes or transactions.
- Rebalancear supports both empty and populated simulation states. Missing
  individual suggestions remain absent; no suggestion is fabricated.
- Análise remains on route `analise`, using `assetAnalysisRows()` and
  `assetConcentrationAlert()` without unsupported metrics or recommendations.

## Proven design patterns

- `PROVEN_KPI_PATTERN`: compact executive financial card with clear
  label/value/context hierarchy, semantic value color and consistent icon
  container.
- `PROVEN_HEADER_PATTERN`: strong title, concise subtitle and secondary
  actions or filters.
- `PROVEN_CARD_PATTERN`: dark tonal surface, subtle border, controlled depth
  and dense readable content.
- `PROVEN_ICON_PATTERN`: canonical inline SVG with consistent weight, size and
  semantic accent; no emoji inside frozen target content.
- `PROVEN_FILTER_PATTERN`: compact controls with clear selected state, visible
  count where useful and safe mobile behavior.
- `PROVEN_CHART_PATTERN`: clean axes, restrained grid, strong primary series
  and bounded tooltip/focus context.
- `PROVEN_TABLE_PATTERN`: financial data first, tabular numbers and no
  ellipsis on critical values.
- `PROVEN_RANKING_PATTERN`: identity, financial result and semantic indicator
  in a compact ordered row.
- `PROVEN_EMPTY_STATE_PATTERN`: explicit semantic state; valid zero is never
  treated as missing data.
- `PROVEN_MOBILE_STACK_PATTERN`: executive summary first, stacked cards/lists
  instead of forced desktop tables, with bottom navigation protected.

`DESIGN_SYSTEM_EXTRACTION_STATUS=SIGNALS_PROVEN_NOT_YET_EXTRACTED`.
Global shared-component refactoring is intentionally deferred.

## Validation

- Empty and populated Rebalancear were checked in test mode with `R$ 500`.
- Browser matrix passed at 390, 430, 768, 1366 and 1920 pixels without page
  overflow, financial clipping, console errors, page errors or failed requests.
- Full suites passed: root `75/75`, modern `750/750`, finance `80/80` and
  persistence `32/32`.
- No Finance Core, persistence, schema or real-data changes were made.

Next visual wave: `WAVE_C_RELATORIOS_METAS_AUDITORIA`.
