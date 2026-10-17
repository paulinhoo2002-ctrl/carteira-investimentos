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

module.exports = { detectDayTrade, buildDayTradeMatchGroups };

// ---------------------------------------------------------------------------
// P11 — exact day-trade match groups: same asset, same day, buy/sell offset,
// partial quantities, multiple fills. FIFO within the day (deterministic).
// UNMATCHED_INTRADAY_QTY is sell quantity on a day-trade day that exceeds
// same-day buys (swing remainder held from prior days).
// ---------------------------------------------------------------------------
function buildDayTradeMatchGroups(rawEvents, fiscalYear) {
  const fy = fiscalYear || 0;
  const days = new Map(); // DATE|ASSET -> {BUYS:[], SELLS:[]}
  for (const raw of rawEvents || []) {
    if (!raw || !raw.DATE || !raw.TICKER) continue;
    if (raw.TYPE !== 'BUY' && raw.TYPE !== 'SELL') continue;
    if (fy && (raw.DATE < `${fy}-01-01` || raw.DATE >= `${fy + 1}-01-01`)) continue;
    const key = `${raw.DATE}|${raw.TICKER}`;
    if (!days.has(key)) days.set(key, { DATE: raw.DATE, ASSET: raw.TICKER, BUYS: [], SELLS: [] });
    (raw.TYPE === 'BUY' ? days.get(key).BUYS : days.get(key).SELLS).push(raw);
  }
  const groups = [];
  for (const day of [...days.values()].sort((a, b) => (a.DATE + a.ASSET) < (b.DATE + b.ASSET) ? -1 : 1)) {
    if (!day.BUYS.length || !day.SELLS.length) continue; // pure swing day
    const buys = [...day.BUYS].sort((a, b) => String(a.CANONICAL_ID) < String(b.CANONICAL_ID) ? -1 : 1);
    const sells = [...day.SELLS].sort((a, b) => String(a.CANONICAL_ID) < String(b.CANONICAL_ID) ? -1 : 1);
    let bi = 0;
    let buyRemain = buys[0] ? buys[0].QUANTITY || 0 : 0;
    const matches = [];
    for (const sell of sells) {
      let sellRemain = sell.QUANTITY || 0;
      while (sellRemain > 0 && bi < buys.length) {
        const take = Math.min(sellRemain, buyRemain);
        if (take > 0) {
          matches.push({
            BUY_EVENT_ID: buys[bi].CANONICAL_ID,
            SELL_EVENT_ID: sell.CANONICAL_ID,
            MATCHED_QTY: take,
            BUY_AMOUNT: buys[bi].AMOUNT ?? null,
            SELL_AMOUNT: sell.AMOUNT ?? null,
          });
          sellRemain -= take;
          buyRemain -= take;
        }
        if (buyRemain <= 0) {
          bi += 1;
          if (bi < buys.length) buyRemain = buys[bi].QUANTITY || 0;
          else break;
        }
      }
      if (sellRemain > 0) matches.push({ SELL_EVENT_ID: sell.CANONICAL_ID, UNMATCHED_INTRADAY_QTY: sellRemain, SELL_AMOUNT: sell.AMOUNT ?? null, NOTE: 'Swing remainder: sold more than same-day buys' });
    }
    if (buyRemain > 0 && bi < buys.length) {
      matches.push({ BUY_EVENT_ID: buys[bi].CANONICAL_ID, UNMATCHED_INTRADAY_QTY: buyRemain, NOTE: 'Buy remainder stays in position (no day-trade sell counterpart)' });
    }
    const matchedTotal = matches.reduce((s, m) => s + (m.MATCHED_QTY || 0), 0);
    const unmatchedSell = matches.reduce((s, m) => s + (m.UNMATCHED_INTRADAY_QTY && m.SELL_EVENT_ID ? m.UNMATCHED_INTRADAY_QTY : 0), 0);
    groups.push({
      DATE: day.DATE,
      ASSET: day.ASSET,
      BUY_EVENT_IDS: buys.map((b) => b.CANONICAL_ID),
      SELL_EVENT_IDS: sells.map((s) => s.CANONICAL_ID),
      MATCHED_QTY: matchedTotal,
      UNMATCHED_INTRADAY_QTY: unmatchedSell,
      MATCHES: matches,
      STATUS: unmatchedSell > 0 ? 'DAY_TRADE_PARTIAL_WITH_SWING_REMAINDER' : 'DAY_TRADE_EXACT',
      GRANULARITY: 'DAILY',
    });
  }
  return { FISCAL_YEAR: fy || null, DAY_TRADE_MATCH_GROUPS: groups };
}
