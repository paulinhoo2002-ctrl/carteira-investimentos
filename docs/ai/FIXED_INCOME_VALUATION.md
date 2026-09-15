# Valuation de renda fixa

## V80 — evidência operacional

O provider `fixed-income-benchmark-provider.js` usa a versão `v80.1`, mantém
o SGS/BCB série 12 como fonte gratuita do CDI e produz apenas resultados
`SHADOW_ONLY`. O relatório por posição inclui estimativa bruta, delta contra o
valor manual, cobertura ponderada e proveniência da série.

O cache tem TTL e cópia defensiva. Respostas vazias, inválidas, intervalos
incompletos e timeout falham fechado, sem misturar benchmark público e dados
privados da carteira.

## Regra de autoridade

Valores manuais/importados permanecem a autoridade do portfolio. O cálculo
automático é derivado e contratual: serve para comparação, frescor e
diagnóstico, mas não escreve `civ5`, eventos realizados ou transações.

## Fontes e cobertura

O provider gratuito usa o SGS do Banco Central, série CDI 12, cuja taxa é
diária em percentual ao dia. A série é cacheável e só aplica fatores fornecidos
para dias úteis; fins de semana não recebem juros inventados.

Contratos CDI com principal, data de aplicação e percentual explícitos podem
ter estimativa bruta composta. Imposto, resgates, liquidez e regras específicas
do produto não são inferidos. IPCA+/CRA/debênture exigem defasagem, índice e
fluxos do título; sem esses campos ficam `UNSUPPORTED_IPCA_EXACT`.

O percentual só é aceito quando explícito, como `100% CDI` ou `85% do CDI`;
texto sem percentual não gera valuation automático.

## Datas

`updated_at`/`quoteUpdatedAt` representam a última atualização do registro,
não o dia em que uma reconstrução foi gerada. O snapshot de 08/09 não altera o
`valueAsOf` real dos títulos; nos registros B3/XP ele é 18/06/2026. Ausência de
timestamp é `UNKNOWN`, nunca `LIVE`.

A divergência V74/V77 é semântica: `08/09` é data de captura/reconstrução,
enquanto `18/06` é o último timestamp efetivo dos registros B3/XP. Os três
registros manuais sem timestamp continuam `UNKNOWN`.

Na reconciliação V81, `financialAsOf` só é preenchido quando existe evidência
temporal financeira. `applicationDate` serve para iniciar o cálculo contratual,
mas não autoriza comparar o valor manual atual como se fosse daquela data.
Comparação same-as-of sem data financeira comprovada é `NOT_COMPARABLE`.

## Segurança

O valuation automático é somente leitura e falha fechado para série incompleta,
principal inválido, intervalo inválido ou percentual ambíguo. Deltas grandes
entre manual e estimado entram em revisão.

## V82 — aquisição de timestamps e semântica de fundos (15/09/2026)

O registry `fixed-income-source-semantics.js` separa data financeira de data de
aplicação, captura, reconstrução, importação e atualização técnica.
`updated_at`/`quoteUpdatedAt` não são promovidos para HIGH sem vínculo explícito
ao valor; CRA JBS e DEB MOVIDA permanecem MEDIUM em 18/06/2026 e as outras três
posições permanecem UNKNOWN.

A [lâmina pública da CVM](https://cvmweb.cvm.gov.br/SWB/Sistemas/SCW/CPublica/CPublicaLamina.aspx?PK_PARTIC=275963&PK_SUBCLASSE=-1)
confirma o TREND DI FIC como fundo de cotas (CNPJ 45.278.833/0001-57), com CDI
como referência de rentabilidade. Trend DI FIC e Trend DI II passam a
`CDI_BENCHMARK_SHADOW`, não `DETERMINISTIC_CDI_PERCENT`; valuation automático e
autoridade continuam bloqueados.

O relatório local `.qa-state/v82-fixed-income-source-timestamps.json` é somente
diagnóstico. Nenhum valor manual, ledger, evento realizado, snapshot financeiro
ou autoridade foi alterado.
