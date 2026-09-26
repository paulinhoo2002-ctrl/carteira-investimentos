/* V273 read-only aggregation of explicitly supplied portfolio evidence. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioReportReadiness = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createReportReadiness() {
  const SECTION_STATES = Object.freeze(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE', 'TRACKING_STARTED']);
  const REASON_LABELS = Object.freeze({
    NO_HISTORY: 'Ainda não há histórico suficiente para este recorte.',
    INSUFFICIENT_HISTORY_SPAN: 'O histórico ainda não cobre o período mínimo.',
    INSUFFICIENT_DAILY_COVERAGE: 'Há lacunas entre capturas que ainda impedem esta análise.',
    PARTIAL_PRICE_COVERAGE: 'A cobertura de preços está parcial.',
    UNKNOWN_PRICE_COVERAGE: 'A cobertura de preços ainda não foi comprovada.',
    NO_TRUSTWORTHY_EXTERNAL_FLOWS: 'Ainda não há fluxos externos confiáveis identificados.',
    INSUFFICIENT_FLOW_PROVENANCE: 'Há fluxos sem proveniência ou classificação suficiente.',
    INSUFFICIENT_FLOW_TIMING: 'O momento dos fluxos em relação às avaliações não está comprovado.',
    NO_TERMINAL_VALUATION: 'Não há avaliação terminal confiável para esta métrica.',
    WALLET_ID_UNAVAILABLE: 'Os registros não identificam a carteira de origem.',
    WALLET_SCOPE_MISMATCH: 'Os dados de histórico, fluxos e performance não identificam a mesma carteira.',
    IMPORT_SOURCE_INCOMPLETE: 'Há fontes de importação que ainda exigem validação ou fixture.',
    STALE_SOURCE: 'Uma ou mais fontes estão desatualizadas.',
    SOURCE_FRESHNESS_UNKNOWN: 'O frescor da fonte não foi informado.',
    NO_INCOME_EVIDENCE: 'Não há evidência suficiente de cobertura dos proventos neste recorte.',
    BACKUP_METADATA_UNAVAILABLE: 'Metadados de backup não estão disponíveis neste contexto.',
    RESTORE_VALIDATION_UNAVAILABLE: 'Não há validação de compatibilidade de restauração neste contexto.',
    ENGINE_UNAVAILABLE: 'O motor matemático não está disponível neste contexto.',
    DATA_REQUIREMENTS_UNMET: 'Os requisitos de dados da métrica ainda não foram atendidos.'
  });

  const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const clean = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  const finiteCount = value => Number.isInteger(value) && value >= 0 ? value : null;
  const unique = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value))];

  function stateOf(value, fallback = 'UNAVAILABLE') {
    return SECTION_STATES.includes(value) ? value : fallback;
  }

  function reasonsFor(codes) {
    return unique(codes).map(code => ({ code, label: REASON_LABELS[code] || 'A evidência disponível ainda não permite confirmar este item.' }));
  }

  function section(status, reasonCodes = [], evidence = {}) {
    const codes = unique(reasonCodes);
    return {
      status: stateOf(status),
      reasonCodes: codes,
      reasons: reasonsFor(codes),
      evidence: isRecord(evidence) ? { ...evidence } : {}
    };
  }

  function buildPortfolioReportReadiness(input = {}) {
    const data = isRecord(input) ? input : {};
    const history = isRecord(data.history) ? data.history : {};
    const performance = isRecord(data.performance) ? data.performance : {};
    const prices = isRecord(data.prices) ? data.prices : {};
    const cashFlows = isRecord(data.cashFlows) ? data.cashFlows : {};
    const income = isRecord(data.income) ? data.income : {};
    const imports = isRecord(data.imports) ? data.imports : {};
    const backup = isRecord(data.backup) ? data.backup : {};
    const fixedIncome = isRecord(data.fixedIncome) ? data.fixedIncome : {};

    const suppliedWalletIds = [performance.walletId, history.walletId, cashFlows.walletId].map(clean).filter(Boolean);
    const walletScopeMismatch = new Set(suppliedWalletIds).size > 1;
    const walletScopeComplete = [performance.walletId, history.walletId, cashFlows.walletId].every(value => Boolean(clean(value))) && !walletScopeMismatch;
    const walletId = clean(performance.walletId) || clean(history.walletId) || clean(cashFlows.walletId);
    const flowWalletIdAvailable = Boolean(clean(cashFlows.walletId)) && !walletScopeMismatch;
    const engineAvailable = performance.engineAvailable === true;
    const priceCoverage = ['FULL', 'FULL_COVERAGE', 'AVAILABLE'].includes(prices.coverageStatus)
      ? 'FULL'
      : prices.coverageStatus === 'PARTIAL' || prices.coverageStatus === 'PARTIAL_COVERAGE' ? 'PARTIAL'
        : prices.coverageStatus === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'UNKNOWN';
    const freshness = ['FRESH', 'CURRENT', 'STALE', 'UNKNOWN'].includes(prices.freshness) ? prices.freshness : 'UNKNOWN';
    const historyStatus = stateOf(history.status, finiteCount(history.snapshotCount) > 0 ? 'TRACKING_STARTED' : 'UNAVAILABLE');

    const historyReasons = [];
    if (historyStatus === 'UNAVAILABLE') historyReasons.push('NO_HISTORY');
    if (historyStatus === 'PARTIAL') historyReasons.push('INSUFFICIENT_HISTORY_SPAN');
    const historySection = section(historyStatus, historyReasons, {
      snapshotCount: finiteCount(history.snapshotCount), spanDays: finiteCount(history.spanDays), latestAt: clean(history.latestAt)
    });

    const priceReasons = [];
    if (priceCoverage === 'PARTIAL') priceReasons.push('PARTIAL_PRICE_COVERAGE');
    if (priceCoverage === 'UNKNOWN') priceReasons.push('UNKNOWN_PRICE_COVERAGE');
    if (priceCoverage === 'UNAVAILABLE') priceReasons.push('UNKNOWN_PRICE_COVERAGE');
    if (freshness === 'STALE') priceReasons.push('STALE_SOURCE');
    if (freshness === 'UNKNOWN') priceReasons.push('SOURCE_FRESHNESS_UNKNOWN');
    const priceStatus = priceCoverage === 'FULL' && freshness !== 'STALE' && freshness !== 'UNKNOWN' ? 'AVAILABLE'
      : priceCoverage === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'PARTIAL';
    const priceSection = section(priceStatus, priceReasons, {
      coverage: priceCoverage, freshness,
      source: clean(prices.source), sourceAsOf: clean(prices.sourceAsOf)
    });

    const walletIdAvailable = walletScopeComplete && performance.walletIdAvailable !== false;
    const flowTrustedCount = finiteCount(cashFlows.trustedExternalCount);
    const flowAmbiguousCount = finiteCount(cashFlows.ambiguousCount);
    const flowUnknownCount = finiteCount(cashFlows.unknownCount);
    const flowReasons = [];
    if (!flowWalletIdAvailable) flowReasons.push('WALLET_ID_UNAVAILABLE');
    if (walletScopeMismatch) flowReasons.push('WALLET_SCOPE_MISMATCH');
    if (flowTrustedCount === null || flowTrustedCount === 0) flowReasons.push('NO_TRUSTWORTHY_EXTERNAL_FLOWS');
    if (flowAmbiguousCount === null || flowAmbiguousCount > 0 || flowUnknownCount === null || flowUnknownCount > 0) flowReasons.push('INSUFFICIENT_FLOW_PROVENANCE');
    const flowStatus = !flowWalletIdAvailable || flowTrustedCount === null || flowTrustedCount === 0 ? 'UNAVAILABLE'
      : (flowAmbiguousCount !== 0 || flowUnknownCount !== 0) ? 'PARTIAL' : 'AVAILABLE';
    const flowSection = section(flowStatus, flowReasons, {
      trustedExternalCount: flowTrustedCount, ambiguousCount: flowAmbiguousCount, unknownCount: flowUnknownCount,
      provenanceCoverage: typeof cashFlows.provenanceCoverage === 'number' && Number.isFinite(cashFlows.provenanceCoverage) ? cashFlows.provenanceCoverage : null
    });

    const performanceReasons = unique([
      ...(!walletIdAvailable ? ['WALLET_ID_UNAVAILABLE'] : []),
      ...(walletScopeMismatch ? ['WALLET_SCOPE_MISMATCH'] : []),
      ...(!engineAvailable ? ['ENGINE_UNAVAILABLE'] : []),
      ...(performance.dataReady === true ? [] : ['DATA_REQUIREMENTS_UNMET']),
      ...(Array.isArray(performance.reasonCodes) ? performance.reasonCodes : [])
    ]);
    const evidenceBaseReady = walletIdAvailable && !walletScopeMismatch && historyStatus === 'AVAILABLE' && engineAvailable &&
      performance.dataReady === true && flowStatus === 'AVAILABLE' && priceCoverage === 'FULL' && freshness === 'FRESH';
    const twrDataReady = evidenceBaseReady && performance.twrReady === true;
    const xirrDataReady = evidenceBaseReady && performance.xirrReady === true;
    const performanceReady = twrDataReady && xirrDataReady;
    const performanceStatus = performanceReady ? 'AVAILABLE'
      : twrDataReady || xirrDataReady ? 'PARTIAL'
        : historyStatus === 'TRACKING_STARTED' ? 'TRACKING_STARTED' : 'UNAVAILABLE';
    const performanceSection = section(performanceStatus, performanceReady ? [] : performanceReasons, {
      engineAvailable, dataReady: performanceReady,
      twrReady: twrDataReady,
      xirrReady: xirrDataReady,
      walletIdAvailable
    });

    const incomeStatus = stateOf(income.status, 'UNAVAILABLE');
    const incomeReasons = incomeStatus === 'AVAILABLE' ? [] : unique(income.reasonCodes?.length ? income.reasonCodes : ['NO_INCOME_EVIDENCE']);
    const incomeSection = section(incomeStatus, incomeReasons, {
      observedPeriods: finiteCount(income.observedPeriods), coveredPeriods: finiteCount(income.coveredPeriods),
      source: clean(income.source), sourceAsOf: clean(income.sourceAsOf), freshness: ['FRESH', 'STALE', 'UNKNOWN'].includes(income.freshness) ? income.freshness : 'UNKNOWN'
    });

    const importStatus = stateOf(imports.status, 'UNAVAILABLE');
    const importReasons = importStatus === 'PARTIAL' ? ['IMPORT_SOURCE_INCOMPLETE'] : importStatus === 'UNAVAILABLE' ? ['IMPORT_SOURCE_INCOMPLETE'] : [];
    const importSection = section(importStatus, importReasons, { providers: Array.isArray(imports.providers) ? imports.providers.filter(isRecord).map(row => ({ provider: clean(row.provider), status: clean(row.status) })) : [] });

    const requestedBackupStatus = stateOf(backup.status, 'UNAVAILABLE');
    const backupHasValidation = backup.validationStatus != null && typeof backup.restoreAllowed === 'boolean';
    const backupStatus = requestedBackupStatus === 'AVAILABLE' && !backupHasValidation ? 'PARTIAL' : requestedBackupStatus;
    const backupReasons = backupStatus === 'UNAVAILABLE' ? ['BACKUP_METADATA_UNAVAILABLE'] : [];
    if (!backupHasValidation) backupReasons.push('RESTORE_VALIDATION_UNAVAILABLE');
    const backupSection = section(backupStatus, backupReasons, {
      validationStatus: clean(backup.validationStatus), restoreAllowed: typeof backup.restoreAllowed === 'boolean' ? backup.restoreAllowed : null,
      warningCount: finiteCount(backup.warningCount), schemaVersion: clean(backup.schemaVersion), lastBackupAt: clean(backup.lastBackupAt)
    });

    const fixedStatus = stateOf(fixedIncome.status, 'UNAVAILABLE');
    const fixedReasons = unique(fixedIncome.reasonCodes);
    const fixedSection = section(fixedStatus, fixedReasons, {
      manualAuthority: fixedIncome.manualAuthority === true ? true : fixedIncome.manualAuthority === false ? false : null,
      financialAsOf: clean(fixedIncome.financialAsOf), sourceAsOf: clean(fixedIncome.sourceAsOf),
      confidence: ['HIGH', 'MEDIUM', 'UNKNOWN'].includes(fixedIncome.confidence) ? fixedIncome.confidence : 'UNKNOWN',
      exactIpcaValuationSupported: typeof fixedIncome.exactIpcaValuationSupported === 'boolean' ? fixedIncome.exactIpcaValuationSupported : null
    });

    const sections = Object.freeze({
      history: historySection, prices: priceSection, cashFlows: flowSection, performance: performanceSection,
      income: incomeSection, imports: importSection, backup: backupSection, fixedIncome: fixedSection
    });
    const dataReady = performanceSection.status === 'AVAILABLE' && performanceSection.evidence.dataReady === true;
    return Object.freeze({ version: 1, readOnly: true, engineAvailable, dataReady, walletIdAvailable, sections });
  }

  function reasonLabel(code) { return REASON_LABELS[code] || 'A evidência disponível ainda não permite confirmar este item.'; }

  return { SECTION_STATES, REASON_LABELS, buildPortfolioReportReadiness, reasonLabel };
});
