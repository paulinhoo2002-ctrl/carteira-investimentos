/**
 * M1421 — Asset Class Comparison Dashboard
 * Comparativo RF vs RV vs FIIs vs Internacionais vs Crypto
 */
(function (global) {
  'use strict';

  const ASSET_CLASSES = {
    'rf': { name: 'Renda Fixa', color: '#10b981', icon: '📊' },
    'rv': { name: 'Renda Variável', color: '#3b82f6', icon: '📈' },
    'fiis': { name: 'FIIs', color: '#8b5cf6', icon: '🏢' },
    'international': { name: 'Internacional', color: '#f59e0b', icon: '🌍' },
    'crypto': { name: 'Crypto', color: '#ef4444', icon: '₿' },
    'cash': { name: 'Caixa', color: '#6b7280', icon: '💵' }
  };

  function classifyAsset(asset) {
    const ticker = (asset.ticker || '').toUpperCase();
    const type = (asset.type || '').toLowerCase();

    if (type === 'rf' || type === 'renda fixa' || type === 'fixed income') return 'rf';
    if (type === 'fiis' || type === 'fii' || type === 'real estate') return 'fiis';
    if (type === 'international' || type === 'internacional' || type === 'bdr' || type === 'etf international') return 'international';
    if (type === 'crypto' || type === 'cripto') return 'crypto';
    if (type === 'cash' || type === 'caixa') return 'cash';

    // Heurística por ticker - International ETFs first (more specific)
    if (ticker.match(/^(IVVB|SPXI|BIVB|MASP|TECK|FOFA|XPUS|ECOO|QQQB|ARKG|ARKK|ARKW|ARKF|ARKQ)11?$/)) return 'international';
    if (ticker.endsWith('11') || ticker.match(/^(HGLG|XPLG|KNRI|VISC|RBRP|BCFF|PVBI|HSML|VGIR|XPML|RECT|HCTR|VRTA|KISU|RNGO|TGAR|VINO|DEVA|BRCR|IRDM|VILG|XPCI|HFOF|FOF11)$/)) return 'fiis';
    if (ticker.match(/^(BTC|ETH|SOL|ADA|DOT|MATIC|AVAX|LINK|UNI|BNB|XRP|DOGE|SHIB)$/)) return 'crypto';

    return 'rv';
  }

  function aggregateByClass(assets) {
    const result = {};
    Object.keys(ASSET_CLASSES).forEach(k => {
      result[k] = {
        classId: k,
        name: ASSET_CLASSES[k].name,
        color: ASSET_CLASSES[k].color,
        icon: ASSET_CLASSES[k].icon,
        assets: [],
        totalValue: 0,
        totalInvested: 0,
        totalDividends: 0,
        count: 0,
        avgDY: 0,
        avgPL: 0,
        riskScore: 0
      };
    });

    for (const asset of assets) {
      const qty = Number(asset.qty) || 0;
      const price = Number(asset.current_price) || 0;
      const avgPrice = Number(asset.avg_price) || 0;
      const dy = Number(asset.dy) || 0;

      if (qty <= 0 || price <= 0) continue;

      const clazz = classifyAsset(asset);
      const positionValue = qty * price;
      const invested = qty * (avgPrice || price);
      const annualDiv = positionValue * (dy / 100);
      const pl = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

      result[clazz].assets.push({
        ticker: asset.ticker,
        qty,
        price,
        avgPrice,
        dy,
        value: positionValue,
        invested,
        pl,
        annualDiv
      });
      result[clazz].totalValue += positionValue;
      result[clazz].totalInvested += invested;
      result[clazz].totalDividends += annualDiv;
      result[clazz].count += 1;
    }

    // Calcular médias
    for (const k of Object.keys(result)) {
      const c = result[k];
      if (c.count > 0) {
        const totalDY = c.assets.reduce((s, a) => s + a.dy, 0);
        const totalPL = c.assets.reduce((s, a) => s + a.pl, 0);
        c.avgDY = totalDY / c.count;
        c.avgPL = totalPL / c.count;
        c.allocation = 0; // será preenchido depois
        c.gainLoss = c.totalValue - c.totalInvested;
        c.gainLossPct = c.totalInvested > 0 ? ((c.totalValue - c.totalInvested) / c.totalInvested) * 100 : 0;
        c.yieldOnCost = c.totalInvested > 0 ? (c.totalDividends / c.totalInvested) * 100 : 0;
      }
    }

    return result;
  }

  function calculateAllocation(byClass) {
    const total = Object.values(byClass).reduce((s, c) => s + c.totalValue, 0);
    for (const c of Object.values(byClass)) {
      c.allocation = total > 0 ? (c.totalValue / total) * 100 : 0;
    }
    return total;
  }

  function calculateRiskMetrics(byClass) {
    const riskWeights = { rf: 1, fiis: 3, rv: 5, international: 6, crypto: 9, cash: 0 };
    let weightedRisk = 0;
    let totalAlloc = 0;

    for (const c of Object.values(byClass)) {
      if (c.allocation > 0) {
        weightedRisk += c.allocation * (riskWeights[c.classId] || 5);
        totalAlloc += c.allocation;
      }
    }
    return totalAlloc > 0 ? weightedRisk / totalAlloc : 0;
  }

  function calculateCorrelationMatrix(assets) {
    // Simplified - would need price history for real correlation
    return null;
  }

  function generateComparisonReport(assets, goals = {}) {
    const byClass = aggregateByClass(assets);
    const totalPortfolio = calculateAllocation(byClass);
    const riskScore = calculateRiskMetrics(byClass);

    // Target allocation from goals
    const targetAlloc = goals.allocation || {};

    const classes = Object.values(byClass).filter(c => c.count > 0);
    classes.sort((a, b) => b.totalValue - a.totalValue);

    return {
      timestamp: new Date().toISOString(),
      totalPortfolio,
      riskScore: Math.round(riskScore * 10) / 10,
      classes,
      summary: {
        totalClasses: classes.length,
        largestClass: classes[0]?.name || '—',
        largestAlloc: classes[0]?.allocation || 0,
        concentrationRisk: classes[0] && classes[0].allocation > 50 ? 'ALTA' : classes[0] && classes[0].allocation > 30 ? 'MÉDIA' : 'BAIXA'
      },
      targets: targetAlloc,
      deviations: classes.map(c => ({
        class: c.name,
        current: Math.round(c.allocation * 100) / 100,
        target: targetAlloc[c.classId] || 0,
        deviation: Math.round(((c.allocation - (targetAlloc[c.classId] || 0)) * 100)) / 100
      })).filter(d => d.target > 0 || d.current > 0),
      disclaimer: 'Classificação automática baseada em tipo/ticker. Verifique e ajuste conforme necessário.'
    };
  }

  function getRebalanceActions(report, cashAvailable = 0) {
    const actions = [];
    for (const dev of report.deviations) {
      if (Math.abs(dev.deviation) > 2) {
        const targetValue = report.totalPortfolio * (dev.target / 100);
        const currentValue = report.totalPortfolio * (dev.current / 100);
        const diff = targetValue - currentValue;
        actions.push({
          class: dev.class,
          action: diff > 0 ? 'COMPRAR' : 'VENDER',
          amount: Math.abs(Math.round(diff * 100) / 100),
          priority: Math.abs(dev.deviation) > 10 ? 'ALTA' : 'MÉDIA'
        });
      }
    }
    return actions.sort((a, b) => b.amount - a.amount);
  }

  var api = {
    classifyAsset: classifyAsset,
    aggregateByClass: aggregateByClass,
    calculateAllocation: calculateAllocation,
    calculateRiskMetrics: calculateRiskMetrics,
    generateComparisonReport: generateComparisonReport,
    getRebalanceActions: getRebalanceActions,
    ASSET_CLASSES: ASSET_CLASSES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.AssetClassComparison = api;
})(typeof window !== 'undefined' ? window : globalThis);