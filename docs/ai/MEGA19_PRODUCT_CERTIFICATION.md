SUPERPOWERS + PONYTAIL FULL + CAVEMAN

# MEGA 19 — entrega local e certificação sintética

MISSION_STATUS=COMPLETE_WITH_LIMITATIONS
PROJECT_IDENTITY_GATE=PASS
WORKTREE=C:/Projetos/carteira-investimentos.worktrees/v012-mega-12-lifetime-redesign
BRANCH=codex/legacy-product-mega-12
INITIAL_HEAD=bab2464e9cee43b40c32dbfb082bd8a246f99fef
CODE_VALIDATED_HEAD=f33ae01c81f56734d8a258fca0cfbe23748ec0fd
WORKTREE_CLEAN=YES at code checkpoint; documentation commit follows

## Entregas de produto

- Ativos monta somente a tabela desktop ou os cartões mobile, conforme o breakpoint CSS de 640px. Um listener por módulo trata apenas mudanças entre as apresentações; resize dentro da mesma apresentação não provoca render. Com 200 posições sintéticas, DOM caiu de 19.259 para 5.859 nós (69,6%). Os mesmos 200 registros aparecem após transições nos dois sentidos. A filtragem por grupo usa Set, evitando a busca repetida por includes.
- Busca em Ativos e RF preserva foco/cursor durante digitação lenta. O teste RED registrou apenas t em vez de test; GREEN comprova a consulta completa nas duas telas.
- Filtro de classes exclui o valor padrão on da checkbox principal. FIIs → Todos restaura a lista; foco é preservado no desktop e Escape retorna ao trigger.
- RF mobile abre com filtros recolhidos, saldo atual de 22px e ações secundárias. Busca, status e ordenação continuam disponíveis; controles aparecem no desktop mesmo após resize.
- Configurações usa superfícies do tema, headings coerentes, textos funcionais >=12px e ações >=44px. Microtexto ativo nessa tela: 23 → 0. Removido um !important após eliminar estilos inline conflitantes; badges consomem tokens semânticos.
- Contraste corrigido no aviso de QA, no ranking/valores mensais de Patrimônio e no atalho de busca. Não houve alteração de cálculos, valores ou fontes.
- Renderers completos ativos e RF foram extraídos, inicialmente idênticos ao código anterior: 57.397 bytes/754 linhas. Os scripts defer não bloqueiam Dashboard; teste retém os arquivos reais e prova navegação/loading/recuperação. Falha de arquivo gera retry explícito, sem impedir navegação.

## Skills

TASK_TYPE=UI + performance + QA local
SKILLS_AVAILABLE=Superpowers; Ponytail full; Caveman; performance-optimization; interface-design; Playwright; verification-before-completion
SKILLS_CONSIDERED=as anteriores; browser-harness; especialistas de finanças/Firebase
SKILLS_SELECTED=Superpowers/Ponytail/Caveman no processo; performance-optimization e Playwright em medição; interface-design em UX; verification-before-completion e ponytail-review na certificação
SKILLS_NOT_SELECTED=browser-harness CLI indisponível; especialistas financeiros/Firebase sem mudança protegida; demais sem necessidade
SELECTION_REASON=menor conjunto útil por fase; nenhum provider/modelo remoto ou endpoint Hermes alegado
SKILL_REEVALUATED=YES (medição → UI → browser/Axe → debugging → verificação)
TOTAL_SKILLS_FOUND=40 entradas diretas / 43 arquivos recursivos
TOTAL_SKILLS_CATALOGED=38 IDs válidos únicos
UNCATALOGED_APPLICABLE_SKILLS=0

As duas entradas diretas excedentes são browser-harness-main/SKILL.md (cópia do ID browser-harness, já classificada DUPLICATE_ID_NONCANONICAL_COPY) e impeccable.bak/SKILL.md (backup sem frontmatter válido, BACKUP_INVALID_METADATA). Não instalar, copiar ou rotear essas cópias. Os três arquivos recursivos adicionais também já têm disposição canônica. Gate estrito da origem: PASS. Placeholders de auditoria de dependências/sobreposição permanecem explícitos; não foram convertidos em aprovação.

## Métricas e limites de medição

INITIAL_HTML_BYTES_BEFORE=1733952
INITIAL_HTML_BYTES_AFTER=1678290
INLINE_JS_BYTES_BEFORE=1727592
INLINE_JS_BYTES_AFTER=1671429
INLINE_JS_LINES_BEFORE=28586
INLINE_JS_LINES_AFTER=27847
INLINE_JS_REDUCTION_BYTES=56163
MODULES_CREATED=legacy/js/screens/assets.js; legacy/js/screens/fixed-income.js
INITIAL_EXECUTED_JS_BEFORE=NOT_MEASURED
INITIAL_EXECUTED_JS_AFTER=NOT_MEASURED
DOM_NODES_INITIAL_BEFORE=570
DOM_NODES_INITIAL_AFTER=572
DOM_NODES_DASHBOARD_BEFORE=518
DOM_NODES_DASHBOARD_AFTER=520
DOM_NODES_ASSETS_BEFORE=838
DOM_NODES_ASSETS_AFTER=639
DOM_NODES_DIVIDENDS_BEFORE=728
DOM_NODES_DIVIDENDS_AFTER=730
BOOT_TIME_COLD_BEFORE=266.7ms
BOOT_TIME_COLD_AFTER=297.6ms
BOOT_TIME_WARM_BEFORE=136.0ms
BOOT_TIME_WARM_AFTER=159.2ms
AUTH_GATE_RENDER_TIME=NOT_MEASURED; public logged-out layout inspected separately
DASHBOARD_FIRST_USABLE_BEFORE=NOT_MEASURED_REAL_PAINT
DASHBOARD_FIRST_USABLE_AFTER=PASS structural gate: dashboard usable while secondary modules are pending
NETWORK_REQUESTS_INITIAL=89 → 91
CACHE_HITS_WARM=0 → 0
LONG_TASKS_BEFORE=0
LONG_TASKS_AFTER=1
CONSOLE_ERRORS=0
CONSOLE_WARNINGS=0 application warnings in synthetic flow

Boot samples measure time after DOMContentLoaded and root readiness in an ephemeral synthetic context; they are not FCP/RUM. Latest samples do not prove a cold/warm boot speedup. Route medians use three synchronous render calls, not whole user-perceived transitions. Long-task observation spans the full QA run; AFTER includes browser/Axe instrumentation absent from BEFORE, so the counts are not an app-only comparison. No runtime executed-byte coverage, production network or hosted auth performance was measured. Source byte accounting is separate in ignored .qa-state/mega19/source-metrics.json and normalizes LF; total JS was not reduced by merely extracting functions.

| Rota | Mediana antes (ms) | Mediana depois (ms) |
|---|---:|---:|
| dashboard | 4.1 | 4.1 |
| patrimonio | 2.6 | 2.7 |
| ativos | 4.3 | 3.8 |
| dividendos | 5.5 | 5.7 |
| renda-fixa | 2.9 | 3.2 |
| metas | 2.7 | 3.0 |
| settings | 1.7 | 1.9 |

## Gates executados

LOGIN=PASS public logged-out layout 320/390/768/1366/1920, dark/light; canonical handler/renderer tests; Google session not executed
DASHBOARD=PASS synthetic readonly
PATRIMONIO=PASS synthetic readonly
ATIVOS=PASS synthetic readonly, search/filter/details, scaling and resize
DIVIDENDOS=PASS synthetic readonly, year/per-period coverage tests
RENDA_FIXA=PASS synthetic readonly, filters/search/sort and responsive layout
METAS=PASS synthetic readonly
CONFIGURACOES=PASS synthetic readonly, theme/typography/contrast
MOBILE_320=PASS
MOBILE_360=PASS
MOBILE_390=PASS
MOBILE_430=PASS
TABLET_768=PASS
DESKTOP_1024=PASS
DESKTOP_1366=PASS
DESKTOP_1440=PASS
DESKTOP_1536=PASS
DESKTOP_1920=PASS
LIGHT_THEME=PASS
DARK_THEME=PASS
AXE_CRITICAL=0 in 28 scans (390/1366, seven routes, both themes)
AXE_SERIOUS=0 in those scans
KEYBOARD=PASS focused search, filter reset/Escape, table scrolling and nav checks covered by regressions
FOCUS=PASS tested interactions; not an exhaustive audit of every modal
TOUCH_TARGETS=PASS selected essential controls; settings buttons explicitly checked
OVERFLOW=0 across 140 route/theme/width states
CONTRAST=PASS tested Axe scans and settings text against both gradient stops
DUPLICATE_IDS=0 across those 140 states
GLOBAL_LISTENERS=stable after tool initialization: window 20 → 20; document 7 → 7
SERVICE_WORKER=PASS v250.10; two new modules precached; never-cache rules preserved
CACHE_UPDATE_FLOW=PASS install/activate/reload/update without cachebust, then offline retrieval of actual new renderer sources
MODERN_DIST_PROBLEM=pretest and QA rebuilt protected generated artifacts; plugin hardcoded its output path
MODERN_DIST_SOLUTION=production-equivalent QA config emits .qa-state/modern-build; plugin respects output directory; synthetic server maps public modern URLs only within that directory
MODERN_DIST_UNCHANGED=PASS hash comparison of 15 files, plus real isolated-build regression; no delete/restore
QA_ALL=PASS via verify:release
VERIFY_RELEASE=PASS exit 0 at CODE_VALIDATED_HEAD
NPM_TEST=PASS including pretest routed to isolated build
TEST_MODERN=823/823 PASS
TEST_UI=348/348 PASS
TEST_SKILLS_ROUTING=25/25 PASS
VERIFY_SKILLS=PASS snapshot and strict source
V289=16/16 PASS; visual-regression script 18/18 including monthly-coverage browser tests
V215=PASS static source contracts; responsive RF covered by daily matrix
V324=17/17 PASS
FINANCE_TESTS=96/96 PASS
PERSISTENCE_TESTS=32/32 PASS
BACKUP_TESTS=16/16 PASS; synthetic only
LOCAL_SYNTHETIC=57/57 PASS
BROWSER_SYNTHETIC=PASS supplemental suite
QA_LIFECYCLE=PASS supplemental suite; owned servers closed
UTF8=PASS changed files decode as UTF-8
AUTH_EMULATOR=NOT_REEXECUTED; known BLOCKED_ENVIRONMENT, no new hypothesis
DAILY_USE_FLOW=PASS local synthetic: routes, search, class filter/reset, details/back, dividend year, RF sort, settings, dashboard
PRODUCT_DAILY_USE_READY=CONDITIONAL_LOCAL; hosted auth/persistence not certified

## Visual review, security and delivery

SCREENSHOTS_REVIEWED=64 synthetic captures in eight contact sheets plus selected full-size inspection; local only. Before/after RF captures use the same fixture. Settings light-theme gradient defect was found visually even though Axe could not fully evaluate its background, then covered by a real contrast regression.
VISUAL_DEFECTS_FOUND_AND_FIXED=settings theme/heading/readability; low-contrast warning/ranking/shortcut; RF filter density and balance hierarchy
PERFORMANCE_WINS=duplicate hidden asset DOM eliminated; Set membership; secondary dependencies do not block dashboard
ARCHITECTURE_WINS=two complete screen renderers extracted; repeatable QA output isolation; single breakpoint listener; loading/error state reuse
UX_WINS=continuous search focus; correct class reset; keyboard/Escape behavior; RF reading before action; legible settings in both themes
QA_PRIVACY=hidden/private directories return 403; encoded traversal cannot escape generated build; synthetic fixtures only; no real-source folder enumerated
PORT_24678_ROOT_CAUSE=Vite 6 SSR middleware servers created WebSocket listeners even with hmr:false; test-only ws:false closes that collision
PORT_LEAKS=0 identified owned harnesses; no 24678 listener or owned runner remained at final check; unknown processes were not killed
VITE_WARNINGS=classic report contract remains intentionally copied as a global script (HARMLESS); namespace/default export compatibility warning remains nonblocking and needs scoped Modern bridge review (ACTIONABLE_DEFERRED)
MODULE_TYPE_WARNING=Node MODULE_TYPELESS_PACKAGE_JSON remains a tooling warning; root type change would break CommonJS tests and was not made
FINANCE_CORE_UNCHANGED=YES tracked files and inline protected functions preserved
PERSISTENCE_UNCHANGED=YES
FIREBASE_UNCHANGED=YES
REAL_DATA_WRITES=0
REAL_FINANCIAL_OPERATIONS=0
WORKTREES_PRESERVED=YES
WORKSPACE_HYGIENE_GATE=PASS status/diff/root checks; generated ignored evidence retained, no cleanup
READY_FOR_PRODUCT_REVIEW=YES local product review
READY_FOR_RELEASE_CERTIFICATION=CONDITIONAL local script gates passed; hosted certification missing
READY_FOR_PUSH=NO authorization absent
BLOCKERS=hosted auth/persistence/recovery QA not authorized or executed; known emulator environment blocker; residual large inline JS and deferred Modern warnings
NEXT_STEP=review local product packages and authorize an isolated hosted QA environment before production certification/publication; preserve real import/write gates

## Commits locais

- f33ae01 fix(ui): make settings metadata and actions readable
- 07363c7 fix(qa): deny hidden metadata paths in local serving
- 7dd904e fix(a11y): preserve keyboard focus in asset filters
- 176256b fix(qa): prevent mapped assets escaping into private directories
- 0c03953 test(assets): assert mobile layout unmounts desktop tables
- 5db0164 test(qa): certify synthetic daily flow and offline renderer recovery
- 54a06b6 fix(governance): distinguish skill entries from unique eligible IDs
- 6302fba fix(a11y): align settings and financial labels with theme contrast
- 87390bb perf(assets): mount one responsive layout and fix class reset
- fbc6f59 perf(ui): defer secondary renderers without blocking dashboard boot
- b6685d8 fix(ui): preserve search focus and prioritize RF positions on mobile
- e351680 refactor(ui): extract complete assets and fixed-income renderers
- d85dad9 fix(qa): isolate Modern build output and SSR listeners

No push, PR, merge, deploy, paid service, real import/restore or cleanup. Default build:modern still targets protected modern/dist and requires its own explicit build/release scope; QA/pretest use the isolated configuration. Vite outDir reference: https://vite.dev/config/build-options.html#build-outdir.
