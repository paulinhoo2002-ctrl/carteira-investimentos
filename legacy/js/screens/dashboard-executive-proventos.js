'use strict';

/**
 * Executive Proventos Panel — Dividends executive view
 *
 * Clear separation: Received vs Declared vs Expected
 * 12M trailing default with monthly breakdown
 */

(function exposeExecutiveProventos(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveProventos = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveProventos() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtP = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  function getProventosData({ period = '12M' }) {
    const stats = typeof passiveIncomeGoalStats === 'function' ? passiveIncomeGoalStats() : null;
    const monthKey = typeof passiveIncomeMonthKey === 'function' ? passiveIncomeMonthKey(new Date()) : new Date().toISOString().slice(0,7);
    const recent = typeof passiveIncomeMonthSummary === 'function' ? passiveIncomeMonthSummary(monthKey) : { total: null, coverage: 'UNKNOWN' };
    const history = typeof proventoResumo === 'function' ? proventoResumo() : { meses: [], anos: [] };

    // Build monthly received data
    const monthlyReceived = (history?.meses || []).map(m => ({
      month: m.key,
      label: m.mes,
      value: m.valor || 0,
      count: m.count || 0
    })).slice(-12); // Last 12 months

    // Yearly totals
    const yearlyReceived = (history?.anos || []).map(y => ({
      year: y.ano,
      value: y.valor || 0,
      count: y.count || 0
    }));

    const received12M = monthlyReceived.reduce((s, m) => s + m.value, 0);
    const monthlyAvg = monthlyReceived.filter(m => m.value > 0).length > 0
      ? monthlyReceived.filter(m => m.value > 0).reduce((s, m) => s + m.value, 0) / monthlyReceived.filter(m => m.value > 0).length
      : 0;
    const completeMonths = monthlyReceived.filter(m => m.value >= 0).length; // Simplified
    const currentYear = new Date().getFullYear();
    const ytd = yearlyReceived.find(y => y.year === currentYear)?.value || 0;

    // Coverage
    const hasComplete12M = monthlyReceived.length === 12 && monthlyReceived.every(m => m.value !== null);
    const coverage = hasComplete12M ? 'COMPLETA' : monthlyReceived.some(m => m.value !== null) ? 'PARCIAL' : 'DESCONHECIDA';

    return {
      received12M,
      monthlyAvg,
      receivedYTD: ytd,
      currentMonth: recent?.total ?? 0,
      currentMonthCoverage: recent?.coverage ?? 'UNKNOWN',
      monthlyReceived,
      yearlyReceived,
      coverage,
      completeMonths: monthlyReceived.filter(m => m.value !== null).length,
      totalMonths: monthlyReceived.length
    };
  }

  function render({ hideValues }) {
    const data = getProventosData({ period: '12M' });
    const hidden = hideValues || !!S?.hideValues;

    // Monthly chart data
    const chartLabels = data.monthlyReceived.map(m => m.label);
    const chartValues = data.monthlyReceived.map(m => m.value);

    let chartHtml = '';
    if (data.monthlyReceived.some(m => m.value > 0) && typeof lineChart === 'function') {
      chartHtml = lineChart([{
        name: 'Recebido',
        tooltipLabel: 'Proventos recebidos',
        values: chartValues,
        color: 'var(--semantic-operational)',
        fill: 'rgba(96,165,250,.12)',
        width: 2.2
      }], chartLabels, 'executive-proventos-chart', fmt);
    }

    // Coverage badge
    const coverageBadge = data.coverage === 'COMPLETA' ? '<span class="ds-badge ds-badge--official">COMPLETA</span>' :
                          data.coverage === 'PARCIAL' ? '<span class="ds-badge ds-badge--partial">PARCIAL</span>' :
                          '<span class="ds-badge ds-badge--info">DESCONHECIDA</span>';

    // Monthly table rows
    const monthlyRowsHtml = data.monthlyReceived.map(m => `
      <tr>
        <td class="executive-proventos-month-label">${esc(m.label)}</td>
        <td class="numeric">${hidden ? '—' : fmt(m.value)}</td>
        <td class="numeric">${m.count || 0}</td>
      </tr>
    `).join('');

    // Yearly rows
    const yearlyRowsHtml = data.yearlyReceived.map(y => `
      <tr>
        <td>${esc(y.year)}</td>
        <td class="numeric">${hidden ? '—' : fmt(y.value)}</td>
        <td class="numeric">${y.count || 0}</td>
      </tr>
    `).join('');

    return `
    <section class="dashboard-executive-proventos" aria-label="Proventos executivos">
      <div class="executive-panel-head">
        <div>
          <h2 class="executive-panel-title">Proventos</h2>
          <div class="executive-panel-sub">
            Recebidos nos últimos 12 meses · Cobertura: ${coverageBadge}
            ${S?.hideValues ? ' · <span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
          </div>
        </div>
      </div>

      <div class="executive-proventos-kpis">
        <div class="executive-proventos-kpi">
          <span class="executive-proventos-kpi-label">Recebidos 12M</span>
          <strong class="executive-proventos-kpi-value">${hideValues ? '—' : fmt(data.received12M)}</strong>
          <span class="executive-proventos-kpi-sub">${data.coverage === 'COMPLETA' ? 'Meses completos confirmados' : data.coverage === 'PARCIAL' ? `${data.completeMonths}/${data.totalMonths} meses com dados` : 'Sem dados confirmados'}</span>
        </div>
        <div class="executive-proventos-kpi">
          <span class="executive-proventos-kpi-label">Média mensal</span>
          <strong class="executive-proventos-kpi-value">${hideValues ? '—' : fmt(data.monthlyAvg)}</strong>
          <span class="executive-proventos-kpi-sub">Base: meses com recebimento > 0</span>
        </div>
        <div class="executive-proventos-kpi">
          <span class="executive-proventos-kpi-label">Recebidos no ano</span>
          <strong class="executive-proventos-kpi-value">${hideValues ? '—' : fmt(data.receivedYTD)}</strong>
          <span class="executive-proventos-kpi-sub">Ano corrente (YTD)</span>
        </div>
        <div class="executive-proventos-kpi">
          <span class="executive-proventos-kpi-label">Mês atual</span>
          <strong class="executive-proventos-kpi-value">${hideValues ? '—' : fmt(data.currentMonth)}</strong>
          <span class="executive-proventos-kpi-sub">${data.currentMonthCoverage === 'COMPLETE' ? 'Mês completo' : data.currentMonthCoverage === 'PARTIAL' ? 'Parcial' : 'Sem dados'}</span>
        </div>
      </div>

      <div class="executive-proventos-chart-wrap">
        ${chartHtml || `
          <div class="executive-proventos-empty">
            <div class="executive-proventos-empty-title">Sem dados de proventos</div>
            <div class="executive-proventos-empty-sub">Registre proventos para ver a evolução mensal</div>
          </div>
        `}
      </div>

      <div class="executive-proventos-breakdown">
        <details class="executive-proventos-monthly" open>
          <summary class="executive-proventos-summary">
            <span>Recebidos por mês (últimos 12M)</span>
            <span class="executive-proventos-chevron" aria-hidden="true">▾</span>
          </summary>
          <div class="executive-proventos-table-wrap">
            <table class="executive-proventos-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th class="numeric">Recebido</th>
                  <th class="numeric">Eventos</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyRowsHtml || '<tr><td colspan="3" class="mu">Sem dados mensais</td></tr>'}
              </tbody>
            </table>
          </div>
        </details>

        <details class="executive-proventos-yearly">
          <summary class="executive-proventos-summary">
            <span>Recebidos por ano</span>
            <span class="executive-proventos-chevron" aria-hidden="true">▾</span>
          </summary>
          <div class="executive-proventos-table-wrap">
            <table class="executive-proventos-table">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th class="numeric">Recebido</th>
                  <th class="numeric">Eventos</th>
                </tr>
              </thead>
              <tbody>
                ${yearlyRowsHtml || '<tr><td colspan="3" class="mu">Sem dados anuais</td></tr>'}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div class="executive-proventos-footer">
        <span class="ds-badge ds-badge--official">RECEBIDO</span>
        <span class="ds-badge ds-badge--partial">PARCIAL</span>
        <span class="ds-badge ds-badge--info">NÃO INCLUI DECLARADO/ESPERADO</span>
        ${S?.hideValues ? '<span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
      </div>
    </section>
    `;
  }

  return { render, getProventosData };
});