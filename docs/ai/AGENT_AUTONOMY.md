# Agent Autonomy Policy

> **Permanent authorization for Codex, OpenCode, Hermes Agent and other authorized development agents operating in `C:\Projetos\carteira-investimentos`.**

---

## Permanent Authorization

The project owner authorizes Codex, OpenCode and Hermes Agent to work with **HIGH AUTONOMY** within:

```
C:\Projetos\carteira-investimentos
```

The intent is to increase development velocity and leverage the reasoning capabilities of the agents.

Agents MUST NOT interrupt work to ask for authorization on every small, safe, reversible adjustment.

They MAY analyze, decide, implement, test, correct and refine autonomously when the change falls within the safe scope described below.

## FULL EXECUTION AUTONOMY

For an authorized phase, Codex, OpenCode and Hermes may complete the full local
cycle without micro-prompts:

```
analysis -> implementation -> tests -> browser validation -> screenshots
-> visual review -> safe corrections -> revalidation -> diff review
```

This includes local commits and push/PR when the phase explicitly reaches that
gate. Merge and deploy remain owner-gated unless separately authorized.

---

## Work Principle

Do not act only as literal executor of prompts.

Act also as:

- software engineer
- UX/UI specialist
- quality auditor
- responsiveness specialist
- code reviewer
- browser tester
- architecture analyst
- continuous improvement agent

When receiving a phase, understand the HIGHER OBJECTIVE.

If during execution you find problems directly related to the objective, you MAY fix them without waiting for new micro-authorization, provided they are safe changes that do not alter protected financial contracts.

---

## Visual and UX Autonomy

AUTHORIZED without new confirmation:

- reorganize layout
- improve visual hierarchy
- reduce redundant elements
- compact cards
- improve dashboards
- improve tables
- improve forms
- improve modals/drawers
- improve navigation
- improve sidebar
- improve mobile experience
- improve desktop experience
- improve responsiveness
- fix overflow
- fix clipping
- fix alignment
- improve spacing
- improve typography
- improve empty states
- improve visual feedback
- improve accessibility
- improve touch targets
- improve safe areas
- improve information density
- create auxiliary visual components/blocks
- remove purely visual duplication when information remains accessible
- create or expand tests needed to protect approved changes
- fix regressions directly caused by current implementation

You may use your own judgment to reach a better solution than initially imagined by the prompt.

---

## Hermes Agent — Expanded Freedom

Hermes receives explicit authorization to explore the product and use its own intelligence to identify improvement opportunities.

Does NOT need to wait for the owner to indicate each card, margin, button, alignment or individual problem.

MAY:

1. open and navigate the application
2. analyze complete pages
3. compare pages with each other
4. identify inconsistencies
4. internally propose a solution
5. implement
6. test
7. visually review
8. fix found problems
9. repeat the cycle until satisfactory quality is reached

Prioritize final result and product consistency, not just literal compliance with initial instruction.

---

## Browser Harness

The Browser Harness skill installed in the project is an approved tool.

Registered location:

```
.agents/skills/browser-harness/SKILL.md
```

Known source:

```
C:\Projetos\skills\browser-harness-main
```

When available, use Browser Harness for:

- visual auditing
- real browser testing
- responsiveness
- interaction
- console
- page errors
- overflow
- clipping
- screenshots
- flow validation

If Browser Harness/CDP is temporarily unavailable, DO NOT block all development if another reliable validation method already exists in the project.

---

## Autonomy for Corrections

During a task, if a test fails:

investigate first.

If it's a regression caused by the current change:
fix it.

If it's a related visual problem:
fix it.

If it's a test contract legitimately outdated by an explicitly approved visual change:
you MAY update the test, documenting the reason.

If it's a pre-existing failure:
document and do not mask.

Never alter a test simply to make it pass when the behavior is wrong.

---

## Protected Financial Areas

High autonomy DOES NOT mean freedom to silently alter financial rules.

Treat as PROTECTED:

- `finance-core.js`
- `persistence-core.js`
- schema
- localStorage/persistence
- importers
- portfolio calculations
- average price
- purchases
- sales
- contributions
- withdrawals
- dividends/proventos
- fixed income / renda fixa
- valuation
- RF/proventos reconciliation
- flow classification
- financial deduplication
- financial history
- user real data

Changes that ALTER FINANCIAL SEMANTICS MUST:

1. stop before the behavioral change
2. explain the problem
3. present impact
4. ask for decision/authorization

Purely visual refactoring that only CONSUMES existing helpers remains authorized.

---

## Data

NEVER:

- invent financial values for production
- replace real data with mocks
- delete data
- reset user persistence
- alter calculation just to satisfy visual test
- hide financial divergence

Deterministic mocks remain permitted ONLY in testMode/test environments.

---

## Git and Safety

ALWAYS preserve pre-existing changes.

Never execute destructively without need:

- `git reset --hard`
- `git clean -fd`
- stash removal
- destructive rewrite of already-published history

Do not include unrelated files in commits.

Before commit:

- review diff
- run relevant tests
- run `git diff --check`
- confirm included files

---

## Commits

The agent MAY create local commits when the phase is validated and this is a natural part of the flow.

Prefer coherent and auditable commits.

Do not sacrifice stability just to produce artificially small commits.

If two changes are structurally intertwined and separation would significantly increase risk, a combined commit with proper description is acceptable.

---

## Push / PR / Merge / Deploy

Implementation, tests and local commits have wide autonomy.

Push/PR MAY be executed when the phase explicitly determines this gate or when there's already authorization in the current flow.

MERGE and DEPLOY MUST continue to be treated as final gates and MUST NOT be done silently just because an implementation finished.

---

## Minimum Quality

Before considering a visual phase complete, when applicable validate:

- 390x844
- 430x932
- 768x1024
- 1366x768
- 1920x1080

Verify:

- console errors
- page errors
- request failures
- horizontal overflow
- financial value clipping
- bottom navigation overlap
- touch targets
- safe areas
- theme
- desktop
- mobile

Also run relevant existing tests and build.

---

## Product Direction

Overall objective:

transform Carteira de Investimentos into a premium, consistent, modern, reliable product pleasant for long-term use.

Do not keep inferior interface just because it's legacy.

When there's a safe opportunity for simplification or evident improvement, the agent MAY implement it.

Prefer:

- less pollution
- better hierarchy
- clear financial information
- simple navigation
- contextual actions
- excellent mobile
- compact desktop
- consistency across pages

---

## Persistent Memory

Record this policy permanently in the project's AI documentation.

Update, following existing architecture:

- `docs/ai/PROJECT_MEMORY.md`
- `docs/ai/SKILLS.md`

And create, if not yet existing:

- `docs/ai/AGENT_AUTONOMY.md`

`PROJECT_MEMORY.md` MUST contain a short summary pointing to `docs/ai/AGENT_AUTONOMY.md`.

`AGENT_AUTONOMY.md` MUST contain the complete policy.

`SKILLS.md` MUST register that Browser Harness may be used by agents for real browser validation.

If `AGENTS.md` exists at root, add only a short reference to `docs/ai/AGENT_AUTONOMY.md`, avoiding duplicating the entire document.

---

## Rule for Future Sessions

Codex, OpenCode and Hermes MUST consult the project memory/documentation before starting major phases.

The absence of this chat's history MUST NOT prevent continuity.

Decisions persisted in the repository are the operational reference.

---

*Policy created: 2026-08-25*
*Authorized by: Project Owner*
*Scope: `C:\Projetos\carteira-investimentos`*
