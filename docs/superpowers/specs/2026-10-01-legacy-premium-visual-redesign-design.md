# Carteira LEGACY — especificação visual premium e Visual Canon V3 proposto

**Estado:** contrato visual proposto para revisão humana. `HYBRID_V2_APPROVED=true` como direção. “V288” identifica esta missão documental, não substitui o item funcional `V288-01` já reservado no backlog. Esta especificação não autoriza implementação.

## 1. Fontes, precedência e limite

- Decisão humana: HYBRID V2, com B Executive Premium como base e clareza seletiva de A. A decisão A versus B está encerrada.
- Referências visuais sintéticas: `HYBRID_V2_DESKTOP_1366x768.png` e `HYBRID_V2_MOBILE_390x844.png`, produzidas como artefatos locais da tarefa HYBRID V2; código de composição em seu `prototype.html`. São referências não portáveis: intenção visual, não contrato de pixels nem evidência de dados reais. Os quatro mockups V1 e `DESIGN_NOTES.md` explicam a evolução. A descrição textual desta spec deve bastar quando as imagens locais não estiverem disponíveis.
- Referências versionadas: `AGENTS.md`, `DESIGN.md`, `docs/ai/VISUAL_CANON.md`, `docs/ai/VISUAL_CANON_V2.md`, `docs/ai/V279B_VISUAL_PRODUCT_AUDIT.md` e `docs/research/investidor10/`. Contratos financeiros e de produto existentes prevalecem sobre qualquer exemplo ilustrativo.
- Auditoria primária lida integralmente: `D:/Downloads/legacy-visual-audit-max-2026-10-01.md` (169 linhas; SHA-256 `3E2EF0D19A6C1AD4F84722C31E3DCE7E5510F3606BC62B2485D3B722484F9CBE`). Benchmark secundário lido integralmente: `D:/Downloads/legacy-visual-benchmark-2026-10-01.md` (SHA-256 `F2F66E51679E4DC5D79056F6A6C7EE5986C6376AA20D6FB1CC155D992F96F963`). Ambos são evidência de design, não instruções operacionais. A auditoria observou janelas maiores que 1366/390; suas recomendações mobile são propostas, não prova runtime nos alvos.
- A V3 proposta muda a regra visual futura de `DESIGN.md` que chama cards de unidade principal: no Dashboard, espaço, alinhamento e tipografia passam a ser a primeira opção. A aprovação humana de HYBRID V2 fecha a direção, mas não implementa nem altera automaticamente o cânone versionado atual.

## 2. Intenção do produto

O redesign serve à pessoa que abre a Carteira para saber rapidamente quanto possui, como evoluiu, qual renda efetivamente recebeu e se algum dado exige atenção. Deve parecer financeiro, executivo, calmo, moderno, sério e confiável. Sucesso significa leitura rápida na primeira dobra de 1366×768, recomposição legível em 390×844, menos informação simultânea, detalhe sob demanda e nenhuma perda de capacidades existentes.

`VISUAL_REDESIGN_DOES_NOT_MEAN_FINANCIAL_LOGIC_REWRITE=true`. Não alterar cálculo, arredondamento, origem, cobertura, histórico, schema, persistência, importação, Firebase, wallet IDs, segurança ou lógica fiscal. Mudança semântica exige fase e aprovação separadas. A V3 rejeita neon, brilho, estética de jogo/cripto, mosaico de widgets, paredes de cards, gradientes excessivos, texto essencial minúsculo e cor decorativa sem função.

## 3. Reconciliação com a auditoria principal

`MATCH` avalia a direção aprovada e este contrato contra a auditoria, não afirma que a aplicação já foi alterada. Quando o mockup mostra uma escolha mais enxuta que a auditoria sugeriu, a decisão humana HYBRID V2 prevalece e a capacidade permanece na rota dona.

| Requisito da auditoria | HYBRID V2 e ação na spec | Match |
|---|---|---|
| KEEP Dashboard: patrimônio, resultado R$+%, renda, atualização, composição, aviso único | Três unidades de KPI, topbar com atualização, barra de alocação, prioridade opcional; evolução também permanece como visual central aprovado | true |
| KEEP Ativos: posições, busca, filtros, grupos recolhíveis e comandos operacionais distintos | Ativos é dono da lista; atualização/recalcular devem ter tratamento de ação, não de consulta | true |
| KEEP domínios: extrato, vencimentos, calendário/evolução de renda, retorno, metas e reconciliação | Rotas donas e conteúdo secundário acessível por expansão | true |
| MOVE rankings/concentração/setor/emissor → Análise | Dashboard sem ranking; Análise concentra interpretação | true |
| MOVE calendário/histórico/recebíveis → Dividendos; títulos/vencimentos → Renda fixa | Renda e vencimentos só resumidos quando tiverem função; detalhe nas páginas donas | true |
| MOVE cobertura/autoridade/frescor/evidência → Confiabilidade; distribuição completa → Ativos/Rebalancear | Dashboard conserva metadado essencial e um link de prioridade; páginas donas preservam evidência | true |
| COLLAPSE rankings, top ativos, alertas, setor/emissor, auditoria, proveniência e vencimentos além dos próximos | Síntese + “ver todos”; grupos recolhidos, com estado preservado no retorno quando seguro | true |
| REMOVE duplicação de gráfico+tabela, KPI de renda/classe/vencimento, cards vazios e ranking repetido | Uma alocação no Dashboard; cópias completas saem da primeira camada, dados e ações permanecem | true |
| P0_1 Dashboard curto | Uma dobra executiva nos artboards; implementação deve medir | true |
| P0_2 dono de KPI/bloco | Matriz da seção 7, inclusive Patrimônio e Rentabilidade distintos | true |
| P0_3 representação única da composição | Barra + legenda, sem tabela integral paralela | true |
| P0_4 título/métrica/explicação/metadado com pesos distintos | Patrimônio dominante, gráfico maior, cards não são padrão | true |
| P0_5 Confiabilidade resumida, prioritária e paginada/recolhida | Contrato da rota na seção 8 | true |
| P1_1 Dividendos: calendário/evolução/histórico | Modos distinguíveis, não três matrizes abertas | true |
| P1_2 Metas/Rebalancear: consulta, edição, simulação | Estados e etapas separados | true |
| P1_3 Rentabilidade: resultado/período/cobertura primeiro | Ordem prescrita na seção 8 | true |
| P1_4 Lançamentos: extrato inicial; visões secundárias | Extrato como primeira camada; contadores exigem validação funcional separada | true |
| P1_5 tabelas com colunas essenciais e configuração | Contrato de tabela na seção 9 | true |
| P1_6 termos técnicos e ações de atualização/importação | Linguagem de tarefa; ações distinguíveis de leitura | true |
| P1_7 estados vazios/carregando em Renda fixa, Análise, Confiabilidade | Gramática de estados da seção 9 | true |
| P2_1 espaçamento/contraste/bordas/sombras/cantos | Tokens e limites de superfície; medição futura | true |
| P2_2 número alinhado e nome longo | Contrato de tabela | true |
| P2_3 1366/768/430/390 com altura, foco, toque e overflow | Matriz de aceitação cobre os quatro e 1440/1536/1920 | true |
| P2_4 protótipo sintético e validação de hierarquia | HYBRID V2 aprovado; mockups usam dados fictícios | true |
| P2_5 densidade compacta só após padrão legível | Preferência eventual, não padrão inicial | true |
| Princípios permanentes: pergunta única, dono, detalhe sob demanda/estado, fato versus estimativa, período/base, cor + texto, rótulo, tabela essencial, nome longo, mobile próprio, vazio honesto, sem recomendação automática | Seções 4–10 detalham a regra; expansão pode preservar estado ao voltar | true |
| Investidor10: não copiar tabela total, páginas longas, resumos repetidos, filtros redundantes, sugestão de compra, métrica sem período/denominador | Proibições explícitas nas seções 4, 8, 9 e 13 | true |

## 4. VISUAL_CANON_V3 proposto

- **MUST:** uma pergunta principal por rota; período, unidade, data-base e estado junto do número quando mudam sua interpretação; tela mobile recomposta; cor semântica acompanhada por texto/sinal; foco de teclado visível; dados ausentes explicitados; capacidades existentes preservadas.
- **MUST:** `UNKNOWN != ZERO`, `NO_DATA != ZERO`, `PARTIAL != COMPLETE`, `STALE != FRESH`, `ESTIMATE != RECEIVED`, `ANNOUNCED != RECEIVED`, `PROVISIONED != RECEIVED`, `EXPECTED != RECEIVED`, `CURRENT_PRICE != HISTORICAL_PRICE`, `CURRENT_STATE != HISTORICAL_STATE`, `ENGINE_AVAILABLE != DATA_READY`.
- **MUST NOT:** duplicar resumos completos; fabricar linha entre lacunas; representar estimativa como recebido; esconder destino em ícone sem rótulo; incorporar auditoria técnica no Dashboard; usar cards para cada métrica; comprimir tabela desktop no celular; copiar identidade ou recomendação de compra de outro produto.
- **SHOULD:** usar espaço antes de superfícies; abrir detalhe sob demanda; preservar o contexto de filtro; oferecer equivalente textual ao gráfico; manter ações perigosas distinguíveis de navegação.

## 5. Dashboard: ordem, métricas e primeira dobra

Desktop: sidebar → topbar compacta → “Visão geral” → período → patrimônio → resultado R$ e % na **mesma** unidade → renda recebida → evolução → alocação → no máximo uma prioridade. “Sua carteira” pode nomear o seletor, não substituir o título da rota. Capital investido é contexto secundário do patrimônio, não um quarto card. Renda projetada é secundária, com rótulo “estimativa”; anunciado/provisionado/esperado nunca são somados ao recebido.

Cada KPI exibe rótulo, valor e unidade; período/base ou data-base; estado de disponibilidade; e contexto de fonte quando necessário à interpretação. Formatação monetária segue o contrato existente em pt-BR. A spec não fixa precisão nem recalcula valores. Se a fonte não sustentar um resultado, mostrar o estado real, sem cifra fictícia ou zero substituto.

O resultado em R$ e o retorno em % só dividem a unidade visual quando ambos descrevem **a mesma janela, base e metodologia**. Se apenas um estiver disponível, mostrar somente a medida válida e rotular a ausência da outra. Os números fictícios do artboard (inclusive R$ 82.460 e +7,1% em 12 meses) não demonstram essa consistência: a coincidência entre a diferença patrimônio menos investido e o resultado anunciado não prova retorno no período. Nenhum número do mockup pode virar fixture ou critério de cálculo.

Em 1366×768, sem rolagem, a pessoa deve responder: **quanto tenho, quanto ganhei/perdi, quanto recebi, como evoluiu, como está distribuído e se há algo que exige atenção**. A última resposta pode ser “nenhuma prioridade exibida”; não renderizar card vazio.

### Layout desktop principal

- Sidebar de referência: 200–228 px (mockup: 215 px). Topbar: 56–64 px (mockup: 60 px). Padding horizontal do conteúdo: 32–42 px (mockup: 38 px).
- Três colunas de métricas com patrimônio maior que resultado e renda; proporção aproximada 1,3:1:0,9. Resultados R$ e % não se tornam cards separados. O número patrimonial pode usar 40–48 px quando couber sem truncamento.
- Área analítica com gráfico e alocação em proporção aproximada 1,9:0,8; gráfico permanece dominante. A prioridade usa uma linha discreta abaixo. Nenhuma tabela completa na dobra.
- A largura pode crescer em 1440–1920, mas comprimento de leitura e área útil do gráfico devem ser limitados; não esticar rótulos até as bordas. Não adicionar módulos só para preencher espaço.

### Layout mobile principal

Em 390×844, compor independentemente: header → título/contexto → período → patrimônio → resultado → renda → evolução → alocação → prioridade opcional → navegação inferior. Resultado e renda podem ocupar duas colunas apenas se rótulo, valor e estado couberem sem truncar; abaixo disso empilhar. Não há tabela larga no Dashboard, card desktop encolhido ou informação essencial só em tooltip. A barra inferior respeita área segura e não encobre a prioridade.

### Outras larguras

| Largura de validação | Adaptação esperada |
|---|---|
| 430×844 | Mesma ordem de 390; usar largura extra para respiro, não outro módulo |
| 768×1024 | Sidebar vira navegação compacta rotulada ou drawer; KPI e gráfico priorizados; alocação abaixo se o par ficar estreito |
| 1366×768 | Contrato estrito da primeira dobra |
| 1440 / 1536 | Mesma hierarquia; limitar linha de leitura e preservar proporções |
| 1920 | Conteúdo com largura máxima equilibrada; evitar vazio gigante ou expansão artificial de cards |

Pontos de transição são decididos por teste de truncamento, alvo de toque e legibilidade, não por breakpoint padrão de framework.

## 6. Navegação

| Grupo desktop | Destinos |
|---|---|
| CARTEIRA | Visão geral, Ativos, Movimentações |
| RENDA & PERFORMANCE | Dividendos, Rentabilidade, Renda fixa |
| ANÁLISE | Análise, Rebalancear, Metas |
| DADOS | Confiabilidade, Importar |

Os quatro grupos acima descrevem os destinos centrais da direção aprovada, **não** o inventário completo de rotas. Patrimônio, Aportes, Relatórios, IRPF, Configurações, Auditoria e outras rotas existentes continuam descobríveis em grupo complementar ou menu “Mais” desktop, cujo inventário deve ser fechado contra a navegação real antes da implementação; nenhuma rota pode desaparecer. Grupos podem recolher somente se estado e destino ativo continuarem evidentes e teclado/leitor de tela alcançarem todos os links. Estado expandido deve ser preservado ao voltar quando isso não prejudicar a orientação. Estado ativo combina texto, fundo/forma e indicador; nunca só cor. Ícones são opcionais e nunca substituem rótulos. Itens usam no mínimo 12 px para texto; nomes longos podem quebrar linha, não truncar silenciosamente. Foco visível e ordem de tabulação seguem a leitura.

Mobile: **Resumo, Ativos, Dividendos, Renda fixa, Mais** com rótulos sempre visíveis, conforme decisão HYBRID V2. **Mais** contém Rentabilidade, Análise, Rebalancear, Metas, Confiabilidade, Importar e destinos menos frequentes que o inventário real exigir. A barra atual contém **Aportes** no lugar de Renda fixa; a migração proposta altera descobribilidade de um fluxo financeiro. Antes de implementar, validar a troca com tarefas reais sintéticas de navegação e dar a Aportes entrada rotulada e fácil de encontrar em Mais; se a tarefa falhar, devolver a decisão de posicionamento ao humano sem retirar o destino. Não eliminar Patrimônio, Relatórios, IRPF, Configurações ou detalhes existentes apenas porque não aparecem na barra principal. Cada alvo acionável mede ao menos 44×44 px; menu Mais abre por toque e teclado, gerencia foco e fechamento, e não depende de tooltip. O artboard estático não certifica dimensões dos alvos nem interação.

## 7. Propriedade das informações

| Informação | Página dona | Resumo no Dashboard | Resumo em outra página | Duplicação proibida |
|---|---|---|---|---|
| Patrimônio atual | Patrimônio | Sim, principal | Ativos: contexto de posições, sem substituir a página dona | Totais grandes repetidos em vários módulos |
| Resultado e retorno | Rentabilidade | Sim, um KPI com período | Sim, quando pertinente | R$ e % como KPIs concorrentes; retorno sem base |
| Renda recebida | Dividendos | Sim, um KPI | Sim, contextual | Recebido fundido com estimativa |
| Alocação | Ativos | Sim, barra compacta | Rebalancear: atual versus alvo | Tabela e gráfico completos juntos no Dashboard |
| Posições | Ativos | Não; link | Patrimônio por contexto | Tabela integral em Dashboard |
| Rankings e concentração | Análise | Não | Ativos se orientar comparação | Ranking integral em Dashboard |
| Vencimentos | Renda fixa | No máximo prioridade acionável | Dividendos só se contrato exigir | Lista completa em Dashboard |
| Qualidade, cobertura, origem | Confiabilidade | Um alerta acionável opcional | Metadado junto ao valor relevante | Painel técnico no Dashboard |
| Metas e alvos | Metas | Não por padrão | Rebalancear: alvo rotulado | Meta tratada como estado atual |
| Calendário e histórico de renda | Dividendos | Não; renda resumida | Renda fixa quando aplicável | Calendário integral no Dashboard |
| Movimentações | Movimentações/Aportes existentes | Não | Ativos: detalhe local | Histórico integral no Dashboard |

## 8. Direção por rota

“KEEP/MOVE/COLLAPSE/REMOVE” nesta tabela é **visual**; remover significa tirar da primeira camada, jamais excluir dado, ação ou histórico.

| Rota | Pergunta principal | Manter / primeira camada | Mover, compactar e detalhar sob demanda | Remover da primeira camada |
|---|---|---|---|---|
| Dashboard | Como está minha carteira agora? | Três métricas, evolução suportada, alocação, prioridade opcional | Links para páginas donas | Tabelas, rankings, auditoria extensa |
| Ativos | Quais posições exigem análise? | Lista de posições, busca, filtros essenciais e grupos por classe recolhíveis; atualização/recálculo visualmente distintos da consulta | Detalhe do ativo e colunas configuráveis | Resumo patrimonial integral repetido |
| Movimentações | O que aconteceu e quando? | Extrato primeiro: data, tipo, ativo, valor, origem | Filtros, agrupamentos, “Visões e relatórios” e detalhe do registro; validar contador em revisão funcional separada antes de depender dele | Resumos sem relação com o histórico filtrado |
| Renda fixa | Que posições, bases e vencimentos existem? | Posições e próximos vencimentos antes de diagnóstico; instrumento, base, data e fonte quando disponível | Histórico, indexador, modalidade, conciliação e diagnóstico recolhido/Confiabilidade | Projeção não suportada |
| Dividendos | O que recebi e o que ainda é futuro? | Próximo recebimento, renda do período, evolução suportada | Calendário, evolução e histórico em modos distinguíveis; pagadores/filtros no detalhe | Três seções extensas igualmente abertas |
| Rentabilidade | Qual foi o resultado no período? | Resultado → período → referência/base → cobertura → gráfico | Detalhe e auditoria após síntese | Código diagnóstico como manchete; benchmark sem fonte |
| Análise | O que a evidência explica? | Concentração e interpretação verificável | Rankings, setor/emissor, filtros | Score arbitrário e conselho de compra |
| Rebalancear | O que é atual e o que é cenário? | Atual, alvo e simulação rotulados separadamente | Recomendações e cálculo explicativo | Sugestão apresentada como ordem executada |
| Metas | Qual progresso é comprovado? | Alvo, atual, período e cobertura | Edição e histórico em estados próprios | Conclusão inventada ou meta como posição |
| Confiabilidade | O que falta, está obsoleto ou diverge? | Síntese de estado e problemas prioritários | Grupos paginados/recolhíveis, proveniência, evidência técnica | Lista infinita aberta e telemetria acima da decisão |
| Importar | O que foi selecionado, revisado e confirmado? | Etapa atual, prévia, conflito e confirmação | Parser/proveniência técnica recolhidos | Aparência de sucesso antes de gravação confirmada |

Confiabilidade preserva a trilha de auditoria: síntese no topo, problemas acionáveis a seguir, filtros e grupos finitos; evidência técnica acessível por expansão sem dominar visualmente a rota. Dividendos distingue **Calendário**, **Evolução** e **Histórico** por abas/seções com período; o primeiro foco é renda recebida no período e próximo evento, conforme a auditoria direta, não três matrizes simultâneas. Metas/Rebalancear exibem estados **CURRENT**, **EDITING**, **SIMULATION**, **TARGET** e **SCENARIO** com rótulo e tratamento visual próprios. Importar mantém `selection != write`, `preview != confirm` e confirmação antes de writer; a especificação não altera a autoridade do fluxo.

## 9. Sistema de apresentação

### Tokens iniciais, sujeitos a contraste no produto

| Papel | Valor de referência | Regra |
|---|---|---|
| Canvas | `#0B1019` | Fundo calmo escuro; respeitar tema claro já existente |
| Superfície / elevada | `#111925` / `#172231` | Uso excepcional, com baixa diferença tonal |
| Texto principal | `#EFF4FC` | Valores, títulos e ações |
| Texto secundário | `#9AA9BC` | Contexto legível |
| Metadado | `#8998AB` | Mais claro que o V1 `#728197` quando carregue informação essencial |
| Azul / índigo | `#7898FF` / `#5275E8` | Estrutura, foco, seleção |
| Positivo / negativo | `#6BC7A4` / `#E47D83` | Semântica real, com sinal e texto |
| Atenção / estimativa | `#E1B86E` | Estado rotulado; estimativa não é recebimento |

Esses valores são ponto de partida. A implementação deve mapear aliases existentes do tema escuro **e claro** e medir contraste nas superfícies reais, especialmente texto secundário, âmbar, foco e legenda. Classe de ativo pode usar variações tonais de uma família para distinguir segmentos; `ASSET_CLASS_COLOR_IS_NOT_PERMANENT_FINANCIAL_SEMANTIC=true`. Cor nunca é a única diferença de estado.

Controle numérico desta proposta, apenas sobre o canvas `#0B1019`: texto principal `17,25:1`, secundário `7,96:1`, metadado `6,48:1`, azul `7,02:1`, índigo `4,60:1`, verde `9,37:1`, âmbar `10,23:1`, vermelho `6,86:1` (razão WCAG calculada dos hexadecimais). Isso não valida superfícies elevadas, tema claro, estados de foco nem o CSS real.

### Tipografia e espaçamento

Fonte de interface: pilha nativa Segoe UI Variable/Aptos/Segoe UI, sem nova dependência. Hierarquia de referência: título da página 24–26 px desktop e 20–22 px mobile; patrimônio 40–48 px desktop e 34–40 px mobile; valor secundário 19–27 px; título de seção 15–17 px; corpo 14–16 px; contexto financeiro essencial **mínimo 12 px** em ambos os alvos; metadado auxiliar mínimo 11 px, nunca suporte único para período/base/estado. Peso 650–700 em títulos/valores; 400–500 em corpo; entrelinha 1,35–1,5 para leitura. Números comparáveis usam algarismos tabulares e alinhamento numérico consistente. Tracking negativo leve apenas em valores grandes, sem compactar dígitos essenciais.

Ritmo base 4 px: incrementos 4/8/12/16/24/32. Página desktop 32–42 px; mobile 18–22 px. Entre seções 16–24 px mobile e 20–32 px desktop. Linhas de navegação e alvos preservam 44 px de interação mesmo quando texto/ícone é menor. Tabelas usam densidade confortável definida pela legibilidade de coluna e toque, não pela meta de “caber tudo”. `SPACE_BEFORE_CARD`: alinhar, separar e tipografar antes de criar painel. Card só é justificado para ação/estado independente, modal ou bloco que precise de limite visual próprio. Dashboard: desktop ≤1 card e ≤2 superfícies maiores; mobile ≤1 card. Barra lateral/inferior conta como superfície estrutural.

### Gráficos, alocação e prioridade

Gráfico apresenta período, unidade, base/referência e estado. Lacuna histórica é interrupção **sem linha interpolada**; zero só representa zero conhecido. Cotação atual não preenche preço histórico. Eixo/legenda mantêm contraste; mobile reduz ticks, não esconde período/unidade. Série comparativa de capital investido aparece apenas se existir e for útil. Há equivalente textual acessível com período, tendência e lacunas; tooltip não carrega informação essencial sozinho. Sem 3D ou legenda ornamental.

Dashboard apresenta apenas uma alocação: barra empilhada com percentuais escritos e link ao detalhe. No mobile, a legenda é uma **lista resumida ordenada e tocável**; cada classe abre seu detalhe, sem depender da cor. O artboard atual demonstra a ordem e os rótulos, mas não prova a interação: ela é requisito da implementação. Não repetir o total patrimonial dentro dela, nem combinar donut com tabela completa. Categoria desconhecida/sem classificação aparece explicitamente, sem forçar soma artificial a 100%. A prioridade é específica, acionável e mostra **motivo, impacto sobre a leitura/dados e destino**; máximo uma. Sem problema acionável, não há placeholder. INFO é neutro, WARNING usa âmbar rotulado, ERROR usa vermelho rotulado sem dominar toda a tela.

### Estados e tabelas

EMPTY = conjunto verdadeiramente vazio, com motivo/ação quando pertinente; NO_DATA = dado indisponível, nunca “R$ 0”; LOADING = pendente sem conteúdo fictício; UNKNOWN = evidência insuficiente; PARTIAL = conhecido apenas em parte, com cobertura visível; STALE = data defasada identificada; ERROR = falha com consequência e recuperação. Fonte-as-of e financial-as-of são campos distintos quando ambos existem. Não atribuir número ou completude por aparência.

Tabelas das páginas donas começam com identidade (ticker/nome), campos essenciais e números alinhados à direita com tabular; nomes longos quebram ou revelam detalhe sem apagar identidade. Colunas adicionais são configuráveis/reveladas sob demanda; filtros ativos e resultado filtrado permanecem legíveis. Sticky header/identidade só quando a rolagem for longa e testada, sem sobreposição. Em mobile, transformar linha em resumo rotulado + expansão; rolagem horizontal interna é último recurso explícito, com affordance, nunca corte silencioso nem overflow da página. Não imitar a densidade integral do Investidor10.

## 10. Acessibilidade, privacidade e movimento

Contraste de texto e componentes deve atingir WCAG AA nas superfícies reais; foco visível não depende apenas de cor. Controle, linha expansível e navegação funcionam por teclado; seleção/erro/estado usam texto além de cor. Área acionável mínima de 44×44 px, ordem de leitura e de leitor de tela segue hierarquia visual, modais/drawers gerenciam foco. Gráficos têm descrição/equivalente textual. Movimento curto e funcional; respeitar `prefers-reduced-motion`; sem animação contínua decorativa nem biblioteca pesada sem necessidade.

Controle de ocultar valores cobre KPIs, tooltips, gráfico, acessibilidade exposta e snapshots pertinentes; não basta mascarar texto visível. Capturas, fixtures e revisão visual usam dados sintéticos; nunca dados pessoais reais. O protótipo existente é fictício e não prova cálculo, fonte, cobertura nem estado financeiro da aplicação.

## 11. Plano de migração futuro (não autorizado por esta spec)

A: shell, navegação e tokens; B: Dashboard; C: Ativos e Análise; D: Dividendos, Rentabilidade e Renda fixa; E: Metas, Rebalancear e Importar; F: Confiabilidade. Uma implementação posterior pode ajustar sequência por dependências de código, desde que cada fase seja pequena, testável e preserve rotas/capacidades. Esta seção não inicia nenhuma fase.

## 12. Matriz de aceitação para plano futuro

| ID | Requisito | Fonte disponível | Como verificar | Prioridade | Falha típica |
|---|---|---|---|---|---|
| V3-01 | Uma pergunta principal e dono por rota | V2 / decisão HYBRID | Revisão de mapa e telas | P0 | Resumo integral repetido |
| V3-02 | Primeira dobra responde seis perguntas em 1366×768 | Decisão HYBRID | Browser 1366×768 sem rolagem necessária | P0 | Prioridade/composição fora da dobra |
| V3-03 | Patrimônio dominante com data-base/investido distintos | Decisão HYBRID / contrato financeiro | Screenshot + leitura de dados sintéticos | P0 | Custo confundido com patrimônio |
| V3-04 | Resultado R$ + % como unidade e período explícito, só quando base/metodologia coincidem | Decisão HYBRID / contratos de rentabilidade | Inspeção DOM/visual **e** fixture sintética rastreada à fonte/cálculo: ambos compatíveis, só R$ disponível, só % disponível, nenhum disponível | P0 | KPIs concorrentes; par de períodos/bases distintos apresentado como comparável |
| V3-05 | Recebido distinto de projetado/anunciado | AGENTS / V2 | Estados sintéticos + acessibilidade | P0 | Estimativa parecer recebida |
| V3-06 | Série ausente não é interpolada nem zero | V2 / verdade financeira | Fixture com lacuna | P0 | Linha contínua falsa |
| V3-07 | Alocação única com porcentagens e base | Decisão HYBRID / auditoria | DOM/screenshot, leitura textual e acionamento por teclado/toque da lista mobile ordenada | P0 | Donut + tabela duplicados; legenda mobile sem destino |
| V3-08 | No máximo uma prioridade acionável | Decisão HYBRID / auditoria | Estados com 0, 1 e várias questões; em cada alerta, verificar motivo, impacto e destino | P0 | Alerta vazio, mural de avisos ou consequência oculta |
| V3-09 | Mobile 390×844 recomposto, sem tabela larga | Decisão HYBRID | Browser 390, leitura/scroll e targets | P0 | Desktop comprimido |
| V3-10 | Navegação rotulada e destinos preservados | V2 / AGENTS | Teclado, leitor de tela, menu Mais | P0 | Rota escondida/ícone único |
| V3-11 | EMPTY/NO_DATA/UNKNOWN/PARTIAL/STALE/ERROR distintos | V2 | Matriz de fixtures de estados | P0 | Ausência renderizada zero |
| V3-12 | Tema escuro e claro com contraste adequado | DESIGN.md / V2 | Medição WCAG AA nas superfícies | P0 | Metadado ilegível |
| V3-13 | Foco, ordem e toque ≥44×44 | V2 / WCAG | Teclado e retângulos runtime | P0 | Controle visualmente presente, inalcançável |
| V3-14 | Sem overflow/clipping/erros nos sete alvos | AGENTS / V2 | Browser 390/430/768/1366/1440/1536/1920 | P0 | Corte interno não captado por scrollWidth |
| V3-15 | Tabela de Ativos com colunas essenciais e mobile rotulado | V2 / pesquisa | Tabela real, nomes longos, estados | P1 | Todas as colunas à força |
| V3-16 | Confiabilidade agrupada sem perda de auditoria | V2 / decisão | Dados sintéticos volumosos, expansão | P1 | Lista infinita ou evidência perdida |
| V3-17 | Dividendos distingue calendário/evolução/histórico | Pesquisa / decisão | Alternância e estados de renda | P1 | Estados pagos/futuros fundidos |
| V3-18 | Metas e Rebalancear separam atual/simulado/alvo | V2 / AGENTS | Cenários sintéticos rotulados | P0 | Simulação parecer operação |
| V3-19 | Importar preserva preview/confirm/write | AGENTS / pesquisa | Testes de cancelamento e confirmação | P0 | Seleção parecer gravação |
| V3-20 | Privacidade não vaza em tooltip/gráfico/captura | AGENTS / V2 | Modo oculto e inspeção de superfícies | P0 | Número oculto só no KPI |
| V3-21 | Conteúdo-chave não depende de 9–10 px | Decisão HYBRID / V2 | Medir texto renderizado em 390/1366 | P0 | Data-base ilegível |
| V3-22 | Referência Investidor10 não é copiada | Pesquisa | Revisão de marca, tabela e recomendações | P1 | Identidade/padrão de compra alheio |

No browser futuro, para cada largura: `overflow=0`, `critical_clipping=0`, `page_errors=0`, `console_errors=0`, `unreadable_labels=0`, `overlapping_controls=0`. Testes sintéticos não certificam dados reais. Comparar capturas e DOM, não apenas largura da página.

## 13. Fora de escopo e gate de publicação

Fora de escopo: engine financeira, novos providers/fontes, novo motor fiscal, cálculo de carteira, recomendação, dependência paga, criação ampla de funcionalidades, rebranding/logotipo e migração do frontend moderno. Nenhum código de produto, CSS/JS de produto, regra Firebase ou deploy integra este documento.

Para promover esta proposta a cânone: auditoria primária e benchmark lidos; matriz KEEP/MOVE/COLLAPSE/REMOVE, P0/P1/P2 e princípios reconciliada; corrigir conflitos; medir contraste de tokens em superfícies reais antes da implementação; revisão independente sem BLOCKER/MAJOR; aprovação humana. O commit documental registra a proposta revisada, mas não altera automaticamente `docs/ai/VISUAL_CANON_V2.md`, `DESIGN.md` ou código de produto.
