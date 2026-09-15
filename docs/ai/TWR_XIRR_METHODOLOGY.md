# TWR e XIRR

TWR encadeia os retornos dos subperíodos entre avaliações, retirando fluxos
externos ocorridos no intervalo. XIRR usa fluxos assinados datados e o valor
final como fluxo positivo terminal. Ambas as métricas exigem dados que não
podem ser inferidos de compras isoladas ou do saldo atual.

O módulo V73 retorna `INSUFFICIENT_DATA` ou `NO_SOLUTION` quando as condições
não são atendidas. A interface deve mostrar indisponibilidade e a cobertura,
sem zero artificial ou percentual inventado.

Desde V76, snapshots diários e fluxos externos explícitos formam o ponto de
partida prospectivo. A existência de um primeiro snapshot muda o estado para
`TRACKING_STARTED`, mas não inventa uma taxa: TWR exige duas avaliações válidas
e XIRR exige fluxos assinados suficientes. Compras e vendas permanecem fora do
ledger de fluxo externo por definição.
