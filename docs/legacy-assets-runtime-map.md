# Mapa do runtime real dos ativos legados

## Resumo executivo

O runtime legado nao espalha os ativos por varios estados independentes: a base operacional e a carteira ativa em memoria dentro de `S`, com sincronizacao entre a carteira ativa e a lista de carteiras via `syncStateFromWallet()` e `syncWalletFromState()` em `index.html`.

Para relatorios, os ativos passam por `reportAssetRows()`, que mapeia `S.assets` com `buildReportAssetRow()` e injeta as funcoes financeiras canônicas do legado. Isso ja e suficiente para gerar snapshots somente leitura no futuro, desde que a nova fronteira receba dependencias explicitas e nao leia storage, Firebase, DOM global ou globals novos.

## Estrutura canonica dos ativos

- Estrutura canonica em execucao: a carteira ativa dentro de `S`, sobretudo `S.assets`, espelhada pela entrada ativa em `S.wallets`.
- Arquivo: `index.html`.
- Escopo: estado global do app legado.
- Lifecycle:
  - `load()` carrega e reidrata o estado inicial.
  - `syncStateFromWallet(w)` copia da carteira persistida para `S`.
  - `syncWalletFromState()` copia de `S` de volta para a carteira ativa.
  - `syncAssetsFromAportes()` recalcula `S.assets` a partir dos aportes.
  - `refreshCotacao()` atualiza cotacao e valores de mercado em memoria.
  - `applyBackupData()` substitui o estado por restauracao controlada.
  - Firebase snapshot e sync remoto podem substituir a carteira ativa apos login.

## Lifecycle completo

```
persistencia / Firebase
↓
load() / snapshot remoto / importacao / restore / recálculo
↓
carteira ativa em memoria (S, especialmente S.assets)
↓
funcoes financeiras canônicas
↓
reportAssetRows() -> buildReportAssetRow()
↓
relatorios legados
```

## Arquivos e funcoes envolvidos

### Carregamento e estado

- `index.html:3669-3737` define `S`.
- `index.html:3946-4055` define `ensureWallets()`, `activeWallet()`, `syncStateFromWallet()` e `syncWalletFromState()`.
- `index.html:4118-4131` define `save()`.
- `index.html:4367-4449` define `load()`.
- `index.html:5448-5495` define a restauracao de backup.
- `index.html:4775-4888` define o payload cloud, o listener e a escrita remota.
- `index.html:4888-4902` define login e logout Google.
- `index.html:14430-14588` define `syncAssetsFromAportes()`.
- `index.html:21505-21582` define `refreshCotacao()`.

### Funcoes financeiras e relatorios

- `legacy/reports-readonly-source.js:1-252` concentra o provider readonly legado e a validacao de snapshot.
- `finance-core.js:40-72` expoe `configure()`, `assetAppliedValue()`, `assetCurrentValue()`, `assetJurosValue()` e `assetRentabPct()`.
- `index.html:10794-10818` usa os wrappers e configura `FinanceCore`.
- `index.html:11416-11436` define `metaTicker()`.
- `index.html:11222-11295` define `normalizeType()`.
- `index.html:15409-15416` define `reportAssetRows()` e passa dependencias explicitas para `buildReportAssetRow()`.
- `report-asset-row.js:3-34` define a unica implementacao de `buildReportAssetRow()`.

## Pontos de leitura

- `load()` le de `localStorage`.
- `load()` tambem le migracoes antigas e depois reidrata a carteira ativa.
- Firebase le o estado remoto apos autenticao e atualiza a carteira ativa via callback de snapshot.
- `applyBackupData()` le um payload de backup e aplica restauracao.
- `syncAssetsFromAportes()` le os aportes e recompõe `S.assets`.
- `refreshCotacao()` le a cotacao atual e reescreve valores derivados do ativo.

## Pontos de escrita

- `save()` grava `localStorage` e pode agendar sincronizacao cloud.
- `syncWalletFromState()` escreve o estado da carteira ativa.
- `syncStateFromWallet()` escreve `S`.
- `syncAssetsFromAportes()` substitui `S.assets`.
- `refreshCotacao()` altera o ativo selecionado.
- `applyBackupData()` substitui o estado restaurado.
- `uploadLocalToCloud()` grava no Firebase.

## Campos armazenados

Nos ativos e carteiras, os campos reais observados e usados incluem:

- `ticker`
- `name`
- `type`
- `qty`
- `avg_price`
- `current_price`
- `applied`
- `current`
- `sector`
- `source`
- `updated_at`
- campos auxiliares de metadados e flags do estado global

## Campos calculados

- `applied` e `current` podem ser derivados por `FinanceCore`.
- `result` e `resultPct` sao calculados pelo builder de relatorio.
- `allocationPct` e a participacao relativa no snapshot.
- `trend` deriva da variacao percentual.
- `summary.totalValue`, `summary.itemCount` e `summary.averageVariationPct` sao agregacoes do snapshot de relatorio.

## Dependencias financeiras

As funcoes canônicas que o relatorio ja consegue reutilizar sao:

- `assetAppliedValue()` em `finance-core.js`
- `assetCurrentValue()` em `finance-core.js`
- `assetJurosValue()` em `finance-core.js`
- `assetRentabPct()` em `finance-core.js`
- `metaTicker()` em `index.html`
- `normalizeType()` em `index.html`

`buildReportAssetRow()` tambem depende explicitamente dessas funcoes quando `reportAssetRows()` monta a lista de ativos.

## Ordem de inicializacao

1. `finance-core.js`
2. `persistence-core.js`
3. `report-asset-row.js`
4. bootstrap do `index.html`
5. `load()`
6. `initEditProtection()`
7. `initFirebase()`
8. `fetchQuotes()`
9. registro do service worker

Evidencias:

- `index.html:3584-3585`
- `index.html:21925-21977`

## Riscos

- A carteira ativa pode ser substituida por varias fontes ao longo da execucao: carga local, Firebase, importacao, backup e recálculo.
- `metaTicker()` depende de metadados aprendidos e pode refletir estado mutavel do app.
- O estado visivel do relatorio depende de `S.assets`, entao qualquer integracao futura precisa ler o estado certo no momento certo.
- Existe risco de snapshot desatualizado se a fronteira futura nao tratar atualizacoes apos load/import/sync/save/restore.

## Possiveis pontos de integracao

- A menor fronteira segura futura e externa ao React, recebendo explicitamente:
  - `getAssets`
  - `buildReportAssetRow`
  - `assetAppliedValue`
  - `assetCurrentValue`
  - `metaTicker`
  - `normalizeType`
- O ponto natural de composicao fica fora do `index.html` legado, mas ainda perto do host/runtime que consome a carteira ativa.
- O provider readonly pode existir como contrato pequeno e testavel, sem importacao direta do DOM legado.

## Opcao recomendada

Manter o legado como fonte de verdade e extrair somente um provider readonly pequeno, alimentado por dependencias explicitas. O provider deve receber a carteira ativa ja carregada em memoria e produzir o snapshot moderno sem escrever em nenhum storage.

## Opcoes rejeitadas

- Importar o legado dentro do React.
- Copiar a formula financeira para uma segunda implementacao.
- Criar store paralela permanente dos ativos.
- Ler diretamente de `localStorage`, `sessionStorage`, `indexedDB` ou Firebase dentro do novo contrato.
- Criar callback global novo, polling ou timer para detectar mudancas.

## Plano para a Fase 174

1. Criar a fronteira readonly minima no ponto de composicao do host.
2. Receber `getAssets` e as funcoes financeiras explicitas.
3. Gerar snapshot validado e congelado.
4. Conectar esse snapshot ao fluxo moderno sem tocar no React com acesso direto ao legado.
5. Cobrir o contrato com testes de leitura e imutabilidade.

## Rollback

- Remover `docs/legacy-assets-runtime-map.md`.
- Remover o teste estrutural associado.
- Nenhum arquivo funcional precisa ser alterado para desfazer esta fase.
