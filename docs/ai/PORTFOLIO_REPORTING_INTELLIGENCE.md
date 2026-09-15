# Portfolio Reporting Intelligence

## Escopo

O modelo `portfolio-report-model.js` organiza a leitura de Relatórios em uma
camada pura e somente leitura. Ele recebe snapshots já calculados pelo domínio
legado e produz seções para resumo, patrimônio, performance, renda, alocação,
concentração, ativos, proventos e qualidade dos dados.

## Contrato

- `readOnly=true`: o modelo não acessa armazenamento, rede, Firebase ou DOM.
- Valores ausentes permanecem `null` e recebem `UNAVAILABLE`; a interface os
  apresenta como indisponíveis, nunca como lucro ou valor zero inventado.
- Cada métrica e seção carrega `status`, `provenance`, `freshness` e `reason`
  quando aplicável.
- A cobertura é declarada como `FULL`, `PARTIAL` ou `UNAVAILABLE`.
- TWR/XIRR continuam sob responsabilidade do domínio de performance. O
  relatório apenas mostra o estado recebido, incluindo `TRACKING_STARTED` e
  `INSUFFICIENT_DATA`.

## Integração

`reportsTab()` continua usando `reportsSnapshot()`, `assetAnalysisRows()` e os
formatadores existentes. O novo modelo apenas fornece uma leitura executiva
compacta; não há fórmula financeira paralela nem escrita de dados.

## Estados honestos

Quando o histórico ainda está sendo acumulado, o painel mostra “Coletando
histórico”. Quando a cobertura não é total, mostra a cobertura informada e
mantém a observação da fonte. Relatórios exportados continuam separados do
backup de restauração.
