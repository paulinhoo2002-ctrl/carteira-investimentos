# V330 — Data Source and Reconciliation UX

**Status:** proposal only; do not begin the functional phase before V329 is
reviewed and closed.

## Goal

Make existing source identity, provenance, reconciliation, conflicts,
duplicate warnings, and import readiness easier to understand. Reuse the
existing Import Center, parser, identity, deduplication, preview, and
write-boundary contracts. The work is UX/specification only until a separate
phase is authorized; it is not a new importer or authorization for real
financial data.

## Scope

- Show source/broker identity and provenance separately from inferred labels.
- Explain reconciliations with explicit compared domains, denominator,
  coverage, source time, and confidence state.
- Distinguish conflicts, exact duplicates, possible duplicates, missing
  sources, partial imports, and unsupported formats with plain-language states.
- Make import readiness explain the blocking evidence; never convert a warning,
  unknown source, or partial input into a ready state.
- Use anonymized synthetic fixtures only for UX and contract tests.
- Preserve exact identity and idempotency contracts in
  `BROKERAGE_NOTE_IMPORT.md` and `import-center-core.js`.
- Test only dry-run and isolated in-memory/test-storage paths; assert zero
  persistence, Firebase, localStorage, or production writes.

## Explicit exclusions

- No real source files, screenshots, account identifiers, or portfolio values
  in fixtures, tests, reports, or Git.
- No real import, restore, account inspection, or financial write.
- No new broker/source support claim without a representative synthetic
  fixture and proven parser behavior.
- No changes to fee allocation, cost basis, tax semantics, or protected V285-02
  decision.
- No email/storage provisioning, production deployment, merge, or new
  dependency without its own authorization.

## Acceptance evidence for a future authorized phase

- Fixtures are synthetic and contain no personal data.
- UI states for complete, partial, unknown, conflict, duplicate, stale, and
  unsupported input are distinguishable without color-only cues.
- Reconciliation details preserve source evidence and explicit coverage; no
  presentation layer reports false success.
- All tests assert zero real writes and no mutation of source fixtures.
- Existing legacy, modern, Import Center, V289, A11Y, `qa:all`,
  `verify:release`, and build gates pass on the tested SHA.

## Next phase gate

V330 implementation may start only after V329's final review and explicit
phase selection. Any use of real financial data or execution of an import
requires a separate human gate and is outside this proposal.
