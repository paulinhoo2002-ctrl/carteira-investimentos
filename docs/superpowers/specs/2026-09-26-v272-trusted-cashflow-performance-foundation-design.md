# V272 — Trusted Cash-Flow and Performance Foundation

**Status:** design approved; implementation locally validated; commit/PR gates pending
**Base:** `origin/main` at `4fae02ac06729aea1c66a6008b24bba75b9a68b2`
**Branch:** `feature/v272-cashflow-performance-foundation`
**Scope:** read-only classification, readiness, existing-engine hardening, minimal History/Reports disclosure.

## Intent and non-goals

V272 creates a trustworthy analytical path from existing portfolio events to
cash-flow-aware performance readiness. It must distinguish investor money
entering/leaving the portfolio from trades, income, fees, taxes and internal
transfers; retain evidence and uncertainty per event; and prevent ambiguous
events from unlocking TWR/XIRR. It reuses the V248 calculation engine and V271
readiness model rather than adding another performance engine.

This phase does not create or backfill financial history, modify the realized
transaction or income ledgers, change backup/persistence schemas, make network
requests, write Firebase, calculate a generic IPCA+ value, or redesign Reports
or History. Synthetic vectors validate formulas only and never establish real
portfolio readiness.

## Current repository contracts and observed gaps

1. `portfolio-history-sufficiency.js` is a pure V271 readiness module, but it
   is not currently wired into the product page. `inventoryCashFlows` treats
   any dated, positive numeric `aportes` row as trustworthy, does not establish
   that it is an external contribution, and inventories whole `fullState`
   rather than first scoping event rows to `walletId`. XIRR readiness currently
   accepts ambiguous candidates as evidence of dated flows.
2. `historical-performance-engine.js` already implements simple return, TWR,
   XIRR, coverage gates, and a regex-based event classifier. It uses investor-
   perspective signs for XIRR (`contribution=-`, `withdrawal=+`) and adjusts
   portfolio return under an `END_OF_SUBPERIOD` flow-timing assumption. Its
   classifier maps broad strings and its date parser relies on `Date.parse`;
   these are not sufficient classification/provenance contracts.
3. `portfolio-performance.js` is another small pure calculation module with
   overlapping TWR/XIRR functions and weaker input validation. V272 will not
   extend it as a third interface; consumers are to converge on
   `HistoricalPerformance` where compatible. Any legacy exports in this module
   remain unchanged unless tests prove a safe adapter is needed.
4. `portfolio-runtime-stores.js` maintains derived snapshots and external
   flows separately from the realized ledger. Flow types include contribution,
   withdrawal, external transfers and adjustment. Normalized flow rows have
   date, positive integer cents, source/sourceId and notes, but no `walletId`;
   runtime valuation snapshots likewise have no wallet identity. Their local
   storage keys are global. Such unscoped data cannot satisfy wallet-specific
   readiness. V272 will not silently assign it to the active wallet or change
   its persisted schema.
5. Legacy `S.aportes` contains buys/sells and fixed-income applications, among
   other movements; it is not itself proof of external investor cash flow.
   `S.proventos` contains income records; `rfEvents` can represent mixed or
   incomplete activity. Import and historical reconstruction paths are preview
   / audit sources, not permission to infer financial cash movement.
6. `index.html` already renders the V248 historical performance panel and
   reads the explicit derived flow store. The modern History UI currently uses
   an isolated host/demo contract (its footer states it has no access to
   portfolio data), computes simplified snapshot readiness and keeps TWR/XIRR
   false. V271 is currently not invoked by either surface. V272 will not
   pretend the modern screen has real wallet data; minimal disclosure targets
   the existing legacy V248 panel unless an already-supported scoped adapter
   is proven by source wiring.

## Architecture and boundaries

### Slice 1 — Canonical read-only classifier and V271 readiness

Add one pure, deterministic classifier module and an explicit, versioned
classification vocabulary. The API accepts normalized source records plus
source/wallet context and returns one classified record per input; it does not
deduplicate, persist, mutate, or fetch. Classification identity is separate
from source identity and existing financial-import dedup identity.

Each output retains stable event/source identity when available, wallet scope,
strictly normalized date/amount/currency, raw event type, classification,
external flag, sign convention, confidence, provenance, rule version and
warnings. Missing or invalid fields remain null/unknown and generate explicit
warnings rather than default numeric zero.

Initial categories are limited to evidence represented by the current code:

| Category | External? | Required evidence / default |
|---|---:|---|
| `EXTERNAL_CONTRIBUTION` | yes | Explicit contribution/transfer-in type, valid positive amount/date, source evidence, and wallet scope; otherwise ambiguous/unavailable |
| `EXTERNAL_WITHDRAWAL` | yes | Explicit withdrawal/transfer-out type under the same requirements |
| `INTERNAL_BUY` / `INTERNAL_SELL` | no | Explicit trade operation; does not count as investor flow |
| `INCOME_DIVIDEND` / `INCOME_JCP` / `INCOME_INTEREST` / `INCOME_AMORTIZATION` | no | Explicit income/event kind and source record; does not count as investor flow |
| `FEE` / `TAX` | no | Explicit fee/tax event kind; amount/sign retained only if source semantics establish it |
| `TRANSFER_INTERNAL` | no | Explicitly internal portfolio movement; generic `TRANSFER` without direction/scope stays ambiguous |
| `UNKNOWN` | no | Unrecognized, conflicting, malformed, or unsupported event |

Classification does not equate every manual row with high confidence. A V76
flow with valid explicit type/date/amount but no wallet identity remains
`AMBIGUOUS` for wallet-level performance. A legacy `aportes` row can classify
as a buy/sell when its operation is explicit, but cannot become an external
flow solely because it is in the contributions screen or has a positive value.
Dividends, JCP, interest, amortization, fees, taxes, buys and sells never
become external flows through fuzzy text matching.

V271 accepts a wallet-scoped classified-flow assessment. Only `HIGH`
external rows with valid economic dates, positive magnitude, investor-perspective
sign, source identity and provenance satisfy TWR/XIRR flow prerequisites;
there is no `MEDIUM` exception. `AMBIGUOUS`, `LOW`, `UNKNOWN`, wrong-wallet,
duplicate-identity, malformed-date and missing-provenance records are counted
and explained but cannot unlock either capability. Stable reason codes include
`NO_TRUSTWORTHY_EXTERNAL_FLOWS` and `INSUFFICIENT_FLOW_PROVENANCE`.

### Slice 2 — Harden and reuse V248 performance contracts

Keep `HistoricalPerformance` as the one canonical formula engine. Adapt it to
consume classified flows from Slice 1 and retain old public shapes where tests
or consumers require compatibility. No parallel engine is created.

The calculation boundary rejects invalid or ambiguous dates/amounts rather
than silently dropping them into an apparently complete result. TWR retains
the documented `END_OF_SUBPERIOD` assumption only when an exact boundary
valuation exists for each external flow date; no interpolation or inferred
same-day ordering is allowed. If flow timing cannot be proven, TWR is
`UNAVAILABLE`/`PARTIAL` with a stable reason. XIRR uses investor-perspective
signs, dated external flows plus the real terminal valuation, valid finite
values, and a bounded deterministic solver; no solution/multiple-root ambiguity
returns a structured non-available status. Simple return is distinct from
TWR/XIRR and is unavailable when external flows make it misleading.

Every result exposes a structured availability state (`AVAILABLE`, `PARTIAL`,
`UNAVAILABLE`, or `INVALID_INPUT`), nullable value, metric/formula version,
period/as-of, evidence identifiers/counts, and warnings/missing requirements.
The legacy `status` field remains for consumer compatibility. `null` is not
formatted as zero. The engine may be available while wallet data is not.

### Slice 3 — Minimal readiness disclosure in History/Reports

Expose the separate state pair `ENGINE_AVAILABLE` and `DATA_READY` (with
per-metric TWR/XIRR readiness) through existing report/history models. Show
descriptive flow counts and why a metric is blocked, without a score/ranking or
recommendation. Reuse existing renderers and visual canon; keep the legacy
performance panel and modern History readonly. No current real portfolio gets
TWR/XIRR merely because the mathematical function passes synthetic tests.

The new readiness contract is wired only after the classifier and engine gate
are complete. If no wallet-scoped trustworthy real external flows exist, the
UI must explicitly remain unavailable and show the missing evidence in plain
language. This is an expected correct outcome, not a test failure.

## Sign, date, wallet, provenance and identity contracts

- Classifier canonical amount is nonnegative magnitude; a separate direction
  defines investor sign and portfolio sign. External contribution is `+` from
  portfolio perspective and `-` from investor/XIRR perspective; withdrawal is
  the inverse. Income/fees/taxes are not external investor flows.
- Do not negate an already signed source amount twice. If source direction and
  explicit type conflict, classify `UNKNOWN`/`AMBIGUOUS` and report the conflict.
- Accept only exact supported calendar date forms from source contracts. Reject
  impossible dates and implicit timezone rollover. Source timestamps, payment
  dates and trade dates remain distinct; use only the documented economic cash
  movement date for a flow, otherwise mark date provenance insufficient.
- A wallet is an isolated scope. No default wallet assignment may bridge a
  missing `walletId`. Cross-wallet rows never enter a metric's input.
- Preserve original source ID/system/type and a classification rule version;
  do not copy PII or raw broker documents into the result. Do not create a new
  financial duplicate key. Dedup/reference linkage remains a separate audit.
- Income-ledger rows and RF-linked proventos must not be counted as investor
  contributions or double-counted as both income and another event.
- For TWR, a date-only flow does not establish whether it occurred before or
  after that day's valuation. The input therefore needs explicit
  `END_OF_SUBPERIOD` timing evidence and an actual valuation boundary on that
  date; otherwise TWR remains unavailable. XIRR may use the validated economic
  date without inventing a time-of-day.

## Real-data readiness vs engine capability

`ENGINE_AVAILABLE` describes whether the pure formula implementation exists
and passes known mathematical vectors. `DATA_READY` is evaluated per wallet
and metric and additionally requires complete, wallet-scoped, provenance-backed
valuation/flow inputs and required boundary timing/coverage. V272 does not
weaken the current `TWR_XIRR_AVAILABLE=false` product guard until the new
readiness path itself returns ready for that real wallet. Test fixtures are
marked `SYNTHETIC_CALCULATION_FIXTURE` and can never be passed into production
readiness.

Unknown is not zero; partial is not ready; stale is not fresh; source-as-of is
not financial-as-of. No formulas in `finance-core.js`, manual fixed-income
authority, price/valuation method, backup schema, persistence schema or
historical ledgers change in V272.

## V272 implementation evidence (worktree, uncommitted)

- The production surface now loads the pure classifier and V271 readiness
  adapter before the existing V248 engine. V271's pre-existing snapshot
  auto-capture functions remain unchanged; its TWR/XIRR cash-flow gates now
  accept only the strict canonical evidence contract above.
- The current V76 persisted flow and snapshot stores still contain no wallet
  identifier. The product adapter refuses to infer the selected wallet for
  those records, so current real-wallet `DATA_READY` remains false/unavailable.
- Product disclosure is limited to readiness/explanation in the legacy V248
  performance panel and Reports summary. No TWR or XIRR result is presented
  unless its engine result and per-wallet data-readiness gate both pass.
- `HistoricalPerformance` remains the sole calculation engine. Its boundary
  requires canonical high-confidence flow evidence; TWR additionally requires
  explicit `END_OF_SUBPERIOD` timing and an observed valuation on each flow
  date. XIRR no longer synthesizes an initial cash flow from opening valuation.
- Focused validation most recently passed 89/89 tests across classifier,
  V271 readiness, V248 engine/UI, history core and runtime-store contracts.
  The legacy static build passed. Full modern test/build gates still require
  the worktree's locked dependencies, absent at this evidence point.
- No commit, push, PR, merge, financial write, tax write, schema change, or
  persistence change has been performed.

## Acceptance criteria

1. Every currently discovered source family has an inventory entry describing
   source module, raw fields/types, date/amount/sign, wallet scope and
   confidence; unsupported semantics stay explicitly unknown.
2. Unit tests cover contribution/withdrawal with and without wallet/provenance,
   BUY/SELL, dividend/JCP/interest/amortization, fee/tax, internal/generic
   transfer, adjustment, unknown, malformed fields, missing date/amount,
   wrong-wallet isolation, duplicate identity separation and deterministic
   output.
3. V271 readiness cannot become ready from ambiguous-only, low-confidence,
   unknown, unscoped or wrong-wallet flow records. Old readiness codes remain
   compatible where meaningful.
4. Existing V248 engine remains the sole calculation engine. Tests prove
   investor-vs-portfolio sign treatment, zero/missing boundary validation,
   same-day timing policy, invalid/future/impossible dates, incomplete coverage,
   finite outputs, deterministic bounded XIRR behavior and explicit unavailable
   results.
5. Simple return, TWR and XIRR contracts have distinct names/statuses; no
   unavailable result serializes/formats to numeric zero or NaN/Infinity.
6. Synthetic tests prove math only; actual wallet readiness remains blocked
   when trustworthy real requirements are not met. `ENGINE_AVAILABLE` never
   implies `DATA_READY`.
7. History/Reports display only readiness and explanatory evidence from the
   canonical assessment. No arbitrary score, recommendation or fabricated
   historical values.
8. No network, financial/tax/ledger writes, import confirmation, restore,
   Firebase/schema migration, backup-format change or real portfolio mutation.
9. Existing formula/authority invariants and V271 snapshot/autocapture behavior
   pass regression suites.
10. Relevant tests/build/QA and `git diff --check` pass on the final exact SHA;
    review confirms no duplicate engine or dedup boundary was introduced.

## Risk and invariant matrix

| Risk | Guard / acceptance evidence |
|---|---|
| Trade or income incorrectly treated as investor contribution | Type-specific exact mappings; unknown remains unknown; classifier matrix tests |
| Unscoped external flow used by the wrong wallet | Fail closed when wallet identity absent; cross-wallet tests |
| Source ID conflated with classifier/dedup identity | Separate fields/contracts; no changes to financial import identity |
| Wrong sign or double negation | Store magnitude + explicit investor/portfolio signs; flow vectors |
| TWR assumes unsupported flow timing | Exact boundary valuations required; no interpolation; structured unavailable reason |
| XIRR returns plausible but ambiguous output | Bounded deterministic solver and explicit no-solution/ambiguity states |
| Missing/partial/stale data looks like zero/ready/fresh | Nullable results and independent coverage/freshness/readiness states |
| New module becomes a parallel performance engine | V248 `HistoricalPerformance` remains canonical; compatibility tests |
| V271 readiness trusts a candidate list instead of events | Per-event classification and wallet-scoped trusted-flow assessment |
| Current real portfolio exposes test-only result | Data readiness is separate from engine availability; production fixture guard |
| Readiness UI duplicates formulas or mutates state | Render-only adapter, existing model/view boundary, write/network tests |

## Rollout and decomposition

The approved V272 is one macro-phase executed in three ordered slices:

1. Classifier, event-source adapters, provenance/confidence, wallet scope and
   V271 readiness contract.
2. V248 engine hardening and adapters to the classified event/readiness
   contracts; mathematical vectors and unavailable states.
3. Minimal History/Reports readiness disclosure, then full regression/review.

Each slice is independently testable; later slices consume earlier outputs.
No persistence migration or invented-data bridge is a prerequisite. If source
inspection proves a required cash-flow source cannot be wallet-scoped without
changing protected persistence, keep it ambiguous and report that limitation;
do not expand into schema work.

## Source inventory (observed contracts)

| Source | Raw fields/types observed | Date / amount / sign | Wallet & provenance | V272 treatment |
|---|---|---|---|---|
| V76 `portfolioExternalCashFlowsV1` via `portfolio-runtime-stores.js` | `CONTRIBUTION`, `WITHDRAWAL`, `TRANSFER_IN_EXTERNAL`, `TRANSFER_OUT_EXTERNAL`, `ADJUSTMENT`; `id`, `date`, `amountCents`, `currency`, `source`, `sourceId`, `confidence`, `notes` | strict `YYYY-MM-DD`; positive integer cents; explicit type supplies direction | No `walletId`; manual source identified, but rows are globally stored; notes are not independent proof | Classify for audit, but wallet-level readiness remains blocked as `AMBIGUOUS` until scope exists in event contract; no migration |
| V76 valuation snapshots | `localDate`, component cents, coverage percentages, freshness/as-of metadata | `localDate`; integer cents; zero-valued components are possible | No `walletId`; global store | Exclude from wallet-specific readiness; never infer wallet from current selection |
| V248 `HistoricalPerformance` inputs | valuations `{date,value}`, events `{date,type/category/classification/operation,amount/value}`, incomes | uses `Date.parse` and numeric coercion; fuzzy classifier derives signs | No required wallet/provenance validation in engine | Harden adapter boundary; preserve existing exports where valid |
| V271 `portfolio-history-sufficiency.js` | snapshots plus `fullState.aportes`, `proventos`, `rfEvents` | `date` + numeric `value`; assumes positive `aportes` trustworthy; proventos count as trustworthy source | Snapshots filter by wallet; event arrays do not; XIRR accepts ambiguous candidates | Replace source-level booleans with event-level classification; preserve unrelated capability codes |
| Legacy `S.aportes` in `index.html` | mixed trades and fixed-income movements, not solely investor deposits | fields vary by movement path; no uniform external-flow sign contract | active state, but no flow semantics proven by collection membership | Exact operation mapping only; generic/missing type stays `UNKNOWN` |
| Legacy `S.proventos` / income ledger | dividend and other realized/expected income records | payment/record dates vary; amount generally positive | active state context, but income is not external investor flow | `INCOME_*`, never external flow; no expected/realized conflation |
| `rfEvents` / fixed-income events | mixed applications, redemptions and income-like events | event-specific date and amount semantics | may lack wallet/date/provenance completeness | ambiguous unless exact type, economic date, direction and scope are established |
| Import preview / historical reconstruction | candidate operations such as BUY, SELL, SUBSCRIPTION, TRANSFER, SPLIT, ADJUSTMENT, DIVIDEND, JCP, AMORTIZATION, FEE, OTHER | preview-specific values/dates; not committed financial truth | document fingerprints may exist, but preview is not ledger truth | excluded from production readiness; no confirmation/write path |

## Implementation plan and file-level sequence

### Slice 1 — canonical classification + V271 fail-closed readiness

1. Add `portfolio-cash-flow-classifier.js` as a pure UMD/CommonJS module with
   exact enums, strict date validation, magnitude/direction, source identity vs
   classification identity, confidence, provenance and warnings.
2. Add focused `node:test` coverage first for V76 types, ambiguous generic
   transfers, missing wallet/provenance, malformed dates, sign conflicts and
   deterministic output.
3. Update `portfolio-history-sufficiency.js` to consume explicitly classified
   flows; legacy inventory remains diagnostics only. Scope events before
   classification. Only trusted, wallet-scoped events can satisfy TWR/XIRR.
4. Keep existing callers compatible; without canonical scoped evidence both
   metrics stay unavailable with stable missing codes.

Acceptance: ambiguous-only and wrong-wallet tests remain not-ready; unrelated
snapshot capability codes and V271 autocapture contracts remain compatible.

### Slice 2 — V248 engine reuse and strict calculation contract

1. Add regression vectors around existing `HistoricalPerformance`; do not add
   another engine. Tighten its public normalization, exact calendar dates,
   accepted classification/sign and finite/nullable statuses, preserving legacy
   aliases needed by current consumers.
2. Require each TWR flow to align with an actual valuation date under the
   documented end-of-subperiod convention; otherwise return unavailable or
   partial. Never interpolate or infer same-day order.
3. XIRR accepts dated, scoped trusted flows plus an explicit real terminal
   valuation; test investor-perspective signs and bounded solver states.
4. Keep engine capability separate from per-wallet data readiness; synthetic
   vectors can never be production readiness evidence.

Acceptance: valid legacy math vectors pass; malformed/incomplete input returns
nullable non-available statuses; no NaN/Infinity, fabricated boundary values,
or parallel engine.

### Slice 3 — minimal History/Reports disclosure + final gates

1. Integrate the canonical assessment in the existing V248 panel only if its
   script/state wiring supplies the assessment without new persistence or cloud
   writes. Do not inject real readiness into the isolated modern demo.
2. Expose `ENGINE_AVAILABLE` separately from per-wallet `DATA_READY`, with
   trusted/ambiguous/unscoped counts and plain-language reasons.
3. Add UI contract tests proving ambiguous flows never render ready and unknown
   values remain unavailable.
4. Run targeted suites, then required full tests/builds, and review for writes,
   schema edits, duplicate engines and changed financial authority.

Acceptance: V248 remains canonical; no real wallet is shown ready without
scoped trusted data; UI is read-only and explanatory; all applicable gates pass.
