# Matriz de decisao da modernizacao

## Leitura

- Pontuacao: 1 = ruim, 2 = fraco, 3 = aceitavel, 4 = bom, 5 = muito bom.
- Esta matriz nao usa soma automatica como verdade final; a leitura precisa considerar o contexto, o risco e o rollback.
- A decisao recomendada continua sendo a Opcao B, porque entrega evolucao com risco controlado.

## Opcoes

- A = manter hibrido indefinidamente
- B = expandir readonly gradualmente
- C = iniciar escrita moderna controlada
- D = reescrever tudo
- E = congelar modernizacao

## Tabela

| Criterio | A | B | C | D | E | Nota |
|---|---:|---:|---:|---:|---:|---|
| Risco de perda de dados | 4 | 4 | 2 | 1 | 5 | B preserva dados porque continua readonly; C e D pioram o risco ao introduzir escrita ou ruptura. |
| Risco financeiro | 4 | 4 | 2 | 1 | 5 | B evita novos calculos e nao toca na fonte de verdade. |
| Complexidade | 3 | 4 | 2 | 1 | 5 | B cresce por fases pequenas e mantem o escopo legivel. |
| Reversibilidade | 4 | 5 | 2 | 1 | 5 | B continua simples de reverter porque cada fase e isolada. |
| Acessibilidade | 3 | 4 | 3 | 1 | 2 | B permite melhorar telas sem esperar reescrita total. |
| Desempenho | 4 | 4 | 3 | 1 | 5 | B aproveita o legado e adiciona UI leve. |
| Manutencao | 2 | 4 | 2 | 1 | 3 | B melhora manutencao sem duplicar fonte de verdade. |
| Testabilidade | 3 | 5 | 3 | 1 | 2 | B ja tem contratos e guardrails claros. |
| Compatibilidade | 5 | 4 | 2 | 1 | 5 | A e E sao melhores em compatibilidade, mas B ainda preserva o legado com progresso real. |
| Esforco operacional | 3 | 4 | 2 | 1 | 5 | B e o melhor equilibrio entre valor e trabalho. |
| Dependencia do legado | 2 | 4 | 3 | 1 | 5 | B reduz a dependencia indireta sem fingir independencia total. |
| Clareza da fonte de verdade | 2 | 5 | 2 | 1 | 4 | B deixa claro que o legado continua autoritativo enquanto a camada moderna so le. |
| Impacto no usuario | 3 | 4 | 4 | 1 | 2 | B entrega evolucao visivel sem quebrar o fluxo atual. |

## Leitura interpretada

- A melhor combinacao entre risco, reversibilidade e evolucao e a Opcao B.
- A Opcao C fica reservada para uma fase futura e separada, depois de contrato proprio e piloto controlado.
- A Opcao D nao se justifica pelo custo e risco atuais.
- A Opcao E congela valor ja entregue.

## Rollback

- Remover este documento.
- Manter o resto da documentacao e o codigo funcional intactos.