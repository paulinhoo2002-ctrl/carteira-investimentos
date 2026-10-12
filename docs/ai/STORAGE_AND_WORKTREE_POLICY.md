# Storage and worktree policy

## Data boundaries

- PERSONAL_FINANCIAL_ARTIFACTS_POLICY=LOCAL_ONLY: personal imports, account
  snapshots, tax evidence, authenticated QA state, and private reconciliation
  reports are never committed or included in a source backup.
- SOURCE_BACKUP=VALIDATED_PRIVATE_ARTIFACT; sensitive local backup is a
  separate, explicitly authorized process.
- BACKUP_STORAGE=EXTERNAL_PRIVATE_LOCATION and
  RECOVERY_METADATA=PRIVATE_LOCAL_MANIFEST. Exact paths, names, hashes, and
  recovery commands stay in that private manifest.
- Git remote is the primary recovery source for committed work. Verified
  private Git bundles are a fallback for legacy history unavailable remotely.
- Build output, caches, logs, dependencies, worktrees, and transient QA output
  are excluded from portable source archives unless a specific recovery need
  is documented.

## Worktree lifecycle

WORKTREE_CREATION_POLICY=CONSERVATIVE.

- Do not create a worktree for a read-only audit; reuse an approved suitable
  worktree when safe.
- Use one isolated worktree per active implementation objective and record its
  purpose and owner in current project state.
- At mission end, assess retirement. Preserve HEAD and unique commits/files;
  require a clean tracked tree, no unique untracked user data, no active
  process/reference, and a documented recovery route before normal removal.
- Unknown work is kept. Do not delete branches as a side effect of retirement.
- Keep dependency installations only for active environments; remove them
  only when regenerable, idle, and not used by a process.
- WORKTREE_NODE_MODULES_POLICY=REVIEW_BEFORE_RETIREMENT: dependencies are
  regenerable but may be in use or contain valuable local state. Never remove
  them by recursive file deletion. Retire an individually verified worktree
  only through the normal Git worktree lifecycle after checking its branch,
  changes, unique commits, PR dependencies, ignored files and active processes.

## Temporary and QA artifacts

MISSION_TEMP_ROOT_POLICY=MANDATORY and
POST_MISSION_CLEANUP_POLICY=MANDATORY.

- Use the existing project QA temporary area for mission-owned transient
  outputs; avoid scattered scratch files.
- Preserve forensic evidence and authenticated QA state until individually
  classified. Never remove private browser profiles automatically.
- Remove only exact, proven regenerable mission artifacts after checking they
  are not the sole evidence of an open issue.

## Vercel deployment governance

VERCEL_PREVIEW_DEPLOYMENT_POLICY=READ_ONLY_AUDIT_BEFORE_CHANGES.

- Do not change remote deployment settings or delete deployments during local
  maintenance. Audit only the LEGACY project and record exact deployment SHA,
  target and status when available.
- Do not assume Preview triggers, ignore paths, production linkage or storage
  usage from a local file or historical report. Verify current remote settings
  before recommending a change; storage usage may require an account dashboard
  metric not exposed by deployment listing.
- Reduce documentation-only Preview builds only through an owner-reviewed,
  verified filter that cannot skip application, runtime, dependency, Firebase,
  or deployment configuration changes.
- Production promotion/deploy remains a separate human gate.

## Safe source backup

The backup script uses an explicit tracked-file allowlist and blocks sensitive
paths, credentials, and unsafe destinations. Configure the destination locally
outside the source tree. Validate destination containment and reparse points
before any directory/archive creation. A sensitive candidate hard-fails the
operation. Dry-run and policy tests must not create an archive.

See BACKUP_MANIFEST.md for the public backup model and
LEGACY_ARCHIVE_INDEX.md for the private legacy-history recovery procedure.
Exact storage topology and artifact metadata are intentionally not published.
