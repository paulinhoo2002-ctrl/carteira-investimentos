const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const Workflow = require('../import-center-workflow.js');

test('workflow module loads in browser without CommonJS globals', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'import-center-workflow.js'), 'utf8');
  const browserGlobal = {};
  vm.runInNewContext(source, { globalThis: browserGlobal });
  assert.equal(typeof browserGlobal.ImportCenterWorkflow.openReviewForFile, 'function');
});

function adapters(overrides = {}) {
  const calls = [];
  return {
    calls,
    parseSpreadsheet: async file => { calls.push(['parseSpreadsheet', file.name]); return { status: 'READY_FOR_REVIEW', provider: 'B3', sourceType: 'B3_MOVEMENTS_XLSX', preview: { records: [{ ticker: 'SYN1' }] } }; },
    parsePdf: async file => { calls.push(['parsePdf', file.name]); return { status: 'READY_FOR_REVIEW', provider: 'INTER', sourceType: 'BROKERAGE_NOTE_PDF', preview: { records: [{ ticker: 'SYN1' }] } }; },
    openReview: payload => { calls.push(['openReview', payload.provider, payload.sourceType]); return true; },
    ...overrides,
  };
}

test('arquivo B3 selecionado chega ao parser e abre revisão sem chamar writer', async () => {
  const a = adapters();
  const result = await Workflow.openReviewForFile({ name: 'synthetic.csv', text: async () => 'fixture' }, a);
  assert.equal(result.status, 'REVIEW_OPEN');
  assert.equal(result.writeCount, 0);
  assert.deepEqual(a.calls, [
    ['parseSpreadsheet', 'synthetic.csv'],
    ['openReview', 'B3', 'B3_MOVEMENTS_XLSX'],
  ]);
});

test('nota PDF Inter usa parser PDF e a confirmação permanece no review explícito', async () => {
  const a = adapters();
  const result = await Workflow.openReviewForFile({ name: 'synthetic.pdf' }, a);
  assert.equal(result.status, 'REVIEW_OPEN');
  assert.equal(result.writeCount, 0);
  assert.deepEqual(a.calls, [
    ['parsePdf', 'synthetic.pdf'],
    ['openReview', 'INTER', 'BROKERAGE_NOTE_PDF'],
  ]);
});

test('formato sem parser é explicitamente unsupported e não abre review nem escreve', async () => {
  const a = adapters();
  const result = await Workflow.openReviewForFile({ name: 'synthetic.zip' }, a);
  assert.equal(result.status, 'UNSUPPORTED');
  assert.equal(result.writeCount, 0);
  assert.deepEqual(a.calls, []);
});

test('falha de leitura é FAILED sem sucesso ou abertura de writer', async () => {
  const a = adapters({ parseSpreadsheet: async () => { throw new Error('READ_FAILED'); } });
  const result = await Workflow.openReviewForFile({ name: 'synthetic.xlsx' }, a);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.writeCount, 0);
  assert.deepEqual(a.calls, []);
});

test('parser que não declara revisão válida não alcança o fluxo de confirmação', async () => {
  const a = adapters({ parseSpreadsheet: async () => ({ status: 'UNSUPPORTED', provider: 'XP', sourceType: 'BROKERAGE_NOTE_PDF' }) });
  const result = await Workflow.openReviewForFile({ name: 'synthetic.csv' }, a);
  assert.equal(result.status, 'UNSUPPORTED');
  assert.equal(result.writeCount, 0);
  assert.deepEqual(a.calls, []);
});
