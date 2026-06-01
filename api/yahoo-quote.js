export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const raw = String(req.query.symbols || req.query.tickers || '').trim();

    if (!raw) {
      return res.status(400).json({ error: 'Informe symbols=PETR4,MXRF11' });
    }

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

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(uniq.join(','))}&lang=pt-BR&region=BR`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Falha ao consultar Yahoo Finance',
        status: response.status
      });
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result || [];

    return res.status(200).json({
      source: 'yahoo',
      requested: uniq,
      count: results.length,
      results
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno ao buscar cotações Yahoo',
      message: error?.message || String(error)
    });
  }
}
