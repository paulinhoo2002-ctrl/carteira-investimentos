'use strict';
// ============================================================================
// IR2026 — P11: deterministic same-day buy/sell (day trade) detection.
//
// The movement export is daily-granularity: any day with BOTH a BUY and a
// SELL of the same asset is a day-trade candidate for the matched quantity
// (B3/RFB definition: compra e venda do mesmo ativo no mesmo pregão).
// Classification is NEVER taken from the movement description. The engine's
// explicit CORP_DAY_TRADE overlay on raw events remains authoritative; this
// detector produces evidence lineage for the forensic matrix.
// ============================================================================

const { normalizeEvent } = require('./tax-ledger');

function detectDayTrade(rawEvents, fiscalYear) {
  const fy = fiscalYear || 0; // 0 = no year filter (all periods)
  const byDay = new Map();
  for (const raw of rawEvents) {
    if (!raw || !raw.DATE || !raw.TICKER) continue;
    if (raw.TYPE !== 'BUY' && raw.TYPE !== 'SELL') continue;
    if (fy && (raw.DATE < `${fy}-01-01` || raw.DATE >= `${fy + 1}-01-01`)) continue;
    const ev = normalizeEvent(raw);
    const key = `${ev.DATE}|${ev.ASSET}`;
    if (!byDay.has(key)) byDay.set(key, { DATE: ev.DATE, ASSET: ev.ASSET, BUYS: [], SELLS: [] });
    const day = byDay.get(key);
    (ev.TYPE === 'BUY' ? day.BUYS : day.SELLS).push(ev);
  }
  const dayTradeDays = [];
  const sellClassification = new Map(); // SELL event id -> 'DAY_TRADE_CANDIDATE'
  for (const day of [...byDay.values()].sort((a, b) => (a.DATE + a.ASSET) < (b.DATE + b.ASSET) ? -1 : 1)) {
    if (!day.BUYS.length || !day.SELLS.length) continue;
    const buyQty = day.BUYS.reduce((s, e) => s + (e.QTY || 0), 0);
    const sellQty = day.SELLS.reduce((s, e) => s + (e.QTY || 0), 0);
    const matched = Math.min(buyQty, sellQty);
    if (matched <= 0) continue;
    dayTradeDays.push({
      DATE: day.DATE,
      ASSET: day.ASSET,
      BUY_QTY: buyQty,
      SELL_QTY: sellQty,
      MATCHED_QTY: matched,
      BUY_EVENT_IDS: day.BUYS.map((e) => e.EVENT_ID),
      SELL_EVENT_IDS: day.SELLS.map((e) => e.EVENT_ID),
      GRANULARITY: 'DAILY',
      STATUS: 'DAY_TRADE_DETECTED',
      NOTE: 'Same-day buy+sell from daily export; matched qty is day-trade candidate. Engine CORP_DAY_TRADE overlay remains authoritative.',
    });
    for (const s of day.SELLS) sellClassification.set(s.EVENT_ID, 'DAY_TRADE_CANDIDATE');
  }
  return {
    FISCAL_YEAR: fy || null,
    DAY_TRADE_DAYS: dayTradeDays,
    sellClassification,
  };
}

module.exports = { detectDayTrade };
