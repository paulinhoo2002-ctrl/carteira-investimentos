# Release final da Carteira LEGACY — 2026-10-17

A release sanitizada integrou a fundação fiscal e o contrato local do Package2 V3 sem promover dados financeiros à hospedagem.

## Identidade e histórico

| Campo | Registro |
| --- | --- |
| Repositório | `paulinhoo2002-ctrl/carteira-investimentos` |
| Projeto Vercel | `carteira-investimentos` |
| ID do projeto Vercel | `prj_a4SYCPWPqm0c2oaNF7iLEKf6wX47` |
| Domínio de produção | `carteira-investimentos-delta.vercel.app` |
| Branch de produção | `main` |
| Base da cleanroom | `8f4ff842ab2733e9015ac199053b4b9f60257d8c` |
| PR de origem sanitizada | #501, head `c6542b715430b4640866dcd72f80ca0594f3103a` |
| Commit integrado | `6619c9ed6286bd1b446ec90d07432ace000e4e03` |
| PR #500 | Encerrada sem merge; substituída pela cleanroom #501 |
| Produção | Vercel `READY` no commit integrado |

PR #501 foi squash-merged. A #500 continha histórico anterior à sanitização; esse histórico remoto não foi reescrito e permanece item de remediação. Nenhuma PR foi mesclada sem a autorização aplicável.

## Certificação registrada

- CI do commit de produção: sucesso nos três jobs.
- Release Vercel: `READY`, source SHA igual ao commit integrado, alias de produção confirmado.
- Validação local da árvore sanitizada: IR2026 197/197; Package2 V3 6/6; Finance Core 96/96; persistência 32/32; `npm test`, `npm run test:modern`, `npm run qa:all` e `npm run verify:release` passaram.
- Smoke autenticado read-only: Dashboard, Patrimônio, Ativos, Dividendos, Renda Fixa, IRPF, Configurações e Rentabilidade carregaram nas verificações registradas; sem erro fatal de console ou overflow horizontal.
- Os KPIs esperados conferiram no Dashboard. Valores pessoais não são reproduzidos neste registro.
- Capturas com dados reais não foram versionadas nem mantidas no workspace.
- A varredura Axe autenticada diretamente em produção não foi executada. O CI de release não substitui esse gate específico.

## Estado funcional e limites

- `SITE_TECHNICALLY_COMPLETE=YES`, `PRODUCTION_HEALTHY=YES`, `FEATURE_FREEZE=YES`.
- `FISCAL_ENGINE_CODE_READY=YES`, `IR2026_REAL_DATA_READY=NO`, `TAX_PAYABLE_STATUS=NOT_CALCULATED`.
- `PACKAGE2_V3_CODE_READY=YES`, `PACKAGE2_V3_HOSTED_PROMOTED=NO`.
- Posição atual e proventos permanecem parciais; patrimônio global não está certificado.
- Recuperação administrativa permanece aberta.
- O diferencial da #501 foi sanitizado. A dívida de privacidade já existente na árvore e no histórico remoto da #500 não foi tratada nesta release e está no backlog.

## Fronteiras da release

Sem escrita financeira hospedada, promoção Package1A/Package2, alteração de Auth, Firestore Rules ou índices, restore real, deploy manual, push adicional ou alteração do projeto `carteira-2.0`.

A release encerra a fase de fundação e inicia `MAINTENANCE_AND_DATA_CERTIFICATION_MODE`. Veja a [matriz de estado](LEGACY_SYSTEM_STATUS.md), o [backlog vigente](LEGACY_BACKLOG.md) e a [prontidão de dados](LEGACY_DATA_READINESS.md).
## Histórico resumido de trabalho concluído

- **Fundação:** fronteiras entre UI, Finance Core, persistência e QA estabelecidas e preservadas.
- **Backup e recuperação:** validação, manifesto e prévia de restore endurecidos; recuperação independente completa continua sem certificação.
- **Package1:** snapshot oficial e detalhe parcial separados, com limites explícitos para custo desconhecido e P&L.
- **Package2:** V3 local com snapshots, cobertura e proveniência; promoção hospedada não executada.
- **Privacidade e Auth:** release diferencial sanitizada e smoke autenticado read-only; recuperação administrativa continua aberta.
- **IR2026:** motor, ledger e registry de autoridade disponíveis; dados reais e imposto devido não certificados.
- **Hardening fiscal:** estados desconhecidos e parciais permanecem fail-closed; nenhuma inferência preenche lacunas.
- **Cleanroom:** PR #501 levou apenas a árvore sanitizada ao `main`; o histórico antigo da #500 permanece para remediação separada.
