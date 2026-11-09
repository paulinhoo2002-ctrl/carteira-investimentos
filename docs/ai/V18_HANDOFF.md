# V18 Handoff — telas restantes (2026-11-08)

Base: branch `feat/v16-premium-redesign`, HEAD `1d511c8` (V17). Mudanças V18 **na working tree, sem commit**. Sem push/merge/rebase/deploy. Dados sintéticos. Backup do estado V17: `output/v17/backup/index.v17-commit-1d511c8.html`.

## O que mudou (somente apresentação)

| Tela | Antes → depois (1366px, escuro) |
|---|---|
| Patrimônio | 49 textos <11px → 0; 12 gradientes → 0 |
| Metas | 92 → 0; 6 cores inline → 0 (mapas de status/saúde passam a tokens FP); 15 gradientes → 0 |
| Rebalanceamento | 16 → 0; rótulos em caixa de frase; 3 cartões com gradiente → faixa lateral semântica |
| Análise | 44 → 0; barras de desempenho em `--fp-pos/--fp-neg` |
| Configurações | 23 → 0; 6 cores inline → 0 (ícones por `data-tone`, botões compactos 44px, perigo em `--fp-neg`) |
| Auditoria | 2395 → 0 textos <11px; colunas das linhas de remediação/monitoramento ajustadas (badges não sobrepõem mais) |

Também: `strong` com cor inline `#e2eaf6` → classe `fp-strong`.

## Verificação

- `npm test`: EXIT=0, **1249 passam, 0 falham** (inclui `tests/v18-remaining-screens.test.js`: legibilidade/overflow, axe em 2 temas × 2 larguras, valores ocultos).
- Matriz 11 larguras × 10 telas × 2 temas + privacidade: 240 checagens, 0 problemas.
- Varredura das 163 suítes de UI: idêntica ao baseline V16 (27 falhas pré-existentes, 0 regressões).

## Pendências

- Commit depende de autorização. `output/v17/` acumula capturas antigas (ignorado pelo Git).
- Não revistos nesta rodada: Importar dados, Confiabilidade dos dados (1216 textos <11px) e IA.
- Item de nav "Confiabilidade dos dados" aparece cortado na barra lateral (rótulo longo).
- Select "Tipo de movimentação" do editor de RF trunca o rótulo em 390px.
