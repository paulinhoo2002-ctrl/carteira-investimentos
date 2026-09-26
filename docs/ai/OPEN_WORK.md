# Trabalho aberto

## NOW

- V273 PR #426 is OPEN and mergeable on `feature/v273-reporting-data-quality-ops` in
  `C:/Projetos/carteira-investimentos.worktrees/v273-reporting-data-quality-ops`,
  based on V272 merge `75e77a7e98ef0768a5d4a6855b684432f09493b4`. Local tests,
  builds and seven-width Reports QA pass. Commit `7a5c5a02172126146dc19fd2a7d007d0f8b2a4ac` is on the PR; GitHub CI run 690 passed and Vercel preview is READY on the same SHA. Do not merge without separate authorization.
- V273 fixed a Reports route runtime defect: `classifier` was out of scope in
  the readiness adapter. The canonical global classifier is now resolved in
  that function and a regression test guards the mount. Full local counts and
  visual/axe evidence are in `docs/ai/PROJECT_MEMORY.md`.
- Current exact-head preview: `https://carteira-investimentos-6c0yxzvkb-paulinhoo2002-ctrls-projects.vercel.app/`; preview authentication was not tested. Any docs-only follow-up push must be rechecked for exact-head CI/preview.
- V76 flow and valuation stores are global and have no `walletId`. V272 keeps
  real-wallet `DATA_READY=false` until evidence has legitimate wallet scope;
  do not infer a wallet or expose real TWR/XIRR. Any future store/schema change
  requires its own authorized phase.
- V272 PR #425 is merged at `75e77a7e98ef0768a5d4a6855b684432f09493b4`.
  V76 still lacks wallet IDs; do not infer wallet association or mark real
  portfolio `DATA_READY`. `ENGINE_AVAILABLE` and `DATA_READY` remain separate.

- PR #417 also contains the Skills-library audit: 38 local operational packages,
  only four tracked Skill files, global-only Superpowers in this environment,
  and optional missing references documented. Recheck exact-head CI/preview.
  No Skills were installed or deleted.

- V265 PR #416 is merged to `main` as `5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`.
- Governance PR #414 is merged as `98420aea10b552264a729b8470d91ff129567640`.
- Workspace audit removed 14 confirmed-empty orphan folders and three merged, clean worktrees with exact squash-tree equivalence. No branch was deleted. One empty residual parent is OS-locked; V264 source/dependency residue remains preserved.
- Canonical local `main` is fast-forwarded to `origin/main` at `5a6a0a47`; all 335 untracked paths remain untouched. Git reports 25 garbage `tmp_obj_*` files and 169 unreachable commits; do not run GC/prune.
- Documentation reconciliation is on `docs/workspace-worktree-lifecycle`; do not merge without explicit authorization. No evidence-backed, non-blocked V266 macro-scope was selected in this audit.
- manter snapshots diários e acumular histórico confiável;
- V263 financial/source as-of provenance is merged; preserve its semantics as BCB SGS retrieval is hardened in V264;
- amadurecer dashboard e detalhes de renda fixa;
- manter cobertura pública de eventos e Import Center.

## RESOLVED BY V264 (2026-09-25)

- SGS 433 month bounds now use validated inclusive `DD/MM/YYYY` dates. Explicit provider `Value(s) not found` is no-data, not zero; other HTTP failures remain errors. A temporary 502 occurred on a live September-only probe, so do not claim every current-month provider request succeeds.

## RESOLVED BY V265 (2026-09-25)

- `tests/local-http-server.js` now reads before writing success headers; a missing generated asset returns 404 and the server remains alive.
- QA server scripts use the isolated Node static server on loopback; `qa:all` builds modern assets and runs the server contract test before smoke.

- The previously reported page-level 1886px overflow was not reproducible using the valid built-app Vite preview on either V262 or V263; the dense desktop table is internally scrollable. Treat the earlier unstyled screenshot/overflow as invalid harness evidence, not current product debt.

## NEXT CANDIDATE (readiness only)

- Reassess V266 when a real dependency is satisfied or a concrete product/QA gap is evidenced. XP/BTG remains blocked on genuine sanitized notes; TWR/XIRR needs more history; MODE_B needs provider/business input. Reports and clean-state integration are already on main; do not duplicate them.

## BLOCKED_BY_USER_INPUT

- fixture sanitizada de nota XP;
- fixture sanitizada de nota BTG.

## LATER

- TWR/XIRR histórico após dados suficientes;
- cobertura oficial FII/FIAGRO mais ampla;
- avaliação futura de MODE_B, sem ativação automática.
