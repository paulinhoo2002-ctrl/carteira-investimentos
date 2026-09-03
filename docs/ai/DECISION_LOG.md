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

## 2026-09-03 - Canonical visual migration 01 is pending visual acceptance

- DECISION: Apply a scoped canonical visual layer to the legacy Sidebar,
  Dashboard and Dividendos without changing product engines.
- WHY: The approved primary references require a shared dark shell, compact
  KPI rhythm, stronger analytical hierarchy and responsive density.
- PRESERVED: Official financial helpers, datasets, handlers, routes,
  persistence, schema, protected screens and modern frontend isolation.
- STATUS: Implemented pending user visual approval; no screen is frozen.
- EVIDENCE: `qa-screenshots/canonical-visual-migration-01/` and focused/browser
  validation executed on 2026-09-03.

## 2026-09-03 - Canonical visual migration 01 final acceptance

- DECISION: Mark the scoped Dashboard and Dividendos convergence ready for
  final user approval, without freezing either screen yet.
- PRESERVED: Official financial sources, calculations, handlers, routes,
  persistence, schema and modern frontend isolation.
- REFINED: Dashboard vertical density and simultaneous gain/loss panels;
  Dividendos semantic KPI treatment, flat Top ativos ranking and Total geral
  annual summary center.
- STATUS: Ready for final user approval.
- EVIDENCE: `qa-screenshots/canonical-visual-migration-01/acceptance-final/`;
  focused 31/31, root 75/75, modern 750/750, finance 80/80 and persistence
  31/31 passed on 2026-09-03.

## 2026-09-03 - RF orphan chain is reconciled

- DECISION: Do not recover the orphan RF chain into the canonical workspace.
- WHY: The fixed-rate identity, readonly projection, valuation supplements,
  modern bridge and regression tests are already present; the canonical state
  also contains the newer CDI path and coverage.
- STATUS: Complete.
- SOURCE/EVIDENCE: independent inspection of commits
  `31d0d11e`, `a87078ec`, `42c31355`, `4e882816`, current RF sources/tests,
  and local browser proof of legacy RF values plus the modern readonly route.
- PROTECTIONS: No product code, Finance Core, Persistence Core, schema or
  real data changed for this reconciliation.

## 2026-09-03 - Canonical Dashboard, Dividendos and Sidebar frozen

- DECISION: Freeze the approved visual implementation for Dashboard,
  Dividendos and Sidebar against the primary canonical references.
- WHY: Required browser smoke, focused tests, full gates and visual review
  confirmed the approved density, hierarchy, financial legibility and
  responsive behavior.
- STATUS: Frozen.
- REFERENCE: `Refs/visual-canon/dashboard-canonical.png` and
  `Refs/visual-canon/dividendos-canonical.png`.
- BOUNDARY: Future redesign or visual reinterpretation requires explicit user
  authorization. This freeze does not alter financial engines, persistence,
  schema, handlers or real data.
