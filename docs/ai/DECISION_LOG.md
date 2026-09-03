# Decision Log

## 2026-09-03 - Legacy app remains authoritative

- DECISION: Treat `index.html` as the source of truth for the real product.
- WHY: It owns the global state, route dispatch, legacy handlers and current
  production behavior.
- STATUS: Active.
- SOURCE/EVIDENCE: `AGENTS.md`, `docs/ai/PROJECT_MEMORY.md`, code audit.

## 2026-09-03 - Modern host remains readonly

- DECISION: Keep `modern/src` isolated and readonly.
- WHY: Modern tests and project governance protect it from becoming a second
  financial or persistence engine.
- STATUS: Frozen unless a dedicated migration phase is approved.
- SOURCE/EVIDENCE: `AGENTS.md`, `docs/ai/ARCHITECTURE.md`, package scripts.

## 2026-09-03 - Visual canon is internal

- DECISION: Dashboard and Dividendos define the shared dark premium language;
  no third visual language is allowed.
- WHY: This preserves approved hierarchy, density, accessibility and financial
  legibility across screens.
- STATUS: Active.
- SOURCE/EVIDENCE: `DESIGN.md`, `docs/visual/NORTH-STAR.md`,
  `docs/ai/PROJECT_MEMORY.md`, approved project history.

## 2026-09-03 - Canonical image gap is explicit

- DECISION: Do not invent or silently add `Refs/visual-canon` screenshots.
- WHY: The requested dashboard and Dividendos files are absent from the
  repository; written canon and approved history are the available evidence.
- STATUS: Open documentation gap.
- SOURCE/EVIDENCE: filesystem audit of `Refs/visual-canon`.

## 2026-09-03 - Financial and persistence boundaries are frozen

- DECISION: UI work must consume official helpers and preserve Finance Core,
  Persistence Core, schema, handlers, identity and real data.
- WHY: The application manages personal financial records and has a long
  history of explicit protection decisions.
- STATUS: Active.
- SOURCE/EVIDENCE: `docs/ai/FINANCIAL_RULES.md`, `AGENTS.md`, code audit.

## 2026-09-03 - Foundation reset is documentation-only

- DECISION: This phase creates project memory and bootstrap guidance only.
- WHY: New features or bug fixes would mix discovery with implementation and
  make the repository baseline harder to reason about.
- STATUS: Complete for this audit.
- SOURCE/EVIDENCE: current audit request and resulting documentation diff.
