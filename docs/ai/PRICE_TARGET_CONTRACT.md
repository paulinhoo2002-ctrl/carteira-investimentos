# Contrato do preço-alvo / preço-teto manual (análise V15 — sem mudança de código)

Status: **ANÁLISE E PROPOSTA**. Nenhum código, dado ou schema foi alterado. Qualquer implementação exige
fase própria, testes específicos e, havendo migração, aprovação separada do proprietário.

## O que o código faz hoje (verificado em `index.html`)

| Ponto | Comportamento | Observação |
|---|---|---|
| Formulário do ativo (`#f-pt`, rótulo "Preço alvo") | Lê com `parseNum(...)` e grava `price_target` | `parseNum` devolve **0** para vazio, nulo, inválido ou texto → ausente vira `0` |
| Normalização do ativo (`price_target:Number(old.price_target)\|\|0`) | Qualquer valor não numérico, `null` ou ausente vira `0` | Viola `MISSING != ZERO` na persistência |
| Coluna "Alvo" da tabela de Ativos | Lê **`target_price` ou `alvo`**, nunca `price_target` | O valor digitado no formulário não alimenta a coluna; dados importados usam outro campo |
| Exibição | `hasOwnFiniteNumber(a,['target_price','alvo'])` ? `fmt(valor)` : `—` | Ausente exibe `—` (correto), mas `target_price: 0` exibe `R$ 0,00` |
| Moeda | Sem campo de moeda; `fmt` formata sempre em BRL | Ativos em outras moedas (ex.: ETFs do exterior) não têm contrato |
| Filtro / ordenação | Não há filtro por preço-alvo | Ordenação por "Alvo" não distingue ausente de zero |

Conclusão: há **dois campos divergentes** (`price_target` gravado, `target_price`/`alvo` exibido) e a
persistência **converte ausente em zero**. Isso é um defeito de contrato, não de CSS.

## Contrato esperado (proposta)

| Estado | Representação persistida | Exibição | Ordenação/filtro |
|---|---|---|---|
| Ausente / nunca informado | campo omitido (ou `null`) | `—` + texto acessível "sem preço-alvo" | ordenado ao final; filtro "sem alvo" |
| Zero informado explicitamente | `0` somente se o usuário confirmar que é zero | `R$ 0,00` com rótulo "zero informado" | tratado como valor, não como ausente |
| Valor válido | número finito `> 0` | valor formatado na moeda do ativo | comparação com preço atual só se a moeda coincidir |
| Inválido (texto, negativo, NaN) | rejeitado no formulário com mensagem; nunca gravado | mensagem de validação | — |
| Moeda | campo `target_price_currency` (default = moeda do ativo) | símbolo correto | comparar apenas moedas iguais; caso contrário "moeda diferente" |

Regras de campo único: eleger **um** nome canônico e mapear o outro na leitura, sem apagar o original.
Compatibilidade: leitura aceita `price_target`, `target_price` e `alvo`; escrita futura usa o canônico.

## Plano seguro (para fase própria)

1. Testes RED: ausente≠zero no formulário e na normalização; coluna lê o mesmo campo que o formulário grava;
   moeda divergente não compara; importados continuam exibindo o valor original.
2. Mudança mínima: `parseNum` não é alterado (usado em todo o app); criar leitura dedicada para o campo,
   retornando `null` para vazio.
3. **Sem migração em massa.** Registros existentes com `price_target: 0` são ambíguos (zero ou ausente);
   não reescrever. Tratar `0` legado como "não informado" **na exibição**, e pedir confirmação ao proprietário
   antes de qualquer regravação.
4. Backup protegido antes de testar em carteira real; QA apenas com fixture sintética.

Risco de dados: **MÉDIO** (interpretação de `0` legado). Pedir aprovação separada antes da etapa 3.
