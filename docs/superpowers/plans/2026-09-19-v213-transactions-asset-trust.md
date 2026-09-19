# V213 Transactions, Asset Detail and Data Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve read-only transaction productivity, asset-detail clarity, and factual provenance without changing financial calculations or persistence.

**Architecture:** Add one small pure helper module for transaction derivation and provenance labels. Load it before the legacy application code, expose only read-only functions, and integrate the existing Aportes and asset-detail renderers without touching write handlers or protected finance modules.

**Tech Stack:** Legacy `index.html`, vanilla JavaScript, Node test runner, existing structural/smoke tests, protected local HTTP QA.

**Spec:** `docs/superpowers/specs/2026-09-19-v213-transactions-asset-trust-design.md`

## Global Constraints

- Do not modify `finance-core.js`, `persistence-core.js`, Firebase, schema, `modern/src`, formulas, ledger, quantity, average price, position calculations, or transaction write semantics.
- Use only real metadata for provenance; do not infer source or create subjective quality scores.
- Preserve `UNKNOWN != ZERO`, manual fixed-income authority, import confirmation, and corporate-event shadow mode.
- Work only in `C:\Projetos\carteira-investimentos.worktrees\v213-transactions-asset-trust`.
- Never use `git reset`, `git restore`, `git clean`, `git stash`, `git rebase`, force push, `git add .`, or `git add -A`.

## Review Focus

- Missing dates must sort deterministically without becoming epoch dates — test in Task 1.
- Null values must render as unavailable, not zero — test in Tasks 1 and 3.
- Mixed transaction shapes must preserve ticker/type/value fields — test in Task 1.
- Provenance flags must not create labels when metadata is absent — test in Task 3.
- Asset history must be scoped to the selected identity and not leak another ticker — test in Task 3.

### Task 1: Pure transaction and provenance derivation helpers

**Files:**
- Create: `v213-transaction-trust.js`
- Create: `tests/v213-transaction-trust.test.js`
- Reference: `index.html` existing `aportesPagination`, `setAportesFilter`, `setAportesSort`, `setAportesPage`, `assetDetailRecords`, and `assetDetailTrust`

**Interfaces:**
- `V213TransactionTrust.normalizeDate(value)` returns `{ state: 'value'|'missing'|'invalid', key, timestamp }`.
- `V213TransactionTrust.filterTransactions(rows, options)` returns a new filtered array.
- `V213TransactionTrust.searchTransactions(rows, query)` returns a new array matching ticker, name, type, or source.
- `V213TransactionTrust.sortTransactions(rows, sortKey, direction)` returns a new stable array.
- `V213TransactionTrust.summarizeTransactions(rows)` returns counts only: `{ total, buys, sells, contributions, others }`.
- `V213TransactionTrust.assetTransactions(rows, identity)` returns only records matching the selected ticker/id/name identity.
- `V213TransactionTrust.provenanceFacts(value)` returns only factual labels backed by present fields.

- [ ] Add failing tests for date ordering, search, type filtering, stable sort, summary counts, asset scoping, null values, and provenance with/without metadata.
- [ ] Run `node --test tests/v213-transaction-trust.test.js`; confirm the new API fails before implementation.
- [ ] Implement the helpers with no mutation, no persistence imports, no browser globals, and no financial recalculation.
- [ ] Run the focused test again; require all tests to pass.
- [ ] Inspect the diff and commit only the helper and test: `feat: add read-only transaction trust helpers`.

### Task 2: Integrate Movimentações/Aportes read-only productivity

**Files:**
- Modify: `index.html` script loading and Aportes renderer around `aportesPagination` and `aportes()`.
- Modify: `tests/v208-income-transactions.test.js` only when assertions cover the preserved V208 surface.
- Create: `tests/v213-transactions-ui.test.js` for structural contracts.

**Interfaces:**
- Consume `V213TransactionTrust.filterTransactions`, `searchTransactions`, `sortTransactions`, and `summarizeTransactions`.
- Preserve existing `setAportesFilter`, `setAportesSort`, `setAportesPage`, and all save/edit/delete handlers unchanged.

- [ ] Add structural tests for a read-only summary, search input, real filter options, sort direction indicator, and the existing pagination controls.
- [ ] Run the focused UI tests and confirm they fail for missing V213 markup.
- [ ] Add the smallest compatible controls to the existing Aportes toolbar; make controls keyboard accessible and at least 44px tall.
- [ ] Apply one derived rows pipeline before rendering: period → search → filter → sort → pagination.
- [ ] Render factual summary text from helper counts; use `—` for unavailable values and retain the confirmed-empty message only for confirmed empty data.
- [ ] Add responsive CSS for 390px and 1366px without page-level horizontal overflow; keep dense table scrolling internal if needed.
- [ ] Re-run V213 UI tests plus `tests/v208-income-transactions.test.js`.
- [ ] Review that no write handler or protected file changed, then commit: `feat: improve read-only transaction productivity`.

### Task 3: Refine asset detail history and provenance

**Files:**
- Modify: `index.html` functions `assetDetailRecords`, `assetDetailIncomeRecords`, `assetDetailTrust`, and `assetDetailPage` only for presentation/derivation.
- Create: `tests/v213-asset-detail-trust.test.js`.
- Reference: `tests/v84-asset-detail.smoke.test.js` and `tests/phase-194-asset-detail-interpretation.test.js`.

**Interfaces:**
- Consume `V213TransactionTrust.assetTransactions` and `provenanceFacts`.
- Preserve current asset lookup, value helpers, manual fixed-income authority, and action handlers.

- [ ] Add tests for position labels, history identity filtering, date-desc ordering, income relation, reference exclusion contract, unavailable result, and factual provenance labels.
- [ ] Run the focused asset-detail tests and confirm missing assertions before integration.
- [ ] Add a compact factual provenance row only when source/authority/as-of/flags exist; render `—` otherwise.
- [ ] Use the shared asset-transaction helper for history and keep the existing empty state for confirmed absence only.
- [ ] Add contextual text only from confirmed fields, such as quantity and history count; do not add recommendations.
- [ ] Validate fixed-income detail still says manual authority wins and does not imply automatic override.
- [ ] Run new tests plus existing asset-detail smoke tests.
- [ ] Commit: `feat: refine asset detail trust and history`.

### Task 4: Cross-page safety, QA, and release preparation

**Files:**
- Modify: only directly related tests or `index.html` polish discovered by QA.
- Create: `.qa-state/v213/` evidence files only if needed; do not stage them.

- [ ] Run targeted V213, transaction-related, asset-detail-related, and provenance-related tests.
- [ ] Run the required legacy suite, modern suite, UI suite, reliability smokes, and build once after integration.
- [ ] Run protected local QA for Movimentações, Ativos, Detalhe do Ativo, Dashboard, and Dividendos at 390x844, 430x932, 768x900, 1366x768, and 1920x1080.
- [ ] Check zero page overflow, keyboard focus, touch targets, loading/error/empty states, provenance truthfulness, and no write controls activated.
- [ ] Perform a second polish pass only for verified spacing, density, labels, mobile, and 1366 issues; rerun affected tests.
- [ ] Review `git diff --stat`, `git diff --check`, protected-file list, financial semantics, persistence, schema, and formula diffs.
- [ ] Run `git status --short`; stage only named source/test files and commit any final focused change.
- [ ] Push only `feature/v213-transactions-asset-trust` and create one PR; do not merge or deploy.
- [ ] Wait for CI and record PR number, URL, checks, mergeability, and deferred authenticated QA status if applicable.

## Completion Gate

Declare `V213_PR_MERGE_READY=true` only when all required tests, build, UI/QA,
scope, financial safety, zero-write, CI, and mergeability gates are verified.
Keep `MERGE_AUTHORIZED=false` and `MANUAL_DEPLOY_EXECUTED=false`.
