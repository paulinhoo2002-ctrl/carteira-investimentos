# Next Steps — Carteira de Investimentos Legacy

## Immediate — V274 release hardening and visual baseline closeout

- V274 branch `feature/v274-release-hardening-visual-baseline`, based on `5b4bd90eb46275bd44dcac2812fe2533d918f85e`; keep canonical main unchanged.
- V273 PR #426 is merged. Current local gates after targeted light-theme edits: `npm test` 249/249, `test:modern` 815/815, modern build PASS, `qa:all` PASS (QA harness 2/2 + seven-width overflow smoke), focused contracts 18/18. Rerun relevant gates after any further edits.
- Runtime evidence is synthetic local. Page overflow is zero in seven widths, but Dashboard allocation tables visibly collide at 1920; four screenshots reviewed. Dark axe scan of 17 routes x 390/1366 is 0/0. Light scan has zero critical but serious contrast remains in Dashboard at 390/1366 and Reports at 1366; axe gate is NOT PASS. Keyboard traversal, touch geometry, zoom, performance timing and other data states remain pending; do not claim full-product certification.
- Four audit sources are reconciled in `docs/visual/FINAL_VISUAL_AUDIT_CONSOLIDATION.md`; final redesign input and impact backlog are in sibling `FINAL_VISUAL_REDESIGN_INPUT.md` and `V274_VISUAL_PRIORITY_BACKLOG.md`. Legacy is the redesign target; modern is preserve/test.
- Remaining release work before V274 closeout: fix/rerun light-theme Dashboard/Reports axe findings, complete applicable screen/theme/focus/touch/zoom/performance runtime evidence, review docs/diff and rerun required gates, then commit/push/open PR and verify CI/deployment on exact final SHA. No merge.

## V273 — merged baseline

- V273 PR #426 is CLOSED/MERGED. Historic tests and preview evidence remain scoped to the merged SHA in `docs/ai/PROJECT_STATE.md`; do not use as current-head V274 evidence.

## Historical V273 closeout record

- [x] Install only lockfile-pinned V273 dependencies with `npm ci --ignore-scripts`; package manifests remain unchanged.
- [x] Run general/modern suites, modern/legacy builds, `qa:all`, seven-width Reports QA, axe at 390px, and inspect final screenshots.
- [x] Review implementation and reconcile project memory/state/next-step/open-work with measured local evidence.
- [x] Audit the diff, commit and push normally, and open PR #426. CI run 690 and the Vercel preview are READY on SHA `7a5c5a02172126146dc19fd2a7d007d0f8b2a4ac`.
- [ ] Revalidate exact-head CI/preview after this documentation reconciliation; request human merge authorization only when both still match. Do not merge.

## Roadmap constraints after V272 merge

- **V272** is merged in `origin/main` at `75e77a7e98ef0768a5d4a6855b684432f09493b4` (PR #425).
- **V273** is PR #426, currently OPEN and mergeable; its readiness aggregator stays pure/read-only and consumes existing evidence only. The currently certified preview is `https://carteira-investimentos-6c0yxzvkb-paulinhoo2002-ctrls-projects.vercel.app/` for SHA `7a5c5a02172126146dc19fd2a7d007d0f8b2a4ac`.
- **TWR/XIRR** remains unavailable for real wallets while V76 history/flows lack trustworthy wallet identity; do not synthesize `walletId` or history.
- **XP/BTG parser completion** still requires legitimate sanitized broker fixtures. **MODE_B** still requires provider/business direction. Reassess candidates from current repository evidence after V273; do not treat this list as approval to start another phase.
- **Current V273 gates:** `test:modern` 815/815; `npm test` 249/249; `test:performance` 84/84; `test:qa-harness` 2/2; `build`, `build:modern`, `qa:all`, Reports responsive matrix and axe PASS. GitHub CI run 690 PASS and Vercel READY on SHA `7a5c5a02172126146dc19fd2a7d007d0f8b2a4ac`; recheck both after docs-only follow-up.

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
