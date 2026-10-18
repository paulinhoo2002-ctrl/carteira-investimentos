'use strict';

(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FixedIncomeEconomicResultEngine = api;
}(typeof globalThis === 'object' ? globalThis : this, function createEngine() {
  const COVERAGE_STATES = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);
  const CONTRIBUTION_TYPES = new Set(['APPLICATION', 'PURCHASE']);
  const INCOME_TYPES = new Set(['COUPON', 'INTEREST', 'INCOME']);
  const CAPITAL_RETURN_TYPES = new Set(['AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN']);
  const TAX_TYPES = new Set(['IR', 'IOF']);
  const RECEIPT_TYPES = new Set([...INCOME_TYPES, ...CAPITAL_RETURN_TYPES]);

  function cents(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    const scaled = value * 100;
    const rounded = Math.round(scaled);
    if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) return null;
    return rounded;
  }

  function money(value) {
    return value === null ? null : value / 100;
  }

  function sumCents(values) {
    let total = 0;
    for (const value of values) {
      if (!Number.isSafeInteger(value)) return null;
      total += value;
      if (!Number.isSafeInteger(total)) return null;
    }
    return total;
  }

  function validCoverage(value) {
    return COVERAGE_STATES.has(value) ? value : 'UNKNOWN';
  }

  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const time = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  }

  function addBlocker(blockers, code) {
    blockers.add(code);
  }

  function completeHistory(history) {
    return history?.status === 'COMPLETE'
      && isDate(history.periodStart)
      && isDate(history.periodEnd)
      && history.periodStart <= history.periodEnd
      && history.openingPosition === 'NONE'
      && history.allEventsRepresented === true
      && history.duplicatesResolved === true;
  }

  function calculateFixedIncomeEconomicResult(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const blockers = new Set();
    const coverageInput = input?.coverage && typeof input.coverage === 'object' ? input.coverage : {};
    const coverage = {
      currentPosition: validCoverage(coverageInput.currentPosition),
      costBasis: validCoverage(coverageInput.costBasis),
      contributions: validCoverage(coverageInput.contributions),
      income: validCoverage(coverageInput.income),
      taxes: validCoverage(coverageInput.taxes),
      capitalReturns: validCoverage(coverageInput.capitalReturns),
      principal: validCoverage(coverageInput.principal),
      history: completeHistory(coverageInput.history)
        ? 'COMPLETE'
        : coverageInput.history?.status === 'UNKNOWN' ? 'UNKNOWN' : 'PARTIAL',
      openPositionResult: 'UNKNOWN',
      incomeGross: 'UNKNOWN',
      incomeNet: 'UNKNOWN',
      capitalReturnNet: 'UNKNOWN',
      totalResult: 'UNKNOWN',
      totalReturnPercent: 'UNKNOWN',
    };

    if (!completeHistory(coverageInput.history)) addBlocker(blockers, 'HISTORY_NOT_COMPLETE');

    const currentMarketCents = cents(input.currentMarketValue);
    const currentMarketValue = coverage.currentPosition === 'UNKNOWN' ? null : money(currentMarketCents);
    if (currentMarketValue === null) {
      coverage.currentPosition = 'UNKNOWN';
      addBlocker(blockers, 'CURRENT_POSITION_UNKNOWN');
    }

    const remainingBasisCents = cents(input.remainingCostBasis);
    const remainingCostBasis = coverage.costBasis === 'COMPLETE' ? money(remainingBasisCents) : null;
    if (coverage.costBasis !== 'COMPLETE') addBlocker(blockers, 'COST_BASIS_NOT_COMPLETE');
    if (coverage.costBasis === 'COMPLETE' && remainingBasisCents === null) {
      coverage.costBasis = 'UNKNOWN';
      addBlocker(blockers, 'INVALID_COST_BASIS');
    }
    const openPositionResult = coverage.currentPosition === 'COMPLETE' && currentMarketValue !== null && remainingCostBasis !== null
      ? money(currentMarketCents - remainingBasisCents)
      : null;
    coverage.openPositionResult = openPositionResult === null ? 'UNKNOWN' : 'AVAILABLE';

    const seenIds = new Set();
    let contributedCents = 0;
    let contributionsValid = Array.isArray(input.contributions);
    let validContributionCount = 0;
    if (!contributionsValid) addBlocker(blockers, 'CONTRIBUTIONS_MISSING');
    for (const contribution of Array.isArray(input.contributions) ? input.contributions : []) {
      const id = typeof contribution?.id === 'string' ? contribution.id.trim() : '';
      const amount = cents(contribution?.amount);
      if (!id || seenIds.has(id)) {
        contributionsValid = false;
        addBlocker(blockers, id ? 'DUPLICATE_EVENT_ID' : 'CONTRIBUTION_ID_MISSING');
        continue;
      }
      seenIds.add(id);
      if (!CONTRIBUTION_TYPES.has(contribution?.type) || amount === null || contribution.status !== 'CONFIRMED') {
        contributionsValid = false;
        addBlocker(blockers, 'INVALID_CONTRIBUTION');
        continue;
      }
      if (!isDate(contribution.occurredOn)) {
        contributionsValid = false;
        addBlocker(blockers, 'CONTRIBUTION_DATE_MISSING');
        continue;
      }
      if (completeHistory(coverageInput.history)
        && (contribution.occurredOn < coverageInput.history.periodStart || contribution.occurredOn > coverageInput.history.periodEnd)) {
        contributionsValid = false;
        addBlocker(blockers, 'CONTRIBUTION_OUTSIDE_HISTORY');
        continue;
      }
      contributedCents += amount;
      validContributionCount += 1;
      if (!Number.isSafeInteger(contributedCents)) {
        contributionsValid = false;
        addBlocker(blockers, 'CONTRIBUTION_TOTAL_OUT_OF_RANGE');
      }
    }
    const totalContributedCapital = coverage.contributions === 'COMPLETE' && contributionsValid
      ? money(contributedCents)
      : null;
    if (!contributionsValid) coverage.contributions = validContributionCount ? 'PARTIAL' : 'UNKNOWN';
    if (totalContributedCapital === null) addBlocker(blockers, 'CONTRIBUTIONS_NOT_COMPLETE');

    const events = Array.isArray(input.events) ? input.events : null;
    if (!events) addBlocker(blockers, 'EVENTS_MISSING');
    const receiptEvents = [];
    const taxEvents = [];
    let eventsValid = !!events;
    for (const event of events || []) {
      const eventDateValid = isDate(event?.occurredOn);
      if (!eventDateValid) {
        eventsValid = false;
        addBlocker(blockers, 'EVENT_DATE_MISSING');
      } else if (completeHistory(coverageInput.history)
        && (event.occurredOn < coverageInput.history.periodStart || event.occurredOn > coverageInput.history.periodEnd)) {
        eventsValid = false;
        addBlocker(blockers, 'EVENT_OUTSIDE_HISTORY');
      }

      const id = typeof event?.id === 'string' ? event.id.trim() : '';
      if (!id || seenIds.has(id)) {
        eventsValid = false;
        addBlocker(blockers, id ? 'DUPLICATE_EVENT_ID' : 'EVENT_ID_MISSING');
      } else {
        seenIds.add(id);
      }

      if (TAX_TYPES.has(event?.type)) {
        const amount = cents(event.amount);
        if (amount === null || event.status !== 'PAID' || typeof event.relatedEventId !== 'string' || !event.relatedEventId) {
          eventsValid = false;
          addBlocker(blockers, 'INVALID_TAX_EVENT');
        }
        taxEvents.push({ id, amount, relatedEventId: event.relatedEventId });
        continue;
      }

      if (!RECEIPT_TYPES.has(event?.type)) {
        eventsValid = false;
        addBlocker(blockers, 'UNKNOWN_EVENT');
        continue;
      }

      if (Object.hasOwn(event, 'grossAmount') || Object.hasOwn(event, 'netAmount')) {
        eventsValid = false;
        addBlocker(blockers, 'AMBIGUOUS_GROSS_NET');
      }
      const amount = cents(event.amount);
      if (amount === null || !['GROSS', 'NET'].includes(event.amountBasis) || event.status !== 'RECEIVED') {
        eventsValid = false;
        addBlocker(blockers, event.status === 'EXPECTED' ? 'EXPECTED_NOT_RECEIVED' : 'INVALID_RECEIPT_EVENT');
      }
      receiptEvents.push({ id, type: event.type, amount, amountBasis: event.amountBasis });
    }
    if (!eventsValid) {
      coverage.history = 'PARTIAL';
      if (coverage.income === 'COMPLETE') coverage.income = 'PARTIAL';
      if (coverage.capitalReturns === 'COMPLETE') coverage.capitalReturns = 'PARTIAL';
      if (coverage.taxes === 'COMPLETE') coverage.taxes = 'PARTIAL';
    }

    const receiptsById = new Map(receiptEvents.map((event) => [event.id, event]));
    const taxByReceipt = new Map();
    for (const tax of taxEvents) {
      const receipt = receiptsById.get(tax.relatedEventId);
      if (!receipt || tax.amount === null) {
        eventsValid = false;
        addBlocker(blockers, 'ORPHAN_TAX_EVENT');
        continue;
      }
      const relatedTaxes = sumCents([taxByReceipt.get(receipt.id) || 0, tax.amount]);
      if (relatedTaxes === null) {
        eventsValid = false;
        addBlocker(blockers, 'MONETARY_TOTAL_OUT_OF_RANGE');
      } else {
        taxByReceipt.set(receipt.id, relatedTaxes);
      }
    }

    const hasGrossReceipts = receiptEvents.some((event) => event.amountBasis === 'GROSS');
    if (hasGrossReceipts && coverage.taxes !== 'COMPLETE') addBlocker(blockers, 'GROSS_RECEIPT_TAX_COVERAGE_INCOMPLETE');

    function normalizedReceiptAmount(event) {
      if (event.amount === null) return null;
      if (event.amountBasis === 'NET') return event.amount;
      if (coverage.taxes !== 'COMPLETE') return null;
      const net = event.amount - (taxByReceipt.get(event.id) || 0);
      if (net < 0) {
        eventsValid = false;
        addBlocker(blockers, 'TAX_EXCEEDS_GROSS_RECEIPT');
        return null;
      }
      return net;
    }

    function grossReceiptAmount(event) {
      if (event.amount === null) return null;
      if (event.amountBasis === 'GROSS') return event.amount;
      if (coverage.taxes !== 'COMPLETE') return null;
      return event.amount + (taxByReceipt.get(event.id) || 0);
    }

    const incomeEvents = receiptEvents.filter((event) => INCOME_TYPES.has(event.type));
    const capitalEvents = receiptEvents.filter((event) => CAPITAL_RETURN_TYPES.has(event.type));
    const incomeNetParts = incomeEvents.map(normalizedReceiptAmount);
    const incomeGrossParts = incomeEvents.map(grossReceiptAmount);
    const capitalNetParts = capitalEvents.map(normalizedReceiptAmount);
    const incomePartsValid = eventsValid && incomeNetParts.every((value) => value !== null);
    const incomeGrossValid = eventsValid && incomeGrossParts.every((value) => value !== null);
    const capitalPartsValid = eventsValid && capitalNetParts.every((value) => value !== null);

    const incomeGrossCents = incomeGrossValid ? sumCents(incomeGrossParts) : null;
    const incomeNetCents = coverage.income === 'COMPLETE' && incomePartsValid
      ? sumCents(incomeNetParts)
      : null;
    const capitalReturnCents = coverage.capitalReturns === 'COMPLETE' && capitalPartsValid
      ? sumCents(capitalNetParts)
      : null;
    const paidTaxesCents = coverage.taxes === 'COMPLETE' && eventsValid
      ? sumCents(taxEvents.map((event) => event.amount))
      : null;

    if (!eventsValid) {
      coverage.history = 'PARTIAL';
      if (coverage.income === 'COMPLETE') coverage.income = 'PARTIAL';
      if (coverage.capitalReturns === 'COMPLETE') coverage.capitalReturns = 'PARTIAL';
      if (coverage.taxes === 'COMPLETE') coverage.taxes = 'PARTIAL';
    }

    const capitalOriginVerified = totalContributedCapital !== null && (totalContributedCapital > 0
      || (currentMarketValue === 0 && incomeNetCents === 0 && capitalReturnCents === 0));
    if (!capitalOriginVerified) addBlocker(blockers, 'UNEXPLAINED_CURRENT_POSITION');

    if ([incomeGrossCents, incomeNetCents, capitalReturnCents, paidTaxesCents].includes(null)) addBlocker(blockers, 'MONETARY_TOTAL_OUT_OF_RANGE');
    coverage.incomeGross = incomeGrossCents !== null && coverage.income === 'COMPLETE'
      ? 'AVAILABLE' : coverage.income === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN';
    coverage.incomeNet = incomeNetCents !== null
      ? 'AVAILABLE' : coverage.income === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN';
    coverage.capitalReturnNet = capitalReturnCents !== null
      ? 'AVAILABLE' : coverage.capitalReturns === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN';

    if (coverage.income !== 'COMPLETE' || !incomePartsValid) addBlocker(blockers, 'INCOME_NOT_COMPLETE');
    if (coverage.capitalReturns !== 'COMPLETE' || !capitalPartsValid) addBlocker(blockers, 'CAPITAL_RETURNS_NOT_COMPLETE');
    if (coverage.taxes !== 'COMPLETE') addBlocker(blockers, 'TAXES_NOT_COMPLETE');

    const principalReturnedCents = coverage.principal === 'COMPLETE'
      && coverage.history === 'COMPLETE'
      && totalContributedCapital !== null
      && remainingCostBasis !== null
      && contributedCents >= remainingBasisCents
      ? contributedCents - remainingBasisCents
      : null;
    if (principalReturnedCents !== null) coverage.principal = 'DERIVED';
    else if (coverage.principal === 'COMPLETE') {
      coverage.principal = 'PARTIAL';
      addBlocker(blockers, 'PRINCIPAL_BASIS_NOT_COMPLETE');
    }

    const totalCanBeDerived = coverage.history === 'COMPLETE'
      && coverage.currentPosition === 'COMPLETE'
      && currentMarketCents !== null
      && coverage.contributions === 'COMPLETE'
      && totalContributedCapital !== null
      && coverage.income === 'COMPLETE'
      && incomeNetCents !== null
      && coverage.capitalReturns === 'COMPLETE'
      && capitalReturnCents !== null
      && capitalOriginVerified
      && eventsValid;
    // Net cashflows count redemptions as capital flows, not income, and apply each tax once.
    const totalEconomicCents = totalCanBeDerived
      ? sumCents([currentMarketCents, incomeNetCents, capitalReturnCents, -contributedCents])
      : null;
    coverage.totalResult = totalEconomicCents !== null ? 'DERIVED'
      : [currentMarketValue, totalContributedCapital, incomeNetCents, capitalReturnCents, paidTaxesCents].some((value) => value !== null)
        ? 'PARTIAL' : 'UNKNOWN';
    if (coverage.totalResult === 'PARTIAL') coverage.totalReturnPercent = 'PARTIAL';
    if (totalEconomicCents === null) addBlocker(blockers, 'TOTAL_RESULT_NOT_SUPPORTED');

    let totalReturnPercent = null;
    let returnPercentMethod = null;
    if (input.returnPercentBasis === 'CUMULATIVE_CONTRIBUTIONS_SIMPLE') {
      if (totalEconomicCents !== null && contributedCents > 0) {
        totalReturnPercent = Number(((totalEconomicCents / contributedCents) * 100).toFixed(2));
        returnPercentMethod = 'CUMULATIVE_CONTRIBUTIONS_SIMPLE';
        coverage.totalReturnPercent = 'DERIVED';
      } else {
        addBlocker(blockers, 'RETURN_PERCENT_REQUIRES_RESULT_AND_POSITIVE_CONTRIBUTIONS');
      }
    } else {
      addBlocker(blockers, 'RETURN_PERCENT_BASIS_UNSPECIFIED');
    }

    const realizedCapitalReturnResultCents = principalReturnedCents !== null && capitalReturnCents !== null
      ? sumCents([capitalReturnCents, -principalReturnedCents])
      : null;
    const hasKnownComponent = [currentMarketValue, remainingCostBasis, totalContributedCapital, incomeNetCents, capitalReturnCents, paidTaxesCents, principalReturnedCents, totalEconomicCents]
      .some((value) => value !== null && value !== undefined);
    const status = totalEconomicCents !== null
      ? 'DERIVED_WITH_COMPLETE_HISTORY'
      : hasKnownComponent ? 'PARTIAL' : 'UNKNOWN';

    return Object.freeze({
      currentMarketValue,
      remainingCostBasis,
      openPositionResult,
      incomeGross: coverage.income === 'COMPLETE' && incomeGrossCents !== null ? money(incomeGrossCents) : null,
      taxesPaid: paidTaxesCents === null ? null : money(paidTaxesCents),
      incomeNet: incomeNetCents === null ? null : money(incomeNetCents),
      capitalReturnNet: capitalReturnCents === null ? null : money(capitalReturnCents),
      principalReturned: principalReturnedCents === null ? null : money(principalReturnedCents),
      realizedCapitalReturnResult: realizedCapitalReturnResultCents === null ? null : money(realizedCapitalReturnResultCents),
      totalEconomicResult: totalEconomicCents === null ? null : money(totalEconomicCents),
      totalReturnPercent,
      returnPercentMethod,
      totalContributedCapital,
      coverage: Object.freeze(coverage),
      status,
      blockers: Object.freeze([...blockers]),
    });
  }

  return Object.freeze({ calculateFixedIncomeEconomicResult });
}));
