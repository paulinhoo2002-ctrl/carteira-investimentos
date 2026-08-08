# Regras Financeiras do Sistema

Este documento contém as regras de negócio extraídas diretamente do código-fonte existente, sem invenção ou interpretação adicional.

## Fonte
- `finance-core.js` - Lógica de cálculos financeiros
- `persistence-core.js` - Lógica de persistência e normalização de dados

## Ativos

### Tipos de Ativo
- Ação (padrão)
- Fundo de Investimento (FII, ETF, BDR, Stock, Reit)
- Renda Fixa
- Tesouro Direto
- Reserva de emergência
- Stock

### Normalização de Tipo de Ativo
Função `defaultNormalizeType` em `persistence-core.js`:
- Converte para maiúsculas, remove acentos e espaços extras
- Mapeia aliases:
  - ACAO, ACOES → Ação
  - FUNDO DE INVESTIMENTO, FUNDOS DE INVESTIMENTO → Fundos de Investimento
  - RENDA FIXA → Renda Fixa
  - TESOURO DIRETO → Tesouro Direto
  - RESERVA DE EMERGENCIA → Reserva de emergência
  - STOCK, STOCKS → Stock
  - REIT, REITS → Reit
- Retorna 'Ação' como fallback se não encontrado ou vazio

## Aportes (Contribuições)

### Cálculo do Valor Aplicado
Função `assetAppliedValue` em `finance-core.js`:
- Para ativos de Renda Fixa: usa o valor retornado por `rfValues().applied`
- Para outros ativos: `quantity * average_price`

### Valores na Estrutura de Ativo Renda Fixa
Conforme `rfValues` em `finance-core.js`:
- `appliedRaw`: rf_applied_value, fixed_initial_value, appliedValue, initialValue (em ordem de prioridade)
- `grossRaw`: rf_gross_value, fixed_gross_value, marketValue, currentValue
- `liquidRaw`: rf_liquid_value, fixed_current_value, liquidValue
- `currentStored`: current_price
- `unavailable`: rf_unavailable_value, unavailableValue
- `manualProfitRaw`: rf_profit_value
- `manualProfitSource`: rf_profit_source (padrão: 'derived')

### Cálculo do Valor Aplicado Final (`applied`)
Ordem de prioridade em `rfValues`:
1. `appliedRaw` se > 0
2. `fixedInitial` se > 0
3. `quantity * average_price`

### Cálculo do Valor Líquido (`liquid`)
Ordem de prioridade em `rfValues`:
1. `liquidRaw` se > 0
2. `fixedCurrent` se > 0
3. `currentStored` se > 0
4. 0

### Cálculo do Valor Bruto (`gross`)
Ordem de prioridade em `rfValues`:
1. `grossRaw` se > 0
2. `fixedGross` se > 0
3. 0

### Valor Corrente (`current`)
Lógica em `rfValues`:
1. Se `liquidCandidate` > 0 → usa `liquidCandidate`
2. Senão, se `grossCandidate` > 0 → usa `grossCandidate`
3. Senão, se `applied` > 0 → usa `applied`
4. Senão → null

### Indicador de Valor Corrente Explícito (`hasExplicitCurrent`)
Verdadeiro se:
- `liquidCandidate` > 0 OU
- `grossCandidate` > 0 OU
- `fixedCurrent` > 0 OU
- (`currentStored` > 0 E |`currentStored` - `applied`| > 0.0001)

## Vendas

### Cálculo do Valor de Venda
Reutiliza as mesmas funções de valor corrente:
- Para Renda Fixa: `assetCurrentValue()` → chama `rfValues().current`
- Para outros ativos: `quantity * current_price`

## Dividendos (Proventos)

### Tratamento nos Objetivos
Conforme `defaultNormalizeGoals` em `persistence-core.js`:
- Estrutura base para proventos:
  ```javascript
  proventos: {
    types: ['Ação', 'FII', 'ETF', 'BDR', 'Stock'],
    monthly: 0
  }
  ```
- Tipos são normalizados via `defaultNormalizeType`
- Duplicatas são removidas
- Se nenhum tipo válido permanecer, usa a lista base

### Tipos Suportados para Proventos
- Ação
- FII (Fundos de Imobiliários)
- ETF
- BDR (Brazilian Depositary Receipts)
- Stock

## Renda Fixa (RF)

### Detalhes dos Cálculos RF
Conforme `rfValues` em `finance-core.js`:

#### Entradas
- `qty`: quantidade (padrão: 0)
- `avg_price`: preço médio (padrão: 0)
- `current_price`: preço atual armazenado (padrão: 0)
- Valores brutos:
  - `rf_applied_value` / `fixed_initial_value` / `appliedValue` / `initialValue`
  - `rf_gross_value` / `fixed_gross_value` / `marketValue` / `currentValue`
  - `rf_liquid_value` / `fixed_current_value` / `liquidValue`
  - `rf_ir_iof` / `ir_iof` / `iriof`
  - `rf_unavailable_value` / `unavailableValue`
  - `rf_profit_value`
  - `rf_profit_source`
  - `fixed_initial_value`
  - `fixed_current_value`
  - `fixed_gross_value`

#### Processamento
1. Todos os valores são convertidos para Number, com fallback para 0 se inválido
2. `applied` é determinado pela ordem de prioridade acima
3. `liquidCandidate` e `grossCandidate` seguem suas respectivas ordens
4. `current` é determinado conforme lógica descrita
5. `hasExplicitCurrent` indica se há fonte explícita de valor corrente
6. `derivedProfit` = `current` - `applied` (se ambos válidos e `applied` > 0)
7. `hasManualProfit` é verdadeiro se:
   - `manualProfitRaw` não é undefined/null
   - Após trim, não é string vazia
   - `manualProfitSource` não é 'derived'
8. `profit` = `manualProfitRaw` se `hasManualProfit`, senão `derivedProfit` (ou 0 se não numérico)
9. `rentab` = (`profit` / `applied`) * 100 (se profit finito e applied > 0)

#### Saída da Função `rfValues`
Retorna objeto com:
- `qty`, `avg`, `applied`, `current`, `currentStored`
- `fixedInitial`, `fixedCurrent`, `gross`, `liquid`
- `irIof`, `unavailable`, `profit`, `rentab`
- `hasExplicitCurrent`, `hasManualProfit`

### Funções de Acesso RF em `finance-core.js`
- `assetAppliedValue(a)` → para RF: retorna `rfValues(a).applied`
- `assetCurrentValue(a)` → para RF: retorna `rfValues(a).current`
- `assetJurosValue(a)` → para RF: retorna `rfValues(a).profit` se finito, senão null
- `assetRentabPct(a)` → para RF: retorna `rfValues(a).rentab` se finito, senão null

## Eventos de Renda Fixa (`rfEvents`)

### Estrutura em `persistence-core.js`
- Array armazenado no estado: `rfEvents: Array.isArray(s.rfEvents) ? s.rfEvents : []`
- Incluído em `buildStoredState` e `serializeStoredState`
- Parte do estado que é backupado e persistido

## Saldo

### Cálculo do Saldo Total
- Soma de `assetCurrentValue()` para todos os ativos
- Para RF: usa o valor corrente calculado conforme acima
- Para outros: quantidade × preço corrente

### Saldo por Tipo
- Pode ser filtrado por tipo de ativo (usando `isRendaFixaAsset` ou comparação direta)

## Movimentações

### Tipos de Movimentação implícitos
- Aporte (contribuição): incremento na lista `aportes`
- Resgate (saque): decremento na lista `aportes` ou movimentação específica
- Dividendo: incremento na lista `proventos`
- Taxas: podem estar em campos específicos como `irIof`, `unavailable`

### Persistência de Movimentações
Conforme `persistence-core.js`:
- `aportes`: Array.isArray(s.aportes) ? s.aportes : []
- `proventos`: Array.isArray(s.proventos) ? s.proventos : []
- `rfEvents`: Array.isArray(s.rfEvents) ? s.rfEvents : []
- Todos são incluidos em `buildStoredState` e serializados para JSON

## Validações

### Validação de Dados de Entrada
- Conversão automática para Number com fallback para 0 em `rfValues`
- Verificação de finitude com `Number.isFinite()` antes de cálculos
- Proteção contra divisão por zero (verifica `applied > 0` antes de calcular rentabilidade)
- Tratamento de valores nulos/undefined com operadores `|| 0` ou `|| fallback`

### Validação de Tipos
- `isRendaFixaAsset(a)`: verifica se `String(a?.type||'').trim() === 'Renda Fixa'`
- Funções RF primeiro verificam se o ativo é de RF antes de processar

## Duplicidade

### Prevenção de Duplicatas em Tipos
Conforme `defaultNormalizeGoals`:
- Uso de `new Set()` para eliminar duplicatas na lista de tipos de proventos
- Filtragem de valores vazios após normalização
- Reposição pelos tipos base se lista ficar vazia

### Persistência Única
- O estado inteiro é serializado como JSON único por chave de storage
- Sobrescreve completamente o valor anterior em cada transação

## Cálculo Financeiro

### Princípios
1. **Isolamento**: Regras financeiras estão exclusivamente em `finance-core.js`
2. **Pureza**: Funções em `finance-core.js` não têm efeitos colaterais (não acessam DOM ou storage diretamente)
3. **Composição**: Funções complexas são construídas a partir de funções básicas
4. **Fallback**: Valores inválidos são convertidos para padrões seguros (0, null, etc.)
5. **Ordem de Prioridade**: Múltiplas fontes de dados são verificadas em sequência definida

### Fluxo de Cálculo para RF
1. Dados brutos são lidos do objeto do ativo
2. Cada campo é convertido para Number com tratamento de inválidos
3. Valores finais são calculados seguindo regras de prioridade
4. Indicadores de consistência são gerados (`hasExplicitCurrent`, `hasManualProfit`)
5. Resultados são retornados como objeto estruturado para consumo pelas funções de acesso

### Consistência entre Camadas
- `persistence-core.js` lê/grava o estado bruto
- `finance-core.js` calcula valores derivados a partir desse estado bruto
- Nenhuma camada modifica as regras da outra
- Interface clara: persistence fornece dados, finance fornece cálculo

## Pontos Críticos Extraídos do Código

### finance-core.js
- Linhas 7-32: Definição dos defaults e função `rfValues` (cálculo completo de RF)
- Linhas 48-50: `assetAppliedValue` - delega para `rfValues().applied` se RF
- Linhas 52-54: `assetCurrentValue` - delega para `rfValues().current` se RF
- Linhas 56-60: `assetJurosValue` - retorna lucro se finito para RF
- Linhas 62-70: `assetRentabPct` - retorna rentabilidade se finito para RF

### persistence-core.js
- Linhas 6-24: `defaultNormalizeType` - normalização de tipos de ativo
- Linhas 26-63: `defaultNormalizeGoals` - normalização de estrutura de metas
- Linhas 69-97: `buildStoredState` - construção do estado para persistência
- Linhas 103-105: serialização/desserialização de estado
- Linhas 151-176: criação de payload de backup
- Linhas 188-205: cálculo de estatísticas de backup

## Conclusão
Todas as regras acima são extrações diretas do código-fonte fornecido, sem adição, interpretação ou invenção de regras externas ao sistema existente.