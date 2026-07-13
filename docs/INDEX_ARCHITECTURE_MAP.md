# Mapa arquitetural do index.html

## 1. Objetivo

Este documento descreve a estrutura atual do monolito `index.html` sem propor refatoracao imediata. O foco e registrar areas reais, responsabilidades, dependencias, fluxos criticos e riscos para preparar futuras extracoes de baixo risco com rastreabilidade.

## 2. Estado atual

- Arquivo analisado: `index.html`
- Linhas reais validadas: `21980`
- Tamanho aproximado: `1237980` bytes (`~1,24 MB`)
- Linguagem e tecnologia: HTML unico com CSS inline, JavaScript inline, `finance-core.js`, `persistence-core.js`, Firebase compat e PWA
- Grau de concentracao: muito alto; UI, estado, persistencia, auth, sync, importacao, relatorios e inicializacao coexistem no mesmo arquivo
- Modulos externos existentes:
  - `finance-core.js` (`index.html:3584`)
  - `persistence-core.js` (`index.html:3585`)
- Dependencias relevantes confirmadas:
  - Firebase App/Auth/Firestore (`index.html:3579-3581`, `index.html:4443-4466`)
  - `localStorage` (`index.html:3647`, `index.html:4124`, `index.html:4363`, `index.html:4792-4793`, `index.html:5448`)
  - Service Worker / PWA (`index.html:21957-21970`)
  - API externa via `fetchQuotes()` e endpoint local Yahoo (`index.html:14631`, `package.json`, `api/yahoo-quote.js`)
- Quantidade aproximada de funcoes nomeadas: `766`
- Quantidade aproximada de handlers inline: `313`

Metodo de contagem aproximada usado nesta fase:

- funcoes nomeadas:
  - busca textual por `function Nome(` no arquivo
  - inclui apenas declaracoes classicas nomeadas
  - nao cobre arrow functions, funcoes anonimas nem garante parser semantico
- handlers inline:
  - busca textual por atributos inline como `onclick=`, `onchange=`, `onsubmit=`, `oninput=`, `onblur=`, `onfocus=`, `onkeydown=`, `onkeyup=` e `onload=`
  - numero documental e aproximado; nao representa todos os possiveis `on*`
- limitacao:
  - por ser contagem textual, os numeros sao aproximados e nao devem ser tratados como totais exatos do monolito

## 3. Visao geral da arquitetura

Separacao real observada no arquivo:

- HTML estrutural:
  - shell base com `body`, `#root` e scripts encadeados (`index.html:3568-3586`)
- CSS inline:
  - bloco `<style>` centralizado no proprio arquivo (`index.html:32`)
- Estado global:
  - objeto `S` concentra dados de negocio, configuracao e UI (`index.html:3669-3737`)
  - objeto `FB` concentra auth, sync e acesso (`index.html:3624-3628`)
  - objeto `PWA` concentra prompt e status de instalacao (`index.html:3738-3741`)
- Configuracao:
  - constantes de storage, timer e token padrao (`index.html:3587-3608`)
  - tema salvo em storage (`index.html:3631-3667`)
- Autenticacao:
  - bootstrap Firebase, gate de acesso, login Google e permissoes (`index.html:4443-5008`)
- Persistencia local:
  - `save()`, `load()`, `saveConfig()` e transacao de restore (`index.html:4118-4131`, `index.html:4359-4409`, `index.html:5435-5476`)
- Sincronizacao remota:
  - payload cloud, listener Firestore, upload local e retry (`index.html:4573-4894`)
- Calculos financeiros:
  - wrappers para `FinanceCore` e calculos auxiliares locais de RF, patrimonio e rentabilidade (`index.html:10746-10805`, `index.html:14228-14370`)
- Renderizacao:
  - `render()`, `app()`, `content()` e tabs (`index.html:17330-17480`)
- Navegacao:
  - `go()`, tabs desktop/mobile e menu drawer (`index.html:17367-17406`, `index.html:21415-21435`)
- Modais:
  - backup, seguranca, alocacao, B3, nota, PDF e quick movement (`index.html:5092`, `index.html:8321`, `index.html:8751`, `index.html:9120`, `index.html:10441`, `index.html:19827`)
- Importacao/exportacao:
  - B3, nota corretora, backup JSON, CSV/JSON/PDF de relatorios (`index.html:5558-7818`, `index.html:5334-5434`, `index.html:15299-17246`)
- Backup/restauracao:
  - snapshot, payload, stats, import draft e `applyBackupData()` (`index.html:5327-5458`)
- Relatorios:
  - snapshot, rows helpers, cards, PDF executivo e PDFs por card (`index.html:15299-17296`)
- Integracoes externas:
  - Firebase, XLSX CDN, jsPDF CDN sob demanda e endpoint Yahoo (`index.html:3578-3581`, `index.html:15366-15374`, `index.html:14631`)
- PWA/service worker:
  - install prompt, aviso de update, registro e reload controlado (`index.html:21871-21970`)
- Inicializacao:
  - `loadThemePreference()`, `load()`, `initEditProtection()`, `initFirebase()`, `fetchQuotes()` e SW (`index.html:21925-21977`)

## 4. Tabela de areas

| Area | Responsabilidade | Evidencia | Dependencias | Dados manipulados | Risco | Possivel isolamento futuro |
| --- | --- | --- | --- | --- | --- | --- |
| Shell HTML | Carregar estrutura base, scripts e root | `index.html:3568-3586` | navegador, scripts externos | DOM base | medio | baixo; documentacao ou pagina shell |
| CSS inline | Tema, layout, componentes e estados visuais | `<style>` em `index.html:32` | tokens internos, markup | classes e layout | alto | medio; exige mapa previo e testes de UI |
| Estado global `S` | Fonte principal de dados e UI | `index.html:3669-3737` | quase toda a aplicacao | assets, aportes, proventos, rfEvents, UI state, goals | critico | baixo no curto prazo |
| Tema e preferencias | Alternancia e persistencia de tema | `index.html:3631-3667` | `localStorage`, `render()` | tema atual | baixo | alto; candidato simples |
| Multi-carteira | Sincronizar estado ativo com carteira selecionada | `index.html:3916-4045` | `S`, `save()`, `load()` | wallets, activeWalletId | alto | medio; depois de testes de roundtrip |
| Persistencia local | Salvar e carregar estado/configuracao | `index.html:4118-4131`, `index.html:4359-4409` | `PersistenceCore`, `localStorage`, wallet sync | estado salvo, config | critico | baixo; aguardar Fases 154 e 155 |
| Protecao entre abas | Evitar perda de dados por edicao concorrente | `index.html:4133-4295` | `localStorage`, `BroadcastChannel`, sync cloud | lock da aba, modo readonly | alto | medio; bloco concentrado mas sensivel |
| Auto-proventos | Atualizar proventos automaticos | `index.html:4309-4357` | assets, aportes, fetch auto | `S.proventos` | alto | medio; precisa teste de regressao |
| Firebase/Auth | Inicializar app cloud e gate de acesso | `index.html:4443-5008` | Firebase compat, Firestore, Google auth | usuario, acesso, sessao | critico | baixo; nao extrair agora |
| Sync cloud | Replicar carteira com Firestore | `index.html:4573-4894` | auth, Firestore, assinaturas de snapshot | payload cloud, retries | critico | baixo; nao extrair agora |
| Backup/restauracao | Exportar/importar backup real e restaurar storage | `index.html:5327-5476` | `PersistenceCore`, `localStorage`, UI backup | backup JSON, `civ5`, `civ5_cfg` | critico | medio; apos mais testes integrados |
| Importacao B3 / nota | Ler arquivos, classificar e revisar importacoes | `index.html:5558-7818` | XLSX, PDF parsing, validacoes | movimentos, posicoes, proventos, RF | critico | baixo; muito acoplado e extenso |
| Wrappers de calculo | Encapsular chamadas a `FinanceCore` | `index.html:10781-10805` | `FinanceCore`, helpers RF | valores aplicados, atuais, juros, rentab | alto | alto; candidato simples |
| Auditoria de dados | Diagnosticar completude sem alterar registros | `index.html:14137-14226` | snapshot de dados, render de alertas | alertas, score, filtros | medio | medio; bloco candidato futuro |
| Quotes / mercado | Atualizar precos e countdown | `index.html:14631` e init `21935-21977` | fetch, API Yahoo, timers | quotes, lastUpdate, countdown | alto | medio; precisa teste de rede |
| Relatorios | Montar snapshots, CSV/JSON/PDF e cards | `index.html:15299-17296` | dados consolidados, jsPDF, report helpers | snapshots de relatorio | alto | medio; bom candidato por sub-blocos |
| Render principal | Montar app inteiro e fallback seguro | `index.html:17330-17480` | `app()`, `bind()`, `content()`, modais | DOM completo | critico | baixo; nao extrair agora |
| Telas principais | Dashboard, Ativos, Aportes, Dividendos, Metas, Rentabilidade, IA, Auditoria, IRPF | `index.html:13727`, `14174`, `17276`, `18737`, `18797`, `18933`, `19387`, `20511`, `21032`, `21138`, `21370` | estado global e helpers | dados por aba | alto | medio; por areas menores depois do mapa |
| Navegacao mobile/desktop | Tabs, drawer e roteamento simples | `index.html:17367-17406`, `index.html:21415-21435` | `S.tab`, `render()` | estado de navegacao | medio | medio; candidato posterior |
| PWA/service worker | Update notice, install prompt e registro SW | `index.html:21871-21970` | browser APIs, `sw.js` | prompt, update state | medio | alto; candidato pequeno |
| Inicializacao | Ordem de bootstrap da app | `index.html:21925-21977` | tema, load, edit lock, Firebase, quotes, SW | app inteira | critico | baixo; requer testes dedicados |

## 5. Funcoes centrais

### `save()` — `index.html:4118`
- Responsabilidade: sincronizar carteira ativa no estado e persistir `S` via `PersistenceCore.serializeStoredState`
- Dependencias: `syncWalletFromState()`, `PersistenceCore`, `localStorage`, `queueCloudSave()`, lock de edicao
- Efeitos colaterais: grava storage local; pode disparar save cloud
- Risco de alteracao: critico
- Cobertura de testes existente: indireta pela camada `PersistenceCore` e por `npm test` (`80 + 30 + 6`)
- Cobertura ausente: roundtrip completo `save()/load()` no `index.html`

### `load()` — `index.html:4359`
- Responsabilidade: reconstruir `S` e config a partir de storage atual e legados, com fallback defensivo
- Dependencias: `PersistenceCore.parseStoredState()`, wallet normalization, `localStorage`
- Efeitos colaterais: reidrata estado global e pode migrar chaves antigas
- Risco de alteracao: critico
- Cobertura de testes existente: parcial, pela camada `PersistenceCore`
- Cobertura ausente: fluxo integrado direto do `load()`; previsto para Fase 154

### `initFirebase()` — `index.html:4443`
- Responsabilidade: inicializar Firebase, auth state, regras de acesso e bootstrap de cloud sync
- Dependencias: `window.firebase`, `firebaseConfig`, Firestore/Auth
- Efeitos colaterais: abre listeners, altera gate de acesso, pode iniciar sync
- Risco de alteracao: critico
- Cobertura de testes existente: ausente no CI atual
- Cobertura ausente: auth, gate, sync e erros de rede

### `uploadLocalToCloud()` — `index.html:4844`
- Responsabilidade: enviar payload local para Firestore
- Dependencias: `portfolioRef()`, `cloudPayload()`, `firebase.firestore.FieldValue`
- Efeitos colaterais: escrita remota, retry, toasts
- Risco de alteracao: critico
- Cobertura de testes existente: ausente
- Cobertura ausente: cenarios de rede, concorrencia e reconcilicacao

### `applyBackupData()` — `index.html:5435`
- Responsabilidade: restaurar backup de forma transacional em `civ5` e `civ5_cfg`
- Dependencias: `PersistenceCore.parseBackupRaw()`, `PersistenceCore.applyStorageTransaction()`, `load()`, `render()`
- Efeitos colaterais: sobrescreve storage local e reidrata app
- Risco de alteracao: critico
- Cobertura de testes existente: forte; `30` testes de persistencia + `6` integrados de restore
- Cobertura ausente: UX fina do modal e cenarios de browser especificos

### `syncAssetsFromAportes()` — `index.html:14416`
- Responsabilidade: recomputar carteira a partir dos movimentos, inclusive RF
- Dependencias: `S.aportes`, metadata, parsers e normalizadores
- Efeitos colaterais: reconstroi `S.assets`
- Risco de alteracao: alto
- Cobertura de testes existente: indireta pelos testes de `FinanceCore`
- Cobertura ausente: recomputacao integrada no monolito

### `reportsTab()` — `index.html:17276`
- Responsabilidade: montar shell de relatorios e cards de exportacao
- Dependencias: `reportsSnapshot()`, `reportExportCard()`, period filters
- Efeitos colaterais: leitura; nao altera dados
- Risco de alteracao: medio
- Cobertura de testes existente: ausente
- Cobertura ausente: UI/preview/export por card

### `downloadExecutivePdf()` — `index.html:15615`
- Responsabilidade: gerar PDF executivo direto via jsPDF
- Dependencias: `ensurePdfLibraries()`, `reportPdfSnapshot()`, helpers de relatorio
- Efeitos colaterais: carrega bibliotecas CDN sob demanda e dispara download
- Risco de alteracao: alto
- Cobertura de testes existente: ausente no CI
- Cobertura ausente: geracao multipagina e integridade visual automatizada

### `render()` — `index.html:17330`
- Responsabilidade: montar DOM completo, preservar scroll e aplicar fallback seguro
- Dependencias: `app()`, `bind()`, `content()`, `syncBodyModalLock()`
- Efeitos colaterais: substitui `#root.innerHTML`, reanexa listeners
- Risco de alteracao: critico
- Cobertura de testes existente: ausente
- Cobertura ausente: regressao de render, scroll e modais; previsto para Fase 157

### `content()` — `index.html:17464`
- Responsabilidade: roteamento simples por `S.tab`
- Dependencias: todas as tabs principais
- Efeitos colaterais: indiretos, por chamar funcoes de tela
- Risco de alteracao: alto
- Cobertura de testes existente: ausente
- Cobertura ausente: navegacao de tabs

### Bootstrap final — `index.html:21925-21977`
- Responsabilidade: definir ordem de inicializacao do app
- Dependencias: tema, `load()`, edit lock, Firebase, quotes, SW
- Efeitos colaterais: listeners globais, timers, fetch quotes, registro de SW
- Risco de alteracao: critico
- Cobertura de testes existente: ausente
- Cobertura ausente: ordem de bootstrap e comportamento de retomada

## 6. Estado global

### Variaveis globais importantes

- `FB` (`index.html:3624-3628`)
  - auth, db, user, assinatura cloud, flags de acesso e retry
- `THEME` (`index.html:3630`)
- `S` (`index.html:3669-3737`)
  - dados persistidos:
    - `assets`
    - `aportes`
    - `proventos`
    - `rfEvents`
    - `goals`
    - `learnMeta`
  - configuracoes:
    - `brapiToken`
    - `divGoal`
    - `dashPeriod`
    - `dashType`
    - `rentPeriod`
    - `rentType`
    - `rentBench`
    - `reportsPeriod`
  - estado de UI:
    - `tab`
    - `assetsInnerTab`
    - filtros de dividendos, aportes, auditoria
    - flags de modais
    - `pdfReportOpen`
    - `reportCardPdfType`
    - `mobileMenuOpen`
    - `mobileTopMenuOpen`
  - dados temporarios:
    - drafts de backup/importacao
    - revisoes B3/nota
    - `_fa`, `_fp`, `_fd`
    - timers e flags de automacao
- `PWA` (`index.html:3738-3741`)

### Estrutura principal dos dados

- carteira:
  - `assets`
  - `aportes`
  - `proventos`
  - `rfEvents`
- multi-carteira:
  - `wallets`
  - `activeWalletId`
- configuracao:
  - `brapiToken`
  - `divGoal`
- sync/auth:
  - `FB.user`
  - `FB.access`

Fato confirmado:
- estado de negocio e estado de UI estao fortemente misturados dentro de `S`

Hipotese controlada:
- futuras extracoes seguras devem isolar primeiro helpers puros, nao o objeto `S`

## 7. Fluxos criticos

### Inicializacao
- Entrada: carregamento da pagina
- Etapas principais:
  - `loadThemePreference()` (`index.html:21925`)
  - `load()` (`index.html:21931`)
  - `initEditProtection()` (`index.html:21932`)
  - `initFirebase()` (`index.html:21933`)
  - `syncAssetsFromAportes(false)` ou `render()` (`index.html:21935-21938`)
  - `fetchQuotes(false)` (`index.html:21940`)
  - registro de SW (`index.html:21957-21970`)
- Saida: app renderizada com listeners ativos
- Persistencia: `localStorage`, Firebase, Service Worker
- Riscos: ordem de bootstrap; corrida entre render, auth e sync
- Testes existentes: indiretos somente nas camadas core; sem teste integrado do bootstrap

### Carregamento
- Entrada: `load()`
- Etapas principais:
  - ler `STOR`
  - `PersistenceCore.parseStoredState()`
  - reidratar wallets ou arrays soltos
  - ler `STOR+'_cfg'`
  - migrar chaves antigas se necessario
- Saida: `S` preenchido
- Persistencia: leitura `localStorage`
- Riscos: schema antigo, dado corrompido, estado parcial
- Testes existentes: `30` persistencia; sem teste integrado do `load()`

### Salvamento
- Entrada: `save()`
- Etapas principais:
  - validar lock de edicao
  - sincronizar wallet ativa
  - serializar estado via `PersistenceCore`
  - gravar `localStorage`
  - agendar sync cloud
- Saida: estado salvo localmente
- Persistencia: `localStorage`, opcional Firestore
- Riscos: concorrencia entre abas; roundtrip nao testado no monolito
- Testes existentes: persistencia core; roundtrip previsto na Fase 155

### Restauracao de backup
- Entrada: `applyBackupData()`
- Etapas principais:
  - parse do backup
  - transacao `PersistenceCore.applyStorageTransaction()`
  - `load()`
  - `render()`
- Saida: storage restaurado e app reidratada
- Persistencia: `civ5`, `civ5_cfg`
- Riscos: UX de confirmacao; restore em ambiente com sync ativo
- Testes existentes: `6` integrados + `30` persistencia

### Sincronizacao
- Entrada: auth valido e listeners cloud
- Etapas principais:
  - montar `portfolioRef()`
  - gerar `cloudPayload()`
  - listener remoto via `startCloudSync()`
  - upload por `uploadLocalToCloud()`
- Saida: reconciliacao local/cloud
- Persistencia: Firestore
- Riscos: conflitos, retries, assinaturas, gating por acesso
- Testes existentes: ausentes no CI atual

### Renderizacao
- Entrada: qualquer mutacao em `S`
- Etapas principais:
  - `render()`
  - `app()`
  - `content()`
  - `bind()`
- Saida: DOM atualizado
- Persistencia: nao
- Riscos: regressao visual ampla, perda de listeners, scroll
- Testes existentes: ausentes; Fase 157 cobre UI basica

### Importacao de dados
- Entrada: arquivo B3, PDF de nota, planilha RF
- Etapas principais:
  - detectar tipo (`detectB3WorkbookKind()` / `detectB3PdfKind()`)
  - parse especifico
  - revisar modal
  - aplicar importacao
- Saida: movimentos/ativos/proventos/RF ajustados
- Persistencia: `S`, depois `save()`
- Riscos: classificacao, duplicidade, acoplamento com metadados
- Testes existentes: ausentes no CI atual

### Autenticacao
- Entrada: bootstrap Firebase ou clique em login
- Etapas principais:
  - `initFirebase()`
  - `FB.auth.onAuthStateChanged()`
  - `loadAccessControl()`
  - `signInGoogle()` / `signOutGoogle()`
- Saida: gate liberado ou bloqueado
- Persistencia: Firebase Auth / Firestore
- Riscos: sessao, permissoes, gatilho de sync
- Testes existentes: ausentes

### Calculo e exibicao financeira
- Entrada: assets, aportes, proventos, RF
- Etapas principais:
  - wrappers `FinanceCore`
  - agregacoes locais de patrimonio/rentabilidade
  - snapshots para dashboard, relatorios e auditoria
- Saida: metricas e tabelas
- Persistencia: leitura do estado
- Riscos: divergencia entre camadas core e helpers locais
- Testes existentes:
  - `80` testes financeiros no core
  - cobertura parcial das agregacoes locais

## 8. Dependencias entre areas

Acoplamentos confirmados:

- renderizacao depende de estado global `S` e de modais (`index.html:17330-17462`)
- persistencia local depende de schema pratico de `S` e de `PersistenceCore` (`index.html:4118-4124`, `index.html:4359-4364`)
- UI depende de calculos financeiros e snapshots (`index.html:10781-10805`, `index.html:15299-17296`)
- sincronizacao depende de autenticacao e gate de acesso (`index.html:4443-5008`)
- backup depende de `localStorage`, `PersistenceCore` e recarga de estado (`index.html:5435-5476`)
- importacao depende de validacao, revisao humana e recomputacao (`index.html:5558-7818`, `index.html:14416`)
- relatorios dependem de multiplas areas do estado e de jsPDF CDN (`index.html:15366-17296`)
- PWA depende de render e eventos globais (`index.html:21871-21970`)

## 9. Areas de maior risco

### Critico
- `save()` / `load()` / bootstrap (`index.html:4118`, `index.html:4359`, `index.html:21925-21977`)
- `initFirebase()` e sync cloud (`index.html:4443-4894`)
- `render()` inteiro (`index.html:17330`)
- importacao B3 e nota corretora (`index.html:5558-7818`)
- backup/restauracao (`index.html:5435-5476`)

### Alto
- `syncAssetsFromAportes()` (`index.html:14416`)
- geracao de relatorios e PDFs (`index.html:15299-17296`)
- protecao entre abas (`index.html:4133-4295`)
- quotes e atualizacao de mercado (`index.html:14631`, `index.html:21940`, `index.html:21972-21977`)

### Medio
- auditoria de dados (`index.html:14137-14226`)
- navegacao e drawers (`index.html:17367-17406`, `index.html:21415-21435`)
- tema e PWA notice (`index.html:3631-3667`, `index.html:21871-21920`)

### Baixo
- wrappers diretos de `FinanceCore` (`index.html:10781-10805`)
- helpers de linha para relatorios (`index.html:15376-15449`)

## 10. Candidatos para futura extracao

Somente candidatos de baixo risco observados agora:

1. Wrappers de `FinanceCore`
- Bloco: `assetAppliedValue()`, `assetCurrentValue()`, `assetJurosValue()`, `assetRentabPct()` (`index.html:10781-10805`)
- Motivo: adaptadores finos e bem delimitados
- Dependencias: `FinanceCore`, `isRendaFixaAsset()`, `rfValues()`
- Testes necessarios antes: smoke test de integracao com RF
- Risco: baixo
- Ordem recomendada: cedo

2. Helpers de rows de relatorio
- Bloco: `reportAssetRows()`, `reportProventoRows()`, `reportFixedIncomeRows()`, `reportPatrimonyRows()`, `reportAuditRows()` (`index.html:15376-15449`)
- Motivo: leitura predominantemente derivada; sem escrita
- Dependencias: snapshots e formatadores
- Testes necessarios antes: snapshots simples de saida
- Risco: baixo
- Ordem recomendada: cedo, apos mapa

3. Tema e preferencia visual
- Bloco: `normalizeTheme()`, `applyTheme()`, `loadThemePreference()`, `saveThemePreference()` (`index.html:3631-3653`)
- Motivo: dominio pequeno e isolado
- Dependencias: `localStorage`, `document.documentElement`
- Testes necessarios antes: UI minima/manual
- Risco: baixo
- Ordem recomendada: medio prazo

4. Aviso de update PWA
- Bloco: `showPwaUpdateNotice()` e `watchPwaUpdate()` (`index.html:21871-21920`)
- Motivo: responsabilidade localizada
- Dependencias: `navigator.serviceWorker`, DOM
- Testes necessarios antes: smoke test manual
- Risco: baixo
- Ordem recomendada: medio prazo

Fato confirmado:
- candidatos seguros atuais sao helpers pequenos ou leitores

Hipotese controlada:
- extrair qualquer bloco que escreva storage, Firestore ou `S` inteiro antes das Fases 154/155 aumenta risco desnecessario

## 11. Areas que nao devem ser extraidas agora

- `render()` inteiro (`index.html:17330`)
- autenticacao / gate (`index.html:4443-5008`)
- sincronizacao cloud (`index.html:4573-4894`)
- `save()` / `load()` completos (`index.html:4118`, `index.html:4359`)
- backup completo (`index.html:5327-5476`)
- schema pratico de `S` (`index.html:3669-3737`)
- calculos locais ainda sem cobertura dedicada, como `rentabilityHistory()` e recomputacao de ativos (`index.html:14254-14370`, `index.html:14416`)
- grandes blocos de CSS inline (`index.html:32`)
- navegacao principal e bootstrap (`index.html:17367-17406`, `index.html:21925-21977`)

## 12. Lacunas de testes

### Ja tem cobertura
- `finance-core.js`: `80` testes
- `persistence-core.js`: `30` testes
- `applyBackupData()` / restore entre `civ5` e `civ5_cfg`: `6` testes integrados

### Cobertura parcial
- `save()` / `load()` no monolito:
  - cobertura indireta via `PersistenceCore`
  - falta roundtrip real no `index.html`
- calculos exibidos pela UI:
  - parte protegida via `FinanceCore`
  - agregacoes locais sem cobertura dedicada

### Sem cobertura automatizada clara
- `render()`, `content()`, tabs e modais
- auth Firebase / gate de acesso
- sync cloud
- importacao B3 / nota / RF
- PDF executivo e PDFs por card
- PWA update flow

### Relacao com fases futuras
- Fase 154:
  - cobrir `load()`
- Fase 155:
  - roundtrip `save()/load()`
- Fase 157:
  - UI basica, navegacao, modais e regressao visual funcional

## 13. Conclusoes

- O monolito e arriscado porque concentra bootstrap, estado, persistencia, auth, sync, importacao, calculos, relatorios e renderizacao em um unico arquivo de `21980` linhas.
- As areas mais protegidas hoje sao:
  - calculos core (`FinanceCore`)
  - persistencia core (`PersistenceCore`)
  - restore transacional (`applyBackupData()`)
- As areas que ainda precisam de testes antes de refatoracao sao:
  - `load()`
  - roundtrip `save()/load()`
  - renderizacao e UI principal
  - auth/sync
  - importacao
- Ordem segura de trabalho sugerida:
  1. concluir mapa arquitetural
  2. testar `load()` na Fase 154
  3. testar roundtrip `save()/load()` na Fase 155
  4. so entao extrair candidatos de baixo risco da Fase 156
  5. ampliar cobertura de UI na Fase 157

## 14. Fato confirmado vs hipotese

### Fatos confirmados
- `index.html` contem HTML, CSS, estado, auth, sync, importacao, relatorios e init no mesmo arquivo
- `FinanceCore` e `PersistenceCore` ja foram extraidos e usados pelo monolito
- `render()`, `save()`, `load()` e bootstrap seguem centrais
- existem `313` handlers inline
- existem `766` funcoes nomeadas aproximadas

### Hipoteses controladas
- a primeira extracao segura mais provavel sera em helpers pequenos de relatorio, tema ou wrappers de core
- extracoes de areas com escrita em storage/cloud antes das Fases 154 e 155 tendem a ter risco alto
