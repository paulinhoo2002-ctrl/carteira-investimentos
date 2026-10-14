'use strict';

(function exposeExecutiveKpis(root, factory) {
  const executiveKPIs = factory();
  if (typeof module === 'object' && module.exports) module.exports = executiveKPIs;
  if (root) root.executiveKPIs = executiveKPIs;
})(typeof globalThis === 'object' ? globalThis : this, function createExecutiveKpis() {
  return function executiveKPIs(data) {
    const p = data?.portfolio || cx();
    const knownNumber = value => {
      if (value === null || value === undefined || value === '') return null;
      const number = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const totalCurrent = knownNumber(p.tC);
    const totalApplied = knownNumber(p.tI);
    const amountValid = typeof p.tG === 'number' && Number.isFinite(p.tG);
    const percentValid = typeof p.tGP === 'number' && Number.isFinite(p.tGP) && totalApplied > 0;
    const availability = dashboardCurrentValueAvailability();
    const currentMonthKey = passiveIncomeMonthKey(new Date());
    const recent = data?.recent?.month === currentMonthKey ? data.recent : passiveIncomeMonthSummary(currentMonthKey);
    const monthReceived = recent.total;
    const sameBasis = amountValid && percentValid && Math.abs((p.tG / totalApplied) * 100 - p.tGP) < 0.02;
    const resultAvailable = !['UNKNOWN', 'PARTIAL', 'NO_DATA'].includes(availability.state);
    const amount = resultAvailable && amountValid ? fmt(p.tG) : '';
    const percent = resultAvailable && percentValid && !S.hideValues ? fmtP(p.tGP) : '';
    const resultValue = sameBasis && amount && percent ? `${amount} · ${percent}` : (amount || percent || '—');
    const resultNote = !resultAvailable ? 'Base parcial ou indisponível' : sameBasis ? 'Variação atual sobre capital aplicado' : 'Medidas sem base comum; não pareadas';
    const resultTone = !amountValid || !resultAvailable || p.tG === 0 ? '#94a3b8' : p.tG > 0 ? '#34d399' : '#f87171';
    const resultGlow = !amountValid || !resultAvailable || p.tG === 0 ? 'rgba(148,163,184,.14)' : p.tG > 0 ? 'rgba(52,211,153,.14)' : 'rgba(248,113,113,.14)';
    const patrimonyValue = ['UNKNOWN', 'NO_DATA'].includes(availability.state) || totalCurrent === null ? '—' : fmt(totalCurrent);
    const investedContext = totalApplied === null ? 'Capital aplicado indisponível' : totalApplied > 0 ? `Investido ${fmt(totalApplied)}` : 'Sem capital aplicado';
    const patrimonyNote = availability.state === 'AVAILABLE' && totalCurrent === 0 ? 'Valor conhecido: zero' : availability.note;
    
    // Package 1A official totals (if available)
    const hasP1A = typeof root !== 'undefined' && root.Package1A && typeof root.Package1A.computeTotals === 'function';
    const p1aTotals = hasP1A && data?.snapshot ? root.Package1A.computeTotals(data.snapshot) : null;
    const officialTotal = p1aTotals ? p1aTotals.total : null;
    const officialRV = p1aTotals ? p1aTotals.rv : null;
    const officialRF = p1aTotals ? p1aTotals.rf : null;
    const reconciliationGap = hasP1A && data?.snapshot ? root.Package1A.computeGaps(data.snapshot) : null;
    const gapTotal = reconciliationGap ? reconciliationGap.total_gap : null;
    
    // Determine which total to show as primary
    const showOfficial = officialTotal !== null;
    const primaryValue = showOfficial ? fmt(officialTotal) : patrimonyValue;
    const primaryLabel = showOfficial ? 'Patrimônio oficial' : 'Patrimônio atual';
    const primarySub = showOfficial 
      ? `Total certificado Inter · ${gapTotal !== null ? `Gap detalhamento ${fmt(gapTotal)}` : 'Data-base 10/10/2026'}`
      : `${investedContext} · ${patrimonyNote} · Base operacional`;
    const primaryClass = showOfficial ? 'ds-kpi--official' : 'ds-kpi--operational';
    const primaryBadge = showOfficial ? '<span class="ds-badge ds-badge--official">OFICIAL</span>' : '<span class="ds-badge ds-badge--operational">OPERACIONAL</span>';

    return `
    <div class="dashboard-executive-kpis">
      ${dashboardMetricCard(dashboardMetricIcon('wallet'), primaryLabel, primaryValue, primarySub, showOfficial ? 'var(--semantic-official)' : 'var(--semantic-operational)', showOfficial ? 'var(--semantic-official-bg)' : 'var(--semantic-operational-bg)')}
      ${dashboardMetricCard(dashboardMetricIcon('trend'), 'Resultado', resultValue, resultNote, resultTone, resultGlow)}
      ${dashboardMetricCard(dashboardMetricIcon('cash'), 'Recebido', passiveIncomeValue(monthReceived), recent.coverage === 'COMPLETE' ? 'Mês completo confirmado' : recent.coverage === 'PARTIAL' ? 'Recebimentos registrados · cobertura parcial' : 'Cobertura desconhecida', '#10b981', 'rgba(16,185,129,.14)')}
    </div>
  `;
  };
});
