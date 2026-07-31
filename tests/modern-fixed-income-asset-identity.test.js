const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const modulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'fixed-income',
  'fixedIncomeAssetIdentity.ts'
);

async function loadModule() {
  return import(pathToFileURL(modulePath).href);
}

test('resolveFixedIncomeAssetId: id string', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: 'rf-cdb26' }), 'rf-cdb26');
});

test('resolveFixedIncomeAssetId: id numérico positivo', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: 12345 }), '12345');
});

test('resolveFixedIncomeAssetId: assetId fallback', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ assetId: 'abc' }), 'abc');
});

test('resolveFixedIncomeAssetId: rf_asset_id fallback', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ rf_asset_id: 'legacy-001' }), 'legacy-001');
});

test('resolveFixedIncomeAssetId: rf_id fallback', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ rf_id: 'rf-001' }), 'rf-001');
});

test('resolveFixedIncomeAssetId: fixed_id fallback', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ fixed_id: 'fix-001' }), 'fix-001');
});

test('resolveFixedIncomeAssetId: precedência completa (id vence assetId)', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: 'aaa', assetId: 'bbb' }), 'aaa');
});

test('resolveFixedIncomeAssetId: precedência assetId vence rf_asset_id', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ assetId: 'bbb', rf_asset_id: 'ccc' }), 'bbb');
});

test('resolveFixedIncomeAssetId: precedência rf_asset_id vence rf_id', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ rf_asset_id: 'ccc', rf_id: 'ddd' }), 'ccc');
});

test('resolveFixedIncomeAssetId: precedência rf_id vence fixed_id', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ rf_id: 'ddd', fixed_id: 'eee' }), 'ddd');
});

test('resolveFixedIncomeAssetId: campos divergentes no mesmo objeto', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  const obj = { id: 'aaa', assetId: 'bbb', rf_asset_id: 'ccc', rf_id: 'ddd', fixed_id: 'eee' };
  assert.equal(resolveFixedIncomeAssetId(obj), 'aaa');
});

test('resolveFixedIncomeAssetId: vazio retorna null', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({}), null);
});

test('resolveFixedIncomeAssetId: string vazia pula para próximo', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: '', assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: whitespace pula para próximo', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: '  ', assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: zero numérico é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: 0, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: string "0" é aceita', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: '0' }), '0');
});

test('resolveFixedIncomeAssetId: número negativo é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: -1, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: NaN é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: NaN, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: Infinity é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: Infinity, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: -Infinity é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: -Infinity, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: boolean é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: true, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: bigint é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: 123n, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: array é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: [1, 2], assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: objeto é rejeitado', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: { a: 1 }, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: entrada null retorna null', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId(null), null);
});

test('resolveFixedIncomeAssetId: entrada primitiva retorna null', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId('string'), null);
  assert.equal(resolveFixedIncomeAssetId(123), null);
  assert.equal(resolveFixedIncomeAssetId(undefined), null);
});

test('resolveFixedIncomeAssetId: sourceEventId isolado retorna null', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ sourceEventId: 'evt-001' }), null);
});

test('resolveFixedIncomeAssetId: primeiro inválido seguido por válido', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  assert.equal(resolveFixedIncomeAssetId({ id: null, assetId: 'ok' }), 'ok');
  assert.equal(resolveFixedIncomeAssetId({ id: '', assetId: 'ok' }), 'ok');
  assert.equal(resolveFixedIncomeAssetId({ id: 0, assetId: 'ok' }), 'ok');
  assert.equal(resolveFixedIncomeAssetId({ id: NaN, assetId: 'ok' }), 'ok');
});

test('resolveFixedIncomeAssetId: determinismo', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  const obj = { id: 'test', assetId: 'other' };
  for (let i = 0; i < 100; i++) {
    assert.equal(resolveFixedIncomeAssetId(obj), 'test');
  }
});

test('resolveFixedIncomeAssetId: não muta entrada', async () => {
  const { resolveFixedIncomeAssetId } = await loadModule();
  const obj = { id: 'test' };
  const before = { ...obj };
  resolveFixedIncomeAssetId(obj);
  assert.deepEqual(obj, before);
});

test('normalizeEventAssetId: assetId string', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: 'rf-cdb26' }), 'rf-cdb26');
});

test('normalizeEventAssetId: asset_id fallback', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ asset_id: 'rf-cdb26' }), 'rf-cdb26');
});

test('normalizeEventAssetId: assetId numérico positivo', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: 12345 }), '12345');
});

test('normalizeEventAssetId: zero numérico rejeitado', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: 0 }), null);
});

test('normalizeEventAssetId: negativo rejeitado', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: -1 }), null);
});

test('normalizeEventAssetId: NaN rejeitado', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: NaN }), null);
});

test('normalizeEventAssetId: Infinity rejeitado', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: Infinity }), null);
});

test('normalizeEventAssetId: boolean rejeitado', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: true }), null);
});

test('normalizeEventAssetId: string vazia retorna null', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: '' }), null);
});

test('normalizeEventAssetId: whitespace retorna null', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId({ assetId: '  ' }), null);
});

test('normalizeEventAssetId: entrada null retorna null', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId(null), null);
});

test('normalizeEventAssetId: entrada array retorna null', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId([{ assetId: 'test' }]), null);
});

test('normalizeEventAssetId: entrada primitiva retorna null', async () => {
  const { normalizeEventAssetId } = await loadModule();
  assert.equal(normalizeEventAssetId('string'), null);
  assert.equal(normalizeEventAssetId(123), null);
});