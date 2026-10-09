# V304 post-release hardening handoff

## Identity and release preservation

- Base branch: `origin/main` at `eb1f3c4686f1f61635939512a2c1118cb0dde908`.
- Work branch: `feature/v304-post-release-hardening`.
- Production release V1.3.0 remains READY; RC tag `v1.3.0-rc1` and release history are unchanged.
- No push, PR, merge, deploy, Firebase production configuration change, or real financial write occurred.

## Debt outcomes

- Phase-198 was documentation drift: removed the stale duplicate state preamble from the roadmap and refreshed current phase assertions to Phase 214. `2/2 PASS`.
- Phase-206 was a VM harness extraction gap plus an obsolete assertion against retired dashboard panels. The harness now evaluates the production `assetCurrentValue` helper and current compact Dashboard contract. `5/5 PASS`; no financial calculation changed.
- `setRentPrimarySemantic` had no references, property lookup, event-handler use, or other dynamic access; only its definition existed. Removed that definition; Rentabilidade neighbors pass.
- The V289 visual regression suite now has `npm run test:visual-regression` and a dedicated CI job after Chromium resolution. The runtime asserts local-only synthetic mode, Firebase stays uninitialized/uncontacted, and financial `civ5` state is unchanged.
- `npm run verify:release` composes legacy, modern, QA, and visual gates. The CDN/SRI-dependent `npm run test:import-xlsx` remains a separate manual/network gate and passed `2/2` with synthetic workbook bytes.

## QA authentication ruling

- `AUTH_PROVIDER=Firebase Authentication with Google sign-in` on the normal production path. Firebase SDK local persistence is used for an established session; no credentials or tokens are copied into the application store.
- `ENVIRONMENT_SEPARATION=localhost/127.0.0.1 plus explicit testMode flag uses deterministic in-memory synthetic state and returns before Firebase initialization. Normal production host retains Firebase auth/access gate.`
- No Auth Emulator config, isolated QA Firebase project, or dedicated synthetic account was found in repository config.
- Preview deployments were not found to have an isolated Firebase configuration and must not be treated as safe synthetic auth targets.
- `SAFE_QA_AUTH_PATH=localhost synthetic route-composition fixture only; it is not provider-authenticated.`
- Production auth bypass created: `false`. No Firebase resources or Vercel settings changed.
- `HUMAN_ACTION_REQUIRED=true`: provision or designate an isolated synthetic QA Firebase project/account and its approved local/preview configuration before claiming provider-authenticated route smoke. Do not put credentials in Git or chat.
- Evidence classes remain separate: production public deployment/login/build check; local synthetic route composition; optional manual real-user acceptance with consent and read-only discipline.

## Verification

- Phase-198: `2/2 PASS`.
- Phase-206: `5/5 PASS`.
- Focused Dashboard/Metas/Rentabilidade/Auth contracts: `41/41 PASS`.
- V289 browser visual regression: `4/4 PASS` at 390x844 and 1366x768 dark/light, representative extra widths, axe, and reduced motion.
- XLSX production integration: `2/2 PASS`, synthetic bytes only.
- `npm test`: `252/252 PASS`.
- `npm run test:modern`: `815/815 PASS`.
- `npm run build`: `PASS`.
- `npm run build:modern`: `PASS` (existing Vite warnings remain).
- `npm run qa:all`: `PASS`, seven viewport smoke with no overflow, console/page/request errors.
- `npm run verify:release`: `PASS` including all above local/offline gates and the visual matrix; XLSX remains separate.
- `git diff --check`: `PASS` before the documentation checkpoint.

## Safety and process

- `FINANCIAL_LOGIC_CHANGED=false`; `PERSISTENCE_CHANGED=false`; `FIREBASE_PRODUCTION_CHANGED=false`; `IMPORT_AUTHORITY_CHANGED=false`.
- `REAL_DATA_USED=false`; `LOCAL_IMPORTS_CONTENT_ACCESSED=false`.
- Local synthetic smoke financial state remained unchanged; no tax/import mutation action was invoked and no Firebase endpoint was contacted. It may write only synthetic local QA metadata keys `civ5_edit_lock` and `v258-monitoring-baseline-v1:QA_*`; never report these as financial persistence.
- Known Vite CJS/external-script/readonly-contract build warnings and Node module-type warnings remain warnings, not failures.
- `npm ci` used the existing lockfile without manifest edits; npm reported 6 audit findings (3 moderate, 3 high). No audit fix or dependency update was run.
- Ponytail review: no extra dependency or parser/auth abstraction. One dedicated visual job was added as requested; no production-only auth hook was added. The removed dead function is the only deletion.

## Skills and review preparation

- `SKILLS_CONSIDERED=Superpowers, Ponytail, Caveman`.
- `SKILLS_USED=Superpowers systematic-debugging, test-driven-development, verification-before-completion; Ponytail review discipline; Caveman`.
- `SKILLS_NOT_USED=Firebase security rules auditor (no rules change); browser cloud/auth profile (not authorized/available); release/deploy skill (no remote operation)`.
- `SKILL_SELECTION_REASON=local test/harness correction, synthetic route CI, and auth boundary documentation`.
- `SKILL_REEVALUATED=false`; `SKILL_GAPS_FOUND=none`.
- Independent review package: this handoff, focused diffs, fresh test outputs, auth boundary tests, and CI/package changes. Any reviewer must be read-only.

## Files changed

- Product: `index.html` only for proven dead-code removal.
- Tests: phase-198, phase-206, and V289 visual regression contracts.
- Tooling: `package.json`, `.github/workflows/ci.yml`.
- Documentation: phase roadmap, AI index, testing/release strategy, QA auth strategy, project state, next step, project memory, and this handoff.

## Local checkpoints

- Phase-198 documentation/test reconciliation: `c19708449b3343e10532e0ca673d88036fdff537`.
- Phase-206 goals harness repair: `bf700099128de878d904599f2f9be8dd8493f714`.
- Proven unused Rentabilidade helper removal: `41c0e4f47311e823991979a911672722485ceee0`.
- Visual regression guards and package scripts: `0d6a738092be77ec4303751e72f385aec544a042`.
- Dedicated CI job for the visual matrix: `64578cad582791c1f306c946b54ff44503e3067d`.

WAVE_G_RELEASE_PRESERVED=true
PRODUCTION_AUTH_BYPASS_CREATED=false
PUSH=false
PR=false
MERGE=false
DEPLOY=false
