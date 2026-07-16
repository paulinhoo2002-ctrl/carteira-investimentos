# Inventario arquitetural da modernizacao

## Escopo

Este inventario consolida o que o frontend legado ainda faz sozinho, o que o moderno readonly ja consome por fronteira explicita e onde estao os principais riscos de evolucao.

## Tabela consolidada

| Componente | Caminho | Funcao | Fonte de verdade | Leitura / escrita | Contrato | Risco | Decisao |
|---|---|---|---|---|---|---|---|
| Shell legado | `index.html` | Mantem `S`, calcula, persiste, sincroniza e entrega a carteira ativa | Legado em memoria e storages legados | Leitura e escrita | Nao ha contrato moderno aqui | Alto se duplicar fonte de verdade | Manter como autoridade enquanto a escrita moderna nao tiver contrato proprio |
| Calculo canonico | `finance-core.js`, `report-asset-row.js` | Calcula valores financeiros e monta linha canonica de relatorio | Legado canonico | Leitura | Funcoes canonicas do legado | Alto se houver segunda implementacao | Reutilizar, nao duplicar |
| Contrato de pagina readonly | `readonly-report-page-contract.js` | Normaliza pagina readonly segura e fallback `reports` | Contrato canônico publico | Leitura | `READONLY_REPORT_PAGE_IDS`, `DEFAULT_READONLY_REPORT_PAGE_ID`, `isReadonlyReportPageId`, `normalizeReadonlyReportPageId` | Baixo se consumidores usarem API publica | Manter como fronteira unica da pagina |
| Fonte readonly de relatórios | `legacy/reports-readonly-source.js` e `modern/src/bootstrap/hostLegacyReportsReadonlySource.ts` | Entrega snapshot readonly de relatorios a partir da carteira ativa | Legado e host explicitamente injetado | Leitura | `createLegacyAssetsReadonlyProvider()` / `createHostLegacyReportsReadonlySource()` | Medio se o snapshot ficar stale | Manter como ponte sem acesso direto no React |
| Contrato readonly de relatórios | `modern/src/features/reports/reportsReadonlyContract.mjs` / `.d.ts` | Valida, clona e congela snapshot de relatorio | Snapshot readonly | Leitura | Runtime canônico + tipagem | Baixo | Manter tipado e versionado |
| Bridge e adapter de relatórios | `modern/src/features/reports/reportsReadonlyBridge.mjs` / `reportsSnapshotAdapter.mjs` | Conectam provider -> snapshot -> UI | Snapshot readonly | Leitura | Bridge + adapter | Baixo | Manter sem lógica financeira nova |
| Runtime de relatórios | `modern/src/bootstrap/modernReportsRuntime.ts` | Monta a pagina moderna com source externo | Adapter readonly | Leitura | Runtime explicitamente injetado | Baixo | Manter isolado do legado |
| Pagina moderna de ativos | `modern/src/features/reports/AssetsReadonlyPage.tsx` | Mostra ativos, resumo, filtros e destaques | Snapshot readonly | Apenas leitura | Adapter + controller | Baixo | Manter apenas visual |
| Pagina moderna de renda fixa | `modern/src/features/fixed-income/FixedIncomeReadonlyPage.tsx` | Mostra renda fixa readonly | Snapshot readonly | Apenas leitura | Adapter + controller | Baixo | Manter apenas visual |
| Pagina moderna de proventos | `modern/src/features/income/IncomeReadonlyPage.tsx` | Mostra proventos readonly | Snapshot readonly | Apenas leitura | Adapter + controller | Baixo | Manter apenas visual |
| Pagina moderna de aportes | `modern/src/features/contributions/ContributionsReadonlyPage.tsx` | Mostra aportes e sugestao explicavel readonly | Snapshot readonly + analise legada pura | Apenas leitura | Adapter + controller | Medio se a explicacao ganhar sem fonte oficial | Manter readonly e rastreavel |
| App e bootstrap modernos | `modern/src/App.tsx`, `modern/src/host.tsx`, `modern/src/main.tsx`, `modern/src/bootstrap/mountModernApp.ts` | Rotas, host e montagem da UI | Estado do shell + adapter | Leitura | Componentes puramente de apresentacao | Baixo | Manter sem acesso direto ao legado |
| Navegacao de pagina readonly | `modern/src/features/reports/readonlyReportSessionContext.ts` | Resolve pagina segura e retorno ao legado | Contrato compartilhado | Leitura | `getReadonlyReportPageContract(candidate?)` | Baixo | Manter sem global inseguro |
| Host de contribuicoes readonly | `modern/src/bootstrap/hostContributionsReadonlySource.ts` | Exposicao readonly da analise de aportes | Resultado legado puro ou snapshot derivado | Leitura | Provider host dedicado | Medio se a fonte legada ganhar efeitos colaterais | Reaproveitar somente se continuar leitura deterministica |
| Refresh controllers | `modern/src/features/reports/reportsRefreshController.ts`, `modern/src/features/income/incomeRefreshController.ts`, `modern/src/features/fixed-income/fixedIncomeRefreshController.ts`, `modern/src/features/contributions/contributionsRefreshController.ts` | Releitura sob demanda e preservacao do ultimo snapshot valido | Snapshot readonly | Leitura | Controller com estado local | Baixo | Manter sem polling |
| Service worker | `sw.js` | Cache e navegacao offline | Cache do app | Leitura indireta | Cache versionado | Medio por servir shell antigo | Monitorar em cada fase |
| Testes de arquitetura | `tests/readonly-contract-architecture.test.js`, `tests/modern-architecture-decision.test.js` | Protegem fronteiras, docs e decisoes | Arquivos versionados | Leitura | Guardrails textuais e comportamentais | Baixo | Manter como trava de regressao |

## Leitura consolidada

- O legado continua sendo a unica fonte de verdade para escrita e calculos financeiros.
- O moderno ja esta separado em contratos readonly, bridges, adapters, runtimes e paginas.
- O React moderno nao deve ler `S` diretamente.
- A fronteira de contribuições depende de `prudentContributionAnalysis()` apenas se a leitura continuar pura e sem efeitos colaterais.
- O maior risco operacional nao e tecnico de UI, e sim schema drift, cache antigo e tentativa de escrita sem contrato proprio.

## Risco e rollback

- Qualquer extensao para escrita moderna precisa nascer em fase propria.
- Rollback da modernizacao readonly continua simples porque a camada moderna nao altera dados de origem.
- O service worker e o cache precisam sempre ser validados antes de interpretar um bug como falha funcional.
