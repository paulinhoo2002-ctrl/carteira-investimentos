function ativos(){
  const innerTab = ['analise','desempenho','renda-fixa'].includes(String(S.assetsInnerTab||'patrimonio')) ? String(S.assetsInnerTab) : 'patrimonio';
  const ativosCategoryIcon = type => ({
    'Ação': '📈',
    'FII': '🏢',
    'ETF': '📊',
    'Renda Fixa': '💰'
  }[String(type)] || '💼');

  if (assetReviewFilterIsActive()) {
    const reviewData = assetReviewQualityData();
    S.assetReviewFilter.assetIds = reviewData.ids;
    S.assetReviewFilter.reasons = reviewData.reasons;
  }
  const reviewFilterActive = assetReviewFilterIsActive();
  const reviewFilterCount = reviewFilterActive ? (S.assetReviewFilter.assetIds || []).length : 0;

  const consolidated = assetsPortfolioSummary(S.assets,{
    isAppliedConfirmed:assetAppliedBasisConfirmed,
    isCurrentConfirmed:assetCurrentValueConfirmed
  });
  const consolidatedAssetRows = new Map(consolidated.assets.map(row => [row.asset, row]));
  const consolidatedClasses = new Map(consolidated.byClass.map(row => [row.className, row]));
  const assetMetricsCache = new Map();
  const getAssetMetrics = a => {
    if (assetMetricsCache.has(a)) return assetMetricsCache.get(a);
    const isRF = normalizeType(a.type || metaTicker(a.ticker).type || 'Ação', 'Ação') === 'Renda Fixa';
    const currentValue = assetCurrentValue(a);
    const currentKeys = isRF
      ? ['rf_liquid_value', 'fixed_current_value', 'rf_gross_value', 'current_value', 'current_price']
      : ['current_price', 'current_value'];
    const financial = consolidatedAssetRows.get(a);
    const displayCurrentValue = financial?.currentConfirmed ? currentValue : null;
    const appliedValue = assetAppliedValue(a);
    const rentabPct = assetRentabPct(a);
    const jurosValue = assetJurosValue(a);
    const currentUnit = Number(a.current_price) || 0;
    const avgPrice = Number(a.avg_price) || 0;
    const marketValue = isRF ? currentValue : (Number(a.qty) || 0) * currentUnit;
    const currentDisplay = isRF ? marketValue : currentUnit;
    const metrics = { currentValue, displayCurrentValue, appliedValue, rentabPct, jurosValue, isRF, currentUnit, avgPrice, marketValue, currentDisplay, financial };
    assetMetricsCache.set(a, metrics);
    return metrics;
  };

  const total = S.assets.reduce((s, a) => s + getAssetMetrics(a).currentValue, 0);

  const grouped = new Map();
  S.assets.forEach(a => {
    const type = normalizeType(a.type || metaTicker(a.ticker).type || 'Ação', 'Ação');
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push(a);
  });

  const order = TYPE_ORDER;
  const groupNames = [...order.filter(t => grouped.has(t)), ...[...grouped.keys()].filter(t => !order.includes(t)).sort((a, b) => a.localeCompare(b))];

  const analysisRows = innerTab === 'analise' ? assetAnalysisRows() : null;
  const analysis = innerTab === 'analise' ? assetAnalysisBlock(analysisRows) : '';
  const assetKpiApplied = consolidated.invested;
  const assetKpiCurrent = consolidated.current;
  const assetKpiProfit = consolidated.result;
  const assetKpiReturn = consolidated.returnPct;
  const unavailableAssetCount = S.assets.filter(a => getAssetMetrics(a).displayCurrentValue == null).length;

  // Filter assets for display (search + class + performance filters)
  const displayAssets = filterAssetsForDisplay(S.assets);
  const canonicalAnalysisByTicker = new Map(assetAnalysisRows().map(row => [row.ticker, row]));
  const assetFiltersActive = !!S.assetsSearch || !!S.assetsFilterClasses?.length
    || (S.assetsSectorFilter && S.assetsSectorFilter !== 'all')
    || (S.assetsClassFilter && S.assetsClassFilter !== 'all')
    || (S.assetsPerformanceFilter && S.assetsPerformanceFilter !== 'all')
    || reviewFilterActive;
  const activeAssetFilterCount = assetsFilterCount();
  const classFilterSet = new Set(S.assetsFilterClasses || []);
  const sectorOptions = [...new Set(S.assets.map(a => String(a?.sector || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const assetClassOptions = [...new Set(S.assets.map(a => String(a?.assetClass || a?.class || a?.category || a?.type || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const assetControls = `<div class="assets-premium-controls">
    <div class="assets-premium-search"><input type="search" class="assets-premium-search-input" placeholder="Buscar ativo..." aria-label="Buscar ativo por ticker ou nome" id="assets-premium-search" autocomplete="off" value="${esc(S.assetsSearch || '')}" oninput="onAssetsSearchInput(this.value)"></div>
    <div class="assets-premium-filters"><button type="button" class="assets-premium-filter-btn" onclick="toggleAssetsFilterPanel()" aria-controls="assets-filter-panel" aria-expanded="${S.assetsFilterPanelOpen ? 'true' : 'false'}">Filtros <span class="filter-count" id="assets-filter-count">${activeAssetFilterCount}</span></button></div>
    <label class="assets-premium-sort"><span>Ordenar</span><select aria-label="Ordenar posições de ativos" onchange="setAssetsSortMode(this.value)">
      <option value="ticker-asc" ${S.assetsSortMode === 'ticker-asc' || !S.assetsSortMode ? 'selected' : ''}>Ticker · A–Z</option>
      <option value="result-desc" ${S.assetsSortMode === 'result-desc' ? 'selected' : ''}>Resultado · maior</option>
      <option value="result-asc" ${S.assetsSortMode === 'result-asc' ? 'selected' : ''}>Resultado · menor</option>
      <option value="rentability-desc" ${S.assetsSortMode === 'rentability-desc' ? 'selected' : ''}>Rentabilidade · maior</option>
      <option value="rentability-asc" ${S.assetsSortMode === 'rentability-asc' ? 'selected' : ''}>Rentabilidade · menor</option>
    </select></label>
    <div class="assets-premium-filter-panel" id="assets-filter-panel" style="display:${S.assetsFilterPanelOpen ? 'block' : 'none'}">
      <div class="assets-filter-heading">Tipo de ativo</div>
      <label><input type="checkbox" ${classFilterSet.size === 0 ? 'checked' : ''} onchange="applyAssetsFilter()"> Todos os tipos</label>
      <label><input type="checkbox" value="Ação" ${classFilterSet.has('Ação') ? 'checked' : ''} onchange="applyAssetsFilter()"> Ações</label>
      <label><input type="checkbox" value="FII" ${classFilterSet.has('FII') ? 'checked' : ''} onchange="applyAssetsFilter()"> FIIs</label>
      <label><input type="checkbox" value="ETF" ${classFilterSet.has('ETF') ? 'checked' : ''} onchange="applyAssetsFilter()"> ETFs</label>
      <label><input type="checkbox" value="Renda Fixa" ${classFilterSet.has('Renda Fixa') ? 'checked' : ''} onchange="applyAssetsFilter()"> Renda Fixa</label>
      <label><input type="checkbox" value="BDR" ${classFilterSet.has('BDR') ? 'checked' : ''} onchange="applyAssetsFilter()"> BDRs</label>
      <label><input type="checkbox" value="Crypto" ${classFilterSet.has('Crypto') ? 'checked' : ''} onchange="applyAssetsFilter()"> Crypto</label>
      <label class="assets-performance-filter"><span>Setor</span><select aria-label="Filtrar por setor" onchange="setAssetsSectorFilter(this.value)"><option value="all" ${S.assetsSectorFilter === 'all' ? 'selected' : ''}>Todos</option>${sectorOptions.map(sector => `<option value="${esc(sector)}" ${S.assetsSectorFilter === sector ? 'selected' : ''}>${esc(sector)}</option>`).join('')}</select></label>
      <label class="assets-performance-filter"><span>Classe</span><select aria-label="Filtrar por classe" onchange="setAssetsClassFilter(this.value)"><option value="all" ${S.assetsClassFilter === 'all' ? 'selected' : ''}>Todas</option>${assetClassOptions.map(value => `<option value="${esc(value)}" ${S.assetsClassFilter === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
      <label class="assets-performance-filter"><span>Performance</span><select aria-label="Filtrar por performance" onchange="setAssetsPerformanceFilter(this.value)"><option value="all" ${S.assetsPerformanceFilter === 'all' ? 'selected' : ''}>Todos</option><option value="positive" ${S.assetsPerformanceFilter === 'positive' ? 'selected' : ''}>Positivos</option><option value="negative" ${S.assetsPerformanceFilter === 'negative' ? 'selected' : ''}>Negativos</option><option value="neutral" ${S.assetsPerformanceFilter === 'neutral' ? 'selected' : ''}>Neutros</option></select></label>
      ${activeAssetFilterCount ? '<button type="button" class="btn bgh assets-clear-filter" onclick="clearAssetsFilters()">Limpar filtros</button>' : ''}
    </div>
    <div class="assets-filter-summary" role="status" aria-live="polite"><strong>${displayAssets.length}</strong><span>${assetFiltersActive ? `ativos exibidos de ${S.assets.length}` : 'ativos na carteira'}</span>${assetFiltersActive ? '<span class="assets-filter-summary-dot" aria-hidden="true">·</span><span class="assets-filter-summary-active">filtros em uso</span>' : ''}</div>
  </div>`;
  const assetsFilterEmpty = assetFiltersActive && displayAssets.length === 0;
  const assetsFilterEmptyMessage = '<div class="assets-premium-empty" role="status">Nenhum ativo corresponde aos filtros.</div>';

  const portfolioHasCompleteCurrentValues = consolidated.coverage.current===S.assets.length;
  const portfolioTotal = portfolioHasCompleteCurrentValues ? (reviewFilterActive ? total : assetKpiCurrent) : null;

  // Build accordion categories using details/summary for test compatibility
  const accordionHtml = groupNames.map(type => {
    const assets = grouped.get(type) || [];
    const filteredAssets = assets.filter(a => displayAssets.includes(a));
    if (filteredAssets.length === 0 && !assetFiltersActive) return '';

    const icon = ativosCategoryIcon(type);
    const typeAssets = assets;
    const typeDisplayAssets = sortAssetsByGroup(type, filteredAssets, portfolioTotal || 0);

    // Category metrics
    const classSummary=consolidatedClasses.get(type);
    const classCoverage=classSummary?.coverage||{assets:typeAssets.length,applied:0,current:0,result:0};
    const typeInvested=classSummary?.invested||0;
    const typeTotalValue=classCoverage.current ? classSummary.current : null;
    const typeResult=classCoverage.result ? classSummary.result : null;
    const typeReturn=classCoverage.result===typeAssets.length && typeInvested>0 ? (typeResult/typeInvested)*100 : null;
    const coverageLabel=(known,total)=>known===total?'completo':known?`parcial ${known}/${total}`:'indisponível';
    const typeInvestedDisplay=classCoverage.applied?fmt(typeInvested):'—';
    const typeCurrentDisplay=classCoverage.current?fmt(typeTotalValue):'—';
    const typeResultDisplay=typeResult==null?'—':`${typeResult>0?'+':''}${fmt(typeResult)}`;
    const typeWeight = typeResult != null && portfolioTotal > 0 ? (typeTotalValue / portfolioTotal) * 100 : null;
    const typeCount = typeDisplayAssets.length;

    const resultTone = typeResult == null ? '' : typeResult >= 0 ? 'positive-text' : 'negative-text';
    const resultPrefix = typeResult != null && typeResult >= 0 ? '+' : '';

    // Build table rows
    const rowsHtml = typeDisplayAssets.map(a => {
      const m = getAssetMetrics(a);
      const currentValue = m.currentValue;
      const displayCurrentValue = m.displayCurrentValue;
      const appliedValue = m.appliedValue;
      const rentabPct = m.rentabPct;
      const jurosValue = m.jurosValue;
      const isRF = m.isRF;
      const currentUnit = m.currentUnit;
      const avgPrice = m.avgPrice;
      const marketValue = m.marketValue;
      const currentDisplay = m.currentDisplay;
      const financial = m.financial;

      const share = Number.isFinite(displayCurrentValue) && portfolioTotal > 0 ? (displayCurrentValue / portfolioTotal) * 100 : null;
      const hasAppliedBasis = financial?.appliedConfirmed===true;
      const hasPerformanceData = displayCurrentValue != null && hasAppliedBasis;
      const result = hasPerformanceData && Number.isFinite(financial?.result) ? financial.result : null;
      const resultClass = result == null ? '' : result >= 0 ? 'positive-text' : 'negative-text';
      const resultPrefix2 = result != null && result > 0 ? '+' : '';
      const returnPct = hasPerformanceData && Number.isFinite(financial?.returnPct) ? financial.returnPct : null;

      // Get analysis row for this ticker
      const analysisRow = canonicalAnalysisByTicker.get(a.ticker);
      const yahooBadge = analysisRow?.yahoo ? '<span class="yahoo-tag">YAHOO</span>' : '';
      const yahooTime = analysisRow?.lastUpdate ? `<span class="yahoo-time">${esc(analysisRow.lastUpdate)}</span>` : '';

      const qty = Number(a.qty) || 0;
      const qtyDisplay = isRF ? fmt(qty) : (qty % 1 === 0 ? String(qty) : qty.toFixed(4));

      const averagePriceDisplay = avgPrice > 0 ? fmt(avgPrice) : '—';
      const currentPriceDisplay = isRF
        ? (displayCurrentValue == null ? '—' : fmt(displayCurrentValue))
        : (currentUnit > 0 ? fmt(currentUnit) : '—');
      const investedDisplay = hasAppliedBasis ? fmt(financial.invested) : '—';
      const appliedBasisLabel = hasAppliedBasis ? 'Confirmada' : 'Não confirmada';
      const positionValueDisplay = displayCurrentValue == null ? '—' : fmt(displayCurrentValue);
      const resultMoneyDisplay = result == null ? '—' : `${resultPrefix2}${fmt(result)}`;
      const returnDisplay = returnPct == null ? '—' : fmtP(returnPct);
      const shareDisplay = share == null ? '—' : `${share.toFixed(2)}%`;

      const typeBadge = `<span class="asset-type type-${String(type).toLowerCase().replace('ç','c').replace('ã','a')}">${esc(type)}</span>`;
      const sector = String(a.sector || metaTicker(a.ticker).sector || '').trim() || '—';
      const sourceInfo = [analysisRow?.source || a.source, analysisRow?.refTime || analysisRow?.lastUpdate || a.quoteUpdatedAt]
        .filter(value => value != null && String(value).trim())
        .map(value => String(value).trim()).join(' · ') || 'Não informada';
      const hasDy = hasOwnFiniteNumber(a, ['dy']);
      const dyDisplay = hasDy ? fmtP(Number(a.dy)) : '—';

      return `<tr data-id="${esc(a.id)}" class="asset-premium-card">
        <td>
          <div class="asset-info">
            <div class="asset-logo" style="background:${esc(a.color || (type === 'Ação' ? '#3b82f6' : type === 'FII' ? '#8b5cf6' : type === 'ETF' ? '#f5c542' : type === 'Renda Fixa' ? '#10b981' : '#f59e0b'))}">${esc(a.ticker?.charAt(0) || '?')}</div>
            <div>
              <div class="asset-name">${esc(a.ticker)}</div>
              <div class="asset-ticker">${esc(a.name)} ${yahooBadge}</div>
              ${yahooTime}
            </div>
          </div>
        </td>
        <td>${esc(sector)}</td>
        <td>${typeBadge}</td>
        <td class="num">${qtyDisplay}</td>
        <td class="num">${averagePriceDisplay}</td>
        <td class="num">${currentPriceDisplay}</td>
        <td class="num" title="Base de custo ${appliedBasisLabel.toLowerCase()}">${investedDisplay}</td>
        <td class="num ${resultClass}">${resultMoneyDisplay}</td>
        <td class="num ${returnPct == null ? '' : returnPct >= 0 ? 'positive-text' : 'negative-text'}">${returnDisplay}</td>
        <td class="num">${positionValueDisplay}</td>
        <td class="num">${shareDisplay}</td>
        <td>${esc(sourceInfo)}</td>
        <td class="num">${dyDisplay}</td>
        <td class="num" title="Sem estimativa mensal validada">—</td>
        <td>
          ${assetActionMenuHtml(a, isRF, 'v328')}
        </td>
      </tr>`;
    }).join('');

    // Build mobile cards for test compatibility (V84)
    const mobileCardsHtml = typeDisplayAssets.map(a => {
      const m = getAssetMetrics(a);
      const currentValue = m.currentValue;
      const displayCurrentValue = m.displayCurrentValue;
      const appliedValue = m.appliedValue;
      const rentabPct = m.rentabPct;
      const jurosValue = m.jurosValue;
      const isRF = m.isRF;
      const currentUnit = m.currentUnit;
      const avgPrice = m.avgPrice;
      const marketValue = m.marketValue;
      const currentDisplay = m.currentDisplay;
      const financial = m.financial;

      const share = Number.isFinite(displayCurrentValue) && portfolioTotal > 0 ? (displayCurrentValue / portfolioTotal) * 100 : null;
      const hasAppliedBasis = financial?.appliedConfirmed===true;
      const hasPerformanceData = displayCurrentValue != null && hasAppliedBasis;
      const result = hasPerformanceData && Number.isFinite(financial?.result) ? financial.result : null;
      const resultClass = result == null ? '' : result >= 0 ? 'positive-text' : 'negative-text';
      const resultPrefix2 = result != null && result > 0 ? '+' : '';
      const returnPct = hasPerformanceData && Number.isFinite(financial?.returnPct) ? financial.returnPct : null;

      const analysisRow = canonicalAnalysisByTicker.get(a.ticker);
      const yahooBadge = analysisRow?.yahoo ? '<span class="yahoo-tag">YAHOO</span>' : '';

      const qty = Number(a.qty) || 0;
      const qtyDisplay = isRF ? fmt(qty) : (qty % 1 === 0 ? String(qty) : qty.toFixed(4));

      const averagePriceDisplay = avgPrice > 0 ? fmt(avgPrice) : '—';
      const currentPriceDisplay = isRF
        ? (displayCurrentValue == null ? '—' : fmt(displayCurrentValue))
        : (currentUnit > 0 ? fmt(currentUnit) : '—');
      const investedDisplay = hasAppliedBasis ? fmt(financial.invested) : '—';
      const appliedBasisLabel = hasAppliedBasis ? 'Confirmada' : 'Não confirmada';
      const positionValueDisplay = displayCurrentValue == null ? '—' : fmt(displayCurrentValue);
      const resultMoneyDisplay = result == null ? '—' : `${resultPrefix2}${fmt(result)}`;
      const returnDisplay = returnPct == null ? '—' : fmtP(returnPct);
      const shareDisplay = share == null ? '—' : `${share.toFixed(2)}%`;

      const typeBadge = `<span class="asset-type type-${String(type).toLowerCase().replace('ç','c').replace('ã','a')}">${esc(type)}</span>`;
      const sector = String(a.sector || metaTicker(a.ticker).sector || '').trim() || '—';
      const sourceInfo = [analysisRow?.source || a.source, analysisRow?.refTime || analysisRow?.lastUpdate || a.quoteUpdatedAt]
        .filter(value => value != null && String(value).trim())
        .map(value => String(value).trim()).join(' · ') || 'Não informada';
      const dyDisplay = hasOwnFiniteNumber(a, ['dy']) ? fmtP(Number(a.dy)) : '—';

      return `<details class="asset-premium-card" data-id="${esc(a.id)}">
        <summary class="asset-premium-card-summary">
          <div class="asset-info">
            <div class="asset-logo" style="background:${esc(a.color || (type === 'Ação' ? '#3b82f6' : type === 'FII' ? '#8b5cf6' : type === 'ETF' ? '#f5c542' : type === 'Renda Fixa' ? '#10b981' : '#f59e0b'))}">${esc(a.ticker?.charAt(0) || '?')}</div>
            <div>
              <div class="asset-name">${esc(a.ticker)} ${yahooBadge}</div>
              <div class="asset-ticker">${esc(a.name)}</div>
            </div>
          </div>
          <div class="asset-premium-card-meta">
            <div><span>Tipo</span><strong>${typeBadge}</strong></div>
            <div><span>Valor da posição</span><strong>${positionValueDisplay}</strong></div>
            <div><span>Resultado R$</span><strong class="${resultClass}">${resultMoneyDisplay}</strong></div>
            <div><span>Rentabilidade · % Carteira</span><strong>${returnDisplay} · ${shareDisplay}</strong></div>
          </div>
        </summary>
        <div class="asset-premium-card-details">
          <div class="asset-premium-card-row"><span>Setor</span><strong>${esc(sector)}</strong></div>
          <div class="asset-premium-card-row"><span>Quantidade</span><strong>${qtyDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Preço médio</span><strong>${averagePriceDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Preço atual / posição</span><strong>${currentPriceDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Investido</span><strong>${investedDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Base de custo</span><strong>${appliedBasisLabel}</strong></div>
          <div class="asset-premium-card-row"><span>Resultado R$</span><strong class="${resultClass}">${resultMoneyDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Rentabilidade</span><strong>${returnDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Valor total</span><strong>${positionValueDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>% Carteira</span><strong>${shareDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>DY</span><strong>${dyDisplay}</strong></div>
          <div class="asset-premium-card-row"><span>Estimativa mensal</span><strong title="Sem estimativa mensal validada">—</strong></div>
          <div class="asset-premium-card-row"><span>Fonte / atualização</span><strong>${esc(sourceInfo)}</strong></div>
          <div class="asset-premium-card-actions">${assetActionMenuHtml(a, isRF, 'v328')}</div>
        </div>
      </details>`;
    }).join('');

    const headerHtml = `
      <div class="acc-info">
        <div class="acc-icon" style="background: ${type === 'Ação' ? 'rgba(59, 130, 246, 0.15)' : type === 'FII' ? 'rgba(139, 92, 246, 0.15)' : type === 'ETF' ? 'rgba(245, 197, 66, 0.15)' : type === 'Renda Fixa' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color: ${type === 'Ação' ? 'var(--info)' : type === 'FII' ? 'var(--ds-info)' : type === 'ETF' ? 'var(--warning)' : type === 'Renda Fixa' ? 'var(--success)' : 'var(--warning)'}">${icon}</div>
        <div>
          <div class="acc-name">${esc(type)}</div>
          <div class="acc-sub">${typeCount} ativo${typeCount !== 1 ? 's' : ''} · base ${coverageLabel(classCoverage.applied,typeAssets.length)} · atual ${coverageLabel(classCoverage.current,typeAssets.length)}${reviewFilterActive ? ' · filtrados' : ''}</div>
        </div>
      </div>
      <div>
        <div class="acc-metric-label ag-k">Investido</div>
        <div class="acc-metric-value" title="Cobertura da base: ${classCoverage.applied}/${typeAssets.length}">${typeInvestedDisplay}${classCoverage.applied<typeAssets.length&&classCoverage.applied?' · parcial':''}</div>
      </div>
      <div>
        <div class="acc-metric-label ag-k">Atual</div>
        <div class="acc-metric-value" title="Cobertura do valor atual: ${classCoverage.current}/${typeAssets.length}">${typeCurrentDisplay}${classCoverage.current<typeAssets.length&&classCoverage.current?' · parcial':''}</div>
      </div>
      <div>
        <div class="acc-metric-label ag-k">Resultado</div>
        <div class="acc-metric-value ${resultTone}" title="Cobertura comparável: ${classCoverage.result}/${typeAssets.length}">${typeResultDisplay}${classCoverage.result<typeAssets.length&&classCoverage.result?' · parcial':''}</div>
      </div>
      <div>
        <div class="acc-metric-label ag-k">Rentab.</div>
        <div class="acc-metric-value ${resultTone}">${typeReturn == null ? '—' : fmtP(typeReturn)}</div>
      </div>
      <div>
        <div class="acc-metric-label ag-k">Peso</div>
        <div class="acc-metric-value">${typeWeight == null ? '—' : `${typeWeight.toFixed(2)}%`}</div>
      </div>
      <span class="acc-toggle" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>
    `;

    const tableHtml = `
      <div class="assets-table-wrap" tabindex="0" role="region" aria-label="Tabela de ativos · ${esc(type)} · use as setas para rolar" onkeydown="if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();this.scrollBy({left:(event.key==='ArrowRight'?1:-1)*80})}" onwheel="if(event.deltaX||event.shiftKey){event.preventDefault();this.scrollBy({left:event.deltaX||event.deltaY})}">
        <div class="mu" style="padding:8px 12px">Role para os lados para ver todos os campos e ações.</div>
        <table class="assets-table ${type === 'Renda Fixa' ? 'rf-table' : 'ag-table'}">
          <thead>
            <tr>
              <th>Ativo</th>
              <th>Setor</th>
              <th>Tipo</th>
              <th class="num">Quantidade</th>
              <th class="num">Preço médio</th>
              <th class="num">Preço atual / posição</th>
              <th>Investido</th>
              <th class="num">Resultado R$</th>
              <th class="num">Rentabilidade</th>
              <th class="num">Valor total</th>
              <th class="num">% carteira</th>
              <th>Fonte / atualização</th>
              <th class="num">DY</th>
              <th class="num">Estimativa mensal</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;

    // Use details/summary for test compatibility (V84 expects .ag with summary)
    // Also include mobile cards for the V84 mobile test
    return `<details class="accordion-category ag" data-asset-group="${esc(type)}" open>
      <summary class="accordion-header" >${headerHtml}</summary>
      <div class="accordion-body ag-body open">
        ${tableHtml}
        <div class="asset-mobile-cards">${mobileCardsHtml}</div>
      </div>
    </details>`;
  }).join('');

  const reviewBanner = reviewFilterActive ? `<div class="review-banner" style="background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);border-radius:10px;padding:10px 12px;margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:12px;font-weight:700;color:#fbbf24">Filtro de revisão ativo</div><div style="font-size:11px;color:var(--text-muted);flex:1">${reviewFilterCount} ativo${reviewFilterCount !== 1 ? 's' : ''} com dados pendentes</div><button class="btn bgh" onclick="clearAssetReviewFilter()" style="font-size:11px;padding:4px 10px">Limpar filtro</button></div>` : '';
  const coverageNote = consolidated.coverage.applied<consolidated.coverage.assets || consolidated.coverage.current<consolidated.coverage.assets
    ? `<p class="assets-coverage-note" role="status">Cobertura parcial: base confirmada em ${consolidated.coverage.applied}/${consolidated.coverage.assets} ativos e valor atual em ${consolidated.coverage.current}/${consolidated.coverage.assets}. Resultados comparáveis em ${consolidated.coverage.result}/${consolidated.coverage.assets}; subtotais incluem somente valores confirmados.</p>`
    : unavailableAssetCount ? `<p class="assets-coverage-note" role="status">Leitura parcial: ${unavailableAssetCount} ativo${unavailableAssetCount !== 1 ? 's' : ''} sem valor atual disponível; totais e pesos podem estar incompletos.</p>` : '';

  const innerTabsHtml = `
    <div class="asset-inner-tabs" role="tablist" aria-label="Sub-abas de Ativos">
      <button type="button" class="asset-inner-tab ${innerTab === 'analise' ? 'on' : ''}" onclick="setAssetsInnerTab('analise')" role="tab" aria-selected="${innerTab === 'analise' ? 'true' : 'false'}">Análise</button>
      <button type="button" class="asset-inner-tab ${innerTab === 'desempenho' ? 'on' : ''}" onclick="setAssetsInnerTab('desempenho')" role="tab" aria-selected="${innerTab === 'desempenho' ? 'true' : 'false'}">Desempenho</button>
      <button type="button" class="asset-inner-tab ${innerTab === 'renda-fixa' ? 'on' : ''}" onclick="setAssetsInnerTab('renda-fixa')" role="tab" aria-selected="${innerTab === 'renda-fixa' ? 'true' : 'false'}">Renda Fixa</button>
    </div>`;

  const panelHtml = innerTab === 'analise' ? analysis : innerTab === 'desempenho' ? assetPerformanceOverviewPanel() : innerTab === 'renda-fixa' ? `<div class="asset-inner-panel">${rendaFixaTab()}</div>` : '';
  const modals = innerTab === 'patrimonio' ? rfMovementFromAssetsModal() : innerTab === 'renda-fixa' ? rfContextualHistoryModal() : '';

  return `<section class="assets-premium-shell" aria-labelledby="ativos-page-title">
    <div class="sh">
      <div>
        <h1 id="ativos-page-title" class="st">Ativos</h1>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" onclick="exportData()"> Exportar</button>
        <button class="btn btn-primary" onclick="openAssetModal()">+ Novo Ativo</button>
      </div>
    </div>
    ${innerTabsHtml}
    ${assetControls}
    ${reviewBanner}
    ${coverageNote}
    ${assetsFilterEmpty ? assetsFilterEmptyMessage : ''}
    <div id="ativosAccordion">${accordionHtml}</div>
    ${panelHtml}
    ${modals}
  </section>`;
}
