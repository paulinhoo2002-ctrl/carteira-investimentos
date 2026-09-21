/* V256: read-only asset detail intelligence. It composes certified domain models. */
(function init(root, factory) {
  const api = factory(
    typeof require === 'function' ? require('./dividend-intelligence') : root?.DividendIntelligence
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AssetDetailIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine(dividendApi) {
  const text = value => String(value ?? '').trim();
  const tickerOf = value => text(value?.ticker ?? value?.symbol).toUpperCase();
  const finite = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const statusOf = (value, fallback = 'UNAVAILABLE') => text(value) || fallback;

  function matchesAsset(row, asset) {
    const assetTicker = tickerOf(asset);
    const rowTicker = tickerOf(row);
    const assetId = text(asset?.id);
    const rowId = text(row?.assetId ?? row?.asset_id ?? row?.assetID);
    return Boolean((assetId && rowId && assetId === rowId) || (!rowId && assetTicker && rowTicker === assetTicker));
  }

  function buildAssetDetailIntelligence({
    asset = null,
    transactions = [],
    incomeEvents = [],
    historicalAudit = null,
    taxModel = null,
    position = {},
  } = {}) {
    const ticker = tickerOf(asset);
    const income = dividendApi?.buildDividendIntelligence
      ? dividendApi.buildDividendIntelligence({ rows: incomeEvents, now: new Date() })
      : { events: [], paidEvents: [], semantics: {} };
    const assetIncome = (income.paidEvents || []).filter(row => row.ticker === ticker);
    const announcedIncome = (income.events || []).filter(row => row.ticker === ticker && row.state === 'ANNOUNCED');
    const taxPosition = (taxModel?.positions || []).find(row => row.ticker === ticker) || null;
    const realized = (taxModel?.realizedGains?.rows || []).filter(row => row.asset === ticker);
    const yearEnd = (taxModel?.yearEnd || []).filter(row => row.asset === ticker);
    const history = (historicalAudit?.transactions || []).filter(row => row.ticker === ticker);
    const historyHasReview = history.some(row => Array.isArray(row.reasons) && row.reasons.length > 0);
    const reviewReasons = [
      ...(taxPosition?.needsReviewReasons || []),
      ...realized.flatMap(row => row.needsReviewReason ? [row.needsReviewReason] : []),
      ...history.flatMap(row => row.reasons || []),
    ].filter(Boolean);
    const confidence = taxPosition?.status === 'COMPLETE' && !reviewReasons.length ? 'HIGH' :
      (taxPosition || history.length || realized.length ? 'NEEDS_REVIEW' : 'UNAVAILABLE');
    return {
      version: 'V256_ASSET_DETAIL_INTELLIGENCE_V1',
      writeEnabled: false,
      identity: { id: text(asset?.id) || null, ticker: ticker || null },
      position: {
        quantity: finite(position.quantity ?? asset?.qty),
        averageCost: finite(position.averageCost ?? asset?.avg_price),
        currentValue: finite(position.currentValue),
        result: finite(position.result),
        authority: 'CURRENT_POSITION',
      },
      income: {
        paidTotal: assetIncome.reduce((sum, row) => sum + Number(row.value || 0), 0),
        paidEventCount: assetIncome.length,
        announcedEventCount: announcedIncome.length,
        coverage: assetIncome.length ? 'FULL_COVERAGE' : 'UNKNOWN',
        paidEvents: assetIncome,
        announcedEvents: announcedIncome,
      },
      tax: {
        costBasis: taxPosition?.runningCostBasis ?? null,
        averageCost: taxPosition?.averageCost ?? null,
        status: statusOf(taxPosition?.status, 'UNAVAILABLE'),
        realizedResult: realized.length ? realized.reduce((sum, row) => sum + Number(row.realizedGainLoss || 0), 0) : null,
        realizedStatus: realized.length ? (realized.some(row => row.status === 'NEEDS_REVIEW') ? 'NEEDS_REVIEW' : 'AVAILABLE') : 'UNAVAILABLE',
        yearEnd,
      },
      historical: {
        status: history.length ? (historyHasReview ? 'NEEDS_REVIEW' : 'FULL') : 'UNAVAILABLE',
        eventCount: history.length,
        coverage: history.length ? (historyHasReview ? 'PARTIAL' : 'FULL') : 'UNAVAILABLE',
      },
      review: { status: confidence, reasons: [...new Set(reviewReasons)] },
      semantics: {
        unknownIsNotZero: true,
        needsReviewIsNotFinal: true,
        announcedIsNotPaid: true,
        currentPositionIsNotOverwritten: true,
      },
    };
  }

  return { matchesAsset, buildAssetDetailIntelligence };
});
