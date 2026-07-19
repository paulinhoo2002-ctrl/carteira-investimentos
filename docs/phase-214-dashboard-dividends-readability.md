# Fase 214 - Dashboard enxuto e legibilidade de Dividendos

## Status final
- status: concluida;
- PR funcional: `#213`;
- modo de merge: squash;
- SHA-base: `454edf021b26de9aa819e6c82c46e5b33a5dd6a1`;
- SHA final na main: `cd98c8000bbd8d919e6eec0a448ff0f14e43baa1`;
- branch original: `style/phase-214-dashboard-dividends-readability`;
- branch oficial apos integracao: `main`;
- resultado: simplificacao visual do Dashboard e melhoria de legibilidade da tela Dividendos;
- testes e builds verdes;
- Playwright aprovado em 390px, 768px, 1366px e 1920px;
- sem overflow horizontal.

## Objetivo
- remover do Dashboard o bloco "Metas financeiras", preservando os dados persistidos e a tela especifica de Metas;
- melhorar a legibilidade da tela Dividendos;
- aplicar fonte visivel minima de 10px em Dividendos;
- preservar filtros de Periodo, Ativo e Tipo;
- preservar abas e visao geral;
- preservar historico mensal, ultimos 5 anos e expansao de 5 em 5 anos;
- preservar Mostrar mais e Mostrar menos;
- nao alterar formulas financeiras;
- nao alterar schema, persistencia, Firebase/Auth ou backups;
- nao alterar `modern/src`;
- manter `modern/dist` fora do indice.

## Escopo aplicado

### Dashboard
- bloco "Metas financeiras" removido do Dashboard;
- dados persistidos e tela especifica de Metas preservados;
- nenhuma nova formula financeira;
- nenhum recálculo paralelo.

### Dividendos
- melhor legibilidade consolidada;
- fonte visivel minima de 10px;
- filtros Periodo, Ativo e Tipo preservados;
- abas e visao geral preservadas;
- historico mensal preservado;
- ultimos 5 anos preservados;
- expansao de 5 em 5 anos preservada;
- Mostrar mais e Mostrar menos preservados;
- sem overflow horizontal em 390px, 768px, 1366px e 1920px.

## Fonte oficial
- `cx()`;
- `proventoDividendPaymentDate()`;
- `proventoStats()`;
- `proventoResumo()`;
- `dividendMonthlyHistoryRows()`;
- `dividendMonthlyHistoryGroupRows()`;
- `dividendMonthlyHistorySummary()`;
- `passiveIncomeGoalStats()`.

Sem duplicacao de calculos oficiais. Sem fonte paralela.

## Preservacao obrigatoria
- dados persistidos intactos;
- schema inalterado;
- Firebase/Auth inalterado;
- sincronizacao inalterada;
- backups inalterados;
- `modern/src` inalterado;
- `modern/dist` fora do indice;
- `sw.js` inalterado;
- `manifest.json` inalterado;
- `firestore.rules` inalterado.

## Acessibilidade
- fonte visivel minima de 10px em Dividendos;
- hierarquia visual consistente;
- tooltips e labels preservados;
- foco visivel preservado;
- leitura por leitor de tela preservada;
- nao houve dependencia nova de cor para transmittir estado.

## Responsividade
- 390px: layout empilhado e sem rolagem horizontal;
- 768px: filtros e listas sem overflow;
- 1366px: densidade confortavel;
- 1920px: densidade executiva;
- Playwright validado em 390px, 768px, 1366px e 1920px;
- sem overflow horizontal.

## Performance
- renderizacao unica por atualizacao;
- sem fetch novo;
- sem dependencia adicional;
- sem observador novo.

## Testes
- `node --test tests/dividends-visual-refinement.test.js`;
- `node --test tests/phase-206-financial-goals.test.js`;
- `node --test tests/basic-ui.test.js`;
- `npm.cmd test`;
- `npm.cmd run build`;
- `git diff --check`;
- Playwright validado em 390px, 768px, 1366px e 1920px.

Somente os testes acima foram comprobadamente executados.

## Rollback
- reverter o squash merge da Fase 214:
  `git revert cd98c8000bbd8d919e6eec0a448ff0f14e43baa1`;
- preservar a documentacao desta fase ate que a decisao seja revertida ou que nova fase decida o destino.

## Intencao futura nao autorizada
- "Reduzir progressivamente o tamanho e o acoplamento do `index.html` por extracoes pequenas, testadas e reversiveis, sem reconstrucao ampla e sem alterar dados, calculos, schema ou persistencia.";
- apenas intencao;
- nenhuma fase numerada ou autorizada para este objetivo nesta PR;
- nenhuma referencia a Fase 216 nesta PR;
- sem evidencia versionada objetiva de execucao de `npm run build:modern` ou `npm run test:modern` para esta fase; portanto, esses comandos nao constam da lista de testes comprovadamente executados nesta fase.

## Conclusao Caveman
- menor passo seguro: remover duplicacao visual do Dashboard e melhorar a legibilidade existente de Dividendos.

## Conclusao Impeccable
- nenhuma formula financeira nova;
- nenhum dado removido;
- nenhum schema alterado;
- nenhuma dependencia nova;
- zero versus ausente preservado;
- respostas oficiais reutilizadas;
- validacao visual registrada em 390px, 768px, 1366px e 1920px.
