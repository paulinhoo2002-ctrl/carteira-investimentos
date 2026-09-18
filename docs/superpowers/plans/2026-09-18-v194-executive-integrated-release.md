# V194 Executive Integrated Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve interpretation, navigation and accessibility across executive portfolio surfaces without changing financial or persistence semantics.

**Architecture:** Keep legacy SPA and existing renderers. Add small presentation helpers at existing render boundaries, reuse official snapshots/value helpers, and extend focused contract tests before each production change.

**Tech Stack:** Static legacy SPA (`index.html`), Node built-in test runner, Playwright-based smoke tests, existing CSS and export infrastructure.

**Spec:** `docs/superpowers/specs/2026-09-18-v194-executive-integrated-release-design.md`

## Global Constraints

- Preserve `UNAVAILABLE_IS_NOT_ZERO=true` and `UNKNOWN_IS_NOT_ZERO=true`.
- Preserve fixed-income manual authority and all existing value selectors.
- Preserve import `FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW → DEDUPE → CONFIRM`.
- Preserve `REAL_AUTO_REALIZATION_ENABLED=false`.
- No persistence, Firebase, localStorage, schema, provider or dependency changes.
- No edits to V166, V178, V182 or canonical main.
- Stage only explicit files; never use `git add .` or `git add -A`.

---

### Task 1: Dashboard freshness and contextual action contract

**Files:**
- Modify: `index.html` in `dashboardDataQuality`, `dashboardInsightsPanel` and nearby dashboard helpers.
- Test: `tests/phase-194-dashboard-executive-context.test.js`

**Interfaces:**
- Consumes: `dashboardLatestSourceInfo()`, `dataQualitySnapshot()` and existing route names.
- Produces: `dashboardFreshnessLabel(source)` and stable visible/ARIA labels for existing actions.

- [ ] **Step 1: Write the failing test** — assert source/freshness label, route action only when source exists, and explicit empty source state without `0`.
- [ ] **Step 2: Run red test** — `node --test tests/phase-194-dashboard-executive-context.test.js`; expected failure because contract is absent.
- [ ] **Step 3: Implement minimal presentation change** — pure formatter around existing source/date; no metrics or writes.
- [ ] **Step 4: Run green test** — rerun focused test.
- [ ] **Step 5: Run existing dashboard contracts** — `node --test tests/phase-19-insight-hub.test.js tests/phase-2-dashboard-intelligence.test.js`.

### Task 2: Asset detail interpretation block

**Files:**
- Modify: `index.html` in `assetDetailPage` and presentation helpers only.
- Test: `tests/phase-194-asset-detail-interpretation.test.js`

**Interfaces:**
- Consumes: `assetDetailTrust`, `assetAppliedValue`, `assetCurrentValue`, existing result fields and `assetDetailText`.
- Produces: read-only interpretation block inside existing detail page.

- [ ] **Step 1: Write failing test** — assert heading, trust label, `—` for missing current value, and no persistence/financial-engine call in block.
- [ ] **Step 2: Run red test** — `node --test tests/phase-194-asset-detail-interpretation.test.js`.
- [ ] **Step 3: Implement minimal block** — compose existing display values; keep `asset.id`; derive no second result or percentage.
- [ ] **Step 4: Run focused and existing detail tests** — `node --test tests/phase-194-asset-detail-interpretation.test.js tests/v84-asset-detail.smoke.test.js`.

### Task 3: Accessible summaries for shared and report charts

**Files:**
- Modify: `index.html` in `lineChart` and `reportsTab` evolution markup.
- Test: `tests/phase-194-chart-accessibility.test.js`

**Interfaces:**
- Consumes: existing line-chart labels/series/value formatter and report evolution values.
- Produces: SVG accessible name plus compact text summary/list.

- [ ] **Step 1: Write failing test** — assert `role="img"`, accessible label/description, first/last label/value summary and unchanged report data source.
- [ ] **Step 2: Run red test** — `node --test tests/phase-194-chart-accessibility.test.js`.
- [ ] **Step 3: Implement minimal accessible markup** — deterministic IDs and compact summary; preserve geometry and calculations.
- [ ] **Step 4: Run focused/report tests** — `node --test tests/phase-194-chart-accessibility.test.js tests/reports-kpi-readability.smoke.test.js tests/reports-functional.e2e.test.js`.

### Task 4: Responsive state styling and regression guards

**Files:**
- Modify: `index.html` styles adjacent to touched selectors.
- Test: `tests/phase-194-responsive-contract.test.js`

**Interfaces:**
- Consumes: existing responsive tokens and semantic classes.
- Produces: stacked interpretation/summary blocks without page overflow.

- [ ] **Step 1: Write failing test** — assert mobile rules, minimum action height and preserved report/dashboard contracts.
- [ ] **Step 2: Run red test** — `node --test tests/phase-194-responsive-contract.test.js`.
- [ ] **Step 3: Add narrow responsive rules** — use existing tokens, stack below 560px, preserve tabular numerals, avoid layout rewrite.
- [ ] **Step 4: Run focused responsive tests** — `node --test tests/phase-194-responsive-contract.test.js tests/mobile-overflow-controls.smoke.test.js`.

### Task 5: Full verification and release gate

**Files:**
- Modify: none unless tests expose implementation defect.
- Evidence: ignored `.qa-state/v194/` only.

- [ ] **Step 1: Run static guards** — `git diff --check`, `node scripts/root-hygiene-check.js`, `npm.cmd run build`.
- [ ] **Step 2: Run complete suites** — `npm.cmd test` and `npm.cmd run test:ui`; require normal exit and zero failures.
- [ ] **Step 3: Run browser QA** — browser-harness at 390x844, 430x932, 768x1024, 1366x768, 1920x1080; check touched screens, overflow, console, page errors, relevant requests, focus and zero-write mode.
- [ ] **Step 4: Review complete diff** — confirm no financial, persistence, import-confirm, corporate-event, QA artifact or dependency changes.
- [ ] **Step 5: Commit, push and open PR only after gates pass** — stage only reviewed spec/plan, `index.html` and explicit tests; stop before merge/deploy authorization.
