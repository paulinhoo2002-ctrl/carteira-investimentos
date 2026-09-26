# V273 implementation plan — Reporting data quality and operational polish

> Execution: approved by the user. Keep all changes in the V273 worktree; no intermediate approval pause unless a material architecture change or genuine human blocker appears.

## 1. Baseline and scope lock

- [x] Verify repository/worktree/branch/base SHA and preserve canonical checkout.
- [x] Map Reports entry point, report model, V271 readiness, V272 cash-flow readiness, import capability, backup contracts, visual/test conventions.
- [x] Record exact dependency availability; installed locked dependencies in this worktree under explicit authorization.
- [x] Save `git status`, diff scope and protected-file guard before implementation.

## 2. Canonical readiness contract (TDD)

- [x] Add focused `portfolio-report-readiness` tests first: all unavailable, history-only, cashflow-only, engine available/data blocked, wallet identity absent, partial/unknown coverage, stale/unknown freshness, mixed evidence, fully evidence-ready input, malformed inputs, immutable/read-only behavior.
- [x] Implement a pure deterministic aggregator with stable reason codes and descriptive section state; no clock, storage, network, globals, calculations, or mutations.
- [x] Keep `engineAvailable` distinct from `dataReady`; fail closed on absent wallet identity and untrusted/ambiguous external-flow evidence.
- [x] Add stable reason-code-to-copy mapping tests. Keep coverage and freshness independent.

## 3. Existing model integration

- [x] Extend `portfolio-report-model.js` additively with the readiness result while preserving existing contract fields.
- [x] Adapt only canonical V271/V272 evidence and explicitly available price/import/income/backup metadata at the Reports boundary.
- [x] Do not infer missing backup dates, zero income, import completeness, wallet IDs, financial values, or freshness.
- [x] Add report-model regression tests for reason preservation, no fake zero, backward compatibility, and read-only status.

## 4. Existing Reports UI integration

- [x] Add a compact in-place “Saúde dos dados” panel with history, performance prerequisites, price coverage/freshness, cash-flow provenance, import limitations, income evidence and backup/recovery only where supplied.
- [x] Show stable reason descriptions and only feasible evidence-based next requirements; no arbitrary score, new route, or remediation/write controls.
- [x] Preserve existing visual canon and report interactions; render unknown/partial/stale states distinctly and accessibly.
- [x] Add static/UI contract tests for all diagnostic states and no direct localStorage bypass.

## 5. Verification, browser QA and review

- [x] Run focused readiness/model/V271/V272/V248 and relevant Reports tests (75/75 focused, 84/84 performance regression; latest UI contract plus responsive test 6/6).
- [x] Run required import, backup/V249, modern, general, legacy/modern build and QA suites after authorized lockfile install; actual results are recorded in project state/memory.
- [x] Exercise the Reports diagnostic panel at 390/430/768/1366/1440/1536/1920; confirm mount and no page overflow.
- [x] Run axe at 390px, print/layout checks at all seven widths, console/page/network failure checks and visually inspect representative screenshots.
- [x] Perform separate Codex technical and visual reviews. GLM/Kimi/Hermes unavailable; no independent model review is claimed.
- [x] Recheck zero financial/tax writes by read-only scope, protected-path diff empty, manifests/lockfile unchanged, and `git diff --check` PASS.

## 6. Documentation and release handoff

- [x] Reconcile `docs/ai/PROJECT_STATE.md`, `docs/ai/PROJECT_MEMORY.md`, `NEXT_STEP.md`, and `OPEN_WORK.md` with verified V273 facts and limitations; append exact release evidence after CI/preview.
- [ ] Review complete diff and staged diff; stage explicit V273 paths only.
- [ ] Create focused commit(s), push normally, open/update the V273 PR, and wait for CI and preview on the exact final HEAD.
- [ ] Confirm local/PR/CI/preview SHA consistency, mergeability, and no merge performed; stop at human merge authorization.

## Reviewer focus

- Readiness false-positive paths, especially `walletId` and ambiguous flow handling.
- Unknown/null collapsing to zero or partial/stale upgrading.
- Inaccurate backup/import/income evidence claims.
- Coupling between report UI and storage/network/global state.
- Backward compatibility of `PortfolioReportModel`.
- Mobile density, semantic status, contrast, keyboard focus and overflow.
- Financial/tax/persistence/schema/write boundaries.
