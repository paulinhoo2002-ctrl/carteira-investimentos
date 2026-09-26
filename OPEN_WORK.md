# Open Work — Carteira de Investimentos Legacy

## Active Phase

**V269 — Portfolio History UI and Manual Capture** (CERTIFIED, ready for PR)
- Branch: `feature/v269-portfolio-history-ui`
- Worktree: `C:\Projetos\carteira-investimentos.worktrees\v269-portfolio-history-ui`
- Base: `556387f54085b09ba0f75658d6759c8d8d4177f1` (origin/main post-V268 merge)
- Scope: Portfolio History page in modern shell, manual capture button, coverage badges, snapshot detail, empty state, TWR/XIRR notice, reading guide
- Tests: All gates passing (test:modern 815/815, npm test 249/249, build:modern PASS, build PASS, qa:all PASS, git diff --check PASS, core 18/18, backup 9/9, v249 12/12)
- PR: Ready to open after final documentation
- Status: Certified for human merge authorization

## Completed Phases (Post-Merge)

- **V268** — Portfolio History Foundation — MERGED as `556387f54085b09ba0f75658d6759c8d8d4177f1` (PR #421)
- **V267** — Backup and recovery hardening — MERGED as `f11d38683b1aca50fb639aba1746f0269c426ef6` (PR #420)
- **V266** — QA smoke autostart — MERGED as `5b9de334775d24833e0e696a2bc825f9b7a4361d` (PR #419)
- **V265** — QA harness resilience — MERGED as `5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa` (PR #416)
- **V264** — SGS 433 fetcher — MERGED as `10995f31d7ada0b7f8a02e6317813de0c21fc55d` (PR #415)
- **V263** — Financial As-Of Provenance — MERGED as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41` (PR #413)
- **V262** — IPCA Diagnostics — MERGED (PR #412)

## Blocked / Waiting on Dependencies

| Work Item | Blocked On | Priority |
|-----------|------------|----------|
| TWR/XIRR Calculation | Sufficient real historical snapshots (V268 enables; V269 enables manual capture; time needed) | HIGH |
| XP/BTG Parser Completion | Real sanitized fixtures (Import Center Fixture Intake unblocks) | HIGH |
| MODE_B Implementation | Business/provider decision on broker-dependent behavior | MEDIUM |
| IPCA+ Exact Valuation | Defensible implementation (currently `UNSUPPORTED_IPCA_EXACT`) | MEDIUM |
| Authenticated QA Ergonomics | Protected QA preview access improvements | MEDIUM |
| Mobile Readability Hardening | Specific viewport regression evidence | LOW |

## Ready to Start (Dependencies Met)

1. **Import Center Fixture Intake Tooling** — No blockers; tooling only; unblocks XP/BTG
2. **Export/Import/Recovery Integration** — V267 + V268 + V269 all complete; validation only
3. **Data Provenance Consolidation** — V268/V269 provenance model proven; architectural

## Technical Debt / Maintenance

- [ ] Internal `.worktrees` cleanup (legacy worktrees under `C:\Projetos\carteira-investimentos\.worktrees`)
- [ ] `node_modules` junction cleanup from V264 residue
- [ ] `tmp_obj_*` Git objects (~259 MiB) — `git gc` deferred due to recoverable history risk
- [ ] 169 unreachable commits — preserve until history audit complete
- [ ] Vite CJS Node API deprecation warning (build:modern) — non-blocking
- [ ] `readonly-report-page-contract.js` export warning — non-blocking

## Safety Invariants (Active)

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

## Documentation Updates Needed

- [x] `docs/ai/PROJECT_STATE.md` — V267 completed, V268 merged, V269 certified
- [x] `NEXT_STEP.md` — Updated for post-V269
- [x] `OPEN_WORK.md` — Updated for V269 active phase
- [ ] `docs/PROJECT_MEMORY.md` — If exists, reconcile
- [ ] `docs/ai/QA_HARNESS.md` — V269 integration notes (if applicable)

## Next Human Decision Points

1. **V269 PR merge authorization** — `Autorizo o squash merge da PR #<V269_PR>`
2. **V270 Selection** — Choose from: Fixture Intake / Export/Import Integration / Data Provenance
3. **TWR/XIRR Threshold** — Define "sufficient trustworthy history" criteria (e.g., 365 daily snapshots)
4. **XP/BTG Fixture Acquisition** — Authorize broker statement sanitization workflow