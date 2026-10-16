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
      updatedAt: new Date().toISOString(),
      updatedAtLocal: new Date().toISOString(),
    };
  }

  /** Generate a synthetic IRPF demo state (clearly different from real blocked state). */
  function generateDemoIrpfState() {
    return {
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

  /** Verify no real UID, real asset data, or real portfolio hash appears. */
  function assertDemoSafety(data) {
    const json = JSON.stringify(data);
    const FORBIDDEN_UID = 'yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3';
    const FORBIDDEN_TICKERS = ['BBAS3','BRCO11','BTLG11','CMIG4','FATN11','GARE11','GGRC11','HGLG11',
      'HGRU11','IRIM11','ITUB4','KNHF11','KNRI11','KNUQ11','MCCI11','PETR4','PMLL11','PVBI11','RBRY11',
      'SAPR11','SUZB3','TEPP11','TGAR11','TRXF11','VALE3','VGHF11','VGIP11','VISC11','VRTA11','XPLG11','XPML11'];
    if (json.includes(FORBIDDEN_UID)) throw new Error('DEMO SAFETY: real UID detected');
    for (const t of FORBIDDEN_TICKERS) {
      if (json.includes(t)) throw new Error(`DEMO SAFETY: real ticker ${t} detected`);
    }
    if (json.includes('361023')) throw new Error('DEMO SAFETY: real financial value detected');
    if (json.includes('569316')) throw new Error('DEMO SAFETY: real financial value detected');
    // P31 — real artifact leakage guard: production doc ids, hosted project,
    // private filenames and evidence directories never enter demo state.
    const FORBIDDEN_PATTERNS = [
      'movimentacao-2026', 'posicao-2026', 'PosicaoDetalhada',
      'package1_v2', 'package2_v2', 'carteira-de-investimento-16725',
      '_backups', '.qa-state',
    ];
    for (const p of FORBIDDEN_PATTERNS) {
      if (json.includes(p)) throw new Error(`DEMO SAFETY: real artifact pattern ${p} detected`);
    }
    return true;
  }

  return { generateDemoPortfolio, generateDemoIrpfState, assertDemoSafety };
});
