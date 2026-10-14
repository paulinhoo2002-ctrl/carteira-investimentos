'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const Mapping = require('../package1-portfolio-schema-mapping');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.resolve(__dirname, '..');

function packageFixture() {
  const asOf = '2026-10-10';
  const batch = 'SYN_SCHEMA_UI_BATCH';
  const positions = Array.from({ length: 35 }, (_, index) => {
    const type = index < 31 ? 'RV_ACAO' : 'RF';
    const value = type === 'RV_ACAO' ? (index === 0 ? 100 : index === 1 ? 28 : 0) : index === 31 ? 4 : 0;
    const source = `SYN_UI_SOURCE_${index + 1}`;
    const id = `SYN_UI_POSITION_${index + 1}`;
    const data = {
      document_id: id, schema_version: 2, custodian_id: 'SYN_UI_CUSTODIAN',
      asset_id: `SYN_UI_ASSET_${index + 1}`, asset_type: type, quantity: 1,
      current_value: value, as_of: asOf, average_cost: null, average_cost_status: 'UNKNOWN',
      cost_basis_value: index < 25 ? 0.5 : null,
      cost_basis_status: index < 25 ? 'DERIVED' : 'UNKNOWN', cost_method: index < 25 ? 'FIFO' : null,
      provenance: { source_id: source }, source_ids: [source], reconciliation_status: 'PARTIAL',
      import_batch_id: batch, created_at: '2026-10-14T12:00:00.000Z', updated_at: '2026-10-14T12:00:00.000Z'
    };
    return { collection: 'positions', document_id: id, data };
  });
  const snapshot = {
    document_id: 'SYN_UI_SNAPSHOT', snapshot_id: 'SYN_UI_SNAPSHOT', schema_version: 1,
    custodian_id: 'SYN_UI_CUSTODIAN', as_of: asOf, rv_official: 130, rf_official: 10,
    total_official: 140, rv_detail_sum: 128, rf_detail_sum: 4, detail_total: 132,
    rv_gap: 2, rf_gap: 6, total_gap: 8, reconciliation_status: 'PARTIAL',
    provenance: { source_id: 'SYN_UI_OFFICIAL' }, import_batch_id: batch
  };
  return { mode: 'LOCAL_DRY_RUN_ONLY', import_batch_id: batch,
    records: [...positions, { collection: 'account_snapshots', document_id: snapshot.document_id, data: snapshot }] };
}

test('embedded portfolio schema feeds all Package 1 synthetic UI routes without changing legacy state', async () => {
  const server = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.name));
  page.on('console', message => { if (message.type() === 'error') errors.push('console'); });
  const origin = new URL(server.url).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  try {
    await page.goto(server.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'));
    const before = await page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents }));
    await page.addScriptTag({ path: path.join(ROOT, 'legacy/js/ui/package1-v2-qa.js') });
    const embedded = Mapping.toEmbeddedPackage1(packageFixture());
    const selectedView = Mapping.readEmbeddedPackage1({ [Mapping.FIELD]: embedded }).view;
    await page.evaluate(value => Package1V2Qa.setInput(value.positions, value.snapshot), selectedView);

    const routes = ['dashboard', 'patrimonio', 'ativos', 'renda-fixa', 'rentabilidade', 'irpf', 'dividendos'];
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      for (const theme of ['dark', 'light']) {
        await page.evaluate(themeName => applyTheme(themeName), theme);
        for (const route of routes) {
          await page.evaluate(routeName => go(routeName), route);
          const panel = page.locator('.package1-v2-qa');
          await panel.waitFor();
          assert.equal(await panel.getAttribute('data-reconciliation'), 'PARTIAL');
          const text = await panel.innerText();
          assert.match(text, /R\$\s?140,00/);
          assert.match(text, /R\$\s?132,00/);
          assert.match(text, /R\$\s?8,00/);
          assert.match(text, /custo médio —/i);
          assert.doesNotMatch(text, /resultado R\$ 0,00|ganho R\$/i);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route}/${width}/${theme} overflow`);
        }
      }
    }
    assert.equal(await page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents })), before);
    // Exercise applyCloudData + render with a production-shaped synthetic V2
    // document. The harness disables only its local early-return guards for
    // this call; no cloud SDK/network is used and all persisted values are synthetic.
    const productionPackage=structuredClone(embedded);
    productionPackage.import_batch_id='INTER_CURRENT_POSITION_2026-10-10_V1';
    productionPackage.custodian_id='INTER';
    productionPackage.official_snapshot.import_batch_id=productionPackage.import_batch_id;
    productionPackage.official_snapshot.custodian_id='INTER';
    for(const position of productionPackage.detail_positions){
      position.import_batch_id=productionPackage.import_batch_id;
      position.custodian_id='INTER';
    }
    const hydration=await page.evaluate(async package1 => {
      window.Package1V2Qa=null;
      const previous={isLocalTestMode,isProtectedReadOnlyQaBoot,isAuthoritativeLocalRecoveryBoot,authority:window.ProtectedLocalCloudAuthority};
      isLocalTestMode=()=>false;
      isProtectedReadOnlyQaBoot=()=>false;
      isAuthoritativeLocalRecoveryBoot=()=>false;
      window.ProtectedLocalCloudAuthority=null;
      FB.pendingCloudSave=false;
      try{
        const legacy=JSON.parse(JSON.stringify({assets:S.assets,aportes:S.aportes,proventos:S.proventos,rfEvents:S.rfEvents,goals:S.goals}));
        const applied=await applyCloudData({...legacy,package1_v2:package1});
        const saved=JSON.parse(localStorage.getItem('civ5')||'{}');
        const malformed={...package1,schema_version:999};
        await applyCloudData({...legacy,package1_v2:malformed});
        const malformedResult={status:FB.package1V2Status,viewCleared:FB.package1V2ReadView===null,legacyCount:S.assets.length};
        const reader=window.Package1PortfolioSchemaMapping;
        window.Package1PortfolioSchemaMapping=null;
        await applyCloudData({...legacy,package1_v2:package1});
        const unavailableResult={status:FB.package1V2Status,viewCleared:FB.package1V2ReadView===null,legacyCount:S.assets.length};
        window.Package1PortfolioSchemaMapping=reader;
        await applyCloudData({...legacy,package1_v2:package1});
        return {applied,status:FB.package1V2Status,positions:FB.package1V2ReadView?.positions?.length,
          total:FB.package1V2ReadView?.snapshot?.total_official,legacySaved:!Object.hasOwn(saved,'package1_v2'),
          malformed:malformedResult,unavailable:unavailableResult};
      }finally{
        isLocalTestMode=previous.isLocalTestMode;
        isProtectedReadOnlyQaBoot=previous.isProtectedReadOnlyQaBoot;
        isAuthoritativeLocalRecoveryBoot=previous.isAuthoritativeLocalRecoveryBoot;
        window.ProtectedLocalCloudAuthority=previous.authority;
      }
    },productionPackage);
    assert.equal(hydration.status,'PRESENT');
    assert.equal(hydration.positions,35);
    assert.equal(hydration.total,140);
    assert.equal(hydration.legacySaved,true,'V2 must stay outside legacy local storage');
    assert.deepEqual(hydration.malformed,{status:'INVALID',viewCleared:true,legacyCount:JSON.parse(before).assets.length});
    assert.deepEqual(hydration.unavailable,{status:'UNAVAILABLE',viewCleared:true,legacyCount:JSON.parse(before).assets.length});
    const mergeSafety=await page.evaluate(currentV2=>{
      const latest=structuredClone(currentV2);
      latest.import_batch_id='SYN_CONCURRENT_NEWER_BATCH';
      const outgoing=mergeCloudReferencePayload({assets:[{id:'SYN_LEGACY_SAVE'}]},{package1_v2:currentV2});
      const afterFirestoreMerge={...{package1_v2:latest},...outgoing};
      return {outgoingHasV2:Object.hasOwn(outgoing,'package1_v2'),latestPreserved:afterFirestoreMerge.package1_v2.import_batch_id===latest.import_batch_id};
    },productionPackage);
    assert.deepEqual(mergeSafety,{outgoingHasV2:false,latestPreserved:true});
    const legacySave=await page.evaluate(async currentV2=>{
      const previous={isLocalTestMode,isProtectedReadOnlyQaBoot,isAuthoritativeLocalRecoveryBoot,
        isV250OfflineCachedSession,isEditOwner,periodicBackups:runV324PeriodicBackups,
        user:FB.user,db:FB.db,access:FB.access,cloudLoaded:FB.cloudLoaded,pending:FB.pendingCloudSave};
      const latestV2=structuredClone(currentV2);
      latestV2.import_batch_id='SYN_CONCURRENT_NEWER_BATCH';
      const remote={package1_v2:currentV2,wallets:[],assets:[],aportes:[],proventos:[],rfEvents:[]};
      let setPayload=null, setOptions=null;
      const ref={get:async()=>({exists:true,data:()=>remote}),set:async(payload,options)=>{
        setPayload=payload;setOptions=options;
        remote.package1_v2=latestV2; // Simulate a V2 update after the legacy read.
        Object.assign(remote,payload);
      }};
      isLocalTestMode=()=>false; isProtectedReadOnlyQaBoot=()=>false;
      isAuthoritativeLocalRecoveryBoot=()=>false; isV250OfflineCachedSession=()=>false;
      isEditOwner=()=>true; runV324PeriodicBackups=()=>{};
      FB.user={uid:'SYNTHETIC_UID'}; FB.db={collection:name=>({doc:id=>ref})};
      FB.access={...FB.access,allowed:true}; FB.cloudLoaded=true; FB.pendingCloudSave=false;
      window.firebase={firestore:{FieldValue:{serverTimestamp:()=> 'SYNTHETIC_SERVER_TIMESTAMP'}}};
      try{
        const result=await uploadLocalToCloud(false);
        return {pass:result?.pass===true,setCalled:!!setPayload,merge:setOptions?.merge===true,
          outgoingHasV2:Object.hasOwn(setPayload||{},'package1_v2'),concurrentV2Preserved:remote.package1_v2.import_batch_id===latestV2.import_batch_id};
      }finally{
        isLocalTestMode=previous.isLocalTestMode; isProtectedReadOnlyQaBoot=previous.isProtectedReadOnlyQaBoot;
        isAuthoritativeLocalRecoveryBoot=previous.isAuthoritativeLocalRecoveryBoot;
        isV250OfflineCachedSession=previous.isV250OfflineCachedSession; isEditOwner=previous.isEditOwner;
        runV324PeriodicBackups=previous.periodicBackups; FB.user=previous.user; FB.db=previous.db;
        FB.access=previous.access; FB.cloudLoaded=previous.cloudLoaded; FB.pendingCloudSave=previous.pending;
      }
    },productionPackage);
    assert.deepEqual(legacySave,{pass:true,setCalled:true,merge:true,outgoingHasV2:false,concurrentV2Preserved:true});
    for (const route of routes) {
      await page.evaluate(routeName => go(routeName), route);
      const panel=page.locator('.package1-portfolio-summary');
      await panel.waitFor();
      assert.equal(await panel.getAttribute('data-reconciliation'),'PARTIAL');
      const text=await panel.innerText();
      assert.match(text,/R\$\s?140,00/);
      assert.match(text,/R\$\s?132,00/);
      assert.match(text,/R\$\s?8,00/);
      assert.match(text,/lista legada/);
      assert.equal(await page.locator('.package1-v2-qa').count(),0);
    }
    assert.equal(await page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents })), before);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.server.closeAllConnections?.();
    await new Promise(resolve => server.server.close(resolve));
  }
});
