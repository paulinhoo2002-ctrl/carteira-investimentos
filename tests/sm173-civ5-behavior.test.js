'use strict';
// SM173 — testes COMPORTAMENTAIS da persistência por identidade. Executam o código REAL de index.html
// (bloco SM173, queueCloudSave e uploadLocalToCloud) com armazenamento falso e nuvem simulada.
// Não verificam strings: verificam estado (civ5, marcador de pendência, chamadas à nuvem).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function functionSource(name) {
  const asyncStart = html.indexOf(`\nasync function ${name}(`);
  const plainStart = html.indexOf(`\nfunction ${name}(`);
  const start = asyncStart >= 0 ? asyncStart + 1 : plainStart + 1;
  assert.ok(start >= 0, `função ${name} não encontrada`);
  const end = html.indexOf('\n}\n', start);
  assert.ok(end > start, `fim de ${name} não encontrado`);
  return html.slice(start, end + 3);
}

const BLOCK = html.slice(html.indexOf('// SM173-BEGIN'), html.indexOf('// SM173-END'));
const OWNER = 'uid-dono-sintetico';
const OTHER = 'uid-outra-sintetica';
const PROJECT = 'carteira-homolog-sm118';
const SOURCE = [BLOCK, functionSource('queueCloudSave'), functionSource('uploadLocalToCloud')].join('\n');

class MemStorage {
  constructor() { this.map = new Map(); this.failSetKeys = new Set(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { if (this.failSetKeys.has(k)) throw new Error('QuotaExceededError'); this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

// Cria um "app" com estado próprio, mas armazenamento compartilhável (duas abas / reinício).
function makeApp({ storage, user, admin = true, cloud }) {
  const app = {
    storage,
    cloud,           // { doc: null|object, failSet: false, delayMs: 0, sets: [] }
    loadCalls: 0,
    renders: 0,
  };
  const ctx = {
    STOR: 'civ5',
    localStorage: storage,
    FB: {
      user, app: { options: { projectId: PROJECT } }, ready: true, authResolved: true,
      cloudLoaded: true, access: { allowed: true }, accountMode: 'REAL',
      pendingCloudSave: false, syncInFlight: false, applying: false, civ5EditSeq: 0,
      cloudRetryTimer: null, saveTimer: null, cloudSyncTimeoutTimer: null,
    },
    S: { aportes: [], assets: [], wallets: [{ id: 'w1', name: 'Carteira principal' }], proventos: [], rfEvents: [] },
    isAccessAdmin: u => Boolean(admin && u && u.uid === OWNER),
    isLocalTestMode: () => false,
    isProtectedReadOnlyQaBoot: () => false,
    isAuthoritativeLocalRecoveryBoot: () => false,
    isEditOwner: () => true,
    isV250OfflineCachedSession: () => false,
    isTransientCloudError: () => false,
    logCloudSyncError: () => {},
    scheduleCloudRetry: () => {},
    runV324PeriodicBackups: () => {},
    cloudSyncErrorMessage: () => 'falha',
    toast: () => {},
    render: () => { app.renders++; },
    load: () => { app.loadCalls++; },
    cloudPayload: () => ({ aportes: JSON.parse(JSON.stringify(ctx.S.aportes)) }),
    mergeCloudReferencePayload: p => p,
    // Leitura prévia real: documento inexistente lança CLOUD_DOCUMENT_MISSING; erro de rede é outro erro.
    readFreshCloudPayload: async () => {
      if (cloud.readError) throw cloud.readError;
      if (!cloud.doc) throw new Error('CLOUD_DOCUMENT_MISSING');
      return cloud.doc;
    },
    portfolioRef: () => ({
      set: async payload => {
        cloud.sets.push(payload);
        if (cloud.delayMs) await new Promise(r => setTimeout(r, cloud.delayMs));
        if (cloud.failSet) throw new Error('network-request-failed');
        cloud.doc = JSON.parse(JSON.stringify(payload));
      },
    }),
    firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    crypto: globalThis.crypto,
    navigator: { onLine: true },
    TextEncoder,
    Promise, Object, String, Number, Array, JSON, Map, Set, Error, Date, Math,
    setTimeout: (fn, ms) => { app.timers = (app.timers || []); const t = globalThis.setTimeout(fn, ms); app.timers.push(t); return t; },
    clearTimeout: t => globalThis.clearTimeout(t),
    console: { log() {}, warn() {}, error() {}, info() {} },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SOURCE + '\nthis.__api={civ5Gate,civ5GateReadOnly,civ5BindIdentity,queueCloudSave,uploadLocalToCloud,getScope:()=>CIV5_SCOPE};', ctx);
  app.ctx = ctx;
  app.api = ctx.__api;
  app.setUser = u => { ctx.FB.user = u; };
  return app;
}

const RAW_BEFORE = JSON.stringify({ wallets: [{ id: 'w1', name: 'Carteira principal' }], aportes: [{ id: 'a0', ticker: 'BBAS3', qty: 1 }] });

test('falha de envio à nuvem preserva a pendência (marcador e estado local)', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const app = makeApp({ storage, user: { uid: OWNER }, cloud });
  await app.api.civ5BindIdentity({ uid: OWNER });
  app.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  app.api.queueCloudSave();
  assert.equal(app.ctx.FB.pendingCloudSave, true);
  assert.equal(storage.getItem('civ5_pending_owner'), app.api.getScope(), 'pendência marcada com o escopo');
  cloud.failSet = true;
  const r = await app.api.uploadLocalToCloud(false);
  assert.equal(r.pass, false, 'envio falhou');
  assert.equal(app.ctx.FB.pendingCloudSave, true, 'pendência preservada após falha');
  assert.equal(storage.getItem('civ5_pending_owner'), app.api.getScope(), 'marcador preservado após falha');
});

test('envio concluído limpa a pendência somente após sucesso confirmado', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const app = makeApp({ storage, user: { uid: OWNER }, cloud });
  await app.api.civ5BindIdentity({ uid: OWNER });
  app.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  app.api.queueCloudSave();
  const r = await app.api.uploadLocalToCloud(false);
  assert.equal(r.pass, true);
  assert.equal(app.ctx.FB.pendingCloudSave, false);
  assert.equal(storage.getItem('civ5_pending_owner'), null, 'marcador removido após sucesso');
  assert.deepEqual(cloud.doc.aportes.map(a => a.ticker), ['PETR4'], 'nuvem recebeu o dado do dono');
});

test('edição concorrente durante o envio impede limpeza prematura do marcador', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: false, delayMs: 30, sets: [] };
  const app = makeApp({ storage, user: { uid: OWNER }, cloud });
  await app.api.civ5BindIdentity({ uid: OWNER });
  app.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  app.api.queueCloudSave();
  const pending = app.api.uploadLocalToCloud(false);
  // edição enquanto o envio está em andamento
  await new Promise(r => globalThis.setTimeout(r, 5));
  app.ctx.S.aportes.push({ id: 'a2', ticker: 'VALE3', qty: 3 });
  app.api.queueCloudSave();
  const r = await pending;
  assert.equal(r.pass, true, 'primeiro envio concluiu');
  assert.equal(app.ctx.FB.pendingCloudSave, true, 'a segunda edição mantém a pendência');
  assert.equal(storage.getItem('civ5_pending_owner'), app.api.getScope(), 'marcador mantido para a edição posterior');
});

test('reinício da aba com alteração pendente: a mesma identidade restaura e mantém a pendência', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: true, delayMs: 0, sets: [] };
  const first = makeApp({ storage, user: { uid: OWNER }, cloud });
  await first.api.civ5BindIdentity({ uid: OWNER });
  first.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  first.api.queueCloudSave();
  await first.api.uploadLocalToCloud(false);
  const scope = first.api.getScope();
  // "reinício": nova aba, mesmo armazenamento, mesma identidade; alteração não enviada persiste em civ5
  cloud.failSet = false;
  const second = makeApp({ storage, user: { uid: OWNER }, cloud });
  await second.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(second.ctx.FB.pendingCloudSave, true, 'pendência restaurada após reinício');
  assert.equal(second.loadCalls, 1, 'estado local recarregado do civ5 da mesma identidade');
  assert.equal(second.api.getScope(), scope);
});

test('outra identidade não herda a pendência nem envia dados locais do dono', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: true, delayMs: 0, sets: [] };
  const owner = makeApp({ storage, user: { uid: OWNER }, cloud });
  await owner.api.civ5BindIdentity({ uid: OWNER });
  owner.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  owner.api.queueCloudSave();
  await owner.api.uploadLocalToCloud(false);
  const civBefore = storage.getItem('civ5');
  cloud.failSet = false;
  const other = makeApp({ storage, user: { uid: OTHER }, admin: false, cloud });
  await other.api.civ5BindIdentity({ uid: OTHER });
  assert.equal(other.loadCalls, 0, 'outra identidade não recarrega a pendência do dono');
  assert.equal(other.ctx.FB.pendingCloudSave, false);
  other.ctx.FB.pendingCloudSave = true;
  const r = await other.api.uploadLocalToCloud(false);
  assert.equal(r.pass, false, 'envio bloqueado para a identidade estrangeira');
  assert.equal(cloud.sets.length, 1, 'nenhuma escrita de outra identidade na nuvem');
  assert.equal(storage.getItem('civ5'), civBefore, 'civ5 do dono intacto');
});

test('troca de usuário e retorno à identidade original preservam os dados do dono', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const owner = makeApp({ storage, user: { uid: OWNER }, cloud });
  await owner.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(owner.api.civ5Gate(), 'ok');
  const snapshot = storage.getItem('civ5');
  const other = makeApp({ storage, user: { uid: OTHER }, admin: false, cloud });
  await other.api.civ5BindIdentity({ uid: OTHER });
  assert.equal(other.api.civ5Gate(), 'FOREIGN_SCOPE');
  assert.equal(storage.getItem('civ5'), snapshot, 'dados do dono intactos durante a troca');
  const back = makeApp({ storage, user: { uid: OWNER }, cloud });
  await back.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(back.api.civ5Gate(), 'ok', 'retorno à identidade original');
  assert.equal(storage.getItem('civ5'), snapshot, 'dados preservados após o retorno');
});

test('migração legada: sem perda, sem duplicação, idempotente e com backup idêntico', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  const app = makeApp({ storage, user: { uid: OWNER }, cloud: { doc: null, failSet: false, delayMs: 0, sets: [] } });
  await app.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(app.api.civ5Gate(), 'ok');
  assert.equal(storage.getItem('civ5_legacy_backup'), RAW_BEFORE, 'backup idêntico ao legado');
  assert.equal(storage.getItem('civ5'), RAW_BEFORE, 'legado original intacto');
  assert.equal(app.api.civ5Gate(), 'ok', 'segunda chamada idempotente');
  assert.equal(storage.getItem('civ5'), RAW_BEFORE, 'sem duplicação após repetir a migração');
});

test('migração legada bloqueada para quem não é o dono (sem envio cruzado)', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const other = makeApp({ storage, user: { uid: OTHER }, admin: false, cloud });
  await other.api.civ5BindIdentity({ uid: OTHER });
  other.ctx.FB.pendingCloudSave = true;
  const r = await other.api.uploadLocalToCloud(false);
  assert.equal(r.pass, false);
  assert.equal(r.reason, 'LEGACY_NOT_OWNER');
  assert.equal(cloud.sets.length, 0, 'nenhum envio do legado para outra conta');
  assert.equal(storage.getItem('civ5_owner'), null, 'legado não vinculado');
  assert.equal(storage.getItem('civ5_legacy_backup'), null, 'sem backup por quem não é dono');
});

test('falha de armazenamento na cópia de segurança impede a migração e preserva o legado', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  storage.failSetKeys.add('civ5_legacy_backup');
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const app = makeApp({ storage, user: { uid: OWNER }, cloud });
  await app.api.civ5BindIdentity({ uid: OWNER });
  app.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  app.api.queueCloudSave();
  const r = await app.api.uploadLocalToCloud(false);
  assert.equal(r.pass, false, 'sem backup verificado não há envio');
  assert.equal(storage.getItem('civ5_owner'), null, 'sem vínculo sem backup');
  assert.equal(storage.getItem('civ5'), RAW_BEFORE, 'legado original preservado');
  assert.equal(cloud.sets.length, 0);
});

test('backup existente e diferente não é sobrescrito', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  storage.setItem('civ5_legacy_backup', 'backup-anterior');
  const app = makeApp({ storage, user: { uid: OWNER }, cloud: { doc: null, failSet: false, delayMs: 0, sets: [] } });
  await app.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(app.api.civ5Gate(), 'LEGACY_BACKUP_CONFLICT');
  assert.equal(storage.getItem('civ5_legacy_backup'), 'backup-anterior', 'backup anterior preservado');
  assert.equal(storage.getItem('civ5'), RAW_BEFORE);
});

test('duas abas da mesma identidade compartilham o armazenamento sem sobrescrita silenciosa', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const tabA = makeApp({ storage, user: { uid: OWNER }, cloud });
  const tabB = makeApp({ storage, user: { uid: OWNER }, cloud });
  await tabA.api.civ5BindIdentity({ uid: OWNER });
  await tabB.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(tabA.api.civ5Gate(), 'ok');
  assert.equal(tabB.api.civ5Gate(), 'ok');
  assert.equal(storage.getItem('civ5'), RAW_BEFORE, 'vincular duas abas não reescreve os dados');
  assert.equal(storage.getItem('civ5_legacy_backup'), RAW_BEFORE, 'backup único');
});

test('logout zera a identidade em memória e preserva o armazenamento', async () => {
  const storage = new MemStorage();
  storage.setItem('civ5', RAW_BEFORE);
  const app = makeApp({ storage, user: { uid: OWNER }, cloud: { doc: null, failSet: false, delayMs: 0, sets: [] } });
  await app.api.civ5BindIdentity({ uid: OWNER });
  assert.equal(app.api.civ5Gate(), 'ok');
  await app.api.civ5BindIdentity(null);
  assert.equal(app.api.getScope(), null);
  assert.equal(app.api.civ5Gate(), 'IDENTITY_UNCONFIRMED', 'sem identidade, nenhuma gravação');
  assert.equal(storage.getItem('civ5'), RAW_BEFORE, 'armazenamento local preservado após logout');
  assert.ok(storage.getItem('civ5_owner'), 'vínculo persistido para a próxima entrada do dono');
});

test('primeira gravação de conta sem documento na nuvem é aceita (leitura prévia não bloqueia)', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [] };
  const app = makeApp({ storage, user: { uid: OWNER }, cloud });
  await app.api.civ5BindIdentity({ uid: OWNER });
  app.ctx.FB.cloudLoaded = true;
  app.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  app.api.queueCloudSave();
  const r = await app.api.uploadLocalToCloud(false);
  assert.equal(r.pass, true, 'primeira gravação concluída');
  assert.equal(app.ctx.FB.pendingCloudSave, false, 'pendência limpa após confirmação');
  assert.deepEqual(cloud.doc.aportes.map(a => a.ticker), ['PETR4']);
});

test('erro real de leitura prévia continua fail-closed e preserva a pendência', async () => {
  const storage = new MemStorage();
  const cloud = { doc: null, failSet: false, delayMs: 0, sets: [], readError: new Error('network-request-failed') };
  const app = makeApp({ storage, user: { uid: OWNER }, cloud });
  await app.api.civ5BindIdentity({ uid: OWNER });
  app.ctx.FB.cloudLoaded = true;
  app.ctx.S.aportes.push({ id: 'a1', ticker: 'PETR4', qty: 2 });
  app.api.queueCloudSave();
  const r = await app.api.uploadLocalToCloud(false);
  assert.equal(r.pass, false, 'sem leitura confiável não há gravação');
  assert.equal(cloud.sets.length, 0, 'nenhuma escrita sem leitura prévia');
  assert.equal(app.ctx.FB.pendingCloudSave, true, 'pendência preservada');
  assert.equal(storage.getItem('civ5_pending_owner'), app.api.getScope());
});
