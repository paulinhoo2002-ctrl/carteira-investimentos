/**
 * M1411 — Dividend Evolution Tracking
 * Timeline de dividendos por ativo, crescimento YoY, sazonalidade
 */
(function (global) {
  'use strict';

  /**
   * Build dividend timeline by ticker and month
   * @param {Array} proventos - Historical dividend records
   * @returns {Object} Timeline data
   */
  function buildDividendTimeline(proventos) {
    if (!Array.isArray(proventos) || proventos.length === 0) {
      return { byTicker: {}, byMonth: {}, totalByYear: {}, seasonality: {} };
    }

    var byTicker = {};
    var byMonth = {};
    var totalByYear = {};

    for (var i = 0; i < proventos.length; i++) {
      var p = proventos[i];
      var ticker = p.ticker || 'UNKNOWN';
      var date = new Date(p.payment_date || p.date || p.dt);
      if (isNaN(date.getTime())) continue;

      var year = date.getFullYear();
      var month = date.getMonth(); // 0-11
      var monthKey = year + '-' + String(month + 1).padStart(2, '0');
      var value = Number(p.value_gross || p.value || p.total || 0);

      // By ticker
      if (!byTicker[ticker]) byTicker[ticker] = { months: {}, years: {}, total: 0 };
      if (!byTicker[ticker].months[monthKey]) byTicker[ticker].months[monthKey] = 0;
      byTicker[ticker].months[monthKey] += value;
      byTicker[ticker].total += value;
      if (!byTicker[ticker].years[year]) byTicker[ticker].years[year] = 0;
      byTicker[ticker].years[year] += value;

      // By month (all tickers)
      if (!byMonth[monthKey]) byMonth[monthKey] = { total: 0, byTicker: {}, count: 0 };
      byMonth[monthKey].total += value;
      byMonth[monthKey].count += 1;
      if (!byMonth[monthKey].byTicker[ticker]) byMonth[monthKey].byTicker[ticker] = 0;
      byMonth[monthKey].byTicker[ticker] += value;

      // Total by year
      if (!totalByYear[year]) totalByYear[year] = 0;
      totalByYear[year] += value;
    }

    // Seasonality: average by month across years
    var seasonality = {};
    var monthKeys = Object.keys(byMonth).sort();
    var monthSums = {};
    var monthCounts = {};

    for (var j = 0; j < monthKeys.length; j++) {
      var key = monthKeys[j];
      var month = key.split('-')[1];
      var total = byMonth[key].total;
      if (!monthSums[month]) { monthSums[month] = 0; monthCounts[month] = 0; }
      monthSums[month] += total;
      monthCounts[month] += 1;
    }

    for (var m = 1; m <= 12; m++) {
      var ms = String(m).padStart(2, '0');
      if (monthSums[ms] && monthCounts[ms]) {
        seasonality[ms] = {
          avg: monthSums[ms] / monthCounts[ms],
          total: monthSums[ms],
          occurrences: monthCounts[ms]
        };
      }
    }

    return {
      byTicker: byTicker,
      byMonth: byMonth,
      totalByYear: totalByYear,
      seasonality: seasonality
    };
  }

  /**
   * Calculate YoY growth for each ticker
   * @param {Object} timeline - Output from buildDividendTimeline
   * @returns {Object} YoY growth by ticker
   */
  function calculateYoYGrowth(timeline) {
    var result = {};
    var tickers = Object.keys(timeline.byTicker);

    for (var t = 0; t < tickers.length; t++) {
      var ticker = tickers[t];
      var years = Object.keys(timeline.byTicker[ticker].years).map(Number).sort(function(a, b) { return a - b; });
      if (years.length < 2) continue;

      var growth = {};
      for (var y = 1; y < years.length; y++) {
        var prev = timeline.byTicker[ticker].years[years[y-1]];
        var curr = timeline.byTicker[ticker].years[years[y]];
        if (prev > 0) {
          growth[years[y]] = ((curr - prev) / prev) * 100;
        }
      }
      result[ticker] = growth;
    }

    return result;
  }

  /**
   * Calculate portfolio-level dividend growth
   * @param {Object} timeline - Output from buildDividendTimeline
   * @returns {Object} Portfolio growth metrics
   */
  function calculatePortfolioDividendGrowth(timeline) {
    var years = Object.keys(timeline.totalByYear).map(Number).sort(function(a, b) { return a - b; });
    if (years.length < 2) {
      return { cagr: 0, annualGrowth: [], totalGrowth: 0 };
    }

    var firstYear = years[0];
    var lastYear = years[years.length - 1];
    var firstValue = timeline.totalByYear[firstYear];
    var lastValue = timeline.totalByYear[lastYear];
    var yearsDiff = lastYear - firstYear;

    var cagr = firstValue > 0 && yearsDiff > 0 ? Math.pow(lastValue / firstValue, 1 / yearsDiff) - 1 : 0;

    var annualGrowth = [];
    for (var y = 1; y < years.length; y++) {
      var prev = timeline.totalByYear[years[y-1]];
      var curr = timeline.totalByYear[years[y]];
      if (prev > 0) {
        annualGrowth.push({
          year: years[y],
          growth: ((curr - prev) / prev) * 100,
          prevValue: prev,
          currValue: curr
        });
      }
    }

    return {
      cagr: cagr,
      annualGrowth: annualGrowth,
      totalGrowth: firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0,
      firstYear: firstYear,
      lastYear: lastYear,
      firstValue: firstValue,
      lastValue: lastValue
    };
  }

  /**
   * Get top dividend payers for a period
   * @param {Object} timeline - Output from buildDividendTimeline
   * @param {String} period - 'year', 'month', or 'all'
   * @param {Number} limit - Number of top payers
   * @returns {Array} Top payers
   */
  function getTopDividendPayers(timeline, period, limit) {
    if (period === 'year') {
      var latestYear = Object.keys(timeline.totalByYear).map(Number).sort(function(a, b) { return b - a; })[0];
      var byTicker = {};
      for (var ticker in timeline.byTicker) {
        if (timeline.byTicker[ticker].years[latestYear]) {
          byTicker[ticker] = timeline.byTicker[ticker].years[latestYear];
        }
      }
      return Object.keys(byTicker).sort(function(a, b) { return byTicker[b] - byTicker[a]; }).slice(0, limit).map(function(t) {
        return { ticker: t, value: byTicker[t] };
      });
    }

    if (period === 'month') {
      var latestMonth = Object.keys(timeline.byMonth).sort().reverse()[0];
      var byTicker = timeline.byMonth[latestMonth]?.byTicker || {};
      return Object.keys(byTicker).sort(function(a, b) { return byTicker[b] - byTicker[a]; }).slice(0, limit).map(function(t) {
        return { ticker: t, value: byTicker[t] };
      });
    }

    // All time
    var byTicker = {};
    for (var ticker in timeline.byTicker) {
      byTicker[ticker] = timeline.byTicker[ticker].total;
    }
    return Object.keys(byTicker).sort(function(a, b) { return byTicker[b] - byTicker[a]; }).slice(0, limit).map(function(t) {
      return { ticker: t, value: byTicker[t] };
    });
  }

  /**
   * Generate dividend evolution report
   * @param {Array} proventos - Historical dividend records
   * @returns {Object} Complete evolution report
   */
  function generateDividendEvolutionReport(proventos) {
    var timeline = buildDividendTimeline(proventos);
    var yoy = calculateYoYGrowth(timeline);
    var portfolioGrowth = calculatePortfolioDividendGrowth(timeline);
    var topPayersYear = getTopDividendPayers(timeline, 'year', 10);
    var topPayersMonth = getTopDividendPayers(timeline, 'month', 10);
    var topPayersAll = getTopDividendPayers(timeline, 'all', 10);

    // Monthly trend (last 24 months)
    var monthKeys = Object.keys(timeline.byMonth).sort().slice(-24);
    var monthlyTrend = monthKeys.map(function(key) {
      return {
        month: key,
        total: timeline.byMonth[key].total,
        count: timeline.byMonth[key].count,
        topTicker: Object.keys(timeline.byMonth[key].byTicker).sort(function(a, b) {
          return timeline.byMonth[key].byTicker[b] - timeline.byMonth[key].byTicker[a];
        })[0] || null
      };
    });

    return {
      timestamp: new Date().toISOString(),
      timeline: timeline,
      yoyGrowth: yoy,
      portfolioGrowth: portfolioGrowth,
      topPayers: {
        year: topPayersYear,
        month: topPayersMonth,
        all: topPayersAll
      },
      monthlyTrend: monthlyTrend,
      seasonality: timeline.seasonality,
      disclaimer: 'Dados históricos não garantem performance futura.'
    };
  }

  var api = {
    buildDividendTimeline: buildDividendTimeline,
    calculateYoYGrowth: calculateYoYGrowth,
    calculatePortfolioDividendGrowth: calculatePortfolioDividendGrowth,
    getTopDividendPayers: getTopDividendPayers,
    generateDividendEvolutionReport: generateDividendEvolutionReport
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.DividendEvolution = api;
})(typeof window !== 'undefined' ? window : globalThis);