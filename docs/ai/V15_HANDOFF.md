# V15 Handoff — checkpoint (2026-11-07, ~20:50)

Projeto `Carteira de Investimentos`, checkout `C:\Projetos\carteira-investimentos`, branch `feat/kpi-variacao-diaria`.
**HEAD `9c572cd`** = commit da V15 (`feat(ui): redesign premium do Dashboard e Dividendos com design system FP`, 22 arquivos).
Nada de push, merge, deploy, reset ou clean. Worktree `ux-premium-responsive` (28 alterações) intocada.

## V15 — concluída e commitada

Design system FP (`docs/ai/FP_DESIGN_SYSTEM.md`), Dashboard e Dividendos redesenhados, navegação com SVG, acessibilidade e
privacidade. Evidências no commit: `npm test` EXIT=0 (1209/0), Axe 0 violações (17 rotas × 2 larguras × 2 temas),
matriz de 187 larguras sem overflow, privacidade sem vazamentos (sintético). Relatório: `docs/ai/DASHBOARD_PREMIUM_VISUAL_REPORT.md`.
Preço-teto: só análise (`docs/ai/PRICE_TARGET_CONTRACT.md`).

## V16 — EM ANDAMENTO, NÃO COMMITADO (working tree sobre `9c572cd`)

Arquivos modificados/novos agora: `index.html` (CSS V16 + cabeçalhos ordenáveis de Ativos), 11 testes `*.smoke.test.js`
(servidor trocado para `startLocalHttpServer`), `tests/v16-ativos-premium.test.js` (6 PASS), `tests/v16-lancamentos-premium.test.js`
(4 PASS), e `preview-10-10.html` deletado (pré-existente, não é meu).

Feito na V16 (validado individualmente, **sem `npm test` completo após estas mudanças**):
- **Ativos**: KPIs flat, grupos/tabela em tokens, ordenação funcional por cabeçalho (`aria-sort`, indicador via CSS),
  Comprar/Vender/Mais sempre alcançáveis (colunas fixas). `v317-financial-action-e2e` 8/8 após o ajuste.
- **Lançamentos**: lista, cartões, filtros e selos em tokens; testes de compra, venda (com validação), edição e exclusão sintéticos.
- **Títulos de página** unificados (24–28px, peso 700) e bloco legado "PHASE 7" (111 `!important`) trocado por regras FP:
  `!important` 1134 → ~1010.
- **Auditoria mobile**: rolagem fantasma resolvida (`.shell{position:relative}`); 0 documentos mais altos que a janela em 390/430px.
- **Causa-raiz das falhas "smoke" legadas**: o modo de teste exige o marcador injetado por `tests/local-http-server.js`;
  suítes com servidor próprio caíam no "ACESSO RESTRITO". 11 arquivos foram corrigidos; ainda há outros com servidor próprio
  (`dashboard-premium-clarity`, `dividends-p0-ux`, `quick-movement-inline-errors` e variantes).

Resultados das suítes reparadas (última execução): `dividendos-clear-filters` 4/0, `dividends-annual-matrix-filters.smoke` 8/0,
`utility-touch-targets` 2/2, `dividends-summary-clarity.smoke` 4/6, `dashboard-aportes-readability` 0/4, `dividends-p0-ux` 0/4,
`dividendos-matriz-legibilidade` 0/4, `reports-kpi-readability` 0/8 (restantes: seletores/contratos antigos, a investigar).

## Pendências para a V16 (retomar daqui)

1. Rodar `npm test` completo e a varredura de UI (em paralelo, `xargs -P4`) para separar regressão de falha pré-existente.
2. Quatro legados originais: `dashboard-aportes-readability` (selector já atualizado; falta alinhar rótulos do resumo de Aportes),
   `dashboard-patrimony-chart-correction` (texto e eixo compacto "R$ 88 mil"), `phase-3-2-4-assets-desktop-list` (travas de CSS/`<th>`),
   `v213-transactions-ui` (trocar trava estática por teste comportamental do filtro/ordenação de Lançamentos).
3. Fase C: restantes (Patrimônio, Rentabilidade, Metas, Renda Fixa, Rebalanceamento, Análise, Relatórios, IR, Configurações)
   só herdaram tokens/títulos; revisar visualmente claro/escuro e ultrawide.
4. Certificação: Axe, privacidade, matriz de larguras com zoom 125/150%, console, capturas; registrar `docs/ai/V16_HANDOFF.md`.
5. Preço-teto: manter apenas documentação; sem migração sem aprovação.
6. Decidir commit/branch (o `AGENTS.md` pede uma branch por objetivo).

## Preservação

- Backups: `output/v15/backup/index.v15.html` (meio da V15), `output/v16/backup/index.v15-final.html` (= `index.html` do HEAD `9c572cd`,
  ponto de retorno exato). `output/v15/` (73 arquivos) e `output/v16/` com screenshots; `output/` é ignorado pelo Git.
- Estado verificado agora: `index.html` com sha256 `4d74e05e…`, 6 scripts inline compilam, nenhum arquivo perdido.
