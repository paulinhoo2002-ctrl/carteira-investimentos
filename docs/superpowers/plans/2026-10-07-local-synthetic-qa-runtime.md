# Local Synthetic QA Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable server-authorized local synthetic QA with an ephemeral editable mode and a strictly read-only mode, while preserving real Firebase authentication, authorization, and persistence.

**Status:** implementation and local regression matrix complete; fresh CI/Preview awaits the authorized publication.
**Evidence:** `test:local-synthetic` 26/26, strict-readonly browser 1/1, V330 20/20, legacy 255/255, modern 820/820, V84 4/4, A11Y 19/19, `qa:all`, `verify:release`, V289 13/13, both builds, and `git diff --check` pass. The Firebase Emulator and remote Preview were not part of local validation.

**Architecture:** The test-only HTTP harness injects a fixed runtime marker only when explicitly started in synthetic-QA mode and binds to loopback. The app activates the fixture only when marker, loopback hostname, and `testMode=1` all match; a second flag selects read-only and shared edit/save guards enforce it. Auth/Firestore Emulator stays on its current independent path.

**Tech Stack:** Existing Node.js HTTP server, static legacy `index.html`, node:test, and existing Playwright harness; no dependency additions.

**Spec:** `docs/superpowers/specs/2026-10-07-local-synthetic-qa-runtime-design.md`

## Global Constraints

- Firebase Auth, Firestore, authorization and real persistence remain intact.
- Synthetic mode requires server-injected runtime marker, loopback host, and `testMode=1` simultaneously.
- The marker cannot be enabled by untrusted user input or URL parameters.
- Editable synthetic session permits only ephemeral in-memory changes.
- Read-only mode blocks mutations at data boundaries, including programmatic calls.
- Preview and production never activate URL-based auth bypass.
- Do not modify production Firebase security rules.
- Preserve worktrees, branches, and PRs #454/#455.
- `REAL_WRITES=0`, `REAL_IMPORT=false`, `REAL_RESTORE=false`, `PRODUCTION=false`, `MERGE=false`.

## Review Focus

- Marker accidentally injected into Preview/production output — assert the ordinary server response omits the marker assignment and query-only activation remains false; the V332 deployment still needs exact-HEAD Preview verification.
- Read-only check happens after an in-memory handler mutates — test core action handlers and snapshot state before/after denied calls.
- Read-only `save()` returns success via the editable synthetic branch — assert `save()` rejects before that branch.
- Request-controlled host/header/query enables injection — assert only process launch option controls injection and host remains loopback.
- Emulator query combination changes — assert emulator mode remains independent and tests retain the existing two-emulator requirement.

---

### Task 1: Add an explicit loopback synthetic-QA server mode

**Files:**
- Modify: `tests/local-http-server.js`
- Modify: `tests/local-http-server.test.js`
- Modify: `package.json`

**Interfaces:**
- `startLocalHttpServer(root, port = 0, { syntheticQa = true } = {})` returns the existing `{ server, url }`; only `syntheticQa` controls runtime-marker injection for test callers.
- CLI requires `--synthetic-qa` to inject the marker; `--port` remains supported and the server binds only to `127.0.0.1`.
- Add `npm run qa:local-synthetic` to serve port `8765` with `--synthetic-qa`; existing test harness callers keep their synthetic fixture behavior.

- [x] Add server tests proving that the marker is injected in explicit synthetic-QA mode, absent when disabled, and unaffected by request query/header values.
- [x] Run `node --test tests/local-http-server.test.js` and verify all tests pass.
- [x] Implement marker injection only in the HTML response, before app bootstrap; set no-store headers for the QA HTML.
- [x] Add the port-8765 launcher script; server binds only to `127.0.0.1`.
- [x] Rerun `node --test tests/local-http-server.test.js`.

### Task 2: Gate fixture activation and enforce read-only at shared write boundaries

**Files:**
- Modify: `index.html` bootstrap and the existing `save()` / `canEditFromThisTab()` paths
- Modify: `tests/e2e-auth-mode.test.js`
- Create: `tests/local-synthetic-qa-runtime.test.js`

**Interfaces:**
- `window.__LOCAL_QA_RUNTIME__` is a fixed literal injected by the QA server, never derived from request data.
- Bootstrap sets `window.__LOCAL_TEST_MODE__` only when marker matches, hostname is `localhost` or `127.0.0.1`, and `testMode=1`.
- Bootstrap sets `window.__LOCAL_TEST_READ_ONLY__` only when synthetic mode is active and `testReadOnly=1`.
- `canEditFromThisTab(action)` denies strict-readonly before edit-lock ownership checks; `save()` denies it before the editable in-memory branch.

- [x] Add positive/negative tests for all three activation conditions, query-only production/non-loopback/marker-absent cases, readonly opt-in, and unchanged emulator mode selection.
- [x] Add tests asserting readonly programmatic actions return blocked, leave synthetic financial state unchanged, and produce no localStorage/Firebase writes; test direct `save()` rejection.
- [ ] RED-before-implementation evidence was not captured in this resumed worktree; current tests pass and protect the contract.
- [x] Change bootstrap to require the three approved signals; ensure `testMode=1` alone cannot suppress the access gate or change Firebase selection.
- [x] Add strict-readonly checks to shared edit/save boundaries; cloud hydration and V76 persistence reject synthetic runtime access.
- [x] Keep existing real Firebase config, auth flow, authorization, persistence, cloud sync, and emulator wiring unchanged.
- [ ] Firebase Emulator suite was not rerun locally; existing emulator files/configuration were not changed.

### Task 3: Expose mode clearly and verify browser/network isolation

**Files:**
- Modify: `index.html` synthetic banner
- Modify: `tests/v289-visual-regression.test.js`
- Modify or create: browser tests for local synthetic runtime, reusing existing Playwright helpers

**Interfaces:**
- Synthetic banner says `TESTE LOCAL` and `dados sintéticos em memória`; strict-readonly also says `somente leitura`.
- The read-only denial is announced in Portuguese and explains that review-mode actions are blocked.
- Browser evidence reports fixture QA separately from Firebase emulator/authenticated persistence evidence.

- [x] Add browser assertions for strict-readonly mode and denied programmatic mutation/hydration; editable marker mode is covered by V289/V330 synthetic browser tests.
- [x] Capture request and storage instrumentation; assert zero Firebase requests and zero financial storage writes in synthetic routes.
- [x] Exercise Ativos and Dividendos at `1366×768` and `390×844`; assert no page-level horizontal overflow and readable mode/status text.
- [x] Run focused browser tests with the installed local browser.
- [ ] Exact V332 Preview negative check awaits the authorized PR Preview; local query-only/non-loopback/marker-negative tests pass.

### Task 4: Update canonical QA documentation and run regression gates

**Files:**
- Modify: `docs/ai/QA_AUTH_STRATEGY.md` (canonical owner for local synthetic/auth evidence boundaries)
- Modify: `docs/ai/NEXT_STEP.md` (factual mission status only)
- Modify: `docs/ai/PROJECT_MEMORY.md` only if a concise pointer is needed; do not duplicate the contract

- [x] Document the activation conditions, both synthetic submodes, port-8765 command, emulator separation, and visual-QA-versus-real-persistence boundary.
- [x] Run focused runtime/auth tests, `npm test`, `npm run test:modern`, `npm run build`, `npm run build:modern`, `npm run qa:all`, `npm run test:visual-regression`, `npm run verify:release`, and `git diff --check`.
- [ ] Firebase Emulator suite not rerun locally; no CLI/Java validation was needed for this local runtime change.
- [x] Review the diff and verify no Firebase rules, production config, real persistence, unrelated worktrees, or PR #454/#455 were changed.
- [x] Human authorization now covers commit, normal push, and Draft PR after green gates; merge remains prohibited.

## Self-review checklist

- Spec coverage: runtime marker and launcher (Task 1); three-condition gate and readonly data boundaries (Task 2); visible/testable UX and network isolation (Task 3); canonical governance and complete regression (Task 4).
- State/API consistency: server marker name and `syntheticQa` option are defined once; browser globals and test flag are defined in Task 2 and consumed in Task 3.
- Review Focus inputs map to tests in Tasks 1–3.
- Real authentication/persistence and emulator configuration are explicit non-change constraints in Tasks 2 and 4.
- Plan is implementation-sized; it avoids new dependencies and broad file rewrites.
