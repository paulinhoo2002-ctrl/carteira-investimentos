# Manual de Uso

Este manual apresenta o fluxo principal do aplicativo Carteira de Investimentos. Os nomes podem variar levemente conforme o tamanho da tela.

## 1. Dashboard

O Dashboard é a visão inicial do investidor. Ele resume:

- patrimônio estimado;
- renda passiva mensal;
- progresso da meta;
- distribuição da carteira;
- alertas de concentração;
- dividendos recentes;
- visão resumida da renda fixa;
- próximo aporte para estudo.

Use o Dashboard para orientação geral. Para detalhes, abra a aba correspondente.

## 2. Ativos

### Patrimônio

A subaba Patrimônio mostra os ativos agrupados por categoria, como Ação, FII, ETF e Renda Fixa.

Para cada ativo, confira:

- quantidade;
- preço médio;
- preço atual;
- valor aplicado;
- valor atual;
- resultado e rentabilidade.

Use a edição do ativo para corrigir dados manuais. Em ativos de mercado, o botão de atualização busca cotações quando o ticker e a categoria forem compatíveis.

### Análise

A subaba Análise organiza:

- maiores altas;
- maiores baixas;
- maiores posições;
- concentração crítica;
- ativos com dados incompletos;
- oportunidades para estudo.

Os sinalizadores são apoio de organização e não representam recomendação automática de compra ou venda.

## 3. Aportes

Use a aba Aportes para registrar e consultar compras, vendas, aplicações e resgates.

Antes de salvar, confira:

- data;
- ativo;
- tipo da operação;
- quantidade;
- preço unitário;
- valor total;
- categoria;
- instituição;
- observação.

O histórico deve ser preservado porque é usado em cálculos e conferências. Evite apagar operações sem confirmar a origem.

## 4. Rebalancear

A aba Rebalancear contém a **Sugestão Prudente de Aporte**.

Informe o valor que deseja analisar e use a simulação para estudar:

- concentração atual;
- desempenho;
- dividend yield;
- metas de distribuição;
- ativos com dados suficientes.

O resultado mostra valores para estudo, não ordens de compra.

## 5. Metas

Na aba Metas é possível acompanhar:

- renda projetada por mês;
- projeção anual;
- DY médio;
- total da carteira;
- meta de renda passiva;
- meta de patrimônio;
- distribuição desejada.

A renda real média de 12 meses usa proventos já recebidos. A renda projetada é uma estimativa baseada na carteira atual. Os valores não precisam ser iguais.

## 6. Dividendos

O resumo apresenta os valores realizados. As seções podem começar recolhidas para manter a tela compacta.

Recursos disponíveis:

- histórico mensal;
- consulta por mês, tipo e ativo;
- melhores pagadores;
- projeção por ativo;
- proventos recebidos;
- dados importados da B3;
- auditoria e conferência.

A consulta mensal ajuda a identificar exatamente o que entrou em determinado mês. A auditoria destaca possíveis duplicidades, mas não remove registros automaticamente sem confirmação.

## 7. Patrimônio Inteligente

Esta tela compara:

- valor aplicado;
- patrimônio atual;
- ganho ou perda de capital;
- percentual sobre o valor aplicado;
- evolução por período;
- composição do crescimento.

A leitura ajuda a entender se o patrimônio cresceu principalmente por aportes ou por valorização.

## 8. Renda Fixa Inteligente

A área de Renda Fixa mostra:

- valor aplicado;
- valor atual ou líquido informado;
- ganho estimado;
- rentabilidade estimada;
- quantidade de títulos;
- vencimentos;
- alertas de dados incompletos.

O botão **Atualizar mercado** não deve substituir dados de renda fixa. Informe o valor bruto ou líquido atual fornecido pela instituição.

Para um CDB de 100% do CDI, o número 100 representa a taxa contratada em relação ao CDI, não rentabilidade acumulada de 100%.

Se faltarem taxa, vencimento ou valor atual, o aplicativo informa que não há dados suficientes para cálculo preciso.

## 9. IRPF

A aba IRPF permite selecionar o ano-base e organizar:

- Bens e Direitos;
- proventos do ano;
- renda fixa;
- alertas para conferência.

A seção Bens e Direitos começa recolhida. Clique no cabeçalho para exibir ou ocultar.

O valor atual é apenas referência visual. Para IRPF, normalmente deve ser conferido o custo de aquisição, de acordo com as regras aplicáveis e os informes oficiais.

### Exportar CSV

Na aba IRPF:

1. Selecione o ano-base.
2. Revise os alertas.
3. Clique em **CSV**.
4. Abra o arquivo em uma planilha para conferência.

O CSV não é uma declaração oficial.

## 10. Importações B3

As importações possuem etapas de leitura e revisão. Sempre confira:

- ticker;
- data;
- tipo do evento;
- quantidade;
- preço;
- valor;
- destino sugerido;
- possíveis duplicidades.

Não confirme linhas marcadas como **Revisar** sem conferir o documento original.

## 11. Backup e restauração

Abra **Configurações > Backup e restauração**.

### Exportar

1. Clique em **Exportar backup**.
2. Guarde o arquivo JSON em local seguro.
3. Confirme que o arquivo possui data e hora no nome.

### Importar

1. Exporte um backup dos dados atuais.
2. Clique em **Selecionar arquivo**.
3. Confira o resumo apresentado.
4. Confirme a importação somente se o arquivo estiver correto.

A importação substitui os dados atuais da carteira ativa.

## 12. Dados incompletos

Quando aparecer **Dados insuficientes** ou alerta semelhante:

1. Abra o ativo ou lançamento.
2. Confira ticker, categoria e datas.
3. Para ativos, confira quantidade, preço médio e preço atual.
4. Para renda fixa, confira valor aplicado, valor atual, taxa e vencimento.
5. Para proventos, confira data, tipo, ticker e valor.

Não invente valores apenas para remover o alerta.

## 13. PWA, cache e versões

### Nova versão disponível

Quando o aviso aparecer:

1. Termine qualquer edição em andamento.
2. Clique em **Atualizar agora**.
3. Aguarde o recarregamento.

Os dados locais não são apagados por essa atualização.

### Quando usar Ctrl + F5

Use `Ctrl + F5` quando:

- a tela parecer antiga;
- uma correção publicada não aparecer;
- o navegador apresentar comportamento diferente de uma aba anônima.

### Limpar dados do site

Limpar os dados do site pode apagar o LocalStorage e, consequentemente, dados não sincronizados. Exporte um backup antes.

### Remover service worker manualmente

Somente em diagnóstico:

1. Exporte um backup.
2. Abra as ferramentas do navegador.
3. Vá em **Application > Service Workers**.
4. Use **Unregister**.
5. Atualize a página.

Evite usar **Clear site data** sem backup, pois essa opção pode remover os dados locais.

