# M567 — Cobertura Funcional Completa e Gate Final de Release (LOCAL)

**Missão:** M567_COMPLETE_FUNCTIONAL_COVERAGE_AND_FINAL_RELEASE_GATE
**Status:** M567_1_READY_FOR_STRICT_REVIEW (local; sem publicação)
**Branch:** `codex/m567-functional-coverage`
**Base:** `e0168c0b556b8ffd57f000ce640a934493eea667` (m564, = origin/main + 9 commits)
**HEAD final:** `c08d059` (base + 3 commits M567)
**Data:** 2026-10-21 · Dados 100% sintéticos · Zero escritas hospedadas · Zero push/merge/deploy

## 1. Identidade e linhagem

- Canônico `main@9bd895df` preservado; 69 worktrees preservadas; `git fsck` sem corrupção (apenas dangling objects normais).
- `origin/main = 2764944` (= merge-base); branch M567 estritamente à frente: `origin/main..HEAD = 12 commits` (9 da linhagem m564/m562 + 3 M567). Zero commits de main ausentes.
- **PR #532** (OPEN, draft, head `d5408b1`, branch `codex/m562-dividends-passive-income-premium`) é ancestral do HEAD M567 — a publicação futura da M567 **subsume** a #532.
- `git diff --check` limpo; working tree limpa (só `tests/.qa-state/`, gitignored).

## 2. Backup gate

`tests/v324-backup` 17/17 e `tests/backup-restore` 16/16 **PASS sem** `C:\Projetos\_backups\carteira-investimentos` — nesse HEAD a bateria não exige o diretório; ele é apenas `DEFAULT_ROOT` operacional de `scripts/maintenance/backup-verify.js` (cron pausado). Nenhum diretório criado, nenhum backup tocado, `BACKUP_HEALTHY` NÃO declarado.

## 3. Commits locais (autorizados; sem push)

1. `1e1a4d0` — `test(m567)`: suite E2E `tests/m567-functional-coverage.e2e.test.js` (13 testes) + wiring de suites órfãs na bateria (v317, v346, a11y-functional → `test:functional-e2e`; authenticated-a11y-root-cause, quick-movement-modal-a11y → `test:ui`; v346 → `test:visual-regression`).
2. `4a0b0c4` — `fix(m567)`: bump tipográfico 8px/8.5px→9px (85 regras CSS) — corrige floor de leitura mobile.
3. `c08d059` — `chore(m567)`: probes de auditoria preservados em `tests/qa-probes/`.

## 4. Bateria final no HEAD `c08d059` (códigos de saída reais)

| Gate | Resultado | Exit |
|---|---|---|
| `npm run verify:release` (npm test completo + test:modern + qa:all + visual-regression c/ v289+v346) | 2061 tests / 2061 pass / **0 fail** (19 blocos `fail 0`) | 0 |
| `npm run test:auth-access-browser` | 5/5 | 0 |
| `npm run test:ir2026` | 197/197 | 0 |
| `git diff --check` | limpo (só avisos CRLF cosméticos) | 0 |
| `test:functional-e2e` (v317+m567+a11y-functional, dentro do npm test) | 39/39 | 0 |
| `test:backup-restore` + `test:v324-backup` standalone | 33/33 | 0 |

Duas execuções completas de `verify:release` (pré e pós-fix tipográfico): ambas 2061/2061 fail 0.

## 5. Matriz por rota (20 rotas renderizáveis; 120 checks = 20×3 viewports×2 temas)

Metodologia: probe `tests/qa-probes/m567-route-audit.js` (render, overflow, pageerrors, console, fontes, disclosures, Hide Values) + suites E2E sintéticas + bateria. Evidence: `tests/.qa-state/m567/route-audit.json`.

| Rota | Fluxos existentes executados | Resultado |
|---|---|---|
| dashboard | render 6 combos; quick compra/venda/provento/RF (v317); hide-values 24→0, 0 vazamentos attrs; período | PASS |
| patrimonio | meta patrimônio 500000→0 (#mp-head-target); render; fontes under9 15→0 | PASS |
| ativos | editar/salvar/cancelar ativo (edA/svA/clA, 1 persistência); venda (v317); filtro classe; hide-values 15→0 | PASS |
| ranking | renderer ativos; render 6 combos | PASS |
| aportes | editar lançamento (edP/svP: qty/price, erro validação, cancelar); rmP c/ confirmação accept+reject; deleteMovementLaunch ambos tipos; filtros/sort/página | PASS |
| metas | meta patrimônio; meta renda passiva (mensal+divGoal sync); toggle tipos provento; modal alocação open/close | PASS |
| dividendos | registrar/cancelar provento; rmD c/ confirmação; filtro ano; matriz mensal (suites dedicadas); hide-values 13→0 | PASS |
| desempenho | renderer ativos; render | PASS |
| renda-fixa | aplicação→aporte→resgate parcial (saldo 1000→1100→900, v317); editor RF; fontes under9 29→0 | PASS |
| irpf | steps 1–4 com clamp; export CSV capturado (nome+conteúdo) | PASS (export PDF não executado — headless) |
| rentabilidade | render; períodos leitura | PASS |
| ajudar (Rebalancear) | render; cenários `addRebalanceScenario` não executados (mutação menor, sessão) | PASS (parcial) |
| auditoria | render; ações dataQuality não executadas; fontes under9 218→0 | PASS (parcial) |
| confiabilidade | render; fontes under9 168→0 | PASS |
| relatorios | setReportsPeriod year/all/inválido→12m; render; **resíduo 8.3px eixo de gráfico (1 nó)** | PASS c/ MINOR |
| corporate-eventos | render (sync é network-dependent — bloqueado em sintético) | PASS (render) |
| importacao | CSV: ler→revisar→cancelar (zero gravação)→aplicar c/ confirmação (writeCount 1)→duplicatas detectadas (v317) | PASS |
| ia | render; foco AIFocus existe | PASS (render) |
| analise | render; alertas fontes under9 14→0 | PASS |
| settings | tema claro/escuro toggle; hide-values; saveConfig no-op testMode (storage preservado) | PASS |

**Invariantes de confirmação verificados:** toda exclusão exige `confirm()` (mensagem capturada); confirmação negada = estado intacto; gravação financeira só após confirmação (1 `save()` por confirmação); zero escritas externas (rotas não-locais bloqueadas, `assertNoOutboundWrites`); localStorage `civ5`/`civ5_cfg` preservado em toda a suite.

## 6. QA visual (FASE 6)

- **Overflow:** 0/120 checks com overflow horizontal.
- **Pageerrors/console:** 0/120.
- **Fontes:** bump 8px→9px (85 regras) reduziu textos <9px de ~550 nós para **1** resíduo (eixo de gráfico 8.3px em relatorios@390, interno do chart). Micro-labels 9px permitidos pelo floor.
- **Geometria pós-bump:** v289+v346+touch-targets+tablet/mobile-overflow+safe-area = 57/57.
- **Disclosures abertos por padrão:** 22 combos (metas:1, auditoria:2, analise:2, renda-fixa tablet/desktop:1) — padrão consistente entre temas; contratos v346/V84 verdes; classificado MINOR (decisão de UX, não defect de teste).
- **Hide Values:** dashboard 24→0, dividendos 13→0, ativos 15→0; 0 vazamentos em `aria-label`/`title`.
- **Temas:** claro/escuro alternados e restaurados em todas as rotas auditadas.
- **Nota visual:** não declarada 10/10 — ver defeitos remanescentes.

## 7. Classificação de defeitos

- **Falhas novas (desta missão):** nenhuma BLOCKER/MAJOR. 4 falhas iniciais eram de harness do teste novo (seletor ambíguo, painel inline, `<details>` fechado) — corrigidas na própria suite.
- **Preexistentes corrigidos:** floor tipográfico 8px/8.5px (85 regras) — commit `4a0b0c4`.
- **Preexistentes remanescentes (MINOR):** (1) eixo de gráfico 8.3px relatorios@390; (2) disclosures abertos por padrão em 4 rotas; (3) `saveDivGoal`/`saveMetaAtivos`/`saveMetaPatrimonio`/`saveMetaProventos` são código morto (IDs inexistentes, sem invocação) — risco latente de zerar metas se algum dia forem ligados; recomenda remoção em fase própria.
- **"15 falhas antigas de contratos de fonte e 2 de renda fixa":** NÃO REPRODUZIDAS neste HEAD — bateria 2061/2061 fail 0 (incluindo suites de contratos de fonte e RF). Se existiam em HEAD anterior, ficaram resolvidas nos commits m563/m564.
- **Limitações de ambiente:** export PDF (IRPF/relatórios) e sync de corporate-events não executáveis em headless/sintético; produção autenticada fora do escopo (QA autenticado somente leitura permanece recomendado como passo pré-publicação humana).

## 8. Segurança adversarial (FASE 8)

- Zero escritas hospedadas: roteamento bloqueia toda origem não-local; `HOSTED_FINANCIAL_WRITES=0`.
- Sem push/merge/deploy/force-push/billing; main intocado; worktrees irmãs intocadas.
- Fórmulas financeiras, Auth, Firebase, Rules, `sw.js`, `modern/src|dist`: **zero alterações** (diff = CSS de fonte + testes + scripts npm).
- Invariantes preservados: UNKNOWN≠ZERO, PARTIAL≠COMPLETE, RECEIVED≠DECLARED/EXPECTED, CERTIFIED_SUBTOTAL≠PORTFOLIO_TOTAL (suites financeiras verdes).
- Regressões: 2061/2061 em duas execuções completas no mesmo dia.

## 9. Plano de publicação única (sujeito a aprovação expressa)

1. Revisão humana deste relatório + capturas.
2. `git push origin codex/m567-functional-coverage` → **1 Draft PR** para `main` (subsume PR #532 — fechar #532 como superseded APÓS o merge da nova).
3. CI roda (PR cria 1 run; preview Vercel suprimido pelos guards de zero-custo — verificar `Preview: BLOCKED_BY_POLICY` no bot comment).
4. Pós-CI verde: QA autenticado somente leitura em produção atual + smoke pós-deploy após o merge (auto-deploy da Vercel a partir de `main`).
5. Gates de deploy: identidade do projeto Vercel `prj_a4SYCPWPqm0c2oaNF7iLEKf6wX47` / domínio `carteira-investimentos-delta.vercel.app` (verify-deploy-identity na máquina que publicar).
6. Rollback: alias anterior (PRIMARY) ou redeploy do último commit certificado (FALLBACK).

**Artefatos:** `tests/.qa-state/m567/route-audit.json` + 7 PNGs (`m567-{desktop1366,mobile390,tablet768}-*.png`); logs de bateria em `$TMPDIR/m567-*.log`; probes em `tests/qa-probes/`.

## 10. M567.2 — Zero visual debt (2026-10-21, HEAD `ac874ee`)

**Correções:**
1. **Dropdown nav "Relatórios" preso aberto** (defeito real: painel de 202px aberto por padrão na rota auditoria em desktop/tablet): removida a injeção `open` condicionada à rota em `navTabGroup`; menu agora abre por mouse/toque/teclado como qualquer disclosure; grupo ativo continua destacado (`parentActive`). Contratos atualizados no mesmo commit: `audit-visual-canon` (pin do novo default-collapsed) e `v289` (setup abre via summary; asserções de intenção intactas) — v289 26/26.
2. **Texto 8.33px em relatórios@390** (raiz: `<small>` com fator `smaller` do browser sob pai 10px em `.reports-next-maturity`): clamp localizado `font-size:max(.833em,10px)`. App inteiro: **0 textos <9px em ambos os temas**.
3. **Disclosures default-open remanescentes classificados BY_DESIGN/essenciais:** metas (Distribuição = conteúdo principal), analise (alertas de concentração/risco — missão exige visíveis), renda-fixa@≥768 (painel de filtros sem gatilho no desktop — recolher tornaria filtros inacessíveis).

**Código morto (FASE 4):** `saveDivGoal`/`saveMetaAtivos`/`saveMetaPatrimonio`/`saveMetaProventos` = DEAD_CODE_VERIFIED_UNREACHABLE (0 refs estáticas além das definições; 0 invocação dinâmica window[]/eval/template; 0 testes; 0 módulos sw/modern/scripts). Não removidos nesta missão (escopo visual); recomendação: remoção em fase própria de limpeza.

**Preexistente (não regressão):** `utility-touch-targets.smoke.test.js` (4 falhas idênticas em `e0168c0` prístino — suite órfã de npm/CI com drift de contrato de boot; `#investBottomNav` existe e todas as suites de navegação reais passam). Classificado PREEXISTING_HARNESS_GAP.

**Rotas (FASE 5):** 20 rotas reais + 1 alias (`rebalancear`→`ajudar`, verificado) + 2 renderers compartilhados (ranking/desempenho → ativos). Aceitação: verificação de overflow/erros/fontes/temas em 120 checks (20×3×2) + interações E2E certificadas em 10 rotas com fluxos de mutação; rotas somente-leitura (rentabilidade, ajudar, confiabilidade, ia, corporate-eventos, analise, auditoria) certificadas em render/navegação/teclado — suas ações de mutação de menor alcance (cenários de rebalanceamento, ações de qualidade de dados, sync B3) permanecem não executadas em sintético e não recebem nota de interação completa.

**Bateria final no HEAD `ac874ee`:** `verify:release` 2061/2061 fail 0 (exit 0; inclui npm test completo, test:modern, qa:all+smoke, visual-regression com v289+v346); `test:auth-access-browser` 5/5; `test:ir2026` 197/197; `git diff --check` limpo. Auditoria de rotas re-executada: 120/120 render, overflow 0, pageerrors 0, console 0; Hide Values 0 vazamentos.

**Commits M567.2:** `ac874ee` (fix disclosures + tipografia + contratos + probes) + commit de documentação.


## 11. M568 — Revisão adversarial noturna da PR #533 (2026-10-22, PR head d018a6f)

**Causa-raiz crítica corrigida (CI):** o job "Build and test" roda `npm test`, que passou a incluir `test:functional-e2e` (primeiros suites de browser da chain). No CI, `CHROME_PATH` é resolvido DEPOIS do npm test → path Windows fixo → `chromium.launch` falhava antes de `openApp` retornar → finally em `app` indefinido → cada teste vazava um servidor HTTP → node --test travava até o timeout de 60min (CI da main histórica: 2-3min). Fix: resolução multi-plataforma de browser (env → Windows → Linux), skip graceful sem browser, e `openApp` leak-proof (fecha o harness se o launch falhar). Prova: CHROME_PATH inválido falha em segundos (antes: hang); CI real: run travado cancelado pelo push, novo run **SUCCESS** nos 3 checks.

**Achados corrigidos:** 3 summaries sem floor 44px (rentabilidade ×2 @19px, auditoria "Mais filtros" @38px) — inline `min-height:44px;display:flex;align-items:center`. Verificado: todos os alvos de produção ≥44px em 320-430px (resta apenas o botão do banner TESTE LOCAL, inexistente em produção).

**Cobertura fechada:** `tests/m568-provento-edit.e2e.test.js` (2 testes) — editar provento (svD 1 persistência; clD preserva original). Lacuna FASE 8 eliminada.

**Auditoria global:** 20 rotas × 10 viewports (320-1920) × 2 temas = 400 checks: render 0 falhas, overflow 0, pageerrors 0, console 0, fontes <9px 0; disclosures default-open apenas os BY_DESIGN (metas/analise/renda-fixa@≥768). Filtro de períodos: 6/6 chips focáveis com outline visível, rótulo completo após scroll-into-view, touch OK.

**Bateria final (árvore = d018a6f):** verify:release **2064/2064** (inclui 2 novos testes), auth-browser 0 fail, ir2026 197/197, diff-check limpo. CI remoto: 3/3 checks SUCCESS (Build and test + V289 + Auth/Firestore emulator).

**AUTHENTICATED_QA=BLOCKED** (sem sessão legítima em contexto sintético autônomo; recomenda-se QA autenticado somente leitura pré-merge como passo humano).
