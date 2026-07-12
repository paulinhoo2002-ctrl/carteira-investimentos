(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.FinanceCore=api;
})(typeof globalThis!=='undefined' ? globalThis : window, function(){
  const defaults={
    isRendaFixaAsset(a){ return String(a?.type||'').trim()==='Renda Fixa'; },
    rfValues(a){
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
  };

  let deps={...defaults};
  const hasFn=v=>typeof v==='function';
  const getIsRendaFixaAsset=()=>deps.isRendaFixaAsset || defaults.isRendaFixaAsset;
  const getRfValues=()=>deps.rfValues || defaults.rfValues;

  function configure(nextDeps={}){
    deps={
      isRendaFixaAsset: hasFn(nextDeps.isRendaFixaAsset) ? nextDeps.isRendaFixaAsset : defaults.isRendaFixaAsset,
      rfValues: hasFn(nextDeps.rfValues) ? nextDeps.rfValues : defaults.rfValues
    };
    return api;
  }

  function assetAppliedValue(a){
    return getIsRendaFixaAsset()(a) ? getRfValues()(a).applied : (Number(a?.qty)||0) * (Number(a?.avg_price)||0);
  }

  function assetCurrentValue(a){
    return getIsRendaFixaAsset()(a) ? getRfValues()(a).current : (Number(a?.qty)||0) * (Number(a?.current_price)||0);
  }

  function assetJurosValue(a){
    if(!getIsRendaFixaAsset()(a)) return null;
    const v=getRfValues()(a);
    return Number.isFinite(v.profit) ? v.profit : null;
  }

  function assetRentabPct(a){
    if(!getIsRendaFixaAsset()(a)){
      const avg=Number(a?.avg_price)||0;
      const current=Number(a?.current_price)||0;
      return avg>0 && current>0 ? ((current-avg)/avg)*100 : null;
    }
    const v=getRfValues()(a);
    return Number.isFinite(v.rentab) ? v.rentab : null;
  }

  const api={configure,assetAppliedValue,assetCurrentValue,assetJurosValue,assetRentabPct};
  return api;
});
