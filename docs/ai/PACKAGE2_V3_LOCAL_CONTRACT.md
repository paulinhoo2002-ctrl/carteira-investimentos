# Package2 V3: contrato local de leitura e promoção

Este contrato é **local e somente leitura**. O campo futuro é
`portfolios/{uid}.package2_v3`. A existência deste módulo não autoriza uma
gravação hospedada, nem altera `package1_v2` ou `package2_v2`.

## Autoridade e apresentação

- `snapshots` guarda objetos imutáveis por `as_of:source_bundle_hash`;
  `latest_snapshot_id` é um ponteiro separado. Uma identidade existente com
  conteúdo diferente aborta. A fixture sintética cobre três datas; o candidato
  privado disponível nesta worktree contém somente o extrato de 17/10/2026.
  Os snapshots anteriores exigem payloads e hashes próprios antes de inclusão.
- `position` distingue RV de mercado, RF líquida e total Inter. Cada campo
  carrega centavos inteiros, data, estado, fonte, hash e escopo da autoridade.
  Cobertura parcial não representa patrimônio global completo.
- `current_result` é `PROVEN_FOR_STATEMENT` no escopo
  `CURRENT_POSITION_RESULT`, pelo método de mercado menos custo atual
  informado no extrato. Rótulo seguro: **Resultado atual da posição**.
  Não equivale a resultado realizado, custo fiscal, imposto ou DARF.
- `income` separa recebido certificado, recebido parcial, total candidato,
  legado reportado, JCP transferido, juros de RF, reembolso de aluguel,
  resgate e desconhecido. `legacy_unknown_included` registra que o ledger
  anterior continha eventos sem classificação em anos antigos. Totais de
  fontes de escopo diferente permanecem separados; ausência fica `null`.
- `global_total` continua `ARITHMETIC_ONLY`, sem valor autorizado para UI.
  IR2026 permanece `BLOCKED` até evidência fiscal própria.
- `blockers[].impact_flags` identifica separadamente impacto em posição,
  resultado atual, renda, global, fiscal e imposto.
- A versão 3 normaliza somente os campos permitidos. Uma versão futura é
  rejeitada explicitamente: nenhum campo V4 pode ser reinterpretado como V3.

O produto pode ler o total Inter e o resultado do extrato com seus estados,
mostrar renda candidata como parcial e informar “em reconciliação” onde não
há autoridade. `package1_v2` segue como evidência histórica da data anterior;
não é substituído pelo ponteiro mais recente.

## Universo de vendas e fronteira fiscal

As classificações permitidas para análise local são
`TRUE_MARKET_SALE_CERTIFIED`, `TRUE_MARKET_SALE_LIKELY`,
`NON_TAXABLE_CUSTODY_CERTIFIED`, `NON_TAXABLE_CUSTODY_LIKELY` e `UNKNOWN`.
Uma hipótese provável nunca vira venda fiscal certificada por promoção V3.

## Promoção e reversão futuras

`planPromotion` é um **dry run puro**: exige projeto, banco, UID, caminho,
`update_time`, identidade de todo o documento base (exceto V3), identidades
de Package1A e Package2, e hash canônico do candidato. Produz somente
`INSERT_IF_ABSENT` ou `NOOP_IF_EXACT_MATCH`; divergência aborta. Uma escrita
futura precisaria reler o documento dentro de transação e reaplicar esses
guards imediatamente antes de atualizar **apenas** `package2_v3`.

`simulateRollback` só altera `package2_v3` quando a identidade desse campo
ainda coincide com o valor escrito. Outros campos modificados depois são
preservados. Esta simulação não executa rollback hospedado.

Nenhum valor, UID, documento de origem ou JSON financeiro privado é
versionado aqui. O candidato real e seu gerador ficam em `.qa-state`, ignorada
pelo Git. Os testes públicos usam somente dados sintéticos.
