const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('function rfReconciliationText(');
const end = source.indexOf('function dividendManualRows(', start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const context = {
  inputDateValue(value) {
    const text = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  },
  rfEventNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
  },
  normalizeRfEventType(event) {
    return String(event?.type || event?.eventType || '').trim().toLowerCase();
  }
};
vm.runInNewContext(`${source.slice(start, end)};globalThis.api={rfReconciliationText,rfReconciliationSnapshot};`, context);
const { rfReconciliationText, rfReconciliationSnapshot } = context.api;

function jurosEvent(id, value = 300, date = '2026-06-15', ticker = 'MOVI18') {
  return { id, type: 'juros', ticker, date, netValue: value };
}
function linkedProvento(id, sourceEventId = 'rf-1', value = 300, date = '2026-06-15', ticker = 'MOVI18') {
  return { id, type: 'Juros de Renda Fixa', ticker, date, value, sourceEventKind: 'rf', sourceEventId };
}
function plainProvento(id, type = 'Juros de Renda Fixa', value = 300, date = '2026-06-15', ticker = 'MOVI18') {
  return { id, type, ticker, date, value };
}

test('A: par vinculado é classificado como LINKED sem problemas', () => {
  const snapshot = rfReconciliationSnapshot([jurosEvent('rf-1')], [linkedProvento('p-1')]);
  assert.equal(snapshot.counts.linked, 1);
  assert.equal(snapshot.counts.rfEventOnly, 0);
  assert.equal(snapshot.counts.brokenLink, 0);
  assert.equal(snapshot.counts.possibleDuplicate, 0);
  assert.equal(snapshot.counts.legacyUnlinked, 0);
  assert.equal(snapshot.healthy, true);
  assert.equal(snapshot.issues.length, 0);
});

test('B: evento RF de juros sem provento é RF_EVENT_ONLY com aviso informativo', () => {
  const snapshot = rfReconciliationSnapshot([jurosEvent('rf-1')], []);
  assert.equal(snapshot.counts.rfEventOnly, 1);
  assert.equal(snapshot.healthy, true);
  const issue = snapshot.issues.find(item => item.code === 'RF_EVENT_WITHOUT_PROVENTO');
  assert.ok(issue);
  assert.equal(issue.severity, 'info');
});

test('C: provento com vínculo quebrado gera BROKEN_LINK sem corrigir nada', () => {
  const provento = linkedProvento('p-1', 'missing');
  const snapshot = rfReconciliationSnapshot([jurosEvent('rf-1')], [provento]);
  assert.equal(snapshot.counts.brokenLink, 1);
  assert.equal(snapshot.healthy, false);
  const issue = snapshot.issues.find(item => item.code === 'RF_DIVIDEND_BROKEN_LINK');
  assert.ok(issue);
  assert.equal(issue.severity, 'warning');
  assert.equal(provento.sourceEventId, 'missing');
  assert.equal(provento.value, 300);
});

test('D: provento coincidente com dois eventos é POSSIBLE_DUPLICATE sem alteração', () => {
  const events = [jurosEvent('rf-1'), jurosEvent('rf-2')];
  const provento = plainProvento('p-1');
  const snapshot = rfReconciliationSnapshot(events, [provento]);
  assert.equal(snapshot.counts.possibleDuplicate, 1);
  assert.equal(snapshot.healthy, false);
  const issue = snapshot.issues.find(item => item.code === 'RF_DIVIDEND_POSSIBLE_DUPLICATE');
  assert.ok(issue);
  assert.equal(issue.severity, 'warning');
  assert.equal(events.length, 2);
  assert.equal(events[1].id, 'rf-2');
});

test('E: provento RF sem link explícito é LEGACY_UNLINKED e provento comum é PROVENTO_ONLY', () => {
  const rfLegacy = plainProvento('p-1', 'Juros de Renda Fixa');
  const comum = plainProvento('p-2', 'Dividendo');
  const snapshot = rfReconciliationSnapshot([], [rfLegacy, comum]);
  assert.equal(snapshot.counts.legacyUnlinked, 1);
  assert.equal(snapshot.counts.proventoOnly, 1);
  assert.equal(snapshot.counts.brokenLink, 0);
  assert.equal(snapshot.healthy, true);
  assert.equal(snapshot.issues.some(item => item.code === 'RF_DIVIDEND_BROKEN_LINK'), false);
});

test('F: dois juros legítimos iguais com vínculos distintos não são duplicidade', () => {
  const events = [jurosEvent('rf-1'), jurosEvent('rf-2')];
  const proventos = [linkedProvento('p-1', 'rf-1'), linkedProvento('p-2', 'rf-2')];
  const snapshot = rfReconciliationSnapshot(events, proventos);
  assert.equal(snapshot.counts.linked, 2);
  assert.equal(snapshot.counts.possibleDuplicate, 0);
  assert.equal(snapshot.healthy, true);
});

test('G: re-importação produz snapshot estável e idêntico', () => {
  const events = [jurosEvent('rf-1')];
  const proventos = [linkedProvento('p-1')];
  const first = rfReconciliationSnapshot(events, proventos);
  const second = rfReconciliationSnapshot(events, proventos);
  assert.deepEqual(second.counts, first.counts);
  assert.deepEqual(second.issues, first.issues);
  assert.equal(second.healthy, first.healthy);
});

test('H: snapshot é puro e não muta entradas', () => {
  const events = [jurosEvent('rf-1')];
  const proventos = [linkedProvento('p-1', 'missing')];
  const eventsBefore = JSON.stringify(events);
  const proventosBefore = JSON.stringify(proventos);
  const snapshot = rfReconciliationSnapshot(events, proventos);
  assert.equal(JSON.stringify(events), eventsBefore);
  assert.equal(JSON.stringify(proventos), proventosBefore);
  assert.equal(snapshot.totalRfEvents, 1);
  assert.equal(snapshot.totalProventos, 1);
});

test('rfReconciliationText nunca exibe undefined, null ou NaN', () => {
  assert.equal(rfReconciliationText(undefined), '—');
  assert.equal(rfReconciliationText(null), '—');
  assert.equal(rfReconciliationText(NaN), '—');
  assert.equal(rfReconciliationText(0), '0');
  assert.equal(rfReconciliationText('abc'), 'abc');
});