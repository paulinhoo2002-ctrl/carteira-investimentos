# Sprint 3.5 - Refinamento da Pagina de Ativos

## Problema

A pagina de Ativos ainda tende a parecer um dashboard com varios blocos competindo entre si.
O objetivo desta sprint e deixar a leitura mais rapida, direta e resistente a muitos ativos.

Problemas observados:

- excesso de informacao por item;
- resumo visual pesado;
- filtros e ordenacao pouco evidentes;
- risco de parecer ERP;
- duplicacao desnecessaria entre desktop e mobile;
- tratamento pouco claro de estados indisponiveis.

## Arquitetura da informacao

### Ordem de leitura

1. cabecalho curto;
2. controles;
3. resumo compacto;
4. tabela protagonista no desktop;
5. lista compacta no mobile;
6. estados vazios ou indisponiveis;
7. informacoes auxiliares subordinadas.

### Decisao sobre blocos auxiliares

Preferencia:

- manter abaixo da tabela;
- recolhidos por padrao;
- sem competir com a leitura principal.

Alternativa descartada para o fluxo principal:

- remover completamente os blocos auxiliares do caminho visual.

## Dados exibidos

- ticker;
- nome;
- categoria;
- quantidade;
- preco medio;
- valor da posicao;
- resultado financeiro;
- rentabilidade percentual;
- estado de indisponibilidade quando real.

Renda Fixa fica separada da logica principal de altas e baixas de mercado.

## Filtros e ordenacoes

### Filtros

- Todos;
- Acoes;
- FIIs;
- ETFs.

Acao Atualizar fica unica no cabecalho, junto do snapshot.

### Ordenacoes

- maior valor da posicao;
- menor valor da posicao;
- maior rentabilidade;
- menor rentabilidade;
- maior resultado;
- menor resultado;
- ticker;
- nome.

## Desktop

- tabela como protagonista;
- categoria com Badge neutral;
- valor da posicao, resultado e rentabilidade separados;
- linhas discretas;
- sem grade pesada;
- sem excesso de bordas;
- scroll horizontal apenas quando necessario.

## Mobile

- lista vertical por ativo;
- sem tabela comprimida;
- ticker, nome, badge e valor da posicao em destaque;
- resultado financeiro e rentabilidade bem separados;
- quantidade e preco medio como informacoes secundarias;
- detalhes secundarios agrupados sem poluir.

## Resumo

- quatro indicadores apenas;
- Total exibido;
- Quantidade;
- Resultado agregado;
- Rentabilidade;
- menos peso visual;
- sem cards extras de alta e queda no topo.

## Estados

- carregando;
- sem ativos;
- busca sem resultado;
- filtro sem resultado;
- ativo sem cotacao;
- ativo sem preco medio;
- ativo sem valor atual;
- resultado zero;
- rentabilidade zero;
- nome longo;
- ticker longo;
- valor financeiro alto;
- muitos ativos.

Badge warning fica reservado para indisponibilidade real.

## Blocos auxiliares

- Maiores posicoes;
- Distribuicao por categoria;
- ambos abaixo da tabela/lista;
- ambos recolhidos por padrao;
- texto curto e discreto quando abertos.

## Padrao de abertura

- somente um botao Atualizar no cabecalho;
- auxiliares nao reservam espaco quando fechados;
- aria-expanded e aria-controls nos gatilhos;
- abrir mostra conteudo secundario sem virar segundo dashboard.

## Acessibilidade

- heading hierarchy clara;
- labels dos controles;
- tabela com caption;
- `th` com `scope` correto;
- ganho e perda compreensiveis sem depender so de cor;
- Badge nao interativo;
- focus-visible;
- zoom 100%, 125% e 150%;
- contraste valido;
- alvos de toque adequados;
- texto completo;
- leitor de tela compreende ticker, nome, resultado e percentual.

## Wireframes

### 1. Desktop padrao

```text
[ Ativos ]
[ descricao curta ]
[ busca ] [ categoria ] [ ordenacao ] [ atualizar ]

[ resumo compacto ]
[ total exibido ] [ quantidade ] [ resultado agregado ] [ rentabilidade ]

[ tabela protagonista ]
Ativo | Categoria | Quantidade | Preco medio | Valor da posicao | Resultado | Rentabilidade

[ blocos auxiliares recolhidos abaixo ]
```

### 2. Desktop filtrado por Acoes

```text
[ cabecalho ]
[ controles com categoria = Acoes ]
[ resumo compacto ]
[ tabela com somente Acoes ]
[ auxiliares recolhidos ]
```

### 3. Desktop ordenado por maior perda

```text
[ cabecalho ]
[ controles com ordenacao = menor rentabilidade ]
[ resumo compacto ]
[ tabela com perdedores no topo ]
[ auxiliares recolhidos ]
```

### 4. Desktop com ativo indisponivel

```text
[ cabecalho ]
[ controles ]
[ resumo compacto ]
[ tabela ]
[ linha com Badge warning "Indisponivel" ]
[ auxiliares recolhidos ]
```

### 5. Desktop com blocos auxiliares recolhidos

```text
[ cabecalho ]
[ controles ]
[ resumo compacto ]
[ tabela protagonista ]
[ detalhes auxiliares fechados abaixo ]
```

### 6. Tablet

```text
[ cabecalho compacto ]
[ controles em duas linhas ]
[ resumo compacto ]
[ tabela com scroll horizontal controlado ]
[ auxiliares subordinados ]
```

### 7. Mobile padrao

```text
[ cabecalho curto ]
[ busca ]
[ categoria ]
[ ordenacao ]
[ resumo compacto ]
[ lista vertical por ativo ]
[ auxiliares abaixo e recolhidos ]
```

### 8. Mobile positivo

```text
[ ativo com ganho visivel ]
[ Badge da categoria ]
[ ganho em reais ]
[ rentabilidade positiva ]
```

### 9. Mobile negativo

```text
[ ativo com perda visivel ]
[ Badge da categoria ]
[ perda em reais ]
[ rentabilidade negativa ]
```

### 10. Mobile indisponivel

```text
[ ativo sem dado confiavel ]
[ Badge warning Indisponivel ]
[ campos ausentes destacados com texto claro ]
```

### 11. Busca sem resultado

```text
[ cabecalho ]
[ controles com busca ativa ]
[ estado vazio com instrucoes ]
```

### 12. Muitos ativos

```text
[ cabecalho ]
[ controles ]
[ lista longa / tabela longa ]
[ foco em densidade e leitura rapida ]
```

### 13. Zoom 150%

```text
[ mesma hierarquia ]
[ tipos maiores ]
[ nenhum corte de texto ]
[ nenhum overflow horizontal ]
```

## Protótipo

- arquivo isolado: `prototype-assets-page-refinement.html`
- dados mockados com 6 Acoes, 6 FIIs, 6 ETFs e Renda Fixa fora da lista principal
- mock contem positivos, negativos, zero, empate, nome longo e ativo indisponivel

- prototipo aprovado antes da implementacao real

## Validacao visual real

- desktop validado em 1366 px e 1920 px;
- tablet validado em 768 px;
- mobile validado em 390 px;
- auxiliares recolhidos por padrao sem reservar espaco;
- ajuste final aplicado: `.assets-readonly__auxiliary-panel[hidden] { display: none; }`;
- nenhuma overflow horizontal observada nas capturas;
- mobile ficou com lista vertical, resumo compacto e sem tabela comprimida.

## Riscos

- virar tabela de ERP;
- excesso de cards no resumo;
- mobile pesado demais;
- ativo indisponivel confundir com erro;
- auxiliar competir com a tabela principal.

## Fora do escopo

- produção;
- `index.html` legado;
- Firebase;
- schema;
- persistencia;
- dependencias;
- `modern/dist`;
- 404 experimental;
- commit, push, PR ou merge.

## Proximos passos

1. validar prototipo por viewport e zoom;
2. confirmar escolha dos blocos auxiliares;
3. revisar se a tabela e a lista contam a mesma historia sem duplicar ruido;
4. implementacao real ja entrou na camada moderna;
5. manter doc e testes como fonte de rastreio da decisao.

