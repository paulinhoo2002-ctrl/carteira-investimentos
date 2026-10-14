'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const Mapping = require('../package1-portfolio-schema-mapping');
const Writer = require('../package1-transaction-writer');

function pkg() {
  const asOf = '2026-10-10';
  const batch = Mapping.CURRENT_IMPORT.import_batch_id;
  const positions = Array.from({ length: 35 }, (_, i) => ({
    collection: 'positions', document_id: `SYN_POS_${i + 1}`,
    data: { document_id: `SYN_POS_${i + 1}`, schema_version: 2, custodian_id: 'INTER',
      asset_id: `SYN_ASSET_${i + 1}`, asset_type: i < 31 ? 'RV_ACAO' : 'RF', quantity: 1,
      current_value: 1, as_of: asOf, average_cost: null, average_cost_status: 'UNKNOWN',
      cost_basis_value: null, cost_basis_status: 'UNKNOWN', cost_method: null,
      provenance: { source_id: `SYN_SRC_${i + 1}` }, source_ids: [`SYN_SRC_${i + 1}`],
      reconciliation_status: 'PARTIAL', import_batch_id: batch,
      created_at: '2026-10-14T12:00:00.000Z', updated_at: '2026-10-14T12:00:00.000Z' }
  }));
  const snapshot = { document_id: 'SYN_SNAPSHOT', snapshot_id: 'SYN_SNAPSHOT', schema_version: 1,
    custodian_id: 'INTER', as_of: asOf, rv_official: 31, rf_official: 4, total_official: 35,
    rv_detail_sum: 31, rf_detail_sum: 4, detail_total: 35, rv_gap: 0, rf_gap: 0, total_gap: 0,
    reconciliation_status: 'PARTIAL', provenance: { source_id: 'SYN_OFFICIAL' }, import_batch_id: batch };
  return { mode: 'LOCAL_DRY_RUN_ONLY', import_batch_id: batch,
    records: [...positions, { collection: 'account_snapshots', document_id: snapshot.document_id, data: snapshot }] };
}

function setup(overrides = {}) {
  const uid = 'SYN_OWNER_UID';
  const path = `portfolios/${uid}`;
  const before = { assets: [{ id: 'SYN_LEGACY_ASSET' }], settings: { theme: 'dark' } };
  const update = Mapping.buildPortfolioFieldUpdate(pkg());
  const updateTime = '2026-10-12T22:51:18.213843Z';
  const state = { document: structuredClone(overrides.document || before), updateTime: overrides.updateTime || updateTime };
  const ref = { path };
  const calls = [];
  const runTransaction = callback => callback({
    async get(documentRef) {
      assert.equal(documentRef, ref);
      calls.push(['get', documentRef.path]);
      return { exists: true, data: () => structuredClone(state.document), updateTime: state.updateTime };
    },
    update(documentRef, fields) {
      calls.push(['update', documentRef.path, structuredClone(fields)]);
      Object.assign(state.document, structuredClone(fields));
    }
  });
  return {
    uid, path, before, update, updateTime, state, ref, calls, runTransaction,
    args: { projectId: Writer.ALLOWED_PROJECT_ID, expectedProjectId: Writer.ALLOWED_PROJECT_ID,
      uid, expectedUid: uid, documentRef: ref, expectedPath: path, expectedUpdateTime: updateTime,
      expectedDocumentHash: Writer.hashCanonical(before), importBatchId: Mapping.CURRENT_IMPORT.import_batch_id,
      update, payloadHash: Writer.hashCanonical(update[Mapping.FIELD]), runTransaction }
  };
}

for (const [name, overrides, argsPatch] of [
  ['legacy field changed', { document: { assets: [{ id: 'changed' }], settings: { theme: 'dark' } } }, null],
  ['package1_v2 appeared', { document: { assets: [{ id: 'SYN_LEGACY_ASSET' }], settings: { theme: 'dark' }, package1_v2: { import_batch_id: 'OTHER' } } }, null],
  ['updateTime changed within the same millisecond', { updateTime: '2026-10-12T22:51:18.213999Z' }, null],
]) {
  test(`transaction writer aborts when ${name}`, async () => {
    const context = setup(overrides);
    await assert.rejects(Writer.writePackage1FieldTransaction({ ...context.args, ...argsPatch }), /PACKAGE1_(DOCUMENT_DRIFT|FIELD_ALREADY_PRESENT|UPDATE_TIME_DRIFT)/);
    assert.equal(context.calls.some(call => call[0] === 'update'), false);
  });
}

test('unchanged document allows only a simulated package1_v2 field update', async () => {
  const context = setup();
  const result = await Writer.writePackage1FieldTransaction(context.args);
  assert.equal(result.status, 'SIMULATED_WRITE_ALLOWED');
  assert.equal(context.calls[0][0], 'get');
  assert.deepEqual(context.calls[1], ['update', context.path, context.update]);
  assert.equal(context.state.document.settings.theme, 'dark');
  assert.equal(context.state.document.package1_v2.import_batch_id, context.args.importBatchId);
});

test('compares Firestore timestamp seconds and nanoseconds without Date precision loss', async () => {
  const context = setup();
  context.state.updateTime = { seconds: Math.floor(Date.parse('2026-10-12T22:51:18Z') / 1000), nanoseconds: 213843000 };
  const result = await Writer.writePackage1FieldTransaction(context.args);
  assert.equal(result.status, 'SIMULATED_WRITE_ALLOWED');
});

for (const [name, patch] of [
  ['wrong project', { projectId: 'demo-carteira-qa-emulator' }],
  ['wrong uid/path', { uid: 'OTHER_UID' }],
  ['wrong exact document path', { expectedPath: 'portfolios/OTHER_UID' }],
  ['wrong import batch', { importBatchId: 'WRONG_BATCH' }],
  ['malformed payload', { update: { package1_v2: { schema_version: 999 } }, payloadHash: '0'.repeat(64) }],
  ['payload hash', { payloadHash: 'f'.repeat(64) }],
]) {
  test(`transaction writer aborts on ${name}`, async () => {
    const context = setup();
    await assert.rejects(Writer.writePackage1FieldTransaction({ ...context.args, ...patch }));
    assert.equal(context.calls.some(call => call[0] === 'update'), false);
  });
}

test('rollback removes only this batch field and preserves unrelated later changes', async () => {
  const context = setup();
  await Writer.writePackage1FieldTransaction(context.args);
  context.state.document.settings = { theme: 'light', changedAfterImport: true };
  context.state.updateTime = '2026-10-14T01:00:00.000Z';
  const deleteField = Object.freeze({ sentinel: 'SYNTH_DELETE_FIELD' });
  const result = await Writer.rollbackPackage1FieldTransaction({
    projectId: Writer.ALLOWED_PROJECT_ID, expectedProjectId: Writer.ALLOWED_PROJECT_ID,
    uid: context.uid, expectedUid: context.uid, documentRef: context.ref, expectedPath: context.path,
    importBatchId: context.args.importBatchId,
    expectedCurrentPackageHash: Writer.hashCanonical(context.state.document.package1_v2),
    beforeField: { status: 'ABSENT' }, fieldDeleteValue: deleteField,
    runTransaction: async callback => callback({
      async get() { return { exists: true, data: () => structuredClone(context.state.document) }; },
      update(ref, fields) {
        assert.equal(ref, context.ref);
        assert.deepEqual(Object.keys(fields), ['package1_v2']);
        if (fields.package1_v2 === deleteField) delete context.state.document.package1_v2;
        else context.state.document.package1_v2 = structuredClone(fields.package1_v2);
      }
    })
  });
  assert.equal(result.status, 'SIMULATED_ROLLBACK_ALLOWED');
  assert.equal(Object.hasOwn(context.state.document, 'package1_v2'), false);
  assert.deepEqual(context.state.document.settings, { theme: 'light', changedAfterImport: true });
});

test('rollback aborts if the package field is no longer owned by the import batch', async () => {
  const context = setup({ document: { ...setup().before, package1_v2: { import_batch_id: 'OTHER' } } });
  let updateCount = 0;
  await assert.rejects(Writer.rollbackPackage1FieldTransaction({
    projectId: Writer.ALLOWED_PROJECT_ID, expectedProjectId: Writer.ALLOWED_PROJECT_ID,
    uid: context.uid, expectedUid: context.uid, documentRef: context.ref, expectedPath: context.path,
    importBatchId: context.args.importBatchId,
    expectedCurrentPackageHash: Writer.hashCanonical(context.state.document.package1_v2),
    beforeField: { status: 'ABSENT' }, fieldDeleteValue: {},
    runTransaction: callback => callback({ async get() { return { exists: true, data: () => context.state.document }; }, update() { updateCount++; } })
  }), /PACKAGE1_ROLLBACK_BATCH_MISMATCH/);
  assert.equal(updateCount, 0);
});

test('rollback does not restore a whole-document prior image or replace an earlier V2 field', async () => {
  const context = setup();
  await assert.rejects(Writer.rollbackPackage1FieldTransaction({
    projectId: Writer.ALLOWED_PROJECT_ID, expectedProjectId: Writer.ALLOWED_PROJECT_ID,
    uid: context.uid, expectedUid: context.uid, documentRef: context.ref, expectedPath: context.path,
    importBatchId: context.args.importBatchId, expectedCurrentPackageHash: 'a'.repeat(64),
    beforeField: { status: 'PRESENT', value: { import_batch_id: 'OLDER_BATCH' } },
    fieldDeleteValue: {}, runTransaction: () => { throw new Error('SHOULD_NOT_START'); }
  }), /PACKAGE1_ROLLBACK_PRECONDITION_INVALID/);
});
