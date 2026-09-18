# V194 Executive Integrated Release

## Problem and opportunity

The legacy SPA already exposes trustworthy portfolio, fixed-income, income, quality and report data, but several screens still make the user infer context from visual cards, charts or route names. V194 improves interpretation and navigation without adding a financial engine or persistence behavior.

## Current-state evidence

- `dashboardLatestSourceInfo()` already derives the most recent non-manual source from existing aportes, proventos and assets.
- `dashboardDataQuality()` already distinguishes audit alerts, incomplete assets and incomplete fixed-income positions.
- `lineChart()` already exposes keyboard-focusable points and tooltip labels, but the SVG itself has no concise semantic summary for assistive technology.
- `assetDetailPage()` already uses `asset.id`, existing value helpers, trust metadata, history and income records.
- `reportsTab()` already consumes `reportsSnapshot()`, official report rows and existing CSV/JSON/PDF exporters.

## Exact user-visible changes

1. Dashboard quality/source panel gains explicit read-only freshness status and useful route action when source or audit context supports one.
2. Dashboard contextual actions use visible labels and accessible names that state destination, without adding microcards or new metrics.
3. Asset detail gains compact “Como ler esta posição” summary using only already-rendered value, result, data quality and source/trust state; missing values remain `—`.
4. Report evolution bars gain adjacent text summary/list for keyboard and screen-reader users; bar heights remain presentation only.
5. Shared line charts gain accessible name and summary derived from supplied labels/series, without changing values, scales or calculations.
6. Empty, unavailable and error copy in touched components is explicit and never uses zero as substitute for missing data.
7. Touched layouts receive narrow responsive adjustments for 390x844 and 1366x768; existing frozen visual contracts remain otherwise unchanged.

## Affected screens/components

- Dashboard: `dashboardDataQuality`, `dashboardInsightsPanel`, source/freshness presentation and contextual actions.
- Asset detail: `assetDetailPage` presentation block.
- Reports: `reportsTab` evolution section.
- Shared chart renderer: `lineChart` accessibility attributes and summary.
- Tests: focused dashboard, asset-detail, report and chart contract tests.

## Existing data sources

- `dashboardLatestSourceInfo()` and `dataQualitySnapshot()`.
- `assetAppliedValue()`, `assetCurrentValue()`, official result rows and `assetDetailTrust()`.
- `reportsSnapshot()`, `patrimonySnapshot()` and existing report rows.
- Exact `series`, `labels` and `valueFormatter` already passed to `lineChart()`.

## State semantics

- Loading remains a presentation state; no placeholder becomes a financial value.
- Empty means no records are present.
- Unavailable means a trustworthy value is not available and renders `—` or an explicit explanation.
- Error remains distinct from empty data.
- No new persistence, localStorage, Firebase, import confirmation or event realization is introduced.

## Responsive and accessibility expectations

- No page-level horizontal overflow at 390x844 or 1366x768.
- Existing 44px interaction target contract remains intact.
- Charts expose accessible name and text summary; color is not the only carrier of state.
- Context actions use real buttons/links, visible labels and route names.
- Desktop density remains compact; mobile uses stacking rather than clipping.

## Acceptance criteria

- Financial formulas, fixed-income authority, import preview/dedupe/confirm and persistence semantics remain unchanged.
- `UNAVAILABLE_IS_NOT_ZERO` remains true in new assertions.
- Focused tests fail before implementation and pass after each wave.
- Full test suite, UI suite, build and reliability smoke pass.
- Browser QA passes at 390, 430, 768, 1366 and 1920 with zero relevant console, page or request failures and zero protected writes.
- Diff contains no QA artifacts, secrets, mock production data or new runtime dependencies.

## Explicit non-goals

- No new financial calculation, analytics engine, provider, persistence schema, backup/import rewrite, AI recommendation or corporate-event realization.
- No wholesale redesign of frozen screens.
- No agent, skill, MCP, governance or historical-worktree changes.

## Financial safety invariants

`UNAVAILABLE_IS_NOT_ZERO=true`, `UNKNOWN_IS_NOT_ZERO=true`, `FIXED_INCOME_MANUAL_AUTHORITY_UNCHANGED=true`, `IMPORT_PREVIEW_DEDUPE_CONFIRM_UNCHANGED=true`, `REAL_AUTO_REALIZATION_ENABLED=false`, `PERSISTENCE_SEMANTICS_UNCHANGED=true`, `FINANCIAL_FORMULAS_UNCHANGED=true`, and `PROTECTED_QA_ZERO_WRITE_REQUIRED=true`.

## Internal critical review

PASS. Each change has bounded user benefit, reuses an existing trustworthy source, adds no duplicate financial computation, keeps the frozen information architecture intact, and fits one release branch.
