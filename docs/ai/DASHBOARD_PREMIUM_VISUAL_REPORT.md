# Relatório — Operação Fintech Premium (V15), 2026-11-07

Workspace: `C:\Projetos\carteira-investimentos`, branch `feat/kpi-variacao-diaria`, HEAD `75c89a7`. **Nada commitado.**
Somente dados sintéticos (fixture `tests/helpers/fp-rich-fixture.js`, vários anos). Sem mudança em fórmulas
financeiras, persistência, schema, Finance Core, `sw.js`, `modern/*` ou dados reais. Worktree
`ux-premium-responsive` (28 alterações) preservada, não tocada e não integrada.
Skills: Superpowers e Caveman carregadas; Ponytail Full inexistente no ambiente (registrado).

## Entregue

- **Design system FP** (`docs/ai/FP_DESIGN_SYSTEM.md`): tokens nos dois temas, componentes compartilhados, ícones SVG,
  foco por `outline`, aliases legados remapeados (propaga a identidade às demais telas).
- **Dashboard**: 3 KPIs dominantes (Patrimônio atual, Valor investido, Recebido no mês); painel de rentabilidade
  (Resultado da posição, Variação diária separada do acumulado, atalho de benchmarks, status de consolidação);
  evolução com seletor 3/6/12/24M; alocação com rosca; altas/baixas lado a lado; próximos recebimentos;
  **Lançamentos recentes** (novo); insights; atalhos. Ação principal "Novo lançamento".
- **Dividendos**: indicadores (Recebido no ano, Média mensal, Último mês, Projeção anual rotulada "Estimativa" só quando
  existe) + faixa (mês corrente, 12 meses); matriz anual com Média/Total fixas à direita; **gráfico de evolução**
  (12M/24M/Tudo, tooltip, legenda, mês em andamento hachurado, tabela acessível); **ranking** de pagadores; **rosca anual**.
- **Navegação**: ícones SVG, `<main>` único, banner, nomes acessíveis, botão de privacidade com `aria-pressed`
  sincronizado com o interruptor de Configurações (operável por teclado).
- **Defeitos corrigidos**: `globalThis.S` derrubava o Dashboard; overflow a 360px; rolagem fantasma no mobile
  (tabela só-leitor-de-tela sem ancestral posicionado); foco sem contorno; contraste do selo "Venda"; títulos sem `h1`.

## Contratos alterados por decisão do proprietário (seções 5–6 da V15) — testes atualizados, asserções financeiras mantidas

Primeiro bloco do Dashboard = Patrimônio/Valor investido/Recebido; resultado e variação no painel de rentabilidade;
ordem dos blocos; KPIs de Dividendos (mês corrente e 12M na faixa). Arquivos: `basic-ui`, `dashboard-economic-result`,
`dashboard-navigation-contract`, `dashboard-premium-clarity.smoke`, `fixed-income-total-return-ui`,
`package2-dashboard-panel`, `rf-semantic-safety`, `v289-dashboard-hybrid`, `v289-visual-regression`,
`v333-dividend-month-coverage.browser`, `v348-dashboard-highlights`, `v274-accessibility-contract` (trava de CSS-fonte
legado trocada por verificação de contraste WCAG real dos tokens). Regras mantidas: base parcial ⇒ resultado "—";
mês confirmado zero ⇒ "R$ 0,00"; ausente ≠ zero; privacidade.

## Evidências

| Verificação | Resultado |
|---|---|
| `npm test` (15 grupos, inclui build) | EXIT=0 · 1209 passam · 0 falham |
| Novos: `dividends-premium-charts` (5), `fp-design-system` (5), `dashboard-recent-transactions` (4) | PASS |
| Axe (wcag2a/aa/21aa/best-practice) · 17 rotas × {1366,390} × {escuro,claro} = 68 estados | 0 violações |
| Privacidade (`hideValues`) · 17 rotas: texto, `aria-label`, `title`, SVG, inputs | 0 vazamentos (sintético; não certifica privacidade real) |
| Matriz 11 larguras (360–3440 + zoom 125/150%) × 17 rotas = 187 | 0 overflow horizontal, 0 erro de página |
| Varredura de 131 suítes de UI fora do `npm test`, comparada à base pré-V15 | 3 regressões minhas encontradas e corrigidas; 33 falhas já existiam; 2 melhoraram |
| Render (dados ×11: 1133 proventos) | Dashboard 17→120 ms, Dividendos 28→139 ms; ocultar valores não custa extra; 0 long task |

## Testes legados (investigação individual; nenhum apagado)

| Suíte | Veredito | Evidência |
|---|---|---|
| `dashboard-aportes-readability.smoke` | Contrato desatualizado / funcionalidade removida | espera `.dashboard-master-primary` (layout antigo, só em CSS/`dashLegacy`) e rótulos que pertencem à rota Aportes |
| `dashboard-patrimony-chart-correction` | Contrato desatualizado | texto mudou ("cobertura do histórico permanece desconhecida") e o eixo usa rótulos compactos ("R$ 88 mil") que o teste não parseia |
| `phase-3-2-4-assets-desktop-list` | Contrato desatualizado | trava de CSS-fonte e de `<th>` do layout antigo de Ativos |
| `v213-transactions-ui` | Funcionalidade não usada | a UI não chama mais `V213TransactionTrust?.filterTransactions` (módulo e seu teste, 8/8, seguem verdes) |
| `dividends-summary-clarity.smoke`, `v289-visual-shell` + 30 outras | Pré-existentes | falham igual na base pré-V15 (lista em `output/v15`, local) |

Decisão pendente do proprietário: reescrever ou aposentar essas suítes.

## Pendências e riscos

- **Preço-teto**: `docs/ai/PRICE_TARGET_CONTRACT.md` (ausente vira 0; formulário grava `price_target`, tabela lê
  `target_price`/`alvo`). Sem código alterado; exige fase própria e aprovação antes de qualquer migração.
- **Ativos / Lançamentos / demais telas**: herdam tokens, ícones e foco; **não foram redesenhadas** (tabela de Ativos,
  formulários, selos coloridos de Lançamentos). O título "Aportes" na rota Lançamentos é travado por testes.
- **CSS**: `!important` 1174→1134, `<style>` 30→31. Consolidação completa é incremental, tela a tela.
- **Auditoria** no mobile tem rolagem fantasma pré-existente (+13.9 mil px, igual à base).
- Benchmarks na tela inicial são só um atalho para Rentabilidade (não há série de CDI/IBOV no Finance Core aqui).
- Axe não equivale a certificação WCAG; falta revisão com leitor de tela e dados reais.
- Capturas em `output/v15/` (ignorado pelo Git): `before-*` e `f-*` (dashboard/dividendos × 5 larguras × 2 temas).
