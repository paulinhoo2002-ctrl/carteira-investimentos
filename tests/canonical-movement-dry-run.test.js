const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../canonical-movement-dry-run.js');

test('movement precedence keeps redemptions, settlement and unqualified income out of received totals', () => {
  assert.equal(Engine.classifyMovement('Resgate de rendimento').kind, 'RF_REDEMPTION_CANDIDATE');
  assert.equal(Engine.classifyMovement('Transferência liquidação').kind, 'SETTLEMENT_CANDIDATE');
  assert.equal(Engine.classifyMovement('Transferência com liquidação').kind, 'SETTLEMENT_CANDIDATE');
  assert.equal(Engine.classifyMovement('Rendimento').incomeStatus, 'UNKNOWN');
  assert.equal(Engine.classifyMovement('JCP').incomeStatus, 'RECEIVED');
  assert.equal(Engine.classifyMovement('Juros sobre capital próprio').kind, 'JCP');
  assert.equal(Engine.classifyMovement('Juros - sobre capital próprio').kind, 'JCP');
  assert.equal(Engine.classifyMovement('Juros sobre capital próprios').kind, 'JCP');
  assert.equal(Engine.classifyMovement('Juros - sobre o capital próprio').kind, 'JCP');
  assert.equal(Engine.classifyMovement('Recebimento de JCP').incomeStatus, 'RECEIVED');
  assert.equal(Engine.classifyMovement('Juros sobre capital próprio recebido').incomeStatus, 'RECEIVED');
  assert.equal(Engine.classifyMovement('Dividendo declarado').incomeStatus, 'EXPECTED');
  assert.equal(Engine.classifyMovement('Transferência de liquidação').kind, 'SETTLEMENT_CANDIDATE');
  assert.equal(Engine.classifyMovement('Dividendo').incomeStatus, 'RECEIVED');
  assert.equal(Engine.classifyMovement('Amortização').incomeStatus, 'EXCLUDED');
  assert.equal(Engine.classifyMovement('Compra').kind, 'BUY');
  assert.equal(Engine.classifyMovement('Venda').kind, 'SELL');
  assert.equal(Engine.classifyMovement('Compra e venda').reasonCode, 'CONFLICTING_MOVEMENT_LABELS');
  assert.equal(Engine.classifyMovement('Aplicação renda fixa').kind, 'RF_APPLICATION_CANDIDATE');
  assert.equal(Engine.classifyMovement('Transferência recebida').kind, 'TRANSFER_IN');
  assert.equal(Engine.classifyMovement('Transferência enviada').kind, 'TRANSFER_OUT');
});

test('canonical preview links a supporting subset and retains unresolved repeated rows', () => {
  const row = (rawRecordId, rowFingerprint, movement='Compra') => ({ rawRecordId, rowFingerprint, date:'2026-01-02', movement, assetKey:'asset-a', quantity:'1', amountCents:1000 });
  const result = Engine.canonicalizeSources([
    { sourceId:'PRIMARY', role:'PRIMARY', rows:[row('p1','a'.repeat(64)),row('p2','a'.repeat(64)),row('p3','b'.repeat(64))] },
    { sourceId:'SUBSET', role:'SUPPORTING', rows:[row('s1','a'.repeat(64)),row('s2','b'.repeat(64)),row('s3','c'.repeat(64))] },
  ]);
  assert.equal(result.writeEnabled, false);
  assert.equal(result.canonicalRecords.length, 3);
  assert.equal(result.summary.supportingOverlaps, 2);
  assert.equal(result.summary.supportingUnmatched, 1);
  assert.equal(result.summary.unresolvedDuplicateRows, 2);
  assert.equal(result.summary.unresolvedDuplicateExcess, 1);
  assert.equal(result.summary.supportingAmbiguousMappings, 1);
  assert.equal(result.auditRecords.find(x=>x.rawRecordId==='s1').canonicalRecordId, null);
  assert.equal(result.auditRecords.find(x=>x.rawRecordId==='s1').reasonCode, 'OVERLAPPING_EXPORT_MULTIPLE_PRIMARY_CANDIDATES');
  assert.equal(result.auditRecords.find(x=>x.rawRecordId==='s2').canonicalRecordId, 'PRIMARY:p3');
  assert.equal(result.auditRecords.find(x=>x.rawRecordId==='p2').canonicalRecordId, 'PRIMARY:p2');
  const importPreview = Engine.buildReadonlyImportPreview(result);
  assert.equal(importPreview.writeEnabled, false);
  assert.equal(importPreview.mutationCount, 0);
  assert.equal(importPreview.recordsNew, null);
  assert.equal(importPreview.duplicateCandidates, 1);
  assert.equal(importPreview.financialDeltaCents, null);
});

test('duplicate rows with the same stable event id link once without discarding provenance', () => {
  const result = Engine.canonicalizeSources([{ sourceId:'P', role:'PRIMARY', rows:[
    { rawRecordId:'r1', eventId:'event-1', rowFingerprint:'same' },
    { rawRecordId:'r2', eventId:'event-1', rowFingerprint:'same' },
  ] }]);
  assert.equal(result.canonicalRecords.length, 1);
  assert.equal(result.summary.exactDuplicates, 1);
  assert.equal(result.summary.supportingDuplicateExcess, 0);
  assert.equal(result.auditRecords[1].reasonCode, 'SAME_STABLE_EVENT_ID');
});

test('ambiguous supporting mappings prevent a reviewable canonical status', () => {
  const result = Engine.canonicalizeSources([
    {sourceId:'P',role:'PRIMARY',rows:[
      {rawRecordId:'p1',eventId:'event-1',rowFingerprint:'a'.repeat(64)},
      {rawRecordId:'p2',eventId:'event-1',rowFingerprint:'a'.repeat(64)},
    ]},
    {sourceId:'S',role:'SUPPORTING',rows:[{rawRecordId:'s1',rowFingerprint:'a'.repeat(64)}]},
  ]);
  assert.equal(result.summary.exactDuplicates,1);
  assert.equal(result.summary.supportingAmbiguousMappings,1);
  assert.equal(result.canonicalStatus,'NOT_CERTIFIED');
});

test('transfer pairing requires explicit direction, same asset and quantity, amount and bounded date window', () => {
  const result = Engine.pairTransfers([
    { rawRecordId:'out', kind:'TRANSFER_OUT', date:'2026-02-02', assetKey:'asset-x', quantity:'2', amountCents:20000, custodian:'A' },
    { rawRecordId:'in', kind:'TRANSFER_IN', date:'2026-02-04', assetKey:'asset-x', quantity:'2', amountCents:20000, custodian:'B' },
    { rawRecordId:'generic', kind:'TRANSFER_CANDIDATE', date:'2026-02-02', assetKey:'asset-x', quantity:'2', amountCents:20000, custodian:'A' },
  ], { maxBusinessDays:2 });
  assert.equal(result.pairs.length, 1);
  assert.equal(result.pairs[0].status, 'PROBABLE_PAIR');
  assert.deepEqual(result.unpaired, ['generic']);
});

test('ambiguous transfer candidates are not paired and unrelated rows remain unpaired', () => {
  const rows=[
    {rawRecordId:'out',kind:'TRANSFER_OUT',date:'2026-01-05',assetKey:'a',quantity:'1',amountCents:5000,custodian:'A'},
    {rawRecordId:'in1',kind:'TRANSFER_IN',date:'2026-01-05',assetKey:'a',quantity:'1',amountCents:5000,custodian:'B'},
    {rawRecordId:'in2',kind:'TRANSFER_IN',date:'2026-01-05',assetKey:'a',quantity:'1',amountCents:5000,custodian:'C'},
    {rawRecordId:'other',kind:'TRANSFER_OUT',date:'2026-01-05',assetKey:'z',quantity:'1',amountCents:9000,custodian:'A'},
  ];
  const result=Engine.pairTransfers(rows);
  assert.equal(result.pairs.length,0);
  assert.deepEqual(result.ambiguous.map(x=>x.rawRecordId).sort(),['in1','in2','out']);
  assert.deepEqual(result.unpaired,['other']);
});

test('observed rows do not prove complete monthly coverage or zero activity', () => {
  const result=Engine.monthlyCoverage([{date:'2020-01-15',incomeStatus:'RECEIVED',amountCents:1000,duplicateState:'UNIQUE'}],{start:'2020-01',end:'2020-02'});
  assert.equal(result[0].status,'PARTIAL');
  assert.equal(result[0].receivedIncomeRecordCount,1);
  assert.equal(result[0].observedReceivedCents,1000);
  assert.equal(result[1].status,'UNKNOWN');
  assert.equal(result[1].observedReceivedCents,null);
  const attested=Engine.monthlyCoverage([],{start:'2020-01',end:'2020-01',completeMonths:['2020-01']});
  assert.equal(attested[0].status,'COMPLETE');
  assert.equal(attested[0].noActivityConfirmed,true);
  assert.equal(attested[0].observedReceivedCents,0);
  const confirmedZero=Engine.monthlyCoverage([{date:'2020-01-15',incomeStatus:'EXPECTED'}],{start:'2020-01',end:'2020-01',completeMonths:['2020-01']});
  assert.equal(confirmedZero[0].observedReceivedCents,0);
});

test('income aggregation excludes expected, redemption and ambiguous income labels', () => {
  const result=Engine.summarizeIncome([
    {date:'2026-01-01',kind:'DIVIDEND',incomeStatus:'RECEIVED',amountCents:1000,duplicateState:'UNIQUE'},
    {date:'2026-01-02',kind:'JCP',incomeStatus:'RECEIVED',amountCents:500,duplicateState:'UNIQUE'},
    {date:'2026-01-03',kind:'INCOME_CANDIDATE',incomeStatus:'UNKNOWN',amountCents:900,duplicateState:'UNIQUE'},
    {date:'2026-01-04',kind:'RF_REDEMPTION_CANDIDATE',incomeStatus:'EXCLUDED',amountCents:3000,duplicateState:'UNIQUE'},
    {date:'2026-01-05',kind:'JCP',incomeStatus:'EXPECTED',amountCents:7000,duplicateState:'UNIQUE'},
  ]);
  assert.equal(result[0].receivedRecordCount,2);
  assert.equal(result[0].observedReceivedCents,1500);
  assert.deepEqual(result[0].receivedByKind, { DIVIDEND:{ recordCount:1,observedCents:1000 }, JCP:{ recordCount:1,observedCents:500 } });
  assert.equal(result[0].coverage,'PARTIAL');
  assert.equal(result[0].completeYearTotalCents,null);
});

test('income with unresolved duplicates cannot be reported as a complete amount', () => {
  const result=Engine.summarizeIncome([
    {date:'2024-05-01',kind:'JCP',incomeStatus:'RECEIVED',amountCents:1234,duplicateState:'UNRESOLVED'},
    {date:'2024-05-02',kind:'DIVIDEND',incomeStatus:'RECEIVED',amountCents:500,duplicateState:'UNIQUE'},
  ], {completeYears:['2024']});
  assert.equal(result[0].observedReceivedCents,null);
  assert.equal(result[0].completeYearTotalCents,null);
  assert.equal(result[0].coverage,'PARTIAL');
  assert.equal(result[0].reasonCode,'DUPLICATE_RISK');
  assert.equal(result[0].receivedByKind.JCP.observedCents,null);
  assert.equal(result[0].receivedByKind.DIVIDEND.observedCents,500);
});

test('year preview reports zero only with attested coverage and retains duplicate risk', () => {
  const zero = Engine.buildYearPreview([{date:'2025-03-01',kind:'BUY',incomeStatus:'EXCLUDED'}], {year:'2025',sourceCoverage:'COMPLETE'});
  assert.equal(zero.status,'COMPLETE');
  assert.equal(zero.observedReceivedCents,0);
  const partial = Engine.buildYearPreview([{date:'2025-03-01',kind:'JCP',incomeStatus:'RECEIVED',amountCents:1000,duplicateState:'UNRESOLVED'}], {year:'2025',sourceCoverage:'COMPLETE'});
  assert.equal(partial.status,'PARTIAL');
  assert.equal(partial.observedReceivedCents,null);
  assert.deepEqual(partial.reasonCodes,['DUPLICATE_RISK']);
  assert.equal(Engine.buildYearPreview([], {year:'2025'}).status,'UNKNOWN');
  const unknownIncome = Engine.buildYearPreview([{date:'2025-04-01',kind:'INCOME_CANDIDATE',incomeStatus:'UNKNOWN'}], {year:'2025',sourceCoverage:'COMPLETE'});
  assert.equal(unknownIncome.incomeCoverage,'PARTIAL');
  assert.equal(unknownIncome.observedReceivedCents,null);
  assert.deepEqual(unknownIncome.reasonCodes,['UNKNOWN_INCOME_CLASSIFICATION']);
});

test('historical position derives only from a complete interval and resolved position events', () => {
  const result = Engine.deriveHistoricalPosition({
    snapshot:{quantityMicros:10_000_000,asOf:'2026-01-31',sourceId:'SYNTH_SNAPSHOT',coverage:'COMPLETE'},
    targetAsOf:'2025-12-31',
    completeMonths:['2025-12','2026-01'],
    events:[
      {rawRecordId:'buy',date:'2026-01-03',kind:'BUY',quantityDeltaMicros:2_000_000},
      {rawRecordId:'sell',date:'2026-01-10',kind:'SELL',quantityDeltaMicros:1_000_000},
      {rawRecordId:'income',date:'2026-01-12',kind:'JCP',quantityDeltaMicros:null},
    ],
  });
  assert.equal(result.status,'DERIVED');
  assert.equal(result.quantityMicros,9_000_000);
  assert.deepEqual(result.eventIds,['buy','sell','income']);
  const unknownCoverage = Engine.deriveHistoricalPosition({snapshot:{quantityMicros:10,asOf:'2026-01-31',coverage:'COMPLETE'},targetAsOf:'2025-12-31'});
  assert.equal(unknownCoverage.status,'UNKNOWN');
  assert.equal(unknownCoverage.reasonCode,'INTERVAL_COVERAGE_NOT_COMPLETE');
  const unresolved = Engine.deriveHistoricalPosition({
    snapshot:{quantityMicros:10,asOf:'2026-01-31',coverage:'COMPLETE'},targetAsOf:'2025-12-31',completeMonths:['2025-12','2026-01'],
    events:[{rawRecordId:'unknown',date:'2026-01-04',kind:'UNKNOWN',quantityDeltaMicros:2}],
  });
  assert.equal(unresolved.status,'UNKNOWN');
  assert.equal(unresolved.reasonCode,'UNRESOLVED_POSITION_EVENT');
});

test('source preview aggregates provenance without exposing row payloads', () => {
  const result = Engine.buildSourcePreview([
    {sourceId:'PRIMARY_SYNTH',kind:'BUY',duplicateState:'UNIQUE',includedInCanonical:true},
    {sourceId:'SUBSET_SYNTH',kind:'BUY',duplicateState:'OVERLAPPING_EXPORT',includedInCanonical:false},
  ]);
  assert.deepEqual(result,[
    {sourceId:'PRIMARY_SYNTH',recordCount:1,canonicalRecordCount:1,kinds:{BUY:1},duplicateStates:{UNIQUE:1}},
    {sourceId:'SUBSET_SYNTH',recordCount:1,canonicalRecordCount:0,kinds:{BUY:1},duplicateStates:{OVERLAPPING_EXPORT:1}},
  ]);
});
