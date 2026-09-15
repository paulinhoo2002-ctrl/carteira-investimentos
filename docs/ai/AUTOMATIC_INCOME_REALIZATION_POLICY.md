# Política de renda automática

## Decisão

O modo recomendado é **MODE_A — AUTO_DISCOVER_MANUAL_REALIZE**. O sistema pode
descobrir e exibir eventos públicos como `ANNOUNCED`/`EXPECTED`, mas não promove
um evento para o ledger realizado sem reconciliação explícita.

`ANNOUNCED`, `EXPECTED` e `ESTIMATED` são conceitos distintos de `REALIZED`.
Eventos descobertos ficam no domínio `CorporateEvent`; o ledger existente
`S.proventos` permanece a fonte dos totais recebidos.

Promoção futura exige fonte confiável, elegibilidade determinística, data de
pagamento atingida, ausência de conflito/correção pendente e idempotência. A
auto-realização B/C não está habilitada.

## Regras de segurança

- Transferência, aplicação, resgate, empréstimo e ação societária sem semântica
  de caixa não são renda por inferência.
- Data de direito usa posição histórica; quantidade atual só é fallback
  explicitamente marcado como provisional quando não há histórico suficiente.
- Texto de provedor é dado, nunca HTML executável.
- Falha de provedor degrada a sincronização e não altera a carteira.
- B3 é reconciliação/auditoria opcional, não dependência mensal obrigatória.
