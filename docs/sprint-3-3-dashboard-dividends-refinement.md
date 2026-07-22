# Sprint 3.3 - Refinamento de Dividendos e Dashboard

## Problema consolidado

- a area de `Distribuicao mensal` aparece repetida;
- o `Historico mensal` abre pesado demais quando ha muitos anos;
- `Destaques da carteira` mostra pouca informacao por categoria;
- o Dashboard ainda parece mais analitico do que editorial.

## Arquitetura da informacao

### Aba Dividendos

1. Cabecalho curto.
2. Resumo leve.
3. Filtros compactos.
4. Historico mensal com limite inicial.
5. Distribuicao mensal recolhida por padrao.

### Dashboard

1. Resumo rapido.
2. Destaques da carteira com `Maiores altas` e `Maiores baixas`.
3. Filtro por categoria.
4. Composicao por classe.

## Wireframes

### Dividendos desktop

- cabecalho compacto;
- resumo curto;
- filtros acima do historico;
- `Historico mensal` mostra 5 anos por padrao;
- acao para expandir o historico completo;
- `Distribuicao mensal` aparece recolhida e nao duplica filtros.

### Dividendos mobile

- cabecalho curto;
- resumo em linha compacta;
- `Distribuicao mensal` recolhida por padrao;
- `Historico mensal` com visao resumida por ano;
- expansao por ano com teclado e leitor de tela;
- sem rolagem horizontal da pagina.

### Dashboard desktop

- `Destaques da carteira` compacto;
- somente uma area de leitura principal;
- abas `Maiores altas` e `Maiores baixas`;
- filtro por categoria sem dominar a tela;
- `Composicao por classe` continua visivel.

### Dashboard mobile

- filtro de categoria em linha curta ou wrap;
- lista vertical com ate 5 ativos;
- leitura clara sem cards excessivos;
- `Renda Fixa` fora do destaque.

## Prototipo

- prototipo isolado aprovado visualmente antes da implementacao;
- apoio local temporario para validar hierarquia, densidade e responsividade;
- dados mockados somente para revisao;
- arquivo removido ao final da implementacao;
- sem Firebase, schema, persistencia ou calculos novos.

## Implementacao real

- prototipo aprovado e convertido para a aplicacao real em `index.html`;
- `Distribuicao mensal` ficou unica, recolhida por padrao, com acoes `Ver distribuicao mensal` e `Ocultar distribuicao`;
- o historico mensal mostra inicialmente os 5 anos mais recentes, com `Ver historico completo` e `Mostrar menos` quando ha mais anos;
- os modos `Lista` e `Matriz` continuam preservados;
- o Dashboard passou a exibir `5 maiores altas` e `5 maiores baixas` com filtros `Todos`, `Acoes`, `FIIs` e `ETFs`;
- `Renda Fixa` foi excluida dos destaques da carteira;
- ativos sem variacao ou valor confiavel sao excluidos do ranking;
- o desempate usa maior impacto financeiro absoluto;
- os calculos oficiais continuam reutilizados;
- o mobile ficou protegido contra a barra inferior fixa;
- a classe `.hidden` continua sustentando o recolhimento visual;
- o mobile recebeu quebra legivel para `Melhor mes` e padding inferior com `env(safe-area-inset-bottom)`;
- nao houve alteracao em Firebase, schema, persistencia ou dependencias.

## Decisoes de produto

- uma unica regra para o limite inicial do historico;
- uma unica secao de distribuicao mensal;
- categorias de destaque separadas sem incluir Renda Fixa;
- acao `Ver todos` mantida somente se houver destino real;
- leitura editorial acima de bloco analitico pesado.

## Decisoes mobile

- historico resumido por ano;
- expansao acessivel;
- controles proximos do conteudo;
- botao de distribuicao com alvo de toque adequado;
- sem area vazia artificial para alinhar captura.

## Limitacoes

- prototipo usa dados mockados;
- nao altera o app real;
- nao integra com Firebase;
- nao altera regras financeiras;
- nao altera `modern/dist`.

## Acessibilidade

- botao e filtros com rotulo claro;
- `aria-expanded` nas areas recolhiveis;
- `aria-controls` quando ha painel associado;
- foco visivel;
- contraste alto;
- leitura compreensivel sem depender so de cor.
