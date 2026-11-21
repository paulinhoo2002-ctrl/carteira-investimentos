/**
 * M1401 — Passive Income Projection Engine
 * Motor avançado de projeção de renda passiva com:
 * - DY-based projection (portfolio yield)
 * - Dividend growth rate (CAGR)
 * - Reinvestment simulation (DRIP)
 * - Tax impact projection
 * - Scenario analysis (bear/base/bull)
 * - Monte Carlo wealth projection
 * - Goal tracking with Monte Carlo
 */
(function (global) {
  'use strict';
  var monteCarloInputContract = global.MonteCarloInputContract;
  if (!monteCarloInputContract && typeof module !== 'undefined' && module.exports) monteCarloInputContract = require('./analytics-monte-carlo-input.js');

  function calculatePortfolioYield(assets) {
    if (!Array.isArray(assets) || assets.length === 0) {
      return { monthlyIncome: 0, annualIncome: 0, totalValue: 0, avgDY: 0 };
    }
    var totalValue = 0;
    var totalAnnualIncome = 0;
    for (var i = 0; i < assets.length; i++) {
      var asset = assets[i];
      var qty = Number(asset.qty) || 0;
      var price = Number(asset.current_price) || 0;
      var dy = Number(asset.dy) || 0;
      if (qty > 0 && price > 0) {
        var positionValue = qty * price;
        var annualIncome = positionValue * (dy / 100);
        totalValue += positionValue;
        totalAnnualIncome += annualIncome;
      }
    }
    var avgDY = totalValue > 0 ? (totalAnnualIncome / totalValue) * 100 : 0;
    var monthlyIncome = totalAnnualIncome / 12;
    return {
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      annualIncome: Math.round(totalAnnualIncome * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      avgDY: Math.round(avgDY * 100) / 100
    };
  }

  function calculateDividendCAGR(proventos) {
    if (!Array.isArray(proventos) || proventos.length < 2) {
      return { cagr: 0, annualGrowth: 0, periods: 0, confidence: 'LOW' };
    }
    var byTickerYear = {};
    for (var i = 0; i < proventos.length; i++) {
      var p = proventos[i];
      if (!p.ticker) continue;
      var year = new Date(p.payment_date || p.date || p.dt).getFullYear();
      var key = p.ticker + '-' + year;
      var value = Number(p.value_gross || p.value || p.total || 0);
      if (!byTickerYear[key]) byTickerYear[key] = 0;
      byTickerYear[key] += value;
    }
    var byYear = {};
    var tickerYearKeys = Object.keys(byTickerYear);
    for (var j = 0; j < tickerYearKeys.length; j++) {
      var key = tickerYearKeys[j];
      var value = byTickerYear[key];
      var year = key.split('-')[1];
      if (!byYear[year]) byYear[year] = 0;
      byYear[year] += value;
    }
    var years = Object.keys(byYear).map(Number).sort(function(a, b) { return a - b; });
    if (years.length < 2) {
      return { cagr: 0, annualGrowth: 0, periods: years.length, confidence: 'LOW' };
    }
    var firstYear = years[0];
    var lastYear = years[years.length - 1];
    var firstValue = byYear[firstYear];
    var lastValue = byYear[lastYear];
    var yearsDiff = lastYear - firstYear;
    if (firstValue <= 0 || yearsDiff === 0) {
      return { cagr: 0, annualGrowth: 0, periods: years.length, confidence: 'LOW' };
    }
    var cagr = Math.pow(lastValue / firstValue, 1 / yearsDiff) - 1;
    var annualGrowth = cagr * 100;
    var confidence = 'LOW';
    if (years.length >= 5) confidence = 'HIGH';
    else if (years.length >= 3) confidence = 'MEDIUM';
    return {
      cagr: Math.round(cagr * 10000) / 10000,
      annualGrowth: Math.round(annualGrowth * 100) / 100,
      periods: years.length,
      confidence: confidence,
      firstYear: firstYear,
      lastYear: lastYear,
      firstValue: firstValue,
      lastValue: lastValue
    };
  }

  function projectWithDRIP(params) {
    var currentPortfolioValue = params.currentPortfolioValue || 0;
    var currentMonthlyIncome = params.currentMonthlyIncome || 0;
    var dividendGrowthRate = params.dividendGrowthRate || 0;
    var reinvestmentRate = params.reinvestmentRate !== undefined ? params.reinvestmentRate : 1;
    var years = params.years || 10;
    var monthlyContribution = params.monthlyContribution || 0;
    var priceGrowthRate = params.priceGrowthRate || 0;

    // Annual rates converted to monthly
    var monthlyDividendGrowth = Math.pow(1 + dividendGrowthRate, 1/12) - 1;
    var monthlyPriceGrowth = Math.pow(1 + priceGrowthRate, 1/12) - 1;

    var portfolioValue = currentPortfolioValue;
    var monthlyIncome = currentMonthlyIncome;
    var totalInvested = currentPortfolioValue;
    var totalDividendsReceived = 0;
    var totalReinvested = 0;
    var totalCashFlow = 0;

    var yearlyResults = [];
    var monthlyResults = [];

    // Track shares for more accurate DRIP
    var shares = currentPortfolioValue > 0 ? currentPortfolioValue : 1; // proxy for shares
    var pricePerShare = currentPortfolioValue > 0 ? 1 : 0; // proxy

    for (var year = 1; year <= years; year++) {
      for (var month = 1; month <= 12; month++) {
        // Monthly dividend from current portfolio (based on yield)
        var monthlyDividend = monthlyIncome;

        // Reinvestment
        var reinvested = monthlyDividend * reinvestmentRate;
        var cashFlow = monthlyDividend - reinvested;

        totalDividendsReceived += monthlyDividend;
        totalReinvested += reinvested;
        totalCashFlow += cashFlow;

        // DRIP: reinvested dividends buy more shares at current price
        if (reinvested > 0 && pricePerShare > 0) {
          var newShares = reinvested / pricePerShare;
          shares += newShares;
        }

        // Portfolio grows from price appreciation
        pricePerShare *= (1 + monthlyPriceGrowth);
        portfolioValue = shares * pricePerShare;

        // Dividend income grows from:
        // 1. Dividend growth rate (company increases payouts)
        // 2. New shares from reinvestment
        // 3. New shares from monthly contributions
        monthlyIncome *= (1 + monthlyDividendGrowth); // Company dividend growth

        // Add contribution
        if (monthlyContribution > 0) {
          var contributionShares = monthlyContribution / pricePerShare;
          shares += contributionShares;
          totalInvested += monthlyContribution;
        }
        totalInvested += reinvested;

        // Recalculate monthly income based on new share count and yield
        // Yield = annualDividend / price, so monthlyIncome = shares * pricePerShare * (yield/100) / 12
        // But we track yield separately - simpler: just scale by share count increase
        var yieldRatio = shares / (shares - (reinvested + monthlyContribution) / pricePerShare);
        // Actually simpler: track base yield
        var currentYield = currentMonthlyIncome * 12 / currentPortfolioValue;
        monthlyIncome = portfolioValue * currentYield / 12;

        monthlyResults.push({
          month: year * 12 + month,
          portfolioValue: Math.round(portfolioValue * 100) / 100,
          monthlyIncome: Math.round(monthlyIncome * 100) / 100,
          dividend: Math.round(monthlyDividend * 100) / 100,
          reinvested: Math.round(reinvested * 100) / 100,
          cashFlow: Math.round(cashFlow * 100) / 100
        });
      }

      var yearDividends = monthlyResults.slice(-12).reduce(function(sum, m) { return sum + m.dividend; }, 0);

      yearlyResults.push({
        year: year,
        portfolioValue: Math.round(portfolioValue * 100) / 100,
        annualDividends: Math.round(yearDividends * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalReinvested: Math.round(totalReinvested * 100) / 100,
        totalDividends: Math.round(totalDividendsReceived * 100) / 100,
        totalCashFlow: Math.round(totalCashFlow * 100) / 100
      });
    }

    return {
      finalPortfolioValue: Math.round(portfolioValue * 100) / 100,
      finalMonthlyIncome: Math.round(monthlyIncome * 100) / 100,
      finalAnnualIncome: Math.round(monthlyIncome * 12 * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalDividendsReceived: Math.round(totalDividendsReceived * 100) / 100,
      totalReinvested: Math.round(totalReinvested * 100) / 100,
      totalCashFlow: Math.round(totalCashFlow * 100) / 100,
      yearlyResults: yearlyResults,
      monthlyResults: monthlyResults
    };
  }

  function monteCarloWealthProjection(params) {
    var validation = monteCarloInputContract.validate(params);
    if (!validation.ok) return { valid: false, error: validation.error, invalidParameters: validation.invalidParameters };
    var input = validation.values;
    var currentValue = input.currentValue;
    var targetValue = input.targetValue;
    var monthlyContribution = input.monthlyContribution;
    var expectedReturn = input.expectedReturn;
    var volatility = input.volatility;
    var years = input.years;
    var simulations = input.simulations;
    var defaultsApplied = validation.defaultsApplied;

    var monthlyReturn = expectedReturn / 12;
    var monthlyVolatility = volatility / Math.sqrt(12);
    var months = years * 12;

    var finalValues = [];

    for (var sim = 0; sim < simulations; sim++) {
      var value = currentValue;

      for (var month = 0; month < months; month++) {
        var random1 = Math.random();
        // F-13: log(0) = -Infinity. Math.random() está em [0,1); 0 vira a menor fração positiva que o gerador
        // resolve (2^-53 => |z| ≈ 8,57, cauda legítima e finita). Qualquer outro valor segue inalterado.
        if (!(random1 > 0)) random1 = Math.pow(2, -53);
        var random2 = Math.random();
        var z = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);
        var monthlyR = monthlyReturn - 0.5 * monthlyVolatility * monthlyVolatility + monthlyVolatility * z;

        value = value * (1 + monthlyR) + monthlyContribution;
        if (!Number.isFinite(value)) return monteCarloInputContract.resultOverflow();
      }

      finalValues.push(value);
    }

    finalValues.sort(function(a, b) { return a - b; });

    var p10 = finalValues[Math.floor(simulations * 0.10)];
    var p25 = finalValues[Math.floor(simulations * 0.25)];
    var p50 = finalValues[Math.floor(simulations * 0.50)];
    var p75 = finalValues[Math.floor(simulations * 0.75)];
    var p90 = finalValues[Math.floor(simulations * 0.90)];

    var probSuccess = finalValues.filter(function(v) { return v >= targetValue; }).length / simulations;

    var expectedValue = finalValues.reduce(function(a, b) { return a + b; }, 0) / simulations;
    if (!Number.isFinite(expectedValue)) return monteCarloInputContract.resultOverflow();
    return {
      targetValue: targetValue,
      probabilitySuccess: Math.round(probSuccess * 10000) / 100,
      percentiles: {
        p10: Math.round(p10),
        p25: Math.round(p25),
        p50: Math.round(p50),
        p75: Math.round(p75),
        p90: Math.round(p90)
      },
      expectedValue: Math.round(expectedValue),
      simulations: simulations,
      assumptions: { expectedReturn: expectedReturn, volatility: volatility, years: years, simulations: simulations, defaultsApplied: defaultsApplied }
    };
  }

  function projectTaxImpact(params) {
    var annualDividends = params.annualDividends || 0;
    var taxRate = params.taxRate || 0.15;
    var exemptionLimit = params.exemptionLimit || 24000;
    var years = params.years || 10;
    var dividendGrowth = params.dividendGrowth || 0;

    var results = [];
    var currentAnnual = annualDividends;

    for (var year = 1; year <= years; year++) {
      var taxable = Math.max(0, currentAnnual - exemptionLimit);
      var tax = taxable * taxRate;
      var net = currentAnnual - tax;
      var effectiveRate = currentAnnual > 0 ? (tax / currentAnnual) * 100 : 0;

      results.push({
        year: year,
        grossAnnual: Math.round(currentAnnual * 100) / 100,
        taxable: Math.round(Math.max(0, currentAnnual - exemptionLimit) * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        net: Math.round(net * 100) / 100,
        effectiveRate: Math.round(effectiveRate * 100) / 100,
        exemptionUsed: Math.min(currentAnnual, exemptionLimit)
      });

      currentAnnual *= (1 + dividendGrowth);
    }

    return results;
  }

  function scenarioAnalysis(baseParams) {
    var scenarios = {
      bear: {
        name: 'Pessimista',
        dividendGrowth: (baseParams.dividendGrowthRate || 0) * 0.5,
        priceGrowth: (baseParams.priceGrowthRate || 0) * 0.5,
        dividendYield: (baseParams.dividendYield || 0) * 0.8
      },
      base: {
        name: 'Base',
        dividendGrowth: baseParams.dividendGrowthRate || 0,
        priceGrowth: baseParams.priceGrowthRate || 0,
        dividendYield: baseParams.dividendYield || 0
      },
      bull: {
        name: 'Otimista',
        dividendGrowth: (baseParams.dividendGrowthRate || 0) * 1.5,
        priceGrowth: (baseParams.priceGrowthRate || 0) * 1.5,
        dividendYield: (baseParams.dividendYield || 0) * 1.2
      }
    };

    var results = {};
    var scenarioKeys = Object.keys(scenarios);
    for (var k = 0; k < scenarioKeys.length; k++) {
      var key = scenarioKeys[k];
      var scenParams = scenarios[key];
      var projection = projectWithDRIP({
        currentPortfolioValue: baseParams.currentPortfolioValue,
        currentMonthlyIncome: baseParams.currentMonthlyIncome,
        dividendGrowthRate: scenParams.dividendGrowth,
        priceGrowthRate: scenParams.priceGrowth,
        reinvestmentRate: baseParams.reinvestmentRate,
        monthlyContribution: baseParams.monthlyContribution,
        years: baseParams.years
      });
      results[key] = {
        name: scenParams.name,
        finalPortfolioValue: projection.finalPortfolioValue,
        finalMonthlyIncome: projection.finalMonthlyIncome,
        finalAnnualIncome: projection.finalAnnualIncome,
        totalInvested: projection.totalInvested,
        totalDividendsReceived: projection.totalDividendsReceived,
        totalReinvested: projection.totalReinvested,
        totalCashFlow: projection.totalCashFlow
      };
    }

    return results;
  }

  function generateFullProjectionReport(params) {
    var assets = params.assets || [];
    var proventos = params.proventos || [];
    var goals = params.goals || {};
    var monthlyContribution = params.monthlyContribution || 0;
    var years = params.years || 10;

    var portfolio = calculatePortfolioYield(assets);
    var cagr = calculateDividendCAGR(proventos);
    var targetMonthly = (goals.proventos && goals.proventos.monthly) || 0;

    var baseParams = {
      currentPortfolioValue: portfolio.totalValue,
      currentMonthlyIncome: portfolio.monthlyIncome,
      dividendGrowthRate: cagr.cagr,
      dividendYield: portfolio.avgDY,
      priceGrowthRate: 0.08,
      monthlyContribution: monthlyContribution,
      years: years
    };

    var dripProjection = projectWithDRIP(baseParams);
    var scenarios = scenarioAnalysis(baseParams);
    var monteCarlo = monteCarloWealthProjection({
      currentValue: portfolio.totalValue,
      targetValue: (goals.patrimonio && goals.patrimonio.target) || portfolio.totalValue * 2,
      monthlyContribution: monthlyContribution,
      expectedReturn: 0.10,
      volatility: 0.15,
      years: 10
    });
    var taxProjection = projectTaxImpact({
      annualDividends: portfolio.annualIncome,
      years: 10,
      dividendGrowth: cagr.cagr
    });

    return {
      timestamp: new Date().toISOString(),
      portfolio: portfolio,
      dividendCAGR: cagr,
      baseProjection: dripProjection,
      scenarios: scenarios,
      monteCarlo: monteCarlo,
      taxProjection: taxProjection,
      goalTracking: {
        targetMonthly: targetMonthly,
        currentMonthly: portfolio.monthlyIncome,
        gap: Math.max(0, targetMonthly - portfolio.monthlyIncome),
        progressPercent: targetMonthly > 0 ? Math.min(100, (portfolio.monthlyIncome / targetMonthly) * 100) : 0
      },
      disclaimer: 'Projeções baseadas em dados históricos e premissas simplificadas. Não constituem recomendação de investimento. Rentabilidade passada não garante rentabilidade futura.'
    };
  }

  var api = {
    calculatePortfolioYield: calculatePortfolioYield,
    calculateDividendCAGR: calculateDividendCAGR,
    projectWithDRIP: projectWithDRIP,
    monteCarloWealthProjection: monteCarloWealthProjection,
    projectTaxImpact: projectTaxImpact,
    scenarioAnalysis: scenarioAnalysis,
    generateFullProjectionReport: generateFullProjectionReport
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.PassiveIncomeProjection = api;
})(typeof window !== 'undefined' ? window : globalThis);
