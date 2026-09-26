# Open Work — Carteira de Investimentos Legacy

## Active Phase

**V273 — Reporting data quality and operational polish** (implementation in progress)
- Branch: `feature/v273-reporting-data-quality-ops`
- Worktree: `C:\Projetos\carteira-investimentos.worktrees\v273-reporting-data-quality-ops`
- Base: `75e77a7e98ef0768a5d4a6855b684432f09493b4` (V272 PR #425 merge on origin/main)
- Scope: pure/read-only report readiness aggregation and compact evidence/status disclosure; no new authority, arbitrary score, route, or financial/tax writes.
- Current verification: focused 75/75 plus UI/browser matrix 6/6; performance 84/84; QA harness 2/2; modern tests 815/815; general suite 249/249; legacy/modern builds; `qa:all`; report seven-width responsive matrix; axe critical/serious 0; diff-check PASS.
- The dedicated QA found and fixed a V273 render defect: `v273ReportReadiness` referenced a block-scoped `classifier` from a different function, causing silent fallback to Dashboard. The adapter now resolves the canonical global classifier and has a regression test. Final screenshots at 390/768/1366/1920 were inspected from isolated synthetic `testMode`; no authenticated portfolio or personal browser was used.
- `npm ci --ignore-scripts` ran only in this worktree under explicit authorization; package manifest and lockfile unchanged. Commit/push/PR and exact-head CI/preview remain pending. No merge.

## Completed Phases (Post-Merge)

- **V272** — Trusted cash-flow/performance readiness — MERGED as `75e77a7e98ef0768a5d4a6855b684432f09493b4` (PR #425)

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

## Next Human Decision Points

1. **V273 merge authorization** — Only after exact-head PR CI and preview are ready; no merge has occurred.
2. **TWR/XIRR real readiness** — Remains blocked by missing wallet-scoped V76 evidence; do not synthesize IDs or history.
3. **XP/BTG parser completion** — Requires legitimate sanitized broker fixtures.
4. **Corporate Events MODE_B** — Requires provider/business direction.
