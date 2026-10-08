# Next Step

## V333 — cobertura mensal aprovada e implementada

- Decisão humana: ausência de registros não comprova zero. A matriz e os cards distinguem `COMPLETE`, `PARTIAL`, `UNKNOWN`, `FUTURE`; zero exige fonte e confirmação explícita do mês inteiro. Total recebido, média completa e estimativa permanecem separados.
- Runtime atual não fornece confirmação de cobertura mensal completa. Valores registrados aparecem como parciais; média/projeção ficam indisponíveis. A integração futura dessa evidência exige fonte governada; não inferir cobertura a partir de registros vazios.
- Consumidor de insights também foi corrigido: `generateIncomeAnalysis()` não declara meta atingida quando a distância é indisponível por cobertura parcial. Teste sintético cobre a mensagem e a prioridade; HEAD atual `56c8227352ba5f392335f263556c51966d11ce66`, Preview Vercel READY. Revisar e manter a cadeia #457→#456; sem merge.

- Revisar a Draft PR #457, empilhada sobre #456. O workflow remoto CI só atende PRs com base `main`; não confundir sucesso do Vercel com execução das suítes GitHub Actions. Usar evidência local fresca e repetir CI quando a cadeia puder receber o gate remoto, sem alterar a base/mesclar automaticamente.
- Segurança mantida: somente fixtures sintéticas; `REAL_WRITES=0`, `REAL_IMPORT=false`, `REAL_RESTORE=false`, `PRODUCTION=false`, `MERGE=false`.

## V332 — runtime QA sintético local (2026-10-07)

- Certificação do produto V332 antes desta sincronização documental: SHA `732dbb1e58401c981c23f9da48b41d2faf345b7b`; CI run `37714085100` PASS (Build/test, V289 visual, Auth/Firestore Emulator); Vercel Preview READY para o mesmo SHA. PR #456 permanece OPEN/DRAFT/MERGEABLE. Worktree `C:\Projetos\carteira-investimentos.worktrees\local-test-mode-hardening`, branch `codex/local-test-mode-hardening`, base `cefc725f2378648c29593b27399a2f9bf2656db7`. Checkout canônico e PRs/worktrees #454/#455 preservados.
- O modo sintético exige marcador fixo injetado pelo servidor iniciado explicitamente com `--synthetic-qa`, host loopback exato e `testMode=1`. `testReadOnly=1` bloqueia edição, `save()`, reset e navegação persistente também em chamadas programáticas. Hidratação cloud é rejeitada; stores V76 são vazios em memória sem localStorage; backup de armazenamento corrompido não grava no modo sintético. Firebase normal permanece intacto fora do runtime local confiável.
- `npm ci` autorizado nesta worktree; manifests e lockfile permaneceram inalterados. Gates frescos: `test:local-synthetic` 26/26 e browser readonly 1/1; legado 255/255; V330 20/20; moderno 820/820; V84 4/4; A11Y 19/19; QA harness 4/4; `qa:all`, `verify:release`, build legado/moderno, V289 visual 13/13 e `git diff --check` PASS. Smoke sem overflow em 390, 430, 768, 1366, 1440, 1536 e 1920 px; V289 cobre também 360, 1024 e 1280. Browser e dados foram sintéticos; capturas ficam em `.qa-state/` (ignorado pelo Git).
- QA visual corrigiu dois defeitos observados: sinal positivo duplicado no resumo de rentabilidade por classe e métricas do resumo de classes de Ativos agrupadas/cortadas em 1366 px. Tabela Ativos permanece completa com scroll local e cards expansíveis no mobile; Dividendos mantém meses futuros indisponíveis como `—`.
- A falha inicial de CI em Reliability e quatro smokes responsivos adicionais vinham de harnesses que serviam `testMode=1` sem o marcador confiável do QA. Cinco smokes agora reutilizam o servidor compartilhado; Reliability passou localmente e no CI. `npm ci` reportou 7 advisories (3 moderados, 4 altos); `npm audit --omit=dev` encontrou 0 vulnerabilidades de produção; nenhum fix/upgrade foi executado. Avisos de build moderno sobre API CJS do Vite e contrato readonly são preexistentes. Próximo: revisão humana da Draft PR #456; não fazer merge sem autorização explícita. Sem Firebase real, escrita financeira, importação, restauração ou produção (`MERGE=false`).

## V330 — implementação publicada; aguarda revisão humana (2026-10-07)

- V329/PR #452 está MERGED no `origin/main` `0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`. O CI run `37663297762` passou no HEAD PR `f5a1dccdbc4de8fbc06dc3db92970caca535a6ad`; não foi observado workflow separado no merge SHA.
- Worktree/branch: `C:\Projetos\carteira-investimentos.worktrees\v330-reconciliation`, `codex/v330-data-source-reconciliation`, base `0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`. Implementação publicada no commit `e3b0680c231ee3b65fb47662fd3ae6ed1e38bcfc`; PR #453 OPEN/DRAFT/MERGEABLE.
- Prévia sintética/read-only preserva execuções brutas, operações agrupadas, custos conhecidos/desconhecidos e proveniência. Identidade exige corretora+número+data; quantidade positiva, precisão máxima de 8 casas e bruto conferido dentro de um centavo. Dry-run preserva ativos/notas distintos e revisão pendente bloqueia o pipeline protegido.
- UI V330 na PR: Ativos desktop mostra campos financeiros separados e usa scroll horizontal local; mobile recompõe a informação em cards expansíveis. Dividendos overview inclui KPIs, histórico mensal, evolução, ativos principais e resumo anual; KPI anual soma apenas registros classificados como pagos e permanece indisponível quando classificação/valor faltam. Dashboard, Patrimônio, Metas, Rentabilidade e Rebalancear foram capturados com fixture sintética.
- Gates locais frescos: `npm run verify:release` PASS (legado 255/255, moderno, V330 20/20, V84 4/4, V4D 11/11, `qa:all` e visual); confirmação de nota 6/6; browser V330 2/2; `test:import-center` 27/27; `test:import-xlsx` 2/2; visual 13/13 com Axe dark/light sem violações; `git diff --check` PASS. Browser sintético sem Firebase, writes locais financeiros, page/console/request errors ou overflow de página. Capturas ficam em `.qa-state/` (ignorado pelo Git).
- Medição sintética local: DOMContentLoaded 190 ms; render Ativos 3 ativos 5,8 ms; render Ativos 500 ativos 158,2 ms. Medição é diagnóstico local, não SLA.
- Auth+Firestore Emulator bloqueou antes dos testes no ambiente local Node/Java 26; CI Ubuntu com Java 21 passou esse gate no run `37689070077`. CI do HEAD `e3b0680c` PASS em todos os checks: Build/test, V289 visual, Auth/Firestore Emulator. Vercel Preview do mesmo SHA está READY; não foi feita inspeção autenticada do conteúdo remoto. `npm ci` autorizado, manifests/lockfile inalterados; auditoria: 7 achados no conjunto instalado, 0 em produção (`--omit=dev`), sem auto-fix.
- Decisão humana aprovada: `brokerNoteCanConfirm()` exige checklist legado aprovado E prontidão V330 segura. Ausência de prontidão, `HUMAN_DATA_REQUIRED`, `SOURCE_CONFLICT`, `DUPLICATE_CANDIDATE` ou `UNRECONCILED` bloqueiam com mensagem explícita. O par canônico existente `SOURCE_CONFIRMED` + `READY_FOR_REVIEW` + validação `VALID` continua aceito; metadados descritivos ausentes não criam bloqueio independente. Testes unitários e browser sintético cobrem os dois lados.
- Revisão local: `BLOCKER=0`, `MAJOR=0`; build moderno mantém avisos preexistentes de Vite/contrato readonly. CI remoto verde e deployment Preview pronto no SHA `e3b0680c`. A sincronização documental atual gera novo CI para seu próprio HEAD. Nenhum writer foi executado; merge não autorizado.
- Continuam proibidos nesta fase: real PDF/account data, real import/restore/write, produção e merge. `MERGE=false`.

## Histórico — V329 trust e insights (2026-10-07)

- V328/PR #451 foi integrada em `2d79860c9cb3a6faa7c1098119bb6c4e23af46b0`; V329/PR #452 foi integrada em `0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`. O CI registrado passou nos respectivos HEADs de PR; nenhum workflow separado foi observado para o merge SHA V329.
- A implementação V329 reutilizou os modelos de confiança/alocação/dividendos e manteve explícitos dados parciais e desconhecidos. Evidências detalhadas estão em `PROJECT_STATE.md` e `PROJECT_MEMORY.md`.

## Histórico — V328 pronta para revisão humana (2026-10-07)

- HEAD/worktree: `943449b51d8fd768246305e85aa4b24a2c27755e`, branch `v328-preparation`, 5 commits à frente de `origin/main` `8a62885ee88a3f12daee354fb79cb9d643bd9596`. PR #451 OPEN/DRAFT/MERGEABLE; CI do HEAD remoto atual, run `37647140501`, PASS. Alterações documentais desta missão ainda são locais; `V328_PREPARATION_MATRIX.md` permanece local e excluído. Exigir CI do novo SHA após push.
- Ativos e as telas Dividendos, Dashboard, Patrimônio, Metas, Rentabilidade e Rebalancear foram revalidados. Patrimônio deixa meses sem movimento como lacunas e oculta total/resultados quando valor atual ou base aplicada não são completos; sem mudança de fórmula ou persistência.
- Gates locais no HEAD acima: legacy 255/255, modern 820/820, V84 4/4, A11Y 19/19, performance 96/96, QA harness 3/3, V289 9/9, `qa:all`, `verify:release`, builds legacy/modern e `git diff --check` PASS. CI exato run `37647140501`: Build/test, V289 visual, Auth/Firestore Emulator e Vercel Preview PASS.
- `V328_STATUS=READY_FOR_HUMAN_REVIEW` para o estado de produto no HEAD remoto atual; `BLOCKER=0`; `MAJOR=0`; `MINOR=1` (avisos não bloqueantes registrados em `PROJECT_STATE.md`). A certificação do novo HEAD documental depende do CI pós-push. Não houve escrita financeira real nem deploy de produção. `MERGE=false`.
- `V328_PREPARATION_MATRIX.md` permanece local, não rastreado e excluído; não é fonte de afirmações publicáveis.
- Próximo gate: revisão humana final e autorização separada de merge da PR #451. Não iniciar V329 sem autorização de fase; sua especificação está em `V329_PORTFOLIO_TRUST_AND_INSIGHTS_SPEC.md`.

## V320 — certificação final antes do gate humano (2026-10-05)

- PR #443 permanece OPEN/DRAFT em `hermes/v320-overnight-functional-acceleration`; HEAD final `c53229e559a5843dd3181e74d0e01153e160171e`; `MERGE=false`.
- CI final run `37310346405` PASS: Build/test, V289 visual e Auth+Firestore Emulator QA.
- Evidência local no HEAD final: A11Y 19/19; V289 4/4; legado 254/254; moderno 815/815; matriz financeira V320 173/173; `qa:all` PASS; `verify:release` PASS; XLSX sintético 2/2; builds e `git diff --check` PASS.
- V288: quatro fechamentos prematuros de template literal em `index.html` impediam o boot do script inline. O gate A11Y agora inicia navegador sintético e falha quando o runtime não inicializa.
- Batch 6 certificado: B3 Posição é atualização de snapshot por identidade (ticker/nome), sem soma incremental; repetição idêntica é no-op e quantidade alterada substitui o valor. Falha de gravação bloqueia a sessão; retry exige recarga e conferência do estado persistido. Movimentação rápida, renda fixa, carteira e importações têm testes sintéticos de falha/retry ou duplo envio; o rollback de renda fixa usa snapshot anterior à mutação.
- `CorporateEventsCore.promoteExpectedToRealized()` é função pura, sem writer ou chamador de produção; sua idempotência e exigência de evidência `RECEIVED` estão testadas. Falha de `save`/retry não se aplica a esse caminho sem uma nova integração com contrato próprio.
- Em Windows local, o Firestore Emulator encerrou antes dos testes sem diagnóstico no log; o job Ubuntu do mesmo HEAD passou. O Preview Vercel está READY no SHA final; a tela pública de acesso carregou sem erro de console observado. Nenhuma autenticação nem escrita financeira real foi executada.
- V285-02 permanece uma decisão humana de semântica financeira. V319 e PRs #440/#441 permanecem intocadas. Próximo passo: revisão humana da PR #443; não iniciar Batch 7 nesta missão e não fazer merge sem autorização explícita.

## V317 — próximo passo operacional

- Gates funcionais locais sintéticos e `verify:release` concluídos; ver `PROJECT_STATE.md` e `PROJECT_MEMORY.md` para evidência e limites.
- PR #442 foi publicada em Draft e CI passou no commit de código V317. Próximo gate humano: revisão técnica independente e repetição de XLSX browser quando o SheetJS CDN estiver acessível. Não promover de Draft nem fazer merge sem resolução dos gates; merge não foi autorizado.
- `test:import-xlsx` aguarda acesso ao SheetJS CDN; não marcar como aprovado até repetição real do gate.
- testMode não substitui Firebase QA/Google Provider. O provisionamento humano da V316 segue separado; não alterar PR #440/#441.

## V310 — próximo gate de autenticação QA isolada

- `origin/main=033ebbafca6b8904f0a65f241a48cba73e89bf09` contém PR #438/V304; `v1.3.0-rc1` permanece preservada.
- O branch local V310 registra o roteamento de modelos/Skills e o desenho QA. O smoke atual de localhost compõe rotas com fixture em memória; não autentica Firebase.
- Próximo passo técnico separado: implementar e revisar um harness com projeto Firebase `demo-` e **Auth + Firestore emulators**, incluindo testes negativos de isolamento. Nenhum emulador foi conectado ao produto nesta missão.
- `HUMAN_ACTION_REQUIRED=true` para autenticação Google real em Preview: aprovar projeto Firebase QA isolado, identidade sintética e configuração Preview exclusiva. Não enviar credenciais por chat. Ver `docs/ai/QA_AUTH_STRATEGY.md`.
- Push/PR/merge/deploy e provisionamento externo continuam gates separados. `test:import-xlsx` permanece gate manual de release dependente de rede/CDN.

## V298 — próximo passo após checkpoint RC local (2026-10-03)

- O RC da branch `feature/v289-premium-visual-redesign` foi certificado localmente no base `69569adc0ec4cf58ea8cec29c6c59c4bff10d643`, após os gates frescos e correção documental do agregado 37/37 para 29/29 reproduzível.
- A decisão seguinte é humana: avaliar push/PR/merge/deploy separadamente. Esta missão não executa nenhuma dessas ações.
- Manter `test:import-xlsx` como gate manual de release, pois depende de rede/CDN; não incorporá-lo à CI offline sem missão própria.
- Preservar Phase-206 (falha de harness), Phase-198 (drift documental) e os seis demais débitos visuais/técnicos menores registrados no handoff RC.

## Próximo gate funcional após V285 (2026-09-29)

- `CURRENT_PHASE=FUNCTIONAL_COMPLETION`; `ORIGIN_MAIN=6f249bb822bb83163a39a3cb7e59ff80ab3134bb` inclui PR #432/V284.
- `V283-01_IMPORT_CENTER_WORKFLOW_COMPLETION=COMPLETE_FOR_CURRENT_APPROVED_SOURCES`: UI encaminha B3 (movimentações/posição/proventos) e nota Inter aos respectivos fluxos protegidos e writers existentes. Core genérico permanece preview-only; a confirmação de fonte é explícita.
- `XP/BTG=FIXTURE_REQUIRED`; arquivo desconhecido não é promovido a suportado. O centro aceita um arquivo por sessão.
- `NEXT_ACTION=V282-01_FINANCIAL_ACTION_END_TO_END_CERTIFICATION` (P1 acionável mais alto restante no backlog). Certificar por ação pré-condição, confirmação, persistência/reload, idempotência, cancelamento e falha com ambiente/fixtures sintéticas.
- Usar somente fixtures sintéticas nesta próxima missão. Nenhuma importação ou mutação financeira real; escrita real requer confirmação humana específica.
- Manter `UNKNOWN != ZERO`, `PARTIAL != COMPLETE`, `EXPECTED != RECEIVED`; preservar proteção contra repetição, conflito, autoridade manual de renda fixa e falha de persistência.
- Visual permanece congelado (`VISUAL_CANON_V2=FROZEN_REFERENCE`); correções visuais somente se bloquearem usabilidade do fluxo.
- Não reutilizar evidência antiga automaticamente: validar no SHA da nova missão. Não iniciar push, PR, merge ou deploy sem o gate aplicável.

### Evidência V285

- Roteamento browser sintético B3 abriu a revisão protegida; valor R$ 20,00 preservado, contador gravado zero, cancelamento sem escrita; sete larguras sem overflow, erros de página/console ou falhas relevantes.
- Testes focados 144/144; suite geral 252/252; moderna 815/815; builds e `qa:all` PASS. `confirmBrokerNoteImport()` agora persiste antes de marcar sucesso; falha restaura estado e quarentena saves posteriores.
- Sem arquivos financeiros privados ou escrita financeira/fiscal real. Nenhum push/PR/merge/deploy.

## V284 Waves D/E/F — certificação pré-commit (2026-09-29)

- `CURRENT_BRANCH=feature/v284-import-center-workflow`; `V284_WAVE_C_COMMIT=c0566104ef702c673bd060945f324c66725f517e`. Waves D/E/F foram implementadas, verificadas e commitadas localmente em dois commits.
- `V284_FINAL_CODE_COMMIT=35199013a0aadb204d7cb131151e66187c89573b` (code + test)
- Commit de memória pendente.
- A identidade de nota usa corretora/identidade preservada + data explícita válida + número estável; sem número, usa operações semânticas canônicas com ordenação independente de locale. Filename é apenas provenance. Parsing incompleto, identidade ambígua, conflito ou campo financeiro obrigatório ausente bloqueia o writer.
- Persistência financeira de importação é isolada por snapshot/restore. `save()=false` ou throw restaura estado financeiro, carteira ativa e revisão; sessão é `QUARANTINED`, sem novos saves/edições, sem sucesso falso. Se `localStorage` gravou antes de falha ao enfileirar cloud, o resultado durável local é incerto; recarregar e conferir antes de qualquer retry. A sincronização cloud não é transação atômica.
- Rotas verificadas: nota de corretagem, posição B3, proventos B3, movimentações B3 e posição de Renda Fixa; falhas mistas não deixam mutação em memória nem autoridade manual alterada. `IMPORT_BATCH_ATOMICITY=LOCAL_SINGLE_KEY_ONLY`; não alegar atomicidade cloud.
- Validação fresca: focados V284 boundary + nota Inter + Import Center + V245 105/105; persistência 32/32; roundtrip 7/7; geral 249/249; moderna 815/815; builds e `qa:all` PASS. Smoke 390/430/768/1366/1440/1536/1920 sem overflow, erro de página/console ou falha relevante de requisição. Fluxo de falha no browser não foi exercitado; testes comportamentais sintéticos cobrem o caso.
- Sem escrita financeira/fiscal real, mutação real, arquivo privado, migração ou backfill. Um commit de código+teste criado; commit de memória pendente.
- Registro histórico: `NEXT_ACTION=V284_FINAL_BRANCH_CERTIFICATION` foi superado quando PR #432 foi incorporada em `origin/main`.

## Snapshot histórico — V283 certificação antes da V285 (2026-09-29)

Este resumo atual prevalece sobre os registros V282/V283 históricos abaixo.

- **P0_TRUTH_PATH=RESOLVED; P0_END_TO_END=RESOLVED.** Cotação atual e benchmark sintético não são alcançáveis no runtime; engine/adapter falham fechados sem evidência. Isto certifica o caminho de verdade, não a disponibilidade real da métrica.
- **REAL_DATA_READINESS=UNAVAILABLE_AS_INPUTS_REQUIRE.** Identidade/cobertura/histórico/fluxos insuficientes mantêm retorno real indisponível ou parcial. `FAIL_CLOSED_ON_INSUFFICIENT_EVIDENCE=true`; isso não reabre o P0.
- Cobertura não informada agora é `UNKNOWN`; retornos numéricos exigem `FULL_COVERAGE` explícita. Engine e UI continuam sem inventar série mensal, benchmark, janela 12M ou resultado por classe sem evidência correspondente.
- Browser QA isolado com fixtures sintéticas provou o adapter/engine no renderer e o resultado agregado datado; isso **não** certifica readiness de carteira real. `WALLET_ID_UNAVAILABLE` segue bloqueante para TWR/XIRR reais.
- Botões de Aportes mapeados para handlers B3 distintos e nota de corretagem; confirmação/importação real não executada.
- Alegações anteriores de eliminação global são apenas `NO_VIOLATION_FOUND_IN_PRIOR_AUDITED_SCOPE`.
- Verificação fresca final após o ajuste auxiliar: 249 testes gerais, 815 modernos e 46 testes focados performance/V283/V248/source-audit PASS; builds e `qa:all` PASS; harness 3/3; smoke 390/430/768/1366/1440/1536/1920 sem overflow ou erro relevante.
- Suites direcionadas adicionais de backup/restore, renda fixa, dividendos, readiness de relatórios, rebalanceamento e Import Center: 78/78 PASS (há sobreposição com a suite geral).
- Browser proof usou snapshots sintéticos em memória; readiness de carteira real continua indisponível por identidade/histórico não comprovados. Nenhum arquivo financeiro privado foi acessado e nenhum dado financeiro real foi alterado.
- QA adicional: 16 rotas × 7 viewports (112/112), sem erro/overflow; axe WCAG 2 A/AA em 12 superfícies nas larguras 390 e 1366 (24 checks), sem violações. Dados apenas sintéticos/testMode.
- `tests/v283-legacy-rentability-red.test.js=SOURCE_GUARD_TESTS`, não prova reachability; `tests/v283-behavioral-runtime.test.js=BEHAVIORAL_RUNTIME_TESTS`. Browser/runtime prova implementação ativa.
- **NEXT_ACTION=V283-01_IMPORT_CENTER_WORKFLOW_COMPLETION** — item acionável existente no backlog. V283-04 permanece risco latente sem chamador de produção identificado e depende de contrato de autoridade. Nenhuma ação remota autorizada.

## V283 Core Functional Truth — WAVE A COMPLETE 2026-09-29

- **P0_ENGINE_LAYER=RESOLVED** — V281 historical-performance-engine fails closed
- **P0_LEGACY_LAYER=RESOLVED** — V283 adapter connects legacy UI to engine
- **P0_END_TO_END=RESOLVED** — Current_price leakage eliminated, synthetic benchmark removed
- Adapter: `v283-rentability-adapter.js` routes legacy `rentabilityHistory` → `HistoricalPerformance.calculatePerformance()`
- `rentBenchSeries` returns unavailable markers (no synthetic data)
- 12 behavioral runtime tests PASS (R1-R12)
- 12 source guard tests PASS (TEST_A1-B5)
- Adapter loads at runtime (HTTP 200, text/javascript MIME)
- Commit: c9f1e9c

## V283 Core Functional Truth — WAVE B COMPLETE 2026-09-29

- All 11 core surfaces audited: Dashboard, Ativos, Renda Fixa, Rentabilidade, Dividendos, Metas, Rebalancear, Relatórios, Configurações, Import Center, Aportes
- **P0_FOUND=0** — No critical financial truth violations
- **P1_FOUND=0** — No high-severity workflow blockers
- **P2_FOUND=1** — Misleading import buttons in Aportes (all 4 called importB3Excel)
- **P2_FIXED=1** — Commit 0ae82a0: fixed button handlers to call proper import functions
- **DEAD_CONTROLS_FOUND=1** — Aportes import buttons
- **DEAD_CONTROLS_FIXED=1** — Now each button calls its proper handler
- **IMPORT_CENTER: PREVIEW_REQUIRED=true, WRITES_BEFORE_CONFIRMATION=0**
- Full regression: 249 legacy + 24 V248 + 24 V283 = 297 PASS
- **NEXT_ACTION=V283_WAVE_C_STATE_HARDENING**

## V283 Core Functional Truth — WAVE C COMPLETE 2026-09-29

- **Empty states**: All 11 surfaces have explicit empty state UI (no silent failures)
- **Error states**: All surfaces show explicit error messages (no hidden errors)
- **Partial states**: Coverage/freshness properly surfaced (PARTIAL_COVERAGE, UNKNOWN, STALE)
- **Stale states**: Data freshness indicators present (IPCA diagnostics, RF manual values, import health)
- **Unknown → Zero**: ELIMINATED — adapter returns UNAVAILABLE + reason instead of numeric zeros
- **Partial → Complete**: ELIMINATED — certifiedHistory gate prevents fake completeness
- **Expected → Received**: DIVIDENDS separates RECEIVED/ANNOUNCED/IMPORTED explicitly
- **Fake Success**: ELIMINATED — Import Center requires preview + confirmation, adapter fail-closed
- **Financial Truth Invariants**: All preserved across all surfaces
- Full regression: 249 legacy + 24 V248 + 24 V283 = 297 PASS
- Builds: PASS (legacy + modern)
- **NEXT_ACTION=V283_REGRESSION_BROWSER_QA**

---

## V282 Project Memory Continuity and Skills Certification — COMPLETED 2026-09-28

- V282A vendored 25 project skills from C:/Projetos/skills to .agents/skills/
- Created PROJECT_SKILLS_MANIFEST.md with full inventory and classification
- Created SKILLS_ROUTING.md with mission-type routing table
- Updated legacy .agents/SKILL_ROUTER.md as deprecated reference
- Commit: de2fa0f
- No runtime changes, no financial logic changes, no test changes

---

## V282B Project Memory Continuity and Skills Certification — IN PROGRESS

- Certifying V282A filesystem truth
- Reconciling skill counts and tracking status
- Creating PROJECT_CONTINUITY_POLICY.md for repository-first memory
- Fixing .agents/skills gitignore issue (skills not versioned)
- Updating canonical document references in AGENTS.md

---

## Active — V282B Continuity Hardening

- Identity verified: C:/Projetos/carteira-investimentos, main, de2fa0f
- Worktrees: 8 active (including V281 at 993b9d0)
- .agents/skills is gitignored — must document re-sync procedure
- 25 source skills validated, 27 destination dirs (includes legacy/extras)

### Current State Constants
- CURRENT_PHASE=FUNCTIONAL_COMPLETION
- VISUAL_PHASE=DEFERRED
- VISUAL_CANON_V2=FROZEN_REFERENCE
- P0_ENGINE_LAYER=RESOLVED (V281 historical-performance-engine fails closed)
- P0_END_TO_END=PARTIAL (legacy rentabilityHistory still uses current-price/synthetic benchmark)
- NEXT_ACTION=V282_WAVE_B_LEGACY_INTEGRATION (connect legacy rentability to V281 engine)

---

## V281 Historical Return Truth Repair — STATUS (from prior work)

- Engine layer: RESOLVED — historical-performance-engine fails closed when priceCoverage missing
- Legacy integration: PARTIAL — rentabilityHistory() in index.html still uses S.assets.current_price and synthetic rentBenchSeries()
- V281 tests: 10 regression tests PASS (V281-01 through V281-10)
- Full suite: 249 legacy + 815 modern = 1064 PASS
- Builds: PASS (legacy + modern)
- QA: PASS (390, 430, 768, 1366, 1440, 1536, 1920)

---

## V282 Core Functional Completion Wave — PENDING

Wave A (Legacy Rentabilidade End-to-End): BLOCKED by architecture decision
- Option A: Route legacy UI through V281 HistoricalPerformance engine
- Option B: Show UNAVAILABLE/PARTIAL when dated evidence missing
- Requires portfolio history snapshots with dated quotes (verify V248)

Wave B (Core Workflow Audit): NOT STARTED
Wave C (Empty/Error/Partial States): NOT STARTED

---

### V282C Repository Reproducibility and Clean State — COMPLETED 2026-09-28

- Fixed .gitignore to track minimum required project-local skills (17 skills)
- Excluded heavy skills: browser-harness-main (3.6M), impeccable (3.0M)
- Excluded large archify-main (34M) — archify (5.6M) is canonical
- Excluded meta skills and backups
- Vendorable skills now tracked: caveman, doubt-driven-development, source-driven-development, browser-testing-with-devtools, playwright, interface-design, design-system, frontend-design, caveman-review, caveman-commit, caveman-compress, cavecrew, banner-design, brand, slides, archify, interview-me, references
- All tracked skills have valid SKILL.md and permissive licenses
- No node_modules, .git, credentials, or private data in tracked skills
- Commit: 7426250
- REPRODUCIBLE_AFTER_FRESH_CLONE=true (for tracked skills)
- PROJECT_CONTINUITY_LEVEL=4 (FRESH_CLONE_REPRODUCIBLE)

---

## Next Recommended Mission

**V282_WAVE_B_LEGACY_INTEGRATION** — Connect legacy rentabilityHistory() to V281 HistoricalPerformance engine:
1. Replace priceByTicker (current prices) with dated valuations from portfolio history snapshots
2. Replace rentBenchSeries() synthetic benchmark with normalizeBenchmark() consuming real BCB SGS data
3. Surface engine coverage/dataReadiness status in legacy UI (unavailable/partial states)
4. Ensure UNKNOWN != ZERO, PARTIAL != COMPLETE in legacy chart display

Precondition: Verify V248 snapshot capture provides dated valuations before integration.


## Active — Workspace/worktree audit closeout (2026-09-25)

- `origin/main=5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`; V265 PR #416 and
  governance PR #414 are merged. V264 PR #415 remains merged at
  `10995f31d7ada0b7f8a02e6317813de0c21fc55d`.
- Clean main validation on 2026-09-25: modern 815/815, general 249/249,
  modern/legacy builds, QA harness 2/2 and seven-width browser smoke PASS.
- Workspace audit removed 14 confirmed-empty orphan directories and three
  merged/clean worktrees with exact squash-tree equivalence. Canonical local
  `main` was safely fast-forwarded to `origin/main`; all 335 untracked paths
  remain preserved. The V264 residual and one locked empty parent remain.
- Git inspection found 25 temporary `tmp_obj_*` files (~259 MiB) and 169
  unreachable commits among 10,919 objects. Preserve all; no GC/prune is safe.
- V266 feature work is not started because no independent, evidence-backed
  scope is currently ready. Preserve ambiguous residue and Git objects. Reassess
  after real XP/BTG fixtures arrive, enough history accumulates, a provider
  decision is made, or a concrete product/QA regression appears.

### Roadmap readiness (not implementation authorization)

- XP/BTG import validation needs genuine sanitized statements from the user.
- TWR/XIRR needs sufficient defensible valuation history.
- Corporate Events MODE_B needs provider/business direction.
- Reports and clean-state integration are already on main; do not duplicate.
- Seven-width smoke passed; no concrete mobile regression currently justifies
  a new phase. Preserved audit residue is not a reason to delete or hide data.

## V263 PR #413 — historical state (2026-09-25)

- V262 is CLOSED: PR #412 squash-merged as `9be3d9c3e17b659a507e46a8f57c2b152174366b` on main; local main fast-forwarded to the same SHA.
- Active phase: V263 "Renda Fixa Freshness, Valuation & Financial As-Of Provenance" on branch `feature/v263-rf-freshness-valuation-asof` (worktree `C:/Projetos/carteira-investimentos.worktrees/v263-rf-freshness-valuation-asof`).
- At the 2026-09-25 certification checkpoint, PR #413 was OPEN/mergeable at `a617f8698692e1d541b22b54a33cd92577c7507e`; it was subsequently squash-merged as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`.
- Implementation delivered: financial as-of evidence (HIGH/MEDIUM/UNKNOWN) separated from source as-of; valuation state derives value-as-of and freshness from real evidence; UI shows confidence badges and separate as-of rows; 12 targeted tests; zero financial/tax writes; all V262 invariants preserved (IPCA+ UNSUPPORTED, manual authority, UNKNOWN != ZERO).
- Visual certification used a correct local production-like Vite preview (`build:modern` then `/host.html`): V262 and V263 were styled; all seven viewports passed with zero page-level overflow; axe-core WCAG A/AA had 0 violations; screenshots reviewed. Vercel preview remains behind per-origin SSO, so this pass is not authenticated real-portfolio QA. Earlier unstyled captures and reported 1886px overflow came from invalid asset-serving evidence.
- Existing pre-V263 data-source issue: the unchanged V262 SGS fetcher received HTTP 400 `Invalid initial date` for `dataInicial=07/2022`; this was addressed by V264, not by a change to V263 financial-as-of semantics.
- PR #413 is merged; no merge action is pending for V263.

### Post-V263 roadmap (repository-evidence based)

- SOON — Import Center productionization (V92/V93 branches exist; XP/BTG blocked by user fixtures).
- COMPLETE — Reports intelligence is present on main; the former V93 branch has no unique delta.
- LATER — Mobile experience improvement (new candidate; needs explicit scope).
- LATER — Corporate events MODE_B (needs provider decision; MODE_A active).
- LATER — TWR/XIRR history (needs more valuation snapshots; V76/V77 tracking since 2026-09-15).
- COMPLETE — `integration/clean-state-v1` has no unique delta against current main.
- COMPLETE — V264 BCB SGS IPCA request-contract hardening is merged as `10995f31d7ada0b7f8a02e6317813de0c21fc55d`.
- BLOCKED — Phase 4H Class C / August pilot (separate single-use authorizations; historical authorizations consumed).
- NOT_RECOMMENDED — reopening frozen legacy screens without regression evidence.

### Proposed next macro-phase (not authorized or started)

- `V264_BCB_SGS_IPCA_REQUEST_CONTRACT_HARDENING`
- Why now: exact local runtime evidence shows the same HTTP 400 `Invalid initial date` request on V262 base and V263, while the V263 change itself is isolated and has no visual regression.
- Dependencies: confirm the current official BCB SGS query-date format; retain sanitized deterministic fixtures; preserve request bounds/caching and V262/V263 truth semantics.
- Risk: low-to-medium if limited to public index-series retrieval; high/forbidden if it drifts into IPCA+ security valuation or manual-value override.
- Candidate acceptance: valid date range request contract; tests for date serialization and rejected/empty/error responses; freshness and coverage stay separate; no synthesized index values on failure; exact-IPCA valuation remains unsupported; CDI/manual authority unchanged; no financial writes; focused plus full required suites and browser/network validation.
- No V264 branch, worktree, implementation, or PR was created.

---

## V262 PR #412 — exact-head final certification (2026-09-24)

- Worktree: `C:/Projetos/carteira-investimentos.worktrees/v262-fixed-income-advanced-shadow-valuation`
- Branch: `feature/v262-fixed-income-advanced-shadow-valuation`
- Product-code SHA validated in authenticated QA: `26d1526389a92cc4ca94fff7bc671821f2cf0b09`.
- PR #412 remains OPEN and mergeable at the code SHA. Exact-head CI run `36079088319` succeeded; Vercel deployment `6651218341` is READY.
- Authenticated URL/path: explicitly approved branch alias, `/?protectedReadOnlyQa=1`. The V262 surface is the legacy Renda Fixa view, not `/modern/`. Login was completed manually in dedicated isolated QA Chrome; Firebase/auth/backend and the real wallet loaded.
- Runtime: manual authority preserved; exact IPCA remains `UNSUPPORTED_IPCA_EXACT`; no generic IPCA+ value; coverage/freshness remain separate and honestly unavailable/unknown; CDI unchanged; unknown is not zero.
- Responsive 390/430/768/1366/1440/1536/1920 PASS; no horizontal overflow or critical clipping. Axe 0 critical/0 serious; representative screenshots were captured and reviewed locally, not committed.
- Offline root cause: protected QA blocks canonical portfolio persistence, but old offline eligibility relied on stale `civ5` state and could select an empty wallet after an in-memory wallet switch. A separate user-bound local read-only snapshot now captures only the validated selected wallet and is restored offline. The canonical `civ5` fingerprint stayed unchanged. The product-generated cache was verified with the real authenticated selected wallet; offline fixed-income state stayed truthful and read-only.
- Reconnect restored the same selected wallet and fixed-income manual values; no request storm or reload loop was observed. Financial/tax/import-confirmation/restore writes were 0. Normal authenticated bootstrap may emit a nonfinancial access-audit update, so global backend writes are not claimed to be zero.
- Tests/builds: focused offline/snapshot/security tests PASS; general 249/249; modern 777/777; modern and legacy builds PASS. No financial formula changed.

### Next action

- Recheck that the exact current PR head has successful CI, a READY Vercel deployment, and remains OPEN/mergeable before declaring readiness.
- If final evidence is consistent, stop and request only: `Autorizo o squash merge da PR #412.` Do not merge without that authorization.

---

## Current boot state — 2026-09-22

- `CURRENT_MAIN_SHA=2e7a898f09230d2f7e3b9781040a6effe33f9c7f`
- `LAST_MERGED_PR=409`
- `LAST_PRODUCT_RELEASE=V260 Asset Detail Intelligence (PR #408)`
- `LAST_GOVERNANCE_RELEASE=PR #409 project identity hard lock`
- `ACTIVE_MISSION=NONE`
- `LOCAL_MAIN_ALIGNED_WITH_ORIGIN=true`
- `MAIN_CI_RUN=35776520025 (SUCCESS)`
- `PRODUCTION_DEPLOYMENT=6599404492 (SUCCESS)`
- `NEXT_RECOMMENDED_WORK=Refresh project state, then improve fixed-income freshness, valuation, and financial as-of provenance`
- `BLOCKED_BY_USER_INPUT=Sanitized XP and BTG statement fixtures`
- `LAST_UPDATED=2026-09-22`

The recommendation comes from `docs/ai/OPEN_WORK.md`; it is readiness only.
Do not start a new phase without explicit authorization. The historical
snapshots below are retained as evidence and are not the current boot state.

O histórico abaixo permanece como evidência; este snapshot é o estado transitório atual.

## PHASE_4I_V39_KNUQ_DEFERRED_2026-09-12

- August source accounting is `20 linked + 1 new + 2 excluded + 1 deferred
  ambiguous = 24`; the stale synthetic 21-link expectation is invalid.
- KNUQ11 remains visible as `DEFERRED_AMBIGUOUS_NO_OP`, with zero mutation and
  zero financial delta. Resolve it later only with independent immutable
  identity evidence; ticker/date/amount proximity is insufficient.
- Before any August real authorization, rerun authenticated prewrite and bind a
  fresh manifest to HEAD, source, baseline, plan, review and provider v2 hashes.
- Class C remains a separate authorization and should run first. Do not combine
  the Class C and August authorizations.

## V50_BOOT_HYDRATION_NEXT_STEP_2026-09-13

- Duas páginas novas no perfil QA protegido não escreveram `civ5` nem
  `civ5_authority`; o estado atual permanece cloud-shaped.
- O alvo V47C aparece somente em evidência histórica com marcador V1 e não é
  persistência V2 certificada. V50 corrigiu a captura do fingerprint cloud no
  boot authoritative, o fail-closed do save protegido e `--disable-gpu` no
  launcher Chrome.
- Próximo passo: concluir validações e gerar manifesto V50. Recovery real
  continua proibido sem nova autorização single-use.

## PHASE_4H_101_SOURCE_GATE_2026-09-09

- Live protected QA is proven on disposable profile `.qa-profile-recovery`,
  CDP `9244`, with authenticated cloud read and no cloud-write capability.
- Current local source is `329/329/0` and `2685096` cents; cloud is
  `430/329/101` and `3718277` cents. The exact 101-source set is proven as
  `95` donor matches, `4` KNUQ variants and `2` post-donor events.
- Fresh source-set fingerprints:
  `eee04bae63a3969e7591b22bc50ef28f95be39f7eff7102e4a99907681dc8bf4` and
  `d5776b75af941ac805069958f05095b738c2996c776993408fedcf64f7c16210`.
- Three independent read-only prewrites passed identically. Do not execute
  recovery without a new single-use authorization bound to the final HEAD.

## PHASE_4_QA_AUTH_NONBLOCKING_2026-09-08

- Usar o perfil persistente `qa-browser-authenticated` e os comandos
  `qa:auth:status`/`qa:auth:resume` antes dos gates protegidos.
- Se o login expirar, concluir todo trabalho não autenticado e registrar apenas
  os gates reais pendentes em `.qa-state/`; não pedir confirmação repetida nem
  criar outro perfil sem justificativa.
- Após login normal, retomar a fila autenticada; recuperação e piloto continuam
  proibidos sem autorização single-use própria.

## PHASE_4_AUTOMATION_FOUNDATION_2026_09_06

- Foundation audit and safety regression locks are ready for review.
- Phase 4A read-only identity/fingerprint/reconciliation helpers are now
  implemented and covered by focused tests; real import write remains disabled.
- Phase 4B historical B3 preview/reconciliation foundation is implemented with
  explicit duplicate, unsupported, conflict and review states; no portfolio
  write is enabled.
- Phase 4C historical reconstruction is implemented as a read-only layer with
  explicit cross-source conflicts and verified BUY/SELL expected positions;
  protected write design remains a future gate.
- Phase 4D professional brokerage/reporting models are implemented read-only;
  Inter note support is tested, other brokers remain explicitly partial or
  unknown, and protected write/PDF generation remain future gates.
- Next candidate is Phase 4A: a focused read-only improvement to quote stale
  status/retry or RF contextual alerts, only after confirming the exact source
  and frozen-screen boundary.
- Imports, backup resilience, cloud sync and automatic dividend writes remain
  separately gated and were not started.

## PHASE_4E_PROTECTED_IMPORT_TRANSACTION_2026_09_06

- Test-mode-only protected coordinator is implemented and covered by focused
  rollback, idempotency, stale-preview, snapshot and reconciliation tests.
- Real user import remains disabled. No production persistence path, schema,
  finance semantics or real data was changed.
- Printable reconciliation is an HTML/CSS report foundation using native
  browser PDF printing; a dedicated PDF dependency is not justified yet.
- Next step requires separate authorization for any production write design or
  Phase 4F integration; do not infer it from fixture readiness.

## PHASE_4F_PROTECTED_IMPORT_INTEGRATION_2026_09_06

- Single end-to-end fixture pipeline is implemented and tested at 1k, 10k,
  25k and 50k synthetic events.
- Source detection is conservative; B3 movements and arbitrary PDF extraction
  remain partial/review-only where the existing parser contract is incomplete.
- No import history UI or production write path was added. The report is an
  ephemeral HTML/native-print foundation.
- Real pilot readiness remains false until a separately authorized, small,
  manually verifiable pilot contract is approved.

## PHASE_4G_PROFESSIONAL_IMPORT_CENTER_2026_09_06

- The isolated `Importar dados` route is ready for visual review in test mode.
- The route uses the existing Phase 4A--4F pipeline boundary conceptually and
  exposes conservative source support, review-required states, reconciliation,
  rollback evidence and ephemeral simulation history.
- The UI performs no real import and does not persist selected files or results.
  B3 movements, arbitrary brokerage PDFs, unknown formats and insufficient RF or
  corporate evidence remain partial/manual review items.
- Existing HTML/native-print reporting is the current report boundary; a real
  pilot, persistent import history, PDF dependency or production write remains
  separately gated.

## PHASE_4G_2_IMPORT_CENTER_FINAL_CANON_2026_09_06

- Import Center visual, information and dry-run interaction contracts are
  frozen after responsive review at 390, 430, 768, 1366 and 1920 px.
- Mobile keeps the active step visible as `Etapa N de 8`; desktop keeps all
  eight steps. Empty sessions remain compact and result safety states remain
  immediately readable.
- Do not reopen this route except for bug/regression, financial/data correctness
  or explicit user authorization. Real import remains disabled.

## PHASE_4H_7_SOURCE_LINKAGE_SHADOW_2026_09_06

- The shadow source-linkage proof is committed and covered by 11 focused tests.
- B3 remains the financial source of truth; Yahoo remains reference evidence.
- Existing Yahoo records are not deleted or rewritten. Financial totals must
  count canonical economic events once, never source evidence twice.
- The next protected boundary is a separately authorized additive persistence
  design and read-only migration preview. Do not open a real pilot write gate.

## PHASE_4H_8_ADDITIVE_SOURCE_LINKAGE_2026_09_06

- Phase 4H.8 is complete in test-mode with additive canonical event IDs and
  source evidence, deterministic reimport behavior, backup roundtrip proof,
  rollback proof and no production write path.
- The August canonical financial increment is `R$ 85,37`. The `R$ 2.488,47`
  linked value is already represented and contributes `R$ 0,00` of increment.
- Phase 4H.9 and any small real pilot remain blocked until separately
  authorized source-linkage persistence and manual review gates exist.

## PHASE_4H_8_1_PROTECTED_PILOT_GATES_2026_09_06

- Gate orchestration is implemented and tested in test-mode only.
- The hard financial invariant is 8537 cents (`R$ 85,37`).
- Technical readiness does not authorize a real write; explicit user
  authorization and a separately protected persistence phase remain required.

## PHASE_3_FINAL_AUDIT_CHECKPOINT_2026_09_06

- Publish `release/phase-3-3-final` and open the review PR after the green local
  gates; do not merge or deploy manually.
- Immediate backlog: evaluate backup-age visibility without touching the backup
  engine, and monitor global-search adoption and large-portfolio timings.
- Phase 4: prioritize only improvements backed by existing data sources and an
  approved visual contract.
- Phase 5: consider virtualization only after evidence of degradation in real
  data or a measured threshold breach.
- Measure later: real-portfolio performance, transaction-to-asset usage and
  comprehension of empty/error states.

## WHERE_WE_ARE

Project memory has been consolidated for the legacy SPA plus isolated modern
readonly host. The current checkout is preserved on
`feat/visual-product-north-star`.

## WHAT_IS_FROZEN

Finance Core, Persistence Core, schema, Firebase/storage, backups/imports,
real data, identity contracts, handlers and `modern/src`.

## WHAT_IS_NEXT

`CANONICAL_VISUAL_MIGRATION_02 - ATIVOS` is complete and frozen after user
approval. The screen now follows the frozen Dashboard and Dividendos
canon with a dense professional asset table, visible individual results,
filters, sorting, hover/popover and a mobile tap equivalent. Use the Ativos
video/reference library for behavior only; do not copy external brand
identity. Any follow-up work must preserve the official financial/data
contracts.

Ativos is not to be reopened without explicit authorization. No next screen
is selected automatically; the next roadmap item requires a new scope and
explicit product authorization before work begins.

The Dashboard, Dividendos and Sidebar visual contracts are now frozen and
require explicit user authorization for redesign or reinterpretation. RF
orphan reconciliation is complete and required no recovery.

`CANONICAL_VISUAL_MIGRATION_03 - RENDA FIXA` is complete and frozen after
user approval. The dedicated screen preserves official RF helpers, events,
identity contracts and review flows. Do not reopen Dashboard, Dividendos,
Sidebar, Ativos or Renda Fixa without explicit user authorization.

The next official candidate is `APORTES`, subject to a new explicit mission
scope and approval before implementation begins.

`CANONICAL_VISUAL_MIGRATION_04 - APORTES` is implemented and ready for final
user approval. The scope was limited to Aportes/Lançamentos; its official
movement sources, handlers, identity contracts and persistence were preserved.
After explicit user approval, `CANONICAL_VISUAL_MIGRATION_04=COMPLETE` and
`APORTES_VISUAL=FROZEN`. Do not reopen Aportes, Dashboard, Dividendos, Sidebar,
Ativos or Renda Fixa without explicit user authorization.

The next official candidate is `RENTABILIDADE`, subject to a new explicit
mission scope and approval before implementation begins.

`CANONICAL_VISUAL_MIGRATION_05 - RENTABILIDADE` is implemented and ready for
final user approval. The scope was limited to Rentabilidade; official return,
period, benchmark and asset-return sources were preserved. Do not freeze the
screen until explicit user approval. Do not reopen Dashboard, Dividendos,
Sidebar, Ativos, Renda Fixa or Aportes.

After explicit user approval, `CANONICAL_VISUAL_MIGRATION_05=COMPLETE` and
`RENTABILIDADE_VISUAL=FROZEN`. Do not reopen Rentabilidade or any previously
frozen screen without explicit user authorization.

The next official candidate is `REBALANCEAR`, subject to a new explicit mission
scope and approval before implementation begins.

`CANONICAL_VISUAL_MIGRATION_06 - REBALANCEAR` is implemented and ready for
final user approval. The scope was limited to the read-only Rebalancear screen;
allocation, target and suggestion contracts were preserved. Do not freeze the
screen until explicit user approval. Do not reopen Dashboard, Dividendos,
Sidebar, Ativos, Renda Fixa, Aportes or Rentabilidade.

`CANONICAL_VISUAL_MIGRATION_06=COMPLETE` and `REBALANCEAR_VISUAL=FROZEN`.
Rebalancear is closed for visual work unless explicitly authorized. The next
official candidate is `METAS` or `RELATORIOS`, following the roadmap decision
recorded for the next phase.

## WHAT_NOT_TO_TOUCH

Do not mix this repository with `C:\Projetos\carteira-2.0`. Do not start a
feature, alter financial logic, change persistence/schema, or publish from this
documentation phase.

## REQUIRED_FILES

Read `PROJECT_STATE.md`, `ARCHITECTURE_MAP.md`, `VISUAL_CANON.md`,
`PRODUCT_CONTRACTS.md` and `TESTING_AND_RELEASE.md` before the relevant work.

## REQUIRED_SKILLS

Use the smallest applicable set: `interface-design` for product UI,
`impeccable` for polish-only work, `playwright` or `browser-testing-with-devtools`
for browser evidence, and `doubt-driven-development` before protected
financial/persistence decisions.

## ACCEPTANCE_CRITERIA

Small reversible diff, no protected-area change, official data paths preserved,
tests/builds appropriate to scope, browser evidence at required viewports for
UI work, `git diff --check` clean, and no commit/push/PR/merge/deploy without
the phase's explicit authorization.

`CANONICAL_VISUAL_MIGRATION_07=IMPLEMENTED` and
`METAS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
Do not freeze Metas until explicit user approval. Do not reopen Dashboard,
Dividendos, Sidebar, Ativos, Renda Fixa, Aportes, Rentabilidade or Rebalancear.
The next candidate after Metas is `RELATORIOS`, subject to a new mission and
approval.

`CANONICAL_VISUAL_MIGRATION_07=COMPLETE` and `METAS_VISUAL=FROZEN`.
Metas is closed for visual work unless explicitly authorized. Do not reopen
Dashboard, Dividendos, Sidebar, Ativos, Renda Fixa, Aportes, Rentabilidade,
Rebalancear or Metas. The next official mission is `RELATORIOS`, subject to a
new scope and approval.

`CANONICAL_VISUAL_MIGRATION_08=IMPLEMENTED` and
`RELATORIOS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
Relatorios recebeu apenas refinamento de hierarquia, densidade e separacao
visual entre relatorios analiticos e backup/importacao. Nao marcar Relatorios
como congelado antes da aprovacao visual explicita do usuario. Nao reabrir
Sidebar, Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
Rebalancear ou Metas.

`CANONICAL_VISUAL_MIGRATION_08=COMPLETE` and `RELATORIOS_VISUAL=FROZEN`.
Relatorios is closed for visual work unless explicitly authorized. Do not
reopen Sidebar, Dashboard, Dividendos, Ativos, Renda Fixa, Aportes,
Rentabilidade, Rebalancear, Metas or Relatorios. The next official candidate is
`FUNDOS`, subject to a new explicit mission and approval.

`FUNDOS_ANALISE_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
The scope is limited to the `ativos` analysis subsurface
(`assetsInnerTab=analise`); the main Ativos screen remains frozen. Do not
reopen any frozen screen without explicit user authorization. After approval,
record `FUNDOS_ANALISE=COMPLETE`; the next roadmap candidate remains to be
selected from the documented unfrozen surfaces.

## POST_CANON_ROADMAP_AUDIT

`RF_NAVIGATION_DECISION=REMOVE_RF_FROM_ATIVOS` was applied as a minimal
navigation correction. The dedicated sidebar entry remains the single entry
point for the full Renda Fixa experience; the RF summary inside `Todos os
ativos` remains intentionally available. No frozen visual screen was
redesigned.

`PRODUCT_IMPROVEMENT_PHASE_02=ANALYSIS_DESTINATION_IMPLEMENTED`.
Análise agora é uma rota própria e reutiliza `assetAnalysisRows()` /
`assetAnalysisBlock()`; não há segundo motor analítico.

`NEXT_OFFICIAL_MISSION=ANALYSIS_VISUAL_AND_PRODUCT_QA` remains the next
roadmap item. After its approval, evaluate `CONFIGURACOES` only with an
explicit backup/import safety review.

## ANALYSIS_AND_NAVIGATION_FREEZE

`ANALYSIS_VISUAL=FROZEN` and `NAVIGATION_ARCHITECTURE=FROZEN`.
The canonical desktop structure is Dashboard, Ativos, Renda Fixa, Análise,
Aportes/Lançamentos, Metas, Dividendos, Rentabilidade, Rebalancear and
Relatórios. Renda Fixa and Análise are dedicated destinations, not Ativos inner
tabs. The mobile bottom navigation remains compact and exposes Análise through
`Mais seções`.

The P1 Ativos performance filter was implemented and frozen as a functional
improvement using the existing official result source. Remaining backlog is
`P2` safe contextual links and Configurações backup/import safety review, plus
`P3` icon and empty-state consistency. Do not reopen frozen surfaces without
explicit authorization.

`PRODUCT_USABILITY_IMPROVEMENTS_02` is frozen as a functional improvement:
global search discovery and contextual links passed focused and five-viewport
browser QA without new financial logic.

`NEXT_OFFICIAL_MISSION=SECONDARY_SURFACE_REFINEMENT_01_IRPF`. The following
mission must remain separate from the protected Configurações, Backup, Import
and Restore flows; those require a dedicated safety review.

`SECONDARY_SURFACE_REFINEMENT_01_IRPF=COMPLETE`. The next official mission is
`SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA`, keeping Configurações, Backup,
Import and Restore outside this scope until a dedicated safety review.

`IRPF_VISUAL=FROZEN`. Do not reopen IRPF without explicit authorization.
`NEXT_OFFICIAL_MISSION=SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA`.

`AUDITORIA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
Auditoria recebeu refinamento restrito de hierarquia, priorizacao, filtros,
estados vazios e acoes contextuais, sem alterar o contrato de identidade ou
revalidacao. Nao marcar Auditoria como congelada antes da aprovacao visual
explicita do usuario.

`SECONDARY_SURFACE_REFINEMENT_02_AUDITORIA=COMPLETE` e
`AUDITORIA_VISUAL=FROZEN`. A proxima missao oficial e
`PRODUCT_SAFETY_REVIEW_01_CONFIGURACOES`, com revisao inicial de Configuracoes,
Backup, Importacao, Restore, Conta/Nuvem e Zona de perigo. Nao alterar
semantica de persistencia ou backup sem autorizacao explicita.

## SAFETY HARDENING 01

`SAFETY_HARDENING_01_RESET_AND_BACKUP_VALIDATION=COMPLETE`.
Reset de carteira agora remove eventos e estados transitorios de Renda Fixa.
Backups incompatíveis ou estruturalmente malformados são rejeitados antes da
confirmação, sem migração automática desconhecida.

`NEXT_OFFICIAL_MISSION=PRODUCT_SAFETY_REVIEW_02_CONFIGURACOES_VISUAL`.
O próximo escopo é somente visual: hierarquia, agrupamento, avisos, zona de
risco e UX mobile. Os contratos de backup, importação, restore, autenticação,
sincronização e reset permanecem congelados.

`PRODUCT_SAFETY_REVIEW_02_CONFIGURACOES_VISUAL=COMPLETE`.
Configurações recebeu revisão visual e de hierarquia sem alterar os fluxos
protegidos. A próxima decisão é a aprovação visual final do usuário; não
marcar Configurações como congelada antes dessa aprovação.

## PRODUCT USABILITY IMPROVEMENTS 02

`GLOBAL_SEARCH_REFINEMENT=READY_FOR_FINAL_USER_APPROVAL` e
`CONTEXTUAL_NAVIGATION=READY_FOR_FINAL_USER_APPROVAL`.
A busca global permanece somente leitura e os links contextuais da Análise
reduzem a fricção sem reabrir telas congeladas. A busca não abre editores nem
ações destrutivas diretamente.

`NEXT_RECOMMENDED_ACTION=USER_REVIEW_PRODUCT_USABILITY_02`.


## PRODUCT SAFETY REVIEW - AUDITORIA

AUDIT_SAFETY_REVIEW=FROZEN.
AUDIT_WRONG_RECORD_PROTECTION=FROZEN e AUDIT_IDENTITY_CONTRACT=FROZEN. Acoes exatas exigem revalidacao de ID e chave; registros stale recuam para a rota geral. Nao iniciar IRPF_PRODUCT_REVIEW automaticamente.
## IRPF FUNCTIONAL FREEZE

- `IRPF_FUNCTIONAL_REVIEW=FROZEN`
- `IRPF_VISUAL=FROZEN`; `IRPF_MOBILE_PATTERN=FROZEN`;
  `IRPF_TAX_LOGIC_CHANGED=false`.
- O relatório continua auxiliar e somente leitura, usando
  `irpfBuildYearReport(year)`, agrupamentos oficiais, totais oficiais e os
  exportadores CSV/PDF existentes.
- Zeros válidos permanecem distintos de ausência e dados incompletos continuam
  explícitos.
- `NEXT_RECOMMENDED_ACTION=RELEASE_CONSOLIDATION`.
- Não reabrir IRPF nem as superfícies congeladas sem autorização explícita.

## RELEASE CONSOLIDATION

- `PRODUCT_USABILITY_RELEASE=READY_FOR_PR`.
- A consolidação reúne somente as melhorias aprovadas de Análise, navegação de
  Renda Fixa, filtro de performance, busca global, links contextuais,
  segurança da Auditoria e relatório mobile do IRPF.
- `NEXT_RECOMMENDED_ACTION=SETTINGS_SAFETY_REVIEW`.
- Não iniciar o trabalho de Configurações antes da integração desta release.
## DASHBOARD VISUAL FREEZE

`DASHBOARD_VISUAL=FROZEN`, `DASHBOARD_REFERENCE_LOCK=FROZEN` e
`DASHBOARD_CHART_INTERACTION=FROZEN` apos aprovacao visual explicita.
O alvo estrutural permanente e `Refs/visual-canon/dashboard-canonical.png`;
`Tela Principal.png` permanece somente referencia secundaria de acabamento.
Nao reabrir o Dashboard sem autorizacao explicita.

`VISUAL_REFERENCE_LOCK_PROCESS=ACTIVE`: toda nova aprovacao visual deve
comparar com a referencia primaria, registrar escopo e validar browser nos
cinco breakpoints; testes/builds nao equivalem a aprovacao visual.

`NEXT_VISUAL_TARGET=INVENTARIO_DE_REFERENCIAS`; nao iniciar automaticamente.

## 2026-09-04 - Ativos visual reference lock

- `NEXT_VISUAL_TARGET=ATIVOS`.
- `ATIVOS_REFERENCE_LOCK=READY_FOR_FINAL_USER_APPROVAL`.
- Referencia: `Refs/visual-canon/Tela de aportes e ativos.png`, somente a
  porcao de Ativos.
- Nao marcar Ativos como FROZEN antes da aprovacao visual explicita.

## 2026-09-04 - Ativos final reference polish

- `ATIVOS_FINAL_REFERENCE_POLISH=READY_FOR_FINAL_USER_APPROVAL`.
- Confirmar visualmente a hierarquia final: KPIs, filtros, resumos compactos,
  tabela primaria e alocacao por classe usam a referencia de Ativos, sem copiar
  os modulos de Aportes.
- Aguardar aprovacao do usuario; sem commit, push, PR, merge ou deploy.

## 2026-09-04 - Ativos reference lock freeze

- `ATIVOS_VISUAL=FROZEN` e `ATIVOS_REFERENCE_LOCK=FROZEN` apos aprovacao explicita.
- `ATIVOS_PRIMARY_CONTENT=FROZEN`, `ATIVOS_DENSITY=FROZEN` e
  `ATIVOS_ICON_LANGUAGE=FROZEN`.
- `NEXT_VISUAL_TARGET=APORTES`; usar a porcao de Aportes de
  `Refs/visual-canon/Tela de aportes e ativos.png` sem reabrir Ativos.

## CURRENT_PHASE_3_3_LOCAL_CHECKPOINT

- Dividendos permanece congelado com contrato canônico de cinco KPIs, matriz
  histórica, evolução mensal, top pagadores, resumo anual, filtros, exportação
  e adaptação responsiva.
- Os smoke tests legados de Dividendos foram migrados para o contrato atual e
  estão verdes localmente.
- O próximo passo é uma branch limpa de release baseada no `origin/main`; este
  checkpoint não autoriza merge ou deploy.
- O atalho contextual transação -> ativo foi implementado nesta branch com
  identidade exata, sem matching aproximado e sem mutação financeira. Busca
  global, maturidade de RF e segurança de uso mobile permanecem cobertas.

## PHASE_3_3_PRODUCTIVITY_CHECKPOINT

- `TRANSACTION_TO_ASSET=IMPLEMENTED_READ_ONLY`
- `EXPLICIT_ASSET_IDENTITY=true`
- `APPROXIMATE_MATCHING=false`
- Ações de busca continuam somente leitura; Ativos, Renda Fixa, Dividendos,
  Metas, Auditoria e Análise mantêm suas rotas oficiais.
- `PUSH=false`, `PR=false`, `MERGE=false`, `DEPLOY=false` para a branch local
  `feature/phase-3-3-productivity-final`.

## PHASE_4H_REAL_PILOT_PREPARATION

- Read-only readiness contract is implemented for a future one-month
  `B3_DIVIDENDS_XLSX` pilot.
- Do not request or process a live file until the user is ready to provide the
  period and explicit pilot authorization. The gate remains closed even when
  dry-run criteria are satisfied.
- Required future evidence: exact identities, supported income types only,
  manual verification complete, no duplicate/conflict/unsupported/corporate
  blockers, valid backup and targeted snapshot, zero position/average-price
  impact, reimport proof and rollback proof.
- `FULL_HISTORY_IMPORT_READY=false`; `REAL_USER_IMPORT_ENABLED=false`;
  `REAL_USER_DATA_WRITE=false`; `PUSH=false`; `PR=false`; `MERGE=false`;
  `DEPLOY=false`.
- `NEXT_RECOMMENDED_ACTION=REQUEST_ONE_MONTH_B3_DIVIDENDS_EXPORT_ONLY_AFTER_EXPLICIT_PILOT_REVIEW`.

## PHASE_4H_TARGETED_YAHOO_RECOVERY_RUNTIME_GATE_2026_09_07

- `RECOVERY_LIVE_STATE_MISMATCH_ROOT_CAUSE=BOUND_BEFORE_CLOUD_STATE_STABILIZED`.
- Protected recovery binding is now created only after the authenticated cloud
  snapshot is applied, and the internal surface requires read-only parity with
  the executor preflight before enabling the control.
- Validated on the static legacy server at `127.0.0.1:4173`; do not use Vite
  for this runtime evidence. Three consecutive prewrite checks produced the
  same live, donor, plan and review fingerprints.
- `REAL_RECOVERY_EXECUTED=false`, `REAL_USER_DATA_WRITE=false`, and the V5
  authorization was not consumed because it was rejected before mutation.
- Next step: issue a fresh single-use targeted Yahoo recovery authorization
  bound to the latest manifest, then stop after recovery; the August pilot
  remains a separate authorization.

## PHASE_4H_CLICK_TIME_PARITY_2026_09_07

- `RECOVERY_LIVE_STATE_MISMATCH` was traced to different canonical inputs at
  display time versus click-time plan/executor preflight. The focused fix uses
  the official readiness canonical state and reuses one fresh click-time
  prepared state.
- Validate only through the legacy static-root server on port 4173. The
  internal dry-run query reaches the real prewrite entrypoint without creating
  a snapshot or mutating/persisting data.
- No real recovery has been executed. Before any new authorization, collect a
  fresh authenticated preflight manifest and ensure the click-time dry-run is
  green; August remains a separate later authorization.

## PHASE_4H_QA_HARNESS_NEXT_STEP_2026_09_07

- Use `npm.cmd run qa:browser:start` with the ignored dedicated profile, then
  complete normal authentication once if the profile is new.
- Verify with `npm.cmd run qa:browser:check` and run
  `npm.cmd run qa:auth-smoke`; do not use the everyday Chrome profile.
- Only after the native dry-run and fresh fingerprints are green may a new
  single-use targeted recovery authorization be considered. Recovery and the
  August pilot remain separate gates.

## PHASE_4H_NATIVE_PROOF_COMPLETED_2026_09_07

- Usar Chrome estável QA, não Chrome for Testing, para login Google.
- A prova nativa Playwright em CDP 9232 passou 3/3 em dry-run e permaneceu
  estável após refresh, hard refresh e reabertura de rota.
- Próximo passo: nova pré-validação read-only do recovery com o fingerprint
  vivo fresco; não executar recovery real nem piloto de agosto nesta etapa.

## PHASE_4H_SERIALIZATION_FIX_2026_09_07

- V6 foi consumida e não pode ser reutilizada. O rollback preservou
  `LIVE_COUNTS=329/329/0`; cloud sync não foi liberado.
- O read-back protegido agora valida o envelope de storage e passa somente a
  string `value` para `PersistenceCore.parseStoredState()`.
- Antes de uma nova autorização, executar `qa:phase4h-native` e
  `qa:phase4h-persistence`, congelar HEAD + fingerprints frescos e confirmar
  `99/99/0`. Recovery real e piloto de agosto permanecem bloqueados até novas
  autorizações explícitas e separadas.

## PHASE_4H_OVERNIGHT_STABILIZATION_2026_09_07

- Runtime autoritativo: Chromium Playwright dedicado, perfil persistente fora
  do repositorio, CDP localhost na porta 9333 e servidor legado estatico 4173.
- `qa:session:check` valida HEAD, servidor, CDP, auth, cloud settled, surface,
  callbacks e estabilidade de fingerprint sem expor dados privados.
- `qa:phase4h:prewrite` encadeia health, native dry-run e persistence dry-run;
  nunca cria snapshot, salva, sincroniza ou executa recovery real.
- A fingerprint viva fresca e `bfe99832c39fb365cf4953fcb161392ac6df4974e26343d8e27f53dc0cfd5fe4`;
  soak de 300s e reinicio/reconexao do navegador QA permaneceram estaveis.
- Proximo passo: solicitar nova autorizacao single-use vinculada a esse
  manifesto fresco. Nao reutilizar V6/V7 e nao executar piloto de agosto.

## PHASE_4H_V8_RECOVERY_COMPLETED_2026-09-08

- A recuperacao real V8 foi executada uma unica vez no executor protegido e
  restaurou 99 eventos Yahoo. O estado final validado e `428/329/99`, com
  incremento financeiro zero e sem mudança de posicao, PM, ativos ou RF.
- O reload autenticado preservou o estado e a reconciliacao histórica ficou em
  `21/0/0`; o plano então registrado era `24/21/1/2`. V39 provou que essa
  contagem vinha de fixture sintética e a substituiu por `24/20/1/2/1
  deferred`. Idempotencia foi aprovada em `0/0/0`.
- Backup novo: `local-imports/carteira-investimentos-post-recovery-v8-2026-09-08-07-00.json`,
  fingerprint `a2cbe73690d571621ace0eea51dc62398694b8c7741df67e67a6e40e9eb42989`.
- A autorizacao V8 esta consumida. O piloto de agosto continua sem escrita;
  proximo passo: pre-validacao/autorizacao separada do piloto.

## PHASE_4I_NATIVE_PILOT_DRYRUN_COMPLETED_2026-09-08

- A superficie interna do piloto de agosto agora possui dry-run nativo em
  `?internalPilot=1&internalPilotDryRun=1#internal-pilot`, com input DOM e
  preflight do adapter oficial. O caminho nao cria snapshot, nao muta, nao
  salva e nao sincroniza.
- Prova Playwright autenticada: handler, plano, review, autorizacao e
  preflight alcancados; 3/3 resultados identicos, estaveis em 5s/30s/60s,
  refresh e hard refresh. Manifesto `91ebe347...` e live fingerprint
  `139412caf...` permaneceram estaveis.
- Pronto para nova autorizacao single-use do piloto real. Nao executar sem
  autorizacao explicita vinculada ao manifesto completo.

## PHASE_4I_REAL_PILOT_EXECUTOR_READY_2026-09-08

- O executor real protegido foi implementado e validado somente em sandbox e
  dry-run. O contrato V39 substitui a antiga contagem sintética: são 20
  evidências de linkage, um evento TEPP11 e um KNUQ11 deferred/no-op; as
  exclusões DIVD11/NDIV11 ficam como auditoria sem eventos financeiros.
- `npm.cmd run qa:phase4i:prewrite` e o gate obrigatorio imediatamente antes de
  qualquer autorizacao. Ele prova o clique nativo tres vezes, confirma o
  manifesto e nao cria snapshot, mutacao, save ou sync.
- Proximo passo unico: congelar o HEAD final e conceder uma nova autorizacao
  single-use vinculada aos cinco fingerprints atuais. O piloto real ainda nao
  foi executado.
## PHASE_4I_CLOUD_HYDRATION_GUARD_2026-09-08

- Diagnostico autenticado encontrou que o estado local inicial `329/329/0`
  podia enfileirar upload antes de `FB.cloudLoaded`, permitindo sobrescrever o
  snapshot cloud autoritativo. O estado `329` nao era o donor oficial.
- O guard agora bloqueia uploads ate a primeira hidratacao cloud e migrações de
  bootstrap usam `save({queueCloud:false})`. Eventos com
  `sourceEventKind=reference` continuam preservados sem duplicacao.
- A conta atual nao deve ser considerada recuperada: a leitura cloud/runtime
  atual esta em `329/329/0`. O backup pos-recovery V8 permanece a evidencia
  offline `428/329/99`; nao fazer patch manual, restore amplo ou piloto.
- Proximo passo: uma operacao explicitamente autorizada para restaurar o estado
  oficial, depois revalidar runtime/local/cloud e somente entao congelar o
  manifesto Phase 4I.

## PHASE_4H_CLOUD_PERSISTENCE_COLD_RELOAD_FIX_2026-09-08

- A ultima V3 real chegou a `428/329/99` no readback local, mas o cold reload
  autenticado retornou `329/329/0`; a autorizacao foi consumida e nao pode ser
  repetida.
- O gate tecnico agora exige leitura cloud direta, payload protegido contra
  aba stale, acknowledgement de sync, rollback direcionado e nova identidade
  de runtime no cold boot. Merge em memoria nao e prova de reload.
- Nesta etapa nao houve nova escrita real, piloto ou patch manual. Nao congelar
  autorizacao enquanto a prevalidacao nao provar local/cloud/cold boot no mesmo
  estado.

## PHASE_4H_FORENSIC_430_BASELINE_2026-09-08

- Prevalidacao read-only encontrou `430/329/101` em runtime, local e cloud;
  a autorizacao de restore foi cancelada antes do snapshot.
- Os 101 registros usam `eventType=Yahoo`, mas `source` vazio. O contador
  antigo ignorava `eventType`; a classificacao generica foi corrigida para
  considerar `eventType`/`incomeType`, sem migrar dados.
- Comparacao sanitizada contra o donor: 95 identidades esperadas presentes,
  4 ausentes e 6 extras. O plano atual e `24/20/1/2`, portanto nenhum restore
  deve ser executado ate a revisao de origem.
- Cold boot preservou as mesmas 101 identidades. Recovery e piloto continuam
  bloqueados; proximo passo e congelar manifestos de revisao, nao de escrita.

## PHASE_4H_TARGETED_CORRECTION_MANIFEST_2026-09-08

- Estado autenticado confirmado em runtime, local e cloud: `430/329/101`.
  Donor: `428/329/99`. Nenhuma escrita, snapshot, save, sync ou recovery real.
- Os quatro KNUQ11 divergentes sao variantes somente de valor:
  `8067->8073`, `7929->7935`, `8964->8970` e `8274->8280` cents. Backups
  anteriores repetem os valores do donor; a planilha B3 disponivel termina
  antes desses pagamentos. A origem mais provavel e Auto Yahoo, mas o momento
  exato de criacao nao esta persistido.
- FATN11 `2026-09-08/12480` e DIVD11 `2026-09-08/3513` sao extras pos-donor
  presentes nos tres estados e mantidos como financeiros. O DIVD11 de setembro
  nao e a exclusao de agosto de `559` cents.
- Classe da proxima operacao: `C_REPLACE_4_KNUQ_AND_RECLASSIFY_OTHERS`:
  quatro `REPLACE`, 95 `RECLASSIFY` e dois extras mantidos. Alvo `430/329/101`,
  99 referencias marcadas, delta financeiro `-1017188` cents, sem impacto em
  posicao, PM, ativos ou RF. O registro histórico do clone dizia links
  `21/0/0` e plano agosto `24/21/1/2`; V39 o classificou como fixture sintética
  e o contrato executável atual é `24/20/1/2/1 deferred`.
- `npm.cmd run qa:phase4h:reconcile-prewrite` repete a pre-validacao tres
  vezes em modo somente leitura. Ainda falta autorizacao single-use para
  qualquer correcao real.

## Proximo gate Class C

O executor oficial Class C esta pronto em modo protegido e foi validado no
runtime autenticado sem escrita. A proxima acao exige nova autorizacao single-use
 vinculada ao HEAD e aos fingerprints recalculados; nao reutilizar autorizacoes antigas.

A tentativa anterior foi cancelada antes do snapshot por um símbolo ausente no
callback. O defeito foi corrigido e validado no sandbox; é necessária uma nova
autorização single-use vinculada ao novo HEAD.

## PHASE_4H_PRE_CLASS_C_LOCAL_RECOVERY_2026-09-08

- O executor seguro `TARGETED_PRE_CLASS_C_LOCAL_RECOVERY` foi implementado para
  convergir somente o estado local divergente para a ancora pre-Class-C cloud:
  `430/329/101`, zero referencias e `3718277` cents.
- O snapshot e persistido antes de uma futura mutacao, e o rollback usa slot e
  identidade original dos 99 registros. O caminho nao possui escritor cloud e
  usa `queueCloud:false` na persistencia local.
- Sandbox, rollback, idempotencia e failure-closed passaram. Nao executar a
  recovery real, Class C ou piloto de agosto nesta etapa.
- Proximo gate: abrir uma sessao autenticada segura no HEAD final sem aplicar
  cloud, rodar `npm.cmd run qa:phase4h:preclassc-recovery-prewrite` tres vezes,
  e somente entao avaliar uma autorizacao single-use nova.
## PHASE_4H_101_YAHOO_LOCAL_RECOVERY_NEXT_STEP_2026_09_09

- A base local atual é `329/329/0`, sem referências, com total de
  `2685096` centavos; o cloud autenticado observado é `430/329/101`, sem
  referências, com total de `3718277` centavos.
- A próxima recuperação, se autorizada, deve ser explicitamente aditiva para
  101 eventos Yahoo. A composição observada é 95 donor exatos, 4 variantes KNUQ
  e 2 eventos pós-donor. Não usar automaticamente o manifesto antigo de 99
  eventos nem a impressão donor que não foi reproduzida pelos bytes disponíveis.
- O executor local-only e o prewrite read-only estão implementados, mas a prova
  autenticada final e qualquer autorização single-use continuam bloqueadas até
  o QA autenticado voltar a estar disponível. Não executar recovery, Class C,
  sync ou piloto de agosto antes disso.

## V333.2 — próximo gate readonly

Confirmar CI do novo HEAD da Draft #456 e revisar cadeia #456→#457 atualizada sem reescrita de histórico. Correção readonly e regressões concluídas localmente; merge por PR exige autorização humana específica. Provider QA isolado permanece externo, sem writes reais ou produção.

## V333.2–V338 — gates seguintes

1. Conferir SHA/CI da #456 e revisar #457 na base empilhada atualizada. Regressões readonly estão no npm test e CI browser; média histórica não certificada está indisponível.
2. Avaliar PR isolada V336 de rolagem/acessibilidade de Ativos sem integrar pendências.
3. Resolver execução local Auth/Firestore Emulator ou usar CI do SHA exato; provider QA exige ambiente externo isolado. Manter gap Firefox/WebKit explícito.
4. Merge somente após autorização humana específica por PR; Vercel production branch/auto-deploy precisa ser verificado antes de qualquer integração. Sem deploy nesta missão.

## V336 — gate da melhoria isolada

Revisar Draft V336 de rolagem/acessibilidade Ativos, dependente #457→#456. Manter todas Draft, solicitar gate humano específico somente após confirmar evidência/CI aplicável e auto-deploy. Nenhum merge ou produção autorizado.
