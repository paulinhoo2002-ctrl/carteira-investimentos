# Fase 204B - Historico mensal premium de dividendos

## Objetivo

Melhorar a visualizacao do historico mensal de proventos efetivamente recebidos, com bloco aberto por padrao, consolidacao mensal real, filtros simples e expansao progressiva.

## Inventario tecnico

- `S.proventos`
- `proventoDividendPaymentDate()`
- `proventoStats()`
- `proventoResumo()`
- `dividendMonthlyHistoryRows()`
- `dividendMonthlyHistoryOptions()`
- `dividendMonthlyHistoryFilterRows()`
- `dividendMonthlyHistoryGroupRows()`
- `dividendMonthlyHistorySummary()`
- `dividendMonthlyHistoryComparisonText()`
- `dividendMonthlyHistoryEntry()`
- `dividendMonthlyHistoryToggleMonth()`
- `setDividendMonthlyHistoryPeriod()`
- `setDividendMonthlyHistoryTicker()`
- `setDividendMonthlyHistoryType()`
- `setDividendMonthlyHistoryLimit()`
- `clearDividendMonthlyHistoryFilters()`
- `dividendMonthlyHistoryPremium()`
- `dividendMonthlyTableBlock()`

## Fonte oficial

- dados base: `S.proventos`
- data oficial usada: resultado de `proventoDividendPaymentDate()`
- valor oficial: `value` valido e finito
- ticker oficial: `ticker`
- tipo oficial: `eventType` ou `type`, normalizado por `proventoTipoCanonical()`
- somente recebidos entram na consolidacao mensal
- proventos futuros, previstos, estimados ou de renda fixa ficam fora
- nao existe status persistido separado para previsto/recebido nesta fonte; o contrato oficial usa a data de pagamento nao futura e as exclusoes oficiais

## Data oficial usada

A consolidacao mensal usa a data oficial de recebimento definida por `proventoDividendPaymentDate()`, na ordem:

1. `dataPagamento`
2. `paymentDate`
3. `pagamento`
4. `data`
5. `date`

Se nenhuma dessas datas for valida, o lancamento fica fora do historico mensal.

## Regras de inclusao e exclusao

- somente lancamentos realmente recebidos entram no bloco principal
- valor ausente nao vira zero
- zero real continua zero
- data invalida nao entra
- data futura nao entra
- lancamentos de renda fixa nao entram no historico mensal premium
- meses vazios nao sao inventados
- dados invalidos nao quebram a tela

## Agrupamento mensal

- agrupamento por mes real da data oficial de recebimento
- ordenacao do mes mais recente para o mais antigo
- exibicao inicial limitada aos 6 meses mais recentes com dados reais
- botao `Mostrar mais` expande em blocos de 6 meses
- botao `Mostrar menos` retorna ao limite inicial

## Zero versus ausente

- zero real e mantido
- valor ausente e descartado
- total mensal nunca usa valor ausente convertido para zero
- comparacao com mes anterior evita divisao por zero

## Tratamento de moeda

- usa o tratamento oficial ja existente no projeto
- nao faz conversao nova
- nao mistura moedas sem suporte oficial
- se houver incompatibilidade, o lancamento fica explicitamente fora da consolidacao mensal

## Filtros

- periodo
- ativo
- tipo de provento, quando confiavel
- combinacao de filtros sem recarregar a pagina
- limpeza por `Limpar filtros`
- estado vazio proprio para filtro sem resultado

## Expansao

- cada mes pode ser expandido sem recarregar
- usa `aria-expanded`
- usa `aria-controls` quando viavel
- foco visivel
- interacao por teclado
- mostra ticker, tipo, data oficial, valor e observacao quando existir

## Comparacao mensal

- compara somente meses reais consecutivos
- nao inventa mes ausente
- quando o mes anterior tem total zero, a comparacao fica neutra sem percentual enganoso
- difere em reais e percentual apenas quando ha base valida

## Estados vazios

- `Nenhum provento recebido ainda.`
- `Nenhum recebimento encontrado para os filtros selecionados.`

## Acessibilidade

- bloco aberto por padrao
- controles com semantica clara
- labels visiveis
- foco visivel
- navega por teclado

## Responsividade

- 390px: uma coluna e sem overflow horizontal
- 768px: leitura confortavel e expansao contida
- 1366px: densidade equilibrada
- 1920px: aproveitamento amplo sem linhas excessivamente longas

## Performance

- consolidacao unica por renderizacao
- sem timer novo
- sem observador novo
- renderizacao inicial limitada
- sem biblioteca nova

## Riscos

- sobrescrever a leitura com regra paralela de media ou consolidacao
- overflow em 768px se a expansao crescer demais
- confusao entre recebido real e dado previsto se um filtro falhar

## Testes

- `tests/phase-204b-monthly-income-history.test.js`
- `tests/phase-204b-monthly-income-history.guard.js`
- validacao cruzada com as fases readonly anteriores

## Rollback

Rollback pre-merge da branch:

`git revert 313c71146181a58157e6236ef3305ca259d6ca5f`

Depois do squash merge, o encerramento documental deve registrar o SHA final da main.

## Conclusao Caveman

- usar apenas dados reais ja gravados
- manter a apresentacao pequena e direta
- nao criar regra financeira paralela

## Conclusao Impeccable

- consolidacao rastreavel
- leitura clara
- acessibilidade preservada
- responsividade preservada
- sem inventar historico
