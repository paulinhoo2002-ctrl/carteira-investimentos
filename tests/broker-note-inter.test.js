const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunctionSource(name, nextMarker) {
  const start = indexHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função não encontrada: ${name}`);
  const end = indexHtml.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `Marcador final não encontrado para: ${name}`);
  return indexHtml.slice(start, end).replace(/\r\n/g, '\n');
}

function makeContext(overrides = {}) {
  const scrollContainer = { scrollTop: 128 };
  const focused = {
    dataset: { rowIndex: '0' },
    selectionStart: 2,
    selectionEnd: 5,
    closest(selector) {
      return selector === '.broker-note-line' ? { dataset: { rowIndex: '0' } } : null;
    },
    focused: false,
    focus() {
      this.focused = true;
    },
  };

  const nextInput = {
    focused: false,
    selectionRange: null,
    focus() {
      this.focused = true;
    },
    setSelectionRange(start, end) {
      this.selectionRange = [start, end];
    },
  };

  const context = {
    console,
    S: {
      aportes: [],
      brokerNoteImport: {
        parsed: {
          rows: [],
        },
      },
    },
    document: {
      activeElement: focused,
      documentElement: scrollContainer,
      querySelector(selector) {
        if (selector === '.broker-note-lines') return scrollContainer;
        if (selector === '.broker-note-line[data-row-index="0"]') {
          return {
            querySelector(childSelector) {
              return childSelector === 'input' ? nextInput : null;
            },
          };
        }
        return null;
      },
    },
    renderCalls: 0,
    render() {
      context.renderCalls += 1;
    },
    findQuickMovementAssetByTicker(ticker) {
      return ticker === 'PETR4' ? { type: 'Ação', sector: 'Petróleo' } : null;
    },
    metaTicker(ticker) {
      return ticker === 'PETR4' ? { type: 'Ação', sector: 'Petróleo' } : { type: 'Ação', sector: '' };
    },
    normalizeType(value) {
      return value;
    },
    brokerNoteValidTicker(value) {
      return /^[A-Z]{4}\d{1,2}$/.test(String(value || '').trim().toUpperCase());
    },
    notaNorm(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    },
    ...overrides,
  };

  return context;
}

function loadSnippet(name, nextMarker, overrides = {}) {
  const source = extractFunctionSource(name, nextMarker);
  const context = makeContext(overrides);
  vm.runInNewContext(`${source}\nthis.__exported = ${name};`, context);
  return { fn: context.__exported, context };
}

test('extractInterBrokerNoteHeader aceita Nr. nota 0 e captura a conta', () => {
  const source = extractFunctionSource('extractInterBrokerNoteHeader', 'function parseInterBrokerNoteText');
  assert.ok(source.includes('(\\d{1,12})'), 'O parser deve aceitar números com 1 a 12 dígitos');
  assert.ok(source.includes('conta\\s*corrente\\s*(\\d{1,12})'), 'A conta corrente deve participar da leitura da nota');
  assert.ok(source.includes('return {noteNumber,tradeDate,account}'), 'A função deve devolver account');
});

test('brokerNoteValidationChecklist considera 0 como número presente', () => {
  const { fn } = loadSnippet('brokerNoteValidationChecklist', 'function brokerNoteCanConfirm', {
    brokerNoteDuplicateInfo() {
      return { duplicate: false, count: 0 };
    },
    fmt(value) {
      return String(value);
    },
  });

  const checklist = fn({
    noteNumber: 0,
    tradeDate: '05/08/2026',
    broker: 'INTER DTVM LTDA.',
    rows: [{ ticker: 'PETR4', qty: 1, price: 10, total: 10 }],
    operationsTotal: 10,
  });

  assert.equal(checklist.find((item) => item.id === 'note').ok, true);
});

test('setBrokerNoteRowTicker preserva scroll, foco e atualiza o row correto', () => {
  const { fn, context } = loadSnippet('setBrokerNoteRowTicker', 'function brokerNoteAdjustedRow', {
    S: {
      brokerNoteImport: {
        parsed: {
          rows: [{ ticker: '', recognized: false }],
        },
      },
    },
  });

  fn(0, 'petr4');

  assert.equal(context.S.brokerNoteImport.parsed.rows[0].ticker, 'PETR4');
  assert.equal(context.S.brokerNoteImport.parsed.rows[0].recognized, true);
  assert.equal(context.document.documentElement.scrollTop, 128);
  assert.equal(context.document.activeElement.focused, false);
  assert.equal(context.renderCalls, 1);
  const nextInput = context.document.querySelector('.broker-note-line[data-row-index="0"]').querySelector('input');
  assert.equal(nextInput.focused, true);
  assert.deepEqual(nextInput.selectionRange, [2, 5]);
});

test('setBrokerNoteRowTicker preserva seleção e foca o novo input da linha', () => {
  const { fn, context } = loadSnippet('setBrokerNoteRowTicker', 'function brokerNoteAdjustedRow', {
    S: {
      brokerNoteImport: {
        parsed: {
          rows: [{ ticker: '', recognized: false }],
        },
      },
    },
    document: {
      activeElement: {
        dataset: { rowIndex: '0' },
        selectionStart: 1,
        selectionEnd: 4,
        closest(selector) {
          return selector === '.broker-note-line' ? { dataset: { rowIndex: '0' } } : null;
        },
      },
      documentElement: { scrollTop: 128 },
      querySelector(selector) {
        if (selector === '.broker-note-lines') return { scrollTop: 128 };
        if (selector === '.broker-note-line[data-row-index="0"]') {
          return {
            querySelector(childSelector) {
              if (childSelector !== 'input') return null;
              return {
                focused: false,
                selectionRange: null,
                focus() {
                  this.focused = true;
                },
                setSelectionRange(start, end) {
                  this.selectionRange = [start, end];
                },
              };
            },
          };
        }
        return null;
      },
    },
  });

  fn(0, 'petr4');

  assert.equal(context.document.documentElement.scrollTop, 128);
  assert.equal(context.renderCalls, 1);
});

test('brokerNoteDuplicateInfo e brokerNoteCanConfirm usam a chave com conta e bloqueiam duplicidade', () => {
  const duplicateInfoSnippet = extractFunctionSource('brokerNoteDuplicateInfo', 'function detectBrokerNoteDuplicate');
  const canConfirmSnippet = extractFunctionSource('brokerNoteCanConfirm', 'function brokerNoteChecklistHtml');
  const duplicateContext = makeContext({
    S: {
      aportes: [
        {
          brokerNoteKey: '0|05/08/2026|INTER DTVM LTDA.|10526986',
          brokerNoteNumber: '0',
          date: '05/08/2026',
          source: 'Nota Inter PDF',
          decision: 'Importado da nota Inter 0 - Pregão 05/08/2026',
        },
      ],
      brokerNoteImport: {
        allowDuplicate: false,
        parsed: {
          noteKey: '0|05/08/2026|INTER DTVM LTDA.|10526986',
          noteNumber: '0',
          tradeDate: '05/08/2026',
          broker: 'INTER DTVM LTDA.',
          rows: [{ ticker: 'PETR4', qty: 1, price: 10, total: 10 }],
          operationsTotal: 10,
        },
      },
    },
    brokerNoteValidationChecklist(note) {
      return [
        { id: 'note', ok: String(note.noteNumber).trim() !== '' },
        { id: 'date', ok: true },
        { id: 'broker', ok: true },
        { id: 'tickers', ok: true },
        { id: 'values', ok: true },
        { id: 'duplicate', ok: true },
        { id: 'pending', ok: true },
      ];
    },
  });

  vm.runInNewContext(`${duplicateInfoSnippet}\nthis.__duplicateInfo = brokerNoteDuplicateInfo;`, duplicateContext);

  const duplicateInfo = duplicateContext.__duplicateInfo(duplicateContext.S.brokerNoteImport.parsed);
  assert.equal(duplicateInfo.duplicate, true);
  assert.equal(duplicateInfo.count, 1);
  vm.runInNewContext(
    `${canConfirmSnippet}\nthis.__canConfirm = brokerNoteCanConfirm;`,
    makeContext({
      S: {
        aportes: [],
        brokerNoteImport: {
          allowDuplicate: false,
          parsed: {
            noteKey: '1|05/08/2026|INTER DTVM LTDA.|10526987',
            noteNumber: '1',
            tradeDate: '05/08/2026',
            broker: 'INTER DTVM LTDA.',
            rows: [{ ticker: 'PETR4', qty: 1, price: 10, total: 10 }],
            operationsTotal: 10,
          },
        },
      },
      brokerNoteValidationChecklist(note) {
        return [
          { id: 'note', ok: String(note.noteNumber).trim() !== '' },
          { id: 'date', ok: true },
          { id: 'broker', ok: true },
          { id: 'tickers', ok: true },
          { id: 'values', ok: true },
          { id: 'duplicate', ok: true },
          { id: 'pending', ok: true },
        ];
      },
      brokerNoteDuplicateInfo() {
        return { duplicate: false, count: 0 };
      },
    }),
  );

  const differentNoteInfo = duplicateContext.__duplicateInfo({
    noteKey: '1|05/08/2026|INTER DTVM LTDA.|10526987',
    noteNumber: '1',
    tradeDate: '05/08/2026',
    broker: 'INTER DTVM LTDA.',
    rows: [{ ticker: 'PETR4', qty: 1, price: 10, total: 10 }],
    operationsTotal: 10,
  });
  assert.equal(differentNoteInfo.duplicate, false);
});
