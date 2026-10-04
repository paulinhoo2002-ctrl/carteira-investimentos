# V310 — model routing and isolated Firebase QA architecture

## Identity and scope

- `BASE_MAIN=033ebbafca6b8904f0a65f241a48cba73e89bf09`
- `BRANCH=feature/v310-isolated-firebase-qa-auth`
- `RC_TAG=v1.3.0-rc1`, unchanged at `399e120d83bfc81d58e613adb79fe6f27bf47cfe`
- `MODEL_SKILLS_ROUTING_PERSISTED=true`: `AGENTS.md`, `docs/ai/SKILLS_ROUTING.md`, the legacy bridge `docs/SKILLS_ROUTING.md`, and the Skills manifest agree on Superpowers → Ponytail → Caveman, Codex Luna as implementation default, Codex Sol escalation, Hermes GLM-5.3 independent review and mandatory Skill reporting.
- `QA_AUTH_ARCHITECTURE_PERSISTED=true`: `docs/ai/QA_AUTH_STRATEGY.md` owns the four distinct QA layers, threat controls and human gate.
- `V309_LOCAL_DOC_COMMIT_FOUND=0a0121922fd3cf6f06264bc56f913a19f50f8de2`; the related unpushed governance commit is `130c6003dc99b1990f3e29206435bc2132af5e73`. Their still-valid post-merge facts and routing intent were reconciled against current `origin/main`; no blind cherry-pick or stale HEAD reference was used. Both source commits remain on their local branch.

## Authentication architecture and decision

- `AUTH_PROVIDER=Firebase Authentication`, Google popup through compat SDK 10.12.5.
- `AUTH_STATE_LISTENER=FB.auth.onAuthStateChanged` in `index.html`; access control reads Firestore `meta/access` and records a login attempt before cloud sync.
- `SESSION_LIFETIME=Firebase LOCAL persistence when available`; expiry remains under Firebase SDK/provider control.
- `FIREBASE_CONFIG_SOURCE=static inline production client config in index.html`.
- `ENVIRONMENT_CONFIG_SOURCE=none for legacy Preview`; Vercel environment variables are not consumed by the current static page.
- `TEST_MODE_BOUNDARY=localhost/127.0.0.1 plus explicit testMode=1`; it returns before Firebase initialization and uses synthetic in-memory route state.
- `EXISTING_FIREBASE_AUTH_EMULATOR=false in repository/runtime`; `EXISTING_QA_FIREBASE_PROJECT`, `EXISTING_PREVIEW_FIREBASE_PROJECT`, and `EXISTING_SYNTHETIC_PROVIDER_ACCOUNT=not found in repository` (external resources were not inspected).
- `RECOMMENDED_LOCAL_ARCHITECTURE=Firebase Auth + Firestore emulators under a demo- project, both connected before use, ephemeral synthetic access-control fixture, fail closed on mismatch or production contact`.
- `RECOMMENDED_PREVIEW_ARCHITECTURE=separate Firebase QA Auth and Firestore, explicit Preview-only config selected by a reviewed fail-closed build path; production config unchanged`.
- `AUTH_EMULATOR_IMPLEMENTED=false`; `PACKAGE_SCRIPT=none`; `CI_WIRED=false`. Firebase CLI and local Firebase SDK dependency are absent. The static production config plus Firestore access-control/write path make an Auth-only attachment unsafe. No production auth hook or dependency was added to manufacture coverage.
- `PROVIDER_AUTHENTICATED_PREVIEW_IMPLEMENTED=false`; `HUMAN_ACTION_REQUIRED=true`: approve/provision separate QA Firebase project and synthetic Google identity, configure QA-only authorized Preview domain and Preview-only config after reviewed code support. No credential should be pasted into chat.
- `PRODUCTION_AUTH_BYPASS_CREATED=false`; `PRODUCTION_ARCHITECTURE_CHANGED=false`; `PRODUCTION_FIREBASE_CONTACTED=false` during local synthetic visual smoke.

## Evidence and limits

- Focused auth/offline contracts: `16/16 PASS`.
- Reliability smokes: `61/61 PASS` (same eight CI-stage commands).
- Legacy: `252/252 PASS`; modern: `815/815 PASS`.
- `qa:all=PASS`; visual regression `4/4 PASS`; `verify:release=PASS`; synthetic production-XLSX gate `2/2 PASS`; `git diff --check=PASS`.
- Existing visual matrix visits Dashboard, Ativos, Dividendos, Renda Fixa and Confiabilidade at 390x844 and 1366x768; synthetic local Firebase contact and financial-storage writes are blocked. This is **not** Auth Emulator or Google-provider proof.
- `AUTH_NEGATIVE_TESTS`: current local `testMode` host/flag guard is covered by existing contracts. Emulator-specific production-origin rejection, missing-QA-config fail-closed, invalid emulator session, and production-data isolation remain `NOT_RUN` because the emulator path was not implemented.
- `FINANCIAL_WRITE_COUNT=0`, `IMPORT_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` in the exercised synthetic smoke; no real financial data or `local-imports` content was used.
- `HARDCODED_SECRET_FOUND=false in V310 diff`; `PRODUCTION_AUTH_BYPASS_FOUND=false`; no product code, test, CI, persistence, import-authority or Firebase production configuration change.

## Review and commits

- Ponytail review: no new dependency, wrapper, auth abstraction or production-only test hook; `DELETE_LIST=none`, `CHANGES_APPLIED=none`.
- Independent reviewer: `Hermes z-ai/glm-5.3 via NVIDIA`, read-only. Initial routing-document minors were reconciled. Final response: `BLOCKER=0`, `MAJOR=0`, `MINOR=0`, architecture safe to commit. The final CLI invocation emitted its complete verdict but returned process code 1, so treat the text as a reviewer opinion alongside the fresh local evidence, not as a passed automated gate.
- `GOVERNANCE_COMMIT=8b03dee` (`docs(ai): persist model and skills routing policy`).
- `QA_ARCHITECTURE_COMMIT=5b66800` (`docs(ai): define isolated Firebase QA auth boundary`).
- `PUSH=false`, `PR=false`, `MERGE=false`, `DEPLOY=false`; no external Firebase resource or Vercel environment change.

## Skill routing used

- `SKILLS_CONSIDERED=Superpowers, Ponytail, Caveman, firebase-security-rules-auditor, browser-harness`.
- `SKILLS_USED=Superpowers execution/verification/review discipline; Ponytail minimality review; Caveman concise reporting`.
- `SKILLS_NOT_USED=firebase-security-rules-auditor (no rules change), browser-harness (existing browser suite supplied route evidence)`.
- `SKILL_SELECTION_REASON=security architecture plus documentation governance; minimum useful set without production/auth modifications`.
- `SKILL_REEVALUATED=true` when the mission moved from governance to Firebase architecture and independent review.
- `SKILL_GAPS_FOUND=Firebase CLI/emulators not installed or configured; provider-authenticated QA project/account absent from repository evidence`.

## Next action

In a separate reviewed mission, implement the demo-project Auth **and** Firestore emulator harness and the negative isolation tests. A true Google-provider Preview smoke remains human-gated by isolated QA project/account provisioning. Do not equate either with the existing in-memory testMode fixture.
