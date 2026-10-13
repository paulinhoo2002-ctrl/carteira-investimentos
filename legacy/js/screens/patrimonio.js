'use strict';

// Patrimônio screen renderer
// Extracted from inline index.html for lazy loading and modularity

(function exposePatrimonioTab(root, factory) {
  const patrimonioTab = factory();
  if (typeof module === 'object' && module.exports) module.exports = patrimonioTab;
  if (root) root.patrimonioTab = patrimonioTab;
})(typeof globalThis === 'object' ? globalThis : this, function createPatrimonioTab() {
  return function patrimonioTab() {
    const data = patrimonySnapshot();
    const { tI, tC, tG } = data.summary;
    const currentKnown = data.availability.state === 'AVAILABLE';
    const appliedKnown = data.appliedState === 'AVAILABLE';
    const resultKnown = currentKnown && appliedKnown && tI > 0;
    const periodOpts = [3, 6, 12, 24];
    const shownMonths = data.months.filter(row => row.movementCount > 0);
    const maxMonth = Math.max(...shownMonths.map(row => Math.max(0, row.cumulative)), 1);
    const mobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:640px)').matches;
    const visibleMonths = mobile && shownMonths.length > 8 ? shownMonths.slice(-8) : shownMonths;
    const monthRows = visibleMonths.length ? visibleMonths.map((row, index) => {
      const width = Math.max(row.cumulative > 0 ? 4 : 0, Math.min(100, (Math.max(0, row.cumulative) / maxMonth) * 100));
      const isLast = index === visibleMonths.length - 1;
      return `<div class="patrimonio-month-row">
        <div class="patrimonio-month-label">${esc(row.label)}</div>
        <div class="patrimonio-month-track"><div class="patrimonio-month-fill" style="width:${width.toFixed(0)}%"></div></div>
        <div class="patrimonio-month-value">${fmt(row.cumulative)}${isLast ? ' *' : ''}</div>
      </div>`;
    }).join('') : '<div class="evo-empty">Sem movimentações registradas no período; a cobertura do histórico é desconhecida.</div>';
    const resultTone = resultKnown ? (tG > 0 ? 'gn' : tG < 0 ? 'rd' : 'mu') : 'mu';
    const resultLabel = resultKnown ? (tG > 0 ? 'Acima do aplicado' : tG < 0 ? 'Abaixo do aplicado' : 'Próximo do aplicado') : 'Resultado indisponível';
    const appliedShare = resultKnown && tC > 0 ? Math.min(100, (tI / tC) * 100) : 0;
    const resultShare = resultKnown && tC > 0 ? (tG / tC) * 100 : 0;
    const positiveResultShare = Math.max(0, Math.min(100, resultShare));
    const appliedBarShare = tG >= 0 ? Math.max(0, 100 - positiveResultShare) : 100;

    // Top assets calculation
    const topAssets = [...S.assets]
      .filter(a => (Number(a.qty) || 0) > 0 && (Number(a.current_price) || 0) > 0)
      .map(a => {
        const currentValue = Number(a.qty) * Number(a.current_price);
        const hasApplied = hasOwnFiniteNumber(a, ['avg_price']);
        const appliedValue = hasApplied ? Number(a.qty) * Number(a.avg_price) : null;
        const result = hasApplied ? currentValue - appliedValue : null;
        return { ticker: a.ticker, name: a.name, currentValue, appliedValue, result, pct: hasApplied && appliedValue > 0 ? (result / appliedValue) * 100 : null };
      })
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 8);

    const totalCurrent = topAssets.reduce((s, a) => s + a.currentValue, 0);

    const topAssetsHtml = topAssets.length ? topAssets.map((asset, i) => {
      const share = totalCurrent > 0 ? (asset.currentValue / totalCurrent) * 100 : 0;
      const barWidth = Math.min(100, share);
      const resultTone = asset.result === null ? 'mu' : asset.result >= 0 ? 'gn' : 'rd';
      return `<div class="patrimonio-top-asset">
        <div class="patrimonio-top-asset-rank">#${i + 1}</div>
        <div class="patrimonio-top-asset-info">
          <div class="patrimonio-top-asset-ticker">${esc(asset.ticker)}</div>
          <div class="patrimonio-top-asset-name">${esc(asset.name)}</div>
        </div>
        <div class="patrimonio-top-asset-value">
          <div class="patrimonio-top-asset-amount">${fmt(asset.currentValue)}</div>
          <div class="patrimonio-top-asset-perc ${resultTone}">${share.toFixed(1)}% do exibido · ${asset.pct===null?'resultado indisponível':`${fmtP(asset.pct)}`}</div>
        </div>
        <div class="patrimonio-top-asset-bar-wrap"><div class="patrimonio-top-asset-bar" style="width:${barWidth.toFixed(1)}%"></div></div>
      </div>`;
    }).join('') : '<div class="premium-empty">Sem ativos com cotação atual para ranquear.</div>';

    return `<div class="patrimonio-premium">
      <div class="patrimonio-hero">
        <div class="patrimonio-head">
          <div><h1 class="patrimonio-title">Patrimônio</h1><div class="patrimonio-subtitle">Composição atual e aportes registrados; histórico patrimonial indisponível.</div></div>
          <div class="patrimony-reading">${resultKnown ? data.reading.text : 'Valores parciais ou sem base aplicada completa. Resultado atual indisponível (' + data.availability.note + ').'}</div>
        </div>
        <div class="patrimonio-kpis">
          <div class="patrimonio-kpi patrimonio-kpi-main">
            <div class="patrimonio-kpi-label">Patrimônio total</div>
            <div class="patrimonio-kpi-value">${currentKnown ? fmt(tC) : '—'}</div>
            ${!currentKnown ? `<div class="patrimonio-kpi-sub">${esc(data.availability.note)}</div>` : ''}
          </div>
          <div class="patrimonio-kpi">
            <div class="patrimonio-kpi-label">Resultado atual</div>
            <div class="patrimonio-kpi-value ${resultTone}">${resultKnown ? (tG >= 0 ? '+' : '') + fmt(tG) : '—'}</div>
            <div class="patrimonio-kpi-sub">${resultKnown ? (tG >= 0 ? 'Ganho de capital' : 'Perda de capital') : 'Base de valor atual ou aplicada incompleta'}</div>
          </div>
          <div class="patrimonio-kpi">
            <div class="patrimonio-kpi-label">Aportes líquidos</div>
            <div class="patrimonio-kpi-value pu">${appliedKnown ? fmt(tI) : '—'}</div>
            <div class="patrimonio-kpi-sub">${appliedKnown ? 'Capital aplicado' : 'Base aplicada desconhecida ou parcial'}</div>
          </div>
          <div class="patrimonio-kpi">
            <div class="patrimonio-kpi-label">Resultado %</div>
            <div class="patrimonio-kpi-value ${resultTone}">${resultKnown ? fmtP(data.pct) : '—'}</div>
            <div class="patrimonio-kpi-sub">${resultKnown ? (data.pct >= 0 ? 'Acima do aplicado' : 'Abaixo do aplicado') : 'Percentual indisponível sem bases completas'}</div>
          </div>
        </div>
      </div>
      <div class="patrimonio-periods" role="tablist" aria-label="Período de análise">
        ${periodOpts.map(period => `<button class="dash-chip ${Number(S.dashPeriod) === period ? 'on' : ''}" role="tab" aria-selected="${Number(S.dashPeriod) === period ? 'true' : 'false'}" onclick="setDashPeriod(${period})">${period}M</button>`).join('')}
      </div>
      <div class="patrimonio-grid">
        <div class="patrimonio-panel patrimonio-panel-chart">
          <div class="patrimonio-panel-head">
            <div><h2 class="patrimonio-panel-title">Aportes líquidos acumulados</h2><div class="patrimonio-panel-sub">Acumulado apenas nos meses com movimentos registrados; não representa valuation histórico e a cobertura dos registros é desconhecida.</div></div>
            <div class="patrimonio-panel-badge">Patrimônio atual ${currentKnown ? fmt(tC) : 'indisponível'}</div>
          </div>
          <div class="patrimony-month-list">${monthRows}</div>
        </div>
        <div class="patrimonio-panel patrimonio-panel-top">
          <div class="patrimonio-panel-head"><div><h2 class="patrimonio-panel-title">Top Ativos</h2><div class="patrimonio-panel-sub">Maiores posições por valor atual; barras e percentuais comparam as posições exibidas.</div></div><div class="patrimonio-panel-badge">${topAssets.length} ativos</div></div>
          <div class="patrimonio-top-asset-list">${topAssetsHtml}</div>
        </div>
      </div>
      <div class="patrimonio-grid patrimonio-grid-composition">
        <div class="patrimonio-panel patrimonio-panel-composition">
          <div class="patrimonio-panel-head"><div><h2 class="patrimonio-panel-title">Composição do Patrimônio</h2><div class="patrimonio-panel-sub">Quanto vem de capital aportado e quanto de ganho/perda de mercado.</div></div><div class="patrimonio-panel-badge ${resultTone}">${esc(resultLabel)}</div></div>
          ${resultKnown ? `<div class="patrimony-composition">
            <div class="patrimony-composition-track">
              <div class="patrimony-composition-applied" style="width:${appliedBarShare.toFixed(1)}%"></div>
              ${tG >= 0 ? `<div class="patrimony-composition-result" style="width:${positiveResultShare.toFixed(1)}%"></div>` : ''}
            </div>
            <div class="patrimony-composition-legend">
              <span class="patrimony-composition-chip"><span class="patrimony-composition-dot" style="background:var(--primary)"></span>Capital aportado</span>
              <span class="patrimony-composition-chip"><span class="patrimony-composition-dot" style="background:${tG >= 0 ? 'var(--success)' : 'var(--danger)'}"></span>${tG >= 0 ? 'Ganho de capital' : 'Perda de capital'}</span>
            </div>
          </div>
          <div class="patrimony-composition-stats">
            <div class="patrimony-composition-stat"><div class="patrimony-composition-label">Aportes no patrimônio</div><div class="patrimony-composition-value pu">${appliedShare.toFixed(1)}%</div></div>
            <div class="patrimony-composition-stat"><div class="patrimony-composition-label">${tG >= 0 ? 'Ganho no patrimônio' : 'Perda sobre patrimônio'}</div><div class="patrimony-composition-value ${resultTone}">${fmtP(resultShare)}</div></div>
            <div class="patrimony-composition-stat"><div class="patrimony-composition-label">Resultado acumulado</div><div class="patrimony-composition-value ${resultTone}">${fmt(tG)}</div></div>
          </div>
          <div class="patrimony-composition-text">${tG > 0 ? `O patrimônio atual combina capital aportado com ${fmt(tG)} de valorização. Aproximadamente ${positiveResultShare.toFixed(1)}% do valor atual representa ganho de capital.` : tG < 0 ? `O patrimônio é formado pelos aportes, mas uma perda de ${fmt(Math.abs(tG))} reduziu o valor atual. O crescimento depende principalmente de novos aportes enquanto essa diferença permanecer.` : 'O patrimônio atual está praticamente igual ao capital aplicado; neste momento, o crescimento vem principalmente dos aportes.'}</div>` : `<div class="premium-empty">Composição indisponível: valores correntes ou base aplicada incompletos.</div>`}
        </div>
        <div class="patrimonio-panel patrimonio-panel-insights">
          <div class="patrimonio-panel-head"><div><h2 class="patrimonio-panel-title">Registros do período</h2><div class="patrimonio-panel-sub">Aportes registrados; valuation histórico não disponível.</div></div><div class="patrimonio-panel-badge">${data.count} meses</div></div>
          <div class="patrimonio-insights">
            <div class="patrimonio-insight"><div class="patrimonio-insight-label">Histórico patrimonial</div><div class="patrimonio-insight-value">Indisponível</div><div class="patrimonio-insight-note">Snapshots de valuation não disponíveis</div></div>
            <div class="patrimonio-insight"><div class="patrimonio-insight-label">Maior mês de aporte</div><div class="patrimonio-insight-value">${data.biggestContribution ? esc(data.biggestContribution.label) : '—'}</div><div class="patrimonio-insight-note">${data.biggestContribution ? fmt(data.biggestContribution.aporte) : 'Sem aporte positivo no período'}</div></div>
            <div class="patrimonio-insight"><div class="patrimonio-insight-label">Meses na janela</div><div class="patrimonio-insight-value">${data.months.length}</div><div class="patrimonio-insight-note">Período selecionado</div></div>
          </div>
          <div class="premium-note">Esta série resume movimentações disponíveis; ela não substitui snapshots históricos de valor de mercado.</div>
        </div>
      </div>
    </div>`;
  };
});