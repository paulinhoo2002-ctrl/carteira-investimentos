# V1051 — Google Drive backup and disaster recovery

**Status:** synthetic simulator implementation; real Google Drive integration is not implemented or certified.

## Execution routing

- Model used: Codex GPT-6 runtime; the exact model sub-variant is not exposed in this session. Hermes GLM-5.3 is the project routing recommendation and was present in the public NVIDIA catalog, but runtime availability was not established and it was not used.
- Skills used: Superpowers `using-superpowers` and `executing-plans` governed the plan/process; Ponytail full and Caveman constrained the change size and communication; `test-driven-development` guided RED/GREEN; `verification-before-completion` governed the validation; `doubt-driven-development` challenged the storage and restore assumptions; `using-git-worktrees` informed isolation.
- Considered but not used: Playwright/browser and Firebase rules auditor, since this change contains no UI or Firebase code; independent second-model review was unavailable.

## Implemented boundary

`tests/support/mock-drive-backup-adapter.js` is a test-only, local file-backed simulator. It accepts only the existing version-1 encrypted backup envelope from `backup-portability.js`, writes only under a specifically named operating-system temporary directory, and imports no network, Firebase, OAuth, Drive, localStorage, or IndexedDB client. It stores ciphertext plus integrity/ownership metadata; it never receives a passphrase or plaintext financial payload.

The existing portable backup remains the cryptographic authority: AES-256-GCM with a random 12-byte IV, a 256-bit key derived using PBKDF2/SHA-256 (310,000 iterations) and a random 16-byte salt, plus the existing versioned manifest and SHA-256 payload validation. The simulator adds a SHA-256 digest over the serialized encrypted envelope and metadata. It does not introduce another encryption format.

Objects are immutable UUID-named files. An idempotency key returns the same object for a retry; reusing it with different bytes returns `IDEMPOTENCY_CONFLICT`. Exact encrypted-byte duplicates return the existing object. Versions are listed per opaque owner scope and backup key. A user cannot list another scope's objects; download returns `NOT_FOUND` for an object outside the caller's scope to avoid disclosing its existence. Network/authentication/interrupted-upload faults are injected by tests; incomplete staging files are removed before retry.

Retention is a previewed plan. Corrupt versions are protected from pruning. The simulator only removes a version after an explicit `confirm: true`; there is no background task or automatic deletion. This confirmation is a simulator safeguard, not authorization for external deletion.

## Synthetic recovery evidence

`tests/v1051-drive-backup-simulator.test.js` creates a synthetic wallet, calls the established backup creation and encryption APIs, uploads the ciphertext to the simulator, discards the source fixture reference, then starts a new Node process to list/download/decrypt/verify it. The child has no IndexedDB or localStorage and applies only through `applyToIsolatedStore`, which is an in-memory test helper. It compares canonical source/restored SHA-256 hashes and checks synthetic asset quantity, buy gross, sell gross, paid income, balance, and domain counts. No app persistence, Firebase, real account, personal file, or real portfolio is touched.

## Future Google Drive permission model

Any future user-visible Drive integration should evaluate the narrow `https://www.googleapis.com/auth/drive.file` scope. Google describes it as access to specific Drive files the app uses, rather than all files. That scope includes seeing, editing, creating, and deleting those app-used files, so the product must not expose deletion/retention as an unattended default. The OAuth design and any live test require separate human authorization; this repository change does not request or use OAuth. See [Google's Drive API scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) and [OAuth scopes reference](https://developers.google.com/identity/protocols/oauth2/scopes).

The simulator's `backupKey` is only a synthetic namespace. A real adapter must bind storage to the authenticated Google account, avoid broad Drive listing/search scopes, retain only app-owned file IDs, store OAuth tokens only through the approved platform's secure token storage, and never log tokens or backup contents. The encrypted file should be uploaded as opaque bytes; names and metadata should not contain personal or financial details.

## Automation limits and remaining gates

The simulator verifies deterministic retry/version behavior, but does not prove a real provider's atomicity, resumable-upload semantics, availability, quota handling, OAuth consent, retention, or download integrity. Browser background execution is opportunistic and cannot guarantee a scheduled backup. A production design would need a supported execution trigger, user-visible last-success/last-valid-backup state, failure alerts, and periodic restore drills; no such schedule is active here.

Before certification of an external backup: authorize OAuth setup and a synthetic account, review consent/scope and deployment environment, execute an actual synthetic upload/download, verify account/object ownership, corruption and retry behavior, and perform a clean-process restore into an isolated synthetic store. A separate gate is required before deleting external versions or restoring any real account. Do not describe this simulator result as real Drive backup or production disaster-recovery certification.

## Gate summary

- Local evidence: V1051 simulator 6/6; backup/restore 24/24; recovery 9/9; V324 backup 17/17; finance 96/96; static build PASS; `git diff --check` PASS. Full npm matrix and Firebase emulator were not run locally; dependencies are absent and no install was authorized for this worktree.
- CI, Preview and Draft PR status must be recorded only after verifying the pushed exact HEAD.
- `REAL_DRIVE_OAUTH=NOT_USED`
- `REAL_DRIVE_UPLOAD_DOWNLOAD=NOT_TESTED`
- `SYNTHETIC_MOCK_UPLOAD_DOWNLOAD=TESTED`
- `CLEAN_PROCESS_SYNTHETIC_RECOVERY=TESTED`
- `FIREBASE_HOSTED_QA=NOT_USED`
- `REAL_FINANCIAL_WRITE=0`
- `REAL_FINANCIAL_IMPORT=false`
- `REAL_FINANCIAL_RESTORE=false`
- `PRODUCTION=false`
- `MERGE=false`
