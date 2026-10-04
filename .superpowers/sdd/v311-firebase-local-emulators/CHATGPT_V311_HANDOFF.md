# V313 / V311 local Firebase emulator QA — blocked verification

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

SKILLS_CONSIDERED=Superpowers systematic-debugging, verification-before-completion, Ponytail, Caveman, Firebase security review, Playwright/browser QA.
SKILLS_USED=Superpowers systematic-debugging for runner diagnosis, verification-before-completion for evidence boundaries, Ponytail full for minimum implementation, Caveman for concise reporting.
SKILLS_NOT_USED=Firebase security auditor and browser QA specialist for final certification; execution is pending the Ubuntu emulator run.
SKILL_SELECTION_REASON=Diagnose the emulator lifecycle blocker, preserve the production boundary, and move verification to a compatible runner.
SKILL_REEVALUATED=true.
SKILL_GAPS_FOUND=Local Codex Windows runner cannot initialize Firestore Emulator Java NIO; Linux Actions verification is pending.
