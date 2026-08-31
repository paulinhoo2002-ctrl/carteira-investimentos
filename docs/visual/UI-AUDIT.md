# UI Audit — Matriz de Telas

> Auditoria visual do produto Carteira de Investimentos.
> Base: branch main, SHA `4efc66a`.

## Resumo Executivo

- **Total de telas/areas**: 14 areas funcionais
- **Arquivo principal**: `index.html` (~29.500 linhas)
- **Design System**: CSS custom properties (16 tokens base + 10 premium)
- **Tema**: Dark-first com suporte a light
- **Navegacao**: Sidebar desktop (>=1181px), bottom nav mobile (<=640px)
- **Fonte**: Sistema (-apple-system, BlinkMacSystemFont, Segoe UI)

---

## Matriz de Telas

### 1. Dashboard

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| KPIs principais | 6 metricas em grid, premium-metric com glow | 3-5 KPIs essenciais com hierarquia clara | KPIs podem ter glow excessivo | Simplificar glow, priorizar dados de maior impacto | Alta |
| Priority Review | Max 3 insights com severity | Painel executivo com acoes | Bem alinhado | Refinar visual e contraste | Media |
| Composicao por classe | 2 colunas, distribuicao | Pizza/barras + texto | Graficos podem ser mais expressivos | Melhorar data viz | Media |
| Destaques | Abas altas/baixas | Rankings compactos | OK | Polir spacing | Baixa |
| Renda passiva | KPI presente | Destaque maior | Pode ter mais contexto | Elevacao visual | Media |
| Evolucao patrimonial | Nao disponivel (sem historico) | Grafico temporal | Dados indisponiveis | Adiar ate snapshots | Baixa |
| Responsividade | Grid responsivo | Fluid em todos viewports | 768px pode ter issues | Validar | Alta |

**Acoes prioritarias Dashboard:**
1. Remover excesso de glow em premium-metric
2. Consolidar KPIs: Patrimonio, Investido, Resultado, Rentabilidade, Renda
3. Melhorar contraste dos labels secundarios
4. Validar overflow em 768px

---

### 2. Ativos / Posicoes

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Tabela desktop | Tabela com colunas: classe, ticker, qtd, preco medio, custo, valor atual, resultado, %, participacao | Tabela financeira de alta qualidade (Investidor10-ref) | Pode ser mais densa | Compactar linhas, melhorar alinhamento | Alta |
| Cards mobile | Cards com informacoes compactas | Representacao adequada ao espaco | Pode ter overflow em dados longos | Revisar card layout | Alta |
| KPIs | 4 KPIs: total, investido, resultado, n ativos | KPIs com hierarquia clara | OK | Refinar | Media |
| Filtros | Filtros por classe | Filtros rapidos e acessiveis | OK | Melhorar UX dos filtros | Baixa |
| Ordenacao | Setas de ordenacao | Click header para ordenar | OK | Manter | Baixa |
| RF sub-aba | Tabela RF com eventos | Visao consolidada RF | Complexa | Simplificar | Media |
| Destaques | Ranking melhores/piores | Highlights visuais | OK | Manter | Baixa |
| Distribuicao | Barras de distribuicao por classe | Visual clara | OK | Refinar | Baixa |

**Acoes prioritarias Ativos:**
1. Tabela desktop: alinhar numeros a direita, tabular-nums
2. Mobile: card layout robusto para dados longos
3. RF sub-aba: simplificar colunas visiveis

---

### 3. Renda Fixa

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| KPIs | 5 KPIs: total, liquido, bruto, juros, vencimento | Dashboard de RF com visao executiva | OK | Refinar | Media |
| Tabela | rf-table com min-width 1120px | Tabela densa e clara | Min-width pode causar overflow | Reduzir colunas essenciais | Alta |
| Eventos | Lista de eventos RF | Timeline de eventos | OK | Manter | Baixa |
| Resumo | Resumo de posicao RF | Visao consolidada | OK | Refinar visual | Baixa |
| Spotlights | Alertas de vencimento | Acoes importantes | OK | Manter | Baixa |
| Proventos RF | KPIs de proventos RF | Integrado a renda passiva | Pode ter mais contexto | Conectar com dividendos | Media |

**Acoes prioritarias Renda Fixa:**
1. Reduzir min-width da tabela (1120px e excessivo)
2. Melhorar mobile: colapsar colunas menos essenciais
3. Unificar KPIs de proventos RF com visao de renda passiva

---

### 4. Dividendos / Proventos

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| KPIs principais | Resumo com recebido ano, media mensal | Dashboard executivo de dividendos | OK | Elevacao visual dos KPIs principais | Alta |
| Historico mensal | Lista + matriz anual | Historico profundo com comparacao | OK | Refinar matriz visual | Media |
| Evolucao | Grafico de evolucao | Evolucao temporal clara | OK | Manter | Baixa |
| Principais pagadores | Lista de maiores pagadores | Ranking visual | OK | Refinar | Baixa |
| Proximos recebimentos | Secao de proximos | Projeccao visivel | OK | Manter | Baixa |
| Matriz anual | Matriz Jan-Dez com media/total | Matriz densa e clara | Pode ser mais compacta | Refinar espacamento | Media |
| Distribuicao | Panel com distribuicao mensal | Visual de distribuicao | OK | Manter | Baixa |
| Filtros | Filtros por periodo | Rapidos e acessiveis | OK | Manter | Baixa |

**Acoes prioritarias Dividendos:**
1. KPIs principais: elevar hierarquia com icones + cores semanticas
2. Matriz anual: reduzir espacamento entre celulas
3. Historico: padronizar com design system premium

---

### 5. Rentabilidade

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| KPIs | Analise com abas por periodo | Carteira vs benchmarks (CDI, IPCA) | OK | Refinar | Alta |
| Comparacao | CDI e IPCA como benchmarks | Benchmarks reais suportados pelo sistema | OK | Manter | Baixa |
| Periodos | Mes, ano, 12m, acumulado, inicio | Diferenciacao clara por periodo | OK | Melhorar hierarquia visual dos periodos | Media |
| Graficos | Possivelmente presentes | Evolucao temporal da rentabilidade | Pode nao existir | Verificar disponibilidade de dados | Media |
| Contexto textual | Analise textual | Contexto so quando matematicamente suportado | OK | Manter | Baixa |

**Acoes prioritarias Rentabilidade:**
1. Assegurar que benchmarks sao os realmente suportados
2. Diferenciar visualmente cada periodo
3. Evitar "matematica paralela"

---

### 6. Patrimonio

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Valor atual | Disponivel via S | Patrimonio atual em destaque | OK | Manter | Baixa |
| Evolucao | Depende de snapshots historicos | Grafico temporal | Dados podem ser limitados | Verificar | Alta |
| Aportes | Historico de aportes | Crescimento por aporte | OK | Manter | Baixa |
| Composicao | Distribuicao por classe | Composicao visual | OK | Refinar | Media |
| Max historico | Nao disponivel sem snapshots | Max historico | Dados indisponiveis | Adiar | Baixa |

**Acoes prioritarias Patrimonio:**
1. Verificar dados disponiveis para evolucao
2. Separar visualmente aporte vs rentabilidade
3. Composicao por classe:饼图 ou barras empilhadas

---

### 7. Aportes

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Lista | Historico de aportes | Extrato claro | OK | Manter | Baixa |
| Resumo | KPIs de aportes | Resumo executivo | OK | Refinar | Media |
| Sugestao | PrudentContributionAnalysis | Sugestao explicavel | OK | Manter | Baixa |
| Filtros | Filtros por periodo | Rapidos | OK | Manter | Baixa |

---

### 8. Metas

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Lista | Metas financeiras | Progresso visual | OK | Refinar | Media |
| Progresso | Barras de progresso | Progresso expressivo | OK | Manter | Baixa |
| Criacao | Modal de criacao | Formulario claro | OK | Manter | Baixa |

---

### 9. Rebalanceamento

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Estudo | Analise de rebalanceamento | Estudo visual | OK | Manter | Baixa |
| Alocacao | Distribuicao atual vs objetivo | Visual de desvio | OK | Refinar | Media |
| Sugestao | Sugestoes de rebalanceamento | Acoes claras | OK | Manter | Baixa |

---

### 10. Relatorios

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| KPIs | 5 KPIs de relatorio | Visao executiva | OK | Refinar | Media |
| Exportacao | Cards de exportacao PDF | Exportacao acessivel | OK | Manter | Baixa |
| Detalhes | Secoes expandiveis | Detalhes organizados | OK | Manter | Baixa |

---

### 11. IRPF

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Calculo | Calculo de imposto | Visao clara de IR | OK | Manter | Baixa |
| Ano | Selecao de ano | Navegacao por ano | OK | Manter | Baixa |

---

### 12. Auditoria

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Qualidade | Auditoria de dados | Status de qualidade | OK | Manter | Baixa |
| Problemas | Lista de problemas | Acoes corretivas | OK | Manter | Baixa |

---

### 13. IA / Analise

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Modos | Modos de analise | Modos organizados | OK | Manter | Baixa |
| Concentracao | Analise de concentracao | Visual de concentracao | OK | Refinar | Media |
| Insights | Priority review | Insights acionaveis | OK | Refinar visual | Media |

---

### 14. Configuracoes

| Aspecto | Estado Atual | North Star | Lacunas | Melhorias | Prioridade |
|---------|-------------|-----------|---------|-----------|-----------|
| Layout | Grid 2 colunas | Configuracoes organizadas | OK | Manter | Baixa |
| Tema | Toggle dark/light | Toggle acessivel | OK | Manter | Baixa |
| Carteira | Gerenciamento de carteiras | Selecao clara | OK | Manter | Baixa |

---

## Padroes de Design System Detectados

### Tokens Existentes (16 base + 10 premium)

**Base**: --bg, --text, --muted, --panel, --panel-2, --card, --surface, --surface-2, --border, --primary, --success, --danger, --warning, --shadow, --scroll-track, --scroll-thumb

**Premium**: --pd-radius-sm/md/lg, --pd-sp-1/2/3/4/5, --pd-green/blue/purple/orange/yellow/red, --pd-shadow-card

**Safe area**: --safe-top/right/bottom/left

### Lacunas do Design System

1. **Sem token de elevacao** -- pd-shadow-card existe mas nao ha escala formal
2. **Sem token de tipografia** -- font sizes hardcoded em ~50+ valores
3. **Sem token de espacamento global** -- pd-sp existe mas nao e amplamente usado
4. **Inconsistencia de border-radius** -- 9-18px sem escala formal
5. **Sem token de contraste** -- cores de texto sao hardcoded
6. **Inconsistencia de font-weight** -- 400-900 sem semantica clara

### Oportunidades de Melhoria

1. Consolidar tokens de espacamento (usar --pd-sp-* como base)
2. Criar tokens de tipografia (label, body, h4, h3, h2, h1, display)
3. Padronizar border-radius (sm: 8px, md: 12px, lg: 16px)
4. Criar tokens de elevacao (shadow-sm, shadow-md, shadow-lg)
5. Consolidar font-weights semanticos (regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800)

---

## Quebra de Viewports

| Viewport | Status | Issues Conhecidos |
|----------|--------|-------------------|
| 390x844 | Funcional | Titulos podem truncar |
| 430x932 | Funcional | Sem problemas criticos |
| 768x1024 | Funcional com ressalvas | Risco de overflow em tabelas |
| 1366x768 | Funcional | Sidebar 200px, conteudo ok |
| 1920x1080 | Funcional | Sidebar 216px, conteudo ok |

---

*Auditoria criada: 2026-08-26*
*Base: main, SHA 4efc66a*
