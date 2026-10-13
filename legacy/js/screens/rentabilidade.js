'use strict';

// Rentabilidade screen renderer
// Extracted from inline index.html for lazy loading and modularity

(function exposeRentabilidadeTab(root, factory) {
  const rentabilidadeTab = factory();
  if (typeof module === 'object' && module.exports) module.exports = rentabilidadeTab;
  if (root) root.rentabilidadeTab = rentabilidadeTab;
})(typeof globalThis === 'object' ? globalThis : this, function createRentabilidadeTab() {
  return function rentabilidadeTab() {
    const type = S.rentType || 'all';
    const period = S.rentPeriod || 'all';
    const bench = S.rentBench || 'CDI';
    const v248History = v248HistoricalPerformanceSnapshot();
    const data = rentabilityHistory(type, period, bench);
    const certifiedHistory = v248History.coverage === 'FULL_COVERAGE' && data.status === 'AVAILABLE';
    const historyCoverageLabel = {
      FULL_COVERAGE: 'Cobertura completa',
      PARTIAL_COVERAGE: 'Cobertura parcial',
      UNKNOWN: 'Cobertura UNKNOWN · sem série histórica disponível',
      INSUFFICIENT_DATA: 'Cobertura insuficiente · série histórica indisponível'
    }[v248History.coverage] || 'Cobertura indisponível';
    const view = Array.isArray(data.view) ? data.view : [];
    const points = Array.isArray(data.points) ? data.points : [];
    const benchSeries = Array.isArray(data.benchSeries) ? data.benchSeries : [];
    const current = data.current || { cumReturn: null, delta: null, costBasis: null, currentValue: null, proventos: null };
    const benchNow = data.currentBench;
    const gap = current.cumReturn - benchNow;
    const return12m = data.return12m;
    const currentMonth = data.lastMonth;
    const provCurrent = current.proventos == null ? null : Number(current.proventos);
    const yearsList = (data.years || []).filter(r => Number.isFinite(Number(r.annual)));
    const bestYear = yearsList.reduce((best, row) => !best || Number(row.annual || -999) > Number(best.annual || -999) ? row : best, null);
    const worstYear = yearsList.reduce((worst, row) => !worst || Number(row.annual || 999) < Number(worst.annual || 999) ? row : worst, null);
    const assetsByValue = [...S.assets].map(a => ({
      id: String(a.id || ''),
      ticker: a.ticker,
      value: (Number(a.qty) || 0) * (Number(a.current_price) || 0),
      dy: Number(a.dy) || 0,
      type: normalizeType(a.type || 'Ação', 'Ação'),
      sector: String(a.sector || '').trim() || '—'
    })).sort((a, b) => b.value - a.value);
    const topAsset = assetsByValue[0];
    const topAssetIdentity = topAsset ? S.assets.filter(a => {
      const ticker = String(a.ticker || '').trim().toUpperCase();
      return ticker && ticker === String(topAsset.ticker || '').trim().toUpperCase();
    }) : [];
    const topAssetAction = topAsset ? `<button type="button" class="btn bgh rent-context-action" onclick="openRentabilityAsset('${esc(topAsset.id)}','${esc(topAsset.ticker || '')}')">${topAssetIdentity.length === 1 ? 'Abrir ativo' : 'Ver Ativos'}</button>` : '';
    const top3Value = assetsByValue.slice(0, 3).reduce((s, a) => s + a.value, 0);
    const top3Share = data.current?.currentValue > 0 ? (top3Value / (Number(data.current.currentValue) || top3Value)) * 100 : 0;
    const actualByType = S.assets.reduce((acc, a) => {
      const ty = normalizeType(a.type || 'Ação', 'Ação');
      const v = (Number(a.qty) || 0) * (Number(a.current_price) || 0);
      acc[ty] = (acc[ty] || 0) + v;
      return acc;
    }, {});
    const allocItems = allocationGoalItems();
    const allocTarget = Object.fromEntries(allocItems.map(it => [it.type, Number(it.pct) || 0]));
    const allocWarning = Object.keys(allocTarget).map(ty => {
      const total = Object.values(actualByType).reduce((s, v) => s + v, 0);
      const actual = total > 0 ? ((actualByType[ty] || 0) / total) * 100 : 0;
      const diff = actual - (allocTarget[ty] || 0);
      return { ty, actual, target: allocTarget[ty] || 0, diff };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
    const allocationSnapshot = allocationActualByType();
    const distributionRows = Object.entries(allocationSnapshot.map || {})
      .filter(([, value]) => Number(value) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const sideCards = [
      {
        title: 'Rentabilidade total',
        value: certifiedHistory && current.cumReturn != null ? fmtP(current.cumReturn) : 'Indisponível',
        foot: certifiedHistory ? `${data.metric === 'TWR' ? 'TWR datado' : 'Retorno simples datado'} · ${data.asOf || 'sem data'}` : 'Sem série histórica certificada para este recorte',
        color: certifiedHistory && current.cumReturn != null ? 'var(--success)' : 'var(--muted)',
      },
      {
        title: 'Últimos 12 meses',
        value: certifiedHistory && return12m != null ? fmtP(return12m) : 'Indisponível',
        foot: certifiedHistory && return12m != null ? `Proventos: ${fmt(provCurrent)}` : 'Valuation de abertura da janela de 12 meses indisponível',
        color: certifiedHistory && return12m != null ? '#60a5fa' : 'var(--muted)',
      },
      {
        title: 'Último mês',
        value: certifiedHistory && currentMonth != null ? fmtP(currentMonth) : 'Indisponível',
        foot: certifiedHistory && currentMonth != null ? 'Retorno entre valuations datados' : 'Valuations de abertura/fechamento mensal indisponíveis',
        color: certifiedHistory && currentMonth != null ? (currentMonth || 0) >= 0 ? 'var(--success)' : 'var(--danger)' : 'var(--muted)',
      },
      {
        title: 'Patrimônio atual',
        value: current.currentValue == null ? 'Indisponível' : fmt(current.currentValue),
        foot: current.currentValue == null ? 'Valuation histórico indisponível' : 'Último valuation datado disponível',
        color: '#22d3ee',
      },
    ];
    const concentrationNote = topAsset
      ? `Concentração: top 3 com ${top3Share.toFixed(1)}% da carteira. Maior posição: ${topAsset.ticker} com ${fmt(topAsset.value)} (${normalizeType(topAsset.type || 'Ação', 'Ação')}).`
      : 'Concentração: sem posições ainda.';

    const chartData = certifiedHistory ? (view.length ? view : points) : [];
    const chartLabels = chartData.map(p => p.label);
    const benchmarkSource = String(data.benchmarkSource || data.benchmark?.source || '').trim();
    const benchmarkPeriod = String(data.benchmarkPeriod || data.benchmark?.period || '').trim();
    const benchmarkSeriesAvailable = !!benchmarkSource && !!benchmarkPeriod && benchSeries.length === chartData.length && benchSeries.every(value => Number.isFinite(Number(value)));
    const chartSeries = [
      { name: 'Carteira', values: chartData.map(p => p.cumReturn || 0), color: 'var(--success)', fill: 'rgba(34,197,94,.12)', width: 2.5, points: false },
      ...(benchmarkSeriesAvailable ? [{ name: `${bench} · ${benchmarkSource} · ${benchmarkPeriod}`, values: benchSeries, color: '#60a5fa', width: 2.2, points: false }] : []),
    ];
    const summaryPreview = [
      { label: 'Último mês', value: currentMonth == null ? 'Indisponível' : fmtP(currentMonth), sub: 'Retorno entre valuations datados' },
      { label: 'Melhor ano', value: bestYear ? `${bestYear.year} · ${fmtP(bestYear.annual || 0)}` : '—', sub: 'Maior retorno anual' },
      { label: 'Pior ano', value: worstYear ? `${worstYear.year} · ${fmtP(worstYear.annual || 0)}` : '—', sub: 'Menor retorno anual' },
      { label: 'Meses com retorno calculado', value: `${data.totalMonths}`, sub: `Proventos 12M ${provCurrent == null ? 'Indisponível' : fmt(provCurrent)}` },
    ];

    const yearsRows = (data.years || []).map(row => {
      const cells = row.months.map((p, idx) => {
        if (!p) return `<td style="color:#2e3f58">-</td>`;
        const v = p.delta || 0;
        return `<td class="${v >= 0 ? 'gn' : 'rd'}" style="font-weight:${Math.abs(v) > 0.005 ? 700 : 500}">${fmtP(v)}</td>`;
      }).join('');
      return `<tr>
        <td style="font-weight:800;color:var(--text)">${row.year}</td>
        ${cells}
        <td style="font-weight:800;color:var(--text)">${fmtP(row.annual || 0)}</td>
        <td style="font-weight:800;color:${(row.provAnnual || 0) >= 0 ? 'var(--warning)' : 'var(--danger)'}">${fmt(row.provAnnual || 0)}</td>
        <td style="font-weight:800;color:${(row.provAcum || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(row.provAcum || 0)}</td>
        <td style="font-weight:800;color:${(row.acum || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmtP(row.acum || 0)}</td>
      </tr>`;
    }).join('');

    const chartLegend = `<div class="pleg">
      <div class="pli"><span class="pd" style="background:var(--success)"></span>Carteira</div>
      <div class="pli"><span class="pd" style="background:#60a5fa"></span>${benchmarkSeriesAvailable ? `${esc(bench)} · ${esc(benchmarkSource)} · ${esc(benchmarkPeriod)}` : `${esc(bench)} · referência indisponível; fonte e série datadas não disponíveis`}</div>
      <div class="pli"><span class="pd" style="background:var(--muted)"></span>${certifiedHistory ? 'Série derivada dos valuations disponíveis' : 'Sem retroagir preço atual'}</div>
    </div>`;
    const periodLabel = period === 'all' ? 'Desde o início' : `${period} meses`;
    const benchmarkBasis = benchmarkSeriesAvailable
      ? `${bench} · fonte ${benchmarkSource} · período ${benchmarkPeriod}`
      : `${bench} · fonte/série histórica indisponível para ${periodLabel}; taxa fixa não é série datada`;
    const baseLabel = certifiedHistory
      ? `${data.metric === 'TWR' ? 'TWR' : 'Retorno simples'} com valuations datados · ${data.asOf || 'data-base indisponível'}`
      : 'Valuations históricos necessários; preço atual não é usado como histórico';
    const primaryResultCard = sideCards[0];
    const secondaryMetricCards = sideCards.slice(1);

    return `<div class="rent-premium"><h1 class="page-heading">Rentabilidade</h1>
  <div class="page-sub">Resultado histórico por período, com base e cobertura explícitas.</div>
  <section class="card al dash-card rent-card rent-primary-result ${certifiedHistory ? 'rent-primary-result--available' : 'rent-primary-result--unavailable'}" aria-label="Resultado de rentabilidade no período">
    <div class="rent-kpi-label">${esc(primaryResultCard.title)} · ${esc(periodLabel)}</div>
    <div class="rent-kpi-value" style="color:${primaryResultCard.color}">${primaryResultCard.value}</div>
    <div class="rent-kpi-foot">${esc(primaryResultCard.foot)}</div>
  </section>
  <section class="rent-primary-context" aria-label="Base, referência e cobertura da rentabilidade">
    <label class="rent-filters-context">Período
      <select aria-label="Período da rentabilidade" onchange="setRentPeriod(this.value)">
        <option value="all" ${period === 'all' ? 'selected' : ''}>Desde o início</option>
        <option value="12" ${String(period) === '12' ? 'selected' : ''}>12M</option>
        <option value="24" ${String(period) === '24' ? 'selected' : ''}>24M</option>
        <option value="36" ${String(period) === '36' ? 'selected' : ''}>36M</option>
        <option value="60" ${String(period) === '60' ? 'selected' : ''}>60M</option>
      </select>
    </label>
    <label class="rent-filters-context">Ativo
      <select aria-label="Tipo de ativo da rentabilidade" onchange="setRentType(this.value)">
        ${['all', 'Ação', 'FII', 'ETF', 'Renda Fixa', 'BDR', 'Crypto'].map(t => `<option value="${esc(t)}" ${type === t ? 'selected' : ''}>${t === 'all' ? 'Todos os tipos' : t}</option>`).join('')}
      </select>
    </label>
    <label class="rent-filters-context">Referência
      <select aria-label="Benchmark da rentabilidade" onchange="setRentBench(this.value)">
        ${Object.keys(RENT_BENCH).map(b => `<option value="${esc(b)}" ${bench === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}
      </select>
    </label>
    <div class="rent-primary-context-item"><span>Base do resultado</span><strong>${esc(baseLabel)}</strong></div>
    <div class="rent-primary-context-item"><span>Referência · período e fonte</span><strong>${esc(benchmarkBasis)}</strong></div>
    <div class="rent-primary-context-item rent-primary-coverage" role="status"><span>Cobertura histórica</span><strong>${esc(historyCoverageLabel)}</strong></div>
  </section>
  <section class="cc rent-main" aria-label="Evolução da rentabilidade">
    <div class="sh" style="margin-bottom:12px">
      <div>
        <div class="st">Evolução no período selecionado</div>
        <div class="mu" style="font-size:11px;margin-top:2px">A série certificada depende de valuations e preços históricos; lacunas permanecem visíveis.</div>
      </div>
    </div>

    ${chartLegend}
    <div class="rent-chartbox">
      ${chartData.length ? lineChart(chartSeries, chartLabels, 'rent-performance-chart') : '<div class="es" style="padding:42px 18px">Sem série histórica certificada para este período. A ausência de histórico não representa retorno zero.</div>'}
    </div>
    <div class="rent-summary-preview" aria-label="Resumo do histórico mensal">
        ${(certifiedHistory ? summaryPreview : summaryPreview.map(item => ({ ...item, value: 'Indisponível', sub: 'Cobertura histórica insuficiente' }))).map(item => `<div class="rent-summary-chip">
          <div class="rent-summary-chip-label">${esc(item.label)}</div>
          <div class="rent-summary-chip-value">${esc(item.value)}</div>
          <div class="rent-summary-chip-sub">${esc(item.sub)}</div>
        </div>`).join('')}
    </div>
    <div class="rent-context-note"><span class="mu" style="font-size:10px;line-height:1.35">${topAsset ? `Concentração: top 3 ${top3Share.toFixed(1)}% · Maior posição: ${topAsset.ticker} (${normalizeType(topAsset.type || 'Ação', 'Ação')}).` : 'Concentração: sem posições ainda.'}</span>${topAssetAction}</div>
  </section>

  <details class="rent-secondary-disclosure">
    <summary>Outros períodos e composição atual</summary>
    <div class="rent-side">${secondaryMetricCards.map(c => `<div class="card al dash-card rent-card" style="border-left-color:${c.color}"><div class="rent-kpi-label">${esc(c.title)}</div><div class="rent-kpi-value" style="color:${c.color}">${c.value}</div><div class="rent-kpi-foot">${esc(c.foot)}</div></div>`).join('')}</div>
    <div class="rent-secondary-grid">
    <section class="card rent-distribution-panel" aria-label="Distribuição atual da carteira">
      <div class="sh"><div><div class="st">Distribuição por tipo de ativo</div><div class="mu">Composição atual usando o snapshot oficial da carteira.</div></div></div>
      ${distributionRows.length ? `<div class="rent-distribution-list">${distributionRows.map(([label, value], idx) => { const pct = allocationSnapshot.total > 0 ? (Number(value) / allocationSnapshot.total) * 100 : 0; return `<div class="rent-distribution-row"><div class="rent-distribution-head"><span><i class="rent-distribution-dot" style="background:${ALLOC_COLORS[idx % ALLOC_COLORS.length]}"></i>${esc(label)}</span><strong>${pct.toFixed(1)}% · ${fmt(value)}</strong></div><div class="rent-distribution-track"><span style="width:${Math.max(4, pct).toFixed(1)}%;background:${ALLOC_COLORS[idx % ALLOC_COLORS.length]}"></span></div></div>` }).join('')}</div>` : '<div class="evo-empty">Nenhuma posição disponível para distribuir.</div>'}
    </section>
    <section class="card rent-analysis-note" aria-label="Leitura analítica da rentabilidade">
      <div class="sh"><div><div class="st">Leitura analítica</div><div class="mu">Contexto para interpretar o retorno exibido.</div></div></div>
      <div class="rent-analysis-note-list">
        <div><span>Base de cálculo</span><strong>Capital aplicado</strong></div>
        <div><span>Proventos no recorte</span><strong>${provCurrent == null ? 'Indisponível' : fmt(provCurrent)}</strong></div>
        <div><span>Comparação</span><strong>${esc(bench)} · taxa fixa anual configurada</strong></div>
      </div>
    </section>
    </div>
  </details>

  <details class="sec rent-monthly-details" style="margin-top:14px">
    <summary>
      <div>
        <div class="sec-title">Rentabilidade mensal</div>
        <div class="sec-meta">visão consolidada por ano, mês e proventos recebidos</div>
      </div>
      <div class="sec-meta">${data.totalMonths} meses analisados · clique para abrir</div>
    </summary>
    <div class="sec-body">
      <div class="tw"><div class="ts"><table class="hist-monthly rent-table">
        <thead><tr><th>Ano</th>${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => `<th>${m}</th>`).join('')}<th>Retorno anual</th><th>Proventos ano</th><th>Proventos acum.</th><th>Acumulado</th></tr></thead>
        <tbody>${yearsRows || '<tr><td colspan="17" style="text-align:center;padding:20px;color:#2e3f58">Sem dados de rentabilidade ainda.</td></tr>'}</tbody>
      </table></div></div>
    </div>
  </details>
  <details class="rent-evidence-details">
    <summary>Cobertura e auditoria histórica</summary>
    <div class="rent-evidence-details-body">${v248HistoricalPerformancePanel()}${v252PerformanceIntelligence() || ''}</div>
  </details></div>`;
  };
});