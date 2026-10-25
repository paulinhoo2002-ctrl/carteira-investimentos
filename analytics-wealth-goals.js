/**
 * M1431 — Wealth Goals Tracking
 * Metas de patrimônio, marcos, projeções Monte Carlo
 */
(function (global) {
  'use strict';

  function calculateGoalProgress(currentValue, targetValue) {
    if (!targetValue || targetValue <= 0) return null;
    const progress = (currentValue / targetValue) * 100;
    const remaining = Math.max(0, targetValue - currentValue);
    return {
      currentValue,
      targetValue,
      progressPercent: Math.round(progress * 100) / 100,
      remaining,
      achieved: progress >= 100,
      status: progress >= 100 ? 'ACHIEVED' : progress >= 75 ? 'ON_TRACK' : progress >= 50 ? 'PROGRESSING' : 'BEHIND'
    };
  }

  function estimateTimeToGoal(currentValue, targetValue, monthlyContribution, expectedAnnualReturn) {
    if (!targetValue || targetValue <= 0 || currentValue >= targetValue) return { months: 0, years: 0 };
    if (!monthlyContribution || monthlyContribution <= 0) return null;

    const monthlyReturn = expectedAnnualReturn / 12;
    let value = currentValue;
    let months = 0;

    for (months = 1; months <= 600; months++) {
      value = value * (1 + monthlyReturn) + monthlyContribution;
      if (value >= targetValue) break;
    }

    if (months > 600) return null;

    return {
      months,
      years: Math.floor(months / 12),
      remainingMonths: months % 12,
      estimatedDate: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    };
  }

  function generateMilestones(targetValue, count = 5) {
    if (!targetValue || targetValue <= 0) return [];
    const milestones = [];
    for (let i = 1; i <= count; i++) {
      const value = (targetValue * i) / (count + 1);
      milestones.push({
        order: i,
        value: Math.round(value),
        label: `Marco ${i}`,
        percent: Math.round((i / (count + 1)) * 100)
      });
    }
    return milestones;
  }

  function getMilestoneStatus(milestones, currentValue) {
    return milestones.map(m => ({
      ...m,
      achieved: currentValue >= m.value,
      progress: Math.min(100, Math.round((currentValue / m.value) * 100))
    }));
  }

  function monteCarloGoalProbability({
    currentValue,
    targetValue,
    monthlyContribution,
    expectedReturn = 0.10,
    volatility = 0.15,
    years = 10,
    simulations = 200
  }) {
    if (!targetValue || targetValue <= 0) return { probability: 0 };
    if (currentValue >= targetValue) return { probability: 100 };

    const monthlyReturn = expectedReturn / 12;
    const monthlyVolatility = volatility / Math.sqrt(12);
    const months = years * 12;

    let successCount = 0;
    const finalValues = [];

    for (let sim = 0; sim < simulations; sim++) {
      let value = currentValue;
      for (let month = 0; month < months; month++) {
        const random1 = Math.random();
        const random2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);
        const monthlyR = monthlyReturn - 0.5 * monthlyVolatility * monthlyVolatility + monthlyVolatility * z;
        value = value * (1 + monthlyR) + (monthlyContribution || 0);
      }
      finalValues.push(value);
      if (value >= targetValue) successCount++;
    }

    finalValues.sort((a, b) => a - b);
    const p10 = finalValues[Math.floor(simulations * 0.10)];
    const p50 = finalValues[Math.floor(simulations * 0.50)];
    const p90 = finalValues[Math.floor(simulations * 0.90)];

    return {
      probability: Math.round((successCount / simulations) * 10000) / 100,
      percentiles: { p10: Math.round(p10), p50: Math.round(p50), p90: Math.round(p90) },
      expectedValue: Math.round(finalValues.reduce((a, b) => a + b, 0) / simulations),
      simulations
    };
  }

  function generateWealthGoalReport({
    assets,
    goals,
    monthlyContribution = 0,
    expectedReturn = 0.10,
    volatility = 0.15,
    projectionYears = 10
  }) {
    const totalValue = assets.reduce((sum, a) => sum + (Number(a.qty) || 0) * (Number(a.current_price) || 0), 0);
    const targetValue = goals?.patrimonio?.target || totalValue * 2;
    const aportes = goals?.patrimonio?.aporte || monthlyContribution;

    const progress = calculateGoalProgress(totalValue, targetValue);
    const timeEstimate = estimateTimeToGoal(totalValue, targetValue, aportes, expectedReturn);
    const milestones = getMilestoneStatus(generateMilestones(targetValue), totalValue);
    const monteCarlo = monteCarloGoalProbability({
      currentValue: totalValue,
      targetValue,
      monthlyContribution: aportes,
      expectedReturn,
      volatility,
      years: projectionYears
    });

    return {
      timestamp: new Date().toISOString(),
      currentValue: totalValue,
      targetValue,
      progress,
      timeEstimate,
      milestones,
      monteCarlo,
      assumptions: {
        expectedReturn,
        volatility,
        monthlyContribution: aportes,
        projectionYears
      },
      disclaimer: 'Projeções baseadas em premissas simplificadas. Não garantem resultado. Rentabilidade passada não garante rentabilidade futura.'
    };
  }

  var api = {
    calculateGoalProgress: calculateGoalProgress,
    estimateTimeToGoal: estimateTimeToGoal,
    generateMilestones: generateMilestones,
    getMilestoneStatus: getMilestoneStatus,
    monteCarloGoalProbability: monteCarloGoalProbability,
    generateWealthGoalReport: generateWealthGoalReport
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.WealthGoalsTracking = api;
})(typeof window !== 'undefined' ? window : globalThis);