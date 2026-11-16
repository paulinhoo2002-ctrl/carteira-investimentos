'use strict';
// SM173.9 — civ5 sem escopo nunca é vinculado automaticamente. O vínculo exige confirmação literal do proprietário.
// Executa o bloco REAL SM173-BEGIN/END do index.html com armazenamento falso (padrão de sm173-civ5-isolation).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const BLOCK = html.slice(html.indexOf('// SM173-BEGIN'), html.indexOf('// SM173-END'));
const OWNER = 'uid-owner-sintetico';
const OTHER = 'uid-outra-sintetica';
const RAW = JSON.stringify({ wallets: [{ id: 'w1', name: 'Carteira principal' }], aportes: [{ id: 'a1', ticker: 'BBAS3' }] });
const CONFIRM = 'VINCULAR CIV5 LEGADO';

function makeStorage() {
  const map = new Map();
  return {
    map,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: k => { map.delete(k); },
  };
}

function load({ storage, user = { uid: OWNER }, admin = true }) {
  const ctx = {
    STOR: 'civ5',
    localStorage: storage,
    FB: { user, app: { options: { projectId: 'carteira-homolog-sm118' } } },
    isAccessAdmin: u => Boolean(admin && u && u.uid === OWNER),
    render: () => {}, load: () => {}, window: {}, crypto: globalThis.crypto, TextEncoder,
    Promise, Object, String, Number, Array, JSON, Map, Set, Error,
    console: { log() {}, warn() {}, error() {} },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(BLOCK + '\nthis.__api={civ5Gate,civ5ConfirmLegacyBind,civ5BindIdentity,civ5LegacyBind,getScope:()=>CIV5_SCOPE};', ctx);
  return ctx;
}
async function bindAs(ctx, uid) { await ctx.__api.civ5BindIdentity({ uid }); return ctx; }

test('gate: civ5 sem escopo retorna LEGACY_UNBOUND e não grava nada', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), OWNER);
  assert.equal(c.__api.civ5Gate(), 'LEGACY_UNBOUND');
  assert.equal(st.getItem('civ5_owner'), null, 'sem vínculo automático');
  assert.equal(st.getItem('civ5_legacy_backup'), null, 'sem backup automático');
  assert.equal(st.getItem('civ5'), RAW, 'dados intactos');
});

test('gate repetido não muda estado (sem efeito colateral)', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), OWNER);
  const before = new Map(st.map);
  c.__api.civ5Gate(); c.__api.civ5Gate();
  assert.deepEqual([...st.map], [...before]);
});

test('confirmação com texto errado é recusada e não grava', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), OWNER);
  assert.equal(c.__api.civ5ConfirmLegacyBind('sim'), 'CONFIRMATION_REQUIRED');
  assert.equal(c.__api.civ5ConfirmLegacyBind(undefined), 'CONFIRMATION_REQUIRED');
  assert.equal(st.getItem('civ5_owner'), null);
  assert.equal(st.getItem('civ5_legacy_backup'), null);
});

test('confirmação literal pelo proprietário: backup verificado, vínculo e dados intactos', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), OWNER);
  assert.equal(c.__api.civ5ConfirmLegacyBind(CONFIRM), 'ok');
  assert.equal(st.getItem('civ5_legacy_backup'), RAW, 'backup idêntico');
  assert.equal(st.getItem('civ5'), RAW, 'origem preservada');
  assert.equal(st.getItem('civ5_owner'), c.__api.getScope());
  assert.equal(c.__api.civ5Gate(), 'ok');
});

test('conta que não é a proprietária não consegue vincular (sem backup, sem vínculo)', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st, user: { uid: OTHER }, admin: false }), OTHER);
  assert.equal(c.__api.civ5ConfirmLegacyBind(CONFIRM), 'LEGACY_NOT_OWNER');
  assert.equal(st.getItem('civ5_owner'), null);
  assert.equal(st.getItem('civ5_legacy_backup'), null);
  assert.equal(st.getItem('civ5'), RAW);
});

test('confirmação sem identidade confirmada é recusada', () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = load({ storage: st });
  assert.equal(c.__api.civ5ConfirmLegacyBind(CONFIRM), 'IDENTITY_UNCONFIRMED');
  assert.equal(st.getItem('civ5_owner'), null);
});

test('escopo já vinculado a outra conta: confirmação não reatribui', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  st.setItem('civ5_owner', 'escopo-de-outra-conta');
  const c = await bindAs(load({ storage: st }), OWNER);
  assert.equal(c.__api.civ5Gate(), 'FOREIGN_SCOPE');
  assert.equal(c.__api.civ5ConfirmLegacyBind(CONFIRM), 'FOREIGN_SCOPE', 'confirmação não reatribui escopo existente');
  assert.equal(st.getItem('civ5_owner'), 'escopo-de-outra-conta', 'escopo original preservado');
  assert.equal(st.getItem('civ5_legacy_backup'), null, 'sem backup novo');
});

test('armazenamento sem civ5 (conta nova): gate ok sem confirmação', async () => {
  const st = makeStorage();
  const c = await bindAs(load({ storage: st }), OWNER);
  assert.equal(c.__api.civ5Gate(), 'ok');
  assert.equal(st.getItem('civ5_legacy_backup'), null);
});
