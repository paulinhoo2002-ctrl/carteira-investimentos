'use strict';

/**
 * Executive Composition Panel — Asset allocation by category
 *
 * Shows certified allocation using official totals when available,
 * with clear gap indication when detail doesn't reconcile.
 */

(function exposeExecutiveComposition(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveComposition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveComposition() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtP = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  // Category order for consistent display
  const CATEGORY_ORDER = ['Ação', 'FII', 'ETF', 'Renda Fixa', 'Tesouro Direto', 'BDR', 'Crypto', 'Stock', 'Reit', 'Fundos de Investimento'];

  function render({ allocation, officialTotal, detailTotal, gapTotal, hideValues }) {
    const classes = allocation?.classes?.rows || [];
    const totalKnownValue = allocation?.totalKnownValue ?? null;
    const unclassifiedValue = allocation?.totalUnclassifiedValue ?? 0;
    const unknownCount = allocation?.unknownPositionCount ?? 0;
    const knownPositionCount = allocation?.knownPositionCount ?? 0;
    const positionCount = allocation?.positionCount ?? 0;
    const hidden = !!S?.hideValues;

    // Filter and order classes
    const orderedClasses = [...classes].filter(c => c.value && c.value > 0);
    const orderedNames = [...CATEGORY_ORDER].filter(name =>
      orderedClasses.some(c => c.label === name)
    );
    const remaining = orderedClasses.filter(c => !CATEGORY_ORDER.includes(c.label));
    const displayOrder = [...orderedNames.map(n => orderedClasses.find(c => c.label === n)).filter(Boolean), ...remaining];

    // Determine totals
    const hasOfficialTotal = officialTotal !== null && Number.isFinite(officialTotal);
    const hasDetailTotal = detailTotal !== null && Number.isFinite(detailTotal);
    const detailSum = detailTotal ?? 0;
    const gap = gapTotal !== null ? gapTotal : (hasOfficialTotal && officialTotal - detailSum);

    // Build class rows
    const classRowsHtml = displayOrder.map((cls, index) => {
      const share = cls.shareOfKnown !== null ? cls.shareOfKnown : (totalKnownValue ? (cls.value / totalKnownValue) * 100 : null);
      return `
        <div class="executive-composition-row">
          <span class="executive-composition-dot" style="background:${['#5b8cff', '#7cf4b5', '#ffd76c', '#ff6f7d', '#5fd7ff'][index % 5]}"></span>
          <span class="executive-composition-label">${esc(cls.label)}</span>
          <strong class="executive-composition-value">${hideValues ? '—' : fmt(cls.value)}</strong>
          <span class="executive-composition-share">${share !== null ? fmtP(share) : '—'}</span>
        </div>
      `;
    }).join('') || '<div class="executive-composition-empty">Sem classes com valor conhecido</div>';

    // Unclassified
    const unclassifiedHtml = unclassifiedValue > 0 ? `
      <div class="executive-composition-row executive-composition-unclassified">
        <span class="executive-composition-dot" style="background:var(--muted)"></span>
        <span class="executive-composition-label">Não classificado</span>
        <strong class="executive-composition-value">${hideValues ? '••••' : fmt(unclassifiedValue)}</strong>
        <span class="executive-composition-share">${totalKnownValue ? fmtP((unclassifiedValue / totalKnownValue) * 100) : '—'}</span>
      </div>
    ` : '';

    // Official vs Detail totals
    const totalsHtml = `
      <div class="executive-composition-totals">
        <div class="executive-composition-total-row">
          <span class="executive-composition-total-label">Detalhado (soma posições)</span>
          <strong>${hideValues ? '—' : fmt(detailTotal ?? 0)}</strong>
        </div>
        ${officialTotal !== null ? `
        <div class="executive-composition-total-row">
          <span class="executive-composition-total-label executive-composition-total-official">Total oficial</span>
          <strong>${hideValues ? '—' : fmt(officialTotal)}</strong>
        </div>
        <div class="executive-composition-total-row executive-composition-gap">
          <span class="executive-composition-total-label">Gap reconciliação</span>
          <strong class="gap-value">${fmt(gap || 0)}</strong>
        </div>
        ` : ''}
      </div>
    `;

    // Coverage badges
    const coverageBadges = [];
    if (unclassifiedValue > 0) {
      coverageBadges.push(`<span class="ds-badge ds-badge--partial">NÃO CLASSIFICADO ${fmtP(unclassifiedValue / (totalKnownValue + unclassifiedValue) * 100)}</span>`);
    }
    if (S?.hideValues) {
      coverageBadges.push(`<span class="ds-badge ds-badge--info">VALORES OCULTOS</span>`);
    }
    if (officialTotal !== null && gapTotal !== null && Math.abs(gapTotal) > 0.01) {
      coverageBadges.push(`<span class="ds-badge ds-badge--partial">RECONCILIAÇÃO PARCIAL</span>`);
    }

    return `
    <section class="dashboard-executive-composition" aria-label="Composição da carteira">
      <div class="executive-panel-head">
        <div>
          <h2 class="executive-panel-title">Composição da Carteira</h2>
          <div class="executive-panel-sub">
            Base: valor atual conhecido · ${positionCount} posições (${knownPositionCount} valorizadas)
            ${coverageBadges.length ? '<br>' + coverageBadges.join(' ') : ''}
          </div>
        </div>
      </div>

      <div class="executive-composition-bar" role="img" aria-label="Participação das classes">
        ${displayOrder.map((cls, index) => {
          const share = cls.shareOfKnown !== null ? cls.shareOfKnown : (allocation?.totalKnownValue ? (cls.value / allocation.totalKnownValue) * 100 : 0);
          return `<span style="width:${Math.max(0, Math.min(100, share)).toFixed(1)}%;background:${['#5b8cff', '#7cf4b5', '#ffd76c', '#ff6f7d', '#5fd7ff'][index % 5]}" title="${esc(cls.label)}"></span>`;
        }).join('')}
      </div>

      <div class="executive-composition-list">
        ${classRowsHtml}
        ${unclassifiedHtml}
      </div>

      <div class="executive-composition-totals-wrap">
        ${totalsHtml}
      </div>

      <div class="executive-composition-context">
        <span class="ds-badge ds-badge--info">BASE DETALHADA PARCIAL</span>
        ${S?.hideValues ? '<span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
      </div>
    </section>
    `;
  }

  return { render };
});