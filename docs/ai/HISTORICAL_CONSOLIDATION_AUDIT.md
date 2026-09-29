# Historical consolidation audit — 2026-09-29

## Scope and result

Compared the historical refs/worktrees against fresh `origin/main`
`6f249bb822bb83163a39a3cb7e59ff80ab3134bb`. No historical runtime change was
selected for integration. Current behavior and tests already contain the
valuable code paths; old local evidence is preserved where present.

## Per-source disposition

| Source | Evidence compared | Disposition |
|---|---|---|
| V166 corporate events | Commit `2a24c8f2fd579dbc487678a14bfc0360e1f29996`; modules, parity test, runbooks, current tests and untracked QA probes | `IN_MAIN` for modules/tests/runbooks. The local parity-baseline probe reads production browser storage; the other probes depend on a hard-coded CDP page. Do not integrate or execute them. Preserve their local state. |
| V169A protected QA | Commit `bf50219da99f53a5e2c1975912213848e859ecc2`; current boot guards, QA harness, tests and runbook | `SEMANTICALLY_SUPERSEDED` by current-main protected QA controls. Its ignored `.qa-state` is retained; no manual removal. |
| V178 usability | Commit `35bd68b14aaf0410c2444ec191bf78e7331a5aec`; chart tooltip/crosshair, sector search and contract test | `IN_MAIN` by current source and `chart-interaction-contract.test.js`. Physical checkout is absent; local branch and archive ref preserve the exact commit. Standalone bundle is not verified. |
| V275 visual redesign | Five commits `20aed39`, `158d3b4`, `7407346`, `4f1062d`, `001b8aa`; committed code only | `FUTURE_VALUE`, not current integration. Reusable ideas: Dashboard hierarchy/primitives; Ativos/Renda Fixa/Proventos composition; explicit estimate labeling; operational/detail-screen patterns. Visual canon is frozen and broad visual implementation deferred. Private/local-import material remains untouched. |
| V278M integration | All 11 commits from `cadc0ea` through `d95c5f3`; changed paths compared with current tree | `IN_MAIN_OR_SUPERSEDED` for current QA/backup/security/governance implementation. Archive docs and historical inventories remain archival evidence, not bootstrap instructions. `.interface-design/system.md` is reference-only and is not a competing canon. Ignored local QA/build/dependency state remains. |
| V278O privacy-safe release | Branch head `fff87418004e2e59092b115160bb7c28653dba31`; public docs and local residues | `MERGED_HISTORY`; V278 was closed by PR #428. Design notes duplicate current visual governance; local `.interface-design/` and test residue were not modified. |
| V281 historical return | Commits `ecc96ec` and `993b9d0`; engine, tests, adapter and V283 integration | `SEMANTICALLY_IN_MAIN` through the subsequent V283 integration. Current engine requires explicit `priceCoverage`; tests retain UNKNOWN/PARTIAL fail-closed cases. No old architecture was copied. |

### V278M commit-by-commit disposition

| Commit | Changed surface | Current disposition |
|---|---|---|
| `cadc0ea` | Archive moves; maintenance/QA scripts | Current maintenance paths were checked on main; moved historical reports remain reference-only. No missing active behavior identified. |
| `e3be713` | Canonical QA paths, browser doctor and lifecycle tests | `scripts/qa/` and corresponding tests exist in current main; retain current implementation. |
| `c67d898` | Safe-backup policy, script and tests | Current main has the policy/script/test paths; do not copy the historical version over the current one. |
| `dbe728f` | Governance, ownership/storage docs, interface-system note | Canonical governance has since evolved. `.interface-design/system.md` is reference-only, not a second source of truth. |
| `9996f98` | Move superseded root/`tools/qa` material into archive/maintenance | Current canonical QA root is `scripts/qa/`; archival locations are historical evidence, not operational paths. |
| `1c1e263` | Authenticated-origin QA isolation test | Equivalent isolation test exists in current main. |
| `c1573d7` | Project maps, AGENTS and QA/release docs | Superseded by current `origin/main` governance; no older state snapshot should override it. |
| `1bc2f61` | Monthly QA execution/preauthorization artifacts | Active paths exist in current main; preserve current versions and their fail-closed contracts. |
| `b4f928a` | Fail-closed monthly shadow runner and tests | Current runner/test paths exist in main; no need to cherry-pick. |
| `f37b1b3` | V278N validation/state documentation | Historical checkpoint; superseded by merged V284 and this updated next-step state. |
| `d95c5f3` | V278N closeout state documentation | Historical checkpoint; superseded by PR #432 and current product backlog. |

## Phase 8 recovery check

- V284 feature commit `832261529ed122f02054314c1058c3fcc348c407` is an
  ancestor of current `origin/main`; PR #432 merge commit is the current main
  head. The local feature branch is absent; the fetched remote-tracking branch
  remains. No committed-history loss was detected.
- V178 checkout registration and physical path are absent. Its local feature
  branch and `refs/archive/v178-ui-usability` both resolve to the expected
  commit. Historical reports describe the removed untracked items as generated
  QA screenshots; this audit did not inspect screenshot contents.
- `git fsck --full` succeeds. Dangling objects are preserved. No claim is made
  that Git can recover arbitrary untracked files deleted outside Git.

## Archive verification boundary

Verified archive refs: V178, V275, V278M, V281, each at the expected commit.
The V284 feature commit is reachable from main. Standalone bundle files and
their hashes were not verified: exact bundle locations are maintained in
private recovery metadata, which was not accessed. Git refs/remote history
remain the recovery route established by this audit.

## Cleanup decision

No worktree was removed. Remaining registered worktrees contain untracked or
ignored QA state, local evidence, private data, or dependencies; the V263
physical residue is unregistered and was not manually removed. No force,
manual filesystem deletion, GC, or object pruning was used.

`V275_FUTURE_VISUAL_VALUE_MAP`: retain the five commits above for a separately
authorized visual phase; port ideas, not the broad historical diff. Recheck
the frozen visual canon and avoid copying private references or prototype data.
