# V318 — V317 main e reconciliação V316

Data: 2026-10-04
Base integrada: `cb476604d6ca859cb999dda8a9fc679275169556` (PR #442)
Branch V316: `codex/v315-final-operationalization`
Estado desejado: PR #440 OPEN/DRAFT, sem merge; Provider QA real pendente.

## Identidade e método

- Repositório: `paulinhoo2002-ctrl/carteira-investimentos`.
- Worktree V316: `C:\Projetos\carteira-investimentos.worktrees\v315-post-merge-main`.
- Antes da reconciliação, branch limpa em `d3fd785426846def6ad4aefbf62f16f8c065d6d9`; remote #440 conferido no mesmo SHA, autoria dos 15 commits conferida, main conferido no SHA acima.
- Rebase da branch existente sobre `origin/main`, sem cherry-pick cego. Nenhum commit desconhecido encontrado. Push ainda requer conferir de novo old remote SHA e usar `--force-with-lease=<ref>:d3fd785426846def6ad4aefbf62f16f8c065d6d9`.
- Checkout canônico e worktree Hermes V316B não foram modificados. #441 não foi rebaseada, atualizada nem integrada.

## Matriz de reconciliação

| Arquivo/área | Alteração V317 | Alteração V316 | Sobreposição | Resolução/evidência |
|---|---|---|---|---|
| `index.html` | Snapshot pré-mutação, rollback, quarantine e sucesso após um único `save()===true` para ação financeira | Seleção de Firebase por ambiente, Preview QA read-only, isolamento local/session/auth | Semântica financeira e de segurança se encontram no boundary da ação | Git auto-merge sem conflito; preservados ambos. E2E sintético cruzado confirma ação funciona localmente e é barrada pelo boot read-only usado pela Preview antes de `save()`; 60/60 browser combinado. |
| `docs/ai/NEXT_STEP.md` | Continuidade V317/main e gates humanos | Handoff Firebase QA Preview | Conflito documental, sem execução/runtime | Merge manual manteve a seção V317 atual e a seção V316; este documento V318 agora prevalece para o próximo passo. |
| `docs/ai/PROJECT_MEMORY.md` | Registro de certificação V317 | Implementação/runtime e segurança V316 | Histórico/estado | Merge manual preservou ambos os registros sem descartar evidência; resumo V318 no topo distingue certificação local de Provider real. |
| `docs/ai/PROJECT_STATE.md` | Estado V317 local certificado, review e CI #442 | Estado V316/provider pendente | Estado ativo e next action | Merge manual preservou V317 e V316; bloco V318 superior define estado pós-rebase. |
| CI, `package.json`, Firebase config/rules, QA scripts e testes V316 | Sem alteração funcional V317 | Gates da V316 e configuração Preview isolada | Nenhuma semântica V317 coincidente | Mantidos; gates reexecutados conforme matriz deste relatório. |
| `tests/v317-financial-action-e2e.test.js` | Valida transação financeira local e falhas | Não havia teste de cruzamento | Nova interação necessária | Acrescentado somente um cenário sintético que prova a ação V317 barrada pelo boot read-only (`protectedReadOnlyQa=1`) usado pela Preview; sem produto/config externo. Não inicializa deployment Preview real. |

## Contratos certificados nesta reconciliação

- `MAIN_INCLUDES_V317=true`; `V317_LOCAL_RUNTIME_CERTIFIED=true` para execução local/teste sintético. Isso não certifica Firebase/Google real nem cloud persistence.
- Preview sem QA permanece bloqueado, com `firebaseConfig={}` e sem fallback para projeto de produção. Host/config desconhecidos, parciais, inválidos ou colidentes falham fechados.
- Configuração Preview validada autoriza somente Auth QA e leituras Firestore QA necessárias; gravações Firestore/Storage/Auth fora do QA e mutações financeiras locais permanecem bloqueadas.
- V317 compra local em fixture sintética continua funcionando. Em sessão sintética com o boot read-only ativado pela flag usada para QA protegido, a mesma ação não modifica estado/localStorage nem chama `save()`; nenhuma escrita externa. Esse E2E não inicializa o descritor/deployment Preview, que é coberto separadamente pelos testes do runtime/config V316.
- `FINANCIAL_SEMANTICS_CHANGED=false`; `REAL_DATA_USED=false`; `REAL_FINANCIAL_WRITES=0`; `PRODUCTION_FIREBASE_WRITES=0` nos testes sintéticos; `PRODUCTION_AUTH_BYPASS=false`; `PRODUCTION_RULES_WEAKENED=false`.
- `V316_PROVIDER_QA_REAL=PENDING_HUMAN_EXTERNAL_PROVISIONING`; `CLOUD_PERSISTENCE_CERTIFIED=false`.

## PR #441 — avaliação somente leitura

Branch `hermes/v316b-test-hardening` mantida intacta e estacionada até #440 ser integrada.

| Test file da #441 | Classificação | Motivo / estratégia futura |
|---|---|---|
| `tests/v316b-environment-selection.test.js` | `ALREADY_PORTED_EQUIVALENT` | Seleção exercita o helper/runtime por meio de `tests/v316-firebase-runtime-config.test.js`, `tests/qa-preview-firebase-config.test.js` e `test:qa-preview-config`; mantém negativas para host, modo, configuração parcial e mistura/colisão com produção. Não portar duplicatas. |
| `tests/v316b-write-guard.test.js` | `NEEDS_ADAPTATION` (não integrar como está) | Testes VM simulam manualmente o guard e usam Firebase mock; não invocam o caminho real e parte das verificações só confere infraestrutura/regex. Equivalentes comportamentais já foram portados para `v316b-runtime-boundaries`, `protected-read-only-qa` e teste cruzado V317/V316. Após merge de #440, extrair apenas cenário novo que atinja função real sem duplicação. |
| `tests/v316b-provider-negative.test.js` | `ALREADY_PORTED_EQUIVALENT` | Testes runtime atuais cobrem provider ausente, provider rejeitado, login desabilitado, erro controlado, identidade/session/logout e Preview negativo; os da #441 simulam estado manualmente. Não portar como está. |

Não fazer cherry-pick/rebase da #441 antes da integração da #440. Depois, comparar os três arquivos com HEAD pós-merge e portar somente cobertura exclusiva ligada a funções reais. A branch #441 permanece OPEN/DRAFT e sem alteração.

## Validação e lacunas

- No main `cb476604...`: CI `37241619149` SUCCESS no SHA exato. Local: legado 252/252; moderno 815/815; E2E V317/browser 59/59; Import Center 27/27; persistência 32/32; roundtrip 7/7; backup/restore 6/6; lifecycle 7/7; QA harness 3/3; XLSX 2/2; visual 4/4; `qa:all` PASS; smoke 7 larguras sem overflow/erros.
- Após rebase V316: `verify:release` PASS; QA Preview/config/guards 58/58; browser V317+V316 60/60; reliability 61/61; Import Center 27/27; persistência 32/32; roundtrip 7/7; XLSX sintético 2/2; diff check PASS.
- Emulator local não pôde iniciar porque porta 8080 já estava ocupada por processo Java PID 105204, iniciado antes da tentativa; não foi encerrado nem alterado. CI Ubuntu `37243814383` passou Auth/Firestore 8/8 e rules QA 1/1 no SHA de código/teste `58b1f106041744896db63120347d4e11d9f5e345`; CI `37244080039` também passou os três jobs no HEAD documental `2c9fd1fb98b63ec33786cb043d1918eaf2dd448a`.
- Avisos de build preexistentes observados: warning CJS Vite, script classic do `host.html` não bundlado, default export ausente reportado pelo Vite; build retorna sucesso. Não são mudanças desta reconciliação.
- Independent reviewer: Hermes/NVIDIA não esteve disponível; revisão fresh-context Codex foi usada como fallback. BLOCKER=0, MAJOR=0. MINOR=1: teste cobria boot read-only protegido em localhost, não inicialização do descritor Preview. Título e documentação foram ajustados para declarar exatamente a evidência; seleção do modo Preview tem testes V316 separados.

## Próximos gates

1. Trabalho técnico V318 concluído; #440 permanece OPEN/DRAFT, mergeable, CI verde e Preview final READY em `mode=blocked`.
2. #441 permanece OPEN/DRAFT, intocada e estacionada até #440 ser integrada.
3. Único trabalho externo que fica para a pessoa responsável: provisionamento Firebase QA/Google sintético no escopo descrito em `V316_PROVIDER_QA_HANDOFF.md`, seguido de `qa:preview-provider-smoke` e `qa:preview-provider-browser`.
