# V320: Overnight Functional Acceleration and Backlog Burn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Burn down maximum safe, independent, non-Firebase functional backlog from current origin/main (cb47660) in isolated worktree.

**Architecture:** Phase-based autonomous implementation with TDD, Ponytail minimal diffs, Caveman communication. No visual redesign. No Firebase/external dependencies. Synthetic fixtures only.

**Tech Stack:** Node.js native test runner, Playwright for browser E2E, Vite for modern build, legacy SPA (index.html).

**Spec:** `docs/ai/PRODUCT_COMPLETION_BACKLOG.md`, `docs/ai/NEXT_STEP.md`, `docs/ai/PROJECT_STATE.md`

---

## Global Constraints

- UNKNOWN != ZERO, PARTIAL != COMPLETE, STALE != FRESH, FINANCIAL_AS_OF != SOURCE_AS_OF, ESTIMATE != RECEIVED
- No real financial writes, no real data, no Firebase provisioning, no Vercel deploys
- VISUAL_PHASE=DEFERRED, VISUAL_CANON_V2=FROZEN_REFERENCE — no visual changes unless blocking usability
- All tests must pass: `npm test`, `npm run test:modern`, `npm run build`, `npm run build:modern`, `npm run qa:all`, `git diff --check`
- MERGE_AUTHORIZATION=false — Draft PR only
- Worktree: `C:/Projetos/carteira-investimentos.worktrees/v320-overnight-functional`
- Branch: `hermes/v320-overnight-functional-acceleration`
- Base: `origin/main` (cb47660)

---

## Phase A — Build Live Backlog Map ✓ COMPLETE

Derived from repository truth: PROJECT_STATE, NEXT_STEP, PROJECT_MEMORY, open plans, TODO/FIXME, skipped tests, known gaps.

**Key backlog items mapped:**

| ID | Area | Severity | User Value | Risk | Dependency | Est. Size | Can Complete |
|---|---|---|---|---|---|---|---|
| V283-03 | Rentabilidade adapter | P2 | Medium | Low | V248 snapshots | Medium | Yes |
| V283-04 | CorporateEvents promote | P1 | High | Medium | Authority contract | Small | Yes (guard) |
| V283-05 | Dead adapter code | P3 | Low | Low | None | Tiny | Yes |
| V283-06 | Source guard test noise | P2 | Medium | Low | None | Tiny | Yes |
| V285-01 | Proventos/events coverage | P2 | High | Medium | Provider fixtures | Medium | Partial |
| V285-02 | RF field separation | P2 | High | Low | RF domain | Medium | Yes |
| V286-01 | Backup restore preview | P2 | High | Medium | V249 | Medium | Yes |
| V288-01 | A11y certification | P3 | Medium | Low | Browser QA | Medium | Yes |

---

## Phase B — Select Maximum Safe Workset ✓ COMPLETE

Selected highest-value independent items testable tonight with synthetic fixtures:

**Batch 1 (Immediate):**
1. V283-04: Add guard to `promoteExpectedToRealized()` — require explicit receipt evidence
2. V283-05: Remove dead code `buildMonthlyPointsFromValuations`, `buildAlignedBenchmarkSeries`
3. V283-06: Rename/document source guard test as historical audit, add runtime assertion
4. V283-03: Surface missing coverage boundaries in adapter (monthly, T12, benchmark, class filters)

**Batch 2 (If Batch 1 green):**
5. V285-02: RF field separation hardening (applied/gross/liquid distinct, financial-as-of vs source-as-of)
6. V286-01: Backup restore preview-only certification (extend V249 tests)
7. V288-01: Functional A11y pass (keyboard, focus, labels, touch targets)

---

## Phase C — Functional Flow Inventory ✓ COMPLETE

Matrix built from code inspection:

| Flow | Implemented | Persisted | Reload Safe | Idempotent | Cancel Safe | Failure Safe | Tested | Browser Tested | Status |
|---|---|---|---|---|---|---|---|---|---|
| Assets CRUD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Aportes CRUD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Buy/Sell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified V317 |
| Proventos/JCP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| FIIs/Amortization | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Renda Fixa | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified V317 |
| B3 Import | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified V285 |
| Inter Import | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified V285 |
| Duplicate Handling | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Reconciliation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Backup/Restore | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Preview-only |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Rebalance | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Read-only |
| Goals | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Settings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Certified |
| Financial Action Confirmation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | V317 Partial |

---

## Phase D — Implement First High-Value Batch (BATCH 1)

### Task 1: V283-04 — CorporateEvents promote guard

**Files:**
- Modify: `corporate-events-core.js` (promoteExpectedToRealized function)
- Test: `tests/corporate-events-core.test.js`

**Interfaces:**
- Consumes: CorporateEventsCore.promoteExpectedToRealized(expectedEvents, receiptEvidence)
- Produces: Only promotes when receiptEvidence has explicit RECEIVED provenance

- [ ] **Step 1: Write failing test**
```javascript
test('promoteExpectedToRealized requires explicit receipt evidence', () => {
  const expected = [{ id: 'evt1', ticker: 'ABCP11', type: 'Rendimento', value: 100, date: '01/08/2026', status: 'EXPECTED' }];
  const noReceipt = [];
  const result = CorporateEventsCore.promoteExpectedToRealized(expected, noReceipt);
  assert.equal(result[0].status, 'EXPECTED'); // stays EXPECTED
});

test('promoteExpectedToRealized promotes only with RECEIVED evidence', () => {
  const expected = [{ id: 'evt1', ticker: 'ABCP11', type: 'Rendimento', value: 100, date: '01/08/2026', status: 'EXPECTED' }];
  const receipt = [{ id: 'evt1', ticker: 'ABCP11', type: 'Rendimento', value: 100, date: '01/08/2026', provenance: 'RECEIVED' }];
  const result = CorporateEventsCore.promoteExpectedToRealized(expected, receipt);
  assert.equal(result[0].status, 'REALIZED');
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/corporate-events-core.test.js`
Expected: FAIL — function doesn't check receipt evidence

- [ ] **Step 3: Write minimal implementation**
Modify `promoteExpectedToRealized` to only promote when matching receipt has `provenance: 'RECEIVED'`

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/corporate-events-core.test.js`
Expected: PASS

- [ ] **Step 5: Run full regression**
Run: `npm test`
Expected: 252/252 PASS

- [ ] **Step 6: Commit**
```bash
git add corporate-events-core.js tests/corporate-events-core.test.js
git commit -m "fix(corporate-events): require explicit RECEIVED provenance for promotion"
```

---

### Task 2: V283-05 — Remove dead adapter code

**Files:**
- Modify: `v283-rentability-adapter.js` (remove buildMonthlyPointsFromValuations, buildAlignedBenchmarkSeries)
- Test: `tests/v283-legacy-rentability-red.test.js` (ensure no consumer)

**Interfaces:**
- Consumes: None (dead code)
- Produces: Cleaner adapter, no unused functions

- [ ] **Step 1: Verify no consumers**
Run: `grep -r "buildMonthlyPointsFromValuations\|buildAlignedBenchmarkSeries" --include="*.js" .`
Expected: Only in v283-rentability-adapter.js

- [ ] **Step 2: Write test confirming removal doesn't break runtime**
```javascript
test('adapter exports only active functions', () => {
  const adapter = require('./v283-rentability-adapter.js');
  assert.ok(typeof adapter.rentabilityHistory === 'function');
  assert.ok(!adapter.buildMonthlyPointsFromValuations);
  assert.ok(!adapter.buildAlignedBenchmarkSeries);
});
```

- [ ] **Step 3: Remove dead functions from v283-rentability-adapter.js**

- [ ] **Step 4: Run tests**
Run: `npm test` + `npm run test:modern`
Expected: All PASS

- [ ] **Step 5: Commit**
```bash
git add v283-rentability-adapter.js tests/v283-legacy-rentability-red.test.js
git commit -m "cleanup(v283): remove dead adapter functions buildMonthlyPointsFromValuations, buildAlignedBenchmarkSeries"
```

---

### Task 3: V283-06 — Fix source guard test noise

**Files:**
- Modify: `tests/v283-legacy-rentability-red.test.js` (rename, add runtime assertion)
- Test: Same file

**Interfaces:**
- Consumes: Legacy function detection
- Produces: Clear test naming + runtime assertion that adapter prevails

- [ ] **Step 1: Rename test file to clarify purpose**
```bash
git mv tests/v283-legacy-rentability-red.test.js tests/v283-legacy-source-guard.test.js
```

- [ ] **Step 2: Update test to add runtime assertion**
```javascript
test('legacy rentability functions still exist in source but adapter prevails at runtime', () => {
  // Source guard: detect problematic patterns in legacy source
  const source = fs.readFileSync('index.html', 'utf8');
  assert.match(source, /current_price/); // legacy pattern exists in source
  
  // Runtime assertion: adapter is loaded and used
  const adapter = require('./v283-rentability-adapter.js');
  assert.ok(typeof adapter.rentabilityHistory === 'function');
  
  // Verify adapter doesn't use current_price for historical
  const result = adapter.rentabilityHistory({ assets: [], period: '12m' });
  assert.ok(result.coverage !== 'FULL_COVERAGE' || result.dataReadiness === 'UNAVAILABLE');
});
```

- [ ] **Step 3: Run tests**
Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add tests/v283-legacy-source-guard.test.js
git commit -m "test(v283): clarify legacy source guard test, add runtime adapter assertion"
```

---

### Task 4: V283-03 — Surface missing coverage boundaries

**Files:**
- Modify: `v283-rentability-adapter.js` (add explicit unavailable states for monthly, T12, benchmark, class filters)
- Test: `tests/v283-behavioral-runtime.test.js` (extend R3, R12)

**Interfaces:**
- Consumes: HistoricalPerformance engine coverage/dataReadiness
- Produces: Explicit UNAVAILABLE/PARTIAL with reason for each metric type

- [ ] **Step 1: Write failing tests for each missing boundary**
```javascript
test('monthly points return UNAVAILABLE without dated valuations', () => {
  const result = adapter.rentabilityHistory({ period: 'monthly' });
  assert.equal(result.monthly?.status, 'UNAVAILABLE');
  assert.ok(result.monthly?.reason?.includes('dated valuations'));
});

test('trailing 12M returns UNAVAILABLE without full coverage', () => {
  const result = adapter.rentabilityHistory({ period: '12m' });
  assert.equal(result.trailing12m?.status, 'UNAVAILABLE');
});

test('benchmark series returns UNAVAILABLE without aligned coverage', () => {
  const result = adapter.rentabilityHistory({ period: 'benchmark' });
  assert.equal(result.benchmark?.status, 'UNAVAILABLE');
});

test('class filter returns UNAVAILABLE without per-class coverage', () => {
  const result = adapter.rentabilityHistory({ period: '12m', class: 'FII' });
  assert.equal(result.byClass?.FII?.status, 'UNAVAILABLE');
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement coverage boundary checks in adapter**
Extend `rentabilityHistory` to check engine's `priceCoverage` and `dataReadiness` per metric type

- [ ] **Step 4: Run tests to verify pass**

- [ ] **Step 5: Run full regression**
Run: `npm test` + `npm run test:modern`

- [ ] **Step 6: Commit**
```bash
git add v283-rentability-adapter.js tests/v283-behavioral-runtime.test.js
git commit -m "feat(v283): surface missing coverage boundaries for monthly, T12, benchmark, class filters"
```

---

## Phase E — Continue to Second Batch (if Batch 1 green)

### Task 5: V285-02 — RF field separation hardening

**Files:**
- Modify: `finance-core.js` (rfValues - ensure applied/gross/liquid distinct, financial-as-of tracking)
- Test: `tests/finance-core.test.js` (extend RF tests)

### Task 6: V286-01 — Backup restore preview-only certification

**Files:**
- Modify: `backup-portability.js` (extend previewRestore)
- Test: `tests/backup-recovery-hardening.test.js` (extend)

### Task 7: V288-01 — Functional accessibility pass

**Files:**
- Browser test: `tests/a11y-functional.test.js` (new)
- Test across viewports: 390, 430, 768, 1366, 1920

---

## Phase F-N — Hardening, Testing, Review

After implementation batches:
- Import Center hardening (Phase F)
- Persistence/Recovery audit (Phase G)
- Idempotency tests (Phase H)
- Failure injection (Phase I)
- Browser E2E across all viewports (Phase J)
- Accessibility functional pass (Phase K)
- Performance/Reliability audit (Phase L)
- Test hardening (Phase M)
- Full test matrix (Phase N)
- Ponytail full review (Phase O)
- Caveman simplification (Phase P)
- Second independent review (Phase Q)
- Documentation updates (Phase R)
- Commit/Push (Phase S)
- Draft PR (Phase T)
- CI self-heal (Phase U)
- Continue if time permits (Phase V)

---

## Execution Handoff

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
   - REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
   - REQUIRED SUB-SKILL: Use superpowers:executing-plans

**Which approach?**