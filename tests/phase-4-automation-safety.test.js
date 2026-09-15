const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('Phase 4 automation foundation keeps durable safety contract', () => {
  const map = read('docs/ai/PHASE_4_AUTOMATION_MAP.md');
  for (const contract of [
    'NO_SILENT_FINANCIAL_WRITE=true',
    'NO_AUTOMATIC_BUY_SELL=true',
    'NO_APPROXIMATE_ASSET_MATCHING=true',
    'IMPORT_REQUIRES_PREVIEW=true',
    'PERSISTENT_CHANGE_REQUIRES_EXPLICIT_USER_ACTION=true',
    'BACKGROUND_EXTERNAL_FETCH_REQUIRES_EXPLICIT_SCOPE=true',
    'FROZEN_SCREENS_MUST_NOT_BE_REDESIGNED=true'
  ]) assert.match(map, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Phase 4 map records existing protected automation anchors', () => {
  const map = read('docs/ai/PHASE_4_AUTOMATION_MAP.md');
  for (const anchor of [
    'S.qInFlight',
    'rfIntelligenceSnapshot()',
    'assetRfMaturityDate()',
    'IMPORT_REQUIRES_PREVIEW=true',
    'Firebase/Auth/sync/conflict handling remain protected'
  ]) assert.match(map, new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Phase 4 does not introduce a second financial or persistence engine', () => {
  const index = read('index.html');
  assert.doesNotMatch(index, /phase-4-automation-map|NO_SILENT_FINANCIAL_WRITE/);
  assert.ok(fs.existsSync('finance-core.js'));
  assert.ok(fs.existsSync('persistence-core.js'));
});
