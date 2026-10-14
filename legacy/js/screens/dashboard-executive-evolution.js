'use strict';

/**
 * Executive Evolution Panel — Portfolio value evolution with period selector
 *
 * Shows certified portfolio value evolution over time.
 * Only renders when coverage permits honest representation.
 */

(function exposeExecutiveEvolution(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveEvolution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveEvolution() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtP = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

  // Period options with their labels
  const PERIODS = [
    { value: 1, label: '1M', short: '1M' },
    { value: 3, label: '3M', short: '3M' },
    { value: 6, label: '6M', short: '6M' },
    { value: 12, label: '12M', short: '12M' },
    { value: 'ytd', label: 'YTD', short: 'YTD' },
    { value: 'all', label: 'Tudo', short: 'Tudo' }
  ];

  function getSnapshot(period) {
    if (typeof patrimonySnapshot === 'function') {
      return patrimonySnapshot(period);
    }
    return { months: [], summary: { tC: null, tI: null, tG: null }, availability: { state: 'UNKNOWN' }, appliedState: 'UNKNOWN' };
  }

  function render({ snapshot, currentPeriod, availability, appliedState, officialTotal, gapTotal, hideValues }) {
    const months = snapshot?.months || [];
    const summary = snapshot?.summary || {};
    const hasHistory = months.some(row => row.movementCount && Number.isFinite(row.cumulative));
    const coverageLabel = availability?.state === 'AVAILABLE' ? 'COBERTURA COMPLETA' :
                          availability?.state === 'PARTIAL' ? 'COBERTURA PARCIAL' :
                          availability?.state === 'UNKNOWN' ? 'COBERTURA DESCONHECIDA' : 'SEM DADOS';

    // Determine current values
    const currentValue = summary?.tC ?? null;
    const investedValue = summary?.tI ?? null;
    const gainLoss = summary?.tG ?? null;
    const gainLossPct = summary?.tGP ?? null;

    // Build period selector
    const periodButtons = PERIODS.map(p => `
      <button type="button"
        class="dash-chip ${String(currentPeriod) === String(p.value) ? 'on' : ''}"
        onclick="setExecutiveEvolutionPeriod('${p.value}')"
        aria-label="Mostrar evolução de ${p.label}"
        aria-pressed="${String(currentPeriod) === String(p.value) ? 'true' : 'false'}">
        ${p.short}
      </button>
    `).join('');

    // Build chart data
    let chartHtml = '';
    if (hasHistory) {
      const values = months.map(row => row.movementCount && Number.isFinite(row.cumulative) ? row.cumulative : null);
      const labels = months.map(row => row.label);
      if (typeof lineChart === 'function') {
        chartHtml = lineChart([{
          name: 'Patrimônio',
          tooltipLabel: 'Patrimônio',
          values,
          color: 'var(--semantic-official)',
          fill: 'rgba(79,70,229,.12)',
          width: 2.5
        }], labels, 'executive-evolution-chart', fmt);
      }
    }

    // Variation calculation
    let variationHtml = '';
    if (currentValue !== null && investedValue !== null && investedValue !== 0) {
      const variation = currentValue - investedValue;
      const variationPct = (variation / Math.abs(investedValue)) * 100;
      variationHtml = `
        <div class="executive-evolution-variation">
          <div class="executive-evolution-variation-row">
            <span class="executive-evolution-variation-label">Variação absoluta</span>
            <strong class="${variation >= 0 ? 'positive-text' : 'negative-text'}">${fmt(variation)}</strong>
          </div>
          <div class="executive-evolution-variation-row">
            <span class="executive-evolution-variation-label">Variação percentual</span>
            <strong class="${variation >= 0 ? 'positive-text' : 'negative-text'}">${fmtP(variationPct)}</strong>
          </div>
        </div>
      `;
    }

    // Official total indicator
    const officialBadge = officialTotal !== null ? `
      <span class="ds-badge ds-badge--official" style="font-size:9px">OFICIAL</span>
    ` : `
      <span class="ds-badge ds-badge--operational" style="font-size:9px">OPERACIONAL</span>
    `;

    const gapNote = officialTotal !== null && gapTotal !== null ? `
      <div class="executive-evolution-gap-note">
        <span class="ds-badge ds-badge--partial">PARCIAL</span>
        Detalhamento: ${fmt(officialTotal - gapTotal)} · Gap: ${fmt(gapTotal)}
      </div>
    ` : '';

    return `
    <section class="dashboard-executive-evolution" aria-label="Evolução do patrimônio">
      <div class="executive-panel-head">
        <div>
          <div class="executive-panel-title-row">
            <h2 class="executive-panel-title">Evolução do Patrimônio</h2>
            ${officialBadge}
          </div>
          <div class="executive-panel-sub">
            ${coverageLabel} · ${availability?.note || 'Cobertura desconhecida'}
            ${gapNote}
          </div>
        </div>
        <div class="executive-panel-period" role="tablist" aria-label="Período de análise">
          ${periodButtons}
        </div>
      </div>

      <div class="executive-evolution-kpis">
        <div class="executive-evolution-kpi">
          <span class="executive-evolution-kpi-label">Patrimônio ${officialTotal !== null ? 'oficial' : 'atual'}</span>
          <strong class="executive-evolution-kpi-value">${hideValues ? '—' : fmt(officialTotal !== null ? officialTotal : currentValue)}</strong>
        </div>
        <div class="executive-evolution-kpi">
          <span class="executive-evolution-kpi-label">Capital aplicado</span>
          <strong class="executive-evolution-kpi-value">${hideValues ? '—' : fmt(investedValue)}</strong>
        </div>
        ${variationHtml}
      </div>

      <div class="executive-evolution-chart-wrap">
        ${chartHtml || `
          <div class="executive-evolution-empty">
            <div class="executive-evolution-empty-title">Histórico indisponível</div>
            <div class="executive-evolution-empty-sub">Dados insuficientes para o período selecionado</div>
          </div>
        `}
      </div>

      <div class="executive-evolution-coverage">
        ${hasHistory ? `
          <span class="ds-badge ds-badge--info">Dados desde ${months.find(m => m.movementCount && Number.isFinite(m.cumulative))?.label || 'início'}</span>
        ` : `
          <span class="ds-badge ds-badge--partial">Sem histórico de valuation para o período</span>
        `}
      </div>
    </section>
    `;
  }

  return { render };
});