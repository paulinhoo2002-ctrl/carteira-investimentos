# V920B–V1000 overnight stabilization checkpoint

Updated: 2026-10-11

## V920B — PR #487 certification

- Worktree: `codex/v861-v920-long-term-reliability`; base/main at inspection: `efc9778e57f17e3778a69f4214301cacef670153`.
- Initial PR head `8b9bc3e5c75bb2cd17ad854edc9e39406664b286` was OPEN/DRAFT/MERGEABLE. CI run #906 and Vercel Preview were successful on that exact head before this follow-up.
- `npm ci` was authorized and executed only in this worktree. It succeeded; package manifest and lockfile were not intentionally changed. Production dependency audit: zero findings; full npm audit reports 7 development/transitive findings (3 moderate, 4 high), not auto-fixed.
- Root cause for the backup archive dry-run failure: the path classifier treated any sensitive keyword in a leaf filename as a credential, including descriptive security source/docs. This blocked 13 otherwise benign tracked paths. Candidate path names are intentionally not recorded.
- RED/GREEN regression now allows descriptive documentation/test names, while sensitive parent directories, explicit credential-like leaf names, key/cert extensions, `.env`, and financial local directories remain blocked. No archive was created in the failed dry run.
- Focused backup policy test: 2/2 PASS after fix. `npm run verify:release`: PASS after changes; includes Legacy 255/255, Modern 823/823, `qa:all`, V84 smoke, V289 18/18, builds and responsive/overflow browser checks. `git diff --check`: PASS before checkpoint; rerun before publication.
- Local Firebase Auth/Firestore Emulator was not rerun. Remote exact-head CI #906 had passed emulator QA on the previous head; the new code follow-up requires a new exact-head CI run.
- Current changes are limited to `package.json`, `scripts/backup/backup-security-policy.ps1`, `tests/backup-security-policy.test.js`, and this checkpoint. Commit/push are authorized by the mission; merge and production actions are not.

## V921–V1000 safe continuation

- V921–V940: audit existing backup automation and PR #485 before proposing overlap; use synthetic data only. Do not access local personal backup roots or inspect real exports.
- V941–V955: read-only audit of financial contracts; fix only proven defects with focused regression tests.
- V956–V970: measure before proposing performance changes; no cosmetic refactor.
- V971–V985: review Auth/Firestore isolation, rules, dependencies and release path without production writes or hosted multi-user claims.
- V986–V1000: consolidate only new durable findings; avoid overlapping #485/#486 documentation.
- Stop and checkpoint when environment access ends; do not describe this as continuous overnight execution unless work actually remains active.

## Safety and unresolved evidence

- `REAL_FINANCIAL_WRITES=0`; no real financial export/import/restore; no production deployment; no merge.
- Hosted authenticated multi-user isolation and persistence remain NOT_TESTED.
- Independent off-device backup and real restore remain NOT_CERTIFIED; PR #485 is open and must be reviewed for overlap rather than duplicated.
- Next action: selective diff review, fresh `git diff --check`, explicit-path stage and normal commit/push; then verify CI and Preview for the new exact SHA before continuing later audit phases.
