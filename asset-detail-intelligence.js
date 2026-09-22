/* V256/V260: read-only asset detail intelligence. It composes certified domain models. */
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
    if (value === null || value === undefined || value === '') return null;
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

    // Market Data integration (optional provider; unknown stays unknown, never zero)
    const marketData = options.marketData ? options.marketData.getQuote(ticker) : null;
    const currentPrice = marketData ? finite(marketData.price) : null;
    const marketDataStatus = marketData ? statusOf(marketData.status) : 'UNAVAILABLE';
    const marketDataSource = marketData ? (text(marketData.source) || null) : null;
    const marketDataFetchedAt = marketData ? (text(marketData.fetchedAt) || null) : null;
    const marketDataMarketTime = marketData ? (text(marketData.marketTime) || null) : null;
    const marketDataFreshness = marketData ? (text(marketData.freshness) || null) : null;

    // Data Trust integration
    const dataTrust = options.dataTrust ? options.dataTrust.getTrustInfo(ticker) : null;
    const dataTrustStatus = dataTrust ? (text(dataTrust.status) || null) : null;
    const dataTrustSource = dataTrust ? (text(dataTrust.source) || null) : marketDataSource;
    const dataTrustUpdatedAt = dataTrust ? (text(dataTrust.updatedAt) || null) : marketDataFetchedAt;

    // Performance integration
    const performance = options.performance ? options.performance.getAssetPerformance(ticker, now) : null;
    const performanceResult = performance ? finite(performance.result) : null;
    const performancePeriod = performance ? (text(performance.period) || null) : null;
    const performanceCoverage = performance ? (text(performance.coverage) || null) : null;
    const performanceHistoricalAvailability = performance ? (text(performance.historicalAvailability) || null) : null;

    // Income integration reuses the certified V253 dividend engine: raw rows
    // (with or without an explicit state field) are normalized and classified
    // as PAID/ANNOUNCED by the engine itself. No parallel classification here.
    const assetIncomeEvents = incomeEvents.filter(event => tickerOf(event) === ticker);
    const incomeIntelligence = dividendApi?.buildDividendIntelligence
      ? dividendApi.buildDividendIntelligence({ rows: assetIncomeEvents, now })
      : { events: [], paidEvents: [], ytdPaidIncome: null, ttmPaidIncome: null, semantics: {} };
    const assetPaidEvents = incomeIntelligence.paidEvents || [];
    const assetAnnouncedEvents = (incomeIntelligence.events || []).filter(row => row.state === 'ANNOUNCED');

    // Tax & Cost Basis integration (V254 engine output)
    const taxPosition = (taxModel?.positions || []).find(row => row.ticker === ticker) || null;
    const realized = (taxModel?.realizedGains?.rows || []).filter(row => (row.asset ?? row.ticker) === ticker);
    const yearEnd = (taxModel?.yearEnd || []).filter(row => (row.asset ?? row.ticker) === ticker);
    // A sale without a confident basis never contributes a final gain; absence stays null, never zero.
    const realizedValues = realized.map(row => finite(row.realizedGainLoss)).filter(value => value !== null);

    // Historical Reconstruction integration (V255/V259 engines)
    const history = (historicalAudit?.transactions || []).filter(row => row.ticker === ticker);
    const historyHasReview = history.some(row => Array.isArray(row.reasons) && row.reasons.length > 0);
    const historicalReconstruction = options.historicalReconstruction ? options.historicalReconstruction.getReconstruction(ticker) : null;
    const historyStatus = historicalReconstruction ? statusOf(historicalReconstruction.status) : (history.length ? (historyHasReview ? 'NEEDS_REVIEW' : 'FULL') : 'UNAVAILABLE');
    const historyCoverage = historicalReconstruction ? (text(historicalReconstruction.coverage) || 'UNAVAILABLE') : (history.length ? (historyHasReview ? 'PARTIAL' : 'FULL') : 'UNAVAILABLE');
    const historyTransactionLinkage = historicalReconstruction ? (historicalReconstruction.transactionLinkage ?? null) : null;
    const historyPositionEvolution = historicalReconstruction ? (historicalReconstruction.positionEvolution ?? null) : null;
    const historyReconciliationState = historicalReconstruction ? (text(historicalReconstruction.reconciliationState) || null) : null;
    const historyNeedsReview = historicalReconstruction ? Boolean(historicalReconstruction.needsReview) : historyHasReview;

    // Data Quality integration (V257 engine output)
    const dataQuality = options.dataQuality ? options.dataQuality.getIssuesForAsset(ticker) : null;
    const dataQualityIssues = dataQuality ? (dataQuality.issues || []) : [];
    const dataQualityNeedsReview = dataQuality ? Boolean(dataQuality.needsReview) : false;
    const dataQualityStatus = dataQuality ? (text(dataQuality.status) || null) : null;

    // Monitoring integration (V258 engine output)
    const monitoring = options.monitoring ? options.monitoring.getAlertsForAsset(ticker) : null;
    const monitoringAlerts = monitoring ? (monitoring.alerts || []) : [];
    const monitoringStatus = monitoring ? (text(monitoring.status) || null) : null;

    // Corporate Events integration (shadow read-only)
    const corporateEvents = options.corporateEvents ? options.corporateEvents.getEventsForAsset(ticker) : null;
    const corporateEventList = corporateEvents ? (corporateEvents.events || []) : [];
    const corporateEventStatus = corporateEvents ? (text(corporateEvents.status) || null) : null;

    // Transactions of this asset with optional provenance
    const transactionList = transactions.filter(tx => tickerOf(tx) === ticker);
    const transactionSource = options.transactionSource ? (text(options.transactionSource.getSourceForTicker(ticker)) || null) : null;
    const transactionCoverage = options.transactionSource ? (text(options.transactionSource.getCoverageForTicker(ticker)) || null) : null;

    // Documents/provenance references
    const documents = options.documents ? options.documents.getDocumentsForAsset(ticker) : null;
    const documentList = documents ? (documents.items || []) : [];
    const documentStatus = documents ? (text(documents.status) || null) : null;

    const reviewReasons = [
      ...(taxPosition?.needsReviewReasons || []),
      ...realized.flatMap(row => row.needsReviewReason ? [row.needsReviewReason] : []),
      ...history.flatMap(row => row.reasons || []),
      ...dataQualityIssues.filter(issue => issue.needsReview || String(issue.state || '').toUpperCase().includes('NEEDS_REVIEW')).map(issue => issue.rootCause || issue.domain),
      ...monitoringAlerts.filter(alert => String(alert.severity || '').toUpperCase() === 'HIGH' || String(alert.severity || '').toUpperCase() === 'CRITICAL').map(alert => alert.description),
    ].filter(Boolean);

    const confidence = taxPosition?.status === 'COMPLETE' && !reviewReasons.length ? 'HIGH' :
      (taxPosition || history.length || realized.length || dataQualityIssues.length || monitoringAlerts.length ? 'NEEDS_REVIEW' : 'UNAVAILABLE');

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
        currency: marketData ? (text(marketData.currency) || null) : null,
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
        paidTotal: assetPaidEvents.reduce((sum, row) => sum + Number(row.value || 0), 0),
        paidEventCount: assetPaidEvents.length,
        ytdPaidIncome: incomeIntelligence.ytdPaidIncome ?? null,
        ttmPaidIncome: incomeIntelligence.ttmPaidIncome ?? null,
        announcedEventCount: assetAnnouncedEvents.length,
        announcedEvents: assetAnnouncedEvents,
        paidEvents: assetPaidEvents,
        semantics: incomeIntelligence.semantics || {},
      },
      transactions: {
        list: transactionList,
        source: transactionSource,
        coverage: transactionCoverage,
      },
      tax: {
        costBasis: taxPosition?.runningCostBasis ?? null,
        averageCost: taxPosition?.averageCost ?? null,
        status: statusOf(taxPosition?.status),
        realizedResult: realizedValues.length ? realizedValues.reduce((sum, value) => sum + value, 0) : null,
        realizedStatus: realized.length ? (realized.some(row => row.status === 'NEEDS_REVIEW') ? 'NEEDS_REVIEW' : 'AVAILABLE') : 'UNAVAILABLE',
        yearEnd,
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
        marketDataSource,
        marketDataFetchedAt,
        dataTrustSource,
        dataTrustUpdatedAt,
      },
      coverage: {
        marketData: marketDataStatus,
        dataTrust: dataTrustStatus,
        performance: performanceCoverage,
        income: assetPaidEvents.length ? 'FULL_COVERAGE' : 'UNKNOWN',
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
