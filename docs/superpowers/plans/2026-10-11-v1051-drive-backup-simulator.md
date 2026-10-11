# V1051 Google Drive Backup Simulator Plan

## Scope

Add a test-only, file-backed Drive simulator that stores only the existing encrypted backup envelope. Prove immutable versioning, idempotent retries, user isolation, failure handling, integrity checks, explicit retention, and recovery in a fresh process using synthetic data. Document the future permission model and the human gates for any real OAuth or Drive test.

## Constraints

- Do not implement OAuth or a production Drive adapter in this phase.
- Do not read or write personal Drive files, hosted Firebase, production, or real financial data.
- Reuse `backup-portability.js` for encryption, owner binding, manifest verification, and restore preview.
- Use Node built-ins only; no dependency installation.
- Never overwrite an immutable object or silently apply a restore over existing state.

## Steps

1. Add failing synthetic tests for mock upload/download/version list, idempotency, isolation, failure cleanup, corruption, retention consent, and clean-process recovery.
2. Implement the smallest file-backed adapter under `tests/support/`, with synthetic fault injection and no network client.
3. Run focused tests and existing backup/finance suites available without installing dependencies.
4. Review test-only boundaries, diff, and docs; record actual gates and limitations.
5. Commit explicit files, push normally, open a Draft PR stacked on PR #491, and verify checks for its exact SHA.

## Completion evidence

- Recovery subprocess starts without IndexedDB/localStorage and reports matching source/restored financial-domain hashes.
- Mock tests reject wrong owner, unsupported envelope, wrong password, corruption, and unconfirmed retention deletion.
- Real Google Drive integration remains `NOT_TESTED` and is not certified.
