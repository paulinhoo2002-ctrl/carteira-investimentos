# V341 — Especificação: consolidação pós-merge V333/V336 e reconciliação documental

Versão: v1 · 2026-10-08 · Missão V341.1 (governança e consolidação pós-merge)

## Objetivo

Consolidar o estado pós-merge das PRs #459 e #460, reconciliar a documentação da
PR #461 com a `main` vigente, auditar os deltas próprios das PRs #457/#458
contra `main` e registrar gates frescos, sem introduzir regressão financeira.

## Escopo

- Somente documentação (`docs/ai/*`) e verificação; nenhuma mudança de runtime.
- Worktree isolada `C:\Projetos\carteira-investimentos.worktrees\v341-final-consolidation`,
  branch `codex/v341-final-consolidation`, base `origin/main`.

## Estado confirmado (fonte: git/GitHub em 2026-10-08)

- `origin/main = 6eb69f28b195c56a14c506bafc477f9bb52cbcdb`.
- PR #459 MERGED (merge commit `09f45677fd13b8d2c05da5ad43c752549c0f2950`):
  V333 cobertura mensal de dividendos, filtro PAID-only em views de recebidos.
- PR #460 MERGED (merge commit `6eb69f28b195c56a14c506bafc477f9bb52cbcdb`):
  V336–V339 acessibilidade/rolagem por teclado da tabela de Ativos + correção
  do submenu de Relatórios a 768 px; apenas `index.html` e
  `tests/v289-visual-regression.test.js`.

## Auditoria de deltas — PRs #457/#458 contra main

Método: `git diff origin/main <head>` (two-dot: mostra o que o merge traria).

- PR #457 (head `ead2799`, base `codex/local-test-mode-hardening`): conteúdo
  substancialmente sincronizado em `main` via #459. O diff two-dot restante
  REMOVE funcionalidade do main — em particular `dividendReceivedRows()`
  (filtro PAID-only em resumo por ativo, visão por ativo e matriz mensal) e a
  proteção `stateOf()` que classifica estado ausente como `UNKNOWN` (não PAID).
  Mesclar causaria regressão financeira (`EXPECTED != RECEIVED`,
  `UNKNOWN != ZERO`). **SUPERSEDED — não mesclar.**
- PR #458 (head `e809d3c`, base `codex/v333-premium-product-finish`): conteúdo
  reaplicado no main via #460 (rolagem/teclado/toque + submenu 768 px). O
  diff two-dot restante remove `assets-table-wrap` acessível, testes V289
  correspondentes e regras de wrap do submenu. **SUPERSEDED — não mesclar.**
- PR #461 (head `d386e37`, base `main`, docs-only, CI verde): registrado antes
  dos merges de #459/#460; descreve #460 como OPEN/DRAFT, o que agora é
  obsoleto. O delta próprio (3 blocos de docs) é factualmente correto para o
  momento em que foi escrito, mas contradiz o estado pós-merge. Reconciliar em
  vez de duplicar (feito nesta V341); fechar/rebase da #461 é decisão humana.

## Gates frescos no `6eb69f2` (worktree V341, `npm ci` limpo)

- `npm test` geral: 867/867 PASS (12 suítes encadeadas), 0 fail.
- `npm run test:modern`: 823/823 PASS.
- Focados V342: `v333-dividend-month-coverage`, `v333-passive-income-coverage`,
  `v289-visual-regression`: 30/30 PASS (inclui 16/16 do V289 visual: teclado,
  toque, submenu 768 px, axe dark/light).
- `npm run build` (legacy) e `npm run build:modern`: PASS.
- `qa:all`: PASS — smoke 7 larguras (390/430/768/1366/1440/1536/1920),
  `OVERFLOW=0`, `CONSOLE_ERRORS=0`, `PAGE_ERRORS=0`, `REQUEST_ERRORS_RELEVANT=0`.
- `git diff --check`: PASS.

## Invariantes financeiros verificados (V342 spot-check no HEAD)

- `stateOf()` em `dividend-intelligence.js`: estado ausente → `UNKNOWN`
  (nunca `PAID`); ANNOUNCED/DECLARED/EXPECTED separados de PAID.
- `dividendReceivedRows()` em `index.html`: só `classify==='PAID'` entra em
  resumo por ativo, visão por ativo e matriz mensal.
- `coverageOf()`: sem registros → `UNKNOWN`; desigualdade → `PARTIAL`/
  `UNAVAILABLE`; `FULL_COVERAGE` exige igualdade estrita.
- Nenhuma violação reproduzida; nenhum teste RED novo. `NOT_TESTED != PASS`.

## Limites

- Somente Chrome local; Firefox/WebKit, persistência autenticada e produção
  não certificados nesta missão.
- QA sintético (`testMode=1`); nenhum dado financeiro real foi lido como
  insumo de teste ou gravado.
- Fechamento de PRs históricas, merge, deploy e escrita financeira real
  permanecem sob gate humano.

## Flags

`REAL_WRITES=0` · `REAL_IMPORT=false` · `REAL_RESTORE=false` ·
`PRODUCTION=false` · `MERGE=false`
