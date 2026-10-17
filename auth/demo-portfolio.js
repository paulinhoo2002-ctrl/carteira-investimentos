'use strict';

/**
 * Completely synthetic demo portfolio fixture.
 * NO numbers derived from any real portfolio. All values are fictional.
 * Used exclusively by the DEMO mode (LOCAL_ONLY, never Firestore).
 */
(function exposeDemoPortfolio(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DemoPortfolio = api;
})(typeof globalThis === 'object' ? globalThis : this, function createDemoPortfolio(){

  // Synthetic fixture provenance marker — required at the root of every
  // demo fixture; the privacy guard enforces it (P3 contract).
  const DEMO_FIXTURE_SOURCE = 'SYNTHETIC_DEMO_V1';

  function generateDemoPortfolio() {
    return {
      activeWalletId: 'demo-wallet-001',
      wallets: [{
        id: 'demo-wallet-001',
        name: 'Carteira Demonstração',
        assets: [
          // Ações (stocks)
          { id: 1, ticker: 'DEMO3', type: 'Ação', sector: 'Bancos', qty: 200, avg_price: 25.50, current_price: 28.90, dy: 3.2 },
          { id: 2, ticker: 'DEMO4', type: 'Ação', sector: 'Energia', qty: 150, avg_price: 42.00, current_price: 38.75, dy: 5.1 },
          { id: 3, ticker: 'DEMOJ3', type: 'Ação', sector: 'Varejo', qty: 500, avg_price: 8.75, current_price: 9.20, dy: 0 },
          // FIIs
          { id: 4, ticker: 'DEMOF11', type: 'FII', sector: 'Lajes Corporativas', qty: 100, avg_price: 95.00, current_price: 98.50, dy: 8.5 },
          { id: 5, ticker: 'DEMOL11', type: 'FII', sector: 'Logística', qty: 80, avg_price: 110.00, current_price: 105.00, dy: 7.2 },
          { id: 6, ticker: 'DEMOT11', type: 'FII', sector: 'Torres Telecom', qty: 60, avg_price: 88.00, current_price: 92.00, dy: 9.1 },
          // Renda Fixa
          { id: 7, ticker: 'CDB-DEMO-001', type: 'Renda Fixa', sector: 'CDB 105% CDI', qty: 1, avg_price: 10000.00, current_price: 10480.00, rf_subtype: 'CDB', rf_maturity: '2027-06-15', rf_rate: '105% CDI' },
          { id: 8, ticker: 'TESOURO-DEMO-2029', type: 'Renda Fixa', sector: 'IPCA+ 6.5%', qty: 1, avg_price: 3500.00, current_price: 3690.00, rf_subtype: 'Tesouro IPCA+', rf_maturity: '2029-05-15', rf_rate: 'IPCA+ 6.5%' },
          { id: 9, ticker: 'LIG-DEMO-001', type: 'Renda Fixa', sector: 'LIG 90% CDI', qty: 1, avg_price: 5000.00, current_price: 5120.00, rf_subtype: 'LIG', rf_maturity: '2027-01-10', rf_rate: '90% CDI' },
        ],
      }],
      aportes: [
        { id: 1, date: '2026-01-15', walletId: 'demo-wallet-001', amount: 5000, note: 'Aporte inicial demo' },
        { id: 2, date: '2026-03-20', walletId: 'demo-wallet-001', amount: 3000, note: 'Aporte março demo' },
        { id: 3, date: '2026-06-10', walletId: 'demo-wallet-001', amount: 2000, note: 'Aporte junho demo' },
      ],
      proventos: [
        { id: 1, date: '2026-01-31', ticker: 'DEMO3', type: 'Dividendo', amount: 120.00, walletId: 'demo-wallet-001' },
        { id: 2, date: '2026-02-28', ticker: 'DEMOF11', type: 'Rendimento', amount: 82.08, walletId: 'demo-wallet-001' },
        { id: 3, date: '2026-03-31', ticker: 'DEMO3', type: 'Dividendo', amount: 120.00, walletId: 'demo-wallet-001' },
        { id: 4, date: '2026-04-30', ticker: 'DEMOL11', type: 'Rendimento', amount: 63.36, walletId: 'demo-wallet-001' },
        { id: 5, date: '2026-05-31', ticker: 'DEMOF11', type: 'Rendimento', amount: 82.08, walletId: 'demo-wallet-001' },
        { id: 6, date: '2026-06-30', ticker: 'DEMO4', type: 'JCP', amount: 45.00, walletId: 'demo-wallet-001' },
        { id: 7, date: '2026-07-31', ticker: 'DEMOT11', type: 'Rendimento', amount: 45.50, walletId: 'demo-wallet-001' },
        { id: 8, date: '2026-08-31', ticker: 'DEMO3', type: 'Dividendo', amount: 120.00, walletId: 'demo-wallet-001' },
        { id: 9, date: '2026-09-30', ticker: 'DEMOF11', type: 'Rendimento', amount: 82.08, walletId: 'demo-wallet-001' },
      ],
      goals: [
        { id: 1, name: 'Reserva de emergência', target: 30000, current: 18560, deadline: '2027-12-31', walletId: 'demo-wallet-001' },
        { id: 2, name: 'Independência financeira', target: 100000, current: 18560, deadline: '2035-12-31', walletId: 'demo-wallet-001' },
      ],
      dashboard: { period: '12m', type: 'patrimonio' },
      divGoal: { monthlyTarget: 500, walletId: 'demo-wallet-001' },
      settings: { theme: 'dark', currency: 'BRL', locale: 'pt-BR' },
      rentabilidade: { benchmark: 'IBOV', period: '12m' },
      fixtureSource: DEMO_FIXTURE_SOURCE,
      updatedAt: new Date().toISOString(),
      updatedAtLocal: new Date().toISOString(),
    };
  }

  /** Generate a synthetic IRPF demo state (clearly different from real blocked state). */
  function generateDemoIrpfState() {
    return {
      fixtureSource: DEMO_FIXTURE_SOURCE,
      status: 'DEMONSTRATIVO',
      label: 'Dados fictícios',
      taxDue: 'Não calculado (demo)',
      openingQty: { certified: 0, partial: 9, unknown: 0 },
      openingCost: { certified: 0, partial: 9, unknown: 0 },
      sales: { analyzed: 2, certified: 1, blocked: 1 },
      rules: { total: 26, certified: 8, partial: 12, needsMoreSource: 6 },
      explanation: 'Este é um estado fictício de demonstração do IRPF. Nenhum cálculo real de imposto é realizado.',
    };
  }

  /**
   * Generic demo privacy guard — NO real identifiers are embedded here.
   * Safety comes from invariants, not from denylists of private values:
   *   1. synthetic provenance marker (SYNTHETIC_DEMO_V1) required at root;
   *   2. every ticker-like value must carry the DEMO synthetic namespace;
   *   3. identity fields (uid/userId/owner*) must be absent or DEMO-marked;
   *   4. UID-shaped tokens (28 alnum) and 64-hex hash-like tokens rejected;
   *   5. hosted document path shapes rejected;
   *   6. production artifact shapes rejected (package fields, private
   *      evidence paths, private export filename SHAPES);
   *   7. production project identifiers arrive ONLY via the configuration
   *      boundary (config.forbiddenProjectIds) — never hardcoded.
   */
  function assertDemoSafety(data, config) {
    if (!data || typeof data !== 'object') throw new Error('DEMO SAFETY: fixture must be an object');
    if (data.fixtureSource !== DEMO_FIXTURE_SOURCE) {
      throw new Error('DEMO SAFETY: missing synthetic provenance marker ' + DEMO_FIXTURE_SOURCE);
    }
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      for (const [key, value] of Object.entries(node)) {
        const k = key.toLowerCase();
        if (/^(ticker|asset|ativo)$/.test(k) && typeof value === 'string' && !/DEMO/i.test(value)) {
          throw new Error('DEMO SAFETY: non-synthetic asset namespace for "' + key + '"');
        }
        if (/^(uid|userid|owneruid|ownerid)$/.test(k)) {
          if (value !== null && value !== undefined && !/DEMO/i.test(String(value))) {
            throw new Error('DEMO SAFETY: identity field "' + key + '" must be absent or DEMO-marked');
          }
        }
        walk(value);
      }
    };
    walk(data);
    const json = JSON.stringify(data);
    if (/\b[A-Za-z0-9]{28}\b/.test(json)) throw new Error('DEMO SAFETY: UID-shaped identity token detected');
    if (/\b[0-9a-fA-F]{64}\b/.test(json)) throw new Error('DEMO SAFETY: hosted hash-like token detected');
    if (/projects\/[^/]+\/databases/.test(json) || /\/(portfolios|users|authorizedUsers)\/[A-Za-z0-9]{10,}/.test(json)) {
      throw new Error('DEMO SAFETY: hosted document path detected');
    }
    if (/package1_v2|package2_v2/.test(json)) throw new Error('DEMO SAFETY: production package field detected');
    if (/\.qa-state|_backups/.test(json)) throw new Error('DEMO SAFETY: private evidence path detected');
    if (/(movimentacao|posicao|extrato)-\d{4}-\d{2}/i.test(json) || /posicao\s*detalhada/i.test(json)) {
      throw new Error('DEMO SAFETY: private export filename shape detected');
    }
    const projectIds = (config && config.forbiddenProjectIds) || [];
    for (const pid of projectIds) {
      if (pid && json.includes(pid)) throw new Error('DEMO SAFETY: production project identifier detected');
    }
    return true;
  }

  return { DEMO_FIXTURE_SOURCE, generateDemoPortfolio, generateDemoIrpfState, assertDemoSafety };
});
