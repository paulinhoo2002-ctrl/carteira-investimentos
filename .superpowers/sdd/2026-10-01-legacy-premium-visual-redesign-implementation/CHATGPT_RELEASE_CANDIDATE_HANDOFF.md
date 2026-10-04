# V298 — Release Candidate local

## Identidade e status

- Projeto: Carteira de Investimentos LEGACY.
- Worktree: `C:/Projetos/carteira-investimentos.worktrees/v289-premium-visual-redesign`.
- Branch: `feature/v289-premium-visual-redesign`.
- `RC_BASE_HEAD=69569adc0ec4cf58ea8cec29c6c59c4bff10d643`.
- `WAVE_G_COMPLETE=true`; `V296_COMPLETE=true`.
- `PROJECT_RELEASE_CANDIDATE_READY=true` para este checkpoint local, sujeito aos gates frescos abaixo.
- Este RC não foi enviado, publicado, mesclado ou implantado.

## Revisão e reconciliação da evidência

- Revisão técnica independente GLM 5.3: `BLOCKER=0`, `MAJOR=0`, `MINOR=7`, `DEFERRED_NON_BLOCKING=6`.
- XLSX: `XLSX_INTEGRATION_CLASSIFICATION=CLOSED`; `XLSX_REQUIRED_BEFORE_RELEASE_CANDIDATE=false`.
- `CHATGPT_V296_XLSX_RC_GATE_HANDOFF.md` foi corrigido: o agregado histórico 37/37 não tem manifesto de execução exato e não pode ser reproduzido independentemente. Evidência reproduzível registrada como `29/29 PASS`:
  - `tests/v289-dashboard-hybrid.test.js` — 18/18.
  - `tests/goals-functional.e2e.test.js` — 8/8.
  - `tests/goals-contextual-continuity.test.js` — 3/3.
- A soma foi executada novamente como uma única chamada Node: 29 testes, 29 passaram, zero falhas.

## Gate manual local de release

`RELEASE_MANUAL_REQUIRED=true`. Executar todos os itens no checkpoint de release; `test:import-xlsx` depende de rede/CDN e permanece deliberadamente fora da suíte offline/CI.

1. `npm.cmd run test:import-xlsx` — 2/2 PASS nesta verificação.
2. `npm.cmd run qa:all` — PASS nesta verificação; sete viewports, overflow 0, erros de console/página/requisições relevantes 0.
3. `npm.cmd test` — 252/252 PASS.
4. `npm.cmd run test:modern` — 815/815 PASS.
5. `npm.cmd run build` — PASS.
6. `npm.cmd run build:modern` — PASS isolado; avisos Vite/readonly-report conhecidos, sem falha.
7. `git diff --check` — PASS após esta atualização documental; repetir antes do commit.

## XLSX sintético e segurança

- `SHEETJS_RUNTIME_LOADED=true`; Chromium carregou SheetJS de produção (`xlsx@0.18.5`) via CDN/SRI.
- `PRODUCTION_XLSX_PATH_EXERCISED=true`; `XLSX_DECODE_EXECUTED=true`; `REAL_XLSX_BYTES_DECODED=true`.
- `NO_WRITE_ON_SELECT=true`; `NO_WRITE_ON_PARSE=true`; `NO_WRITE_ON_PREVIEW=true`.
- `EXPLICIT_CONFIRMATION_REQUIRED=true`; cancelamento não chama save; confirmação alcança writer real com carteira QA sintética em `testMode` e permanece em memória, sem persistência durável.
- `MALFORMED_XLSX_SAFE=true`; `NO_PARTIAL_SILENT_IMPORT=true`; `DUPLICATE_HANDLING_VALID=true`; `UNKNOWN_NOT_ZERO_VALID=true`.
- Apenas fixture sintética. `REAL_DATA_USED=false`; nenhuma escrita Firebase/financeira real; nenhum conteúdo de `local-imports` acessado.

## Dívidas conhecidas preservadas

Revisão: `MINOR=7`; `DEFERRED_NON_BLOCKING=6`. Não foram removidas nem ocultadas:

1. `test:import-xlsx` fora de `npm test`/CI; `CLASSIFICATION=MINOR`; `RELEASE_MANUAL_REQUIRED=true`.
2. Phase-206: `TEST_HARNESS_FAILURE`, dependência `assetCurrentValue` ausente na extração VM; `RC_BLOCKING=false`.
3. Phase-198: `PREEXISTING_FAILURE_DOCUMENTATION_DRIFT`; `RC_BLOCKING=false`.
4. `setRentPrimarySemantic`: dead code preexistente; `CLASSIFICATION=MINOR_DEAD_CODE`; `RC_BLOCKING=false`.
5. `tests/v289-visual-regression.test.js` fora da CI; `CLASSIFICATION=MINOR`; candidato a CI pós-merge.
6. Dashboard mobile: par R$/% pode quebrar linha; `CLASSIFICATION=VISUAL_POLISH_MINOR`.
7. Confiabilidade: escala do título; `CLASSIFICATION=VISUAL_POLISH_MINOR`.

## Efeitos do revisor e segurança de branch

- Os caminhos reportados de autoalteração do revisor não existem neste projeto/worktree; diffs e índice estavam vazios antes deste trabalho. `PROJECT_FILES_MODIFIED_BY_REVIEWER=false`.
- Arquivos externos a este repositório não foram inspecionados; nenhuma alteração externa é alegada.
- `PUSH_NOT_AUTHORIZED=true`; `PR_NOT_AUTHORIZED=true`; `MERGE_NOT_AUTHORIZED=true`; `DEPLOY_NOT_AUTHORIZED=true`.
- `PUSH=false`; `PR=false`; `MERGE=false`; `DEPLOY=false`; `TAG_PUSHED=false`.

## Skills

- `SKILLS_CONSIDERED=Superpowers, Ponytail, Caveman`.
- `SKILLS_USED=Superpowers executing-plans, verification-before-completion; Ponytail full; Caveman`.
- `SKILLS_NOT_USED=systematic-debugging, TDD; sem falha de produto ou mudança de código`.
- `SKILL_SELECTION_REASON=certificação local e correção documental controlada`.
- `SKILL_REEVALUATED=false`.
- `SKILL_GAPS_FOUND=nenhum`.
