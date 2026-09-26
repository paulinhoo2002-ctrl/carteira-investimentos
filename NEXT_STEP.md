# Next Steps — Carteira de Investimentos Legacy

## Immediate (Post-V269 Certification)

- [ ] **V269 PR merge authorization** — Wait for explicit human `Autorizo o squash merge da PR #<V269_PR>`.
- [ ] **Post-merge cleanup** — Fast-forward local main, remove V269 worktree, prune stale worktree metadata.
- [ ] **Roadmap reassessment** — After V269, re-evaluate blocked priorities with history UI now available.

## Priority Candidates for V270

### 1. Import Center Fixture Intake Tooling (HIGH READINESS)
- **Why:** Unblocks XP/BTG parser validation which has been blocked on representative fixtures.
- **Scope:** Local sanitization CLI, sensitive-field scrubber, fixture contract validator, deterministic validation report, broker intake workflow, safe preview, onboarding docs.
- **Depends on:** V268 portfolio history (for import recovery integration) + V269 UI (for import review).
- **Tests:** Fixture validation round-trips, scrubber determinism, broker format coverage matrix.
- **Risk:** Low — tooling only, no product behavior change.

### 2. Export/Import/Recovery Integration (V267 FOUNDATION)
- **Why:** Complete the backup/restore loop with portfolio history included.
- **Scope:** Ensure portfolioHistory round-trips through V267 backup/restore; verify previewRestore shows history diffs; confirm compatibility states.
- **Depends on:** V267 + V268 + V269 all merged.
- **Tests:** Backup/restore integration tests with portfolioHistory payload.
- **Risk:** Low — validation only, no new behavior.

### 3. Data Provenance Consolidation (ARCHITECTURAL FIT)
- **Why:** Unified provenance across imports, snapshots, manual edits, cloud sync.
- **Scope:** Single provenance model, cross-feature queries, audit trail UI.
- **Depends on:** V268/V269 provenance model proven.
- **Risk:** Medium — touches multiple domains.

## Blocked / Waiting

- **TWR/XIRR Calculation** — Requires sufficient real historical snapshots (V268 enables capture; V269 enables manual capture; time needed for accumulation). Do NOT implement synthetic backfill.
- **XP/BTG Parser Completion** — Requires real sanitized fixtures (Import Center Fixture Intake unblocks this).
- **MODE_B Implementation** — Requires business/provider decision on broker-dependent behavior.
- **IPCA+ Exact Valuation** — Preserve `UNSUPPORTED_IPCA_EXACT` until defensible implementation exists.

## Quality Gates (All Phases)

Every phase must pass:
- `test:modern` — 815+ tests
- `npm test` — 249+ tests
- `build` + `build:modern` — both PASS
- `qa:all` — 7 viewport smoke, no overflow/errors
- `git diff --check` — PASS
- `test:backup-recovery` — 9/9
- `test:v249` — 12/12

## Safety Invariants (Never Compromise)

- `FINANCIAL_WRITE_COUNT=0` — No real financial writes without explicit user confirmation
- `TAX_WRITE_COUNT=0` — No tax calculations written
- `FIREBASE_SCHEMA_CHANGE=false` — No schema migrations without dedicated phase
- `UNKNOWN != ZERO` — Missing data stays unknown, never zero
- `PARTIAL != COMPLETE` — Incomplete coverage blocks metrics
- `STALE != FRESH` — Staleness explicitly tracked
- `FINANCIAL_AS_OF != SOURCE_AS_OF` — Provenance separation preserved
- `MANUAL_AUTHORITY_PRESERVED=true` — User authority never overridden
- `NO_FAKE_HISTORY_CREATED` — No synthetic backfill ever
- `TWR_XIRR_AVAILABLE=false` — Until sufficient trustworthy history exists