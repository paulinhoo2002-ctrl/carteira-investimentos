# Revisão local após Package2 V3

Escopo: branch fiscal local, sem leitura ou escrita hospedada. O commit
`0d42a6e` contém somente `package2/v3.js`, `package2/promotion-dry-run.js`,
`tests/package2-v3-local.test.js` e o contrato local. Nenhum arquivo privado
foi incluído. V3 ainda não é carregado pelo aplicativo: o Dashboard atual lê
`package2_v2` em `index.html`. Portanto, os testes V3 certificam contrato e
simulação, não integração visual ou persistência hospedada.

## WIP preexistente preservado

| Arquivo | Classe | Papel e limite para commit |
| --- | --- | --- |
| `ir2026/rules.js` | IR2026_REQUIRED | Gate de status legal; precisa revisão independente da autoridade de cada regra. |
| `ir2026/rules/legal-review-2026.json` | IR2026_REQUIRED | Evidências legais; fonte externa e interpretação ainda precisam revisão humana. |
| `ir2026/rules/rules-2026.json` | IR2026_REQUIRED | Registro de regras; não promover só porque testes locais passam. |
| `ir2026/scripts/build-fiscal-2026.js` | IR2026_REQUIRED | Dry run fiscal; depende da abertura e do ledger, não de V3. |
| `tests/ir2026-contracts.test.js` | IR2026_REQUIRED | Testa o novo registro; acompanha a revisão das regras. |
| `ir2026/fiscal-product.js` | IR2026_REQUIRED | Cálculo fiscal provisório; bloqueado pelos achados abaixo. |
| `ir2026/ui/product.js` | IR2026_REQUIRED | UI fiscal não ligada ao `index.html`; precisa corrigir zero e cobertura antes de integrar. |
| `scripts/qa/ir2026-visual-review.js` | IR2026_REQUIRED | Harness local; não prova UI fiscal nova, pois ela não está montada no app. |
| `tests/ir2026-annual-state-machine.test.js` | IR2026_REQUIRED | Testes sintéticos do módulo fiscal provisório. |
| `tests/ir2026-audit-api.test.js` | IR2026_REQUIRED | Testes sintéticos da explicação fiscal. |
| `tests/ir2026-darf-guard.test.js` | IR2026_REQUIRED | Testes sintéticos do guard; booleanos injetados não certificam fontes. |
| `tests/ir2026-monthly-state-machine.test.js` | IR2026_REQUIRED | Testes sintéticos de fechamento mensal. |
| `<PRIVATE_QA_STATE>/rules-closure.csv` | UNKNOWN | Planilha legal separada; origem e autorização de publicação não comprovadas. |
| `FINAL_REPORT.txt` | TEMP | Relatório de checkpoint anterior, não é fonte de código. |
| `test.js` | TEMP | Teste trivial isolado, fora da suíte oficial. |

`PACKAGE2_REQUIRED=0` no WIP anterior. Todos os arquivos da tabela ficaram
fora do staging desta missão. Não há dado financeiro privado bruto entre os
novos arquivos versionados. O candidato V3 e a checklist futura ficam apenas
na pasta local ignorada `.qa-state`.

## Achados que bloqueiam promoção fiscal

1. `ir2026/fiscal-product.js:45-93` declara consumir taxas do registro, mas
   usa limite e percentuais literais. Uma mudança legal no JSON não altera o
   cálculo. Corrigir a leitura de valores do registro e testar a vigência
   antes de publicar ou calcular imposto.
2. `ir2026/rules.js:10-63` aceita `VERIFIED_SECONDARY_SUPPORT` no gate de
   cálculo, enquanto sua validação exige apenas uma URL HTTP. Evidência de
   suporte não equivale automaticamente à autoridade legal. Exigir revisão
   independente da classificação e dos documentos.
3. `ir2026/fiscal-product.js:111-145` permite estado mensal `CERTIFIED` com
   um `dataStatus` fornecido pelo caller e recomenda DARF por booleanos
   fornecidos pelo caller. Os testes verificam a tabela booleana, não a
   proveniência dos três gates fiscais. Manter sem integração produtiva.
4. `ir2026/ui/product.js:31-49` apresenta um resultado certificado como
   `—` quando não há certificado. Ausência não comprova zero. A UI
   precisa exibir indisponibilidade e cobertura antes de ser ligada.
5. `scripts/qa/ir2026-visual-review.js` procura o painel de prontidão já
   existente e registra parte de seu texto. Isso não valida o renderer novo;
   evitar texto financeiro em logs de QA e testar o componente real.

Os 175 testes IR2026 verdes mostram que o código atual satisfaz os asserts;
eles não resolvem estes achados de autoridade, apresentação e integração.

## Dependências e ausência de duplicação operacional

```text
extrato atual privado -> parser/normalização privada -> snapshot Inter
  -> contrato Package2 V3 -> read model local -> Dashboard futuro (não ligado)

fontes fiscais autorizadas -> opening-fiscal -> tax-ledger/ledger
  -> fechamento mensal e certificação -> readiness UI atual
  -> UI fiscal nova (ainda não ligada)
```

O resultado atual é recebido de um campo de extrato com escopo
`CURRENT_POSITION_RESULT`; V3 não o recalcula. O Dashboard produtivo continua
na autoridade V2 até uma integração própria. O custo atual e o resultado do
extrato não alimentam abertura, custo ou resultado fiscal. O status de regras
verificadas aparece duplicado em `ir2026/rules.js`, `ir2026/fiscal-product.js`
e no filtro de `build-fiscal-2026.js`; unificar na fase fiscal, após decidir
a autoridade legal correta. Status de renda V3 continuam separados de renda
V2; nenhum total parcial é promovido por serialização.

## Próximo gate remoto, ainda não autorizado

Primeiro provar o UID esperado com **uma consulta pontual de Auth**. Depois,
ler **um único** `portfolios/{uid}` exato, sem varrer coleção. Confirmar
projeto, banco, UID, caminho, `update_time`, identidade Package1A, identidade
Package2 V2, versão V3 e hash do candidato. Só então calcular diff local.
Qualquer divergência encerra o gate. A checklist privada guarda campos
desconhecidos como `null`; não existe UID ou identidade Package1A presumidos.
Nenhuma operação remota foi executada nesta missão.
