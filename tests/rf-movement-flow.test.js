/**
 * Testes do fluxo de movimentação de renda fixa (Sprint 13):
 * aporte, resgate parcial e resgate total com atualização do valor aplicado.
 *
 * A lógica de movimentação é extraída do próprio index.html (mesmo padrão do
 * assets-highlights-and-rf-parity.test.js): as funções são avaliadas em um
 * contexto mínimo com os helpers de data/moeda reais copiados do index.html.
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
function parseNum(v) {
  if (v == null) return 0;
  let s = String(v).trim().replace(/R\$|%|\s/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function moneyInput(v) { return (Number(v) || 0).toFixed(2).replace('.', ','); }
function brDate(v) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; }
  return v;
}
function rfPosNorm(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
function cleanAssetCode(txt) {
  let s = String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  s = s.replace(/\s+/g, ' ');
  if (!s) return '';
  s = s.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 38);
}

function buildContext(initialState = {}) {
  const counters = { save: 0, render: 0, alert: 0, confirm: 0, toast: [] };
  const context = {
    S: {
      assets: [],
      rfEvents: [],
      wallets: [],
      activeWalletId: '',
      rfMovementEditor: null,
      rfEventEditor: null,
      ...initialState
    },
    window: {},
    FinanceCore: {},
    normalizeType: (value, fallback = 'Ação') => String(value ?? fallback).trim() || 'Ação',
    metaTicker: () => ({ type: 'Ação', sector: '—' }),
    inputDateValue,
    parseNum,
    moneyInput,
    brDate,
    rfPosNorm,
    cleanAssetCode,
    esc: (s) => String(s ?? ''),
    fmt: (v) => `R$${Number(v || 0).toFixed(2).replace('.', ',')}`,
    canEditFromThisTab: () => true,
    rememberScroll: () => {},
    save: () => { counters.save += 1; },
    render: () => { counters.render += 1; },
    toast: (message) => { counters.toast.push(message); },
    alert: () => { counters.alert += 1; },
    confirm: () => { counters.confirm += 1; return true; },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    document: {
      getElementById: () => null
    }
  };

  const rfBlock = extractFunctionBlock(INDEX_HTML, 'function isRendaFixaAsset(a){', 'function parseNum(v){');
  vm.runInNewContext(rfBlock, context, { filename: 'rf-movement-block.js' });

  const uiBlock = extractFunctionBlock(INDEX_HTML, 'function rfMovementModeOptionsHtml(selected){', 'function rfEventEditorHtml(asset){');
  vm.runInNewContext(uiBlock, context, { filename: 'rf-movement-ui.js' });

  return { context, counters };
}

function makeRfAsset(overrides = {}) {
  return {
    id: 'rf-asset-1',
    ticker: 'CDB-FIX-1',
    name: 'CDB Prefixado',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    rf_yield_type: 'prefixado',
    rf_contract_rate: '12% a.a.',
    rf_application_date: '2026-01-10',
    rf_applied_value: 1000,
    ...overrides
  };
}

function makeCdiAsset(overrides = {}) {
  return makeRfAsset({ id: 'rf-asset-cdi', ticker: 'CDI-LIQ-1', name: 'LCI CDI', rf_yield_type: 'CDI', ...overrides });
}

test('saldo oficial vem de rf_applied_value', () => {
  const { context } = buildContext();
  const balance = context.rfPrincipalBalance(makeRfAsset());
  assert.equal(balance.value, 1000);
  assert.equal(balance.source, 'rf_applied_value');
  assert.equal(balance.hasExplicitApplied, true);
});

test('saldo oficial recorre a fixed_initial_value quando rf_applied_value ausente', () => {
  const { context } = buildContext();
  const balance = context.rfPrincipalBalance(makeRfAsset({ rf_applied_value: undefined, fixed_initial_value: 2000 }));
  assert.equal(balance.value, 2000);
  assert.equal(balance.source, 'fixed_initial_value');
});

test('saldo oficial recorre ao derivado qty x preco medio quando nao ha valor aplicado', () => {
  const { context } = buildContext();
  const balance = context.rfPrincipalBalance(makeRfAsset({ rf_applied_value: undefined, fixed_initial_value: undefined, qty: 10, avg_price: 250 }));
  assert.equal(balance.value, 2500);
  assert.equal(balance.hasExplicitApplied, false);
});

test('saldo oficial de ativo ausente ou nao-renda-fixa e zero', () => {
  const { context } = buildContext();
  assert.equal(context.rfPrincipalBalance(null).value, 0);
  assert.equal(context.rfPrincipalBalance({ id: 'x', type: 'Ação', ticker: 'PETR4' }).value, 0);
});

test('aporte valido soma saldo e cria evento do tipo aporte', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: '500,00' });
  assert.equal(result.ok, true);
  assert.equal(result.saldo, 1000);
  assert.equal(result.novoSaldo, 1500);
  assert.equal(result.event.type, 'aporte');
  assert.equal(result.event.principalDelta, 500);
  assert.equal(result.event.date, '2026-05-01');
  assert.equal(result.event.assetId, 'rf-asset-1');
});

test('aporte com principal negativo e rejeitado', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: '-500' });
  assert.equal(result.ok, false);
  assert.match(result.error, /positivo/i);
});

test('resgate parcial valido reduz saldo e usa principal negativo', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-06-01', mode: 'resgate_parcial', principalDelta: '300,00' });
  assert.equal(result.ok, true);
  assert.equal(result.event.type, 'resgate_parcial');
  assert.equal(result.event.principalDelta, -300);
  assert.equal(result.novoSaldo, 700);
});

test('resgate parcial acima do saldo e rejeitado', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-06-01', mode: 'resgate_parcial', principalDelta: '1200,00' });
  assert.equal(result.ok, false);
  assert.match(result.error, /insuficiente/i);
});

test('resgate total valido zera o saldo', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-06-01', mode: 'resgate_total', principalDelta: '1000,00' });
  assert.equal(result.ok, true);
  assert.equal(result.event.type, 'resgate_total');
  assert.equal(result.event.principalDelta, -1000);
  assert.equal(result.novoSaldo, 0);
});

test('resgate total com valor diferente do saldo e rejeitado', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-06-01', mode: 'resgate_total', principalDelta: '900,00' });
  assert.equal(result.ok, false);
  assert.match(result.error, /igual ao saldo/i);
});

test('movimentacao sem data e rejeitada', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { mode: 'aporte', principalDelta: '500' });
  assert.equal(result.ok, false);
  assert.match(result.error, /data/i);
});

test('movimentacao com data invalida e rejeitada', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '31-13-2026', mode: 'aporte', principalDelta: '500' });
  assert.equal(result.ok, false);
});

test('movimentacao sem principal ou com principal zero e rejeitada', () => {
  const { context } = buildContext();
  const missing = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte' });
  assert.equal(missing.ok, false);
  const zero = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: '0' });
  assert.equal(zero.ok, false);
});

test('valores nao finitos (NaN/Infinity) sao rejeitados', () => {
  const { context } = buildContext();
  const nan = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: 'abc' });
  assert.equal(nan.ok, false);
  const inf = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: 'Infinity' });
  assert.equal(inf.ok, false);
  const nanIr = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: '500', ir: 'x' });
  assert.equal(nanIr.ok, false);
});

test('bruto, liquido, IR e IOF negativos sao rejeitados', () => {
  const { context } = buildContext();
  const base = { date: '2026-05-01', mode: 'aporte', principalDelta: '500' };
  assert.equal(context.rfMovementValidation(makeRfAsset(), { ...base, grossValue: '-10' }).ok, false);
  assert.equal(context.rfMovementValidation(makeRfAsset(), { ...base, netValue: '-10' }).ok, false);
  assert.equal(context.rfMovementValidation(makeRfAsset(), { ...base, ir: '-1' }).ok, false);
  assert.equal(context.rfMovementValidation(makeRfAsset(), { ...base, iof: '-1' }).ok, false);
});

test('liquido e calculado quando vazio (bruto - ir - iof)', () => {
  const { context } = buildContext();
  const result = context.rfMovementValidation(makeRfAsset(), { date: '2026-05-01', mode: 'aporte', principalDelta: '500', grossValue: '1000', ir: '150', iof: '0' });
  assert.equal(result.ok, true);
  assert.equal(result.event.netValue, 850);
});

test('ativo inexistente ou nao-renda-fixa e rejeitado', () => {
  const { context } = buildContext();
  assert.equal(context.rfMovementValidation(null, { date: '2026-05-01', mode: 'aporte', principalDelta: '500' }).ok, false);
  assert.equal(context.rfMovementValidation({ id: 'x', type: 'Ação', ticker: 'PETR4' }, { date: '2026-05-01', mode: 'aporte', principalDelta: '500' }).ok, false);
});

test('saveRfMovimentacao de aporte atualiza rfEvents e rf_applied_value atomicamente', () => {
  const asset = makeCdiAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: 'aporte manual' } };
  context.saveRfMovimentacao();
  assert.equal(counters.save, 1);
  assert.equal(counters.render, 1);
  assert.equal(context.S.rfMovementEditor, null);
  assert.equal(context.S.assets[0].rf_applied_value, 1500);
  assert.equal(context.S.rfEvents.length, 1);
  const event = context.S.rfEvents[0];
  assert.equal(event.type, 'aporte');
  assert.equal(event.principalDelta, 500);
  assert.equal(event.assetId, 'rf-asset-cdi');
});

test('saveRfMovimentacao de resgate parcial reduz o valor aplicado', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'resgate_parcial', date: '2026-06-01', principalDelta: '300,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.assets[0].rf_applied_value, 700);
  assert.equal(context.S.rfEvents[0].principalDelta, -300);
});

test('saveRfMovimentacao de resgate total pede confirmacao e zera o valor aplicado', () => {
  const asset = makeRfAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'resgate_total', date: '2026-06-01', principalDelta: '1000,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(counters.confirm, 1);
  assert.equal(context.S.assets[0].rf_applied_value, 0);
  assert.equal(context.S.rfEvents[0].principalDelta, -1000);
});

test('resgate total cancelado na confirmacao nao altera nada', () => {
  const asset = makeRfAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  context.confirm = () => false;
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'resgate_total', date: '2026-06-01', principalDelta: '1000,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.assets[0].rf_applied_value, 1000);
  assert.equal(context.S.rfEvents.length, 0);
  assert.equal(counters.save, 0);
});

test('movimentacao duplicada e rejeitada sem aplicar mudancas', () => {
  const asset = makeCdiAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  const draft = { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' };
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft };
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents.length, 1);
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { ...draft } };
  context.saveRfMovimentacao();
  assert.equal(counters.alert, 1);
  assert.equal(context.S.rfEvents.length, 1);
  assert.equal(context.S.assets[0].rf_applied_value, 1500);
});

test('dupla submissao (sem editor aberto) nao salva nada', () => {
  const asset = makeCdiAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  context.S.rfMovementEditor = null;
  context.saveRfMovimentacao();
  assert.equal(counters.save, 1);
  assert.equal(context.S.rfEvents.length, 1);
});

test('erro de validacao nao muta o estado', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'resgate_parcial', date: '2026-06-01', principalDelta: '99999,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.assets[0].rf_applied_value, 1000);
  assert.equal(context.S.rfEvents.length, 0);
  assert.notEqual(context.S.rfMovementEditor, null);
});

test('baseline de prefixado sem eventos cria evento de Migracao antes do novo', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: 'aporte' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents.length, 2);
  const baseline = context.S.rfEvents.find(e => e.source === 'Migração');
  assert.ok(baseline, 'baseline deve existir');
  assert.equal(baseline.type, 'aporte');
  assert.equal(baseline.principalDelta, 1000);
  assert.equal(baseline.date, '2026-01-10');
  assert.match(baseline.note, /Saldo inicial/i);
  const movement = context.S.rfEvents.find(e => e.note === 'aporte');
  assert.ok(movement);
  assert.equal(context.S.assets[0].rf_applied_value, 1500);
});

test('baseline nao e recriado em movimentacoes posteriores', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  const mk = (principal, date) => ({ assetId: 'rf-asset-1', draft: { mode: 'aporte', date, principalDelta: principal, grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } });
  context.S.rfMovementEditor = mk('500,00', '2026-05-01');
  context.saveRfMovimentacao();
  context.S.rfMovementEditor = mk('200,00', '2026-05-15');
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents.filter(e => e.source === 'Migração').length, 1);
  assert.equal(context.S.rfEvents.length, 3);
  assert.equal(context.S.assets[0].rf_applied_value, 1700);
});

test('baseline nao e criado para titulo indexado a CDI', () => {
  const asset = makeCdiAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents.length, 1);
  assert.equal(context.S.rfEvents.some(e => e.source === 'Migração'), false);
});

test('baseline nao e criado quando o titulo ja tem eventos', () => {
  const asset = makeRfAsset();
  const existing = context => context.normalizeRfEventEntry({ id: 'ev1', assetId: 'rf-asset-1', ticker: 'CDB-FIX-1', date: '2026-02-01', type: 'juros', grossValue: 100, ir: 0, iof: 0, netValue: 100, principalDelta: 0, source: 'Manual', note: '' });
  const { context } = buildContext({ assets: [asset] });
  context.S.rfEvents = [existing(context)];
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents.some(e => e.source === 'Migração'), false);
});

test('baseline nao e criado sem data de aplicacao valida ou com saldo zero', () => {
  const { context } = buildContext();
  const noDate = makeRfAsset({ rf_application_date: '' });
  assert.equal(context.rfMovementNeedsBaseline(noDate), false);
  const zeroSaldo = makeRfAsset({ rf_applied_value: 0 });
  assert.equal(context.rfMovementNeedsBaseline(zeroSaldo), false);
});

test('autoKey inclui principalDelta apenas quando diferente de zero', () => {
  const { context } = buildContext();
  const base = { date: '2026-01-01', assetId: 'A', type: 'juros', grossValue: 10, ir: 0, iof: 0, netValue: 10 };
  const zero = context.rfEventDuplicateKey({ ...base, principalDelta: 0 });
  const omitted = context.rfEventDuplicateKey({ ...base });
  assert.equal(zero, omitted, 'principal zero nao altera a chave');
  const withPrincipal = context.rfEventDuplicateKey({ ...base, principalDelta: 100 });
  const withPrincipal2 = context.rfEventDuplicateKey({ ...base, principalDelta: 200 });
  assert.notEqual(withPrincipal, zero, 'principal diferente de zero entra na chave');
  assert.notEqual(withPrincipal, withPrincipal2);
});

test('eventos identicos exceto principalDelta nao colidem no dedupe', () => {
  const { context } = buildContext();
  const a = context.normalizeRfEventEntry({ date: '2026-01-01', assetId: 'A', type: 'aporte', grossValue: 0, ir: 0, iof: 0, netValue: 0, principalDelta: 100 });
  const b = context.normalizeRfEventEntry({ date: '2026-01-01', assetId: 'A', type: 'aporte', grossValue: 0, ir: 0, iof: 0, netValue: 0, principalDelta: 200 });
  assert.notEqual(a.autoKey, b.autoKey);
  assert.notEqual(a.id, b.id);
});

test('normalizeRfEventType reconhece aporte e resgate total', () => {
  const { context } = buildContext();
  assert.equal(context.normalizeRfEventType('Aporte'), 'aporte');
  assert.equal(context.normalizeRfEventType('APLICACAO'), 'aporte');
  assert.equal(context.normalizeRfEventType('RESGATE TOTAL'), 'resgate_total');
  assert.equal(context.normalizeRfEventType('resgate_parcial'), 'resgate_parcial');
  assert.equal(context.normalizeRfEventType({ type: 'aporte', principalDelta: 100 }), 'aporte');
  assert.equal(context.normalizeRfEventType({ type: 'resgate_total', principalDelta: -100 }), 'resgate_total');
  assert.equal(context.normalizeRfEventType({ type: 'juros', principalDelta: 0, grossValue: 10 }), 'juros');
});

test('RF_EVENT_TYPE_OPTIONS expoe aporte e resgate_total', () => {
  const { context } = buildContext();
  const options = vm.runInNewContext('RF_EVENT_TYPE_OPTIONS', context);
  const ids = options.map(([id]) => id);
  assert.ok(ids.includes('aporte'));
  assert.ok(ids.includes('resgate_total'));
  assert.ok(ids.includes('resgate_parcial'));
  assert.equal(context.rfEventTypeLabel('aporte'), 'Aporte');
  assert.equal(context.rfEventTypeLabel('resgate_total'), 'Resgate total');
});

test('editor de movimentacao renderiza label/for, aria-label e saldos', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: context.rfMovementDraftForAsset(asset, 'aporte') };
  const html = context.rfMovementEditorHtml(asset);
  assert.match(html, /Movimentar título/);
  assert.match(html, /<label class="fl" for="[^"]+-date">Data<\/label>/);
  assert.match(html, /aria-label="Data da movimentação"/);
  assert.match(html, /aria-label="Tipo de movimentação"/);
  assert.match(html, /Saldo atual:/);
  assert.match(html, /Saldo após:/);
  assert.match(html, /Salvar movimentação/);
});

test('editor de movimentacao desabilita salvar sem data ou principal', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  const draft = context.rfMovementDraftForAsset(asset, 'aporte');
  draft.date = '';
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft };
  assert.match(context.rfMovementEditorHtml(asset), /disabled/);
  draft.date = '2026-05-01';
  draft.principalDelta = '500,00';
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft };
  assert.doesNotMatch(context.rfMovementEditorHtml(asset), /disabled/);
});

test('editor de resgate total bloqueia o campo de principal e mostra saldo apos zero', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: context.rfMovementDraftForAsset(asset, 'resgate_total') };
  const html = context.rfMovementEditorHtml(asset);
  assert.match(html, /readonly/);
  assert.match(html, /value="1000,00"/);
  const afterMatch = html.match(/Saldo após: <strong>R\$([\d.,]+)<\/strong>/);
  assert.ok(afterMatch, 'Saldo após deve aparecer');
  assert.equal(afterMatch[1], '0,00');
});

test('trocar para resgate total preenche automaticamente o principal com o saldo', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: context.rfMovementDraftForAsset(asset, 'aporte') };
  context.setRfMovementEditorField('mode', 'resgate_total');
  assert.equal(context.S.rfMovementEditor.draft.mode, 'resgate_total');
  assert.equal(context.S.rfMovementEditor.draft.principalDelta, '1000,00');
});

test('openRfMovementEditor abre o editor e devolve foco a data', () => {
  const asset = makeRfAsset();
  const focusLog = [];
  const { context } = buildContext({ assets: [asset] });
  context.document.getElementById = (id) => (id.endsWith('-date') ? { focus: () => focusLog.push(id) } : null);
  context.openRfMovementEditor('rf-asset-1', 'aporte');
  assert.ok(context.S.rfMovementEditor);
  assert.equal(context.S.rfMovementEditor.assetId, 'rf-asset-1');
  assert.equal(focusLog.length, 1);
  assert.match(focusLog[0], /^rfmv-/);
});

test('roundtrip: movimentacoes salvas ficam normalizadas e ordenadas por data desc', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  const mk = (principal, date) => ({ assetId: 'rf-asset-1', draft: { mode: 'aporte', date, principalDelta: principal, grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: date } });
  context.S.rfMovementEditor = mk('500,00', '2026-05-01');
  context.saveRfMovimentacao();
  context.S.rfMovementEditor = mk('200,00', '2026-05-15');
  context.saveRfMovimentacao();
  const dates = context.S.rfEvents.map(e => e.date);
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  assert.equal(dates.join(','), sorted.join(','));
  assert.ok(context.S.rfEvents.every(e => e.id && e.autoKey));
});

test('saveRfMovimentacao respeita fonte manual e observacao', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'XP', note: 'aporte em conta' } };
  context.saveRfMovimentacao();
  const event = context.S.rfEvents[0];
  assert.equal(event.source, 'XP');
  assert.equal(event.note, 'aporte em conta');
});
