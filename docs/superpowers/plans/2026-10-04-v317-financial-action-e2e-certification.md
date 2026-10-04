# V317 — Financial Action End-to-End Certification

## Goal

Certify the currently reachable legacy financial actions named by V282-01 using synthetic fixtures only. Preserve all financial semantics, persistence/schema, `finance-core.js`, and `persistence-core.js`. Do not perform real financial writes, use private data, modify V316 PR #440 or parked PR #441, or merge.

## Acceptance contract

For each in-scope action, record its entry point, precondition, confirmation/cancel path, observable result, persistence and reload behavior, repeat behavior, and failure behavior. A behavior is certified only when current runtime behavior and a test/browser observation support it. Actions that require real accounts, provider credentials, product policy, or unavailable dependency installation remain explicitly deferred.

## Execution

1. Inventory repository contracts, current runtime handlers, existing tests, and browser harness capabilities. Record actions as in-scope, already covered, gap, or deferred.
2. Select a minimal synthetic fixture and isolated runtime strategy; establish that no real financial data or external financial write can be reached.
3. For any concrete missing behavior, write a focused test first, observe the expected failure, then make the smallest safe change without changing financial semantics. If no safe patch is needed, keep this as a certification-only change.
4. Exercise covered financial actions end-to-end in the isolated browser where supported; verify observable state, reload, cancel, duplicate, and save failure. Do not infer runtime reachability from source-only guards.
5. Run focused tests, required repository validation, visual/browser checks for affected flows, and inspect the complete diff. Record unavailable gates without treating them as passes.
6. Perform Caveman and Ponytail full reviews, reconcile project memory/state/next step/backlog, and obtain an independent read-only review before certifying.
7. Commit and push only after fresh verification. Keep any resulting PR draft and stop before merge.

## Phase gates

- G1: identity and current base proven; implementation/action map complete.
- G2: isolated synthetic E2E evidence for every reachable in-scope action, with gaps classified.
- G3: regression and full required validation on the candidate SHA.
- G4: governance/docs reconciled, independent review complete, draft PR ready; human merge gate.

## Expected report

Include exact workspace/branch/HEAD/base, action-by-action coverage, files and commits, each test/build/browser result, security and financial invariants, deferred human decisions, PR and CI status, and `MERGE=false`.

## V317 execution evidence — 2026-10-04

- G1 identity verified: authorized worktree and branch above, base/initial HEAD `2966dfb197ddcde5440379f8d2d21c35cdeda183`; PR #440/#441 were not modified. `npm ci` succeeded only in the authorized worktree; package lock remained unchanged.
- G2: purchase/cancel/reload/save-failure E2E uses isolated local testMode with synthetic fixture, outbound requests blocked, no cloud/network write; failure restores financial state, quarantines session and leaves the form available. Import Center CSV E2E proves read-only review/cancel, explicit confirmation, one synthetic insertion and repeated batch with no further insertion. Contribution, goal and report browser flows and sale-validation UI also passed. `save-load-roundtrip` validates local save/load separately; browser testMode does not write persistent financial data.
- Financial action gap: sale acceptance itself and every financial action variant are not all exercised as live browser writes; existing unit/boundary tests cover sale contract, importer failure/idempotency, and quick movement save failure. Keep this limitation explicit rather than extrapolating testMode to authenticated use.
- G3: `npm run verify:release` PASS (legacy 252/252, modern 815/815, builds, QA harness/smoke and visual 4/4); focused combined browser/contract/regression matrix 195/195 PASS; V284 boundary 76/76, roundtrip 7/7; `git diff --check` PASS.
- Separate V296 XLSX browser gate attempted; both tests failed to load the exact SheetJS CDN/SRI runtime in this network-restricted environment (`BLOCKED_NETWORK`). The local CSV parser adapter/browser path passed; XLSX CDN integration remains unverified.
- Runtime change is scoped to `saveQuickMovement()` plus a persistence deferral flag on existing `syncAssetsFromAportes()`/`autoDY()` helpers: snapshot/restore and persistence-result guard before success side effects for provento, outro, renda fixa, and regular purchase/sale paths, with one save at the transaction boundary. No financial formulas/schema/core persistence engine changes.
- Docs reconciled: project memory/state/next-step/backlog. Current skills: Superpowers first, Ponytail full, Caveman full, Playwright as sole primary browser harness. Independent reviewer was not available in this task context; mark as review gap. `MODEL_RECOMMENDED=Codex GPT-6 Luna Medium`, `REVIEW_MODEL_RECOMMENDED=Hermes GLM-5.3 via NVIDIA` (availability not checked), `ESCALATION_MODEL_RECOMMENDED=Codex GPT-6 Sol Medium`; actual runtime Codex with variant undisclosed.
- Final diff/governance review and identity gate PASS. Code commit `5bf3c213b5f62ed0a98b4b33182de891127ea657` pushed; Draft PR #442 created and attached. CI run `37238415129` PASS (Build/test, Auth+Firestore emulator, V289 visual, Vercel Preview/comments).
- G4 remains a review handoff: no independent external reviewer was available in this task, and V296 SheetJS CDN browser tests are `BLOCKED_NETWORK`. Keep PR Draft; human merge gate closed (`MERGE=false`). Firebase/Google V316 remains separate and untouched.
