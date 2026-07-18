# Fase 208 - Qualidade dos dados

## Objetivo
- auditar a base atual em modo somente leitura;
- localizar registros incompletos, valores invalidos, campos ausentes, duplicidades e diferenca entre zero e ausente;
- orientar revisao manual sem qualquer correcao automatica.

## Inventario tecnico
- `S.assets`;
- `S.proventos`;
- `S.rfEvents`;
- `S.aportes`;
- `S.goals`;
- `cx()`;
- `proventoDividendPaymentDate()`;
- `proventoStats()`;
- `proventoResumo()`;
- `dividendMonthlyHistoryRows()`;
- `dividendMonthlyHistoryGroupRows()`;
- `dividendMonthlyHistorySummary()`;
- `rfValues()`;
- `normalizeGoals()`;
- `parseAnyDate()`;
- `normalizeType()`;
- `cleanAssetCode()`;
- `dataQualitySnapshot()`.

## Escopo analisado
- ativos em `S.assets`;
- proventos em `S.proventos`;
- eventos de renda fixa em `S.rfEvents`;
- movimentacoes em `S.aportes`;
- metas em `S.goals`;
- leitura atual de patrimonio via `cx()`;
- leitura oficial de proventos via helpers da Fase 204B.

## Campos obrigatorios por contrato
- ticker;
- tipo;
- quantidade;
- preco medio;
- valor aplicado;
- valor atual;
- data oficial;
- valor financeiro;
- moeda quando aplicavel.

## Campos opcionais
- nome;
- corretora;
- conta;
- subtipo de renda fixa;
- vencimento;
- taxa contratada;
- observacao;
- status adicional.

## Modelo de resultado
- `dataQualitySnapshot()` calcula os diagnosticos em memoria;
- o resultado nao e persistido;
- nenhum dado de `S` e alterado;
- o snapshot serve apenas para leitura e navegacao manual.

## Zero versus ausente
- `0` numerico e valor real valido;
- string numerica `0` pode ser aceita se o contrato atual ja a permitir;
- `null`, `undefined` e string vazia sao ausencia;
- `NaN` e `Infinity` sao invalidos;
- ausencia nao vira zero;
- zero nao vira erro automaticamente.

## Severidades
- `Critico`: impede interpretacao financeira confiavel;
- `Atencao`: merece revisao manual;
- `Informativo`: possivel duplicidade ou suspeita leve.

## Duplicidade conservadora
- ativos: ticker + tipo + moeda + corretora/conta, quando disponiveis;
- proventos: ticker + data oficial + tipo + valor + moeda;
- renda fixa e movimentos: identificadores oficiais disponiveis;
- nunca unir, apagar ou editar automaticamente.

## Riscos de falso positivo
- ticker com espacos ou grafia inconsistente pode gerar alerta informativo;
- tipos fora do contrato podem aparecer como invalidos;
- campos ausentes em dados antigos podem exigir revisao humana;
- a auditoria prefere perder um alerta leve a inventar um dado.

## Ausencia de correcao automatica
- nenhum dado e alterado;
- nenhum snapshot e persistido;
- nenhum schema novo e criado;
- nenhuma dependencia e adicionada;
- nenhuma rotina de limpeza automatica e executada.

## Acessibilidade
- titulo semantico;
- filtros com labels claros;
- severidade textual;
- lista sem dependencia de cor;
- botoes com nome explicito;
- foco visivel;
- leitura aceitavel por leitor de tela.

## Navegacao manual
- Abrir Ativos;
- Abrir Dividendos;
- Abrir Renda Fixa;
- Abrir Metas.

## Responsividade
- 390px: cards empilhados e sem rolagem horizontal;
- 768px: filtros quebram em mais de uma linha se necessario;
- 1366px e 1920px: densidade executiva sem linhas excessivamente longas.

## Performance
- analise unica por renderizacao;
- uso de mapas para duplicidade;
- sem timer;
- sem observador;
- sem fetch extra;
- sem recalculo repetido em cada linha.

## Testes
- `node --test tests/phase-208-data-quality.test.js`;
- `node --test tests/phase-208-data-quality.guard.js`;
- validacoes de roadmap e guardrails historicos relacionados;
- `npm test`;
- `npm run build`;
- `npm run build:modern`;
- `npm run test:modern`.

## Rollback
- `git revert` do commit desta fase;
- remover apenas a documentacao e os testes da Fase 208;
- manter o codigo de producao intacto.

## Conclusao Caveman
- menor passo seguro: observar a base sem corrigir automaticamente.

## Conclusao Impeccable
- auditoria rastreavel;
- severidades claras;
- navegacao manual;
- sem regressao funcional;
- sem ocultar zero nem transformar ausencia em zero.
