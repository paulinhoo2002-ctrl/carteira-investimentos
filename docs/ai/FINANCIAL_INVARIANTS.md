# Invariantes financeiros

- Baseline confiável: `431/330/101`, 99 referências, `2709626` cents,
  fingerprint `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`.
- Não alterar silenciosamente o ledger; auto-realização permanece desligada.
- Compra não é contribuição; venda não é retirada.
- Esperado é separado de realizado.
- Cache público, snapshot e fluxo externo não são `civ5`.
- B3 é reconciliação opcional.
- Valores monetários usam cents/aritmética determinística; arredondamento só
  na fronteira apropriada.
- Toda origem relevante deve manter proveniência e conflitos explícitos.
