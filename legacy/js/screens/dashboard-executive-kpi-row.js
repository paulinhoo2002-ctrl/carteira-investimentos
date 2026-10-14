'use strict';

/**
 * Executive Dashboard — 4-Card KPI Row (Investidor10-inspired)
 *
 * Card 1: PATRIMÔNIO TOTAL (official/consolidated)
 * Card 2: RESULTADO DA CARTEIRA (capital gain + dividends, only when certified)
 * Card 3: PROVENTOS (received 12M default)
 * Card 4: RENTABILIDADE (12M / TOTAL)
 *
 * All cards respect existing semantic hierarchy (OFICIAL/PARCIAL/OPERACIONAL)
 * and hide-values contract.
 */

(function exposeExecutiveDashboardKpis(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveKpiRow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveDashboardKpis() {
  const money = value => value === null || value === undefined || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const pct = value => value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const text = (el, v) => { el.textContent = String(v); return el; };

  // Determine Package 1A availability
  function getP1ATotals(snapshot) {
    const hasP1A = typeof root !== 'undefined' && root.Package1A && typeof root.Package1A.computeTotals === 'function';
    if (!hasP1A || !snapshot) return null;
    return root.Package1A.computeTotals(snapshot);
  }

  function getP1AGaps(snapshot) {
    const hasP1A = typeof root !== 'undefined' && root.Package1A && typeof root.Package1A.computeGaps === 'function';
    if (!hasP1A || !snapshot) return null;
    return root.Package1A.computeGaps(snapshot);
  }

  // Capital gain: only when certified cost basis exists
  function getCapitalGain({ portfolio, snapshot }) {
    const p1a = getP1ATotals(snapshot);
    if (!p1a) return { status: 'UNKNOWN', value: null, scope: 'official', asOf: p1a?.asOf ?? null };

    // Use official total as current value, certified cost basis if available
    // For now: official total minus known applied (partial)
    const applied = portfolio?.tI ?? null;
    const officialTotal = p1a.total_official ?? p1a.total ?? null;

    if (applied === null || officialTotal === null) {
      return { status: 'PARTIAL', value: null, scope: 'official', asOf: p1a.asOf, note: 'Base aplicada incompleta' };
    }

    return {
      status: 'CERTIFIED',
      value: officialTotal - applied,
      scope: 'official',
      asOf: p1a.asOf,
      invested: applied
    };
  }

  // Dividends received: from passive income summary (12M default)
  function getDividendsReceived({ period = '12M' }) {
    const monthKey = passiveIncomeMonthKey ? passiveIncomeMonthKey(new Date()) : new Date().toISOString().slice(0,7);
    const recent = passiveIncomeMonthSummary ? passiveIncomeMonthSummary(monthKey) : { total: null, coverage: 'UNKNOWN' };
    const stats = passiveIncomeGoalStats ? passiveIncomeGoalStats() : { monthlyAvg: null, completeMonthCount: 0 };

    return {
      received12M: recent?.total ?? 0,
      coverage: recent?.coverage ?? 'UNKNOWN',
      monthlyAvg: stats?.monthlyAvg ?? null,
      completeMonths: stats?.completeMonthCount ?? 0,
      asOf: monthKey
    };
  }

  // Rentabilidade: from rentability history
  function getRentabilidade({ portfolio, snapshot }) {
    const p1a = getP1ATotals(snapshot);
    const data = rentabilityHistory ? rentabilityHistory('all', 'all', 'CDI') : null;
    const v248 = v248HistoricalPerformanceSnapshot ? v248HistoricalPerformanceSnapshot() : null;
    const certified = v248?.coverage === 'FULL_COVERAGE' && data?.status === 'AVAILABLE';

    return {
      total: certified && data?.current?.cumReturn != null ? data.current.cumReturn : null,
      return12m: certified && data?.return12m != null ? data.return12m : null,
      currentMonth: certified && data?.lastMonth != null ? data.lastMonth : null,
      coverage: certified ? 'CERTIFIED' : 'PARTIAL',
      asOf: data?.asOf ?? (p1a?.asOf ?? null),
      benchmark: data?.benchmarkSource ? `${data.benchmarkSource} · ${data.benchmarkPeriod}` : null
    };
  }

  // Main render
  function renderExecutiveKpiRow({ portfolio, snapshot, recent, availability, hideValues }) {
    const p1aTotals = getP1ATotals(snapshot);
    const p1aGaps = getP1AGaps(snapshot);
    const capitalGain = getCapitalGain({ portfolio, snapshot });
    const dividends = getDividendsReceived({ period: '12M' });
    const rentabilidade = getRentabilidade({ portfolio, snapshot });

    // Card 1: PATRIMÔNIO TOTAL
    const officialTotal = p1aTotals?.total_official ?? p1aTotals?.total ?? null;
    const patrimonioLabel = officialTotal !== null ? 'Patrimônio oficial' : 'Patrimônio total';
    const patrimonioValue = hideValues ? '—' : (officialTotal !== null ? money(officialTotal) : money(portfolio?.tC));
    const patrimonioSub = officialTotal !== null && p1aGaps?.total_gap != null
      ? `Total certificado Inter · Gap detalhamento ${money(p1aGaps.total_gap)}`
      : officialTotal !== null
        ? `Data-base ${p1aTotals?.asOf?.slice(0,10) ?? '10/10/2026'}`
        : `${portfolio?.tI !== null ? `Investido ${money(portfolio.tI)}` : 'Base operacional'} · ${availability?.note ?? ''}`;
    const patrimonioClass = officialTotal !== null ? 'ds-kpi--official' : 'ds-kpi--operational';
    const patrimonioBadge = officialTotal !== null ? '<span class="ds-badge ds-badge--official" style="margin-left:6px;font-size:9px">OFICIAL</span>' : '<span class="ds-badge ds-badge--operational" style="margin-left:6px;font-size:9px">OPERACIONAL</span>';

    // Card 2: RESULTADO DA CARTEIRA
    const capGainStatus = capitalGain.status;
    let resultadoLabel, resultadoValue, resultadoSub, resultadoClass, resultadoBadge;

    if (capGainStatus === 'CERTIFIED') {
      resultadoLabel = 'Resultado da carteira';
      resultadoValue = hideValues ? '—' : money(capitalGain.value);
      resultadoSub = `Ganho de capital certificado ${capitalGain.invested !== null ? `· Investido ${money(capitalGain.invested)}` : ''}`;
      resultadoClass = 'ds-kpi--official';
      resultadoBadge = '<span class="ds-badge ds-badge--official" style="margin-left:6px;font-size:9px">CERTIFICADO</span>';
    } else if (capGainStatus === 'PARTIAL') {
      resultadoLabel = 'Resultado da carteira';
      resultadoValue = '—';
      resultadoSub = `Parcial: ${capitalGain.note || 'base aplicada incompleta'}`;
      resultadoClass = 'ds-kpi--partial';
      resultadoBadge = '<span class="ds-badge ds-badge--partial" style="margin-left:6px;font-size:9px">PARCIAL</span>';
    } else {
      resultadoLabel = 'Resultado da carteira';
      resultadoValue = '—';
      resultadoSub = 'Sem base de custo certificada para ganho de capital';
      resultadoClass = 'ds-kpi--partial';
      resultadoBadge = '<span class="ds-badge ds-badge--partial" style="margin-left:6px;font-size:9px">PARCIAL</span>';
    }

    // Dividends breakdown (shown in tooltip or detail)
    const divSub = dividends.coverage === 'COMPLETE'
      ? `Recebidos 12M ${money(dividends.received12M)} · Média ${money(dividends.monthlyAvg)}`
      : dividends.coverage === 'PARTIAL'
        ? `Recebidos 12M ${money(dividends.received12M)} · Cobertura parcial (${dividends.completeMonths}/12 meses)`
        : 'Recebidos 12M — · Cobertura desconhecida';

    // Card 3: PROVENTOS
    const proventosValue = hideValues ? '—' : money(dividends.received12M);
    const proventosSub = divSub;
    const proventosClass = dividends.coverage === 'COMPLETE' ? 'ds-kpi--official' : 'ds-kpi--partial';
    const proventosBadge = dividends.coverage === 'COMPLETE' ? '<span class="ds-badge ds-badge--official" style="margin-left:6px;font-size:9px">COMPLETO</span>' : '<span class="ds-badge ds-badge--partial" style="margin-left:6px;font-size:9px">PARCIAL</span>';

    // Card 4: RENTABILIDADE
    let rentLabel, rentValue, rentSub, rentClass, rentBadge;
    if (rentabilidade.coverage === 'CERTIFIED' && rentabilidade.total !== null) {
      rentLabel = 'Rentabilidade total';
      rentValue = hideValues ? '—' : pct(rentabilidade.total);
      rentSub = `Desde o início · ${rentabilidade.benchmark ?? 'benchmark indisponível'} · ${rentabilidade.asOf?.slice(0,10) ?? 'data-base'}`;
      rentClass = 'ds-kpi--official';
      rentBadge = '<span class="ds-badge ds-badge--official" style="margin-left:6px;font-size:9px">CERTIFICADA</span>';
    } else if (rentabilidade.return12m !== null) {
      rentLabel = 'Rentabilidade 12M';
      rentValue = hideValues ? '—' : pct(rentabilidade.return12m);
      rentSub = `12 meses · ${rentabilidade.benchmark ?? 'benchmark indisponível'} · Cobertura parcial`;
      rentClass = 'ds-kpi--partial';
      rentBadge = '<span class="ds-badge ds-badge--partial" style="margin-left:6px;font-size:9px">PARCIAL</span>';
    } else {
      rentLabel = 'Rentabilidade';
      rentValue = '—';
      rentSub = 'Cobertura histórica insuficiente para cálculo certificado';
      rentClass = 'ds-kpi--partial';
      rentBadge = '<span class="ds-badge ds-badge--partial" style="margin-left:6px;font-size:9px">PARCIAL</span>';
    }

    // Build 4 cards
    const cards = [
      { label: patrimonioLabel, value: patrimonioValue, sub: patrimonioSub, class: patrimonioClass, badge: patrimonioBadge, icon: 'wallet' },
      { label: resultadoLabel, value: resultadoValue, sub: resultadoSub, class: resultadoClass, badge: resultadoBadge, icon: 'trend' },
      { label: 'Proventos 12M', value: proventosValue, sub: proventosSub, class: proventosClass, badge: proventosBadge, icon: 'cash' },
      { label: rentLabel, value: rentValue, sub: rentSub, class: rentClass, badge: rentBadge, icon: 'percent' }
    ];

    return `
    <section class="dashboard-executive-kpi-row" aria-label="KPIs executivos da carteira">
      ${cards.map(card => `
        <article class="dashboard-executive-kpi-card ${card.class}" aria-label="${esc(card.label)}">
          <div class="dashboard-executive-kpi-header">
            <span class="dashboard-executive-kpi-icon" aria-hidden="true">${card.icon === 'wallet' ? '💼' : card.icon === 'trend' ? '📈' : card.icon === 'cash' ? '💰' : '📊'}</span>
            <div class="dashboard-executive-kpi-title-row">
              <strong class="dashboard-executive-kpi-label">${esc(card.label)}${card.badge}</strong>
            </div>
          </div>
          <div class="dashboard-executive-kpi-value">${card.value}</div>
          <div class="dashboard-executive-kpi-sub">${esc(card.sub)}</div>
        </article>
      `).join('')}
    </section>`;
  }

  return { renderExecutiveKpiRow, getP1ATotals, getP1AGaps, getCapitalGain, getDividendsReceived, getRentabilidade };
});