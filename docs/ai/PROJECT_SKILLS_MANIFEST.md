# Project Skills Manifest — Carteira de Investimentos

Canonical skill source: `C:/Projetos/carteira-investimentos/.agents/skills/`

---

## VENDORED SKILLS (Core)

### caveman
- **Category**: BOOTSTRAP / CONTEXT_MANAGEMENT
- **Source**: C:/Projetos/skills/caveman
- **Purpose**: Ultra-compressed communication mode that cuts output tokens by ~80% while preserving semantic density. Enforces minimal change principle for edits.
- **Recommended use**: Every mission — mandatory first skill. All responses must use caveman prefixes.
- **Avoid when**: Never — always load first.
- **Dependencies**: None
- **Side effects**: Compresses all subsequent communication
- **Risk level**: LOW
- **Routing priority**: 1 (always first)
- **Canonical status**: CORE

### using-superpowers
- **Category**: BOOTSTRAP / PLANNING / AGENT_ORCHESTRATION
- **Source**: C:/Projetos/skills/superpowers (via plugin)
- **Purpose**: Establishes how to use all other superpowers skills. Mandatory bootstrap for every Hermes session.
- **Recommended use**: Every mission — mandatory second skill after caveman.
- **Avoid when**: Never — always load second.
- **Dependencies**: caveman
- **Side effects**: Enables all other superpowers skills
- **Risk level**: LOW
- **Routing priority**: 2 (always second)
- **Canonical status**: CORE

---

## FINANCIAL TRUTH SKILLS

### doubt-driven-development
- **Category**: FINANCIAL_TRUTH / SOURCE_VALIDATION / UNCERTAINTY_HANDLING / DEBUGGING
- **Source**: C:/Projetos/skills/doubt-driven-development
- **Purpose**: Stress-test plans and implementations by systematically doubting assumptions. Forces evidence over convention.
- **Recommended use**: All financial logic changes, benchmark calculations, historical return computations, import pipelines, any P0/P1 financial work.
- **Avoid when**: Pure UI adjustments, copy changes, mechanical refactors with no logic.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: May extend investigation phase; prevents silent assumption errors.
- **Risk level**: LOW (investigation only, no writes)
- **Routing priority**: Required for FINANCIAL_TRUTH missions
- **Canonical status**: CORE

### source-driven-development
- **Category**: FINANCIAL_TRUTH / SOURCE_VALIDATION
- **Source**: C:/Projetos/skills/source-driven-development
- **Purpose**: Grounds every implementation decision in official documentation / authoritative sources. No guessing APIs, contracts, or formulas.
- **Recommended use**: Financial calculations, benchmark providers, quote sources, tax rules, regulatory formulas, API contracts.
- **Avoid when**: Internal code refactoring with no external dependency.
- **Dependencies**: caveman, using-superpowers, doubt-driven-development
- **Side effects**: Requires access to authoritative sources (docs, specs, APIs).
- **Risk level**: LOW
- **Routing priority**: Required for FINANCIAL_TRUTH missions
- **Canonical status**: CORE

### systematic-debugging
- **Category**: DEBUGGING / FINANCIAL_TRUTH
- **Source**: C:/Projetos/skills/systematic-debugging (via superpowers plugin)
- **Purpose**: 4-phase root cause debugging: understand bugs before fixing. Prevents symptom-chasing.
- **Recommended use**: Any bug, test failure, or unexpected behavior — especially financial calculation discrepancies.
- **Avoid when**: Feature development with no defect.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Structured investigation may take longer than guess-and-check.
- **Risk level**: LOW
- **Routing priority**: Required for BUG_FIX missions
- **Canonical status**: CORE

### test-driven-development
- **Category**: TDD / FINANCIAL_TRUTH / VERIFICATION
- **Source**: C:/Projetos/skills/test-driven-development (via superpowers plugin)
- **Purpose**: Enforces RED-GREEN-REFACTOR. Tests before code. Mandatory for financial logic.
- **Recommended use**: All new financial logic, historical return engine, benchmark providers, import validation, any P0/P1 work.
- **Avoid when**: Exploration/prototyping with no commitment, pure visual adjustments.
- **Dependencies**: caveman, using-superpowers, systematic-debugging
- **Side effects**: Requires test infrastructure; slows initial implementation but prevents regressions.
- **Risk level**: LOW
- **Routing priority**: Required for FINANCIAL_TRUTH and TDD missions
- **Canonical status**: CORE

### verification-before-completion
- **Category**: VERIFICATION / FINANCIAL_TRUTH
- **Source**: C:/Projetos/skills/verification-before-completion (via superpowers plugin)
- **Purpose**: Mandatory verification gates before claiming work is complete. Prevents premature "done" signals.
- **Recommended use**: Every mission end. Required for financial logic, P0/P1 fixes, before any commit.
- **Avoid when**: Never — always run at mission end.
- **Dependencies**: caveman, using-superpowers, test-driven-development
- **Side effects**: Adds verification step; catches incomplete work.
- **Risk level**: LOW
- **Routing priority**: Required for ALL missions (final gate)
- **Canonical status**: CORE

---

## BROWSER QA SKILLS

### browser-harness-main
- **Category**: BROWSER_QA
- **Source**: C:/Projetos/skills/browser-harness-main
- **Purpose**: Direct browser control via CDP for automation, scraping, testing, site/app work. Uses Chrome DevTools Protocol.
- **Recommended use**: E2E browser validation, responsive QA, console/network analysis, interaction regression, visual verification.
- **Avoid when**: Simple HTTP fetch suffices (public API, static page). Backend-only changes.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Requires running Chrome with remote debugging enabled.
- **Risk level**: MEDIUM (browser automation)
- **Routing priority**: Primary for BROWSER_QA
- **Canonical status**: CORE

### browser-testing-with-devtools
- **Category**: BROWSER_QA / DEBUGGING
- **Source**: C:/Projetos/skills/browser-testing-with-devtools
- **Purpose**: Tests in real browsers via Chrome DevTools MCP. Inspect DOM, console, network, performance, accessibility.
- **Recommended use**: UI bug diagnosis, network issue analysis, performance profiling, accessibility verification, visual regression.
- **Avoid when**: Backend-only changes, CLI tools, code that doesn't run in browser.
- **Dependencies**: caveman, using-superpowers, browser-harness-main (complementary)
- **Side effects**: Requires Chrome DevTools MCP server configured.
- **Risk level**: MEDIUM
- **Routing priority**: Alternative/Complement for BROWSER_QA
- **Canonical status**: CORE

### playwright
- **Category**: BROWSER_QA
- **Source**: C:/Projetos/skills/playwright
- **Purpose**: CLI-first browser automation via playwright-cli. Navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging.
- **Recommended use**: Automated browser testing, screenshot capture, trace collection, multi-tab workflows.
- **Avoid when**: Browser-harness or DevTools MCP already covers the need. Don't run all three redundantly.
- **Dependencies**: caveman, using-superpowers, npx/Node.js
- **Side effects**: Requires npx; may install Playwright browsers on first run.
- **Risk level**: MEDIUM
- **Routing priority**: Fallback for BROWSER_QA
- **Canonical status**: CORE

---

## UI / UX SKILLS (Visual Phase Deferred)

### interface-design
- **Category**: UI_UX / DESIGN_SYSTEM
- **Source**: C:/Projetos/skills/interface-design
- **Purpose**: Craft-first interface design for dashboards, admin panels, tools. Covers visual hierarchy, accessibility, responsive layouts, interaction flows.
- **Recommended use**: UI design/review/refinement when visual phase is authorized. Dashboard layouts, component patterns, accessibility audit.
- **Avoid when**: VISUAL_PHASE=DEFERRED (current state). Backend-only work. Financial logic.
- **Dependencies**: caveman, using-superpowers, design-system (optional)
- **Side effects**: May produce design specs requiring implementation.
- **Risk level**: LOW
- **Routing priority**: Primary for UI_VISUAL (when authorized)
- **Canonical status**: DOMAIN (deferred)

### frontend-design
- **Category**: UI_UX / DESIGN_SYSTEM
- **Source**: C:/Projetos/skills/frontend-design
- **Purpose**: Distinctive, intentional visual design — typography, palette, layout, aesthetic risk. Anti-template.
- **Recommended use**: New UI direction, brand-aligned visual identity, landing pages, marketing surfaces when authorized.
- **Avoid when**: VISUAL_PHASE=DEFERRED. Minor adjustments covered by interface-design. Financial dashboards (use interface-design).
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Opinionated aesthetic choices.
- **Risk level**: LOW
- **Routing priority**: Secondary for UI_VISUAL (when authorized)
- **Canonical status**: DOMAIN (deferred)

### design-system
- **Category**: DESIGN_SYSTEM / UI_UX
- **Source**: C:/Projetos/skills/design-system
- **Purpose**: Token architecture (primitive→semantic→component), component specs, CSS variables, slide generation.
- **Recommended use**: Design token creation, component state definitions, Tailwind theme config, systematic design handoff.
- **Avoid when**: VISUAL_PHASE=DEFERRED. No design system work needed.
- **Dependencies**: caveman, using-superpowers, brand (optional), ui-styling (optional)
- **Side effects**: Generates token files, CSS variables.
- **Risk level**: LOW
- **Routing priority**: Supporting for UI_VISUAL
- **Canonical status**: DOMAIN (deferred)

### ui-styling
- **Category**: UI_UX / DESIGN_SYSTEM
- **Source**: C:/Projetos/skills/ui-styling
- **Purpose**: shadcn/ui + Tailwind CSS + Canvas visual designs. Accessible components, responsive layouts, dark mode.
- **Recommended use**: Building UI with React/Next.js/Vite, implementing design systems, accessible components.
- **Avoid when**: VISUAL_PHASE=DEFERRED. Non-React stacks. Legacy index.html codebase.
- **Dependencies**: caveman, using-superpowers, design-system
- **Side effects**: May add Tailwind/shadcn dependencies.
- **Risk level**: MEDIUM (dependencies)
- **Routing priority**: Implementation for UI_VISUAL (when authorized, React)
- **Canonical status**: OPTIONAL (deferred)

### ui-ux-pro-max
- **Category**: UI_UX / DESIGN_SYSTEM
- **Source**: C:/Projetos/skills/ui-ux-pro-max
- **Purpose**: Comprehensive UX patterns, design system generation, anti-pattern detection, 1000+ rules across 10 domains.
- **Recommended use**: New project/page design system generation, deep UX audit, complex product type patterns.
- **Avoid when**: VISUAL_PHASE=DEFERRED. Minor tweaks (use interface-design). Financial truth work.
- **Dependencies**: caveman, using-superpowers, Python 3
- **Side effects**: Large rule set; use --design-system first, then --domain for specifics.
- **Risk level**: LOW
- **Routing priority**: Heavy-lift for UI_VISUAL (when authorized)
- **Canonical status**: DOMAIN (deferred)

### impeccable
- **Category**: UI_UX / REVIEW
- **Source**: C:/Projetos/skills/impeccable
- **Purpose**: Production-grade frontend interface design, audit, polish. 20+ sub-commands (craft, shape, audit, polish, bolder, quieter, etc.).
- **Recommended use**: Final quality pass before shipping, UX design review, technical quality checks, visual polish when authorized.
- **Avoid when**: VISUAL_PHASE=DEFERRED. Early exploration. Financial logic review.
- **Dependencies**: caveman, using-superpowers, project context (PRODUCT.md/DESIGN.md)
- **Side effects**: Runs context/palette scripts; may generate design artifacts.
- **Risk level**: LOW
- **Routing priority**: Final polish for UI_VISUAL / CODE_REVIEW
- **Canonical status**: DOMAIN (deferred)

---

## GIT / COMMIT SKILLS

### caveman-commit
- **Category**: GIT
- **Source**: C:/Projetos/skills/caveman-commit
- **Purpose**: Safe commit workflow — audit, unstage docs, commit feature files safely. Enforces explicit staging, no `git add .`.
- **Recommended use**: Every commit. Preparing feature branches for review. Pre-PR staging.
- **Avoid when**: No changes to commit. Automated CI commits.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Creates commits with proper hygiene.
- **Risk level**: LOW
- **Routing priority**: Required for GIT_CLOSEOUT
- **Canonical status**: CORE

### caveman-review
- **Category**: REVIEW / GIT
- **Source**: C:/Projetos/skills/caveman-review
- **Purpose**: Code review from caveman perspective — minimal change, financial safety, no visual regression.
- **Recommended use**: Pre-PR self-review, receiving external review, reviewing financial logic changes.
- **Avoid when**: No code to review.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: May surface issues requiring fixes.
- **Risk level**: LOW
- **Routing priority**: Required for CODE_REVIEW
- **Canonical status**: CORE

### caveman-compress
- **Category**: CONTEXT_MANAGEMENT
- **Source**: C:/Projetos/skills/caveman-compress
- **Purpose**: Compress memory files (CLAUDE.md, todo lists) to fit token budgets.
- **Recommended use**: Long-running missions hitting context limits. Periodic compression.
- **Avoid when**: Plenty of context remaining.
- **Dependencies**: caveman
- **Side effects**: Loses detail; preserves only high-signal facts.
- **Risk level**: LOW
- **Routing priority**: As needed for LONG_HERMES missions
- **Canonical status**: OPTIONAL

### caveman-help
- **Category**: CONTEXT_MANAGEMENT
- **Source**: C:/Projetos/skills/caveman-help
- **Purpose**: Quick-reference card for caveman modes, skills, and commands.
- **Recommended use**: When unsure about caveman syntax or available modes.
- **Avoid when**: Familiar with caveman.
- **Dependencies**: caveman
- **Side effects**: None
- **Risk level**: LOW
- **Routing priority**: Reference only
- **Canonical status**: REFERENCE_ONLY

### caveman-stats
- **Category**: CONTEXT_MANAGEMENT
- **Source**: C:/Projetos/skills/caveman-stats
- **Purpose**: Show recorded output and cache-read token usage and mode statistics.
- **Recommended use**: Monitoring token usage in long sessions.
- **Avoid when**: Not needed.
- **Dependencies**: caveman
- **Side effects**: None
- **Risk level**: LOW
- **Routing priority**: Reference only
- **Canonical status**: REFERENCE_ONLY

---

## AGENT ORCHESTRATION

### cavecrew
- **Category**: AGENT_ORCHESTRATION
- **Source**: C:/Projetos/skills/cavecrew
- **Purpose**: When to delegate to cavecrew-investigator (locate code) vs cavecrew-implementer (edit code). Parallel subagents.
- **Recommended use**: Genuinely independent parallel workstreams (e.g., separate files, separate domains). Large refactors with clear boundaries.
- **Avoid when**: Tasks share financial truth path. Sequential dependencies. Single-file changes.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Spawns subagents; results are self-reports (verify independently).
- **Risk level**: MEDIUM (parallel execution)
- **Routing priority**: Only for LONG_HERMES with independent workstreams
- **Canonical status**: OPTIONAL

### writing-plans
- **Category**: PLANNING / AGENT_ORCHESTRATION
- **Source**: C:/Projetos/skills/writing-plans (via superpowers plugin)
- **Purpose**: Write markdown plans to .hermes/plans/ before execution. No execution in plan phase.
- **Recommended use**: Multi-step missions, complex features, when user asks for plan.
- **Avoid when**: Single-step tasks. Trivial fixes.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Creates plan file; does not execute.
- **Risk level**: LOW
- **Routing priority**: Required for LONG_HERMES / PLANNING missions
- **Canonical status**: CORE

---

## DOCUMENTATION / PRESENTATION

### slides
- **Category**: PRESENTATION / DOCUMENTATION
- **Source**: C:/Projetos/skills/slides
- **Purpose**: Strategic HTML presentations with Chart.js, design tokens, copywriting formulas.
- **Recommended use**: Investor pitches, project presentations, data-driven slides when explicitly requested.
- **Avoid when**: Not requested. Normal engineering work.
- **Dependencies**: caveman, using-superpowers, design-system (tokens), brand (optional)
- **Side effects**: Generates HTML presentation files.
- **Risk level**: LOW
- **Routing priority**: Only when explicitly requested
- **Canonical status**: OPTIONAL

### brand
- **Category**: BRAND / PRESENTATION
- **Source**: C:/Projetos/skills/brand
- **Purpose**: Brand voice, visual identity, messaging frameworks, asset management.
- **Recommended use**: Brand identity work, marketing assets, style guides when explicitly requested.
- **Avoid when**: Normal engineering. Not requested.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Manages brand-guidelines.md, design tokens.
- **Risk level**: LOW
- **Routing priority**: Only when explicitly requested
- **Canonical status**: OPTIONAL

### banner-design
- **Category**: PRESENTATION / BRAND
- **Source**: C:/Projetos/skills/banner-design
- **Purpose**: Social media, ads, website hero, print banner design. AI-generated visuals.
- **Recommended use**: Explicit banner/cover/hero design requests only.
- **Avoid when**: Application UI. Not requested.
- **Dependencies**: caveman, using-superpowers, ui-ux-pro-max, frontend-design, ai-artist, ai-multimodal, chrome-devtools
- **Side effects**: Generates image assets; complex pipeline.
- **Risk level**: MEDIUM (external APIs)
- **Routing priority**: Only when explicitly requested
- **Canonical status**: OPTIONAL

### interview-me
- **Category**: DOCUMENTATION / PLANNING
- **Source**: C:/Projetos/skills/interview-me
- **Purpose**: Extracts what user actually wants via one-question-at-a-time interview until ~95% confidence.
- **Recommended use**: Underspecified asks ("build me X" without "for whom" or "why now"). Explicit invocation.
- **Avoid when**: Clear, unambiguous request. Mechanical operations. Pure info requests.
- **Dependencies**: caveman, using-superpowers
- **Side effects**: Interactive; requires live user.
- **Risk level**: LOW
- **Routing priority**: Only for REQUIREMENT_DISCOVERY
- **Canonical status**: OPTIONAL

---

## SPECIALIZED / SUPPORTING

### archify
- **Category**: DOCUMENTATION / ARCHIVE
- **Source**: C:/Projetos/skills/archify
- **Purpose**: Architecture, workflow, sequence, data-flow, lifecycle diagrams as interactive HTML.
- **Recommended use**: Visualizing system architecture, API sequences, data pipelines, state machines when requested.
- **Avoid when**: Not requested. Runtime debugging.
- **Dependencies**: caveman, using-superpowers, Node.js
- **Side effects**: Generates diagram HTML files.
- **Risk level**: LOW
- **Routing priority**: Only when explicitly requested
- **Canonical status**: OPTIONAL

### references
- **Category**: REFERENCE_ONLY
- **Source**: C:/Projetos/skills/references
- **Purpose**: Reference knowledge base (no SKILL.md — folder of references).
- **Recommended use**: Consult as needed for domain knowledge.
- **Avoid when**: Not a skill — do not load as skill.
- **Dependencies**: None
- **Side effects**: None
- **Risk level**: NONE
- **Routing priority**: Reference only
- **Canonical status**: REFERENCE_ONLY

---

## NOT VENDORED / EXCLUDED

| Skill | Reason |
|-------|--------|
| **impeccable.bak** | Backup folder — deprecated |
| **archiv** | No SKILL.md — unclear purpose |
| **archiv-main** | No SKILL.md — unclear purpose |
| **design** | Meta-skill routing to external skills; not self-contained |
| **clone-website** | Reverse-engineering — not project-relevant |
| **deep-research** | Academic research — not project-relevant |
| **deploy-to-vercel** | Deployment — prohibited (NO_DEPLOY) |
| **fact-checker** | General fact-checking — use doubt-driven-development |
| **find-skills** | Skill discovery — meta, not project-relevant |
| **firebase-security-rules-auditor** | Specific to Firebase — not current stack |
| **mantis-*** (6 skills) | Threat modeling/architecture critique — not project-relevant |
| **planning-with-files** | Superseded by writing-plans |
| **source-tracker** | Source tracking — not project-relevant |
| **web-quality-audit** | General web audit — use browser QA skills |

---

## DUPLICATES / BACKUPS IDENTIFIED

- **impeccable.bak** → Backup of impeccable (EXCLUDED)
- **archiv / archiv-main** → Both lack SKILL.md; archiv has content, archiv-main does not (archiv kept as OPTIONAL, archiv-main EXCLUDED)

---

## UNKNOWN (Require Human Review)

None — all skills inspected and classified.

---

## LICENSE / PROVENANCE STATUS

| Skill | License | Provenance | Copy Allowed | Attribution Required |
|-------|---------|------------|--------------|---------------------|
| caveman | MIT | Superpowers plugin | YES | NO |
| using-superpowers | MIT | Superpowers plugin | YES | NO |
| doubt-driven-development | MIT | Superpowers plugin | YES | NO |
| source-driven-development | MIT | Superpowers plugin | YES | NO |
| systematic-debugging | MIT | Superpowers plugin | YES | NO |
| test-driven-development | MIT | Superpowers plugin | YES | NO |
| verification-before-completion | MIT | Superpowers plugin | YES | NO |
| writing-plans | MIT | Superpowers plugin | YES | NO |
| browser-harness-main | MIT | browser-use | YES | NO |
| browser-testing-with-devtools | MIT | chrome-devtools-mcp | YES | NO |
| playwright | MIT | Microsoft/Playwright | YES | NO |
| interface-design | MIT | claudekit | YES | NO |
| frontend-design | Custom | claudekit (LICENSE.txt) | YES | YES |
| design-system | MIT | claudekit | YES | NO |
| ui-styling | MIT | claudekit | YES | NO |
| ui-ux-pro-max | MIT | claudekit | YES | NO |
| impeccable | MIT | tt-a1i | YES | NO |
| caveman-commit | MIT | Superpowers plugin | YES | NO |
| caveman-review | MIT | Superpowers plugin | YES | NO |
| caveman-compress | MIT | Superpowers plugin | YES | NO |
| caveman-help | MIT | Superpowers plugin | YES | NO |
| caveman-stats | MIT | Superpowers plugin | YES | NO |
| cavecrew | MIT | Superpowers plugin | YES | NO |
| slides | MIT | claudekit | YES | NO |
| brand | MIT | claudekit | YES | NO |
| banner-design | MIT | claudekit | YES | NO |
| interview-me | MIT | Superpowers plugin | YES | NO |
| archify | MIT | tt-a1i (based on Cocoon-AI) | YES | YES (Cocoon-AI) |
| references | N/A | N/A | N/A | N/A |

All vendored skills have clear MIT or equivalent permissive licenses with copy allowed.