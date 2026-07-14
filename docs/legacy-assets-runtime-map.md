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

## Fase 174 - contrato do provider readonly

Contrato final:

- `createLegacyAssetsReadonlyProvider({ getAssets, buildReportAssetRow, assetAppliedValue, assetCurrentValue, metaTicker, normalizeType, getGeneratedAt, notice })`

Dependencias:

- `getAssets` entrega coleção em memoria, por dependencia explicita.
- `buildReportAssetRow` continua builder canonico da linha.
- `assetAppliedValue`, `assetCurrentValue`, `metaTicker` e `normalizeType` seguem canônicas e injetadas.
- `getGeneratedAt` e `notice` seguem opcionais, usados so para metadados do snapshot.

Fluxo:

```
colecao em memoria
↓
provider readonly
↓
buildReportAssetRow canonico
↓
snapshot validado e congelado
↓
bridge
↓
controller
↓
adapter
↓
React
```

Garantias:

- provider nao acessa `S` ou `S.assets`;
- provider nao acessa storage, Firebase, Auth, sync, backup, DOM ou React;
- provider nao cria copia permanente da coleção;
- provider le `getAssets` somente no `getSnapshot()`;
- snapshot, summary, items e cada item sao congelados profundamente;
- snapshot anterior permanece imutavel;
- nova leitura reflete coleção atual;
- falhas retornam fallback readonly valido sem escrever nada.

Erro:

- retorno invalido de `getAssets`, excecao em `getAssets` ou erro no builder cai no fallback readonly ja existente;
- controller preserva ultimo snapshot valido quando a falha vem do refresh;
- React nao recebe excecao.

Imutabilidade:

- ativos originais nao sao congelados;
- array original nao e congelado;
- apenas snapshot derivado e congelado.

Compatibilidade:

- `createLegacyReportsReadonlySource()` continua disponivel como alias do provider canonico;
- `installLegacyReportsReadonlySource()` permanece apenas para compatibilidade de modulo;
- o host experimental usa `createLegacyAssetsReadonlyProvider()` por exportacao explicita, sem escrita temporaria em `globalThis`.

Futuro:

- Fase 175 pode fornecer `getAssets: () => S.assets` por composicao externa, quando a carteira real em memoria estiver pronta para leitura controlada.

Riscos remanescentes:

- divergencia se a colecao mudar fora do refresh controlado;
- snapshot stale se a fase futura conectar uma fonte real sem callback explicito;
- necessidade de manter `buildReportAssetRow` como unica implementacao canônica.

Rollback:

- remover o provider alias novo se ele nao for mais necessario;
- manter `createLegacyReportsReadonlySource` como compatibilidade;
- nenhum dado real ou estado persistido depende desta fase.

## Fase 175 - composicao experimental com carteira ativa

Ponto de composicao:

- o unico ponto que conhece `S.assets` e o bootstrap experimental do `index.html`;
- a injeção acontece por `getAssets: () => Array.isArray(S.assets) ? S.assets : []`;
- o moderno continua recebendo apenas provider, bridge, controller e adapter;
- `S` nao atravessa a fronteira React.

Ordem:

```
S.assets em memoria
↓
getAssets explicito no bootstrap experimental
↓
createLegacyAssetsReadonlyProvider(...)
↓
snapshot validado e congelado
↓
bridge
↓
controller
↓
adapter
↓
React experimental
```

Contrato:

- leitura somente em `getSnapshot()`;
- snapshot anterior permanece imutavel;
- colecao vazia gera snapshot valido;
- ausencia de carteira ativa ou excecao de leitura cai no fallback readonly;
- nenhum dado e escrito;
- nenhum storage, Firebase, Auth, sync, backup ou DOM legado e exposto ao React.

Refresh:

- o botao `Atualizar previa` continua controlado pelo host experimental;
- cada refresh relê `S.assets` por meio de `getAssets`;
- o ultimo snapshot valido e preservado em erro;
- nao existe polling, timer ou callback global novo.

Isolamento:

- o entrypoint experimental e local e opt-in;
- a rota principal segue inalterada;
- o host moderno independente segue demonstrativo;
- a composicao experimental continua removivel sem mexer no legado principal.

Seguranca e privacidade:

- nao registrar ativos ou valores no console;
- nao serializar carteira em URL;
- nao usar dados reais em testes;
- nao criar copia permanente da carteira;
- nao ativar a composicao sem a leitura experimental explicita.

Riscos remanescentes:

- a carteira ativa pode mudar entre refreshes manuais;
- uma leitura invalida continua caindo no fallback readonly;
- a composicao continua dependente de `buildReportAssetRow` canonico e das funcoes puras reutilizadas.

Plano da Fase 176:

- revisar se a composicao experimental pode sair do `index.html` e virar um bootstrap dedicado ainda mais explicito;
- manter a mesma fronteira somente leitura;
- nao aproximar o React do legado.

Rollback:

- remover o bootstrap experimental do `index.html`;
- remover os testes e a doc desta fase;
- manter `createLegacyAssetsReadonlyProvider` e o host moderno como estavam na fase anterior.
