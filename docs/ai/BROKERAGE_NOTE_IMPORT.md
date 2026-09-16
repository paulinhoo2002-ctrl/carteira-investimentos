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
