'use strict';

// Local-only report: real asset rows stay under ignored .qa-state/ir2026.
const fs = require('node:fs');
const path = require('node:path');
const { analyzeOpeningEvidence } = require('../opening-evidence');
const { sha256File } = require('../hash');
const inventory = require('../sources/source-inventory.json');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const source = inventory.SOURCES.find(s => s.SOURCE_ID === 'SRC-CANON-MOVEMENTS');
  const sourceDir = process.env.IR2026_SOURCE_DIR || path.resolve(root, '../v012-mega-12-lifetime-redesign/.qa-state/canonical-analysis');
  const sourcePath = path.join(sourceDir, path.basename(source.FILE));
  if (await sha256File(sourcePath) !== source.SHA256) throw new Error('canonical source hash mismatch');
  const dryRun = JSON.parse(fs.readFileSync(path.join(root, '.qa-state/ir2026/dry-run.json'), 'utf8'));
  const events = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (dryRun.INPUT_HASHES.EVENTS !== require('../hash').sha256Json(events)) throw new Error('dry-run event hash mismatch');
  const first = analyzeOpeningEvidence(dryRun, events);
  const second = analyzeOpeningEvidence(dryRun, events);
  if (first.SHA256 !== second.SHA256) throw new Error('opening evidence analysis is nondeterministic');
  const output = path.join(root, '.qa-state/ir2026/opening-evidence');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'candidate-v2.json'), JSON.stringify(first, null, 2));
  console.log(JSON.stringify({ ...first.AGGREGATE, EVIDENCE_PRIORITY: first.EVIDENCE_PRIORITY,
    PRIVATE_REPORT_SHA256: first.SHA256, DETERMINISTIC: true, OUTPUT: '.qa-state/ir2026/opening-evidence (ignored)' }));
}

if (require.main === module) main().catch(error => { console.error('OPENING_EVIDENCE_FAILED=' + error.message); process.exitCode = 1; });
