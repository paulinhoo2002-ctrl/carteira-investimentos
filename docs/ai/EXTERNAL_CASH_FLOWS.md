# Fluxos externos

Aporte e retirada externos são diferentes de compra, venda ou transferência
interna. O runtime V76 persiste `portfolioExternalCashFlowsV1` como dado do
usuário, com valores positivos em centavos, data ISO, tipo, origem, identidade
de origem e trilha de criação/atualização.

Somente fluxo explicitamente comprovado pode alimentar TWR/XIRR. A UI oferece
aporte, retirada e transferências externas sem chamar o salvamento do ledger;
duplicidades por identidade são rejeitadas com aviso. Entradas importadas
devem passar por prévia. O ledger de fluxos é separado do ledger financeiro
realizado, do cache público e dos proventos esperados.
