# Estado atual da Carteira LEGACY

> Nesta branch de governança, o roteador canônico de Skills está em `.agents/SKILL_ROUTER.md`; o seletor usa o inventário local versionado e não depende de chat ou modelo. Esta proposta ainda não está integrada em `main`.

DATE=2026-10-18
MAIN_HEAD=c49175efb18fac247840e08c8b57339bc8f09afd
VISUAL_PHASE=ACTIVE_FOR_PR_503
VISUAL_CONTRACT=docs/ai/VISUAL_UX_RESPONSIVE_CONTRACT.md
PRODUCTION=READY
SITE_TECHNICALLY_COMPLETE=YES
PRODUCTION_HEALTHY=YES
FEATURE_FREEZE=YES
OPERATING_MODE=MAINTENANCE_AND_DATA_CERTIFICATION_MODE

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

## Governança atual

- Feature freeze ativo. A exceção visual limitada e autorizada nesta data é a PR #503 (`feat/legacy-slim-ui-refinement-2026-10-17`); confirme HEAD/CI ao continuar. Não iniciar fundação, redesign ou arquitetura nova fora desse escopo sem necessidade concreta e autorização.
- O contrato permanente de UX visual e responsividade está em [`VISUAL_UX_RESPONSIVE_CONTRACT.md`](VISUAL_UX_RESPONSIVE_CONTRACT.md), complementado pelo [`VISUAL_CANON_V2.md`](VISUAL_CANON_V2.md).
- Invariantes permanentes: `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE`, `EXPECTED != RECEIVED`.
- Sem escrita financeira real, importação, restore, promoção Package2, alteração de Auth/Rules ou deploy manual nesta release.
- Histórico completo preservado em [`archive/PROJECT_STATE_HISTORY_TO_2026-10-17.md`](archive/PROJECT_STATE_HISTORY_TO_2026-10-17.md).
- Detalhes da release: [`LEGACY_FINAL_RELEASE_2026-10-17.md`](LEGACY_FINAL_RELEASE_2026-10-17.md). Próximas ações: [`NEXT_STEP.md`](NEXT_STEP.md) e [`LEGACY_BACKLOG.md`](LEGACY_BACKLOG.md).
