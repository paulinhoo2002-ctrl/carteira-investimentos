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

## Phase 4I protected August pilot

```text
internal localhost surface
  -> protected session / 12-callback bridge
  -> protected August executor (dry-run and real shared entrypoint)
  -> targeted snapshot
  -> 20 linkage metadata updates + 1 TEPP11 event
  -> 1 explicit KNUQ11 deferred ambiguity (no-op, zero financial delta)
  -> official local-only save -> readback -> invariants
  -> reconciliation -> idempotency -> cloud sync -> cloud reload validation
```

## Governance and cost routing

O catálogo versionado e o router são a fonte operacional para agentes futuros.
Missões grandes começam com `find-skills`; Firebase/Auth/Firestore, permissões
cloud, sincronização local/cloud e protected writes usam
`firebase-security-rules-auditor`; UI, acessibilidade, responsividade,
performance e QA web usam `web-quality-audit`. Essas Skills não substituem os
contratos financeiros, de persistência ou autorização.

A operação normal busca custo recorrente zero. Dados do usuário, exportações
manuais da corretora, fontes gratuitas aprovadas e processamento local são
preferidos; B3, market data, IA, SaaS, banco ou hospedagem pagos não são
requisitos normais sem autorização explícita.

The executor is fail-closed and authorization-bound to HEAD plus live, source,
plan, review, provider and manifest fingerprints. DIVD11 and NDIV11 are audit
exclusions, not ledger writes. KNUQ11 remains visible in the source accounting
but never enters the mutation model without independent identity evidence.
Rollback restores only the 20 touched records and removes the one created
TEPP11 event.

## Cost and data-source architecture

- Normal personal operation should have zero recurring cost whenever technically
  possible.
- Prefer existing user data, manually exported broker/B3 files, already-approved
  free sources, local processing and local cache/persistence.
- A paid B3 feed, paid market-data subscription, paid AI API, unnecessary SaaS,
  paid database or paid hosting must never become a normal runtime dependency
  without explicit authorization.
- External AI/model review is optional engineering assistance, never a runtime,
  validation or maintenance requirement.

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

## Phase 4H Class C protected path

`protected-targeted-classc-executor.js` e separado do executor aditivo Yahoo.
Ele aceita apenas o contrato persistente REPLACE/RECLASSIFY/KEEP, usa o conjunto
oficial de callbacks e recusa autorizacao ou wiring incompleto. O caminho e
surface/plan provider -> preflight Class C -> snapshot direcionado ->
mutation/save/readback/reconciliation/idempotency -> sync/reload; o ramo real
continua bloqueado por autorizacao explicita.

### Phase 4H local pre-Class-C recovery

`protected-preclassc-local-recovery.js` implementa o caminho distinto
`TARGETED_PRE_CLASS_C_LOCAL_RECOVERY`. Ele usa a leitura cloud somente como
ancora de destino, cria snapshot local persistido dos 99 registros afetados e
dos hashes de estado nao relacionado, aplica somente a divergencia local,
valida readback independente e faz rollback por identidade/slot original.
O dry-run encerra antes do snapshot; nenhum callback de cloud e exposto. O
prewrite correspondente e `tools/qa/phase4h-preclassc-recovery-prewrite.js`.

### V49 autoridade local/cloud e durabilidade do perfil QA

`protected-local-cloud-authority.js` canonicaliza os seis campos financeiros
persistidos e calcula SHA-256 síncrono, idêntico ao fingerprint autoritativo de
recovery, para o marcador versionado. `applyCloudData` só aplica
cloud quando a decisão é `CLOUD_AUTHORITATIVE`; divergência protegida preserva
local e mudança independente vira `CONFLICT`. Marcador inválido falha fechado.

O perfil QA persistente é externo ao repositório, usa `Default` e não deve ser
recriado. O stop comprova `user-data-dir`, perfil e porta em `chrome://version`,
fecha por `Browser.close` via CDP e aguarda o endpoint sumir; não existe fallback
por `taskkill`, pois término forçado pode perder Local Storage/LevelDB recente.

`protected-recovery-authorization-contract.js` separa gates PREAUTH, que são
prováveis sem mutação, dos gates POSTWRITE que necessariamente dependem do alvo
real persistido. O alvo ausente antes da autorização é o preestado esperado,
não um blocker. Reinício integral duplo e paridade multitab continuam gates
obrigatórios após a única restauração local autorizada.

### V50 boot real e marcador V2

O recovery protegido lê o payload cloud somente como base e registra seu
fingerprint antes de qualquer save protegido. Esse save falha fechado sem a
autoridade V2 ou fingerprint cloud válido. O launcher QA inclui `--disable-gpu`
após o erro comprovado `GPU process isn't usable` do Chrome 153 neste Windows.
Boots protegidos reais não escrevem `civ5` nem `civ5_authority`; writes
auxiliares do Firebase/Chrome não são writes da carteira.
