export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const allowedOrigins = new Set([
    'https://carteira-investimentos-delta.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ]);
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  const hasOrigin = Boolean(origin);
  const isAllowedOrigin = hasOrigin && allowedOrigins.has(origin);

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (hasOrigin && !isAllowedOrigin) return res.status(204).end();
    if (isAllowedOrigin) {
      return res.status(204).end();
    }
    return res.status(204).end();
  }

  if (hasOrigin && !isAllowedOrigin) {
    return res.status(403).json({ error: 'Origin nao permitida' });
  }

  try {
    const raw = String(req.query.symbols || req.query.tickers || '').trim();
    if (!raw) return res.status(400).json({ error: 'Informe symbols=PETR4,MXRF11' });

    const symbols = raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .map((s) => {
        if (s.startsWith('^')) return s;
        if (s.includes('.')) return s;
        return `${s}.SA`;
      });

    const uniq = [...new Set(symbols)].slice(0, 50);
    const wantsDividends = String(req.query.dividends || req.query.events || '').toLowerCase();
    if (wantsDividends === '1' || wantsDividends === 'true' || wantsDividends.includes('div')) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      };
      const start = Number(req.query.period1) || Math.floor(new Date('2018-01-01T00:00:00Z').getTime() / 1000);
      const end = Number(req.query.period2) || Math.floor(Date.now() / 1000);
      const results = [];

      await Promise.all(uniq.map(async (sym) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${start}&period2=${end}&interval=1mo&events=div%7Csplits`;
          const response = await fetch(url, { headers });
          if (!response.ok) return;
          const data = await response.json();
          const events = data?.chart?.result?.[0]?.events?.dividends || {};
          Object.values(events).forEach((item) => {
            const amount = Number(item.amount || 0);
            const date = Number(item.date || 0);
            if (amount > 0 && date > 0) results.push({ symbol: sym, amount, date });
          });
        } catch (_) {}
      }));

      results.sort((a, b) => b.date - a.date || String(a.symbol).localeCompare(String(b.symbol)));
      return res.status(200).json({ source: 'yahoo-dividends', requested: uniq, count: results.length, results });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };

    let results = [];
    try {
      const encoded = encodeURIComponent(uniq.join(','));
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}&lang=pt-BR&region=BR&corsDomain=finance.yahoo.com`;
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        results = data?.quoteResponse?.result || [];
      }
    } catch (_) {}

    // Fallback: para qualquer ativo sem regularMarketPrice, tenta chart v8 do Yahoo.
    const bySymbol = new Map(results.map((r) => [String(r.symbol || '').toUpperCase(), r]));
    await Promise.all(uniq.map(async (sym) => {
      const key = String(sym).toUpperCase();
      const current = bySymbol.get(key);
      if (current && Number(current.regularMarketPrice) > 0) return;
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1m`;
        const cr = await fetch(chartUrl, { headers });
        if (!cr.ok) return;
        const cj = await cr.json();
        const meta = cj?.chart?.result?.[0]?.meta || {};
        const price = Number(meta.regularMarketPrice || meta.previousClose || 0);
        if (price > 0) {
          const patch = current || { symbol: sym };
          const previousClose = Number(meta.previousClose || patch.regularMarketPreviousClose || 0);
          const changePercent = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
          patch.regularMarketPrice = price;
          patch.regularMarketPreviousClose = previousClose || patch.regularMarketPreviousClose;
          patch.regularMarketChangePercent = Number(meta.regularMarketChangePercent || patch.regularMarketChangePercent || changePercent || 0);
          patch.regularMarketTime = meta.regularMarketTime || patch.regularMarketTime;
          patch.currency = meta.currency || patch.currency || 'BRL';
          bySymbol.set(key, patch);
        }
      } catch (_) {}
    }));

    return res.status(200).json({ source: 'yahoo', requested: uniq, count: bySymbol.size, results: [...bySymbol.values()] });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao buscar cotações Yahoo', message: error?.message || String(error) });
  }
}
