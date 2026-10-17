# Prontidão de dados da Carteira LEGACY

**Código pronto não significa dados certificados.** A release inclui o motor IR2026 e contratos de leitura, mas não certifica posição fiscal real nem imposto devido.

| Área | Estado | Evidência necessária |
| --- | --- | --- |
| Motor IR2026 | CODE_READY | Suíte e CI da release aprovados |
| Posição fiscal de abertura | BLOCKED | Fonte oficial de 31/12/2025 com quantidade e custo |
| Resultado realizado | BLOCKED | Base fiscal, taxas e eventos certificados |
| Prejuízos anteriores | UNKNOWN | Memória de apuração por categoria e competência |
| IRRF | UNKNOWN/PARTIAL | Informes e comprovantes com origem e período |
| Regras legais de 2026 | PARTIAL | Registro atual tem evidência parcial; regras pendentes exigem fonte oficial e revisão |
| Imposto devido | NOT_CALCULATED | Só calcular após os gates de evidência e autoridade |
| Package2 V3 | CODE_READY_READ_ONLY | Contrato local; promoção hospedada não executada |
| Patrimônio global | NOT_CERTIFIED | Custodiantes, datas e cobertura ainda precisam de reconciliação |

## Regras de leitura

- `CURRENT_AVG_COST` não é `FISCAL_COST`.
- `FIFO` derivado não equivale a livro fiscal certificado.
- `UNKNOWN != ZERO`; ausência de documento não comprova saldo, perda, retenção ou recebimento igual a zero.
- `PARTIAL != COMPLETE`; dados de uma fonte ou custódia não representam automaticamente o conjunto.
- `DECLARED`, `EXPECTED` e `RECEIVED` são estados distintos.
- Histórico analítico de 2019–2025 não se torna fiscalmente certificado por estar disponível no aplicativo.

Siga [`IR2026_FOUNDATION_STATUS.md`](IR2026_FOUNDATION_STATUS.md), [`IR2026_DOCUMENT_REQUEST.md`](IR2026_DOCUMENT_REQUEST.md) e [`LEGACY_BACKLOG.md`](LEGACY_BACKLOG.md). Documentos reais e relatórios com valores permanecem locais/privados e não entram no Git.
