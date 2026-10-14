(function(root, factory){
  const api=factory(root);
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.Package1PortfolioReadonlyUi=api;
})(typeof globalThis!=='undefined'?globalThis:window, function(root){
  'use strict';
  const routes=new Set(['dashboard','patrimonio','ativos','renda-fixa','rentabilidade','irpf','dividendos','metas','configuracoes']);
  const labels={dashboard:'Resumo da carteira',patrimonio:'Patrimônio',ativos:'Ativos',
    'renda-fixa':'Renda fixa',rentabilidade:'Resultado',irpf:'Imposto de renda',
    dividendos:'Dividendos',metas:'Metas',configuracoes:'Configurações'};
  const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);

  function mount(container, route, readView){
    if(!container || !routes.has(route) || !readView?.snapshot || !Array.isArray(readView.positions)) return false;
    container.querySelector('.package1-portfolio-summary')?.remove();
    const summary=root.FinanceCore.accountSnapshotSummary(readView.snapshot);
    const panel=root.document.createElement('section');
    panel.className='package1-portfolio-summary';
    panel.dataset.reconciliation=summary.reconciliationStatus;
    panel.setAttribute('aria-labelledby','package1-portfolio-summary-title');
    const heading=root.document.createElement('h2');
    heading.id='package1-portfolio-summary-title';
    heading.textContent=`Posição oficial · ${labels[route]}`;
    const grid=root.document.createElement('dl');
    grid.className='package1-portfolio-summary__grid';
    const metrics=[['Total oficial',summary.officialTotal],['Detalhe disponível',summary.detailTotal],['Diferença sem detalhe',summary.reconciliationGap]];
    for(const [name,value] of metrics){
      const item=root.document.createElement('div');
      const term=root.document.createElement('dt'); term.textContent=name;
      const amount=root.document.createElement('dd'); amount.textContent=money(value);
      item.append(term,amount); grid.append(item);
    }
    const state=root.document.createElement('p');
    state.className='package1-portfolio-summary__state';
    state.textContent=`Reconciliação parcial em ${summary.asOf}. O total oficial e as posições detalhadas têm fontes distintas; ${readView.positions.length} posições detalhadas não foram somadas à lista legada.`;
    const note=root.document.createElement('p');
    note.className='package1-portfolio-summary__note';
    note.textContent='A lista de posições continua seguindo os dados legados. Detalhes V2 não são combinados enquanto houver divergências de identidade ou quantidade.';
    panel.append(heading,grid,state,note);
    const content=container.querySelector('.wrap')||container;
    content.prepend(panel);
    return true;
  }
  return {mount};
});
