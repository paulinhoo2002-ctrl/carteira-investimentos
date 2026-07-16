# Project Phases Roadmap

Registro oficial e versionado da evolucao readonly do projeto.

## Estado e governanca

- fase atual: 188
- branch atual: `feat/modern-income-readonly-page`
- SHA-base: `0df41a41b9c6ba3d435044f60e69b3fa86cac27c`
- situacao: em revisao - draft
- uma branch por fase
- uma PR por objetivo
- Caveman: ativo
- Impeccable: ativo
- sem merge sem autorizacao
- sem deploy manual
- nao iniciar a fase seguinte antes de fechar a atual
- preservacao de dados, schema, Firebase/Auth e compatibilidade continua obrigatoria
- `modern/dist` fora do indice

Base de referencia desta fase:

- branch: `main`
- HEAD / `origin/main`: `0df41a41b9c6ba3d435044f60e69b3fa86cac27c`
- workspace: limpo no inicio desta fase
- PR `#187`: merged e closed

## 1. Historico confirmado das fases readonly

| Fase | Objetivo | Resultado | PR | SHA final na main | Principais arquivos | Decisao arquitetural | Riscos residuais | Rollback |
|---|---|---|---|---|---|---|---|---|
| 174 | Provider readonly para ativos em memoria | Concluida | `#174` | `c005947b4928f3345126054bb4afcf209dfe06ff` | `docs/legacy-assets-runtime-map.md`, `legacy/reports-readonly-source.js`, `modern/src/bootstrap/hostLegacyReportsReadonlySource.ts`, `modern/src/host.tsx`, `modern/vite.config.ts`, `tests/legacy-reports-source.test.js`, `tests/modern-base.test.js`, `tests/modern-host-source.test.js`, `tests/modern-host.smoke.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js` | provider canonico com dependencias explicitas; compat alias mantido | compat global e host experimental ainda dependiam da fronteira nova | reverter merge da fase |
| 175 | Composicao experimental da carteira ativa real | Concluida | `#175` | `580f1cd7304967c345a06154a546ea1f5d1458f1` | `index.html`, `modern/README.md`, `modern/host.html`, `modern/src/bootstrap/hostBootstrap.ts`, `modern/src/host-entry.tsx`, `modern/src/host.tsx`, `modern/vite.config.ts`, `package.json`, `tests/legacy-assets-active-wallet-host.smoke.test.js`, `tests/legacy-assets-active-wallet-host.test.js`, `tests/modern-base.test.js`, `tests/modern-host.smoke.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js` | `S.assets` restrito ao host; React recebe somente adapter | smoke browser e fallback demo ainda podiam mascarar wiring se mal verificados | reverter merge da fase |
| 176 | Fortalecer validacao do host experimental | Concluida | `#176` | `c2c9f0804de735e6fbb053f70ce2decad9905496` | `index.html`, `modern/src/bootstrap/hostBootstrap.ts`, `modern/src/host.tsx`, `tests/modern-base.test.js`, `tests/modern-host.smoke.test.js`, `tests/modern-host.test.js` | ativacao restrita a `localhost` / `127.0.0.1` com `testMode=1`; erro estrito visivel | dependencia de navegador local para smoke fora do CI | reverter merge da fase |
| 177 | Host readonly observavel e verificavel | Concluida | `#177` | `3b7d4a27758fb108c3f680341699cd44d7fa20aa` | `docs/legacy-assets-runtime-map.md`, `modern/README.md`, `modern/src/features/reports/AssetsReportPreview.tsx`, `modern/src/features/reports/reportsRefreshController.ts`, `modern/src/host.tsx`, `modern/src/styles.css`, `tests/legacy-assets-active-wallet-host.smoke.test.js`, `tests/modern-base.test.js`, `tests/modern-host.smoke.test.js`, `tests/modern-reports-integration.test.js`, `tests/modern-reports-refresh.test.js` | diagnostico readonly minimo; estados real, vazio, fallback e demo separados | observabilidade ainda nao era o contrato final de navegacao | reverter merge da fase |
| 178 | Navegacao experimental para relatorio readonly real | Concluida | `#178` | `ee7f1289986b2e76ae89f59ed1488e6f8dc5e227` | `README.md`, `docs/legacy-assets-runtime-map.md`, `index.html`, `modern/host.html`, `modern/src/host-entry.tsx`, `tests/legacy-assets-active-wallet-host.smoke.test.js`, `tests/legacy-assets-active-wallet-host.test.js`, `tests/legacy-assets-runtime-map.test.js` | entrada experimental controlada; retorno ao legado sem substituir rota principal | ativacao experimental dependia de ambiente local controlado | reverter merge da fase |
| 179 | Contexto visual de sessao no relatorio readonly | Concluida | `#179` | `6d249359cb865cde88e7e5974e1cece5bc89e80d` | `README.md`, `docs/legacy-assets-runtime-map.md`, `index.html`, `modern/src/App.tsx`, `modern/src/bootstrap/mountModernApp.ts`, `modern/src/features/reports/readonlyReportSessionContext.ts`, `modern/src/host.tsx`, `package.json`, `tests/legacy-assets-active-wallet-host.smoke.test.js`, `tests/legacy-assets-active-wallet-host.test.js`, `tests/legacy-assets-runtime-map.test.js`, `tests/modern-base.test.js`, `tests/modern-host.smoke.test.js`, `tests/modern-host.test.js`, `tests/modern-shell.smoke.test.js`, `tests/readonly-report-session-context.test.js` | preserva apenas pagina moderna selecionada via `readonlyReportPage` | contexto visual ainda limitado a identificadores seguros | reverter merge da fase |
| 180 | Contrato unico das paginas readonly seguras | Concluida | `#180` | `1e7300675363691fdc766b3943b9a1467643f45f` | `docs/legacy-assets-runtime-map.md`, `index.html`, `modern/host.html`, `modern/src/features/reports/readonlyReportSessionContext.ts`, `readonly-report-page-contract.js`, `tests/legacy-assets-active-wallet-host.smoke.test.js`, `tests/legacy-assets-active-wallet-host.test.js`, `tests/legacy-assets-runtime-map.test.js`, `tests/modern-base.test.js`, `tests/modern-host.smoke.test.js`, `tests/modern-host.test.js`, `tests/readonly-report-session-context.test.js` | `READONLY_REPORT_PAGE_IDS` virou lista canonica; `MODERN_PAGES` permaneceu visual | fallback local duplicado ainda podia ser recriado por consumidor | reverter merge da fase |
| 181 | Carregamento resiliente do contrato readonly | Concluida | `#181` | `4d8aaf0bd9efbe1cecfdd2750467f2fbac600d93` | `docs/legacy-assets-runtime-map.md`, `index.html`, `modern/host.html`, `modern/vite.config.ts`, `modern/src/features/reports/readonlyReportSessionContext.ts`, `readonly-report-page-contract.js`, `tests/legacy-assets-active-wallet-host.smoke.test.js`, `tests/legacy-assets-active-wallet-host.test.js`, `tests/legacy-assets-runtime-map.test.js`, `tests/modern-base.test.js`, `tests/readonly-report-session-context.test.js` | `getReadonlyReportPageContract(candidate?)` passou a validar candidato e cair em `reports` com seguranca | dependencia fraca de ordem de carga foi reduzida, mas precisava de fronteira unica | reverter merge da fase |
| 182 | Fronteira unica de consumo do contrato readonly | Concluida | `#182` | `1ba344206aa4d59247a5d7e97d4759a173eedb1d` | `docs/legacy-assets-runtime-map.md`, `index.html`, `modern/src/features/reports/readonlyReportSessionContext.ts`, `readonly-report-page-contract.js`, `tests/legacy-assets-active-wallet-host.test.js`, `tests/legacy-assets-runtime-map.test.js`, `tests/modern-base.test.js`, `tests/readonly-report-session-context.test.js` | removeu listas funcionais duplicadas no consumo; fallback `reports` permaneceu unico | ainda nao existia guardrail automatico contra reintroducao de listas, fallbacks ou resolvedores locais | reverter merge da fase |
| 183 | Guardrails automaticos da arquitetura readonly | Concluida | `#183` | `cc6d4d4fcb964da2f451743993e1cfc44698a25c` | `docs/legacy-assets-runtime-map.md`, `package.json`, `tests/modern-base.test.js`, `tests/readonly-contract-architecture.test.js` | guardrails de arquitetura passaram a rodar no CI sem duplicar a suite moderna completa | warnings CJS e `MODULE_TYPELESS_PACKAGE_JSON` continuam aceitos | reverter merge da fase |
| 184 | Auditoria da fronteira readonly e mapa oficial de evolucao | Concluida | `#184` | `5a1e0e82a0b65463fe28aa2dd8155b5b2b21b512` | `docs/project-phases-roadmap.md` | documentacao ajustada; sem mudanca funcional; apenas roadmap e auditoria | risco residual apenas documental se novas fases legitimas nao atualizarem o mapa | reverter `5a1e0e82a0b65463fe28aa2dd8155b5b2b21b512` |
| 185 | Contrato readonly tipado e versionado dos dados de relatorio | Concluida | `#185` | `3a80972310773e20dbf73a101c745f6f7f3b7c9d` | `docs/legacy-assets-runtime-map.md`, `modern/src/features/reports/reportsReadonlyContract.mjs`, `modern/src/features/reports/reportsReadonlyContract.d.ts`, `modern/src/features/reports/reportsReadonlyBridge.mjs`, `modern/src/features/reports/reportsReadonlyBridge.d.ts`, `modern/src/features/reports/reportsSnapshotAdapter.mjs`, `modern/src/features/reports/reportsSnapshotAdapter.d.ts`, `tests/readonly-contract-architecture.test.js`, `tests/readonly-reports-data-contract.test.js` | contrato readonly versionado, validado, imutavel e com runtime canonico unico | tipagem mais explicita, sem mudar o fluxo funcional | reverter `3a80972310773e20dbf73a101c745f6f7f3b7c9d` |
| 186 | Ativos moderno readonly | Concluida | `#186` | `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` | `docs/project-phases-roadmap.md`, `modern/src/features/reports/AssetsReadonlyPage.tsx`, `modern/src/features/reports/readonlyReportsViewModel.ts`, `tests/modern-assets-readonly-page.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js`, `tests/modern-reports-refresh.test.js` | pagina moderna readonly de Ativos com resumo, filtros, ordenacao, destaques, distribuicao, tabela desktop e cards mobile | leitura ainda depende de snapshot readonly e do controller quando presente | reverter `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` |
| 187 | Renda Fixa readonly | Concluida | `#187` | `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` | `docs/project-phases-roadmap.md`, `modern/src/features/fixed-income/fixedIncomeReadonlyContract.mjs`, `modern/src/features/fixed-income/fixedIncomeReadonlyContract.d.ts`, `modern/src/features/fixed-income/fixedIncomeReadonlyBridge.mjs`, `modern/src/features/fixed-income/fixedIncomeReadonlyBridge.d.ts`, `modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs`, `modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.d.ts`, `modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx`, `modern/src/features/fixed-income/readonlyFixedIncomeViewModel.ts`, `tests/modern-fixed-income-readonly-page.test.js`, `tests/modern-host-source.test.js`, `tests/modern-host.test.js`, `tests/readonly-contract-architecture.test.js` | contrato, provider e pagina readonly de renda fixa, preservando ausencia versus zero e sem recalcular totais financeiros | schema real podia ter campos ausentes, combinados ou sem ticker | reverter `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` |

## 2. Fechamento da Fase 187 e abertura da Fase 188

### Fase 186

- estado: Concluida;
- PR: `#186`;
- SHA final na main: `0df41a41b9c6ba3d435044f60e69b3fa86cac27c`;
- titulo do commit final: `feat: cria pagina moderna readonly de ativos`;
- modo: squash;
- resultado principal: pagina moderna readonly de Ativos com resumo, filtros, ordenacao, destaques, distribuicao, tabela desktop e cards mobile;
- rollback: `git revert 0df41a41b9c6ba3d435044f60e69b3fa86cac27c`.

### Fase 185

- estado: Concluida;
- PR: `#185`;
- SHA final na main: `3a80972310773e20dbf73a101c745f6f7f3b7c9d`;
- titulo do commit final: `feat: formaliza contrato readonly dos dados de relatorio`;
- modo: squash;
- resultado: contrato readonly versionado, validado, imutavel e com runtime canonico unico;
- rollback: `git revert 3a80972310773e20dbf73a101c745f6f7f3b7c9d`.

### Estado atual

- fase atual: 188;
- nome da fase: Proventos e renda mensal readonly;
- branch: `feat/modern-income-readonly-page`;
- SHA-base: `0df41a41b9c6ba3d435044f60e69b3fa86cac27c`;
- situacao: em revisao - draft;
- PR: `#188`;
- head de revisao: consultavel na futura PR;
- SHA final na main: pendente de merge;
- regra de governanca: SHAs de base e SHAs finais da main ficam no roadmap; heads transitorios ficam no historico da PR e nao sao autorreferenciados no documento versionado;

### Fase 188

- objetivo: criar pagina moderna readonly para consulta de proventos recebidos e renda mensal da carteira, consumindo dados reais existentes no legado por uma fronteira readonly explicita;
- entregaveis: contrato e provider readonly dedicados, pagina moderna de Proventos e renda mensal, resumo com totais oficiais ou nulos, lista, filtros visuais, agrupamento mensal, destaques, estados vazios/erro/fallback, testes e smokes;
- fora de escopo: cadastro, edicao, exclusao, importacao, previsao, projecao, calculo tributario novo, dividend yield novo, storage, Firebase/Auth, fetch externo, sync, backup, persistencia moderna, novo roteador, nova dependencia;
- riscos: schema legado misto ou incompleto, ausencia de informacoes em parte dos registros, divergencia entre bruto e liquido, regressao de acessibilidade/responsividade, derivacao visual excessiva;
- criterios de conclusao: build, testes e smokes verdes; nenhuma duplicacao de formula financeira; nenhuma escrita moderna; nenhum acesso a `S.proventos` em `modern/src`; `modern/dist` continua fora do indice; rollback simples e reversivel;
- rollback: remover a pagina, os testes e a documentacao desta fase, mantendo contrato, bridge, adapter, host e fases anteriores intactos.

### Fase 187

- objetivo: descobrir, validar e expor com seguranca o schema real de renda fixa no legado por uma fronteira readonly dedicada, sem assumir o contrato de Ativos;
- entregaveis: contrato e provider readonly dedicados, pagina moderna de Renda Fixa, resumo com campos reais ou nulos, lista, filtros visuais, destaques, distribuicao, estados vazios/erro/fallback, testes e smokes;
- fora de escopo: edicao, cadastro, exclusao, resgate, simulacao, aporte, novo calculo financeiro, storage, Firebase/Auth, fetch externo, sync, backup, persistencia moderna, novo roteador, nova dependencia;
- riscos: schema legado incompleto ou misto, ausencia de ticker em parte dos registros, divergencia entre campo combinado e campos separados de imposto, regressao de acessibilidade/responsividade, derivacao visual excessiva;
- criterios de conclusao: build/teste/smoke verdes, nenhum recalculo financeiro no provider, ausencia versus zero preservada, nenhum acesso a S.assets em modern/src, modern/dist fora do indice, rollback simples;
- rollback: remover pagina, testes, provider e doc desta fase, mantendo contrato, bridge, adapter e fases anteriores intactos.

## 2. Ordem consolidada das fases readonly

Ordem oficial atual:

1. 174 - provider readonly para ativos em memoria
2. 175 - composicao experimental da carteira ativa real
3. 176 - validacao forte do host experimental
4. 177 - observabilidade readonly
5. 178 - navegacao experimental para relatorio readonly
6. 179 - contexto visual de sessao
7. 180 - contrato unico das paginas readonly
8. 181 - carregamento resiliente do contrato readonly
9. 182 - fronteira unica de consumo
10. 183 - guardrails automaticos da arquitetura readonly
11. 184 - auditoria da fronteira readonly e mapa oficial
12. 185 - contrato tipado e versionado dos dados de relatorio readonly
13. 186 - ativos moderno readonly

Mudanca de ordem relevante:

- a consolidacao do contrato fechou antes da auditoria oficial;
- a validacao automatica protege a arquitetura consolidada, nao substitui o contrato;
- a fase 184 encerra o ciclo de documentacao e auditoria, sem nova funcionalidade;
- a fase 185 formaliza o contrato de dados readonly sem mudar o fluxo funcional.

## 3. Auditoria da fronteira readonly

Fluxo real confirmado:

```text
S.assets
-> getAssets
-> createHostLegacyReportsReadonlySource()
-> createLegacyAssetsReadonlyProvider()
-> buildReportAssetRow()
-> createReadOnlyReportsBridge()
-> createReadOnlyReportsAdapter()
-> createReportsRefreshController()
-> createModernReportsRuntime()
-> mountModernApp()
-> App
```

Fluxo do contexto de sessao:

```text
readonly-report-page-contract.js
-> getReadonlyReportPageContract(candidate?)
-> normalizeReadonlyReportPageId(value, fallback)
-> readReadonlyReportSessionContext()
-> buildReadonlyReportSessionSearch()
-> buildReadonlyReportSessionUrl()
```

Produtor do snapshot:

- legado canonico: `createLegacyAssetsReadonlyProvider()` em `legacy/reports-readonly-source.js`
- composicao experimental: `createHostLegacyReportsReadonlySource()` em `modern/src/bootstrap/hostLegacyReportsReadonlySource.ts`

Estado de origem:

- `index.html` usa `S.assets` e os metadados da carteira ativa em memoria.
- o host experimental usa `getAssets` explicito.
- o shell independente usa `createConnectedReportsDemoSource()` e nao carrega o contexto de sessao readonly.

Funcoes de extracao e normalizacao:

- `buildReportAssetRow()` em `report-asset-row.js`
- `assetAppliedValue()` e `assetCurrentValue()` em `finance-core.js` e no `index.html` via wrappers
- `metaTicker()` e `normalizeType()` em `index.html`
- `hostMetaTicker()` e `hostNormalizeType()` em `modern/src/bootstrap/hostLegacyReportsReadonlySource.ts`

Adaptador e integracao:

- `createReadOnlyReportsBridge()` em `modern/src/features/reports/reportsReadonlyBridge.ts`
- `createReadOnlyReportsAdapter()` em `modern/src/features/reports/reportsSnapshotAdapter.ts`
- `createModernReportsRuntime()` em `modern/src/bootstrap/modernReportsRuntime.ts`
- `mountModernApp()` em `modern/src/bootstrap/mountModernApp.ts`
- `App` e `AssetsReportPreview` consomem somente adapter, controller e bridge

Fallback:

- contrato de pagina readonly: fallback canonico `reports`
- bridge readonly: `READ_ONLY_REPORTS_FALLBACK_SNAPSHOT`
- host experimental: fallback demo somente quando wiring real nao existe e o modo estrito nao exige erro

Comportamento em erro:

- contrato ausente ou adulterado: cai em `reports`
- contrato parcial: rejeitado
- normalizador que falha: isolado pelo resolvedor
- snapshot invalido: fallback da ponte
- refresh invalido: ultimo snapshot valido preservado pelo controller

## 4. Matriz de responsabilidades

| Responsabilidade | Legado | Contrato | Integracao | Adaptador | Bridge | Runtime moderno | UI moderna |
|---|---|---|---|---|---|---|---|
| Calculo financeiro | `finance-core.js`, `buildReportAssetRow()` | nao calcula | injeta funcoes | nao calcula | nao calcula | nao calcula | nao calcula |
| Selecao da carteira ativa | `index.html`, `S.assets`, `load()`, `syncStateFromWallet()` | nao decide | `createHostLegacyReportsReadonlySource()` conhece a origem | nao decide | nao decide | nao decide | nao decide |
| Extracao | `reportAssetRows()`, `buildReportAssetRow()` | nao extrai | `createLegacyAssetsReadonlyProvider()` | nao extrai | nao extrai | nao extrai | nao extrai |
| Normalizacao | `normalizeType()`, `metaTicker()` | `normalizeReadonlyReportPageId()` | `hostNormalizeType()`, `hostMetaTicker()` | nao normaliza | nao normaliza | nao normaliza | nao normaliza |
| Validacao | `index.html` e funcoes do legado | contrato de pagina readonly | provider readonly, host strict source wiring | nao valida | valida snapshot | valida origem e estado | valida apenas props |
| Transporte | nao aplicavel | URL readonly, API publica do contrato | `getAssets`, `buildReportAssetRow`, `getGeneratedAt`, `notice` | entrega snapshot | entrega snapshot | entrega adapter | recebe adapter |
| Fallback | legado finaliza em `reports` | `reports` e lista canonica | `createLegacyReportsReadonlySource()` / `createReadonlyReportsSafeFallback` | nao cria fallback novo | `READ_ONLY_REPORTS_FALLBACK_SNAPSHOT` | `createConnectedReportsDemoSource()` fora do modo estrito | mostra fallback visual |
| Renderizacao | `index.html` | nao renderiza | host experimental monta runtime | nao renderiza | nao renderiza | cria adapter | renderiza UI |
| Persistencia | `index.html`, `localStorage`, Firebase, backup | nao persiste | nao persiste | nao persiste | nao persiste | nao persiste | nao persiste |
| Autenticacao | legado | nao autentica | nao autentica | nao autentica | nao autentica | nao autentica | nao autentica |
| Sincronizacao | legado | nao sincroniza | nao sincroniza | nao sincroniza | nao sincroniza | nao sincroniza | nao sincroniza |
| Tratamento de erro | legado e contrato | fallback seguro | wiring estrito no host | nao decide | fallback seguro de snapshot | preserva ultimo estado valido | exibe estado seguro |

Confirmacoes tecnicas:

- moderno nao recalcula valores financeiros;
- moderno nao grava;
- moderno nao autentica;
- moderno nao acessa Firebase diretamente;
- shell independente nao recebe dados financeiros reais;
- legado permanece fonte de verdade.

Se alguma afirmacao acima mudar, o documento deve registrar como risco e nao como fato.

## 5. Contratos

| Contrato | Arquivo | Produtor | Consumidor | Campos / API | Obrigatorio | Fallback | Validacao | Versionamento atual | Risco de incompatibilidade |
|---|---|---|---|---|---|---|---|---|---|
| Pagina readonly | `readonly-report-page-contract.js` | modulo canonico e `getReadonlyReportPageContract()` | `index.html`, `modern/host.html`, `modern/src/features/reports/readonlyReportSessionContext.ts` | `READONLY_REPORT_PAGE_IDS`, `DEFAULT_READONLY_REPORT_PAGE_ID`, `isReadonlyReportPageId`, `normalizeReadonlyReportPageId`, `getReadonlyReportPageContract` | sim | `reports` | runtime + testes | 1 contrato publico | baixo, se consumidor usar API publica |
| Contexto de sessao | `modern/src/features/reports/readonlyReportSessionContext.ts` | leitura da URL e do contrato | `modern/src/App.tsx`, `modern/src/bootstrap/mountModernApp.ts`, `modern/src/host.tsx` | `readonlyReportPage`, `activeWalletHost`, `testMode`, `readReadonlyReportSessionContext`, `buildReadonlyReportSessionSearch`, `buildReadonlyReportSessionUrl` | sim no host | `reports` | contrato compartilhado | sem versionamento formal | baixo |
| Snapshot readonly | `modern/src/features/reports/reportsReadonlyBridge.ts` | ponte | `reportsSnapshotAdapter`, `createModernReportsRuntime` | `generatedAt`, `notice`, `summary`, `items` | sim | `READ_ONLY_REPORTS_FALLBACK_SNAPSHOT` | tipo + clone + deepFreeze | contrato interno sem numero | baixo |
| Adapter readonly | `modern/src/features/reports/reportsSnapshotAdapter.ts` | adaptador | `App`, `mountModernApp`, `createModernReportsRuntime` | `getSnapshot()` | sim | ponte previa | ponte valida | sem versionamento formal | baixo |
| Refresh controller | `modern/src/features/reports/reportsRefreshController.ts` | host experimental | `modern/src/host.tsx`, `AssetsReportPreview.tsx` | `getSnapshot`, `getState`, `refresh`, `subscribe` | sim no host | ultimo snapshot valido | testes + estado imutavel | sem versionamento formal | medio, se listener quebrar |
| Parametro de URL | `readonlyReportPage` | `readonlyReportSessionContext` | legado + host | identificador visual de pagina | sim no host experimental | `reports` | normalizeReadonlyReportPageId | sem versionamento formal | baixo |

Funcoes publicas relevantes:

- `createLegacyAssetsReadonlyProvider()`
- `createLegacyReportsReadonlySource()`
- `createHostLegacyReportsReadonlySource()`
- `createReadOnlyReportsBridge()`
- `createReadOnlyReportsAdapter()`
- `createModernReportsRuntime()`
- `mountModernApp()`
- `getReadonlyReportPageContract()`
- `readReadonlyReportSessionContext()`
- `buildReadonlyReportSessionSearch()`
- `buildReadonlyReportSessionUrl()`

## 6. Lifecycle

| Etapa | Comportamento real | Falha / fallback | Risco observado |
|---|---|---|---|
| Inicializacao | `index.html` e `modern/host.html` carregam contrato antes do bootstrap; shell independente nao usa sessao readonly | contrato ausente cai em `reports` | baixo |
| Montagem | `bootstrapHost()` cria fonte, controller, runtime e monta `App` | erro de wiring pode cair em demo/fallback conforme modo | medio, se smoke local nao rodar |
| Primeiro snapshot | bridge/adapter entregam snapshot valido e congelado | snapshot invalido vira fallback | baixo |
| Refresh | controller rel e nova leitura e preserva ultimo estado valido | erro no refresh nao derruba UI | baixo |
| Troca de carteira | host rele `getAssets` explicito; shell independente nao mexe nisso | carteira vazia gera snapshot vazio valido | baixo |
| Desmontagem | `mountModernApp()` limpa listeners | unmount nao deixa callback vivo | baixo |
| Host ausente | shell independente continua no modo demo | sem host nao ha contexto experimental | baixo |
| Contrato ausente | resolvedor seguro cai em `reports` | sem ReferenceError | baixo |
| Payload invalido | contrato e snapshot retornam fallback seguro | UI nao quebra | baixo |
| Erro de componente | refresh ou snapshot invalido preservam ultimo snapshot valido | nao confirma cobertura total para erro inesperado de renderizacao do componente | medio |
| Fallback visual | host mostra origem segura e caminho de retorno ao legado | sem escrita | baixo |

Estado de listeners e memoria:

- listener duplicado: nao observado nos testes da fase
- timer orfao: nao observado na fronteira readonly moderna
- atualizacao apos unmount: bloqueada pela limpeza do mount
- multiplos bridges: nao na arquitetura normal
- referencia global permanente: nao na fronteira moderna
- risco de crescimento de memoria: baixo

## 7. Seguranca e privacidade

| Sinal | Status na fronteira readonly | Evidencia / observacao | Severidade |
|---|---|---|---|
| Dados financeiros na URL | nao confirmados na fronteira | apenas `readonlyReportPage` e flags locais experimentais | baixo |
| Dados financeiros no console | nao confirmados na fronteira | testes cobrem console limpo nos smokes readonly | baixo |
| `postMessage` | nao usado na fronteira readonly moderna | greps na fronteira nao apontam uso legitimo | informativo |
| `CustomEvent` | nao usado na fronteira readonly moderna | sem contrato exposto por evento | informativo |
| Validacao de origem de mensagens | nao aplicavel | a fronteira nao usa `postMessage`; sem mensagens para validar | informativa |
| Restricao de ativacao do host experimental | `localhost` / `127.0.0.1` + `testMode=1` | restringe ativacao, nao valida `event.origin` | baixa |
| `localStorage` | nao introduzido em `modern/src` | legado continua com persistencia propria, fora da fronteira | baixo |
| `sessionStorage` | nao introduzido em `modern/src` | idem | baixo |
| Firebase | nao introduzido em `modern/src` | legado continua como fonte de verdade fora da UI moderna | baixo |
| Auth | nao introduzido em `modern/src` | idem | baixo |
| cookies | nao confirmados na fronteira readonly | nao ha consumo novo | informativo |
| `fetch` | nao introduzido em `modern/src` | sem acesso novo na fronteira readonly | baixo |
| WebSocket / EventSource | nao introduzidos | nao ha canal de push novo | informativo |
| timers / polling / retry | nao introduzidos na fronteira readonly moderna | refresh e listener sao explicitos | baixo |
| referencias mutaveis | controladas | bridge e snapshot usam clone + freeze | baixo |
| exposicao antes de autorizacao | controlada | entrada experimental restrita e host com retorno ao legado | baixo |

Riscos classificados:

- critico: nenhum confirmado na fronteira readonly
- alto: nenhum confirmado na fronteira readonly
- medio: dependencia de ordem de carga do contrato em novos consumidores
- baixo: URL experimental carrega identificador visual, host depende de ambiente local, demo source pode mascarar wiring se testes forem ignorados
- informativo: APIs sensiveis continuam existindo no legado fora da fronteira readonly

## 8. Duplicaes residuais

| Achado | Classificacao | Observacao |
|---|---|---|
| `READ_ONLY_REPORT_PAGE_IDS` vs `MODERN_PAGES` | duplicacao aceitavel | um e contrato de seguranca, outro e catalogo visual |
| Guardrails em testes | duplicacao de teste | intencional para proteger consumidores, shell e host |
| Demo source e fonte legada real | duplicacao aceitavel | separacao deliberada entre shell independente e host experimental |
| Fallback visual e fallback de snapshot | duplicacao aceitavel | cada fronteira protege uma camada diferente |
| Lista funcional duplicada em consumidores | nenhuma confirmada | guardrail da Fase 183 cobre essa regressao |
| Segunda implementacao de calculo financeiro | nenhuma confirmada | `buildReportAssetRow()` continua canonica |
| Divida tecnica candidata a Fase 185 | tipagem de contrato de dados de relatorio | nao e duplicacao funcional; e evolucao contratual |

## 9. Matriz de testes

| Invariante | Teste existente | Cobertura | Lacuna |
|---|---|---|---|
| Contrato canonico | `tests/readonly-contract-architecture.test.js`, `tests/readonly-report-session-context.test.js` | alta | nenhuma relevante |
| IDs validos / fallback `reports` | `tests/readonly-report-session-context.test.js`, `tests/legacy-assets-active-wallet-host.test.js` | alta | nenhuma relevante |
| Candidato explicito | `tests/readonly-report-session-context.test.js` | alta | nenhuma relevante |
| Shell isolado | `tests/readonly-contract-architecture.test.js`, `tests/modern-base.test.js` | alta | nenhuma relevante |
| Host | `tests/legacy-assets-active-wallet-host.test.js`, `tests/modern-host.test.js`, `tests/modern-host-source.test.js` | alta | nenhuma relevante |
| Ordem dos scripts | `tests/modern-base.test.js` | alta | nenhuma relevante |
| Lista duplicada | `tests/readonly-contract-architecture.test.js` | alta | nenhuma relevante |
| CommonJS | `tests/readonly-report-session-context.test.js`, `tests/modern-base.test.js` | alta | nenhuma relevante |
| ESM / Vite | `tests/modern-host.test.js`, `tests/modern-host-source.test.js`, `tests/modern-base.test.js` | alta | nenhuma relevante |
| Node sem DOM | `tests/readonly-contract-architecture.test.js`, `tests/readonly-report-session-context.test.js` | alta | nenhuma relevante |
| `modern/dist` | `tests/readonly-contract-architecture.test.js`, `tests/modern-base.test.js` | alta | nenhuma relevante |
| Snapshot valido | `tests/modern-reports-bridge.test.js`, `tests/modern-reports-integration.test.js` | alta | nenhuma relevante |
| Snapshot invalido | `tests/modern-reports-bridge.test.js`, `tests/modern-reports-integration.test.js` | alta | nenhuma relevante |
| Refresh | `tests/modern-reports-refresh.test.js` | alta | nenhuma relevante |
| Troca de carteira | `tests/legacy-assets-active-wallet-host.test.js`, `tests/modern-host.test.js` | alta | nenhuma relevante |
| Desmontagem | `tests/modern-host.test.js`, `tests/modern-reports-refresh.test.js` | alta | nenhuma relevante |
| Ausencia de escrita | `tests/modern-base.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js` | alta | nenhuma relevante |
| Ausencia de storage | `tests/modern-base.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js` | alta | nenhuma relevante |
| Ausencia de Firebase | `tests/modern-base.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js` | alta | nenhuma relevante |
| Ausencia de dados financeiros na URL | `tests/legacy-assets-active-wallet-host.test.js`, `tests/readonly-report-session-context.test.js` | alta | nenhuma relevante |
| Ausencia de dados financeiros no console | `tests/modern-host.smoke.test.js`, `tests/modern-host.test.js` | media/alta | smoke local ainda depende de browser e ambiente |

## 10. Fase 187 - renda fixa readonly

Objetivo:

- descobrir e espelhar com seguranca o schema real atual da renda fixa no legado;
- criar uma pagina moderna de Renda Fixa completa, responsiva e somente leitura;
- consumir dados reais por fronteira readonly explicita, sem assumir o contrato de Ativos;
- manter o legado como fonte de verdade e o runtime canonicamente versionado.

Entregaveis:

- contrato readonly dedicado para renda fixa com versionamento explicito;
- resumo com valores aplicados, brutos, liquidos, ganhos ou perdas, IR e IOF quando existirem;
- lista completa de titulos com nome, subtipo, emissor, datas, rentabilidade, indexador, liquidez e indisponibilidade;
- filtros e ordenacoes apenas visuais, se existirem no contrato real;
- destaques e agrupamentos visuais por vencimento, subtipo ou outra leitura segura presente no legado;
- leitura inicial sincronica pelo adapter/controller; nao existe loading transitorio separado nesta fase; refresh preserva o ultimo snapshot valido; fallback e erro sao tratados; loading assincronico so deve existir se uma futura fonte realmente exigir;
- testes estruturais, de renderizacao, de schema, de fallback e de responsividade;
- smokes do shell, do host e da integracao com o contrato readonly.

Fora de escopo:

- edicao, cadastro, exclusao, resgate, simulacao, compra, venda, aporte ou sugestao de aporte;
- novo calculo financeiro;
- acesso direto a `S.assets` em `modern/src`;
- storage, Firebase, Auth, sync, backup, polling ou fetch externo;
- nova dependencia, novo roteador ou persistencia moderna;
- alteracao do contrato readonly canonico ou do fluxo principal.

Riscos:

- divergencia entre o schema real legado e a representacao visual se o contrato refletir campos inexistentes ou incompletos;
- regressao de responsividade ou acessibilidade em listas grandes;
- excesso de derivacao visual sem necessidade;
- stale snapshot se o refresh controlado nao for usado na composicao host.

Criterios de conclusao:

- build, testes e smokes verdes;
- nenhuma duplicacao de formula financeira;
- nenhuma escrita moderna;
- nenhum acesso a `S.assets` em `modern/src`;
- `modern/dist` continua fora do indice;
- rollback simples e reversivel.

Rollback:

- remover o componente dedicado, os testes e a documentacao desta fase;
- manter contrato, bridge, adapter, host e fases anteriores intactos.

## 11. Proximas fases

Manter a sequencia oficial:

1. 188: Proventos e renda mensal readonly
2. 189: Aportes e sugestao explicavel
3. 190: decisao arquitetural

## 12. Radar estrategico - mudancas de alto impacto

Itens adiados, nao descartados:

- Firebase novo
- banco de dados novo
- migracao completa
- reescrita do `index.html`
- remocao do legado
- alteracao dos calculos financeiros
- autenticacao nova
- edicao de dados no moderno
- automacao de compra ou aporte

Para cada iniciativa acima, avancar somente com:

- problema comprovado
- beneficio maior que risco
- compatibilidade
- backup
- plano de migracao
- rollback
- testes
- seguranca
- privacidade
- fase e PR proprias

Reavaliar formalmente esses itens na Fase 190.

## 13. Rollback

Rollback desta fase:

- remover `docs/project-phases-roadmap.md`
- manter codigo de producao intacto
- se necessario, reverter apenas ajustes documentais adicionais da fase
