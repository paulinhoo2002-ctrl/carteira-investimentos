# IR 2026 — estado agregado da fundação fiscal

> Escopo: evidência agregada e plano de verificação. Este documento não certifica imposto devido nem contém posições ou operações individuais. Detalhes financeiros e fontes permanecem locais e privados.

## Prontidão e cobertura

| Gate | Estado | Evidência ou bloqueio |
| --- | --- | --- |
| ENGINE_READY | YES | Pipeline determinístico local; duas execuções reais produziram bytes idênticos. |
| REAL_DATA_DRY_RUN_READY | YES | Leitura e processamento local sem escrita financeira real. |
| FISCAL_OPENING_READY | BLOCKED | Posição oficial em 31/12/2025 e custo fiscal inicial ainda sem evidência suficiente. |
| REALIZED_RESULT_READY | BLOCKED | Base fiscal inicial, custos incidentais e eventos pendentes impedem resultado certificado. |
| IR_CALCULATION_READY | BLOCKED | Fechamentos mensais sem cálculo de imposto; faltam evidências e verificação legal vigente. |

| Métrica agregada | Valor |
| --- | ---: |
| Eventos de 2026 | 1.123 |
| Eventos brutos com classificação desconhecida | 72 |
| Ativos na abertura analítica | 279 |
| Quantidade parcial na abertura | 44 |
| Quantidade desconhecida na abertura | 235 |
| Custo fiscal desconhecido na abertura | 279 |
| Eventos com impacto fiscal certificado | 0 |
| Eventos parciais | 705 |
| Eventos desconhecidos ou bloqueados | 283 |
| Eventos sem impacto fiscal atual | 135 |
| Eventos de venda | 61 |
| Resultados realizados certificados | 0 |
| Conferência de quantidades com âncora atual | 35/35 |
| Regras de mecanismo certificadas no registro | 8 |
| Regras legais pendentes | 26 |
| Tamanho do payload fiscal completo serializado | 1.783.391 bytes |

A conferência 35/35 é da posição atual; não demonstra posição ou custo em 31/12/2025. Nenhuma ausência foi transformada em zero. Resultado derivado não equivale a resultado fiscal certificado.

## Divergência na contagem de regras

O checkpoint anterior informou 25 pendentes. A primeira versão Git do registro (commit 1887e4b) já contém 34 regras: 8 de mecanismo certificadas e 26 com status NEEDS_CURRENT_LEGAL_SOURCE. O HEAD atual mantém esses mesmos totais. Logo, a diferença 25→26 é erro de contagem no checkpoint, sem inclusão, divisão ou mudança de status de regra. O checklist abaixo deriva do registro, não do número do relatório anterior.

## Armazenamento futuro

Arquitetura recomendada: **híbrida**. O payload completo de 1.783.391 bytes não deve ser incorporado em um único documento Firestore. Resumos pequenos de ano/carteira podem ficar no documento de apresentação; fechamento mensal, anual, metadados do ledger e referências de auditoria exigem unidades separadas. Documentos brutos e evidências pessoais permanecem fora do documento voltado ao aplicativo, em armazenamento privado com controle de acesso. Nenhum schema hospedado foi criado nesta fase.

## Plano de evidências antes do cálculo

1. **Abertura 2026:** buscar declaração oficial da posição e do custo fiscal em 31/12/2025. Preferência: extrato fiscal/posição da instituição nessa data; relatório anual oficial de 2025; declaração fiscal e comprovantes. Reconstrução por transações só serve se a cobertura de todo o intervalo e dos eventos corporativos for comprovada. A posição de outubro de 2026 não deve ser retroprojetada.
2. **Prejuízos anteriores:** obter declaração e memória de apuração/compensação até 2025, separados por categoria fiscal e competência. Estado atual UNKNOWN; não presumir saldo zero.
3. **IRRF e custos:** conferir informes, notas e extratos para retenções, corretagem, emolumentos e outros custos incidentais. Registrar valor, competência, origem e cobertura por evidência. Campo ausente permanece UNKNOWN; nenhuma alíquota ou tarifa deve ser inferida.
4. **Regra legal:** confrontar cada item abaixo com fonte oficial vigente no período de 2026. Registrar URL/identificador, publicação, vigência, dispositivo e revisão independente antes de mudar o status no registro.

## Checklist de verificação legal 2026

Todos os 26 itens abaixo permanecem NEEDS_CURRENT_LEGAL_SOURCE. Fonte oficial preferida: legislação federal e atos da Receita Federal vigentes na data do fato; quando a classificação do instrumento depender dela, consultar também documentação oficial do emissor, CVM e B3. Escopo temporal: fatos de 2026, inclusive disposições transitórias. Até a certificação de cada regra aplicável, o motor mantém TAX_DUE=NOT_CALCULATED; saídas de custo, resultado, rendimento ou compensação associadas ficam PARTIAL/UNKNOWN, nunca certificadas por suposição.

| RULE_ID | Tema / classe | Pergunta oficial | Fonte oficial preferida | Data dos fatos | Sem verificação | Saída bloqueada |
| --- | --- | --- | --- | --- | --- | --- |
| RULE_COST_BASIS_WEIGHTED_AVERAGE | Custo / RV | Qual método de custo fiscal vale para cada classe e quais aquisições entram na média? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo fiscal e resultado de venda |
| RULE_SALE_COST_REMOVAL_AVERAGE | Venda / RV | Como baixa de quantidade e custo é feita após alienação parcial? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Resultado realizado |
| RULE_FEES_INCLUDED_IN_COST | Custo / RV | Quais despesas comprovadas integram aquisição ou reduzem receita da venda? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo e resultado realizado |
| RULE_SPLIT_TOTAL_COST_PRESERVED | Evento corporativo | Como desdobramento ou grupamento altera quantidade e base fiscal? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo posterior ao evento |
| RULE_BONUS_NO_COST_INFLATION | Bonificação | Qual é o custo fiscal atribuído a bonificações e sua base documental? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo posterior ao evento |
| RULE_SUBSCRIPTION_COST_MODEL | Subscrição | Como exercício, cessão e expiração de direitos afetam custo ou resultado? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo e resultado de subscrição |
| RULE_TRANSFER_NO_REALIZED_RESULT | Transferência | Quando transferência de custódia transporta custo sem alienação tributável? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Resultado e custo transferido |
| RULE_STOCK_LENDING_NO_OWNERSHIP_CHANGE | Aluguel de ativos | Como empréstimo de ativos afeta titularidade e quantidade fiscal? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Quantidade e custo durante aluguel |
| RULE_STOCK_LENDING_INCOME_TAXATION | Aluguel de ativos | Qual tratamento e retenção incidem sobre remuneração do empréstimo? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Rendimento e imposto |
| RULE_FII_DISTRIBUTION_EXEMPT_PF | Rendimentos / FII | Quais condições legais permitem isenção para pessoa física em 2026? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Classificação tributária do rendimento |
| RULE_FII_ALIENATION_EXEMPT_PF | Venda / FII | Existe isenção aplicável à alienação de cotas, e em quais condições? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Resultado tributável da venda |
| RULE_DIVIDEND_IRRF | Dividendos / ações | Qual regime e retenção se aplicam a dividendos no fato gerador de 2026? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Rendimento e retenção |
| RULE_JCP_IRRF | JCP / ações | Qual regime de retenção e declaração de JCP vale no período? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Rendimento e retenção |
| RULE_RV_SWING_MONTHLY_AGGREGATION | Fechamento / ações | Como agregar operações comuns por mês e separar categorias? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Fechamento mensal |
| RULE_RV_SWING_EXEMPTION_THRESHOLD | Isenção / ações | Qual limite, base de comparação e exceções da isenção mensal vigente? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Isenção e imposto mensal |
| RULE_RV_SWING_RATE | Tributação / ações | Qual alíquota e base tributável das operações comuns em 2026? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Imposto mensal |
| RULE_DAY_TRADE_RATE | Day trade / ações | Qual enquadramento, base e alíquota, separados das operações comuns? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Imposto de day trade |
| RULE_LOSS_CARRYFORWARD_SAME_CATEGORY | Prejuízos | Quais categorias admitem compensação e quais exigem controle separado? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Saldo compensável e imposto |
| RULE_ETF_BDR_ALIENATION_TAXED | Venda / ETF e BDR | Qual regime de alienação se aplica a ETF e BDR para pessoa física? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Resultado tributável e imposto |
| RULE_RF_REGRESSIVE_TABLE | Renda fixa | Quais prazos, alíquotas, exceções e IOF se aplicam por instrumento? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Imposto em resgate |
| RULE_RF_IRRF_AT_SOURCE | Renda fixa | Quando retenção ocorre na fonte e qual documento prova seu valor? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | IRRF e imposto residual |
| RULE_RF_NO_CROSS_COMPENSATION | Prejuízos / RF | Em que condições perdas de RF podem ser compensadas, sem cruzar categorias indevidas? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Saldo compensável |
| RULE_AMORTIZATION_TREATMENT | Amortização / RF e FII | O pagamento é rendimento, devolução de principal ou ajuste de custo? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo e rendimento |
| RULE_TICKER_CHANGE_COST_CARRYOVER | Evento corporativo | Em troca de código ou incorporação, como transportar base fiscal? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo após conversão |
| RULE_DEB_FUND_CLASSIFICATION | Fundo de debêntures | Qual classe jurídica/fiscal do instrumento e regime correspondente? | Receita Federal; CVM/B3 para classificação ou evento | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Classificação e imposto |
| RULE_CAPITAL_RETURN_TREATMENT | Devolução de capital | Quando o pagamento reduz custo e quando constitui rendimento tributável? | Lei federal e atos da Receita Federal | Fatos de 2026 | TAX_DUE=NOT_CALCULATED; saída não certificada | Custo e rendimento |

Este checklist é agenda de pesquisa, não parecer tributário. Nenhuma das 26 regras foi certificada aqui.

## Verificação oficial de 16/10/2026

O registro versionado [`ir2026/rules/legal-review-2026.json`](../../ir2026/rules/legal-review-2026.json) relaciona, por `RULE_ID`, as 26 regras acima com fonte oficial, seção, síntese, comportamento esperado, casos de teste, confiança e estado de pesquisa. Os campos de escopo, classe, estado operacional e vigência permanecem no registro principal e são ligados pelo ID. O teste de contrato impede omissões, duplicatas e fonte sem URL. Resultado: **19 com evidência legal parcial, 7 ainda exigindo fonte específica, 0 certificadas para executar cálculo**. `TAX_DUE=NOT_CALCULATED` permanece.

Achados que afetam segurança fiscal:

- Bonificação: [IN RFB 1.585/2015, art. 58 §1º](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=67494) atribui custo às ações bonificadas pelo valor de lucros/reservas capitalizados. O motor anterior apenas aumentava a quantidade e diluía o custo médio. Agora bloqueia o evento sem essa evidência; não cria custo zero.
- FII: [Receita Federal, Fundos de Investimento no Brasil](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/fundos-de-investimento-no-brasil) indica 20% sobre ganho de alienação de cota em bolsa. O ID `RULE_FII_ALIENATION_EXEMPT_PF` é um nome legado enganoso e permanece pendente; nenhuma isenção é habilitada.
- JCP: [IN RFB 1.700/2017, art. 75 §7º, redação de 2026](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268) indica 17,5% no pagamento ou crédito. Referências antigas de 15% não são adequadas para fatos posteriores à alteração.
- Dividendos: [Lei 15.270/2025, art. 6º-A](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm) introduz retenção condicional a partir de janeiro de 2026, incluindo agregação por fonte pagadora/mês e transição. Não há no ledger prova suficiente para inferir retenção.
- RF: regimes de CDB, CRA, LIG e debênture incentivada não podem compartilhar uma tabela única sem classificação documental. ETF de ticker terminado em `11` também não pode ser presumido FII. Ambos ficam como bloqueios de classificação.

Fontes publicadas para o **exercício IRPF 2026** tratam majoritariamente do **ano-calendário 2025** e não certificam, sozinhas, fatos de 2026. A matriz preserva datas de publicação e marca explicitamente as ainda não verificadas. Revisão tributária independente e evidência fiscal de abertura, custos, perdas e retenções continuam necessárias antes de qualquer imposto devido.
