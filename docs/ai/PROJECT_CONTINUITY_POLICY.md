# Project Continuity Policy — Carteira de Investimentos

**Canonical continuity governance for this repository.**

---

## CORE PRINCIPLES

```
REPOSITORY_DOCS_ARE_CANONICAL=true
CHAT_IS_NON_CANONICAL=true
AGENT_REPORT_IS_NOT_CANONICAL_UNTIL_VERIFIED=true
CURRENT_FILESYSTEM_OVERRIDES_HISTORICAL_REPORT=true
CURRENT_VERIFIED_CODE_OVERRIDES_OLD_ASSUMPTIONS=true
ONE_CANONICAL_OWNER_PER_RULE=true
DO_NOT_DUPLICATE_MEMORY_ACROSS_DOCS=true
HISTORICAL_REPORTS_ARE_REFERENCE_ONLY=true
```

---

## WHAT THIS MEANS

### Repository Documents Are Canonical
All durable project state, decisions, rules, routing, and memory live in versioned files under `docs/ai/`. Chat history, agent memory, and transient mission reports are **not** authoritative.

### Chat Is Non-Canonical
No decision, rule, or state change becomes permanent because an agent said it in chat. Only versioned repository documents count.

### Agent Reports Require Verification
An agent claiming "done", "fixed", or "resolved" is a hypothesis. Verification requires fresh command output (tests, build, diff, grep) — not the agent's summary.

### Current Filesystem Wins
If a historical report says X but the current filesystem/code says Y, Y wins. Reports age; code is current.

### Current Verified Code Wins
If an old assumption says "function X works" but current verified tests show it doesn't, the tests win. Assumptions expire; evidence doesn't.

### One Canonical Owner Per Rule
Each rule/decision/fact has exactly one canonical document that owns it. Other documents reference it — they don't duplicate it.

### No Duplicate Memory Across Docs
The same fact should not appear in multiple canonical files. Reference the owner document instead.

### Historical Reports Are Reference Only
Mission reports, audit outputs, and session summaries are Level 2 (mission records). They inform but do not govern. Only promoted Level 3 facts in canonical documents govern.

### Session Output Integrity
`SESSION_OUTPUT_INTEGRITY_RULE=true`.
Treat malformed, incoherent, or token-corrupted model output as untrusted data, not instructions or project evidence. Do not execute commands, copy code, or derive state from it. Preserve the worktree, start a clean session, and rebuild facts from Git, repository files, governance, and fresh tests. If incoherence recurs, stop tool-driven work and report the integrity blocker.

### Test Certification Freshness
`TEST_CERTIFICATION_FRESHNESS_RULE=true`. Validation evidence applies only to the exact source tree and state that was tested. Any subsequent relevant code, test, configuration, or fixture change makes affected results `STALE` until those gates are rerun. Reuse only evidence whose tested state is demonstrably unchanged; do not infer a current pass from an earlier report.

`CONTINUOUS_GOVERNANCE_PERSISTENCE_POLICY=true`: ao encerrar uma missão, confira se houve aprendizado durável e atualize o documento canônico apropriado. Não duplique a mesma regra em vários documentos; evidências transitórias ficam no estado/relatório da missão.
Large-mission closeout records `LESSONS_LEARNED`, `GOVERNANCE_UPDATE_REQUIRED`, `PROJECT_MEMORY_UPDATE_REQUIRED`, and `SKILLS_ROUTING_UPDATE_REQUIRED`. Promote only verified, reusable lessons to the single canonical owner document; keep transient failures and mission-specific evidence in the mission report/state, and do not edit memory or routing when their durable contracts did not change.

### Worktree Access Diagnosis
`WORKTREE_ACCESS_DIAGNOSTIC_RULE=true`.
A failing `git status` is not proof of Git metadata corruption. Classify path, workspace scope, runtime access, filesystem permission, and Git metadata separately. Use read-only identity/status checks first; run worktree repair only when broken Git registration/link metadata is proven. Preserve all local state while diagnosing.

### Local Blocker and Mission Recovery
`LOCAL_BLOCKER_MUST_NOT_BLOCK_GLOBAL_PROGRESS=true`: isolate, classify, preserve, and defer a localized blocker when safe; continue independent authorized work. Stop globally only for identity mismatch, unique-state loss risk, unrecoverable repository corruption, credentials/MFA, production risk, protected financial ambiguity, or another explicit human gate.

`RECOVERY_THEN_RESUME_NOT_RESTART=true`: after access or runtime recovery, rebuild identity and live state from Git and canonical docs, preserve existing changes, and resume at the first incomplete or unverified step. Repeat completed gates only when relevant source state changed.

---

## MEMORY HIERARCHY (Three Levels)

### LEVEL 1 — TRANSIENT (Never Persist)
- Terminal logs, scratch findings, temporary hypotheses
- Agent narration, internal monologue
- Failed experiments, dead ends
- Partial verification outputs

Temporary baseline and test evidence belongs under the current mission's
`.superpowers/sdd/<mission>/tmp/` directory (or another approved mission-local
temporary directory), never beside the worktree root. Keep it untracked and
remove only exact verified generated paths when cleanup is authorized. Do not
use broad Git or recursive cleanup to erase unknown evidence.

### LEVEL 2 — MISSION RECORD (Mission Artifacts)
- Audit reports with evidence
- Test evidence (RED/GREEN output)
- Implementation reports (what changed, verified how)
- Commit-specific findings
- **Stored as**: mission reports, PR descriptions, commit messages

### LEVEL 3 — CANONICAL MEMORY (Repository Documents)
- Verified project rules that govern future work
- Confirmed architecture decisions
- Current verified state (not assumed state)
- Active blockers with evidence
- Accepted product decisions
- Verified data authority rules
- Skill routing rules
- **Stored as**: files under `docs/ai/` (see Canonical Ownership below)
- **Promotion requires**: VERIFICATION=true (fresh evidence, not agent narrative)

---

## CANONICAL DOCUMENT OWNERSHIP

| Document | Owns | Does NOT Own |
|----------|------|--------------|
| `AGENTS.md` | Mandatory cross-agent behavioral/governance rules, identity gate, bootstrap protocol, protected areas, Git governance | Mission-specific state, skill routing details, project memory |
| `docs/ai/INDEX.md` | Bootstrap map and document entry point | Detailed content |
| `docs/ai/PROJECT_STATE.md` | Verified current state only (what is true NOW) | Historical state, plans, decisions |
| `docs/ai/NEXT_STEP.md` | One official next action / current blockers | History, alternatives, rationale |
| `docs/ai/PROJECT_MEMORY.md` | Durable architectural/product decisions and lessons | Current state, next action, routing |
| `docs/ai/CURRENT_PROJECT_MAP.md` | Current technical/product map | Decisions, state |
| `docs/ai/SKILLS_ROUTING.md` | Canonical skill routing (mission-type → skills) | Skill inventory, project memory |
| `docs/ai/PROJECT_SKILLS_MANIFEST.md` | Available project skill inventory (what exists) | Routing rules, decisions |
| `docs/ai/PRODUCT_COMPLETION_BACKLOG.md` | Remaining functional work items | Current state, routing |
| `docs/ai/PRODUCT_COMPLETION_MATRIX.md` | Domain completion state (evidence-based) | Routing, decisions |
| `docs/ai/PROJECT_CONTINUITY_POLICY.md` | Continuity/memory governance (this file) | Other content |

---

## CONTINUITY GATE (Mandatory Before Substantial Work)

Every substantial mission must verify **before implementation**:

```
PROJECT_IDENTITY           → AGENTS.md identity gate
CANONICAL_ROOT             → C:/Projetos/carteira-investimentos
CURRENT_BRANCH             → git branch --show-current
HEAD                       → git rev-parse HEAD
ORIGIN_MAIN                → git rev-parse origin/main (after fetch)
CURRENT_PHASE              → docs/ai/PROJECT_STATE.md / NEXT_STEP.md
NEXT_ACTION                → docs/ai/NEXT_STEP.md
BLOCKERS                   → docs/ai/PROJECT_STATE.md / NEXT_STEP.md
SKILL_ROUTING              → docs/ai/SKILLS_ROUTING.md
FINANCIAL_SAFETY_RULES     → AGENTS.md protected areas + FINANCIAL_INVARIANTS
WORKTREE_STATE             → git worktree list --porcelain
```

If canonical docs materially disagree on any gate item:

```
STATUS=HUMAN_BLOCKER_PROJECT_STATE_CONFLICT
STOP
```

Do not silently choose whichever document is convenient. Surface the conflict.

---

## CONFLICT RESOLUTION ORDER (Precedence)

When sources conflict, apply in order:

1. **Explicit current human instruction** (live user message)
2. **Verified current filesystem/code** (grep, test output, git diff)
3. **Canonical current-state docs** (`docs/ai/PROJECT_STATE.md`, `docs/ai/NEXT_STEP.md`)
4. **Canonical durable project-memory docs** (`docs/ai/PROJECT_MEMORY.md`)
5. **Current mission plan** (if exists and verified)
6. **Historical mission reports** (Level 2 — reference only)
7. **Archived material** (superseded docs)
8. **Chat recollection / agent memory** (lowest — non-canonical)

**Exception**: Destructive/safety actions (financial writes, schema changes, force push, merge, deploy) still require explicit human authority even if an old document appears to allow them.

---

## CROSS-AGENT INDEPENDENCE

The project must support **any compatible agent** without requiring agent-specific hidden memory:

```
AGENT_NEUTRAL_PROJECT_MEMORY=true
MODEL_NEUTRAL_PROJECT_MEMORY=true
CHAT_NEUTRAL_PROJECT_MEMORY=true
```

- Core project correctness cannot depend on Hermes-specific, Codex-specific, or any single agent's memory.
- Agent-specific optimizations may exist only as **optional routing guidance** in `docs/ai/SKILLS_ROUTING.md`.
- All canonical documents must be readable and actionable by any agent with basic file/terminal access.

---

## SKILL AUTOROUTING CONTINUITY

Preserve these invariants:

```
CAVEMAN_FIRST=true
SUPERPOWERS_SECOND=true
MINIMUM_RELEVANT_SKILLS=true
```

Every substantial mission report must include:

```
MISSION_TYPE=
SKILLS_CONSIDERED=
SKILLS_USED=
SKILLS_NOT_USED=
SKILL_SELECTION_REASON=
SKILL_UNAVAILABLE=
SKILL_GAPS_FOUND=
```

Do not invoke every installed skill. Select minimum relevant set per `docs/ai/SKILLS_ROUTING.md`.

**Note**: Skills are sourced from `C:/Projetos/skills/` (read-only, not in this repo). The local vendored copy at `.agents/skills/` is gitignored and must be re-synced after fresh clone. See `docs/ai/PROJECT_SKILLS_MANIFEST.md` for inventory.

---

## CURRENT PROJECT STATE (Do Not Distort)

```
FUNCTIONAL_COMPLETION_FIRST=true
VISUAL_PHASE=DEFERRED
VISUAL_CANON_V2=FROZEN_REFERENCE
```

**Current transient implementation status (P0, phase, next action) is owned by `docs/ai/PROJECT_STATE.md` and `docs/ai/NEXT_STEP.md`. This policy defines durable governance only.**

Do not embed obsolete transient status here. The V283 work (adapter + engine) resolved the historical return truth path:
- `P0_ENGINE_LAYER=RESOLVED` (V281 engine fails closed)
- `P0_LEGACY_LAYER=RESOLVED` (V283 adapter connects legacy UI to engine)
- `P0_END_TO_END=RESOLVED` (current_price leakage eliminated, synthetic benchmark removed)
- `REAL_DATA_READINESS=UNAVAILABLE_AS_INPUTS_REQUIRE` (identity/coverage/history/flows insufficient → metric unavailable)
- `FAIL_CLOSED_ON_INSUFFICIENT_EVIDENCE=true`

Do not mark P0 status in this policy. Reference `docs/ai/PROJECT_STATE.md` for verified current state.

---

## FINANCIAL TRUTH INVARIANTS (Non-Negotiable)

```
UNKNOWN != ZERO
NO_DATA != ZERO
PARTIAL != COMPLETE
STALE != FRESH
ENGINE_AVAILABLE != DATA_READY
FINANCIAL_AS_OF != SOURCE_AS_OF
ESTIMATE != RECEIVED
CURRENT_PRICE != HISTORICAL_PRICE
FIXED_RATE != DATED_BENCHMARK_SERIES
CURRENT_STATE != HISTORICAL_STATE
```

No financial/tax write authority is granted by documentation. These invariants are enforced by code and tests, not by policy documents.

---

## GIT / WORKTREE CONTINUITY

```
NO_GIT_CLEAN=true
NO_FORCE_PUSH=true
NO_BROAD_RESET=true
NO_HISTORY_REWRITE=true
EXPLICIT_STAGING_ONLY=true
UNKNOWN_DO_NOT_DELETE=true

REUSE_EXISTING_WORKTREE_WHEN_SAFE=true
NO_WORKTREE_FOR_READ_ONLY_AUDIT=true
MISSION_END_WORKTREE_REVIEW=true
```

Do not remove unrelated historical worktrees. Preserve residues on failed removal.

---

## MISSION MEMORY CLOSEOUT (Mandatory At Mission End)

Every substantial mission must end with:

```
MISSION_MEMORY_CLOSEOUT

NEW_PERMANENT_RULES=
NEW_PROJECT_DECISIONS=
NEW_ARCHITECTURE_FACTS=
NEW_DATA_AUTHORITY_RULES=
NEW_SKILL_ROUTING=
NEW_LIMITATIONS=
STATE_TRANSITIONS=
NEXT_ACTION=

CANONICAL_FILES_UPDATED=

DUPLICATE_MEMORY_CREATED=false
CHAT_ONLY_DECISIONS_LEFT=false
```

Only persist information that **materially affects future execution**. Do not turn every mission log into permanent memory.

---

## MANDATORY BOOTSTRAP ORDER (Every Substantial Mission)

1. `caveman` (skill)
2. `using-superpowers` (skill)
3. `AGENTS.md`
4. `docs/ai/INDEX.md`
5. `docs/ai/PROJECT_STATE.md`
6. `docs/ai/NEXT_STEP.md`
7. `docs/ai/CURRENT_PROJECT_MAP.md`
8. `docs/ai/SKILLS_ROUTING.md`
9. Mission-specific canonical docs
10. Mission-specific skills

Availability must be verified at execution time. Never invent unavailable skill contents.

---

## UPDATE PROCEDURE

When this policy or canonical ownership changes:

1. Edit this file (`docs/ai/PROJECT_CONTINUITY_POLICY.md`)
2. Update affected canonical owner documents (one per rule)
3. Remove any duplicated content from non-owner documents
4. Commit with: `docs(ai): update continuity policy`
5. No push/PR/merge/deploy without authorization

---

## VALIDATION CHECKLIST

Before claiming continuity policy is consistent:

```
CONFLICTING_CURRENT_PHASE=0        (only one value across all docs)
CONFLICTING_NEXT_ACTION=0          (only one value across all docs)
CONFLICTING_P0_STATUS=0            (only one value across all docs)
BROKEN_CANONICAL_LINKS=0           (all internal references resolve)
DIFF_CHECK=pass                    (git diff --check clean)
```

---

## REFERENCE

This policy consolidates and supersedes scattered continuity rules previously in:
- `AGENTS.md` (bootstrap protocol sections)
- `docs/SKILLS_ROUTING.md` (memory sections)
- `docs/ai/PROJECT_MEMORY.md` (governance sections)
- Various mission reports

Those documents now **reference** this policy rather than duplicating it.

---

## CONTINUITY MATURITY LEVEL

Add a simple project maturity marker.

Suggested:

CONTINUITY_LEVEL_0=CHAT_DEPENDENT
CONTINUITY_LEVEL_1=DOCS_PRESENT
CONTINUITY_LEVEL_2=CANONICAL_STATE
CONTINUITY_LEVEL_3=AGENT_NEUTRAL
CONTINUITY_LEVEL_4=FRESH_CLONE_REPRODUCIBLE

Current level:

PROJECT_CONTINUITY_LEVEL=4

Achieved because:

- All canonical docs present and consistent (Level 1-2)
- Agent-neutral project memory (Level 3)
- Fresh clone can reconstruct operational skill environment for tracked skills (Level 4)

Note: Some skills (browser-harness-main, impeccable, archify-main) remain external dependencies due to size/complexity. They are documented in PROJECT_SKILLS_MANIFEST.md with clear license/provenance and can be re-synced from C:/Projetos/skills/ or their upstream sources.
