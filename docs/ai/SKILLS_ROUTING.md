# Skills Routing — Carteira de Investimentos

**Canonical routing for all agents (Hermes, Codex, etc.) in this project.**

---

## GLOBAL BOOTSTRAP (MANDATORY — EVERY MISSION)

```
1. caveman                    → Ultra-compressed communication, minimal change principle
2. using-superpowers          → Enables all superpowers skills, establishes workflow
```

**Rule**: These two skills load first, always. No exceptions.

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
NEXT_ACTION=V282_WAVE_B_LEGACY_INTEGRATION (connect legacy rentability to V281 engine)
P0_ENGINE_LAYER=RESOLVED
P0_END_TO_END=PARTIAL
P0=P0_RENTABILIDADE_HISTORICAL_SERIES
```

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