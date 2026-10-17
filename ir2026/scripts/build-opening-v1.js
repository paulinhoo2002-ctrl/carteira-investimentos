'use strict';

// Local-only runner: real data stays under ignored .qa-state/ir2026.
// Hash-verifies every source (like build-fiscal-2026), builds the v1
// opening evidence artifact twice for determinism, writes the private
// artifact and prints a safe summary (counts/statuses/hashes only).
const fs = require('node:fs');
const path = require('node:path');
const { buildOpeningV1 } = require('../opening-v1');
const { loadRegistry } = require('../rules');
const { sha256File } = require('../hash');

const root = path.resolve(__dirname, '../..');
const inventory = require('../sources/source-inventory.json');
const sourceDir = process.env.IR2026_SOURCE_DIR || path.resolve(root, '../v012-mega-12-lifetime-redesign/.qa-state/canonical-analysis');
const package2Dir = process.env.IR2026_PACKAGE2_DIR || path.resolve(root, '../legacy-package2-2026-history');
const outputDir = path.join(root, '.qa-state/ir2026/opening-evidence');

async function main() {
  const source = inventory.SOURCES.find((s) => s.SOURCE_ID === 'SRC-CANON-MOVEMENTS');
  const sourcePath = path.join(sourceDir, path.basename(source.FILE));
  const sourceHash = await sha256File(sourcePath);
  if (sourceHash !== source.SHA256) throw new Error('canonical source hash mismatch');
  const masterPath = path.join(package2Dir, 'package2-current-35-master-table-v2.json');
  const masterSource = inventory.SOURCES.find((s) => s.SOURCE_ID === 'SRC-PKG2-MASTER35');
  const masterHash = await sha256File(masterPath);
  if (masterHash !== masterSource.SHA256) throw new Error('master source hash mismatch');

  const rawEvents = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const masterRows = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const registry = loadRegistry();
  const anchors = Object.fromEntries(masterRows.map((row) => [row.asset_identity, { QTY: null, AS_OF: '2026-10-10', ASSET_CLASS: row.asset_class }]));

  const first = buildOpeningV1({ rawEvents, anchors, registry });
  const second = buildOpeningV1({ rawEvents, anchors, registry });
  if (first.SHA256 !== second.SHA256) throw new Error('opening v1 is nondeterministic');
  for (const row of first.OPENING_FISCAL_2026_V1) row.SOURCE_HASH = sourceHash;
  first.INPUT_HASHES = { EVENTS: first.SHA256 && require('../hash').sha256Json(rawEvents), SOURCE_SHA256: sourceHash, MASTER_SHA256: masterHash, RULES: registry.REGISTRY_SHA256 };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'opening-fiscal-2026-v1.json'), JSON.stringify(first, null, 2));

  // Public, non-sensitive certification metadata (counts/statuses/hashes only).
  const c = first.OPENING_COVERAGE;
  const m = first.SALES_FORENSIC_MATRIX;
  const inv = first.EVIDENCE_INVENTORY;
  const safeSummary = {
    ARTIFACT: 'OPENING_FISCAL_2026_V1',
    FISCAL_YEAR: first.FISCAL_YEAR,
    EVIDENCE_AUTHORITY: first.EVIDENCE_AUTHORITY,
    OFFICIAL_2025_YEAR_END_EVIDENCE: first.OFFICIAL_2025_YEAR_END_EVIDENCE,
    TAX_PAYABLE_STATUS: first.TAX_PAYABLE_STATUS,
    DETERMINISTIC: true,
    OPENING: {
      ASSET_COUNT: c.OPENING_ASSET_COUNT,
      HELD_CANDIDATES: c.OPENING_HELD_CANDIDATES,
      STATUS_COUNTS: { CERTIFIED: c.OPENING_CERTIFIED, DERIVED: c.OPENING_DERIVED, PARTIAL: c.OPENING_PARTIAL, UNKNOWN: c.OPENING_UNKNOWN },
      COST_COVERAGE_PERCENT: c.OPENING_COST_COVERAGE_PERCENT,
      COST_CLEAN_DERIVED_PERCENT: c.OPENING_COST_CLEAN_DERIVED_PERCENT,
    },
    SALES_2026: { TOTAL: m.SALES_2026_TOTAL, DERIVED_SIMULATION: m.SALES_WITH_DERIVED_SIMULATED_COST, BLOCKED: m.SALES_BLOCKED, CERTIFIED: m.SALES_WITH_CERTIFIED_COST },
    DAY_TRADE_SELLS: first.DAY_TRADE.DAY_TRADE_SELL_EVENTS,
    SWING_TRADE_SELLS: first.DAY_TRADE.SWING_TRADE_SELL_EVENTS,
    FEES_STATUS: inv.FEES.STATUS,
    IRRF_STATUS: inv.IRRF.STATUS,
    PRIOR_LOSSES_STATUS: inv.PRIOR_LOSSES.STATUS,
    CORPORATE_ACTION_BLOCKER_ASSETS: first.CORPORATE_ACTION_BLOCKERS.length,
    SHA256: first.SHA256,
    NOTE: 'Real values stay under .qa-state (gitignored). This summary carries only counts, statuses and hashes.',
  };
  fs.writeFileSync(path.join(root, 'ir2026', 'opening-v1-summary.json'), JSON.stringify(safeSummary, null, 2));

  console.log(JSON.stringify({
    ARTIFACT: 'opening-fiscal-2026-v1',
    DETERMINISTIC: true,
    OPENING_ASSET_COUNT: c.OPENING_ASSET_COUNT,
    OPENING_HELD_CANDIDATES: c.OPENING_HELD_CANDIDATES,
    OPENING_POTENTIALLY_HELD: c.OPENING_POTENTIALLY_HELD,
    OPENING_STATUS: { CERTIFIED: c.OPENING_CERTIFIED, DERIVED: c.OPENING_DERIVED, PARTIAL: c.OPENING_PARTIAL, UNKNOWN: c.OPENING_UNKNOWN },
    OPENING_COST_COVERAGE_PERCENT: c.OPENING_COST_COVERAGE_PERCENT,
    OPENING_COST_CLEAN_DERIVED_PERCENT: c.OPENING_COST_CLEAN_DERIVED_PERCENT,
    SALES_2026_TOTAL: m.SALES_2026_TOTAL,
    SALES_DERIVED_SIMULATED: m.SALES_WITH_DERIVED_SIMULATED_COST,
    SALES_BLOCKED: m.SALES_BLOCKED,
    DAY_TRADE_SELLS: first.DAY_TRADE.DAY_TRADE_SELL_EVENTS,
    SWING_SELLS: first.DAY_TRADE.SWING_TRADE_SELL_EVENTS,
    FEES_STATUS: inv.FEES.STATUS,
    IRRF_STATUS: inv.IRRF.STATUS,
    PRIOR_LOSSES_STATUS: inv.PRIOR_LOSSES.STATUS,
    CORPORATE_ACTION_BLOCKERS: first.CORPORATE_ACTION_BLOCKERS.length,
    TAX_PAYABLE_STATUS: first.TAX_PAYABLE_STATUS,
    SHA256: first.SHA256,
    OUTPUT: '.qa-state/ir2026/opening-evidence (private, ignored)',
  }));
}

if (require.main === module) main().catch((error) => { console.error('OPENING_V1_FAILED=' + error.message); process.exitCode = 1; });
