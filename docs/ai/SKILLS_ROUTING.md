# Skills Routing — Carteira de Investimentos

**Canonical routing for all agents (Hermes, Codex, etc.) in this project.**

---

## GLOBAL BOOTSTRAP (MANDATORY — EVERY MISSION)

```
1. using-superpowers          → Establishes the execution workflow
2. ponytail                   → Minimum correct implementation, full safeguards
3. caveman                    → Concise communication without losing evidence
```

**Rule**: For substantial missions, load Superpowers first, then only the
additional Skills useful to the task. Discover actual runtime availability;
do not claim use of an unavailable Skill. `AGENTS.md` takes precedence.
`docs/SKILLS_ROUTING.md` is a legacy bridge to this policy;
`docs/ai/SKILL_ROUTING.md` is a specialist Skill selection table, not a
competing model policy.

## MODEL AND REVIEWER ROUTING (ALL RUNTIMES)

- `DEFAULT_IMPLEMENTATION_MODEL=Codex GPT-6 Luna Medium`: normal and large
  implementation, tests, CI, docs, local fixes, known-scope refactors, release
  execution and repository maintenance.
- `COMPLEXITY_ESCALATION_MODEL=Codex GPT-6 Sol Medium`: difficult architecture,
  protected financial conflicts, auth/security, persistence/integrity ambiguity,
  or a root cause unresolved after three reasoned attempts. Stop repeating the
  same local fix, reassess, then escalate.
- `DEFAULT_INDEPENDENT_REVIEWER=Hermes GLM-5.3 via NVIDIA` when available for
  technical, PR, root-cause, behavioral, test-quality, release and security
  review. Prefer `IMPLEMENTER != INDEPENDENT_REVIEWER`.
- Nemotron 3 Ultra 550B A55B is an optional heavy reviewer when healthy; Kimi
  K3 is an optional visual reviewer when safely available, with ChatGPT vision
  as a fallback. Do not introduce API keys for visual review or retry known
  unavailable endpoints indefinitely. If NVIDIA is unavailable, use a fresh
  context Codex GPT-6 Sol Medium for deep review and report the actual model.
- `PROJECT_MUST_NOT_DEPEND_ON_ONE_MODEL=true`. Any runtime can continue by
  reading `AGENTS.md`, `docs/ai/PROJECT_MEMORY.md`, this file and
  `docs/ai/PROJECT_SKILLS_MANIFEST.md`; repository evidence outranks chat.

Before a large mission, state `MODELO RECOMENDADO`: principal, reviewer and
escalation model, each with a reason. These are recommendations, not claims
about the model running in the current session.

## SKILL DISCOVERY AND REPORTING

For every substantial mission: read governance, discover Skills in the active
runtime, choose the minimum useful set, explain the selection, reassess when
scope changes, and report gaps. Priority is `AGENTS.md` → protected financial
semantics → Git safety/human gates → approved contracts → Superpowers →
Ponytail → Caveman → specialist Skills. No Skill overrides a higher rule.

Use Superpowers `executing-plans` for large missions,
`verification-before-completion` before completion/release/merge claims,
`receiving-code-review` for review findings, `systematic-debugging` for
unexpected failures and `finishing-a-development-branch` for PR/merge/release.
`PONYTAIL_DEFAULT_MODE=full`; prefer minimum correct code while preserving
financial invariants, validation, security/authentication/authorization,
accessibility, persistence, import confirmation, provenance, history and
behavioral tests. Use `ponytail-review` after substantial implementation;
`ponytail-audit` requires an explicit cleanup mission. Caveman keeps reports
brief without dropping safety, test, financial or blocker evidence.

Every substantial handoff records `SKILLS_CONSIDERED`, `SKILLS_USED`,
`SKILLS_NOT_USED`, `SKILL_SELECTION_REASON`, `SKILL_REEVALUATED` and
`SKILL_GAPS_FOUND`. For each used Skill, state what it controlled.

Recommended mission header: `Skill Caveman + Ponytail + Superpowers`, then
`PRIMARY_MODEL`, `REVIEW_MODEL`, `ESCALATION_MODEL`, `MODEL_SELECTION_REASON`,
`SKILLS_CONSIDERED`, `SKILLS_REQUIRED`, `MISSION`, `MODE` and
`REPOSITORY_FIRST=true`.

---

## MISSION-TYPE ROUTING TABLE

| MISSION_PATTERN | REQUIRED_SKILLS | OPTIONAL_SKILLS | FORBIDDEN_SKILLS | STOP_CONDITIONS |
|----------------|-----------------|-----------------|------------------|-----------------|
| **FINANCIAL_TRUTH**<br>historical returns, benchmarks, quotes, proventos, portfolio valuation, financial reports, imports, tax-sensitive logic | caveman<br>using-superpowers<br>doubt-driven-development<br>source-driven-development<br>systematic-debugging<br>test-driven-development<br>verification-before-completion<br>caveman-review<br>caveman-commit | cavecrew (if genuinely independent workstreams) | ui-ux-pro-max<br>frontend-design<br>interface-design<br>design-system<br>ui-styling<br>impeccable<br>banner-design<br>brand<br>slides<br>interview-me | UNKNOWN != ZERO<br>PARTIAL != COMPLETE<br>STALE != FRESH<br>ESTIMATE != RECEIVED<br>CURRENT_PRICE != HISTORICAL_PRICE<br>FINANCIAL_AS_OF != SOURCE_AS_OF |
| **BUG_FIX**<br>any bug, test failure, unexpected behavior | caveman<br>using-superpowers<br>doubt-driven-development<br>systematic-debugging<br>test-driven-development<br>verification-before-completion | source-driven-development (if external data/API)<br>cavecrew (if independent) | ui-ux-pro-max<br>frontend-design<br>banner-design<br>brand<br>slides | Root cause identified<br>Test RED→GREEN confirmed<br>Verification gates pass |
| **IMPORT_PIPELINE**<br>B3, Inter, XP, BTG imports, validation, preview, deduplication, confirmation | caveman<br>using-superpowers<br>doubt-driven-development<br>source-driven-development<br>test-driven-development<br>verification-before-completion<br>caveman-review<br>caveman-commit | systematic-debugging (if issues)<br>cavecrew (if independent parsers) | ui-ux-pro-max<br>frontend-design<br>interface-design<br>design-system<br>ui-styling<br>impeccable<br>banner-design<br>brand<br>slides | No fabricated data<br>Preview before write<br>Confirmation gate<br>Deduplication verified |
| **BROWSER_QA**<br>browser validation, responsive QA, console/network issues, interaction regression | caveman<br>using-superpowers<br>browser-harness-main | browser-testing-with-devtools (if DevTools MCP needed)<br>playwright (if CLI automation preferred) | ui-ux-pro-max<br>frontend-design<br>interface-design<br>design-system<br>ui-styling<br>impeccable<br>banner-design<br>brand<br>slides<br>interview-me | Don't run all 3 browser skills redundantly<br>Select ONE primary<br>Clean console (0 errors)<br>Viewports: 390, 430, 768, 1366, 1440, 1536, 1920 |
| **UI_VISUAL**<br>only when VISUAL_PHASE=AUTHORIZED<br>visual redesign, new UI direction, brand-aligned visuals | caveman<br>using-superpowers<br>interface-design | frontend-design (if new aesthetic direction)<br>design-system (if token work)<br>ui-ux-pro-max (if heavy design system gen)<br>ui-styling (if React/Tailwind impl)<br>impeccable (final polish)<br>browser-harness-main (verification) | banner-design<br>brand (unless brand work)<br>slides<br>interview-me | VISUAL_PHASE must be AUTHORIZED<br>VISUAL_CANON_V2 must be active<br>No financial logic changes |
| **CODE_REVIEW**<br>pre-PR, release review, receiving external review | caveman<br>using-superpowers<br>caveman-review<br>impeccable<br>verification-before-completion<br>requesting-code-review | interface-design (if UI changes)<br>browser-harness-main (if UI)<br>doubt-driven-development (if financial)<br>source-driven-development (if financial) | frontend-design<br>ui-ux-pro-max<br>banner-design<br>brand<br>slides<br>interview-me | All verification gates pass<br>No MISLEADING_FINANCIAL_METRIC<br>No BROKEN_CORE_WORKFLOW |
| **GIT_CLOSEOUT**<br>commit preparation, branch closeout, safe staging | caveman<br>using-superpowers<br>caveman-commit<br>verification-before-completion | caveman-review (self-review) | All UI skills<br>All financial skills (unless committing financial fix) | No `git add .`<br>No `git add -A`<br>No force push<br>No history rewrite<br>Explicit staging only |
| **LONG_HERMES**<br>multi-step autonomous missions with gates | caveman<br>using-superpowers<br>caveman-compress<br>writing-plans | cavecrew (ONLY if genuinely independent)<br>executing-plans or subagent-driven-development | ui-ux-pro-max (unless visual authorized)<br>banner-design<br>brand<br>slides | Plan written to .hermes/plans/<br>Gates at each phase<br>No cavecrew on shared financial truth path |
| **DOCUMENTATION_ONLY**<br>docs, manifests, routing, intent capture | caveman<br>using-superpowers | interview-me (if requirements unclear)<br>archify (if diagrams)<br>slides (if presentation)<br>brand (if brand docs) | All financial skills<br>All browser skills<br>All UI skills | No runtime changes<br>No test logic changes |
| **REQUIREMENT_DISCOVERY**<br>underspecified ask, need intent extraction | caveman<br>using-superpowers<br>interview-me | doubt-driven-development (stress-test intent) | All implementation skills | Explicit user confirmation of restate<br>95% confidence achieved<br>Out of scope documented |

---

## SKILL SELECTION POLICY

```
MINIMUM_RELEVANT_SKILLS=true

- Do not load every skill every mission.
- Prefer smallest sufficient set.
- If two skills overlap: select the more specific one.
- If skill availability fails: record SKILL_UNAVAILABLE=<name> and continue only if mission remains safe.
- Never invent skill contents.
```

---

## HERMES AUTOROUTING CONTRACT

**Every mission must:**

1. Identify mission type (from MISSION_PATTERN above)
2. Read `docs/ai/SKILLS_ROUTING.md` (this file)
3. Discover local `.agents/skills/`
4. Verify availability of required skills
5. Select minimum relevant skill set
6. Announce selected skills
7. Execute
8. Report:

```
SKILLS_CONSIDERED=
SKILLS_USED=
SKILLS_NOT_USED=
SKILL_SELECTION_REASON=
SKILL_UNAVAILABLE=
SKILL_GAPS_FOUND=
```

---

## PROJECT STATE CONSTANTS

```
CURRENT_PHASE=FUNCTIONAL_COMPLETION
VISUAL_PHASE=DEFERRED
VISUAL_CANON_V2=FROZEN_REFERENCE
P0=P0_RENTABILIDADE_HISTORICAL_SERIES
```

**Current transient project state (P0 status, next action) is owned by `docs/ai/PROJECT_STATE.md` and `docs/ai/NEXT_STEP.md`. This routing file defines durable skill-selection constraints only.**

Do not embed transient project-state constants here. Reference:
- `CURRENT_PROJECT_STATE_AUTHORITY=docs/ai/PROJECT_STATE.md`
- `NEXT_ACTION_AUTHORITY=docs/ai/NEXT_STEP.md`

The V283 work resolved the historical return truth path:
- `P0_ENGINE_LAYER=RESOLVED` (V281 engine fails closed)
- `P0_LEGACY_LAYER=RESOLVED` (V283 adapter connects legacy UI to engine)
- `P0_END_TO_END=RESOLVED` (current_price leakage eliminated, synthetic benchmark removed)
- `REAL_DATA_READINESS=UNAVAILABLE_AS_INPUTS_REQUIRE`
- `FAIL_CLOSED_ON_INSUFFICIENT_EVIDENCE=true`

---

## FINANCIAL INVARIANTS (Non-Negotiable)

```
UNKNOWN != ZERO
NO_DATA != ZERO
PARTIAL != COMPLETE
STALE != FRESH
FINANCIAL_AS_OF != SOURCE_AS_OF
ESTIMATE != RECEIVED
CURRENT_STATE != HISTORICAL_STATE
CURRENT_PRICE != DATED_QUOTE
FIXED_RATE != DATED_BENCHMARK_SERIES
```

---

## VISUAL PHASE GATE

**UI_VISUAL missions are FORBIDDEN unless:**

- `VISUAL_PHASE=AUTHORIZED` (explicit user authorization)
- `VISUAL_CANON_V2` is active (not FROZEN_REFERENCE)
- Mission explicitly requests visual work

Current state: **VISUAL_PHASE=DEFERRED** → All UI_VISUAL skills are FORBIDDEN.

---

## FORBIDDEN OPERATIONS (All Missions)

- `git add .` / `git add -A` / `git clean` / force push / broad reset / history rewrite
- Financial writes without authorization
- Tax writes without authorization
- Schema migration without authorization
- Push / PR / Merge / Deploy without explicit authorization
- Visual redesign when `VISUAL_PHASE=DEFERRED`
- Fabricated/backfilled/interpolated historical financial data
- Current price used as historical quote
- Fixed rate retroprojected as historical benchmark series

---

## ROUTING PRECEDENCE

When multiple patterns match, use the **most specific**:

```
FINANCIAL_TRUTH > BUG_FIX > IMPORT_PIPELINE > BROWSER_QA > CODE_REVIEW > GIT_CLOSEOUT > LONG_HERMES > DOCUMENTATION_ONLY > REQUIREMENT_DISCOVERY
```

Example: A bug in historical return calculation matches both BUG_FIX and FINANCIAL_TRUTH → Use FINANCIAL_TRUTH routing (more specific).

---

## SKILL AVAILABILITY VERIFICATION

Before mission start, verify each required skill exists at the **source** (read-only, versioned via sync) or local vendored copy:

```
C:/Projetos/skills/<skill-name>/SKILL.md          (canonical source)
C:/Projetos/carteira-investimentos/.agents/skills/<skill-name>/SKILL.md  (local vendored, tracked for approved skills)
```

If missing from both: `SKILL_UNAVAILABLE=<name>` — assess if mission can proceed safely.

Note: `.agents/skills` is partially tracked (see .gitignore). Approved skills are versioned. Heavy skills (browser-harness-main, impeccable, archify-main) remain external and can be re-synced from `C:/Projetos/skills/` or upstream sources.

---

## UPDATE PROCEDURE

When adding/removing skills:

1. Update `docs/ai/PROJECT_SKILLS_MANIFEST.md` (full detail)
2. Update this `docs/ai/SKILLS_ROUTING.md` (routing table)
3. Verify no contradictory routing in `docs/ai/AGENT_ROUTER.md` or `AGENTS.md`
4. Commit with: `chore(ai): update skill routing`

---

## LEGACY REFERENCE

Previous routing at `.agents/SKILL_ROUTER.md` is **DEPRECATED**.
This file (`docs/ai/SKILLS_ROUTING.md`) is the **single canonical source**.

---

## TIERED VALIDATION STRATEGY

```TIER 1 (FAST) - docs, small fixes, CSS, documentation-only
→ quick-check.ps1 (identity + git + package.json + governance files)
→ target: <10 seconds

TIER 2 (NORMAL) - features, refactors, moderate bugs
→ quick-check + related tests + required build
→ example: npm run test:finance + npm run build:modern

TIER 3 (CRITICAL) - finance, backup, restore, persistence, import, calculations, dividends, destructive deletion, migration, storage, auth/security
→ full-check.ps1 (identity + quick-check + ALL package.json scripts)
→ deep review + HUMAN_GATE required
→ validation cache via HEAD + diff hash

Record HEAD/hash when full-check passes to avoid re-running unchanged code.
```
## SHARED PONYTAIL POLICY

All runtimes that read the repository follow the shared [`AGENTS.md`](../../AGENTS.md)
policy `Caveman + Superpowers + Ponytail`; this file remains the concise routing
index. `PONYTAIL_DEFAULT_MODE=full`. Ponytail's minimal-implementation rule does
not remove governance, protected financial semantics, tests, validation,
security, accessibility, or persistence/import safeguards. Consider
`ponytail-review` after substantial implementation. Run `ponytail-audit` only
when an explicit cleanup/audit mission authorizes it. Neither grants permission
to change protected areas or perform remote Git actions.
