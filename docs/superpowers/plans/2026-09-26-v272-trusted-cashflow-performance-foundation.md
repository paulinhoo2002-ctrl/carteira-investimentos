# V272 implementation plan — trusted cash flows and performance readiness

**Approved direction:** reuse V248 `HistoricalPerformance`; add canonical
read-only event classification/provenance; make V271 fail closed; expose only
readiness in the existing product surface. No merge or real financial writes.

**Base:** `4fae02ac06729aea1c66a6008b24bba75b9a68b2`
**Branch:** `feature/v272-cashflow-performance-foundation`
**Design:** `docs/superpowers/specs/2026-09-26-v272-trusted-cashflow-performance-foundation-design.md`

## Architectural specification and three slices

1. **Evidence and readiness:** one pure classifier maps source events to
   `EXTERNAL_CONTRIBUTION`, `EXTERNAL_WITHDRAWAL`, internal activity, income,
   fee/tax, `AMBIGUOUS`, or `UNKNOWN`, with wallet scope, valid economic date,
   source provenance, confidence, sign and warnings. V271 consumes only trusted
   classified events. Existing global V76 events/snapshots without `walletId`
   are diagnostic-only for wallet readiness.
2. **Engine:** reuse and harden `historical-performance-engine.js`; do not
   create a parallel formula engine. Keep engine availability separate from
   data readiness. TWR needs explicit end-of-subperiod timing and actual
   boundary valuations for each external flow;
   XIRR needs dated trusted investor-perspective flows and an explicit terminal
   valuation. Invalid/incomplete inputs are structured unavailable/invalid,
   never silently dropped, interpolated or replaced with zero.
3. **Product disclosure:** minimally expose readiness/reasons in the existing
   V248 legacy panel where the real host wiring is available. The modern History
   page is currently isolated/demo and cannot claim actual portfolio readiness.
   No new writes, storage schema or cloud integration.

## Acceptance criteria

- Ambiguous, low-confidence, unscoped, wrong-wallet, malformed-date and
  unprovenance-backed events cannot satisfy TWR/XIRR readiness.
- BUY/SELL/dividend/JCP/interest/amortization/fee/tax and internal transfers are
  never silently treated as external investor flows.
- Sign convention is explicit: contribution is positive portfolio flow and
  negative investor cash flow; withdrawal is the inverse. Income is not an
  investor contribution.
- V248 remains the only calculation engine. Results carry a distinct status,
  nullable value, evidence metadata and no NaN/Infinity.
- No TWR interpolation; no fabricated historical values; unknown is not zero;
  partial is not ready; source-as-of is not financial-as-of.
- Existing V271 non-performance readiness/autocapture contracts remain
  compatible; no persistence, backup, Firebase, financial or tax write.
- Product can show `ENGINE_AVAILABLE=true` while `DATA_READY=false`; synthetic
  fixtures never set real-wallet readiness.

## Risk and invariant matrix

| Risk | Required invariant / test |
|---|---|
| False investor contribution from a trade/income row | Exact mapping; all non-external types tested as non-external |
| Ambiguous candidate unlocks XIRR (V271 defect) | Ambiguous-only readiness test must remain false |
| Cross-wallet contamination | Missing/wrong wallet identity excluded; isolation test |
| V76 global store assigned to selected wallet | Fail closed; no active-wallet inference |
| Double sign inversion | Magnitude and portfolio/investor directions tested independently |
| Invalid date rollover | Exact calendar validator rejects impossible and unsupported date strings |
| TWR assumes timing/interpolates | Require observed boundary valuation; no interpolation test |
| XIRR plausible but unsupported | Explicit signs, terminal value, bounded solver and non-solution status |
| Null/unavailable appears as R$ 0 | Null value and renderer contract tests |
| Engine accidentally enables real UI | Independent readiness gate and current wallet stays blocked absent evidence |
| Persistence/network mutation | Pure module checks, source review; financial/tax/network write counts zero |
| Existing behavior regression | V271/V248 and full test/build regression suites |

## Implementation sequence (TDD, small commits within the branch)

### Slice 1 — classifier and V271 readiness

**Likely files:**

- Add `portfolio-cash-flow-classifier.js`.
- Add `tests/portfolio-cash-flow-classifier.test.js`.
- Update `portfolio-history-sufficiency.js` and
  `tests/v271-history-auto-capture-sufficiency.test.js`.
- If script loading requires it, add the classifier script to `index.html`;
  only do so after verifying the existing script order and relevant tests.

**Steps:**

1. Write failing tests for exact source type mapping, external-flow evidence,
   missing wallet, missing source identity, conflicting direction/sign,
   strict date validation, source ID separation, ambiguous generic transfer,
   unknown types, wallet filtering and deterministic output.
2. Implement pure classifier with a versioned rule constant, canonical sign
   representation, warning codes, provenance allowlist and no persistence/API
   dependencies.
3. Add an explicit V271 option for canonical classified-flow input. Do not infer
   wallet id from legacy data; do not count source-level booleans as proof.
4. Update `inventoryCashFlows`/prerequisite reporting for diagnostics while
   preserving current output fields where existing consumers/tests depend on
   them. Ensure both TWR and XIRR require trusted, scoped events.
5. Run the classifier and V271 targeted tests, then re-run focused existing
   V271 history/autocapture tests.

### Slice 2 — harden V248 engine

**Likely files:**

- Update `historical-performance-engine.js`.
- Add `tests/v272-historical-performance-contract.test.js` (or extend the
  existing engine suite if that is the repository convention).
- Keep `portfolio-performance.js` unchanged unless a consumer/test proves a
  compatibility fix is necessary.

**Steps:**

1. Add failing tests around existing V248 entry points for invalid dates,
   non-finite amounts, rejected raw/fuzzy external classifications, trusted
   flow adapter, same-day flow policy, missing boundary valuation, zero opening
   value, partial coverage and null-valued unavailable result.
2. Add strict boundary helpers without changing unrelated formulas. Avoid
   permissive `Date.parse` rollover for canonical flow dates.
3. Make `normalizeExternalFlows` accept only the canonical trusted contract or
   a narrowly documented backwards-compatible exact enum. Preserve investor
   perspective signs in XIRR.
4. Make TWR use flows only at observed valuation boundaries with explicit
   end-of-subperiod timing; a date-only flow is insufficient. Keep deterministic bounded XIRR and structured failure
   states.
5. Run targeted V248/V272 vectors plus existing `historical-performance`
   regression tests.

### Slice 3 — readiness disclosure and certification

**Likely files:**

- `index.html` for a minimal V248 panel disclosure only if legacy real-state
  wiring supports a fail-closed assessment.
- New/updated tests in `tests/v272-*` and existing V248 UI test.
- Canonical docs: `docs/ai/PROJECT_STATE.md`, `PROJECT_MEMORY.md`,
  `NEXT_STEP.md`, `OPEN_WORK.md` only after facts are verified.

**Steps:**

1. Inspect V76 snapshot/flow source and V248 panel render state. Prove the active
   source can be wallet-scoped; if not, keep real metrics unavailable and show
   the unscoped evidence limitation instead of widening persistence/schema.
2. Add descriptive readiness text/counts only; do not expose metric values
   unless the strict per-wallet data gate passes. Do not wire real readiness to
   the modern isolated/demo History page.
3. Add markup/source contract tests for engine/data readiness split and
   ambiguous/unknown unavailable copy.
4. Run targeted suite, then project-required suites/builds and `git diff
   --check`. Review all changes for writes, formula drift, engine duplication,
   data leakage and misleading copy.
5. Update durable project memory with exact results and limitations. No merge.

## Final local validation (2026-09-26)

- User authorized locked dependency installation in this worktree only;
  `npm ci --ignore-scripts` completed without changing package manifests or the
  lockfile.
- Focused V272/V271/V248/history/runtime and inline-script checks: 93/93,
  including a regression proving ambiguous candidates block direct engine
  metrics unless classified/trusted.
- `npm run test:modern`: 815/815; `npm test`: 249/249.
- Legacy build, modern build and `npm run qa:all`: PASS. QA harness 2/2;
  browser smoke and rendered V272 panel tested at 390/430/768/1366/1440/1536/1920
  with zero horizontal/panel overflow and no page/console errors.
- Axe scoped to the V272 history panel: 0 violations. Whole Rentabilidade view
  has unrelated existing contrast/landmark findings outside the V272 panel.
  Isolated screenshots were visually reviewed; this was synthetic localhost
  test mode, not authenticated real-portfolio QA.
- Real V76 stores still do not contain `walletId`; consequently real wallet
  `DATA_READY` remains unavailable. No financial/tax/import/restore/cloud
  writes, persistence/schema changes, or dependency drift.
- Commit, push, PR and exact-head CI are separately authorized by the user and
  remain the next execution steps. Merge is not authorized.
