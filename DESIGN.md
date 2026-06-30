# Design System - Carteira de Investimentos

## 1. Identidade visual

O sistema tem linguagem de painel financeiro premium:

- limpa;
- executiva;
- discreta;
- com foco em leitura rapida;
- sem aparencia de site de marketing.

A sensacao desejada e de aplicativo profissional, semelhante a ferramentas de produtividade e paines financeiros modernos.

## 2. Paleta de cores

O app usa um sistema de temas com tokens CSS.

### Tema escuro

Base atual:

- fundo geral: `#0a0f18`;
- texto principal: `#edf3ff`;
- texto secundario: `#7489a4`;
- painel: `#111828`;
- painel secundario: `#0d1320`;
- card: `#111828`;
- superficie: `#0b1020`;
- bordas sutis e tons azulados frios.

### Tema claro

Base atual:

- fundo geral: `#edf3f8`;
- texto principal: `#172033`;
- texto secundario: `#5b6b80`;
- painel: `#f7f9fc`;
- painel secundario: `#ffffff`;
- card: `#ffffff`;
- superficie: `#f1f5f9`;
- bordas suaves e azulados claros.

### Cores funcionais

O sistema preserva sinais financeiros padrao:

- sucesso/ganho em verde;
- alerta em amarelo ou laranja;
- perda em vermelho;
- destaque primario em azul;
- estado neutro em cinza-azulado.

## 3. Tipografia

Base atual:

- fonte principal sem serifas do sistema;
- leitura direta;
- peso visual forte em titulos e valores;
- textos secundarios mais leves e discretos.

Padrao de uso:

- titulos: claros, curtos e objetivos;
- valores principais: maiores e com destaque;
- textos auxiliares: menores, mas ainda legiveis;
- tabelas: compactas, com boa separacao visual.

## 4. Espacamento e grid

O layout trabalha com:

- cards bem definidos;
- grid responsivo;
- separacao clara entre blocos;
- respiro moderado, sem poluicao;
- alinhamento consistente entre seções.

Direcao visual atual:

- desktop: blocos em duas colunas quando faz sentido;
- mobile: empilhamento ou colunas controladas;
- evitar rolagem horizontal na pagina inteira;
- permitir rolagem interna apenas quando necessario.

## 5. Componentes reutilizaveis

### Cards

- principal unidade visual do sistema;
- cantos arredondados;
- sombra discreta;
- fundo coerente com o tema;
- usados para resumo, analise, historico e metas.

### Modais

- usados para edicao, confirmacoes e fluxos auxiliares;
- foco em centralizacao, clareza e fechamento facil;
- fundo bloqueado quando o modal esta ativo;
- largura responsiva no desktop e quase tela cheia no mobile.

### Tabelas

- usadas para historicos, rankings e listas detalhadas;
- cabeçalhos claros;
- linhas compactas;
- `nowrap` onde necessario;
- overflow horizontal interno quando a largura da informacao exige.

### Formularios

- simples;
- com labels curtas;
- foco em uso rapido;
- campos bem separados para evitar erro de toque.

### Toasts

- avisos discretos;
- tempo curto;
- nao devem bloquear interacao;
- usados para sucesso, alerta e erro leve.

### Botoes

- prioridade visual clara;
- area de toque adequada;
- estados padronizados;
- nivel secundario para acoes menos criticas;
- destaque para a acao principal.

### Icones

- uso funcional, nao decorativo;
- ajudando reconhecimento rapido;
- preferencia por simbolos simples e conhecidos.

## 6. Responsividade

O sistema precisa funcionar bem em:

- desktop grande;
- notebook;
- tablets;
- mobile 390px, 412px e 430px.

Regras atuais de responsividade:

- reducao de densidade no mobile quando necessario;
- componentes empilhados em telas pequenas;
- uso de rolagem horizontal interna apenas em tabelas e barras de navegação quando apropriado;
- preservacao da hierarquia visual;
- sem cortes estranhos de texto.

## 7. Acessibilidade

Boas praticas atuais e esperadas:

- contraste suficiente entre texto e fundo;
- feedback visual claro de acao;
- foco visivel em interacoes principais;
- alvos de toque confortaveis;
- textos secundarios sem perder leitura;
- nao depender apenas de cor para explicar estado.

## 8. Animacao e transicao

O estilo de movimento e discreto:

- transicoes curtas;
- abertura e fechamento suaves;
- sem efeitos exagerados;
- sem distracao em tela financeira.

## 9. Padrões de consistencia

Para manter o sistema coerente:

- reaproveitar tokens CSS;
- evitar um novo padrao visual por tela;
- manter a Home como referencia de apresentacao principal;
- respeitar o modo escuro e o claro premium;
- preservar comportamento de tabelas, modais e toasts;
- nao quebrar o layout consolidado por fases anteriores.

## 10. Direcao visual por area

### Home / Dashboard

- painel executivo;
- resumo rapido;
- blocos principais bem alinhados;
- foco em patrimonio, renda e postura da carteira.

### Dividendos

- leitura limpa;
- foco em historico, meta e recebimentos;
- tabelas e cards compactos.

### Ativos

- analise detalhada, mas organizada;
- rankings e listas legiveis;
- uso moderado de informacao por bloco.

### Rentabilidade / Metas / Diagnostico

- tom consultivo;
- explicacao curta e util;
- visual que facilita decisao.

## 11. Limites do sistema visual

O design deve continuar:

- simples;
- consistente;
- rapido de ler;
- profissional;
- seguro para mudancas pequenas.

Nao deve virar:

- site promocional;
- dashboard decorativo;
- interface pesada;
- layout instavel.

