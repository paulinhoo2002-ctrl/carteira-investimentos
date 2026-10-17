'use strict';

// Real evidence stays in .qa-state; this script never opens a hosted writer.
const fs = require('node:fs');
const path = require('node:path');
const { buildOpeningFiscal } = require('../opening-fiscal');
const { buildTaxLedger } = require('../ledger');
const { checkInvariants } = require('../invariants');
const { computeCertification } = require('../certification');
const { loadRegistry, rulesNeedingExternalVerification } = require('../rules');
const { sha256File, sha256Json } = require('../hash');

const root = path.resolve(__dirname, '../..');
const inventory = require('../sources/source-inventory.json');
const sourceDir = process.env.IR2026_SOURCE_DIR || path.resolve(root, '../v012-mega-12-lifetime-redesign/.qa-state/canonical-analysis');
const package2Dir = process.env.IR2026_PACKAGE2_DIR || path.resolve(root, '../legacy-package2-2026-history');
const outputDir = path.join(root, '.qa-state/ir2026');
const fiscalYear = 2026;

function conservativeOpening(candidate, rawEvents) {
  const historical = new Set(rawEvents.filter(e => e.DATE < '2026-01-01').map(e => e.TICKER));
  const rows = candidate.ROWS.map(row => {
    const hasHistory = historical.has(row.ASSET);
    return {
      ...row,
      OPENING_QTY: hasHistory ? row.OPENING_QTY : null,
      OPENING_TOTAL_COST_CENTS: null,
      OPENING_AVG_COST_CENTS: null,
      OPENING_RF_PRINCIPAL_CENTS: null,
      QTY_STATUS: hasHistory && row.OPENING_QTY !== null ? 'PARTIAL' : 'UNKNOWN',
      COST_STATUS: 'UNKNOWN',
      SOURCE: hasHistory ? 'SRC-CANON-MOVEMENTS' : 'UNAVAILABLE',
      AUTHORITY_LEVEL: hasHistory ? 'DERIVED' : 'UNKNOWN_LINEAGE',
      BLOCKERS: [...new Set([...row.BLOCKERS, 'NO_CERTIFIED_2025_YEAR_END_OPENING'])],
      ANCHOR_CHECK: null,
    };
  });
  const counts = status => rows.filter(r => r.QTY_STATUS === status).length;
  return { ...candidate, ROWS: rows, SHA256: sha256Json(rows), COUNTS: {
    ASSETS: rows.length,
    QTY_CERTIFIED: counts('CERTIFIED'), QTY_PARTIAL: counts('PARTIAL'),
    QTY_UNKNOWN: counts('UNKNOWN'), QTY_NOT_APPLICABLE: counts('NOT_APPLICABLE'),
    COST_CERTIFIED: 0, COST_PARTIAL: 0, COST_UNKNOWN: rows.length, COST_NOT_APPLICABLE: 0,
  } };
}

function classifyEvent(raw, record) {
  if (record.PROCESSING === 'BLOCKED_UNKNOWN' || raw.TYPE === 'UNKNOWN' || record.TYPE === 'UNKNOWN') return 'UNKNOWN';
  if (record.IMPACT_FLAGS.includes('NO_CURRENT_FISCAL_IMPACT') && record.TYPE === 'STOCK_LOAN_OUT') return 'NOT_FISCALLY_RELEVANT';
  // Source evidence may be certified while tax treatment remains unverified.
  return 'PARTIAL';
}

function buildDryRun(rawEvents, masterRows, registry = loadRegistry()) {
  if (!Array.isArray(rawEvents) || !Array.isArray(masterRows)) throw new TypeError('evidence arrays required');
  const masterIds = new Set();
  for (const row of masterRows) {
    if (!row.asset_identity || masterIds.has(row.asset_identity) || !Number.isFinite(row.package1a_quantity)) throw new Error('invalid or duplicate current-position row');
    masterIds.add(row.asset_identity);
  }
  const ids = new Set();
  for (const event of rawEvents) {
    if (!event.CANONICAL_ID || ids.has(event.CANONICAL_ID) || !/^\d{4}-\d{2}-\d{2}$/.test(event.DATE)) throw new Error('invalid or duplicate canonical event');
    ids.add(event.CANONICAL_ID);
  }
  const scopeAnchors = Object.fromEntries(masterRows.map(row => [row.asset_identity, { QTY: null, AS_OF: '2026-10-10', ASSET_CLASS: row.asset_class }]));
  const opening = conservativeOpening(buildOpeningFiscal({ rawEvents, anchors: scopeAnchors, fiscalYear, registry }), rawEvents);
  const yearEvents = rawEvents.filter(e => e.DATE >= '2026-01-01' && e.DATE < '2027-01-01');
  const ledger = buildTaxLedger({ opening, events: yearEvents, registry, fiscalYear });
  const invariants = checkInvariants({ opening, ledger, events: yearEvents });
  if (!invariants.ALL_PASS) throw new Error('fiscal invariant failure: ' + invariants.FAILURES.map(x => x.INVARIANT).join(','));
  const certification = computeCertification({ opening, ledger, invariantReport: invariants });
  const byId = new Map(yearEvents.map(e => [e.CANONICAL_ID, e]));
  const eventStatuses = { CERTIFIED: 0, PARTIAL: 0, UNKNOWN: 0, NOT_FISCALLY_RELEVANT: 0 };
  const eventTypes = {};
  const unknown = [];
  for (const record of ledger.PROCESSING_RECORDS) {
    const raw = byId.get(record.EVENT_ID);
    const status = classifyEvent(raw, record);
    eventStatuses[status]++;
    eventTypes[raw.TYPE] = (eventTypes[raw.TYPE] || 0) + 1;
    if (status === 'UNKNOWN') unknown.push({ EVENT_ID: record.EVENT_ID, ASSET: record.ASSET, DATE: record.DATE,
      RAW_TYPE: raw.TYPE, RAW_MOVEMENT: raw.MOVEMENT_RAW, AMOUNT: raw.AMOUNT,
      SOURCE: raw.PROVENANCE, IMPACT: record.IMPACT_FLAGS, REASON: record.BLOCK_REASON || 'SOURCE_UNKNOWN' });
  }
  const monthRows = Array.from({ length: 12 }, (_, i) => {
    const month = `2026-${String(i + 1).padStart(2, '0')}`;
    return { MONTH: month, CLOSES: ledger.MONTHLY_CLOSES.filter(c => c.YEAR_MONTH === month),
      TAX_DUE: 'NOT_CALCULATED', COVERAGE: 'UNKNOWN' };
  });
  const current = masterRows.map(row => {
    const openingRow = opening.ROWS.find(o => o.ASSET === row.asset_identity);
    const closing = ledger.STATES[row.asset_identity];
    const derivedQty = closing?.QTY ?? null;
    const delta = derivedQty === null ? null : Number((row.package1a_quantity - derivedQty).toFixed(8));
    return { ASSET: row.asset_identity, AS_OF: '2026-10-10', CURRENT_QTY: row.package1a_quantity,
      CURRENT_AVG_COST_STATUS: row.average_cost_status, DERIVED_QTY: derivedQty, DELTA: delta,
      STATUS: derivedQty === null ? 'UNKNOWN' : 'PARTIAL',
      REASON: openingRow?.QTY_STATUS === 'CERTIFIED' ? 'SOURCE_DATE_OR_EVENT_COVERAGE_UNVERIFIED' : 'OPENING_2026_NOT_CERTIFIED',
      OPENING_SOURCE_ALLOWED: false };
  });
  const currentCertifiedFiscalUnknown = current.filter(row => row.CURRENT_AVG_COST_STATUS === 'CERTIFIED'
    && opening.ROWS.find(o => o.ASSET === row.ASSET)?.COST_STATUS !== 'CERTIFIED').map(row => row.ASSET);
  const pendingRuleIds = new Set(rulesNeedingExternalVerification(registry));
  const rulesToVerify = registry.RULES.filter(r => pendingRuleIds.has(r.RULE_ID)).map(r => ({
    RULE_ID: r.RULE_ID, STATUS: r.STATUS, SUBJECT: r.SCOPE, ASSET_CLASS: r.ASSET_CLASS, DATE_SCOPE: [r.EFFECTIVE_FROM, r.EFFECTIVE_TO],
    QUESTION_TO_VERIFY: r.NOTES, CURRENT_ENGINE_BEHAVIOR: 'TAX_DUE_NOT_CALCULATED', BLOCKS_OUTPUTS: ['IR_CALCULATION_READY'] }));
  const report = { FISCAL_YEAR: fiscalYear, SOURCE_BOUNDARY: '2019-2025 analytical; 2026 fiscal',
    OPENING: opening, LEDGER: ledger, MONTHLY_2026: monthRows, CERTIFICATION: certification,
    CURRENT_POSITION_CROSSCHECK: { STATUS: 'PARTIAL', AS_OF: '2026-10-10',
      COUNTS: { PARTIAL: current.filter(r => r.STATUS === 'PARTIAL').length, UNKNOWN: current.filter(r => r.STATUS === 'UNKNOWN').length, EXACT: 0 }, ROWS: current,
      CURRENT_COST_CERTIFIED_BUT_FISCAL_UNKNOWN_ASSETS: currentCertifiedFiscalUnknown },
    EVENT_COUNTS: { TOTAL: yearEvents.length, SOURCE_EVIDENCE_CERTIFIED: yearEvents.filter(e => e.STATUS === 'CERTIFIED').length,
      BY_TYPE: eventTypes, BY_FISCAL_STATUS: eventStatuses },
    UNKNOWN_FORENSICS: unknown, TAX_RULE_VERIFICATION_CHECKLIST: rulesToVerify,
    INPUT_HASHES: { EVENTS: sha256Json(rawEvents), MASTER: sha256Json(masterRows), RULES: registry.REGISTRY_SHA256 },
    HASHES: { OPENING: opening.SHA256, LEDGER: ledger.LEDGER_SHA256,
      MONTHLY_CLOSE: sha256Json(monthRows), ANNUAL_CLOSE: ledger.ANNUAL_CLOSE.ANNUAL_CLOSE_SHA256 },
    SIZES: { OPENING_2026_BYTES: Buffer.byteLength(JSON.stringify(opening)),
      EVENT_LEDGER_2026_BYTES: Buffer.byteLength(JSON.stringify(ledger.PROCESSING_RECORDS)),
      MONTHLY_CLOSE_BYTES: Buffer.byteLength(JSON.stringify(monthRows)),
      ANNUAL_CLOSE_BYTES: Buffer.byteLength(JSON.stringify(ledger.ANNUAL_CLOSE)) },
  };
  report.SIZES.FULL_FISCAL_PAYLOAD_BYTES = Buffer.byteLength(JSON.stringify(report));
  return report;
}

async function main() {
  const source = inventory.SOURCES.find(s => s.SOURCE_ID === 'SRC-CANON-MOVEMENTS');
  if (!source || source.AUTHORITY_LEVEL !== 'DERIVED' || source.INDEPENDENT_EVIDENCE !== false) throw new Error('source inventory identity invalid');
  const sourcePath = path.join(sourceDir, path.basename(source.FILE));
  const masterPath = path.join(package2Dir, 'package2-current-35-master-table-v2.json');
  const actualHash = await sha256File(sourcePath);
  if (actualHash !== source.SHA256) throw new Error('canonical source hash mismatch');
  const masterSource = inventory.SOURCES.find(s => s.SOURCE_ID === 'SRC-PKG2-MASTER35');
  const masterHash = await sha256File(masterPath);
  if (!masterSource || masterSource.AUTHORITY_LEVEL !== 'DERIVED' || masterSource.INDEPENDENT_EVIDENCE !== false
    || masterHash !== masterSource.SHA256) throw new Error('Package2 master source hash mismatch');
  const rawEvents = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const masterRows = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  if (rawEvents.length !== source.RAW_ROWS || masterRows.length !== 35) throw new Error('source record count mismatch');
  const report = buildDryRun(rawEvents, masterRows);
  const manifest = { SOURCES: [
    { SOURCE_ID: source.SOURCE_ID, SOURCE_PATH: sourcePath, SOURCE_TYPE: source.SOURCE_TYPE, SHA256: actualHash,
      AS_OF: source.PERIOD_END, PERIOD_START: source.PERIOD_START, PERIOD_END: source.PERIOD_END,
      LINEAGE: 'DERIVED_FROM_SRC-MOV-PRIMARY', AUTHORITY_LEVEL: 'DERIVED', FISCAL_USE_ALLOWED: true, INDEPENDENT_EVIDENCE: false },
    { SOURCE_ID: 'SRC-PKG2-MASTER35', SOURCE_PATH: masterPath, SOURCE_TYPE: 'DERIVED_ANALYTICAL_REPLAY', SHA256: masterHash,
      AS_OF: '2026-10-10', PERIOD_START: '2019-11-01', PERIOD_END: '2026-10-10',
      LINEAGE: 'PACKAGE2_FROM_CANONICAL_AND_OFFICIAL_POSITION', AUTHORITY_LEVEL: 'DERIVED', FISCAL_USE_ALLOWED: false, INDEPENDENT_EVIDENCE: false },
  ], INPUT_HASHES: report.INPUT_HASHES, OUTPUT_HASHES: report.HASHES };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'dry-run.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputDir, 'source-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ FISCAL_YEAR: fiscalYear, EVENT_COUNT: report.EVENT_COUNTS.TOTAL,
    OPENING_ASSETS: report.OPENING.COUNTS.ASSETS, EVENT_STATUS: report.EVENT_COUNTS.BY_FISCAL_STATUS,
    HASHES: report.HASHES, SIZES: report.SIZES, CERTIFICATION: Object.fromEntries(Object.entries(report.CERTIFICATION.LAYERS).map(([k, v]) => [k, v.STATUS])),
    OUTPUT: '.qa-state/ir2026 (private, ignored)' }));
}

if (require.main === module) main().catch(error => { console.error('IR2026_DRY_RUN_FAILED=' + error.message); process.exitCode = 1; });
module.exports = { buildDryRun, conservativeOpening, classifyEvent };
