# Design system "Fintech Premium" (FP) — V15

Fonte única: bloco `<style id="fp-design-system">` no fim de `index.html` (último `<style>`, ganha a cascata
sem `!important`). Direção visual: sóbria, hierarquia forte, superfícies sólidas, sombra mínima, cor financeira
apenas para significado. Substitui os ajustes visuais soltos anteriores. Não contém lógica financeira.

## Tokens (`--fp-*`), nos dois temas

- Superfícies: `canvas`, `sidebar`, `surface`, `raised`, `subtle`; bordas `border`, `border-strong`.
- Texto: `text`, `text-2`, `text-3` (contraste verificado com Axe nos dois temas).
- Ação: `accent`, `accent-text`, `accent-soft`, `on-accent`.
- Estados financeiros: `pos`, `neg`, `warn`, `info`, `neutral` (+ `-soft`). Positivo verde, negativo vermelho,
  zero e indisponível **neutros com texto**; nunca só cor.
- Série de gráficos: `c1…c6` (não reutiliza verde/vermelho semânticos).
- Escala: espaço `s1…s7` (4/8/12/16/20/24/32), `--fp-gap`/`--fp-pad` fluidos via `clamp`, raios `sm/md/lg/pill`,
  tipografia `meta 12 · ui 13 · body 14 · h3 16 · h2 18 · h1 clamp(24–30) · kpi clamp(24–32) · hero clamp(30–44)`.
- Controle mínimo `--fp-control: 44px`; foco `--fp-focus` (anel de 2px + 2px).
- **Aliases legados** (`--bg`, `--panel`, `--text`, `--border`, `--success`, `--danger`, `--canon-*`,
  `--semantic-*`…) apontam para os tokens FP. Assim as telas antigas herdam a identidade sem reescrita.

## Componentes

`fp-card`, `fp-section-head/title/sub`, `fp-badge[data-tone]`, `fp-segmented` (botões com `aria-pressed`),
`fp-empty`, `fp-link`, `fp-page/head/actions/updated`, `fp-performance` (painel de rentabilidade),
`fp-alloc-body`, `fp-disclosure`, `fp-highlights`, `fp-bars` + `fp-bar[data-state]` + `fp-legend` (gráfico de barras
com tooltip por `data-tip` e tabela equivalente `fp-sr-only`), `fp-payers` (ranking), `fp-kpi-strip`.
Ícones: `fpIcon(nome)` (SVG inline, `aria-hidden`), `fpNavLabel` para menus. Valores continuam passando por
`fmt`/`fmtN`/`fmtP`, portanto a privacidade global se aplica a todos os componentes.

## Política de CSS

1. Nada de `!important` novo. Conflito com regra antiga: aumentar especificidade (`html body …`) ou **remover** a
   regra antiga, quando o componente foi substituído (foram removidas 28 + 4 + 1 declarações `!important` legadas).
2. Funções de render testadas por extração (`vm`) não podem depender de helpers novos: manter o markup inline
   nelas (ex.: seletor de período dentro de `dashboardEvolutionPanel`).
3. Rótulos de navegação mantêm o texto como nó direto do botão (seletores `:text()` e nome acessível estáveis).
4. Toda cor financeira passa por `--fp-pos/--fp-neg/--fp-neutral`; hex novo só em tokens.

## Estado da consolidação

`!important`: 1174 → 1137 (−37 líquido, apenas onde o componente foi substituído). Blocos `<style>`: 30 → 31
(+1: o design system). A consolidação completa (≈1.1 mil `!important`, 31 blocos) é incremental e segue
tela a tela; ver pendências em `DASHBOARD_PREMIUM_VISUAL_REPORT.md`.
