# Trabalho aberto

## V278O — sanitização publicável validada localmente (2026-09-28)

- A branch `integration/v278o-privacy-safe` parte do `origin/main` `179ea6269a04d5075b655d829645b53ffd200741` em worktree isolada. O delta está sendo reaplicado por arquivos revisados, sem incorporar a ancestralidade local V278M.
- Relatórios financeiros e metadados privados de recuperação foram preservados fora do Git; documentos públicos foram sanitizados. Referências visuais sem proveniência pública comprovada permanecem privadas e não fazem parte do conjunto publicável.
- Validação local: geral 249/249, moderna 815/815, direcionada 29/29, builds e `qa:all` PASS; smoke em sete larguras sem overflow/erros. `npm audit` registrou seis advisories somente em dependências de desenvolvimento, sem caminho de produção; manter acompanhamento de segurança.
- Não houve alteração financeira/fiscal, atualização de dependências, commit, push, PR, merge ou deploy. Próxima ação: revisão final de privacidade/integração Codex antes de qualquer autorização remota.

## V278K — certificação local final

- Os commits locais incluem a reconciliação dos caminhos antigos e o teste QA
  de isolamento de origem sem perfil autenticado. A documentação V278K registra
  os gates executados; repetir diff-check e `git fsck --full` após o commit
  documental final.
- Branch local está divergente de `origin/main` (4 commits remotos à frente da
  base e 6 commits locais exclusivos neste checkpoint). Não fazer merge/rebase,
  push ou PR nesta missão. A próxima ação é certificação read-only V278L.
- Preservar os cinco worktrees registrados, 92 caminhos locais classificados e
  o resíduo V245 bloqueado pelo host. Nenhum dado financeiro foi escrito.

## V278E — handoff para certificação final

- A auditoria read-only está documentada em `PROJECT_STATE.md`,
  `CURRENT_PROJECT_MAP.md` e `STORAGE_AND_WORKTREE_POLICY.md`. QA atual usa `scripts/qa/`; menções
  históricas a `tools/qa/` foram classificadas, sem reescrever a história.
- Nenhum diretório foi removido: o host bloqueou as remoções de V206/V264 e a
  tentativa anterior no V265 vazio. Preservar V245 (nove arquivos QA únicos),
  post-PR418 (conteúdo divergente), temporário não identificado e demais
  worktrees até prova de ownership/preservação.
- Não fazer staging/commit/push/merge/GC nem escrever dados financeiros. Próxima
  ação: certificação final read-only por Codex; retornar ao produto somente
  depois de revisar a mistura de alterações e arquivos não rastreados.

## V278C — checkpoint histórico

- Execução no checkout canônico, branch
  `feature/v278c-canonical-state-reconciliation`, HEAD
  `469596644322c1bd13b8d359c91e8aedacb520ef`; `origin/main` é apenas o tracking
  ref local `179ea6269a04d5075b655d829645b53ffd200741` e não foi atualizado.
- 12 worktrees registradas e 17 diretórios físicos imediatos; preservar seis
  entradas não registradas e todos os resíduos. Nenhuma remoção ocorreu; tentativa
  de remover diretório vazio V265 foi bloqueada pelo host.
- Não fazer commit/push/merge/GC, não apagar artifacts, nem executar backup real.
  Próximo gate: validação final de testes/build/QA e diff depois da reconciliação
  documental.

## Previous roadmap snapshot — superseded by the V278E handoff above

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
