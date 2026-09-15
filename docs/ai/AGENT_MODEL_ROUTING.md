# Agent / Model / Skill Routing Policy

**Status:** 2026-09-12 (Project Skills/Model Router V1)

`MODEL_ROUTING_REQUIRED=true`
`SKILL_ROUTING_REQUIRED=true`
`SKILL_DISCOVERY_REQUIRED=true`
`TOKEN_ECONOMY_REQUIRED=true`

## Model tiers

| Track | Domains |
|---|---|
| **SOL** | financial logic, persistence, recovery, cloud semantics, Class C, August/KNUQ semantic decisions, architecture, real financial execution |
| **TERRA** | UI/UX, layout, responsive, design system, visual polish |
| **LUNA** | repetitive QA, tests, browser automation, large searches, inventory, docs, cleanup, migration, mechanical fixes |
| **Hermes + GLM 5.3 Flash** | long-running economical execution, inventory, docs, tests, mechanical implementation and routine QA |
| **Nemotron 3 Ultra** | hard technical analysis, complex debugging, architecture review and critical review |

## Escalation rules

- Escalate `TERRA -> SOL` when UI work affects: financial logic, persistence, authentication, architecture.
- `ESCALATE_TO_SOL_IF`: financial invariant failure, persistence ambiguity, local/cloud divergence, recovery uncertainty, repeated unexplained failures, irreversible decision.
- Conflicting versions of financial logic, differing Class C semantics across dirty files, overlapping incompatible provider edits, or a commit that cannot be attributed safely require SOL-high review before integration.
- Escalar de Hermes/LUNA/TERRA para SOL quando houver semântica financeira,
  persistência, recovery, autoridade local/cloud, autenticação, protected write
  ou decisão de autorização.

## Skill routing

- Prefer project Skills (`.agents/skills/`) over generic approaches.
- Use `caveman-compress` only for large diff/inventory context where safe. Never compress away: financial invariants, dates, amounts, event IDs, manifest hashes, authorization state, Class C / August provenance.
- Use a review skill (`caveman-review` or equivalent) before final integration freeze.
- Commit skills must be compatible with selective (exact file/hunk) staging; `git add .` / `git add -A` are prohibited.

## Token economy policy

- Prefer project Skills; keep provenance fields verbatim; avoid repetitive irrelevant context.
- Prefer large autonomous missions; stop only at true hard stops (authorization gates, missing authentication, destructive-action boundaries).
- Evidence artifacts (manifests, fingerprints, counts) are never summarized away from the executable contract.

## Zero recurring cost

- `ZERO_RECURRING_COST_BY_DEFAULT=true`. Paid B3 API, paid market data, paid AI API, paid SaaS, paid database or paid hosting must never become a normal runtime dependency without explicit authorization (see `docs/ai/PRODUCT_CONTRACTS.md`, "Personal zero-recurring-cost contract").
