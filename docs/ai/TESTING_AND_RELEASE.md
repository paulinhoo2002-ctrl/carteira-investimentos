# Testing and Release

## Phase 3 final usability gate (2026-09-06)

- Required widths: 390, 430, 768, 1366, 1440, 1536 and 1920 px.
- Audited routes: Dashboard, Ativos, Aportes, Dividendos and Renda Fixa.
- Route state, page errors, request failures and document/body width were
  clean at every audited combination.
- No critical mobile action was below 44 px. A small desktop sort-label span is
  auxiliary text inside its control, not an action failure.
- Interactive chart checks remain semantic: focusable data points, labels,
  titles and tooltips. Synthetic Ativos timings are a trend baseline.

## Test commands

| Suite | Command | Purpose | Baseline |
|---|---|---|---|
| Static/build | `npm test` | Main build plus legacy/core/integration/regression suites | Current project baseline previously observed: 75 passing; rerun before release |
| Modern | `npm run test:modern` | Readonly React/Vite host, bridges and modern contracts | Previously observed: 750 passing; rerun before release |
| Finance | `npm run test:finance` | Finance Core contract suite | Previously observed: 80 passing |
| Persistence | `npm run test:persistence` | Persistence Core contract suite | Previously observed: 31 passing |
| Static build | `npm run build` | Required legacy files exist | PASS in recent release validation |
| Modern build | `npm run build:modern` | Vite production build | PASS in recent release validation; warnings do not replace investigation |
| Diff hygiene | `git diff --check` | Whitespace/error guard | Required before commit/review |
| Phase 4I prewrite | `npm run qa:phase4i:prewrite` | Authenticated native click plus protected sandbox; no real write | Required before a pilot authorization |
| Phase 4I browser | `npm run qa:phase4i:browser` | Authenticated surface at seven viewports via local QA CDP | Required for the protected surface gate |

Counts above are recorded baselines from the latest project state, not a claim
that this documentation-only audit reran every suite.

The Phase 4I prewrite command must report no snapshot, mutation, save or sync.
The local static server may return an expected 404 for `/api/yahoo-quote`; the
Phase 4I browser check records it separately and fails only on errors relevant
to the protected surface.

For August provider v2, every readiness/prewrite/manifest must preserve the
exact accounting `24 = 20 linked + 1 new + 2 excluded + 1 deferred ambiguous`.
KNUQ11 must remain `DEFERRED_AMBIGUOUS_NO_OP` with zero mutation and zero
financial delta. Tests must reject a forced 21st link, proximity-only matching,
missing provider bindings and any hidden/deleted source row.

## Browser QA contract

Codex obtains local evidence with Browser Harness/Playwright when a browser
change is in scope. Required viewports are 390x844, 430x932, 768x1024,
1366x768 and 1920x1080. Check navigation, tabs, filters, disclosures, dialogs,
keyboard/focus, bottom nav, sidebar, sticky/fixed surfaces, overflow, clipping,
console errors, page errors and relevant request failures.

Required acceptance fields:

```text
OVERFLOW=0
FINANCIAL_CLIPPING=0
CONSOLE_ERRORS=0
PAGE_ERRORS=0
REQUEST_FAILURES=0
```

Screenshots are local evidence and must not be committed when temporary.

## Release and Git safety

- Confirm repository, branch, HEAD, `origin/main` and status before work.
- Preserve dirty work and historical untracked files.
- No reset, restore, clean, automatic stash, rebase or force push.
- Commit, push, PR, merge and deploy are separate gates. This audit performs
  none of them.
- Project governance requires explicit authorization before irreversible
  release actions; merge/deploy remain separate even when CI is green.
- Prefer normal pushes and squash merge only when the approved release phase
  explicitly authorizes them.

## Production

- Recent project release history records the Vercel production URL as
  `https://carteira-investimentos-delta.vercel.app`.
- Automatic deployment is observed through the hosting/PR checks; manual deploy
  is prohibited without explicit authorization.
- Production browser QA may be blocked by authentication. Record `AUTH_GATE`
  rather than treating an inaccessible authenticated screen as a product error.
- Never edit real data during smoke validation.

## Visual reference approval gate

Visual freezes require explicit comparison against the screen's
`PRIMARY_CANON`, concise local screenshot evidence, and browser validation at
all five canonical widths. A passing test/build suite confirms functional and
build health; it does not by itself constitute visual approval. Secondary
quality references may refine finish only when they do not conflict with the
primary information architecture.

## Rollback safety

Use Git history and the existing backup/import contracts. Do not delete or
rewrite historical files to make a check pass. A failure in a protected domain
is a stop-and-report event, not a visual workaround.

## Recovery PREAUTH and POSTWRITE gate

`protected-recovery-authorization-contract.js` is the executable gate source.
PREAUTH validates identity, hashes, plan, rollback, marker serialization and
durability in a disposable persistent profile; it does not require the real
target to exist. After the one authorized local write, POSTWRITE requires two
complete `Browser.close` lifecycles, restart on the same profile and origin,
target and marker survival, stale-cloud blocking, three-tab parity, unchanged
cloud and false queue/sync flags. Reload or a new tab without full browser
process termination is not durability certification.
# QA autenticado persistente

Use o perfil canônico `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-authenticated`
com CDP localhost na porta 9233. Os comandos são:

- `npm.cmd run qa:browser:start`: inicia ou reutiliza o navegador QA canônico.
- `npm.cmd run qa:browser:stop`: encerra somente a instância identificada nessa
  porta depois de provar `user-data-dir`, `Default` e porta em
  `chrome://version`; usa somente CDP `Browser.close` e espera o CDP encerrar.
- `npm.cmd run qa:auth:status`: verifica navegador, CDP, autenticação, cloud e
  aba autoritativa sem modificar dados.
- `npm.cmd run qa:auth:pending`: mostra gates autenticados pendentes.
- `npm.cmd run qa:auth:resume`: reexecuta somente os gates pendentes quando a
  autenticação voltou; sem login, preserva a fila e retorna `AUTH_INTERACTION_PENDING`.

Autenticação ausente não bloqueia suites unitárias, fixtures, sandbox, builds,
QA visual não autenticado ou análise estática. Somente leituras Firebase,
cold boot autenticado e prewrite real são deferred. `.qa-state/` é local e
  ignorado; nunca deve conter cookies, tokens ou dados privados.

## Root hygiene gate (2026-09-12, V5R)

- Check: `node scripts/root-hygiene-check.js` (fails if `.browser-harness-*`
  dirs appear in repo root).
- All browser-harness temp state MUST be created outside the repo, under
  `%TEMP%\CarteiraInvestimentos\browser-harness\`. The central policy lives in
  `tools/qa/harness-paths.js` (`HarnessPaths.envFor()`); QA scripts must import
  it instead of defaulting to `process.cwd()`.
- Canonical QA profile stays at
  `%LOCALAPPDATA%\CarteiraInvestimentos\qa-browser-authenticated` (outside repo).
- See `docs/ai/ROOT_HYGIENE.md` for allowed root categories and writer policy.

## Class C read-only gate

`npm.cmd run qa:phase4h:classc-prewrite` conecta ao navegador QA autenticado,
reconstroi o plano donor e executa o executor oficial Class C tres vezes em
dry-run. Deve retornar passes identicos, 12 callbacks callable, 4/95/2
 operacoes, estado sem mutacao e nenhuma persistencia/sync. O comando nunca
 consome autorizacao nem executa correcao real.

## V50 boot hydration gate

Registrar fingerprint e marcador iniciais e confirmar que o boot QA protegido
não escreve `civ5` ou `civ5_authority`. Durabilidade exige duas reinicializações
completas no mesmo perfil; writes auxiliares do Firebase/Chrome não contam
como mutação financeira.
