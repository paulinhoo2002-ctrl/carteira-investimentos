# Project Phases Roadmap

Registro oficial e versionado da evolucao readonly do projeto.

## Estado e governanca

- fase atual: 198;
- nome: Auditoria geral do sistema em producao;
- branch atual: audit/phase-198-production-system-review;
- SHA-base: `977cd624648c957a10cd8df5fa265313f630ce05`;
- situacao: em auditoria;
- PR atual: pendente;
- implementacao ativa: auditoria e diagnostico, sem nova funcionalidade;
- Fase 198 aberta para auditoria geral do sistema em producao;
- Fase 196 concluida pela PR #196;
- Fase 194 concluida pela PR #194;
- uma branch por fase
- uma PR por objetivo
- Caveman: ativo
- Impeccable: ativo
- sem merge sem autorizacao
- sem deploy manual
- nao iniciar a fase seguinte antes de fechar a atual
- preservacao de dados, schema, Firebase/Auth e compatibilidade continua obrigatoria
- `modern/dist` fora do indice
- Qualquer proxima fase exige definicao de objetivo e autorizacao explicita.

Base de referencia desta fase:

- branch: `main`
- HEAD / `origin/main`: `977cd624648c957a10cd8df5fa265313f630ce05`
- PR `#197`: merged e closed (encerramento documental da fase 196)
- PR `#196`: merged e closed (encerramento funcional da fase 196)
- PR `#195`: merged e closed (encerramento documental da fase 194)
- workspace: limpo no inicio desta fase
- PR `#194`: merged e closed (encerramento funcional da fase 194)

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
| 186 | Ativos moderno readonly | Concluida | `#186` | `6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f` | `docs/project-phases-roadmap.md`, `modern/src/features/reports/AssetsReadonlyPage.tsx`, `modern/src/features/reports/readonlyReportsViewModel.ts`, `tests/modern-assets-readonly-page.test.js`, `tests/modern-host.test.js`, `tests/modern-reports-integration.test.js`, `tests/modern-reports-refresh.test.js` | pagina moderna readonly de Ativos com resumo, filtros, ordenacao, destaques, distribuicao, tabela desktop e cards mobile | leitura ainda depende de snapshot readonly e do controller quando presente | reverter `6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f` |
| 187 | Renda Fixa readonly | Concluida | `#187` | `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` | `docs/project-phases-roadmap.md`, `modern/src/features/fixed-income/fixedIncomeReadonlyContract.mjs`, `modern/src/features/fixed-income/fixedIncomeReadonlyContract.d.ts`, `modern/src/features/fixed-income/fixedIncomeReadonlyBridge.mjs`, `modern/src/features/fixed-income/fixedIncomeReadonlyBridge.d.ts`, `modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.mjs`, `modern/src/features/fixed-income/fixedIncomeSnapshotAdapter.d.ts`, `modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx`, `modern/src/features/fixed-income/readonlyFixedIncomeViewModel.ts`, `tests/modern-fixed-income-readonly-page.test.js`, `tests/modern-host-source.test.js`, `tests/modern-host.test.js`, `tests/readonly-contract-architecture.test.js` | contrato, provider e pagina readonly de renda fixa, preservando ausencia versus zero e sem recalcular totais financeiros | schema real podia ter campos ausentes, combinados ou sem ticker | reverter `0df41a41b9c6ba3d435044f60e69b3fa86cac27c` |
| 188 | Proventos e renda mensal readonly | Concluida | `#188` | `2c6489fb190e215fd69074071aceba8cf2638e39` | `docs/project-phases-roadmap.md`, `index.html`, `modern/src/features/income/IncomeReadonlyPage.tsx`, `modern/src/features/income/incomeReadonlyContract.d.ts`, `modern/src/features/income/incomeReadonlyContract.mjs`, `modern/src/features/income/legacyIncomeReadonlyIntegration.ts`, `modern/src/features/income/readonlyIncomeViewModel.ts`, `tests/modern-base.test.js`, `tests/modern-host-source.test.js`, `tests/modern-income-readonly-page.test.js`, `tests/readonly-contract-architecture.test.js` | contrato, provider e pagina readonly de proventos com `receivedValue`, ausencia versus zero preservada, itens vazios rejeitados e nenhuma soma financeira nova no moderno | semantica de p.value precisava ser auditada e a camada moderna nao podia duplicar bruto e liquido | reverter `2c6489fb190e215fd69074071aceba8cf2638e39` |
| 189 | Aportes e sugestao explicavel readonly | Concluida | `#189` | `0372cc4e04d66f713474b8d0b41ef2750d380061` | `docs/project-phases-roadmap.md`, `index.html`, `modern/src/App.tsx`, `modern/src/bootstrap/hostContributionsReadonlySource.ts`, `modern/src/bootstrap/modernContributionsRuntime.ts`, `modern/src/bootstrap/mountModernApp.ts`, `modern/src/features/contributions/ContributionsReadonlyPage.tsx`, `modern/src/features/contributions/contributionsReadonlyBridge.d.ts`, `modern/src/features/contributions/contributionsReadonlyBridge.mjs`, `modern/src/features/contributions/contributionsReadonlyContract.d.ts`, `modern/src/features/contributions/contributionsReadonlyContract.mjs`, `modern/src/features/contributions/contributionsRefreshController.ts`, `modern/src/features/contributions/contributionsSnapshotAdapter.d.ts`, `modern/src/features/contributions/contributionsSnapshotAdapter.mjs`, `modern/src/features/contributions/legacyContributionsReadonlyIntegration.ts`, `modern/src/features/contributions/readonlyContributionsViewModel.ts`, `modern/src/host.tsx`, `modern/src/main.tsx`, `modern/src/types/navigation.mjs`, `package.json`, `tests/modern-base.test.js`, `tests/modern-contributions-explainable-page.test.js`, `tests/modern-host-source.test.js`, `tests/modern-host.test.js`, `tests/readonly-contract-architecture.test.js` | pagina moderna readonly de aportes e sugestao explicavel, com score null versus zero, item vazio rejeitado e sem soma financeira nova no moderno | estrategia continua no legado e a camada moderna nao pode criar justificativa financeira artificial | reverter `0372cc4e04d66f713474b8d0b41ef2750d380061` |
| 190 | Decisao arquitetural da modernizacao | Concluida | `#190` | `1e72ef28350f10835a8fd92cbdadcebdb969b8cf` | `docs/adr/ADR-001-modernization-strategy.md`, `docs/modern-architecture-inventory.md`, `docs/modernization-decision-matrix.md`, `docs/project-phases-roadmap.md`, `tests/modern-architecture-decision.test.js`, `tests/readonly-contract-architecture.test.js` | expansao readonly gradual e decisao arquitetural registrada, com legado como fonte de verdade | risco residual documental se novas fases nao atualizarem o mapa e as evidencias | reverter `git revert 1e72ef28350f10835a8fd92cbdadcebdb969b8cf` |

## 2. Fechamento da Fase 190 e encerramento do ciclo readonly

### Fase 186

- estado: Concluida;
- PR: `#186`;
- SHA final na main: `6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f`;
- titulo do commit final: `feat: cria pagina moderna readonly de ativos`;
- modo: squash;
- resultado principal: pagina moderna readonly de Ativos com resumo, filtros, ordenacao, destaques, distribuicao, tabela desktop e cards mobile;
- rollback: `git revert 6cb1fc3a67530cfe0fd44d79c4fd2f83fd89660f`.

### Fase 185

- estado: Concluida;
- PR: `#185`;
- SHA final na main: `3a80972310773e20dbf73a101c745f6f7f3b7c9d`;
- titulo do commit final: `feat: formaliza contrato readonly dos dados de relatorio`;
- modo: squash;
- resultado principal: contrato readonly tipado e versionado dos dados de relatorio com runtime canonico unico;
- rollback: `git revert 3a80972310773e20dbf73a101c745f6f7f3b7c9d`.

### Fase 187

- estado: Concluida;
- PR: `#187`;
- SHA final na main: `0df41a41b9c6ba3d435044f60e69b3fa86cac27c`;
- titulo do commit final: `feat: cria pagina moderna readonly de renda fixa`;
- modo: squash;
- resultado principal: contrato, provider e pagina readonly de renda fixa, preservando ausencia versus zero e sem recalcular totais financeiros;
- rollback: `git revert 0df41a41b9c6ba3d435044f60e69b3fa86cac27c`.

### Fase 188

- estado: Concluida;
- PR: `#188`;
- SHA final na main: `2c6489fb190e215fd69074071aceba8cf2638e39`;
- titulo do commit final: `feat: cria pagina moderna readonly de proventos`;
- modo: squash;
- resultado principal: contrato, provider e pagina readonly de proventos com `receivedValue`, ausencia versus zero preservada, itens vazios rejeitados e nenhuma soma financeira nova no moderno;
- rollback: `git revert 2c6489fb190e215fd69074071aceba8cf2638e39`.

### Estado atual

- fase atual: 198;
- nome: Auditoria geral do sistema em producao;
- branch atual: audit/phase-198-production-system-review;
- SHA-base: `977cd624648c957a10cd8df5fa265313f630ce05`;
- situacao: em auditoria;
- PR atual: pendente;
- implementacao ativa: auditoria e diagnostico, sem nova funcionalidade;
- Fase 198 aberta para auditoria geral do sistema em producao;
- Fase 196 concluida pela PR #196;
- Fase 194 concluida pela PR #194;
- a fase 190 permanece concluida;
- a PR #191 foi apenas o encerramento documental;
- a PR #193 foi apenas o encerramento documental da fase 192;
- nao existe Fase 191 funcional.
- a fase 195 nao existe sem autorizacao explicita.
- Qualquer proxima fase exige definicao de objetivo e autorizacao explicita.
- regra de governanca: SHAs de base e SHAs finais da main ficam no roadmap; heads transitorios ficam no historico da PR e nao sao autorreferenciados no documento versionado;

### Fase 189

- objetivo: criar uma experiencia moderna somente leitura para consultar aportes ja registrados; a fronteira legada consulta `prudentContributionAnalysis()`, auditada como leitura deterministica e sem efeitos colaterais, e o moderno nao executa nem replica a estrategia;
- entregaveis: contrato readonly dedicado, provider readonly legado, pagina moderna readonly com lista, filtros locais, agrupamentos visuais, sugestao explicavel, estados vazios/fallback/erro, testes e smokes;
- fora de escopo: compra, cadastro, edicao, exclusao, persistencia de aporte, nova recomendacao financeira, novo ranking, rebalanceamento automatico, calculo de preco-teto, cotacao externa, projecao de retorno, dividendos, venda sugerida, storage, Firebase, Auth, sync, backup, polling, fetch externo, nova dependencia, alteracao do contrato readonly canonico de outras fases ou do fluxo principal;
- riscos: schema legado misto ou incompleto, parte dos registros sem explicacao estruturada, regressao de acessibilidade/responsividade em listas grandes e paineis densos, excesso de derivacao visual sem fonte oficial, stale snapshot se o refresh controlado nao for usado na composicao host;
Criterios de conclusao:
- rollback: remover o componente dedicado, os testes e a documentacao desta fase, mantendo contrato, bridge, adapter, host e fases anteriores intactos.

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
14. 187 - renda fixa readonly
15. 188 - proventos e renda mensal readonly
16. 189 - aportes e sugestao explicavel readonly
17. 190 - decisao arquitetural da modernizacao
18. 192 - refinamento visual e responsivo da aba Dividendos
19. 196 - estabilizacao do teste basico da interface
20. 198 - auditoria geral do sistema em producao

Mudanca de ordem relevante:

- a validacao automatica protege a arquitetura consolidada, nao substitui o contrato;
- a fase 184 encerra o ciclo de documentacao e auditoria, sem nova funcionalidade;
- a fase 185 formaliza o contrato de dados readonly sem mudar o fluxo funcional;
- a fase 190 nao inicia escrita moderna, apenas consolida a decisao com evidencias.
- a fase 191 foi apenas documental, sem fase funcional;
- a fase 196 e a fase atual, restrita a teste/documentacao; nenhuma fase funcional nova foi aberta sem autorizacao.

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

## 10. Fase 190 - decisao arquitetural da modernizacao

Objetivo:

- auditar consolidado do frontend legado e das paginas modernas readonly entregues nas fases 185 a 189;
- decidir, com evidencias, o proximo estagio da modernizacao sem migrar escrita nesta fase;
- manter o legado como fonte de verdade enquanto a escrita moderna nao tiver contrato proprio, idempotencia, autorizacao e rollback comprovados.

Entregaveis:

- inventario arquitetural consolidado com fronteiras, responsabilidades e riscos;
- ADR com a estrategia recomendada e as opcoes avaliadas;
- matriz de decisao com criterios, notas e justificativa;
- teste documental que protege a fase 190 e os registros historicos anteriores;
- preservacao das fronteiras readonly, sem alterar comportamento funcional.

Fora de escopo:

- criar nova pagina funcional;
- adicionar escrita moderna;
- alterar Firebase, Auth, persistencia, schema, sync ou backup;
- alterar calculos financeiros;
- refatorar o legado;
- remover codigo legado;
- trocar roteamento;
- adicionar dependencia;
- fazer deploy manual.

Riscos:

- schema legado misto ou incompleto, com parte dos registros ainda sem explicacao estruturada;
- regressao de acessibilidade ou responsividade em listas grandes e paineis densos;
- excesso de derivacao visual sem fonte oficial;
- stale snapshot se o refresh controlado nao for usado na composicao host;
- service worker pode servir shell antigo se a validacao de publicacao for descuidada.

Criterios de conclusao:

- inventario, ADR e matriz presentes;
- build, testes e smokes verdes;
- nenhuma escrita moderna;
- nenhum acesso direto ao estado legado dentro do React;
- `modern/dist` continua fora do indice;
- rollback simples e reversivel.

Rollback:

- remover os documentos de decisao e o teste documental desta fase;
- manter contrato, bridge, adapter, host, shell moderno readonly e fases anteriores intactos.

## 11. Sequencia planejada apos a Fase 198

Planejadas e nao autorizadas:

### Fase 200 - Painel consolidado de desempenho dos ativos

- objetivo: mostrar melhores e piores ativos, resultado em reais e percentual, filtros por classe e ordenacao;
- dados: usar somente numeros oficiais existentes;
- restricao: nao duplicar calculos financeiros.

### Fase 202 - Evolucao patrimonial

- objetivo: mostrar patrimonio por periodo, aportes, rendimentos e crescimento acumulado;
- dados: usar somente historico real disponivel;
- restricao: nao inventar valores passados.

### Fase 204 - Metas financeiras

- objetivo: acompanhar meta de R$ 1 milhao e meta de renda passiva de R$ 4 mil mensais;
- dados: mostrar progresso real e separar valores reais de projecoes;
- restricao: nao misturar meta com simulacao.

### Fase 206 - Qualidade dos dados

- objetivo: localizar registros incompletos, duplicados ou inconsistentes;
- dados: diferenciar zero de ausente;
- restricao: nao corrigir automaticamente.

### Fase 208 - Relatorio executivo mensal

- objetivo: consolidar patrimonio, aportes, dividendos, distribuicao, desempenho e metas;
- dados: permitir impressao ou PDF;
- restricao: preservar fontes oficiais dos calculos.

### Fase 210 - Desempenho e manutencao tecnica

- objetivo: melhorar desempenho e manutencao, revisar cache e service worker e reduzir complexidade desnecessaria;
- dados: evidencias de performance e manutencao;
- restricao: evitar reescrita ampla sem beneficio comprovado.

- a sequencia pode ser reordenada somente por risco encontrado na auditoria;
- nenhuma dessas fases esta automaticamente autorizada;
- cada fase exige objetivo, branch, PR, validacao e autorizacao;
- nao existe Fase 199 funcional;
- nao abrir a Fase 200 nesta execucao.

## 12. Radar estrategico - mudancas de alto impacto

Itens adiados, nao descartados:

- Firebase novo;
- banco de dados novo;
- migracao completa;
- reescrita do `index.html`;
- remocao do legado;
- alteracao dos calculos financeiros;
- autenticacao nova;
- edicao de dados no moderno;
- automacao de compra ou aporte.

Para cada iniciativa acima, avancar somente com:

- problema comprovado;
- beneficio maior que risco;
- compatibilidade;
- backup;
- plano de migracao;
- rollback;
- testes;
- seguranca;
- privacidade;
- fase e PR proprias.

Reavaliar formalmente esses itens quando a decisao desta fase for aplicada.

## 13. Rollback

Rollback desta fase:

- remover `docs/project-phases-roadmap.md` e os documentos de decisao desta fase;
- manter codigo de producao intacto;
- se necessario, reverter apenas ajustes documentais adicionais da fase.

## 14. Fase 192 - refinamento visual e responsivo da aba Dividendos

- estado: Concluida;
- PR: `#192`;
- SHA final na main: `bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;
- titulo: `feat: refina visual da aba dividendos`;
- modo: squash;
- resultado: correcao da coluna Total, rolagem horizontal controlada, Historico mensal reposicionado, card redundante de meta removido e hierarquia visual melhorada;
- rollback: `git revert bfbc1924ea12925f2b0003a57ba9ebe26fbd031e`;
- observacao: fase encerrada; sem fase ativa.

## 15. Fase 194 - finalizacao objetiva da aba Dividendos

Objetivo:
- melhorar o grafico de evolucao mensal;
- organizar a distribuicao por ativo;
- melhorar a lista de recebimentos recentes;
- concluir a aba Dividendos sem ampliar o escopo.

Estado final:

- fase atual: nenhuma;
- nome da fase: Finalizacao objetiva da aba Dividendos;
- branch original: feat/dividends-final-polish;
- SHA-base: `9762faa4f42fc1c584866436131a4cdec3926565`;
- situacao: Fase 194 concluida;
- PR atual: nenhuma;
- implementacao ativa: nenhuma;
- PR `#194`: merged e closed (encerramento funcional da fase 194);
- PR `#193`: merged e closed (encerramento documental da fase 192);
- a fase 192 permanece concluida;
- a fase 193 foi documental, sem fase funcional;
- a fase 194 nao deixa fase funcional ativa;
- a fase 195 nao existe sem autorizacao explicita.

Entregas:
- grafico de evolucao mensal legivel e acessivel;
- distribuicao por ativo organizada com primeira visao limitada e opcao segura de expandir;
- lista de recebimentos recentes com edicao e exclusao preservadas, leitura clara e sem scroll horizontal global.
- evidencias validadas: 390px em coluna sem rolagem horizontal global; 1366px com 12 meses, tooltips acessiveis, distribuicao ordenada, expansao funcionando e recebimentos completos; 1920px com layout estavel, sem overflow horizontal e sem erros no console; preview publico exigiu acesso Google; validacao visual final executada em localhost autorizado; nenhuma alteracao de codigo foi necessaria depois da validacao visual.

Criterios de conclusao:
- grafico, distribuicao e recebimentos revisados no desktop e no mobile;
- Historico mensal, coluna Total, coluna Media e demais areas fora do escopo preservados;
- nenhum calculo financeiro novo;
- nenhuma dependencia nova;
- testes e verificacoes da fase verdes;
- rollback simples, mantendo as fases readonly anteriores intactas.

## 16. Fase 196 - estabilizacao do teste basico da interface

Objetivo:
- corrigir a falha preexistente de `tests/basic-ui.test.js`;
- tornar a extracao do bootstrap de tema resistente a espacos, indentacao e quebras de linha;
- preservar o comportamento funcional do app.

Estado final:

- fase atual: nenhuma;
- nome da fase: estabilizacao do teste basico da interface;
- branch original: `test/fix-basic-ui-theme-bootstrap`;
- SHA-base: `ead79bddada44c74842398e53f6171764fc6ecdf`;
- situacao: Fase 196 concluida;
- PR atual: nenhuma;
- implementacao ativa: nenhuma;
- PR `#196`: merged e closed (encerramento funcional da fase 196);
- a fase 197 nao existe sem autorizacao explicita.

Resultado principal:
- extracao do bootstrap de tema estabilizada sem alterar o HTML funcional;
- suporte a LF, CRLF, espacos e `style` com atributos preservado;
- `tests/basic-ui.test.js` voltou a ficar verde;
- `npm test` voltou a ficar verde.

Evidencias validadas:
- `node --test tests/basic-ui.test.js` verde;
- `npm test` verde;
- `npm run build` verde;
- `npm run build:modern` verde;
- `npm run test:modern` verde;
- `git diff --check` verde;
- `modern/dist` fora do indice;
- nenhuma alteracao funcional;
- nenhuma dependencia nova;
- nenhum deploy manual.

Escopo:
- corrigir somente o teste, nao o HTML funcional;
- manter o bootstrap de tema verificavel com extracao estrutural;
- preservar `__LOCAL_TEST_MODE__`, `carteira_theme` e a leitura de tema local;
- nao alterar calculos, Firebase/Auth, storage, schema ou dependencias.

Rollback:
- reverter apenas `tests/basic-ui.test.js` e a entrada documental desta fase;
- manter comportamento funcional e fases anteriores intactos.

## 17. Fase 198 - auditoria geral do sistema em producao

Objetivo:
- auditar funcionamento, dados, seguranca, interface, acessibilidade, performance e manutencao;
- produzir evidencias e backlog priorizado;
- decidir se o sistema esta apto para a Fase 200.

Estado atual:

- fase atual: 198;
- nome: Auditoria geral do sistema em producao;
- branch atual: `audit/phase-198-production-system-review`;
- SHA-base: `977cd624648c957a10cd8df5fa265313f630ce05`;
- situacao: em auditoria;
- PR atual: pendente;
- implementacao ativa: auditoria e diagnostico, sem nova funcionalidade;
- Caveman: ativo;
- Impeccable: ativo;
- Fase 198 aberta para auditoria geral do sistema em producao;
- Fase 196 concluida pela PR #196;
- Fase 194 concluida pela PR #194;
- a fase 190 permanece concluida;
- a PR #191 foi apenas o encerramento documental;
- a PR #193 foi apenas o encerramento documental da fase 192;
- nao existe Fase 191 funcional;
- a fase 195 nao existe sem autorizacao explicita;
- Qualquer proxima fase exige definicao de objetivo e autorizacao explicita.

Evidencias validadas:
- `node --test tests/basic-ui.test.js` verde;
- `npm test` verde;
- `npm run build` verde;
- `npm run build:modern` verde;
- `npm run test:modern` verde;
- `git diff --check` verde;
- `modern/dist` fora do indice;
- producao fresca bloqueada por autenticao Google;
- localhost autorizado validado com sucesso;
- 390px, 1366px e 1920px sem regressao critica;
- 768px com overflow estrutural e faixa vazia lateral.

Riscos:
- responsividade tablet em 768px;
- validacao publica limitada pelo gate de autenticacao;
- warnings recorrentes de build/runtime.

Conclusao:
- apto com ressalvas;
- Fase 200 pode seguir depois de correcoes pontuais de responsividade e da documentacao operacional do preview autenticado.
