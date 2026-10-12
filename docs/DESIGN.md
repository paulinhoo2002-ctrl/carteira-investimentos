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

Padrao de uso:

- cada card deve ter titulo curto e funcao clara;
- valores principais devem ficar em destaque, sem competir com o texto auxiliar;
- blocos recolhiveis devem abrir e fechar de forma previsivel;
- nao misturar muitas acoes dentro do mesmo card quando existir uma area dedicada.

### Modais

- usados para edicao, confirmacoes e fluxos auxiliares;
- foco em centralizacao, clareza e fechamento facil;
- fundo bloqueado quando o modal esta ativo;
- largura responsiva no desktop e quase tela cheia no mobile.

Regras do modal premium atual:

- cabecalho fixo com contexto da edicao;
- rodape fixo com acoes principais;
- foco inicial no primeiro campo;
- fechamento por X, ESC e clique fora quando seguro;
- retorno de foco e preservacao do scroll ao fechar;
- feedback visual discreto de alteracoes e salvamento.

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

Preferencia atual:

- sucesso deve ser silencioso ou muito discreto;
- erro pode ser mais visivel, mas sem travar a interface;
- nunca cobrir menus, botoes ou impedir clique.

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

## 10. Superficies atuais prioritarias

As areas que devem guiar qualquer auditoria visual sao:

- Dashboard / Home;
- Ativos;
- Movimentacoes;
- Dividendos;
- Renda Fixa;
- Rentabilidade;
- Metas;
- Diagnostico;
- IA / Assistente Inteligente da Carteira;
- Relatorios;
- Auditoria;
- modais globais e toasts.

Diretriz para o Assistente Inteligente:

- manter a area separada do Dashboard;
- cards consultivos, compactos e reutilizaveis;
- evitar repeticao de texto;
- priorizar resumo, alerta, concentracao e renda passiva.

## 11. Direcao visual por area

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

## 12. Limites do sistema visual

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

## 13. Checklist para auditoria Impeccable

Antes de aprovar uma mudanca visual, conferir:

- mobile 390px, 412px e 430px;
- desktop sem regressao de alinhamento;
- contraste adequado no tema claro e no escuro;
- nenhum card abre ou fecha sozinho;
- nenhuma tabela corta informacao critica;
- nenhum toast bloqueia interacao;
- areas consultivas continuam simples e legiveis;
- a documentacao continua refletindo o estado atual do produto.

## 14. Fundação de design V192

Esta seção torna explícitos os contratos usados por agentes e revisores. Ela
complementa `docs/ai/DESIGN_SYSTEM.md` e não autoriza uma migração visual
global.

### Personalidade e hierarquia

- Personalidade: premium escura, executiva, discreta e orientada a leitura.
- Um foco por tela: a tarefa principal vence por tamanho, peso, contraste ou
  espaço; metadados não competem com o valor.
- Base de escala: corpo de 14–16px, escala aproximada de 1.25, sem microtexto
  para informação essencial.
- Números financeiros usam `tabular-nums`, alinhamento consistente e formato
  pt-BR quando aplicável.

### Superfícies, profundidade e ritmo

- Fundo navy; superfícies variam principalmente por luminosidade, não por
  vários matizes.
- Profundidade padrão: camadas discretas de superfície e bordas de baixa
  opacidade; sombras fortes não são permitidas no tema escuro.
- Espaçamento baseado em múltiplos de 4/8px; controles densos, seções com
  respiro e nenhuma sequência monótona de cards iguais.
- Raios: pequenos para controles, médios para cards e maiores para modais;
  elementos aninhados respeitam raio concêntrico.

### Cores semânticas

- Navy/azul estrutura o produto; teal/emerald marca ação e identidade.
- Azul pode comunicar benchmark/comparação; verde ganho/positivo; vermelho
  perda/negativo; amber atenção.
- Cor nunca é o único canal: estados têm texto, ícone ou padrão auxiliar.
- `unavailable != zero`, `estimated != authoritative` e referência não vira
  receita apenas por receber uma cor positiva.

### Componentes e estados

- KPI: rótulo discreto, valor focal, contexto e estado sem cálculo visual.
- Tabelas: cabeçalho compreensível, números tabulares, sorting acessível,
  scroll interno quando inevitável e ausência explícita.
- Formulários: labels, foco visível, erro inline, valores preservados e ação
  impossível desabilitada.
- Import Center: status comunica etapa e segurança sem depender de cor; preview
  e confirmação continuam separados.
- Renda Fixa: autoridade manual, fonte, as-of, stale/fallback e suporte são
  explicados sem substituir a autoridade.
- Todo componente interativo mantém default, hover, active, focus, disabled,
  loading, empty e error quando aplicável.

### Responsividade e acessibilidade

- Alvos de toque preferencialmente >=44px.
- Desktop primário: 1366x768; validar também 390x844, 430x932, 768x900 e
  1920x1080.
- Não permitir overflow horizontal da página; rolagem interna deve ser
  deliberada e identificável.
- Headings semânticos, ordem de tabulação previsível, `focus-visible`, nomes
  acessíveis e resumo textual para gráficos importantes.
- Animações somente em `transform`/`opacity`, abaixo de 300ms quando úteis,
  respeitando `prefers-reduced-motion`.

### Checklist de decisão visual

Antes de escrever UI, registrar: intenção humana, elemento focal, paleta e
motivo, estratégia de profundidade, escala tipográfica, densidade e estados.
Depois aplicar swap test, squint test, signature test e token test. Se a
mudança não passa nesses testes, reduzir escopo ou voltar à solução existente.
