'use strict';

/**
 * Executive Alerts Panel — Actionable deterministic insights
 *
 * Maximum 3 visible alerts. Based on deterministic rules only.
 * No generative advice, no buy/sell recommendations.
 */

(function exposeExecutiveAlerts(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveAlerts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveAlerts() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtP = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  function buildAlerts({ allocation, assets, officialTotal, portfolioTotal, gapTotal, availability, appliedState }) {
    const alerts = [];

    // 1. Dados de custo incompletos
    const totalAssets = Array.isArray(S?.assets) ? S.assets.length : 0;
    const assetsWithApplied = Array.isArray(S?.assets) ? S.assets.filter(a => {
      const isRF = typeof isRendaFixaAsset === 'function' ? isRendaFixaAsset(a) : String(a?.type || '').trim() === 'Renda Fixa';
      return isRF ? (typeof rfValues === 'function' && rfValues(a).hasExplicitApplied) : hasOwnFiniteNumber(a, ['avg_price', 'applied_value']);
    }).length : 0;
    const missingApplied = totalAssets - assetsWithApplied;
    if (missingApplied > 0) {
      alerts.push({
        id: 'missing-cost-basis',
        severity: 'ATTENTION',
        title: 'Dados de custo incompletos',
        description: `${missingApplied} de ${totalAssets} posições sem base de custo confirmada. Resultado e rentabilidade indisponíveis para estas.`,
        relatedRoute: 'ativos',
        actionLabel: 'Ver ativos'
      });
    }

    // 2. Reconciliação pendente
    if (typeof officialTotal === 'number' && typeof gapTotal === 'number' && Math.abs(gapTotal) > 0.01) {
      alerts.push({
        id: 'reconciliation-gap',
        severity: 'ATTENTION',
        title: 'Reconciliação pendente',
        description: `Gap de ${fmt(Math.abs(gapTotal))} entre total oficial (${fmt(officialTotal)}) e soma das posições detalhadas.`,
        relatedRoute: 'patrimonio',
        actionLabel: 'Ver reconciliação'
      });
    }

    // 3. Classe muito concentrada
    const allocationData = typeof portfolioAllocationSnapshot === 'function' ? portfolioAllocationSnapshot() : null;
    if (allocationData?.classes?.rows?.length) {
      const topClass = allocationData.classes.rows
        .filter(c => c.value && c.value > 0)
        .sort((a, b) => b.value - a.value)[0];
      if (topClass && topClass.shareOfKnown && topClass.shareOfKnown > 40) {
        alerts.push({
          id: 'class-concentration',
          severity: 'IMPORTANT',
          title: 'Classe muito concentrada',
          description: `${topClass.label} representa ${topClass.shareOfKnown.toFixed(1)}% do patrimônio conhecido. Diversificação pode reduzir risco.`,
          relatedRoute: 'ativos',
          actionLabel: 'Ver alocação'
        });
      }
    }

    // 4. Posição sem custo conhecido (largest without cost)
    if (Array.isArray(S?.assets) && S.assets.length > 0) {
      const largestWithoutCost = [...S.assets].map(a => {
        const isRF = typeof isRendaFixaAsset === 'function' ? isRendaFixaAsset(a) : String(a?.type || '').trim() === 'Renda Fixa';
        const hasCost = isRF ? (typeof rfValues === 'function' && rfValues(a).hasExplicitApplied) : hasOwnFiniteNumber(a, ['avg_price', 'applied_value']);
        const value = isRF ? (typeof assetCurrentValue === 'function' ? assetCurrentValue(a) : null) : (Number(a?.qty) || 0) * (Number(a?.current_price) || 0);
        return { asset: a, hasCost, value: value || 0 };
      }).filter(x => !x.hasCost && x.value > 0)
      .sort((a, b) => b.value - a.value)[0];

      if (largestWithoutCost) {
        alerts.push({
          id: 'largest-without-cost',
          severity: 'ATTENTION',
          title: 'Maior posição sem custo conhecido',
          description: `${largestWithoutCost.asset.ticker} (${fmt(largestWithoutCost.value)}) não tem base de custo. Resultado incerto.`,
          relatedRoute: 'ativos',
          actionLabel: 'Ver ativo'
        });
      }
    }

    // 5. Histórico insuficiente para TWR
    const v248 = typeof v248HistoricalPerformanceSnapshot === 'function' ? v248HistoricalPerformanceSnapshot() : null;
    if (v248 && v248.coverage !== 'FULL_COVERAGE') {
      alerts.push({
        id: 'insufficient-history',
        severity: 'ATTENTION',
        title: 'Histórico insuficiente para TWR',
        description: `Cobertura histórica: ${v248.coverage}. Rentabilidade total usa método simplificado.`,
        relatedRoute: 'rentabilidade',
        actionLabel: 'Ver rentabilidade'
      });
    }

    // 6. Proventos com cobertura parcial
    const incomeStats = typeof passiveIncomeGoalStats === 'function' ? passiveIncomeGoalStats() : null;
    if (incomeStats && incomeStats.completeMonthCount !== null && incomeStats.completeMonthCount < 12) {
      alerts.push({
        id: 'partial-income-coverage',
        severity: 'ATTENTION',
        title: 'Proventos com cobertura parcial',
        description: `Apenas ${incomeStats.completeMonthCount}/12 meses completos nos últimos 12M. Média mensal pode ser imprecisa.`,
        relatedRoute: 'dividendos',
        actionLabel: 'Ver dividendos'
      });
    }

    // 7. Cotações desatualizadas
    if (availability?.state === 'STALE') {
      alerts.push({
        id: 'stale-quotes',
        severity: 'ATTENTION',
        title: 'Cotações desatualizadas',
        description: 'Algumas cotações estão desatualizadas. Confirme a data da fonte antes de decisões.',
        relatedRoute: 'ativos',
        actionLabel: 'Atualizar cotações'
      });
    }

    // 8. Valor atual indisponível
    if (availability?.state === 'UNKNOWN' || availability?.state === 'PARTIAL') {
      alerts.push({
        id: 'unknown-current-value',
        severity: availability?.state === 'UNKNOWN' ? 'IMPORTANT' : 'ATTENTION',
        title: availability?.state === 'UNKNOWN' ? 'Valor atual indisponível' : 'Valor atual parcial',
        description: availability?.note || 'Cobertura de valor atual incompleta.',
        relatedRoute: 'ativos',
        actionLabel: 'Ver ativos'
      });
    }

    // Sort by severity (IMPORTANT first) then by id for stability
    const severityOrder = { IMPORTANT: 0, ATTENTION: 1 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  }

  function render({ alerts, maxVisible = 3 }) {
    if (!alerts || !alerts.length) {
      return `
      <section class="dashboard-executive-alerts" aria-label="Alertas executivos">
        <div class="executive-panel-head">
          <h2 class="executive-panel-title">Alertas</h2>
          <div class="executive-panel-sub">Nenhum alerta ativo no momento</div>
        </div>
        <div class="executive-alerts-empty">Tudo tranquilo por enquanto</div>
      </section>
      `;
    }

    const visible = alerts.slice(0, maxVisible);
    const remaining = alerts.length - maxVisible;

    return `
    <section class="dashboard-executive-alerts" aria-label="Alertas executivos">
      <div class="executive-panel-head">
        <h2 class="executive-panel-title">Alertas</h2>
        <div class="executive-panel-sub">${alerts.length} ponto${alerts.length !== 1 ? 's' : ''} de atenção</div>
      </div>

      <div class="executive-alerts-list">
        ${visible.map((alert, i) => `
          <article class="executive-alert executive-alert--${alert.severity.toLowerCase()}" data-alert-id="${esc(alert.id)}">
            <div class="executive-alert-icon" aria-hidden="true">${alert.severity === 'IMPORTANT' ? '⚠' : '⚡'}</div>
            <div class="executive-alert-content">
              <div class="executive-alert-header">
                <strong class="executive-alert-title">${esc(alert.title)}</strong>
                <span class="ds-badge ds-badge--${alert.severity === 'IMPORTANT' ? 'negative' : 'warning'}">${esc(alert.severity)}</span>
              </div>
              <div class="executive-alert-description">${esc(alert.description)}</div>
              ${alert.relatedRoute ? `
                <button type="button" class="executive-alert-action" onclick="go('${esc(alert.relatedRoute)}')">${esc(alert.actionLabel)}</button>
              ` : ''}
            </div>
          </article>
        `).join('')}
      </div>

      ${remaining > 0 ? `
        <button type="button" class="executive-alerts-expand" onclick="expandExecutiveAlerts()">
          Ver mais ${remaining} alerta${remaining !== 1 ? 's' : ''}
        </button>
      ` : ''}
    </section>
    `;
  }

  return { buildAlerts, render };
});