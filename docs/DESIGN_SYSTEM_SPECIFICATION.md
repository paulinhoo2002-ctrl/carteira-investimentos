# Design System Specification

## Principios

- um sistema unico de tokens para todo o produto
- compatibilidade com legado sem migracao brusca
- leitura rapida primeiro, ornamentacao depois
- uma hierarquia visual por tela
- acessibilidade e contraste como regra
- responsividade estrutural, nao improvisada
- densidade ajustada ao contexto, nao por excecao local

## Inventario visual atual

### Cores

- fundo escuro dominante com variacoes entre azul-marinho e grafite
- tema claro ja existente com superficie branca e azuis suaves
- cores semanticas ja usadas: sucesso, alerta, erro, info, primario
- muitos hardcodes espalhados no `index.html`, principalmente em telas legadas

### Tipografia

- familia unica sans-serif de sistema e Inter
- escala ampla, de 7px a 52px
- titulos e valores em pesos altos
- subtitulos e labels em pesos leves

### Espacamento

- escala recorrente entre 4px e 64px
- uso pesado de 8px, 12px, 16px, 20px e 24px
- varios paddings e gaps locais repetidos por tela

### Radius

- variacao entre 10px, 12px, 14px, 16px, 18px, 999px e 50%
- pills e botoes seguem linguagem consistente
- cards ainda variam mais do que o necessario

### Sombras

- sombra unica suave no baseline
- varias excecoes por componente e tela
- mistura de borda + sombra em alguns pontos e apenas superficie em outros

### Bordas

- borda base fria e azulada
- uso de `1px` como padrao
- alguns blocos usam borda leve, outros reforcada e outros nenhuma

### Componentes

- botoes
- cards
- inputs
- selects
- tabs
- badges
- tabelas
- modais
- toasts
- pills / chips
- progress bars

## Problemas encontrados

| Item | Gravidade | Solucao |
|---|---:|---|
| Paleta com muitos hardcodes | P0 | Centralizar tokens semanticos e preservar aliases legados |
| Escala de radius inconsistente | P1 | Fechar escala curta e oficial |
| Espacamento local demais | P1 | Adotar escala unica para gap e padding |
| Componentes repetidos com nomes diferentes | P1 | Criar vocabulario oficial de componentes |
| Borda + sombra sem regra unica | P2 | Definir elevacao por nivel |
| Estados visuais variando por tela | P2 | Padronizar estados obrigatorios |
| CSS morto aparente e duplicacao alta | P1 | Limpeza gradual depois dos tokens |

## Tokens oficiais

### Cores

| Token | Valor | Uso |
|---|---|---|
| `--color-bg-canvas` | `#08111d` | fundo global |
| `--color-bg-surface` | `#101a2b` | superficie base |
| `--color-bg-surface-2` | `#0d1625` | superficie secundario |
| `--color-bg-panel` | `#121d2f` | cards e paineis |
| `--color-bg-panel-2` | `#0f1a2c` | subpaineis |
| `--color-border-default` | `#26344b` | borda base |
| `--color-border-soft` | `rgba(148, 163, 184, 0.12)` | borda discreta |
| `--color-text-primary` | `#edf3ff` | texto principal |
| `--color-text-secondary` | `#a8bbd4` | texto secundario |
| `--color-text-tertiary` | `#7f93af` | texto fraco |
| `--color-accent-primary` | `#4f46e5` | acao primaria |
| `--color-accent-success` | `#34d399` | sucesso/ganho |
| `--color-accent-warning` | `#fbbf24` | alerta |
| `--color-accent-danger` | `#f87171` | erro/perda |
| `--color-accent-info` | `#60a5fa` | informacao |

### Tipografia

| Token | Valor | Uso |
|---|---|---|
| `--font-family-base` | `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | familia base |
| `--font-size-xs` | `12px` | labels e metadados |
| `--font-size-sm` | `13px` | corpo compacto |
| `--font-size-md` | `14px` | corpo padrao |
| `--font-size-lg` | `16px` | titulos de bloco |
| `--font-size-xl` | `20px` | titulos de secao |
| `--font-size-display` | `34px` | numero principal |
| `--font-weight-regular` | `400` | texto |
| `--font-weight-medium` | `500` | label |
| `--font-weight-semibold` | `600` | destaque medio |
| `--font-weight-bold` | `700` | valor principal |
| `--line-height-tight` | `1.1` | display e hero |
| `--line-height-heading` | `1.2` | titulos |
| `--line-height-body` | `1.5` | leitura comum |
| `--line-height-relaxed` | `1.65` | texto longo |

### Espacamento

| Token | Valor |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-7` | `32px` |
| `--space-8` | `40px` |
| `--space-9` | `48px` |
| `--space-10` | `64px` |

### Radius

| Token | Valor |
|---|---|
| `--radius-xs` | `10px` |
| `--radius-sm` | `12px` |
| `--radius-md` | `14px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `24px` |
| `--radius-pill` | `999px` |

### Sombras

| Token | Valor |
|---|---|
| `--shadow-1` | `0 4px 12px rgba(0, 0, 0, 0.12)` |
| `--shadow-2` | `0 10px 24px rgba(0, 0, 0, 0.18)` |
| `--shadow-3` | `0 18px 50px rgba(0, 0, 0, 0.28)` |

### Bordas

| Token | Valor |
|---|---|
| `--border-width-1` | `1px` |
| `--border-width-2` | `2px` |

### Motion

| Token | Valor |
|---|---|
| `--motion-duration-fast` | `120ms` |
| `--motion-duration-base` | `180ms` |
| `--motion-duration-slow` | `240ms` |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

### Z-index

| Token | Valor |
|---|---|
| `--z-content` | `0` |
| `--z-sticky` | `20` |
| `--z-dropdown` | `100` |
| `--z-overlay` | `200` |
| `--z-modal` | `300` |
| `--z-toast` | `400` |

### Breakpoints conceituais

| Token | Valor | Uso |
|---|---|---|
| `--breakpoint-sm` | `390px` | mobile |
| `--breakpoint-md` | `768px` | tablet |
| `--breakpoint-lg` | `1366px` | desktop base |
| `--breakpoint-xl` | `1920px` | desktop amplo |

## Convencao de nomes

- tokens semanticos usam prefixo `--color-`, `--font-`, `--space-`, `--radius-`, `--shadow-`, `--border-`, `--motion-`, `--z-`, `--breakpoint-`
- nomes legados continuam disponiveis como aliases
- novos nomes devem ser semanticos, nao descritivos de implementacao

## Aliases de compatibilidade

| Alias | Mapeamento |
|---|---|
| `--bg` | `--color-bg-canvas` |
| `--panel` | `--color-bg-panel` |
| `--surface` | `--color-bg-surface` |
| `--border` | `--color-border-default` |
| `--text` | `--color-text-primary` |
| `--muted` | `--color-text-secondary` |
| `--primary` | `--color-accent-primary` |
| `--success` | `--color-accent-success` |
| `--warning` | `--color-accent-warning` |
| `--danger` | `--color-accent-danger` |

## Componentes planejados

- Button
- Card
- Input
- Select
- Badge
- Tabs
- Table
- Modal
- Toast
- Empty State
- Skeleton

## Estados obrigatorios

- default
- hover
- focus
- active
- disabled
- loading
- error

## Acessibilidade

- foco visivel padrao em toda acao interativa
- nenhum outline removido sem substituicao clara
- contraste preservado em texto, borda e estado
- animacoes respeitam prefers-reduced-motion
- estado nao deve depender somente de cor

## Governanca

- tokens novos entram primeiro na documentacao
- aliases legados permanecem ativos enquanto houver consumo
- qualquer excecao deve ser pequena, justificada e reversivel
- migracao ampla de componente continua proibida nesta sprint
- a documentacao define a referencia; a implementacao segue de forma gradual

## Regras de uso

1. Um protagonista visual por tela.
2. Uma acao primaria por fluxo.
3. Cards so quando realmente ajudam leitura.
4. Espaco antes de borda.
5. Escala unica de espacamento.
6. Tipografia unica sem mistura sem necessidade.
7. Sem borda decorativa forte em card.
8. Estados obrigatorios: default, hover, focus, active, disabled, loading, error.
9. Acessibilidade e contraste nao negociaveis.
10. Mobile projetado, nao so adaptado.
11. Legado preservado ate cobertura nova existir.
12. Migracao gradual, uma fase por vez.

## Estrategia de migracao gradual

- documentar tokens antes de trocar componentes
- aplicar aliases para manter compatibilidade
- adotar uma superficie por vez
- evitar migracao ampla de CSS em lote
- medir impacto visual antes de prosseguir

## Politica para excecoes

- nenhuma excecao sem justificativa registrada
- excecoes devem ser pontuais e reversiveis
- se um caso especial virar padrao, ele vira token ou componente

## Roadmap das sprints 3.1 a 3.5

### Sprint 3.1 - Design Tokens

- oficializar tokens e aliases
- documentar base visual
- manter compatibilidade com o legado

### Sprint 3.2 - Component Library

- Button
- Card
- Input
- Select
- Badge
- Tabs
- Table
- Modal
- Toast

### Sprint 3.3 - Layout System

- grid
- espaçamento
- limites de largura
- comportamento responsivo

### Sprint 3.4 - UX Rules

- densidade
- hierarquia
- acessibilidade
- contraste

### Sprint 3.5 - Migracao gradual das telas

- migrar por superficie
- validar cada etapa
- evitar quebra de legado

## Notas sobre breakpoints

Os breakpoints abaixo sao referencia documental:

- `--breakpoint-sm` = `390px`
- `--breakpoint-md` = `768px`
- `--breakpoint-lg` = `1366px`
- `--breakpoint-xl` = `1920px`

Eles nao substituem media queries tradicionais com valores literais na camada CSS atual.
