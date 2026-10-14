'use strict';

/**
 * Executive Concentration Panel — Portfolio concentration metrics
 *
 * Shows top holdings, sector/class concentration using certified values only.
 */

(function exposeExecutiveConcentration(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveConcentration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveConcentration() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtP = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  function render({ allocation, assets, officialTotal, portfolioTotal, hideValues }) {
    const classes = allocation?.classes?.rows || [];
    const assetsList = Array.isArray(assets) ? assets : [];
    const totalValue = portfolioTotal ?? (officialTotal ?? 0);
    const totalKnownValue = allocation?.totalKnownValue ?? 0;
    const hidden = !!S?.hideValues;

    // Top 10 holdings by value
    const sortedAssets = [...assetsList].map(a => {
      const isRF = typeof isRendaFixaAsset === 'function' ? isRendaFixaAsset(a) : String(a?.type || '').trim() === 'Renda Fixa';
      const currentValue = isRF ? (typeof assetCurrentValue === 'function' ? assetCurrentValue(a) : null) : (Number(a?.qty) || 0) * (Number(a?.current_price) || 0);
      return {
        ticker: String(a?.ticker || '').trim(),
        name: String(a?.name || '').trim(),
        type: String(a?.type || '').trim(),
        value: currentValue,
        hasValue: currentValue !== null && Number.isFinite(currentValue)
      };
    }).filter(a => a.hasValue).sort((a, b) => b.value - a.value);

    const top10 = sortedAssets.slice(0, 10);
    const top10Value = top10.reduce((s, a) => s + a.value, 0);
    const top10Share = totalValue > 0 ? (top10Value / totalValue) * 100 : 0;

    // Top 5
    const top5 = sortedAssets.slice(0, 5);
    const top5Value = top5.reduce((s, a) => s + a.value, 0);
    const top5Share = totalValue > 0 ? (top5Value / totalValue) * 100 : 0;

    // Largest single position
    const largest = sortedAssets[0] || null;

    // Class concentration
    const classesWithValue = classes.filter(c => c.value && c.value > 0).sort((a, b) => b.value - a.value);
    const totalKnown = allocation?.totalKnownValue ?? 0;
    const rvValue = classesWithValue.filter(c => ['Ação', 'FII', 'ETF', 'BDR', 'Stock', 'Reit', 'Fundos de Investimento'].includes(c.label)).reduce((s, c) => s + c.value, 0);
    const rfValue = classesWithValue.filter(c => ['Renda Fixa', 'Tesouro Direto'].includes(c.label)).reduce((s, c) => s + c.value, 0);
    const rvShare = totalKnown > 0 ? (rvValue / totalKnown) * 100 : 0;
    const rfShare = totalKnown > 0 ? (rfValue / totalKnown) * 100 : 0;

    // HHI (Herfindahl-Hirschman Index) for top holdings concentration
    const hhi = sortedAssets.reduce((s, a) => {
      const share = totalValue > 0 ? a.value / totalValue : 0;
      return s + share * share;
    }, 0);
    const hhiLabel = hhi > 0.25 ? 'ALTA' : hhi > 0.15 ? 'MODERADA' : 'BAIXA';

    return `
    <section class="dashboard-executive-concentration" aria-label="Concentração da carteira">
      <div class="executive-panel-head">
        <div>
          <h2 class="executive-panel-title">Concentração da Carteira</h2>
          <div class="executive-panel-sub">
            Base: ${allocation?.totalKnownValue ? fmt(allocation.totalKnownValue) : '—'} · ${fmt(officialTotal || portfolioTotal || 0)} oficial
            <span class="ds-badge ds-badge--partial">BASE DETALHADA PARCIAL</span>
          </div>
        </div>
      </div>

      <div class="executive-concentration-grid">
        <!-- Top holdings summary -->
        <div class="executive-concentration-card">
          <div class="executive-concentration-card-title">Top 5 Posições</div>
          <div class="executive-concentration-value">${fmtP(top5Share)}</div>
          <div class="executive-concentration-sub">${fmt(top5Value)} do total</div>
          <ul class="executive-concentration-list">
            ${top5.map((a, i) => `
              <li><span class="executive-concentration-rank">#${i + 1}</span> ${esc(a.ticker)} · ${fmt(a.value)} (${totalValue > 0 ? ((a.value / totalValue) * 100).toFixed(2) : 0}%)</li>
            `).join('') || '<li>Sem posições valorizadas</li>'}
          </ul>
        </div>

        <div class="executive-concentration-card">
          <div class="executive-concentration-card-title">Top 10 Posições</div>
          <div class="executive-concentration-value">${fmtP(top10Share)}</div>
          <div class="executive-concentration-sub">${fmt(top10Value)} do total</div>
          <ul class="executive-concentration-list">
            ${top10.slice(5).map((a, i) => `
              <li><span class="executive-concentration-rank">#${i + 6}</span> ${esc(a.ticker)} · ${fmt(a.value)} (${totalValue > 0 ? ((a.value / totalValue) * 100).toFixed(2) : 0}%)</li>
            `).join('') || '<li>—</li>'}
          </ul>
        </div>

        <div class="executive-concentration-card">
          <div class="executive-concentration-card-title">Maior Posição</div>
          <div class="executive-concentration-value">${largest ? fmt(largest.value) : '—'}</div>
          <div class="executive-concentration-sub">${largest ? `${esc(largest.ticker)} · ${fmtP(totalValue > 0 ? (largest.value / totalValue) * 100 : 0)}` : '—'}</div>
        </div>

        <div class="executive-concentration-card">
          <div class="executive-concentration-card-title">HHI (Concentração)</div>
          <div class="executive-concentration-value">${hhiLabel}</div>
          <div class="executive-concentration-sub">Índice: ${(hhi * 10000).toFixed(0)} / 10.000</div>
        </div>
      </div>

      <!-- Class breakdown -->
      <div class="executive-concentration-classes">
        <h3 class="executive-concentration-section-title">Por Classe</h3>
        <div class="executive-concentration-class-grid">
          ${['Ação', 'FII', 'ETF', 'Renda Fixa', 'Tesouro Direto', 'BDR', 'Crypto', 'Stock', 'Reit', 'Fundos de Investimento'].filter(name => {
            const cls = classes.find(c => c.label === name);
            return cls && cls.value && cls.value > 0;
          }).map((name, index) => {
            const cls = classes.find(c => c.label === name);
            const share = totalKnown > 0 ? (cls.value / totalKnown) * 100 : 0;
            const palette = ['#5b8cff', '#7cf4b5', '#ffd76c', '#ff6f7d', '#5fd7ff'];
            return `
              <div class="executive-concentration-class-row">
                <span class="executive-concentration-class-dot" style="background:${palette[index % palette.length]}"></span>
                <span class="executive-concentration-class-label">${esc(name)}</span>
                <strong class="executive-concentration-class-value">${fmt(cls.value)}</strong>
                <span class="executive-concentration-class-share">${fmtP(share)}</span>
              </div>
            `;
          }).join('') || '<div class="executive-concentration-empty">Sem classes valorizadas</div>'}
        </div>
      </div>

      <!-- RV vs RF summary -->
      <div class="executive-concentration-rv-rf">
        <div class="executive-concentration-rv-rf-card">
          <div class="executive-concentration-rv-rf-title">Renda Variável</div>
          <div class="executive-concentration-rv-rf-value">${fmt(rvValue)}</div>
          <div class="executive-concentration-rv-rf-share">${fmtP(rvShare)} do conhecido</div>
        </div>
        <div class="executive-concentration-rv-rf-card">
          <div class="executive-concentration-rv-rf-title">Renda Fixa</div>
          <div class="executive-concentration-rv-rf-value">${fmt(rfValue)}</div>
          <div class="executive-concentration-rv-rf-share">${fmtP(rfShare)} do conhecido</div>
        </div>
        ${allocation?.totalUnclassifiedValue > 0 ? `
        <div class="executive-concentration-rv-rf-card executive-concentration-unclassified">
          <div class="executive-concentration-rv-rf-title">Não Classificado</div>
          <div class="executive-concentration-rv-rf-value">${fmt(allocation.totalUnclassifiedValue)}</div>
          <div class="executive-concentration-rv-rf-share">${fmtP(allocation.totalUnclassifiedValue / (totalKnown + allocation.totalUnclassifiedValue) * 100)} do total</div>
        </div>
        ` : ''}
      </div>

      <div class="executive-concentration-footer">
        <span class="ds-badge ds-badge--partial">BASE DETALHADA PARCIAL</span>
        <span class="ds-badge ds-badge--info">NÃO É CONCENTRAÇÃO TOTAL</span>
        ${S?.hideValues ? '<span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
      </div>
    </section>
    `;
  }

  return { render };
});