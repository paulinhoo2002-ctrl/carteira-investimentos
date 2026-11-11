'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { sanitizeEvidence, sanitizeFile } = require('../scripts/sm70-sanitize-financial-evidence.js');

function fixture() {
  return {
    inputVersion: 1,
    asOfDate: '2026-11-05',
    coverage: { periodStart: '2025-01-01', periodEnd: '2026-11-05', status: 'COMPLETE', evidenceId: 'self-claimed' },
    sources: [{ key: 'private-account-source-id', kind: 'B3', filename: 'statement-private.pdf', cpf: 'not-exported' }],
    positions: [{ assetKey: 'private-asset-id', ticker: 'suzb3', asOfDate: '2026-11-05', quantity: 36, averagePrice: 42.63, sourceKey: 'private-account-source-id', owner: 'not-exported' }],
    openingPositions: [],
    movements: [{ eventKey: 'private-trade-id', sourceKey: 'private-account-source-id', assetKey: 'private-asset-id', occurredOn: '2026-10-01', type: 'BUY', status: 'CONFIRMED', quantity: 0, unitPrice: 0, duplicateState: 'NONE', relatedEventKey: '', cpf: 'not-exported' }],
    corporateEvents: [],
  };
}

test('SM70 sanitizer removes raw identifiers and private fields, aliases references, and remains unverified', () => {
  const output = sanitizeEvidence(fixture());
  assert.equal(output.coverage.status, 'INDETERMINADO');
  assert.equal(output.sanitization.proofStatus, 'UNVERIFIED');
  assert.equal(output.sources[0].id, 'source-001');
  assert.equal(output.positions[0].assetId, 'asset-001');
  assert.equal(output.positions[0].ticker, 'SUZB3');
  assert.equal(output.positions[0].quantity, 36);
  assert.equal(output.positions[0].averagePrice, 42.63);
  assert.equal(output.openingPositions.length, 0);
  assert.equal(output.movements[0].id, 'event-001');
  assert.equal(output.movements[0].quantity, 0);
  assert.equal(output.movements[0].unitPrice, 0);
  const serialized = JSON.stringify(output);
  for (const privateValue of ['private-account-source-id', 'private-asset-id', 'private-trade-id', 'statement-private.pdf', 'not-exported', 'evidenceId', 'self-claimed']) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test('SM70 sanitizer drops free-text ticker values that could expose personal names', () => {
  const input = fixture();
  input.positions[0].ticker = 'Paulo';
  const output = sanitizeEvidence(input);
  assert.equal(output.positions[0].ticker, null);
  assert.equal(JSON.stringify(output).includes('Paulo'), false);
});

test('SM70 sanitizer preserves missing values and does not fabricate an opening position', () => {
  const input = fixture();
  input.positions[0].quantity = undefined;
  input.positions[0].averagePrice = undefined;
  const output = sanitizeEvidence(input);
  assert.equal(output.positions[0].quantity, null);
  assert.equal(output.positions[0].averagePrice, null);
  assert.equal(output.openingPositions.length, 0);
  assert.equal(output.coverage.status, 'INDETERMINADO');
});

test('SM70 sanitizer preserves explicit opening quantity and corporate action ratio without claiming verification', () => {
  const input = fixture();
  input.openingPositions = [{ assetKey: 'private-asset-id', sourceKey: 'private-account-source-id', asOfDate: '2024-12-31', quantity: 0, averagePrice: undefined, status: 'UNKNOWN' }];
  input.corporateEvents = [{ eventKey: 'private-split-id', sourceKey: 'private-account-source-id', assetKey: 'private-asset-id', occurredOn: '2025-01-02', type: 'SPLIT', status: 'PENDING', ratioNumerator: 1, ratioDenominator: 10 }];
  const output = sanitizeEvidence(input);
  assert.equal(output.openingPositions[0].quantity, 0);
  assert.equal(output.openingPositions[0].averagePrice, null);
  assert.equal(output.corporateEvents[0].ratioNumerator, 1);
  assert.equal(output.corporateEvents[0].ratioDenominator, 10);
  assert.equal(output.corporateEvents[0].status, 'PENDING');
  assert.equal(output.coverage.status, 'INDETERMINADO');
});

test('SM70 sanitizer rejects a full-app backup shape and contradictory periods', () => {
  assert.throws(() => sanitizeEvidence({ ...fixture(), wallets: [] }), /Campo superior não permitido/);
  assert.throws(() => sanitizeEvidence({ ...fixture(), coverage: { periodStart: '2026-12-01', periodEnd: '2026-01-01' } }), /invertido/);
});

test('SM70 sanitizer writes only to an explicit new path outside the repository and leaves source intact', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sm70-sanitize-'));
  const sourcePath = path.join(directory, 'input.json');
  const outputPath = path.join(directory, 'sanitized.json');
  const original = JSON.stringify(fixture());
  try {
    fs.writeFileSync(sourcePath, original, 'utf8');
    const created = sanitizeFile(sourcePath, outputPath, { repositoryRoot: path.resolve(__dirname, '..') });
    assert.equal(created, outputPath);
    assert.equal(fs.readFileSync(sourcePath, 'utf8'), original);
    assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).sanitization.proofStatus, 'UNVERIFIED');
    assert.throws(() => sanitizeFile(sourcePath, outputPath, { repositoryRoot: path.resolve(__dirname, '..') }), /já existe/);
    assert.throws(() => sanitizeFile(sourcePath, path.join(path.resolve(__dirname, '..'), 'sanitized.json')), /fora do repositório/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
