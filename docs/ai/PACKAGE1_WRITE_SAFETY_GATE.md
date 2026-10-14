# Package 1: local write safety gate

Scope: Inter current position at 2026-10-10. This is a read-only plan. It does
not authorize a hosted write or change the application's Finance Core or
persistence path.

## Cost semantics

The 25 source rows marked `CALCULATED` contain FIFO remaining-lot evidence,
not certified weighted average cost. Nineteen of the 25 have FIFO lot quantity
different from the reported current position quantity. Matching quantity in
the other six does not establish complete historical cost coverage. The
proposed Position V2 records therefore set `average_cost`, `cost_basis_value`
and `cost_method` to `null`, and both cost statuses to `UNKNOWN`. No P&L is
derived from them. Keep the 25 per-asset explanations in the ignored local
evidence directory; do not publish personal position data in Git.

The old ignored `canonical-analysis/package1-dry-run` output is superseded for
this gate. Its `ready_for_authorization` flag must not be used: it called FIFO
cost average cost, counted source statuses incorrectly, and described a prefix
rollback.

## Local plan

`package1-write-safety.js` constructs exactly 35 deterministic Position V2
documents and one official account snapshot. It keeps the official snapshot
separate from the partial detail sum. Each record has the same immutable batch
ID. Exact target IDs are in the ignored local payload. No document ID is
generated at write time.

Finance Core and Persistence Core now expose opt-in, read-only V2 functions.
They validate observed current values and the official snapshot while keeping
cost and P&L unavailable when cost is unverified. Legacy storage and its
existing formulas remain unchanged. A future legacy-to-V2 migration must
receive explicit source, date and custodian evidence; the old fields alone
are insufficient and are not migrated automatically.

The local planner requires an explicit read result for each of the 36 target
IDs. If all are absent, it simulates 36 inserts; the identical second run
simulates 36 unchanged records. Existing identical records are unchanged.
Different existing records, unread targets, invalid totals, invalid IDs and
uncertified cost fields fail closed. It has no hosted writer.

Before any future write, read and back up the exact 36 target IDs in the
verified database, recording `ABSENT` explicitly. Verify the backup hash and
readability before writes. A rollback must compare the current exact document
with the planned batch document and then restore its prior document or delete
only the exact ID created by the batch. Never use prefix, wildcard or
collection-wide deletion.

After any separately authorized write, read back all 36 IDs, confirm batch
IDs, document content, official and detail totals, and validate the real UI.

## Gates still open

- Database/project identity and live target state have not been read. Actual
  insert count and prewrite backup are unknown.
- The application screens do not yet mount the opt-in V2 view. Core unit tests
  establish API compatibility, but cannot certify the full UI.
- Dashboard, Patrimônio, Ativos, Renda Fixa, P&L, IR and Dividendos have not
  been certified against the final payload in the real UI.
- Hosted writes require a separate explicit authorization after protected
  integration, full local QA, exact target backup and UI certification.
