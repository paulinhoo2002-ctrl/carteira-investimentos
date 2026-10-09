# V322 Batch 7 — matriz de importação

## Escopo
- Base `origin/main=c14924998aadf3b783e790294b7efa74877bbcd0`; branch `codex/v322-batch7-import-center-hardening`.
- Fixtures sintéticas apenas. `ImportCenterCore` segue preview-only; confirmação usa writers específicos existentes.
- Nenhum parser/writer, fórmula, schema ou persistência de produto foi alterado.

| Fonte | Prévia/cancelar/confirmar | Duplicata/replay | Falha/retry |
|---|---|---|---|
| B3 movimentações | `tests/v284-legacy-write-boundary.test.js`: cancelar sem write; confirmação explícita/double-submit uma vez | helpers reais de chave; replay no-op | quarentena e retry após conferir storage sintético |
| B3 posição | prévia/cancelamento; confirmação no writer atual | snapshot/upsert; idêntico no-op | quarentena e retry após recarga/verificação |
| B3 proventos | prévia/cancelamento | só duplicatas não gravam; lote misto só grava novo | rollback/quarentena em falha |
| Inter | `tests/v285-import-center-workflow.test.js`, `tests/broker-note-inter.test.js`, V284 boundary | identidade, replay e conflito | restauração/quarentena/retry |
| Renda fixa suportada | cancelar não persiste; confirmar usa writer atual | repetição exata no-op | falha mista restaura; autoridade manual preservada |

## Entradas e limites
- Vazio, malformado, operação desconhecida, detecção e write counters zero: `tests/import-center-core.test.js`, `tests/v245-import-center-2.test.js`.
- Unsupported, leitura falha ou sem revisão válida: `tests/v285-import-center-workflow.test.js`, `tests/phase-4g-import-center.test.js`.
- Incompletude/identidade parcial bloqueiam writer: casos `PARTIAL-*` da suíte V284.
- XP/BTG continuam `FIXTURE_REQUIRED`. `UNKNOWN != ZERO`; `PARTIAL != COMPLETE`; B3 posição mantém snapshot/upsert.

Falha segue `SNAPSHOT → VALIDATE → MUTATE → PERSIST → VERIFY → CONFIRM`. Persistência incerta restaura/quarentena; retry só após verificar estado durável. Sem alegação de atomicidade cloud/localStorage.

## Gates locais
- Import Center 27/27; workflow/histórico/Inter/RF 49/49; fronteira V284 81/81.
- Corporate Events (pré-auditoria Batch 8) 39/39; persistência/backup/roundtrip 45/45.
- `npm run build` e `git diff --check`: PASS.
- Build moderno local bloqueado: worktree sem `node_modules`/Vite. `npm ci` não executado. CI com instalação lockada ainda precisa confirmar testes completos e browser/build.
- `npm test`, moderna, `qa:all`, `verify:release`, A11Y, V289 e visual aguardam CI; não declarar PASS.

Nenhum arquivo financeiro pessoal, conta de produção, Firebase Production ou dado real acessado. Writes reais/produção zero. `MERGE=false`.

## Certificação sequencial após CI #783 (2026-10-05)

- `BATCH7_CI=PASS`: run `37372040030`, commit `36c78e69acaa8c67531654181cc274cd71ade6c4`; todos os três jobs passaram.
- `BATCH8_CORPORATE_EVENTS=PASS`: testes focados 39/39; shadow e promoção com comprovante `RECEIVED`, sem writer de carteira.
- `BATCH9_FAILURE_INJECTION=PASS`: fronteira V284 81/81; rollback/quarentena/retry após verificação cobertos.
- `BATCH10_DOUBLE_ACTION=PASS_WITH_SCOPE`: duplo envio e replay síncronos preservam uma única persistência; disputa real entre abas não foi exercitada.
- Testes locais focados combinados: 120/120. CI amplo: `npm test` 249 pass, 0 fail, 5 skipped; A11Y, V320 contracts, Reliability, Auth/Firestore Emulator e V289 visual passaram.
- `REAL_WRITES=0`; nenhuma mudança de produto. `PR445=OPEN/DRAFT`; `MERGE=false`. V323 permanece read-only até merge humano e CI pós-merge.
