const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const FinanceCore = require('../finance-core.js');

function oracleRfValues(a){
  const qty=Number(a?.qty)||0;
  const avg=Number(a?.avg_price)||0;
  const currentStored=Number(a?.current_price)||0;
  const appliedRaw=Number(a?.rf_applied_value ?? a?.fixed_initial_value ?? a?.appliedValue ?? a?.initialValue ?? 0)||0;
  const grossRaw=Number(a?.rf_gross_value ?? a?.fixed_gross_value ?? a?.marketValue ?? a?.currentValue ?? 0)||0;
  const liquidRaw=Number(a?.rf_liquid_value ?? a?.fixed_current_value ?? a?.liquidValue ?? 0)||0;
  const irIof=Number(a?.rf_ir_iof ?? a?.ir_iof ?? a?.iriof ?? 0)||0;
  const unavailable=Number(a?.rf_unavailable_value ?? a?.unavailableValue ?? 0)||0;
  const manualProfitRaw=a?.rf_profit_value;
  const manualProfitSource=String(a?.rf_profit_source || '').toLowerCase();
  const fixedInitial=Number(a?.fixed_initial_value)||0;
  const fixedCurrent=Number(a?.fixed_current_value)||0;
  const fixedGross=Number(a?.fixed_gross_value)||0;
  const applied=appliedRaw>0 ? appliedRaw : fixedInitial>0 ? fixedInitial : qty*avg;
  const liquidCandidate=liquidRaw>0 ? liquidRaw : fixedCurrent>0 ? fixedCurrent : currentStored>0 ? currentStored : 0;
  const grossCandidate=grossRaw>0 ? grossRaw : fixedGross>0 ? fixedGross : 0;
  const current=liquidCandidate>0 ? liquidCandidate : grossCandidate>0 ? grossCandidate : (applied>0 ? applied : null);
  const hasExplicitCurrent=liquidCandidate>0 || grossCandidate>0 || fixedCurrent>0 || (currentStored>0 && Math.abs(currentStored-applied) > 0.0001);
  const derivedProfit=Number.isFinite(current) && applied>0 ? current-applied : null;
  const hasManualProfit=manualProfitRaw!==undefined && manualProfitRaw!==null && String(manualProfitRaw).trim()!=='' && manualProfitSource!=='derived';
  const profit=hasManualProfit ? Number(manualProfitRaw)||0 : derivedProfit;
  const rentab=(Number.isFinite(profit) && applied>0) ? (profit/applied)*100 : null;
  return { qty, avg, applied, current, currentStored, fixedInitial, fixedCurrent, gross: grossCandidate, liquid: liquidCandidate, irIof, unavailable, profit, rentab, hasExplicitCurrent, hasManualProfit };
}

const defaultIsRendaFixaAsset = a => String(a?.type||'').trim()==='Renda Fixa';

function configureDefaults(){
  FinanceCore.configure({
    isRendaFixaAsset: defaultIsRendaFixaAsset,
    rfValues: oracleRfValues
  });
}

function refAppliedValue(a){
  return defaultIsRendaFixaAsset(a) ? oracleRfValues(a).applied : (Number(a?.qty)||0) * (Number(a?.avg_price)||0);
}

function refCurrentValue(a){
  return defaultIsRendaFixaAsset(a) ? oracleRfValues(a).current : (Number(a?.qty)||0) * (Number(a?.current_price)||0);
}

function refJurosValue(a){
  if(!defaultIsRendaFixaAsset(a)) return null;
  const v=oracleRfValues(a);
  return Number.isFinite(v.profit) ? v.profit : null;
}

function refRentabPct(a){
  if(!defaultIsRendaFixaAsset(a)){
    const avg=Number(a?.avg_price)||0;
    const current=Number(a?.current_price)||0;
    return avg>0 && current>0 ? ((current-avg)/avg)*100 : null;
  }
  const v=oracleRfValues(a);
  return Number.isFinite(v.rentab) ? v.rentab : null;
}

function makeSpy(impl){
  const calls=[];
  const fn=(...args)=>{
    calls.push(args);
    return impl(...args);
  };
  fn.calls=calls;
  return fn;
}

function snapshot(value){
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function assertEquivalentCase(label, asset){
  assert.deepStrictEqual(
    {
      applied: FinanceCore.assetAppliedValue(asset),
      current: FinanceCore.assetCurrentValue(asset),
      juros: FinanceCore.assetJurosValue(asset),
      rentab: FinanceCore.assetRentabPct(asset),
    },
    {
      applied: refAppliedValue(asset),
      current: refCurrentValue(asset),
      juros: refJurosValue(asset),
      rentab: refRentabPct(asset),
    },
    label
  );
}

beforeEach(() => {
  configureDefaults();
});

describe('FinanceCore', () => {
  describe('ativos normais', () => {
    describe('assetAppliedValue', () => {
      const cases = [
        ['ação com quantidade inteira e preço médio numérico', { type: 'Ação', qty: 12, avg_price: 10.5 }],
        ['quantidade fracionada', { type: 'FII', qty: 2.5, avg_price: 17.2 }],
        ['quantidade como string numérica', { type: 'ETF', qty: '3', avg_price: 20 }],
        ['preço médio como string numérica', { type: 'Ação', qty: 4, avg_price: '11.25' }],
        ['quantidade zero', { type: 'Ação', qty: 0, avg_price: 99 }],
        ['preço médio zero', { type: 'FII', qty: 8, avg_price: 0 }],
        ['quantidade vazia', { type: 'ETF', qty: '', avg_price: 5 }],
        ['preço médio vazio', { type: 'Ação', qty: 5, avg_price: '' }],
        ['quantidade null', { type: 'Ação', qty: null, avg_price: 5 }],
        ['preço médio null', { type: 'FII', qty: 5, avg_price: null }],
        ['quantidade undefined', { type: 'ETF', avg_price: 5 }],
        ['preço médio undefined', { type: 'Ação', qty: 5 }],
        ['quantidade não numérica', { type: 'Ação', qty: 'abc', avg_price: 5 }],
        ['preço médio não numérico', { type: 'FII', qty: 5, avg_price: 'abc' }],
        ['valores NaN', { type: 'ETF', qty: NaN, avg_price: NaN }],
        ['valores Infinity', { type: 'Ação', qty: Infinity, avg_price: 2 }],
      ];
      for(const [name, asset] of cases){
        test(name, () => {
          assert.equal(FinanceCore.assetAppliedValue(asset), refAppliedValue(asset));
        });
      }
      test('mantém a mesma fórmula para Ação', () => {
        const asset = { type: 'Ação', qty: 7, avg_price: 13.5 };
        assert.equal(FinanceCore.assetAppliedValue(asset), 94.5);
      });
      test('mantém a mesma fórmula para FII', () => {
        const asset = { type: 'FII', qty: 9, avg_price: 8.5 };
        assert.equal(FinanceCore.assetAppliedValue(asset), 76.5);
      });
      test('mantém a mesma fórmula para ETF', () => {
        const asset = { type: 'ETF', qty: 1.75, avg_price: 19.2 };
        assert.equal(FinanceCore.assetAppliedValue(asset), 33.6);
      });
    });

    describe('assetCurrentValue', () => {
      const cases = [
        ['quantidade e cotação válidas', { type: 'Ação', qty: 12, current_price: 11.5 }],
        ['quantidade fracionada', { type: 'FII', qty: 2.5, current_price: 18 }],
        ['quantidade como string', { type: 'ETF', qty: '3', current_price: 20 }],
        ['cotação como string', { type: 'Ação', qty: 4, current_price: '11.25' }],
        ['quantidade zero', { type: 'Ação', qty: 0, current_price: 99 }],
        ['cotação zero', { type: 'FII', qty: 8, current_price: 0 }],
        ['cotação ausente', { type: 'ETF', qty: 5 }],
        ['quantidade ausente', { type: 'Ação', current_price: 5 }],
        ['valores vazios', { type: 'FII', qty: '', current_price: '' }],
        ['null', { type: 'ETF', qty: null, current_price: null }],
        ['undefined', { type: 'Ação' }],
        ['não numéricos', { type: 'FII', qty: 'abc', current_price: 'xyz' }],
        ['NaN', { type: 'ETF', qty: NaN, current_price: NaN }],
        ['Infinity', { type: 'Ação', qty: Infinity, current_price: 2 }],
      ];
      for(const [name, asset] of cases){
        test(name, () => {
          assert.equal(FinanceCore.assetCurrentValue(asset), refCurrentValue(asset));
        });
      }
      test('mantém a mesma fórmula para Ação', () => {
        const asset = { type: 'Ação', qty: 7, current_price: 13.5 };
        assert.equal(FinanceCore.assetCurrentValue(asset), 94.5);
      });
      test('mantém a mesma fórmula para FII', () => {
        const asset = { type: 'FII', qty: 9, current_price: 8.5 };
        assert.equal(FinanceCore.assetCurrentValue(asset), 76.5);
      });
      test('mantém a mesma fórmula para ETF', () => {
        const asset = { type: 'ETF', qty: 1.75, current_price: 19.2 };
        assert.equal(FinanceCore.assetCurrentValue(asset), 33.6);
      });
    });

    describe('assetRentabPct', () => {
      const cases = [
        ['lucro', { qty: 10, avg_price: 100, current_price: 125 }],
        ['prejuízo', { qty: 10, avg_price: 100, current_price: 80 }],
        ['empate', { qty: 10, avg_price: 100, current_price: 100 }],
        ['custo zero', { qty: 10, avg_price: 0, current_price: 100 }],
        ['valor atual zero', { qty: 10, avg_price: 100, current_price: 0 }],
        ['quantidade zero', { qty: 0, avg_price: 100, current_price: 100 }],
        ['strings numéricas', { qty: '10', avg_price: '100', current_price: '125' }],
        ['não numéricos', { qty: 'abc', avg_price: 'def', current_price: 'ghi' }],
        ['NaN', { qty: NaN, avg_price: NaN, current_price: NaN }],
        ['Infinity', { qty: Infinity, avg_price: 100, current_price: 125 }],
        ['prejuízo extremo', { qty: 10, avg_price: 100, current_price: 1 }],
      ];
      for(const [name, asset] of cases){
        test(name, () => {
          assert.equal(FinanceCore.assetRentabPct(asset), refRentabPct(asset));
        });
      }
      test('não arredonda prematuramente', () => {
        const asset = { qty: 3, avg_price: 7, current_price: 10 };
        assert.equal(FinanceCore.assetRentabPct(asset), 42.857142857142854);
      });
      test('retorna o mesmo resultado em chamadas repetidas', () => {
        const asset = { qty: 8, avg_price: 12.5, current_price: 14 };
        const a = FinanceCore.assetRentabPct(asset);
        const b = FinanceCore.assetRentabPct(asset);
        const c = FinanceCore.assetRentabPct(asset);
        assert.equal(a, b);
        assert.equal(b, c);
      });
    });

    describe('assetJurosValue', () => {
      const cases = [
        ['Ação', { type: 'Ação', qty: 10, avg_price: 100, current_price: 120 }],
        ['FII', { type: 'FII', qty: 10, avg_price: 100, current_price: 120 }],
        ['ETF', { type: 'ETF', qty: 10, avg_price: 100, current_price: 120 }],
        ['ativo incompleto', { type: 'Ação', qty: 10, avg_price: 100 }],
        ['ativo zerado', { type: 'FII', qty: 0, avg_price: 0, current_price: 0 }],
      ];
      for(const [name, asset] of cases){
        test(name, () => {
          assert.equal(FinanceCore.assetJurosValue(asset), null);
        });
      }
    });
  });

  describe('renda fixa', () => {
    test('configure recebe e usa as funções injetadas exatamente no ativo informado', () => {
      const seenIs = [];
      const seenRf = [];
      const isRendaFixaAsset = asset => {
        seenIs.push(asset);
        return asset?.kind === 'rf';
      };
      const rfValues = asset => {
        seenRf.push(asset);
        return { applied: 90, current: 105, profit: 15, rentab: 16.666666666666664 };
      };
      FinanceCore.configure({ isRendaFixaAsset, rfValues });
      const asset = { kind: 'rf', ticker: 'CDB1' };
      assert.equal(FinanceCore.assetAppliedValue(asset), 90);
      assert.equal(FinanceCore.assetCurrentValue(asset), 105);
      assert.equal(FinanceCore.assetJurosValue(asset), 15);
      assert.equal(FinanceCore.assetRentabPct(asset), 16.666666666666664);
      assert.deepStrictEqual(seenIs, [asset, asset, asset, asset]);
      assert.deepStrictEqual(seenRf, [asset, asset, asset, asset]);
    });

    test('assetAppliedValue usa o campo applied retornado por rfValues', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: asset => ({ applied: 1000, current: 1100, profit: 100, rentab: 10, tag: asset.ticker })
      });
      assert.equal(FinanceCore.assetAppliedValue({ kind: 'rf', ticker: 'RF1' }), 1000);
    });

    test('assetCurrentValue usa o campo current retornado por rfValues', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1075, profit: 75, rentab: 7.5 })
      });
      assert.equal(FinanceCore.assetCurrentValue({ kind: 'rf' }), 1075);
    });

    test('assetJurosValue usa o campo profit retornado por rfValues', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1040, profit: 40, rentab: 4 })
      });
      assert.equal(FinanceCore.assetJurosValue({ kind: 'rf' }), 40);
    });

    test('assetRentabPct usa o campo rentab retornado por rfValues', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1040, profit: 40, rentab: 4 })
      });
      assert.equal(FinanceCore.assetRentabPct({ kind: 'rf' }), 4);
    });

    test('RF com bruto delega current, lucro e rentabilidade corretamente', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1100, profit: 100, rentab: 10 })
      });
      const asset = { kind: 'rf', ticker: 'RF-BRUTO' };
      assert.equal(FinanceCore.assetAppliedValue(asset), 1000);
      assert.equal(FinanceCore.assetCurrentValue(asset), 1100);
      assert.equal(FinanceCore.assetJurosValue(asset), 100);
      assert.equal(FinanceCore.assetRentabPct(asset), 10);
    });

    test('RF com líquido delega current, lucro e rentabilidade corretamente', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1075, profit: 75, rentab: 7.5 })
      });
      const asset = { kind: 'rf', ticker: 'RF-LIQ' };
      assert.equal(FinanceCore.assetAppliedValue(asset), 1000);
      assert.equal(FinanceCore.assetCurrentValue(asset), 1075);
      assert.equal(FinanceCore.assetJurosValue(asset), 75);
      assert.equal(FinanceCore.assetRentabPct(asset), 7.5);
    });

    test('RF com prejuízo delega valor negativo sem ajustar o sinal', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 900, profit: -100, rentab: -10 })
      });
      const asset = { kind: 'rf', ticker: 'RF-PREJ' };
      assert.equal(FinanceCore.assetAppliedValue(asset), 1000);
      assert.equal(FinanceCore.assetCurrentValue(asset), 900);
      assert.equal(FinanceCore.assetJurosValue(asset), -100);
      assert.equal(FinanceCore.assetRentabPct(asset), -10);
    });

    test('RF com empate mantém zero de lucro e rentabilidade', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1000, profit: 0, rentab: 0 })
      });
      const asset = { kind: 'rf', ticker: 'RF-EMPATE' };
      assert.equal(FinanceCore.assetAppliedValue(asset), 1000);
      assert.equal(FinanceCore.assetCurrentValue(asset), 1000);
      assert.equal(FinanceCore.assetJurosValue(asset), 0);
      assert.equal(FinanceCore.assetRentabPct(asset), 0);
    });

    test('RF com campos ausentes preserva null onde a fórmula atual já retorna null', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 0, current: null, profit: null, rentab: null })
      });
      const asset = { kind: 'rf', ticker: 'RF-AUSENTE' };
      assert.equal(FinanceCore.assetAppliedValue(asset), 0);
      assert.equal(FinanceCore.assetCurrentValue(asset), null);
      assert.equal(FinanceCore.assetJurosValue(asset), null);
      assert.equal(FinanceCore.assetRentabPct(asset), null);
    });

    test('RF com valores inválidos não força um resultado melhorado', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: Number.NaN, current: Number.NaN, profit: Number.NaN, rentab: Number.NaN })
      });
      const asset = { kind: 'rf', ticker: 'RF-INVALIDO' };
      assert(Number.isNaN(FinanceCore.assetAppliedValue(asset)));
      assert(Number.isNaN(FinanceCore.assetCurrentValue(asset)));
      assert.equal(FinanceCore.assetJurosValue(asset), null);
      assert.equal(FinanceCore.assetRentabPct(asset), null);
    });

    test('chamadas repetidas com o mesmo RF retornam sempre o mesmo resultado', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: () => ({ applied: 1000, current: 1050, profit: 50, rentab: 5 })
      });
      const asset = { kind: 'rf', ticker: 'RF-DET' };
      const first = [
        FinanceCore.assetAppliedValue(asset),
        FinanceCore.assetCurrentValue(asset),
        FinanceCore.assetJurosValue(asset),
        FinanceCore.assetRentabPct(asset),
      ];
      const second = [
        FinanceCore.assetAppliedValue(asset),
        FinanceCore.assetCurrentValue(asset),
        FinanceCore.assetJurosValue(asset),
        FinanceCore.assetRentabPct(asset),
      ];
      assert.deepStrictEqual(first, second);
    });
  });

  describe('equivalência com comportamento anterior', () => {
    const cases = [
      ['ação', { type: 'Ação', qty: 12, avg_price: 10.5, current_price: 11.5 }],
      ['FII', { type: 'FII', qty: 3, avg_price: 100, current_price: 111 }],
      ['ETF', { type: 'ETF', qty: 1.5, avg_price: 20, current_price: 21.5 }],
      ['ativo incompleto', { type: 'Ação', qty: 2, avg_price: 0, current_price: 0 }],
      ['ativo zerado', { type: 'FII', qty: 0, avg_price: 0, current_price: 0 }],
      ['renda fixa com bruto', { type: 'Renda Fixa', rf_gross_value: 1100, fixed_initial_value: 1000 }],
      ['renda fixa com líquido', { type: 'Renda Fixa', rf_liquid_value: 1075, fixed_initial_value: 1000, rf_profit_value: 75 }],
      ['renda fixa com lucro', { type: 'Renda Fixa', rf_liquid_value: 1040, fixed_initial_value: 1000, rf_profit_value: 40 }],
      ['renda fixa com prejuízo', { type: 'Renda Fixa', rf_liquid_value: 900, fixed_initial_value: 1000, rf_profit_value: -100 }],
      ['custo zero', { type: 'Renda Fixa', rf_profit_value: 10 }],
      ['entrada inválida', { type: 'Ação', qty: 'abc', avg_price: 'xyz', current_price: 'zzz' }],
    ];
    for(const [name, asset] of cases){
      test(name, () => {
        assertEquivalentCase(name, asset);
      });
    }
  });

  describe('pureza e determinismo', () => {
    test('não muta um ativo normal recebido', () => {
      const asset = { type: 'Ação', qty: '3', avg_price: '10.5', current_price: '12.75', label: 'x' };
      const snap = snapshot(asset);
      FinanceCore.assetAppliedValue(asset);
      FinanceCore.assetCurrentValue(asset);
      FinanceCore.assetJurosValue(asset);
      FinanceCore.assetRentabPct(asset);
      assert.deepStrictEqual(asset, snap);
    });

    test('não muta um ativo de renda fixa recebido', () => {
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: asset => ({ applied: 1000, current: 1040, profit: 40, rentab: 4, marker: asset.marker })
      });
      const asset = { kind: 'rf', ticker: 'RF-NM', marker: { nested: true } };
      const snap = snapshot(asset);
      FinanceCore.assetAppliedValue(asset);
      FinanceCore.assetCurrentValue(asset);
      FinanceCore.assetJurosValue(asset);
      FinanceCore.assetRentabPct(asset);
      assert.deepStrictEqual(asset, snap);
    });

    test('mantém determinismo para uma sequência de entradas variadas', () => {
      const inputs = [
        { type: 'Ação', qty: 5, avg_price: 10, current_price: 12 },
        { type: 'FII', qty: 2.5, avg_price: 17, current_price: 19 },
        { kind: 'rf', ticker: 'RF-D1' },
      ];
      FinanceCore.configure({
        isRendaFixaAsset: asset => asset?.kind === 'rf',
        rfValues: asset => asset?.kind === 'rf' ? { applied: 1000, current: 1010, profit: 10, rentab: 1, tag: asset.ticker } : oracleRfValues(asset)
      });
      for(const input of inputs){
        const first = [
          FinanceCore.assetAppliedValue(input),
          FinanceCore.assetCurrentValue(input),
          FinanceCore.assetJurosValue(input),
          FinanceCore.assetRentabPct(input),
        ];
        const second = [
          FinanceCore.assetAppliedValue(input),
          FinanceCore.assetCurrentValue(input),
          FinanceCore.assetJurosValue(input),
          FinanceCore.assetRentabPct(input),
        ];
        assert.deepStrictEqual(first, second);
      }
    });
  });
});
