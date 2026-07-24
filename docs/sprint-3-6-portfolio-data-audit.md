# Sprint 3.6 - Auditoria de Dados da Carteira

## Resumo executivo

Auditoria tecnica da consistencia dos dados financeiros entre legado, camada moderna e snapshots readonly.

Leitura principal:
- fonte oficial de patrimonio e carteira: `cx()` / `FinanceCore`
- fonte oficial de renda passiva recorrente: `passiveIncomeGoalStats()`
- fonte oficial de historico mensal de proventos: `dividendMonthlyHistoryRows()` + `dividendMonthlyHistoryGroupRows()` + `dividendMonthlyHistorySummary()`
- fonte oficial de ranking de destaque: `dashboardHighlightsRows()`
- fonte oficial de dados readonly modernos: `reportsSnapshot()` + `createReadonlyAssetsViewModel()`
- fonte oficial de auditoria de dados: `dataQualitySnapshot()`

Conclusao resumida:
- nao foi identificado bloqueio P0 imediato.
- houve divergencias P1 entre agregados legados e fontes oficiais atuais, principalmente em proventos e renda fixa.
- ha redundancias P2 entre funcoes que calculam o mesmo dado em caminhos diferentes.
- a camada de auditoria existente e boa base para validacao e deve virar referencia de saneamento.

## Problema auditado

Auditar como os dados financeiros sao calculados, transformados e exibidos em toda a aplicacao, sem corrigir nada nesta fase.

Escopo observado:
- Dashboard
- Patrimonio
- Ativos
- Renda Fixa
- Dividendos
- Aportes
- Rentabilidade
- Relatorios
- camada moderna readonly
- camada legado
- snapshots readonly
- bridges entre legado e moderno

## Inventario de entidades

| Entidade | Origem | Formato | Obrigatorios | Opcionais | Legados | Fallback | Consumidor principal |
|---|---|---|---|---|---|---|---|
| `S.assets` | estado global legado | array de ativos | ticker, tipo, quantidade ou valor financeiro util, categoria/sector quando usado | preco medio, preco atual, DY, moeda, campos RF | muitos campos antigos e aliases de importacao | `FinanceCore`, `metaTicker`, `normalizeType`, `rfValues` | Dashboard, Ativos, Renda Fixa, Patrimonio, Relatorios, auditoria |
| `S.proventos` | estado global legado | array de proventos | ticker, data oficial, value | type, sourceEventKind, status, note, currency, assetName | campos mistos de importacao e cadastro manual | `proventoDividendPaymentDate`, `proventoTipoCanonical`, `passiveIncomeCombinedRows` | Dividendos, Meta de renda passiva, Relatorios, auditoria |
| `S.aportes` | estado global legado | array de movimentos | date, value/totalValue, operationType/operation/op | ticker, qty, unitPrice, currency, origin | aliases antigos de importacao | `isNeutralMovement`, `patrimonySnapshot`, `reportsSnapshot` | Patrimonio, Relatorios, auditoria |
| `S.goals` | estado global legado | objeto | patrimonio.target, proventos.monthly quando configurados | allocation, outros metadados | estrutura antiga compatibilizada por `normalizeGoals()` | defaults visuais em metas | Dashboard, Metas financeiras, auditoria |
| `S.rfEvents` | estado global legado | array de eventos RF | date, ticker/assetId, grossValue/netValue | ir, iof, principalDelta, note, importRef | eventos antigos e seeds | `normalizeRfEvents`, `rfEventTotals` | Renda Fixa, Relatorios, auditoria |
| `cx()` | calculo central de carteira | objeto resumido | usa `S.assets` | nenhum | depender de aliases de ativos | `FinanceCore` | Dashboard, Patrimonio, Metas, Relatorios |
| `dashboardSnapshot()` | snapshot do Dashboard | objeto agregado | `cx()`, resumo de proventos, ativos | categorias e metas | mistura dados de varias areas | `cx()`, `passiveIncomeGoalStats()`, `financialGoalsSnapshot()`, `assetAnalysisRows()` | Dashboard |
| `patrimonySnapshot()` | snapshot de patrimonio | objeto com evolucao | `cx()`, `S.aportes` | horizonte, rentabilidade | leitura historica antiga | `cx()` | Patrimonio |
| `reportsSnapshot()` | snapshot readonly de relatorios | objeto readonly | `cx()`, `passiveIncomeGoalStats()`, `rfIntelligenceSnapshot()`, `dataAuditSnapshot()` | periodos filtrados | adaptacao de legado para moderno | fallback readonly | Relatorios modernos e legado |
| `financialGoalsSnapshot()` | snapshot de metas | objeto readonly | `cx()`, `normalizeGoals()`, historico mensal de dividendos | metas sugeridas | depende do mesmo patrimonio usado no Dashboard | `cx()`, `dividendMonthlyHistoryRows()` | Metas financeiras |
| `dataQualitySnapshot()` | auditoria de qualidade | objeto de diagnostico | entidades de ativos, proventos, RF, aportes e metas | severidade e contadores | agregacao nova sem persistencia | nenhuma, apenas leitura | Tela de auditoria |
| `ReadOnlyReportsSnapshot` | contrato moderno readonly | snapshot tipado | items com ticker, nome, categoria, quantidade, preco, variacao, alocacao, trend | generatedAt, notice | bridge com o legado | fallback vazio congelado | `AssetsReadonlyPage` |
| `ReadonlyAsset`/`ReadonlyAssetsViewModel` | modelo moderno readonly | view model derivado | items filtrados e ordenados | categorias, distribuicao, resumo | somente leitura, sem persistencia | snapshot de fallback | `AssetsReadonlyPage` |

## Inventario de calculos

| Calculo | Funcao oficial | Entrada | Saida | Formula | Arredondamento | Ausente / zero / NaN | Telas |
|---|---|---|---|---|---|---|---|
| Valor aplicado da carteira | `cx()`, `assetAppliedValue()`, `FinanceCore.assetAppliedValue()` | `S.assets` + campos RF | total aplicado | soma de valor aplicado por ativo | sem arredondamento no nucleo; formatacao na view | zero valido; ausente vira 0 ou `null` conforme ativo | Dashboard, Patrimonio, Ativos, Relatorios |
| Valor atual da carteira | `cx()`, `assetCurrentValue()`, `FinanceCore.assetCurrentValue()` | `S.assets` + campos RF | total atual | soma de valor atual por ativo | idem | zero valido; ausente pode virar `null` em RF e 0 na soma | Dashboard, Patrimonio, Ativos, Relatorios |
| Resultado financeiro | `cx().tG`, `calculateReadonlyAssetResult()`, `assetAnalysisRows()` | aplicado + atual | ganho/perda | atual - aplicado | formatacao na view | zero valido; NaN evitado pelo filtro de numeros | Dashboard, Ativos, Relatorios, readonly |
| Rentabilidade percentual | `cx().tGP`, `assetRentabPct()`, `calculateReadonlyAssetRentabilityPct()` | aplicado + atual | percentual | resultado / aplicado * 100 | formatacao com 2 casas | zero aplicado devolve 0 ou `null` no caso especifico | Dashboard, Ativos, readonly |
| Patrimonio total | `cx().tC` | `S.assets` | valor atual total | soma de `assetCurrentValue` | sem arredondamento no nucleo | zero real aceito | Dashboard, Patrimonio, Metas, Relatorios |
| Patrimonio por categoria | `dashboardSnapshot()`, `createReadonlyAssetsViewModel().distribution` | carteira atual / snapshot readonly | distribuicao agregada | soma por categoria | percentual exibido com 1 ou 2 casas | categorias vazias ignoradas | Dashboard, readonly |
| Renda fixa bruta / liquida / IR / IOF | `rfValues()`, `rfEventTotals()`, `rfIncomeByAsset()`, `rfIntelligenceSnapshot()` | `S.assets`, `S.rfEvents` | totais por titulo e carteira | resolucao por aplicado, bruto, liquido, eventos | formatacao monetaria | zero valido; faltante vira fallback controlado | Renda Fixa, Relatorios, auditoria |
| Dividendos mensais | `dividendMonthlyHistoryRows()`, `dividendMonthlyHistoryGroupRows()` | `S.proventos` | linhas mensais e agrupadas | filtragem por data oficial, ticker e tipo | soma mensal sem arredondamento interno | zero e ausente tratados de forma distinta | Dividendos, Metas, Relatorios |
| Dividendos acumulados | `dividendMonthlyHistorySummary()` | grupos mensais | total, media, melhor mes | soma dos meses filtrados | formatacao na view | sem base retorna `null` para media | Dividendos |
| Media mensal de dividendos | `passiveIncomeGoalStats()` | `passiveIncomeCombinedRows()` | media 12M | total12 / 12 | formatacao na view | sem dados fica 0, mas com `hasData=false` | Dashboard, Metas, Relatorios |
| Projecao anual de renda passiva | `passiveIncomeGoalStats()` | media mensal 12M | projeção anual | media mensal * 12 | formatacao na view | sem meta ou sem dados mantem leitura neutra | Dashboard, Metas |
| Aportes mensais e total aportado | `patrimonySnapshot()` | `S.aportes` | serie mensal e acumulado | soma mensal e cumulativa | formatacao na view | movimentos neutros ignorados; zero valido | Patrimonio |
| Rebalanceamento / aporte sugerido | `prudentContributionAnalysis()` | `assetAnalysisRows()`, metas de alocacao | sinal por ativo/categoria | score ponderado, meta x real | formatacao na view | dados insuficientes retornam neutro | Dashboard, sugestoes |
| Maiores altas / baixas | `dashboardHighlightsRows()` | `assetAnalysisRows()` | lista ordenada | pct, depois impacto absoluto, depois ticker | formatacao na view | sem performance ou zero sai da lista | Dashboard |
| Maiores posicoes | `dashboardSnapshot()` / `createReadonlyAssetsViewModel()` | carteira / snapshot readonly | ranking por valor | currentValue desc | formatacao na view | item invalido sai fora | Dashboard, readonly |
| Auditoria de dados | `dataQualitySnapshot()` | ativos, proventos, RF, aportes, metas | issues, counts, score | classificacao por severidade | sem arredondamento financeiro | zero nao e erro; ausente e invalido sao separados | Auditoria |

## Matriz de consistencia

| Metrica | Fonte oficial recomendada | Dashboard | Patrimonio | Ativos | Renda Fixa | Dividendos | Rentabilidade | Relatorios | Divergencia | Risco |
|---|---|---|---|---|---|---|---|---|---|---|
| Patrimonio total | `cx().tC` | usa | usa via `patrimonySnapshot()` | indireto | indireto | nao usa | usa | usa | baixa | media se derivado por caminho paralelo |
| Total de ativos de mercado | `S.assets.length` / `assetAnalysisRows().length` | usa total da carteira | nao foco | usa filtrado | exclui RF | nao usa | usa como base indireta | usa | media, porque Ativos pode filtrar | media |
| Total de renda fixa | `rfIntelligenceSnapshot().assets.length` | usa no resumo RF | nao foco | exclui da lista principal | usa | nao usa | indireto | usa | baixa a media, depende do filtro | media |
| Valor aplicado | `cx().tI` | usa | usa | usa por ativo | usa via RF | nao usa | usa | usa | baixa | alta se caminho ignorar RF |
| Valor atual | `cx().tC` / `assetCurrentValue()` | usa | usa | usa por ativo | usa via regra RF | nao usa | usa | usa | media, por fallback de RF | alta |
| Resultado financeiro | `cx().tG` / `calculateReadonlyAssetResult()` | usa | usa | usa por ativo | usa | nao usa | usa | usa | media, por diferente granularidade | alta |
| Rentabilidade | `cx().tGP` / `assetRentabPct()` | usa | usa | usa por ativo | usa via RF | nao usa | usa | usa | media, por base/proporcao diferente | alta |
| Dividendos recebidos | `passiveIncomeGoalStats()` para 12M; `dividendMonthlyHistorySummary()` para historico completo | usa 12M | indireto | nao usa | exclui RF da renda recorrente | usa | nao usa | usa 12M | media/alta, porque ha 2 horizontes oficiais | alta |
| Media mensal de dividendos | `passiveIncomeGoalStats().monthlyAvg` | usa 12M | indireto | nao usa | nao usa | usa historico | nao usa | usa 12M | media, porque historico completo calcula outra media | media |
| Quantidade de ativos | `S.assets.length` / `createReadonlyAssetsViewModel().itemCount` | usa carteira | indireto | usa filtrado | usa subset RF | nao usa | usa base de carteira | usa | media, porque filtro muda contagem | baixa |
| Distribuicao por categoria | `dashboardSnapshot()` / `createReadonlyAssetsViewModel().distribution` | usa | nao foco | usa readonly | exclui RF da lista principal | nao usa | usa indireto | usa | media, por contratos diferentes entre legado e readonly | media |

Leitura da matriz:
- Dashboard, Patrimonio, Ativos e Relatorios estao razoavelmente alinhados quando usam `cx()`, `assetAnalysisRows()` e `passiveIncomeGoalStats()`.
- A maior divergencia real esta entre `proventoStats()` e as fontes oficiais de renda passiva / historico mensal.
- Renda fixa tem varios caminhos oficiais validos, mas precisam ser lidos com cuidado para nao misturar aplicado, liquido, bruto e eventos.

## Casos de teste auditados

| Caso | Cobertura atual | Observacao |
|---|---|---|
| Ativo positivo | `assetAnalysisRows()`, `dashboardHighlightsRows()` | entra em altas e relatorios |
| Ativo negativo | `assetAnalysisRows()`, `dashboardHighlightsRows()` | entra em baixas se `pct < 0` |
| Ativo zerado | `assetAnalysisRows()`, `calculateReadonlyAssetResult()` | zero valido, mas pode sair de rankings se sem performance |
| Ativo sem cotacao | `assetAnalysisRows()`, `assetCurrentValue()` | precisa cair em fallback seguro |
| Ativo sem preco medio | `assetAnalysisRows()`, `financialGoalsHasPortfolioData()` | risco de leitura incompleta, nao deve virar zero falso |
| Ativo com quantidade zero | `assetAnalysisRows()` | mantem coerencia se resultado for zero |
| Ativo com quantidade invalida | `dataQualityAnalyzeAssets()` | deve virar critico na auditoria |
| Ticker duplicado | `dataQualityAnalyzeAssets()`, `dataQualityAnalyzeProventos()` | duplicidade conservadora |
| Ativo legado sem campos novos | `legacy/reports-readonly-source.js`, `hostLegacyReportsReadonlySource.ts` | bridge precisa manter compatibilidade |
| Renda fixa sem valor liquido | `rfValues()`, `rfIntelligenceSnapshot()` | fallback para bruto/aplicado |
| Renda fixa com fallback para bruto | `rfValues()` | leitura valida, mas precisa estar explicita |
| Renda fixa sem vencimento | `rfIntelligenceSnapshot()`, `dataQualityAnalyzeAssets()` | alerta de atençao |
| Renda fixa indisponivel | `rfIntelligenceSnapshot()`, `dataQualityAnalyzeAssets()` | warning / alerta, nao erro fatal |
| Dividendos duplicados | `dividendMonthlyHistoryRows()`, `dataQualityAnalyzeProventos()` | auditoria detecta, historico agrupa pela chave correta |
| Dividendos sem data | `dividendMonthlyHistoryRows()`, `dataQualityAnalyzeProventos()` | excluido do historico e apontado na auditoria |
| Dividendos com valor zero | `dividendMonthlyHistoryRows()`, `dividendMonthlyHistorySummary()` | excluido da soma mensal; zero real preservado como dado valido em auditoria |
| Lancamentos antigos | `dividendMonthlyHistoryRows()`, `passiveIncomeGoalStats()` | entram se data valida e nao futura |
| Campos string em vez de numero | `dataQualityNumberState()` | parser dedicado para classificar e nao confundir ausente com zero |
| Valores com virgula | `dataQualityNumberState()` | tratados na classificacao numerica |
| NaN | `dataQualityNumberState()` | classificado como invalido |
| null | `dataQualityNumberState()` | classificado como ausente |
| undefined | `dataQualityNumberState()` | classificado como ausente |
| Carteira vazia | `cx()`, `reportsSnapshot()`, `dataQualitySnapshot()` | superfices precisam mostrar estado neutro, nao erro |

## Fontes oficiais recomendadas

### Patrimonio
- Fonte oficial: `cx()`
- Funcoes dependentes: `patrimonySnapshot()`, `dashboardSnapshot()`, `financialGoalsSnapshot()`, `reportsSnapshot()`
- Regra: usar o total calculado por `assetCurrentValue()` e o aplicado por `assetAppliedValue()`

### Ativos de mercado
- Fonte oficial: `assetAnalysisRows()`
- Analise readonly: `createReadonlyAssetsViewModel()`
- Regra: resultado e rentabilidade devem vir do mesmo nucleo de calculo, sem copia paralela

### Renda fixa
- Fonte oficial: `rfValues()` + `rfIntelligenceSnapshot()`
- Eventos oficiais: `rfEventTotals()` / `rfIncomeByAsset()`
- Regra: deixar claro quando o valor atual vem de liquido, bruto ou aplicado

### Dividendos / proventos
- Fonte oficial para historico mensal: `dividendMonthlyHistoryRows()` + `dividendMonthlyHistoryGroupRows()` + `dividendMonthlyHistorySummary()`
- Fonte oficial para renda passiva do Dashboard: `passiveIncomeGoalStats()`
- Regra: `proventoStats()` e `proventoResumo()` agora reutilizam o historico mensal oficial para manter compatibilidade com consumidores antigos

### Relatorios
- Fonte oficial: `reportsSnapshot()`
- Regra: ele agrega `cx()`, renda passiva, renda fixa e auditoria, mas nao deve recalcular sozinho dados ja oficiais

### Auditoria
- Fonte oficial: `dataQualitySnapshot()`
- Regra: diagnosticar, nao corrigir

## Compatibilidade com legado

Onde o legado ainda e fonte de verdade:
- `S.assets`
- `S.proventos`
- `S.aportes`
- `S.goals`
- `S.rfEvents`

Onde o moderno apenas le:
- `createReadonlyAssetsViewModel()`
- `reportsReadonlyContract.mjs`
- `AssetsReadonlyPage`
- bridges readonly de reports e renda fixa

Onde existe duplicacao:
- `proventoStats()` versus `passiveIncomeGoalStats()` versus `dividendMonthlyHistorySummary()`
- `assetAnalysisRows()` versus `assetPerformanceOverviewRows()`
- `cx()` versus snapshots derivados sem legenda clara
- `rfValues()` versus `rfIntelligenceSnapshot()` versus caminhos de exibiçao em Ativos

Onde existe fallback:
- snapshots readonly vazios e congelados
- RF com valor atual ausente
- patrimonio sem campos suficientes para leitura confiavel

Campos que nao podem ser removidos sem migracao:
- aliases antigos de RF (`rf_*`, `fixed_*`, `appliedValue`, `currentValue`, `initialValue`, `liquidValue`, `grossValue`)
- campos legados de proventos (`sourceEventKind`, `excludedFromIncomeTotals`, `status`, `state`, `received`, `paid`, `future`, `scheduled`)
- campos de movimentos (`operationType`, `operation`, `op`, `totalValue`, `value`)

## Riscos financeiros

| Gravidade | Problema | Onde ocorre | Impacto | Recomendacao |
|---|---|---|---|---|
| Alto | `proventoStats()` soma tudo sem o mesmo filtro do historico oficial | `index.html` | pode divergir de renda passiva e historico mensal se usado na superficie errada | manter apenas como utilitario legado; preferir `passiveIncomeGoalStats()` e `dividendMonthlyHistory*()` |
| Alto | RF pode mostrar valores diferentes conforme explicitacao de liquido/bruto/aplicado | `rfValues()`, `rfIntelligenceSnapshot()`, Ativos, Relatorios | mesmo titulo pode parecer diferente entre telas | sempre rotular a origem do valor atual e manter uma fonte oficial por superficie |
| Alto | resultado/rentabilidade podem ser recalculados por caminhos paralelos | `cx()`, `assetAnalysisRows()`, readonly | risco de divergencia visual e numerica | centralizar em `FinanceCore` e em um unico view model por surface |
| Medio | media 12M e media de historico completo usam horizontes diferentes | Dividendos, Dashboard, Relatorios | usuario pode achar que os numeros estao conflitantes | sempre rotular o horizonte (12M, historico completo, periodo filtrado) |
| Medio | contagem de ativos muda entre carteira total e visoes filtradas | Ativos, readonly | comparacoes diretas podem confundir | separar "total da carteira" de "itens filtrados" |
| Medio | bridge readonly depende de normalizacao e categorias demo | modern reports | se a origem mudar, a leitura pode escapar do contrato | manter contrato readonly estrito e testes de paridade |
| Medio | `dataQualitySnapshot()` nao corrige dados e pode ser ignorada | auditoria | problemas continuam se nao houver processo posterior | tratar auditoria como gate de analise e backlog |
| Baixo | diferentes labels para a mesma ideia ("Valor atual", "Valor da posicao", "Preco atual") | Ativos / Renda Fixa / docs | risco de ambiguidade de leitura | padronizar nomenclatura conforme o contexto financeiro |

## Plano de correcao por prioridade

1. Padronizar fontes de renda passiva:
   - `passiveIncomeGoalStats()` para Dashboard
   - `dividendMonthlyHistoryRows()` + grupo + resumo para historico
   - evitar `proventoStats()` em superfices novas

2. Padronizar leitura de RF:
   - explicitar sempre se o valor exibido e bruto, liquido ou aplicado
   - manter `rfValues()` como nucleo unico
   - evitar dupla interpretacao em Ativos, Relatorios e Renda Fixa

3. Reduzir duplicacao de calculos:
   - revisar `assetAnalysisRows()` versus `assetPerformanceOverviewRows()`
   - revisar `proventoResumo()` versus `proventoStats()`

4. Manter compatibilidade de legado:
   - preservar aliases antigos
   - nao remover campos antigos sem migracao
   - reforcar bridges readonly com testes

5. Usar auditoria como criterio de qualidade:
   - `dataQualitySnapshot()` deve ser a base para identificar inconsistencias antes de novas fases

## Fora do escopo desta fase

- nao corrigir dados automaticamente
- nao alterar `index.html`
- nao alterar Firebase
- nao alterar schema
- nao alterar persistencia
- nao alterar dependencias
- nao alterar `modern/dist`
- nao migrar telas
- nao criar nova formula financeira

## Proximos passos

1. Validar esta auditoria com a regua de qualidade do projeto.
2. Separar backlog por risco:
   - P1: divergencias de renda passiva e renda fixa
   - P2: duplicacao de calculos e labels
3. Depois da aprovacao, abrir fase de correcao minima por area, uma por vez.

## Conclusao

Auditoria concluida.
Fontes oficiais identificadas.
Divergencias mapeadas.
Riscos priorizados.
Sem alteracao funcional nesta etapa.

## Sprint 3.6.1 - Consistencia de Proventos

### Causa da divergencia

- `proventoStats()` somava proventos de forma ampla e podia divergir do historico mensal oficial.
- `proventoResumo()` tambem operava sobre o array bruto e mantinha a mesma fonte paralela.
- o resumo do Dashboard usava esses valores em trechos legados, enquanto o historico mensal e a meta 12M usavam a fonte oficial.

### Fonte oficial

- Historico completo: `dividendMonthlyHistoryRows()` -> `dividendMonthlyHistoryGroupRows()` -> `dividendMonthlyHistorySummary()`
- Horizonte 12M: `passiveIncomeGoalStats()`

### Funcoes alteradas

- `proventoStats()`
- `proventoResumo()`
- `dividendMonthlyHistoryRows()`
- `passiveIncomeDividendSummaryBlock()`
- `dashboardFinancialGoalsPanel()`
- `tests/phase-208-data-quality.test.js`

### Compatibilidade preservada

- `proventoStats()` manteve a saida `mes`, `ano` e `total`.
- `proventoResumo()` manteve `meses` e `anos` para consumidores legados.
- nenhuma API publica nova foi exigida.
- consumidores antigos continuam lendo os mesmos campos.

### Horizontes oficiais

- `Total historico` e `Media mensal historica` agora seguem o historico mensal oficial.
- `Total nos ultimos 12 meses` e `Media mensal nos ultimos 12 meses` continuam vindo de `passiveIncomeGoalStats()`.
- `Melhor mes historico` vem do mesmo resumo oficial.

### Testes

- igualdade entre `proventoStats()` e o resumo mensal oficial;
- igualdade entre `proventoResumo().summary` e `dividendMonthlyHistorySummary()`;
- exclusao de registros invalidos, futuros e fora do contrato oficial;
- labels sem ambiguidade de horizonte;
- compatibilidade com consumidores existentes.

### Riscos remanescentes

- Renda Fixa continua fora desta correcao.
- `proventoResumoTipos()` e `proventoResumoPorAtivo()` ainda usam o array bruto legado e podem ser revisados numa etapa futura se virarem fonte de divergencia.

### Fora de escopo

- nenhuma correcao em Renda Fixa
- nenhum ajuste em schema
- nenhuma alteracao em Firebase ou persistencia
- nenhuma dependencia nova

## Sprint 3.6.2 - Fonte oficial de Renda Fixa

### Problema confirmado

- `rfValues()` usava fallback amplo demais e misturava fonte explicita, valor legado e ausencia na mesma leitura.
- `assetRfCurrentValueMeta()`, `assetNeedsRFUpdate()`, `rfIntelligenceSnapshot()` e `dataQualityAnalyzeAssets()` podiam enxergar a mesma posicao com legendas diferentes.
- `rf_applied_value`, `rf_liquid_value`, `rf_gross_value` e `current_price` precisavam de uma leitura oficial unica, sem mascarar a ausencia real.

### Fonte oficial

- Helper novo: `fixedIncomeOfficialValues()`
- Alias compativel: `rfValues()`
- Rotina de rotulo: `assetRfCurrentValueMeta()`
- Rotina de alerta: `assetNeedsRFUpdate()`
- Consumidores diretos: `assetAppliedValue()`, `assetCurrentValue()`, `assetJurosValue()`, `assetRentabPct()`, `cx()`, `rfIntelligenceSnapshot()`, `reportsSnapshot()` e `dataQualitySnapshot()`

### Ordem oficial de leitura

1. valor aplicado informado
2. valor aplicado legado
3. valor aplicado derivado de quantidade x preco medio
4. valor liquido informado
5. valor liquido legado
6. valor bruto informado
7. valor bruto legado
8. valor atual informado / current_price legado
9. valor aplicado como fallback de compatibilidade quando nao ha fonte atual explicita

### Comportamento de valor indisponivel

- zero aplicado continua valido;
- valor atual sem fonte explicita continua como atualizacao necessaria;
- fonte atual explicita vence o fallback;
- campos invalidos e ausentes nao entram na leitura oficial;
- Renda Fixa continua fora do historico de dividendos.

### Funcoes alteradas

- `fixedIncomeOfficialValues()`
- `rfValues()`
- `assetRfCurrentValueMeta()`
- `assetNeedsRFUpdate()`
- `dataQualityAnalyzeAssets()`
- `tests/phase-208-data-quality.test.js`

### Compatibilidade preservada

- `FinanceCore` continua recebendo `rfValues()`
- consumidores antigos continuam recebendo `applied`, `current`, `profit` e `rentab`
- nenhuma API publica nova foi exigida
- nenhum schema novo
- nenhuma alteracao em Firebase ou persistencia

### Testes

- helper oficial parseia strings com ponto, virgula e agrupamento
- `rfValues()` continua alias compativel
- zero aplicado nao vira erro
- valor atual sem fonte explicita segue como alerta
- resumo, metas e relatorios continuam coerentes com a mesma fonte
- 98 testes aprovados

### Riscos remanescentes

- registros antigos com `current_price` zerado continuam tratados como sem fonte atual explicita
- `dataQualityAnalyzeRfEvents()` e `rfEventTotals()` continuam como trilha separada de eventos

## Sprint 3.6.4 - Limpeza gradual de duplicacoes legadas

### Funcoes encontradas

- `proventoResumoTipos()`
- `proventoResumoPorAtivo()`
- `proventoResumo()`
- `proventoResumoPorTipo()`
- `proventoResumoMensalTipos()`
- `proventoRankingPagadores()`
- `proventoHistoricoOficial()`
- `dividendMonthlyHistoryRows()`
- `dividendMonthlyHistoryGroupRows()`
- `dividendMonthlyHistorySummary()`

### Classificacao

- Fonte oficial: `dividendMonthlyHistoryRows()` -> `dividendMonthlyHistoryGroupRows()` -> `dividendMonthlyHistorySummary()`
- Alias compativel: `proventoResumo()`
- Consumidor: `proventoRankingPagadores()`
- Duplicacao reduzia: `proventoResumoTipos()` e `proventoResumoPorAtivo()` agora derivam do historico oficial
- Candidatas a remocao futura: `proventoResumoMensalTipos()` e `proventoResumoPorTipo()`

### Riscos

- `proventoResumoMensalTipos()` ainda mantem leitura legada do array bruto.
- `proventoResumoPorTipo()` ainda mantem leitura legada do array bruto.
- qualquer futuro ajuste em labels ou ordenacao desses resumos deve preservar a mesma fonte oficial.

### Ordem sugerida de limpeza

1. validar caracterizacao dos dois resumos migrados;
2. monitorar paridade com `proventoResumo()` e `proventoRankingPagadores()`;
3. revisar `proventoResumoMensalTipos()`;
4. revisar `proventoResumoPorTipo()`.

### Testes

- caracterizacao dos resumos de tipo e por ativo via historico oficial;
- preservacao de shape, labels, fallbacks e ordenacao;
- ignorancia de `S.proventos` bruto nas duas funcoes migradas;
- paridade com dados oficiais stubados;
- suite geral mantida verde com 98 testes aprovados.

### Arquivos envolvidos

- `index.html`
- `tests/phase-208-data-quality.test.js`

### Fora do escopo

- `passiveIncomeGoalStats()`
- `assetPerformanceOverviewRows()`
- `reportsSnapshot()`
- `modern/src`
- `modern/dist`
- Firebase
- schema
- persistencia

## Sprint 3.6.5 - Paridade de performance de ativos

### Problema original

- `assetAnalysisRows()` era a fonte oficial da analise de ativos.
- `assetPerformanceOverviewRows()` ainda mantinha pipeline proprio para os mesmos valores de desempenho.
- isso abria risco de divergencia em valor aplicado, valor atual, ganho/perda, rentabilidade e ordenacao.

### Funcoes auditadas

- `assetAnalysisRows()`
- `assetPerformanceOverviewRows()`
- `assetPerformanceOverviewPanel()`
- `dashboardHighlightsRows()`
- `dashboardFinancialGoalsPanel()`
- `reportsSnapshot()`
- `createReadonlyAssetsViewModel()`

### Consumidores

- `assetPerformanceOverviewPanel()`
- `dashboardHighlightsRows()`
- `dashboardHomeHighlightsPanel()`
- `reportsSnapshot()`
- `createReadonlyAssetsViewModel()`
- testes da fase 202
- testes de destaques
- testes readonly

### Matriz de paridade

Metrica | assetAnalysisRows() | assetPerformanceOverviewRows() | Divergencia | Fonte oficial
---|---|---|---|---
ticker | sim | sim | nao | `assetAnalysisRows()`
nome | nao exposto | sim | shape apenas | `assetPerformanceOverviewRows()`
tipo | sim | sim | nao | `assetAnalysisRows()`
quantidade | nao exposto | nao exposto | nao | `assetPerformanceOverviewRows()`
preco medio | nao exposto | nao exposto | nao | `assetPerformanceOverviewRows()`
preco atual | nao exposto | nao exposto | nao | `assetPerformanceOverviewRows()`
valor aplicado | sim | sim | nao | `assetAnalysisRows()`
valor atual | sim | sim | nao | `assetAnalysisRows()`
ganho/perda | sim | sim | nao | `assetAnalysisRows()`
rentabilidade percentual | sim | sim | nao | `assetAnalysisRows()`
participacao | sim | sim | nao | `assetAnalysisRows()`
posicao positiva/negativa | nao exposto | sim | shape apenas | `assetPerformanceOverviewRows()`
ordenacao | nao exposto | sim | nao | `assetPerformanceOverviewRows()`
ativo sem preco | sim | sim | nao | `assetPerformanceOverviewRows()`
ativo sem quantidade | sim | sim | nao | `assetPerformanceOverviewRows()`
ativo com zero real | sim | sim | nao | `assetPerformanceOverviewRows()`
ativo invalido | filtrado | sem leitura | shape apenas | `assetPerformanceOverviewRows()`

### Fonte oficial confirmada

- `assetAnalysisRows()` permanece como fonte oficial para os calculos de mercado.
- `assetPerformanceOverviewRows()` agora adapta o shape legada a partir das linhas oficiais.

### Contratos preservados

- nome da funcao mantido;
- tipo de retorno mantido;
- classificacao de ganho/perda mantida;
- compatibilidade com `assetPerformanceOverviewPanel()` mantida;
- carteira vazia continua valida;
- ativos invalidos continuam sem leitura confiavel;
- zero real continua valido;
- nenhum `NaN` ou `Infinity` exposto.

### Estrategia de adaptacao

- reutilizar `assetAnalysisRows()` como base oficial;
- adaptar apenas o shape exigido pela UI legada;
- preservar estados de dados insuficientes;
- manter ordenacao e filtros existentes do painel.

### Testes

- caracterizacao de paridade entre linhas oficiais e adaptacao legada;
- preservacao de zero real;
- preservacao de rows incompletos;
- painel legado continua funcionando;
- dashboardHighlightsRows() continua usando a fonte oficial da analise;
- reportsSnapshot() e readonly moderno sem regressao;
- suite geral mantida verde.

### Compatibilidade legada

- `assetPerformanceOverviewRows()` mantida;
- `assetPerformanceOverviewPanel()` mantido;
- `dashboardHighlightsRows()` sem regressao;
- `reportsSnapshot()` sem recalculo paralelo novo;
- `createReadonlyAssetsViewModel()` sem alteracao.

### Riscos remanescentes

- a semantica de estados incompletos continua dependente das chaves oficiais do legado;
- `assetPerformanceOverviewRows()` ainda precisa conviver com o painel legado ate futura limpeza;
- qualquer mudanca futura em `assetAnalysisRows()` exige revalidacao da adaptacao.

### Ordem sugerida de limpeza

1. manter a analise canonica em `assetAnalysisRows()`;
2. monitorar o painel legado de desempenho;
3. revisar futuros consumidores que ainda dependam do shape antigo;
4. evitar remover a API publica nesta fase.

### Arquivos envolvidos

- `index.html`
- `tests/phase-202-assets-performance-overview.test.js`
- `docs/sprint-3-6-portfolio-data-audit.md`

### Fora do escopo

- `reportsSnapshot()`
- `createReadonlyAssetsViewModel()`
- `modern/src`
- `modern/dist`
- Firebase
- schema
- persistencia
