# V1051 — Google Drive backup and disaster recovery

**Status:** synthetic simulator plus an isolated Google Drive REST adapter preparation; no production wiring or real OAuth/Drive certification.

## Execution routing

- Model used: Codex GPT-6 runtime; the exact model sub-variant is not exposed in this session. Hermes GLM-5.3 is the project routing recommendation and was present in the public NVIDIA catalog, but runtime availability was not established and it was not used.
- Skills used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development` and `verification-before-completion`; Ponytail full and Caveman; `doubt-driven-development`; `using-git-worktrees`; independent same-runtime adversarial review.
- Considered but not used: Playwright/browser and Firebase rules auditor, since this change contains no UI or Firebase code. An independent same-runtime code review was performed; a different-model review was unavailable.

## Implemented boundary

`tests/support/mock-drive-backup-adapter.js` is a test-only, local file-backed simulator. It accepts only the existing version-1 encrypted backup envelope from `backup-portability.js`, writes only under a specifically named operating-system temporary directory, and imports no network, Firebase, OAuth, Drive, localStorage, or IndexedDB client. It stores ciphertext plus integrity/ownership metadata; it never receives a passphrase or plaintext financial payload.

The existing portable backup remains the cryptographic authority: AES-256-GCM with a random 12-byte IV, a 256-bit key derived using PBKDF2/SHA-256 (310,000 iterations) and a random 16-byte salt, plus the existing versioned manifest and SHA-256 payload validation. The simulator adds a SHA-256 digest over the serialized encrypted envelope and metadata. It does not introduce another encryption format.

Objects are immutable UUID-named files. An idempotency key returns the same object for a retry; reusing it with different bytes returns `IDEMPOTENCY_CONFLICT`. Exact encrypted-byte duplicates return the existing object. Versions are listed per opaque owner scope and backup key. A user cannot list another scope's objects; download returns `NOT_FOUND` for an object outside the caller's scope to avoid disclosing its existence. Network/authentication/interrupted-upload faults are injected by tests; incomplete staging files are removed before retry.

Retention is a previewed plan. Corrupt versions are protected from pruning. The simulator only removes a version after an explicit `confirm: true`; there is no background task or automatic deletion. This confirmation is a simulator safeguard, not authorization for external deletion.

## Synthetic recovery evidence

`tests/v1051-drive-backup-simulator.test.js` creates a synthetic wallet, calls the established backup creation and encryption APIs, uploads the ciphertext to the simulator, discards the source fixture reference, then starts a new Node process to list/download/decrypt/verify it. The child has no IndexedDB or localStorage and applies only through `applyToIsolatedStore`, which is an in-memory test helper. It compares canonical source/restored SHA-256 hashes and checks synthetic asset quantity, buy gross, sell gross, paid income, balance, and domain counts. No app persistence, Firebase, real account, personal file, or real portfolio is touched.

## Google Drive adapter preparation (not connected to the product)

`google-drive-backup.js` is an opt-in, separately constructed REST adapter. Nothing in the app imports or invokes it. It requests only `drive.file` through an injected Google Identity Services token client; access tokens remain in the returned short-lived in-memory value and are not written to storage or logs. The adapter calls only fixed `www.googleapis.com` endpoints, rejects redirects, uploads the existing encrypted envelope as immutable JSON, stores only hashed owner/backup/idempotency identifiers in app-private `appProperties`, pages through list results, verifies content SHA-256 on download, and propagates quota/network/auth failures distinctly. It never calls a delete API. Retention is a preview plan only and refuses incomplete listings.

The browser token helper uses Google's token model, which returns access tokens to browser JavaScript. It is an isolated preparation helper and is not an approved production OAuth flow. Google's current guidance recommends the authorization-code model with PKCE; that flow needs a trusted backend endpoint for code exchange and secure token storage. No such backend or token persistence is implemented here. A 401 invalidates the in-memory token and requires a later user-driven authorization attempt; tokens are not silently refreshed. See [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [authorization-code model](https://developers.google.com/identity/oauth2/web/guides/use-code-model) and [OAuth security best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices).

Uploads use Drive's resumable-session protocol because the adapter permits encrypted envelopes up to 36 MiB. It starts a session with fixed Google API origin and `drive.file`, validates the returned session URL before any follow-up, and keeps that bearer-like URL only in memory. It sends the ciphertext in one request and, after an interrupted transfer or 5xx, queries the session's accepted range before sending the remaining bytes. Partial acknowledgements and retries are bounded; redirects are rejected; session requests do not send the OAuth bearer token. Ambiguous outcomes fail closed. Before reporting success, the adapter verifies metadata size, downloads the stored content, and compares its SHA-256 with the uploaded envelope. This adds one full-file read and corresponding Drive traffic per successful upload/replay. Behavior is covered only by synthetic mocks, not by Drive QA.

The envelope validator checks version, cryptographic metadata, base64 structure and size; it cannot prove that ciphertext was produced by `Backup.encryptBackup()` or authenticate it without the passphrase. Callers must pass the output of that existing encryptor, and restore consumers must run `Backup.decryptBackup()` followed by manifest/owner verification. `ownerScope` is an application-level filter, not an authorization boundary; production wiring must derive it from the authenticated user through the existing backup contract and must separately enforce Google account/file access. Same-page retries serialize by idempotency key. Drive does not provide an atomic unique constraint, so cross-tab/device races can still create duplicate files; later retries detect ambiguous duplicate identities and fail closed.

**Unresolved major integration risk:** idempotency is not atomic across independent tabs/devices. Two sessions can list an empty result concurrently and create duplicate encrypted files with the same identity. Drive offers no unique constraint for this adapter's app metadata; production use needs a server-side coordination/idempotency authority or must accept and safely surface duplicates. No such authority is implemented. This is not exercised as a product flow because the adapter is not wired into the app.

The adapter tests use only injected `fetch` mocks. A test exercises a real synthetic AES-GCM envelope through mocked upload/download, decryption, owner/manifest validation and `applyToIsolatedStore`; this is not a live Drive test and does not prove persistent restore. The separate mock-adapter recovery test still performs a new-process recovery without IndexedDB/localStorage.

## Future Google Drive permission model

Any future user-visible Drive integration must retain the narrow `https://www.googleapis.com/auth/drive.file` scope. Google describes it as access to specific Drive files the app uses; broader `drive` scopes reach all Drive files. The chosen scope can still modify or delete app-used files, so the product must not expose unattended deletion. This branch only tests a fake GIS callback and fake HTTP transport; it does not configure an OAuth client, request consent, connect an account or perform a Drive request. See [Google's Drive API scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Drive search/appProperties guidance](https://developers.google.com/workspace/drive/api/guides/search-files), [download guidance](https://developers.google.com/workspace/drive/api/guides/manage-downloads) and [error handling guidance](https://developers.google.com/workspace/drive/api/guides/handle-errors).

The simulator's `backupKey` is only a synthetic namespace. A real adapter must bind storage to the authenticated Google account, avoid broad Drive listing/search scopes, retain only app-owned file IDs, store OAuth tokens only through the approved platform's secure token storage, and never log tokens or backup contents. The encrypted file should be uploaded as opaque bytes; names and metadata should not contain personal or financial details.

## Automation limits and remaining gates

The simulator verifies local retry/version behavior. The mocked REST adapter tests API construction, resumable upload recovery, app metadata, pagination, checksum validation and recovery logic, but neither proves provider atomicity, quota behavior in a real account, OAuth consent, actual retention, availability, nor real download integrity. Drive recommends resumable uploads for files above 5 MiB and most applications; the adapter's 36 MiB cap therefore uses this protocol. Browser background execution is opportunistic and cannot guarantee a scheduled backup. A production design would need a supported execution trigger, user-visible last-success/last-valid-backup state, failure alerts, and periodic restore drills; no such schedule is active here.

Before certification of an external backup: separately authorize OAuth setup and a synthetic Google account, configure/review the consent screen and deployment environment, execute an actual synthetic upload/download, verify account/object ownership, corruption and retry behavior, and perform a clean-process restore into an isolated synthetic store. A separate gate is required before deleting external versions or restoring any real account. Do not describe this adapter or simulator as a real Drive backup or production disaster-recovery certification.

## Gate summary

- V1351 local evidence (uncommitted delta on the same PR #492 branch): adapter 26/26; `test:backup-restore` 52/52 (fresh after readback verification); recovery 9/9; V324 backup 17/17; finance 96/96; local synthetic QA 44/44; V407 precheck 17/17; QA harness 17/17; legacy static build and `git diff --check` PASS. `npm audit` previously reported zero findings and manifests are unchanged. Modern 719/728 with nine files failing to load because React is absent. `npm test`, `qa:all` and `verify:release` stop at the unavailable Vite build; V84/V289 and browser UI QA remain unavailable without Playwright dependencies. Firestore Emulator exits with code 1 before tests; its debug log is empty, and the only installed Java observed is 26.0.2.1. The exact cause of emulator exit is not proven. `npm ci` is not authorized for this worktree.
- CI, Preview and Draft PR status must be recorded only after verifying the pushed exact HEAD.
- `REAL_DRIVE_OAUTH=NOT_USED`
- `REAL_DRIVE_UPLOAD_DOWNLOAD=NOT_TESTED`
- `GOOGLE_DRIVE_ADAPTER=PREPARED_NOT_WIRED`
- `SYNTHETIC_MOCK_UPLOAD_DOWNLOAD=TESTED`
- `CLEAN_PROCESS_SYNTHETIC_RECOVERY=TESTED`
- `FIREBASE_HOSTED_QA=NOT_USED`
- `REAL_FINANCIAL_WRITE=0`
- `REAL_FINANCIAL_IMPORT=false`
- `REAL_FINANCIAL_RESTORE=false`
- `PRODUCTION=false`
- `MERGE=false`
