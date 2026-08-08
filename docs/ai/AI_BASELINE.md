# AI Baseline

## Version
Baseline v1.0 - Consolidated AI infrastructure for Carteira de Investimentos

## Main Architecture
- Legacy frontend: index.html (single page application)
- Modern frontend: modern/ directory (read-only, WIP)
- Core logic: finance-core.js (financial calculations), persistence-core.js (data persistence)
- Supporting modules: portfolio-movement-contract.js, portfolio-movement-preview.js, etc.

## Official Modules
- finance-core.js: Pure financial calculations (asset values, yields, etc.)
- persistence-core.js: Data storage abstraction (Firebase/Firestore, localStorage)
- portfolio-movement-contract.js: Movement logic (contributions/withdrawals)
- portfolio-movement-preview.js: Preview generation for movements
- readonly-report-page-contract.js: Read-only report page (experimental)
- report-asset-row.js: Asset row rendering in reports

## Official Flow
1. **Auditoria** – Review existing code, docs, AGENTS.md, and AI docs.
2. **Implementação** – Make minimal, focused changes following project conventions.
3. **Testes unitários** – Run `npm run test` and related test suites.
4. **Playwright** – End-to-end validation across viewports (390, 768, 1366, 1920px).
5. **Impeccable** – Code quality, accessibility, performance, and risk audit.
6. **Caveman-review** – Ultra-compressed communication review for decisions.
7. **Commit** – Clear, conventional commits (one objective per commit).
8. **PR Draft** – Open pull request as draft for preliminary review.
9. **Ready** – Mark PR ready after explicit user approval.
10. **Merge** – Squash merge only after approval.
11. **Validação pós-merge** – Confirm build and tests still pass.

## Mandatory Skills
- archify: Architecture and diagram generation
- interface-design: UI/UX guidelines based on DESIGN.md
- impeccable: Code quality, audit, and polish
- playwright: End-to-end browser testing
- caveman: Ultra-compressed communication
- caveman-review: Review using caveman principles
- caveman-commit: Commit message assistance
- caveman-compress: Memory/file compression for long sessions
- caveman-help: Help and reference for caveman modes
- caveman-stats: Token usage statistics
- cavecrew: Decision guide for delegating to caveman-style subagents

## Project Conventions
- Minimal changes; prefer pointwise, verifiable alterations.
- Simplicity over abstract elegance.
- Preserve existing data (wallet, assets, movements, goals, backups).
- Easy rollback: each change should be simply reversible.
- One change per objective; small, thematic diffs.
- Prefer small, reversible extractions over large rewrites.
- Financial rules are isolated in finance-core.js; never duplicate calculations.
- Persistence is centralized in persistence-core.js; never duplicate storage logic.
- UI changes must follow DESIGN.md and be validated with Playwright and Impeccable.
- Always reuse official flows (e.g., openRfMovementEditor, saveRfMovimentacao).
- Never alter protected areas: finance-core.js, persistence-core.js, firestore.rules, sw.js, manifest.json, modern/src, modern/dist, etc.
- Mobile-first responsive design; validate at 390px, 768px, 1366px, 1920px.
- Preserve behavior of "zero versus ausencia" (absence vs. zero value).

## Development Principles
- Audit before and after changes.
- Verify code quality, clarity, and consistency.
- Check accessibility (focus, contrast, screen reader).
- Ensure responsiveness across standard breakpoints.
- Monitor performance (avoid redundant calculations, orphan listeners).
- Assess risks (data, persistence, compatibility).
- Check for regressions (manual and functional).
- Test only directly related files and general suites required by phase or governance.
- Review full diff before committing.