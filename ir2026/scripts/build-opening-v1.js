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
const { loadPrivateSourceInventory } = require('../private-source-inventory');
const sourceDir = process.env.IR2026_SOURCE_DIR || path.resolve(root, '../v012-mega-12-lifetime-redesign/.qa-state/canonical-analysis');
const package2Dir = process.env.IR2026_PACKAGE2_DIR || path.resolve(root, '../legacy-package2-2026-history');
const outputDir = path.join(root, '.qa-state/ir2026/opening-evidence');

async function main() {
  const inventory = loadPrivateSourceInventory(root);
  const source = inventory.SOURCES.find((s) => s.SOURCE_ID === 'SRC-CANON-MOVEMENTS');
  const sourcePath = path.join(sourceDir, path.basename(source.FILE));
  const sourceHash = await sha256File(sourcePath);
  if (sourceHash !== source.SHA256) throw new Error('canonical source hash mismatch');
  const masterSource = inventory.SOURCES.find((s) => s.SOURCE_ID === 'SRC-PKG2-MASTER35');
  if (!masterSource) throw new Error('Package2 master source missing');
  const masterPath = path.join(package2Dir, path.basename(masterSource.FILE));
  const masterHash = await sha256File(masterPath);
  if (masterHash !== masterSource.SHA256) throw new Error('master source hash mismatch');

  const rawEvents = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const masterRows = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const registry = loadRegistry();
  const anchors = Object.fromEntries(masterRows.map((row) => [row.asset_identity, { QTY: null, AS_OF: masterSource.PERIOD_END, ASSET_CLASS: row.asset_class }]));

  const first = buildOpeningV1({ rawEvents, anchors, registry, historyStart: source.PERIOD_START });
  const second = buildOpeningV1({ rawEvents, anchors, registry, historyStart: source.PERIOD_START });
  if (first.SHA256 !== second.SHA256) throw new Error('opening v1 is nondeterministic');
  for (const row of first.OPENING_FISCAL_2026_V1) row.SOURCE_HASH = sourceHash;
  first.INPUT_HASHES = { EVENTS: first.SHA256 && require('../hash').sha256Json(rawEvents), SOURCE_SHA256: sourceHash, MASTER_SHA256: masterHash, RULES: registry.REGISTRY_SHA256 };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'opening-fiscal-2026-v1.json'), JSON.stringify(first, null, 2));

  const safeSummary = {
    ARTIFACT: 'OPENING_FISCAL_2026_V1',
    FISCAL_YEAR: first.FISCAL_YEAR,
    DETERMINISTIC: true,
    OPENING_STATUS: first.OFFICIAL_2025_YEAR_END_EVIDENCE === 'NOT_FOUND' ? 'NOT_CERTIFIED' : 'REVIEW_REQUIRED',
    OFFICIAL_YEAR_END_EVIDENCE: first.OFFICIAL_2025_YEAR_END_EVIDENCE,
    TAX_PAYABLE_STATUS: first.TAX_PAYABLE_STATUS,
    DETAILS: 'PRIVATE_LOCAL_ONLY',
  };
  fs.writeFileSync(path.join(root, 'ir2026', 'opening-v1-summary.json'), JSON.stringify(safeSummary, null, 2));

  console.log(JSON.stringify({
    ARTIFACT: 'opening-fiscal-2026-v1',
    DETERMINISTIC: true,
    OPENING_STATUS: safeSummary.OPENING_STATUS,
    TAX_PAYABLE_STATUS: safeSummary.TAX_PAYABLE_STATUS,
    OUTPUT: '.qa-state/ir2026/opening-evidence (private, ignored)',
  }));
}

if (require.main === module) main().catch((error) => { console.error('OPENING_V1_FAILED=' + error.message); process.exitCode = 1; });
