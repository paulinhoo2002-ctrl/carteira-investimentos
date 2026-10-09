# V394_V399_OVERNIGHT_CHECKPOINT.md
# Checkpoint for mission V394-V399 (Overnight Final Hardening)
# Updated: 2026-10-09

## V394 — Firebase Emulator Safe Lifecycle
STATUS: BLOCKED_ENVIRONMENT
CAUSE: Recurring port conflicts (8080, 9099, 4400, 4500) due to Firebase emulator processes not terminating cleanly after test execution. Requires manual cleanup of ports before each test cycle.
EVIDENCE: Scripts `scripts/cleanup-firebase-safe.sh` and `scripts/cleanup-ports.sh` created to address the issue, but automated cycles still fail due to timing or residual processes.
FILES_CHANGED:
- scripts/cleanup-firebase-safe.sh
- scripts/cleanup-ports.sh
- docs/ai/V389B_FIREBASE_SAFE_LIFECYCLE.md
PR_CREATED: No (only test-support scripts added)
NEXT_STEP: Proceed to V395 (QA Multinavegador) as authorized, preserving the scripts and logs for future reference.

## V395 — QA Multinavegador
STATUS: NOT_STARTED
PLAN: Execute real QA for Firefox and WebKit when available, using the approved test environment. Continue with Chrome QA as baseline.
NEXT_STEP: Check availability of Firefox and WebKit via Playwright installed binaries, then run QA smoke tests for each.

## V396 — Backup e Recuperação
STATUS: NOT_STARTED
PLAN: Validate backup and restore using synthetic data in the approved directory `C:\Projetos\_backups\carteira-investimentos`.
NEXT_STEP: Verify directory existence and permissions, then run backup/test suites.

## V397 — Correção do Alerta de Taxas
STATUS: NOT_STARTED
PLAN: Reproduce the issue of missing real-time alert for invalid fees in the sell preview, create a RED/GREEN test, implement fix, preserve financial invariants.
NEXT_STEP: Locate the relevant code in the preview de venda flow and create a test fixture.

## V398 — Regressão Financeira e Geral
STATUS: NOT_STARTED
PLAN: Execute the full test suite: npm test, npm run test:modern, npm run verify:release, npm run qa:all, V289 visual regression, financial tests, Auth/Firestore emulator QA, backup/restore QA.
NEXT_STEP: Ensure environment is ready (emulators cleaned up) and run the batteries.

## V399 — Certificação e Preparação para Release
STATUS: NOT_STARTED
PLAN: Prepare executive report, test matrices, security and financial results, browser matrix, Firebase and backup results, pending issues, risks, production checklist, rollback plan, and GO/NO_GO decision.
NEXT_STEP: Consolidate results from V395-V398 and update governance documents.

## Global Status
PROJECT_IDENTITY_GATE: PASS (workspace main cbd9dda, LEGACY validated)
HERMES_MODEL_USED: z-ai/glm-5.3-flash (for automation and UI/test)
CODEX_MODEL_RECOMMENDADO: Not used in this checkpoint
TOKEN_STRATEGY: Reuse of existing test suites; economic model usage for routine tasks
SKILLS_USED: SUPERPOWERS, PONYTAIL FULL, CAVEMAN, test-driven-development, verification-before-completion
START_HEAD: cbd9dda
FINAL_HEAD: cbd9dda (as of this checkpoint)
WORKTREE: v394-v399-overnight
BRANCH: codex/v394-v399-overnight
BLOCKER: Firebase emulator port conflicts (V394) — mitigated by proceeding to other phases as authorized
MAJOR: 0
MINOR: 1 (herdado: alerta de taxas inválidas em tempo real no preview de venda)
DEFERRED: Firebase emulator stability (V394) — blocked by environment, not code
GO_NO_GO: CONDITIONAL_GO (pending completion of V395-V399 and resolution of blocker)
PRODUCTION_READY: false
LESSONS_LEARNED:
  1. Firebase emulator tests require explicit port cleanup before each run due to lingering processes.
  2. The test environment must be isolated to avoid cross-contamination of emulator instances.
  3. Automation of emulator lifecycle is fragile; manual verification of port availability is necessary.
NEXT_HUMAN_GATE: Review of this checkpoint and authorization to proceed with V395-V399.
NEXT_STEP: Begin V395 by checking Firefox/WebKit availability and running QA smoke tests.
