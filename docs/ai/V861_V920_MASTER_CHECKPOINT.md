# V861–V920 Master Checkpoint

Updated: 2026-10-10 (America/Sao_Paulo)
Mission: `V861_V920_LONG_TERM_RELIABILITY`

## Identity and preservation

- Repository: `paulinhoo2002-ctrl/carteira-investimentos`.
- Main audited: `efc9778e57f17e3778a69f4214301cacef670153`.
- Audit worktree: `codex/v861-v920-long-term-reliability`, same HEAD, clean before this documentation checkpoint.
- Canonical checkout remains on its pre-existing dirty branch; no changes were made there. PR worktrees #485 and #486 were preserved.
- `docs/ai/PERMANENT_OPERATING_CONTRACT.md` is absent from audited main; it is included by open Draft PR #486. No merge was performed.

## Phase status

| Phase | Status | Evidence / remaining gate |
|---|---|---|
| V861–V870 Governance | PARTIAL | PR #486 remains OPEN/DRAFT/MERGEABLE at `3d4456a0dda931802f567af36a0de542754b5caf`; GitHub CI run #904 SUCCESS, Vercel Preview READY, review threads 0. PR description was synchronized to this evidence. Human review/merge remains pending. |
| V871–V880 Backup and recovery | PARTIAL | PR #485 remains OPEN/DRAFT/MERGEABLE at `a64bca3b05f9cd3288560a54011bb1b3cda37ff7`; CI run #898 SUCCESS and Vercel status SUCCESS, review threads 0. App backup/restore tests passed; the separate source-code archive dry-run test fails closed on 13 credential-like path matches before archive creation. No paths were exposed. Firestore managed backup schedule list is empty. |
| V881–V890 Financial integrity | PARTIAL | `test:finance` 96/96 and `test:performance` 97/97 PASS on main SHA. No financial logic changed. Full regression not run. |
| V891–V900 Firebase and multi-user | PARTIAL | Static review confirms UID ownership checks on `/users/{uid}` and `/portfolios/{uid}`. `firestore.rules` blob is identical to SHA `c7690dfd9539e139226cb7865e7de165ab36ea2c`, where V436 documented Emulator 8/8. Emulator suite was not rerun; hosted two-user QA remains NOT_TESTED. |
| V901–V910 Release and monitoring | PARTIAL | Main SHA Vercel deployment is READY; no manual deployment. PR #484 merged as `efc9778...` has the same Git tree as its tested head and records three enabled Hermes jobs (timezone -03:00), two manual runs with `last_status=ok`, and their next scheduled times. The current automation UI did not return live details in this run, so that record is recent evidence, not a fresh status query. Firestore managed backup schedules remain empty. |
| V911–V920 Long-term maintenance | PARTIAL | Agent-independent manual checklist is in `docs/ai/LEGACY_MAINTENANCE_CHECKLIST.md`; actual automation, recovery and QA gates remain subject to fresh verification. |

## Fresh local evidence

- `npm run test:finance`: PASS 96/96.
- `npm run test:performance`: PASS 97/97.
- Backup/restore/recovery focused group: 43/44 PASS. The sole failure is the source-code archive dry-run: 13 tracked path names match the credential-like-name block rule, so it stops before archive creation. This is a tooling/path-policy review item, not evidence that financial backup restore failed. Do not weaken the check or publish candidate paths.
- `test:modern`: INCOMPLETE; React-related modules are unavailable in this worktree.
- V84 Playwright smoke: NOT TESTED; `playwright-core` is unavailable.
- Legacy static build: PASS. Full npm test, modern build, `qa:all`, `verify:release`, V84 browser and Emulator suites were not certified in this worktree.
- `npm ci` was not run. `AGENTS.md` requires explicit authorization before dependency installation.
- `git diff --check`: PASS for documentation changes.

## Backup and recovery facts

- Main provides browser-local IndexedDB snapshots and manual JSON download; an in-app periodic snapshot is opportunistic on page load and remains browser-local.
- Main does not establish an independent external copy of the portfolio. Firestore managed backup schedule query returned no configured schedules.
- Recent merged PR #484 evidence records the external Hermes monitor/verifier jobs as enabled and run successfully; it verifies a backup already placed in the approved local root, not automatic export or an independent external archive destination.
- PR #485 proposes owner-scoped backup/archive and verification improvements but is not merged; those changes are not current-main behavior.
- The latest recorded production backup-root result in PR #484 was `MISSING`; this mission did not inspect the directory, export personal data, or restore anything.

## Publication checkpoint

- PR #487 is OPEN/DRAFT/MERGEABLE, HEAD `c205fa245af9143c14eaf755ba823e9bd74e685a`, review threads 0.
- GitHub CI run #905 passed on that exact SHA: Build and test, Auth and Firestore emulator QA, and V289 visual regression.
- Vercel Preview is READY/SUCCESS on that exact SHA. No manual deployment was performed.
- PRs #485 and #486 remain OPEN/DRAFT and unchanged.
## Safety and next action

`REAL_FINANCIAL_WRITES=0`; `REAL_FINANCIAL_EXPORT=false`; `REAL_FINANCIAL_RESTORE=false`; `MANUAL_PRODUCTION_DEPLOY=false`; `MERGE=false`.

`PRODUCTION_READY=false`. Next gate: authorize `npm ci` only in this V861 worktree, then rerun modern, V84/browser, full legacy, build, QA, release and Emulator gates. Recheck active automation status through a supported read-only view and assess the source-archive path-policy blocker without exposing candidate paths.