# Próximo passo oficial

OPERATING_MODE=MAINTENANCE_AND_DATA_CERTIFICATION
VISUAL_PHASE=COMPLETED

## Ação atual

As três PRs visuais/de governança (#503, #504, #505) foram integradas ao main. O estado é de manutenção e certificação de dados. Aguarde evidência fiscal confiável para a abertura de 2026 e prossiga em leitura local, dry-run e revisão dos documentos listados em [`IR2026_DOCUMENT_REQUEST.md`](IR2026_DOCUMENT_REQUEST.md). Não grave resultados na carteira.

## Prioridades

- **P0:** corrigir incidente real de produção, segurança ou corrupção de dados.
- **P1:** ingerir e certificar evidência fiscal real em modo read-only/dry-run.
- **P2:** avaliar promoção hospedada do Package2 V3 após identidade do proprietário, leitura exata, diff e autorização de escrita específicos.
- **P3:** reconciliar patrimônio global, custodiantes, datas e sobreposição.
- **P4:** tratar dívida técnica de privacidade preexistente.
- **P5:** implementar melhorias opcionais de UX apenas diante de benefício e necessidade demonstráveis.

## Limites

- `NO_NEW_FOUNDATION_WORK_WITHOUT_REAL_NEED=YES`.
- `IR2026_REAL_DATA_READY=NO`; `TAX_PAYABLE_STATUS=NOT_CALCULATED`.
- `PACKAGE2_V3_HOSTED_PROMOTED=NO`; qualquer escrita hospedada requer autorização específica.
- `GLOBAL_PATRIMONY_CERTIFIED=NO`.
- Preserve `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE` e `EXPECTED != RECEIVED`.
- Não fazer push, PR, merge, deploy, importação ou alteração de dados sem autorização que cubra a ação.

O histórico anterior de próximos passos foi preservado em [`archive/NEXT_STEP_HISTORY_TO_2026-10-17.md`](archive/NEXT_STEP_HISTORY_TO_2026-10-17.md).