export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
    const encoded = encodeURIComponent(uniq.join(','));
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}&lang=pt-BR&region=BR&corsDomain=finance.yahoo.com`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falha ao consultar Yahoo Finance', status: response.status });
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result || [];

    // Fallback: para qualquer ativo sem regularMarketPrice, tenta chart v8 do Yahoo.
    const bySymbol = new Map(results.map((r) => [String(r.symbol || '').toUpperCase(), r]));
    await Promise.all(uniq.map(async (sym) => {
      const key = String(sym).toUpperCase();
      const current = bySymbol.get(key);
      if (current && Number(current.regularMarketPrice) > 0) return;
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1m`;
        const cr = await fetch(chartUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        if (!cr.ok) return;
        const cj = await cr.json();
        const meta = cj?.chart?.result?.[0]?.meta || {};
        const price = Number(meta.regularMarketPrice || meta.previousClose || 0);
        if (price > 0) {
          const patch = current || { symbol: sym };
          patch.regularMarketPrice = price;
          patch.regularMarketChangePercent = Number(meta.regularMarketChangePercent || patch.regularMarketChangePercent || 0);
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
