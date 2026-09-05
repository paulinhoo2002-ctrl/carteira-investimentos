const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('latest contribution rows expose a safe repeat action', () => {
  assert.match(source, /class="aporte-repeat-btn"/);
  assert.match(source, /const canRepeat=aporteMovementKind\(row\)==='compra'/);
  assert.match(source, /repeatContribution\(\$\{JSON\.stringify\(row\.id\)\}\)/);
  assert.match(source, /aria-label="Repetir aporte de \$\{esc\(ticker\)\}"/);
});

test('repeat contribution remains a draft-only action', () => {
  const start = source.indexOf('function repeatContribution(id){');
  const end = source.indexOf('function parseQuickMovementNumber', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const handler = source.slice(start, end);
  assert.match(handler, /S\.quickMovementDraft=draft/);
  assert.match(handler, /S\.quickMovementOpen=true/);
  assert.doesNotMatch(handler, /save\(\)/);
});

test('quick contribution keeps the existing official save path', () => {
  const start = source.indexOf('function saveQuickMovement(){');
  const end = source.indexOf('function focusQuickMovementError', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const handler = source.slice(start, end);
  assert.match(handler, /S\.aportes\.unshift\(reg\)/);
  assert.match(handler, /syncAssetsFromAportes\(false\)/);
  assert.match(handler, /S\.quickMovementSaving/);
});
