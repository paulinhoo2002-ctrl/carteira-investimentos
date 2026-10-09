# Wave D Handoff — V292 (Final, Certified)

START_HEAD=956437150fb9267949cad5f89e9480b26a7ec876
PRE_FIX_HEAD=9428fd7254008e8106774f4f99a75f88803cacba
FINAL_HEAD=9f114e73420f3c09fc02c3616e6909903326c696
WAVE_D_FINAL_FIX_COMMIT=9f114e73420f3c09fc02c3616e6909903326c696 (fix(ui): neutralize unavailable return state; staged file: index.html only)

Wave D commits (in order):
1. `2a308c29ceb84242375ec4c4d0236148a3fe659f` refactor(ui): simplify dividends hierarchy
2. `dbb49a5852602797e33625ea77b003a701018668` refactor(ui): clarify rentability context
3. `4ef38da5dd982c764966c5f535a910c81ec0370f` refactor(ui): prioritize fixed income positions
4. `c4019c2` fix(ui): keep rentability evolution primary (integration correction)
5. `9428fd7` docs(ui): record Wave D pre-review evidence
6. `9f114e73420f3c09fc02c3616e6909903326c696` fix(ui): neutralize unavailable return state (visual MAJOR fix)

## D1_DIVIDENDOS=
Calendar-led hierarchy: Calendário/Evolução/Histórico as direct modes; Recebimentos/Por ativo/Revisão under "Mais". Received income is factual primary (rows classified PAID only, via DividendIntelligence.classifyIncomeState); announced/estimated rows never appear in received cards (synthetic browser test proves QAXX3/QAYY3 exclusion); future receipts labeled "previstos" with "Anunciado/previsto não altera o total recebido"; empty future state is a message, never zero; edit/delete/history flows untouched.

## D2_RENTABILIDADE=
Result-first hierarchy: selected-period result, then period/type/reference controls, result basis, dated-reference availability, historical coverage, then chart. Unavailable history stays "Indisponível" (never 0%); fixed annual benchmark rate is explicitly not a dated series (synthetic benchmark curve suppressed unless real source+period+finite series exists); current price never backfilled as historical. VISUAL MAJOR FIX (commit 9f114e7): unavailable state previously used success-green; now conditional muted semantics — sideCards ("Rentabilidade total", "Últimos 12 meses", "Último mês") use var(--muted) when uncertified, `.rent-primary-result` border muted by default with `--available`/`--unavailable` modifier classes, helper setRentPrimarySemantic. DOM-verified post-fix both viewports: rgb(125,140,173), zero errors, no overflow. Human revalidated captures: PASS.

## D3_RENDA_FIXA=
Positions and next maturities lead; summary KPIs, trust counts, IPCA diagnostics, attention queue, distributions and analytical summaries grouped in collapsed "Resumo e confiabilidade" disclosure. Manual value remains authority ("Valor manual continua sendo a autoridade; referências shadow não alteram o patrimônio"); 105% CDI distinct from dated series; maturity dates primary; diagnostics secondary; no calculation changes.

## TECH_REVIEW=
GLM-5.3
BLOCKER=0
MAJOR=0
MINOR=4

## VISUAL_REVIEW=
initial MAJOR=1 ("Indisponível" in success-green)
MAJOR_FIXED=true (commit 9f114e7)
final BLOCKER=0
final MAJOR=0
final MINOR=1 (mobile metadata density)

## FULL_TEST=PASS 252/252 (npm.cmd test, exit 0, includes pretest modern build)
## MODERN_TEST=PASS 815/815 (npm.cmd run test:modern, exit 0)
## BUILD=PASS (npm.cmd run build — "Build OK: static app validated.")
## BUILD_MODERN=PASS (npm.cmd run build:modern — exit 0, built in 776ms)
## DIFF_CHECK=PASS (git diff --check, exit 0; cached diff check also PASS)

## FINANCIAL_SAFETY=
financial logic changed=false
persistence changed=false
Firebase changed=false
import authority changed=false
real data used=false
local-imports accessed=false

## DEFERRED=
Tech minors (all non-blocking, none in npm/CI gates):
1. Dividendos year chips visually present but inactive in overview (S.dividendYearFilter has no consumer post-D1).
2. Dead post-D1 source: canonDividendYearSummary / dividendDataQualityPanel / primaryBlocks unused.
3. dividendos-matriz-discovery smoke stale pre-Wave-D (expects .canon-div-history on default view).
4. dividendos-matriz-legibilidade has date-dependent hardcoded annual means (fails on month rollover).
Visual minor:
5. Rentabilidade mobile metadata block (Base / Referência / Cobertura) dense before Evolução; progressive disclosure for later polish pass.

## WAVE_D_COMPLETE=true
## WAVE_E_STARTED=false

Canonical visual evidence: PHOTO_PICKUP_INDEX.md (Dividendos/Renda Fixa originals; Rentabilidade post-major-fix captures).

TRANSIENT: capture-web.js was an untracked screenshot helper; deleted during the explicitly authorized final cleanup before the docs commit, never staged.

No push. No PR. No merge. No deploy.
