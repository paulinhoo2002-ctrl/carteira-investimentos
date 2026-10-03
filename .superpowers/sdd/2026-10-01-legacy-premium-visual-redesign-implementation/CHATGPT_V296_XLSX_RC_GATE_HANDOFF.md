# V296 — XLSX Release Candidate Gate

## Identidade e checkpoints

- Projeto: Carteira de Investimentos LEGACY.
- Worktree: `C:/Projetos/carteira-investimentos.worktrees/v289-premium-visual-redesign`.
- Branch: `feature/v289-premium-visual-redesign`.
- Início do closeout Wave G: `451215648efdde82374e8f62e14e8a19544b25bc`.
- Wave G finalizado: `6cf6e6f846b3d64543640d32b6212bc265fc9ac5` (`docs(ai): finalize Wave G certification`).
- Commits V296 de teste: `36daa9782c61cac25d6e0ca6a2fd4716338ff220`, `1693d841173caae3eaf159f3bf900da7bbd32d83`, `7984f39d1724a56cbf55c43ffbf4854fa709c76b`.
- `WAVE_G_COMPLETE=true`.

## Integração XLSX exercitada

- `SHEETJS_RUNTIME_LOADED=true`: Chromium carregou a URL de produção `xlsx@0.18.5` diretamente, com o atributo SRI existente em `index.html`.
- `PRODUCTION_XLSX_PATH_EXERCISED=true`: arquivo selecionado no Import Center chegou a `importCenterParseSpreadsheet`, `XLSX.read`, extração da worksheet, parser B3 e fluxo de revisão existente.
- `XLSX_DECODE_EXECUTED=true`.
- Fixture sintética versionada: `tests/fixtures/import-center/v296-synthetic-b3-movements.xlsx` (16.923 bytes; tickers e nomes de QA fictícios).
- Teste opt-in: `npm.cmd run test:import-xlsx` — 2/2 PASS. É separado da suíte padrão porque requer CDN/rede para carregar a dependência de produção.
- O segundo caso envia um XLSX sintético corrompido ao mesmo decoder e verifica estado `FAILED` visível, ausência de revisão pendente, estado financeiro intacto e zero save.

## Contratos observados

- `NO_WRITE_ON_SELECT=true`, `NO_WRITE_ON_PARSE=true`, `NO_WRITE_ON_PREVIEW=true`.
- `EXPLICIT_CONFIRMATION_REQUIRED=true`; cancelar a confirmação preserva estado e não chama `save()`.
- Confirmar alcança o writer de produção e o limite `save()` com carteira QA sintética, em `testMode`. O branch seguro do `save()` mantém a operação somente em memória; não ocorreu gravação durável em `localStorage` nem Firebase.
- `DUPLICATE_HANDLING_VALID=true`: duplicata sintética permaneceu identificada e não foi reaplicada; somente um registro novo foi aplicado.
- `UNKNOWN_NOT_ZERO_VALID=true`: linha incompleta não gerou registro; impostos, moeda e autoridade ausentes continuaram ausentes no preview e no registro sintético resultante.
- `MALFORMED_XLSX_SAFE=true`; `NO_PARTIAL_SILENT_IMPORT=true`.
- A execução não usou dados privados, carteira real, autenticação Firebase ou escrita financeira real.

## Verificação fresca

- Integração XLSX: 2/2 PASS.
- Import Center, parsers, autoridade, persistência, salvaguardas de import e Wave E: 186/186 PASS.
- Revisão reproduzível Dashboard HYBRID V2 e Metas: 29/29 PASS, com manifesto explícito: `tests/v289-dashboard-hybrid.test.js` (18), `tests/goals-functional.e2e.test.js` (8) e `tests/goals-contextual-continuity.test.js` (3). O agregado original 37/37 não tinha manifesto exato no handoff/ledger e não é reproduzível independentemente; não é usado como evidência certificada.
- `npm.cmd test`: 252/252 PASS.
- `npm.cmd run test:modern`: 815/815 PASS.
- `npm.cmd run build`: PASS.
- `npm.cmd run build:modern`: PASS.
- `npm.cmd run qa:all`: PASS; sete larguras, sem overflow, erros de console/página ou falhas relevantes de requisição.
- `git diff --check`: PASS.
- Build moderno mantém avisos Vite preexistentes (API CJS obsoleta e dois avisos de integração do readonly-report); comando terminou com sucesso.

## Revisões e itens conhecidos

- Wave G técnica: `BLOCKER=0`, `MAJOR=0`, `MINOR=4`.
- Wave G visual: `BLOCKER=0`, `MAJOR=0`, `MINOR=2`.
- `PHASE_198_CLASSIFICATION=PREEXISTING_FAILURE_DOCUMENTATION_DRIFT`; não bloqueante conforme continuidade existente.
- `PHASE_206_CLASSIFICATION=TEST_HARNESS_FAILURE`; 4/5 testes do arquivo passam. O teste restante falha na extração VM por `ReferenceError: assetCurrentValue is not defined`, antes das antigas asserções de estrutura Dashboard. Não foi alterado nem enfraquecido. A revisão reproduzível de Dashboard HYBRID V2 e Metas, incluindo edição/salvamento sintético, é 29/29 conforme manifesto acima. O agregado anterior 37/37 não tinha manifesto exato e permanece uma imprecisão documental, não uma falha de produto.
- Outras dívidas menores da Wave G permanecem documentadas no handoff Wave G e no ledger; nenhuma BLOCKER ou MAJOR aberto foi identificado.
- Ponytail `full`; revisão executada. Resultado: `Lean already. Ship.` Nenhuma exclusão ou simplificação adicional aplicada.

## Classificação

- `XLSX_INTEGRATION_CLASSIFICATION=CLOSED`.
- `XLSX_REQUIRED_BEFORE_RELEASE_CANDIDATE=false`.
- `PROJECT_RELEASE_CANDIDATE_READY=true` para o estado local verificado: zero BLOCKER/MAJOR nas revisões, testes/builds/QA frescos verdes e pendências menores documentadas.
- `SCREENSHOT_COUNT=0` (nenhuma alteração visual de produto).
- `PRODUCT_CODE_CHANGED=false`; `FINANCIAL_LOGIC_CHANGED=false`; `PERSISTENCE_CHANGED=false`; `FIREBASE_CHANGED=false`; `IMPORT_AUTHORITY_CHANGED=false`.
- `REAL_DATA_USED=false`; `LOCAL_IMPORTS_ACCESSED=false`; nenhuma escrita financeira real.
- `PUSH=false`; `PR=false`; `MERGE=false`; `DEPLOY=false`.
