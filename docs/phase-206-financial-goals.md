# Fase 206 - Metas financeiras

## Objetivo

- acompanhar meta patrimonial de R$ 1.000.000 e meta de renda passiva de R$ 4.000 mensais;
- mostrar valor atual real, quanto falta, percentual atingido e estado final da meta;
- separar realidade, meta e eventual projeção;
- evitar historico inventado, snapshot novo ou simulacao tratada como resultado garantido.

## Inventario tecnico

- `cx()`
- `financialGoalsSnapshot()`
- `goalProgressMetrics()`
- `financialGoalsTone()`
- `financialGoalsBar()`
- `dashboardFinancialGoalsPanel()`
- `passiveIncomeGoalStats()`
- `passiveIncomeGoalTarget()`
- `dividendMonthlyHistoryRows()`
- `dividendMonthlyHistoryGroupRows()`
- `dividendMonthlyHistorySummary()`
- `S.goals`
- `saveMetaPatrimonioTarget()`
- `saveMetaProventosTarget()`
- `metasTab()`
- `goalProgressText()`
- `estimateGoalMonths()`

## Fonte oficial do patrimonio

- leitura atual da carteira via `cx()`;
- soma apenas do estado atual da carteira, sem reconstruir historico;
- valor atual e valor aplicado permanecem separados;
- renda fixa entra somente quando presente no estado atual da carteira e nos helpers oficiais;
- caixa entra apenas se estiver modelado na carteira atual;
- ativos sem base oficial continuao seguindo o contrato do helper atual, sem segunda soma paralela;
- moeda estrangeira e exclusoes seguem os helpers oficiais ja existentes.

## Fonte oficial da renda passiva

- meta mensal persistida em `S.goals.proventos.monthly`;
- renda passiva atual vem do historico mensal real da Fase 204B;
- usa apenas proventos efetivamente recebidos;
- proventos futuros, previstos ou excluidos ficam fora;
- renda fixa continua fora quando o contrato oficial assim define;
- sem status inventado de previsto/recebido.

## Metas existentes

- `S.goals.patrimonio.target`
- `S.goals.proventos.monthly`
- leitura e persistencia oficiais seguem os fluxos de edicao ja existentes;
- `normalizeGoals()` garante compatibilidade com estruturas antigas;
- quando a meta nao estiver configurada, a interface pode mostrar apenas referencia visual, sem alterar persistencia.

## Decisao

- Opcao A - reutilizar metas ja persistidas;
- quando faltar meta configurada, usar sugestao visual sem salvar silenciosamente;
- nenhuma nova persistencia foi criada.

## Regras de progresso

- formula de apresentacao: valor atual / meta x 100;
- a barra visual limita em 100%;
- o percentual textual pode passar de 100% quando a meta e superada;
- meta zero ou invalida nao divide por zero;
- `Infinity` e `NaN` nao aparecem;
- valor ausente nao vira zero;
- zero real continua zero.

## Valor que falta

- `max(meta - valor atual, 0)`;
- quando a meta for superada, mostrar `Meta atingida`;
- valor negativo nao aparece como faltante.

## Projecao

- nao implementada nesta fase;
- adiada para nao misturar estimativa com realidade;
- qualquer estimativa futura deve ficar separada e rotulada como tal.

## Estados visuais

- `Patrimonio atual indisponivel` quando nao houver base atual confiavel;
- `R$ 0,00 recebidos neste mes` quando o mes atual realmente nao tiver recebimentos;
- `Meta nao configurada` quando a meta nao existir;
- `Meta atingida` quando o valor atual alcancar ou superar a meta.

## Acessibilidade

- blocos com semantica clara;
- barras com `role="progressbar"`;
- `aria-valuemin`, `aria-valuemax` e `aria-valuenow` quando houver valor valido;
- descricao textual completa;
- foco visivel;
- contraste suficiente.

## Responsividade

- 390px: cards empilhados e sem overflow horizontal;
- 768px: empilhamento quando necessario e leitura confortavel;
- 1366px: dois cards equilibrados;
- 1920px: leitura executiva sem esticar demais os blocos.

## Performance

- calculo feito uma vez por renderizacao;
- sem timer novo;
- sem observador novo;
- sem biblioteca nova;
- sem fetch adicional.

## Riscos

- confundir valor atual com historico;
- misturar meta com simulacao;
- tratar ausente como zero;
- usar estimativa como se fosse garantia;
- overflow em 768px se os blocos crescerem demais.

## Testes

- `tests/phase-206-financial-goals.test.js`
- `tests/phase-206-financial-goals.guard.js`
- validacao cruzada com fases readonly anteriores e com o historico mensal premium.

## Rollback final

- `git revert 8225262a27bdfc4a58c526b2e7d8c113774f638b`
- remover a documentacao e os testes novos;
- manter intactos os helpers oficiais reutilizados.

## Conclusao Caveman

- menor passo seguro;
- duas metas principais;
- sem formula nova;
- sem historico inventado.

## Conclusao Impeccable

- fontes oficiais rastreaveis;
- progresso claro;
- meta, realidade e projecao separados;
- acessibilidade e responsividade preservadas.

## Encerramento

- PR `#209`;
- squash;
- SHA final `8225262a27bdfc4a58c526b2e7d8c113774f638b`;
- data de encerramento: 18/07/2026;
- 5 testes funcionais da fase aprovados;
- 1 guardrail documental/arquitetural aprovado;
- `npm test` com 95 testes aprovados;
- builds verdes;
- Vercel success antes do merge;
- validacao visual completa bloqueada pelo gate de autenticacao;
- painel antigo preservado;
- metas financeiras adicionadas;
- fontes oficiais preservadas;
- nenhuma formula financeira concorrente;
- nenhum schema;
- nenhum snapshot;
- nenhum deploy manual;
- rollback final;
- Fase 208 nao iniciada;
- 204C, 210 e 212 nao iniciadas.

