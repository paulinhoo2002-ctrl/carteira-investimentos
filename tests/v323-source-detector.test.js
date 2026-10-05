const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const b3DetectorStart = html.indexOf('function detectB3WorkbookKind(wb){');
const b3DetectorEnd = html.indexOf('function detectB3PdfKindFromText(text){', b3DetectorStart);
const parserStart = html.indexOf('async function importCenterParseSpreadsheet(file){');
const providerStart = html.indexOf('function importCenterWorkbookProvider(');
const start = providerStart >= 0 ? providerStart : parserStart;
const end = html.indexOf('async function importCenterParsePdf(file){', start);
if (b3DetectorStart < 0 || b3DetectorEnd < 0 || start < 0 || end < 0) throw new Error('V323 spreadsheet detector source was not found');
const detectorAndParser = `${html.slice(b3DetectorStart, b3DetectorEnd)}\n${html.slice(start, end)}`;

function runSpreadsheetParser(fileName, sheets) {
  const workbook = { SheetNames: Object.keys(sheets), Sheets: {} };
  for (const [name, rows] of Object.entries(sheets)) workbook.Sheets[name] = { rows };
  const calls = [];
  const context = {
    XLSX: { read: value => value, utils: { sheet_to_json: sheet => sheet.rows } },
    normalizeB3Loose: value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
    normHeaderB3: value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
    detectB3ProventosWorkbook: wb => (wb.SheetNames || []).some(name => {
      const rows = wb.Sheets[name]?.rows || [];
      return rows.some(row => {
        const headers = (row || []).map(value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '').toLowerCase());
        const has = values => headers.some(header => values.includes(header));
        return has(['produto', 'ativo', 'nomedoproduto', 'produtoativo', 'descricao', 'papel'])
          && has(['pagamento', 'datapagamento', 'datadepagamento', 'data'])
          && has(['tipodeevento', 'evento', 'tipoevento'])
          && has(['instituicao', 'corretora'])
          && has(['quantidade', 'qtd'])
          && has(['precounitario', 'pu'])
          && has(['valorliquido', 'valor', 'valornet', 'valorliquid']);
      });
    }),
    detectRfDetailedPositionWorkbook: (_workbook, name) => /PosicaoDetalhada/i.test(name),
    parseB3ProventosWorkbook: () => { calls.push('dividends'); return { items: [{}] }; },
    parseRfDetailedPositionWorkbook: () => { calls.push('rf-position'); return { items: [{}] }; },
    parseB3MovementWorkbook: () => { calls.push('movement'); return { items: [{}] }; },
    parseB3PositionWorkbook: () => { calls.push('position'); return { items: [{}] }; },
  };
  vm.runInNewContext(detectorAndParser, context);
  return context.importCenterParseSpreadsheet({ name: fileName, arrayBuffer: async () => workbook, text: async () => '' }).then(result => ({ result, calls }));
}

const B3_MOVEMENT_HEADERS = ['Entrada/Saída', 'Data', 'Movimentação', 'Produto', 'Quantidade', 'Preço unitário', 'Valor da Operação', 'Instituição'];
const B3_POSITION_HEADERS = ['Produto', 'Quantidade', 'Código', 'Valor', 'Preço', 'Instituição'];
const B3_DIVIDEND_HEADERS = ['Produto', 'Data de Pagamento', 'Tipo de Evento', 'Instituição', 'Quantidade', 'Preço Unitário', 'Valor Líquido'];

test('V323: explicitly identified XP movement workbook is never routed to a B3 parser', async () => {
  const { result, calls } = await runSpreadsheetParser('xp-movimentacao-sintetica.xlsx', {
    Movimentação: [B3_MOVEMENT_HEADERS, ['Entrada', '01/10/2026', 'Compra', 'ATIVO SINTÉTICO', 1, 10, 10, 'XP Investimentos']],
  });
  assert.equal(result.status, 'UNSUPPORTED');
  assert.equal(result.provider, 'XP');
  assert.deepEqual(calls, []);
});

test('V323: explicit XP worksheet identity prevents B3 routing', async () => {
  const { result, calls } = await runSpreadsheetParser('movimentacao-sintetica.xlsx', {
    'XP Investimentos': [B3_MOVEMENT_HEADERS, ['Entrada', '01/10/2026', 'Compra', 'ATIVO SINTÉTICO', 1, 10, 10, 'XP Investimentos']],
  });
  assert.equal(result.status, 'UNSUPPORTED');
  assert.equal(result.provider, 'XP');
  assert.deepEqual(calls, []);
});

test('V323: exact B3 movement signature remains supported regardless of institution row values', async () => {
  const { result, calls } = await runSpreadsheetParser('movimentacao-sintetica.xlsx', {
    Movimentação: [B3_MOVEMENT_HEADERS, ['Entrada', '01/10/2026', 'Compra', 'ATIVO SINTÉTICO', 1, 10, 10, 'XP Investimentos']],
  });
  assert.equal(result.status, 'READY_FOR_REVIEW');
  assert.equal(result.provider, 'B3');
  assert.equal(result.sourceType, 'B3_MOVEMENTS_XLSX');
  assert.deepEqual(calls, ['movement']);
});

test('V323: conflicting B3 filename and XP workbook metadata fail closed', async () => {
  const { result, calls } = await runSpreadsheetParser('b3-movimentacao-sintetica.xlsx', {
    Movimentação: [['XP Investimentos'], B3_MOVEMENT_HEADERS, ['Entrada', '01/10/2026', 'Compra', 'ATIVO SINTÉTICO', 1, 10, 10, 'Instituição sintética']],
  });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.provider, 'UNKNOWN');
  assert.deepEqual(calls, []);
});

test('V323: generic position headings in PosicaoDetalhada do not imply B3', async () => {
  const { result, calls } = await runSpreadsheetParser('PosicaoDetalhada.xlsx', {
    'Sua carteira': [['Ativo', 'Quantidade', 'Valor Aplicado', 'Posição a Mercado', 'Data Vencimento'], ['ATIVO SINTÉTICO', 1, 10, 11, '01/01/2030']],
  });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.provider, 'UNKNOWN');
  assert.equal(result.reason, 'SOURCE_IDENTITY_UNCONFIRMED');
  assert.deepEqual(calls, []);
});

test('V323: generic movement columns without provider evidence fail closed', async () => {
  const { result, calls } = await runSpreadsheetParser('movimentacao-sintetica.xlsx', {
    Movimentação: [['Data', 'Movimentação', 'Produto', 'Quantidade'], ['01/10/2026', 'Compra', 'ATIVO SINTÉTICO', 1]],
  });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.provider, 'UNKNOWN');
  assert.equal(result.reason, 'SOURCE_IDENTITY_UNCONFIRMED');
  assert.deepEqual(calls, []);
});

test('V323: known B3 movement fixture remains supported', async () => {
  const { result, calls } = await runSpreadsheetParser('v323-synthetic-b3-movements.xlsx', {
    Movimentação: [B3_MOVEMENT_HEADERS, ['Entrada', '01/10/2026', 'Compra', 'ATIVO SINTÉTICO', 1, 10, 10, 'Instituição sintética']],
  });
  assert.equal(result.status, 'READY_FOR_REVIEW');
  assert.equal(result.provider, 'B3');
  assert.equal(result.sourceType, 'B3_MOVEMENTS_XLSX');
  assert.deepEqual(calls, ['movement']);
});

test('V323: recognized B3 dividend layout remains supported', async () => {
  const { result, calls } = await runSpreadsheetParser('proventos-recebidos.xlsx', {
    Proventos: [B3_DIVIDEND_HEADERS, ['ATIVO SINTÉTICO', '01/10/2026', 'Dividendo', 'Instituição sintética', 1, 10, 10]],
  });
  assert.equal(result.status, 'READY_FOR_REVIEW');
  assert.equal(result.provider, 'B3');
  assert.equal(result.sourceType, 'B3_DIVIDENDS_XLSX');
  assert.deepEqual(calls, ['dividends']);
});

test('V323: known B3 category-sheet position workbook remains supported', async () => {
  const { result, calls } = await runSpreadsheetParser('b3-posicao-sintetica.xlsx', {
    Ações: [['B3'], B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN1', 10, 10, 'Instituição sintética']],
    ETF: [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN2', 10, 10, 'Instituição sintética']],
    'Fundo de Investimento': [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN3', 10, 10, 'Instituição sintética']],
    'Renda Fixa': [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN4', 10, 10, 'Instituição sintética']],
  });
  assert.equal(result.status, 'READY_FOR_REVIEW');
  assert.equal(result.provider, 'B3');
  assert.equal(result.sourceType, 'B3_POSITION_XLSX');
  assert.deepEqual(calls, ['position']);
});

test('V323: generic category-sheet shape alone does not prove B3', async () => {
  const { result, calls } = await runSpreadsheetParser('posicao-sintetica.xlsx', {
    Ações: [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN1', 10, 10, 'Instituição sintética']],
    ETF: [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN2', 10, 10, 'Instituição sintética']],
    'Fundo de Investimento': [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN3', 10, 10, 'Instituição sintética']],
    'Renda Fixa': [B3_POSITION_HEADERS, ['ATIVO SINTÉTICO', 1, 'SYN4', 10, 10, 'Instituição sintética']],
  });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.provider, 'UNKNOWN');
  assert.deepEqual(calls, []);
});

test('V323: unsupported XLSX stays unsupported and invokes no parser', async () => {
  const { result, calls } = await runSpreadsheetParser('relatorio-sintetico.xlsx', {
    Planilha: [['Campo A', 'Campo B'], ['valor sintético', 'outro valor']],
  });
  assert.equal(result.status, 'UNSUPPORTED');
  assert.equal(result.provider, 'UNKNOWN');
  assert.deepEqual(calls, []);
});
