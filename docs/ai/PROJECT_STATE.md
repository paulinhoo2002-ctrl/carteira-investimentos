# Project State

## V333 — revisão de uso diário (2026-10-08)

- Base empilhada sobre PR #456 no HEAD `1917c7e577bea777e0315c988df5c8985cc25286`; PR #456 foi confirmada OPEN/DRAFT/MERGEABLE, CI run `37755481672` PASS. Worktree `C:\Projetos\carteira-investimentos.worktrees\v333-premium-product-finish`, branch `codex/v333-premium-product-finish`; PRs #454/#455 preservadas.
- Auditoria visual local usou somente fixtures sintéticas. Ativos mantém resumo por classe, tabela financeira completa com rolagem local no desktop e cartões expansíveis no mobile; Dividendos mantém KPIs, filtros, histórico, evolução, maiores pagadores e resumo anual. As capturas estão em `.qa-state/v333/` (ignorado pelo Git). Não foi necessária alteração de produto visual.
- Smoke `dividends-p0-ux` foi reconciliado com o runtime V332: agora usa `startLocalHttpServer`, valida o texto anual vigente e executa navegação Aportes→Dividendos sem depender de um botão móvel obsoleto. Essa suíte passou em 390, 768, 1366 e 1920 px.
- Evidência local após a correção: Ativos/Dividendos focal 64/64; local synthetic 26/26; browser readonly 1/1; V330 20/20 e browser 2/2; Import Center 27/27; `verify:release`, `qa:all`, builds e V289 visual 13/13 PASS. Smoke cobriu 390, 430, 768, 1366, 1440, 1536 e 1920 px; V289 cobriu também 360, 1024 e 1280. Zero requests Firebase, page errors ou overflow nas capturas V333.
- **Gate financeiro decidido e correção V333 autorizada:** `NO_RECORDS != ZERO_RECEIVED`. Matriz, cartões anuais e gráficos preservam lacunas; recebimentos sem cobertura mensal confirmada são parciais. Zero exige fonte e confirmação explícita do mês inteiro; valor inválido impede cobertura completa. Média e projeção usam meses completos e ficam indisponíveis sem denominador governado. Declared/Expected não são pagos no classificador canônico. Nenhum schema/persistência foi adicionado; runtime atual não fornece confirmação completa. Dividendos permanece `READY_WITH_LIMITATIONS` por essa ausência de evidência, com apresentação financeira corrigida.
- Revisão adicional dos consumidores encontrou `generateIncomeAnalysis()` classificando `missing=null` como “Meta alcançada ou superada”. A análise agora explicita progresso indisponível e prioriza confirmação de cobertura; regressão comportamental RED→GREEN adicionada. Commit `56c8227352ba5f392335f263556c51966d11ce66`; `verify:release` local PASS, Preview Vercel READY no mesmo SHA; sem GitHub Actions neste branch-base empilhado. PR #457 continua OPEN/DRAFT/MERGEABLE.

- Evidência fresca da correção: 54/54 focados de Dividendos/cobertura (incluindo browser 1366×768 e 390×844); smoke Dividendos 4/4; A11Y 19/19; `verify:release` PASS com legado, moderno 820/820, V84, `qa:all`, builds e visual 15/15 (V289 13 + cobertura browser 2). Regressões novas estão nos comandos `test:finance` e `test:visual-regression`; scripts alterados sem mudança de dependências/lockfile. Capturas específicas em `.qa-state/v333/month-coverage/`, sintéticas e ignoradas. Zero requests Firebase, page errors e overflow nos testes específicos.
- V335 final-chain review reproduziu no host Modern que `EXPECTED`/`DECLARED` viravam pagamentos e `PARTIAL` podia expor média. Snapshot readonly v2 agora separa `paymentState`/`plannedValue`, marca cobertura e exclui não-PAID de totais, contagens, gráficos e pagadores. Somente fixtures foram usadas; testes focados atuais estão em verificação antes do checkpoint.
- PR #457 continua Draft com base `codex/local-test-mode-hardening` (#456). GitHub Actions não é disparado nessa base pela configuração atual (somente `main`); deployment Vercel não equivale a CI de testes. Não alterar a cadeia nem mesclar automaticamente para forçar esse gate.
- Comparativos foram somente leitura; nenhuma autenticação, persistência real, Firebase, produção, importação, restauração ou escrita financeira ocorreu. O build moderno emite avisos preexistentes de Vite CJS, contrato readonly e chave React ausente. `MERGE=false`.

## V332 — runtime local de QA sintético (2026-10-07)

- Worktree `C:\Projetos\carteira-investimentos.worktrees\local-test-mode-hardening`, branch `codex/local-test-mode-hardening`, base `cefc725f2378648c29593b27399a2f9bf2656db7`. PRs #454/#455 e worktrees dependentes não foram alterados.
- Modo sintético requer marcador server-side iniciado por `--synthetic-qa`, loopback exato e `testMode=1`; Preview/produção e query isolada mantêm autenticação normal. Sessão editável usa memória efêmera; `testReadOnly=1` bloqueia edição, `save()`, reset e persistência de navegação, inclusive chamadas programáticas. Hidratação cloud e persistência V76/cópia de storage corrompido também ficam bloqueadas no runtime sintético. Nenhuma regra Firebase mudou. Detalhes: `QA_AUTH_STRATEGY.md`.
- `npm ci` autorizado; `package.json` e lockfile inalterados. Gates frescos: runtime/server/auth 26/26, browser readonly 1/1, legado 255/255, moderno 820/820, V330 20/20, V84 4/4, A11Y 19/19, QA harness 4/4, V289 13/13; `qa:all`, `verify:release`, builds e `git diff --check` PASS. Smoke sem overflow em 390, 430, 768, 1366, 1440, 1536 e 1920 px; V289 cobre ainda 360, 1024 e 1280. Capturas visuais sintéticas ficam em `.qa-state/` e não entram no Git.
- Revisão adversarial V335 reproduziu o reset programático do fixture readonly via token lexical global. A correção mantém o token dentro de uma closure, limita a capacidade de boot a uma chamada e preserva o bloqueio após inicialização. Teste de browser RED→GREEN no Chrome; `test:local-synthetic` 43/43 e `test:local-synthetic:browser` 1/1 após a correção. Nenhuma gravação financeira, Firebase ou alteração de fixture persistida.
- Correções visuais V332: sinal duplicado no resultado positivo de classe e grade do resumo de Ativos que cortava métricas em 1366 px. Browser usou apenas fixtures sintéticas; não houve Firebase real, login real ou persistência autenticada.
- Snapshot de certificação do produto V332 antes desta sincronização documental: SHA `732dbb1e58401c981c23f9da48b41d2faf345b7b`; CI run `37714085100` PASS em Build/test, V289 visual e Auth/Firestore Emulator; Preview Vercel READY e HTML servido sem marcador QA injetado para o mesmo SHA. PR #456 permanece OPEN/DRAFT. A falha anterior de Reliability era causada por harnesses de teste responsivo que omitiam o marcador; corrigidos para reutilizar o servidor QA compartilhado. npm reportou 7 advisories (3 moderados, 4 altos) no conjunto; `npm audit --omit=dev` encontrou 0 de produção. Sem auto-fix/upgrade. Builds modernos mostram avisos preexistentes de Vite CJS/contrato readonly. `MERGE=false`; sem escrita financeira, importação, restore ou produção.

## V330 — reconciliação de notas de corretagem (2026-10-07)

- `origin/main=0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`, merge SHA da PR #452/V329. A PR #452 está MERGED; CI run `37663297762` passou no HEAD PR `f5a1dccdbc4de8fbc06dc3db92970caca535a6ad`. Não houve workflow separado observado para o merge commit.
- Worktree atual `C:\Projetos\carteira-investimentos.worktrees\v330-reconciliation`, branch `codex/v330-data-source-reconciliation`, base `0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`. PR #453 OPEN/DRAFT/MERGEABLE. Commit de implementação `e3b0680c231ee3b65fb47662fd3ae6ed1e38bcfc`; CI `37689070077` PASS em Build/test, V289 visual e Auth/Firestore Emulator. Vercel Preview correspondente READY; o conteúdo remoto não foi autenticado/inspecionado.
- Implementação V330 local: prévia read-only preserva execuções brutas e transações agrupadas, identidade/proveniência/versionamento, taxas e IRRF separados, datas de pregão/liquidação e estados explícitos de duplicata/conflito; resultado realizado fica indisponível sem evidência de cost basis. O Import Center apresenta a revisão sem adicionar caminho de persistência.
- `npm ci` foi autorizado e executado somente nesta worktree; `package.json` e `package-lock.json` permaneceram inalterados. npm reportou 7 avisos de auditoria no conjunto instalado (3 moderados, 4 altos); `npm audit --omit=dev` reportou 0 vulnerabilidades nas dependências de produção. Nenhum auto-fix ou upgrade foi executado.
- Validação local fresca após o gate financeiro: `verify:release` PASS; confirmação de nota 6/6; `test:v330` 20/20; `test:v330:browser` 2/2; `test:import-center` 27/27; `test:import-xlsx` 2/2; visual 13/13 com Axe dark/light sem violações; V84 4/4; V4D 11/11; builds, `qa:all` e `git diff --check` PASS. CI no commit de implementação passou incluindo browser V330, A11Y funcional, confiabilidade, V289 e Auth/Firestore Emulator. Ativos usa scroll horizontal local no desktop e cards expansíveis no mobile. Dividendos mostra histórico/renda anual sem tratar valor ausente como zero. Browser sintético sem Firebase, writes financeiros locais, erros de console/page/rede ou overflow de página. Capturas ficam em `.qa-state/`, ignorado pelo Git.
- Medição sintética local: DOMContentLoaded 190 ms; render Ativos 3 ativos 5,8 ms; render Ativos 500 ativos 158,2 ms. Diagnóstico local, sem garantia de SLA.
- Contratos adicionais: identidade exige corretora+número+data; source ID é provenance. Quantidade positiva, sem expoente e até oito casas; bruto confere com quantidade × preço dentro de um centavo. Dedup preserva nota/ativo/execuções distintas; itens de revisão bloqueiam o dry-run protegido. Decisão humana aplicada: `brokerNoteCanConfirm()` requer checklist legado aprovado E prontidão V330 segura; estados de revisão, conflito, duplicata, não reconciliado ou desconhecido bloqueiam com mensagem explícita. O estado canônico atual `SOURCE_CONFIRMED` + `READY_FOR_REVIEW` + validação `VALID` continua autorizado. `BLOCKER=0`, `MAJOR=0`; nenhum writer foi executado.
- `test:auth-emulator` local foi tentado no projeto demo e bloqueou antes dos testes: Firestore Emulator encerrou com código 1 em ambiente Node 26/Java 26. Não classificado como PASS nem falha de produto; gate Auth+Firestore depende do CI Ubuntu configurado com Java 21.
- Avisos não bloqueantes de build: depreciação da API CJS do Vite e import/contrato readonly preexistentes. Sem PDF real, PII, importação, restore, escrita financeira, Firebase/produção ou mudança de fórmula. `REAL_WRITES=0`; `REAL_IMPORT=false`; `REAL_RESTORE=false`; `PRODUCTION=false`; `MERGE=false`.
- CI remoto e Preview ainda não existem para o diff local sem commit/push. Próximo: re-review final, revisão do diff e, conforme autorização explícita da missão, commits coerentes, push e Draft PR; aguardar CI/Preview do SHA exato. Nenhum merge.

## V329 — Portfolio Trust and Insights (2026-10-07)

- PR #452/V329 foi MERGED em `0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`; CI run `37663297762` passou no HEAD PR `f5a1dccdbc4de8fbc06dc3db92970caca535a6ad`. V328/PR #451 foi integrada em `2d79860c9cb3a6faa7c1098119bb6c4e23af46b0`; CI pós-merge run `37652790258` passou. As worktrees anteriores permanecem fora do escopo e intocadas.
- Reuso V329: modelos existentes de confiança, alocação e dividendos. Correções/integrações desta worktree: cobertura monetária fica desconhecida quando qualquer posição não tem valuation; agregados sem nenhum valuation conhecido não exibem zero; preço/current value de fallback não é promovido a valor conhecido sem disponibilidade explícita; instituição usa metadado próprio e não emissor; alocação institucional informa denominador conhecido, cobertura por posição e data-base uniforme/parcial/mista/desconhecida; data ausente ou futura em posição valorizada não é promovida a data-base do conjunto; `verified` legado não comprova verificação sem autoridade governada; modo oculto também oculta instituição, cobertura e data. Sem mudança de fórmula financeira, persistência, schema ou writer.
- Integrações existentes revalidadas/reutilizadas: Dashboard e Ativos já expõem qualidade/frescor; Dividendos preserva recebido/anunciado/estimado e reconciliação; Patrimônio mantém lacunas e totais parciais indisponíveis; Rentabilidade exige cobertura conforme metodologia existente. O centro Confiabilidade passa a explicitar instituição e estado factual de confiança do valor.
- `npm ci` foi autorizado e executado somente nesta worktree usando o lockfile. Validação local fresca no diff atual: focused trust/allocation/dividends/UI 108/108; legado 255/255; moderno 820/820; `qa:all` PASS; A11Y 19/19; V289 12/12 (inclui três cenários V329 sintéticos e a matriz em Dashboard, Ativos, Dividendos, Patrimônio e Confiabilidade a 390/1366); `verify:release` PASS; builds legacy/modern PASS. Vite ainda emite avisos conhecidos de depreciação/CJS e import do contrato readonly; sem falha de build.
- V330 foi iniciada após a conclusão/merge V329; estado e gates atuais estão registrados na seção V330 acima. A especificação `V330_DATA_SOURCE_AND_RECONCILIATION_UX_SPEC.md` é a continuidade técnica.
- `VISUAL_PHASE=DEFERRED` e `VISUAL_CANON_V2=FROZEN_REFERENCE`; V329 pode acrescentar indicadores dentro da linguagem aprovada, sem redesign ou mudança dos contratos visuais congelados.
- Revisão independente interna: BLOCKER=0, MAJOR=0; MINOR documental fechado nesta atualização. Revisão externa Hermes não executada.
- Próximo: solicitar autorização explícita para commit/push/Draft PR. CI remoto e Preview permanecem pendentes porque ainda não há commit/PR.

## V322 — certificação Batch 7–10, Provider QA diferido (2026-10-05)

- PR #445 permanece OPEN/DRAFT/MERGEABLE, branch `codex/v322-batch7-import-center-hardening`, HEAD `36c78e69acaa8c67531654181cc274cd71ade6c4`; CI #783, run `37372040030`, SUCCESS. Nenhum merge foi feito.
- Batch 7: gate completo passou em CI (Build/test, A11Y, V320 financial contracts, Reliability, Auth/Firestore Emulator e V289 visual). `npm test` reportou 249 passes, zero failures e cinco testes skipped.
- Batch 8 Corporate Events: 39/39 testes focados PASS; fluxo shadow permanece sem writer de carteira, e promoção exige evidência `RECEIVED`.
- Batch 9 failure injection: fronteira V284 81/81 PASS, incluindo rollback, quarentena, bloqueio de saves seguintes e retry após reload/verificação.
- Batch 10 double action/replay: cancel/confirm, double-submit e replay idêntico persistem uma única vez; coberto em V284 e validado em CI/local. Disputa real entre abas não foi exercitada e não está certificada.
- Validação local focal combinada: Corporate Events 39/39 e fronteira V284 81/81; writes reais/produção zero. Sem mudança de produto, fórmula, schema ou persistência.
- V323 continua somente leitura até PR #445 ser incorporada e o CI pós-merge passar. Provider QA real e persistência cloud seguem externos; `MERGE=false`.
## V328 — estabilização das telas premium e continuidade (2026-10-07)

- Estado atual confirmado: worktree registrada `C:\Projetos\carteira-investimentos.worktrees\v328-preparation`, branch `v328-preparation`, HEAD `943449b51d8fd768246305e85aa4b24a2c27755e`, 5 commits à frente de `origin/main` (`8a62885ee88a3f12daee354fb79cb9d643bd9596`). PR #451 está OPEN/DRAFT/MERGEABLE. Documentos de governança e a especificação V329 estão com alterações locais pendentes de commit/push; `V328_PREPARATION_MATRIX.md` continua não rastreado e excluído.
- Ativos estabilizado: busca, filtros, acordeões, ações, RF e estados UNKNOWN permanecem cobertos. Valores sem fonte seguem indisponíveis, sem mudança de cálculo.
- Patrimônio: além de não haver snapshots de valuation histórico, a cobertura dos movimentos não é certificada. A UI exibe a série somente nos meses com movimentos registrados, deixa lacunas sem valor e não trata ausência como zero. Totais/resultados/composição ficam indisponíveis quando valores correntes ou base aplicada estão parciais, ausentes ou sem capital aplicado. Fórmulas, schema e persistência não mudaram.
- Telas Dividendos, Dashboard, Patrimônio, Metas, Rentabilidade, Rebalancear e Ativos passaram matriz browser sintética em tema claro/escuro nas larguras 390/430/768/1366/1440/1536/1920, sem overflow/clipping; harness confirmou ausência de writes locais inesperados, requests Firebase, erros de página e console.
- Evidência local no HEAD de implementação: `verify:release` PASS (legacy 255/255, modern 820/820, QA harness 3/3, `qa:all`, build legacy/modern e V289 visual 9/9); V84 4/4; A11Y 19/19; performance 96/96; regressões focadas de Patrimônio 4/4. `git diff --check` PASS.
- CI exato de #451 no HEAD atual: run `37647140501` SUCCESS; Build and test, V289 visual regression, Auth and Firestore emulator QA e Vercel Preview passaram. A falha anterior por seletores antigos foi corrigida no teste; não há falha corrente demonstrada. Gates locais frescos no mesmo HEAD: legacy 255/255, modern 820/820, V84 4/4, A11Y 19/19, performance 96/96, QA harness 3/3, V289 9/9, `qa:all`, `verify:release`, builds legacy/modern e `git diff --check` PASS.
- Avisos não bloqueantes: Vite CJS API deprecada, contrato readonly de relatórios no build e diagnósticos de clickable-div no script A11Y; os gates correspondentes passaram. A matriz não rastreada permanece local e excluída da publicação por conter afirmações ainda não comprovadas.
- `V328_STATUS=READY_FOR_HUMAN_REVIEW` para o estado de produto no HEAD remoto atual; `BLOCKER=0`; `MAJOR=0`; `MINOR=1` (avisos/ferramentas e diagnósticos acima). O novo HEAD documental requer CI pós-push. Dados financeiros reais, importação, restauração, writes financeiros e produção não foram usados; PR #451 continua Draft; `MERGE=false`.
- `TEST_CERTIFICATION_FRESHNESS_RULE=true`; regras de continuidade ficam em `PROJECT_CONTINUITY_POLICY.md`. `MERGE=false`.

#
# V317 — certificação de ações financeiras (2026-10-04)

- `WORKTREE=C:\Projetos\carteira-investimentos.worktrees\v317-financial-e2e`; `BRANCH=hermes/v317-financial-action-e2e-certification`; base/HEAD inicial `2966dfb197ddcde5440379f8d2d21c35cdeda183`.
- Revisão independente CONCLUÍDA por Hermes GLM-5.3 via NVIDIA (HEAD `79991e67033a9336fdb103eb0f1bd9641ce2c938`): `FINANCIAL_SEMANTICS_CHANGED=false`; snapshot pré-mutação fail-closed; restauração/quarentena cobre todas as chaves mutadas; os 14 chamadores pré-existentes de `syncAssetsFromAportes()`/`autoDY()` mantêm comportamento idêntico via default `persistState=true`. Ponytail full: BLOCKER=0/MAJOR=0/MINOR=0/DEFERRED=0; Caveman: sem estado duplicado ou fallback oculto.
- Gates frescos na revisão: V317 browser 4/4; legado 252/252; moderno 815/815; focados 79/79; persistência+roundtrip+reliability 44/44; fronteira V284 8/8; Import Center core 10/10; XLSX sintético 2/2 (o `BLOCKED_NETWORK` anterior não reproduz neste HEAD — gate CDN agora PASS); visual 4/4; builds PASS; `qa:all` 7 larguras sem erros; `git diff --check` PASS. CI PR #442 verde.
- `V317_LOCAL_RUNTIME_CERTIFICATION=PASS_SYNTHETIC_ONLY`. testMode NÃO certifica Google/Firebase auth, persistência cloud nem Firestore de produção (`V316_FIREBASE_PROVIDER_QA=SEPARATE_PENDING_GATE`). Nenhum dado real, escrita real ou credencial. `MERGE=false`; gate humano permanece.
- `saveQuickMovement()` passou a usar snapshot/restore, confirmar um único `save()===true` e restaurar/quarentenar em falha; falha de snapshot não chama save. `syncAssetsFromAportes()`/`autoDY()` deferem apenas nessa chamada. Nenhuma mudança de schema ou fórmula.
- Browser V317 usa somente testMode/fixtures sintéticas; compra/cancelamento/reload/falha e Import Center CSV preview/cancel/confirm/replay foram exercitados sem requests externos de escrita. Repetição não adicionou registros. `test:roundtrip` 7/7; fronteira V284 76/76.
- `verify:release` PASS: `npm test` 252/252, moderna 815/815, build legacy/modern, QA harness, smoke (390/430/768/1366/1440/1536/1920, zero overflow/erros) e visual 4/4. Direcionados agregados 196/196 PASS; `git diff --check` PASS.
- `test:import-xlsx` tentou e falhou porque SheetJS CDN não carregou: `BLOCKED_NETWORK`; XLSX browser/provider QA não certificado. CSV sintético passou.
- Nenhum dado financeiro real ou credencial foi usado. `testMode` não prova Google/Firebase auth nem persistência cloud. `npm ci` foi executado apenas nesta worktree; lockfile sem alteração.
- Modelos recomendados: implementação Codex GPT-6 Luna Medium; revisão Hermes GLM-5.3 NVIDIA (disponibilidade não verificada); escalonamento Codex GPT-6 Sol Medium. Runtime usado: Codex, variante não exposta. Skills consideradas/usadas: Superpowers, Ponytail full, Caveman, Playwright. Sem redesign.
- Código: commit `5bf3c213b5f62ed0a98b4b33182de891127ea657`; push PASS. PR #442 OPEN/DRAFT em `main`; CI run `37238415129` PASS (Build/test, Auth+Firestore emulator, visual V289, Vercel e Preview Comments). Link PR: `https://github.com/paulinhoo2002-ctrl/carteira-investimentos/pull/442`.
- Revisor independente e XLSX CDN seguem pendentes para eventual avanço além de Draft. PRs #440/#441 continuam intocadas. `MERGE=false`.

## V310 — preparação local de autenticação QA isolada

- PR #438/V304 foi integrada por squash em `origin/main=033ebbafca6b8904f0a65f241a48cba73e89bf09`. A tag `v1.3.0-rc1` permanece em `399e120d83bfc81d58e613adb79fe6f27bf47cfe`.
- Gates pós-merge certificados: legado 252/252, moderno 815/815, Reliability 61/61, visual 4/4, `qa:all`, `verify:release`, XLSX sintético 2/2 e CI PASS. Esses números descrevem o main integrado, não substituem os resultados frescos V310.
- V310 trabalha em `feature/v310-isolated-firebase-qa-auth` sem alteração de produção, Firebase externo, persistência ou lógica financeira. O roteamento de modelos/Skills e a arquitetura QA são documentados neste branch local.
- O smoke local `testMode` continua sintético e sem Firebase. Auth Emulator + Firestore Emulator e Preview com projeto QA separado estão planejados, mas **não implementados nem provisionados**. Ver `docs/ai/QA_AUTH_STRATEGY.md`.
- O deployment automático Vercel pós-merge foi observado em URL específica; a promoção ao alias de produção não foi confirmada. Nenhum deploy manual V310.

## V298 — RC local da branch visual (2026-10-03)

- `CURRENT_BRANCH=feature/v289-premium-visual-redesign`; `RC_BASE_HEAD=69569adc0ec4cf58ea8cec29c6c59c4bff10d643`.
- Wave G e V296 XLSX completos; prontidão RC válida somente para este checkpoint local, ainda não publicado nem integrado.
- Gates frescos: XLSX 2/2; `qa:all` PASS; `npm test` 252/252; `test:modern` 815/815; builds legado/moderno PASS; `git diff --check` e `git diff --cached --check` PASS antes do commit documental.
- Revisões registradas: BLOCKER=0, MAJOR=0, MINOR=7; seis itens não bloqueantes continuam adiados. XLSX fechado.
- A evidência reproduzível Dashboard/Metas é 29/29 com manifesto; o agregado histórico 37/37 sem manifesto foi retirado como evidência certificada.
- `PUSH=false`; `PR=false`; `MERGE=false`; `DEPLOY=false`. Tag RC é local e não será enviada.

## Estado canônico — V285 Import Center (2026-09-29)

- `ORIGIN_MAIN=6f249bb822bb83163a39a3cb7e59ff80ab3134bb`; PR #432/V284 está incorporada. Esta missão trabalha isolada em `feature/v285-import-center-completion`; o checkout canônico não foi alterado.
- `V283-01_IMPORT_CENTER_WORKFLOW_COMPLETION=COMPLETE_FOR_CURRENT_APPROVED_SOURCES`: B3 (movimentações, posição e proventos) e nota Inter percorrem leitura local → parser → revisão protegida → confirmação explícita → writer legado. A confirmação Inter agora persiste o estado antes dos efeitos posteriores e restaura/quarentena a sessão quando `save()` não confirma.
- `ImportCenterCore` continua deliberadamente preview-only e não recebe autoridade genérica de escrita. A integração de UI encaminha a revisão para os writers específicos existentes. Seleção, leitura, cancelamento e fechamento não gravam.
- `XP/BTG=FIXTURE_REQUIRED`; formatos desconhecidos permanecem `UNSUPPORTED`/`REVIEW_REQUIRED`. O centro processa um arquivo por vez; lotes multi-arquivo não foram implementados nem alegados.
- Browser com CSV B3 sintético abriu revisão protegida, mostrou `SYNTH3` e R$ 20,00, manteve `REGISTROS GRAVADOS=0` e cancelou sem escrita. Sete larguras (390/430/768/1366/1440/1536/1920), sem overflow, erro de página/console ou falha relevante de request.
- Validação fresca: focados 144/144; `npm.cmd test` 252/252; `test:modern` 815/815; build legacy, build moderno e `qa:all` PASS. Somente dados sintéticos/testMode; nenhum arquivo financeiro privado ou escrita real.
- `CURRENT_PHASE=FUNCTIONAL_COMPLETION`; visual segue `FROZEN_REFERENCE`. `NEXT_ACTION=V282-01_FINANCIAL_ACTION_END_TO_END_CERTIFICATION` (P1 acionável, conforme backlog). `V283-04` permanece risco latente dependente de contrato de autoridade.
- Ramo de consolidação histórica: V284 é recuperável em `origin/main`; refs V178/V275/V278M/V281 apontam aos commits esperados. O branch local V178 não existe mais; `refs/archive/v178-ui-usability` continua. O backup-root esperado não foi encontrado, portanto bundles externos não foram verificados. Nenhuma limpeza foi feita nesta missão.

## Histórico — snapshot pós-PR #432 antes da V285 (2026-09-29)

- `ORIGIN_MAIN=6f249bb822bb83163a39a3cb7e59ff80ab3134bb`; PR #432 incorporou V284. O checkout canônico `main` está em `d1d67e67285ad8c531d794967d8c9812754193e7`, atrás e com dados locais não rastreados; não foi atualizado/resetado. A reconciliação documental ocorre na branch isolada `maintenance/v285-historical-consolidation`.
- `CURRENT_PHASE=FUNCTIONAL_COMPLETION`; `VISUAL_CANON_V2=FROZEN_REFERENCE`. V284 identidade/completude/isolamento de falha está em `origin/main`; memória antiga que ainda indica certificação V284 como próxima ação está superada.
- `NEXT_ACTION=V283-01_IMPORT_CENTER_WORKFLOW_COMPLETION`, item P1 existente no backlog. A ingestão unificada ainda está em simulação; confirmação humana continua obrigatória para qualquer escrita real. Não iniciar importação real nesta missão.
- Auditoria histórica: V166, V169A, V178 e V281 não justificam reintroduzir implementação antiga; V278M QA/backup/governança úteis já têm equivalentes atuais; V275 fica como referência para fase visual futura, sem integrar redesign durante o freeze. V278O foi incorporada ao ciclo V278; resíduos locais permanecem preservados.
- V284 commit `832261529ed122f02054314c1058c3fcc348c407` é ancestral de `origin/main`. V178 commit `35bd68b14aaf0410c2444ec191bf78e7331a5aec` continua recuperável por branch local e `refs/archive/v178-ui-usability`. Refs V275, V278M e V281 também conferem com seus SHAs esperados. Bundles externos não foram verificados nesta auditoria; não acessar metadados privados sem necessidade.
- A limpeza de worktrees foi conservadora: QA state, evidência local, dados privados, dependências ignoradas ou resíduos não rastreados permanecem onde encontrados. Nenhuma remoção manual, force, GC ou prune de objetos foi feita.
- `PHASE8_COMMITTED_HISTORY_LOSS=NOT_DETECTED`; os commits esperados são recuperáveis. Esta conclusão não afirma recuperação de arquivos não rastreados que não tenham sido preservados por Git.

## V284 Waves D/E/F — identidade, completude e isolamento de falha (2026-09-29)

- `V284_WAVE_C_COMMIT=c0566104ef702c673bd060945f324c66725f517e`; Waves D/E/F partiram desse HEAD na branch `feature/v284-import-center-workflow` e foram commitadas localmente.
- `V284_FINAL_CODE_COMMIT=35199013a0aadb204d7cb131151e66187c89573b`
- Identidade usa corretora canônica + data de negociação explícita válida + número estável; sem número, usa conjunto canônico de operações com ordenação por comparação de código, não por locale. Nome do arquivo é provenance, nunca autoridade de unicidade. Alias conhecido só é normalizado para corretoras explicitamente reconhecidas; pontuação/acento em nomes desconhecidos não é removida.
- Parsing parcial/inválido expõe contagens de linhas e `completenessStatus`; qualquer linha econômica descartada/inválida bloqueia `READY` e o writer revalida completude, identidade, estado de revisão/conflito e campos obrigatórios. Ausência não vira zero nem compra implícita.
- Evidência legada ambígua é escopada por corretora/data/número quando disponíveis; data isolada com identidade insuficiente continua `REVIEW_REQUIRED`. Notas numeradas diferentes no mesmo dia/corretora podem coexistir.
- Reaplicação idêntica não persiste novamente; conteúdo divergente na mesma identidade resulta em conflito/revisão. Autoridade manual de RF e salvaguardas da Wave C permanecem cobertas pelos testes.
- A falha de persistência restaura snapshot profundo dos campos financeiros, estado de revisão, carteiras e carteira ativa; marca a sessão como `QUARANTINED`, bloqueia `save()` e o gate compartilhado de edição, e não anuncia sucesso. B3 posições, B3 proventos, B3 movimentações, posição RF e nota de corretagem passam pela mesma barreira. Se o armazenamento local aceitar a chave e a fila cloud falhar depois, o resultado continua incerto: memória é restaurada/quarentenada, mas o registro local pode já conter a operação; após recarga, identidade/idempotência impede reaplicação. A sincronização cloud não é transação atômica com `localStorage`.
- `IMPORT_BATCH_ATOMICITY=ONE_LOCAL_SERIALIZED_STATE_KEY`; isso descreve a gravação síncrona do snapshot local, não durabilidade cloud ou atomicidade distribuída. `RETRY_IDEMPOTENCE=AFTER_RELOAD_AND_STATE_CHECK`; retry na sessão quarentenada é bloqueado.
- Verificação fresca final: V284 boundary + nota Inter + Import Center + V245 = 105/105; persistência 32/32; roundtrip 7/7; geral 249/249; moderna 815/815; build legado, build moderno e `qa:all` PASS. Smoke sintético 390/430/768/1366/1440/1536/1920 sem overflow, erros de console/página ou falhas relevantes de requisição. O smoke não exercitou a interação de falha de importação no browser; estados de falha foram verificados por testes comportamentais sintéticos.
- Nenhuma escrita financeira/fiscal real, mutação real de carteira, arquivo financeiro privado, migração, backfill ou mudança de dependência. Dois commits locais criados. Push/PR/merge/deploy não autorizados.
- `NEXT_ACTION=V284_FINAL_BRANCH_CERTIFICATION`

## Histórico — certificação V283 anterior à V285 (2026-09-29)

Este bloco prevalece sobre os registros históricos abaixo. Relatórios de ondas anteriores são evidência histórica limitada ao escopo então auditado, não certificação global.

- `CURRENT_PHASE=FUNCTIONAL_COMPLETION`; `VISUAL_CANON_V2=FROZEN_REFERENCE`.
- `P0_TRUTH_PATH=RESOLVED`; `P0_END_TO_END=RESOLVED` refere-se à eliminação, no runtime alcançável, da cotação atual em histórico e do benchmark sintético. Engine/adapter falham fechados diante de evidência insuficiente.
- `REAL_DATA_READINESS=UNAVAILABLE_AS_INPUTS_REQUIRE`; identidade, cobertura, fluxos confiáveis ou história insuficientes mantêm retorno real indisponível/parcial. Estado esperado, não reabertura do P0. `FAIL_CLOSED_ON_INSUFFICIENT_EVIDENCE=true`.
- A API do adapter é síncrona para o renderer legado. Benchmark, janela móvel 12M, série mensal e filtros sem evidência datada suficiente permanecem indisponíveis; não há interpolação.
- Cobertura histórica omitida agora significa `UNKNOWN`; apenas `FULL_COVERAGE` explícita permite métricas numéricas. `buildYearEndPosition` também não infere completude quando falta coverage. Evidência sintética em teste comprova comportamento matemático, não prontidão da carteira real.
- `WALLET_ID_UNAVAILABLE` e readiness real por carteira continuam bloqueantes para TWR/XIRR reais.
- Os quatro controles de importação em Aportes agora apontam a handlers existentes e distintos; sem arquivo real, confirmação ou escrita nesta execução.
- Alegações globais `UNKNOWN_TO_ZERO`, `PARTIAL_TO_COMPLETE`, `EXPECTED_TO_RECEIVED` e `FAKE_SUCCESS` ficam reclassificadas como `NO_VIOLATION_FOUND_IN_PRIOR_AUDITED_SCOPE`, sem afirmar eliminação global.
- Certificação fresca após todos os ajustes: geral 249/249; moderna 815/815; focados performance/V283/V248 e source-audit 46/46; build legado/moderno PASS; `qa:all` PASS (harness 3/3 e smoke 7 larguras).
- Verificação direcionada adicional após os gates: backup/restore, fixed-income trust/valuation, dividend intelligence, report readiness/model, rebalance e Import Center 78/78 PASS (subconjunto/overlap com a suite geral, não somar ao total).
- Browser isolado com fixture sintética executou adapter e engine; 95% => PARTIAL/sem número; 100% explícito => retorno agregado datado; 12M, benchmark e pontos mensais indisponíveis. Matriz de 16 rotas × 7 larguras: 112/112 sem overflow, heading ausente ou erro de página/console. Axe A/AA: 12 superfícies × 390/1366 (24 verificações), zero violações; teclado alcançou filtros/ações; botões de Aportes medidos com 44px em desktop.
- `tests/v283-legacy-rentability-red.test.js=SOURCE_GUARD_TESTS`; detecta padrões na fonte legada, não reachability. `tests/v283-behavioral-runtime.test.js=BEHAVIORAL_RUNTIME_TESTS`; browser/runtime proof valida implementação ativa.
- Diff completo foi higienizado de whitespace; objetos dangling permanecem preservados. Sem push, PR, merge ou deploy.
- `NEXT_ACTION=V283-01_IMPORT_CENTER_WORKFLOW_COMPLETION`; item acionável já listado no backlog. V283-04 permanece risco latente sem chamador de produção identificado e requer contrato de autoridade.

## V282B Project Memory Continuity and Skills Certification — 2026-09-28

- **CURRENT_PHASE=FUNCTIONAL_COMPLETION**
- **VISUAL_PHASE=DEFERRED**
- **VISUAL_CANON_V2=FROZEN_REFERENCE**
- **P0_ENGINE_LAYER=RESOLVED** — V281 historical-performance-engine fails closed when priceCoverage missing
- **P0_END_TO_END=PARTIAL** — legacy rentabilityHistory() in index.html still uses S.assets.current_price and synthetic rentBenchSeries()
- **NEXT_ACTION=V282_WAVE_B_LEGACY_INTEGRATION** (connect legacy rentability to V281 engine)

### V281 Historical Return Truth Repair — STATUS

- Engine layer: RESOLVED — historical-performance-engine fails closed (missing priceCoverage → INSUFFICIENT_DATA)
- Legacy integration: RESOLVED — V283 Wave A adapter connects legacy UI to V281 engine, eliminates current_price leakage and synthetic benchmark
- V281 tests: 10 regression tests PASS (V281-01 through V281-10)
- V283 tests: 12 behavioral runtime tests PASS (R1-R12), 12 source guard tests PASS (TEST_A1-B5)
- Full suite: 249 legacy + 815 modern = 1064 PASS
- Builds: PASS (legacy + modern)
- QA: PASS (390, 430, 768, 1366, 1440, 1536, 1920)
- **P0_ENGINE_LAYER=RESOLVED**
- **P0_LEGACY_LAYER=RESOLVED**
- **P0_END_TO_END=RESOLVED**

### V283 Core Functional Truth — WAVE A COMPLETE

- Adapter: `v283-rentability-adapter.js` routes legacy `rentabilityHistory` to `HistoricalPerformance.calculatePerformance()`
- Synthetic benchmark eliminated: `rentBenchSeries` returns unavailable markers
- Current price/holdings mutations verified to NOT affect historical results
- Adapter loads at runtime (HTTP 200, correct MIME type)
- Commit: c9f1e9c
- **NEXT_ACTION=V283_WAVE_B_CORE_WORKFLOW_AUDIT**

### V283 Core Functional Truth — WAVE B COMPLETE

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

### V283 Core Functional Truth — WAVE C COMPLETE

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

- Vendored 25 project skills from C:/Projetos/skills to .agents/skills/
- Created PROJECT_SKILLS_MANIFEST.md with full inventory and classification
- Created SKILLS_ROUTING.md with mission-type routing table
- Updated legacy .agents/SKILL_ROUTER.md as deprecated reference
- Commit: de2fa0f
- No runtime changes, no financial logic changes, no test changes

### V282B Project Memory Continuity and Skills Certification — IN PROGRESS

- Certifying V282A filesystem truth
- Reconciling skill counts and tracking status
- Creating PROJECT_CONTINUITY_POLICY.md for repository-first memory
- Documenting .agents/skills gitignore issue (skills not versioned)
- Updating canonical document references in AGENTS.md

### Active Blockers

1. **Legacy rentabilityHistory not yet routed through V281 engine** — P0_END_TO_END=PARTIAL
2. **Multiple routing documents** — Consolidated to docs/ai/SKILLS_ROUTING.md as canonical

### V282C Repository Reproducibility — COMPLETED

- REPRODUCIBLE_AFTER_FRESH_CLONE=true (tracked skills)
- PROJECT_CONTINUITY_LEVEL=4 (FRESH_CLONE_REPRODUCIBLE)

---

## Workspace / worktree audit — 2026-09-25

- `origin/main=5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`; PR #416 (V265) está
  CLOSED/MERGED nesse SHA. O `main` canônico começou quatro commits atrás e foi
  atualizado por fast-forward após verificar zero colisões com os 335 caminhos
  não rastreados; estes continuam preservados. O checkout terminou sincronizado
  com `origin/main`, sem alterações rastreadas.
- O inventário começou com 37 worktrees registradas. Após remover normalmente
  as worktrees limpas/equivalentes de #414, #415 e #416, restam 34, incluindo
  esta worktree documental. As worktrees internas em `.worktrees` continuam
  registradas. Nenhuma branch local ou remota foi removida.
- Quatorze diretórios órfãos comprovadamente vazios foram removidos sem
  recursão. Pastas com arquivos, metadados `.git`, commits exclusivos ou
  evidência ambígua foram preservadas. A worktree registrada
  `v264-postmerge-audit` estava limpa e sem commits exclusivos; `git worktree
  remove` retirou seu registro, mas falhou ao apagar a pasta física (`Invalid
  argument`). O resíduo sem `.git` foi preservado, sem força ou limpeza manual.
- Pastas não registradas restantes e conteúdo local do canonical permanecem
  para revisão. Consulta de processos não encontrou consumidor além do próprio
  shell da auditoria; uma segunda verificação por diretório foi limitada pela
  permissão do host e, por isso, diretórios ambíguos não foram removidos.
- Os 335 caminhos locais não rastreados do canonical incluem 139 arquivos
  diretamente na raiz e diretórios de screenshots QA (79), ferramentas (71),
  `local-imports` (19), docs (7), `.worktrees` (5), scripts (4) e testes (4),
  além de diretórios de arquivo único. São evidência, dados locais e artefatos
  heterogêneos; todos foram mantidos.
- Órfãos com conteúdo mantidos: `.qa-state`, `v206-executive-evolution`,
  `v222-allocation-intelligence`, `v245-import-center-2` e
  `v264-postmerge-audit`. A pasta vazia de V265 continua bloqueada pelo sistema.
- Uso aproximado observado: raiz oficial de worktrees 1.732 MiB; checkout
  canônico (excluindo `.git`, `node_modules` e `.worktrees`) 800 MiB;
  `node_modules` canônico 120 MiB; worktrees internas 168 MiB. O banco Git
  reportou 25 arquivos temporários `tmp_obj_*` (~259 MiB). `git fsck --full
  --no-reflogs --unreachable` encontrou 169 commits inalcançáveis (10.919
  objetos no total). Nenhum objeto foi apagado; o risco de histórico
  recuperável impede GC nesta missão.
- Validação limpa em `origin/main`: modern 815/815; geral 249/249; builds
  moderno/legado PASS; contrato QA 2/2; browser smoke 7 larguras PASS. `qa:all`
  passa após iniciar o servidor oficial local (`qa:serve:legacy`) em loopback;
  sem servidor, o smoke retorna `ERR_CONNECTION_REFUSED`. Nenhuma alteração de
  produto, finanças, persistência ou dependências do projeto foi feita.
- Governança proposta: usar somente a raiz externa para novas worktrees,
  tratar `.worktrees` interno como legado, aplicar remoção pós-merge com gates
  explícitos e preservar qualquer conteúdo duvidoso. A worktree #416 deixou
  uma junction `node_modules` para o resíduo V264; a junction foi removida sem
  tocar o alvo. A pasta pai vazia continua bloqueada pelo sistema. O resíduo
  V264 inclui código-fonte, testes, docs, `Refs` e dependências e foi preservado.
- A atualização documental está na branch `docs/workspace-worktree-lifecycle`;
  merge permanece um gate humano separado.
- V266 não foi iniciada: XP/BTG depende de fixtures reais sanitizadas; TWR/XIRR
  depende de histórico suficiente; MODE_B aguarda decisão de provedor/negócio;
  não há regressão mobile específica; Reports e clean-state estão integrados.
  Nenhuma macrofase independente estava suficientemente evidenciada para
  iniciar implementação nesta auditoria.

## Skills library audit — 2026-09-25

- Snapshot: 42 direct folders, 43 SKILL.md files, 38 physical operational
  packages; caveman-stats cannot run without its two required hooks, and
  banner-design has missing optional references.
  Four operational Skill files are tracked; most of the library is
  machine-local/ignored and must be rediscovered in each executor.
- Superpowers is available through the global plugin in this session, not as a
  local package under .agents/skills. No shim was created. Seven optional
  Markdown links are missing in web-quality-audit/Mantis; banner-design also
  lacks cited auxiliary references, and caveman-stats lacks its required hooks.
  No package was deleted.
- docs/ai/SKILL_OPERATIONAL_CATALOG.md now records classification and routing.
  Changes are included in PR #417; merge remains unauthorized.

## V265 — QA harness resilience — 2026-09-25

- Branch `feature/v265-qa-harness-resilience`, based on V264 merge `10995f31d7ada0b7f8a02e6317813de0c21fc55d`. This phase hardens only local QA infrastructure: the static test server now reads a file before sending HTTP 200 (so missing generated assets return 404 without crashing), supports an isolated CLI port, and has a regression test. QA scripts now include the missing `test:qa-harness` command and build `modern/dist` before browser smoke.
- The supported local QA server is Node-based and bound to `127.0.0.1`; the previous Python server on this host accepted a connection but returned an empty response. A different process occupied port 4173 and was left untouched; validation used port 4174.
- Validation after post-governance reconciliation: QA harness 2/2 (missing asset 404 followed by valid 200; sibling-prefix traversal denied), modern 815/815, general 249/249, modern/legacy builds PASS, `qa:all` PASS; browser smoke passed 390, 430, 768, 1366, 1440, 1536 and 1920 with no overflow, console/page errors or local request failures; diff-check PASS. Existing Vite/Node warnings remain unrelated.
- No production application, financial logic, data, persistence, Firebase, imports, or tax code changed. `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope. No authenticated portfolio QA was required or performed for this harness-only change.
- PR #416 closed as merged to `main` at `5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`; its exact merged tree was verified before worktree removal. No merge was performed during this workspace-audit mission.

## V266 — QA smoke autostart — 2026-09-25

- Branch `feature/v266-qa-smoke-autostart`, based on V265 merge `5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`. This phase makes `qa:all` autonomous by auto-starting the local QA server when `QA_ORIGIN` is not defined.
- Implementation: new wrapper `tools/qa/run-smoke-with-lifecycle.js` that checks `QA_ORIGIN`; if absent, starts `startLocalHttpServer(root, 0)` (ephemeral port), waits for HTTP 200 readiness, runs `browser-smoke.js`, and **always** stops owned server in `finally` block. If `QA_ORIGIN` supplied, passes through directly with no server management.
- Reuses existing V265-hardened `startLocalHttpServer` — no new server implementation. Preserves path containment (403 on traversal), ephemeral port support.
- Added lifecycle test suite `tests/qa-lifecycle.test.js` (5 tests): TEST 1 autostart+smoke+cleanup, TEST 2 QA_ORIGIN passthrough, TEST 3 failure cleanup, TEST 4 startup failure diagnostics, TEST 5 V265 404 survival. Added `test:qa-lifecycle` npm script.
- Validation: `qa:all` PASS from clean state (no manual server); `test:qa-harness` 2/2; `test:qa-lifecycle` 5/5; `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `git diff --check` PASS. Browser smoke 7 widths (390, 430, 768, 1366, 1440, 1536, 1920) all PASS: no overflow, console errors, page errors, request failures.
- QA_ORIGIN compatibility verified: explicit origin used, no autostart, external server not stopped. Manual server commands (`qa:serve:legacy`, `qa:start-server`) preserved.
- No production application, financial logic, data, persistence, Firebase, imports, or tax code changed. `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope.
- Documentation updated: `docs/ai/QA_HARNESS.md` records autonomous execution and QA_ORIGIN behavior.
- PR #419 squash-merged as `5b9de334775d24833e0e696a2bc825f9b7a4361d`. Local main fast-forwarded to `origin/main`. V266 worktree removed (residue preserved due to Windows file lock).

## V267 — Backup and recovery hardening — 2026-09-25 — COMPLETED & MERGED

- **Selection rationale:** Delivers real user value (reliable backup/restore with audit trail), reduces operational risk (no silent overwrites, preview before restore), strongly testable, autonomous completion possible, does not require fabricated financial history or broker files, unlocks later phases.
- **Scope delivered:** Deterministic export with explicit version/schema metadata; restore preview before write (dry-run); validation before restore (schema, version, structural); no silent overwrite (explicit confirmation); failure-safe recovery (atomic, rollback); auditability (operation logs); backward compatibility (recognize legacy formats).
- **Constraints preserved:** Zero real financial writes before explicit confirmation; preserve UNKNOWN != ZERO, PARTIAL != COMPLETE, STALE != FRESH, FINANCIAL_AS_OF != SOURCE_AS_OF; MANUAL_AUTHORITY_PRESERVED=true.
- **Implementation:**
  - `backup-portability.js` v1.1: `operationId`, `exportedBy`, `schemaIdentifiers.stateSchema`/`configSchema` = `backup-portability-v1.1`, `compatibility` object, `SCHEMA_VERSIONS` registry
  - `verifyBackup`: future/unknown schema warnings via semantic major comparison, checksum validation, COUNT_MISMATCH detection, prototype pollution protection
  - `previewRestore`: detailed diff (adds/updates/conflicts/skips), summary object, `restoreAllowed` semantics (SUPPORTED + no conflicts), compatibility/warnings propagated, side-effect free
  - Diff semantics: UPDATE (mutable value changes) vs CONFLICT (identity fields: ticker, type, name, eventType)
  - Legacy v1.0 (major=1) → SUPPORTED; major < 1 → MIGRATABLE (blocks restore); major > 1 → TOO_NEW
- **Tests:** `tests/backup-recovery-hardening.test.js` (9 tests), `tests/v249-backup-recovery.test.js` updated for v1.1
- **Validation:** `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `qa:all` PASS; `git diff --check` PASS; `test:backup-recovery` 9/9; `test:v249` 12/12
- **PR #420** squash-merged as `f11d38683b1aca50fb639aba1746f0269c426ef6`. Local main fast-forwarded to `origin/main`. V267 worktree removed (residue preserved due to Windows file lock).
- **No production application, financial logic, data, persistence, Firebase, imports, or tax code changed.** `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope.

## V268 — Portfolio history foundation — 2026-09-25 (SELECTED)

- **Selection rationale:** Delivers real user value (deterministic portfolio snapshots with provenance), enables future TWR/XIRR over real history (no synthetic backfill), strongly testable, autonomous completion possible, does not require fabricated financial history or broker files, builds on V267 backup/restore guarantees.
- **Scope:** Deterministic snapshot capture with `operationId`-equivalent `contentHash`, provenance (source, user, wallet, reason), price coverage classification, chronological storage order, deduplication by content hash, retention by age/count, schema validation, auto-capture scheduling.
- **Constraints:** Zero real financial writes; preserve UNKNOWN != ZERO, PARTIAL != COMPLETE, STALE != FRESH, FINANCIAL_AS_OF != SOURCE_AS_OF; MANUAL_AUTHORITY_PRESERVED=true; NO_FAKE_HISTORY_CREATED=true; TWR_XIRR_AVAILABLE=false until sufficient trustworthy history exists.
- **Implementation:**
  - `portfolio-history-core.js`: `captureSnapshot`, `getSnapshots`, `deduplicateSnapshots`, `pruneSnapshots`, `validateSnapshot`, `shouldAutoCapture`, `getHistoryState`, `setHistoryState`, `addSnapshotToHistory`, `computeValuations`, `computePriceCoverage`
  - `portfolioHistory` state key: `{ snapshots: [], config: {} }` with chronological storage (oldest first)
  - Content hash = SHA256 of `{ valuations, priceCoverage, capturedAt, schemaVersion }` — deterministic for identical portfolio state + timestamp
  - Provenance: `source` (MANUAL|AUTO|IMPORT|RECOVERY), `userId`, `walletId`, `captureReason`, `extra`
  - Price coverage: FULL_COVERAGE | PARTIAL_COVERAGE | UNKNOWN (blocks TWR/XIRR)
  - Deduplication: by `contentHash` (identical portfolio state at same timestamp)
  - Retention: max 3650 snapshots (10 years daily), max 3650 days age
  - Ordering contract: STORAGE = chronological (oldest first); DISPLAY = `getSnapshots` returns newest-first; `pruneSnapshots` returns chronological for storage consistency
- **Tests:** `tests/portfolio-history-core.test.js` (18 tests covering capture, query, dedup, prune, validation, ordering contract, auto-capture)
- **Integration:** `portfolioHistory` state included in V267 backup/restore automatically via state serialization
- **Validation:** `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `qa:all` PASS; `git diff --check` PASS; `test:backup-recovery` 9/9; `test:v249` 12/12
- **Branch:** `feature/v268-portfolio-history-foundation` from `origin/main` (`f11d38683b1aca50fb639aba1746f0269c426ef6`)
- **Worktree:** `C:\Projetos\carteira-investimentos.worktrees\v268-portfolio-history-foundation`

## Post-V264 baseline — 2026-09-25

- V263 PR #413 was squash-merged on `main` as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`.
- V264 was squash-merged by PR #415 as `10995f31d7ada0b7f8a02e6317813de0c21fc55d`. The SGS 433 fetcher validates canonical `YYYY-MM` bounds and sends inclusive `DD/MM/YYYY` dates; invalid ranges fail before fetch. Response observations in `DD/MM/YYYY` normalize to month keys; the former `MM/YYYY` response shape remains accepted.
- Official read-only smoke: July 2022 returned HTTP 200 and `01/07/2022`; Aug–Sep 2026 returned HTTP 200 with August only. A September-only direct request had a transient HTTP 502; the provider has also returned its explicit 404 `Value(s) not found` for unpublished periods. That explicit no-data payload is `EMPTY_RESPONSE`, not zero; other HTTP errors are explicit provider errors.
- No IPCA+ automatic security valuation, financial formula, manual fixed-income authority, persistence, or financial/tax write behavior changed. Post-merge validation on `origin/main` in a clean worktree: modern 815/815, general 249/249, modern and legacy builds PASS, diff-check PASS.
- Governance PR #414 was subsequently merged; current main is `98420aea10b552264a729b8470d91ff129567640` and includes the permanent governance rules.

## V263 PR #413 — Financial As-Of Provenance (Renda Fixa) — historical record

- Branch: `feature/v263-rf-freshness-valuation-asof`, base = merged main `9be3d9c3e17b659a507e46a8f57c2b152174366b` (V262 squash-merge of PR #412). Implementation commits: domain `e970bc94`, UI/tests `a5f459ba`; docs/certification commits follow on the same branch. The PR #413 current head must be obtained from Git/GitHub, not from this document.
- PR [#413](https://github.com/paulinhoo2002-ctrl/carteira-investimentos/pull/413): later squash-merged as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`; status/check details above are historical certification evidence.
- V263 delivers separation of **financial as-of** from **source as-of** in the modern readonly Renda Fixa surface: new `modern/src/domain/fixedIncome/financialAsOf.ts` extracts evidence with confidence HIGH (explicit `financialAsOf`/`valuationAsOf`), MEDIUM (`quoteUpdatedAt`/`updated_at` broker metadata) or UNKNOWN. Application/capture/reconstruction/import dates are never promoted. Future dates are rejected. Without evidence the value stays UNKNOWN — never zero, never LIVE.
- `valuationState.ts` now derives `authoritativeValueAsOf` and `authoritativeFreshness` from that evidence and exposes `authoritativeAsOfEvidence/Source/Confidence`. Manual authority is preserved: the shadow value never replaces the authoritative value. IPCA+ remains `UNSUPPORTED_IPCA_EXACT`; CDI path unchanged; no financial methodology changed.
- Readonly contract: two additive OPTIONAL item fields preserve provenance end-to-end — `financialAsOfRaw` (explicit financial valuation timestamp, HIGH) and `quoteUpdatedAtRaw` (broker/update metadata, MEDIUM); legacy snapshots without either remain valid. The host mapper maps each family into its own field; collapsing them into one would promote MEDIUM to HIGH (bug found in independent review, fixed before certification).
- V263 implementation head under final visual certification (2026-09-25): `f3ed317a1ede6caee41e8bd0ba083be2045156bb`; PR #413 was subsequently squash-merged to `main` as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`. The historical exact-head CI, Vercel and visual evidence below describe that certification checkpoint, not the current PR state.
- UI: list "As-of" cell gains a confidence badge (data explícita/metadado); mobile/detail gains separate "As-of financeiro" (with confidence) and "As-of da fonte" rows. Demo/unauthenticated items correctly show no badge (UNKNOWN).
- PR description's original validation recorded `test:modern` 789/789 and `npm test` 249/249. A fresh local run on the current exact head reports modern 805/805 and general 249/249; both builds and diff-check pass. The two transient V84 browser-smoke failures seen mid-mission were root-caused to the missing generated `modern/dist` build artifact in the fresh worktree (harness 404 crash), not to code; after `build:modern` they pass 4/4.
- Visual QA method: `npm run build:modern` then Vite production preview on `/host.html`, navigate using the modern shell's dedicated Renda Fixa entry. Earlier raw/default-styled screenshots came from an invalid asset-serving path, and preview screenshots were the Vercel SSO gate; neither proves product rendering. The valid method confirmed theme/fonts/assets and viewport fit in both V262 and V263. Axe WCAG A/AA reported no violations on the local fixture surface.
- The 24-column table scrolls inside its own wrapper; page-level overflow `1886px` cited in older notes was not reproduced in either correctly served V262 or V263 build and is removed as an unverified QA artifact. The SGS request failure for `07/2022` was pre-existing on V262/V263 and was subsequently addressed by V264.
- Financial/tax/import/restore writes: 0. PR #413 is merged; no merge action is pending for it.

## V262 PR #412 — IPCA Diagnostics — 2026-09-24

- Branch: `feature/v262-fixed-income-advanced-shadow-valuation`; current code head: `26d1526389a92cc4ca94fff7bc671821f2cf0b09`.
- PR [#412](https://github.com/paulinhoo2002-ctrl/carteira-investimentos/pull/412): OPEN and mergeable. CI run `36079088319` succeeded on the same SHA.
- Vercel deployment `6651218341` is READY for the same SHA; authenticated QA used only the explicitly approved preview alias `carteira-investimentos-git-ca8b51-paulinhoo2002-ctrls-projects.vercel.app`.
- Authenticated product route: `/?protectedReadOnlyQa=1` (legacy Renda Fixa screen). `/modern/` is not the V262 user route. The test-host query `testMode=1&activeWalletHost=1` intentionally bypasses Firebase and must not be used for real-wallet auth QA.
- Runtime contract: manual Renda Fixa authority preserved; exact IPCA remains `UNSUPPORTED_IPCA_EXACT`; no generic IPCA+ value is calculated; coverage and freshness remain separate (`UNAVAILABLE` vs `UNKNOWN` in the inspected portfolio); CDI unchanged; unknown is not zero.
- Authenticated responsive matrix 390/430/768/1366/1440/1536/1920 PASS; no horizontal overflow or critical clipping. Axe: 0 critical / 0 serious. Representative screenshots were captured/reviewed locally and not committed. Offline/reconnect PASS with an organically created trusted local snapshot for the selected wallet; offline remained cached/read-only and truthful.
- Root cause fixed: protected QA mode blocked canonical portfolio persistence as intended, while offline recovery depended on a stale `civ5` wallet snapshot. A distinct user-bound local read-only cache now records the validated selected wallet from authenticated app-loaded state; canonical `civ5` stays unchanged. Snapshot/as-of provenance and fail-closed validation are preserved. Local offline cache writes are classified separately from financial/cloud writes.
- Financial, tax, import-confirmation and real-restore writes: 0. Snapshot bootstrap in normal authenticated mode may emit a **nonfinancial** access-audit update; do not characterize this as zero total backend writes. No financial controls or mutations were used.
- Local evidence: focused offline/snapshot/security tests PASS; `npm test` 249/249; modern 777/777; modern and legacy builds PASS. No financial formulas changed.
- Offline recovered the same selected wallet and fixed-income authority; reconnect restored authenticated online state without a request/reload loop. After any documentation-only update, revalidate CI and Vercel against the exact current PR head before readiness. Merge remains unauthorized and not executed.

## Current canonical state — 2026-09-24

- `CURRENT_MAIN_SHA=c3466561c4f6134edd5ea915be1d0ed1ca387286` (verified before the V262 documentation closeout).
- PR #412 is the active V262 phase; its merge has not been authorized or performed.
- Latest product baseline on main before V262: V261 fixed-income freshness/valuation provenance.
- Next step after V262 is explicit human squash-merge authorization; do not begin another product phase automatically.
- This state update records read-only QA evidence and does not change financial data or formulas.

## 2026-09-22 - Project identity hard lock

- `PROJECT_IDENTITY_HARD_LOCK=true`.
- `PROJECT_ROOT=C:\Projetos\carteira-investimentos`.
- `OTHER_PROJECTS_ALLOWED=false` e `CROSS_PROJECT_ACCESS_ALLOWED=false`.
- Worktrees válidas pertencem ao mesmo repositório e ficam sob
  `C:\Projetos\carteira-investimentos.worktrees`.
- Toda missão exige `PROJECT_IDENTITY_GATE` antes de leitura ou escrita
  substancial.
- Mismatch exige `HUMAN_BLOCKER_WRONG_PROJECT_AND_STOP`.
- Esta entrada é governança durável. Não altera o estado funcional nem os
  snapshots históricos abaixo.

## Estado canônico V79 — 2026-09-15

- `CURRENT_HEAD` funcional: `25c5854177a9db88dba76a87d2d66d49dc59feb0`
- `CURRENT_BRANCH`: `feature/phase-4-automation-foundation`
- `LATEST_COMPLETED_MISSION`: V78
- `FINANCIAL_BASELINE`: `431/330/101`, 99 referências, `2709626` cents,
  FP `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`
- `QA_STATUS`: canonical 4173/9233 authenticated and stabilized after V77
- `MARKET_DATA_STATUS`: Yahoo Chart, 36/36, tokenless
- `CORPORATE_EVENT_STATUS`: public cache/sync/parser active, coverage partial
- `FIXED_INCOME_STATUS`: 5 positions; 2 CDI shadow candidates; stale/unknown
- `PERFORMANCE_STATUS`: tracking since 2026-09-15; TWR/XIRR collecting history
- `BROKER_IMPORT_STATUS`: Inter deterministic; XP/BTG fixture-required
- `DASHBOARD_STATUS`: working, maturity partial
- `OPEN_BLOCKERS`: RF freshness, XP/BTG fixtures, future event coverage
- `NEXT_RECOMMENDED_WORK`: improve RF as-of/valuation and dashboard safely
- `LAST_UPDATED_AT`: `2026-09-15`

## 2026-09-09 - Runtime local autoritativo para recovery protegido

- O runtime local autoritativo usa o perfil real do Chrome `Default` e a chave
  canônica `localStorage['civ5']`; o launcher não abre o perfil enquanto ele
  estiver bloqueado pelo Chrome pessoal e não encerra processos sozinho.
- O modo `authoritativeLocalRecovery=1` mantém leitura/listener cloud para
  diagnóstico, mas bloqueia apply cloud, save local normal, fila/upload/sync e
  consumo de autorização. O recovery 101 continua separado do QA cloud
  somente-leitura e da fonte forense.
- Foram adicionados launcher local, launcher QA protegido, status read-only e
  teste de isolamento. A recuperação real não foi executada; após a mudança de
  HEAD, qualquer autorização anterior precisa ser substituída por nova
  autorização single-use.

## 2026-09-09 - Phase 4H live 101-source gate

- The protected QA runtime is valid on the disposable profile
  `.qa-profile-recovery` at CDP `9244`; personal Chrome was not used.
- Cloud read is authenticated and read-only: `430/329/101`, financial total
  `3718277` cents, fingerprint `cf9b16...`; local forensic state is
  `329/329/0`, financial total `2685096` cents, fingerprint `e1ad958f...`.
- The exact cloud-only source set has `101` records: `95` exact donor matches,
  `4` KNUQ variants and `2` post-donor events. Fresh deterministic source-set
  fingerprints are `eee04bae63a3969e7591b22bc50ef28f95be39f7eff7102e4a99907681dc8bf4`
  and classification fingerprint
  `d5776b75af941ac805069958f05095b738c2996c776993408fedcf64f7c16210`.
- The historical donor hash remains unreproducible and is not a mandatory
  authorization dependency because the current 101 identities and classes are
  independently proven. Three protected read-only prewrites passed identically.
- No real recovery, rollback, reconciliation write, sync, Class C write or
  August pilot was executed. The next step is a new explicit single-use
  authorization bound to the final HEAD and these fresh source-set hashes.

## 2026-09-08 - QA autenticado persistente e gates não bloqueantes

- O navegador QA canônico usa o perfil persistente
  `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-authenticated` e CDP
  localhost na porta 9233. O launcher reutiliza uma instância saudável e evita
  perfis aleatórios.
- `npm.cmd run qa:auth:status` é somente leitura. Quando a sessão Google/Firebase
  não está disponível, `npm.cmd run qa:auth:resume` continua o fluxo sem escrita
  e registra somente nomes de gates, HEAD e timestamps em `.qa-state/`.
- Nenhum cookie, token, credencial ou payload privado é persistido pelo estado
  pendente. Gates autenticados reais podem ser retomados depois do login normal;
  testes, builds, fixtures e QA não autenticado continuam normalmente.

## 2026-09-06 - Phase 4 automation foundation

- `feature/phase-4-automation-foundation` starts from merged `origin/main`
  `56e5488b`.
- Existing safe automation anchors are preserved: quote `qInFlight`, supported
  import preview/duplicate checks, backup validation/rollback, RF maturity
  alerts, and exact-identity contextual navigation.
- Phase 4 safety contract is documented in
  `docs/ai/PHASE_4_AUTOMATION_MAP.md`.
- No frozen screen, financial semantics, persistence, schema, backup/import,
  cloud/auth or real data was changed in the foundation checkpoint.
- Phase 4A now has a pure read-only import foundation in `import-foundation.js`
  with exact identity, deterministic fingerprints and ephemeral reconciliation.
- Phase 4B now adds `historical-import-preview.js` for read-only B3 income
  preview, historical deduplication, movement classification, custody snapshot
  reconciliation, brokerage-note identity checks and import report modeling.
  Real import write remains disabled.
- Phase 4C now adds `historical-reconstruction.js` for read-only cross-source
  economic-event deduplication, verified-history expected positions, three-way
  reconciliation, conflict review and coverage reporting. Unknown or
  unverified events have zero position impact.
- Phase 4D now adds `brokerage-professional.js` for canonical Inter-note
  normalization, note/operation idempotency, fee safety, cross-source event
  linkage, position protection and professional report contracts. No write or
  automatic fee allocation is enabled.
- Phase 4E now adds `protected-import-transaction.js` as a test-fixture-only
  coordinator for preview, confirmation, stale-state blocking, snapshots,
  exact deduplication, idempotency, targeted rollback and reconciliation. It
  does not touch persistence, real profiles, Firebase or real user data.
- Phase 4F now adds `protected-import-pipeline.js`, composing the existing
  import, reconstruction, brokerage and protected-write foundations into a
  deterministic isolated dry-run. It exercises the real Phase 4E coordinator,
  cross-source deduplication, rollback and printable reconciliation without
  adding a route, changing frozen screens or writing real portfolio data.
- Phase 4G now adds the isolated `Importar dados` review center in `index.html`.
  It presents the existing source contract, detection, preview, duplicate and
  conflict counts, reconciliation, rollback evidence and ephemeral simulation
  history. The UI is explicitly test-mode only and does not call persistence,
  Firebase, localStorage or a real portfolio profile.
- Phase 4G keeps B3 movements and arbitrary brokerage PDFs partial/review-only,
  keeps unknown/RF/corporate evidence gaps manual, and reuses the existing
  HTML/native-print reporting foundation. No frozen screen or financial
  semantics were changed.
- Phase 4G.2 freezes the import-center visual canon: compact mobile step
  indicator, sober primary actions, compact empty session state and a visible
  safety result strip for preserved position, zero writes, validated snapshot
  and tested rollback.
- Phase 4H.7 proves a read-only shadow linkage policy for Yahoo reference
  events and B3 payment evidence. The 21 August 2026 cross-source pairs remain
  high-confidence rather than exact links; TEPP11 remains a B3-only candidate.
  No ledger migration, schema change, persistence write or real pilot write was
  performed. Durable linkage remains a separately authorized future boundary.
- Phase 4H.8 is complete after the current implementation and governance
  commits. The additive test-mode model preserves legacy proventos, stores one
  canonical event with multiple source evidences, and keeps real persistence
  and UI semantics unchanged. The August financial increment is `R$ 85,37`;
  `R$ 2.488,47` is already represented value, not an increment.
- Governance correction: `df9daa3` remains unchanged and is recorded as a
  partial H8 commit despite its inaccurate Phase 4H.7 message label.
- Phase 4H.8.1 defines and tests the manual-review, fingerprint freshness,
  single-session authorization, financial-increment and rollback gates for a
  future pilot. The real-write gate remains hard-disabled and no production
  persistence path is changed.

## 2026-09-06 - Phase 3 final usability audit checkpoint

- Release branch `release/phase-3-3-final` is based on `origin/main` at
  `e9abe758` and contains the three authorized productivity commits.
- Browser matrix for Dashboard, Ativos, Aportes, Dividendos and Renda Fixa
  passed at 390, 430, 768, 1366, 1440, 1536 and 1920 px with no overflow,
  page errors or request failures.
- Mobile critical controls were touch-safe. Small desktop chart/metadata text
  is auxiliary and was not enlarged with a broad CSS rewrite.
- Charts with supported series expose focusable points, labels, titles and
  tooltips; Patrimônio remains an explicit monthly list without invented chart
  history.
- Backup export age remains a protected backlog item because no real export
  timestamp source is exposed by the product.
- In-memory Ativos benchmark: 50=44.4 ms; 200=155.1 ms; 500=379.8 ms;
  1000=978.3 ms. Reassess virtualization only with realistic data evidence.

Snapshot date: 2026-09-03

## Identity

- Repository: `paulinhoo2002-ctrl/carteira-investimentos`
- Workspace: `C:\Projetos\carteira-investimentos`
- Authoritative product: personal investment portfolio control application.
- Architecture: legacy SPA plus an isolated modern readonly host.
- This repository is independent from `C:\Projetos\carteira-2.0`.

## Git state

- Branch: `feat/visual-product-north-star`
- Local HEAD: `c53085d689930a1ca1cffd17fdf3bc58d6bbb356`
- `origin/main`: `ea9d6fc2d9ff4bf6935db9f5ae335efc16134cef`
- Remote: `https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git`
- Working tree at audit start: modified `index.html` and
  `tests/dashboard-patrimony-chart-correction.test.js`; untracked `Refs/`,
  `.tmp-reconcile.patch` and `docs/ai/patrimony-north-star-cycle2.md`.
- Those changes are historical/current work and are intentionally preserved.

## Current product state

- `index.html` remains the source of truth for the real application.
- Dashboard, Dividendos, Ativos and Rentabilidade have approved North Star
  direction in project history; the other legacy screens share the same visual
  language but should be changed incrementally.
- The latest local release lineage is Real Use Refinement 02, merged through
  PR #347 in `origin/main` (`ea9d6fc`).
- Financial values, formulas, persisted records and real data are protected.
- The modern React/Vite host is readonly and must not become a parallel write
  path without a separately approved phase.

## Visual canon assets

- `VISUAL_CANON_ASSETS=AVAILABLE`
- `DASHBOARD_CANONICAL_REFERENCE=true`
- `DIVIDENDS_CANONICAL_REFERENCE=true`
- Canonical files live in `Refs/visual-canon/` and are not product data.
- `VISUAL_REFERENCE_LIBRARY=READY`
- `PRIMARY_CANON_COUNT=2`
- `SECONDARY_REFERENCE_COUNT=1`
- `SCREEN_REFERENCE_COUNT=4`
- `PATTERN_REFERENCE_COUNT=0`
- `REJECTED_CONFLICT_COUNT=0`
- `DUPLICATE_COUNT=0`
- `DUPLICATE_HASHES_REPORTED=true`
- Full inventory and priority rules: `docs/ai/VISUAL_REFERENCE_INDEX.md`.

## Frozen boundaries

Do not change without an explicit phase and evidence:

- `finance-core.js` and financial formulas;
- `persistence-core.js`, storage keys, Firebase, backup/import and migration;
- schema and zero-versus-absence semantics;
- real portfolio, dividend, fixed-income and goal data;
- `sw.js`, `manifest.json`, `firestore.rules` and `modern/src`;
- handlers or canonical identity contracts merely to satisfy visual work.

## Known documentation gaps

- `CHANGELOG.md` stops before the latest North Star and Real Use work, so it is
  historical/partial rather than a complete release ledger.

## Next mission boundary

Use `docs/ai/NEXT_STEP.md`. This audit creates project memory only; it does not
start a feature, visual migration or release operation.

## 2026-09-03 - Canonical visual migration 01

- `CANONICAL_VISUAL_MIGRATION_01=READY_FOR_FINAL_USER_APPROVAL`
- `DASHBOARD_CANONICAL_IMPLEMENTATION=READY_FOR_USER_APPROVAL`
- Dashboard and Dividendos received a scoped legacy CSS alignment against the
  two primary canonical screenshots.
- Dashboard desktop performance rows now follow the canonical PM/current/
  variation/result/bar contract without increasing the approved height budget.
- Final acceptance refined Dashboard vertical density and Dividendos semantic
  KPI icons, flat Top ativos ranking and Total geral donut center.
- Financial helpers, datasets, handlers, routes, persistence and protected
  areas were preserved.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-01/acceptance-final/`; screens are
  not frozen yet.

## 2026-09-03 - RF orphan reconciliation

- `RF_ORPHAN_RECONCILIATION=COMPLETE`
- `RF_ORPHAN_RECOVERY_NEEDED=false`
- The orphan chain `31d0d11e -> a87078ec -> 42c31355 -> 4e882816` contains
  fixed-rate identity, readonly projection, supplement and test concepts that
  are already present in the canonical state.
- The canonical state is newer for CDI parsing, daily factors, valuation and
  related integration coverage.
- No product, financial, persistence, schema or real-data delta was recovered.

## 2026-09-03 - Canonical visual freeze

- `DASHBOARD_VISUAL=FROZEN`
- `DIVIDENDS_VISUAL=FROZEN`
- `SIDEBAR_VISUAL=FROZEN`
- Frozen references: `Refs/visual-canon/dashboard-canonical.png` and
  `Refs/visual-canon/dividendos-canonical.png`.
- The frozen Dashboard contract preserves the five-KPI executive row,
  patrimonio evolution, class composition, compact passive income, simultaneous
  highs/lows, PM/current/variation/result and approved responsive density.
- The frozen Dividendos contract preserves five semantic KPIs, monthly history,
  multi-year income chart, compact top-assets ranking, annual total donut and
  approved tooltip/mobile behavior.
- The frozen Sidebar contract preserves the dark shell, green active state,
  desktop navigation hierarchy, Reports grouping and mobile bottom navigation.
- Future visual changes to these areas require explicit user authorization.

## 2026-09-03 - Canonical visual migration 02: Ativos

- `CANONICAL_VISUAL_MIGRATION_02=COMPLETE`
- `ATIVOS_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- `ATIVOS_VISUAL=FROZEN`
- Ativos now keeps the professional positions table open by default, with
  individual result, rentabilidade and portfolio weight visible from the
  official analysis rows.
- Variable-asset result display uses the existing current-minus-applied
  values already exposed by the product; fixed-income rows preserve the
  official RF helpers and actions.
- The RF desktop table is responsively contained at the notebook breakpoint;
  its financial columns remain visible and the action family stays inside
  the table bounds.
- No financial engine, dataset, persistence, schema, handler or protected
  modern frontend area changed. Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-02/`.
- `ATIVOS_PERFORMANCE_FILTER=IMPLEMENTED`
- `ATIVOS_PERFORMANCE_FILTER_CLASSIFICATION=OFFICIAL_RESULT_SIGN`
- `ATIVOS_PERFORMANCE_FILTER=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `INCOMPLETE_DATA_NOT_NEUTRAL=true`
- `FILTER_COMBINATION_SUPPORTED=true`
- `FILTER_COUNT_SUPPORTED=true`
- `CLEAR_FILTERS_SUPPORTED=true`
- O filtro combina busca, classe e ordenacao sem alterar a fonte oficial de
  resultado; dados incompletos permanecem fora de Positivos, Negativos e
  Neutros, sem serem convertidos em zero.
- O estado vazio usa a mensagem explicita `Nenhum ativo corresponde aos
  filtros.` e Limpar filtros restaura busca, classe, revisao e performance.
- Evidencia local desta melhoria: `qa-screenshots/product-usability-01/`.

## 2026-09-03 - Canonical visual migration 03: Renda Fixa

- `RENDA_FIXA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- The dedicated `renda-fixa` view now exposes applied value, current value,
  result, rentability and maturity in its compact position rows.
- Incomplete current values remain explicitly marked for update and never
  display a fabricated result.
- The position list uses the existing official RF snapshot rows; no financial
  formula, event ledger, persistence path, schema, handler or protected screen
  changed. Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-03/`.
- The screen is not frozen until explicit user approval.

## 2026-09-03 - Fixed income visual freeze

- `RENDA_FIXA_VISUAL=FROZEN`
- `RF_SOURCE_OF_TRUTH=rfIntelligenceSnapshot()`
- `RF_APPLIED_SOURCE=rfValues().applied`
- `RF_CURRENT_SOURCE=rfValues().current`
- `RF_RESULT_SOURCE=rfValues().profit`
- `RF_RETURN_SOURCE=rfIntelligenceSnapshot().pct`
- `RF_MATURITY_SOURCE=assetRfMaturityDate()`
- The approved dedicated RF contract preserves explicit values, identity,
  review/editor flows, official helpers and collapsed secondary sections.
- `RF_SECONDARY_SECTIONS_DENSITY=ACCEPTED_COLLAPSED_STRUCTURE`

## 2026-09-03 - Canonical visual migration 04: Aportes

- `APORTES_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Aportes recebeu um refinamento visual escopado: hierarquia do cabeçalho,
  resumo 2x2 responsivo, estados ativos das abas/filtros, densidade das
  superfícies e proteção de valores financeiros completos.
- As fontes oficiais de movimentações, handlers, identidade de ativo,
  duplicação permitida e persistência foram preservados.
- Dashboard, Dividendos, Ativos, Renda Fixa e Sidebar não foram alterados por
  esta migração. A tela Aportes ainda não está congelada.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-04/`.

## 2026-09-03 - Aportes visual freeze

- `APORTES_VISUAL=FROZEN`
- The approved Aportes contract preserves the compact dark canonical shell,
  responsive KPI grid, monthly contribution rhythm, search, existing tabs and
  actions, class distribution, latest contributions and mobile bottom navigation.
- Official movement/contribution sources, create/edit/delete behavior, identity
  validation, wrong-record protection and the restricted duplicate-contribution
  contract remain unchanged.
- Critical financial values remain protected from ellipsis and the page has no
  horizontal overflow at the approved mobile and desktop viewports.
- `STALE_HARNESS_SELECTOR=.dashboard-master-primary`
- `STALE_HARNESS_DEBT=NON_BLOCKING_TEST_HARNESS_DEBT`
- Dashboard, Dividendos, Ativos, Renda Fixa and Sidebar remain frozen.

## 2026-09-03 - Canonical visual migration 05: Rentabilidade

- `RENTABILIDADE_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Rentabilidade recebeu um refinamento visual escopado: título simples,
  hierarquia compacta de performance e cores semânticas para carteira e
  benchmark.
- O renderer continua usando `rentabilityHistory(...)`, `assetRentabPct(...)`
  e o benchmark interno existente; períodos, tooltips e fontes oficiais foram
  preservados.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes e Sidebar não foram
  alterados por esta migração. A tela Rentabilidade ainda não está congelada.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-05/`.

## 2026-09-03 - Rentabilidade visual freeze

- `RENTABILIDADE_VISUAL=FROZEN`
- The approved contract preserves the compact dark shell, canonical KPI cards,
  comparative performance chart, green portfolio series, blue benchmark series,
  official period controls, exact-value tooltips and responsive mobile layout.
- `RETURN_SOURCE=rentabilityHistory()`
- `PERIOD_SOURCE=S.rentPeriod`
- `BENCHMARK_SOURCE=RENT_BENCH / rentBenchSeries()`
- `ASSET_RETURN_SOURCE=assetRentabPct()`
- No parallel return formula, invented metric, fabricated benchmark data,
  Finance Core, persistence or schema change was introduced.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes and Sidebar remain frozen.

## 2026-09-03 - Canonical visual migration 06: Rebalancear

- `REBALANCEAR_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Rebalancear recebeu refinamento visual escopado: hero mais compacto,
  controles com largura estável, CTA de simulação sem roxo legado, leitura
  rápida discreta e valores tabulares protegidos.
- O fluxo continua read-only e usa `rebalanceContributionDistribution(...)`,
  `allocationGoalItems()` e `allocationActualByType()` como fontes oficiais.
- Simulações, sugestões e cenários não persistem operações nem alteram a
  carteira. Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade e
  Sidebar não foram alterados por esta migração.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-06/`.

## 2026-09-03 - Rebalancear visual freeze

- `REBALANCEAR_VISUAL=FROZEN`
- `REBALANCE_READ_ONLY=true`
- `REBALANCE_ENGINE=rebalanceContributionDistribution()`
- `TARGET_ALLOCATION_SOURCE=allocationGoalItems()`
- `CURRENT_ALLOCATION_SOURCE=allocationActualByType()`
- `SUGGESTION_SOURCE=rebalanceAssetSuggestions()`
- O contrato congelado mantém hero de simulacao compacto, CTA primario verde,
  comparacao Atual vs ideal, leitura rapida discreta, aviso analitico e layout
  responsivo sem overflow horizontal.
- A tela nao compra, vende, cria movimentos, altera carteira, altera metas ou
  persiste operacoes durante simulacoes.
- `FILTERS_WORK=NOT_IMPLEMENTED`; `SORTING_WORKS=ENGINE_DETERMINISTIC`;
  `DETAIL_EXPANSION_WORKS=PASS`; `MODE_SWITCH_WORKS=PASS`.
- A linguagem aprovada e analitica: Aporte sugerido, Prioridade, Desvio e
  Atual vs ideal. Termos transacionais nao foram introduzidos.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade e Sidebar
  permanecem congelados e sem alteracoes nesta fase.

## 2026-09-03 - Canonical visual migration 07: Metas

- `METAS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Metas recebeu refinamento visual escopado: KPIs compactos, resumo de metas
  mais denso, progresso com leitura semantica e layout responsivo para desktop,
  tablet e mobile.
- A cadeia oficial permanece `S.goals` -> `financialGoalsSnapshot()` /
  `getGoalsSnapshot()` -> `createHostGoalsReadonlySource` -> adapter/runtime
  readonly. Nenhum estado paralelo, formula nova ou dado fake foi criado.
- Os fluxos existentes de edicao, remocao, configuracao de alocacao e ponte
  readonly foram preservados. Valores indisponiveis continuam explicitos.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear e Sidebar nao foram alterados por esta migracao.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-07/`.

## 2026-09-03 - Metas visual freeze

- `METAS_VISUAL=FROZEN`
- O contrato aprovado mantém shell premium escuro, cabecalho compacto, quatro
  KPIs no desktop, grade responsiva em duas colunas no mobile, faixas de status
  de Patrimonio e Renda Passiva, progresso oficial e distribuicao da carteira.
- `GOALS_SOURCE_OF_TRUTH=S.goals`
- `GOALS_SNAPSHOT_SOURCE=financialGoalsSnapshot() / getGoalsSnapshot()`
- `MODERN_GOALS_BRIDGE=createHostGoalsReadonlySource()`
- Nao ha estado paralelo, dados fake ou formulas paralelas. Handlers oficiais de
  edicao/remocao e a ponte moderna readonly permanecem preservados.
- `METAS_FOCUSED_HARNESS_DEBT=phase-206-financial-goals missing rentabilityHistory in isolated harness`
- O debito acima e `NON_BLOCKING_TEST_HARNESS_DEBT`; nao e evidencia de regressao
  de Metas e nao foi mascarado.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear e Sidebar permanecem congelados.

## 2026-09-03 - Canonical visual migration 08: Relatorios

- `RELATORIOS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Relatorios recebeu refinamento visual escopado: hierarquia analitica mais
  clara, densidade compacta para desktop/mobile e CTA de exportacao explicito.
- `REPORTS_ROUTE=relatorios`; `REPORTS_RENDERER=reportsTab()`;
  `REPORT_DATA_SOURCE=reportsSnapshot()`.
- `ANALYTICAL_REPORT != BACKUP`: exportacoes analiticas continuam usando os
  exporters baseados em `reportsSnapshot()`, enquanto backup/importacao seguem
  no fluxo separado de `backupManagerModal()` e `backupPayload()`.
- Nenhum tipo de relatorio, calculo financeiro, persistencia, schema ou dado
  real foi alterado. O smoke legado que esperava "Resumo da valuation" foi
  alinhado ao texto atual "Resumo da avaliacao oficial".
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-08/`.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear, Metas e Sidebar permanecem congelados.

## 2026-09-04 - Product safety review 02: Configuracoes visual

- `CONFIGURACOES_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
- A hierarquia visual separa a Zona de risco do Ambiente de teste local;
  a fixture em memoria nao e uma operacao destrutiva sobre dados reais.
- A exportacao de backup identifica explicitamente uma copia restauravel e
  permanece distinta de relatorio analitico, importacao e restore.
- Backup, importacao, restore, reset, autenticacao, sincronizacao, Finance
  Core, persistencia, schema e dados reais nao foram alterados nesta fase.

## 2026-09-04 - Safety hardening 01

- `RESET_PORTFOLIO_RF_CLEANUP=FROZEN_SAFETY_CONTRACT`: `resetPortfolio()` limpa
  `S.rfEvents` e os estados transitorios de editor/review de Renda Fixa sem
  ampliar o reset para dados globais ou de conta.
- `BACKUP_STRUCTURAL_VALIDATION=FROZEN_SAFETY_CONTRACT` e
  `BACKUP_VERSION_VALIDATION=FROZEN_SAFETY_CONTRACT`: `parseBackupRaw()` rejeita
  envelopes, tipos e versoes incompatíveis antes da confirmação, preservando
  compatibilidade legada reconhecida.
- `PERSISTENCE_TESTS=32/32`: o baseline subiu de 31 para 32 pela cobertura de
  reset RF, versões incompatíveis e estruturas de backup malformadas.
- Configurações não recebeu alteração visual; preview, confirmação,
  `PersistenceCore.applyStorageTransaction()` e rollback permanecem ativos.

## 2026-09-04 - Auditoria secondary surface refinement

- `AUDITORIA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
- A rota `auditoria` passou a consumir o renderer de qualidade de dados, com
  resumo de severidade, priorizacao, filtros progressivos, estado limpo e
  acoes contextuais seguras.
- Os niveis de acao continuam distinguindo `exact`, `context`, `general` e
  `info`; a revalidacao de identidade e a protecao contra registro incorreto
  permanecem no resolvedor oficial.
- Nenhum reparo automatico, mutacao em lote, formula financeira, persistencia,
  schema ou dado real foi alterado.

## 2026-09-04 - Auditoria visual freeze

- `AUDITORIA_VISUAL=FROZEN` e `AUDITORIA_ACTION_SAFETY=FROZEN`.
- `AUDIT_ROUTE=auditoria`, `AUDIT_RENDERER=dataQualityTab()` e
  `AUDIT_DATA_SOURCE=dataQualitySnapshot()` permanecem canonicos; `dataAuditTab()`
  e mantido como alias de compatibilidade.
- O contrato congela niveis `EXACT`, `CONTEXT`, `GENERAL` e `INFO`, com
  revalidacao de identidade, protecao contra registro incorreto e fallback
  seguro. Nao existe reparo automatico ou mutacao em lote.
- A proxima frente e `PRODUCT_SAFETY_REVIEW_01_CONFIGURACOES`, inicialmente
  review-first para Configuracoes, Backup, Importacao, Restore, Conta/Nuvem e
  Zona de perigo.

## 2026-09-04 - Secondary surface refinement 01: IRPF

- `SECONDARY_SURFACE_REFINEMENT_01_IRPF=IMPLEMENTED`
- A tela IRPF mantém o caráter de relatório auxiliar e a separação entre
  conferência fiscal, exportações e backup/importação.
- A melhoria foi restrita à legibilidade: valores críticos não usam ellipsis
  nos cards ou linhas móveis, preservando fonte, cálculos, ano-base, exports e
  fluxos protegidos.
- Smoke focado e browser QA em 390, 430, 768, 1366 e 1920 passaram sem
  overflow, erros de console, page errors ou request failures.
- Finance Core, persistência, schema e dados reais permaneceram inalterados.

## 2026-09-04 - IRPF visual freeze

- `SECONDARY_SURFACE_REFINEMENT_01_IRPF=COMPLETE`
- `IRPF_VISUAL=FROZEN`
- `IRPF_ROUTE=irpf`; `IRPF_RENDERER=irpfTabPremium()`;
  `IRPF_DATA_SOURCE=irpfBuildYearReport()`.
- O contrato aprovado mantém relatório auxiliar, seletor de ano-base, CSV,
  PDF, cards de resumo, seções fiscais recolhíveis e layout móvel sem
  ellipsis financeiro ou overflow horizontal.
- `backupManagerModal()` e `backupPayload()` continuam separados do relatório
  fiscal. Nenhum engine fiscal, persistência, schema ou dado real foi alterado.

## 2026-09-04 - Product usability improvements 02

- `GLOBAL_SEARCH_REFINEMENT=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `CONTEXTUAL_NAVIGATION=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `ANALYSIS_SEARCHABLE=true`; `SEARCH_READ_ONLY=true`.
- A busca global preserva `portfolioSearchOpen()` e os atalhos de teclado,
  agrupa Análise em Navegação, exibe contagem/no-match explícito e não expõe
  ações destrutivas.
- Análise mantém links contextuais secundários para Ativos, Rentabilidade e
  Rebalancear, sem alterar a identidade visual congelada.
- A busca global permanece somente leitura e agora apresenta Análise como
  destino no grupo Navegação, com aliases de análise, concentração, exposição
  e desempenho, contador de resultados e estado explícito de no-match.
- A Análise ganhou apenas links contextuais secundários para Ativos,
  Rentabilidade e Rebalancear. Nenhum cálculo, persistência, schema ou tela
  congelada foi redesenhado.
- Evidência local: `qa-screenshots/product-usability-02/`.

## 2026-09-04 - Analysis and navigation freeze

- `ANALYSIS_VISUAL=FROZEN`
- `NAVIGATION_ARCHITECTURE=FROZEN`
- `ANALYSIS_ROUTE=analise`; `ANALYSIS_DATA_SOURCE=assetAnalysisRows()`;
  `CONCENTRATION_RULE_SOURCE=assetConcentrationAlert()`.
- A Análise permanece uma área analítica dedicada, sem recomendação automática,
  sem segundo motor e com estados vazios explícitos.
- Renda Fixa e Análise não são subabas de Ativos. A entrada dedicada de Renda
  Fixa, o resumo RF em Todos os ativos e o menu mobile compacto permanecem.
- Backlog preservado: filtro de performance em Ativos (P1), links contextuais e
  revisão de segurança de Configurações/backup/importação (P2), consistência de
  ícones e estados vazios restantes (P3).

## 2026-09-04 - Análise como destino próprio

- `PRODUCT_IMPROVEMENT_MODE=ACTIVE`
- `ANALYSIS_SIDEBAR_DECISION=DEDICATED_ROUTE_REUSING_OFFICIAL_RENDERER`
- `ANALYSIS_ROUTE=analise`
- `ANALYSIS_RENDERER=assetAnalysisBlock`
- `ANALYSIS_DATA_SOURCE=assetAnalysisRows`
- O atalho enganoso `Fundos` foi removido da navegação principal; o renderer
  continua preservado e acessível pela rota dedicada.
- `MOBILE_ANALYSIS_ACCESS=Mais`
- `FUNDS_LABEL_DECISION=RENAME_TO_ANALISE`

## 2026-09-04 - Product UX and navigation review

- `RF_NAVIGATION_DECISION=REMOVE_RF_FROM_ATIVOS`: o atalho `Renda Fixa` das
  subabas de Ativos foi removido porque reproduzia integralmente o renderer
  oficial `rendaFixaTab()` e a mesma fila de revisao, vencimentos, posicoes,
  resultados, rentabilidade e acoes.
- A entrada `Renda Fixa` da sidebar permanece acessivel e agora navega
  diretamente com `go('renda-fixa')`. O grupo de resumo de Renda Fixa dentro de
  `Todos os ativos` permanece, pois oferece leitura consolidada por classe e
  nao duplica a tela dedicada.
- Nenhuma capacidade de RF foi perdida: edicao, review queue, vencimento,
  emissor/indexador, resultado, rentabilidade, historico e acoes continuam no
  renderer oficial. `RF_UNIQUE_FEATURE_LOSS_RISK=LOW`.
- A alteracao e uma correcao minima de arquitetura de navegacao; a identidade
  visual, tabela principal, filtros e layout congelado de Ativos permanecem
  intactos.
- O teste de touch targets foi alinhado para entrar pela rota oficial, sem
  reintroduzir o seletor removido.
- Recomendações futuras: concluir a aprovacao da subsuperficie Fundos/Analise;
  depois auditar Configuracoes com revisao de seguranca para backup/importacao;
  por fim revisar a nomenclatura `Fundos` versus `Analise` na sidebar sem
  misturar essa decisao com telas congeladas.

## 2026-09-04 - Fundos / Analise subsurface refinement

- `FUNDOS_ANALISE_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- A subsuperficie `ativos` com `assetsInnerTab=analise` recebeu apenas ajuste
  de densidade e legibilidade: paineis nao esticam por conteudo vazio, o acento
  visual segue a semantica verde e valores analiticos nao sofrem ellipsis em
  mobile.
- A analise continua derivando de `assetAnalysisRows()` e dos helpers oficiais;
  nenhuma fonte financeira, formula, persistencia, schema ou dado real foi
  alterado.
- `ATIVOS_MAIN_CHANGED=false`; a tabela principal, filtros, cards de categoria,
  RF-inside-Ativos e o layout congelado permanecem intactos.
- Browser evidence is stored under `qa-screenshots/fundos-analise/`.

## 2026-09-03 - Relatorios visual freeze

- `RELATORIOS_VISUAL=FROZEN`
- O contrato aprovado mantém shell premium escuro, cabecalho compacto,
  seletor de periodo, CTA analitico de exportacao, cinco KPIs financeiros,
  evolucao patrimonial, distribuicao, movimentacoes, renda/proventos, renda
  fixa, qualidade dos dados, historico e exportacoes explicitas.
- `REPORT_DATA_SOURCE=reportsSnapshot()` e os tipos oficiais permanecem
  `complete`, `assets`, `proventos`, `fixed`, `patrimony`, `audit` e `irpf`.
- `ANALYTICAL_REPORT_BACKUP_SEPARATION=REQUIRED`: relatorio analitico,
  exportacao de dados, backup e importacao continuam conceitos e fluxos
  distintos. `backupManagerModal()` e `backupPayload()` permanecem preservados.
- `STALE_REPORTS_HARNESS_FIX=VALID_STALE_HARNESS_FIX`: o smoke foi alinhado
  de "Resumo da valuation" para "Resumo da avaliacao oficial" sem reverter a
  terminologia atual do produto.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear, Metas e Sidebar permanecem congelados.

## 2026-09-04 - Product usability improvements 02 follow-up

- `GLOBAL_SEARCH_REFINEMENT=READY_FOR_FINAL_USER_APPROVAL`.
- A busca global permanece somente navegacional: resultados de ativos,
  movimentacoes e proventos levam as suas areas oficiais sem abrir editores ou
  expor acoes destrutivas diretamente na busca.
- `CONTEXTUAL_NAVIGATION=READY_FOR_FINAL_USER_APPROVAL`; os tres links de
  contexto da Analise permanecem limitados a Ativos, Rentabilidade e
  Rebalancear.
- O filtro de busca continua usando `portfolioSearchBuildEntries()` e as
  fontes oficiais existentes, sem formula, persistencia, schema ou dado real
  novo.


## 2026-09-04 - Auditoria safety freeze

AUDIT_SAFETY_REVIEW=FROZEN.
Auditoria permanece na rota auditoria, renderizada por dataQualityTab() e alimentada por dataQualitySnapshot(). Os cartoes exibem referencia de identidade derivada do registro oficial, com tipo, contexto disponivel e ID quando presente, sem metadados ficticios.

AUDIT_IDENTITY_CONTRACT=entityId + identityKey e AUDIT_WRONG_RECORD_PROTECTION=enabled: a acao so abre o editor quando ID e chave conferem com o estado atual; remocao, reordenacao, duplicidade ambigua ou registro stale recuam para a rota geral.
Os niveis EXACT, CONTEXT, GENERAL e INFO permanecem distintos. A Auditoria nao executa correcoes automaticamente e nao altera Finance Core, persistencia, schema ou dados reais.
## 2026-09-04 - IRPF functional freeze

- `IRPF_FUNCTIONAL_REVIEW=FROZEN`
- `IRPF_MOBILE_PATTERN=FROZEN`; quantidade, PM, custo e valor de referência
  permanecem acessíveis quando oficiais.
- `IRPF_TAX_LOGIC_CHANGED=false`; `VALID_ZERO_PRESERVED=true`;
  `MISSING_DATA_EXPLICIT=true`.
- `IRPF_GROUPING_SOURCE=irpfTaxBucket() / irpfProventoCategory()`;
  `IRPF_TOTALS_SOURCE=report.totals / irpfSummaryMetrics()`;
  `IRPF_EXPORT_SOURCE=irpfExportCSV() / irpfExportPdf()`;
  `IRPF_REFERENCE_PERIOD=S.irpfYear`.
- IRPF permanece relatório auxiliar, somente leitura e não constitui declaração
  automática. RF mantém `rfIntelligenceSnapshot()` e ativos variáveis não usam
  helper de RF.
- `NEXT_RECOMMENDED_ACTION=RELEASE_CONSOLIDATION`.

## 2026-09-04 - Product usability release consolidation

- `PRODUCT_USABILITY_RELEASE=READY_FOR_PR`.
- Escopo consolidado: Análise dedicada, simplificação da navegação de Renda
  Fixa, filtro de performance em Ativos, busca global somente leitura, links
  contextuais, proteção de identidade da Auditoria e refinamento mobile do
  relatório IRPF.
- Finance Core, semântica de persistência, schema, backup/importação,
  autenticação, sincronização em nuvem e dados reais permanecem inalterados.
- `NEXT_RECOMMENDED_ACTION=SETTINGS_SAFETY_REVIEW`; não iniciar Configurações
  nesta consolidação.
## 2026-09-04 - Dashboard visual freeze

- `DASHBOARD_VISUAL=FROZEN`.
- `DASHBOARD_REFERENCE_LOCK=FROZEN` e `DASHBOARD_CHART_INTERACTION=FROZEN`.
- `DASHBOARD_PRIMARY_CANON=Refs/visual-canon/dashboard-canonical.png`.
  `Tela Principal.png` permanece referencia secundaria de acabamento e nao
  altera a arquitetura executiva do Dashboard.
- A aprovacao usou comparacao explicita com o canon primario: media final
  90.25, sem dimensao abaixo de 86.
- `VISUAL_REFERENCE_LOCK_PROCESS=ACTIVE`: testes e builds validam o produto,
  mas nao substituem comparacao visual e aprovacao explicita.

## ATIVOS VISUAL REFERENCE LOCK

- `ATIVOS_REFERENCE_LOCK=READY_FOR_FINAL_USER_APPROVAL`.
- A referencia desta rodada e `Refs/visual-canon/Tela de aportes e ativos.png`,
  usada somente para a porcao de Ativos; os modulos de Aportes nao foram copiados.
- O ajuste ficou restrito ao shell de Ativos: hierarquia das acoes, densidade dos
  resumos de categoria, quebra segura de titulos RF e glyphs SVG locais.
- Busca, filtros, ordenacao, expansao, rotas dedicadas e fontes financeiras
  oficiais permanecem preservados. Nao marcar `ATIVOS_VISUAL=FROZEN` nesta rodada.

## 2026-09-04 - Ativos final reference polish

- `ATIVOS_FINAL_REFERENCE_POLISH=READY_FOR_FINAL_USER_APPROVAL`.
- A tabela de posicoes foi promovida para o conteudo primario: os resumos por
  classe agora sao compactos e a tabela aparece cedo em desktop.
- `ATIVOS_ALLOCATION_SOURCE=allocationActualByType()`: o modulo visual de
  alocacao somente apresenta o snapshot oficial e nao cria formula paralela.
- Os icones SVG das categorias ficaram visiveis nos cinco breakpoints. Fontes
  financeiras, filtros, ordenacao, expansao, RF dedicado e dados reais foram
  preservados. Nao marcar `ATIVOS_VISUAL=FROZEN` antes da aprovacao explicita.

## 2026-09-04 - Ativos reference lock freeze

- `ATIVOS_VISUAL=FROZEN` e `ATIVOS_REFERENCE_LOCK=FROZEN` apos aprovacao visual
  explicita do usuario.
- `ATIVOS_PRIMARY_CONTENT=FROZEN`, `ATIVOS_DENSITY=FROZEN` e
  `ATIVOS_ICON_LANGUAGE=FROZEN`.
- `ALLOCATION_SOURCE=allocationActualByType()` e `ALLOCATION_PANEL=FROZEN`;
  a tabela de posicoes permanece primaria no desktop e os cards de categoria
  permanecem secundarios. RF continua com rota dedicada e resumo oficial em
  Todos os ativos.
- `NEXT_VISUAL_TARGET=APORTES`; nao reabrir Ativos sem autorizacao explicita.

## 2026-09-05 - Ativos canonical rich contract lock

- `ATIVOS_VISUAL=FROZEN`.
- `ATIVOS_INFORMATION_CONTRACT=FROZEN`.
- `ATIVOS_ACTION_CONTRACT=FROZEN`.
- `ATIVOS_RF_OVERVIEW_CONTRACT=FROZEN`.
- A referencia historica aprovada esta persistida em
  `Refs/visual-canon/ativos-rich-canonical.png`, com hash registrado em
  `docs/ai/VISUAL_REFERENCE_INDEX.md`.
- A tabela desktop rica preserva as quinze informacoes/acoes aprovadas e a
  experiencia mobile preserva os mesmos dados por cards progressivos.
- Os bloqueios de regressao existentes cobrem categorias agrupadas,
  recolhimento padrao, campos ricos, acoes, RF, CTA de rebalanceamento e
  sintaxe inline. As areas protegidas permanecem inalteradas.

## 2026-09-06 - Phase 4H real pilot preparation

- `REAL_PILOT_SOURCE=B3_DIVIDENDS_XLSX`; first pilot is limited to one
  calendar month selected after real export evidence is reviewed.
- `REAL_PILOT_WRITE_ENABLED=false`, `REAL_USER_DATA_WRITE=false` and
  `CAN_EXECUTE_REAL_PILOT_WRITE=false` remain hard-disabled. No live file,
  real user data or persistent write was used.
- The read-only contract covers exact identity, manual verification, explicit
  supported income types, corporate-event blocking, targeted snapshot/backup,
  same-file reimport and rollback proof. Position and average price impact are
  required to remain zero.
- Implementation is isolated in `real-pilot-contract.js`; tests use only
  sanitized fixtures and existing import/classification engines.

## 2026-09-07 - Phase 4H targeted recovery runtime stabilization

- The V5 real targeted Yahoo recovery authorization was correctly blocked before
  snapshot/mutation because the protected session could bind before the first
  cloud snapshot had been applied. The surface displayed the pre-cloud
  fingerprint while the executor preflight observed the post-`applyCloudData`
  state.
- The protected session now binds only after `FB.cloudLoaded=true` and guards
  against duplicate binding. The internal surface also performs a read-only
  preflight parity check across live, donor, plan and review fingerprints before
  enabling its control.
- Static server requirement for legacy `index.html` is
  `python.exe -m http.server 4173 --bind 127.0.0.1`; Vite is not valid evidence
  for this runtime. The 12-callback protected recovery contract remains
  fail-closed and all runtime lifecycle checks are green.
- Current read-only manifest remains: live `0a3d0c56...aebaabe47`, donor
  `71b21a08...15b22c4a7`, recovery plan `690138e1...d41cc4a5`, review
  `c3ab3a17...05df9da4`; plan `99/99/0`, expected post-recovery ledger
  `428/329/99`, financial increment `0`, and 21 post-recovery links.
- No real recovery or August pilot was executed. A new single-use recovery
  authorization is required; the previous V5 authorization is not reusable.

## 2026-09-07 - Phase 4H click-time fingerprint parity

- `RECOVERY_LIVE_STATE_MISMATCH_ROOT_CAUSE=CANONICAL_REPRESENTATION_MISMATCH`:
  readiness hashed the protected canonical state while the recovery plan
  provider hashed the broader stored-state representation and used separate
  plan/review serializations.
- Surface, plan provider and executor preflight now share the canonical live
  state provider and one click-time prepared preflight. The executor rechecks
  that same live fingerprint without rebuilding the asynchronous plan.
- The internal localhost-only surface supports an explicit
  `internalRecoveryDryRun=1` validation path that reaches the real prewrite
  gates but skips snapshot, mutation, save and sync. No real recovery or
  August pilot was executed.
- Static legacy runtime evidence remains authoritative only from
  `python.exe -m http.server 4173 --bind 127.0.0.1`; Vite is not valid for
  this lifecycle. Donor bytes remain `71b21a08...15b22c4a7`, with 428/329/99.

## 2026-09-07 - Permanent Phase 4H QA harness

- Reusable tooling lives in `tools/qa/` and the `qa:*` npm scripts. It uses a
  dedicated ignored browser profile and localhost-only CDP; cookies, tokens
  and credentials are never copied or logged.
- `qa:smoke` covers the unauthenticated legacy browser at 390, 430, 768, 1366,
  1440, 1536 and 1920px. Protected browser proof remains local-only and needs
  normal authentication in the dedicated profile.
- `qa:auth-smoke` exercises the protected native-click dry-run and stops before
  snapshot, mutation, save and sync. It is not a recovery authorization.
- CI runs the harness contract and unauthenticated smoke using synthetic/local
  state only. No real portfolio, backup or authenticated account is used in CI.

## 2026-09-07 - Phase 4H native browser proof

- Chrome for Testing foi rejeitado pelo Google como navegador inseguro para
  login; a solução usa Chrome estável, perfil QA fora do projeto e CDP local.
- Chrome QA autenticado foi validado em `127.0.0.1:9232` com perfil
  `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-profile-chrome`.
- Playwright native dry-run alcançou surface, plan provider, executor
  preflight e authorization validator em três execuções idênticas; snapshot,
  mutação, save e sync permaneceram falsos.
- Fingerprint vivo fresco: `2ca97731ed9b06fbf4d0930f38d89cb2118c8f5823d8d1a68d3e3ea2058db5f6`;
  donor `71b21a08f2bb1db2615dd838f06e5ccd124ef2f726a26e087e6e20215b22c4a7`;
  plano `690138e1f973e8a600907e0f7d87b2897fa352eb608b63d1725ca971d41cc4a5`;
  review `c3ab3a17db2c4e4d6c3a34474a65843e32c6b6e6add2698ce0efff0a05df9da4`.
- Estado vivo: 329/329/0; recovery previsto: 99/99/0; incremento
  financeiro: zero. Nenhuma recuperação real ou piloto de agosto foi executado.

## 2026-09-07 - Phase 4H recovery persistence serialization fix

- A autorização V6 foi consumida porque o executor entrou no caminho de
  mutação/local-save. O read-back falhou com `"[object Object]" is not valid
  JSON`; o rollback direcionado restaurou o estado `329/329/0` e nenhum sync
  cloud foi liberado.
- Causa raiz: `safeGetLocalStorageItem()` devolve `{ok, value}`, mas o callback
  protegido passava o envelope inteiro a `PersistenceCore.parseStoredState()`,
  cujo contrato exige `string|null`.
- O contrato corrigido é fail-closed: storage retorna envelope;
  `ProtectedRecoveryPersistenceContract` valida o envelope e entrega somente
  `value` ao parser; `PersistenceCore` continua sendo o único dono da
  desserialização canônica.
- Commit funcional: `5a19fbd24aa3bb5f6379d605ad19933fad579a63`.
  Testes sintéticos cobrem roundtrip, forward/rollback, tipos inválidos e sync
  bloqueado. O navegador autenticado executou três ciclos de clique dry-run +
  read-back oficial sem escrita real e sem nova ocorrência de `[object Object]`.
- Recovery real continua pendente. Nunca reutilizar a autorização V6; qualquer
  execução que alcance mutação consome sua autorização mesmo quando rollback
  restaura o estado.

## 2026-09-08 - Phase 4H forensic 430 baseline

- A leitura autenticada confirmou `430/329/101` em runtime, local e cloud.
  Não houve escrita nesta perícia; o restore autorizado foi cancelado antes
  do snapshot por divergência do manifesto `329/329/0`.
- Os 101 registros têm `eventType=Yahoo`, mas não têm `source`,
  `sourceEventKind` ou `excludedFromIncomeTotals`. O contador anterior usava
  apenas metadados de source e reportava Yahoo zero; os classificadores agora
  consideram também `eventType`/`incomeType` genericamente.
- Identidades sanitizadas contra o donor: 95 presentes, 4 ausentes e 6
  extras, sem duplicatas exatas. A reconciliação atual é `24/20/1/2`, com 20
  links e 1 review.
- Cold boot preservou as mesmas 101 identidades. Os 4 ausentes e 6 extras
  precisam de revisão de origem antes de qualquer restore ou cleanup real.
- Recovery Yahoo e piloto de agosto permanecem sem execução.

## 2026-09-08 - Phase 4H targeted correction forensic manifest

- Estado atual autoritativo autenticado: runtime/local/cloud `430/329/101`.
  Os 101 sao Yahoo-like por `eventType=Yahoo`; 99 sao referencias esperadas
  e dois sao eventos financeiros pos-donor de 08/09/2026.
- Donor: `local-imports/carteira-investimentos-backup-2026-09-07-10-18.json`,
  `428/329/99`, fingerprint
  `71b21a08f2bb1db2615dd838f06e5ccd124ef2f726a26e087e6e20215b22c4a7`.
  Comparacao: 95 identidades exatas, quatro variantes KNUQ11 por valor e dois
  extras pos-donor: FATN11 `12480` cents e DIVD11 `3513` cents.
- Os seis extras carregam nota/autoKey do caminho Auto Yahoo e estao presentes
  em runtime, local e cloud. A proveniencia temporal exata e
  `STRONGLY_SUPPORTED`, nao `PROVEN`.
- Marcadores de referencia sao necessarios para 99 registros, nao para os dois
  extras financeiros. Plano sintetico: `4 REPLACE + 95 RECLASSIFY`, alvo
  `430/329/101`, 99 referencias, delta `-1017188` cents, posicao/PM/ativos/RF
  inalterados. O snapshot histórico registrou links `21/0/0` e agosto
  `24/21/1/2`; V39 classificou essa contagem como sintética. O contrato atual é
  `24/20/1/2/1 deferred`, sem vínculo artificial para KNUQ11.
- Fingerprints do planejador: `754201a8e0da5fbf2d7e0021770e653acb9cf811a90dd9b59ec03542ff6ea407`
  e review `3167552ee63e76f35708525f13ad9f496182edc4db79cc9ed03c06276e41eb6f`.
  `qa:phase4h:reconcile-prewrite` compara runtime/local/cloud e simula o alvo
  em memoria, sem gravar, salvar ou sincronizar.

## 2026-09-08 - Phase 4H official Class C executor

- O executor oficial Class C foi implementado localmente e permanece sem
  execucao real. Ele aceita somente `TARGETED_CLASS_C_RECONCILIATION` com 4
  REPLACE, 95 RECLASSIFY e 2 KEEP.
- Os 12 callbacks atravessam a fabrica oficial, com snapshot/rollback
  direcionados, persistencia canonica, readback, invariantes, reconciliacao,
  idempotencia e gates de sync/reload. O prewrite autenticado passou 3/3 de
  forma identica e sem mutacao; ainda exige nova autorizacao single-use.

- A primeira tentativa autorizada de Class C foi cancelada antes do snapshot,
  sem consumo de autorização, porque o callback oficial referenciava
  `classCEventId` sem declarar o helper. O helper agora é o alias explícito do
  identificador canônico de evento; a regressão do snapshot comprova 99 alvos,
  metadados de integridade e rollback sandbox. Nenhuma correção real foi executada.
## 2026-09-09 - Phase 4H additive 101-event local recovery preparation

- O estado local canônico da origem `127.0.0.1:4173` foi reconstituído somente
  por cópia forense read-only do LevelDB: `329/329/0`, sem referências e total
  financeiro de `2685096` centavos. O cloud autenticado anteriormente observado
  contém `430/329/101`, sem referências e total de `3718277` centavos.
- A divergência cloud-only comprovada é de 101 eventos Yahoo: 95 coincidem
  exatamente com a evidência donor disponível, 4 são variantes KNUQ por valor e
  2 são eventos pós-donor (FATN11 e DIVD11). Portanto não foi congelado o rótulo
  incorreto de “99 matches exatos”. A impressão donor autorizada histórica ainda
  não é reproduzível com os arquivos locais disponíveis.
- Foi criado o executor separado `TARGETED_101_YAHOO_LOCAL_RECOVERY`, aditivo e
  local-only (`queueCloud:false`), com preflight, snapshot persistente, readback,
  rollback, idempotência e 12 callbacks verificáveis. O executor não é Class C,
  não é o recovery antigo e não expõe escritor cloud.
- O caminho read-only está disponível em
  `npm.cmd run qa:phase4h:101-recovery-prewrite`. Ele não cria snapshot, não
  salva, não sincroniza e não consome autorização.
- Nenhuma recuperação real, rollback real, Class C, piloto de agosto ou sync foi
  executado. A prova live final permanece pendente porque o perfil QA perdeu a
  sessão autenticada (`AUTH_SESSION_VALID=false`, CDP 9233 indisponível).

## V333.2 — correção readonly comprovada (2026-10-08)

- Código: 5c87918fad9861e4f60e7fc5d586bcc16cb4641f; 17 entradas financeiras bloqueadas antes de mutação/confirm, incluindo helpers de recálculo, conciliação, importação RF, alocação e hidratação offline. Sem alteração de fórmulas, schema ou dados reais.
- RED: cinco handlers originais e onze siblings mutaram VM sintética; snapshot válido reproduz o bypass original no teste. GREEN: readonly runtime/browser 33/33; test:local-synthetic 43/43 e browser 1/1. verify:release PASS no código final; CI readonly conectado agora ao npm test e após Chromium no workflow.
- Revisão independente em contexto separado: nenhum MAJOR acionável nos diffs revisados; não certifica inexistência global de bugs.
- PR #456 continua Draft/base main. CI do novo HEAD precisa ser confirmado. Checkout canônico e #454/#455 preservados. MERGE_PR=false; PRODUCTION=false; REAL_WRITES=0.

## V333.2–V338 — execução autônoma sintética (2026-10-08)

- V333.2: herda correção readonly #456 (c3f3482; código 5c87918). Meta com cobertura parcial já corrigida no HEAD anterior. Nova correção 04e1563 bloqueia média histórica não certificada no produtor e consumidor Modern, preservando total/contagem e schema v1. Fixture de recovery alinhada ao contrato V324 em ec8eabf, sem alterar backup de produto.
- Dependência atualizada por sincronização normal de branches, sem rebase/force push e sem integrar PR em main. #454/#455 e checkout canônico preservados.
- V334: revisão independente do diff P0 sem MAJOR acionável. verify:release PASS na cadeia integrada; Modern 822/822, visual 15/15; readonly runtime/browser 33/33, test:local-synthetic 43/43; A11Y/retry/replay/reliability 199/199; cobertura+backup 32/32; QA financeiro sintético focal V337 100/100. CI #457 ausente pela base empilhada; Vercel não substitui CI.
- V335: auditoria estática read-only de G: concluída, matriz KEEP/ADAPT/DO_NOT_COPY com linhas e hashes em relatório externo. Não copiar zeros presumidos, média antiga, ponte postMessage sem origem ou sparkline PM→Atual. G: intocado.
- V336: estrutura premium já existente validada, sem transplantar CSS/fórmulas antigas. Browser sintético 30 combinações (Dashboard/Ativos/Dividendos; 390/430/768/1366/1920; claro/escuro): overflow 0, page/console errors 0, Firebase requests 0, writes storage 0, memória financeira intacta. Melhoria isolada de acessibilidade/rolagem de Ativos será preparada em branch própria.
- V337: Auth+Firestore Emulator demo tentou e Firestore encerrou código 1 antes de testes; BLOCKED_ENVIRONMENT, causa não comprovada (Node 26.7.0 / Java 26.0.2.1). Provider QA real continua sem projeto isolado configurado; não autenticar Preview que aponta para produção.
- V338: preparação release local concluída nos limites Chromium/fixtures; sem certificação Firefox/WebKit, provider QA ou persistência cloud. Diagnóstico de tempo local não é SLA. Sem publicação de produção. MERGE_PR=false; PRODUCTION=false; REAL_WRITES=0; REAL_IMPORT=false; REAL_RESTORE=false.
