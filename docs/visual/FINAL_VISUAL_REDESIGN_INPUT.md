# Entrada para o redesign visual final

## Alvo e fronteiras

- Alvo primário: shell de produção LEGACY (`index.html`).
- `modern/`: preservar e testar; não é o alvo principal de redesign.
- Sem redesign global nesta fase. Telas frozen só mudam com escopo/autorização
  próprios.
- Não alterar cálculos, fontes financeiras, persistência, dados históricos,
  classificador/engines de fluxo/performance, parsers, regras Firebase, identidade
  de carteira, backup, tax ou Service Worker.
- Não migrar telas ao moderno nem criar rota nova sem necessidade comprovada.

## Baseline observada

Evidência sintética local compilada/runtime em 2026-09-26; não autenticada e sem
carteira real. Dashboard foi revisado em 390, 768, 1366 e 1920; documento medido
nas sete larguras padrão (390, 430, 768, 1366, 1440, 1536, 1920) sem overflow
horizontal externo. A captura de 1920 mostra colisão de conteúdo nas tabelas de
alocação; esse clipping não é detectado por `scrollWidth` do documento.

Axe no Dashboard em 390 reportou zero violações WCAG A/AA. Essa evidência é
restrita àquela rota, tema dark e fixture. Contraste completo, teclado/foco,
toasts, touch geometry, todas as páginas, tema light, zoom e performance
comparável continuam pendentes.

## Aceitação do redesign

1. Rota/shell LEGACY e sete viewports: 390×844, 430×932, 768×900, 1366×768,
   1440×900, 1536×864 e 1920×1080.
2. Temas dark/light verificados nas telas de produção em escopo.
3. Controles críticos com área clicável >=44×44 CSS px; ações móveis críticas
   aproximam-se de 48×48 quando o layout comportar.
4. Foco de teclado visível em todo controle alcançável e contraste do indicador
   >=3:1 contra o fundo imediato onde mensurável.
5. Texto normal com contraste >=4.5:1 e texto grande >=3:1. Revisar combinações
   de cores efetivamente renderizadas, incluindo `--primary` usado como texto.
6. Texto de leitura ordinária geralmente >=12px; 11–12px só secundário e legível.
   Conteúdo visível de 6–10px é candidato prioritário, não mudança global cega.
7. Sem overflow externo inesperado nem clipping interno de conteúdo essencial;
   não usar `overflow-x:hidden` como correção cosmética.
8. Reduced motion respeitado sem apagar indiscriminadamente todas as transições.
9. Axe critical/serious zero por rota/estado relevante; nomes de controles,
   live-region, dialogs, tabs, resumo/summary e ícones revisados manualmente.
10. Valores positivos/negativos não dependem somente de cor; dados numéricos
    continuam semanticamente e financeiramente idênticos.
11. Sem erros novos de console/page/request; nenhuma mutação financeira ou fiscal.
12. Sem regressão material de desempenho frente a baseline medida (sem metas
    arbitrárias antes da medição).
13. Sem exigência de pixel-match global de 2px; comparar hierarquia, estrutura,
    clareza e identidade visual canônica.

## Itens que exigem decisão/design por evidência

- Colisão das tabelas do Dashboard em 1920 e responsividade de grids internos.
- Densidade e legibilidade dos rótulos pequenos em mobile.
- Uso contextual de `--primary` como texto, preservando botões/superfícies cuja
  cor já contraste bem; considerar tokens separados de superfície/texto.
- Navegação/tablet 768: footprint, alcance, safe area, overlap; não introduzir
  drawer/FAB/nav nova automaticamente.
- Alinhamento tabular de moeda/percentuais, gráficos, empty states e ícones.
- KPI semântico com badge/ícone é candidato, não requisito fechado.

## Evidência a coletar antes/depois

- Capturas iguais por rota/viewport/tema, inspecionadas visualmente.
- Geometria via `getBoundingClientRect`, foco via tab traversal e contraste das
  cores computadas contra a superfície imediata.
- `prefers-reduced-motion` runtime; accessible name e estado de live-region.
- `scrollWidth`, clipping essencial, 125%/150% zoom e safe areas.
- Axe por rota/estado, com triagem das incompletudes.
- Recursos/bytes e timings disponíveis (FCP/LCP/CLS), sem impor thresholds
  ainda não justificados.
- Estados vazio, loading, erro e conteúdo; CTA só quando houver ação real que o
  usuário possa executar.

## Proibições de dados/semântica

UNKNOWN != ZERO; PARTIAL != COMPLETE; STALE != FRESH; `financialAsOf` !=
`sourceAsOf`; HIGH != MEDIUM != UNKNOWN. Sem valores/históricos inventados,
sem sobrescrever autoridade manual, sem writes ocultos. A evidência QA deve
identificar explicitamente fixture sintética versus dados reais.
