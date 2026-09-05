const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderer = source.slice(source.indexOf('function irpfTabPremium()'), source.indexOf('\nfunction irpfTab(){'));

test('IRPF adopts visual primitives without replacing its fiscal renderer', () => {
  assert.match(source, /function irpfBuildYearReport\(year\)/);
  assert.match(source, /function irpfTaxBucket\(type\)/);
  assert.match(source, /function irpfProventoCategory\(p\)/);
  assert.match(source, /function irpfSummaryMetrics\(report, year\)/);
  assert.match(source, /function irpfExportCSV\(\)/);
  assert.match(source, /function irpfExportPdf\(\)/);
  assert.match(renderer, /class="irpf-summary-card ds-kpi/);
  assert.match(renderer, /class="sec irpf-section ds-panel ds-panel--readonly/);
  assert.match(renderer, /class="irpf-section-badge ds-badge/);
  assert.match(renderer, /class="btn bp ds-button ds-button--primary"/);
  assert.match(renderer, /class="btn bgh ds-button ds-button--secondary"/);
  assert.match(renderer, /ds-empty-state/);
});

test('IRPF keeps fiscal identity, read-only exports, and explicit missing states', () => {
  for (const label of ['Bens e Direitos', 'Proventos do ano', 'Ganhos de capital', 'Renda Fixa para IRPF', 'Documentos disponíveis', 'Alertas para conferência']) {
    assert.match(renderer, new RegExp(label));
  }
  assert.match(renderer, /irpfExportCSV\(\)/);
  assert.match(renderer, /irpfExportPdf\(\)/);
  assert.match(renderer, /Sem posições para o ano selecionado/);
  assert.match(renderer, /Sem proventos lançados no ano selecionado/);
  assert.match(renderer, /Sem títulos de renda fixa classificados para o ano selecionado/);
  assert.match(renderer, /Sem operações de compra ou venda no ano selecionado/);
  assert.doesNotMatch(renderer, /modern\/src|createRoot|ReactDOM/);
});
