(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.buildReportAssetRow = api.buildReportAssetRow;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function buildReportAssetRow(asset, deps) {
    const applied = deps.assetAppliedValue(asset);
    const current = deps.assetCurrentValue(asset);
    const result = current - applied;
    const metaForType = deps.metaTicker(asset.ticker);
    const metaForSector = deps.metaTicker(asset.ticker);

    return {
      ticker: String(asset.ticker || '').trim() || '—',
      name: String(asset.name || asset.product || asset.ticker || '').trim() || '—',
      type: deps.normalizeType(asset.type || metaForType.type || 'Ação', 'Ação'),
      sector: String(asset.sector || metaForSector.sector || '').trim() || '—',
      qty: Number(asset.qty) || 0,
      avgPrice: Number(asset.avg_price) || 0,
      currentPrice: Number(asset.current_price) || 0,
      applied,
      current,
      result,
      resultPct: applied > 0 ? (result / applied) * 100 : 0,
      source: String(asset.source || asset.quoteSource || '').trim() || '—',
      updatedAt: String(asset.updated_at || asset.quoteUpdatedAt || '').trim() || '—'
    };
  }

  return { buildReportAssetRow };
});
