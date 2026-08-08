# Diretrizes de Interface do Usuário (UI)

Este documento captura os padrões oficiais de interface do projeto Carteira de Investimentos, extraídos do DESIGN.md e das práticas observadas nas últimas pull requests.

## 1. Identidade Visual
- Linguagem de painel financeiro premium: limpa, executiva, discreta, com foco em leitura rápida.
- Sem aparência de site de marketing.
- Sensação de aplicativo profissional, semelhante a ferramentas de produtividade e painéis financeiros modernos.

## 2. Paleta de Cores
### Tema Escuro (padrão)
- Fundo geral: `#0a0f18`
- Texto principal: `#edf3ff`
- Texto secundário: `#7489a4`
- Painel: `#111828`
- Painel secundário: `#0d1320`
- Card: `#111828`
- Superfície: `#0b1020`
- Bordas sutis e tons azulados frios.

### Tema Claro
- Fundo geral: `#edf3f8`
- Texto principal: `#172033`
- Texto secundário: `#5b6b80`
- Painel: `#f7f9fc`
- Painel secundário: `#ffffff`
- Card: `#ffffff`
- Superfície: `#f1f5f9`
- Bordas suaves e azulados claros.

### Cores Funcionais
- Sucesso/ganho: verde
- Alerta: amarelo ou laranja
- Perda: vermelho
- Destaque primário: azul
- Estado neutro: cinza-azulado

## 3. Tipografia
- Fonte principal: sem serifas do sistema
- Leitura direta
- Peso visual forte em títulos e valores
- Textos secundários mais leves e discretos
- **Padrao de uso**:
  - Títulos: claros, curtos e objetivos
  - Valores principais: maiores e com destaque
  - Textos auxiliares: menores, mas ainda legíveis
  - Tabelas: compactas, com boa separação visual

## 4. Espaçamento e Grid
- Layout baseado em cards bem definidos
- Grid responsivo
- Separação clara entre blocos
- Respiro moderado, sem poluição visual
- Alinhamento consistente entre seções
- **Direção visual atual**:
  - Desktop: blocos em duas colunas quando faz sentido
  - Mobile: empilhamento ou colunas controladas
  - Evitar rolagem horizontal na página inteira
  - Permitir rolagem interna apenas quando necessário

## 5. Componentes Reutilizáveis

### Cards
- Principal unidade visual do sistema
- Cantos arredondados
- Sombra discreta
- Fundo coerente com o tema
- Usados para resumo, análise, histórico e metas
- **Padrao de uso**:
  - Cada card deve ter título curto e função clara
  - Valores principais devem ficar em destaque, sem competir com o texto auxiliar
  - Blocos recolhíveis devem abrir e fechar de forma previsível
  - Não misturar muitas ações dentro do mesmo card quando existir uma área dedicada

### Modais
- Usados para edição, confirmações e fluxos auxiliares
- Foco em centralização, clareza e fechamento fácil
- Fundo bloqueado quando o modal está ativo
- Largura responsiva no desktop e quase tela cheia no mobile
- **Regras do modal premium atual**:
  - Cabeçalho fixo com contexto da edição
  - Rodapé fixo com ações principais
  - Foco inicial no primeiro campo
  - Fechamento por `X`, `ESC` e clique fora quando seguro
  - Retorno de foco e preservação do scroll ao fechar
  - Feedback visual discreto de alterações e salvamento

### Tabelas
- Usadas para históricos, rankings e listas detalhadas
- Cabeçalhos claros
- Linhas compactas
- `nowrap` onde necessário
- Overflow horizontal interno quando a largura da informação exige

### Formulários
- Simples
- Labels curtas
- Foco em uso rápido
- Campos bem separados para evitar erro de toque

### Toasts
- Avisos discretos
- Tempo curto
- Não devem bloquear interação
- Usados para sucesso, alerta e erro leve
- **Preferência atual**:
  - Sucesso deve ser silencioso ou muito discreto
  - Erro pode ser mais visível, mas sem travar a interface
  - Nunca cobrir menus, botões ou impedir clique

### Botões
- Prioridade visual clara
- Área de toque adequada
- Estados padronizados
- Nível secundário para ações menos críticas
- Destaque para a ação principal

### Ícones
- Uso funcional, não decorativo
- Ajudando reconhecimento rápido
- Preferência por símbolos simples e conhecidos

## 6. Responsividade
O sistema precisa funcionar bem em:
- Desktop grande
- Notebook
- Tablets
- Mobile: 390px, 412px e 430px

### Regras atuais de responsividade:
- Redução de densidade no mobile quando necessário
- Componentes empilhados em telas pequenas
- Uso de rolagem horizontal interna apenas em tabelas e barras de navegação quando apropriado
- Preservação da hierarquia visual
- Sem cortes estranhos de texto

## 7. Acessibilidade
Boas práticas atuais e esperadas:
- Contraste suficiente entre texto e fundo
- Feedback visual claro de ação
- Foco visível em interações principais
- Alvos de toque confortáveis
- Textos secundários sem perder leitura
- Não depender apenas de cor para explicar estado

## 8. Animação e Transição
- Estilo de movimento discreto
- Transições curtas
- Abertura e fechamento suaves
- Sem efeitos exagerados
- Sem distração em tela financeira

## 9. Padrões de Consistência
Para manter o sistema coerente:
- Reaproveitar tokens CSS
- Evitar um novo padrão visual por tela
- Manter a Home como referência de apresentação principal
- Respeitar o modo escuro e o claro premium
- Preservar comportamento de tabelas, modais e toasts
- Não quebrar o layout consolidado por fases anteriores

## 10. Superfícies Atuais Prioritárias
As áreas que devem guiar qualquer auditoria visual são:
- Dashboard / Home
- Ativos
- Movimentações
- Dividendos
- Renda Fixa
- Rentabilidade
- Metas
- Diagnóstico
- IA / Assistente Inteligente da Carteira
- Relatórios
- Auditoria
- Modais globais e toasts

### Diretriz para o Assistente Inteligente:
- Manter a área separada do Dashboard
- Cards consultivos, compactos e reutilizáveis
- Evitar repetição de texto
- Priorizar resumo, alerta, concentração e renda passiva

## 11. Limites do Sistema Visual
O design deve continuar:
- Simples
- Consistente
- Rápido de ler
- Profissional
- Seguro para mudanças pequenas

Não deve virar:
- Site promocional
- Dashboard decorativo
- Interface pesada
- Layout instável

## 12. Checklist para Auditoria Impeccable
Antes de aprovar uma mudança visual, conferir:
- Mobile 390px, 412px e 430px
- Desktop sem regressão de alinhamento
- Contraste adequado no tema claro e no escuro
- Nenhum card abre ou fecha sozinho
- Nenhuma tabela corta informação crítica
- Nenhum toast bloqueia interação
- Áreas consultivas continuam simples e legíveis
- A documentação continua refletindo o estado atual do produto

## 13. Fluxo Oficial de Trabalho com Habilidades de UI
Ao realizar alterações na interface, siga este fluxo obrigatório:
1. **interface-design** – Aplicar diretrizes de design, layout, componentes, responsividade e acessibilidade.
2. **playwright** – Executar testes de ponta a ponta para validar comportamento em múltiplos viewports (390px, 768px, 1366px, 1920px), navegação, filtros, abas, ordenações, expansões, ausência de novos erros no console e fluxos alterados.
3. **impeccable** – Auditar qualidade de código, clareza, consistência, acessibilidade, responsividade, performance e riscos.