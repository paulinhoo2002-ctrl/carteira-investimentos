# Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo

## Resumo executivo

- O projeto tem dados atuais suficientes para leitura executiva da carteira.
- Nao ha serie historica persistida de patrimonio mensal com confianca suficiente para reconstruir o passado sem estimativa.
- `patrimonySnapshot()` e uma estimativa derivada do estado atual e dos aportes, nao uma serie historica real.
- O caminho seguro agora e adiar o grafico patrimonial completo, priorizar o dashboard executivo e, se autorizado, iniciar captura de snapshots daqui para frente.

## Estado-base

- branch inicial: `main`
- SHA-base esperado: `2f69f0623717d09e670b82f711588f9d1cc50909`
- branch atual da fase: `docs/phase-204-evolution-audit`
- PR: pendente
- estado geral: nenhuma fase funcional nova autorizada
- Fases 206, 208, 210 e 212 continuam planejadas e nao autorizadas

## Inventario dos dados

| Dado / grupo | Local | Origem | Tipo | Confiabilidade | Historico antigo | Estado atual ou evento | Pode usar na Fase 204? | Limitacao |
|---|---|---|---|---|---|---|---|---|
| Ativos | `S.assets` | `load()` / `localStorage` / sync legado | estado atual | alta para leitura atual | nao historico mensal | estado atual | sim | nao guarda curva mensal de patrimonio |
| Aportes | `S.aportes` | lancamentos do legado | evento | alta para eventos | sim, por data | evento historico | sim, parcialmente | nao vira patrimonio historico completo sozinho |
| Proventos | `S.proventos` | lancamentos do legado e importacao | evento | alta para eventos | sim, por data | evento historico | sim | nao separa patrimonio por si so |
| Renda fixa | `S.rfEvents` | eventos de RF | evento | alta para eventos | sim, por data | evento historico | sim, parcialmente | depende de valores atuais e datas consistentes |
| Metas | `S.goals` | configuracao atual | configuracao | alta | nao historico | estado atual | sim | nao mede evolucao passada |
| Backup / exportacao | `backupPayload()` | snapshot do estado atual | snapshot atual | media | nao serie temporal | estado atual | nao como historico | serve para restore, nao para evolucao patrimonial |
| Relatorios | `reportsSnapshot()` | calculo atual | snapshot atual | alta | nao historico mensal de patrimonio | estado atual | sim, como resumo | nao substitui serie historica |
| Evolucao estimada | `patrimonySnapshot()` | calculo atual + aportes | estimativa | media | nao historico real | leitura derivada | somente como estimativa | nao deve ser tratada como verdade historica |

## Fontes oficiais

Funcoes reais que ja existem e podem ser reaproveitadas:

- `cx()` - resumo atual da carteira com aplicado, atual, resultado e rentabilidade.
- `assetAnalysisRows()` - base oficial para leitura de desempenho atual.
- `rfIntelligenceSnapshot()` - resumo atual de renda fixa.
- `passiveIncomeGoalStats()` - renda passiva e meta mensal.
- `proventoStats()` - total, mes e ano de proventos.
- `proventoResumo()` - consolida proventos por mes e por ano.
- `reportsSnapshot()` - consolida resumo atual para relatorios.
- `dashboardSnapshot()` - junta resumo patrimonial, renda passiva, renda fixa e leitura executiva.
- `patrimonySnapshot()` - apenas leitura estimada com base no estado atual.

## Historico disponivel

- Existem eventos com data para aportes, proventos e renda fixa.
- O sistema guarda o estado atual persistido, backups e exportacoes.
- Nao existe serie mensal persistida de patrimonio total em momentos anteriores.
- Nao existe trilha oficial de valor de mercado por mes para todos os meses.
- Nao existe prova suficiente para reconstruir o patrimonio mensal completo sem estimativa.
- Retiradas podem aparecer somente se estiverem codificadas em eventos do legado; nao ha trilha dedicada de patrimonio historico.

## Limitacoes

- Nao ha snapshots mensais oficiais de patrimonio guardados.
- Nao ha historico de cotacao suficiente para reconstruir o valor atual de cada mes com precisao.
- `backupPayload()` e relatorio atual sao snapshots do estado corrente, nao do passado.
- `patrimonySnapshot()` mistura leitura atual com aportes para estimar a evolucao, portanto nao pode ser vendida como historico real.
- Sem snapshots futuros, qualquer grafico patrimonial completo cairia em inferencia fraca.

## Classificacao A/B/C/D

| Categoria | O que entra | Decisao |
|---|---|---|
| A | resumo patrimonial atual, composicao por classe, melhores e piores ativos, renda passiva atual, renda fixa atual, leitura executiva com numeros oficiais | pode ser implementado agora |
| B | series parciais baseadas em eventos com data, como aportes e proventos mensais, e algumas leituras de renda fixa por evento | pode ser implementado parcialmente |
| C | coleta de snapshots futuros de patrimonio e composicao, sem preencher retroativamente | pode ser iniciado daqui para frente se houver fase propria |
| D | reconstruir patrimonio historico completo sem snapshots, inventar meses passados, estimar valor de mercado antigo sem base oficial | nao recomendado |

## Riscos

- Tratar estimativa como historico real.
- Copiar identidade visual de outro produto em vez de reusar a linguagem do projeto.
- Expor uma tela muito alta em 768px sem controle de responsividade.
- Misturar ganho de capital, dividendos e aportes sem fonte oficial clara.
- Depender de backup ou exportacao como se fosse serie temporal historica.

## Proposta visual

- Dashboard executivo com leitura rapida de patrimonio, resultado, proventos, composicao e destaques.
- No card de destaques, substituir o bloco redundante de pagadores por "Destaques da carteira" com abas internas de maiores altas e maiores baixas.
- Manter o card de composicao por classe ao lado dos destaques.
- Reaproveitar apenas dados oficiais da Fase 202.
- Historico mensal premium de dividendos pode ser a proxima leitura de volume maior, com bloco aberto por padrao, expansao progressiva e filtros.
- Evolucao patrimonial completa so deve aparecer quando houver snapshot proprio suficiente.

## Recomendacao tecnica

- Recomendacao geral: Opcao 4 - adiar o grafico patrimonial.
- Melhor passo imediato: entregar dashboard executivo com os numeros oficiais ja existentes.
- Melhor segundo passo: organizar o historico mensal premium sem inventar valores.
- Passo posterior, condicionado: iniciar coleta de snapshots daqui para frente para viabilizar evolucao patrimonial real.

## Sequencia de PRs futuras

### PR funcional 204A - Dashboard executivo

- Composicao por classe.
- Destaques da carteira.
- Abas Maiores altas e Maiores baixas.
- Reuso das funcoes oficiais da Fase 202.
- Nenhuma formula financeira nova.

### PR funcional 204B - Historico mensal premium

- Bloco aberto por padrao.
- Expansao progressiva.
- Filtro por periodo, classe e ativo.
- Total e media apenas quando vierem de dados oficiais.
- Sem rolagem horizontal da pagina inteira.

### PR funcional 204C - Evolucao patrimonial

- Somente se a auditoria de snapshots futuros justificar.
- Sem preenchimento retroativo.
- Sem historico inventado.

### Sequencia consolidada apos a auditoria

- Fase 206 - Metas financeiras.
- Fase 208 - Qualidade dos dados.
- Fase 210 - Relatorio executivo mensal.
- Fase 212 - Desempenho e manutencao tecnica.

Essas fases permanecem planejadas e nao autorizadas.

## Criterios de aceite

- A auditoria nao cria interface funcional.
- A auditoria nao altera schema, Firebase/Auth, storage ou dependencias.
- A auditoria nao cria formula financeira nova.
- A auditoria nao inventa valores passados.
- O documento deixa claro o que e atual, parcial, futuro e nao recomendado.
- O rollback e simples e documental.

## Rollback

- Remover `docs/phase-204-evolution-audit.md`, `tests/phase-204-evolution-audit.guard.js` e os ajustes documentais desta fase.
- Manter o codigo funcional, os contratos readonly e as fases anteriores intactos.

## Conclusao Caveman

- Menor passo seguro: nao inventar historia. Primeiro documentar o que existe e o que falta.

## Conclusao Impeccable

- Decisao rastreavel.
- Fontes oficiais identificadas.
- Limites e riscos explicitados.
- Proposta visual coerente e acessivel.
- Encoding preservado em UTF-8 sem BOM.
