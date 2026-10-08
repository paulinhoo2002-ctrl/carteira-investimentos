const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');

function boot({ marker, hostname = '127.0.0.1', search = '?testMode=1' } = {}) {
  const normalizedSource = source.replace(/\r\n/g, '\n');
  const start = normalizedSource.indexOf('<script>\n(()=>{try{');
  const end = normalizedSource.indexOf('</script>', start);
  assert.notEqual(start, -1, 'runtime bootstrap script exists');
  const script = normalizedSource.slice(start + '<script>'.length, end);
  const window = { __LOCAL_QA_RUNTIME__: marker };
  vm.runInNewContext(script, {
    URLSearchParams,
    window,
    location: { hostname, search },
    document: { documentElement: { dataset: {}, style: {} } },
    localStorage: { getItem: () => null },
  });
  return window;
}

test('synthetic mode requires server marker, loopback hostname, and explicit testMode flag', () => {
  assert.doesNotMatch(source, /window\.__LOCAL_QA_RUNTIME__\s*=\s*'local-synthetic-v1'/);
  assert.match(source, /window\.__LOCAL_QA_RUNTIME__\s*===\s*'local-synthetic-v1'/);
  assert.match(source, /location\.hostname==='localhost'/);
  assert.match(source, /location\.hostname==='127\.0\.0\.1'/);
  assert.match(source, /params\.get\('testMode'\)==='1'/);
  assert.match(source, /Object\.defineProperty\(window,'__LOCAL_TEST_MODE__',\{value:testMode,writable:false,configurable:false\}\)/);
});

test('read-only test mode is subordinate to the trusted synthetic runtime', () => {
  assert.match(source, /const testReadOnly=testMode && params\.get\('testReadOnly'\)==='1'/);
  assert.match(source, /Object\.defineProperty\(window,'__LOCAL_TEST_READ_ONLY__',\{value:testReadOnly,writable:false,configurable:false\}\)/);
  assert.match(source, /Necessita revisão antes da confirmação/);
  assert.match(source, /Ação bloqueada: este teste local está em modo somente leitura/);
  assert.doesNotMatch(source, /body:has\(\.test-mode-banner\)\s*\.test-mode-banner\s*\{\s*display:\s*none/i);
});

test('strict read-only rejects edit and save before mutable synthetic paths', () => {
  const editGuard = source.slice(source.indexOf('function canEditFromThisTab('), source.indexOf('function broadcastEditLock('));
  const save = source.slice(source.indexOf('function save(){'), source.indexOf('async function releaseCloudSyncAfterSuccessfulReconciliation'));
  assert.match(editGuard, /isLocalTestReadOnlyMode\(\)/);
  assert.ok(editGuard.indexOf('isLocalTestReadOnlyMode()') < editGuard.indexOf('if(isEditOwner())'));
  assert.match(save, /isLocalTestReadOnlyMode\(\)/);
  assert.ok(save.indexOf('isLocalTestReadOnlyMode()') < save.indexOf('if\(isLocalTestMode\(\)\)'));
});

test('programmatic edit, save, and fixture reset are blocked in strict read-only', () => {
  const editGuard = source.slice(source.indexOf('function canEditFromThisTab('), source.indexOf('function broadcastEditLock('));
  const save = source.slice(source.indexOf('function save(){'), source.indexOf('async function releaseCloudSyncAfterSuccessfulReconciliation'));
  const reset = source.slice(source.indexOf('function restoreLocalTestData(){'), source.indexOf('function normalizeEmail('));
  const fixtureStart = source.indexOf('const LOCAL_TEST_FIXTURE_RUNTIME=(()=>{');
  const fixture = source.slice(fixtureStart, source.indexOf('function restoreLocalTestData(){', fixtureStart));
  let mutations = 0;
  const context = {
    S: {},
    isLocalTestMode: () => true,
    isLocalTestReadOnlyMode: () => true,
    isEditOwner: () => true,
    canEditFromThisTab: () => false,
    toast: () => {},
    applyLocalTestFixture: () => { mutations += 1; },
    render: () => { mutations += 1; },
    localStorage: { setItem: () => { mutations += 1; } },
  };
  const invoke = (body, name) => vm.runInNewContext(`${body}; ${name}()`, context);
  assert.equal(invoke(editGuard, 'canEditFromThisTab'), false);
  assert.equal(invoke(save, 'save'), false);
  assert.equal(invoke(reset, 'restoreLocalTestData'), undefined);
  assert.equal(mutations, 0);
  const fixtureState = { marker: 'unchanged' };
  const fixtureResult = vm.runInNewContext(`${fixture}; applyLocalTestFixture()`, {
    S: fixtureState,
    isLocalTestReadOnlyMode: () => true,
    canEditFromThisTab: () => false,
  });
  assert.equal(fixtureResult, false);
  assert.equal(fixtureState.marker, 'unchanged');
});

test('editable synthetic save is ephemeral and does not write localStorage', () => {
  const save = source.slice(source.indexOf('function save(){'), source.indexOf('async function releaseCloudSyncAfterSuccessfulReconciliation'));
  let writes = 0;
  let memorySyncs = 0;
  const context = {
    S: {},
    isLocalTestReadOnlyMode: () => false,
    isLocalTestMode: () => true,
    syncWalletFromState: () => { memorySyncs += 1; },
    localStorage: { setItem: () => { writes += 1; } },
    toast: () => {},
  };
  const result = vm.runInNewContext(`${save}; save()`, context);
  assert.equal(result, true);
  assert.equal(memorySyncs, 1);
  assert.equal(writes, 0);
});

test('strict read-only keeps route navigation ephemeral without persistence or automatic provider refresh', () => {
  const start = source.indexOf('function goInternal(t,persistNavigation){');
  const end = source.indexOf('// Busca global somente em memoria', start);
  const goInternal = source.slice(start, end);
  const calls = { save: 0, render: 0, refresh: 0 };
  const context = {
    S: { tabSeq: 0, activeDividendSection: '', assetsInnerTab: 'patrimonio' },
    isLocalTestReadOnlyMode: () => true,
    isProtectedReadOnlyQaBoot: () => false,
    save: () => { calls.save += 1; },
    render: () => { calls.render += 1; },
    runAutoProventosGratis: () => { calls.refresh += 1; },
  };
  vm.runInNewContext(`${goInternal}; goInternal('dividendos',true)`, context);
  assert.equal(context.S.tab, 'dividendos');
  assert.deepEqual(calls, { save: 0, render: 1, refresh: 0 });
});

test('synthetic runtime does not initialize or mutate cross-tab edit-lock storage', () => {
  const start = source.indexOf('function initEditProtection(){');
  const end = source.indexOf('// Deterministic edit-ownership claim', start);
  const editProtection = source.slice(source.indexOf('function ensureEditLockTabId(){'), end);
  const calls = { sessionRead: 0, sessionWrite: 0, localRead: 0, localWrite: 0, cloud: 0, listeners: 0, channel: 0 };
  const window = {
    crypto: { randomUUID: () => 'synthetic-tab' },
    addEventListener: () => { calls.listeners += 1; },
  };
  class BroadcastChannelStub { constructor(){ calls.channel += 1; } }
  const context = {
    STOR: 'portfolio',
    EDIT_LOCK_CHANNEL_NAME: 'portfolio-lock',
    EDIT_LOCK_HEARTBEAT_MS: 3000,
    EDIT_LOCK_STALE_MS: 9000,
    EDIT_LOCK_STATE: { ownerId: '', updatedAt: 0, mode: 'owner', stale: false },
    EDIT_LOCK_TAB_ID: '', EDIT_LOCK_CHANNEL: null, EDIT_LOCK_TIMER: null,
    isLocalTestMode: () => true,
    isLocalTestReadOnlyMode: () => true,
    isProtectedReadOnlyQaBoot: () => false,
    sessionStorage: {
      getItem: () => { calls.sessionRead += 1; return null; },
      setItem: () => { calls.sessionWrite += 1; },
    },
    localStorage: {
      getItem: () => { calls.localRead += 1; return null; },
      setItem: () => { calls.localWrite += 1; },
      removeItem: () => { calls.localWrite += 1; },
    },
    BroadcastChannel: BroadcastChannelStub,
    window,
    startCloudSync: () => { calls.cloud += 1; },
    stopCloudSync: () => { calls.cloud += 1; },
    render: () => {},
    setInterval: () => { throw new Error('edit lock timer must not start'); },
    toast: () => {},
    confirm: () => true,
  };
  vm.runInNewContext(`${editProtection}; initEditProtection()`, context);
  assert.deepEqual(calls, { sessionRead: 0, sessionWrite: 0, localRead: 0, localWrite: 0, cloud: 0, listeners: 0, channel: 0 });
  assert.equal(context.EDIT_LOCK_STATE.mode, 'readonly');
});

test('synthetic QA rejects programmatic cloud hydration and V76 storage access', async () => {
  const cloudStart = source.indexOf('async function applyCloudData(d){');
  const cloudEnd = source.indexOf('\nfunction startCloudSync', cloudStart);
  const cloud = source.slice(cloudStart, cloudEnd);
  const v76Start = source.indexOf('function loadV76RuntimeStores(){');
  const v76End = source.indexOf('\nfunction v76LocalDate', v76Start);
  const v76 = source.slice(v76Start, v76End);
  const calls = { storageRead: 0, storageWrite: 0 };
  const S = { assets: [{ ticker: 'SYNTH' }] };
  const context = {
    S,
    FB: {},
    window: { PortfolioRuntimeStores: { loadStore: () => { throw new Error('must not load'); } } },
    localStorage: {
      getItem: () => { calls.storageRead += 1; throw new Error('must not read'); },
      setItem: () => { calls.storageWrite += 1; throw new Error('must not write'); },
    },
    isLocalTestMode: () => true,
    isAuthoritativeLocalRecoveryBoot: () => false,
    isProtectedReadOnlyQaBoot: () => false,
  };
  const result = await vm.runInNewContext(`${cloud}; applyCloudData({assets:[]})`, context);
  assert.equal(result, false);
  assert.equal(S.assets[0].ticker, 'SYNTH');
  const v76Result = vm.runInNewContext(`${v76}; [loadV76RuntimeStores(), saveV76RuntimeStores()]`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(v76Result[0])), { snapshots: [], flows: [], diagnostics: ['LOCAL_SYNTHETIC_QA'] });
  assert.equal(v76Result[1], false);
  assert.deepEqual(calls, { storageRead: 0, storageWrite: 0 });
});

test('synthetic QA cannot preserve corrupt financial storage into localStorage', () => {
  const start = source.indexOf('function backupCorruptedStorageValue(');
  const end = source.indexOf('\nfunction safeGetLocalStorageItem', start);
  const body = source.slice(start, end);
  let writes = 0;
  const context = {
    isLocalTestMode: () => true,
    isProtectedReadOnlyQaBoot: () => false,
    isAuthoritativeLocalRecoveryBoot: () => false,
    localStorage: { setItem: () => { writes += 1; } },
  };
  const result = vm.runInNewContext(`${body}; backupCorruptedStorageValue('portfolio', '{bad}', new Error('synthetic'))`, context);
  assert.equal(result, null);
  assert.equal(writes, 0);
});

test('asset class return summary formats its sign once', () => {
  const start = source.indexOf('<div class="acc-metric-label ag-k">Rentab.</div>');
  const end = source.indexOf('</div>', source.indexOf('</div>', start) + 6);
  const metric = source.slice(start, end);
  assert.match(metric, /typeReturn == null \? '—' : fmtP\(typeReturn\)/);
  assert.doesNotMatch(metric, /resultPrefix.*fmtP\(typeReturn\)/);
});

test('desktop asset category summary reserves a column for every financial metric', () => {
  const desktopLayout = source.slice(
    source.indexOf('/* Phase 3.2.4: desktop Ativos uses full-width category rows and contained tables. */'),
    source.indexOf('@media (max-width:767px)', source.indexOf('/* Phase 3.2.4: desktop Ativos uses full-width category rows and contained tables. */')),
  );

  assert.match(desktopLayout, /\.assets-premium-shell \.ag>summary\s*\{[^}]*grid-template-columns:\s*minmax\(180px,1\.1fr\)\s+repeat\(5,minmax\(0,1fr\)\)\s+30px/s);
});

test('only the three trusted signals activate synthetic mode; URL input alone cannot', () => {
  const marker = 'local-synthetic-v1';
  assert.equal(boot({ marker }).__LOCAL_TEST_MODE__, true);
  assert.equal(boot({ marker: undefined }).__LOCAL_TEST_MODE__, false);
  assert.equal(boot({ marker, hostname: 'preview.example.com' }).__LOCAL_TEST_MODE__, false);
  assert.equal(boot({ marker, search: '' }).__LOCAL_TEST_MODE__, false);
  assert.equal(boot({ marker: undefined, search: '?testMode=1' }).__LOCAL_TEST_MODE__, false);
});

test('readonly is opt-in only inside the authorized synthetic session', () => {
  const marker = 'local-synthetic-v1';
  assert.equal(boot({ marker, search: '?testMode=1&testReadOnly=1' }).__LOCAL_TEST_READ_ONLY__, true);
  assert.equal(boot({ marker, search: '?testMode=1' }).__LOCAL_TEST_READ_ONLY__, false);
  assert.equal(boot({ marker: undefined, search: '?testMode=1&testReadOnly=1' }).__LOCAL_TEST_READ_ONLY__, false);
  const descriptor = Object.getOwnPropertyDescriptor(boot({ marker, search: '?testMode=1&testReadOnly=1' }), '__LOCAL_TEST_READ_ONLY__');
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
});

test('URL testMode alone does not suppress the independent two-emulator selection', () => {
  const state = boot({
    marker: undefined,
    search: '?testMode=1&qaAuthEmulator=1&qaFirestoreEmulator=1',
  });
  assert.equal(state.__LOCAL_TEST_MODE__, false);
  assert.equal(state.__LOCAL_AUTH_EMULATOR_MODE__, true);
});

test('ordinary deployment keeps normal auth and Firebase initialization', () => {
  assert.match(source, /function shouldShowAccessGate\(\)\{\s*if\(isLocalTestMode\(\)\) return false;/);
  assert.match(source, /function initFirebase\(\)\{\s*if\(isLocalTestMode\(\)\)/);
  assert.match(source, /signInGoogle\(\)/);
});

for (const name of ['svA', 'svP', 'rmP', 'svD', 'rmD']) {
  test(`readonly ${name} leaves financial state intact and never announces success`, () => {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\nfunction ', start + 1);
    const body = source.slice(start, end);
    const S = {
      assets: [{ id: 1, ticker: 'SYNTH3', type: 'Ação', avg_price: 10, dy: 5 }],
      aportes: [{ id: 2, ticker: 'SYNTH3', qty: 1, price: 10 }],
      proventos: [{ id: 3, ticker: 'SYNTH3', value: 5 }],
      editId: 1, editPId: 2, editDId: 3,
    };
    const before = JSON.stringify(S);
    const messages = [];
    let effects = 0;
    const fields = { 'p-ti': 'SYNTH3', 'p-qt': '1', 'p-pr': '10', 'p-dt': '2026-10-01', 'd-ti': 'SYNTH3', 'd-va': '5', 'd-dt': '2026-10-01' };
    const context = {
      S, document: { getElementById: key => ({ value: fields[key] || '' }) },
      canEditFromThisTab: () => { messages.push('Ação bloqueada: somente leitura'); return false; },
      parseNum: value => Number(value) || 0, normalizeType: value => value,
      isRendaFixaAsset: () => false, metaTicker: () => ({ type: 'Ação' }),
      cleanAssetCode: value => value, brDate: value => value,
      confirm: () => { effects += 1; return true; },
      alert: () => { effects += 1; }, toast: message => messages.push(message),
      rememberScroll: () => { effects += 1; }, learnTickerMeta: () => { effects += 1; },
      save: () => { effects += 1; return false; }, render: () => { effects += 1; },
      syncAssetsFromAportes: () => { effects += 1; }, fetchQuotes: () => { effects += 1; },
      scheduleAutoProventosGratis: () => { effects += 1; }, markProventosDirty: () => { effects += 1; },
    };
    vm.runInNewContext(`${body}; ${name}(${name === 'rmP' ? 2 : 3})`, context);
    assert.equal(JSON.stringify(S), before, `${name} mutated financial state`);
    assert.equal(effects, 0, 'blocked handler must stop before confirmations and side effects');
    assert.deepEqual(messages, ['Ação bloqueada: somente leitura']);
  });
}

(()=>{
'use strict';
// Synthetic-only READ ONLY VM reproduction. Run from the reviewed worktree.
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
function body(name){
  const start=source.indexOf(`function ${name}(`);
  if(start<0) throw Error(`Missing ${name}`);
  return source.slice(start,source.indexOf('\nfunction ',start+1));
}
const cases=[];
function run(name,args,S,extra={},dependencies=[]){
  const messages=[];let confirms=0,saves=0,guardCalls=0;
  const context={S,isLocalTestMode:()=>true,isLocalTestReadOnlyMode:()=>true,
    isProtectedReadOnlyQaBoot:()=>false,
    canEditFromThisTab:()=>{guardCalls++;messages.push('Ação bloqueada');return false},
    save:()=>{saves++;return false},render:()=>{},toast:m=>messages.push(m),
    confirm:()=>{confirms++;return true},...extra};
  const before=JSON.stringify(S);
  const result=vm.runInNewContext([...dependencies,name].map(body).join('\n')+`;${name}(${args})`,context);
  const unchanged=JSON.stringify(S)===before;
  const falseSuccess=messages.some(m=>/✅|vinculado|desfeito/i.test(m));
  cases.push({name,passed:unchanged&&!falseSuccess,before:JSON.parse(before),after:S,unchanged,falseSuccess,messages,confirms,saves,guardCalls,result});
}
run('autoDY','',{assets:[{ticker:'SYNTH3',qty:10,current_price:20,dy:0}],proventos:[]},{DY_REF:{SYNTH3:7},parseAnyDate:()=>null});
run('syncAssetsFromAportes','true',{assets:[{ticker:'SYNTH3',qty:10,current_price:20}],aportes:[],proventos:[]},{window:{},rfPositionImportSourceTag:()=>false,autoDY:()=>0});
run('importRfEventSeeds',"'a'",{rfEvents:[],wallets:[]},{getRfAssetByEventId:()=>({id:'a'}),rfEventImportSummary:()=>({expected:1,missing:1,current:0,ticker:'SYNTH',seeds:[{id:'event',autoKey:'event'}]}),normalizeRfEvents:x=>x,normalizeRfEventEntry:x=>x,rfAssetEventId:x=>x.id,rfAssetEventTicker:()=> 'SYNTH'});
run('removeProventoAuditSelected','',{proventos:[{id:'dup',value:5}]},{proventoAuditBuildRows:()=>({all:[{auditId:'dup',canRemove:true}]}),proventoAuditEnsureState:()=>({selectedIds:['dup']}),proventoAuditEntryId:p=>p.id});
run('confirmProventoRfLink',"'p','rf'",{proventos:[{id:'p',value:5}]},{proventoAuditFindRow:()=>({auditIndex:0}),rfEventByIdMap:()=>new Map([['rf',{id:'rf'}]])});
run('unlinkProventoRfEvent',"'p'",{proventos:[{id:'p',value:5,sourceEventKind:'rf',sourceEventId:'rf',excludedFromIncomeTotals:true}]},{proventoAuditFindRow:()=>({auditIndex:0})});
run('saveAllocationGoalItems',"[{type:'Ação',pct:50}]",{goals:{allocation:{items:[{type:'Ação',pct:100}]}}},{normalizeAllocationItems:x=>x});
const allocationState={goals:{allocation:{items:[{type:'Ação',pct:25},{type:'FII',pct:25}]}}};
run('normalizeAllocationGoal','',allocationState,{allocationGoalItems:()=>JSON.parse(JSON.stringify(allocationState.goals.allocation.items)),normalizeAllocationItems:x=>x},['saveAllocationGoalItems']);

run('stripAutoProventos','',{proventos:[{id:'auto',source:'auto-test'}]},{isAutoGeneratedProvento:()=>true});
run('cleanupB3PositionSummaryAssets','',{assets:[{ticker:'SYNTH',source:'B3 POSICAO ATUAL'}]},{rfPosNorm:x=>x,isB3PositionSummaryRow:()=>true});
run('cleanupB3PositionAportes','',{aportes:[{id:'synthetic',source:'B3 POSICAO ATUAL'}]},{rfPosNorm:x=>String(x||'')});
for(const entry of cases) test(`readonly sibling ${entry.name} blocks financial mutation and false success`,()=>{ assert.equal(entry.unchanged,true,entry.name+' mutated financial state'); assert.equal(entry.falseSuccess,false); assert.equal(entry.confirms,0); assert.equal(entry.saves,0); });

})();

test('readonly rejects a valid synthetic offline snapshot before wallet hydration', () => {
  const start=source.indexOf('function applyProtectedReadOnlyOfflineState(');
  const end=source.indexOf('\nfunction ',start+1);
  const body=source.slice(start,end);
  const S={assets:[{ticker:'SYNTH3'}],wallets:[]};
  const before=JSON.stringify(S);
  const snapshot={state:{wallets:[{id:'qa-new',assets:[]}],activeWalletId:'qa-new'}};
  const context={S,FB:{},rebuildLearnMeta:()=>{},cloudSnapshotSignature:()=> 'synthetic',isLocalTestReadOnlyMode:()=>true,normalizeWalletEntry:x=>x,syncStateFromWallet:wallet=>{S.assets=wallet.assets;}};
  const result=vm.runInNewContext(body+'; applyProtectedReadOnlyOfflineState('+JSON.stringify(snapshot)+')',context);
  assert.equal(result,false);
  assert.equal(JSON.stringify(S),before);
  const unguarded=body.replace(/  if\(typeof isLocalTestReadOnlyMode[^\n]*\n/,'');
  assert.equal(vm.runInNewContext(unguarded+'; applyProtectedReadOnlyOfflineState('+JSON.stringify(snapshot)+')',context),true);
  assert.notEqual(JSON.stringify(S),before,'valid fixture must reproduce the original mutation');
});
