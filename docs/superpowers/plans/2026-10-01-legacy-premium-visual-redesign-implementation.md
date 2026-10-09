# Legacy Premium Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved HYBRID V2 / proposed Visual Canon V3 to the LEGACY interface in seven independently reviewable waves while preserving every route, financial meaning, and existing behavior.

**Architecture:** Keep the existing legacy shell, route renderers, shared chart renderer, theme state, and page-scoped CSS in `index.html`. Use the app's `?testMode=1` local runtime with a V289 test-only fixture that aliases every asset/person label and seeds deterministic fake values in memory; reuse the existing Node test runner, Playwright Core, and local QA server. Presentation changes consume existing values and states; calculation, persistence, import, security, and Firebase modules remain read-only. Each wave adds behavioral/DOM/browser assertions before changing its owning markup and styles.

**Tech Stack:** Legacy HTML/CSS/inline JavaScript, Node.js `node:test`, Playwright Core already in `devDependencies`, `tests/local-http-server.js`, existing `npm.cmd` build/test/QA scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-01-legacy-premium-visual-redesign-design.md` (approved HYBRID V2; implementation still requires a separate human start gate).

## Global Constraints

- This plan does not authorize implementation. Start Wave A only after the human approves this plan for execution.
- Use the local `testMode=1` runtime and its deterministic in-memory fixture only. Never load, enumerate, copy, or capture `local-imports`, real portfolio data, credentials, or user-specific artifacts. Keep screenshots local and synthetic; do not commit screenshots.
- Do not change calculations, rounding, source selection, historical data, coverage, schema, persistence, wallets, security, tax behavior, imports, Firebase, or writer authority. Existing engines and the modern frontend are read-only.
- Preserve all current routes, actions, and records. “Remove” in this plan means remove a duplicate from the first visual layer only. Keep secondary details discoverable.
- Do not treat missing/unknown/partial/stale values as zero or complete. Keep received income separate from announced, provisioned, expected, and estimated income. Keep current price/state separate from historical price/state. Never interpolate a missing history interval.
- Do not copy long pages, complete tables on summary screens, duplicated full summaries/filter blocks, purchase suggestions, or metrics without a period/base. Do not create synthetic historical truth in production; synthetic history may exist only inside the isolated, clearly fake test fixture.
- Tests that fail because a browser is unavailable, the local server fails, or a fixture cannot start are `HARNESS_FAILURE` / `ENVIRONMENT_FAILURE`, not `PRODUCT_VISUAL_RED`. Preserve pre-existing failures as `EXISTING_FAILURE`.
- After each wave: run the exact focused test, both builds, relevant neighboring suites, `git diff --check`, inspect the complete diff, stage explicit paths only, and make one wave-sized local commit. Do not use `git add .` or `git add -A`.
- At the Dashboard and final visual review checkpoints, obtain the independent reviewer required by the approved spec. If the rendered design conflicts with the approved hierarchy or if the mobile Aportes discovery task fails, stop at `HUMAN_BLOCKER_VISUAL_SPEC_CONFLICT` / `HUMAN_BLOCKER_NAV_PLACEMENT`; do not revise the design unilaterally.

## FILE_MAP

| PATH | RESPONSIBILITY | ACCESS | WAVE |
|---|---|---|---|
| `index.html` | Legacy app shell, inline theme tokens/styles, desktop/mobile navigation, route templates, Dashboard, Ativos/Análise, Movimentações, Dividendos, Rentabilidade, Renda Fixa, Metas, Rebalancear, Importar, Confiabilidade, shared `lineChart`, and `hideValues` formatting | MODIFY, limited to presentation markup/styles and route discoverability | A–G |
| `tests/helpers/v289-visual-fixtures.js` | JSON-only synthetic UI fixtures and in-memory page seeding guarded by `?testMode=1`; aliases all user/company/asset labels to synthetic identifiers and never calls production `save()` | CREATE, test-only | A–G |
| `tests/v289-visual-fixtures.test.js` | Fixture schema, synthetic identifiers, scenario validity, and no persistence/write assertions | CREATE | A |
| `tests/v289-visual-shell.test.js` | Route inventory, desktop/mobile navigation destinations, menu keyboard state, theme/token and focus contracts | CREATE | A |
| `tests/v289-dashboard-hybrid.test.js` | Synthetic Dashboard first-fold, financial-state display, chart gaps, allocation, priority, privacy, and responsive geometry | CREATE | B |
| `tests/v289-assets-analysis.test.js` | Synthetic Ativos table/list, Movimentações extrato, and Análise page hierarchy, labels, detail access, theme and responsive geometry | CREATE | C |
| `tests/v289-income-performance.test.js` | Dividendos, Rentabilidade, and Renda Fixa hierarchy, state distinctions, modes, theme, and responsive geometry | CREATE | D |
| `tests/v289-goals-import.test.js` | Metas/Rebalancear state labels and Importar preview/confirmation presentation and accessible actions | CREATE | E |
| `tests/v289-reliability.test.js` | Confiabilidade summary, finite groups, evidence disclosure, and record preservation | CREATE | F |
| `tests/v289-visual-regression.test.js` | Final seven-viewport, two-theme route, overflow, clipping, and browser-error regression | CREATE | G |
| `tests/dashboard-navigation-contract.test.js` | Existing Dashboard drill-down contract | READ_ONLY regression | A, B, G |
| `tests/dashboard-premium-clarity.smoke.test.js` | Existing Dashboard viewport smoke pattern and basic rendered measurements | READ_ONLY regression/reference | B, G |
| `tests/dashboard-patrimony-chart-correction.test.js` | Existing chart-series and history-gap behavior contract | READ_ONLY regression | B, G |
| `tests/phase-194-chart-accessibility.test.js` | Existing shared chart accessible name and text-summary contract | READ_ONLY regression | B, G |
| `tests/v274-accessibility-contract.test.js` | Existing focus, scroll-region, contrast, and mobile accessibility contracts | READ_ONLY regression | A–G |
| `tests/mobile-overflow-controls.smoke.test.js` | Existing Playwright/local-server pattern and responsive interaction regression | READ_ONLY regression/reference | A–G |
| `tests/ui-touch-targets-44px.smoke.test.js` | Existing touch-target regression | READ_ONLY regression | A–G |
| `tests/local-http-server.js` | Existing isolated local app server and synthetic empty quote response; new tests pass `?testMode=1` | READ_ONLY reused server infrastructure | A–G |
| `scripts/qa/browser-smoke.js` | Existing seven-width generic shell smoke | READ_ONLY regression | G |
| `package.json` | Existing scripts: `test`, `test:ui`, `build`, `build:modern`, `qa:all`; existing `playwright-core` and `axe-core` dependencies | READ_ONLY; run current commands directly for V289 tests | A–G |
| `finance-core.js`, `persistence-core.js`, `portfolio-performance.js`, `historical-performance-engine.js`, `dividend-intelligence.js`, `portfolio-allocation-intelligence.js`, `fixed-income-valuation.js`, `fixed-income-display.js`, `fixed-income-trust.js`, `import-center-core.js`, `import-center-workflow.js` | Financial, persistence, valuation, import, and trust contracts used by current views | READ_ONLY | A–G |
| `modern/src/**` and `modern/dist/**` | Separate read-only frontend; outside this LEGACY visual implementation | READ_ONLY / OUT OF SCOPE | A–G |

## Review Focus

1. At 1366×768, long labels and BRL values can push the approved six-question Dashboard below the first fold even when page width does not overflow.
2. At 390×844, large BRL values can clip inside a card or row while `documentElement.scrollWidth` remains equal to the viewport.
3. `hideValues` can conceal a visible KPI while leaking the same amount through SVG `<title>`, tooltip data, `aria-label`, chart summary, or captured text.
4. `NO_DATA`, `UNKNOWN`, `PARTIAL`, `STALE`, `ERROR`, and legitimate numeric zero can look alike if the view reuses a generic dash, blank, or zero style.
5. A navigation redesign can hide an existing route, especially Aportes when Renda Fixa takes the mobile primary slot. Test real synthetic navigation tasks before removing Aportes from the bar; failure requires a human placement decision.

---

## Wave A — Foundation and navigation

**MODEL_TIER:** `LUNA_MEDIUM` unless route discovery, existing shell state, or theme precedence produces a demonstrated blocker; then recommend `SOL_MEDIUM` without silently switching.

### Task A1: Define and verify the privacy-safe in-memory visual fixtures

**Files:** `tests/helpers/v289-visual-fixtures.js` (CREATE), `tests/v289-visual-fixtures.test.js` (CREATE).

**Interfaces:** Test-only exports `V289_VISUAL_SCENARIOS`, `makeV289VisualFixture(scenario)`, and `applyV289VisualFixture(page, scenario)`. Seed through the existing local `?testMode=1` runtime and `S`/`render()`; do not call `save()`, change local storage, access Firebase, or read local portfolio files. Replace the app's static account label with “Conta sintética” in the isolated page before capturing any image.

- [ ] Write `tests/v289-visual-fixtures.test.js` first. Assert the fixture factory supports the named scenarios required by Waves B–G; each asset, wallet, payer, issuer, and event uses synthetic IDs/names; numeric values are fixed invented test values (never copied from HYBRID artboards); unknown/partial/stale/zero are explicit states; fixtures are JSON-cloneable; application refuses a page without local test mode.
- [ ] Run `node --test tests/v289-visual-fixtures.test.js`. Expected RED: the new fixture module is not yet present/exported. Classify this as fixture bootstrap, not `PRODUCT_VISUAL_RED` or `TEST_ARCHITECTURE_FAILURE`.
- [ ] Create a small deterministic fixture factory using the existing legacy state field shapes. `applyV289VisualFixture` may only update the isolated page's in-memory `S`, synthetic active-wallet label, theme, and route before `render()`; it must not call `save()` or import/write anything. Include baseline, no-data, unknown, partial, stale, valid-zero, long-label/large-value, return-pair mismatch, history-gap, allocation-unknown, 0/1/many priority, and dense-reliability scenarios.
- [ ] Run `node --test tests/v289-visual-fixtures.test.js`; expected GREEN includes proof that all displayed names and IDs are synthetic and all required scenarios are available.
- [ ] No production file changes. These two exact paths are included in Wave A's checkpoint commit.

### Task A2: Lock the current route inventory and navigation requirements

**Files:** `tests/v289-visual-shell.test.js` (CREATE), `index.html` (read while authoring assertions).

**Interfaces:** Existing `NAV_TABS`, `REPORT_TABS`, `desktopTabs()`, `mobileBottomNav()`, `mobileMenuDrawer()`, `navTabGroup()`, `go(route)`, and `render()`.

- [ ] Write browser assertions first using `startLocalHttpServer()` and a fresh Playwright context at `?testMode=1`, seeded with `applyV289VisualFixture(page, 'baseline')`. Enumerate destinations from the existing navigation and route dispatch, not from a hand-maintained partial list. Assert every existing route has a visible labeled desktop or “Mais” destination and that Aportes remains reachable.
- [ ] Assert the approved primary mobile destinations are Resumo/Dashboard, Ativos, Dividendos, Renda Fixa, and Mais; assert `Mais` exposes Rentabilidade, Análise, Rebalancear, Metas, Confiabilidade, Importar, Aportes, Patrimônio, Relatórios, IRPF, Auditoria, Insights, and Configurações where those routes exist. Assert the current route is exposed with `aria-current="page"` and every destination works through its actual button.
- [ ] Run `node --test tests/v289-visual-shell.test.js`. Expected RED: current mobile bottom navigation puts Aportes in the primary slot and has no Renda Fixa primary button; record those exact assertion failures. Any missing browser/server/fixture is a harness or environment failure, not a product RED.
- [ ] At A3, first add Renda Fixa to the primary mobile nav and Aportes to Mais while temporarily retaining Aportes in its current primary slot. Run the synthetic tasks Dashboard → Renda Fixa and Dashboard → Aportes via Mais with task success asserted by the destination route heading. Only remove the old Aportes primary slot after the Mais task passes; if that task fails, retain the current slot and stop with `HUMAN_BLOCKER_NAV_PLACEMENT`.

### Task A3: Establish Visual Canon V3 tokens and accessible shell navigation

**Files:** `index.html`, `tests/v289-visual-shell.test.js`, `tests/helpers/v289-visual-fixtures.js` (READ_ONLY).

**Interfaces:** CSS custom properties in the existing inline styles; `applyTheme(theme)`, `toggleTheme()`, `toggleThemeFromMenu()`, `desktopTabs()`, `mobileBottomNav()`, `mobileMenuDrawer()`, `mobileMenuOpen()`, `mobileMenuClose()`, `navTabButton()`, `navTabGroup()`, and `go()`.

- [ ] Extend the failing test with computed-style assertions for canvas/surface/text/accent/status tokens in dark and light themes, minimum readable navigation labels, selected state that is not color-only, focus visibility, mobile safe-area fit, and 44×44 px action targets. Include keyboard open/close and focus return for Mais, `prefers-reduced-motion`, plus `axe-core` checks on changed shell/navigation nodes in both themes.
- [ ] Run `node --test tests/v289-visual-shell.test.js`. Expected RED: proposed route placement, token roles, or geometry assertions fail against the current shell; list failures and verify each names the intended UI contract.
- [ ] In `index.html`, add the V3 theme-aware tokens and spacing/type roles in the existing CSS; group desktop navigation per the approved spec; set mobile primary destinations and the labeled Mais inventory; preserve every route and utility. Keep layout usable when labels wrap. Do not alter `go()` persistence semantics or any data state.
- [ ] Run `node --test tests/v289-visual-fixtures.test.js tests/v289-visual-shell.test.js` and `node --test tests/audit-visual-canon.test.js tests/product-usability-03-shell.smoke.test.js tests/v274-accessibility-contract.test.js tests/ui-touch-targets-44px.smoke.test.js`. Expected GREEN: full existing route inventory remains reachable; mobile navigation tasks pass; both themes retain readable contrast; focus and target assertions pass.
- [ ] Run `npm.cmd run build` and `npm.cmd run build:modern`; inspect browser geometry at 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1536×864, and 1920×1080 for shell overflow, nav overlap, safe-area clipping, and labeled route visibility.
- [ ] Run `git diff --check`, inspect the complete diff, then stage only `index.html`, `tests/helpers/v289-visual-fixtures.js`, `tests/v289-visual-fixtures.test.js`, and `tests/v289-visual-shell.test.js` with `git add -- index.html tests/helpers/v289-visual-fixtures.js tests/v289-visual-fixtures.test.js tests/v289-visual-shell.test.js`; commit as `refactor(ui): establish visual canon v3 shell`.

**CHECKPOINT_A:** reviewer confirms route inventory, route-task discoverability, both themes, focus, and no shell regressions before Wave B.

## Wave B — Dashboard HYBRID V2

**MODEL_TIER:** `SOL_MEDIUM`.

### Task B1: Implement and certify the Dashboard hierarchy and financial truth display

**Files:** `index.html`, `tests/v289-dashboard-hybrid.test.js` (CREATE), `tests/helpers/v289-visual-fixtures.js` (READ_ONLY).

**Interfaces:** Existing `dash()`, `dashboardSnapshot()`, `dashboardHomeSummaryPanel()`, `dashboardHomeCompositionPanel()`, `dashboardEvolutionPanel()`, `dashboardHomeAttentionPanel()`, `dashboardIncomeSnapshot()`, `dashboardDataQuality()`, `lineChart()`, `fmt()`, `hideValuesToggleButton()`, and `toggleHideValues()`; domain calculations and state producers remain unchanged.

- [ ] Write synthetic browser tests first using `?testMode=1` and `applyV289VisualFixture(page, scenario)`. Add deterministic presentation cases for 0/1/multiple priorities; matching versus mismatched result period/base/method; R$ only, % only, neither; received versus expected/announced/provisioned; full/partial/stale/no/unknown history; a real zero; an unclassified allocation; long labels; and large BRL values. Test fixtures supply display states; do not compute financial results in the test or adopt the approved artboard's sample numbers.
- [ ] Assert 1366×768 first-fold visibility for patrimônio, result, received income, evolution, allocation, and at most one actionable priority; three KPI units maximum, with result R$ and % in one unit only for the same period/base/method. Assert no complete table, ranking, technical audit panel, duplicate composition, or empty alert in the first layer.
- [ ] Assert patrimônio remains distinct from invested capital and carries its actual date-base; do not infer return from patrimônio minus invested capital. Keep the approved sample values out of every fixture.
- [ ] Assert history gaps remain visible and are not joined, history has period and unit, no current-price fallback is used for historical points, chart has a text equivalent, and unavailable series have a truthful empty state. Assert allocation is one compact bar plus textual percentages, unknown/unclassified amounts remain visible as unknown and percentages are not forced to 100%, and mobile list destinations activate by touch and keyboard.
- [ ] Assert 0 priorities renders no alert; 1 renders one item with reason, impact, and destination; many renders only the approved top-priority summary. Assert large labels and BRL values do not clip at 1366×768 or 390×844.
- [ ] Toggle `hideValues` on and assert synthetic amounts are absent from visible text, SVG title/description, tooltip text/data, accessible names, and screenshot-safe DOM extraction. Toggle off and verify normal values return. Do not log or save screenshots with personal data.
- [ ] Run `node --test tests/v289-dashboard-hybrid.test.js`. Expected RED: failing assertions must be limited to the new desired Dashboard presentation/privacy contracts; an app startup/runtime or browser failure is not a product RED.
- [ ] Adjust only Dashboard markup and scoped CSS in `index.html`; keep `lineChart()` privacy-safe if and only if the failing assertion proves its current tooltip/accessible output leaks under hidden-values mode. Preserve the chart data source, history semantics, period selectors, and all drill-down paths.
- [ ] Run `node --test tests/v289-dashboard-hybrid.test.js` and `node --test tests/dashboard-navigation-contract.test.js tests/dashboard-premium-clarity.smoke.test.js tests/dashboard-patrimony-chart-correction.test.js tests/phase-194-dashboard-executive-context.test.js tests/phase-194-chart-accessibility.test.js tests/v274-accessibility-contract.test.js`. Expected GREEN: all new Dashboard hierarchy/truth/privacy cases and existing chart, drill-down, and accessibility contracts pass.
- [ ] Capture local synthetic screenshots and geometry/text metrics at 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1536×864, and 1920×1080 in dark and light themes. Check fold visibility, clipping inside individual elements, overflow, target rectangles, font sizes, console/page/request errors, and hide-values leakage. Obtain an independent visual review; do not report “looks good” without these measurements.
- [ ] Run both builds and `git diff --check`, review the complete diff, then stage only `index.html` and `tests/v289-dashboard-hybrid.test.js` with `git add -- index.html tests/v289-dashboard-hybrid.test.js`; commit as `refactor(ui): simplify dashboard hierarchy`.

**CHECKPOINT_B:** independent reviewer must find no blocker/major for HYBRID hierarchy, privacy, financial-state truth, and both themes. Any conflict with the approved order becomes `HUMAN_BLOCKER_VISUAL_SPEC_CONFLICT`.

## Wave C — Ativos and Análise

**MODEL_TIER:** `SOL_MEDIUM`.

### Task C1: Put positions first and make Ativos/Análise readable at desktop and mobile

**Files:** `index.html`, `tests/v289-assets-analysis.test.js` (CREATE), `tests/helpers/v289-visual-fixtures.js` (READ_ONLY).

**Interfaces:** Existing `ativos()`, `assetAnalysisRows()`, `assetAnalysisBlock()`, `assetPremiumSection()`, `setAssetsInnerTab()`, `analysisDestination()`, `goAssetInner()`, asset detail navigation, existing `apTab()` / its view/filter handlers, and `applyV289VisualFixture(page, scenario)`. Financial row builders and asset identity are read-only.

- [ ] Write browser assertions first with deterministic synthetic assets including long names, large BRL values, missing/unknown values, unclassified type, and multiple classes. Assert Ativos asks which positions need review: position list, search, essential filters and class groups precede detail; numeric columns align; no repeated full patrimonial summary; mobile uses labeled rows/cards rather than squeezed wide tables; group disclosure preserves state and detail remains reachable.
- [ ] Assert Análise is the owner for concentration, ranking, sector/emitter, and descriptive interpretation. Verify every shown concentration has a traceable amount/base, no arbitrary score or purchase recommendation appears, missing sectors stay explicitly missing, and the route can be reached from both navigation and an existing Dashboard/Ativos drill-down.
- [ ] Run `node --test tests/v289-assets-analysis.test.js`. Expected RED: desired presentation hierarchy, route interaction, long-name or internal-cell geometry assertions fail; do not change the underlying financial result to satisfy them.
- [ ] Include the Movimentações/Aportes contract in the same failing browser suite: `apTab()` opens on the extrato with data-bound date, type, asset, value, and origin; secondary views, filters, and record detail stay discoverable; existing counters retain their verified behavior. If a counter's functional meaning is unverified, leave it unchanged and flag it outside the visual task. Do not change movement ordering, totals, or operations to satisfy visual assertions.
- [ ] Make presentation-only changes to `ativos()`, `apTab()`, their scoped styles, and `analysisDestination()` / `assetAnalysisBlock()` templates as needed. Preserve filters, actions, asset IDs, detail routes, and all calculated values.
- [ ] Run the focused new test and `node --test tests/assets-highlights-and-rf-parity.test.js tests/assets-consolidated-results.test.js tests/phase-202-assets-performance-overview.test.js tests/phase-3-2-4-assets-desktop-list.test.js tests/phase-3-2-5b-assets-final-visual.test.js tests/phase-194-asset-detail-interpretation.test.js tests/legacy-assets-runtime-map.test.js tests/aportes-premium-clarity.smoke.test.js`. Expected GREEN: route hierarchy/geometry tests pass and existing calculations, row identities, detail, and Aportes contracts remain unchanged. If the existing counter's functional meaning is not verified, leave it unchanged and flag it outside the visual task.
- [ ] Inspect synthetic browser rendering at 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1536×864, and 1920×1080 in both themes. Measure table-cell collisions, clipped names/values, target sizes, nested scrolling, overflow, and errors. Run both builds and `git diff --check`; stage only `index.html` and `tests/v289-assets-analysis.test.js` with `git add -- index.html tests/v289-assets-analysis.test.js`; commit as `refactor(ui): streamline asset exploration`.

**CHECKPOINT_C:** preserve Ativos as the position owner and Análise as the interpretation owner; confirm no portfolio totals were duplicated.

## Wave D — Dividendos, Rentabilidade, and Renda Fixa

**MODEL_TIER:** `SOL_MEDIUM`.

### Task D1: Separate income states and distinguish the three Dividendos views

**Files:** `index.html`, `tests/v289-income-performance.test.js` (CREATE; add Dividendos cases first).

**Interfaces:** Existing `dividendsTabPremium()`, `divs2()`, `setDividendViewMode()`, `dividendOverviewRecentSummary()`, `dividendUpcomingSummary()`, `dividendMonthlyHistoryPremium()`, `dividendAnnualMatrixView()`, existing Dividendos section handlers, and `applyV289VisualFixture(page, scenario)`.

- [ ] Add synthetic browser assertions first for received, announced, provisioned, expected, and estimated income; zero receipts; no data; future-only events; and long payer/asset names. Assert “Calendário”, “Evolução”, and “Histórico” are individually discoverable modes with explicit periods and are not three full matrices shown at once. Assert received income and next event lead the overview; filters and complete history remain available in their owning views.
- [ ] Assert semantic status has text plus color/icon; no estimate appears as received; empty and zero are visibly distinct; current filters and the selected dividend mode survive navigation where existing state promises it.
- [ ] Run `node --test tests/v289-income-performance.test.js`. Expected RED only for the new Dividendos visual contracts.
- [ ] Update only Dividendos template/scoped styles in `index.html`; do not alter event classification, reconciliation, income math, dates, or persisted filters.
- [ ] Run the new focused test and `node --test tests/dividends-visual-refinement.test.js tests/dividends-summary-clarity.test.js tests/dividends-annual-matrix-filters.test.js tests/phase-3-3-dividendos-canonical.test.js tests/dividends-p0-ux.smoke.test.js tests/dividend-intelligence.test.js`. Expected GREEN: new overview/mode/state tests and existing income, calendar, history, filter, and classification contracts pass.

### Task D2: Put return context and fixed-income positions before diagnostics

**Files:** `index.html`, `tests/v289-income-performance.test.js`.

**Interfaces:** Existing `rentabilidadeTab()`, `rendaFixaTab()`, `portfolioPerformance` / history consumers, fixed-income display/trust consumers, shared `lineChart()`, and `applyV289VisualFixture(page, scenario)`; do not modify those producers.

- [ ] Add failing synthetic browser assertions for Rentabilidade ordering: result, period, reference/base, coverage, chart, then detail/audit. Assert any benchmark labels its source and period; missing coverage or unavailable history is not zero/full coverage; supported historical result is distinct from current state.
- [ ] Add failing Renda Fixa assertions: positions and supported bases/next maturities lead; instrument/date/source appear where available; unsupported projection is absent; diagnostic/evidence is available under a finite disclosure or Confiabilidade destination; zero, no-data, stale, and partial states remain distinct.
- [ ] Run `node --test tests/v289-income-performance.test.js`. Expected RED: only the specified page-order, state-label, missing-data, and disclosure contracts.
- [ ] Change only `rentabilidadeTab()`, `rendaFixaTab()`, and scoped presentation styles in `index.html`. Preserve engines, benchmark providers, valuation, manual authority, source selection, and all controls.
- [ ] Run the focused test and `node --test tests/rentability-visual-canon.test.js tests/rentability-contextual-assets.test.js tests/reports-visual-canon.test.js tests/rf-ux-simplification.smoke.test.js tests/rf-table-width-optimization.smoke.test.js tests/fixed-income-benchmark-provider.test.js tests/modern-fixed-income-readonly-valuation.test.js`. Expected GREEN: required hierarchy/state tests pass without changing performance or fixed-income outputs and providers.
- [ ] Validate Dividendos, Rentabilidade, and Renda Fixa at 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1536×864, and 1920×1080 in both themes; inspect detail disclosure, chart labels, table internal clipping, and error telemetry. Run both builds and `git diff --check`; stage only `index.html` and `tests/v289-income-performance.test.js` with `git add -- index.html tests/v289-income-performance.test.js`; commit as `refactor(ui): clarify income and performance views`.

**CHECKPOINT_D:** no financial status conflation, supported-basis loss, or hidden route.

## Wave E — Metas, Rebalancear, and Importar

**MODEL_TIER:** `LUNA_MEDIUM`; recommend `SOL_MEDIUM` only for a demonstrated ambiguity in current route-state behavior.

### Task E1: Label goal and allocation states without suggesting an operation occurred

**Files:** `index.html`, `tests/v289-goals-import.test.js` (CREATE; add goal cases first).

**Interfaces:** Existing `metasTab()`, `rebalanceContributionDistribution()`, `rebalanceScenarioComparison()`, `rebalanceScenarioComparisonPanel()`, `ajudarTab()`, current goal/allocation state handlers, and `applyV289VisualFixture(page, scenario)`. Calculation functions remain read-only.

- [ ] Write browser assertions first for synthetic CURRENT, EDITING, SIMULATION, TARGET, and SCENARIO examples. Assert each state has a visible text label and clear separation; a target never looks like current holdings, a simulation never looks executed, and no unsupported progress/coverage is invented. Assert goal allocation action is still reachable and existing values are unchanged.
- [ ] Run `node --test tests/v289-goals-import.test.js`. Expected RED: state differentiation, hierarchy, or control discoverability only.
- [ ] Adjust `metasTab()`, Rebalancear presentation, and scoped styles in `index.html`; do not alter goal normalization, percentages, rebalance calculations, or save paths.
- [ ] Run the focused test and `node --test tests/phase-206-financial-goals.test.js tests/goals-functional.e2e.test.js tests/goals-contextual-continuity.test.js tests/rebalance-visual-canon.test.js tests/rebalance-scenario-comparison.test.js tests/rebalance-asset-suggestions.test.js`. Expected GREEN: each state is distinguishable and existing goal/allocation values and scenario behavior remain unchanged.

### Task E2: Keep Importar selection, preview, confirmation, and result visually distinct

**Files:** `index.html`, `tests/v289-goals-import.test.js`.

**Interfaces:** Existing `importCenterTab()`, `importCenterState()`, `importCenterRunDryRun()`, `importCenterOpenReview()`, `importCenterFinishReview()`, `IMPORT_CENTER_STEPS`, and `applyV289VisualFixture(page, scenario)`; import/parser/writer implementations remain read-only.

- [ ] Add failing browser assertions for synthetic empty, selected, parsing, preview, duplicate/review, confirmation, and result states. Assert selection never looks written; preview displays zero writes until a confirmed result; confirmation is explicit; cancel/close return to a truthful state; parser/provider technical evidence is secondary and expandable; progress/result language does not claim persisted success prematurely.
- [ ] Run `node --test tests/v289-goals-import.test.js`. Expected RED: only presentation/state discoverability assertions; do not invoke real files or writers.
- [ ] Adjust Importar template and scoped styles in `index.html`, keeping every step, confirm boundary, parser, and write authority exactly as-is.
- [ ] Run the focused test and `node --test tests/import-center-architecture.test.js tests/import-center-core.test.js tests/v245-import-center-2.test.js tests/v285-import-center-workflow.test.js tests/phase-4a-import-foundation.test.js tests/phase-4b-historical-import.test.js tests/phase-4g-import-center.test.js`. Expected GREEN: UI states are truthful and all preview/confirm/write-authority safety contracts remain unchanged.
- [ ] Review keyboard focus, screen-reader labels, escape/close behavior, and 44×44 targets on synthetic flows; check layout at all seven widths in dark/light, run both builds and `git diff --check`, then stage only `index.html` and `tests/v289-goals-import.test.js` with `git add -- index.html tests/v289-goals-import.test.js`; commit as `refactor(ui): clarify goals and import states`.

**CHECKPOINT_E:** reviewers verify no visual control implies a financial write or rebalance execution.

## Wave F — Confiabilidade

**MODEL_TIER:** `SOL_MEDIUM`.

### Task F1: Make Confiabilidade finite and prioritized while retaining audit evidence

**Files:** `index.html`, `tests/v289-reliability.test.js` (CREATE).

**Interfaces:** Existing `dataTrustCenterTab()`, `dataTrustCoverageRow()`, `dataTrustReconciliationRow()`, `dataQualityTab()`, `dataAuditTab()`, source/status labels, current expansion/filter handlers, and `applyV289VisualFixture(page, scenario)`.

- [ ] Create synthetic browser cases with no issues, one high-priority issue, multiple categories, partial/stale/error states, and a large evidence list. Write assertions first: summary state precedes issues; actionable issue has reason, impact, and destination; groups have finite visible initial rows/pagination or disclosure; detailed provenance stays available under expansion; no record/evidence is deleted; statuses remain textually distinct.
- [ ] Assert collapsed content remains keyboard reachable, expands and collapses with correct `aria-expanded`/native disclosure behavior, and returns to the same filter/group when safe. Assert no “all reliable” claim when coverage is incomplete or stale.
- [ ] Run `node --test tests/v289-reliability.test.js`. Expected RED: new summary-priority, finite-list, or disclosure behavior only.
- [ ] Change only the Confiabilidade templates and scoped styles in `index.html`. Retain all rows, evidence, filters, event history, and audit actions.
- [ ] Run the focused test and `node --test tests/portfolio-data-trust-ui.test.js tests/data-audit-compatibility.test.js tests/v257-data-quality-remediation.test.js tests/v258-portfolio-monitoring.test.js tests/v274-accessibility-contract.test.js tests/phase-198-production-system-audit.test.js`. Expected GREEN: summary/disclosure tests pass and all existing evidence rows, source states, filters, and audit contracts remain available.
- [ ] Validate synthetic small/large evidence at all seven widths in dark/light. Check list bounds, expand/collapse, internal clipping, focus, target geometry, and errors. Run both builds and `git diff --check`, review the full diff, then stage only `index.html` and `tests/v289-reliability.test.js` with `git add -- index.html tests/v289-reliability.test.js`; commit as `refactor(ui): prioritize reliability evidence`.

**CHECKPOINT_F:** auditability remains intact and the default view no longer begins with an unbounded evidence wall.

## Wave G — Whole-product visual regression and cleanup

**MODEL_TIER:** `SOL_MEDIUM` for final cross-route reconciliation; recommend `SOL_HIGH_ONLY_IF_BLOCKED` for an unresolved reproducible cross-wave conflict, not for routine polish.

### Task G1: Add final cross-route seven-viewport and theme regression

**Files:** `tests/v289-visual-regression.test.js` (CREATE), `index.html` only if a proved visual defect is fixed.

**Interfaces:** Existing `startLocalHttpServer()`, `?testMode=1`, `applyV289VisualFixture(page, scenario)`, `go(route)`, `render()`, `toggleTheme()`, and Playwright Core. Reuse the existing responsive/error-collection pattern in `scripts/qa/browser-smoke.js`, `tests/dashboard-premium-clarity.smoke.test.js`, and `tests/mobile-overflow-controls.smoke.test.js`.

- [ ] Write final tests first for every route in the closed navigation inventory at 390×844 and 1366×768 in dark and light, plus representative dashboard, asset-table, and reliability-list cases at 430×932, 768×1024, 1440×900, 1536×864, and 1920×1080 in both themes. Use `applyV289VisualFixture()` empty/partial/stale/long-label cases. Assert no missing route, page overflow, internal table/control clipping, overlapping controls, sub-12 px critical labels, <44×44 primary targets, console/page errors, or relevant local request failures; run axe checks on changed routes and test reduced-motion mode.
- [ ] At 1366×768 assert Dashboard six-question first fold; at 390×844 assert its independent mobile order and no wide Dashboard table. Test real menu open/close and route transitions; check theme persists across route rendering as currently specified.
- [ ] Run `node --test tests/v289-visual-regression.test.js`. Expected RED only for reproducible outstanding visual regressions; classify browser launch/server issues separately and do not alter product code to hide them.
- [ ] Fix only narrowly evidenced presentation regressions in `index.html`. Do not change calculations, behavior, dependency/configuration, route semantics, or screenshot artifacts to force a pass.
- [ ] Run `node --test tests/v289-visual-shell.test.js tests/v289-dashboard-hybrid.test.js tests/v289-assets-analysis.test.js tests/v289-income-performance.test.js tests/v289-goals-import.test.js tests/v289-reliability.test.js tests/v289-visual-regression.test.js`; run the existing relevant domain suites from Waves A–F; then `npm.cmd test`, `npm.cmd run test:modern`, `npm.cmd run build`, `npm.cmd run build:modern`, and `npm.cmd run qa:all` fresh. Expected GREEN: all new/neighboring suites and all full regression commands pass; any unrelated baseline failure is recorded with its prior evidence and is not silently waived.
- [ ] Obtain independent visual review of the final Dashboard and whole route matrix. Review semantic colors with text/status, dark/light WCAG AA contrast for changed surfaces through `axe-core` plus rendered color-pair checks, keyboard sequence/focus return, screen-reader chart equivalent, `prefers-reduced-motion`, privacy with hidden values, all navigation destinations, and all seven viewport measurements.
- [ ] Review full diff and run `git diff --check`. Stage the final QA test only with `git add -- tests/v289-visual-regression.test.js` and commit it as `test(ui): certify visual canon v3 route matrix`; if a final product defect fix is needed, stage its exact paths in its own commit. Close with an implementation handoff listing exact route status, tests, known limitations, and proof that financial logic and data were untouched.

**CHECKPOINT_G:** independent reviewer finds no blocker/major; every changed route passes both themes and the viewport matrix. The final reviewer must distinguish `PRODUCT_VISUAL_RED`, `HARNESS_FAILURE`, `ENVIRONMENT_FAILURE`, `TEST_ARCHITECTURE_FAILURE`, and `EXISTING_FAILURE`.

## Dependency graph

```text
Human approves plan to execute
  └─ A1 synthetic fixture helper and fixture safety test
       └─ A2 route inventory and synthetic Aportes/Renda Fixa tasks
            └─ A3 tokens + shell/navigation + theme/focus
                 └─ B Dashboard (independent review gate)
                 ├─ C Ativos + Análise
                 └─ D Dividendos + Rentabilidade + Renda Fixa
                      └─ E Metas + Rebalancear + Importar
                           └─ F Confiabilidade
                                └─ G full visual regression (independent review gate)
```

Waves C and D may run in either order after B because they share only the approved shell/tokens, not each other's route state. Run one at a time in the same worktree because all production presentation code is in `index.html`. E follows C/D to use the finalized route ownership and shared state labels. F follows E so the same status language is reused. G is last.

## Execution method and model routing

- **Recommended method:** `NATIVE_EXECUTION`. The shared legacy `index.html`, style cascade, global route state, and navigation make parallel implementation likely to conflict and repeat context. Seven bounded waves are large enough to checkpoint but small enough for one executor with focused browser review.
- **Wave A:** `LUNA_MEDIUM`; `SOL_MEDIUM` only after a specific shell/route ambiguity is shown.
- **Wave B:** `SOL_MEDIUM`.
- **Wave C:** `SOL_MEDIUM`.
- **Wave D:** `SOL_MEDIUM`.
- **Wave E:** `LUNA_MEDIUM`, `SOL_MEDIUM` only if current state semantics are unclear.
- **Wave F:** `SOL_MEDIUM`.
- **Wave G / final review:** `SOL_MEDIUM`; `SOL_HIGH_ONLY_IF_BLOCKED` after recording a reproducible blocker.

## Implementation exit criteria

Do not mark the redesign complete until all V3 acceptance items in the approved spec have evidence, all seven widths and both themes pass, navigation task tests show every existing destination is discoverable, changed routes pass focused and neighboring suites, legacy and modern tests/builds plus `qa:all` are fresh and green, hidden values do not leak, no visual state falsifies a financial state, independent review has zero BLOCKER/MAJOR, and an implementation summary is ready for human review. This plan itself does not grant approval to start implementation or to merge/deploy.

## Acceptance coverage map

| Approved spec | Planned evidence |
|---|---|
| V3-01 one question and owner per route | B1, C1, D1–D2, E1–E2, F1 |
| V3-02 six Dashboard questions in first fold | B1 at 1366×768; G1 |
| V3-03 patrimônio, invested amount, date-base | B1 synthetic display contract |
| V3-04 same-period/base result pair only | B1 matching/mismatching fixtures |
| V3-05 received versus estimates | B1 and D1 |
| V3-06 unknown history gaps stay gaps | B1 chart fixture plus existing chart regression |
| V3-07 single allocation view, text, keyboard/touch | B1 |
| V3-08 0/1/many priority treatment | B1 |
| V3-09 independent mobile Dashboard | B1 at 390×844 and G1 |
| V3-10 every route remains labeled and reachable | A2–A3 and G1 |
| V3-11 empty/unknown/partial/stale/error/zero states | A1 fixture safety; B1, C1, D1–D2, E1–E2, F1 |
| V3-12 dark/light contrast | A3 plus both themes in B1–G1; axe and color-pair checks |
| V3-13 keyboard focus and 44×44 targets | A3 plus changed-route tests and G1 |
| V3-14 seven viewport widths/no clipping/errors | each route-owning wave plus G1 |
| V3-15 essential Ativos columns and mobile rows | C1 |
| V3-16 finite Confiabilidade groups; audit retained | F1 |
| V3-17 Dividendos calendar/evolution/history | D1 |
| V3-18 current/edit/simulation/target/scenario separation | E1 |
| V3-19 import selection/preview/confirm/write distinction | E2 |
| V3-20 hide-values privacy, including chart and captured text | A1 synthetic fixture; B1 hidden-values check; G1 |
| V3-21 critical content not below 12 px | A3, route-owner browser assertions, G1 |
| V3-22 do not copy Investidor10 patterns | Global Constraints and C1/D1/B1 ownership and density assertions |
