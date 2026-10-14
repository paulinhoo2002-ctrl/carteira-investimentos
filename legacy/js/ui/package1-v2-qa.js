/* Local synthetic read-only certification only. This file is injected by QA, never loaded by the app shell. */
(function(root, factory){
  const api=factory(root);
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.Package1V2Qa=api;
})(typeof globalThis!=='undefined'?globalThis:window, function(root){
  const routes=new Set(['dashboard','patrimonio','ativos','renda-fixa','rentabilidade','irpf','dividendos']);
  const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
  let view=null;

  function enabled(){
    return !!(root.__LOCAL_TEST_MODE__ && root.__LOCAL_TEST_READ_ONLY__ &&
      ['localhost','127.0.0.1'].includes(root.location?.hostname));
  }

  function setInput(positions,snapshot){
    if(!enabled()) throw new Error('PACKAGE1_QA_DISABLED');
    view=null;
    if(!root.PersistenceCore?.buildPackage1ReadOnlyView || !root.FinanceCore?.accountSnapshotSummary ||
       !root.FinanceCore?.positionV2Metrics) throw new Error('PACKAGE1_CORE_UNAVAILABLE');
    const next=root.PersistenceCore.buildPackage1ReadOnlyView(positions,snapshot);
    next.positions.forEach(position=>root.FinanceCore.positionV2Metrics(position));
    root.FinanceCore.accountSnapshotSummary(next.snapshot);
    view=next;
  }

  function mount(container,route){
    if(!enabled() || !view || !routes.has(route) || !container) return false;
    const summary=root.FinanceCore.accountSnapshotSummary(view.snapshot);
    const panel=root.document.createElement('section');
    panel.className='package1-v2-qa';
    panel.dataset.route=route;
    panel.dataset.reconciliation='PARTIAL';
    panel.setAttribute('aria-label','Prévia sintética V2 somente leitura');
    const title=root.document.createElement('h2');
    title.textContent='Prévia sintética V2 · somente leitura';
    panel.append(title);
    const fields=[
      ['Total oficial',summary.officialTotal],['RV oficial',summary.rvOfficial],['RF oficial líquido',summary.rfOfficial],
      ['Soma das posições detalhadas',summary.detailTotal],['Diferença sem detalhe',summary.reconciliationGap]
    ];
    const grid=root.document.createElement('div');
    grid.className='package1-v2-qa-grid';
    for(const [label,value] of fields){
      const item=root.document.createElement('div');
      const name=root.document.createElement('span'); name.textContent=label;
      const amount=root.document.createElement('strong'); amount.textContent=money(value);
      item.append(name,amount); grid.append(item);
    }
    panel.append(grid);
    const status=root.document.createElement('p');
    status.className='package1-v2-qa-status';
    status.textContent=`Detalhe parcial · ${view.positions.length} posições · custo médio — · resultado —. RV: ${money(summary.rvDetail)} detalhado, diferença ${money(view.snapshot.rv_gap)}. RF: ${money(summary.rfDetail)} detalhado, diferença ${money(view.snapshot.rf_gap)}. Nenhuma posição explicativa foi criada.`;
    panel.append(status);
    if(route==='rentabilidade' || route==='irpf'){
      const note=root.document.createElement('p');
      note.textContent=route==='irpf'
        ? `IR: custo médio certificado —. Evidência FIFO derivada não é preço médio fiscal. Base de custo: CERTIFIED 0, DERIVED ${view.positions.filter(position=>position.cost_basis_status==='DERIVED').length}, MANUAL 0, UNKNOWN ${view.positions.filter(position=>position.cost_basis_status==='UNKNOWN').length}.`
        : 'P&L parcial: resultado indisponível para posições com custo desconhecido. Evidência FIFO derivada não certifica preço médio.';
      panel.append(note);
    }
    if(route==='dividendos'){
      const note=root.document.createElement('p');
      note.textContent='Recebido — · esperado —. Esta posição não fornece cobertura de proventos; ausência não confirma zero.';
      panel.append(note);
    }
    if(route==='ativos' || route==='renda-fixa'){
      const type=route==='renda-fixa'?'RF':'RV';
      const listed=view.positions.filter(position=>type==='RF'?position.asset_type==='RF':position.asset_type.startsWith('RV'));
      const note=root.document.createElement('p');
      note.textContent=`${listed.length} posições ${type} no detalhe parcial; valores somados uma vez por document_id. Custo médio —.`;
      panel.append(note);
      const list=root.document.createElement('ul'); list.className='package1-v2-qa-list';
      for(const position of listed){
        const item=root.document.createElement('li');
        const metrics=root.FinanceCore.positionV2Metrics(position);
        item.textContent=`${position.asset_id} · atual ${money(metrics.currentValue)} · custo médio — · resultado — · ${position.cost_basis_status==='DERIVED'?'base FIFO derivada, não certificada':'base de custo desconhecida'}${position.lent_shares?' · posição emprestada incluída uma vez':''}`;
        list.append(item);
      }
      panel.append(list);
    }
    let style=root.document.getElementById('package1-v2-qa-style');
    if(!style){
      style=root.document.createElement('style'); style.id='package1-v2-qa-style';
      style.textContent='.package1-v2-qa{margin:12px auto;padding:16px;max-width:1180px;border:1px solid #a77d32;border-radius:14px;background:var(--surface,#182230);color:var(--text,#f2f5fa);font:14px/1.5 system-ui,sans-serif}.package1-v2-qa h2{font-size:17px;margin:0 0 10px}.package1-v2-qa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px}.package1-v2-qa-grid>div{display:flex;flex-direction:column;padding:9px;border:1px solid #687380;border-radius:9px}.package1-v2-qa-grid span{font-size:12px}.package1-v2-qa-grid strong{font-size:16px;font-variant-numeric:tabular-nums}.package1-v2-qa p{margin:10px 0 0}.package1-v2-qa-list{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:8px}.package1-v2-qa-list li{padding:10px;border:1px solid #687380;border-radius:8px;overflow-wrap:anywhere}';
      root.document.head.append(style);
    }
    const content=container.querySelector('.wrap');
    if(!content || !container.querySelector('.test-mode-banner')) throw new Error('PACKAGE1_QA_SHELL_MISSING');
    content.replaceChildren(panel);
    return true;
  }

  return {setInput,mount,enabled};
});
