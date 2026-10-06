# V323H — prontidão de importação por escopo e rollback

Data: 2026-10-06. Checkpoint somente leitura no clone isolado de recuperação.

## Identidade e estado remoto

- Repositório: `paulinhoo2002-ctrl/carteira-investimentos`.
- Branch: `codex/v323-real-portfolio-reconciliation`.
- HEAD final documental: `3783e09a4a6bd1806cef5b1703a7d64280cf48e9` (partiu do HEAD de código `23f37b09e4547f3ce9496653c1444e3d18d2d0f0`); base: `e38e946c47cfc9cab51fa04fbf07aa6c4435248d`.
- PR #446: OPEN/DRAFT/mergeable; não mergeada.
- CI #799: PASS no HEAD final exato; Vercel Preview: READY no mesmo SHA. A interface autenticada não foi exercitada neste checkpoint.

## Backup aceito

- Backup previamente validado: 621679 bytes, SHA-256 `3D6DA352A82764A74820BD60E1A580B60E6EB55760F6E5C1F789AA718666802E`.
- Schema suportado, integridade válida, domínios obrigatórios completos e restore preview PASS em storage isolado.
- O arquivo fica fora do repositório. Caminho local exato não é registrado em documento versionado.
- Evidência valida o backup e o preview isolado; não prova capacidade de aplicar restore V2 na conta real.

## Fonte candidata e limite

- Foram avaliados sem recursão os locais autorizados: `local-imports` (21 XLSX e 6 PDFs), `D:\Downloads` (3 XLSX e 3 PDFs com indício de fonte), e a pasta do backup (somente JSON de backup, sem XLSX). Nenhum nome, linha, valor ou hash de fonte foi registrado.
- Nenhum XLSX avaliado apresentou cabeçalho de parser de proventos ou assinatura exata de movimentação B3. A única planilha local indicada como proventos por nome/aba tinha dimensão 1×1. Classificação: `B3_PROVENTOS=DEFERRED_SOURCE_SUPPORT`; nenhum registro foi carregado.
- Os 9 PDFs candidatos tiveram texto extraível, mas não apresentaram assinatura exata de movimentação B3; todos mantêm `INTER_PDF=RECONCILIATION_ONLY`. Posição B3: identidade de origem não comprovada. XP: `FIXTURE_REQUIRED`. Nenhum mapeamento por ativo foi certificado.
- `CERTIFIED_IMPORTABLE=NONE`; `DRY_RUN=NOT_RUN`; `EXPECTED_COUNT=UNKNOWN`; replay/reload/idempotência sobre fonte real não foram provados. Testes sintéticos existentes não substituem prova da fonte.

## Snapshot do backup e estado vivo

No snapshot de backup previamente validado: carteiras 2; ativos 40; aportes 72; rendas 441; contagem do domínio fixedIncome 6 (o manifesto agrega tipos de registro diferentes); chaves de metas 4; domínio corporateEvents presente com contagem 0. Estes números são do arquivo, não uma leitura do estado vivo.

Observação anterior da UI Preview: carteiras 2; ativos 40; movimentos exibidos 513 (72 aportes + 441 rendas); posições RF 5; grupos de metas 3. Não foi revalidada neste checkpoint. Estado vivo atual, incluindo corporate events: `UNKNOWN`. Diferenças de contagem refletem definições distintas e não devem ser convertidas em divergência nem ausência.

## Decisão e rollback

- `READY_FOR_FIRST_REAL_IMPORT=false`; `REAL_IMPORT=false`; `REAL_WRITES=0`; `MERGE=false`.
- Restore preview V2 passou em ambiente isolado, mas o caminho de restore V2 na UI permanece bloqueado conforme contrato V323C. Logo `ROLLBACK_READY=false`.
- Passos antes de qualquer futuro import: (1) preservar backup atual; (2) em fase autorizada, habilitar e validar restore V2 com fixtures sintéticas e falha injetada; (3) criar e verificar novo snapshot pré-import; (4) executar um único fluxo somente após autorização humana específica; (5) recarregar e conferir os domínios/contagens; (6) em discrepância, usar apenas o restore V2 previamente testado e comparar novamente. Não iniciar importação antes da etapa 2.

`BLOCKER=1` para o escopo de primeiro import: nenhuma fonte foi certificada e rollback aplicável não está pronto. `MAJOR=0` no nível de produto; formatos não comprovados ficam diferidos, sem mapeamento aproximado. `MINOR=1` permanece: compatibilidade V76 preenche `trackingStartDate:null` quando ausente.

Próxima ação: obter fonte estruturada compatível ou aprovar fase de suporte do formato; em paralelo, definir fase específica para habilitar e certificar restore V2. Nenhuma ação real de import/restore autorizada.
