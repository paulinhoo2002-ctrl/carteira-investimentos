# V20 Handoff — Dashboard e Dividendos (2026-11-08)

Base: branch `feat/v16-premium-redesign`, HEAD `99b4303` (V19). Mudanças V20 **na working tree, sem commit**. Sem push/merge/rebase/cherry-pick/reset/clean/deploy. Dados sintéticos. `preview-10-10.html` segue deletado (preservado); 15 stashes e 17 worktrees intocados. Backup do estado V19: `output/v20/work/index.v19-99b4303.html`.

Skills: Superpowers e Caveman usados; **Ponytail não está instalado** neste ambiente (não alegado).

## Diagnóstico (antes de mexer)

- Dashboard mobile (390px): primeira dobra gastava ~260px com o trio de KPIs empilhado; "Atualizado" + botão ocupavam linhas soltas; o aviso "Importante" só aparecia no fim da página (contrato v348/v289 impede movê-lo).
- Dividendos mobile: rótulos do eixo do gráfico se sobrepunham ("jan/26" sobre "fev").
- Dividendos 1366px: matriz anual rolava 108px na horizontal (1169px de tabela para 1061px de área).
- Desktop do Dashboard e de Dividendos já estava bom (referência V19); não foi redesenhado.

## O que mudou (somente apresentação; sem fórmulas, Finance Core, persistência ou dados)

| Item | Mudança |
|---|---|
| Alerta "Importante" | Painel **não foi movido** (contratos v348/v289 intactos). Novo chip no cabeçalho "N pontos de atenção" rola até o painel (`#dashboard-priority`). Texto do painel idêntico; dois templates unificados em um (sem id duplicado). |
| Dashboard mobile | Patrimônio atual em linha própria; Valor investido e Recebido no mês lado a lado; cabeçalho compacto (botão + chip na mesma linha, "Atualizado" abaixo). |
| Dividendos mobile | Rótulos do eixo: meses alternados e ano ocultos (ano continua na tabela acessível e no tooltip). Sem sobreposição. |
| Dividendos desktop | Ano do mês de janeiro em linha própria sob o rótulo. |
| Matriz anual | Células mensais sem o prefixo "R$" (nota "Valores mensais em R$; média e total com símbolo."). Em 1280/1366/1440px a matriz cabe sem rolagem. Em modo privacidade o texto mascarado é mantido. Nenhuma coluna ou dado removido. |

Sem novos `!important`.

## Testes

- Novo: `tests/v20-premium-experience.test.js` (11 testes, registrado no `npm test`): chip do aviso (1366/390: visível na primeira dobra, painel permanece depois dos KPIs, clique leva ao aviso), KPIs mobile, "Atualizado" não cortado, matriz sem rolagem em 3 larguras e sem "R$" nas células, rótulos do gráfico sem sobreposição, privacidade (texto e atributos), axe (Dashboard + Dividendos × 2 temas × 2 larguras).
- `tests/v19-dashboard-dividends.test.js`: asserção de "uma coluna" no mobile relaxada para "no máximo 2" (decisão V20 intencional).
- Corrigidos durante o trabalho (todos detectados por testes existentes): `v333-dividend-month-coverage` (matriz não pode depender de `S`), `phase-2-dashboard-intelligence` (helpers do aviso devem ficar dentro do trecho contratado), `a11y-functional` (id duplicado).
- `npm test`: **EXIT=0, 1271 passam, 0 falham** (última execução). Duas execuções anteriores falharam apenas por `page.goto` 5s sob carga (`dashboard-recent-transactions`, `dividends-premium-charts`, `fp-design-system`); passaram isoladas e na repetição; asserções não foram relaxadas.
- Matriz 11 larguras × 10 telas × 2 temas + privacidade: **240 checagens, 0 problemas**.
- Varredura das 163 suítes de UI: **idêntica à base V16** (27 falhas antigas, 0 regressões).
- Axe: 0 violações (WCAG A/AA) em Dashboard e Dividendos, 2 temas × 2 larguras.

## Pendências reais

- Commit depende de autorização. Integração com `origin/main` continua não autorizada.
- O aviso "Importante" segue no fim da página; só mudar de lugar com decisão explícita de atualizar os contratos v348/v289.
- Evolução do Dashboard ("Aportes líquidos registrados") usa rótulos de eixo grandes no mobile; não alterado (fora do diagnóstico prioritário).
- Dashboard com Patrimônio atual conhecido não foi visto (a fixture tem 1 valor indisponível → "—", correto).
- Matriz ainda rola horizontalmente abaixo de ~1100px (esperado; coluna do ano e sombra indicativa preservadas).
- Privacidade validada só com dados sintéticos e nas rotas Dashboard/Dividendos.
- Evidências: 6 capturas finais em `output/v20/evidence/` (ZIP em `output/v20/V20_EVIDENCIAS.zip`, fora do Git).
