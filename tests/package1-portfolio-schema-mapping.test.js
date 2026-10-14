'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const PersistenceCore = require('../persistence-core');
const Mapping = require('../package1-portfolio-schema-mapping');

function syntheticPackage() {
  const asOf = '2026-10-10';
  const batch = 'SYN_PACKAGE1_BATCH';
  const positions = Array.from({ length: 35 }, (_, index) => {
    const assetType = index < 31 ? 'RV_ACAO' : 'RF';
    const amount = assetType === 'RV_ACAO' ? (index === 0 ? 97 : 1) : 1;
    const sourceId = `SYN_SOURCE_${index + 1}`;
    const documentId = `SYN_POSITION_${index + 1}`;
    return {
      collection: 'positions', document_id: documentId,
      data: {
        document_id: documentId, schema_version: 2, custodian_id: 'SYN_CUSTODIAN',
        asset_id: `SYN_ASSET_${index + 1}`, asset_type: assetType, quantity: 1,
        current_value: amount, as_of: asOf, average_cost: null,
        average_cost_status: 'UNKNOWN', cost_basis_value: index < 25 ? 0.5 : null,
        cost_basis_status: index < 25 ? 'DERIVED' : 'UNKNOWN', cost_method: index < 25 ? 'FIFO' : null,
        provenance: { source_id: sourceId }, source_ids: [sourceId],
        reconciliation_status: 'PARTIAL', import_batch_id: batch,
        created_at: '2026-10-14T12:00:00.000Z', updated_at: '2026-10-14T12:00:00.000Z'
      }
    };
  });
  const snapshot = {
    document_id: 'SYN_SNAPSHOT', snapshot_id: 'SYN_SNAPSHOT', schema_version: 1,
    custodian_id: 'SYN_CUSTODIAN', as_of: asOf,
    rv_official: 130, rf_official: 10, total_official: 140,
    rv_detail_sum: 128, rf_detail_sum: 4, detail_total: 132,
    rv_gap: 2, rf_gap: 6, total_gap: 8,
    reconciliation_status: 'PARTIAL', provenance: { source_id: 'SYN_OFFICIAL_SOURCE' },
    import_batch_id: batch
  };
  // Detail is intentionally corrected to equal the synthetic snapshot's class sums.
  positions[0].data.current_value = 100;
  for (let index = 1; index < 31; index++) positions[index].data.current_value = 28 / 30;
  // Use cent values for all positions and an arithmetic-consistent snapshot.
  positions[0].data.current_value = 100;
  positions[1].data.current_value = 28;
  for (let index = 2; index < 31; index++) positions[index].data.current_value = 0;
  positions[31].data.current_value = 4;
  positions[32].data.current_value = 0;
  positions[33].data.current_value = 0;
  positions[34].data.current_value = 0;
  snapshot.rv_detail_sum = 128;
  snapshot.rf_detail_sum = 4;
  snapshot.detail_total = 132;
  snapshot.rv_official = 130;
  snapshot.total_official = 140;
  snapshot.rv_gap = 2;
  snapshot.rf_gap = 6;
  snapshot.total_gap = 8;
  return { mode: 'LOCAL_DRY_RUN_ONLY', import_batch_id: batch,
    records: [...positions, { collection: 'account_snapshots', document_id: snapshot.document_id, data: snapshot }] };
}

test('embedded schema maps 36 source records into one atomic portfolio field update', () => {
  const packageData = syntheticPackage();
  const update = Mapping.buildPortfolioFieldUpdate(packageData);
  const embedded = update[Mapping.FIELD];
  assert.equal(Object.keys(update).length, 1);
  assert.equal(embedded.schema_version, 1);
  assert.equal(embedded.detail_positions.length, 35);
  assert.equal(embedded.official_snapshot.total_official, 140);
  assert.equal(embedded.reconciliation.status, 'PARTIAL');
  assert.equal(embedded.reconciliation.detail_coverage, 'PARTIAL');
  assert.equal(embedded.detail_positions.filter(position => position.cost_basis_status === 'DERIVED').length, 25);
  assert.equal(embedded.detail_positions.filter(position => position.cost_basis_status === 'UNKNOWN').length, 10);
  assert.ok(embedded.detail_positions.every(position => position.average_cost === null));
  assert.equal(Mapping.readEmbeddedPackage1({ [Mapping.FIELD]: embedded }).status, 'PRESENT');
});

test('legacy-only and legacy-plus-V2 documents round trip while the V2 field stays outside legacy state', () => {
  const legacy = { assets: [{ id: 'SYN_OLD', type: 'Ação', qty: 2, avg_price: 3 }],
    aportes: [], proventos: [], rfEvents: [], wallets: [] };
  const legacyReloaded = PersistenceCore.parseStoredState(PersistenceCore.serializeStoredState(legacy));
  assert.equal(legacyReloaded.assets[0].qty, 2);
  assert.equal(Mapping.readEmbeddedPackage1(legacyReloaded).status, 'ABSENT');

  const merged = Mapping.simulateFieldUpdate(legacy, Mapping.buildPortfolioFieldUpdate(syntheticPackage()));
  const legacyReloadAfterSave = PersistenceCore.parseStoredState(PersistenceCore.serializeStoredState(merged));
  assert.equal(legacyReloadAfterSave.assets[0].id, 'SYN_OLD');
  assert.equal(Object.hasOwn(legacyReloadAfterSave, Mapping.FIELD), false);
  assert.equal(Mapping.readEmbeddedPackage1(merged).status, 'PRESENT');
  const nextLegacyCloudSave = Mapping.simulateLegacyMerge(merged, { assets: legacy.assets, wallets: legacy.wallets });
  assert.deepEqual(nextLegacyCloudSave[Mapping.FIELD], merged[Mapping.FIELD]);
});

test('V2-only and partial V2 remain explicit without zero defaults', () => {
  const update = Mapping.buildPortfolioFieldUpdate(syntheticPackage());
  const v2Only = Mapping.simulateFieldUpdate({}, update);
  const parsedLegacyShape = PersistenceCore.parseStoredState(JSON.stringify(v2Only));
  assert.equal(Array.isArray(parsedLegacyShape.assets), false);
  assert.equal(Mapping.readEmbeddedPackage1(v2Only).view.positions.length, 35);
  const partial = structuredClone(v2Only);
  partial[Mapping.FIELD].detail_positions[0].average_cost = null;
  partial[Mapping.FIELD].detail_positions[0].average_cost_status = 'UNKNOWN';
  assert.equal(Mapping.readEmbeddedPackage1(partial).view.positions[0].average_cost, null);
  assert.equal(Mapping.readEmbeddedPackage1(partial).view.snapshot.total_official, 140);
});

test('malformed or conflicting V2 fails closed and never falls back to fabricated legacy totals', () => {
  const valid = Mapping.buildPortfolioFieldUpdate(syntheticPackage())[Mapping.FIELD];
  const incomplete = structuredClone(valid);
  incomplete.detail_positions.pop();
  for (const malformed of [null, {}, { ...valid, schema_version: 99 },
    { ...valid, reconciliation: { ...valid.reconciliation, status: 'COMPLETE' } },
    { ...valid, provenance: { source_ids: [] } }, incomplete]) {
    assert.throws(() => Mapping.readEmbeddedPackage1({ [Mapping.FIELD]: malformed }), /PACKAGE1_EMBEDDED/);
  }
  assert.throws(() => Mapping.toEmbeddedPackage1({ mode: 'LOCAL_DRY_RUN_ONLY', records: [] }), /PACKAGE1/);
});

test('declared package batch must match the official snapshot batch', () => {
  const packageData = syntheticPackage();
  packageData.import_batch_id = 'SYN_OTHER_BATCH';
  assert.throws(() => Mapping.toEmbeddedPackage1(packageData), /PACKAGE1_BATCH_MISMATCH/);
});

test('legacy cloud merge preserves one canonical embedded V2 copy and has exact rollback image', () => {
  const before = { wallets: [], assets: [{ id: 'SYN_LEGACY' }] };
  const after = Mapping.simulateFieldUpdate(before, Mapping.buildPortfolioFieldUpdate(syntheticPackage()));
  const exactBeforeBackup = structuredClone(before);
  const legacySave = Mapping.simulateLegacyMerge(after, { wallets: [], assets: [{ id: 'SYN_LEGACY' }] });
  assert.deepEqual(legacySave[Mapping.FIELD], after[Mapping.FIELD]);
  assert.deepEqual(exactBeforeBackup, before);
  assert.equal(after[Mapping.FIELD].official_snapshot.total_official, 140);
  assert.equal(after[Mapping.FIELD].reconciliation.detail_coverage, 'PARTIAL');
});

test('production legacy merge omits V2 to prevent stale overwrite and Firestore merge preserves latest value', () => {
  const packageV2=Mapping.buildPortfolioFieldUpdate(syntheticPackage())[Mapping.FIELD];
  const cloud={assets:[{id:'SYN_LEGACY'}],[Mapping.FIELD]:packageV2};
  const payload={assets:[{id:'SYN_UPDATED'}]};
  const dropping=Mapping.mergeLegacyCloudPayload(payload,cloud,()=>({assets:payload.assets}));
  assert.equal(Object.hasOwn(dropping,Mapping.FIELD),false);
  const mutating=Mapping.mergeLegacyCloudPayload(payload,cloud,()=>({assets:payload.assets,[Mapping.FIELD]:{schema_version:999}}));
  assert.equal(Object.hasOwn(mutating,Mapping.FIELD),false);
  assert.equal(Object.hasOwn(payload,Mapping.FIELD),false);
  const concurrentV2=structuredClone(packageV2);
  concurrentV2.import_batch_id='SYN_NEWER_BATCH';
  const latestCloud={...cloud,[Mapping.FIELD]:concurrentV2};
  const afterLegacySet=Mapping.simulateLegacyMerge(latestCloud,dropping);
  assert.deepEqual(afterLegacySet[Mapping.FIELD],concurrentV2,'legacy merge must preserve concurrent newer V2');
});

test('current Package 1 boundary rejects a coherent but wrong batch, custodian, or as-of date',()=>{
  const current=Mapping.buildPortfolioFieldUpdate(syntheticPackage())[Mapping.FIELD];
  current.import_batch_id='INTER_CURRENT_POSITION_2026-10-10_V1';
  current.custodian_id='INTER';
  current.official_snapshot.import_batch_id=current.import_batch_id;
  current.official_snapshot.custodian_id=current.custodian_id;
  for(const position of current.detail_positions){
    position.import_batch_id=current.import_batch_id;
    position.custodian_id=current.custodian_id;
  }
  assert.equal(Mapping.readCurrentPackage1({[Mapping.FIELD]:current}).status,'PRESENT');
  for(const mutate of [value=>{value.import_batch_id='SYN_WRONG_BATCH';value.official_snapshot.import_batch_id=value.import_batch_id;value.detail_positions.forEach(row=>row.import_batch_id=value.import_batch_id);},
    value=>{value.custodian_id='OTHER';value.official_snapshot.custodian_id='OTHER';value.detail_positions.forEach(row=>row.custodian_id='OTHER');},
    value=>{value.as_of='2026-10-09';value.official_snapshot.as_of='2026-10-09';value.detail_positions.forEach(row=>row.as_of='2026-10-09');}]){
    const wrong=structuredClone(current); mutate(wrong);
    assert.throws(()=>Mapping.readCurrentPackage1({[Mapping.FIELD]:wrong}),/PACKAGE1_IMPORT_IDENTITY_MISMATCH/);
  }
});
