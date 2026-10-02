const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('function dashboardEvolutionPanel(data){');
const end = source.indexOf('\nfunction dashboardIncomePanel(data){', start);
const panel = source.slice(start, end);

test('evolucao usa a serie real de aportes acumulados e nao a rotula como patrimonio', () => {
  assert.ok(start >= 0 && end > start, 'painel patrimonial precisa existir');
  assert.match(panel, /histórico patrimonial ainda não disponível/i);
  assert.match(panel, /Patrimônio consolidado/);
  assert.match(panel, /Aportes líquidos acumulados/);
  assert.match(panel, /dashboard-patrimony-chart/);
  assert.match(panel, /lineChart\(/);
  // Proveniência verificada: patrimonySnapshot().cumulative é construído a
  // partir de S.aportes (aportes líquidos com sinal + baseline pré-janela),
  // ou seja, capital aportado acumulado — não valor de mercado. O rótulo
  // correto da série é "Aportes acumulados"; rotulá-la como "Patrimônio"
  // seria semântica financeira falsa (CURRENT_STATE != HISTORICAL_STATE).
  assert.match(panel, /tooltipLabel:'Aportes acumulados'/);
  assert.doesNotMatch(panel, /tooltipLabel:'Patrimônio'/, 'série de aportes não pode se apresentar como patrimônio de mercado');
  assert.match(panel, /Histórico patrimonial indisponível/, 'painel precisa declarar que o histórico patrimonial não está disponível');
  assert.match(panel, /snapshot\.months\.map\(row=>row\.label\)/);
});

test('evolucao patrimonial preserva pontos navegáveis, dominio valido e lacunas sem inventar serie', () => {
  const chartStart = source.indexOf('function lineChart(series, labels, chartClass=', 0);
  const chartEnd = source.indexOf('\nfunction syncAssetsFromAportes(', chartStart);
  const chart = source.slice(chartStart, chartEnd);

  assert.ok(chartStart >= 0 && chartEnd > chartStart, 'lineChart precisa existir');
  assert.match(chart, /class="chart-data-point"/);
  assert.match(chart, /tabindex="0"/);
  assert.match(chart, /aria-label="\$\{esc\(tooltip\)\}"/);
  assert.match(chart, /data-chart-tooltip="\$\{esc\(tooltip\)\}"/);
  assert.match(chart, /onpointerenter="showLineChartTooltip/);
  assert.match(chart, /onclick="showLineChartTooltip/);

  // Substituição comportamental da antiga asserção de sintaxe de fonte
  // (`const all=series.flatMap(s=>s.values.map...`): o comportamento protegido
  // é que o domínio usa apenas valores válidos, que a lacuna permanece lacuna
  // e que nenhum valor financeiro é fabricado para período sem dado.
  const sandbox = {
    innerWidth: 1366,
    CLRS: ['#34d399'],
    esc: value => String(value),
    fmtP: value => String(Math.round(value)),
    S: { hideValues: false },
  };
  const context = vm.createContext(sandbox);
  const script = new vm.Script(`${chart}\nresult = lineChart([{ name: 'Aportes líquidos acumulados', tooltipLabel: 'Aportes acumulados', values: [100, null, 300], color: '#34d399' }], ['jan', 'fev', 'mar'], 'dashboard-patrimony-chart', fmtP);`);
  script.runInContext(context);
  const svg = sandbox.result;
  assert.equal(typeof svg, 'string', 'lineChart precisa renderizar a série mista sem exceção');
  assert.ok(!svg.includes('NaN'), 'o domínio do gráfico não pode vazar NaN');
  assert.ok(svg.includes('data-chart-index="0"') && svg.includes('data-chart-index="2"'), 'valores válidos precisam de pontos navegáveis');
  assert.ok(!svg.includes('data-chart-index="1"'), 'lacuna sem dado não pode gerar ponto navegável');
  assert.ok(!/data-chart-tooltip="[^"]*fev/.test(svg), 'nenhum valor pode ser inventado para o mês sem dado');
  const axisValues = [...svg.matchAll(/text-anchor="end"[^>]*>([^<]+)<\/text>/g)].map(match => Number(match[1])).filter(Number.isFinite);
  assert.ok(axisValues.length > 0, 'eixo numérico precisa ser renderizado');
  assert.ok(Math.max(...axisValues) >= 300, 'o domínio precisa cobrir o maior valor válido da série');
  assert.ok(Math.min(...axisValues) <= 0, 'o domínio precisa incluir a base numérica');
});
