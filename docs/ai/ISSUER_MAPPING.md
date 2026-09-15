# V71 — identidade de emissor e fundo

`issuer-mapping.js` usa chaves exatas e versionáveis: ticker, ISIN, CNPJ,
código CVM e CNPJ do fundo. Nomes semelhantes não são autoridade final.

O resultado mantém tipo do ativo, nome legal, identidade pública, fonte,
confiança e data de validação. Tickers sem identidade determinística entram em
fila de revisão e não geram documento oficial nem evento automático.

O mapeamento é metadado público/local separado do `civ5` e do ledger
financeiro. Cobertura deve ser reportada por classe: ações, FIIs e FIAGRO.

## V72 — cobertura atual

A resolução estrutural está pronta, mas não há registros determinísticos
locais suficientes para declarar cobertura oficial dos 36 ativos atuais. A
fila de revisão permanece intencionalmente; nomes aproximados não são
promovidos a identidade oficial.
