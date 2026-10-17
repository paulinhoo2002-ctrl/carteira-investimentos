# IR2026 — Evidências necessárias para certificação

Esta lista descreve categorias de documentos. Não contém posições, operações,
identificadores de ativos, quantidades ou valores de uma carteira.

## Prioridade 1 — Posição de encerramento do exercício anterior

- **Documento**: informe de rendimentos ou extrato oficial de posição com custo
  de aquisição por ativo, emitido pela instituição custodiante.
- **Período**: encerramento do exercício imediatamente anterior ao ano fiscal
  analisado.
- **Campos esperados**: ativo, quantidade, custo total ou custo médio,
  custodiante e data de referência.
- **Uso**: comprovar a abertura fiscal. Sem documento suficiente, a abertura
  continua DERIVED, PARTIAL ou UNKNOWN; nunca é promovida automaticamente.

## Prioridade 2 — Prejuízos acumulados

- **Documento**: informe ou declaração que demonstre saldos a compensar,
  discriminados por categoria fiscal aplicável.
- **Período**: saldo de encerramento do exercício anterior.
- **Campos esperados**: categoria, saldo e proveniência documental.
- **Uso**: manter o carry-forward como UNKNOWN até a evidência ser validada.

## Prioridade 3 — IRRF

- **Documento**: extrato tributário da instituição, por operação ou período.
- **Período**: exercício fiscal em análise até a data mais recente coberta.
- **Campos esperados**: data, operação, categoria e valor retido.
- **Uso**: ausência de linha não comprova IRRF igual a zero.

## Prioridade 4 — Taxas e notas de corretagem

- **Documento**: notas ou extrato com taxas itemizadas por operação.
- **Campos esperados**: identificador da operação, corretagem, emolumentos e
  demais encargos discriminados pela fonte.
- **Uso**: valores não itemizados permanecem ausentes; o sistema não os inventa.

## Prioridade 5 — Eventos sem valor ou natureza confirmada

- **Documento**: confirmação da instituição ou nota que esclareça se cada
  evento é uma operação econômica, custódia, empréstimo ou outro movimento.
- **Campos esperados**: identidade do evento, natureza, data e valor quando
  informado pela fonte.
- **Uso**: eventos ambíguos permanecem UNKNOWN e não são promovidos por
  aproximação.

## Entrega e processamento

Manter os documentos em armazenamento local privado, fora do Git. O comando
`node ir2026/scripts/ingest-dry-run.js <arquivo.json|pasta>` executa detecção,
normalização, matching e propostas em modo dry-run. A saída não altera a
carteira; qualquer promoção futura exige revisão explícita de conflitos.