# Snapshots de valuation

Snapshots são dados derivados, locais, versionados e separados do ledger.
O runtime V76 persiste `portfolioValuationSnapshotsV1` com no máximo um
snapshot canônico por data local de São Paulo (`YYYY-MM-DD`). Uma atualização
no mesmo dia preserva a primeira captura, atualiza apenas a evidência melhor e
mantém `lastUpdatedAt`. Valores são armazenados em centavos inteiros.

A captura ocorre de forma assíncrona após o carregamento de carteira e cotações;
falha/corrupção desse store não impede a carteira financeira de abrir. A renda
fixa continua marcada como `LIVE`, `RECENT_SNAPSHOT`, `STALE_SNAPSHOT` ou
`UNKNOWN`; o total conhecido não é chamado de live quando algum componente está
sem frescor suficiente.
