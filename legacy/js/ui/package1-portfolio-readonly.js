(function(root, factory){
  const api=factory(root);
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.Package1PortfolioReadonlyUi=api;
})(typeof globalThis!=='undefined'?globalThis:window, function(root){
  'use strict';
  const routes=new Set(['dashboard','patrimonio','ativos','renda-fixa','rentabilidade','irpf','dividendos','metas','configuracoes']);
  const labels={dashboard:'Resumo oficial',patrimonio:'Patrimônio',ativos:'Ativos',
    'renda-fixa':'Renda fixa',rentabilidade:'Resultado',irpf:'Imposto de renda',
    dividendos:'Dividendos',metas:'Metas',configuracoes:'Configurações'};
  const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
  const text=(element,value)=>{element.textContent=String(value);return element;};

  function mount(container,route,readView,options={}){
    if(!container || !routes.has(route) || !readView?.snapshot || !Array.isArray(readView.positions)) return false;
    container.querySelector('.package1-portfolio-summary')?.remove();
    const summary=root.FinanceCore.accountSnapshotSummary(readView.snapshot);
    const panel=root.document.createElement('section');
    panel.className='package1-portfolio-summary';
    panel.dataset.route=route;
    panel.dataset.reconciliation=summary.reconciliationStatus;
    panel.setAttribute('aria-labelledby','package1-portfolio-summary-title');
    const heading=root.document.createElement('h2');
    heading.id='package1-portfolio-summary-title';
    text(heading,`${labels[route]} · Posição oficial`);
    const grid=root.document.createElement('dl');
    grid.className='package1-portfolio-summary__grid';
    const hideValues=options.hideValues===true;
    const metrics=[
      ['Total oficial',summary.officialTotal],
      ['RV oficial',summary.rvOfficial],
      ['RF oficial',summary.rfOfficial],
      ['Detalhe disponível',summary.detailTotal],
      ['Diferença sem detalhe',summary.reconciliationGap]
    ];
    for(const [name,value] of metrics){
      const item=root.document.createElement('div');
      const term=text(root.document.createElement('dt'),name);
      const amount=text(root.document.createElement('dd'),hideValues?'—':money(value));
      item.append(term,amount); grid.append(item);
    }
    const state=root.document.createElement('p');
    state.className='package1-portfolio-summary__state';
    state.setAttribute('role','status');
    text(state,`Reconciliação parcial em ${summary.asOf}. Total oficial e detalhe têm fontes distintas; ${readView.positions.length} posições V2.`);
    panel.append(heading,grid,state);
    if(['dashboard','patrimonio','ativos','renda-fixa','rentabilidade','irpf'].includes(route)){
      const note=root.document.createElement('p');
      note.className='package1-portfolio-summary__note';
      text(note,'O conteúdo operacional legado abaixo foi preservado e permanece separado deste snapshot. Não some as posições das duas fontes; divergências ainda não foram conciliadas.');
      panel.append(note);
    }

    if(route==='rentabilidade'){
      const note=root.document.createElement('p');
      note.className='package1-portfolio-summary__note';
      text(note,'P&L parcial: custo desconhecido ou evidência FIFO derivada não permite certificar resultado total da carteira.');
      panel.append(note);
    }else if(route==='irpf'){
      const counts={DERIVED:0,UNKNOWN:0};
      for(const position of readView.positions) counts[position.cost_basis_status]++;
      const note=root.document.createElement('p');
      note.className='package1-portfolio-summary__note';
      text(note,`Cobertura de custo parcial · CERTIFIED 0 · DERIVED ${counts.DERIVED} · MANUAL 0 · UNKNOWN ${counts.UNKNOWN}. FIFO derivado não é preço médio fiscal.`);
      panel.append(note);
    }else if(route==='dividendos'){
      const note=root.document.createElement('p');
      note.className='package1-portfolio-summary__note';
      text(note,'Recebido — · esperado —. Esta posição não fornece cobertura de proventos; ausência não confirma zero.');
      panel.append(note);
    }else if(route==='ativos'){
      const note=root.document.createElement('p');
      note.className='package1-portfolio-summary__note';
      text(note,'Totais operacionais abaixo usam cotações disponíveis; diferem do total oficial certificado.');
      panel.append(note);
    }else if(route==='renda-fixa'){
      const note=root.document.createElement('p');
      note.className='package1-portfolio-summary__note';
      text(note,'KPIs de RF operacionais usam valores explícitos das posições; total oficial inclui itens não detalhados.');
      panel.append(note);
    }

    const content=container.querySelector('.wrap')||container;
    content.prepend(panel);
    return true;
  }
  return {mount};
});
