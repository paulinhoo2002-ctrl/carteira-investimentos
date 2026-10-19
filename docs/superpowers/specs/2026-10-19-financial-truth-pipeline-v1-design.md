# Financial Truth Pipeline V1 — Design

Status: DESIGN_APPROVED_IN_CHAT / SPEC_FOR_REVIEW
Project: Carteira de Investimentos LEGACY
Base main: b96996baac7f7b57ad81143934cbec13203256b6
Mode: MAINTENANCE_AND_DATA_CERTIFICATION_MODE
Feature freeze: respected

## 1. Intent

Build a durable financial-evidence pipeline that can answer, for every derived metric:

- what source evidence exists;
- which period it covers;
- whether the opening state is known;
- whether duplicates/conflicts are resolved;
- whether the metric is observed, derived, partial, unknown or unavailable;
- whether the metric may safely participate in portfolio-level aggregation.

The objective is not to force a Dashboard number. The objective is to make every financial number explainable and coverage-aware.

## 2. Non-goals

This design does not authorize:

- changing fiscal formulas;
- changing persistence schema;
- changing Firebase Auth or Firestore Rules;
- creating hosted financial evidence documents;
- writing, repairing or backfilling real financial history;
- inventing missing opening balances;
- auto-resolving ambiguous duplicates;
- certifying MOVIDA or CRA JBS while source conflicts remain;
- enabling a global Dashboard result before aggregation coverage is proven;
- treating economic result as fiscal result.

HOSTED_FINANCIAL_WRITES=0 for V1.

## 3. Protected invariants

The implementation must preserve:

- UNKNOWN != ZERO
- MISSING != ZERO
- PARTIAL != COMPLETE
- EXPECTED != RECEIVED
- CURRENT_POSITION != historical reconstruction
- CURRENT_MARKET_RESULT != TOTAL_RETURN
- COUPON != CAPITAL_GAIN
- AMORTIZATION != INCOME
- REDEMPTION != INCOME
- TAX != NEGATIVE_RETURN
- projected tax != paid tax

No synthetic balancing positions or transactions are permitted.

## 4. Architecture

Financial Truth Pipeline V1 is split into three independently reviewable layers and three PRs.

### PR A — Provenance + Historical Coverage

Introduce an isolated provenance and coverage layer that does not calculate portfolio return.

Responsibilities:

1. Normalize evidence descriptors from already-loaded runtime sources.
2. Track source kind, source identity, authority, period and confidence state.
3. Prove or fail closed on:
   - periodStart;
   - periodEnd;
   - openingPosition;
   - allEventsRepresented;
   - duplicatesResolved;
   - event identity;
   - source overlap/conflicts.
4. Emit per-component coverage without promoting unrelated components.

Conceptual output:

```js
{
  sourceEvidence: [...],
  coverage: {
    currentPosition,
    costBasis,
    contributions,
    income,
    taxes,
    capitalReturns,
    principal,
    history: {
      status,
      periodStart,
      periodEnd,
      openingPosition,
      allEventsRepresented,
      duplicatesResolved
    }
  },
  blockers: [...]
}
```

Coverage states remain explicit: COMPLETE, PARTIAL, UNKNOWN.

The provider merged in #515 remains a consumer/integration point. This PR should extend evidence quality without reimplementing the economic-result engine.

### PR B — Reconciliation + Portfolio Economic Result

Build an isolated reconciliation layer over certified per-asset evidence.

Responsibilities:

1. Reconcile:
   - current market position;
   - verified contributions;
   - sales/redemptions;
   - principal returned;
   - received income;
   - paid taxes;
   - opening state;
   - duplicate/conflict state.
2. Produce per-asset reconciliation status.
3. Aggregate only components whose coverage permits aggregation.
4. Expose blockers for incomplete assets.
5. Produce a portfolio-level result state that distinguishes:
   - COMPLETE;
   - PARTIAL;
   - UNKNOWN;
   - NOT_AVAILABLE.

The aggregate must never coerce a partial asset into a complete global result.

Conceptual output:

```js
{
  assets: [...],
  totals: {
    currentMarketValue,
    contributions,
    incomeNet,
    capitalReturnNet,
    taxesPaid,
    totalEconomicResult
  },
  coverage: {
    status,
    includedAssetCount,
    blockedAssetCount,
    blockers
  }
}
```

No fiscal/tax-liability calculation is introduced.

### PR C — Dashboard Integration + Certification

Integrate the aggregate read model into the existing Dashboard without duplicating formulas.

Rules:

- Dashboard consumes the canonical aggregate read model.
- Dashboard must not recalculate economic result.
- If aggregate coverage is not sufficient, keep:
  `Resultado total: Em consolidação`.
- If only a certified subset exists, label it explicitly as partial/subset; never present it as portfolio total.
- Hide Values must mask all new monetary and percentage values.
- Demo mode uses synthetic values only.
- Existing UI hierarchy and SLIM PORTFOLIO UI remain intact.
- No redesign.

## 5. Source Provenance Registry

Each evidence item must carry enough metadata to explain its origin without persisting a new schema.

Required conceptual fields:

- sourceKind
- sourceId / stable identity when available
- asset identity
- observedAt / occurredOn
- authority
- value semantics
- amount basis when relevant (GROSS/NET)
- status (CONFIRMED/RECEIVED/PAID/etc.)
- period membership
- conflict state
- duplicate state

Absence of provenance blocks promotion to COMPLETE.

## 6. Historical Coverage Engine

History can be COMPLETE only if all conditions are proven:

- valid known period start/end;
- openingPosition === NONE or an equivalent explicitly certified opening state;
- all relevant events represented;
- duplicatesResolved === true;
- no unresolved source overlap;
- no unknown event that may affect economics;
- required contribution/capital-return/tax evidence is sufficient for the metric being derived.

Presence of many records is not proof of completeness.

If an investment predates available records and no authoritative opening basis exists, history remains PARTIAL.

## 7. Reconciliation Rules

The reconciliation engine must preserve separation of cash-flow roles:

- contributions increase invested capital;
- redemptions/amortizations are capital cash flow, not income;
- coupon/interest/income events are income only when actually received;
- taxes count only when demonstrably paid;
- projected exit tax is never paid tax;
- current position is an observation, not historical proof.

Gross and net representations of the same event must not both be counted.

Unresolved duplicate risk blocks the affected component from COMPLETE.

## 8. Aggregation Contract

Portfolio aggregation is component-aware.

A metric may aggregate only assets for which that metric is valid.

Examples:

- current market value may be broadly complete while historical total result is partial;
- a total economic result may exist for one asset while open-position result remains unknown;
- assets with unknown historical coverage must not contribute a fabricated zero.

The global status is not a simple boolean. It must expose whether the portfolio result is:

- COMPLETE — all in-scope assets/components required by the metric are complete;
- PARTIAL — some valid derived components exist but one or more in-scope assets are blocked;
- UNKNOWN — evidence is insufficient to form a valid aggregate;
- NOT_AVAILABLE — the requested metric is intentionally unsupported.

## 9. Asset-specific constraints

### Trend DI / Trend DI II

Eligible for certification only when runtime evidence proves coverage.

The synthetic oracle values from tests remain tests only and must never be copied into production evidence.

Trend DI II may derive total economic result without remaining cost basis if complete cash-flow history permits it, while open-position result remains UNKNOWN.

### MOVIDA

Remain PARTIAL/UNSUPPORTED until conflicting XP fields are resolved by authoritative evidence.

Known ambiguity includes current market value versus applied/original/liquid values.

### CRA JBS

Remain PARTIAL/UNSUPPORTED until source and tax semantics are proven.

Absence of a recorded tax event is not proof of zero tax.

## 10. Fiscal Boundary

Economic and fiscal domains remain separate.

The pipeline may describe economic cash-flow result, but it must not:

- compute tax payable;
- relabel economic result as fiscal gain;
- infer fiscal cost basis;
- treat FIFO analytical cost as certified fiscal cost;
- activate IR2026 readiness.

TAX_PAYABLE_STATUS remains NOT_CALCULATED until the dedicated fiscal gates pass.

## 11. Privacy and Runtime Boundaries

Real evidence is available only under authenticated authorized REAL mode after cloud state is loaded.

DEMO, unauthenticated and blocked modes must not access real evidence.

Logout must clear real evidence state.

Public screenshots and committed fixtures must use synthetic data only.

No personal portfolio values, account identifiers, source files, hashes or authenticated screenshots may be committed.

## 12. Testing Strategy

### PR A

Mandatory behavioral coverage:

- provenance missing => fail closed;
- invalid/missing period => PARTIAL;
- unknown opening => PARTIAL;
- duplicate unresolved => PARTIAL;
- source overlap unresolved => PARTIAL;
- unknown economic event => blocks affected coverage;
- paid linked tax may be COMPLETE;
- projected tax never becomes paid;
- DEMO/unauth/blocked cannot access real provenance;
- Trend identity exact/conservative;
- MOVIDA/CRA not promoted.

### PR B

Mandatory behavioral coverage:

- reconciliation preserves cash-flow roles;
- gross/net same event counted once;
- tax deducted once;
- unknown != zero;
- partial asset does not become complete;
- valid asset can contribute to a valid partial aggregate;
- global COMPLETE requires all required in-scope coverage;
- no fiscal result emitted;
- no synthetic balancing.

### PR C

Mandatory behavioral coverage:

- Dashboard consumes canonical aggregate only;
- no second financial formula in UI;
- insufficient coverage => Em consolidação;
- partial subset is explicitly labeled;
- Hide Values masks every new metric;
- Demo synthetic only;
- no global numeric result from partial evidence;
- responsive matrix;
- Axe critical=0, serious=0;
- keyboard/focus contracts preserved.

## 13. Release Strategy

Three PRs, sequential and based on the merged predecessor:

1. PR A — `feat(finance): add financial provenance and history coverage`
2. PR B — `feat(finance): add portfolio economic reconciliation`
3. PR C — `feat(ui): integrate certified portfolio result status`

Each PR must have:

- clean dedicated worktree;
- identity gate;
- focused tests;
- finance/UI/persistence suites as applicable;
- modern suite;
- qa:all;
- V289 when UI/browser-sensitive;
- build;
- git diff --check;
- exact-SHA CI green;
- exact-SHA Vercel preview READY when applicable;
- 0 unresolved review threads;
- independent semantic review;
- human merge authorization.

No automatic merge.

## 14. Failure and Stop Rules

Stop and fail closed if:

- source provenance is ambiguous;
- history completeness cannot be proven;
- asset identity is ambiguous;
- duplicate resolution is uncertain;
- a required monetary amount has unsafe or missing semantics;
- runtime attempts to infer missing data;
- fiscal and economic semantics become coupled;
- a PR changes persistence/Auth/Rules/schema outside an explicitly approved follow-up scope.

A conservative PARTIAL result is a successful safety outcome.

## 15. Success Criteria

Financial Truth Pipeline V1 is successful when:

1. every new result can explain its source and coverage;
2. no unknown/missing value becomes zero;
3. Trend may become derived only when runtime evidence proves it;
4. MOVIDA/CRA remain safely blocked until their evidence is resolved;
5. portfolio aggregation distinguishes complete/partial/unknown;
6. Dashboard cannot overstate a partial result as a global total;
7. fiscal logic remains untouched;
8. hosted financial writes remain zero;
9. tests and release gates pass on each exact PR SHA;
10. rollback remains simple because each layer lands separately.

## 16. Explicitly Deferred

Deferred to later missions:

- resolving MOVIDA/CRA source conflicts;
- IR2026 real-data certification;
- hosted persistence of provenance;
- historical backfill or migration;
- real import/write promotion;
- global fiscal P&L;
- redesign;
- architecture migration away from the legacy shell.

## 17. Decision

Selected approach: staged Financial Truth Pipeline with three PRs.

Reason: it minimizes the chance that uncertain historical evidence contaminates calculations or UI while establishing one reusable path for future portfolio-level certification.
