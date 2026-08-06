/**
 * Testes da correção de comparação de IDs de movimentação (aporte e provento):
 * editar/excluir deve funcionar com ID numérico ou string (String(id)===String(id)),
 * e os toasts de sucesso só devem aparecer quando um registro foi realmente
 * alterado/removido. IDs inexistentes não podem alterar arrays nem gravar.
 *
 * As funções são extraídas do próprio index.html e avaliadas em um contexto
 * mínimo com mocks dos helpers de UI/persistência (mesmo padrão do
 * rf-movement-flow.test.js).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

function extractFunctionBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} precisa existir`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${endMarker} precisa existir depois de ${startMarker}`);
  return source.slice(start, end);
}

function inputDateValue(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { const d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), y = String(m[3].length < 3 ? 2000 + Number(m[3]) : Number(m[3])); return `${y}-${mo}-${d}`; }
  return '';
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function buildContext(initialState = {}) {
  const counters = { save: 0, render: 0, alert: 0, confirm: 0, syncAssets: 0, schedule: 0, dirty: 0, toasts: [] };
  const context = {
    S: {
      assets: [],
      aportes: [],
      proventos: [],
      showP: false,
      showD: false,
      editPId: null,
      editDId: null,
      quickMovementOpen: false,
      quickMovementEditId: null,
      quickMovementDraft: null,
      _fp: null,
      _fd: null,
      ...initialState
    },
    window: {},
    document: { getElementById: () => null },
    toast: (message, color) => { counters.toasts.push({ message, color }); },
    save: () => { counters.save += 1; },
    render: () => { counters.render += 1; },
    alert: () => { counters.alert += 1; },
    confirm: () => { counters.confirm += 1; return true; },
    canEditFromThisTab: () => true,
    withScrollPreserved: (fn) => fn(),
    rememberScroll: () => {},
    isNeutralMovement: () => false,
    quickMovementDefaultDraft: () => ({}),
    inputDateValue,
    applyMetaToAporte: () => {},
    setTimeout: () => 1,
    markProventosDirty: () => { counters.dirty += 1; },
    syncAssetsFromAportes: () => { counters.syncAssets += 1; },
    scheduleAutoProventosGratis: () => { counters.schedule += 1; }
  };

  const editBlock = extractFunctionBlock(INDEX_HTML, 'function clP(){', 'function toggleAportesHistory(){');
  vm.runInNewContext(editBlock, context, { filename: 'movement-id-edit-block.js' });

  const historyBlock = extractFunctionBlock(INDEX_HTML, 'function deleteMovementLaunch(id,sourceType){', 'function aporteHistoryCard(row){');
  vm.runInNewContext(historyBlock, context, { filename: 'movement-id-history-block.js' });

  return { context, counters };
}

function makeAporte(overrides = {}) {
  return {
    id: 1001,
    operation: 'compra',
    ticker: 'AAAA3',
    qty: 10,
    price: 20,
    date: '01/01/2026',
    decision: '',
    type: 'Ação',
    sector: 'Bancos',
    ...overrides
  };
}

function makeProvento(overrides = {}) {
  return {
    id: 2001,
    ticker: 'BBBB3',
    value: 150,
    type: 'Dividendo',
    date: '10/01/2026',
    note: '',
    ...overrides
  };
}

const WARN_APORTE = '⚠️ Nenhuma operação encontrada com esse identificador.';
const WARN_PROVENTO = '⚠️ Nenhum provento encontrado com esse identificador.';

function toastMessages(counters) {
  return counters.toasts.map(t => t.message);
}

test('edP abre o editor com ID numerico preservando o tipo original', () => {
  const { context } = buildContext({ aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })] });
  context.edP(1001);
  assert.equal(context.S.showP, true);
  assert.equal(context.S.editPId, 1001);
  assert.equal(context.S._fp.id, 1001);
});

test('edP abre o editor com ID string e preserva o tipo original do item', () => {
  const { context } = buildContext({ aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })] });
  context.edP('1001');
  assert.equal(context.S.showP, true);
  assert.equal(context.S.editPId, 1001);
  context.S.showP = false;
  context.S.editPId = null;
  context.edP('1002');
  assert.equal(context.S.showP, true);
  assert.equal(context.S.editPId, '1002');
});

test('edP com ID inexistente nao muda estado nem mostra sucesso', () => {
  const before = { aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })] };
  const { context, counters } = buildContext(clone(before));
  context.edP('9999');
  assert.equal(context.S.showP, false);
  assert.equal(context.S.editPId, null);
  assert.deepEqual(context.S.aportes, before.aportes);
  assert.ok(!toastMessages(counters).some(m => m.includes('removid') || m.includes('salvo')));
  assert.ok(toastMessages(counters).includes(WARN_APORTE));
});

test('rmP exclui com ID numerico removendo exatamente um item', () => {
  const { context, counters } = buildContext({ aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })] });
  context.rmP(1001);
  assert.equal(context.S.aportes.length, 1);
  assert.equal(context.S.aportes[0].id, '1002');
  assert.ok(toastMessages(counters).includes('🗑️ Operação removida.'));
  assert.equal(counters.syncAssets, 1);
});

test('rmP exclui com ID string removendo exatamente um item', () => {
  const { context, counters } = buildContext({ aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })] });
  context.rmP('1002');
  assert.equal(context.S.aportes.length, 1);
  assert.equal(context.S.aportes[0].id, 1001);
  assert.ok(toastMessages(counters).includes('🗑️ Operação removida.'));
  assert.equal(counters.syncAssets, 1);
});

test('rmP com ID inexistente nao altera arrays, nao grava e nao mostra sucesso', () => {
  const before = [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })];
  const { context, counters } = buildContext({ aportes: clone(before) });
  context.rmP('9999');
  assert.deepEqual(context.S.aportes, before);
  assert.equal(counters.syncAssets, 0);
  assert.equal(counters.save, 0);
  assert.ok(!toastMessages(counters).includes('🗑️ Operação removida.'));
  assert.ok(toastMessages(counters).includes(WARN_APORTE));
});

test('editDividendReceipt abre o editor com ID numerico ou string', () => {
  const { context } = buildContext({ proventos: [makeProvento({ id: 2001 }), makeProvento({ id: '2002' })] });
  context.editDividendReceipt(2001);
  assert.equal(context.S.showD, true);
  assert.equal(context.S.editDId, 2001);
  context.S.showD = false;
  context.S.editDId = null;
  context.editDividendReceipt('2001');
  assert.equal(context.S.showD, true);
  assert.equal(context.S.editDId, 2001);
});

test('editDividendReceipt com ID inexistente nao muda estado nem mostra sucesso', () => {
  const before = [makeProvento({ id: 2001 }), makeProvento({ id: '2002' })];
  const { context, counters } = buildContext({ proventos: clone(before) });
  context.editDividendReceipt('9999');
  assert.equal(context.S.showD, false);
  assert.equal(context.S.editDId, null);
  assert.deepEqual(context.S.proventos, before);
  assert.ok(!toastMessages(counters).includes('🗑️ Provento removido.'));
  assert.ok(toastMessages(counters).includes(WARN_PROVENTO));
});

test('rmD exclui com ID numerico removendo exatamente um item e persiste', () => {
  const { context, counters } = buildContext({ proventos: [makeProvento({ id: 2001 }), makeProvento({ id: '2002' })] });
  context.rmD(2001);
  assert.equal(context.S.proventos.length, 1);
  assert.equal(context.S.proventos[0].id, '2002');
  assert.ok(toastMessages(counters).includes('🗑️ Provento removido.'));
  assert.equal(counters.save, 1);
  assert.equal(counters.dirty, 1);
});

test('rmD exclui com ID string removendo exatamente um item e persiste', () => {
  const { context, counters } = buildContext({ proventos: [makeProvento({ id: 2001 }), makeProvento({ id: '2002' })] });
  context.rmD('2002');
  assert.equal(context.S.proventos.length, 1);
  assert.equal(context.S.proventos[0].id, 2001);
  assert.ok(toastMessages(counters).includes('🗑️ Provento removido.'));
  assert.equal(counters.save, 1);
});

test('rmD com ID inexistente nao altera arrays, nao grava e nao mostra sucesso', () => {
  const before = [makeProvento({ id: 2001 }), makeProvento({ id: '2002' })];
  const { context, counters } = buildContext({ proventos: clone(before) });
  context.rmD('9999');
  assert.deepEqual(context.S.proventos, before);
  assert.equal(counters.save, 0);
  assert.equal(counters.dirty, 0);
  assert.ok(!toastMessages(counters).includes('🗑️ Provento removido.'));
  assert.ok(toastMessages(counters).includes(WARN_PROVENTO));
});

test('deleteMovementLaunch exclui provento com ID numerico', () => {
  const { context, counters } = buildContext({ proventos: [makeProvento({ id: 2001 }), makeProvento({ id: '2002' })] });
  context.deleteMovementLaunch(2001, 'provento');
  assert.equal(context.S.proventos.length, 1);
  assert.equal(context.S.proventos[0].id, '2002');
  assert.ok(toastMessages(counters).includes('🗑️ Lançamento excluído.'));
  assert.equal(counters.save, 1);
});

test('deleteMovementLaunch exclui aporte com ID string', () => {
  const { context, counters } = buildContext({ aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1002' })] });
  context.deleteMovementLaunch('1002', 'aporte');
  assert.equal(context.S.aportes.length, 1);
  assert.equal(context.S.aportes[0].id, 1001);
  assert.ok(toastMessages(counters).includes('🗑️ Lançamento excluído.'));
  assert.equal(counters.syncAssets, 1);
});

test('deleteMovementLaunch com ID inexistente nao grava e nao mostra sucesso', () => {
  const before = { proventos: [makeProvento({ id: 2001 })], aportes: [makeAporte({ id: 1001 })] };
  const { context, counters } = buildContext(clone(before));
  context.deleteMovementLaunch('9999', 'provento');
  assert.deepEqual(context.S.proventos, before.proventos);
  assert.equal(counters.save, 0);
  assert.ok(!toastMessages(counters).includes('🗑️ Lançamento excluído.'));
  assert.ok(toastMessages(counters).includes(WARN_PROVENTO));
  context.deleteMovementLaunch('9999', 'aporte');
  assert.deepEqual(context.S.aportes, before.aportes);
  assert.equal(counters.syncAssets, 0);
  assert.ok(!toastMessages(counters).includes('🗑️ Lançamento excluído.'));
  assert.ok(toastMessages(counters).includes(WARN_APORTE));
});

test('nenhuma duplicacao: exclusao remove apenas o registro alvo', () => {
  const { context } = buildContext({
    aportes: [makeAporte({ id: 1001 }), makeAporte({ id: '1001' }), makeAporte({ id: '1003' })],
    proventos: [makeProvento({ id: 2001 }), makeProvento({ id: '2001' }), makeProvento({ id: '2003' })]
  });
  context.rmP('1001');
  context.rmD('2001');
  assert.equal(context.S.aportes.length, 1);
  assert.equal(context.S.aportes[0].id, '1003');
  assert.equal(context.S.proventos.length, 1);
  assert.equal(context.S.proventos[0].id, '2003');
});
