# Architecture Map

## Runtime flow

```text
Browser
  -> index.html bootstrap and inline CSS/JavaScript
  -> testMode/auth/Firebase bootstrap
  -> PersistenceCore load or local fixture
  -> global state S
  -> go(route) and render/content dispatch
  -> official helpers and FinanceCore-derived values
  -> DOM, dialogs, tables and charts
  -> save() through PersistenceCore when a write is intentional
```

The modern path is intentionally separate:

```text
modern/vite.config.ts -> modern/src host -> readonly bridges/contracts
                      -> no legacy financial write path
```

## Main files

| File | Responsibility | Sensitivity |
|---|---|---|
| `index.html` | Authoritative legacy SPA, shell, screens, handlers and inline CSS | High; mixed product/runtime file |
| `finance-core.js` | Pure financial calculations and domain helpers | Protected |
| `persistence-core.js` | Serialization, load/save and storage boundary | Protected |
| `portfolio-movement-contract.js` | Movement validation/contract | Protected |
| `portfolio-movement-preview.js` | Read/preview movement behavior | Protected contract |
| `readonly-report-page-contract.js` | Readonly report session contract | Protected contract |
| `report-asset-row.js` | Report asset row extraction/formatting | Data-facing |
| `modern/src/` | React/Vite readonly host and adapters | Isolated, protected |
| `sw.js` / `manifest.json` | PWA service worker and install metadata | Protected |

## State and navigation

- Global session state is `S` in `index.html`.
- Main routing is handled by `go(t)`.
- Renda Fixa is the canonical dedicated `renda-fixa` route, separate from the
  Ativos route; it is not an Ativos inner tab or a duplicated application.
- Asset opening uses canonical handlers such as `edA(id)`; do not infer an
  identity from a non-unique ticker.
- Test mode is activated only on local hosts with `?testMode=1` and uses an
  in-memory deterministic fixture.

## Data and persistence

- Storage defaults are `civ5` for state and `civ5_cfg` for configuration.
- Theme preference uses `carteira_theme`.
- Firebase compat scripts support authenticated cloud loading/saving in the
  legacy app; local development and test mode can use local/in-memory state.
- Backup, import, migration and cloud sync remain centralized. UI code must
  call existing boundaries rather than serialize a second shape.

## Screen map

| Screen/tab | Route/entry | Current renderer evidence | Data focus |
|---|---|---|---|
| Dashboard | `dashboard` | `dashboardHomeSummaryPanel`, `dashboardHomeCompositionPanel`, `dashboardEvolutionPanel` | portfolio snapshot, income, highlights |
| Ativos | `ativos` | `ativos()` | positions, classes, asset actions |
| Renda Fixa | `renda-fixa` | `rendaFixaTab()` on the dedicated route | RF positions, events, maturity |
| Aportes | `aportes` | contributions renderer and pagination helpers | movements/contributions |
| Metas | `metas` | `metasTab()` | goals and progress |
| Dividendos | `dividendos` | dividend renderer and `proventoStats()` | dividends and history |
| Rentabilidade | `rentabilidade` | `rentabilidadeTab()` | returns and benchmarks |
| Rebalancear | `rebalancear` | legacy rebalance flow | target drift and suggestions |
| Relatórios | `relatorios` | legacy report flows and readonly contracts | reports/export |
| Auditoria | `auditoria` | `dataAuditTab()` / data-quality reconciliation | data completeness and review |
| Insights | `ia` / hub entry | insight hub renderers | readonly contextual insights |
| Configurações | settings entry | shell/settings handlers | preferences and configuration |

## Sensitive points

- `assetAnalysisRows()`, `assetAppliedValue()`, `assetCurrentValue()`,
  `assetRentabPct()`, `rfValues()`, `patrimonySnapshot()`,
  `passiveIncomeGoalStats()` and `proventoStats()` are canonical data paths.
- `saveRfMovimentacao`, asset editing, dividend editing and backup/import are
  write-sensitive flows.
- Visual changes must preserve handlers, IDs, route contracts, accessible
  focus, and the distinction between zero and missing data.

## Analysis destination

- `S.tab==='analise'` renders `analysisDestination()`.
- `analysisDestination()` consumes the canonical `assetAnalysisRows()` source
  and the existing `assetAnalysisBlock()` renderer.
- The mobile bottom navigation remains compact; Análise is available from the
  `Mais seções` sheet. Global search exposes the same route as a destination.
- No analysis formulas, financial sources or persistence boundaries were added.

## Global search and contextual navigation

- `portfolioSearchOpen()` opens the read-only discovery dialog;
  `portfolioSearchBuildEntries()` builds entries from existing assets, RF,
  movements, dividends, goals and audit snapshots, plus the dedicated
  `analise` route entry.
- `portfolioSearchResults()` applies normalized exact/prefix/contains matching
  and `portfolioSearchOpenEntry()` preserves normal route/editor behavior.
- Análise exposes only lightweight contextual navigation to `ativos`,
  `rentabilidade` and `rebalancear`; it does not introduce a second analysis
  source or financial calculation.

The global search and contextual navigation improvement is frozen as a
functional UX contract. Future changes must preserve read-only discovery,
normal route/editor handlers, and the separation between navigation entries and
financial records.
