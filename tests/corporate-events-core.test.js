const test=require('node:test'); const assert=require('node:assert/strict');
const C=require('../corporate-events-core');
test('event identity is stable and material changes are distinct',()=>{const a={symbol:'knhf11',assetType:'FII',eventType:'Rendimento FII',baseDate:'2026-09-15',paymentDate:'2026-09-25',valuePerUnitGross:1};assert.equal(C.eventKey(a),C.eventKey({...a,symbol:'KNHF11',eventType:'FII_INCOME'}));assert.notEqual(C.eventKey(a),C.eventKey({...a,valuePerUnitGross:1.05}));});
test('normalizes FII, amortization and JCP without HTML interpretation',()=>{const e=C.normalizeCorporateEvent({ticker:'KNHF11',label:'Rendimento',rate:1,paymentDate:'2026-09-25',sourceProvider:'<script>bad</script>'});assert.equal(e.eventType,'FII_INCOME');assert.equal(e.sourceProvider,'<script>bad</script>');const j=C.normalizeCorporateEvent({symbol:'BBAS3',type:'JCP',value:1,withholdingRate:15});assert.equal(j.eventType,'JCP');assert.equal(j.valuePerUnitNet,0.85);assert.equal(C.normalizeCorporateEvent({symbol:'X',type:'Amortização',value:1}).eventType,'AMORTIZATION');});
test('merges duplicate provider evidence and records conflicts',()=>{const base={symbol:'ABCD3',eventType:'DIVIDEND',baseDate:'2026-09-10',paymentDate:'2026-09-20',valuePerUnitGross:1,sourceDocumentId:'x'};const out=C.mergeCorporateEvents([{...base,sourceProvider:'official',sourceRank:1},{...base,sourceProvider:'secondary',sourceRank:2},{...base,paymentDate:'2026-09-21',sourceProvider:'other',sourceRank:3}]);assert.equal(out.length,1);assert.equal(out[0].status,'CONFLICT');assert.ok(out[0].sources.length>=3);assert.ok(out[0].conflictingFields.includes('paymentDate'));});
test('revision preserves lineage',()=>{const a=C.normalizeCorporateEvent({symbol:'ABCD3',eventType:'DIVIDEND',value:1,id:'event-1'});const r=C.applyCorporateEventRevision(a,{valuePerUnitGross:1.05});assert.equal(r.current.revision,1);assert.equal(r.current.status,'CORRECTED');assert.equal(r.current.supersedesEventId,'event-1');});
test('cancellation remains a shadow status and never realizes or reverses a ledger row',()=>{const e=C.normalizeCorporateEvent({symbol:'ABCD3',eventType:'DIVIDEND',status:'CANCELLED',value:1});assert.equal(e.status,'CANCELLED');assert.equal(C.promoteExpectedToRealized(e).event.status,'CANCELLED');});
test('eligibility uses entitlement date, not current quantity',()=>{const tx=[{ticker:'ABCD3',date:'2026-01-01',qty:100,operation:'compra'},{ticker:'ABCD3',date:'2026-09-16',qty:100,operation:'venda'}];const e=C.calculateEventEntitlement({symbol:'ABCD3',eventType:'DIVIDEND',baseDate:'2026-09-15',paymentDate:'2026-09-25',valuePerUnitGross:1},{transactions:tx,currentQuantity:0});assert.equal(e.eligibleQuantity,100);assert.equal(e.expectedGross,100);});
test('buy after cutoff is excluded, partial lots and multi-lot are deterministic',()=>{const tx=[{ticker:'ABCD3',date:'2026-01-01',qty:40,operation:'compra'},{ticker:'ABCD3',date:'2026-09-01',qty:60,operation:'compra'},{ticker:'ABCD3',date:'2026-09-16',qty:100,operation:'compra'}];const e=C.calculateEventEntitlement({symbol:'ABCD3',eventType:'DIVIDEND',baseDate:'2026-09-15',valuePerUnitGross:2},{transactions:tx});assert.equal(e.eligibleQuantity,100);assert.equal(e.expectedGross,200);});
test('future event is visible as provisional and upcoming',()=>{const e=C.calculateEventEntitlement({symbol:'KNHF11',eventType:'FII_INCOME',paymentDate:'2099-09-25',valuePerUnitGross:1},{currentQuantity:100});assert.equal(e.status,'EXPECTED');assert.equal(C.buildUpcomingIncomeView([e],new Date('2099-09-01'))[0].status,'A RECEBER');});
test('promotion is idempotent and pure',()=>{const e={symbol:'ABCD3',eventType:'DIVIDEND',valuePerUnitGross:1,expectedNet:10};const receiptEvidence=[{symbol:'ABCD3',eventType:'DIVIDEND',value:10,provenance:'RECEIVED'}];const a=C.promoteExpectedToRealized(e,{receiptEvidence});const b=C.promoteExpectedToRealized(a.event,{realizedIds:[a.event.financialEventId],receiptEvidence});assert.equal(a.delta,10);assert.equal(b.delta,0);});

test('promoteExpectedToRealized requires explicit RECEIVED provenance receipt evidence',()=>{
  const expected = {symbol:'ABCP11',eventType:'DIVIDEND',valuePerUnitGross:1,expectedNet:100,paymentDate:'2026-08-01',status:'EXPECTED'};
  
  // No receipt evidence - should stay EXPECTED
  const resultNoReceipt = C.promoteExpectedToRealized(expected, {receiptEvidence: []});
  assert.equal(resultNoReceipt.event.status, 'EXPECTED');
  assert.equal(resultNoReceipt.delta, 0);
  
  // Receipt evidence without RECEIVED provenance - should stay EXPECTED
  const resultWrongProvenance = C.promoteExpectedToRealized(expected, {
    receiptEvidence: [{symbol:'ABCP11',eventType:'DIVIDEND',value:100,provenance:'ANNOUNCED'}]
  });
  assert.equal(resultWrongProvenance.event.status, 'EXPECTED');
  assert.equal(resultWrongProvenance.delta, 0);
  
  // Valid RECEIVED provenance - should promote to REALIZED
  const resultValid = C.promoteExpectedToRealized(expected, {
    receiptEvidence: [{symbol:'ABCP11',eventType:'DIVIDEND',value:100,provenance:'RECEIVED'}]
  });
  assert.equal(resultValid.event.status, 'REALIZED');
  assert.equal(resultValid.delta, 100);
});

test('promoteExpectedToRealized matches receipt by symbol+eventType+value',()=>{
  const expected = {symbol:'ABCP11',eventType:'DIVIDEND',valuePerUnitGross:1,expectedNet:100,paymentDate:'2026-08-01',status:'EXPECTED'};
  
  // Mismatched symbol - should not promote
  const resultMismatch = C.promoteExpectedToRealized(expected, {
    receiptEvidence: [{symbol:'XYZ11',eventType:'DIVIDEND',value:100,provenance:'RECEIVED'}]
  });
  assert.equal(resultMismatch.event.status, 'EXPECTED');
  
  // Mismatched value - should not promote
  const resultValueMismatch = C.promoteExpectedToRealized(expected, {
    receiptEvidence: [{symbol:'ABCP11',eventType:'DIVIDEND',value:50,provenance:'RECEIVED'}]
  });
  assert.equal(resultValueMismatch.event.status, 'EXPECTED');
});
test('B3 reconciliation distinguishes missing and conflicts',()=>{const a={valuePerUnitGross:1,paymentDate:'2026-09-20'};assert.equal(C.reconcileB3Event(a,null),'MISSING_LOCAL');assert.equal(C.reconcileB3Event(a,{valuePerUnitGross:1.1,paymentDate:'2026-09-20'}),'VALUE_CONFLICT');assert.equal(C.reconcileB3Event(a,{valuePerUnitGross:1,paymentDate:'2026-09-20'}),'CONFIRMED');});
