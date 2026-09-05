# Release Integration Report

## Status

- `RELEASE_INTEGRATION=RF_HARNESS_RECONCILED`
- `USER_AUTHORIZED_TEMP_WORKTREE=true`
- `CANONICAL_WORKSPACE_PRESERVED=true`
- `AUTHORIZED_TEMP_WORKTREE=C:\Projetos\carteira-investimentos-release-integration`
- `INTEGRATION_BRANCH=release/visual-product-integration`
- `INTEGRATION_BASE=origin/main@d3170e9fda8f9a1b9b9746cc950ceb5445c3d3c2`
- `INTEGRATION_MERGE_COMMIT=2e8971f1e84dfafbe69971815391eaf8c5571e01`
- `RF_HARNESS_RECONCILIATION_COMMIT=f5b9576`

## Repository Guard

- Canonical branch: `feat/visual-product-north-star`
- Canonical HEAD: `8b0d8bb7be4aac9e6454fb10acc82101ea3fd734`
- `origin/main`: `d3170e9fda8f9a1b9b9746cc950ceb5445c3d3c2`
- Feature remote HEAD: `c53085d689930a1ca1cffd17fdf3bc58d6bbb356`
- Divergence before integration: `origin/main...feature = 5 behind / 30 ahead`
- Canonical checkout was not mutated by this integration.
- `C:\Projetos\carteira-investimentos-integration` was preserved and not modified.

## Integration Work

The temporary branch was created from the fetched `origin/main` and the feature
branch was merged without rebase or force operations. Conflicts were found in
the documented files, including `index.html` and related tests/docs. The
resolution preserved the main security/data contracts and the approved feature
surface. Mechanical union artifacts were then corrected surgically where they
caused duplicate declarations, duplicate markup, or invalid syntax.

## RF Architecture Evidence

- `CURRENT_RF_ARCHITECTURE=Ativos remains the variable-asset route; Renda Fixa is entered through the dedicated renda-fixa route and keeps its official RF renderer/editor.`
- `ARCHITECTURE_DOC_EVIDENCE=PRODUCT_CONTRACTS.md accepts renda-fixa as the current route; the merged ARCHITECTURE_MAP.md contains one stale sentence calling RF an Ativos inner tab and should be corrected in a documentation-only follow-up.`
- `PRODUCT_CODE_EVIDENCE=go('renda-fixa'), supportedRoutes including renda-fixa, RF page content, official RF values and openRfMovementEditor handlers.`
- `OLD_PATRIMONY_ASSERTION_MEANING=the old harness used patrimonio as the entry point for RF editor access, not a global patrimony calculation.`
- `CURRENT_CANONICAL_ASSERTION=go('renda-fixa') resolves a meaningful RF surface, preserves RF identity/value visibility, and opens the official editor without duplicating RF inside Ativos.`

The integration merge was completed in `2e8971f`. The two mechanical smoke
harness repairs that were already pending after conflict resolution were
recorded separately in `78b60eb`.

## Validation

- Root tests: `75/75 PASS`
- Modern tests: `750/750 PASS`
- Finance tests: `80/80 PASS`
- Persistence tests: `32/32 PASS`
- Static build: `PASS`
- Modern build: `PASS` (Vite emitted existing warnings; no build failure)
- `git diff --check`: `PASS`
- Focused Apple Pass, settings, backup/restore, IRPF, analysis, dashboard and
  asset-filter guards: `PASS`
- Assets performance browser smoke: `PASS`
- RF editor harness: `PASS` at `390x844`, `768x1024`, `1366x768` and
  `1920x1080`; the `430x932` route smoke also passed.
- Ativos and dedicated Renda Fixa route smoke: `PASS` at
  `390x844`, `430x932`, `768x1024`, `1366x768` and `1920x1080`.
- Integrated primary-route browser matrix: `PASS`, dark/light at
  `390x844`, `430x932`, `768x1024`, `1366x768`, `1920x1080`.
- Production-like local shell: `PASS_WITH_EXTERNAL_LIMITATION`; auth gate is
  shown without `testMode`, and test controls/fixtures are not exposed.
- PWA local check: manifest and service-worker capability available; no active
  registration was created in the isolated local smoke.

## RF Harness Reconciliation

`tests/rf-assets-editor-integration.smoke.test.js` previously waited for
`setAssetsInnerTab('patrimonio')` and searched for the RF editor inside Ativos.
The approved product architecture keeps Ativos focused on portfolio assets and
uses the dedicated `renda-fixa` route for RF positions and editors. The test
now enters `go('renda-fixa')`, asserts the meaningful RF surface and official
RF editor, and preserves all identity, balance, event, cancellation, resgate,
focus and no-mutation assertions.

- `FAILURE_CLASS=STALE_HARNESS`
- `DO_NOT_REINTRODUCE_RF_IN_ATIVOS=true`
- `PRODUCT_FILES_CHANGED_FOR_RF_RECONCILIATION=false`
- `RF_ROUTE_GUARD_VALID=true`
- `ATIVOS_ROUTE_GUARD_VALID=true`
- `RF_DATA_VISIBILITY_GUARD=true`

## External Limitations

- Firebase real sync was not exercised in TestMode.
- CDN-backed Firebase/XLSX resources were blocked by the isolated environment.
- Production market refresh and external PDF dependency validation remain
  preview/release checks.
- No production credentials, destructive action, push, PR, merge, or deploy was
  performed.

## Decision

- `RELEASE_BLOCKERS=0`
- `RELEASE_READINESS=READY_FOR_PREVIEW_PUSH`
- `INTEGRATION_BRANCH_PUSHED=false`
- `PR=false`
- `MERGE=false`
- `PRODUCTION_DEPLOY=false`
- `NEXT_RECOMMENDED_ACTION=Continue the separately authorized preview-push and external validation sequence; do not push or merge automatically.`
