# Contrato de performance de carteira

## Escopo

- `LISTED_ASSET_VALUE`: soma de posições cotadas com preço fresco ou
  explicitamente marcado como ausente.
- `FIXED_INCOME_VALUE`: valor oficial existente de renda fixa, sem cotação
  pública fictícia.
- `TOTAL_PORTFOLIO_VALUE`: soma dos componentes disponíveis, sem duplicidade.
- `COST_BASIS`: custo da posição aberta; compras e depósitos não são lucro.
- `UNREALIZED_GAIN_LOSS`: valor atual menos custo da posição aberta.
- `REALIZED_CAPITAL_GAIN`: resultado de vendas já realizadas.
- `REALIZED_INCOME`: proventos realizados, separados do resultado de mercado.
- `EXPECTED_INCOME`: eventos públicos esperados, nunca ledger realizado.

`TWR` só é disponível com avaliações e fluxos externos datados suficientes.
`XIRR` só é disponível com ao menos um fluxo negativo e um positivo. Dados
insuficientes produzem estado explícito, nunca estimativa.

O módulo puro `portfolio-performance.js` implementa agregação, retorno por
ativo, TWR e XIRR sem storage, rede ou escrita financeira.
