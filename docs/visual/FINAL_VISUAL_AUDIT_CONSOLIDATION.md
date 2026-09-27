# V274 — Consolidação das auditorias visuais

Data da verificação: 2026-09-26
Base: `5b4bd90eb46275bd44dcac2812fe2533d918f85e`
Superfície alvo: `index.html` (LEGACY). `modern/` permanece como superfície
readonly de migração a preservar e testar, não o alvo principal do redesign.

## Fontes reconciliadas

1. `docs/visual/UI-AUDIT.md` — inventário de telas e lacunas, base histórica
   `4efc66a` (2026-08-26).
2. `docs/ai/DESIGN_SYSTEM_AUDIT.md` — extração/token audit, 2026-09-04.
3. `docs/ai/APPLE_PASS_AUDIT.md` — readiness e interações, base histórica
   `abe6bdac` e ondas posteriores.
4. `docs/ai/APPLE_PASS_WAVE_3_AUDIT.md` — estados assíncronos e loading,
   base histórica `d58c004`.

`docs/visual/NORTH-STAR.md` e `Refs/visual-canon/` são referências de direção,
não uma quinta medição do runtime atual. Auditorias históricas não são
promovidas a estado atual sem confirmação no código/browser.

## Evidência atual em runtime

Ambiente: SPA LEGACY servida por harness local, Chromium Playwright headless
isolado, `testMode=1`, rota Dashboard aberta por `go('dashboard')`, somente
fixture sintética. Nenhuma carteira real, autenticação ou escrita foi usada.

- Viewports exercitados: 390×844, 430×932, 768×900, 1366×768, 1440×900,
  1536×864 e 1920×1080. Na página inicial, `documentElement.scrollWidth` foi
  igual à largura do viewport em todos; não prova ausência de clipping interno.
- Console/page errors observados na sessão de captura: zero.
- Capturas locais em `%TEMP%\v274-qa-USNRaH`: Dashboard em 390, 768, 1366 e
  1920; revisadas visualmente pelo Codex. Não adicionar essas imagens ao Git.
- 390px: shell e cards empilhados; os rótulos secundários parecem pequenos na
  captura. A contagem precisa por elemento e análise de contraste permanecem
  pendentes para o browser QA completo.
- 768px: navegação superior ocupa duas linhas; sem overflow do documento na
  medição. O footprint é observação para redesign, não autorização para trocar
  navegação.
- 1366px: Dashboard estilizado, navegação lateral, sem overflow do documento.
- 1920px: a captura mostra colunas de tabelas da área de alocação sobrepostas/
  visualmente colidindo, apesar de `scrollWidth == innerWidth`. É clipping/
  layout interno real e deve ser corrigido na fase visual, não escondido por
  `overflow-x:hidden`.
- Axe-core no Dashboard sintético a 390px: 0 violações WCAG 2.1 A/AA, 23 regras
  passadas, 2 incompletas. Isso não certifica outras rotas nem a carteira real.
- Um smoke separado visitou o shell de acesso e não deve ser confundido com a
  captura Dashboard; a captura de Dashboard exigiu navegação explícita pelo
  `go('dashboard')` do harness.

Uma varredura axe percorreu 17 rotas LEGACY em 390px e 1366px (34
observações), em tema escuro e harness sintético local. Antes das correções
foram observadas 2 ocorrências críticas do mesmo defeito `select-name` em IRPF
e 73 ocorrências serious distribuídas entre contraste, regiões roláveis sem
foco e um `nested-interactive` em Metas. As ocorrências contam rota/largura
repetida e não equivalem a 73 defeitos únicos. Após correções localizadas, a
matriz dark terminou com zero violações axe A/AA (zero critical e serious). Uma
varredura adicional do tema claro, ainda em 17 rotas e 390/1366 (34 observações),
encontrou zero critical, mas três grupos de violações serious: texto do
Dashboard sobre fundos variáveis e texto residual da superfície fiscal V254 em
Relatórios. Outros grupos menores foram corrigidos durante a investigação. A
superfície fiscal extensa requer ajuste coordenado de tema, fora de um override
pontual seguro. Esta certificação segue incompleta; não cobre todos os estados
de dados nem carteira real.

Touch-target, foco por teclado em todos os controles, contraste por tema/estado,
zoom e performance detalhada ainda não foram certificados nesta rodada.
`qa:all` é smoke de viewport/documento, não substitui essas medições.

## Evidência de código confirmada

- Produção/default continua LEGACY: `index.html`; o moderno é separado e
  readonly.
- `--primary` é roxo (`#4f46e5` no dark theme e `#4057d6` no light); axe
  confirmou contraste insuficiente em texto da rota IA e em conteúdo de
  Relatórios. A paleta geral não foi alterada nesta fase.
- A escala base inclui tokens de 9/10/11/13/16px; componentes visuais ainda
  têm declarações explícitas de 9px. A adequação depende de texto realmente
  legível/visível no contexto, mas 6–10px deve ser priorizado para revisão.
- `--control-min-h:44px` existe, assim como CSS local; isso não prova a caixa
  interativa real de cada controle.
- `prefers-reduced-motion` está presente na regra Wave 1 e coberto por
  `tests/apple-pass-wave-1.test.js`; a auditoria Apple antiga que o marcava
  ausente é histórica/contradita pelo código atual, faltando validação runtime.
- Há vários `:focus-visible`; cobertura por regra não prova foco visível em
  todo controle nem retorno correto após diálogo/rota.
- `font-variant-numeric:tabular-nums` é usado em alguns valores, não
  uniformemente.

## Classificação consolidada

### CONFIRMED_RUNTIME

- Dashboard LEGACY renderiza com estilos no harness local.
- Documento sem overflow horizontal nas sete larguras medidas na tela inicial.
- Axe Dashboard 390: 0 violações críticas/serious, mas a varredura ampliada de
  17 rotas/2 larguras encontrou defeitos críticos e serious fora do Dashboard.
- Screenshot Dashboard 1920 mostra colisão entre conteúdo de tabelas; portanto
  ausência de overflow de página não equivale a ausência de clipping.

### CONFIRMED_CODE

- LEGACY é o shell de produção/default; moderno continua readonly.
- Reduced motion tem contrato CSS e teste estático atual.
- Tokens de tamanho baixo e múltiplas declarações locais existem; as regras
  precisam de priorização por runtime, não alteração global automática.
- Tabular numerals são aplicados de forma localizada.

### PROBABLE

- A densidade de rótulos financeiros secundários reduz legibilidade em mobile.
- Tabelas de alocação não escalam bem para desktop muito largo em pelo menos
  uma combinação Dashboard/1920 capturada.
- Contraste de texto falha em combinações específicas confirmadas pelo axe;
  falta corrigir e revalidar todo o conjunto por tema/rota.

### UNCONFIRMED

- Cobertura completa de foco por teclado e razão >=3:1 do focus ring.
- Touch target >=44×44 em cada rota/controle.
- Contraste WCAG AA em dark/light, placeholders, disabled, gráficos e status.
- Nomes acessíveis em 17 rotas/2 larguras no tema escuro: zero critical/serious
  após correção do select IRPF; outros temas/estados ainda não cobertos.
- Semântica live-region de todos os toasts/erros e ausência de anúncios
  duplicados.
- Comportamento de 125%/150% zoom, safe-area e clipping em todas as telas.
- Baseline comparável de FCP/LCP/CLS/interação para o produto completo.

### CONTRADICTED / HISTÓRICO

- `APPLE_PASS_AUDIT.md` diz que reduced-motion estava ausente; fonte atual e
  teste Wave 1 provam regra implementada. O runtime ainda deve ser verificado.
- A afirmação histórica de sidebar >=1181 e bottom nav <=640 é descritiva, não
  substitui medições das faixas intermediárias atuais.
- CSS min-height 44px e focus rules não contradizem observações de controle
  menor/foco ausente: seletores locais e geometria runtime podem diferir.
- Alegações de `MODERN` como alvo principal contradizem o roteamento atual e a
  produção LEGACY; mudar essa decisão exige evidência runtime nova.

## Breakpoints e consistência

Os pares `640/641`, `767/768/769`, `1180/1181` e `1535/1536` não foram
consolidados. Devem ser interpretados como possíveis pares max-width N / min-width
N+1 ou famílias independentes até inspeção semântica de cada regra. 768×900
mostrou navegação em duas linhas, mas não prova por si só defeito de breakpoint.

## Conclusão V274

Baseline parcial confiável para iniciar planejamento visual, não certificação
global de acessibilidade/temas. Prioridade concreta: resolver a colisão interna
de tabelas no desktop largo e medir a legibilidade mobile; executar revisão
completa de foco, contraste, touch e temas antes de congelar a aprovação do
redesign. Correções V274: nome acessível do seletor de ano IRPF; escopo correto
de cores em Relatórios; texto secundário/badge com contraste suficiente;
regiões roláveis nomeadas e focáveis; ação redundante removida do summary em
Metas. Axe pós-fix na matriz escura executada passou sem critical/serious.
Nenhuma mudança financeira, de persistência, importação, identidade, backup,
Firebase ou redesign amplo foi feita.
