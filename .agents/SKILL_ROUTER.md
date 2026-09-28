# Skill Router — Carteira de Investimentos (LEGACY REFERENCE)

**⚠️ DEPRECATED — Canonical routing moved to `docs/ai/SKILLS_ROUTING.md`**

This file is kept for backward compatibility only. All agents must read:

```
docs/ai/SKILLS_ROUTING.md
```

---

## Quick Reference (Mirror of Canonical)

### MANDATORY BOOTSTRAP (Every Mission)
1. `caveman` — Ultra-compressed communication, minimal change principle
2. `using-superpowers` — Enables all superpowers skills

### MISSION-TYPE ROUTING

| Mission Type | Required Skills |
|--------------|-----------------|
| **FINANCIAL_TRUTH** | caveman, using-superpowers, doubt-driven-development, source-driven-development, systematic-debugging, test-driven-development, verification-before-completion, caveman-review, caveman-commit |
| **BUG_FIX** | caveman, using-superpowers, doubt-driven-development, systematic-debugging, test-driven-development, verification-before-completion |
| **IMPORT_PIPELINE** | caveman, using-superpowers, doubt-driven-development, source-driven-development, test-driven-development, verification-before-completion, caveman-review, caveman-commit |
| **BROWSER_QA** | caveman, using-superpowers, browser-harness-main |
| **UI_VISUAL** (ONLY when VISUAL_PHASE=AUTHORIZED) | caveman, using-superpowers, interface-design |
| **CODE_REVIEW** | caveman, using-superpowers, caveman-review, impeccable, verification-before-completion, requesting-code-review |
| **GIT_CLOSEOUT** | caveman, using-superpowers, caveman-commit, verification-before-completion |
| **LONG_HERMES** | caveman, using-superpowers, caveman-compress, writing-plans |
| **DOCUMENTATION_ONLY** | caveman, using-superpowers |
| **REQUIREMENT_DISCOVERY** | caveman, using-superpowers, interview-me |

### FORBIDDEN WHEN VISUAL_PHASE=DEFERRED (Current State)
- ui-ux-pro-max, frontend-design, interface-design, design-system, ui-styling, impeccable, banner-design, brand, slides

### FINANCIAL INVARIANTS
UNKNOWN != ZERO | PARTIAL != COMPLETE | STALE != FRESH | ESTIMATE != RECEIVED | CURRENT_PRICE != HISTORICAL_PRICE | FIXED_RATE != DATED_BENCHMARK_SERIES

---

**For full routing table, selection policy, autorouting contract, and project constants — see `docs/ai/SKILLS_ROUTING.md`**
