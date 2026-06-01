export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  };

  try {
    const raw = String(req.query.symbols || req.query.tickers || '').trim();
    if (!raw) return res.status(400).json({ error: 'Informe symbols=PETR4,MXRF11' });

    const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      .map(s => (s.startsWith('^') || s.includes('.')) ? s : `${s}.SA`);
    const uniq = [...new Set(symbols)].slice(0, 50);

    // ── Modo dividendos históricos ──────────────────────────
    if (req.query.dividends === 'true') {
      const range = req.query.range || '2y';
      const dividendResults = {};

      await Promise.all(uniq.map(async (sym) => {
        const ticker = sym.replace('.SA', '').toUpperCase();
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?events=dividends&range=${range}&interval=1d`;
          const r = await fetch(url, { headers: HEADERS });
          if (!r.ok) return;
          const j = await r.json();
          const divs = j?.chart?.result?.[0]?.events?.dividends;
          if (divs && Object.keys(divs).length > 0) {
            dividendResults[ticker] = Object.values(divs)
              .map(d => ({
                date: d.date,          // unix timestamp (segundos)
                amount: Number(d.amount) || 0,
                ticker
              }))
              .filter(d => d.amount > 0)
              .sort((a, b) => b.date - a.date);
          }
        } catch (_) {}
      }));

      return res.status(200).json({
        source: 'yahoo-dividends',
        count: Object.keys(dividendResults).length,
        dividends: dividendResults
      });
    }

    // ── Modo cotações (padrão) ───────────────────────────────
    const encoded = encodeURIComponent(uniq.join(','));
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}&lang=pt-BR&region=BR&corsDomain=finance.yahoo.com`;

    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falha Yahoo Finance', status: response.status });
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result || [];
    const bySymbol = new Map(results.map(r => [String(r.symbol || '').toUpperCase(), r]));

    // Fallback: chart API para ativos sem preço
    await Promise.all(uniq.map(async (sym) => {
      const key = String(sym).toUpperCase();
      const current = bySymbol.get(key);
      if (current && Number(current.regularMarketPrice) > 0) return;
      try {
        const cr = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1m`,
          { headers: HEADERS }
        );
        if (!cr.ok) return;
        const cj = await cr.json();
        const meta = cj?.chart?.result?.[0]?.meta || {};
        const price = Number(meta.regularMarketPrice || meta.previousClose || 0);
        if (price > 0) {
          const patch = current || { symbol: sym };
          patch.regularMarketPrice = price;
          patch.regularMarketChangePercent = Number(meta.regularMarketChangePercent || 0);
          patch.currency = meta.currency || 'BRL';
          bySymbol.set(key, patch);
        }
      } catch (_) {}
    }));

    return res.status(200).json({
      source: 'yahoo',
      count: bySymbol.size,
      results: [...bySymbol.values()]
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno',
      message: error?.message || String(error)
    });
  }
}
