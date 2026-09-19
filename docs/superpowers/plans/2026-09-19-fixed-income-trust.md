# Fixed Income Valuation Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the read-only fixed-income experience so manual authority, shadow/reference values, unsupported calculations, stale metadata, and unavailable values are explicit without changing financial semantics.

**Architecture:** Add a small pure helper module for classification, labels, filtering, sorting, and deterministic summaries. Integrate it at the existing fixed-income display boundary and keep legacy valuation selection as the sole authoritative numeric source. Extend the existing Renda Fixa renderer with factual status summaries and accessible controls, without touching protected calculation or persistence modules.

**Tech Stack:** Legacy static HTML/JavaScript, Node `node:test`, existing Playwright smoke tests.

**Spec:** User-provided V215 mission specification in the task conversation.

## Global Constraints

- Do not modify `finance-core.js`, `persistence-core.js`, Firebase, schema, migrations, `modern/src`, formulas, or write handlers.
- `MANUAL_FIXED_INCOME_AUTHORITY_PRESERVED=true`.
- `REAL_AUTO_REALIZATION_ENABLED=false`.
- `UNKNOWN != ZERO`; unavailable numeric values render as `—`.
- Shadow/reference values are secondary and never replace authoritative values.
- Provenance is shown only from metadata actually present on the record.
- No new dependency or paid service.
- Canonical main remains dirty and untouched; all work occurs in V215 worktree.

## Review Focus

- Missing current value must remain unavailable rather than becoming `R$ 0,00`; test summary aggregation and UI output.
- Manual values must remain authoritative when shadow/reference metadata exists; test classification and authoritative totals.
- Unsupported IPCA+/unknown indexers must not be inferred or auto-valued; test labels and safe fallbacks.
- Invalid or absent dates must not create false stale/maturity claims; test date labels and unknown states.
- Mobile controls must remain keyboard accessible and page-contained; test structural responsive contracts and no full-page overflow.

---

### Task 1: Pure fixed-income trust model

**Files:**
- Create: `fixed-income-trust.js`
- Test: `tests/fixed-income-trust.test.js`

**Interfaces:**
- Produces `classify(meta)`, `describeAuthority(meta)`, `describeSource(meta)`, `describeIndexer(asset)`, `filterRows(rows, query, status)`, `sortRows(rows, key, direction)`, and `summarize(rows)`.
- All functions are pure and return no mutation or persistence effects.

- [ ] Write failing tests for manual, shadow, unsupported, unavailable, stale, unknown, legitimate zero, filtering/sorting, and summary counts.
- [ ] Run `node --test tests/fixed-income-trust.test.js` and observe the expected missing-module failure.
- [ ] Implement the smallest pure helper API preserving unknown values and factual labels.
- [ ] Run the focused test until all cases pass.
- [ ] Commit `feat: add fixed income trust read model`.

### Task 2: Integrate trust metadata without changing valuation

**Files:**
- Modify: `index.html` script imports and read-only fixed-income helper boundary.
- Modify: `fixed-income-display.js` only if the existing label contract needs factual status tones.
- Test: `tests/fixed-income-valuation-contract.test.js` and new integration assertions in `tests/fixed-income-trust.test.js`.

- [ ] Add the helper script before the inline application script.
- [ ] Enrich `assetRfCurrentValueMeta` and snapshot rows with status/source/indexer metadata from existing fields only.
- [ ] Replace snapshot coercions that convert missing current/profit values to zero with nullable-safe aggregation; retain legitimate numeric zero.
- [ ] Add failing integration assertions for manual authority, shadow secondary status, unsupported status, and unavailable display.
- [ ] Run focused tests and confirm RED before the integration change, then GREEN after it.
- [ ] Commit `feat: preserve fixed income valuation trust states`.

### Task 3: Executive Renda Fixa controls and summaries

**Files:**
- Modify: `index.html` `rendaFixaTab` and fixed-income CSS blocks.
- Test: `tests/v215-fixed-income-ui.test.js`.

- [ ] Add accessible local search, status filter, and deterministic sort controls backed by the pure helper.
- [ ] Add executive status counts for manual, shadow/reference, unsupported, unavailable, and stale positions.
- [ ] Show factual authority/source/indexer labels and `—` for unavailable values; do not add edit/save behavior.
- [ ] Add an accessible explanatory summary stating that manual values remain authoritative and shadow values are reference-only.
- [ ] Add structural tests for headings, labels, controls, status text, and no false-zero output.
- [ ] Run the focused UI tests at RED before integration and GREEN after integration.
- [ ] Commit `feat: improve fixed income executive trust experience`.

### Task 4: Cross-page and responsive hardening

**Files:**
- Modify: `index.html` only where existing fixed-income display consumers need the same labels.
- Test: `tests/v215-fixed-income-ui.test.js`, existing fixed-income parity and responsive smokes.

- [ ] Assert Dashboard/Ativos/Detalhe consumers continue using the existing authoritative value boundary.
- [ ] Add responsive structural checks for 390, 430, 768, 1366, and 1920 widths, including no page-level horizontal overflow and 44px controls.
- [ ] Add keyboard/focus-visible assertions for search/filter/sort controls.
- [ ] Run affected tests and build.
- [ ] Commit `test: harden fixed income trust and responsive contracts`.

### Task 5: Full verification, review, push, and PR

**Files:**
- Modify only files already listed above.
- Evidence: `.qa-state/v215/` (never commit).

- [ ] Run targeted, fixed-income-related, provenance-related, legacy, modern, UI, performance, reliability, and build commands according to the mission order.
- [ ] Run protected read-only browser QA with the existing browser-harness route when available; otherwise report the exact evidence gap.
- [ ] Review `git diff --stat` and `git diff`, proving protected files are unchanged and scope is expected.
- [ ] Run the final verification commands and confirm zero writes.
- [ ] Push only `feature/v215-fixed-income-trust`.
- [ ] Create one PR, leave it unmerged, and wait for CI until terminal.
- [ ] Report merge readiness, known limitations, and next action.
