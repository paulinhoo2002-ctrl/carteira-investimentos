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
    options = {},
  } = {}) {
    const ticker = tickerOf(asset);
    const now = options.now || new Date();

    // Market Data integration
    const marketData = options.marketData ? options.marketData.getQuote(ticker) : null;
    const currentPrice = marketData && marketData.price !== null ? marketData.price : null;
    const marketDataStatus = marketData ? marketData.status : 'UNAVAILABLE';
    const marketDataSource = marketData ? marketData.source : null;
    const marketDataFetchedAt = marketData ? marketData.fetchedAt : null;
    const marketDataMarketTime = marketData ? marketData.marketTime : null;
    const marketDataFreshness = marketData ? marketData.freshness : null;

    // Data Trust integration (reuse market data's provenance/freshness as trusted source)
    const dataTrust = options.dataTrust ? options.dataTrust.getTrustInfo(ticker) : null;
    const dataTrustStatus = dataTrust ? dataTrust.status : null;
    const dataTrustSource = dataTrust ? dataTrust.source : marketDataSource;
    const dataTrustUpdatedAt = dataTrust ? dataTrust.updatedAt : marketDataFetchedAt;

    // Performance Intelligence integration
    const performance = options.performance ? options.performance.getAssetPerformance(ticker, now) : null;
    const performanceResult = performance ? performance.result : null;
    const performancePeriod = performance ? performance.period : null;
    const performanceCoverage = performance ? performance.coverage : null;
    const performanceHistoricalAvailability = performance ? performance.historicalAvailability : null;

    // Income integration (already partially done)
    const assetPaidEvents = incomeEvents.filter(event => tickerOf(event) === ticker && event.state === 'PAID');
    const assetAnnouncedEvents = incomeEvents.filter(event => tickerOf(event) === ticker && event.state === 'ANNOUNCED');
    const assetPaidDividendIntelligence = dividendApi?.buildDividendIntelligence
      ? dividendApi.buildDividendIntelligence({ rows: assetPaidEvents, now })
      : { events: [], paidEvents: [], semantics: {} };

    // Tax & Cost Basis integration
    const taxPosition = (taxModel?.positions || []).find(row => row.ticker === ticker) || null;
    const realized = (taxModel?.realizedGains?.rows || []).filter(row => (row.asset ?? row.ticker) === ticker);
    const yearEnd = (taxModel?.yearEnd || []).filter(row => (row.asset ?? row.ticker) === ticker);

    // Historical Reconstruction integration
    const history = (historicalAudit?.transactions || []).filter(row => row.ticker === ticker);
    const historyHasReview = history.some(row => Array.isArray(row.reasons) && row.reasons.length > 0);
    const historicalReconstruction = options.historicalReconstruction ? options.historicalReconstruction.getReconstruction(ticker) : null;
    const historyStatus = historicalReconstruction ? historicalReconstruction.status : (history.length ? (historyHasReview ? 'NEEDS_REVIEW' : 'FULL') : 'UNAVAILABLE');
    const historyCoverage = historicalReconstruction ? historicalReconstruction.coverage : (history.length ? (historyHasReview ? 'PARTIAL' : 'FULL') : 'UNAVAILABLE');
    const historyTransactionLinkage = historicalReconstruction ? historicalReconstruction.transactionLinkage : null;
    const historyPositionEvolution = historicalReconstruction ? historicalReconstruction.positionEvolution : null;
    const historyReconciliationState = historicalReconstruction ? historicalReconstruction.reconciliationState : null;
    const historyNeedsReview = historicalReconstruction ? historicalReconstruction.needsReview : historyHasReview;

    // Data Quality integration
    const dataQuality = options.dataQuality ? options.dataQuality.getIssuesForAsset(ticker) : null;
    const dataQualityIssues = dataQuality ? dataQuality.issues : [];
    const dataQualityNeedsReview = dataQuality ? dataQuality.needsReview : false;
    const dataQualityStatus = dataQuality ? dataQuality.status : null;

    // Monitoring integration
    const monitoring = options.monitoring ? options.monitoring.getAlertsForAsset(ticker) : null;
    const monitoringAlerts = monitoring ? monitoring.alerts : [];
    const monitoringStatus = monitoring ? monitoring.status : null;

    // Corporate Events integration
    const corporateEvents = options.corporateEvents ? options.corporateEvents.getEventsForAsset(ticker) : null;
    const corporateEventList = corporateEvents ? corporateEvents.events : [];
    const corporateEventStatus = corporateEvents ? corporateEvents.status : null;

    // Transactions (already passed in, just expose with source/coverage if available)
    const transactionList = transactions.filter(tx => tickerOf(tx) === ticker);
    const transactionSource = options.transactionSource ? options.transactionSource.getSourceForTicker(ticker) : null;
    const transactionCoverage = options.transactionSource ? options.transactionSource.getCoverageForTicker(ticker) : null;

    // Documents/Provenance (if available)
    const documents = options.documents ? options.documents.getDocumentsForAsset(ticker) : null;
    const documentList = documents ? documents.items : [];
    const documentStatus = documents ? documents.status : null;

    const reviewReasons = [
      ...(taxPosition?.needsReviewReasons || []),
      ...realized.flatMap(row => row.needsReviewReason ? [row.needsReviewReason] : []),
      ...history.flatMap(row => row.reasons || []),
      ...(dataQualityIssues || []).filter(issue => issue.needsReview).map(issue => issue.rootCause || issue.domain),
      ...(monitoringAlerts || []).filter(alert => alert.severity === 'HIGH').map(alert => alert.description),
    ].filter(Boolean);

    const confidence = taxPosition?.status === 'COMPLETE' && !reviewReasons.length ? 'HIGH' :
      (taxPosition || history.length || realized.length || dataQualityIssues?.length || monitoringAlerts?.length ? 'NEEDS_REVIEW' : 'UNAVAILABLE');

    return {
      version: 'V260_ASSET_DETAIL_INTELLIGENCE_V1',
      writeEnabled: false,
      identity: { id: text(asset?.id) || null, ticker: ticker || null },
      position: {
        quantity: finite(position.quantity ?? asset?.qty),
        averageCost: finite(position.averageCost ?? asset?.avg_price),
        currentValue: finite(position.currentValue),
        result: finite(position.result),
        authority: 'CURRENT_POSITION',
      },
      marketData: {
        price: currentPrice,
        currency: marketData ? marketData.currency : null,
        source: marketDataSource,
        fetchedAt: marketDataFetchedAt,
        marketTime: marketDataMarketTime,
        status: marketDataStatus,
        freshness: marketDataFreshness,
      },
      dataTrust: {
        status: dataTrustStatus,
        source: dataTrustSource,
        updatedAt: dataTrustUpdatedAt,
      },
      performance: {
        result: performanceResult,
        period: performancePeriod,
        coverage: performanceCoverage,
        historicalAvailability: performanceHistoricalAvailability,
      },
      income: {
        paidTotal: assetPaidDividendIntelligence.paidEvents.reduce((sum, row) => sum + Number(row.value || 0), 0),
        paidEventCount: assetPaidDividendIntelligence.paidEvents.length,
        ytdPaidIncome: assetPaidDividendIntelligence.ytdPaidIncome,
        ttmPaidIncome: assetPaidDividendIntelligence.ttmPaidIncome,
        announcedEventCount: assetAnnouncedEvents.length,
        announcedEvents: assetAnnouncedEvents,
        paidEvents: assetPaidDividendIntelligence.paidEvents,
        semantics: assetPaidDividendIntelligence.semantics,
      },
      transactions: {
        list: transactionList,
        source: transactionSource,
        coverage: transactionCoverage,
      },
      tax: {
              averageCost: taxPosition?.averageCost ?? null,
              status: statusOf(taxPosition?.status, 'UNAVAILABLE'),
              realizedResult: realized.length ? realized.reduce((sum, row) => sum + Number(row.realizedGainLoss || 0), 0) : null,
              realizedStatus: realized.length ? (realized.some(row => row.status === 'NEEDS_REVIEW') ? 'NEEDS_REVIEW' : 'AVAILABLE') : 'UNAVAILABLE',
              yearEnd,
              costBasis: {
                value: taxPosition?.runningCostBasis ?? null,
              },
            },
      historical: {
        status: historyStatus,
        coverage: historyCoverage,
        eventCount: history.length,
        transactionLinkage: historyTransactionLinkage,
        positionEvolution: historyPositionEvolution,
        reconciliationState: historyReconciliationState,
        hasReview: historyHasReview,
        needsReview: historyNeedsReview,
        transactions: history,
      },
      events: {
        list: corporateEventList,
        status: corporateEventStatus,
      },
      dataQuality: {
        issues: dataQualityIssues,
        needsReview: dataQualityNeedsReview,
        status: dataQualityStatus,
      },
      monitoring: {
        alerts: monitoringAlerts,
        status: monitoringStatus,
      },
      documents: {
        list: documentList,
        status: documentStatus,
      },
      provenance: {
        marketDataSource: marketDataSource,
        marketDataFetchedAt: marketDataFetchedAt,
        dataTrustSource: dataTrustSource,
        dataTrustUpdatedAt: dataTrustUpdatedAt,
      },
      coverage: {
        marketData: marketDataStatus,
        dataTrust: dataTrustStatus,
        performance: performanceCoverage,
        income: assetPaidDividendIntelligence.paidEvents.length ? 'FULL_COVERAGE' : 'UNKNOWN',
        tax: taxPosition?.status === 'COMPLETE' ? 'FULL_COVERAGE' : 'PARTIAL',
        historical: historyCoverage,
        dataQuality: dataQualityStatus,
        monitoring: monitoringStatus,
        events: corporateEventStatus,
        transactions: transactionCoverage,
        documents: documentStatus,
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