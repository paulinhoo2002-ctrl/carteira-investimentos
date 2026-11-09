# V16 Handoff — Finalização premium (2026-11-07)

Workspace `C:\Projetos\carteira-investimentos`, branch `feat/kpi-variacao-diaria`, **HEAD `9c572cd`** (baseline V15).
Tudo da V16 está **na working tree, sem commit**. Sem push, merge, deploy, reset ou clean. Somente dados sintéticos.
Backups: `output/v15/backup/index.v15.html`, `output/v16/backup/index.v15-final.html` (= HEAD), `output/v16/backup/index.v16-wip.html` (meio da V16).
Screenshots: `output/v15/` e `output/v16/` (ignorados pelo Git). Worktree `ux-premium-responsive` intocada.

## Estado Git

`git status`: `index.html` e `package.json` modificados; ~25 testes modificados/novos; `docs/ai/V15_HANDOFF.md` e este arquivo novos;
`preview-10-10.html` deletado (pré-existente, não é meu). Nenhuma alteração da V15/V16 foi perdida (checkpoint conferido na retomada).

## Telas concluídas

| Tela | O que mudou |
|---|---|
| Ativos | KPIs, grupos e tabela em tokens FP; cabeçalhos **ordenáveis** (`aria-sort` no `th`, indicador via CSS, texto do `th` intacto); Comprar/Vender/Mais sempre visíveis (colunas fixas); busca, filtros e estado vazio; cartões mobile com todos os detalhes |
| Lançamentos | lista em extrato, cartões de resumo, filtros e selos em tokens; botão primário com o mesmo acento; resumo de confiança sem overflow no tablet; formulário de edição e modal com contraste corrigido |
| Todas as telas | títulos de página unificados (24–28px, peso 700); bloco legado "PHASE 7" (111 `!important`) trocado por regras FP; rótulos/KPIs em caixa de frase; Configurações com hierarquia h1/p correta |
| Dashboard e Dividendos | V15 preservada |
| Demais (Patrimônio, Rentabilidade, Metas, Renda Fixa, Rebalanceamento, Análise, Relatórios, IR, Auditoria, Configurações) | herdam tokens, títulos, botões, tabelas e badges; **não foram redesenhadas estruturalmente** |

Declaração honesta: a V16 **não está 100% concluída** — as telas da última linha precisam de revisão visual dedicada (cartões coloridos legados,
valores com cor inline, ex.: "Capital aplicado" roxo em Renda Fixa; textos de 9–10px residuais).

## Evidências

| Verificação | Resultado |
|---|---|
| `npm test` (inclui build) | EXIT=0 · **1235 passam · 0 falham** |
| Testes novos V16: Ativos (6), Lançamentos (4: compra, venda c/ validação, edição, exclusão), qualidade global (4), axe interativo (1) | PASS |
| Axe 17 rotas × {1366,390} × {escuro,claro} (68 estados) | 0 violações |
| Axe em estados interativos (Ativos aberto, modal, edição, matriz) × 4 combinações | 0 violações (corrigidos: contraste do logo de ativo, formulário de edição, `note-pill`, `heading-order` do modal) |
| Privacidade, 17 rotas (texto, `aria-label`, `title`, SVG, inputs) | 0 vazamentos (sintético; não certifica privacidade real) |
| Matriz 11 larguras (360–3440 + zoom 125/150%) × 17 rotas | 187 checagens, 0 overflow, 0 erro de página |
| Rolagem fantasma do documento (390/430 × 17 rotas) | 0 (Auditoria corrigida: `.shell{position:relative}`) |
| Varredura de 163 suítes de UI fora do `npm test` (paralela, 4 workers) | 136 limpas · 27 com falha **todas pré-existentes** · **0 regressões** |
| `!important` / blocos `<style>` | 1174 → 1007 / 31 (apenas onde o componente foi substituído) |

## Legados investigados (nenhum teste apagado)

Os 4 pendentes da V15 agora passam, cada um com causa demonstrada:
- `dashboard-aportes-readability.smoke` — selector antigo + rótulos do resumo desatualizados **e um defeito real** (rótulo de 9px no mobile, corrigido).
- `dashboard-patrimony-chart-correction` — redação mudou; eixo compacto "R$ 88 mil"; a lacuna agora nasce no snapshot (`cumulative:null`).
- `phase-3-2-4-assets-desktop-list` — travas de CSS/`<th>` do layout antigo substituídas pelas do atual.
- `v213-transactions-ui` — a UI não usa mais o helper; trava estática trocada por teste **comportamental** de filtro e ordenação.
Causa-raiz sistêmica de dezenas de falhas "smoke": servidores HTTP próprios sem o marcador QA exigido pelo modo de teste
(caíam em "ACESSO RESTRITO"). 17 arquivos foram migrados para `tests/local-http-server.js`.
Também corrigido um defeito real de acessibilidade pré-existente (contraste #34d399 nos resumos de IRPF/Análise) e 4 regressões minhas
(3 travas estáticas de `<th>`/CSS e um overflow do resumo de Lançamentos).

## Falhas pré-existentes que permanecem (27 suítes, mesmas na base pré-V15)

`ativos-premium-actions`, `ativos-rf-summary`, `audit-visual-canon`, `dividendos-matriz-discovery`, `dividendos-matriz-legibilidade`,
`dividendos-premium-clarity`, `dividends-p0-ux`, `dividends-summary-clarity`, `irpf-surface`, `legacy-assets-*` (2), `m862-ux-hardening`,
`product-usability-03-shell`, `provento-operational-ux`, `replace-dividends-integrity` (arquivo de referência ausente), `reports-*` (3),
`rf-*` (5), `utility-touch-targets`, `v289-assets-analysis`, `v289-visual-fixtures`, `v289-visual-shell`, `visual-master-parity-11`.
Em geral: seletores/markup antigos (ex.: `.canon-div-history`), servidores próprios restantes ou fixtures ausentes. Decisão pendente: reescrever ou aposentar.

## Riscos e pendências

1. Revisão visual dedicada das telas listadas como "herdam tokens" (principalmente Renda Fixa, Rebalanceamento, Relatórios, Auditoria).
2. As 27 suítes pré-existentes acima.
3. Duplicidade DOM das ações de Dividendos (cabeçalho + bloco mobile) quebra seletores estritos de testes antigos.
4. Rótulo "Aportes" na rota Lançamentos é travado por testes (decisão de terminologia).
5. Preço-teto: somente análise (`docs/ai/PRICE_TARGET_CONTRACT.md`); sem migração sem aprovação.
6. Decidir commit/branch: `AGENTS.md` pede uma branch por objetivo; V15 e V16 já se misturam nesta branch.
7. Axe não equivale a certificação WCAG; falta revisão com leitor de tela e dados reais.

## Próximo comando sugerido

`npm.cmd test` (deve dar EXIT=0, 1235/0) e então revisar `git diff --stat` antes de qualquer commit (que depende de autorização explícita).
