/**
 * M1441 — Financial Insights Engine
 * Alertas inteligentes, anomalias, oportunidades, health score
 */
(function (global) {
  'use strict';

  function analyzePortfolioHealth(assets, proventos, goals) {
    const totalValue = assets.reduce(function(s, a) { return s + (Number(a.qty) || 0) * (Number(a.current_price) || 0); }, 0);
    const totalInvested = assets.reduce(function(s, a) { return s + (Number(a.qty) || 0) * (Number(a.avg_price) || 0); }, 0);
    const totalDividends = proventos.reduce(function(s, p) { return s + (Number(p.value_gross) || 0); }, 0);

    const alerts = [];
    const opportunities = [];
    let score = 100;

    // 1. Concentração excessiva
    const byTicker = {};
    assets.forEach(function(a) {
      const v = (Number(a.qty) || 0) * (Number(a.current_price) || 0);
      byTicker[a.ticker] = (byTicker[a.ticker] || 0) + v;
    });
    const maxPosition = Math.max.apply(Math, Object.values(byTicker).concat([0]));
    if (totalValue > 0 && maxPosition / totalValue > 0.25) {
      alerts.push({ type: 'CONCENTRATION', severity: 'HIGH', message: 'Maior posição (' + maxPosition.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) + ') excede 25% da carteira' });
      score -= 15;
    } else if (totalValue > 0 && maxPosition / totalValue > 0.15) {
      alerts.push({ type: 'CONCENTRATION', severity: 'MEDIUM', message: 'Maior posição representa ' + (maxPosition/totalValue*100).toFixed(1) + '% da carteira' });
      score -= 5;
    }

    // 2. Diversificação por classe
    const classes = { rf: 0, rv: 0, fiis: 0, international: 0, crypto: 0 };
    assets.forEach(function(a) {
      const t = (a.type || '').toLowerCase();
      const v = (Number(a.qty) || 0) * (Number(a.current_price) || 0);
      if (t === 'rf' || t === 'renda fixa') classes.rf += v;
      else if (t === 'fiis' || t === 'fii') classes.fiis += v;
      else if (t === 'international' || t === 'internacional') classes.international += v;
      else if (t === 'crypto' || t === 'cripto') classes.crypto += v;
      else classes.rv += v;
    });
    const nonZeroClasses = Object.values(classes).filter(function(v) { return v > 0; }).length;
    if (totalValue > 0 && nonZeroClasses < 3) {
      alerts.push({ type: 'DIVERSIFICATION', severity: nonZeroClasses === 1 ? 'HIGH' : 'MEDIUM', message: 'Apenas ' + nonZeroClasses + ' classe(s) de ativos. Considere diversificar.' });
      score -= nonZeroClasses === 1 ? 20 : 10;
    }

    // 3. Ativos sem cotação atual
    const staleAssets = assets.filter(function(a) { return !Number(a.current_price) || Number(a.current_price) <= 0; });
    if (staleAssets.length > 0) {
      alerts.push({ type: 'STALE_QUOTES', severity: 'MEDIUM', message: staleAssets.length + ' ativo(s) sem cotação atual. Atualize para precisão.' });
      score -= Math.min(10, staleAssets.length * 2);
    }

    // 4. Proventos não recebidos há muito tempo
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recentProventos = proventos.filter(function(p) {
      const d = new Date(p.payment_date || p.date || p.dt);
      return d >= sixMonthsAgo;
    });
    if (proventos.length > 0 && recentProventos.length === 0) {
      alerts.push({ type: 'NO_RECENT_DIVIDENDS', severity: 'LOW', message: 'Nenhum provento nos últimos 6 meses. Verifique se há dados pendentes.' });
      score -= 5;
    }

    // 5. Meta de patrimônio não definida
    if (!goals?.patrimonio?.target || goals.patrimonio.target <= 0) {
      opportunities.push({ type: 'SET_GOAL', message: 'Defina uma meta de patrimônio para acompanhar progresso e projeções.' });
      score -= 5;
    }

    // 6. Meta de renda passiva não definida
    if (!goals?.proventos?.monthly || goals.proventos.monthly <= 0) {
      opportunities.push({ type: 'SET_INCOME_GOAL', message: 'Configure meta de renda passiva mensal na aba Metas.' });
      score -= 5;
    }

    // 7. Aporte mensal não configurado
    if (!goals?.patrimonio?.aporte || goals.patrimonio.aporte <= 0) {
      opportunities.push({ type: 'SET_CONTRIBUTION', message: 'Informe aporte mensal esperado para projeções mais precisas.' });
      score -= 3;
    }

    // 8. Oportunidade: rebalanceamento
    const allocationGoals = goals?.allocation?.items || [];
    let maxDev = 0;
    if (allocationGoals.length > 0) {
      const actualAlloc = {};
      assets.forEach(function(a) {
        const t = (a.type || '').toLowerCase();
        const v = (Number(a.qty) || 0) * (Number(a.current_price) || 0);
        const clazz = t === 'rf' ? 'rf' : t === 'fiis' ? 'fiis' : t === 'international' ? 'international' : t === 'crypto' ? 'crypto' : 'rv';
        actualAlloc[clazz] = (actualAlloc[clazz] || 0) + v;
      });
      allocationGoals.forEach(function(g) {
        const target = Number(g.pct) || 0;
        const actual = totalValue > 0 ? ((actualAlloc[g.type] || 0) / totalValue) * 100 : 0;
        const dev = Math.abs(target - actual);
        if (dev > maxDev) maxDev = dev;
      });
      if (maxDev > 5) {
        opportunities.push({ type: 'REBALANCE', priority: maxDev > 10 ? 'HIGH' : 'MEDIUM', message: 'Desvio de alocação até ' + maxDev.toFixed(1) + '%. Considere rebalancear.', deviation: maxDev });
        score -= maxDev > 10 ? 10 : 5;
      }
    }

    // 9. Score final
    score = Math.max(0, Math.min(100, Math.round(score)));

    let healthLabel = 'EXCELENTE';
    if (score < 90) healthLabel = 'BOM';
    if (score < 70) healthLabel = 'ATENÇÃO';
    if (score < 50) healthLabel = 'CRÍTICO';

    return {
      score: score,
      healthLabel: healthLabel,
      totalValue: totalValue,
      totalInvested: totalInvested,
      totalDividends: totalDividends,
      alerts: alerts,
      opportunities: opportunities,
      metrics: {
        concentration: totalValue > 0 ? Math.round((maxPosition / totalValue) * 10000) / 100 : 0,
        diversificationClasses: nonZeroClasses,
        staleAssets: staleAssets.length,
        recentProventos: recentProventos.length,
        allocationDeviation: allocationGoals.length > 0 ? maxDev : null
      }
    };
  }

  function detectAnomalies(assets, proventos, movements) {
    const anomalies = [];

    // 1. Proventos duplicados
    const proventoKey = function(p) { return p.ticker + '-' + (p.payment_date || p.date || p.dt) + '-' + (p.value_gross || p.value || p.total); };
    const seen = new Set();
    proventos.forEach(function(p) {
      const key = proventoKey(p);
      if (seen.has(key)) {
        anomalies.push({ type: 'DUPLICATE_DIVIDEND', severity: 'HIGH', ticker: p.ticker, date: p.payment_date || p.date || p.dt, message: 'Provento duplicado detectado: ' + p.ticker + ' em ' + (p.payment_date || p.date || p.dt) });
      }
      seen.add(key);
    });

    // 2. Movimentações com preço zero
    if (movements) {
      movements.forEach(function(m) {
        if (!Number(m.price) || Number(m.price) <= 0) {
          anomalies.push({ type: 'ZERO_PRICE_MOVEMENT', severity: 'MEDIUM', ticker: m.ticker, date: m.date, message: 'Movimentação com preço zero/ausente: ' + m.ticker });
        }
      });
    }

    // 3. Quantidade negativa
    assets.forEach(function(a) {
      if ((Number(a.qty) || 0) < 0) {
        anomalies.push({ type: 'NEGATIVE_QUANTITY', severity: 'HIGH', ticker: a.ticker, message: 'Quantidade negativa: ' + a.ticker + ' (' + a.qty + ')' });
      }
    });

    return anomalies;
  }

  function generateInsightsReport(assets, proventos, goals, movements) {
    const health = analyzePortfolioHealth(assets, proventos, goals);
    const anomalies = detectAnomalies(assets, proventos, movements);

    // Priorizar alertas por severidade
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    health.alerts.sort(function(a, b) { return severityOrder[a.severity] - severityOrder[b.severity]; });
    anomalies.sort(function(a, b) { return severityOrder[a.severity] - severityOrder[b.severity]; });

    return {
      timestamp: new Date().toISOString(),
      health: health,
      anomalies: anomalies,
      summary: {
        totalAlerts: health.alerts.length,
        highAlerts: health.alerts.filter(function(a) { return a.severity === 'HIGH'; }).length,
        totalAnomalies: anomalies.length,
        highAnomalies: anomalies.filter(function(a) { return a.severity === 'HIGH'; }).length,
        opportunities: health.opportunities.length
      },
      disclaimer: 'Insights baseados em regras heurísticas. Não constituem recomendação de investimento.'
    };
  }

  var api = {
    analyzePortfolioHealth: analyzePortfolioHealth,
    detectAnomalies: detectAnomalies,
    generateInsightsReport: generateInsightsReport
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.FinancialInsights = api;
})(typeof window !== 'undefined' ? window : globalThis);