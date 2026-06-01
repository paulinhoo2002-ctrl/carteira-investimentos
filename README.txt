Carteira de Investimentos — Firebase + Yahoo Finance

Arquivos necessários na raiz do GitHub:
- index.html
- api/yahoo-quote.js

Correções desta versão:
- Cotação atual usa Yahoo via função /api/yahoo-quote sem token.
- Se o Yahoo retornar valor incorreto para algum ativo, é possível editar a cotação manualmente no lápis e marcar “travar cotação manual”.
- Ao travar a cotação, o botão de atualizar não sobrescreve esse ativo.
- Função Yahoo com no-store e fallback por chart v8.
