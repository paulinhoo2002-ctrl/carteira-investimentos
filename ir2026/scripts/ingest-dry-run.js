'use strict';

// ============================================================================
// IR2026 — P21/P28: EVIDENCE INGEST DRY-RUN (entrypoint
// IR2026_INGEST_NEW_EVIDENCE). input documents -> hash -> detect -> ingest
// -> match -> proposed promotions -> conflicts -> coverage delta.
// NO WRITE, ever: the private opening artifact is read-only here.
//
// Usage:
//   node ir2026/scripts/ingest-dry-run.js <doc1.json> [<doc2.json> ...]
// Document JSON shape:
//   { "name": "informe-2025", "asOf": "2025-12-31",
//     "rows": [ { "ticker": "DEMO4", "quantity": 100, "custo": 3500.00 } ] }
// Rows are plain objects; field detection is content-based (ingest.js).
// Real documents stay private (local only); synthetic examples live in tests.
// ============================================================================

const fs = require('node:fs');
const path = require('node:path');
const { ingestDocument, sha256Text } = require('../ingest');
const { proposeOpeningPromotions } = require('../promotion');
const { promoteInitialLosses } = require('../losses');

const root = path.resolve(__dirname, '../..');
const openingPath = path.join(root, '.qa-state/ir2026/opening-evidence/opening-fiscal-2026-v1.json');

function loadDocuments(args) {
  const docs = [];
  for (const [index, arg] of args.entries()) {
    const raw = fs.readFileSync(arg, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const doc of list) {
      docs.push({ PATH: arg, CONTENT_SHA256: sha256Text(raw), ...doc });
    }
  }
  return docs;
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('usage: ingest-dry-run.js <doc.json> [...]'); process.exitCode = 1; return; }
  const opening = fs.existsSync(openingPath) ? JSON.parse(fs.readFileSync(openingPath, 'utf8')) : null;
  const knownAssets = opening ? opening.OPENING_FISCAL_2026_V1.map((r) => r.ASSET) : [];
  const before = opening ? opening.OPENING_COVERAGE : null;

  const results = [];
  for (const [index, doc] of loadDocuments(args).entries()) {
    const ingested = ingestDocument({
      name: doc.name || path.basename(doc.PATH),
      rows: doc.rows || [],
      knownAssets,
      asOf: doc.asOf,
      contentHash: doc.CONTENT_SHA256,
    });
    const entry = { DOCUMENT_ID: 'DOC_' + String(index + 1).padStart(3, '0'), ACCEPTED: ingested.ACCEPTED, REASON: ingested.REASON || null };
    if (ingested.ACCEPTED) {
      entry.DOCUMENT_TYPE = ingested.DOCUMENT_TYPE;
      entry.RECORDS = ingested.RECORD_COUNT;
      entry.UNMATCHED = ingested.UNMATCHED;
      if (['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT', 'COST_BASIS_REPORT', 'B3_CUSTODY_STATEMENT'].includes(ingested.DOCUMENT_TYPE)) {
        const promo = proposeOpeningPromotions({ ingested, openingRows: opening ? opening.OPENING_FISCAL_2026_V1 : [] });
        entry.OPENING_PROMOTIONS = promo.PROMOTIONS.filter((p) => p.PROMOTED).length;
        entry.OPENING_CONFLICTS = promo.CONFLICTS.length;
        entry.PROMOTION_SAMPLE = promo.PROMOTIONS.slice(0, 3).map((p) => ({ ASSET: p.ASSET, FROM: p.CURRENT_STATUS, TO: p.PROPOSED_STATUS }));
        entry.CONFLICT_SAMPLE = promo.CONFLICTS.slice(0, 3).map((c) => ({ ASSET: c.ASSET, REASON: c.REASON }));
      }
      if (ingested.DOCUMENT_TYPE === 'LOSS_CARRYFORWARD_REPORT') {
        const loss = promoteInitialLosses({ ingested });
        entry.LOSS_PROMOTIONS = loss.PROMOTIONS.map((p) => ({ BUCKET: p.BUCKET, TO_CENTS: p.PROPOSED_BALANCE_CENTS }));
      }
    }
    results.push(entry);
  }

  // coverage delta (projection only — nothing is written)
  let after = null;
  if (opening && results.some((r) => r.OPENING_PROMOTIONS)) {
    const promoted = new Set(results.flatMap((r) => (r.PROMOTION_SAMPLE || []).map((p) => p.ASSET)));
    const rows = opening.OPENING_FISCAL_2026_V1;
    const upgraded = rows.filter((r) => promoted.has(r.ASSET));
    after = {
      ...before,
      OPENING_CERTIFIED: (before.OPENING_CERTIFIED || 0) + upgraded.length,
      OPENING_DERIVED: Math.max(0, (before.OPENING_DERIVED || 0) - upgraded.length),
    };
  }

  console.log(JSON.stringify({
    MODE: 'DRY_RUN_NO_WRITE',
    OPENING_PRESENT: !!opening,
    DOCUMENTS: results,
    COVERAGE_BEFORE: before ? { CERTIFIED: before.OPENING_CERTIFIED, DERIVED: before.OPENING_DERIVED, PARTIAL: before.OPENING_PARTIAL, UNKNOWN: before.OPENING_UNKNOWN } : null,
    COVERAGE_AFTER_PROPOSED: after ? { CERTIFIED: after.OPENING_CERTIFIED, DERIVED: after.OPENING_DERIVED, PARTIAL: after.OPENING_PARTIAL, UNKNOWN: after.OPENING_UNKNOWN } : null,
    NOTE: 'Promotions are PROPOSALS. Conflicts require human review. No file, hosted state or artifact is written.',
  }, null, 2));
}

try { main(); } catch (error) { console.error('INGEST_DRY_RUN_FAILED=' + error.message); process.exitCode = 1; }
