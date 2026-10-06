# V323H — checkpoint de prontidão por fonte (2026-10-06)

Este checkpoint supersede os status V323D/V323C abaixo quanto a backup e prontidão. Histórico mantido para proveniência.

- PR #446 OPEN/DRAFT/mergeable no Último checkpoint verificado `46be3f7540fe1a3b43d9ce1fa6263732838ba11b`, sobre código base `23f37b09e4547f3ce9496653c1444e3d18d2d0f0`; base `e38e946c47cfc9cab51fa04fbf07aa6c4435248d`; CI #800 PASS; Vercel check success.
- Backup previamente validado e restore preview isolado PASS. Restore V2 aplicável à conta não está disponível/provado.
- Nenhum candidato real foi certificado. Um XLSX indicado como proventos por nome/aba estava vazio estruturalmente (1×1), sem cabeçalho parseável. B3 movimentos/posição, XP e PDFs Inter permanecem diferidos pelas limitações de identidade/parser já descritas.
- Estado vivo do Preview não consultado; contagens do backup não são declaradas como estado atual.
- `READY_FOR_FIRST_REAL_IMPORT=false`; `BLOCKER=1` para o escopo; `MAJOR=0` no nível de produto; `MINOR=1` compatibilidade V76; `REAL_WRITES=0`; `REAL_IMPORT=false`; `MERGE=false`.
- Relatório/rollback: `docs/ai/V323H_FIRST_IMPORT_READINESS_AND_ROLLBACK.md`.

---

# V323 — detector de origem e checkpoint de reconciliação somente leitura

## V323D — checkpoint atual do exportador (2026-10-06)

Uma tentativa somente de exportação foi executada no Preview autenticado da PR #446 e falhou antes de produzir arquivo com `PARTIAL/REQUIRED_DOMAIN_MISSING`. Nenhum dado foi alterado e nenhum conteúdo financeiro foi incluído em logs de missão ou documentação. O domínio canônico ausente ainda não foi exposto, então a causa raiz específica permanece desconhecida.

No HEAD `81b9c124a8c40dc620c8f72ee1975d297ff37c70`, o exportador reduziu falhas a códigos de etapa, status/razões enumerados e domínio canônico opcional. CI/Preview passaram; `verify:release` local e V323C/D 14/14 passaram; XLSX falhou no carregamento SheetJS/SRI antes dos asserts. O resultado `PARTIAL/REQUIRED_DOMAIN_MISSING` levou a ampliar o diagnóstico local para extrair apenas o primeiro nome de domínio obrigatório ausente; novo CI/Preview ainda pendentes. Revisão independente anterior: BLOCKER=0, MAJOR=0, MINOR=1.

Próximo: publicar o ajuste autorizado, aguardar CI e Preview no SHA exato, e então pedir novo login QA isolado para uma tentativa somente de export. Nenhum import, restore real, edição, escrita ou merge. `BLOCKER=1` até backup real validado; `REAL_WRITES=0`; `REAL_IMPORT=false`; `MERGE=false`.

Data: 2026-10-05
Base: `origin/main=e38e946c47cfc9cab51fa04fbf07aa6c4435248d`
Branch: `codex/v323-real-portfolio-reconciliation`
PR: #446 OPEN/DRAFT/mergeable; HEAD documental `ba66364b1acbaba4148f96407459ed7f427c9ad8` sobre implementação `13010052b42bc9d58b38dc8e56af53fd00fff321`; CI #787/run `37385414541` PASS (Build/test, Auth+Firestore Emulator QA, V289 visual); Vercel Preview success. `MERGE=false`.

## Limite operacional

- Nenhum estado financeiro do site foi lido; não havia snapshot acessível nesta worktree.
- Nenhum backup foi criado ou validado, pois não havia estado do site para exportar.
- Nenhum arquivo financeiro real foi alterado, importado, copiado para fixtures ou adicionado ao Git.
- `REAL_WRITES=0`; `READY_FOR_FIRST_REAL_IMPORT=false`.
- Os valores âncora fornecidos no handoff não foram reconciliados contra o site e não são tratados como totais da carteira.

## Defeito e correção do detector

O Import Center podia enviar ao parser B3 uma planilha XLSX genérica por encontrar campos comuns como quantidade e ativo. O roteamento agora exige identidade explícita B3 em nome de arquivo/aba/metadados, ou as assinaturas específicas já reconhecidas para movimentação B3 e proventos B3. Evidência explícita XP impede o parser B3; evidência conflitante e posição genérica ficam em `REVIEW_REQUIRED` com fonte `UNKNOWN`. CSV mantém o fluxo existente.

O teste sintético cobre XP explícito, sinais conflitantes, layouts genéricos, formato de movimentação B3 reconhecido, posição B3 com marcador explícito, proventos B3 e planilha não suportada. As provas não executam writer financeiro.

## Catálogo seguro de fontes

| Fonte lógica | Evidência observada | Classificação e limite |
| --- | --- | --- |
| Inter renda variável (PDF) | 3 páginas e texto extraível; data e marcador do emissor não foram confirmados de forma independente | `SUPPORTING_REPORT`; sem comparação de ativos com o site |
| Inter renda fixa (PDF) | 3 páginas e texto extraível; data e marcador do emissor não foram confirmados de forma independente | `SUPPORTING_REPORT`; campos financeiros não mapeados ao site |
| Posição detalhada atribuída a XP no handoff | Estrutura genérica de posição, renda fixa e fundos; sem prova de origem suficiente no conteúdo | `UNKNOWN_SOURCE`; parser automático permanece bloqueado e os campos de valor ficam `AMBIGUOUS` |
| Posição atribuída a B3 no handoff | 5 abas por categoria; estrutura genérica sem marcador B3 incorporado | `UNKNOWN_SOURCE`; detector exige revisão e não envia ao parser |
| Planilhas de movimentação atribuídas a B3 | Assinatura exata de cabeçalho já reconhecida pelo parser | `AUTHORITATIVE_MOVEMENT` pelo contrato estrutural; identidade de cada evento ainda exige revisão |

Comparação estrutural encontrou linhas completas repetidas entre as planilhas de movimentação. Relação: `PARTIAL_OVERLAP_BY_EXACT_ROWS`; isso não prova igualdade de chave econômica nem autoriza importar as duas em sequência. Quantidades e conteúdo permanecem fora do Git. Nenhum total foi somado.

## Reconciliação financeira

- Posição atual, match, ausentes, extras e diferenças de quantidade/valor: `UNKNOWN`, pois não houve leitura do estado do site.
- Replays do arquivo real, deduplicação contra o site e dry-run real: não executados; a posição atribuída a B3 permanece bloqueada por falta de identidade embutida.
- Saldo líquido/bruto, valor aplicado, rendimento, taxa, vencimento e quantidade da planilha atribuída a XP: sem mapeamento comprovado.
- V285-02 permanece inalterada e diferida. `UNKNOWN != ZERO`; nenhuma semântica financeira foi inferida.
- Backup e validação de restauração são pré-requisitos antes de qualquer futuro primeiro import real. Não são declarados PASS neste checkpoint.

## Validação local

- `test:import-center`: 38/38 PASS após incluir o teste V323 no gate `test:ui`.
- `npm test`: PASS; `test:modern`: 815/815 PASS.
- `a11y-functional`: 19/19 PASS; V289 visual: 4/4 PASS.
- `qa:all` e `verify:release`: PASS; sete larguras sem overflow ou erros no smoke.
- `test:import-xlsx`: 0/2; Playwright não carregou a biblioteca SheetJS por falha de SRI/runtime no CDN. Não classificado como defeito do detector nem como PASS.
- Auth/Firestore Emulator local: bloqueado no Windows porque o processo Java/Netty não conseguiu criar selector/loopback. O CI do HEAD documental (`#787`, run `37385414541`) passou no job Auth/Firestore Emulator QA e Build/test.
- `npm ci` usou o lockfile sem alteração. O audit remoto não pôde consultar o endpoint npm; os avisos de audit da instalação não foram remediados neste escopo.

## Estado

`POST_MERGE_MAIN_CI=PASS`; `SOURCE_DETECTOR=PASS_SYNTHETIC`; `FINANCIAL_LOGIC_CHANGED=false`; `REAL_DATA_USED_FOR_WRITES=false`; `REAL_WRITES=0`; `MERGE=false`.

O primeiro import real não está pronto: falta estado atual autorizado para comparação, backup validado e resolução humana das ambiguidades das fontes. Nenhuma confirmação de escrita foi dada ou executada.
