# Import Center — contrato V92

## Pipeline

`FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW → DEDUPE → CONFIRM → WRITE`

O módulo `import-center-core.js` implementa a parte pura do contrato: detecção
por extensão, cabeçalho e conteúdo disponível; registro de parsers; normalização
canônica de operações; validação; identidade determinística; deduplicação e
conflitos; modelo de preview e gate de confirmação.

## Segurança

- `financialWrite=false` e `writeCount=0` no preview e na confirmação do core.
- A camada não chama `save()`, Firebase, localStorage nem cria transações.
- A escrita futura continua pertencendo ao coordenador protegido existente e
  requer confirmação explícita, revalidação e snapshot.
- Compra e venda são operações; não são aporte ou retirada externos.
- Campos monetários são normalizados em centavos; datas são date-only.

## Detecção e suporte

- B3: formatos tabulares existentes continuam suportados pelos parsers prévios.
- Inter: reconhecido quando há evidência de conteúdo/identidade compatível;
  parser profissional existente permanece a referência.
- XP e BTG: `FIXTURE_REQUIRED`; nenhum layout foi inventado.
- Formato desconhecido: `REVIEW_REQUIRED`, sem atribuição automática.

## Duplicidade

A identidade de trade combina data, operação, identidade exata do ativo,
quantidade, preço, valor bruto, corretora e número da nota. O preview separa
`EXACT_DUPLICATE`, `PROBABLE_DUPLICATE`, `IDENTITY_CONFLICT` e `UNIQUE`.
Duplicidade provável ou conflito nunca é confirmado silenciosamente.

## Limite desta entrega

A extração arbitrária de PDF continua dependente de fixture/parser específico.
O Import Center visual legado continua em modo de simulação; esta camada não
habilita importação financeira real.

## V330 raw execution and reconciliation contract

- Keep each raw execution, sequence and source-row identity, even when several
  executions normalize into one economic transaction. The normalized record
  carries the raw execution identities and source provenance.
- Group only when broker/note identity, trade date, canonical asset identity,
  BUY/SELL side, market, unit price and settlement context are known. Missing
  or conflicting dimensions require review; unknown asset descriptions are not
  promoted to canonical tickers.
- Note replay with the same identity/content is `EXACT_DUPLICATE`; changed
  content under the same identity is `CONFLICT`. Same-day matching app
  transactions remain `POSSIBLE_DUPLICATE`/`CONFLICT` and are never collapsed
  automatically.
- Fees remain separated by note-level component, with explicit total when
  present, and default allocation `UNALLOCATED`. IRRF amount, base, and whether
  it is included in settlement are independent evidence; missing inclusion is
  review-required. Trade and settlement dates stay distinct and are never
  inferred.
- Missing, invalid, or unsafe monetary values remain unavailable rather than
  being rounded into a plausible amount. `UNKNOWN != ZERO`.
- Note identity requires broker, note number and trade date; file/source ID is
  provenance only. Quantity must be positive, non-exponential and have at most
  eight decimal places. Execution gross must match quantity × unit price
  within one cent, otherwise the row requires review.
- Dry-run deduplication preserves separate note identities, canonical assets
  and execution evidence. Any unresolved review item blocks plan confirmation.
- Sale gross is not realized P&L. Reuse the existing governed V326 cost-basis
  engine when its full evidence is available; otherwise retain
  `RESULT_NOT_AVAILABLE`. Do not add a second P&L implementation.
- V330 preview and tests are in-memory/read-only, synthetic fixtures only, and
  stop before any real persistence. `writeCount=0` and `financialWrite=false`.
