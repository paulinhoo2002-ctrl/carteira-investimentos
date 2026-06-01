Carteira de Investimentos — Firebase + Yahoo Finance + Importador B3/Excel

Estrutura correta para GitHub/Vercel:
index.html
api/yahoo-quote.js

Novidade:
- Botão 📥 B3/Excel para importar posição em .xlsx/.xls/.csv exportada da B3/corretora.
- O importador lê abas como Acoes, ETF e Fundo de Investimento.
- Importa Código de Negociação, Quantidade, Preço de Fechamento e Valor Atualizado.
- Cria operações de compra de ajuste na aba Aportes e recalcula Ativos.
- Observação: arquivo de posição não contém preço médio real nem data real de compra.
