/* V254: derived fiscal organization only. No persistence, filing, DARF or financial writes. */
(function init(root, factory) {
  const api = factory(typeof require === 'function' ? require('./dividend-intelligence') : root?.DividendIntelligence);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TaxCostBasisIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine(dividendApi) {
  const text = value => String(value ?? '').trim();
  const numberOrNull = value => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const dateOnly = value => {
    const raw = text(value);
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
      return `${String(year).padStart(4, '0')}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
    }
    return '';
  };
  const normalizeType = value => {
    const normalized = text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normalized.includes('RENDA FIXA') || normalized === 'CDB' || normalized === 'LCI' || normalized === 'LCA' || normalized === 'CRA') return 'Renda Fixa';
    if (normalized.includes('FUNDO IMOB') || normalized === 'FII') return 'FII';
    if (normalized.includes('ETF')) return 'ETF';
    if (normalized.includes('BDR')) return 'BDR';
    if (normalized.includes('RESERVA')) return 'Reserva de emergência';
    if (normalized.includes('CRYPTO')) return 'Crypto';
    if (normalized.includes('STOCK')) return 'Stock';
    return 'Ação';
  };
  const normalizeOperation = value => {
    const normalized = text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/VENDA|SELL|RESGATE/.test(normalized)) return 'SELL';
    if (/COMPRA|BUY|APLICA/.test(normalized)) return 'BUY';
    if (/TRANSFER|TRANSFERENCIA/.test(normalized)) return 'TRANSFER';
    if (/SPLIT|DESDOBRAMENTO|GRUPAMENTO|BONIFIC|SUBSCRI|AMORTIZ/.test(normalized)) return 'CORPORATE_EVENT';
    return 'UNKNOWN';
  };
  const sourceStrength = source => {
    const normalized = text(source).toLowerCase();
    if (normalized.includes('broker') || normalized.includes('nota') || normalized.includes('confirmed')) return 'STRONG';
    if (normalized.includes('import')) return 'MEDIUM';
    return 'WEAK';
  };
  const feesOf = row => numberOrNull(row.fees ?? row.brokerageFees ?? row.brokerage ?? row.emoluments ?? row.allocatedFees ?? row.brokerNoteAllocatedCost);
  const officialRules = [
    {
      ruleId: 'IRPF-RV-WEIGHTED-AVERAGE',
      ruleVersion: '2026-guidance',
      ruleName: 'Custo médio ponderado para ganho líquido em renda variável',
      source: 'Receita Federal',
      sourcePublicationDate: '2024-06-04',
      effectiveFrom: null,
      effectiveTo: null,
      sourceUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/ganho-liquido',
      summary: 'A orientação oficial descreve o custo de aquisição pela média ponderada dos custos unitários.',
      supportedAssetTypes: ['Ação', 'ETF', 'BDR'],
      limitations: 'Não cobre automaticamente day trade, derivativos, eventos societários ou períodos sem dados.',
      verifiedAt: '2026-09-21'
    },
    {
      ruleId: 'IRPF-RV-OPERATING-EXPENSES',
      ruleVersion: '2025-11-guidance',
      ruleName: 'Despesas efetivamente pagas nas operações',
      source: 'Receita Federal',
      sourcePublicationDate: '2025-11-19',
      effectiveFrom: null,
      effectiveTo: null,
      sourceUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/deducoes',
      summary: 'Custos comprovados na compra podem compor o custo; custos comprovados na venda podem reduzir o valor de venda.',
      supportedAssetTypes: ['Ação', 'ETF', 'BDR'],
      limitations: 'Sem nota ou custos identificados, o cálculo permanece parcial e exige revisão.',
      verifiedAt: '2026-09-21'
    },
    {
      ruleId: 'IRPF-RV-CATEGORIES',
      ruleVersion: '2026-guidance',
      ruleName: 'Modalidades declaradas em renda variável',
      source: 'Receita Federal',
      sourcePublicationDate: '2026-03-24',
      effectiveFrom: null,
      effectiveTo: null,
      sourceUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/rendimentos/rendimentos-do-capital',
      summary: 'A orientação atual separa operações comuns, day trade e operações com FII/FIAGRO.',
      supportedAssetTypes: ['Ação', 'ETF', 'BDR', 'FII'],
      limitations: 'V254 não classifica automaticamente imposto devido nem day trade.',
      verifiedAt: '2026-09-21'
    },
    {
      ruleId: 'IRPF-NO-AUTOMATIC-FILING',
      ruleVersion: '2025-03-guidance',
      ruleName: 'Apuração externa e responsabilidade do contribuinte',
      source: 'Receita Federal',
      sourcePublicationDate: '2025-03-14',
      effectiveFrom: null,
      effectiveTo: null,
      sourceUrl: 'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/imposto-de-renda/dirpf/pagamento/o-que-e-ganho-de',
      summary: 'A Receita orienta o uso de GCAP quando aplicável; este produto não gera DARF nem transmite declaração.',
      supportedAssetTypes: ['Ação', 'ETF', 'BDR', 'FII'],
      limitations: 'Relatório é auxiliar e não substitui informe, GCAP, DIRPF ou profissional habilitado.',
      verifiedAt: '2026-09-21'
    }
  ];

  function normalizeTransaction(row = {}, index = 0) {
    const operation = normalizeOperation(row.operation ?? row.op ?? row.movementKind ?? row.decision);
    const quantity = numberOrNull(row.qty ?? row.quantity);
    const unitPrice = numberOrNull(row.price ?? row.unitPrice ?? row.averagePrice);
    const total = numberOrNull(row.totalValue ?? row.total ?? row.grossValue) ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null);
    const fees = feesOf(row);
    const date = dateOnly(row.date ?? row.tradeDate ?? row.data);
    const ticker = text(row.ticker ?? row.symbol).toUpperCase();
    const type = normalizeType(row.type ?? row.asset_type ?? row.assetType);
    const source = text(row.source ?? row.origin) || 'UNKNOWN';
    const sourceIsStrong = sourceStrength(source) === 'STRONG';
    const validTrade = ['BUY', 'SELL'].includes(operation) && Boolean(ticker && date && quantity !== null && quantity > 0 && total !== null && total >= 0);
    const reasons = [];
    if (!validTrade && operation !== 'UNKNOWN') reasons.push('MISSING_TRANSACTION_FIELDS');
    if (!feesAreKnown(row)) reasons.push('MISSING_FEES');
    if (!sourceIsStrong) reasons.push('WEAK_SOURCE');
    if (operation === 'TRANSFER') reasons.push('TRANSFER_WITHOUT_COST_BASIS');
    if (operation === 'CORPORATE_EVENT') reasons.push('UNSUPPORTED_CORPORATE_EVENT');
    if (type === 'Renda Fixa' || type === 'Crypto' || type === 'Stock' || type === 'Reserva de emergência') reasons.push('UNSUPPORTED_ASSET_CLASS');
    return { id: text(row.id) || `transaction:${index}`, ticker, type, date, operation, quantity, unitPrice, total, fees, source, validTrade, reasons };
  }
  function feesAreKnown(row) { return feesOf(row) !== null; }
  function confidenceOf(row) {
    if (row.reasons.includes('MISSING_TRANSACTION_FIELDS') || row.reasons.includes('UNSUPPORTED_ASSET_CLASS')) return 'UNKNOWN';
    if (row.reasons.includes('MISSING_FEES') || row.reasons.includes('WEAK_SOURCE')) return 'LOW';
    return 'HIGH';
  }
  function addReview(reasons, rowReasons) { rowReasons.forEach(reason => { if (!reasons.includes(reason)) reasons.push(reason); }); }
  function applyTrade(position, row) {
    const next = { ...position, lastDate: row.date, type: row.type, source: row.source };
    if (row.operation === 'BUY') {
      const adjustedCost = row.total + (row.fees || 0);
      next.runningQuantity += row.quantity;
      next.runningCostBasis += adjustedCost;
      next.averageCost = next.runningQuantity ? next.runningCostBasis / next.runningQuantity : null;
      next.transactionCount += 1;
      return next;
    }
    if (row.operation === 'SELL') {
      const allocated = next.averageCost === null ? null : next.averageCost * row.quantity;
      if (allocated === null || row.quantity > next.runningQuantity) {
        addReview(next.needsReviewReasons, ['MISSING_PURCHASE_HISTORY']);
        next.status = 'NEEDS_REVIEW';
        return next;
      }
      next.runningQuantity -= row.quantity;
      next.runningCostBasis -= allocated;
      next.averageCost = next.runningQuantity ? next.runningCostBasis / next.runningQuantity : 0;
      next.transactionCount += 1;
      return next;
    }
    return next;
  }
  function buildCostBasis(transactions) {
    const normalized = (transactions || []).map(normalizeTransaction).sort((a, b) => `${a.date}|${a.id}`.localeCompare(`${b.date}|${b.id}`));
    const positions = new Map();
    const rows = [];
    const realizedRows = [];
    const unsupported = [];
    normalized.forEach(row => {
      if (row.operation === 'UNKNOWN') return;
      if (row.operation === 'TRANSFER' || row.operation === 'CORPORATE_EVENT' || row.reasons.includes('UNSUPPORTED_ASSET_CLASS')) {
        unsupported.push(row);
        const existing = positions.get(row.ticker) || { ticker: row.ticker, type: row.type, runningQuantity: 0, runningCostBasis: 0, averageCost: null, transactionCount: 0, needsReviewReasons: [], status: 'NEEDS_REVIEW' };
        addReview(existing.needsReviewReasons, row.reasons);
        existing.status = 'NEEDS_REVIEW';
        positions.set(row.ticker, existing);
        return;
      }
      const previous = positions.get(row.ticker) || { ticker: row.ticker, type: row.type, runningQuantity: 0, runningCostBasis: 0, averageCost: null, transactionCount: 0, needsReviewReasons: [], status: 'COMPLETE' };
      const beforeQuantity = previous.runningQuantity;
      const beforeCost = previous.runningCostBasis;
      const updated = applyTrade(previous, row);
      addReview(updated.needsReviewReasons, row.reasons);
      updated.status = updated.needsReviewReasons.length ? 'NEEDS_REVIEW' : 'COMPLETE';
      positions.set(row.ticker, updated);
      const confidence = confidenceOf(row);
      rows.push({
        id: row.id, ticker: row.ticker, type: row.type, tradeDate: row.date, operation: row.operation,
        quantity: row.quantity, grossValue: row.total, fees: row.fees, allocatedFees: row.fees,
        adjustedCost: row.operation === 'BUY' ? row.total + (row.fees || 0) : null,
        runningQuantity: updated.runningQuantity, runningCostBasis: updated.runningCostBasis,
        averageCost: updated.averageCost, source: row.source, confidence,
        coverage: row.reasons.length ? 'PARTIAL' : 'COMPLETE', status: row.reasons.length ? 'NEEDS_REVIEW' : 'COMPLETE',
        needsReviewReason: row.reasons.join('|') || ''
      });
      if (row.operation === 'SELL') {
        const allocatedCostBasis = beforeQuantity > 0 && previous.averageCost !== null ? previous.averageCost * row.quantity : null;
        const netProceeds = row.total - (row.fees || 0);
        const reasons = [...row.reasons];
        if (allocatedCostBasis === null) reasons.push('MISSING_PURCHASE_HISTORY');
        realizedRows.push({
          id: row.id, asset: row.ticker, type: row.type, saleDate: row.date, quantity: row.quantity,
          grossProceeds: row.total, allocatedCostBasis, fees: row.fees, netProceeds,
          realizedGainLoss: allocatedCostBasis === null ? null : netProceeds - allocatedCostBasis,
          source: row.source, confidence: reasons.length ? 'LOW' : 'HIGH', taxCategory: 'UNKNOWN',
          status: reasons.length ? 'NEEDS_REVIEW' : 'COMPLETE', needsReview: reasons.length > 0, needsReviewReason: reasons.join('|')
        });
      }
      void beforeCost;
    });
    const positionRows = [...positions.values()].map(row => ({ ...row, needsReview: row.needsReviewReasons.length > 0, needsReviewReason: row.needsReviewReasons.join('|') }));
    return { normalized, rows, positions: positionRows, realizedRows, unsupported };
  }
  function buildYearEnd(transactions, years) {
    const normalized = (transactions || []).map(normalizeTransaction);
    const selectedYears = years?.length ? years : [...new Set(normalized.filter(row => row.date).map(row => Number(row.date.slice(0, 4))))].sort();
    const result = [];
    selectedYears.forEach(year => {
      const cutoff = `${year}-12-31`;
      const state = buildCostBasis(normalized.filter(row => row.date && row.date <= cutoff).map(row => row));
      state.positions.forEach(position => result.push({ year, asset: position.ticker, quantity: position.runningQuantity, costBasis: position.runningCostBasis, averageCost: position.averageCost, positionConfidence: position.needsReview ? 'LOW' : 'HIGH', sourceCoverage: position.needsReview ? 'PARTIAL' : 'COMPLETE', status: position.needsReview ? 'NEEDS_REVIEW' : 'MATCH', needsReview: position.needsReview, needsReviewReason: position.needsReviewReason }));
    });
    return result;
  }
  function buildIncomeLedger(incomeEvents) {
    if (!dividendApi?.buildDividendIntelligence) return { rows: [], total: 0, status: 'UNSUPPORTED', writeEnabled: false };
    const intelligence = dividendApi.buildDividendIntelligence({ rows: incomeEvents || [], now: new Date() });
    const paid = intelligence.paidEvents || [];
    return { rows: paid, total: paid.reduce((sum, row) => sum + row.value, 0), status: paid.length ? 'COMPLETE' : 'UNAVAILABLE', coverage: intelligence.monthly.coverage, writeEnabled: false, source: 'V253 canonical income ledger' };
  }
  function buildTaxIntelligence({ transactions = [], incomeEvents = [], yearEndYears } = {}) {
    const costBasis = buildCostBasis(transactions);
    const incomeLedger = buildIncomeLedger(incomeEvents);
    const taxDueStatus = costBasis.realizedRows.length ? 'NEEDS_REVIEW' : 'UNAVAILABLE';
    return {
      version: 'V254_TAX_COST_BASIS_INTELLIGENCE_V1',
      writeEnabled: false,
      officialRules,
      costBasis: { rows: costBasis.rows, positions: costBasis.positions, unsupported: costBasis.unsupported, status: costBasis.rows.length ? (costBasis.rows.some(row => row.status === 'NEEDS_REVIEW') || costBasis.realizedRows.some(row => row.taxCategory === 'UNKNOWN') ? 'PARTIAL' : 'COMPLETE') : 'UNAVAILABLE' },
      positions: costBasis.positions,
      realizedGains: { rows: costBasis.realizedRows, status: costBasis.realizedRows.length ? (costBasis.realizedRows.some(row => row.status === 'NEEDS_REVIEW') ? 'PARTIAL' : 'COMPLETE') : 'UNAVAILABLE' },
      incomeLedger,
      yearEnd: buildYearEnd(transactions, yearEndYears),
      taxSummary: { taxDue: { value: null, status: taxDueStatus, reason: 'TAX_CALCULATION_REQUIRES_PERIOD_RULES_AND_COMPLETE_DATA' }, darfEnabled: false, filingEnabled: false, lossCarryforward: 'NEEDS_REVIEW' },
      semantics: { unknownIsNotZero: true, partialIsNotComplete: true, needsReviewIsNotTaxReady: true, saleProceedsAreNotGain: true, unsupportedIsNotCalculated: true },
      reconciliation: { v253IncomeLedgerDiff: 0, currentPositionStatus: 'NOT_OVERWRITTEN', toleranceCents: 1 }
    };
  }
  return { OFFICIAL_RULES: officialRules, normalizeTransaction, buildCostBasis, buildIncomeLedger, buildYearEnd, buildTaxIntelligence };
});
