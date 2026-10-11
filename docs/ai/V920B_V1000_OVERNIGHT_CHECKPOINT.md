# V920B–V1000 overnight stabilization checkpoint

Updated: 2026-10-11

## V920B — PR #487 certification

- Worktree: `codex/v861-v920-long-term-reliability`; base/main at inspection: `efc9778e57f17e3778a69f4214301cacef670153`.
- PR #487 remains OPEN/DRAFT/MERGEABLE on head `edf18e96c6a47ca1e2ea3e5a98639276c9fc16d0`. GitHub Actions run #907 passed all three jobs (Build and test, Auth/Firestore emulator QA, V289 visual regression); Vercel Preview is READY on that exact SHA; review threads: 0. Prior head `8b9bc3e5c75bb2cd17ad854edc9e39406664b286` also passed run #906 and Preview.
- `npm ci` was authorized and executed only in this worktree. It succeeded; package versions and lockfile stayed unchanged. `package.json` received only the test-script wiring for the new regression. Production dependency audit: zero findings; full npm audit reports 7 development/transitive findings (3 moderate, 4 high), not auto-fixed.
- Root cause for the backup archive dry-run failure: the path classifier treated any sensitive keyword in a leaf filename as a credential, including descriptive security source/docs. This caused 13 tracked path candidates to be false-positive blockers; no candidate names are recorded.
- RED/GREEN regression now allows descriptive documentation/test names, while sensitive parent directories, explicit credential-like leaf names, key/cert extensions, `.env`, and financial local directories remain blocked. No archive was created in the failed dry run.
- Focused backup policy test: 2/2 PASS after fix. `npm run verify:release`: PASS after code/test changes; includes Legacy 255/255, Modern 823/823, `qa:all`, V84 smoke, V289 18/18, builds and responsive/overflow browser checks. `git diff --check`: PASS before publication and before this documentation-only update.
- Local Firebase Auth/Firestore Emulator was not rerun. Remote exact-head CI #907 passed isolated Auth/Firestore emulator QA on the published code SHA.
- Published changes are limited to `package.json`, `scripts/backup/backup-security-policy.ps1`, `tests/backup-security-policy.test.js`, and this checkpoint. Commit: `edf18e96c6a47ca1e2ea3e5a98639276c9fc16d0` (`fix(backup): avoid false credential path blocks`). Normal push succeeded; worktree was clean after push. Merge and production actions are not authorized.

## V921–V1000 safe continuation

- V921–V940: reviewed PR #485 files and relevant patches. It adds owner-scoped IndexedDB backup archives and a read-only verifier requiring a valid application manifest and external SHA-256 sidecar; synthetic suites were reported by the PR, but PR #485 is still OPEN/DRAFT and its Modern/full-release local environment gaps remain. No overlap with this source-archive classifier change was found. No local personal backup roots or real exports were accessed. Independent off-device backup remains unproven.
- V941–V955: financial suite and V320 retry/replay CI passed; no financial logic was changed. This is regression evidence, not a complete independent audit of every financial contract.
- V956–V970: performance integration suite passed; no bottleneck was measured in this mission, so no performance changes were proposed.
- V971–V985: CI run #907 passed isolated Auth/Firestore Emulator QA. Hosted authenticated multi-user isolation, production security behavior and real-account persistence remain NOT_TESTED.
- V986–V1000: consolidate only new durable findings; avoid overlapping #485/#486 documentation.
- Stop and checkpoint when environment access ends; do not describe this as continuous overnight execution unless work actually remains active.

## Safety and unresolved evidence

- `REAL_FINANCIAL_WRITES=0`; no real financial export/import/restore; no production deployment; no merge.
- Hosted authenticated multi-user isolation and persistence remain NOT_TESTED.
- Independent off-device backup and real restore remain NOT_CERTIFIED; PR #485 is open and must be reviewed for overlap rather than duplicated.
- V986–V1000: this checkpoint is the mission-specific continuity record; no overlapping memory/state/next-step files were changed because #485/#486 own those current edits.
- Next action: continue with remaining independent legacy security/performance/financial review only if the runtime remains active; otherwise resume from this checkpoint without repeating #907's green matrix.
