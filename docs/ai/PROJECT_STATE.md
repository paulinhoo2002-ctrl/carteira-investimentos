# Project State

## V273 — Reporting data quality and operational polish (locally certified; PR pending, 2026-09-26)

- Branch `feature/v273-reporting-data-quality-ops`, worktree `C:/Projetos/carteira-investimentos.worktrees/v273-reporting-data-quality-ops`, based on current `origin/main` SHA `75e77a7e98ef0768a5d4a6855b684432f09493b4` (V272 PR #425 merge).
- Architecture spec and execution plan: `docs/superpowers/specs/2026-09-26-v273-reporting-data-quality-operational-polish-design.md` and `docs/superpowers/plans/2026-09-26-v273-reporting-data-quality-operational-polish.md`.
- The pure/read-only `portfolio-report-readiness.js` aggregates existing evidence into factual section states; the Reports UI shows the concise result and evidence. It does not write, score, infer missing values, or create a new authority.
- `ENGINE_AVAILABLE != DATA_READY`; V76 wallet identity remains absent and blocks real TWR/XIRR readiness. UNKNOWN != ZERO; PARTIAL != AVAILABLE; STALE != FRESH. Manual fixed-income authority is disclosed, not falsely aggregated.
- A local browser smoke exposed a `ReferenceError` (`classifier` not defined) that made Reports silently fall back to Dashboard. Fixed by resolving the existing global `PortfolioCashFlowClassifier` in the V273 adapter; added a regression contract.
- Final local verification: focused 75/75; `test:performance` 84/84; `test:qa-harness` 2/2; `test:modern` 815/815; `npm test` 249/249; `build`, `build:modern`, `qa:all`, V273 responsive/UI 6/6 and `git diff --check` PASS. Reports QA exercised 390/430/768/1366/1440/1536/1920 with no overflow/runtime/console/request failures. Axe on the Reports health panel at 390px: critical 0, serious 0. Screenshots at 390/768/1366/1920 were captured and reviewed by Codex from isolated synthetic local test mode.
- Dependency installation (`npm ci --ignore-scripts`) was explicitly authorized and limited to this worktree; package manifest and lockfile unchanged. Six existing npm audit findings were reported; no versions were updated and no audit fix was run.
- GLM-5.3, Kimi K3, Hermes/NVIDIA unavailable; separate Codex technical and visual reviews only, with no claim of independent-model review. Financial/tax writes: 0 by read-only scope. Commit/push/PR and exact-head CI/preview remain pending; no merge.

## V272 — trusted cash flows and performance readiness (merged, 2026-09-26)

- V272 PR #425 was merged to main at `75e77a7e98ef0768a5d4a6855b684432f09493b4`; the implementation below is part of the current base. No V273 merge is authorized.
- Approved three-slice design and execution plan are in `docs/superpowers/specs/2026-09-26-v272-trusted-cashflow-performance-foundation-design.md` and `docs/superpowers/plans/2026-09-26-v272-trusted-cashflow-performance-foundation.md`.
- Implementation currently adds pure `portfolio-cash-flow-classifier.js`; makes V271 TWR/XIRR readiness require wallet-scoped, HIGH-confidence canonical flow evidence with valid date, magnitude/sign and provenance; rejects ambiguous, wrong-wallet, duplicate-source-identity and unscoped evidence; and hardens/reuses V248 `HistoricalPerformance` rather than adding a second engine.
- TWR requires explicit `END_OF_SUBPERIOD` timing and an observed valuation on the exact flow date. XIRR no longer fabricates an opening contribution from the opening valuation. Legacy `status` fields remain compatible while metrics also expose structured availability; engine availability is separate from real-wallet data readiness.
- The legacy History/Reports disclosure is wired read-only. V76 global flow/snapshot stores currently lack wallet IDs; V272 refuses to assign global records to the active wallet, so real-wallet TWR/XIRR remain unavailable. No financial/tax, persistence, schema, import, backup, Firebase or cloud writes were made.
- After the user-authorized lockfile install (`npm ci --ignore-scripts`; no manifest/lock changes), final local gates passed: focused V272/V271/V248/history tests + inline syntax 94/94; `npm run test:modern` 815/815; `npm test` 249/249; legacy and modern builds PASS; `npm run qa:all` PASS including QA harness 2/2 and browser smoke at 390/430/768/1366/1440/1536/1920 with no horizontal overflow, console/page/request errors. The rendered V272 panel was inspected in isolated Playwright test mode at all seven widths: mounted, no panel/page overflow, `ENGINE_AVAILABLE=Sim`, `DATA_READY=UNAVAILABLE`; full Rentabilidade axe scan had 0 WCAG 2.1 A/AA violations after a page-scoped text-contrast correction. Visual screenshots were reviewed from isolated synthetic test mode; this is not authenticated real-wallet QA.
- `V76` runtime flow/snapshot stores are global and omit `walletId`. That is a real evidence limitation, not a value to infer: real-wallet readiness remains false until wallet-scoped provenance exists. `ENGINE_AVAILABLE` does not imply `DATA_READY`; no metric is made ready with synthetic data. GLM-5.3/Kimi K3 were not available as review executors; separated technical and visual self-review was performed.
- Financial/tax/import/restore/cloud write counts are 0. `package.json` and lockfile are unchanged. Canonical main's dirty/untracked state was preserved; all V272 edits remain confined to its dedicated worktree.

## Workspace / worktree audit — 2026-09-25

- `origin/main=5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`; PR #416 (V265) está
  CLOSED/MERGED nesse SHA. O `main` canônico começou quatro commits atrás e foi
  atualizado por fast-forward após verificar zero colisões com os 335 caminhos
  não rastreados; estes continuam preservados. O checkout terminou sincronizado
  com `origin/main`, sem alterações rastreadas.
- O inventário começou com 37 worktrees registradas. Após remover normalmente
  as worktrees limpas/equivalentes de #414, #415 e #416, restam 34, incluindo
  esta worktree documental. As worktrees internas em `.worktrees` continuam
  registradas. Nenhuma branch local ou remota foi removida.
- Quatorze diretórios órfãos comprovadamente vazios foram removidos sem
  recursão. Pastas com arquivos, metadados `.git`, commits exclusivos ou
  evidência ambígua foram preservadas. A worktree registrada
  `v264-postmerge-audit` estava limpa e sem commits exclusivos; `git worktree
  remove` retirou seu registro, mas falhou ao apagar a pasta física (`Invalid
  argument`). O resíduo sem `.git` foi preservado, sem força ou limpeza manual.
- Pastas não registradas restantes e conteúdo local do canonical permanecem
  para revisão. Consulta de processos não encontrou consumidor além do próprio
  shell da auditoria; uma segunda verificação por diretório foi limitada pela
  permissão do host e, por isso, diretórios ambíguos não foram removidos.
- Os 335 caminhos locais não rastreados do canonical incluem 139 arquivos
  diretamente na raiz e diretórios de screenshots QA (79), ferramentas (71),
  `local-imports` (19), docs (7), `.worktrees` (5), scripts (4) e testes (4),
  além de diretórios de arquivo único. São evidência, dados locais e artefatos
  heterogêneos; todos foram mantidos.
- Órfãos com conteúdo mantidos: `.qa-state`, `v206-executive-evolution`,
  `v222-allocation-intelligence`, `v245-import-center-2` e
  `v264-postmerge-audit`. A pasta vazia de V265 continua bloqueada pelo sistema.
- Uso aproximado observado: raiz oficial de worktrees 1.732 MiB; checkout
  canônico (excluindo `.git`, `node_modules` e `.worktrees`) 800 MiB;
  `node_modules` canônico 120 MiB; worktrees internas 168 MiB. O banco Git
  reportou 25 arquivos temporários `tmp_obj_*` (~259 MiB). `git fsck --full
  --no-reflogs --unreachable` encontrou 169 commits inalcançáveis (10.919
  objetos no total). Nenhum objeto foi apagado; o risco de histórico
  recuperável impede GC nesta missão.
- Validação limpa em `origin/main`: modern 815/815; geral 249/249; builds
  moderno/legado PASS; contrato QA 2/2; browser smoke 7 larguras PASS. `qa:all`
  passa após iniciar o servidor oficial local (`qa:serve:legacy`) em loopback;
  sem servidor, o smoke retorna `ERR_CONNECTION_REFUSED`. Nenhuma alteração de
  produto, finanças, persistência ou dependências do projeto foi feita.
- Governança proposta: usar somente a raiz externa para novas worktrees,
  tratar `.worktrees` interno como legado, aplicar remoção pós-merge com gates
  explícitos e preservar qualquer conteúdo duvidoso. A worktree #416 deixou
  uma junction `node_modules` para o resíduo V264; a junction foi removida sem
  tocar o alvo. A pasta pai vazia continua bloqueada pelo sistema. O resíduo
  V264 inclui código-fonte, testes, docs, `Refs` e dependências e foi preservado.
- A atualização documental está na branch `docs/workspace-worktree-lifecycle`;
  merge permanece um gate humano separado.
- V266 não foi iniciada: XP/BTG depende de fixtures reais sanitizadas; TWR/XIRR
  depende de histórico suficiente; MODE_B aguarda decisão de provedor/negócio;
  não há regressão mobile específica; Reports e clean-state estão integrados.
  Nenhuma macrofase independente estava suficientemente evidenciada para
  iniciar implementação nesta auditoria.

## Skills library audit — 2026-09-25

- Snapshot: 42 direct folders, 43 SKILL.md files, 38 physical operational
  packages; caveman-stats cannot run without its two required hooks, and
  banner-design has missing optional references.
  Four operational Skill files are tracked; most of the library is
  machine-local/ignored and must be rediscovered in each executor.
- Superpowers is available through the global plugin in this session, not as a
  local package under .agents/skills. No shim was created. Seven optional
  Markdown links are missing in web-quality-audit/Mantis; banner-design also
  lacks cited auxiliary references, and caveman-stats lacks its required hooks.
  No package was deleted.
- docs/ai/SKILL_OPERATIONAL_CATALOG.md now records classification and routing.
  Changes are included in PR #417; merge remains unauthorized.

## V265 — QA harness resilience — 2026-09-25

- Branch `feature/v265-qa-harness-resilience`, based on V264 merge `10995f31d7ada0b7f8a02e6317813de0c21fc55d`. This phase hardens only local QA infrastructure: the static test server now reads a file before sending HTTP 200 (so missing generated assets return 404 without crashing), supports an isolated CLI port, and has a regression test. QA scripts now include the missing `test:qa-harness` command and build `modern/dist` before browser smoke.
- The supported local QA server is Node-based and bound to `127.0.0.1`; the previous Python server on this host accepted a connection but returned an empty response. A different process occupied port 4173 and was left untouched; validation used port 4174.
- Validation after post-governance reconciliation: QA harness 2/2 (missing asset 404 followed by valid 200; sibling-prefix traversal denied), modern 815/815, general 249/249, modern/legacy builds PASS, `qa:all` PASS; browser smoke passed 390, 430, 768, 1366, 1440, 1536 and 1920 with no overflow, console/page errors or local request failures; diff-check PASS. Existing Vite/Node warnings remain unrelated.
- No production application, financial logic, data, persistence, Firebase, imports, or tax code changed. `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope. No authenticated portfolio QA was required or performed for this harness-only change.
- PR #416 closed as merged to `main` at `5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`; its exact merged tree was verified before worktree removal. No merge was performed during this workspace-audit mission.

## V266 — QA smoke autostart — 2026-09-25

- Branch `feature/v266-qa-smoke-autostart`, based on V265 merge `5a6a0a47d7396cf7b075c9b0ff8adc29faebf0aa`. This phase makes `qa:all` autonomous by auto-starting the local QA server when `QA_ORIGIN` is not defined.
- Implementation: new wrapper `tools/qa/run-smoke-with-lifecycle.js` that checks `QA_ORIGIN`; if absent, starts `startLocalHttpServer(root, 0)` (ephemeral port), waits for HTTP 200 readiness, runs `browser-smoke.js`, and **always** stops owned server in `finally` block. If `QA_ORIGIN` supplied, passes through directly with no server management.
- Reuses existing V265-hardened `startLocalHttpServer` — no new server implementation. Preserves path containment (403 on traversal), ephemeral port support.
- Added lifecycle test suite `tests/qa-lifecycle.test.js` (5 tests): TEST 1 autostart+smoke+cleanup, TEST 2 QA_ORIGIN passthrough, TEST 3 failure cleanup, TEST 4 startup failure diagnostics, TEST 5 V265 404 survival. Added `test:qa-lifecycle` npm script.
- Validation: `qa:all` PASS from clean state (no manual server); `test:qa-harness` 2/2; `test:qa-lifecycle` 5/5; `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `git diff --check` PASS. Browser smoke 7 widths (390, 430, 768, 1366, 1440, 1536, 1920) all PASS: no overflow, console errors, page errors, request failures.
- QA_ORIGIN compatibility verified: explicit origin used, no autostart, external server not stopped. Manual server commands (`qa:serve:legacy`, `qa:start-server`) preserved.
- No production application, financial logic, data, persistence, Firebase, imports, or tax code changed. `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope.
- Documentation updated: `docs/ai/QA_HARNESS.md` records autonomous execution and QA_ORIGIN behavior.
- PR #419 squash-merged as `5b9de334775d24833e0e696a2bc825f9b7a4361d`. Local main fast-forwarded to `origin/main`. V266 worktree removed (residue preserved due to Windows file lock).

## V267 — Backup and recovery hardening — 2026-09-25 — COMPLETED & MERGED

- **Selection rationale:** Delivers real user value (reliable backup/restore with audit trail), reduces operational risk (no silent overwrites, preview before restore), strongly testable, autonomous completion possible, does not require fabricated financial history or broker files, unlocks later phases.
- **Scope delivered:** Deterministic export with explicit version/schema metadata; restore preview before write (dry-run); validation before restore (schema, version, structural); no silent overwrite (explicit confirmation); failure-safe recovery (atomic, rollback); auditability (operation logs); backward compatibility (recognize legacy formats).
- **Constraints preserved:** Zero real financial writes before explicit confirmation; preserve UNKNOWN != ZERO, PARTIAL != COMPLETE, STALE != FRESH, FINANCIAL_AS_OF != SOURCE_AS_OF; MANUAL_AUTHORITY_PRESERVED=true.
- **Implementation:**
  - `backup-portability.js` v1.1: `operationId`, `exportedBy`, `schemaIdentifiers.stateSchema`/`configSchema` = `backup-portability-v1.1`, `compatibility` object, `SCHEMA_VERSIONS` registry
  - `verifyBackup`: future/unknown schema warnings via semantic major comparison, checksum validation, COUNT_MISMATCH detection, prototype pollution protection
  - `previewRestore`: detailed diff (adds/updates/conflicts/skips), summary object, `restoreAllowed` semantics (SUPPORTED + no conflicts), compatibility/warnings propagated, side-effect free
  - Diff semantics: UPDATE (mutable value changes) vs CONFLICT (identity fields: ticker, type, name, eventType)
  - Legacy v1.0 (major=1) → SUPPORTED; major < 1 → MIGRATABLE (blocks restore); major > 1 → TOO_NEW
- **Tests:** `tests/backup-recovery-hardening.test.js` (9 tests), `tests/v249-backup-recovery.test.js` updated for v1.1
- **Validation:** `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `qa:all` PASS; `git diff --check` PASS; `test:backup-recovery` 9/9; `test:v249` 12/12
- **PR #420** squash-merged as `f11d38683b1aca50fb639aba1746f0269c426ef6`. Local main fast-forwarded to `origin/main`. V267 worktree removed (residue preserved due to Windows file lock).
- **No production application, financial logic, data, persistence, Firebase, imports, or tax code changed.** `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope.

## V268 — Portfolio history foundation — 2026-09-25 (SELECTED)

- **Selection rationale:** Delivers real user value (deterministic portfolio snapshots with provenance), enables future TWR/XIRR over real history (no synthetic backfill), strongly testable, autonomous completion possible, does not require fabricated financial history or broker files, builds on V267 backup/restore guarantees.
- **Scope:** Deterministic snapshot capture with `operationId`-equivalent `contentHash`, provenance (source, user, wallet, reason), price coverage classification, chronological storage order, deduplication by content hash, retention by age/count, schema validation, auto-capture scheduling.
- **Constraints:** Zero real financial writes; preserve UNKNOWN != ZERO, PARTIAL != COMPLETE, STALE != FRESH, FINANCIAL_AS_OF != SOURCE_AS_OF; MANUAL_AUTHORITY_PRESERVED=true; NO_FAKE_HISTORY_CREATED=true; TWR_XIRR_AVAILABLE=false until sufficient trustworthy history exists.
- **Implementation:**
  - `portfolio-history-core.js`: `captureSnapshot`, `getSnapshots`, `deduplicateSnapshots`, `pruneSnapshots`, `validateSnapshot`, `shouldAutoCapture`, `getHistoryState`, `setHistoryState`, `addSnapshotToHistory`, `computeValuations`, `computePriceCoverage`
  - `portfolioHistory` state key: `{ snapshots: [], config: {} }` with chronological storage (oldest first)
  - Content hash = SHA256 of `{ valuations, priceCoverage, capturedAt, schemaVersion }` — deterministic for identical portfolio state + timestamp
  - Provenance: `source` (MANUAL|AUTO|IMPORT|RECOVERY), `userId`, `walletId`, `captureReason`, `extra`
  - Price coverage: FULL_COVERAGE | PARTIAL_COVERAGE | UNKNOWN (blocks TWR/XIRR)
  - Deduplication: by `contentHash` (identical portfolio state at same timestamp)
  - Retention: max 3650 snapshots (10 years daily), max 3650 days age
  - Ordering contract: STORAGE = chronological (oldest first); DISPLAY = `getSnapshots` returns newest-first; `pruneSnapshots` returns chronological for storage consistency
- **Tests:** `tests/portfolio-history-core.test.js` (18 tests covering capture, query, dedup, prune, validation, ordering contract, auto-capture)
- **Integration:** `portfolioHistory` state included in V267 backup/restore automatically via state serialization
- **Validation:** `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `qa:all` PASS; `git diff --check` PASS; `test:backup-recovery` 9/9; `test:v249` 12/12
- **Branch:** `feature/v268-portfolio-history-foundation` from `origin/main` (`f11d38683b1aca50fb639aba1746f0269c426ef6`)
- **Worktree:** `C:\Projetos\carteira-investimentos.worktrees\v268-portfolio-history-foundation`

## Post-V264 baseline — 2026-09-25

- V263 PR #413 was squash-merged on `main` as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`.
- V264 was squash-merged by PR #415 as `10995f31d7ada0b7f8a02e6317813de0c21fc55d`. The SGS 433 fetcher validates canonical `YYYY-MM` bounds and sends inclusive `DD/MM/YYYY` dates; invalid ranges fail before fetch. Response observations in `DD/MM/YYYY` normalize to month keys; the former `MM/YYYY` response shape remains accepted.
- Official read-only smoke: July 2022 returned HTTP 200 and `01/07/2022`; Aug–Sep 2026 returned HTTP 200 with August only. A September-only direct request had a transient HTTP 502; the provider has also returned its explicit 404 `Value(s) not found` for unpublished periods. That explicit no-data payload is `EMPTY_RESPONSE`, not zero; other HTTP errors are explicit provider errors.
- No IPCA+ automatic security valuation, financial formula, manual fixed-income authority, persistence, or financial/tax write behavior changed. Post-merge validation on `origin/main` in a clean worktree: modern 815/815, general 249/249, modern and legacy builds PASS, diff-check PASS.
- Governance PR #414 was subsequently merged; current main is `98420aea10b552264a729b8470d91ff129567640` and includes the permanent governance rules.

## V263 PR #413 — Financial As-Of Provenance (Renda Fixa) — historical record

- Branch: `feature/v263-rf-freshness-valuation-asof`, base = merged main `9be3d9c3e17b659a507e46a8f57c2b152174366b` (V262 squash-merge of PR #412). Implementation commits: domain `e970bc94`, UI/tests `a5f459ba`; docs/certification commits follow on the same branch. The PR #413 current head must be obtained from Git/GitHub, not from this document.
- PR [#413](https://github.com/paulinhoo2002-ctrl/carteira-investimentos/pull/413): later squash-merged as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`; status/check details above are historical certification evidence.
- V263 delivers separation of **financial as-of** from **source as-of** in the modern readonly Renda Fixa surface: new `modern/src/domain/fixedIncome/financialAsOf.ts` extracts evidence with confidence HIGH (explicit `financialAsOf`/`valuationAsOf`), MEDIUM (`quoteUpdatedAt`/`updated_at` broker metadata) or UNKNOWN. Application/capture/reconstruction/import dates are never promoted. Future dates are rejected. Without evidence the value stays UNKNOWN — never zero, never LIVE.
- `valuationState.ts` now derives `authoritativeValueAsOf` and `authoritativeFreshness` from that evidence and exposes `authoritativeAsOfEvidence/Source/Confidence`. Manual authority is preserved: the shadow value never replaces the authoritative value. IPCA+ remains `UNSUPPORTED_IPCA_EXACT`; CDI path unchanged; no financial methodology changed.
- Readonly contract: two additive OPTIONAL item fields preserve provenance end-to-end — `financialAsOfRaw` (explicit financial valuation timestamp, HIGH) and `quoteUpdatedAtRaw` (broker/update metadata, MEDIUM); legacy snapshots without either remain valid. The host mapper maps each family into its own field; collapsing them into one would promote MEDIUM to HIGH (bug found in independent review, fixed before certification).
- V263 implementation head under final visual certification (2026-09-25): `f3ed317a1ede6caee41e8bd0ba083be2045156bb`; PR #413 was subsequently squash-merged to `main` as `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`. The historical exact-head CI, Vercel and visual evidence below describe that certification checkpoint, not the current PR state.
- UI: list "As-of" cell gains a confidence badge (data explícita/metadado); mobile/detail gains separate "As-of financeiro" (with confidence) and "As-of da fonte" rows. Demo/unauthenticated items correctly show no badge (UNKNOWN).
- PR description's original validation recorded `test:modern` 789/789 and `npm test` 249/249. A fresh local run on the current exact head reports modern 805/805 and general 249/249; both builds and diff-check pass. The two transient V84 browser-smoke failures seen mid-mission were root-caused to the missing generated `modern/dist` build artifact in the fresh worktree (harness 404 crash), not to code; after `build:modern` they pass 4/4.
- Visual QA method: `npm run build:modern` then Vite production preview on `/host.html`, navigate using the modern shell's dedicated Renda Fixa entry. Earlier raw/default-styled screenshots came from an invalid asset-serving path, and preview screenshots were the Vercel SSO gate; neither proves product rendering. The valid method confirmed theme/fonts/assets and viewport fit in both V262 and V263. Axe WCAG A/AA reported no violations on the local fixture surface.
- The 24-column table scrolls inside its own wrapper; page-level overflow `1886px` cited in older notes was not reproduced in either correctly served V262 or V263 build and is removed as an unverified QA artifact. The SGS request failure for `07/2022` was pre-existing on V262/V263 and was subsequently addressed by V264.
- Financial/tax/import/restore writes: 0. PR #413 is merged; no merge action is pending for it.

## V262 PR #412 — IPCA Diagnostics — 2026-09-24

- Branch: `feature/v262-fixed-income-advanced-shadow-valuation`; current code head: `26d1526389a92cc4ca94fff7bc671821f2cf0b09`.
- PR [#412](https://github.com/paulinhoo2002-ctrl/carteira-investimentos/pull/412): OPEN and mergeable. CI run `36079088319` succeeded on the same SHA.
- Vercel deployment `6651218341` is READY for the same SHA; authenticated QA used only the explicitly approved preview alias `carteira-investimentos-git-ca8b51-paulinhoo2002-ctrls-projects.vercel.app`.
- Authenticated product route: `/?protectedReadOnlyQa=1` (legacy Renda Fixa screen). `/modern/` is not the V262 user route. The test-host query `testMode=1&activeWalletHost=1` intentionally bypasses Firebase and must not be used for real-wallet auth QA.
- Runtime contract: manual Renda Fixa authority preserved; exact IPCA remains `UNSUPPORTED_IPCA_EXACT`; no generic IPCA+ value is calculated; coverage and freshness remain separate (`UNAVAILABLE` vs `UNKNOWN` in the inspected portfolio); CDI unchanged; unknown is not zero.
- Authenticated responsive matrix 390/430/768/1366/1440/1536/1920 PASS; no horizontal overflow or critical clipping. Axe: 0 critical / 0 serious. Representative screenshots were captured/reviewed locally and not committed. Offline/reconnect PASS with an organically created trusted local snapshot for the selected wallet; offline remained cached/read-only and truthful.
- Root cause fixed: protected QA mode blocked canonical portfolio persistence as intended, while offline recovery depended on a stale `civ5` wallet snapshot. A distinct user-bound local read-only cache now records the validated selected wallet from authenticated app-loaded state; canonical `civ5` stays unchanged. Snapshot/as-of provenance and fail-closed validation are preserved. Local offline cache writes are classified separately from financial/cloud writes.
- Financial, tax, import-confirmation and real-restore writes: 0. Snapshot bootstrap in normal authenticated mode may emit a **nonfinancial** access-audit update; do not characterize this as zero total backend writes. No financial controls or mutations were used.
- Local evidence: focused offline/snapshot/security tests PASS; `npm test` 249/249; modern 777/777; modern and legacy builds PASS. No financial formulas changed.
- Offline recovered the same selected wallet and fixed-income authority; reconnect restored authenticated online state without a request/reload loop. After any documentation-only update, revalidate CI and Vercel against the exact current PR head before readiness. Merge remains unauthorized and not executed.

## Current canonical state — 2026-09-24

- `CURRENT_MAIN_SHA=c3466561c4f6134edd5ea915be1d0ed1ca387286` (verified before the V262 documentation closeout).
- PR #412 is the active V262 phase; its merge has not been authorized or performed.
- Latest product baseline on main before V262: V261 fixed-income freshness/valuation provenance.
- Next step after V262 is explicit human squash-merge authorization; do not begin another product phase automatically.
- This state update records read-only QA evidence and does not change financial data or formulas.

## 2026-09-22 - Project identity hard lock

- `PROJECT_IDENTITY_HARD_LOCK=true`.
- `PROJECT_ROOT=C:\Projetos\carteira-investimentos`.
- `OTHER_PROJECTS_ALLOWED=false` e `CROSS_PROJECT_ACCESS_ALLOWED=false`.
- Worktrees válidas pertencem ao mesmo repositório e ficam sob
  `C:\Projetos\carteira-investimentos.worktrees`.
- Toda missão exige `PROJECT_IDENTITY_GATE` antes de leitura ou escrita
  substancial.
- Mismatch exige `HUMAN_BLOCKER_WRONG_PROJECT_AND_STOP`.
- Esta entrada é governança durável. Não altera o estado funcional nem os
  snapshots históricos abaixo.

## Estado canônico V79 — 2026-09-15

- `CURRENT_HEAD` funcional: `25c5854177a9db88dba76a87d2d66d49dc59feb0`
- `CURRENT_BRANCH`: `feature/phase-4-automation-foundation`
- `LATEST_COMPLETED_MISSION`: V78
- `FINANCIAL_BASELINE`: `431/330/101`, 99 referências, `2709626` cents,
  FP `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`
- `QA_STATUS`: canonical 4173/9233 authenticated and stabilized after V77
- `MARKET_DATA_STATUS`: Yahoo Chart, 36/36, tokenless
- `CORPORATE_EVENT_STATUS`: public cache/sync/parser active, coverage partial
- `FIXED_INCOME_STATUS`: 5 positions; 2 CDI shadow candidates; stale/unknown
- `PERFORMANCE_STATUS`: tracking since 2026-09-15; TWR/XIRR collecting history
- `BROKER_IMPORT_STATUS`: Inter deterministic; XP/BTG fixture-required
- `DASHBOARD_STATUS`: working, maturity partial
- `OPEN_BLOCKERS`: RF freshness, XP/BTG fixtures, future event coverage
- `NEXT_RECOMMENDED_WORK`: improve RF as-of/valuation and dashboard safely
- `LAST_UPDATED_AT`: `2026-09-15`

## 2026-09-09 - Runtime local autoritativo para recovery protegido

- O runtime local autoritativo usa o perfil real do Chrome `Default` e a chave
  canônica `localStorage['civ5']`; o launcher não abre o perfil enquanto ele
  estiver bloqueado pelo Chrome pessoal e não encerra processos sozinho.
- O modo `authoritativeLocalRecovery=1` mantém leitura/listener cloud para
  diagnóstico, mas bloqueia apply cloud, save local normal, fila/upload/sync e
  consumo de autorização. O recovery 101 continua separado do QA cloud
  somente-leitura e da fonte forense.
- Foram adicionados launcher local, launcher QA protegido, status read-only e
  teste de isolamento. A recuperação real não foi executada; após a mudança de
  HEAD, qualquer autorização anterior precisa ser substituída por nova
  autorização single-use.

## 2026-09-09 - Phase 4H live 101-source gate

- The protected QA runtime is valid on the disposable profile
  `.qa-profile-recovery` at CDP `9244`; personal Chrome was not used.
- Cloud read is authenticated and read-only: `430/329/101`, financial total
  `3718277` cents, fingerprint `cf9b16...`; local forensic state is
  `329/329/0`, financial total `2685096` cents, fingerprint `e1ad958f...`.
- The exact cloud-only source set has `101` records: `95` exact donor matches,
  `4` KNUQ variants and `2` post-donor events. Fresh deterministic source-set
  fingerprints are `eee04bae63a3969e7591b22bc50ef28f95be39f7eff7102e4a99907681dc8bf4`
  and classification fingerprint
  `d5776b75af941ac805069958f05095b738c2996c776993408fedcf64f7c16210`.
- The historical donor hash remains unreproducible and is not a mandatory
  authorization dependency because the current 101 identities and classes are
  independently proven. Three protected read-only prewrites passed identically.
- No real recovery, rollback, reconciliation write, sync, Class C write or
  August pilot was executed. The next step is a new explicit single-use
  authorization bound to the final HEAD and these fresh source-set hashes.

## 2026-09-08 - QA autenticado persistente e gates não bloqueantes

- O navegador QA canônico usa o perfil persistente
  `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-authenticated` e CDP
  localhost na porta 9233. O launcher reutiliza uma instância saudável e evita
  perfis aleatórios.
- `npm.cmd run qa:auth:status` é somente leitura. Quando a sessão Google/Firebase
  não está disponível, `npm.cmd run qa:auth:resume` continua o fluxo sem escrita
  e registra somente nomes de gates, HEAD e timestamps em `.qa-state/`.
- Nenhum cookie, token, credencial ou payload privado é persistido pelo estado
  pendente. Gates autenticados reais podem ser retomados depois do login normal;
  testes, builds, fixtures e QA não autenticado continuam normalmente.

## 2026-09-06 - Phase 4 automation foundation

- `feature/phase-4-automation-foundation` starts from merged `origin/main`
  `56e5488b`.
- Existing safe automation anchors are preserved: quote `qInFlight`, supported
  import preview/duplicate checks, backup validation/rollback, RF maturity
  alerts, and exact-identity contextual navigation.
- Phase 4 safety contract is documented in
  `docs/ai/PHASE_4_AUTOMATION_MAP.md`.
- No frozen screen, financial semantics, persistence, schema, backup/import,
  cloud/auth or real data was changed in the foundation checkpoint.
- Phase 4A now has a pure read-only import foundation in `import-foundation.js`
  with exact identity, deterministic fingerprints and ephemeral reconciliation.
- Phase 4B now adds `historical-import-preview.js` for read-only B3 income
  preview, historical deduplication, movement classification, custody snapshot
  reconciliation, brokerage-note identity checks and import report modeling.
  Real import write remains disabled.
- Phase 4C now adds `historical-reconstruction.js` for read-only cross-source
  economic-event deduplication, verified-history expected positions, three-way
  reconciliation, conflict review and coverage reporting. Unknown or
  unverified events have zero position impact.
- Phase 4D now adds `brokerage-professional.js` for canonical Inter-note
  normalization, note/operation idempotency, fee safety, cross-source event
  linkage, position protection and professional report contracts. No write or
  automatic fee allocation is enabled.
- Phase 4E now adds `protected-import-transaction.js` as a test-fixture-only
  coordinator for preview, confirmation, stale-state blocking, snapshots,
  exact deduplication, idempotency, targeted rollback and reconciliation. It
  does not touch persistence, real profiles, Firebase or real user data.
- Phase 4F now adds `protected-import-pipeline.js`, composing the existing
  import, reconstruction, brokerage and protected-write foundations into a
  deterministic isolated dry-run. It exercises the real Phase 4E coordinator,
  cross-source deduplication, rollback and printable reconciliation without
  adding a route, changing frozen screens or writing real portfolio data.
- Phase 4G now adds the isolated `Importar dados` review center in `index.html`.
  It presents the existing source contract, detection, preview, duplicate and
  conflict counts, reconciliation, rollback evidence and ephemeral simulation
  history. The UI is explicitly test-mode only and does not call persistence,
  Firebase, localStorage or a real portfolio profile.
- Phase 4G keeps B3 movements and arbitrary brokerage PDFs partial/review-only,
  keeps unknown/RF/corporate evidence gaps manual, and reuses the existing
  HTML/native-print reporting foundation. No frozen screen or financial
  semantics were changed.
- Phase 4G.2 freezes the import-center visual canon: compact mobile step
  indicator, sober primary actions, compact empty session state and a visible
  safety result strip for preserved position, zero writes, validated snapshot
  and tested rollback.
- Phase 4H.7 proves a read-only shadow linkage policy for Yahoo reference
  events and B3 payment evidence. The 21 August 2026 cross-source pairs remain
  high-confidence rather than exact links; TEPP11 remains a B3-only candidate.
  No ledger migration, schema change, persistence write or real pilot write was
  performed. Durable linkage remains a separately authorized future boundary.
- Phase 4H.8 is complete after the current implementation and governance
  commits. The additive test-mode model preserves legacy proventos, stores one
  canonical event with multiple source evidences, and keeps real persistence
  and UI semantics unchanged. The August financial increment is `R$ 85,37`;
  `R$ 2.488,47` is already represented value, not an increment.
- Governance correction: `df9daa3` remains unchanged and is recorded as a
  partial H8 commit despite its inaccurate Phase 4H.7 message label.
- Phase 4H.8.1 defines and tests the manual-review, fingerprint freshness,
  single-session authorization, financial-increment and rollback gates for a
  future pilot. The real-write gate remains hard-disabled and no production
  persistence path is changed.

## 2026-09-06 - Phase 3 final usability audit checkpoint

- Release branch `release/phase-3-3-final` is based on `origin/main` at
  `e9abe758` and contains the three authorized productivity commits.
- Browser matrix for Dashboard, Ativos, Aportes, Dividendos and Renda Fixa
  passed at 390, 430, 768, 1366, 1440, 1536 and 1920 px with no overflow,
  page errors or request failures.
- Mobile critical controls were touch-safe. Small desktop chart/metadata text
  is auxiliary and was not enlarged with a broad CSS rewrite.
- Charts with supported series expose focusable points, labels, titles and
  tooltips; Patrimônio remains an explicit monthly list without invented chart
  history.
- Backup export age remains a protected backlog item because no real export
  timestamp source is exposed by the product.
- In-memory Ativos benchmark: 50=44.4 ms; 200=155.1 ms; 500=379.8 ms;
  1000=978.3 ms. Reassess virtualization only with realistic data evidence.

Snapshot date: 2026-09-03

## Identity

- Repository: `paulinhoo2002-ctrl/carteira-investimentos`
- Workspace: `C:\Projetos\carteira-investimentos`
- Authoritative product: personal investment portfolio control application.
- Architecture: legacy SPA plus an isolated modern readonly host.
- This repository is independent from `C:\Projetos\carteira-2.0`.

## Git state

- Branch: `feat/visual-product-north-star`
- Local HEAD: `c53085d689930a1ca1cffd17fdf3bc58d6bbb356`
- `origin/main`: `ea9d6fc2d9ff4bf6935db9f5ae335efc16134cef`
- Remote: `https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git`
- Working tree at audit start: modified `index.html` and
  `tests/dashboard-patrimony-chart-correction.test.js`; untracked `Refs/`,
  `.tmp-reconcile.patch` and `docs/ai/patrimony-north-star-cycle2.md`.
- Those changes are historical/current work and are intentionally preserved.

## Current product state

- `index.html` remains the source of truth for the real application.
- Dashboard, Dividendos, Ativos and Rentabilidade have approved North Star
  direction in project history; the other legacy screens share the same visual
  language but should be changed incrementally.
- The latest local release lineage is Real Use Refinement 02, merged through
  PR #347 in `origin/main` (`ea9d6fc`).
- Financial values, formulas, persisted records and real data are protected.
- The modern React/Vite host is readonly and must not become a parallel write
  path without a separately approved phase.

## Visual canon assets

- `VISUAL_CANON_ASSETS=AVAILABLE`
- `DASHBOARD_CANONICAL_REFERENCE=true`
- `DIVIDENDS_CANONICAL_REFERENCE=true`
- Canonical files live in `Refs/visual-canon/` and are not product data.
- `VISUAL_REFERENCE_LIBRARY=READY`
- `PRIMARY_CANON_COUNT=2`
- `SECONDARY_REFERENCE_COUNT=1`
- `SCREEN_REFERENCE_COUNT=4`
- `PATTERN_REFERENCE_COUNT=0`
- `REJECTED_CONFLICT_COUNT=0`
- `DUPLICATE_COUNT=0`
- `DUPLICATE_HASHES_REPORTED=true`
- Full inventory and priority rules: `docs/ai/VISUAL_REFERENCE_INDEX.md`.

## Frozen boundaries

Do not change without an explicit phase and evidence:

- `finance-core.js` and financial formulas;
- `persistence-core.js`, storage keys, Firebase, backup/import and migration;
- schema and zero-versus-absence semantics;
- real portfolio, dividend, fixed-income and goal data;
- `sw.js`, `manifest.json`, `firestore.rules` and `modern/src`;
- handlers or canonical identity contracts merely to satisfy visual work.

## Known documentation gaps

- `CHANGELOG.md` stops before the latest North Star and Real Use work, so it is
  historical/partial rather than a complete release ledger.

## Next mission boundary

Use `docs/ai/NEXT_STEP.md`. This audit creates project memory only; it does not
start a feature, visual migration or release operation.

## 2026-09-03 - Canonical visual migration 01

- `CANONICAL_VISUAL_MIGRATION_01=READY_FOR_FINAL_USER_APPROVAL`
- `DASHBOARD_CANONICAL_IMPLEMENTATION=READY_FOR_USER_APPROVAL`
- Dashboard and Dividendos received a scoped legacy CSS alignment against the
  two primary canonical screenshots.
- Dashboard desktop performance rows now follow the canonical PM/current/
  variation/result/bar contract without increasing the approved height budget.
- Final acceptance refined Dashboard vertical density and Dividendos semantic
  KPI icons, flat Top ativos ranking and Total geral donut center.
- Financial helpers, datasets, handlers, routes, persistence and protected
  areas were preserved.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-01/acceptance-final/`; screens are
  not frozen yet.

## 2026-09-03 - RF orphan reconciliation

- `RF_ORPHAN_RECONCILIATION=COMPLETE`
- `RF_ORPHAN_RECOVERY_NEEDED=false`
- The orphan chain `31d0d11e -> a87078ec -> 42c31355 -> 4e882816` contains
  fixed-rate identity, readonly projection, supplement and test concepts that
  are already present in the canonical state.
- The canonical state is newer for CDI parsing, daily factors, valuation and
  related integration coverage.
- No product, financial, persistence, schema or real-data delta was recovered.

## 2026-09-03 - Canonical visual freeze

- `DASHBOARD_VISUAL=FROZEN`
- `DIVIDENDS_VISUAL=FROZEN`
- `SIDEBAR_VISUAL=FROZEN`
- Frozen references: `Refs/visual-canon/dashboard-canonical.png` and
  `Refs/visual-canon/dividendos-canonical.png`.
- The frozen Dashboard contract preserves the five-KPI executive row,
  patrimonio evolution, class composition, compact passive income, simultaneous
  highs/lows, PM/current/variation/result and approved responsive density.
- The frozen Dividendos contract preserves five semantic KPIs, monthly history,
  multi-year income chart, compact top-assets ranking, annual total donut and
  approved tooltip/mobile behavior.
- The frozen Sidebar contract preserves the dark shell, green active state,
  desktop navigation hierarchy, Reports grouping and mobile bottom navigation.
- Future visual changes to these areas require explicit user authorization.

## 2026-09-03 - Canonical visual migration 02: Ativos

- `CANONICAL_VISUAL_MIGRATION_02=COMPLETE`
- `ATIVOS_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- `ATIVOS_VISUAL=FROZEN`
- Ativos now keeps the professional positions table open by default, with
  individual result, rentabilidade and portfolio weight visible from the
  official analysis rows.
- Variable-asset result display uses the existing current-minus-applied
  values already exposed by the product; fixed-income rows preserve the
  official RF helpers and actions.
- The RF desktop table is responsively contained at the notebook breakpoint;
  its financial columns remain visible and the action family stays inside
  the table bounds.
- No financial engine, dataset, persistence, schema, handler or protected
  modern frontend area changed. Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-02/`.
- `ATIVOS_PERFORMANCE_FILTER=IMPLEMENTED`
- `ATIVOS_PERFORMANCE_FILTER_CLASSIFICATION=OFFICIAL_RESULT_SIGN`
- `ATIVOS_PERFORMANCE_FILTER=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `INCOMPLETE_DATA_NOT_NEUTRAL=true`
- `FILTER_COMBINATION_SUPPORTED=true`
- `FILTER_COUNT_SUPPORTED=true`
- `CLEAR_FILTERS_SUPPORTED=true`
- O filtro combina busca, classe e ordenacao sem alterar a fonte oficial de
  resultado; dados incompletos permanecem fora de Positivos, Negativos e
  Neutros, sem serem convertidos em zero.
- O estado vazio usa a mensagem explicita `Nenhum ativo corresponde aos
  filtros.` e Limpar filtros restaura busca, classe, revisao e performance.
- Evidencia local desta melhoria: `qa-screenshots/product-usability-01/`.

## 2026-09-03 - Canonical visual migration 03: Renda Fixa

- `RENDA_FIXA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- The dedicated `renda-fixa` view now exposes applied value, current value,
  result, rentability and maturity in its compact position rows.
- Incomplete current values remain explicitly marked for update and never
  display a fabricated result.
- The position list uses the existing official RF snapshot rows; no financial
  formula, event ledger, persistence path, schema, handler or protected screen
  changed. Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-03/`.
- The screen is not frozen until explicit user approval.

## 2026-09-03 - Fixed income visual freeze

- `RENDA_FIXA_VISUAL=FROZEN`
- `RF_SOURCE_OF_TRUTH=rfIntelligenceSnapshot()`
- `RF_APPLIED_SOURCE=rfValues().applied`
- `RF_CURRENT_SOURCE=rfValues().current`
- `RF_RESULT_SOURCE=rfValues().profit`
- `RF_RETURN_SOURCE=rfIntelligenceSnapshot().pct`
- `RF_MATURITY_SOURCE=assetRfMaturityDate()`
- The approved dedicated RF contract preserves explicit values, identity,
  review/editor flows, official helpers and collapsed secondary sections.
- `RF_SECONDARY_SECTIONS_DENSITY=ACCEPTED_COLLAPSED_STRUCTURE`

## 2026-09-03 - Canonical visual migration 04: Aportes

- `APORTES_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Aportes recebeu um refinamento visual escopado: hierarquia do cabeçalho,
  resumo 2x2 responsivo, estados ativos das abas/filtros, densidade das
  superfícies e proteção de valores financeiros completos.
- As fontes oficiais de movimentações, handlers, identidade de ativo,
  duplicação permitida e persistência foram preservados.
- Dashboard, Dividendos, Ativos, Renda Fixa e Sidebar não foram alterados por
  esta migração. A tela Aportes ainda não está congelada.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-04/`.

## 2026-09-03 - Aportes visual freeze

- `APORTES_VISUAL=FROZEN`
- The approved Aportes contract preserves the compact dark canonical shell,
  responsive KPI grid, monthly contribution rhythm, search, existing tabs and
  actions, class distribution, latest contributions and mobile bottom navigation.
- Official movement/contribution sources, create/edit/delete behavior, identity
  validation, wrong-record protection and the restricted duplicate-contribution
  contract remain unchanged.
- Critical financial values remain protected from ellipsis and the page has no
  horizontal overflow at the approved mobile and desktop viewports.
- `STALE_HARNESS_SELECTOR=.dashboard-master-primary`
- `STALE_HARNESS_DEBT=NON_BLOCKING_TEST_HARNESS_DEBT`
- Dashboard, Dividendos, Ativos, Renda Fixa and Sidebar remain frozen.

## 2026-09-03 - Canonical visual migration 05: Rentabilidade

- `RENTABILIDADE_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Rentabilidade recebeu um refinamento visual escopado: título simples,
  hierarquia compacta de performance e cores semânticas para carteira e
  benchmark.
- O renderer continua usando `rentabilityHistory(...)`, `assetRentabPct(...)`
  e o benchmark interno existente; períodos, tooltips e fontes oficiais foram
  preservados.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes e Sidebar não foram
  alterados por esta migração. A tela Rentabilidade ainda não está congelada.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-05/`.

## 2026-09-03 - Rentabilidade visual freeze

- `RENTABILIDADE_VISUAL=FROZEN`
- The approved contract preserves the compact dark shell, canonical KPI cards,
  comparative performance chart, green portfolio series, blue benchmark series,
  official period controls, exact-value tooltips and responsive mobile layout.
- `RETURN_SOURCE=rentabilityHistory()`
- `PERIOD_SOURCE=S.rentPeriod`
- `BENCHMARK_SOURCE=RENT_BENCH / rentBenchSeries()`
- `ASSET_RETURN_SOURCE=assetRentabPct()`
- No parallel return formula, invented metric, fabricated benchmark data,
  Finance Core, persistence or schema change was introduced.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes and Sidebar remain frozen.

## 2026-09-03 - Canonical visual migration 06: Rebalancear

- `REBALANCEAR_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Rebalancear recebeu refinamento visual escopado: hero mais compacto,
  controles com largura estável, CTA de simulação sem roxo legado, leitura
  rápida discreta e valores tabulares protegidos.
- O fluxo continua read-only e usa `rebalanceContributionDistribution(...)`,
  `allocationGoalItems()` e `allocationActualByType()` como fontes oficiais.
- Simulações, sugestões e cenários não persistem operações nem alteram a
  carteira. Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade e
  Sidebar não foram alterados por esta migração.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-06/`.

## 2026-09-03 - Rebalancear visual freeze

- `REBALANCEAR_VISUAL=FROZEN`
- `REBALANCE_READ_ONLY=true`
- `REBALANCE_ENGINE=rebalanceContributionDistribution()`
- `TARGET_ALLOCATION_SOURCE=allocationGoalItems()`
- `CURRENT_ALLOCATION_SOURCE=allocationActualByType()`
- `SUGGESTION_SOURCE=rebalanceAssetSuggestions()`
- O contrato congelado mantém hero de simulacao compacto, CTA primario verde,
  comparacao Atual vs ideal, leitura rapida discreta, aviso analitico e layout
  responsivo sem overflow horizontal.
- A tela nao compra, vende, cria movimentos, altera carteira, altera metas ou
  persiste operacoes durante simulacoes.
- `FILTERS_WORK=NOT_IMPLEMENTED`; `SORTING_WORKS=ENGINE_DETERMINISTIC`;
  `DETAIL_EXPANSION_WORKS=PASS`; `MODE_SWITCH_WORKS=PASS`.
- A linguagem aprovada e analitica: Aporte sugerido, Prioridade, Desvio e
  Atual vs ideal. Termos transacionais nao foram introduzidos.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade e Sidebar
  permanecem congelados e sem alteracoes nesta fase.

## 2026-09-03 - Canonical visual migration 07: Metas

- `METAS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Metas recebeu refinamento visual escopado: KPIs compactos, resumo de metas
  mais denso, progresso com leitura semantica e layout responsivo para desktop,
  tablet e mobile.
- A cadeia oficial permanece `S.goals` -> `financialGoalsSnapshot()` /
  `getGoalsSnapshot()` -> `createHostGoalsReadonlySource` -> adapter/runtime
  readonly. Nenhum estado paralelo, formula nova ou dado fake foi criado.
- Os fluxos existentes de edicao, remocao, configuracao de alocacao e ponte
  readonly foram preservados. Valores indisponiveis continuam explicitos.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear e Sidebar nao foram alterados por esta migracao.
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-07/`.

## 2026-09-03 - Metas visual freeze

- `METAS_VISUAL=FROZEN`
- O contrato aprovado mantém shell premium escuro, cabecalho compacto, quatro
  KPIs no desktop, grade responsiva em duas colunas no mobile, faixas de status
  de Patrimonio e Renda Passiva, progresso oficial e distribuicao da carteira.
- `GOALS_SOURCE_OF_TRUTH=S.goals`
- `GOALS_SNAPSHOT_SOURCE=financialGoalsSnapshot() / getGoalsSnapshot()`
- `MODERN_GOALS_BRIDGE=createHostGoalsReadonlySource()`
- Nao ha estado paralelo, dados fake ou formulas paralelas. Handlers oficiais de
  edicao/remocao e a ponte moderna readonly permanecem preservados.
- `METAS_FOCUSED_HARNESS_DEBT=phase-206-financial-goals missing rentabilityHistory in isolated harness`
- O debito acima e `NON_BLOCKING_TEST_HARNESS_DEBT`; nao e evidencia de regressao
  de Metas e nao foi mascarado.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear e Sidebar permanecem congelados.

## 2026-09-03 - Canonical visual migration 08: Relatorios

- `RELATORIOS_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- Relatorios recebeu refinamento visual escopado: hierarquia analitica mais
  clara, densidade compacta para desktop/mobile e CTA de exportacao explicito.
- `REPORTS_ROUTE=relatorios`; `REPORTS_RENDERER=reportsTab()`;
  `REPORT_DATA_SOURCE=reportsSnapshot()`.
- `ANALYTICAL_REPORT != BACKUP`: exportacoes analiticas continuam usando os
  exporters baseados em `reportsSnapshot()`, enquanto backup/importacao seguem
  no fluxo separado de `backupManagerModal()` e `backupPayload()`.
- Nenhum tipo de relatorio, calculo financeiro, persistencia, schema ou dado
  real foi alterado. O smoke legado que esperava "Resumo da valuation" foi
  alinhado ao texto atual "Resumo da avaliacao oficial".
- Browser evidence is stored under
  `qa-screenshots/canonical-visual-migration-08/`.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear, Metas e Sidebar permanecem congelados.

## 2026-09-04 - Product safety review 02: Configuracoes visual

- `CONFIGURACOES_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
- A hierarquia visual separa a Zona de risco do Ambiente de teste local;
  a fixture em memoria nao e uma operacao destrutiva sobre dados reais.
- A exportacao de backup identifica explicitamente uma copia restauravel e
  permanece distinta de relatorio analitico, importacao e restore.
- Backup, importacao, restore, reset, autenticacao, sincronizacao, Finance
  Core, persistencia, schema e dados reais nao foram alterados nesta fase.

## 2026-09-04 - Safety hardening 01

- `RESET_PORTFOLIO_RF_CLEANUP=FROZEN_SAFETY_CONTRACT`: `resetPortfolio()` limpa
  `S.rfEvents` e os estados transitorios de editor/review de Renda Fixa sem
  ampliar o reset para dados globais ou de conta.
- `BACKUP_STRUCTURAL_VALIDATION=FROZEN_SAFETY_CONTRACT` e
  `BACKUP_VERSION_VALIDATION=FROZEN_SAFETY_CONTRACT`: `parseBackupRaw()` rejeita
  envelopes, tipos e versoes incompatíveis antes da confirmação, preservando
  compatibilidade legada reconhecida.
- `PERSISTENCE_TESTS=32/32`: o baseline subiu de 31 para 32 pela cobertura de
  reset RF, versões incompatíveis e estruturas de backup malformadas.
- Configurações não recebeu alteração visual; preview, confirmação,
  `PersistenceCore.applyStorageTransaction()` e rollback permanecem ativos.

## 2026-09-04 - Auditoria secondary surface refinement

- `AUDITORIA_CANONICAL_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`.
- A rota `auditoria` passou a consumir o renderer de qualidade de dados, com
  resumo de severidade, priorizacao, filtros progressivos, estado limpo e
  acoes contextuais seguras.
- Os niveis de acao continuam distinguindo `exact`, `context`, `general` e
  `info`; a revalidacao de identidade e a protecao contra registro incorreto
  permanecem no resolvedor oficial.
- Nenhum reparo automatico, mutacao em lote, formula financeira, persistencia,
  schema ou dado real foi alterado.

## 2026-09-04 - Auditoria visual freeze

- `AUDITORIA_VISUAL=FROZEN` e `AUDITORIA_ACTION_SAFETY=FROZEN`.
- `AUDIT_ROUTE=auditoria`, `AUDIT_RENDERER=dataQualityTab()` e
  `AUDIT_DATA_SOURCE=dataQualitySnapshot()` permanecem canonicos; `dataAuditTab()`
  e mantido como alias de compatibilidade.
- O contrato congela niveis `EXACT`, `CONTEXT`, `GENERAL` e `INFO`, com
  revalidacao de identidade, protecao contra registro incorreto e fallback
  seguro. Nao existe reparo automatico ou mutacao em lote.
- A proxima frente e `PRODUCT_SAFETY_REVIEW_01_CONFIGURACOES`, inicialmente
  review-first para Configuracoes, Backup, Importacao, Restore, Conta/Nuvem e
  Zona de perigo.

## 2026-09-04 - Secondary surface refinement 01: IRPF

- `SECONDARY_SURFACE_REFINEMENT_01_IRPF=IMPLEMENTED`
- A tela IRPF mantém o caráter de relatório auxiliar e a separação entre
  conferência fiscal, exportações e backup/importação.
- A melhoria foi restrita à legibilidade: valores críticos não usam ellipsis
  nos cards ou linhas móveis, preservando fonte, cálculos, ano-base, exports e
  fluxos protegidos.
- Smoke focado e browser QA em 390, 430, 768, 1366 e 1920 passaram sem
  overflow, erros de console, page errors ou request failures.
- Finance Core, persistência, schema e dados reais permaneceram inalterados.

## 2026-09-04 - IRPF visual freeze

- `SECONDARY_SURFACE_REFINEMENT_01_IRPF=COMPLETE`
- `IRPF_VISUAL=FROZEN`
- `IRPF_ROUTE=irpf`; `IRPF_RENDERER=irpfTabPremium()`;
  `IRPF_DATA_SOURCE=irpfBuildYearReport()`.
- O contrato aprovado mantém relatório auxiliar, seletor de ano-base, CSV,
  PDF, cards de resumo, seções fiscais recolhíveis e layout móvel sem
  ellipsis financeiro ou overflow horizontal.
- `backupManagerModal()` e `backupPayload()` continuam separados do relatório
  fiscal. Nenhum engine fiscal, persistência, schema ou dado real foi alterado.

## 2026-09-04 - Product usability improvements 02

- `GLOBAL_SEARCH_REFINEMENT=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `CONTEXTUAL_NAVIGATION=FROZEN_FUNCTIONAL_IMPROVEMENT`
- `ANALYSIS_SEARCHABLE=true`; `SEARCH_READ_ONLY=true`.
- A busca global preserva `portfolioSearchOpen()` e os atalhos de teclado,
  agrupa Análise em Navegação, exibe contagem/no-match explícito e não expõe
  ações destrutivas.
- Análise mantém links contextuais secundários para Ativos, Rentabilidade e
  Rebalancear, sem alterar a identidade visual congelada.
- A busca global permanece somente leitura e agora apresenta Análise como
  destino no grupo Navegação, com aliases de análise, concentração, exposição
  e desempenho, contador de resultados e estado explícito de no-match.
- A Análise ganhou apenas links contextuais secundários para Ativos,
  Rentabilidade e Rebalancear. Nenhum cálculo, persistência, schema ou tela
  congelada foi redesenhado.
- Evidência local: `qa-screenshots/product-usability-02/`.

## 2026-09-04 - Analysis and navigation freeze

- `ANALYSIS_VISUAL=FROZEN`
- `NAVIGATION_ARCHITECTURE=FROZEN`
- `ANALYSIS_ROUTE=analise`; `ANALYSIS_DATA_SOURCE=assetAnalysisRows()`;
  `CONCENTRATION_RULE_SOURCE=assetConcentrationAlert()`.
- A Análise permanece uma área analítica dedicada, sem recomendação automática,
  sem segundo motor e com estados vazios explícitos.
- Renda Fixa e Análise não são subabas de Ativos. A entrada dedicada de Renda
  Fixa, o resumo RF em Todos os ativos e o menu mobile compacto permanecem.
- Backlog preservado: filtro de performance em Ativos (P1), links contextuais e
  revisão de segurança de Configurações/backup/importação (P2), consistência de
  ícones e estados vazios restantes (P3).

## 2026-09-04 - Análise como destino próprio

- `PRODUCT_IMPROVEMENT_MODE=ACTIVE`
- `ANALYSIS_SIDEBAR_DECISION=DEDICATED_ROUTE_REUSING_OFFICIAL_RENDERER`
- `ANALYSIS_ROUTE=analise`
- `ANALYSIS_RENDERER=assetAnalysisBlock`
- `ANALYSIS_DATA_SOURCE=assetAnalysisRows`
- O atalho enganoso `Fundos` foi removido da navegação principal; o renderer
  continua preservado e acessível pela rota dedicada.
- `MOBILE_ANALYSIS_ACCESS=Mais`
- `FUNDS_LABEL_DECISION=RENAME_TO_ANALISE`

## 2026-09-04 - Product UX and navigation review

- `RF_NAVIGATION_DECISION=REMOVE_RF_FROM_ATIVOS`: o atalho `Renda Fixa` das
  subabas de Ativos foi removido porque reproduzia integralmente o renderer
  oficial `rendaFixaTab()` e a mesma fila de revisao, vencimentos, posicoes,
  resultados, rentabilidade e acoes.
- A entrada `Renda Fixa` da sidebar permanece acessivel e agora navega
  diretamente com `go('renda-fixa')`. O grupo de resumo de Renda Fixa dentro de
  `Todos os ativos` permanece, pois oferece leitura consolidada por classe e
  nao duplica a tela dedicada.
- Nenhuma capacidade de RF foi perdida: edicao, review queue, vencimento,
  emissor/indexador, resultado, rentabilidade, historico e acoes continuam no
  renderer oficial. `RF_UNIQUE_FEATURE_LOSS_RISK=LOW`.
- A alteracao e uma correcao minima de arquitetura de navegacao; a identidade
  visual, tabela principal, filtros e layout congelado de Ativos permanecem
  intactos.
- O teste de touch targets foi alinhado para entrar pela rota oficial, sem
  reintroduzir o seletor removido.
- Recomendações futuras: concluir a aprovacao da subsuperficie Fundos/Analise;
  depois auditar Configuracoes com revisao de seguranca para backup/importacao;
  por fim revisar a nomenclatura `Fundos` versus `Analise` na sidebar sem
  misturar essa decisao com telas congeladas.

## 2026-09-04 - Fundos / Analise subsurface refinement

- `FUNDOS_ANALISE_IMPLEMENTATION=READY_FOR_FINAL_USER_APPROVAL`
- A subsuperficie `ativos` com `assetsInnerTab=analise` recebeu apenas ajuste
  de densidade e legibilidade: paineis nao esticam por conteudo vazio, o acento
  visual segue a semantica verde e valores analiticos nao sofrem ellipsis em
  mobile.
- A analise continua derivando de `assetAnalysisRows()` e dos helpers oficiais;
  nenhuma fonte financeira, formula, persistencia, schema ou dado real foi
  alterado.
- `ATIVOS_MAIN_CHANGED=false`; a tabela principal, filtros, cards de categoria,
  RF-inside-Ativos e o layout congelado permanecem intactos.
- Browser evidence is stored under `qa-screenshots/fundos-analise/`.

## 2026-09-03 - Relatorios visual freeze

- `RELATORIOS_VISUAL=FROZEN`
- O contrato aprovado mantém shell premium escuro, cabecalho compacto,
  seletor de periodo, CTA analitico de exportacao, cinco KPIs financeiros,
  evolucao patrimonial, distribuicao, movimentacoes, renda/proventos, renda
  fixa, qualidade dos dados, historico e exportacoes explicitas.
- `REPORT_DATA_SOURCE=reportsSnapshot()` e os tipos oficiais permanecem
  `complete`, `assets`, `proventos`, `fixed`, `patrimony`, `audit` e `irpf`.
- `ANALYTICAL_REPORT_BACKUP_SEPARATION=REQUIRED`: relatorio analitico,
  exportacao de dados, backup e importacao continuam conceitos e fluxos
  distintos. `backupManagerModal()` e `backupPayload()` permanecem preservados.
- `STALE_REPORTS_HARNESS_FIX=VALID_STALE_HARNESS_FIX`: o smoke foi alinhado
  de "Resumo da valuation" para "Resumo da avaliacao oficial" sem reverter a
  terminologia atual do produto.
- Dashboard, Dividendos, Ativos, Renda Fixa, Aportes, Rentabilidade,
  Rebalancear, Metas e Sidebar permanecem congelados.

## 2026-09-04 - Product usability improvements 02 follow-up

- `GLOBAL_SEARCH_REFINEMENT=READY_FOR_FINAL_USER_APPROVAL`.
- A busca global permanece somente navegacional: resultados de ativos,
  movimentacoes e proventos levam as suas areas oficiais sem abrir editores ou
  expor acoes destrutivas diretamente na busca.
- `CONTEXTUAL_NAVIGATION=READY_FOR_FINAL_USER_APPROVAL`; os tres links de
  contexto da Analise permanecem limitados a Ativos, Rentabilidade e
  Rebalancear.
- O filtro de busca continua usando `portfolioSearchBuildEntries()` e as
  fontes oficiais existentes, sem formula, persistencia, schema ou dado real
  novo.


## 2026-09-04 - Auditoria safety freeze

AUDIT_SAFETY_REVIEW=FROZEN.
Auditoria permanece na rota auditoria, renderizada por dataQualityTab() e alimentada por dataQualitySnapshot(). Os cartoes exibem referencia de identidade derivada do registro oficial, com tipo, contexto disponivel e ID quando presente, sem metadados ficticios.

AUDIT_IDENTITY_CONTRACT=entityId + identityKey e AUDIT_WRONG_RECORD_PROTECTION=enabled: a acao so abre o editor quando ID e chave conferem com o estado atual; remocao, reordenacao, duplicidade ambigua ou registro stale recuam para a rota geral.
Os niveis EXACT, CONTEXT, GENERAL e INFO permanecem distintos. A Auditoria nao executa correcoes automaticamente e nao altera Finance Core, persistencia, schema ou dados reais.
## 2026-09-04 - IRPF functional freeze

- `IRPF_FUNCTIONAL_REVIEW=FROZEN`
- `IRPF_MOBILE_PATTERN=FROZEN`; quantidade, PM, custo e valor de referência
  permanecem acessíveis quando oficiais.
- `IRPF_TAX_LOGIC_CHANGED=false`; `VALID_ZERO_PRESERVED=true`;
  `MISSING_DATA_EXPLICIT=true`.
- `IRPF_GROUPING_SOURCE=irpfTaxBucket() / irpfProventoCategory()`;
  `IRPF_TOTALS_SOURCE=report.totals / irpfSummaryMetrics()`;
  `IRPF_EXPORT_SOURCE=irpfExportCSV() / irpfExportPdf()`;
  `IRPF_REFERENCE_PERIOD=S.irpfYear`.
- IRPF permanece relatório auxiliar, somente leitura e não constitui declaração
  automática. RF mantém `rfIntelligenceSnapshot()` e ativos variáveis não usam
  helper de RF.
- `NEXT_RECOMMENDED_ACTION=RELEASE_CONSOLIDATION`.

## 2026-09-04 - Product usability release consolidation

- `PRODUCT_USABILITY_RELEASE=READY_FOR_PR`.
- Escopo consolidado: Análise dedicada, simplificação da navegação de Renda
  Fixa, filtro de performance em Ativos, busca global somente leitura, links
  contextuais, proteção de identidade da Auditoria e refinamento mobile do
  relatório IRPF.
- Finance Core, semântica de persistência, schema, backup/importação,
  autenticação, sincronização em nuvem e dados reais permanecem inalterados.
- `NEXT_RECOMMENDED_ACTION=SETTINGS_SAFETY_REVIEW`; não iniciar Configurações
  nesta consolidação.
## 2026-09-04 - Dashboard visual freeze

- `DASHBOARD_VISUAL=FROZEN`.
- `DASHBOARD_REFERENCE_LOCK=FROZEN` e `DASHBOARD_CHART_INTERACTION=FROZEN`.
- `DASHBOARD_PRIMARY_CANON=Refs/visual-canon/dashboard-canonical.png`.
  `Tela Principal.png` permanece referencia secundaria de acabamento e nao
  altera a arquitetura executiva do Dashboard.
- A aprovacao usou comparacao explicita com o canon primario: media final
  90.25, sem dimensao abaixo de 86.
- `VISUAL_REFERENCE_LOCK_PROCESS=ACTIVE`: testes e builds validam o produto,
  mas nao substituem comparacao visual e aprovacao explicita.

## ATIVOS VISUAL REFERENCE LOCK

- `ATIVOS_REFERENCE_LOCK=READY_FOR_FINAL_USER_APPROVAL`.
- A referencia desta rodada e `Refs/visual-canon/Tela de aportes e ativos.png`,
  usada somente para a porcao de Ativos; os modulos de Aportes nao foram copiados.
- O ajuste ficou restrito ao shell de Ativos: hierarquia das acoes, densidade dos
  resumos de categoria, quebra segura de titulos RF e glyphs SVG locais.
- Busca, filtros, ordenacao, expansao, rotas dedicadas e fontes financeiras
  oficiais permanecem preservados. Nao marcar `ATIVOS_VISUAL=FROZEN` nesta rodada.

## 2026-09-04 - Ativos final reference polish

- `ATIVOS_FINAL_REFERENCE_POLISH=READY_FOR_FINAL_USER_APPROVAL`.
- A tabela de posicoes foi promovida para o conteudo primario: os resumos por
  classe agora sao compactos e a tabela aparece cedo em desktop.
- `ATIVOS_ALLOCATION_SOURCE=allocationActualByType()`: o modulo visual de
  alocacao somente apresenta o snapshot oficial e nao cria formula paralela.
- Os icones SVG das categorias ficaram visiveis nos cinco breakpoints. Fontes
  financeiras, filtros, ordenacao, expansao, RF dedicado e dados reais foram
  preservados. Nao marcar `ATIVOS_VISUAL=FROZEN` antes da aprovacao explicita.

## 2026-09-04 - Ativos reference lock freeze

- `ATIVOS_VISUAL=FROZEN` e `ATIVOS_REFERENCE_LOCK=FROZEN` apos aprovacao visual
  explicita do usuario.
- `ATIVOS_PRIMARY_CONTENT=FROZEN`, `ATIVOS_DENSITY=FROZEN` e
  `ATIVOS_ICON_LANGUAGE=FROZEN`.
- `ALLOCATION_SOURCE=allocationActualByType()` e `ALLOCATION_PANEL=FROZEN`;
  a tabela de posicoes permanece primaria no desktop e os cards de categoria
  permanecem secundarios. RF continua com rota dedicada e resumo oficial em
  Todos os ativos.
- `NEXT_VISUAL_TARGET=APORTES`; nao reabrir Ativos sem autorizacao explicita.

## 2026-09-05 - Ativos canonical rich contract lock

- `ATIVOS_VISUAL=FROZEN`.
- `ATIVOS_INFORMATION_CONTRACT=FROZEN`.
- `ATIVOS_ACTION_CONTRACT=FROZEN`.
- `ATIVOS_RF_OVERVIEW_CONTRACT=FROZEN`.
- A referencia historica aprovada esta persistida em
  `Refs/visual-canon/ativos-rich-canonical.png`, com hash registrado em
  `docs/ai/VISUAL_REFERENCE_INDEX.md`.
- A tabela desktop rica preserva as quinze informacoes/acoes aprovadas e a
  experiencia mobile preserva os mesmos dados por cards progressivos.
- Os bloqueios de regressao existentes cobrem categorias agrupadas,
  recolhimento padrao, campos ricos, acoes, RF, CTA de rebalanceamento e
  sintaxe inline. As areas protegidas permanecem inalteradas.

## 2026-09-06 - Phase 4H real pilot preparation

- `REAL_PILOT_SOURCE=B3_DIVIDENDS_XLSX`; first pilot is limited to one
  calendar month selected after real export evidence is reviewed.
- `REAL_PILOT_WRITE_ENABLED=false`, `REAL_USER_DATA_WRITE=false` and
  `CAN_EXECUTE_REAL_PILOT_WRITE=false` remain hard-disabled. No live file,
  real user data or persistent write was used.
- The read-only contract covers exact identity, manual verification, explicit
  supported income types, corporate-event blocking, targeted snapshot/backup,
  same-file reimport and rollback proof. Position and average price impact are
  required to remain zero.
- Implementation is isolated in `real-pilot-contract.js`; tests use only
  sanitized fixtures and existing import/classification engines.

## 2026-09-07 - Phase 4H targeted recovery runtime stabilization

- The V5 real targeted Yahoo recovery authorization was correctly blocked before
  snapshot/mutation because the protected session could bind before the first
  cloud snapshot had been applied. The surface displayed the pre-cloud
  fingerprint while the executor preflight observed the post-`applyCloudData`
  state.
- The protected session now binds only after `FB.cloudLoaded=true` and guards
  against duplicate binding. The internal surface also performs a read-only
  preflight parity check across live, donor, plan and review fingerprints before
  enabling its control.
- Static server requirement for legacy `index.html` is
  `python.exe -m http.server 4173 --bind 127.0.0.1`; Vite is not valid evidence
  for this runtime. The 12-callback protected recovery contract remains
  fail-closed and all runtime lifecycle checks are green.
- Current read-only manifest remains: live `0a3d0c56...aebaabe47`, donor
  `71b21a08...15b22c4a7`, recovery plan `690138e1...d41cc4a5`, review
  `c3ab3a17...05df9da4`; plan `99/99/0`, expected post-recovery ledger
  `428/329/99`, financial increment `0`, and 21 post-recovery links.
- No real recovery or August pilot was executed. A new single-use recovery
  authorization is required; the previous V5 authorization is not reusable.

## 2026-09-07 - Phase 4H click-time fingerprint parity

- `RECOVERY_LIVE_STATE_MISMATCH_ROOT_CAUSE=CANONICAL_REPRESENTATION_MISMATCH`:
  readiness hashed the protected canonical state while the recovery plan
  provider hashed the broader stored-state representation and used separate
  plan/review serializations.
- Surface, plan provider and executor preflight now share the canonical live
  state provider and one click-time prepared preflight. The executor rechecks
  that same live fingerprint without rebuilding the asynchronous plan.
- The internal localhost-only surface supports an explicit
  `internalRecoveryDryRun=1` validation path that reaches the real prewrite
  gates but skips snapshot, mutation, save and sync. No real recovery or
  August pilot was executed.
- Static legacy runtime evidence remains authoritative only from
  `python.exe -m http.server 4173 --bind 127.0.0.1`; Vite is not valid for
  this lifecycle. Donor bytes remain `71b21a08...15b22c4a7`, with 428/329/99.

## 2026-09-07 - Permanent Phase 4H QA harness

- Reusable tooling lives in `tools/qa/` and the `qa:*` npm scripts. It uses a
  dedicated ignored browser profile and localhost-only CDP; cookies, tokens
  and credentials are never copied or logged.
- `qa:smoke` covers the unauthenticated legacy browser at 390, 430, 768, 1366,
  1440, 1536 and 1920px. Protected browser proof remains local-only and needs
  normal authentication in the dedicated profile.
- `qa:auth-smoke` exercises the protected native-click dry-run and stops before
  snapshot, mutation, save and sync. It is not a recovery authorization.
- CI runs the harness contract and unauthenticated smoke using synthetic/local
  state only. No real portfolio, backup or authenticated account is used in CI.

## 2026-09-07 - Phase 4H native browser proof

- Chrome for Testing foi rejeitado pelo Google como navegador inseguro para
  login; a solução usa Chrome estável, perfil QA fora do projeto e CDP local.
- Chrome QA autenticado foi validado em `127.0.0.1:9232` com perfil
  `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-profile-chrome`.
- Playwright native dry-run alcançou surface, plan provider, executor
  preflight e authorization validator em três execuções idênticas; snapshot,
  mutação, save e sync permaneceram falsos.
- Fingerprint vivo fresco: `2ca97731ed9b06fbf4d0930f38d89cb2118c8f5823d8d1a68d3e3ea2058db5f6`;
  donor `71b21a08f2bb1db2615dd838f06e5ccd124ef2f726a26e087e6e20215b22c4a7`;
  plano `690138e1f973e8a600907e0f7d87b2897fa352eb608b63d1725ca971d41cc4a5`;
  review `c3ab3a17db2c4e4d6c3a34474a65843e32c6b6e6add2698ce0efff0a05df9da4`.
- Estado vivo: 329/329/0; recovery previsto: 99/99/0; incremento
  financeiro: zero. Nenhuma recuperação real ou piloto de agosto foi executado.

## 2026-09-07 - Phase 4H recovery persistence serialization fix

- A autorização V6 foi consumida porque o executor entrou no caminho de
  mutação/local-save. O read-back falhou com `"[object Object]" is not valid
  JSON`; o rollback direcionado restaurou o estado `329/329/0` e nenhum sync
  cloud foi liberado.
- Causa raiz: `safeGetLocalStorageItem()` devolve `{ok, value}`, mas o callback
  protegido passava o envelope inteiro a `PersistenceCore.parseStoredState()`,
  cujo contrato exige `string|null`.
- O contrato corrigido é fail-closed: storage retorna envelope;
  `ProtectedRecoveryPersistenceContract` valida o envelope e entrega somente
  `value` ao parser; `PersistenceCore` continua sendo o único dono da
  desserialização canônica.
- Commit funcional: `5a19fbd24aa3bb5f6379d605ad19933fad579a63`.
  Testes sintéticos cobrem roundtrip, forward/rollback, tipos inválidos e sync
  bloqueado. O navegador autenticado executou três ciclos de clique dry-run +
  read-back oficial sem escrita real e sem nova ocorrência de `[object Object]`.
- Recovery real continua pendente. Nunca reutilizar a autorização V6; qualquer
  execução que alcance mutação consome sua autorização mesmo quando rollback
  restaura o estado.

## 2026-09-08 - Phase 4H forensic 430 baseline

- A leitura autenticada confirmou `430/329/101` em runtime, local e cloud.
  Não houve escrita nesta perícia; o restore autorizado foi cancelado antes
  do snapshot por divergência do manifesto `329/329/0`.
- Os 101 registros têm `eventType=Yahoo`, mas não têm `source`,
  `sourceEventKind` ou `excludedFromIncomeTotals`. O contador anterior usava
  apenas metadados de source e reportava Yahoo zero; os classificadores agora
  consideram também `eventType`/`incomeType` genericamente.
- Identidades sanitizadas contra o donor: 95 presentes, 4 ausentes e 6
  extras, sem duplicatas exatas. A reconciliação atual é `24/20/1/2`, com 20
  links e 1 review.
- Cold boot preservou as mesmas 101 identidades. Os 4 ausentes e 6 extras
  precisam de revisão de origem antes de qualquer restore ou cleanup real.
- Recovery Yahoo e piloto de agosto permanecem sem execução.

## 2026-09-08 - Phase 4H targeted correction forensic manifest

- Estado atual autoritativo autenticado: runtime/local/cloud `430/329/101`.
  Os 101 sao Yahoo-like por `eventType=Yahoo`; 99 sao referencias esperadas
  e dois sao eventos financeiros pos-donor de 08/09/2026.
- Donor: `local-imports/carteira-investimentos-backup-2026-09-07-10-18.json`,
  `428/329/99`, fingerprint
  `71b21a08f2bb1db2615dd838f06e5ccd124ef2f726a26e087e6e20215b22c4a7`.
  Comparacao: 95 identidades exatas, quatro variantes KNUQ11 por valor e dois
  extras pos-donor: FATN11 `12480` cents e DIVD11 `3513` cents.
- Os seis extras carregam nota/autoKey do caminho Auto Yahoo e estao presentes
  em runtime, local e cloud. A proveniencia temporal exata e
  `STRONGLY_SUPPORTED`, nao `PROVEN`.
- Marcadores de referencia sao necessarios para 99 registros, nao para os dois
  extras financeiros. Plano sintetico: `4 REPLACE + 95 RECLASSIFY`, alvo
  `430/329/101`, 99 referencias, delta `-1017188` cents, posicao/PM/ativos/RF
  inalterados. O snapshot histórico registrou links `21/0/0` e agosto
  `24/21/1/2`; V39 classificou essa contagem como sintética. O contrato atual é
  `24/20/1/2/1 deferred`, sem vínculo artificial para KNUQ11.
- Fingerprints do planejador: `754201a8e0da5fbf2d7e0021770e653acb9cf811a90dd9b59ec03542ff6ea407`
  e review `3167552ee63e76f35708525f13ad9f496182edc4db79cc9ed03c06276e41eb6f`.
  `qa:phase4h:reconcile-prewrite` compara runtime/local/cloud e simula o alvo
  em memoria, sem gravar, salvar ou sincronizar.

## 2026-09-08 - Phase 4H official Class C executor

- O executor oficial Class C foi implementado localmente e permanece sem
  execucao real. Ele aceita somente `TARGETED_CLASS_C_RECONCILIATION` com 4
  REPLACE, 95 RECLASSIFY e 2 KEEP.
- Os 12 callbacks atravessam a fabrica oficial, com snapshot/rollback
  direcionados, persistencia canonica, readback, invariantes, reconciliacao,
  idempotencia e gates de sync/reload. O prewrite autenticado passou 3/3 de
  forma identica e sem mutacao; ainda exige nova autorizacao single-use.

- A primeira tentativa autorizada de Class C foi cancelada antes do snapshot,
  sem consumo de autorização, porque o callback oficial referenciava
  `classCEventId` sem declarar o helper. O helper agora é o alias explícito do
  identificador canônico de evento; a regressão do snapshot comprova 99 alvos,
  metadados de integridade e rollback sandbox. Nenhuma correção real foi executada.
## 2026-09-09 - Phase 4H additive 101-event local recovery preparation

- O estado local canônico da origem `127.0.0.1:4173` foi reconstituído somente
  por cópia forense read-only do LevelDB: `329/329/0`, sem referências e total
  financeiro de `2685096` centavos. O cloud autenticado anteriormente observado
  contém `430/329/101`, sem referências e total de `3718277` centavos.
- A divergência cloud-only comprovada é de 101 eventos Yahoo: 95 coincidem
  exatamente com a evidência donor disponível, 4 são variantes KNUQ por valor e
  2 são eventos pós-donor (FATN11 e DIVD11). Portanto não foi congelado o rótulo
  incorreto de “99 matches exatos”. A impressão donor autorizada histórica ainda
  não é reproduzível com os arquivos locais disponíveis.
- Foi criado o executor separado `TARGETED_101_YAHOO_LOCAL_RECOVERY`, aditivo e
  local-only (`queueCloud:false`), com preflight, snapshot persistente, readback,
  rollback, idempotência e 12 callbacks verificáveis. O executor não é Class C,
  não é o recovery antigo e não expõe escritor cloud.
- O caminho read-only está disponível em
  `npm.cmd run qa:phase4h:101-recovery-prewrite`. Ele não cria snapshot, não
  salva, não sincroniza e não consome autorização.
- Nenhuma recuperação real, rollback real, Class C, piloto de agosto ou sync foi
  executado. A prova live final permanece pendente porque o perfil QA perdeu a
  sessão autenticada (`AUTH_SESSION_VALID=false`, CDP 9233 indisponível).
