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

  // Package 1 is an opt-in read-only view; legacy asset calculations stay unchanged.
  function positionV2Metrics(position){
    const value=position?.current_value;
    if(position?.schema_version!==2 || typeof value!=='number' || !Number.isFinite(value) || value<0 ||
       typeof position.quantity!=='number' || !Number.isFinite(position.quantity) || position.quantity<0 ||
       position.average_cost_status!=='UNKNOWN' || position.average_cost!==null ||
       position.reconciliation_status!=='PARTIAL') throw new Error('POSITION_V2_INVALID');
    const costStatus=position.cost_basis_status;
    if(costStatus!=='UNKNOWN' && costStatus!=='DERIVED') throw new Error('POSITION_V2_INVALID');
    if(costStatus==='UNKNOWN' && (position.cost_basis_value!==null || position.cost_method!==null)) throw new Error('POSITION_V2_INVALID');
    if(costStatus==='DERIVED' && (position.cost_method!=='FIFO' || typeof position.cost_basis_value!=='number' ||
       !Number.isFinite(position.cost_basis_value) || position.cost_basis_value<0)) throw new Error('POSITION_V2_INVALID');
    return {currentValue:value,averageCost:null,appliedValue:null,pnl:null,
      averageCostStatus:'UNKNOWN',costBasisStatus:costStatus,reconciliationStatus:'PARTIAL'};
  }

  function accountSnapshotSummary(snapshot){
    if(snapshot?.schema_version!==1 || snapshot.reconciliation_status!=='PARTIAL' ||
       typeof snapshot.as_of!=='string') throw new Error('SNAPSHOT_INVALID');
    const fields=['rv_official','rf_official','total_official','rv_detail_sum','rf_detail_sum','detail_total','rv_gap','rf_gap','total_gap'];
    const cents={};
    for(const field of fields){
      const value=snapshot[field];
      if(typeof value!=='number' || !Number.isFinite(value) || value<0 ||
         Math.abs(value*100-Math.round(value*100))>0.00001) throw new Error('SNAPSHOT_INVALID');
      cents[field]=Math.round(value*100);
    }
    if(cents.rv_official+cents.rf_official!==cents.total_official ||
       cents.rv_detail_sum+cents.rf_detail_sum!==cents.detail_total ||
       cents.rv_official-cents.rv_detail_sum!==cents.rv_gap ||
       cents.rf_official-cents.rf_detail_sum!==cents.rf_gap ||
       cents.total_official-cents.detail_total!==cents.total_gap) throw new Error('SNAPSHOT_TOTAL_MISMATCH');
    const amount=field=>cents[field]/100;
    return {rvOfficial:amount('rv_official'),rfOfficial:amount('rf_official'),
      officialTotal:amount('total_official'),rvDetail:amount('rv_detail_sum'),
      rfDetail:amount('rf_detail_sum'),detailTotal:amount('detail_total'),
      reconciliationGap:amount('total_gap'),reconciliationStatus:'PARTIAL',asOf:snapshot.as_of};
  }

  const api={configure,assetAppliedValue,assetCurrentValue,assetJurosValue,assetRentabPct,
    positionV2Metrics,accountSnapshotSummary};
  return api;
});
