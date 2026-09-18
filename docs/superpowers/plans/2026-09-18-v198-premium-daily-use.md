# V198 Premium Daily Use Implementation Plan

> **Execution note:** follow the approved V198 scope. Use the clean V198 worktree only; preserve financial formulas, persistence, schema, Firebase/Auth, imports and corporate-event realization.

## Goal

Deliver a focused daily-use release that makes Fixed Income provenance, Reports, Goals and shared responsive/accessibility polish easier to read without changing authoritative values or write semantics.

## Architecture and constraints

- Preserve the legacy SPA as the primary runtime and existing visual canon.
- Reuse `selectFixedIncomeValuation`, `assetRfCurrentValueMeta`, `reportsSnapshot`, `goalProgressMetrics` and existing semantic state helpers.
- Keep unavailable values as `—`; do not add projections, recommendations or fabricated data.
- Keep fixed-income manual authority and precedence unchanged.
- Keep import preview/confirm and all persistence semantics unchanged.
- Use selective staging only; QA evidence stays ignored.

## Tasks

### 1. Baseline and contract characterization

- Add/update focused tests that characterize current Fixed Income provenance, Reports hierarchy/source labels, Goals state presentation and unavailable-value behavior.
- Run the directly related tests before implementation and record the baseline.

### 2. Fixed Income daily reading

- Improve the visible value hierarchy and provenance summary using existing metadata only.
- Add progressive disclosure for technical details such as authority, selected source, date and quality.
- Preserve manual-authority, stale/fallback/estimated/unsupported semantics and all selectors.
- Add focused structural/contract tests.

### 3. Reports executive hierarchy

- Improve current/evolution/concentration/income/result grouping and reduce repeated labels.
- Reuse only values already produced by `reportsSnapshot` and existing report helpers.
- Keep chart accessibility and no-data states explicit.
- Add focused tests for rendered sections and source-backed empty/unavailable states.

### 4. Goals clarity

- Make current, target, distance, percentage and status easier to scan for existing goals.
- Reuse existing goal metrics and notes; do not introduce dates or unsupported forecasts.
- Preserve editing and persistence behavior; add presentation tests only.

### 5. Shared polish and responsive behavior

- Apply small, reversible improvements for hierarchy, focus, density, touch targets and mobile disclosure.
- Validate at 390, 430, 768/1024, 1366, 1440 and 1920 widths with no page overflow.
- Avoid redesigning frozen Dashboard/Dividendos information architecture.

### 6. Regression and protected QA

- Run targeted tests after each batch, then full tests, UI tests and build.
- Run read-only browser QA with console/page/request observability.
- Reuse the official authenticated CDP session when available; count writes and require zero writes.
- Capture only ignored evidence under `.qa-state/v198`.

### 7. Review and delivery

- Review the complete diff for financial/persistence drift, secrets, debug output and unintended files.
- Update the next-step record only if needed for the new release state.
- Create at most three coherent commits, push one branch and open one PR.
- Watch CI and correct ordinary nonfinancial failures; stop at `V198_PR_MERGE_READY=true` without merging or deploying.
