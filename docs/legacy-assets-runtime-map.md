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

## Fase 177 - host readonly observavel e verificavel

Frentes observaveis:

- o host experimental distingue carteira ativa real, snapshot vazio valido, fallback readonly e demo source;
- o diagnostico readonly mostra apenas `originMode`, `itemCount`, `generatedAt`, presenca de `notice` e status do ultimo refresh;
- o diagnostico e profundamente congelado e nao vaza `S.assets` ao React;
- o fallback readonly fica identificavel visualmente no host experimental sem redesenhar a tela;
- o shell independente continua demonstrativo e mostra o diagnostico readonly da fonte demonstrativa.

Fluxo:

```
S.assets em memoria
â†“
getAssets explicito no bootstrap experimental
â†“
createLegacyAssetsReadonlyProvider(...)
â†“
snapshot validado e congelado
â†“
bridge
â†“
controller
â†“
diagnostico readonly
â†“
adapter
â†“
React experimental
```

Estados da origem:

- `real-wallet`: a carteira ativa tem itens e foi lida pelo entrypoint experimental;
- `empty-wallet`: a carteira ativa foi lida, mas veio vazia;
- `fallback-readonly`: o provider caiu para o snapshot readonly seguro;
- `demo-source`: o host isolado segue no modo demonstrativo quando nao ha injeccao real.

Refresh:

- o refresh continua manual e controlado pelo host;
- a leitura le `getAssets` novamente e atualiza o diagnostico;
- o ultimo snapshot valido e preservado em erro;
- nao existe polling, telemetria ou escrita.

Isolamento:

- somente o bootstrap experimental conhece `S.assets`;
- `modern/src` continua sem acesso direto a `S.assets`;
- o shell independente nao ganha esse diagnostico;
- a composicao continua removivel sem tocar no fluxo principal.

Rollback:

- remover a observabilidade do host experimental, os testes associados e a doc desta fase;
- manter o provider readonly e a ponte como estavam na fase anterior.

## Fase 178 - navegacao controlada para o relatorio readonly real

Entrada experimental:

- a aplicacao legada mostra uma entrada discreta na tela de Relatorios apenas em `localhost` ou `127.0.0.1` com `testMode=1`;
- a entrada abre `index.html?activeWalletHost=1&testMode=1`, sem substituir o menu nem a rota principal;
- o host experimental continua isolado e readonly.

Retorno:

- o host experimental mostra um banner minimo com `Relatório experimental somente leitura`;
- o botao `Voltar ao legado` retorna para a aplicacao anterior sem escrita;
- quando o navegador tiver historico util, o retorno preserva o estado anterior da navegacao.

Fluxo:

```
Relatorios legado
â†“ entrada experimental opt-in
host readonly experimental
â†“ banner de retorno
legado novamente
```

Estado permitido:

- entrada invisivel em producao normal;
- entrada visivel somente com opt-in local;
- host readonly segue sem `S.assets` em `modern/src`;
- falha estrita em `testMode=1` continua explicita;
- fallback visual fora do modo estrito continua seguro.

Seguranca:

- nenhuma escrita e introduzida;
- nenhum storage, Firebase, Auth, sync ou backup e acessado;
- nenhuma duplicacao de calculo e adicionada;
- a navegação nova continua facilmente removivel.

Rollback:

- remover a entrada experimental da tela de Relatorios;
- remover o banner de retorno do host;
- remover os testes novos e a atualizacao documental desta fase;
- manter os contratos readonly anteriores intactos.

## Fase 179 - contexto visual de sessao no relatorio readonly

Estados visuais preservados:

- pagina moderna selecionada no shell readonly experimental;
- estado de menu apenas quando ja existir e for seguro restaurar;
- nenhum filtro financeiro novo;
- nenhuma ordenacao nova;
- nenhuma seccao expandida nova.

Mecanismo:

- `readonlyReportPage` carrega somente um identificador visual seguro na URL experimental;
- o host experimental lê o valor valido ao abrir e atualiza a URL durante a navegacao;
- o retorno ao legado preserva o mesmo identificador visual na URL da sessao;
- ausencias ou valores invalidos caem no padrao seguro sem quebrar o host.

Proibido preservar:

- tickers;
- nomes completos de ativos;
- quantidades;
- precos;
- patrimonio;
- saldos;
- snapshot completo;
- diagnostico completo;
- qualquer dado financeiro sensivel.

Compatibilidade:

- producao normal segue sem entrada experimental;
- o shell moderno independente continua sem esse contexto;
- o retorno ao legado permanece disponivel;
- o fallback seguro continua quando o estado salvo e invalido.

Rollback:

- remover o parametro de URL da sessao experimental;
- remover a sincronizacao minima do host experimental;
- remover os testes e a documentacao da Fase 179;
- manter os contratos readonly anteriores intactos.

## Fase 180 - contrato unico das paginas readonly seguras

Fonte canonica:

- `readonly-report-page-contract.js` concentra a lista imutavel de paginas permitidas e a normalizacao segura reutilizada pelo legado e pelo moderno.
- O contrato e carregado pelo `index.html` legado e pelo `modern/host.html`; o modulo moderno de contexto readonly le o contrato exposto em runtime quando a sessao experimental esta ativa.

IDs permitidos:

- `overview`
- `assets`
- `fixed-income`
- `provents`
- `contributions`
- `reports`
- `settings`

Fallback:

- `reports`

Consumo:

- o legado usa `ReadonlyReportPageContract.normalizeReadonlyReportPageId(...)` para abrir e retornar do host readonly experimental;
- o modulo moderno de contexto de sessao usa o mesmo contrato em runtime para ler, validar e reescrever `readonlyReportPage`;
- `modern/host.html` carrega o contrato antes do bootstrap do host moderno;
- `modern/src/types/navigation.ts` continua com a navegacao moderna local e nao carrega contrato de sessao.

Seguranca:

- o contrato carrega apenas IDs visuais;
- nao preserva dados financeiros, snapshot, diagnostico, storage, Firebase, Auth, sync ou backup;
- valores vazios ou invalidos caem no fallback seguro;
- o shell independente continua sem depender do contexto de sessao.

Rollback:

- remover `readonly-report-page-contract.js`;
- reverter as referencias no `index.html` e no `modern/host.html`;
- remover os testes e a documentacao desta fase;
- manter a URL readonlyReportPage e o comportamento da fase 179 intactos.

Recomendacao para a Fase 181:

- reutilizar este contrato unico para qualquer nova validacao de pagina readonly;
- nao reintroduzir listas equivalentes em pontos separados.
