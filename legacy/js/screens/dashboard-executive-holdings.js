'use strict';

/**
 * Executive Holdings Panel — Meus Ativos executive view
 *
 * Dense table for desktop, cards for mobile.
 * Only renders metrics where certified evidence exists.
 */

(function exposeExecutiveHoldings(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveHoldings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveHoldings() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtP = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;
  const fmtNum = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR');

  // Type order for grouping
  const TYPE_ORDER = ['Ação', 'FII', 'ETF', 'Renda Fixa', 'Tesouro Direto', 'BDR', 'Crypto', 'Stock', 'Reit', 'Fundos de Investimento'];

  function getAssetMetrics(a) {
    const isRF = typeof isRendaFixaAsset === 'function' ? isRendaFixaAsset(a) : String(a?.type || '').trim() === 'Renda Fixa';
    const qty = Number(a?.qty) || 0;
    const currentPrice = isRF ? (typeof assetCurrentValue === 'function' ? assetCurrentValue(a) : null) : Number(a?.current_price) || 0;
    const currentValue = isRF ? (typeof assetCurrentValue === 'function' ? assetCurrentValue(a) : null) : qty * currentPrice;
    const appliedValue = isRF ? (typeof assetAppliedValue === 'function' ? assetAppliedValue(a) : null) : qty * (Number(a?.avg_price) || 0);
    const hasApplied = appliedValue !== null && Number.isFinite(appliedValue);
    const result = hasApplied && currentValue !== null ? currentValue - appliedValue : null;
    const returnPct = hasApplied && appliedValue > 0 && currentValue !== null ? ((currentValue - appliedValue) / appliedValue) * 100 : null;
    const dy = Number(a?.dy) || 0;
    const hasDy = dy > 0;

    return {
      isRF,
      qty,
      currentPrice,
      currentValue,
      appliedValue,
      hasApplied,
      result,
      returnPct,
      dy,
      hasDy,
      ticker: String(a?.ticker || '').trim(),
      name: String(a?.name || '').trim(),
      type: String(a?.type || '').trim(),
      custodian: String(a?.custodian || a?.institution || a?.broker || '').trim(),
      sector: String(a?.sector || '').trim(),
      color: a?.color,
      id: String(a?.id || '').trim()
    };
  }

  function render({ assets, portfolioTotal, officialTotal, hideValues }) {
    const assetsList = Array.isArray(assets) ? assets : [];
    const metrics = assetsList.map(a => getAssetMetrics(a));
    const totalValue = portfolioTotal ?? metrics.reduce((s, m) => s + (m.currentValue || 0), 0);

    // Group by type
    const grouped = new Map();
    metrics.forEach(m => {
      const type = m.type || 'Não classificado';
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type).push(m);
    });

    // Order types
    const orderedTypes = TYPE_ORDER.filter(t => grouped.has(t));
    const remaining = [...grouped.keys()].filter(t => !TYPE_ORDER.includes(t));
    const displayTypes = [...orderedTypes, ...remaining];

    // Sort within each type by current value descending
    displayTypes.forEach(type => {
      grouped.get(type).sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    });

    // Build desktop table
    const tableRowsHtml = displayTypes.map(type => {
      const items = grouped.get(type) || [];
      if (!items.length) return '';

      const typeColor = type === 'Ação' ? '#3b82f6' :
                        type === 'FII' ? '#8b5cf6' :
                        type === 'ETF' ? '#f5c542' :
                        type === 'Renda Fixa' ? '#10b981' : '#f59e0b';

      const rowsHtml = items.map(m => {
        const share = totalValue > 0 && m.currentValue ? (m.currentValue / totalValue) * 100 : null;
        const hasApplied = m.hasApplied;
        const result = m.result;
        const returnPct = m.returnPct;
        const resultClass = result === null ? '' : result >= 0 ? 'positive-text' : 'negative-text';
        const returnClass = returnPct === null ? '' : returnPct >= 0 ? 'positive-text' : 'negative-text';

        return `
          <tr class="executive-holdings-row" data-id="${esc(m.id)}">
            <td class="executive-holdings-cell executive-holdings-asset">
              <div class="executive-holdings-asset-info">
                <span class="executive-holdings-type-badge" style="background:${typeColor};color:${type === 'ETF' ? '#000' : '#fff'}">${esc(type.charAt(0))}</span>
                <div>
                  <div class="executive-holdings-ticker">${esc(m.ticker)}</div>
                  <div class="executive-holdings-name">${esc(m.name)}</div>
                </div>
              </div>
            </td>
            <td class="executive-holdings-cell executive-holdings-custodian">${esc(m.custodian) || '—'}</td>
            <td class="executive-holdings-cell executive-holdings-qty numeric">${m.isRF ? fmt(m.qty) : fmtNum(m.qty)}</td>
            <td class="executive-holdings-cell executive-holdings-price numeric">${m.currentPrice > 0 ? fmt(m.currentPrice) : '—'}</td>
            <td class="executive-holdings-cell executive-holdings-value numeric">${hideValues ? '—' : (m.currentValue !== null ? fmt(m.currentValue) : '—')}</td>
            <td class="executive-holdings-cell executive-holdings-weight numeric">${hideValues ? '—' : (share !== null ? share.toFixed(2) + '%' : '—')}</td>
            <td class="executive-holdings-cell executive-holdings-result numeric ${resultClass}">${hideValues ? '—' : (result !== null ? (result >= 0 ? '+' : '') + fmt(result) : '—')}</td>
            <td class="executive-holdings-cell executive-holdings-return numeric ${returnClass}">${hideValues ? '—' : (returnPct !== null ? fmtP(returnPct) : '—')}</td>
            <td class="executive-holdings-cell executive-holdings-dy numeric">${m.hasDy ? fmtP(m.dy) : '—'}</td>
          </tr>
        `;
      }).join('');

      const typeItems = items.length;
      const typeValue = items.reduce((s, m) => s + (m.currentValue || 0), 0);
      const typeShare = totalValue > 0 ? (typeValue / totalValue) * 100 : 0;
      const typeResult = items.filter(m => m.hasApplied).reduce((s, m) => s + (m.result || 0), 0);
      const typeHasResult = items.some(m => m.hasApplied);

      return `
        <thead class="executive-holdings-group-head">
          <tr>
            <th colspan="9" class="executive-holdings-group-label">
              <span class="executive-holdings-type-indicator" style="background:${typeColor}"></span>
              ${esc(type)} · ${typeItems} ativo${typeItems !== 1 ? 's' : ''} · ${fmt(typeValue)} (${typeShare.toFixed(2)}%)
              ${typeHasResult ? ` · Resultado: ${typeResult >= 0 ? '+' : ''}${fmt(typeResult)}` : ' · Sem base de custo'}
            </th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      `;
    }).join('');

    // Mobile cards
    const mobileCardsHtml = metrics.map(m => {
      const share = totalValue > 0 && m.currentValue ? (m.currentValue / totalValue) * 100 : null;
      const hasApplied = m.hasApplied;
      const result = m.result;
      const returnPct = m.returnPct;
      const resultClass = result === null ? '' : result >= 0 ? 'positive-text' : 'negative-text';

      return `
        <details class="executive-holdings-card" data-id="${esc(m.id)}">
          <summary class="executive-holdings-card-summary">
            <div class="executive-holdings-card-main">
              <span class="executive-holdings-type-badge" style="background:${type === 'Ação' ? '#3b82f6' : type === 'FII' ? '#8b5cf6' : type === 'ETF' ? '#f5c542' : type === 'Renda Fixa' ? '#10b981' : '#f59e0b'}">${esc(m.type?.charAt(0) || '?')}</span>
              <div>
                <div class="executive-holdings-card-ticker">${esc(m.ticker)}</div>
                <div class="executive-holdings-card-name">${esc(m.name)}</div>
              </div>
            </div>
            <div class="executive-holdings-card-meta">
              <div><span>Valor</span><strong>${hideValues ? '—' : (m.currentValue ? fmt(m.currentValue) : '—')}</strong></div>
              <div><span>Peso</span><strong>${share !== null ? share.toFixed(2) + '%' : '—'}</strong></div>
              <div><span>Resultado</span><strong class="${resultClass}">${result !== null ? (result >= 0 ? '+' : '') + fmt(result) : '—'}</strong></div>
            </div>
          </summary>
          <div class="executive-holdings-card-details">
            <div class="executive-holdings-card-row"><span>Custódia</span><strong>${esc(m.custodian) || '—'}</strong></div>
            <div class="executive-holdings-card-row"><span>Quantidade</span><strong>${m.isRF ? fmt(m.qty) : fmtNum(m.qty)}</strong></div>
            <div class="executive-holdings-card-row"><span>Preço atual</span><strong>${m.currentPrice > 0 ? fmt(m.currentPrice) : '—'}</strong></div>
            <div class="executive-holdings-card-row"><span>Valor atual</span><strong>${hideValues ? '—' : (m.currentValue ? fmt(m.currentValue) : '—')}</strong></div>
            <div class="executive-holdings-card-row"><span>Peso</span><strong>${share !== null ? share.toFixed(2) + '%' : '—'}</strong></div>
            <div class="executive-holdings-card-row"><span>Base de custo</span><strong>${hasApplied ? 'Confirmada' : 'Não confirmada'}</strong></div>
            <div class="executive-holdings-card-row"><span>Resultado</span><strong class="${resultClass}">${result !== null ? (result >= 0 ? '+' : '') + fmt(result) : '—'}</strong></div>
            <div class="executive-holdings-card-row"><span>Rentabilidade</span><strong>${returnPct !== null ? fmtP(returnPct) : '—'}</strong></div>
            <div class="executive-holdings-card-row"><span>DY</span><strong>${m.hasDy ? fmtP(m.dy) : '—'}</strong></div>
          </div>
        </details>
      `;
    }).join('');

    // Summary row
    const totalInvested = metrics.filter(m => m.hasApplied).reduce((s, m) => s + (m.appliedValue || 0), 0);
    const totalResult = metrics.filter(m => m.hasApplied).reduce((s, m) => s + (m.result || 0), 0);
    const hasAnyApplied = metrics.some(m => m.hasApplied);

    return `
    <section class="dashboard-executive-holdings" aria-label="Meus ativos">
      <div class="executive-panel-head">
        <div>
          <h2 class="executive-panel-title">Meus Ativos</h2>
          <div class="executive-panel-sub">
            ${metrics.length} posições · ${officialTotal ? `Total oficial: ${fmt(officialTotal)}` : `Total detalhado: ${fmt(portfolioTotal)}`}
            ${officialTotal ? ` · Gap: ${fmt(officialTotal - (portfolioTotal || 0))}` : ''}
          </div>
        </div>
        <div class="executive-holdings-summary">
          <div class="executive-holdings-summary-item">
            <span>Investido</span>
            <strong>${hideValues ? '—' : (totalInvested > 0 ? fmt(totalInvested) : '—')}</strong>
          </div>
          <div class="executive-holdings-summary-item">
            <span>Resultado</span>
            <strong class="${totalResult >= 0 ? 'positive-text' : 'negative-text'}">${totalResult >= 0 ? '+' : ''}${fmt(totalResult)}</strong>
          </div>
          <div class="executive-holdings-summary-item">
            <span>Rentab.</span>
            <strong>${hasAnyApplied && totalInvested > 0 ? fmtP((totalResult / totalInvested) * 100) : '—'}</strong>
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="executive-holdings-table-wrap" role="region" aria-label="Tabela de posições" tabindex="0">
        <table class="executive-holdings-table">
          <thead>
            <tr>
              <th>Ativo</th>
              <th>Custódia</th>
              <th class="numeric">Quantidade</th>
              <th class="numeric">Preço</th>
              <th class="numeric">Valor</th>
              <th class="numeric">Peso</th>
              <th class="numeric">Resultado</th>
              <th class="numeric">Rentab.</th>
              <th class="numeric">DY</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="executive-holdings-cards">
        ${mobileCardsHtml}
      </div>

      <div class="executive-holdings-footer">
        <span class="ds-badge ds-badge--info">BASE DE CUSTO PARCIAL</span>
        ${S?.hideValues ? '<span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
      </div>
    </section>
    `;
  }

  return { render };
});