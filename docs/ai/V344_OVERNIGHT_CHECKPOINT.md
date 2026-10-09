# V344 — Checkpoint noturno: auditoria de PRs, reaplicação V327 e reparo de smokes

Versão: v1 · 2026-10-09 · Missão V344/V344.2 (continuação noturna autônoma)

## Estado

- Worktree: `C:\Projetos\carteira-investimentos.worktrees\v344-overnight`
- Branch: `codex/v344-overnight-consolidation` (base `origin/main` = `6eb69f2`)
- Commits (ordem): `6e47245` (V327 reapply 1/2), `5e0238a` (V327 reapply 2/2),
  `cab83fa` (fix a11y qm-ti), `9a638ce` (migração dos 3 smokes).
- Checkout canônico intocado (`f838451`, 27 arquivos sujos preservados).

## V344 — Auditoria das PRs históricas (two-dot + three-dot vs main `6eb69f2`)

| PR | Classificação | Evidência |
|----|---------------|-----------|
| #450 V327 | **REAPPLIED** | Delta próprio pequeno (+88 index, +143 teste); funcionalidade ausente no main; base V326 já merged. |
| #446 V323 | NEEDS_HUMAN_DECISION | Proteção XLSX fail-closed real e ausente do main, mas two-dot removeria testes V333; sobrepõe v324/v325 não merged. |
| #444/#441/#440 | CONFLICTING / provável superseded pelo hardening V332 (#456) | Base V320 antiga; two-dot removeria 5,7–7,6k linhas. Reavaliar antes de decidir. |
| #455/#454 V331 | SUPERSEDED | Herdado da auditoria V341. |
| #461 | candidata a encerramento | Docs descrevem #460 como OPEN (obsoleto pós-merge); não fechada. |
| #462 | aguarda revisão humana | CI 5/5 verde. |

## Reaplicação V327 (transação manual: taxas + PnL realizado fail-closed)

- Cherry-pick limpo de `c1d799a` + `b3bee6e` (0 conflitos).
- Campos de taxas nas compras/vendas (`qm-buy-fees`/`qm-sell-fees`), validação
  de taxas >= 0 e preview de lucro/prejuízo via `quickMovementSaleRealizedPnl`
  (fail-closed: `RESULT_NOT_AVAILABLE` sem engine/preview/ticker).
- Teste focado `tests/v327-manual-transaction-entry.test.js` 13/13 PASS.

## Bug a11y pré-existente corrigido (`cab83fa`)

- `qm-ti` renderizava DOIS `aria-describedby` (hint estático + banner de erro);
  leitores de tela anunciavam o hint em vez do erro de validação.
- Correção: hint movido para `qmErrOn()` — quando o campo é inválido, o banner
  de erro é o único `aria-describedby`.
- Exposto pelo smoke inline-errors após a migração de servidor; RED 4/4 →
  GREEN 4/4.

## Reparo de infraestrutura dos smokes (`9a638ce`)

- Os 3 smokes quick-movement serviam `testMode=1` sem o marcador
  `__LOCAL_QA_RUNTIME__` exigido desde V332 (PR #456); app bootava em modo
  Firebase normal e todos os 12 casos browser davam timeout de 31s.
- Falha **pré-existente no main puro** (comprovada em worktree limpa V341) e
  fora do `npm test` oficial (por isso 867/867 não a capturava).
- Migração para `startLocalHttpServer` (padrão dos 5 smokes corrigidos na V332).
- RED 12/12 → GREEN 12/12.

## Gates frescos (HEAD `9a638ce`)

- Focados: V327 13/13 · tax-cost-basis · 3 smokes = 41/41 PASS.
- `npm test` 867/867 (12 suítes, 0 fail) · `test:modern` 823/823.
- `qa:all` PASS: OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=0, REQUEST_ERRORS_RELEVANT=0.
- `verify:release` EXIT=0, 0 falhas (inclui V330, V84, builds).
- V289 visual 16/16 (teclado, toque, submenu 768px, axe dark/light).
- `git diff --check` PASS.

## Pendências (próxima sessão)

1. Push + Draft PR da `codex/v344-overnight-consolidation` base `main`.
2. V345: auditoria financeira (compra/venda/taxas/preço médio/PnL/dividendos/RF).
3. V345.1: delta XLSX fail-closed da #446 em branch própria (sem a branch antiga).
4. V346: matriz responsiva 320–3440 px.
5. V347: unidade G: (se disponível) matriz KEEP/ADAPT/DO_NOT_COPY.
6. V348: persistência sintética + Firebase Emulator (se ambiente permitir).
7. V349: bateria final + release notes.

## Flags

`REAL_WRITES=0` · `REAL_IMPORT=false` · `REAL_RESTORE=false` · `PRODUCTION=false` · `MERGE=false`
