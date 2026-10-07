const assert = require('node:assert/strict');
const test = require('node:test');
const Brokerage = require('../brokerage-professional.js');
const Pipeline = require('../protected-import-pipeline.js');
const ImportWorkflow = require('../import-center-workflow.js');
const ImportPreviewRenderer = require('../import-center-preview-renderer.js');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function splitSellNote(overrides = {}) {
  return {
    broker: 'Synthetic Broker', noteNumber: 'SYN-001', tradeDate: '2026-10-01', settlementDate: '2026-10-03',
    operations: [1, 94, 1, 211].map((quantity, index) => ({
      ticker: 'SYN1', side: 'SELL', quantity, unitPrice: '12,50', grossValue: (quantity * 12.5).toFixed(2),
      market: 'À vista', executionSequence: index + 1,
    })),
    fees: { settlement: '0,42', emoluments: '0,18', transfer: null, brokerage: null, taxes: null, other: null },
    irrf: { amount: '0,31', includedInSettlement: false, base: '3.837,50' },
    netSettlement: '3.836,90', ...overrides,
  };
}

test('V330 preserves four split raw executions under one normalized sell without inferring profit', () => {
  const preview = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001', sourceHash: 'synthetic-hash' });
  assert.equal(preview.rawExecutions.length, 4);
  assert.equal(preview.normalizedTransactions.length, 1);
  assert.equal(preview.normalizedTransactions[0].quantity, '307');
  assert.deepEqual(preview.normalizedTransactions[0].rawExecutionIds, preview.rawExecutions.map(item => item.rawRowIdentity));
  assert.equal(preview.normalizedTransactions[0].grossValueCents, 383750);
  assert.equal(preview.normalizedTransactions[0].realizedPnlStatus, 'RESULT_NOT_AVAILABLE');
  assert.equal(preview.writeCount, 0);
  assert.equal(preview.financialWrite, false);
});

test('V330 preserves mixed buy/sell rows, separate note fee components, IRRF and settlement evidence', () => {
  const note = splitSellNote({
    operations: [
      { ticker: 'SYN1', side: 'BUY', quantity: '2', unitPrice: '10,00', grossValue: '20,00', market: 'À vista', executionSequence: 1 },
      { ticker: 'SYN1', side: 'BUY', quantity: '3', unitPrice: '10,00', grossValue: '30,00', market: 'À vista', executionSequence: 2 },
      { ticker: 'SYN2', side: 'SELL', quantity: '4', unitPrice: '8,00', grossValue: '32,00', market: 'À vista', executionSequence: 3 },
    ],
    fees: { settlement: '0,10', emoluments: '0,20', transfer: '0,30', brokerage: '0,40', taxes: '0,50', other: '0,60' },
    irrf: { amount: '0,05', includedInSettlement: false, base: '32,00' },
    netSettlement: '30,85',
  });
  const preview = Brokerage.buildNotePreview(note, { sourceId: 'fixture:SYN-MIXED' });
  assert.equal(preview.rawExecutions.length, 3);
  assert.deepEqual(preview.normalizedTransactions.map(item => item.side), ['BUY', 'SELL']);
  assert.equal(preview.normalizedTransactions[0].quantity, '5');
  assert.equal(preview.noteFinancials.irrf.amountCents, 5);
  assert.equal(preview.noteFinancials.irrf.includedInSettlement, false);
  assert.equal(preview.noteFinancials.fees.allocation, 'UNALLOCATED');
  assert.deepEqual(preview.noteFinancials.fees.components, { settlement: 10, emoluments: 20, transfer: 30, brokerage: 40, taxes: 50, other: 60 });
  assert.equal(preview.noteFinancials.netSettlementCents, 3085);
  assert.equal(preview.writeCount, 0);
});

test('V330 duplicate replay is idempotent and changed content under same note identity conflicts', () => {
  const first = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  const replay = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' }, [first.note]);
  const changed = Brokerage.buildNotePreview(splitSellNote({ operations: [{ ticker: 'SYN1', side: 'SELL', quantity: 2, unitPrice: '12,50', grossValue: '25,00', market: 'À vista', executionSequence: 1 }] }), { sourceId: 'fixture:SYN-001' }, [first.note]);
  assert.equal(replay.duplicate.state, 'EXACT_DUPLICATE');
  assert.equal(replay.writeCount, 0);
  assert.equal(changed.duplicate.state, 'CONFLICT');
  assert.equal(changed.importReadiness.state, 'HUMAN_DATA_REQUIRED');
});

test('V330 preserves unsupported raw side in note identity conflict detection', () => {
  const first = Brokerage.buildNotePreview(splitSellNote({ operations: [{ ticker: 'SYN1', side: 'HOLD', quantity: 2, unitPrice: '12,50', grossValue: '25,00', market: 'À vista', executionSequence: 1 }] }), { sourceId: 'fixture:SYN-001' });
  const changed = Brokerage.buildNotePreview(splitSellNote({ operations: [{ ticker: 'SYN1', side: 'TRANSFER', quantity: 2, unitPrice: '12,50', grossValue: '25,00', market: 'À vista', executionSequence: 1 }] }), { sourceId: 'fixture:SYN-001' }, [first.note]);
  assert.equal(changed.duplicate.state, 'CONFLICT');
  assert.equal(changed.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.equal(changed.writeCount, 0);
});

test('V330 unknown side, unresolved asset and missing note identity fail closed', () => {
  const unknownSide = Brokerage.buildNotePreview(splitSellNote({ operations: [{ ticker: 'SYN1', side: 'HOLD', quantity: 1, unitPrice: 1, grossValue: 1 }] }));
  const unknownAsset = Brokerage.buildNotePreview(splitSellNote({ operations: [{ side: 'SELL', quantity: 1, unitPrice: 1, grossValue: 1 }] }));
  const missingIdentity = Brokerage.buildNotePreview(splitSellNote({ broker: '', noteNumber: '', tradeDate: '' }));
  assert.equal(unknownSide.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.equal(unknownAsset.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.equal(missingIdentity.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.equal(unknownSide.writeCount + unknownAsset.writeCount + missingIdentity.writeCount, 0);
});

test('V330 source file id cannot replace broker, note number and trade date identity', () => {
  const missingNumber = Brokerage.buildNotePreview(splitSellNote({ noteNumber: '' }), { sourceId: 'synthetic-file-id' });
  assert.equal(missingNumber.sourceIdentity.state, 'UNKNOWN');
  assert.equal(missingNumber.duplicate.state, 'UNKNOWN');
  assert.equal(missingNumber.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.ok(missingNumber.reasonCodes.includes('NOTE_IDENTITY_UNRESOLVED'));
  const missingBrokerAndNumber = Brokerage.buildNotePreview(splitSellNote({ broker: '', noteNumber: '', operations: [1, 2].map((quantity, index) => ({ ticker: 'SYN1', side: 'SELL', quantity, unitPrice: '12,50', grossValue: (quantity * 12.5).toFixed(2), market: 'À vista', executionSequence: index + 1 })) }), { sourceId: 'synthetic-file-id' });
  assert.equal(missingBrokerAndNumber.normalizedTransactions.length, 2, 'rows cannot be consolidated without the governed note identity');
});

test('V330 invalid, zero, negative and unsupported precision quantities fail closed', () => {
  for (const quantity of ['0', '-1', '1e21', '1.123456789']) {
    const preview = Brokerage.buildNotePreview(splitSellNote({ operations: [{ ticker: 'SYN1', side: 'SELL', quantity, unitPrice: '12,50', grossValue: '25,00', market: 'À vista', executionSequence: 1 }] }));
    assert.equal(preview.importReadiness.state, 'HUMAN_DATA_REQUIRED', `quantity ${quantity}`);
    assert.ok(preview.reasonCodes.includes('EXECUTION_QUANTITY_INVALID'), `quantity ${quantity}`);
    assert.equal(preview.normalizedTransactions[0].quantity, '', `quantity ${quantity}`);
    assert.equal(preview.writeCount, 0);
  }
});

test('V330 rejects execution gross that conflicts with quantity times unit price', () => {
  const preview = Brokerage.buildNotePreview(splitSellNote({
    operations: [{ ticker: 'SYN1', side: 'SELL', quantity: 1, unitPrice: '10,00', grossValue: '100,00', market: 'À vista', executionSequence: 1 }],
    fees: { settlement: '0,00', emoluments: '0,00', transfer: '0,00', brokerage: '0,00', taxes: '0,00', other: '0,00' },
    irrf: { amount: '0,00', includedInSettlement: true, base: '0,00' },
    netSettlement: '100,00',
  }));
  assert.equal(preview.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.ok(preview.reasonCodes.includes('EXECUTION_VALUE_MISMATCH'));
  assert.equal(preview.writeCount, 0);
});

test('V330 missing execution gross stays unknown and cannot be presented as a zero total', () => {
  const preview = Brokerage.buildNotePreview(splitSellNote({
    operations: [{ ticker: 'SYN1', side: 'SELL', quantity: 2, unitPrice: '12,50', market: 'À vista', executionSequence: 1 }],
  }));
  assert.equal(preview.rawExecutions[0].grossValueCents, null);
  assert.equal(preview.normalizedTransactions[0].grossValueCents, null);
  assert.equal(preview.noteFinancials.grossSalesCents, null);
  assert.equal(preview.importReadiness.state, 'HUMAN_DATA_REQUIRED');
});

test('V330 unsafe monetary integers remain unknown instead of becoming financial values', () => {
  const preview = Brokerage.buildNotePreview(splitSellNote({
    operations: [{ ticker: 'SYN1', side: 'SELL', quantity: 2, unitPrice: Number.MAX_SAFE_INTEGER, grossValue: Number.MAX_SAFE_INTEGER, market: 'À vista', executionSequence: 1 }],
    netSettlement: Number.MAX_SAFE_INTEGER,
  }));
  assert.equal(preview.rawExecutions[0].unitPriceCents, null);
  assert.equal(preview.rawExecutions[0].grossValueCents, null);
  assert.equal(preview.noteFinancials.netSettlementCents, null);
  assert.equal(preview.importReadiness.state, 'HUMAN_DATA_REQUIRED');
});

test('V330 keeps same-day asset executions in different notes separate and unknown fees unknown', () => {
  const first = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  const second = Brokerage.buildNotePreview(splitSellNote({ noteNumber: 'SYN-002' }), { sourceId: 'fixture:SYN-002' });
  const unknownFees = Brokerage.buildNotePreview(splitSellNote({ fees: {}, irrf: {} }));
  assert.notEqual(first.note.NOTE_IDENTITY, second.note.NOTE_IDENTITY);
  assert.equal(first.normalizedTransactions[0].noteIdentity, first.note.NOTE_IDENTITY);
  assert.equal(unknownFees.noteFinancials.fees.status, 'UNKNOWN');
  assert.equal(unknownFees.noteFinancials.irrf.status, 'UNKNOWN');
});

test('V330 marks same-day matching app movement as possible duplicate instead of collapsing it', () => {
  const candidate = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  const existing = [{ source: 'MANUAL', operation: 'SELL', date: '2026-10-01', ticker: 'SYN1', quantity: '307', unitPrice: 12.5, grossValue: 3837.5 }];
  const preview = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' }, [], existing);
  assert.equal(candidate.normalizedTransactions.length, 1);
  assert.equal(preview.duplicateGuard[0].state, 'POSSIBLE_DUPLICATE');
  assert.equal(preview.importReadiness.state, 'HUMAN_DATA_REQUIRED');
  assert.equal(preview.normalizedTransactions.length, 1);
});

test('V330 renderer exposes raw executions, status text and note-level financial summary accessibly', () => {
  assert.equal(typeof Brokerage.renderNotePreview, 'function');
  const preview = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  const html = Brokerage.renderNotePreview(preview, value => String(value));
  assert.match(html, /Resumo da nota/);
  assert.match(html, /Execuções brutas/);
  assert.match(html, /role="status"/);
  assert.match(html, /<details><summary>Execuções da nota/);
  assert.match(html, /Não calculado/);
  assert.match(html, /Prévia sem gravação/);
  assert.doesNotMatch(html, /HUMAN_DATA_REQUIRED|NOTE_LEVEL_FEES_INCOMPLETE|UNKNOWN ·/);
});

test('V330 renderer distinguishes an already processed source note from matching movements', () => {
  const first = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  const replay = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' }, [first.note]);
  const html = Brokerage.renderNotePreview(replay);
  assert.match(html, /Esta nota já foi processada/);
  assert.match(html, /Tipo de fonte<\/dt><dd>Nota de corretagem/);
  assert.match(html, /Corretora<\/dt><dd>Synthetic Broker/);
  assert.match(html, /Nota já processada<\/dt><dd>Sim/);
  assert.match(html, /Movimentações idênticas<\/dt><dd>0/);
  assert.doesNotMatch(html, /DUPLICATE_CANDIDATE|EXACT_DUPLICATE_SOURCE/);
});

test('V330 protected dry-run pipeline keeps raw rows, grouped transactions and zero writes', () => {
  const source = { sourceType: 'BROKERAGE_NOTE_PDF', note: splitSellNote(), sourceId: 'fixture:SYN-001' };
  const parsed = Pipeline.parseSource(source, Pipeline.detectSource(source));
  assert.equal(parsed.notePreview.rawExecutions.length, 4);
  assert.equal(parsed.newRecords.length, 1);
  assert.equal(parsed.events.length, 4);
  assert.equal(parsed.writeCount, 0);
  assert.equal(parsed.financialWrite, false);
});

test('V330 blocked dry-run preserves different assets and distinct notes as separate review candidates', () => {
  const note = (noteNumber, operations) => ({
    broker: 'Synthetic Broker', noteNumber, tradeDate: '2026-10-01', settlementDate: '2026-10-03', operations,
    fees: { settlement: '0,00', emoluments: '0,00', transfer: '0,00', brokerage: '0,00', taxes: '0,00', other: '0,00' },
    irrf: { amount: '0,00', includedInSettlement: true, base: '0,00' }, netSettlement: '20,00',
  });
  const operation = ticker => ({ ticker, side: 'BUY', quantity: 1, unitPrice: '10,00', grossValue: '10,00', market: 'À vista' });
  const session = Pipeline.buildDryRunSession({ sources: [
    { sourceType: 'BROKERAGE_NOTE_PDF', note: note('SYN-101', [operation('SYN1'), operation('SYN2')]), sourceId: 'synthetic-file-101' },
    { sourceType: 'BROKERAGE_NOTE_PDF', note: note('SYN-102', [operation('SYN1'), operation('SYN2')]), sourceId: 'synthetic-file-102' },
  ] });
  const transactions = session.plan.RECORDS_TO_ADD.transactions;
  assert.equal(transactions.length, 4);
  assert.equal(session.crossSource.NEW_DUPLICATE_RECORDS, 0);
  assert.deepEqual(new Set(transactions.map(item => item.assetCanonicalId)), new Set(['ticker:SYN1', 'ticker:SYN2']));
  assert.equal(new Set(transactions.map(item => item.noteIdentity)).size, 2);
  assert.equal(session.plan.STATE, 'VALIDATION_FAILED');
  assert.equal(session.plan.RECORDS_REQUIRING_REVIEW.length, 2);
  assert.throws(() => Pipeline.executeDryRun(session), /UNRESOLVED_REVIEW_ITEMS/);
});

test('V330 review flow carries preview data to the accessible Import Center renderer', async () => {
  const preview = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  let opened;
  const result = await ImportWorkflow.openReviewForFile({ name: 'synthetic-note.pdf' }, {
    parsePdf: async () => ({ status: 'READY_FOR_REVIEW', provider: 'INTER', sourceType: 'BROKERAGE_NOTE_PDF', notePreview: preview, recordCount: 1 }),
    openReview: payload => { opened = payload; return true; },
  });
  const html = ImportPreviewRenderer.render({ result, escapeText: value => String(value), renderNotePreview: Brokerage.renderNotePreview });
  assert.equal(opened.notePreview, preview);
  assert.equal(result.notePreview, preview);
  assert.match(html, /Resumo da nota/);
  assert.match(html, /4 execuções/);
  assert.match(html, /Registros gravados<\/b> 0/);
});

test('V330 browser route renders the read-only note preview and keeps the domain model writer-free', () => {
  const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const model = fs.readFileSync(path.join(root, 'brokerage-professional.js'), 'utf8');
  assert.match(app, /<script src="brokerage-professional\.js"><\/script>/);
  assert.match(app, /parsed\.v330Preview=BrokerageProfessional\.buildNotePreview/);
  assert.match(app, /BrokerageProfessional\.renderNotePreview\(state\.v330Preview,esc\)/);
  for (const forbidden of [/localStorage/, /sessionStorage/, /Firestore/, /Firebase/, /addDoc/, /updateDoc/, /setDoc/, /\.save\s*\(/]) assert.equal(forbidden.test(model), false);
});

test('V330 deterministic fingerprint includes settlement and fee evidence', () => {
  const original = Brokerage.buildNotePreview(splitSellNote(), { sourceId: 'fixture:SYN-001' });
  const changedSettlement = Brokerage.buildNotePreview(splitSellNote({ settlementDate: '2026-10-04' }), { sourceId: 'fixture:SYN-001' }, [original.note]);
  const changedFee = Brokerage.buildNotePreview(splitSellNote({ fees: { settlement: '0,43', emoluments: '0,18', transfer: null, brokerage: null, taxes: null, other: null } }), { sourceId: 'fixture:SYN-001' }, [original.note]);
  assert.equal(changedSettlement.duplicate.state, 'CONFLICT');
  assert.equal(changedFee.duplicate.state, 'CONFLICT');
});

test('V330 synthetic reconciliation scales across 1, 10 and 100 notes', () => {
  const measurements = [];
  for (const size of [1, 10, 100]) {
    const started = performance.now();
    const results = Array.from({ length: size }, (_, index) => Brokerage.buildNotePreview(splitSellNote({ noteNumber: `SYN-${index}` }), { sourceId: `fixture:SYN-${index}` }));
    measurements.push({ size, elapsedMs: Number((performance.now() - started).toFixed(2)), raw: results.reduce((sum, item) => sum + item.rawExecutions.length, 0), normalized: results.reduce((sum, item) => sum + item.normalizedTransactions.length, 0) });
    assert.equal(results.every(item => item.writeCount === 0 && item.financialWrite === false), true);
    assert.equal(measurements.at(-1).raw, size * 4);
    assert.equal(measurements.at(-1).normalized, size);
  }
  console.log('V330 synthetic benchmark:', JSON.stringify(measurements));
});
