// Fixture 100% sintética da V17: estende a fixture rica com títulos de Renda Fixa em situações distintas
// (lucro, prejuízo, zero legítimo, sem valor atual, vencido e a vencer). Nenhum valor representa carteira real.
const { applyRichFixture } = require('./fp-rich-fixture');

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

function syntheticRfTitles() {
  const base = { type: 'Renda Fixa', asset_type: 'Renda Fixa', qty: 1, rf_ir_iof: 0, rf_unavailable_value: 0, rf_application_date: iso(-420) };
  return [
    { ...base, id: 'QA_RF_LUCRO', ticker: 'QARFL01', name: 'CDB sintético lucro', product: 'CDB sintético lucro', subtype: 'CDB', rf_subtype: 'CDB', institution: 'Banco Sintético Alfa', rf_contract_rate: '110% CDI', rf_applied_value: 12000, rf_liquid_value: 13250, rf_gross_value: 13250, appliedValue: 12000, currentValue: 13250, rf_maturity_date: iso(540) },
    { ...base, id: 'QA_RF_PREJU', ticker: 'QARFP01', name: 'CDB sintético prejuízo', product: 'CDB sintético prejuízo', subtype: 'CDB', rf_subtype: 'CDB', institution: 'Banco Sintético Beta', rf_contract_rate: 'IPCA + 6%', rf_applied_value: 5000, rf_liquid_value: 4880, rf_gross_value: 4880, appliedValue: 5000, currentValue: 4880, rf_maturity_date: iso(900) },
    { ...base, id: 'QA_RF_ZERO', ticker: 'QARFZ01', name: 'Tesouro sintético zero', product: 'Tesouro sintético zero', subtype: 'Tesouro Direto', rf_subtype: 'Tesouro Direto', rf_applied_value: 3000, rf_liquid_value: 3000, rf_gross_value: 3000, appliedValue: 3000, currentValue: 3000, rf_maturity_date: iso(1500) },
    { ...base, id: 'QA_RF_DESC', ticker: 'QARFD01', name: 'LCI sintética sem valor atual', product: 'LCI sintética sem valor atual', subtype: 'LCI', rf_subtype: 'LCI', institution: 'Banco Sintético Gama', rf_applied_value: 8000, rf_liquid_value: 0, rf_gross_value: 0, appliedValue: 8000, rf_maturity_date: iso(300) },
    { ...base, id: 'QA_RF_VENC', ticker: 'QARFV01', name: 'CDB sintético vencido', product: 'CDB sintético vencido', subtype: 'CDB', rf_subtype: 'CDB', institution: 'Banco Sintético Delta', rf_contract_rate: '100% CDI', rf_applied_value: 2000, rf_liquid_value: 2310, rf_gross_value: 2310, appliedValue: 2000, currentValue: 2310, rf_maturity_date: iso(-12) },
    { ...base, id: 'QA_RF_SOON', ticker: 'QARFS01', name: 'LCA sintética a vencer', product: 'LCA sintética a vencer', subtype: 'LCA', rf_subtype: 'LCA', institution: 'Banco Sintético Alfa', rf_contract_rate: '92% CDI', rf_applied_value: 6000, rf_liquid_value: 6420, rf_gross_value: 6420, appliedValue: 6000, currentValue: 6420, rf_maturity_date: iso(18) },
  ];
}

async function applyV17Fixture(page) {
  await applyRichFixture(page);
  await page.evaluate(titles => {
    const copy = value => JSON.parse(JSON.stringify(value));
    const keep = S.assets.filter(asset => asset.type !== 'Renda Fixa');
    S.assets = [...keep, ...copy(titles)];
    const wallet = S.wallets && S.wallets[0];
    if (wallet) wallet.assets = copy(S.assets);
    render();
  }, syntheticRfTitles());
}

module.exports = { applyV17Fixture, syntheticRfTitles };
