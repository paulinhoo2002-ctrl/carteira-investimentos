# V17 Handoff — Telas financeiras premium (2026-11-07)

Workspace `C:\Projetos\carteira-investimentos`, branch `feat/v16-premium-redesign`, **HEAD base `17cdf07`** (V16 commitada).
Tudo da V17 está **na working tree, sem commit**. Sem push, merge, rebase, cherry-pick, deploy, reset ou clean. Somente dados sintéticos.
`preview-10-10.html` permanece deletado (estado pré-existente, preservado). Os 15 stashes antigos e a worktree `ux-premium-responsive` não foram tocados.
Backups: `output/v17/backup/index.v16-17cdf07.html` (= HEAD) e `index.v17-wip1.html` (meio da V17). Screenshots: `output/v17/` (ignorado pelo Git).

## Telas

| Tela | O que mudou (somente apresentação) |
|---|---|
| Renda Fixa | KPIs planos em tokens FP (fim do "Capital aplicado" roxo e das cores inline); filtros em sentença com selects sem truncar; linha de posição em 3 zonas (identificação / valores em grade / ações); ações Movimentar (primária), Resgatar, Editar, Detalhes com classes próprias (`premium-rf-act`, sem `.btn`/`.bsv` legados que forçavam cores no tema claro); selos de vencimento e proveniência em tokens semânticos; vencimentos em linha única; acordeões planos; textos ≥12px; bloco legado com `!important` removido |
| Rentabilidade | resultado principal e contexto (base, referência, cobertura) em painéis planos; legenda e gráfico em tokens (benchmark em `--fp-info`); chips de resumo e tabelas ≥12px; células vazias com contraste; **nenhuma série/benchmark inventada** — sem histórico continua "Indisponível" |
| Relatórios | ordem: cabeçalho → inteligência → resumos → gráficos → movimentações → linha do tempo → apoio fiscal V254 → histórico → exportar (o painel fiscal de 1600px deixou de empurrar os gráficos); superfícies escuras legadas (linhas da linha do tempo, mini-cartões, chamada experimental) passam a seguir os tokens e ficam legíveis no tema claro; 0 textos <11px (eram 292) |
| IRPF | cartões de status/resumo, selos, seções e acordeões em tokens; grade de resumo proporcional; rótulos e tabelas ≥12px; título do relatório sem duplicar estilo (`irpf-title--report`) e sem `style` inline; **apuração, regras e textos fiscais intactos** |

## Números (1366px, fixture `tests/helpers/v17-fin-fixture.js`)

| Tela | Textos <11px antes → depois | Cores inline | Gradientes (escuro) |
|---|---|---|---|
| Renda Fixa | 51 → 0 | 4 → 0 | 9 → 0 |
| Rentabilidade | 81 → 0 | 3 → 0 | 0 |
| Relatórios | 292 → 0 | 0 | 14 → 0 |
| IRPF | 143 → 0 | 0 | 6 → 0 |

`!important`: 1007 → 1006 (nenhum novo; bloco legado de Renda Fixa removido).

## Testes

- Novo: `tests/v17-financial-screens.test.js` (registrado no `npm test`): legibilidade/overflow/cores inline/erros de página em 4 viewports×temas, semântica financeira de Renda Fixa (zero legítimo = R$ 0,00, valor ausente = "Atualização necessária", prejuízo com sinal), privacidade e axe nas quatro telas.
- `tests/helpers/v17-fin-fixture.js`: estende a fixture rica com 6 títulos de RF sintéticos (lucro, prejuízo, zero, sem valor atual, vencido, a vencer).
- Resultados finais: ver seção "Resultados" abaixo.

## Achados fora do escopo (não alterados)

1. **Privacidade (corrigido na V17):** com "Ocultar valores", a quantidade de cada posição aparecia em Ativos (tabela e cartões), em Relatórios (tabela fiscal V254, coluna Qtd) e o valor aparecia na identificação das pendências da Auditoria. Corrigido só na camada de apresentação (máscara `••••` com `S.hideValues`), sem tocar Finance Core, persistência nem dados. O teste `fixed-income-total-return-ui.browser.test.js` também tinha um falso positivo ("12⏎Ações": contador de abas + rótulo, separados por quebra de linha); a regex passou a exigir espaço na mesma linha. Regressão coberta por 2 testes novos em `v17-financial-screens.test.js` (o primeiro foi provado falhando sem a correção). Não se declara privacidade certificada: a varredura cobre dados sintéticos e as rotas listadas, não dados reais.
2. Suítes legadas `rf-actions-visual-polish`, `rf-table-width-optimization` e `v215-fixed-income-ui` (alvo de filtros 36px já corrigido para 44px) pertencem ao grupo de 27 falhas pré-existentes da V16.
3. O título "APURAÇÃO DO IR 2026" do módulo `ir2026/ui/readiness.js` é um `div` em caixa alta literal; o único `h1` da página é o "Relatório IRPF". Não alterado (módulo fiscal).
4. Rentabilidade com série histórica real não foi exercitada visualmente (fixture sem valuations datados); só CSS/tokens foram mudados, nenhuma fórmula.

## Resultados

| Verificação | Resultado |
|---|---|
| `npm test` (inclui build) | EXIT=0 · **1243 passam · 0 falham** (1235 da V16 + 8 novos da V17) |
| Axe nas 4 telas × {1366,390} × {escuro,claro} | 0 violações (no `npm test`) |
| Matriz 11 larguras (360–3440 + 911/1093 de zoom 125/150%) × 4 telas × 2 temas | 96 checagens, 0 overflow, 0 erro de página (`output/v17/matrix.js`) |
| Privacidade (valores ocultos) nas 4 telas | 0 valores monetários vazados (sintético; não certifica privacidade real) |
| Varredura de 163 suítes de UI fora do `npm test` | resultado **idêntico à base V16**: 27 falhas pré-existentes, **0 regressões** |

Regressões minhas encontradas e corrigidas durante a V17: (a) alvo de 44px do resumo "Como foi avaliado" e dos filtros; (b) `.premium-rf-page{display:grid}` quebrava a rolagem até o editor de movimentação em 390px (4 suítes `rf-*`) — trocado por flex em coluna; (c) `overflow:hidden` em painéis (quebra `position:sticky`) trocado por `overflow:clip`; (d) título IRPF nível 2 removia o único `h1` (axe) — revertido para nível 1. Acréscimo de acessibilidade: `scroll-padding` em `main.wrap` para o foco não ficar sob cabeçalho/menu fixos.

Screenshots inspecionados em `output/v17/` (prefixos `b*` Renda Fixa, `c*` Rentabilidade, `d*` Relatórios, `e*` IRPF; `f1` final).

## Riscos e próximos passos

- Commit depende de autorização específica; integração com `origin/main` continua não autorizada (branch 8 à frente / 4 atrás, conflitos prováveis em `index.html`).
- Próximo: varredura das suítes de UI legadas, matriz de zoom/larguras, decisão sobre as 27 suítes pré-existentes e sobre o item 1 acima.

## Fechamento controlado

- Mobile 390px (Renda Fixa, formulários de aporte/resgate e Relatórios): alvos de toque ≥40px, sem textos <11px, sem overflow; corrigidos links de Relatórios (15px → 44px) e textos de 9–10px do editor de RF. Observação: o select "Tipo de movimentação" do editor trunca o rótulo em 390px.
- Evidências: seis capturas finais (tema escuro) em `output/v17/final/` e pacote `output/v17/V17_EVIDENCIAS.zip`. A captura mobile de Relatórios está cortada em 6000px de altura.
