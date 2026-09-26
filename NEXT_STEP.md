# Next Steps — Carteira de Investimentos Legacy

## Immediate — V273 Reporting Data Quality and Operational Polish

- [x] Install only lockfile-pinned V273 dependencies with `npm ci --ignore-scripts`; package manifests remain unchanged.
- [x] Run general/modern suites, modern/legacy builds, `qa:all`, seven-width Reports QA, axe at 390px, and inspect final screenshots.
- [x] Review implementation and reconcile project memory/state/next-step/open-work with measured local evidence.
- [ ] Perform final diff audit, commit, push and open/update the V273 PR; then verify CI and preview on its exact final SHA. Do not merge.

## Roadmap constraints after V272 merge

- **V272** is merged in `origin/main` at `75e77a7e98ef0768a5d4a6855b684432f09493b4` (PR #425).
- **V273** is the active reporting data-quality/operational polish phase. The readiness aggregator must stay pure/read-only and consume existing evidence only.
- **TWR/XIRR** remains unavailable for real wallets while V76 history/flows lack trustworthy wallet identity; do not synthesize `walletId` or history.
- **XP/BTG parser completion** still requires legitimate sanitized broker fixtures. **MODE_B** still requires provider/business direction. Reassess candidates from current repository evidence after V273; do not treat this list as approval to start another phase.
- **Current V273 local gates:** `test:modern` 815/815; `npm test` 249/249; `test:performance` 84/84; `test:qa-harness` 2/2; `build`, `build:modern`, `qa:all`, Reports responsive matrix and `git diff --check` PASS. Exact PR/CI/preview evidence is still pending.

## Blocked / Waiting

- **TWR/XIRR Calculation** — V76 still lacks wallet identity; `WALLET_ID_UNAVAILABLE` blocks real data readiness. Do NOT synthesize a wallet ID or history.
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
- `ENGINE_AVAILABLE != DATA_READY` — A tested engine does not prove real-wallet data readiness.
- `TWR_XIRR_AVAILABLE=false` — Until wallet-scoped, trustworthy history and cash flows exist.
