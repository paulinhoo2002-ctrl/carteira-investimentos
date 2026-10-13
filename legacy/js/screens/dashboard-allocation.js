'use strict';

(function exposeDashboardAllocation(root, factory) {
  const dashboardV3AllocationPanel = factory();
  if (typeof module === 'object' && module.exports) module.exports = dashboardV3AllocationPanel;
  if (root) root.dashboardV3AllocationPanel = dashboardV3AllocationPanel;
})(typeof globalThis === 'object' ? globalThis : this, function createDashboardAllocation() {
  return function dashboardV3AllocationPanel() {
    const allocation = portfolioAllocationSnapshot();
    const rows = Array.isArray(allocation.classes?.rows) ? allocation.classes.rows.filter(row => Number(row.value) > 0) : [];
    const unknownCount = allocation.unknownPositionCount || 0;
    const knownZero = allocation.knownPositionCount > 0 && allocation.totalKnownValue === 0;
    const hidden = !!S.hideValues;
    const palette = ['#5b8cff', '#7cf4b5', '#ffd76c', '#ff6f7d', '#5fd7ff'];
    const segments = rows.map((row, index) => `<span style="width:${Math.max(0, Math.min(100, Number(row.shareOfKnown) || 0)).toFixed(1)}%;background:${palette[index % palette.length]}" title="${esc(row.label)}"></span>`).join('');
    const list = hidden ? '' : rows.length ? rows.map((row, index) => `<button type="button" class="dashboard-v3-allocation-row" data-class="${esc(row.label)}" onclick="dashboardOpenAllocationClass(this.dataset.class)" aria-label="Ver ${esc(row.label)} em Ativos"><span class="dashboard-v3-allocation-dot" style="background:${palette[index % palette.length]}"></span><span>${esc(row.label)}</span><strong>${globalThis.PortfolioAllocationIntelligence.formatPercent(row.shareOfKnown)}</strong></button>`).join('')
      : `<p class="dashboard-v3-allocation-empty">${knownZero ? 'Valor atual conhecido: zero; percentuais indisponíveis com base zero.' : allocation.positionCount ? 'Valores atuais indisponíveis.' : 'Sem ativos cadastrados.'}</p>`;
    const institutionCoverage = allocation.coverage?.institution || {};
    const institutionRows = (allocation.institutions?.rows || []).slice(0, 3);
    const institutionList = institutionRows.length ? institutionRows.map(row => `${esc(row.label)} ${globalThis.PortfolioAllocationIntelligence.formatPercent(row.shareOfKnown)}`).join(' · ') : 'nenhuma instituição com valor conhecido';
    const valuationStatus = allocation.valuationAsOf?.status;
    const valuationDate = valuationStatus === 'COMPLETE' && allocation.valuationAsOf?.date
      ? dataTrustDate(allocation.valuationAsOf.date)
      : valuationStatus === 'PARTIAL' && allocation.valuationAsOf?.date
        ? `uniforme entre posições valorizadas (${dataTrustDate(allocation.valuationAsOf.date)}); carteira parcial`
        : valuationStatus === 'MIXED' ? 'mista entre posições valorizadas' : 'não uniforme ou não informada';
    const unknown = unknownCount ? `<p class="dashboard-v3-allocation-unknown">${unknownCount} ${unknownCount === 1 ? 'valor atual indisponível' : 'valores atuais indisponíveis'}; percentuais usam apenas valores conhecidos.</p>` : '';
    const unclassified = Number(allocation.totalUnclassifiedValue) > 0 ? `<p class="dashboard-v3-allocation-unknown">Parcela não classificada: ${hidden ? '••••' : fmt(allocation.totalUnclassifiedValue)}.</p>` : '';
    return `<section class="dashboard-v3-allocation" aria-label="Alocação da carteira">
    <div class="dashboard-v3-section-head"><h2>Alocação</h2><button type="button" onclick="go('ativos')">Ver ativos</button></div>
    <p class="dashboard-v3-context">Participação por classe · base: valor atual conhecido.</p>
    ${hidden ? '<p class="dashboard-v3-allocation-hidden">Composição oculta</p>' : `<div class="dashboard-v3-allocation-bar" role="img" aria-label="Participação das classes com valor conhecido">${segments}</div>`}
    <div class="dashboard-v3-allocation-list">${list}</div>${unknown}${unclassified}
    ${hidden ? '' : `<p class="dashboard-v3-context">Cobertura institucional: ${globalThis.PortfolioAllocationIntelligence.formatPercent(institutionCoverage.coverageCount)} das posições; ${globalThis.PortfolioAllocationIntelligence.formatPercent(institutionCoverage.coverageValue)} do patrimônio conhecido identificado. ${esc(institutionList)}. A instituição usa apenas metadado explícito, não o emissor.</p><p class="dashboard-v3-context">Data-base dos valores: ${esc(valuationDate)}.</p>`}
  </section>`;
  };
});
