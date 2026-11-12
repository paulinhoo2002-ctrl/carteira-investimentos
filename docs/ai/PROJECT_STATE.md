# Estado atual da Carteira LEGACY

## Atualização de continuidade (SM100, 2026-11-11)

Este bloco é o ponto de entrada atual. O conteúdo abaixo dele pode estar anterior a 2026-11-11.

- Projeto: Carteira de Investimentos (`paulinhoo2002-ctrl/carteira-investimentos`). Checkout canônico: `C:\Projetos\carteira-investimentos`.
- Branch principal do repositório: `main`, em `58827aa` (`origin/main`).
- Estado de publicação: SM99 commitada localmente (`6c4962761dc1933fcac6db633abb494ff2031993`, branch `codex/sm99-export-contract`), **não publicada**. PR #577 em Draft (boot da PWA), sem merge.
- Testes: `fase1c-export-integrity` falha no CI do PR #577 e em `origin/main`. Após a SM99, 14 dos 26 hashes da fixture divergem.
- Homologação: **nenhuma homologação em Android físico**. Nenhuma tela foi aprovada visualmente pelo proprietário. Uso financeiro real **não homologado**.
- Registro estruturado de tarefas, bloqueios, decisões e missões: [`REGISTRO_CONTINUIDADE.md`](REGISTRO_CONTINUIDADE.md). Verificar com `npm run verify:continuity`.
- SM95.4 (homologação Android isolada, PREPARAÇÃO, não executada): fonte `443691a` em `codex/sm95-android-boot`, fora de `origin/main`; relação com PR #577 não comprovada. SM95 **não homologada**; Android físico pendente; SM94 bloqueada. Nenhum ambiente Vercel de homologação criado; nenhum Firebase de teste criado; CSP de `vercel.json` não modificada (`unsafe-eval` em `script-src`, dependência não comprovada; Firebase de produção em `connect-src`). Plano e critérios GO/NO-GO em `output/` da worktree SM95 (`docs/ai/SM95_4_HOMOLOGACAO_ANDROID.md`), não integrado a `main`. Bloqueios B-06, B-07, B-08.
- SM99: contrato aditivo commitado localmente (`6c4962761dc1933fcac6db633abb494ff2031993`, branch `codex/sm99-export-contract`), NÃO publicado (B-05).
- SM100: memória operacional em `docs/ai/` implementada e commitada localmente (`4dca2d7`). Verificador offline: `npm run verify:continuity`.
- SM95.6: homologação PWA publicada por CLI em `https://sm95-homolog-443691a.vercel.app` (projeto Vercel `sm95-homolog-443691a`, sem Git, sem variáveis). SHA de origem: `443691a`. Produção NÃO modificada.
- Homologação: testes de navegador desktop (boot, reabertura, offline, manifest, Service Worker) passaram sem erro de console. Exportação, importação e backup NÃO EXECUTÁVEIS sem Firebase (não há contorno de autenticação). Android físico: PENDENTE. Firebase de teste: INEXISTENTE.
- CSP: variante de homologação sem `unsafe-eval` testada apenas no boot (sem violações). Produção inalterada; decisão pendente (B-08).
- PR #577: Draft, não integrado a `main`. Estado remoto NÃO conferido nesta auditoria (sujeito à conferência remota). Relação de `443691a` com o PR #577 NÃO comprovada.
- SM94: BLOQUEADA até resultado Android (B-09).
- SM101: EM ANDAMENTO, não concluído, em worktree própria (`sm101-export-integrity`, `codex/sm101-export-integrity`, base `4dca2d7`) com alterações NÃO commitadas. Determinismo do helper de títulos sintéticos corrigido com teste de regressão (não commitado). Hashes da fixture **não** atualizados; 14 divergências permanecem: 12 JSON e 2 CSV parciais (origem NÃO COMPROVADA). Detalhes em `REGISTRO_CONTINUIDADE.md`.
- A-02: proveniência histórica insuficiente (B-03). Uso financeiro real NÃO homologado.
- Próxima ação **autorizada**: nenhuma. Qualquer commit, publicação, teste no aparelho ou criação de recurso externo exige autorização explícita do proprietário.

> Nesta branch de governança, o roteador canônico de Skills está em `.agents/SKILL_ROUTER.md`; o seletor usa o inventário local versionado e não depende de chat ou modelo. Esta proposta ainda não está integrada em `main`.

DATE=2026-10-27
MAIN_HEAD=10083077d2471063807da6097a3872be7ad5c67d
VISUAL_PHASE=M1959_COMPLETE
VISUAL_CONTRACT=docs/ai/VISUAL_UX_RESPONSIVE_CONTRACT.md
PRODUCTION=READY
SITE_TECHNICALLY_COMPLETE=YES
PRODUCTION_HEALTHY=YES
FEATURE_FREEZE=YES
OPERATING_MODE=DR_CERTIFICATION_PENDING

## Identidade e release

- Repositório: `paulinhoo2002-ctrl/carteira-investimentos`.
- Checkout canônico local: `C:\Projetos\carteira-investimentos`.
- Produção: projeto Vercel `carteira-investimentos`, domínio `carteira-investimentos-delta.vercel.app`.
- Release sanitizada: PR #501, squash commit `6619c9ed6286bd1b446ec90d07432ace000e4e03`.
- PR #500 foi encerrada sem merge; seu histórico remoto anterior à sanitização permanece em backlog de privacidade.
- CI do commit integrado e implantação automática de produção passaram. Smoke autenticado de produção passou nas rotas críticas.
- `SITE_TECHNICALLY_COMPLETE=YES` descreve a entrega técnica atual. Não certifica dados fiscais reais, patrimônio global ou acessibilidade Axe autenticada em produção.

## Estado por subsistema

| Subsistema | Estado atual | Certificação / limite | Próxima ação |
| --- | --- | --- | --- |
| Shell e autenticação | PRODUÇÃO SAUDÁVEL | Smoke autenticado de produção passou; recuperação administrativa segue aberta | Manter monitoramento e procedimento de recuperação |
| Dashboard | OPERACIONAL | KPIs esperados e navegação autenticada verificados; dados mantêm cobertura parcial | Preservar semântica e investigar somente defeitos reproduzíveis |
| Posição de renda variável | PARCIAL | Resultado atual permanece limitado por cobertura e evidência | Certificar apenas com fonte e escopo válidos |
| Renda fixa | PARCIAL | Valores, custo bruto/líquido e histórico dependem de evidência da fonte | Não misturar aplicado, bruto e líquido |
| Proventos | PARCIAL | Recebido, esperado e desconhecido permanecem distintos | Completar cobertura com documentos confiáveis |
| Rentabilidade | OPERACIONAL COM LIMITES | Smoke de rota passou; não implica histórico completo | Não preencher lacunas com preço atual |
| Backup e recuperação | LIMITADO | Recursos e contratos existem; restauração independente completa não está certificada por esta release | Verificar backup e recuperação em exercício isolado |
| Package2 V3 | CÓDIGO PRONTO / SOMENTE LEITURA | Contrato e dry-run local; nenhuma promoção hospedada | Exigir prova de identidade, leitura e diff antes de autorização de escrita |
| Motor IR2026 | CÓDIGO PRONTO | Engine disponível; cálculo fiscal real não certificado | Receber e validar evidência fiscal |
| Dados reais IR2026 | BLOQUEADO POR EVIDÊNCIA | Abertura fiscal, perdas, retenções e custos sem certificação completa | Seguir `IR2026_DOCUMENT_REQUEST.md` |
| Reconciliação patrimonial global | NÃO CERTIFICADA | Cobertura entre custodiantes e sobreposição permanecem abertas | Resolver fontes, datas e duplicidade |
| QA | PASS NO SHA DA RELEASE | CI, testes de release e smoke autenticado passaram; Axe autenticado direto não foi verificado | Rodar Axe autenticado quando houver janela de QA segura |
| Privacidade | DIFF SANITIZADO | Nenhum dado privado novo entrou no diferencial da release; dívida histórica preexistente continua aberta | Acompanhar `LEGACY_BACKLOG.md` |
| Recuperação administrativa | ABERTA | Não houve mudança de Auth ou de autoridade | Confirmar MFA e recuperação diretamente nos provedores |
| **M1959 Visual/Ativos/Dividendos** | **CONCLUÍDO** | **Tabela premium, cards mobile, KPIs canônicos, semântica ±, filtros UX — `verify:release` PASS** | **DR certification + merge `feat/financial-evolution-premium` → `main`** |
| **Disaster Recovery Plan** | **DOCUMENTADO** | **`docs/DISASTER_RECOVERY_PLAN.md` criado; gaps: backup real, sidecars, drills** | **Proprietário: exportar backup → sidecars → verify-integrity → verify-recovery** |
| **M1960 Acesso/QA local** | **CORRIGIDO — revalidação pendente** | **Bug raiz MIME no QA server corrigido (`dashboard-premium.css` não aplicava); `signInGoogle()` com diagnóstico exato; launchers `ABRIR-*.bat`** | **Matar server antigo (porta 8795, PID 26724) → `auth-access-browser.test.js` → `npm test` → limpar probes** |

## Governança atual

- Feature freeze permanece ativo; M1959 concluída com melhorias visuais M1955/M1958 preservadas. DR Plan documentado. Próximo gate: certificação DR (backup real exportado + `REAL_RECOVERY_CERTIFIED=YES`) → merge autorizado.
- O contrato permanente de UX visual e responsividade está em [`VISUAL_UX_RESPONSIVE_CONTRACT.md`](VISUAL_UX_RESPONSIVE_CONTRACT.md), complementado pelo [`VISUAL_CANON_V2.md`](VISUAL_CANON_V2.md).
- Invariantes permanentes: `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE`, `EXPECTED != RECEIVED`.
- Sem escrita financeira real, importação, restore, promoção Package2, alteração de Auth/Rules ou deploy manual nesta release.
- Histórico completo preservado em [`archive/PROJECT_STATE_HISTORY_TO_2026-10-17.md`](archive/PROJECT_STATE_HISTORY_TO_2026-10-17.md).
- Detalhes da release: [`LEGACY_FINAL_RELEASE_2026-10-17.md`](LEGACY_FINAL_RELEASE_2026-10-17.md). Próximas ações: [`NEXT_STEP.md`](NEXT_STEP.md) e [`LEGACY_BACKLOG.md`](LEGACY_BACKLOG.md).
