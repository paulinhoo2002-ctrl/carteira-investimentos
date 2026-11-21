# V19 Handoff — Dashboard, Dividendos e acabamento (2026-11-08)

Base: branch `feat/v16-premium-redesign`, HEAD `12482f3` (V18). Mudanças V19 **na working tree, sem commit**. Sem push/merge/rebase/cherry-pick/reset/clean/deploy. Dados sintéticos. `preview-10-10.html` segue deletado (preservado); 15 stashes e outras worktrees intocados. Backup do estado V18: `output/v19/work/index.v18-12482f3.html`.

## Diagnóstico e plano visual

- Skills: Superpowers e Caveman disponíveis e usados; **Ponytail não está instalado neste ambiente** (sem skill) — não alegado.
- **Referência do site antigo**: `Refs/visual-canon/` contém só README/CANON_INDEX, sem imagens acessíveis. Nenhuma referência histórica foi inventada; a estrutura objetiva de Dividendos veio do pedido (KPIs → gráfico mensal → ranking → tabela recolhível) e do código existente.
- Dashboard e Dividendos já tinham base V15. Defeitos reais achados: botão "Exportar" invisível no tema escuro, KPIs de Dividendos no mobile com tamanhos inconsistentes, tabela mensal de 478px antes do gráfico, 118 textos <12px em Dividendos, matriz anual cortando colunas sem pista de rolagem, Auditoria com 17.395px de altura.

## O que mudou (somente apresentação; sem fórmulas, Finance Core, persistência ou dados)

| Tela | Mudança |
|---|---|
| Dashboard | saudação discreta no subtítulo; três KPIs (Patrimônio atual, Valor investido, Recebido no mês) em **uma só superfície** com divisórias finas, protagonista maior; mobile em uma coluna; cartão "Próximos recebimentos" não estica; textos ≥12px |
| Dividendos | ordem: KPIs → **gráfico + ranking + resumo por ano** → histórico mensal **recolhido** (antes aberto); botão Exportar legível nos dois temas; KPIs mobile 2×2 uniformes; "Resumo por ano" com painel; sombra lateral na matriz quando há meses fora da área; 0 textos <11px (eram 55) |
| Confiabilidade, Importar dados, Insights | textos ≥12px, superfícies planas |
| Auditoria | listas de pendências/alertas recolhidas (`.audit-fold`) quando >12 itens e sem filtro; **todos os itens continuam no DOM**; abre sozinha com filtro ativo; altura 17.395px → ~2.650px |
| Sidebar | "Confiabilidade dos dados" → "Confiabilidade" (sem corte; igual ao menu mobile) |
| Renda Fixa mobile | select "Tipo de movimentação" em largura total (rótulo "Novo aporte" não trunca) |

`!important`: removidos 3 legados de KPIs de Dividendos; nenhum novo.

### Decisões revertidas por contrato (achadas pela varredura de UI)
- Alerta "Importante" movido para cima dos KPIs quebrava `v348` (painel de altas/baixas antes da prioridade) e a primeira dobra de `v289`: **revertido** (alerta permanece antes dos atalhos).
- Cobertura institucional em `<details>` quebrava `v289-visual-regression` (texto deve estar visível): **revertido**; apenas tipografia mais discreta.

## Testes

- Novo: `tests/v19-dashboard-dividends.test.js` (13 testes, registrado no `npm test`): legibilidade/overflow/inline em 6 telas × 4 viewports/temas (com `<details>` abertos), hierarquia dos KPIs, mobile, ordem e estado de Dividendos, contraste do botão, ausência ("Projeção anual" indisponível, nunca zero), Auditoria sem perda de itens, sidebar, axe (6 telas × 2 temas × 2 larguras), privacidade (texto, SVG, atributos, conteúdo recolhido).
- `npm test` (inclui build): ver "Resultados".
- Matriz 11 larguras (360–3440 + 911/1093 = zoom 125%/150%) × 10 telas × 2 temas + privacidade: **240 checagens, 0 problemas**.
- Varredura das 163 suítes de UI fora do `npm test`: **idêntica à base V16** (27 falhas antigas; 0 regressões). As falhas de `dividends-p0-ux.smoke` (4) e `dividends-summary-clarity.smoke` (6) já existiam.
- Flutuação de infraestrutura observada 2×: `page.goto` com timeout de 5s em `v16-global-quality` e `dividends-premium-charts` sob carga; passam isoladas e na repetição. Asserções não foram relaxadas.

## Resultados

Ver `V19_TESTES.txt` no ZIP (números finais da última execução).

## Pendências reais

- Commit depende de autorização. Integração com `origin/main` continua não autorizada.
- Alerta "Importante" do Dashboard segue no fim da página (contrato v348); subir exige decisão de atualizar esse contrato.
- Matriz anual de Dividendos ainda rola horizontalmente em ~1366px (agora com sombra indicativa); texto de células não foi reduzido abaixo de 12px.
- Rentabilidade/Patrimônio com histórico real e Dashboard com Patrimônio atual conhecido foram vistos só com a fixture (Patrimônio atual aparece "—" por 1 valor indisponível — comportamento correto, não zero).
- Não revisados: Metas/Rebalanceamento/Análise/Configurações além da V18; Importar dados em estados de erro/preview.
- Privacidade validada só em dados sintéticos e nas rotas listadas; não certifica dados reais.
- Screenshots: apenas as 6 finais em `output/v19/evidence/`; `output/v19/work/` é de trabalho e fica fora do Git.
