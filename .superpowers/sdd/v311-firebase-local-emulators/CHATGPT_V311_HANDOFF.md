# V311 Firebase emulator QA — initial blocked attempt, superseded by V314 certification below

- Branch: `feature/v311-firebase-local-emulators`; base HEAD `f233a77a202eed64f6086607976bc8c4274362d3`. No commit, push, PR, merge or deploy in this attempt.
- The default `.firebaserc` still targets the existing production project. `firebase.json` has the same normalized Git blob as HEAD; the QA-only emulator config is `firebase.qa-emulator.json` and explicitly uses `demo-carteira-qa-emulator` in the package script. Production `firestore.rules` was not changed; QA rules are separate under `tests/fixtures/`.
- `npm run test:auth-emulator` did not reach tests. Port 8080 was occupied by a Java process belonging to another Windows session; it was not stopped. A controlled temporary port change confirmed the next blocker: Firestore Emulator v1.22.0 exits before startup. Running its JAR directly with installed Java 26 and Java 21 both failed in `WEPollSelectorImpl` with `java.io.IOException: Unable to establish loopback connection` caused by `java.net.SocketException: Invalid argument: connect`. Normalizing `TEMP` for the process did not change this. The temporary port change was reverted. No unrelated process was terminated.
- Current test files contain five Auth/browser tests and two Firestore security tests. Syntax checks for both files and `git diff --check` passed. Behavioral tests, route matrix, network and write counters, full regression, independent review and certification remain **unverified**. Do not report them as passing.
- `playwright-core` already existed at HEAD; this attempt added no dependency. No real credentials, real financial data or `local-imports` content were accessed. No production Firebase data request was initiated by a browser in this attempt because the emulator suite never started.
- Next: run the V311 gate in an ordinary host PowerShell or a known working Linux CI runner that can initialize Java NIO selectors, while keeping the demo project and QA rules isolated. Then root-cause any Auth/browser or Firestore failures from the fresh test output. Do not commit or certify until all mandatory gates and independent security review pass.

SKILLS_CONSIDERED=Superpowers systematic-debugging, verification-before-completion, Ponytail, Caveman, browser QA.
SKILLS_USED=Superpowers systematic-debugging for root cause, verification-before-completion for claims, Ponytail full for minimum changes, Caveman for concise reporting.
SKILLS_NOT_USED=Browser QA specialist because the emulator suite stopped before browser launch.
SKILL_SELECTION_REASON=Debug startup and preserve the security boundary before browser tests.
SKILL_REEVALUATED=true.
SKILL_GAPS_FOUND=No verified execution path from this Codex Windows runner for Firestore Emulator Java NIO selector.

V311_LAYER3_CERTIFIED=false

## V314 Linux runner checkpoint

- The Windows Codex runner reproduced the previously observed Java NIO loopback failure; no further Java-version retries were made in that runner.
- Docker is unavailable and WSL has no installed distribution. The authorized fallback is GitHub Actions Ubuntu.
- Added an Auth + Firestore emulator job to the already-active `.github/workflows/ci.yml` so the PR event can execute it. The job uses Java 21, pinned Firebase CLI `15.32.1`, Chromium and the explicit `demo-carteira-qa-emulator` package script. It has read-only repository permissions and no production secrets or deploy steps.
- Removed the temporary standalone workflow because it was newly introduced and would not reliably trigger before merging. No merge is authorized.
- Both emulator test files pass `node --check`; `npm run build` and staged/working `git diff --check` pass locally. Authenticated emulator behavior, network isolation, Firestore denial assertions and the route matrix remain unverified until the Ubuntu job runs.
- No production Firebase config or rules were staged. `firebase.json` has no content delta from HEAD and remains unstaged due to the Windows working-tree line-ending/stat report.
- This commit is a verification checkpoint only, not Layer 3 certification. Do not set `LAYER3_OPERATIONAL=true` until fresh emulator tests and required regression gates pass, followed by independent security review.

### First Ubuntu Actions run

- GitHub Actions run `37208106179` successfully started Auth and Firestore emulators under `demo-carteira-qa-emulator`; the emulator suite executed all seven tests and shut both emulators down.
- Five tests passed. Two test defects were found: route smoke waited on nonexistent `FB.tab` rather than the current `S.tab`, and the non-loopback auth guard assertion ran before the Firebase auth state finished resolving.
- The current change corrects those assertions and makes the non-loopback test also require zero observed production Firebase data requests. Fresh focused emulator and full CI reruns are pending; do not treat the first run as a product regression or as certification.
- The next Ubuntu run passed the emulator pair and six of seven tests. Its remaining failure was Playwright correctly reporting that Firebase's injected `.firebase-emulator-warning` banner intercepted the mobile navigation tap. The smoke now asserts that this SDK-owned banner is present, then removes only that emulator notice before real route navigation; product UI and route controls remain under test.
- A later run passed six tests including the authenticated route matrix, Firestore guards, and non-loopback negative case; the only failure was one browser console 404. The harness now fulfills Chromium's automatic local `/favicon.ico` request with 204 and records HTTP error URLs/statuses so any other failed resource remains visible and failing.
- The next run isolated the remaining 404 to `modern/dist/assets/v262-legacy-diagnostics.js`: the new CI job had a clean workspace but did not build modern assets before serving the app. Added `npm run build:modern` to the emulator job before Firebase setup; rerun is pending.
- Added one explicit negative test for unavailable Auth and Firestore emulator endpoints. It asserts both operations fail closed under the demo project with zero Firebase production data requests; fresh Actions verification is pending.
- Security review of the current production persistence path confirmed `users/{uid}` contains wallet state. Tightened the QA-only Firestore fixture to allow owner reads but deny all user-document writes, and added a 403 assertion alongside access-control and portfolio write denials. Fresh Actions verification is pending.

SKILLS_CONSIDERED=Superpowers systematic-debugging, verification-before-completion, Ponytail, Caveman, Firebase security review, Playwright/browser QA.
SKILLS_USED=Superpowers systematic-debugging for runner diagnosis, verification-before-completion for evidence boundaries, Ponytail full for minimum implementation, Caveman for concise reporting.
SKILLS_NOT_USED=Firebase security auditor and browser QA specialist for final certification; execution is pending the Ubuntu emulator run.
SKILL_SELECTION_REASON=Diagnose the emulator lifecycle blocker, preserve the production boundary, and move verification to a compatible runner.
SKILL_REEVALUATED=true.
SKILL_GAPS_FOUND=Local Codex Windows runner cannot initialize Firestore Emulator Java NIO; Linux Actions verification is pending.

## V314 final Layer 3 certification — supersedes pending checkpoints above

CERTIFICATION_HEAD=fdb8e6661f710412ff0a1c879c29e9c3ff976e74
BRANCH=feature/v311-firebase-local-emulators
PR=439
PR_URL=https://github.com/paulinhoo2002-ctrl/carteira-investimentos/pull/439

### Result

LAYER3_OPERATIONAL=true
AUTH_EMULATOR_IMPLEMENTED=true
FIRESTORE_EMULATOR_IMPLEMENTED=true
AUTH_AND_FIRESTORE_PAIRED=true
EMULATOR_PROJECT=demo-carteira-qa-emulator
AUTH_STATE_AUTHENTICATED=true
REAL_CREDENTIAL_USED=false
GOOGLE_PROVIDER_REAL_AUTH_USED=false
PROVIDER_AUTHENTICATED_PREVIEW=DEFERRED

GitHub Actions Ubuntu run `37210892063` passed all three jobs at this HEAD. The Auth + Firestore job ran 8/8 tests with no skips. It used the actual Firebase Auth SDK emulator session and Firestore emulator, and exercised Dashboard, Ativos, Dividendos, Renda Fixa and Confiabilidade at 390x844 and 1366x768. The suite confirmed authenticated state, no login loop, zero production Firebase requests across Firestore, Identity Toolkit, Storage, Realtime Database, Secure Token and Firebase Installations endpoints, zero accepted financial/import/tax writes, no horizontal overflow, and no clipping inside visible content containers. Controls inside closed disclosures are excluded from clipping measurement because they are not visible; horizontal viewport clipping is checked separately.

Negative tests passed: partial emulator flags fail closed; unavailable emulator endpoints do not fall back to production; localhost query flags on a non-loopback origin do not bypass auth; the malformed Firebase SDK session key is consumed and remains unauthenticated; emulator Auth and Firestore are paired; the demo identity cannot write access policy, `users/{uid}` wallet state or `portfolios/{uid}`. The only Firestore seed is synthetic emulator-only access metadata; denied write attempts are assertions, not accepted writes.

### Fresh gates at certification HEAD

- `npm run verify:release` — PASS, exit 0. This ran `npm test` (252/252), `test:modern` (815/815), `qa:all` (PASS; viewport smoke reported zero overflow, console, page and relevant request errors), and visual regression (4/4).
- `npm run test:import-xlsx` — PASS, 2/2, synthetic workbook only; real production SheetJS CDN path exercised.
- `npm run build` — PASS.
- `npm run build:modern` — PASS through `verify:release` and CI.
- `git diff --check` — PASS.
- GitHub Actions Build and test, V289 visual regression, and Auth and Firestore emulator QA — all SUCCESS; emulator suite 8/8.

The Windows Codex sandbox once returned EPERM while Vite cleared `modern/dist`. Re-running the full release command through the authorized host PowerShell path passed. The Firestore Java NIO selector problem on the Windows Codex runner was avoided by the dedicated Ubuntu Actions job; no more Java-version retry was needed.

### Security and data boundaries

PRODUCTION_AUTH_BYPASS_CREATED=false
PRODUCTION_AUTH_GUARD_CHANGED=false
PRODUCTION_FIREBASE_CONFIG_CHANGED=false
PRODUCTION_FIRESTORE_RULES_CHANGED=false
PRODUCTION_SECRETS_USED=false
HARDCODED_SECRET_FOUND=false
FINANCIAL_LOGIC_CHANGED=false
PERSISTENCE_SEMANTICS_CHANGED=false
IMPORT_AUTHORITY_CHANGED=false
REAL_DATA_USED=false
LOCAL_IMPORTS_CONTENT_ACCESSED=false
FIREBASE_EXTERNAL_RESOURCES_CREATED=false
VERCEL_ENV_CHANGED=false
DEPLOY_SIDE_EFFECT=false

QA Firestore rules remain in `tests/fixtures/v311-firestore.rules`; production `firestore.rules` is unchanged. Normal `.firebaserc` selection remains unchanged. `firebase.json` has no content delta: its normalized working-tree blob equals `HEAD:firebase.json` and `git diff --exit-code -- firebase.json` succeeds, although Windows Git continues to report `M firebase.json` with `needs update` after index refresh. It was not staged. Treat this as a worktree metadata/line-ending anomaly, not a content change; do not restore or stage it without fresh evidence.

### Review and skills

INDEPENDENT_REVIEWER=Codex GPT-6 Sol Medium, fresh-context fallback
NVIDIA_MODEL_USED=false; GLM-5.3/Nemotron integration was unavailable in this runtime
INDEPENDENT_REVIEW=BLOCKER 0 / MAJOR 0 / MINOR 0 / DEFERRED 1
DEFERRED=provider-authenticated Google QA requires an isolated Firebase QA project/account and Preview configuration; no external resources were provisioned.
PONYTAIL_REVIEW=completed; no unnecessary dependency or abstraction found; `playwright-core` already existed.

SKILLS_CONSIDERED=Superpowers systematic-debugging, verification-before-completion, executing-plans; Ponytail; Caveman; Firebase security rules audit; Playwright/browser QA; Windows Git workflow.
SKILLS_USED=systematic-debugging isolated runner/test failures before fixes; verification-before-completion governed claims and final gates; executing-plans sequenced the authorized mission; Ponytail constrained changes to the smallest test/config/doc corrections; Firebase security review checked demo rules and denied writes; Playwright/browser QA validated authenticated routes; Caveman kept reporting concise.
SKILLS_NOT_USED=GLM-5.3/Nemotron independent review (provider unavailable); Codex Sol fresh-context review was used as fallback.
SKILL_SELECTION_REASON=This mission crosses Firebase Auth/Firestore isolation, browser route behavior, test runners and release verification.
SKILL_REEVALUATED=true after runner failures, reviewer findings and scope of the clipping assertions changed.
SKILL_GAPS_FOUND=NVIDIA reviewer provider unavailable; Windows sandbox cannot start the Firestore emulator; both gaps were handled with fresh-context review and Ubuntu Actions.

### Commits on the feature branch

- `63ea1c1` test(auth): checkpoint emulator harness for Linux CI
- `63f4633` test(auth): fix emulator route smoke state checks
- `d7f02ac` test(auth): clear emulator notice before route interaction
- `c48cf9d` test(auth): isolate browser favicon noise
- `3a41be0` ci(auth): build modern assets for emulator smoke
- `565dc46` test(auth): verify emulator outage fails closed
- `3f871fc` test(auth): deny wallet writes in emulator rules
- `5990950` test(auth): prove invalid emulator session is consumed
- `4c7891b` test(auth): report clipped control geometry
- `4920c3d` test(auth): ignore viewport fold in clipping audit
- `2590ab1` test(auth): skip collapsed disclosure controls
- `4c927d0` test(auth): detect horizontal root clipping
- `fdb8e66` test(auth): scope clipping to visible controls

No product-code change was required in V314. The only final uncommitted path is the unchanged-content `firebase.json` Windows line-ending/stat report above; it remains unstaged. Documentation checkpoint is committed separately. Pushes were limited to the feature branch; PR #439 remains open for human review. No merge, deploy, Firebase provisioning or Vercel environment change occurred.
