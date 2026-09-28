# Backup and recovery policy

This document defines the public backup architecture. Exact recovery metadata
is maintained separately in the private local recovery manifest and must not
be copied into Git, issues, logs, or public reports.

## Backup classes

- `SOURCE_BACKUP=VALIDATED_PRIVATE_ARTIFACT`: a portable project snapshot for
  restoring source and engineering continuity.
- `SENSITIVE_LOCAL_BACKUP`: an explicitly authorized, private recovery copy of
  local-only durable data. It is separate from the source snapshot and never
  part of a public artifact.
- `BACKUP_STORAGE=EXTERNAL_PRIVATE_LOCATION`.
- `RECOVERY_METADATA=PRIVATE_LOCAL_MANIFEST`.
- `LEGACY_HISTORY=VERIFIED_PRIVATE_GIT_BUNDLES` when a legacy branch cannot be
  recovered from the remote.

## Source snapshot contents

Include tracked application source, tests, scripts, documentation, safe
configuration examples, and project governance needed to rebuild and validate
the application.

Exclude `.git`, dependency trees, worktrees, transient QA state, browser
profiles, generated builds, caches, logs, credentials, `.env` files, private
imports, personal financial exports and sensitive local backups.

## Local-only data

Sensitive local data is not source code, is not committed, and is not included
in the source snapshot. Its preservation requires a separate approved private
process. Never infer that a source snapshot protects local-only imports,
authenticated browser state, or private financial records.

## Git and legacy recovery

First recover committed work from the canonical Git remote and the required
branch/ref. A verified Git bundle is a private fallback for history that is not
available remotely; it is not a replacement for the source snapshot or local
data backup. Exact bundle inventory, checksums, locations, and commands remain
in the private local recovery manifest.

## Validation procedure

1. Confirm repository identity and the intended destination is outside the
   source tree and approved for private storage.
2. Confirm exclusions and fail closed if any sensitive candidate is found.
3. Create the snapshot without running application or package lifecycle
   scripts.
4. Verify archive integrity and compute a SHA-256 digest.
5. Test extraction in an isolated temporary location and run the documented
   build/test gates.
6. Record exact artifact metadata only in the private local recovery manifest.

The repository's safe-backup script and policy tests define the executable
contract. Do not weaken destination checks or sensitive-file blocking to make
a backup succeed.

## Privacy and recovery rules

- Never commit private backup paths, filenames, hashes, machine topology,
  credentials, or personal financial data.
- Do not automatically restore, import, or write financial data from a backup.
- Keep source recovery, local-only data recovery, and Git-history recovery
  separate and explicitly authorized.
- Unknown or unverified recovery artifacts are preserved, not deleted.
