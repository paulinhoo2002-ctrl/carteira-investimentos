# E2 — Painel unificado de renda passiva (planejamento técnico)

Status: **planejamento, somente documentação**. Nenhuma implementação.
Base: `origin/main` em `30dc055` (inclui E1 e E1.1, release `v1.5.1`).
Depende de: autorização explícita para desenvolvimento.

## 1. Estado atual (verificado no código de `origin/main`)

A renda passiva já aparece em quatro lugares, com cálculos diferentes:

| Local | Função | Origem do número | Observação |
|---|---|---|---|
| Dividendos (`dividendsLegacyTab`) | `passiveIncomeGoalStats()`, `passiveIncomeDividendSummaryBlock` | proventos com estado `PAID` | realizada |
| Dividendos (`dividendsLegacyTab`, ~linha 37858) | `projCurrent` calculado inline | DY × quantidade × preço ÷ 12 | prevista, cópia local |
| Metas (`metasTab`, ~linha 38400) | `projCurrent` calculado inline + `passiveIncomeGoalBlock(passiveGoal, projCurrent)` | mesma fórmula, duplicada | prevista, cópia local |
| Metas (`metasTab`, ~linha 38480) | `passiveIncomeProjectionEnhanced(...)` → `PassiveIncomeProjection.generateFullProjectionReport` | motor de projeção | prevista e cenários |
| Relatórios (~linha 27784) | `passiveIncomeGoalStats()` | proventos `PAID` | realizada |
| Leitura somente (~linha 10718) | `passiveIncomeGoalStats()` em snapshot | proventos `PAID` | realizada |

**Achado principal:** a renda mensal prevista é calculada em **três** lugares (duas cópias inline e o motor de projeção). Não há uma função única. A E2 precisa escolher uma fonte e não duplicar. O mesmo vale para a meta: `passiveIncomeGoalTarget()` é a fonte, mas a tela de Metas compara o progresso com a renda prevista, e o painel de Dividendos compara com a realizada.

**Estados já existentes:** `passiveIncomeGoalStats` devolve `monthlyAverageStatus` (`COMPLETE`, `PARTIAL`, `UNKNOWN`) e média apenas de meses `COMPLETE`. A regra deve ser mantida.

## 2. Objetivo

Um único painel que responda, na mesma tela:
- quanto foi **recebido** (realizado, com origem: proventos registrados);
- quanto está **previsto** (estimativa pelo DY, com origem: cadastro de ativos);
- qual é a **meta mensal** configurada e o progresso, com a base explícita;
- a **origem** de cada número, em rótulo visível.

## 3. Escopo

**Incluído**
- Painel novo que compõe funções existentes (`passiveIncomeGoalStats`, `passiveIncomeGoalTarget`, `PassiveIncomeProjection.calculatePortfolioYield`).
- Substituir as duas cópias inline de `projCurrent` por uma chamada à função única. Mesmo resultado numérico, comprovado por teste antes da troca.
- Explicação de carteira vazia (ver seção 6).
- Rótulos de origem e de estado (`recebido`, `estimado`, `parcial`, `não definido`).

**Excluído**
- Novas fórmulas de renda, de DY ou de projeção.
- Mudança do motor de cenários ou do Monte Carlo.
- Calendário de recebimentos (E4).
- Patrimônio e alocação (E3).
- Mudança de schema, persistência, Firebase ou Vercel.
- Mudança de `passiveIncomeGoalTarget` (manter fallback legado `S.divGoal`).

## 4. Telas e componentes

- **Dashboard:** painel resumido (recebido no mês, previsto mensal, progresso). Verificado: o Dashboard chama `dashboardUpcomingDividendsPanel` (~linha 33544). As funções `dashboardPassiveIncomePanel` e `dashboardIncomePanel` existem, mas não encontrei chamadas. Confirmar antes de remover qualquer uma.
- **Metas:** bloco completo, com projeção e cenários, usando a mesma função de renda prevista.
- **Dividendos:** manter a visão detalhada de proventos; o cabeçalho de renda passa a usar o painel único.
- Não alterar Relatórios nesta entrega; apenas reutilizar `passiveIncomeGoalStats` sem mudança de saída.

## 5. Fontes e fórmulas (reutilizadas, não reescritas)

| Campo | Fonte | Rótulo | Estado quando ausente |
|---|---|---|---|
| Recebido no mês | proventos `PAID` no mês corrente | "Recebido" | `UNKNOWN` se não houver dados do mês |
| Média mensal 12 meses | `passiveIncomeGoalStats.monthlyAverage` | "Média recebida (12 meses)" | `PARTIAL` ou `UNKNOWN` conforme meses `COMPLETE` |
| Previsto mensal | `calculatePortfolioYield(assets).monthlyIncome` | "Previsto (estimativa por DY)" | `0` apenas se a carteira tiver ativos sem DY; `UNKNOWN` sem ativos |
| Meta mensal | `passiveIncomeGoalTarget()` | "Meta mensal" | "não definida" quando `0` e sem configuração explícita |
| Progresso | recebido médio ÷ meta, e previsto ÷ meta, **ambos exibidos separadamente** | "Progresso (recebido)" / "Progresso (previsto)" | `—` sem meta |

**Regra:** nunca somar previsto e recebido no mesmo número.

**Decisão do proprietário:** o progresso da meta mostra **recebido e previsto**, com rótulos distintos ("Progresso (recebido)" e "Progresso (previsto)").

**Meta mensal:** é sempre a configurada pelo usuário (`passiveIncomeGoalTarget`). O valor de R$ 5.000/mês é apenas exemplo de planejamento e **não deve ser fixado no código, nos testes de produção nem na interface**.

## 6. Carteira vazia e aportes futuros

Comportamento confirmado em `30dc055`:
- Sem ativos: patrimônio 0, renda 0.
- Com aporte futuro: patrimônio projetado cresce, renda projetada permanece 0, porque não há taxa de rendimento mensurável.

Texto proposto para a interface (rascunho, a revisar):
> Sua carteira ainda não tem ativos com rendimento mensurável. A projeção de patrimônio pode crescer com os aportes, mas a renda projetada só aparece quando houver ativos com DY cadastrado.

## 7. Critérios de aceite

- O número de renda prevista é idêntico ao de `calculatePortfolioYield` em todas as telas (teste de paridade).
- Não há mais cópias inline de `projCurrent`.
- Recebido, previsto e meta têm rótulo e origem visíveis.
- Meta não definida aparece como "não definida", nunca como 0%.
- Mês parcial aparece como parcial, sem média enganosa.
- Carteira vazia mostra a explicação da seção 6, sem NaN e sem zero ambíguo.
- Carteira válida: nenhum valor muda em relação a `30dc055`, exceto a remoção da duplicação.
- Layout validado em 390, 430, 768, 1366 e 1920 px, sem overflow horizontal, conforme `docs/ai/VISUAL_UX_RESPONSIVE_CONTRACT.md`.
- Console sem erro novo.

## 8. Riscos

- **Duplicidade:** já há três cálculos de previsto. Mitigação: teste de paridade antes de remover as cópias.
- **Mistura de origens:** somar previsto e recebido. Mitigação: rótulos e regra da seção 5.
- **Meta ambígua:** 0 e não definido iguais. Mitigação: estado explícito; não alterar `passiveIncomeGoalTarget` sem fase própria.
- **Regressão visual:** o Dashboard já é denso. Mitigação: painel único reduz densidade; validar nas cinco larguras.
- **Dado ausente como zero:** preço ou DY ausente (já documentado na E1). Mitigação: mostrar contagem de ativos sem DY no painel.

## 9. Estratégia de testes (dados sintéticos)

- Paridade: `calculatePortfolioYield` versus as duas cópias inline, com fixtures sintéticas, antes da troca.
- Unitários: estados `UNKNOWN`, `PARTIAL`, `COMPLETE`; meta não definida; carteira vazia com e sem aporte.
- Golden: `fase1a-golden` e `fase1c-export-integrity` sem alteração de hash.
- Browser: Playwright nas cinco larguras, com checagem de overflow, console e fluxo de Metas e Dividendos.
- Nenhum dado real. Nenhuma conta real além da validação de produção já feita.

## 10. Entregas independentes

| Entrega | Conteúdo | Dependência | Esforço relativo |
|---|---|---|---|
| E2.1 | Teste de paridade do previsto (sem mudança de tela) | nenhuma | P |
| E2.2 | Função única de renda prevista; remover as duas cópias inline | E2.1 | M |
| E2.3 | Painel unificado no Dashboard (recebido, previsto, meta, origem) | E2.2 | M |
| E2.4 | Bloco de Metas usando o mesmo painel; texto de carteira vazia | E2.3 | M |
| E2.5 | Validação visual nas cinco larguras e documentação | E2.4 | P |

**Recomendação da primeira entrega: E2.1.** É só teste, não altera tela, e comprova a paridade antes de qualquer remoção.

## 11. Governança

- Feature freeze: esta é uma exceção só para planejamento. Implementação exige autorização explícita por entrega.
- Sem merge, deploy ou alteração de Firebase, Vercel, dados financeiros, branch protection ou Minhas Economias.
- Um PR por entrega, sem misturar documentação, visual e funcional.

## 12. Pendências para decisão do proprietário

1. ~~Progresso da meta~~ — **respondido:** recebido e previsto, rotulados.
2. O texto da seção 6 está adequado? — **pendente.**
3. ~~R$ 5.000/mês~~ — **respondido:** apenas exemplo; a meta é a configurada pelo usuário.

## 13. Aprovação

Aguardando autorização explícita para iniciar **E2.1**.
