'use strict';

(function exposeMarketData2(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MarketData2 = api;
})(typeof globalThis === 'object' ? globalThis : this, function createMarketData2() {
  const STATUS = Object.freeze({ FRESH: 'FRESH', DELAYED: 'DELAYED', STALE: 'STALE', UNKNOWN: 'UNKNOWN', ERROR: 'ERROR' });
  const text = value => String(value ?? '').trim();
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const timestamp = value => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    const raw = finite(value);
    if (raw !== null && raw > 0) return raw < 1e12 ? raw * 1000 : raw;
    const parsed = Date.parse(text(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  function freshness({ marketTime, fetchedAt, status = 'OK' } = {}, { now = Date.now(), delayedAfterMs = 15 * 60 * 1000, staleAfterMs = 24 * 60 * 60 * 1000 } = {}) {
    const market = timestamp(marketTime);
    const fetched = timestamp(fetchedAt);
    if (String(status).toUpperCase() === 'ERROR') return { status: STATUS.ERROR, marketTime: market, fetchedAt: fetched, ageMs: null, reason: 'A fonte retornou erro.' };
    if (!market && !fetched) return { status: STATUS.UNKNOWN, marketTime: null, fetchedAt: null, ageMs: null, reason: 'A fonte não informou data confiável.' };
    const ageMs = Math.max(0, now - (market || fetched));
    const state = ageMs > staleAfterMs ? STATUS.STALE : ageMs > delayedAfterMs ? STATUS.DELAYED : STATUS.FRESH;
    return { status: state, marketTime: market, fetchedAt: fetched, ageMs, reason: state === STATUS.STALE ? 'Última cotação conhecida está desatualizada.' : state === STATUS.DELAYED ? 'Cotação recebida com atraso operacional.' : 'Cotação dentro da janela operacional.' };
  }

  function normalizeQuote(raw = {}, { ticker = raw.symbol, now = Date.now(), fallbackUsed = false, fallbackSource = '' } = {}) {
    const symbol = text(ticker || raw.ticker || raw.symbol).replace(/\.SA$/i, '').toUpperCase();
    const price = finite(raw.price ?? raw.regularMarketPrice ?? raw.postMarketPrice ?? raw.preMarketPrice ?? raw.regularMarketPreviousClose);
    const marketTime = raw.marketTime ?? raw.regularMarketTime ?? raw.postMarketTime ?? raw.preMarketTime ?? raw.timestamp;
    const fetchedAt = raw.fetchedAt || raw.quoteFetchedAt || new Date(now).toISOString();
    const source = text(raw.source || raw.provider || raw.sourceProvider || (fallbackUsed ? fallbackSource : 'UNKNOWN')) || 'UNKNOWN';
    const valid = price !== null && price > 0;
    const freshnessState = freshness({ marketTime, fetchedAt, status: valid ? 'OK' : 'ERROR' }, { now });
    return {
      ticker: symbol,
      price: valid ? price : null,
      currency: text(raw.currency || 'BRL') || 'BRL',
      source,
      marketTime: freshnessState.marketTime,
      fetchedAt: freshnessState.fetchedAt,
      status: valid ? freshnessState.status : STATUS.ERROR,
      freshness: freshnessState,
      fallbackUsed: Boolean(fallbackUsed),
      fallbackSource: text(fallbackSource),
      lastKnownGood: false,
      error: valid ? '' : text(raw.error || 'COTAÇÃO_INDISPONÍVEL'),
    };
  }

  function createCoordinator({ providers = [], fetchImpl = globalThis.fetch, now = () => Date.now(), staleAfterMs, delayedAfterMs } = {}) {
    const cache = new Map();
    const inflight = new Map();
    const list = Array.isArray(providers) ? providers.filter(Boolean) : [];
    const request = ticker => {
      const symbol = text(ticker).toUpperCase();
      if (!symbol) return Promise.resolve(normalizeQuote({ error: 'TICKER_AUSENTE' }, { ticker: symbol, now: now() }));
      if (inflight.has(symbol)) return inflight.get(symbol);
      const work = (async () => {
        let lastError = '';
        for (const provider of list) {
          try {
            const raw = await provider.getQuote(symbol, { fetchImpl });
            const quote = normalizeQuote(raw, { ticker: symbol, now: now(), fallbackUsed: provider.rank > 1, fallbackSource: provider.name });
            if (quote.price !== null) { cache.set(symbol, quote); return quote; }
            lastError = quote.error;
          } catch (error) { lastError = text(error?.message || error); }
        }
        const previous = cache.get(symbol);
        if (previous?.price !== null) return { ...previous, lastKnownGood: true, status: STATUS.STALE, freshness: { ...previous.freshness, status: STATUS.STALE, reason: 'Fonte indisponível; mantendo última cotação válida.' }, error: lastError };
        return normalizeQuote({ ticker: symbol, error: lastError || 'FONTE_INDISPONÍVEL' }, { ticker: symbol, now: now() });
      })();
      inflight.set(symbol, work);
      return work.finally(() => inflight.delete(symbol));
    };
    return Object.freeze({
      getQuote: request,
      getQuotes: tickers => Promise.all([...new Set((tickers || []).map(text).filter(Boolean))].map(request)),
      cache,
      inflight,
      status: quote => quote?.status || STATUS.UNKNOWN,
    });
  }

  function statusLabel(status) {
    return ({ FRESH: 'Atualizado', DELAYED: 'Com atraso', STALE: 'Desatualizado', UNKNOWN: 'Data desconhecida', ERROR: 'Fonte indisponível' })[status] || 'Fonte indisponível';
  }

  return Object.freeze({ STATUS, freshness, normalizeQuote, createCoordinator, statusLabel });
});
