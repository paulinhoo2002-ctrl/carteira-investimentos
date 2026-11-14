'use strict';
// SM173 — isolamento do civ5 por identidade (fase 1). Executa o bloco REAL delimitado por SM173-BEGIN/END do index.html
// com armazenamento falso. Garante: nunca apagar, nunca gravar sobre o civ5 de outra identidade, backup verificado no legado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const begin = html.indexOf('// SM173-BEGIN');
const end = html.indexOf('// SM173-END');
assert.ok(begin > 0 && end > begin, 'bloco SM173 delimitado no index.html');
const BLOCK = html.slice(begin, end);

const OWNER = 'uid-owner-sintetico';
const OTHER = 'uid-outra-sintetica';
const RAW = JSON.stringify({ wallets: [{ id: 'w1', name: 'Carteira principal' }], aportes: [{ id: 'a1', ticker: 'BBAS3' }] });

function makeStorage({ failSet = null, silentSet = null } = {}) {
  const map = new Map();
  return {
    map,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (failSet && failSet(k)) throw new Error('QuotaExceededError');
      if (silentSet && silentSet(k)) return;
      map.set(k, String(v));
    },
    removeItem: k => { map.delete(k); },
  };
}

function load({ storage, user = { uid: OWNER }, admin = true, project = 'carteira-homolog-sm118' } = {}) {
  const ctx = {
    STOR: 'civ5',
    localStorage: storage,
    FB: { user, app: { options: { projectId: project } } },
    isAccessAdmin: u => Boolean(admin && u && u.uid === OWNER),
    render: () => {},
    load: () => { ctx.__loaded = (ctx.__loaded || 0) + 1; },
    window: {},
    crypto: globalThis.crypto,
    TextEncoder,
    Promise, Object, String, Number, Array, JSON, Map, Set, Error,
    console: { log() {}, warn() {}, error() {} },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(BLOCK + '\nthis.__api={civ5ScopeFor,civ5Gate,civ5GateReadOnly,civ5BindIdentity,civ5LegacyBind,getScope:()=>CIV5_SCOPE};', ctx);
  return ctx;
}

async function bindAs(ctx, user) {
  await ctx.__api.civ5BindIdentity(user);
  return ctx;
}

test('escopo: estável por ambiente e UID (homologação ≠ produção; UID ≠ UID)', async () => {
  const c = load({ storage: makeStorage() });
  const a = await c.__api.civ5ScopeFor('carteira-homolog-sm118', OWNER);
  const b = await c.__api.civ5ScopeFor('carteira-homolog-sm118', OWNER);
  const prod = await c.__api.civ5ScopeFor('carteira-de-investimento-16725', OWNER);
  const other = await c.__api.civ5ScopeFor('carteira-homolog-sm118', OTHER);
  assert.equal(a, b, 'determinístico');
  assert.notEqual(a, prod, 'ambiente diferente, escopo diferente');
  assert.notEqual(a, other, 'UID diferente, escopo diferente');
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('identidade ausente: gate bloqueia (IDENTITY_UNCONFIRMED) sem tocar no armazenamento', () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = load({ storage: st });
  assert.equal(c.civ5Gate(), 'IDENTITY_UNCONFIRMED');
  assert.equal(st.getItem('civ5'), RAW);
  assert.equal(st.getItem('civ5_owner'), null);
});

test('armazenamento vazio + identidade confirmada: vincula sem backup', async () => {
  const st = makeStorage();
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'ok');
  assert.equal(st.getItem('civ5_owner'), c.__api.getScope());
  assert.equal(st.getItem('civ5_legacy_backup'), null, 'nada a copiar');
});

test('legado do dono (civ5 com dados, sem escopo): backup verificado antes do vínculo; dados intactos', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st, admin: true }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'ok');
  assert.equal(st.getItem('civ5_legacy_backup'), RAW, 'backup idêntico ao legado');
  assert.equal(st.getItem('civ5'), RAW, 'civ5 não foi alterado pela migração');
  assert.equal(st.getItem('civ5_owner'), c.__api.getScope());
});

test('legado de conta que NÃO é o dono: bloqueado, sem backup e sem vínculo', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st, user: { uid: OTHER }, admin: false }), { uid: OTHER });
  assert.equal(c.civ5Gate(), 'LEGACY_NOT_OWNER');
  assert.equal(st.getItem('civ5_owner'), null);
  assert.equal(st.getItem('civ5_legacy_backup'), null);
  assert.equal(st.getItem('civ5'), RAW);
});

test('escopo divergente: bloqueia e não toca civ5, vínculo nem backup', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  st.setItem('civ5_owner', 'escopo-de-outra-conta');
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'FOREIGN_SCOPE');
  assert.equal(st.getItem('civ5'), RAW);
  assert.equal(st.getItem('civ5_owner'), 'escopo-de-outra-conta');
  assert.equal(st.getItem('civ5_legacy_backup'), null);
});

test('backup existente e diferente: conflito, não sobrescreve backup nem vincula', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  st.setItem('civ5_legacy_backup', 'backup-anterior-diferente');
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'LEGACY_BACKUP_CONFLICT');
  assert.equal(st.getItem('civ5_legacy_backup'), 'backup-anterior-diferente');
  assert.equal(st.getItem('civ5_owner'), null);
});

test('falha de quota ao copiar backup: migração não conclui, legado preservado', async () => {
  const st = makeStorage({ failSet: k => k === 'civ5_legacy_backup' });
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'LEGACY_BACKUP_FAILED');
  assert.equal(st.getItem('civ5_owner'), null);
  assert.equal(st.getItem('civ5'), RAW);
});

test('backup silenciosamente não gravado: verificação falha, não vincula', async () => {
  const st = makeStorage({ silentSet: k => k === 'civ5_legacy_backup' });
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'LEGACY_BACKUP_VERIFY_FAILED');
  assert.equal(st.getItem('civ5_owner'), null);
});

test('reinício entre backup e vínculo: segunda tentativa conclui sem alterar o backup', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  st.setItem('civ5_legacy_backup', RAW); // backup já feito, vínculo não
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'ok');
  assert.equal(st.getItem('civ5_legacy_backup'), RAW);
});

test('idempotente: depois de vinculado, o gate continua ok sem novas gravações', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'ok');
  const snap = new Map(st.map);
  assert.equal(c.civ5Gate(), 'ok');
  assert.deepEqual(st.map, snap);
});

test('leitura offline não tem efeito colateral: sem vínculo, não migra nem grava', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  st.map.delete('civ5_owner');
  const snap = new Map(st.map);
  assert.equal(c.civ5GateReadOnly(), 'NOT_BOUND');
  assert.deepEqual(st.map, snap);
});

test('armazenamento indisponível: gate bloqueia com motivo explícito', async () => {
  const st = makeStorage();
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  st.getItem = () => { throw new Error('SecurityError'); };
  assert.equal(c.civ5Gate(), 'STORAGE_UNAVAILABLE');
});

test('troca de identidade no mesmo navegador: segunda conta não herda o civ5 da primeira', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const owner = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(owner.civ5Gate(), 'ok');
  const other = await bindAs(load({ storage: st, user: { uid: OTHER }, admin: false }), { uid: OTHER });
  assert.equal(other.civ5Gate(), 'FOREIGN_SCOPE', 'vínculo pertence ao dono');
  assert.equal(st.getItem('civ5'), RAW, 'dados do dono intactos');
});

test('logout (sem identidade) bloqueia o gate e preserva o civ5 do dono', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const c = await bindAs(load({ storage: st }), { uid: OWNER });
  assert.equal(c.civ5Gate(), 'ok');
  await c.__api.civ5BindIdentity(null);
  assert.equal(c.__api.getScope(), null);
  assert.equal(c.civ5Gate(), 'IDENTITY_UNCONFIRMED');
  assert.equal(st.getItem('civ5'), RAW);
  assert.equal(st.getItem('civ5_owner') !== null, true, 'vínculo persistido para a próxima entrada do dono');
});

test('alteração pendente sobrevive ao recarregamento da mesma identidade', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  const first = await bindAs(load({ storage: st }), { uid: OWNER });
  st.setItem('civ5_pending_owner', first.__api.getScope());
  // novo carregamento da página, mesma identidade
  const again = load({ storage: st });
  again.FB.pendingCloudSave = false;
  await again.__api.civ5BindIdentity({ uid: OWNER });
  assert.equal(again.FB.pendingCloudSave, true, 'pendência restaurada');
  assert.equal(again.__loaded, 1, 'estado local recarregado do civ5');
});

test('pendência de outra identidade não é restaurada para a conta atual', async () => {
  const st = makeStorage();
  st.setItem('civ5', RAW);
  await bindAs(load({ storage: st }), { uid: OWNER });
  st.setItem('civ5_pending_owner', 'escopo-de-outra-conta');
  const c = load({ storage: st });
  c.FB.pendingCloudSave = false;
  await c.__api.civ5BindIdentity({ uid: OWNER });
  assert.equal(c.FB.pendingCloudSave, false);
  assert.equal(c.__loaded, undefined);
});
