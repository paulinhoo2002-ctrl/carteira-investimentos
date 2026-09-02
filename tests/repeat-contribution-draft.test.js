const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `snippet not found: ${startMarker}`);
  return source.slice(start, end);
}

function buildContext(aportes) {
  const calls = { render: 0, toasts: [] };
  const context = {
    S: { aportes, quickMovementDraft: null, quickMovementEditId: 'old-edit', quickMovementOpen: false },
    normalizeType: (value, fallback) => String(value || fallback || 'Ação'),
    quickMovementDefaultDraft: (kind) => ({ kind, date: '2026-09-02', ticker: '', assetName: '', type: 'Ação', sector: '', qty: '', price: '', note: '' }),
    toast: (message) => calls.toasts.push(message),
    render: () => { calls.render += 1; }
  };
  vm.runInNewContext(`${extract('function aporteMovementKind(a){', 'function isNeutralMovement(a){')}
${extract('function repeatContribution(id){', 'function parseQuickMovementNumber(value, options={}){')}
this.repeatContribution=repeatContribution;`, context);
  return { context, calls };
}

function aporte(overrides = {}) {
  return {
    id: 42,
    operation: 'compra',
    movementKind: 'compra',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'Ação',
    sector: 'Petróleo',
    qty: 10,
    price: 31.25,
    date: '2025-01-10',
    source: 'Importação B3',
    importId: 'keep-original-only',
    ...overrides
  };
}

test('repeatContribution creates an editable draft without mutating the original', () => {
  const original = aporte();
  const before = structuredClone(original);
  const { context, calls } = buildContext([original]);

  context.repeatContribution(42);

  assert.deepEqual(context.S.aportes[0], before);
  assert.equal(context.S.quickMovementOpen, true);
  assert.equal(context.S.quickMovementEditId, null);
  assert.deepEqual(context.S.quickMovementDraft, {
    kind: 'compra', date: '2026-09-02', ticker: 'PETR4', assetName: 'Petrobras PN',
    type: 'Ação', sector: 'Petróleo', qty: '10', price: '31.25', note: ''
  });
  assert.equal(calls.render, 1);
  assert.deepEqual(calls.toasts, []);
});

test('repeatContribution never copies original date, ID, or import metadata', () => {
  const { context } = buildContext([aporte({ id: 'legacy-42', date: '10/01/2025', sourceId: 'b3-1' })]);
  context.repeatContribution('legacy-42');

  assert.equal(context.S.quickMovementDraft.date, '2026-09-02');
  assert.equal(Object.hasOwn(context.S.quickMovementDraft, 'id'), false);
  assert.equal(Object.hasOwn(context.S.quickMovementDraft, 'sourceId'), false);
  assert.equal(Object.hasOwn(context.S.quickMovementDraft, 'source'), false);
});

test('unsupported movement types do not open a repeat draft', () => {
  for (const movement of [
    { movementKind: 'venda', operation: 'venda' },
    { movementKind: 'provento', operation: 'provento' },
    { movementKind: 'renda-fixa', type: 'Renda Fixa' },
    { movementKind: 'outro', operation: 'outro', type: 'Outro' }
  ]) {
    const { context, calls } = buildContext([aporte(movement)]);
    context.repeatContribution(42);
    assert.equal(context.S.quickMovementOpen, false);
    assert.equal(context.S.quickMovementDraft, null);
    assert.equal(calls.render, 0);
  }
});

test('stale source IDs are rejected without falling back to an array index', () => {
  const { context, calls } = buildContext([aporte({ id: 7 }), aporte({ id: 42, ticker: 'VALE3' })]);
  context.repeatContribution(0);
  assert.equal(context.S.quickMovementOpen, false);
  assert.equal(context.S.quickMovementDraft, null);
  assert.equal(calls.render, 0);
  assert.match(calls.toasts[0], /não encontrado/);
});

test('the history action is a real accessible repeat control only for purchases', () => {
  assert.match(source, /repeatContribution\(.*?title="Repetir aporte como rascunho"/);
  assert.match(source, /aria-label="Repetir aporte como rascunho para/);
  assert.match(source, /row\.kind==='compra'/);
  assert.match(source, /S\.quickMovementEditId=null/);
  const helper = extract('function repeatContribution(id){', 'function parseQuickMovementNumber(value, options={}){');
  assert.doesNotMatch(helper, /draft\.date\s*=\s*original\.date/);
  assert.doesNotMatch(helper, /draft\.id\s*=/);
});
