const test=require('node:test'); const assert=require('node:assert/strict');
const P=require('../corporate-events-parity');

test('reconciles exact rows by semantic cents rather than formatted strings',()=>{
  const out=P.reconcileRows([{ticker:'ABCD3',eventType:'DIVIDEND',date:'2026-09-20',value:0.5}], [{symbol:'abcd3',type:'DIVIDEND',paymentDate:'2026-09-20',value:0.50}]);
  assert.equal(out.matches.length,1); assert.equal(out.leftOnly.length,0); assert.equal(out.rightOnly.length,0);
});
test('explains date-basis difference without changing either row',()=>{
  const left={ticker:'ABCD3',eventType:'DIVIDEND',date:'2026-09-01',value:1};
  const right={ticker:'ABCD3',eventType:'DIVIDEND',paymentDate:'2026-09-20',value:1};
  const out=P.reconcileRows([left],[right]);
  assert.equal(out.dateMismatch.length,1); assert.equal(out.dateMismatch[0].reason,'PAYMENT_DATE_VS_COMPETENCE_DATE');
  assert.deepEqual(left,{ticker:'ABCD3',eventType:'DIVIDEND',date:'2026-09-01',value:1});
});
test('keeps reference and shadow-only rows explicit',()=>{
  const out=P.reconcileRows([{ticker:'REF3',sourceEventKind:'reference',date:'2026-09-01',value:1}], [{ticker:'SHD3',shadowOnly:true,date:'2026-09-01',value:1}]);
  assert.equal(out.leftOnly[0].reason,'REFERENCE_EXCLUDED'); assert.equal(out.rightOnly[0].reason,'SHADOW_ONLY');
});
test('does not mutate input arrays or objects',()=>{
  const left=[{ticker:'ABCD3',value:1}]; const right=[{ticker:'EFGH3',value:2}]; const before=JSON.stringify([left,right]);
  P.reconcileRows(left,right); assert.equal(JSON.stringify([left,right]),before);
});
