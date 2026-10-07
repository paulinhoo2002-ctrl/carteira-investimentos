# V330 — Data Source and Reconciliation UX

**Status:** implementation in progress on `codex/v330-data-source-reconciliation`.
V329 is merged as PR #452 at `0000bcc16b6a4b841af89bd99ab78d2bdff56fd2`.
The current change remains local, synthetic-tested, uncommitted, and without a
Draft PR or remote CI certification.

## Goal

Make brokerage-note source identity, provenance, reconciliation, conflicts,
duplicate warnings, and review readiness auditable. Reuse the existing Import
Center, note parser, identity, deduplication, preview, and protected write
boundary. V330 stops before persistence; the existing explicit confirmation
flow remains governed by its own contracts and was not exercised here.

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
- Preserve raw executions separately from grouped normalized transactions;
  only group when broker/note, trade date, canonical asset, side, market,
  unit price, and settlement context are evidenced. Ambiguity requires review.
- Note identity requires broker, stable note number and trade date; source file
  ID remains provenance only. Quantity must be positive, non-exponential and
  at most eight decimal places; gross is checked against quantity × unit price
  within one cent. Review-required plans cannot be confirmed.
- Preserve note-level fee components, IRRF amount/inclusion/base, trade date,
  settlement date, source provenance, and normalization version. Unknown stays
  unknown; note-level fees stay unallocated by default.
- Sale gross is not realized P&L. V330 does not add a cost-basis formula; absent
  governed V326 evidence, realized result remains unavailable.
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

## Current implementation evidence

- `tests/v330-brokerage-note-reconciliation.test.js` and
  `tests/v330-browser-qa.test.js` use synthetic fixtures only; V330 unit tests
  pass 20/20 and `test:v330:browser` passes 1/1. CI runs browser QA after
  Chromium resolution; `npm test` remains browser-independent.
- The contract preserves original unknown operation-side text in both row and
  note fingerprints, so distinct unsupported values conflict instead of being
  misclassified as an exact replay. This regression was confirmed RED then
  GREEN.
- The model preserves raw execution identities and grouped transactions,
  reports fee/IRRF unknown states, marks possible duplicate/conflict cases,
  keeps the UI disclosure native/keyboard accessible, and returns zero writes.
- Fresh full local evidence: `npm test` PASS (809 aggregate subtests), modern,
  A11Y, V84 4/4, V289 12/12, Import Center 27/27, V4D 11/11, `qa:all`,
  `verify:release`, XLSX synthetic 2/2, both builds and `git diff --check`
  PASS. V330 browser QA covers eight widths; parser-to-preview integration is
  synthetic. Local Auth+Firestore Emulator is `BLOCKED_LOCAL_ENVIRONMENT`
  (Firestore process exits before tests under local Node/Java 26); not PASS.
  Remote CI and Preview remain pending until a commit/PR.

## Remaining gates

Local implementation, regression, responsive, accessibility and release gates
passed for the current uncommitted tree, except local Auth+Firestore Emulator
which is blocked by the local runtime. Independent review leaves one MAJOR:
V330 can report `HUMAN_DATA_REQUIRED` while the legacy confirmation checklist
may still enable its writer. Resolve whether that readiness state governs the
legacy import before claiming V330 complete. Remote CI and Preview remain
pending until a commit/PR. Any real source ingestion, financial write, restore,
production action or merge remains outside this V330 execution and requires a
separate human gate.
