/**
 * Testes de paridade entre Home (destaques) e Análise, e de exibição de
 * renda fixa na aba Ativos (sub-aba Renda Fixa).
 *
 * Estado atual:
 * - Home e Análise compartilham `assetAnalysisRows()`;
 * - este teste protege paridade de fonte, ordenação e limites;
 * - RF sem valor atual explícito mostra "Atualização necessária";
 * - RF com lucro, prejuízo e zero legítimo mantém valores canônicos.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

/**
 * Extrai o corpo de uma função do index.html com base em duas âncoras.
 * Retorna o trecho começando em `startMarker` e terminando imediatamente
 * antes de `endMarker`.
 */
function extractFunctionBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} precisa existir`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${endMarker} precisa existir depois de ${startMarker}`);
  return source.slice(start, end);
}

/** нормizes value to a finite Number or 0. */
function num(v){ const n=Number(v); return Number.isFinite(n) ? n : 0; }

/**
 * Monta um contexto mínimo com o mock de FinanceCore (baseado em isRendaFixaAsset
 * e rfValues extraídos do próprio index.html) e os helpers de formatação.
 * Esse padrão é idêntico ao usado pelos testes phase-204a existentes.
 */
function buildContext(assets){
  const ctx = {
    S: { assets, hideValues:false, dashboardHighlightsTab:'high', dashboardHighlightsClassFilter:'all' }
  };

  // Helpers de data (usados por rfIntelligenceSnapshot)
  ctx.parseAnyDate = (v) => null;
  ctx.assetRfMaturityDate = () => null;
  ctx.assetRfApplicationDate = () => null;
  ctx.assetRfName = (a) => a.name || a.product || a.ticker || 'Renda Fixa';
  ctx.assetRfSubtype = () => 'CDB';
  ctx.assetRfContractRate = () => null;
  ctx.assetRfIndexerLabel = () => '—';
  ctx.assetRfIrIof = () => 0;
  ctx.assetRfUnavailableValue = () => 0;
  ctx.rfCategoryLabel = () => 'CDB';
  ctx.rfBucketLabel = () => 'Sem vencimento';
  ctx.rfIncomeByAsset = () => ({ grossValue:0, ir:0, iof:0, netValue:0, count:0 });

  // Helpers de formatação: extraídos do index.html.
  const fmtRaw = extractFunctionBlock(INDEX_HTML, 'const fmtRaw =', 'let valueVisibilityDepth');
  vm.runInNewContext(fmtRaw, ctx);
  ctx.valueVisibilityDepth = 0;
  ctx.hideValues = false;
  const fmt = extractFunctionBlock(INDEX_HTML, 'const fmt  =', 'const withVisibleValues');
  vm.runInNewContext(fmt, ctx);
  const fmtP = extractFunctionBlock(INDEX_HTML, 'const fmtP =', 'const fmtN');
  vm.runInNewContext(fmtP, ctx);
  const fmtN = extractFunctionBlock(INDEX_HTML, 'const fmtN =', 'const DEBUG');
  vm.runInNewContext(fmtN, ctx);
  const esc = extractFunctionBlock(INDEX_HTML, 'const esc  = s => String(s ??', 'const noteDisplay');
  // strip leading `const esc  =` do bloco e reavaliar como atribuição
  vm.runInNewContext('var esc = ' + esc.replace(/^const esc\s*=\s*/, ''), ctx);

  // Helpers de normalização usados por assetAnalysisRows
  ctx.normalizeType = (value, fallback='Ação') => String(value ?? fallback).trim() || 'Ação';
  ctx.metaTicker = (ticker) => ({ type:'Ação', sector:'—' });
  ctx.dashboardHighlightsClassKey = function(value){
    const raw=String(value||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .trim()
      .toUpperCase();
    if(raw==='ACAO' || raw==='ACOES') return 'acao';
    if(raw==='FII' || raw==='FIIS' || raw==='FUNDO IMOBILIARIO' || raw==='FUNDOS IMOBILIARIOS') return 'fii';
    if(raw==='ETF' || raw==='ETFS') return 'etf';
    return '';
  };

  // Extrai isRendaFixaAsset e rfValues do index.html
  const isRf = extractFunctionBlock(INDEX_HTML, 'function isRendaFixaAsset(a){', 'function rfValues(a){');
  vm.runInNewContext(isRf, ctx);
  const rfV = extractFunctionBlock(INDEX_HTML, 'function rfValues(a){', 'function assetRfCurrentValueMeta(a){');
  vm.runInNewContext(rfV, ctx);
  const rfMeta = extractFunctionBlock(INDEX_HTML, 'function assetRfCurrentValueMeta(a){', 'function assetAppliedValue(a){');
  vm.runInNewContext(rfMeta, ctx);
  // Substitui rfPositionImportSourceTag por no-op (dependência interna da assetRfCurrentValueMeta)
  vm.runInNewContext('function rfPositionImportSourceTag(){return false;}', ctx);

  // FinanceCore mock (mesma lógica do finance-core.js, mas sem importar o módulo)
  ctx.FinanceCore = {};
  ctx.FinanceCore.configure = function(deps){
    this.isRendaFixaAsset = deps.isRendaFixaAsset;
    this.rfValues = deps.rfValues;
  };
  ctx.FinanceCore.configure({
    isRendaFixaAsset: ctx.isRendaFixaAsset,
    rfValues: ctx.rfValues
  });

  ctx.assetAppliedValue = function(a){
    if (ctx.FinanceCore.isRendaFixaAsset(a)) {
      const v = ctx.FinanceCore.rfValues(a);
      return Number.isFinite(v.applied) ? v.applied : num(a.avg_price)*num(a.qty);
    }
    return num(a.qty)*num(a.avg_price);
  };
  ctx.assetCurrentValue = function(a){
    if (ctx.FinanceCore.isRendaFixaAsset(a)) {
      const v = ctx.FinanceCore.rfValues(a);
      return Number.isFinite(v.current) ? v.current : num(a.qty)*num(a.current_price);
    }
    return num(a.qty)*num(a.current_price);
  };
  ctx.assetJurosValue = function(a){
    if (!ctx.FinanceCore.isRendaFixaAsset(a)) return null;
    const v = ctx.FinanceCore.rfValues(a);
    return Number.isFinite(v.profit) ? v.profit : null;
  };
  ctx.assetRentabPct = function(a){
    if (ctx.FinanceCore.isRendaFixaAsset(a)) {
      const v = ctx.FinanceCore.rfValues(a);
      return Number.isFinite(v.rentab) ? v.rentab : null;
    }
    const avg = num(a.avg_price);
    const cur = num(a.current_price);
    if (avg>0 && cur>0) return ((cur-avg)/avg)*100;
    return null;
  };

  return ctx;
}

/** Avalia as funções principais (assetAnalysisRows, dashboardHighlightsRows, rendaFixaTab) no contexto. */
function loadPrincipalFns(ctx){
  const assetAnalysis = extractFunctionBlock(INDEX_HTML, 'function assetAnalysisRows(){', 'function assetConcentrationAlert(');
  vm.runInNewContext(assetAnalysis, ctx);
  const assetAnalysisBlock = extractFunctionBlock(INDEX_HTML, 'function assetAnalysisBlock(rowsInput){', 'function hasOwnFiniteNumber(');
  vm.runInNewContext(assetAnalysisBlock, ctx);
  const assetPerformanceRowHtml = extractFunctionBlock(INDEX_HTML, 'function assetPerformanceRowHtml(row, maxAbs, kind){', 'function assetInsightRowHtml(');
  vm.runInNewContext(assetPerformanceRowHtml, ctx);
  const assetInsightRowHtml = extractFunctionBlock(INDEX_HTML, 'function assetInsightRowHtml(row, mode){', 'function assetAnalysisBlock(');
  vm.runInNewContext(assetInsightRowHtml, ctx);
  const assetPremiumSection = extractFunctionBlock(INDEX_HTML, 'function assetPremiumSection(title, subtitle, count, body, tone=\'muted\'){', 'function assetPerformanceRowHtml(');
  vm.runInNewContext(assetPremiumSection, ctx);
  const assetConcentrationAlert = extractFunctionBlock(INDEX_HTML, 'function assetConcentrationAlert(share){', 'function assetSummaryCard(');
  vm.runInNewContext(assetConcentrationAlert, ctx);
  // IMPORTANTE: o teste RED deve falhar POR DIVERGÊNCIA, não por ReferenceError em fonte legada.
  // Stub do pipeline antigo (assetPerformanceOverviewRows) que retorna DATOS DIFERENTES da
  // assetAnalysisRows(). Se dashboardHighlightsRows() consumir essa fonte, a saída vai divergir.
  vm.runInNewContext(`
    function assetPerformanceOverviewRows(){
      return [
        // Stub propositadamente fora de ordem e com dados diferentes.
        { ticker:'ZZZZ9', type:'Acao', hasPerformanceData:true, result:500, resultPct:99, applied:500, current:1000 },
        { ticker:'AAAA4', type:'Acao', hasPerformanceData:true, result:200, resultPct:20,  applied:1000, current:1200 }
      ];
    }
  `, ctx);
  const dashboardHighlights = extractFunctionBlock(INDEX_HTML, 'function dashboardHighlightsRows(kind=\'high\', classFilter=\'all\'){', 'function dashboardHighlightsRowHtml(');
  vm.runInNewContext(dashboardHighlights, ctx);
  const rfSnapshot = extractFunctionBlock(INDEX_HTML, 'function rfIntelligenceSnapshot(){', 'function rendaFixaTab()');
  vm.runInNewContext(rfSnapshot, ctx);
  const rendaFixaTab = extractFunctionBlock(INDEX_HTML, 'function rendaFixaTab(){', 'function dashboardMetricCard(');
  vm.runInNewContext(rendaFixaTab, ctx);
  const dashboardMetricCard = 'function dashboardMetricCard(icon,label,value,sub,tone="muted",bg="rgba(0,0,0,0)"){return `<div class="dash-metric ${tone}"><div class="dash-metric-icon">${icon}</div><div class="dash-metric-body"><div class="dash-metric-label">${esc(label)}</div><div class="dash-metric-value">${value}</div><div class="dash-metric-sub">${esc(sub)}</div></div></div>`;}';
  vm.runInNewContext(dashboardMetricCard, ctx);
  const rfEventReceiptsSummaryHtml = 'function rfEventReceiptsSummaryHtml(){return "";}';
  vm.runInNewContext(rfEventReceiptsSummaryHtml, ctx);
  const rfEventHistoryCards = 'function rfEventHistoryCards(){return "";}';
  vm.runInNewContext(rfEventHistoryCards, ctx);
}

/** Cria conjunto de ativos usado pelos testes (ações e 4 RFs). */
function buildAssets(){
  return [
    // Ações
    { ticker:'AAAA4', type:'Acao', avg_price:10, current_price:12, qty:100 },  // +20%
    { ticker:'BBBB4', type:'Acao', avg_price:10, current_price:8,  qty:100 },  // -20%
    { ticker:'CCCC4', type:'Acao', avg_price:10, current_price:10, qty:100 },  //  0%  (deve ser excluído)
    // RF lucro
    { ticker:'RF01', type:'Renda Fixa', subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:1100, rf_gross_value:0,
      rf_ir_iof:0, rf_unavailable_value:0 },
    // RF prejuízo
    { ticker:'RF02', type:'Renda Fixa', subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:900,  rf_gross_value:0,
      rf_ir_iof:0, rf_unavailable_value:0 },
    // RF zero legítimo
    { ticker:'RF03', type:'Renda Fixa', subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:1000, rf_gross_value:0,
      rf_ir_iof:0, rf_unavailable_value:0 },
    // RF sem valor atual explícito (apenas aplicado)
    { ticker:'RF04', type:'Renda Fixa', subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:0,    rf_gross_value:0,
      rf_ir_iof:0, rf_unavailable_value:0 }
  ];
}

/** Compacta HTML em texto visível (sem tags) para asserções de conteúdo. */
function stripHtml(html){ return String(html).replace(/<[^>]*>/g,'').replace(/\s+/g,' '); }

function countMatches(text, pattern){
  return (String(text).match(pattern) || []).length;
}

/**
 * Extrai o HTML de UMA linha (`<tr>...</tr>`) da tabela de Renda Fixa, identificada
 * pelo ticker. Retorna string ('' se não encontrada), permitindo isolá-la do resto
 * do HTML para asserções por título (sem vazamento de vizinhos).
 */
function extractRfTableRow(html, ticker){
  const escaped = String(ticker||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // Encontra todos os <tr>...</tr> em sequência, verifica cada um se contém o ticker.
  const trRe = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const trs = String(html).match(trRe) || [];
  for (const t of trs){
    if (new RegExp(escaped,'i').test(t)) return stripHtml(t);
  }
  return '';
}

function extractRawRfTableRow(html, ticker){
  const escaped = String(ticker||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const trRe = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const trs = String(html).match(trRe) || [];
  for (const t of trs){
    if (new RegExp(escaped,'i').test(t)) return t;
  }
  return '';
}

/**
 * Extrai o HTML do bloco de preview da Renda Fixa (cada `rf-preview-row`) identificado
 * pelo ticker. Existem dois conjuntos visuais de `rf-preview-row`: `alertRows` (alertas)
 * e `previewRows` (leitura por título). Como o `rf-preview-row` dos alertas é estruturalmente
 * diferente (não contém valores monetários), discriminamos exigindo que o bloco contenha
 * uma string monetária `R$ ` ou de percentual (formato `profit`/`pct`) renderizada.
 * Para a tabela (`<tr>`), mantemos a busca direta pelo ticker dentro do `<tr>`.
 */
function extractRfPreviewRow(html, ticker){
  const escaped = String(ticker||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const s = String(html);
  // Cada `rf-preview-row` termina no próximo `rf-preview-row` OU na próxima seção
  // `<details` ou `</details>` (que marca o fim da seção de Leitura por título).
  const re = /<div class="rf-preview-row">[\s\S]*?(?=<div class="rf-preview-row">|<details|<\/details>|$)/g;
  const blocks = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    blocks.push(m[0]);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  // Filtra pelos blocos que contém o ticker E um valor monetário/percentual
  // (característica apenas da seção `previewRows`).
  for (const b of blocks){
    if (!new RegExp(escaped,'i').test(b)) continue;
    if (/R\$/.test(b) || /\d+,\d{2}\s*%/.test(b) || /\d+\.\d{2}\s*%/.test(b) || /Atualização necessária/.test(b)){
      return stripHtml(b);
    }
  }
  // Fallback: pegar o primeiro bloco com o ticker (sob fixtures canônicas, não cai aqui).
  for (const b of blocks){
    if (new RegExp(escaped,'i').test(b)) return stripHtml(b);
  }
  return '';
}

// ════════════════════════════════════════════════════════════════════
// Testes — Etapa RED
// ════════════════════════════════════════════════════════════════════

test('Home: dashboardHighlightsRows deve usar a mesma fonte/ordem/top5 de assetAnalysisRows (altas)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  // Ordenação canônica da Análise (top 5 — limite existente em assetAnalysisBlock).
  const analysisRows = ctx.assetAnalysisRows();
  const positives = analysisRows
    .filter(r => Number.isFinite(r.pct) && r.pct > 0 && r.current > 0 && ctx.dashboardHighlightsClassKey(r.type))
    .sort((a,b) => b.pct - a.pct || b.current - a.current)
    .slice(0,5);

  // Home agora recebe o array bruto de assetAnalysisRows() e aplica .slice(0,3)
  // externamente em dashboardHomeHighlightsPanel(). A ordenação interna deve
  // coincidir com a da Análise.
  const highs = ctx.dashboardHighlightsRows('high');
  const homePick = JSON.parse(JSON.stringify(highs.slice(0,3).map(r => ({
    ticker: r.ticker,
    result: r.result,
    resultPct: r.resultPct
  }))));
  const analysisPick = JSON.parse(JSON.stringify(positives.slice(0,3).map(r => ({
    ticker: r.ticker,
    result: r.profit,
    resultPct: r.pct
  }))));

  assert.ok(homePick.length > 0, 'Home deve listar ao menos uma alta');
  assert.deepEqual(homePick, analysisPick,
    `Home e Análise (top 3) devem listar ticker, resultado e rentabilidade canônica. Home=${JSON.stringify(homePick)} Análise=${JSON.stringify(analysisPick)}`);
});

test('RF: cada linha da tabela mantem todas as celulas dentro de um unico tr', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const html = ctx.rendaFixaTab();
  for (const ticker of ['RF01', 'RF02', 'RF03', 'RF04']) {
    const rowHtml = extractRawRfTableRow(html, ticker);
    assert.ok(rowHtml, `${ticker} deve existir em uma linha da tabela RF`);
    assert.equal(countMatches(rowHtml, /<tr\b/g), 1, `${ticker} deve abrir um unico <tr>`);
    assert.equal(countMatches(rowHtml, /<\/tr>/g), 1, `${ticker} deve fechar um unico </tr>`);
    assert.equal(countMatches(rowHtml, /<td\b/g), 10, `${ticker} deve manter as 10 celulas esperadas dentro do <tr>`);
    assert.match(rowHtml, /Sem eventos de renda fixa|evento/, `${ticker} deve manter recebido liquido dentro do <tr>`);
    assert.match(rowHtml, /resultado total/, `${ticker} deve manter resultado com eventos dentro do <tr>`);
    const lineEnd = rowHtml.lastIndexOf('</tr>');
    const afterLine = rowHtml.slice(lineEnd + '</tr>'.length);
    assert.equal(/<td\b/.test(afterLine), false, `${ticker} nao pode ter <td> orfao apos </tr>`);
  }
});

test('Home: dashboardHighlightsRows deve usar a mesma fonte/ordem/top5 de assetAnalysisRows (baixas)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const analysisRows = ctx.assetAnalysisRows();
  const negatives = analysisRows
    .filter(r => Number.isFinite(r.pct) && r.pct < 0 && r.current > 0 && ctx.dashboardHighlightsClassKey(r.type))
    .sort((a,b) => a.pct - b.pct || b.current - a.current)
    .slice(0,5);

  const lows = ctx.dashboardHighlightsRows('low');
  const homePick = JSON.parse(JSON.stringify(lows.slice(0,3).map(r => ({
    ticker: r.ticker,
    result: r.result,
    resultPct: r.resultPct
  }))));
  const analysisPick = JSON.parse(JSON.stringify(negatives.slice(0,3).map(r => ({
    ticker: r.ticker,
    result: r.profit,
    resultPct: r.pct
  }))));

  assert.ok(homePick.length > 0, 'Home deve listar ao menos uma baixa');
  assert.deepEqual(homePick, analysisPick,
    `Home e Análise (top 3) devem listar ticker, resultado e rentabilidade canônica. Home=${JSON.stringify(homePick)} Análise=${JSON.stringify(analysisPick)}`);
});

test('Home: ativo positivo aparece igual à Análise (ticker e rentabilidade)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const analysisRows = ctx.assetAnalysisRows();
  const positives = analysisRows
    .filter(r => Number.isFinite(r.pct) && r.pct > 0 && r.current > 0 && ctx.dashboardHighlightsClassKey(r.type))
    .sort((a,b) => b.pct - a.pct || b.current - a.current)
    .slice(0,5);

  const highs = ctx.dashboardHighlightsRows('high');
  assert.ok(positives.length > 0, 'Deve haver ao menos um positivo');
  assert.ok(highs.length > 0, 'Home deve ter altas');

  // Cada alta da Home deve existir na Análise com a mesma rentabilidade.
  for (const h of highs) {
    const a = positives.find(p => p.ticker === h.ticker);
    assert.ok(a, `Home listou ${h.ticker} mas ele não está no top5 da Análise`);
    assert.equal(h.resultPct, a.pct,
      `Rentabilidade divergente para ${h.ticker}: Home=${h.resultPct} Análise=${a.pct}`);
  }
});

test('Home: ativo negativo aparece igual à Análise (ticker e rentabilidade)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const analysisRows = ctx.assetAnalysisRows();
  const negatives = analysisRows
    .filter(r => Number.isFinite(r.pct) && r.pct < 0 && r.current > 0 && ctx.dashboardHighlightsClassKey(r.type))
    .sort((a,b) => a.pct - b.pct || b.current - a.current)
    .slice(0,5);

  const lows = ctx.dashboardHighlightsRows('low');
  assert.ok(negatives.length > 0, 'Deve haver ao menos um negativo');
  assert.ok(lows.length > 0, 'Home deve ter baixas');

  for (const l of lows) {
    const a = negatives.find(p => p.ticker === l.ticker);
    assert.ok(a, `Home listou ${l.ticker} mas ele não está no top5 da Análise`);
    assert.equal(l.resultPct, a.pct,
      `Rentabilidade divergente para ${l.ticker}: Home=${l.resultPct} Análise=${a.pct}`);
  }
});

test('Home: ativos sem dados suficientes são excluídos (zero legítimo)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const highs = ctx.dashboardHighlightsRows('high');
  const lows = ctx.dashboardHighlightsRows('low');

  // CCCC4 tem pct=0 e não deve aparecer em altas nem em baixas.
  assert.ok(!highs.some(r => r.ticker === 'CCCC4'),
    'CCCC4 (pct=0) não deve aparecer entre as altas');
  assert.ok(!lows.some(r => r.ticker === 'CCCC4'),
    'CCCC4 (pct=0) não deve aparecer entre as baixas');
});

test('RF: 1000 -> 1100 mostra lucro 100 e NÃO mostra "Atualização necessária" (sub-aba RF)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const html = ctx.rendaFixaTab();
  // Extrair apenas a linha (<tr>) de RF01 na tabela RF, e o bloco de preview de RF01,
  // para isolar a verificação do conteúdo do título. Assim o texto do RF04 (que mostra
  // "Atualização necessária") não vaza para dentro da janela dos demais.
  const rf01TableRow = extractRfTableRow(html, 'RF01');
  const rf01PreviewRow = extractRfPreviewRow(html, 'RF01');

  assert.ok(rf01TableRow, 'RF01 deve aparecer em uma linha da tabela RF');
  assert.ok(rf01PreviewRow, 'RF01 deve aparecer em um bloco de preview RF');
  assert.ok(/100,00/.test(rf01TableRow) || /100\.00/.test(rf01TableRow),
    `Tabela RF01 deve mostrar lucro 100,00. trecho: ${rf01TableRow}`);
  assert.ok(!/Atualização necessária/.test(rf01TableRow) && !/Atualizacao necessaria/.test(rf01TableRow),
    `Tabela RF01 não deve exibir "Atualização necessária". trecho: ${rf01TableRow}`);
  assert.ok(/100,00/.test(rf01PreviewRow) || /100\.00/.test(rf01PreviewRow),
    `Preview RF01 deve mostrar lucro 100,00. trecho: ${rf01PreviewRow}`);
  assert.ok(!/Atualização necessária/.test(rf01PreviewRow) && !/Atualizacao necessaria/.test(rf01PreviewRow),
    `Preview RF01 não deve exibir "Atualização necessária". trecho: ${rf01PreviewRow}`);
});

test('RF: 1000 -> 900 mostra prejuízo -100 e NÃO mostra "Atualização necessária" (sub-aba RF)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const html = ctx.rendaFixaTab();
  const rf02TableRow = extractRfTableRow(html, 'RF02');
  const rf02PreviewRow = extractRfPreviewRow(html, 'RF02');

  assert.ok(rf02TableRow, 'RF02 deve aparecer em uma linha da tabela RF');
  assert.ok(rf02PreviewRow, 'RF02 deve aparecer em um bloco de preview RF');
  assert.ok(/100,00/.test(rf02TableRow) || /100\.00/.test(rf02TableRow),
    `Tabela RF02 deve mostrar prejuízo 100,00. trecho: ${rf02TableRow}`);
  assert.ok(/-/.test(rf02TableRow), `Tabela RF02 deve conter sinal negativo. trecho: ${rf02TableRow}`);
  assert.ok(!/Atualização necessária/.test(rf02TableRow) && !/Atualizacao necessaria/.test(rf02TableRow),
    `Tabela RF02 não deve exibir "Atualização necessária". trecho: ${rf02TableRow}`);
  assert.ok(/100,00/.test(rf02PreviewRow) || /100\.00/.test(rf02PreviewRow),
    `Preview RF02 deve mostrar prejuízo 100,00. trecho: ${rf02PreviewRow}`);
  assert.ok(!/Atualização necessária/.test(rf02PreviewRow) && !/Atualizacao necessaria/.test(rf02PreviewRow),
    `Preview RF02 não deve exibir "Atualização necessária". trecho: ${rf02PreviewRow}`);
});

test('RF: 1000 -> 1000 zero legítimo não mostra "Atualização necessária" (sub-aba RF)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const html = ctx.rendaFixaTab();
  const rf03TableRow = extractRfTableRow(html, 'RF03');
  const rf03PreviewRow = extractRfPreviewRow(html, 'RF03');

  assert.ok(rf03TableRow, 'RF03 deve aparecer em uma linha da tabela RF');
  assert.ok(rf03PreviewRow, 'RF03 deve aparecer em um bloco de preview RF');
  assert.ok(/0,00/.test(rf03TableRow) || /0\.00/.test(rf03TableRow),
    `Tabela RF03 deve mostrar 0,00 (zero legítimo). trecho: ${rf03TableRow}`);
  assert.ok(!/Atualização necessária/.test(rf03TableRow) && !/Atualizacao necessaria/.test(rf03TableRow),
    `Tabela RF03 com líquido == aplicado não deve exibir "Atualização necessária". trecho: ${rf03TableRow}`);
  assert.ok(/0,00/.test(rf03PreviewRow) || /0\.00/.test(rf03PreviewRow),
    `Preview RF03 deve mostrar 0,00 (zero legítimo). trecho: ${rf03PreviewRow}`);
  assert.ok(!/Atualização necessária/.test(rf03PreviewRow) && !/Atualizacao necessaria/.test(rf03PreviewRow),
    `Preview RF03 com líquido == aplicado não deve exibir "Atualização necessária". trecho: ${rf03PreviewRow}`);
});

test('RF: 1000 sem valor atual explícito mostra "Atualização necessária" e não mostra lucro 0,00 (sub-aba RF)', () => {
  const ctx = buildContext(buildAssets());
  loadPrincipalFns(ctx);

  const html = ctx.rendaFixaTab();
  const text = stripHtml(html);

  const idx = text.indexOf('RF04');
  assert.ok(idx >= 0, 'RF04 deve aparecer na sub-aba Renda Fixa');
  const rf04Slice = text.slice(idx, idx+500);

  assert.ok(/Atualização necessária/.test(rf04Slice) || /Atualizacao necessaria/.test(rf04Slice),
    `RF04 sem valor atual explícito deve mostrar "Atualização necessária". trecho: ${rf04Slice}`);

  // Não deve exibir lucro/prejuízo numérico mascarando a ausência. Permite valor aplicado (1.000,00).
  // Procuramos por "Resultado de mercado" acompanhado de "0,00" perto do RF04 — esse é o bug.
  // Após a correção, RF04 não deve ter "Resultado de mercado R$ 0,00".
  assert.ok(!/Resultado de mercado[\s\S]{0,40}0,00/.test(rf04Slice) && !/Resultado de mercado[\s\S]{0,40}0\.00/.test(rf04Slice),
    `RF04 não deve apresentar "Resultado de mercado 0,00" como se fosse legítimo. trecho: ${rf04Slice}`);
});
