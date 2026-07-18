# Project Phases Roadmap

Registro oficial e versionado da evolucao readonly do projeto.

## Estado e governanca

- fase atual: 204B;
- nome: Historico mensal premium de dividendos;
- branch atual: `feat/phase-204b-monthly-income-history`;
- SHA-base: `63b7206be2908e8f6eca5c8590948513c3d55005`;
- situacao: implementacao funcional em desenvolvimento;
- PR atual: `#207`;
- implementacao ativa: historico mensal premium;
- alteracao funcional autorizada exclusivamente para a Fase 204B;
- PR `#202` merged e closed (encerramento funcional da fase 202);
- modo de merge: squash;
- SHA final da Fase 202: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;
- resultado: painel consolidado de desempenho dos ativos concluido;
- PR `#204` merged e closed (encerramento documental da fase 204);
- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;
- resultado: auditoria de evolucao patrimonial e dashboard executivo concluida;
- Fase 204 documental concluida;
- PR `#205` merged e closed (encerramento funcional da Fase 204A);
- modo de merge: squash;
- SHA final da Fase 204A: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;
- resultado: Dashboard executivo com Destaques da carteira concluido;
- Fase 204A funcional e documentalmente concluida;
- Fase 204B ativa;
- PR `#200` merged e closed;
- SHA final da Fase 200: `3c784714265505efa763e624bbaf8bacaa467ba0`;
- resultado: refinamento confiavel da tela de Dividendos concluido;
- correcao de 768px registrada como concluida;
- 204C, 206, 208, 210 e 212 nao autorizadas;
- nenhuma Fase 199 funcional;
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
- Fases 206, 208, 210 e 212 continuam planejadas e nao autorizadas.
- Qualquer proxima fase exige definicao de objetivo e autorizacao explicita.

Base de referencia desta fase:

- branch: main
- HEAD / `origin/main`: `63b7206be2908e8f6eca5c8590948513c3d55005`
- PR `#205`: merged e closed (encerramento funcional da Fase 204A)
- PR `#204`: merged e closed (encerramento documental da fase 204)
- PR `#202`: merged e closed (encerramento funcional da fase 202)
- PR `#200`: merged e closed (encerramento funcional da fase 200)
- PR `#198`: merged e closed (encerramento da auditoria)
- PR `#196`: merged e closed (encerramento funcional da fase 196)
- PR `#195`: merged e closed (encerramento documental da fase 194)
- workspace: limpo apos o merge
- PR `#194`: merged e closed (encerramento funcional da fase 194)
- modern/dist fora do indice

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
| 204A | Dashboard executivo com destaques da carteira | Concluida | `#205` | `8ab97be06a3b377c6fe1911cb42e2d57a6546275` | `index.html`, `docs/phase-204a-dashboard-highlights.md`, `tests/phase-204a-dashboard-highlights.test.js`, `tests/phase-204a-dashboard-highlights.guard.js` | reutilizacao da base oficial da Fase 202 sem formula financeira nova | destaques dependem da disponibilidade e completude dos dados atuais | `git revert 8ab97be06a3b377c6fe1911cb42e2d57a6546275` |

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

- fase atual: nenhuma;
- branch atual: main;
- SHA-base: `e358994bbc4270d0694990b4f3a713f0c20b0cba`;
- situacao: Fase 198 concluida e aguardando nova autorizacao;
- PR atual: nenhuma;
- implementacao ativa: nenhuma;
- PR `#198` merged e closed (encerramento da auditoria);
- resultado da auditoria: apto com ressalvas;
- risco residual principal: responsividade em 768px;
- nenhuma Fase 199 funcional;
- nenhuma Fase 200 ativa;
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
21. 200 - refinamento confiavel da tela de Dividendos
22. 202 - painel consolidado de desempenho dos ativos
23. 204 - auditoria de evolucao patrimonial e dashboard executivo
24. 206 - metas financeiras
25. 208 - qualidade dos dados
26. 210 - relatorio executivo mensal
27. 212 - desempenho e manutencao tecnica

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

## 19. Fase 202 - Painel consolidado de desempenho dos ativos

Objetivo:

- mostrar melhores e piores ativos;
- resultado em reais e percentual;
- filtros por classe;
- ordenacao;
- usar somente numeros oficiais existentes;
- nao duplicar calculos financeiros.

Estado final:

- fase concluida;
- fase atual: nenhuma;
- branch original: `feat/phase-202-assets-performance-overview`;
- PR: `#202`;
- modo: squash;
- branch atual: main;
- PR atual: nenhuma;
- implementacao ativa: nenhuma;
- PR `#202`: merged e closed;
- modo de merge: squash;
- SHA final: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;
- SHA final da Fase 202: `e0be50c5d809c32d90ed5dcbc5124e53e928e697`;
- nenhuma formula financeira nova;
- nenhuma alteracao de schema;
- nenhuma dependencia nova;
- shell moderno readonly;
- Fase 204 nao iniciada.
- resultado: painel consolidado de desempenho dos ativos concluido;
- nenhuma Fase 204 ativa.

### Conclusão funcional

- nova area Ativos -> Desempenho;
- melhores e piores ativos;
- resultado em reais e percentual;
- filtros por classe;
- ordenacao;
- dados insuficientes tratados explicitamente;
- base completa exige valor atual e valor aplicado;
- zero real preservado;
- funcoes financeiras oficiais reutilizadas.

### Riscos observados

- regressao visual em 768px se a tela for alterada sem revisao;
- confusao entre zero e dado ausente se a regra de base for relaxada;
- overflow horizontal se a lista consolidada crescer sem adaptacao responsiva.

### Validações registradas

- `node --test tests/phase-202-assets-performance-overview.test.js`;
- `node --test tests/phase-202-assets-performance-overview.guard.js`;
- `node --test tests/basic-ui.test.js`;
- `node --test tests/dividends-final-polish.test.js`;
- `node --test tests/dividends-visual-refinement.test.js`;
- `node --test tests/phase-198-production-system-audit.test.js`;
- `node --test tests/readonly-contract-architecture.test.js`;
- `node --test tests/modern-architecture-decision.test.js`;
- `node --test tests/phase-200-future-sequence.guard.js`;
- `npm test`;
- `npm run build`;
- `npm run build:modern`;
- `npm run test:modern`;
- `git diff --check`.

### Sequência futura

Preservada e nao autorizada:

- Fase 204 - Evolucao patrimonial;
- Fase 206 - Metas financeiras;
- Fase 208 - Qualidade dos dados;
- Fase 210 - Relatorio executivo mensal;
- Fase 212 - Desempenho e manutencao tecnica.

Nenhuma dessas fases esta iniciada ou autorizada por esta documentacao.
- a sequencia pode ser reordenada somente por risco encontrado na auditoria;
- nenhuma dessas fases esta automaticamente autorizada;
- cada fase exige objetivo, branch, PR, validacao e autorizacao;
- nao existe Fase 199 funcional;
- a Fase 200 foi redefinida por decisao explicita;
- a sequencia futura planejada inclui 204, 206, 208, 210 e 212.

Escopo:

- leitura consolidada de desempenho;
- comparacao rapida entre ativos;
- explicabilidade sobre fonte oficial, dados suficientes e zero versus ausente;
- responsividade em 390px, 768px, 1366px e 1920px;
- sem nova formula financeira.

Fora de escopo:

- duplicar calculos oficiais;
- inventar cotacao, preco medio ou patrimonio;
- alterar schema, Firebase/Auth, storage ou dependencias;
- iniciar a Fase 204.

Rollback:

- reverter os commits da fase e remover os documentos criados por ela.

## 20. Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo

Objetivo:
- auditar o historico real disponivel para evolucao patrimonial sem inventar snapshots retroativos;
- separar o que pode ser mostrado agora no dashboard executivo usando apenas numeros oficiais;
- classificar cada recurso entre implementavel agora, parcial, futuro ou nao recomendado;
- registrar uma proposta visual futura sem copiar identidade visual de outro produto.

Estado final:

- fase concluida;
- branch original: `docs/phase-204-evolution-audit`;
- SHA-base: `2f69f0623717d09e670b82f711588f9d1cc50909`;
- PR `#204` merged e closed (encerramento documental da fase 204);
- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;
- conclusao: apto com ressalvas;
- risco residual principal: responsividade em 768px;
- nenhuma implementacao ativa;
- Fase 204 documental concluida;
- 204B, 204C, 206, 208, 210 e 212 nao autorizadas.

Resultado principal:

- sistema funcional;
- nenhuma regressao critica comprovada;
- nenhuma perda de dados detectada;
- contratos readonly preservados;
- testes e builds verdes;
- risco medio confirmado em 768px;
- autenticacao Google preservada;
- warnings de build/runtime registrados;
- sequencia futura preservada.

Inventario resumido:

- dados reais presentes: `S.assets`, `S.aportes`, `S.proventos`, `S.rfEvents`, `S.goals`, backup/exportacao e relatorio atual;
- fontes oficiais reutilizaveis: `cx()`, `assetAnalysisRows()`, `rfIntelligenceSnapshot()`, `passiveIncomeGoalStats()`, `proventoStats()`, `proventoResumo()`, `reportsSnapshot()`, `dashboardSnapshot()`;
- serie historica de patrimonio persistida: nao confirmada;
- backup/exportacao: snapshot do estado atual, nao serie temporal de patrimonio;
- `patrimonySnapshot()`: leitura estimada a partir do estado atual e dos aportes, nao historico patrimonial verificado.

Classificacao tecnica:

- A: resumo patrimonial atual, composicao por classe, melhores e piores ativos, renda passiva atual, renda fixa atual;
- B: leituras parciais a partir de eventos com data, como aportes, proventos e movimentacoes de renda fixa;
- C: coleta de snapshots daqui para frente, sem preenchimento retroativo;
- D: reconstruir patrimonio historico completo sem snapshots ou inventar valores passados.

Conclusao tecnica:

- recomendacao: Opcao 4 - adiar o grafico patrimonial;
- primeiro passo seguro: dashboard executivo com numeros oficiais atuais;
- segundo passo seguro: historico mensal premium com dados reais ja registrados;
- terceiro passo possivel: evolucao patrimonial somente se uma coleta de snapshots for autorizada.

Proposta de PRs futuras:

- PR funcional 204A - Dashboard executivo: destaques da carteira, melhores e piores ativos, composicao por classe, reutilizando apenas calculos oficiais;
- PR funcional 204B - Historico mensal premium: bloco aberto por padrao, expansao progressiva, filtros e consolidacao visual;
- PR funcional 204C - Evolucao patrimonial: somente se o historico real ou snapshots futuros justificarem.

Criterios de aceite:

- nenhuma implementacao funcional nesta fase;
- nenhuma formula financeira nova;
- nenhum schema novo;
- nenhum dado retroativo inventado;
- inventario, classificacao e recomendacao presentes;
- rollback simples e documental.

Conclusao Caveman:

- menor passo seguro: nao inventar patrimonio passado e nao misturar estimativa com historico real.

Conclusao Impeccable:

- decisao baseada em evidencias;
- fontes oficiais identificadas;
- riscos e limites explicitados;
- proposta visual futura coerente e acessivel;
- UTF-8 sem BOM e sem mojibake.

## 21. Fase 204A - Dashboard executivo com destaques da carteira

Objetivo:
- substituir o card `Maiores pagadores do mes` do Dashboard por `Destaques da carteira`;
- manter `Composicao por classe` ao lado;
- mostrar abas `Maiores altas` e `Maiores baixas`;
- reutilizar apenas os calculos oficiais da Fase 202;
- nao criar formula financeira nova.

Estado final:

- fase concluida;
- branch original: `feat/phase-204a-dashboard-highlights`;
- SHA-base: `122a3506420b64c2be8df5950c3f01749f74e75d`;
- PR `#205` merged e closed;
- modo: squash;
- SHA final: `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;
- titulo: `feat: cria destaques da carteira no dashboard`;
- nenhuma implementacao ativa;
- nenhuma formula financeira nova;
- nenhum schema novo;
- nenhum deploy manual;
- 204B, 204C, 206, 208, 210 e 212 nao autorizadas.
- Fase 204A funcional concluida;

Fonte oficial:

- `assetPerformanceOverviewRows()`;
- `assetCurrentValue()`;
- `assetAppliedValue()`;
- `assetJurosValue()`;
- `assetRentabPct()`;
- `cx()`;
- `TYPE_ORDER`;
- `sortAssetsByGroup()`.

Regras de inclusao:

- valor atual disponivel;
- valor aplicado disponivel;
- zero real continua valido;
- dado ausente continua diferente de zero;
- ativo com base incompleta fica fora do ranking.

Regras de ordenacao:

- Maiores altas: resultado percentual desc, resultado em reais desc, ticker asc;
- Maiores baixas: resultado percentual asc, resultado em reais asc, ticker asc;
- resultado exatamente zero nao entra em nenhuma aba.

Layout e acessibilidade:

- duas abas internas;
- estado inicial em `Maiores altas`;
- acao `Ver todos` para `Ativos -> Desempenho`;
- leitura confortavel em 390px, 768px, 1366px e 1920px;
- sem overflow horizontal relevante;
- foco visivel e navegacao por teclado.

Riscos:

- excesso de altura se os itens nao forem limitados;
- regressao de 768px se a area nao respeitar o empilhamento responsivo;
- duplicacao de formula se o ranking deixar de usar a base oficial.

Testes:

- guardrail documental da Fase 204A;
- cobertura da ordenacao de altas e baixas;
- verificacao de abas, texto e acao `Ver todos`;
- confirmacao de que zero e base incompleta ficam fora do ranking.

Resultado final:

- card Destaques da carteira integrado;
- Maiores altas e Maiores baixas;
- tres ativos por aba;
- Ver todos abre Ativos -> Desempenho;
- dados oficiais da Fase 202 reutilizados;
- zero e ausente preservados;
- base incompleta fora do ranking;
- 390px e 768px empilhados sem overflow;
- 1366px e 1920px lado a lado;
- shell moderno readonly preservado.

Rollback:

- git revert `8ab97be06a3b377c6fe1911cb42e2d57a6546275`;

Conclusao Caveman:

- menor passo seguro: destacar dado pronto, sem recalculo novo.

Conclusao Impeccable:

- navegacao clara;
- dados oficiais reaproveitados;
- acessibilidade e responsividade consideradas;
- nenhuma formula nova;
- encoding preservado em UTF-8 sem BOM.

## 22. Fase 204B - Historico mensal premium de dividendos

Objetivo:
- melhorar a visualizacao do historico mensal de proventos realmente recebidos;
- manter o bloco aberto por padrao;
- usar consolidacao mensal real, filtros simples e expansao progressiva;
- nao preencher meses retroativamente;
- nao misturar proventos futuros, previstos, estimados ou renda fixa.

Estado atual:

- fase atual: 204B;
- branch atual: `feat/phase-204b-monthly-income-history`;
- SHA-base: `63b7206be2908e8f6eca5c8590948513c3d55005`;
- situacao: implementacao funcional em desenvolvimento;
- PR atual: `#207`;
- implementacao ativa: historico mensal premium;
- alteracao funcional autorizada exclusivamente para a Fase 204B;
- Fase 204A funcional e documentalmente concluida;
- 204C, 206, 208, 210 e 212 nao autorizadas.

Inventario tecnico:

- `S.proventos`;
- `proventoDividendPaymentDate()`;
- `proventoStats()`;
- `proventoResumo()`;
- `dividendMonthlyHistoryRows()`;
- `dividendMonthlyHistoryOptions()`;
- `dividendMonthlyHistoryFilterRows()`;
- `dividendMonthlyHistoryGroupRows()`;
- `dividendMonthlyHistorySummary()`;
- `dividendMonthlyHistoryEntry()`;
- `dividendMonthlyHistoryPremium()`.

Fonte oficial:

- data oficial de recebimento: resultado de `proventoDividendPaymentDate()`;
- valor oficial: `p.value` valido e finito;
- ticker oficial: `p.ticker`;
- tipo oficial: `proventoTipoCanonical(p.eventType || p.type)`;
- somente recebidos entram na consolidacao mensal;
- entradas com data invalida, futuro, valor ausente ou renda fixa ficam fora.
- nao existe status persistido separado para previsto/recebido nesta fase; a leitura oficial usa a data de pagamento nao futura e as exclusoes oficiais.

Regras:

- zero real continua valido;
- ausente nao vira zero;
- meses vazios nao sao inventados;
- periodo, ativo e tipo combinam entre si;
- expansao usa `aria-expanded`;
- uma linha mensal nao edita nem exclui registros.

Layout e acessibilidade:

- bloco aberto por padrao;
- resumo superior com total, media, melhor mes e meses com recebimentos;
- lista inicial limitada;
- botao `Mostrar mais` e `Mostrar menos`;
- desktop em tabela compacta por linha;
- mobile em cards empilhados;
- sem rolagem horizontal global;
- foco visivel e acionamento por teclado.

Performance:

- consolidacao unica por renderizacao;
- sem timer e sem observador novo;
- limite inicial de 6 meses;
- expansao progressiva em blocos de 6 meses;
- sem nova dependencia.

Riscos:

- duplicar regra financeira se o historico voltar a usar tabela anual;
- overflow em 768px se os cards nao quebrarem corretamente;
- confusao entre recebido real e futuras previsoes se o filtro falhar.

Testes:

- guardrail documental da Fase 204B;
- cobertura de recebidos, filtros, expansao, estados vazios, ordem e limite inicial;
- confirmacao de zero versus ausente;
- ausencia de formula nova;
- ausencia de schema novo.

Rollback:

- rollback pre-merge da branch: `git revert 313c71146181a58157e6236ef3305ca259d6ca5f`;
- depois do squash merge, o encerramento documental deve registrar o SHA final da main;

Conclusao Caveman:

- usar apenas dados reais ja gravados e apresentar o minimo necessario.

Conclusao Impeccable:

- consolidacao rastreavel, acessivel e responsiva;
- sem inventar historico;
- sem regressao funcional.

## 11. Sequencia planejada apos a Fase 202

Planejadas e nao autorizadas:

### Fase 206 - Metas financeiras

- objetivo: acompanhar meta de R$ 1 milhao e renda passiva de R$ 4 mil mensais;
- separar valores reais de projecoes;
- nao misturar meta com simulacao;
- estado: planejada e nao autorizada.

### Fase 208 - Qualidade dos dados

- objetivo: localizar registros incompletos, duplicados ou inconsistentes;
- diferenciar zero de ausente;
- nao corrigir automaticamente;
- estado: planejada e nao autorizada.

### Fase 210 - Relatorio executivo mensal

- objetivo: consolidar patrimonio, aportes, dividendos, distribuicao, desempenho e metas;
- permitir impressao ou PDF;
- preservar as fontes oficiais dos calculos;
- estado: planejada e nao autorizada.

### Fase 212 - Desempenho e manutencao tecnica

- objetivo: melhorar desempenho e manutencao;
- revisar cache e service worker;
- reduzir complexidade desnecessaria;
- evitar reescrita ampla sem beneficio comprovado;
- estado: planejada e nao autorizada.

- a Fase 204A foi concluida e nao faz parte desta sequencia planejada;
- a sequencia pode ser reordenada somente por risco encontrado na auditoria;
- nenhuma dessas fases esta automaticamente autorizada;
- cada fase exige objetivo, branch, PR, validacao e autorizacao;
- nao existe Fase 199 funcional;
- a Fase 200 foi redefinida por decisao explicita;
- a sequencia futura planejada inclui 206, 208, 210 e 212.

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

Estado final:

- fase atual: nenhuma;
- nome: Auditoria geral do sistema em producao;
- branch original: `audit/phase-198-production-system-review`;
- SHA-base: `977cd624648c957a10cd8df5fa265313f630ce05`;
- SHA final: `e358994bbc4270d0694990b4f3a713f0c20b0cba`;
- situacao: Fase 198 concluida;
- PR atual: nenhuma;
- implementacao ativa: nenhuma;
- PR `#198`: merged e closed (encerramento da auditoria);
- Caveman: ativo;
- Impeccable: ativo;
- resultado: apto com ressalvas;
- risco residual principal: responsividade em 768px;
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

## 18. Fase 200 - refinamento confiavel da tela de Dividendos

Objetivo:
- revisar a composicao de "Recebido no mes" com dados oficiais, sem novo calculo financeiro;
- remover "Historico recente" da visao geral;
- manter "Historico mensal" como primeira secao principal da pagina;
- corrigir o comportamento em 768px sem mexer em schema, dependencias ou fontes de verdade;
- preservar edicao, exclusao, filtros, historico e acessibilidade.

Redefinicao autorizada:
- esta fase foi redefinida por decisao explicita;
- o objetivo anterior de painel consolidado de desempenho dos ativos nao foi cancelado;
- esse objetivo foi movido para a Fase 202, ainda nao autorizada;
- nenhuma funcionalidade de desempenho de ativos foi iniciada;

Estado final:

- fase concluida;
- branch original: `feat/phase-200-dividends-trustworthy-overview`;
- PR: `#200`;
- modo: squash;
- SHA final: `3c784714265505efa763e624bbaf8bacaa467ba0`;
- implementacao ativa: nenhuma;
- resultado: concluido;
- nenhuma formula financeira nova;
- nenhuma alteracao de schema;
- nenhuma dependencia nova;
- nenhuma Fase 202 iniciada.

Conclusao:
- refinamento confiavel da tela de Dividendos concluido;
- correcao de 768px registrada como concluida;
- nenhuma Fase 202 ativa.

Escopo:
- usar apenas dados e calculos oficiais ja existentes;
- manter a tela modernizada readonly como fonte visual, sem duplicar o legado;
- evitar qualquer nova formula aproximada ou copia de referencia externa;
- manter a area de Recebimentos com historico completo separado da visao geral.

Fora de escopo:
- criar novas formulas financeiras;
- alterar schema, Firebase/Auth, storage, dependencias ou calculos historicos;
- mudar o comportamento de edicao, exclusao ou filtros ja existentes;
- introduzir uma nova fase funcional intermediaria.

Criterios de conclusao:
- `npm run build`, `npm test`, `npm run build:modern` e `npm run test:modern` verdes;
- validacao visual em desktop, tablet e mobile sem overflow horizontal global;
- `Recebido no mes` claramente explicado e sem ambiguidade de composicao;
- `Historico mensal` em destaque na visao geral;
- `Historico recente` fora da visao geral;
- nenhum dado funcional removido.

Rollback:
- reverter apenas os ajustes desta fase e remover a documentacao e os testes desta entrega;
- manter o restante do legado e as fases readonly anteriores intactos.
