function renderPortfolioSearch(){
  const root=document.getElementById('portfolio-search-root');
  if(!root) return;
  const open=!!S.portfolioSearchOpen;
  const results=portfolioSearchResults(S.portfolioSearchQuery);
  root.className=`portfolio-search-root${open?' open':''}`;
  root.setAttribute('aria-hidden',open?'false':'true');
  if(!open){root.replaceChildren();return;}
  root.innerHTML=`<div class="portfolio-search-backdrop" onclick="portfolioSearchClose()"></div><section class="portfolio-search-dialog" role="dialog" aria-modal="true" aria-labelledby="portfolio-search-title"><div class="portfolio-search-head"><div class="portfolio-search-input-wrap"><div style="font-size:22px;color:#7dd3fc" aria-hidden="true">⌕</div><div style="min-width:0;flex:1"><div class="portfolio-search-kicker" id="portfolio-search-title">Buscar na carteira</div><input id="portfolio-search-input" class="portfolio-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Ticker, ativo, provento ou meta" value="${esc(S.portfolioSearchQuery)}" oninput="portfolioSearchInput(this.value)" aria-label="Buscar na carteira" aria-controls="portfolio-search-results"></div></div><button type="button" class="portfolio-search-close" onclick="portfolioSearchClose()" aria-label="Fechar busca">×</button></div><div class="portfolio-search-hint">${results.length?`${results.length} resultado${results.length===1?'':'s'} · `:''}Enter abre o resultado · Esc fecha · use ↑ ↓ para navegar</div><div id="portfolio-search-results" class="portfolio-search-results" role="region" aria-live="polite">${results.length?portfolioSearchGroupMarkup(results):`<div class="portfolio-search-empty">${portfolioSearchText(S.portfolioSearchQuery)?'Nenhum resultado encontrado. Tente ticker, nome, tipo ou seção.':'Digite para buscar ativos, movimentações e conferências.'}</div>`}</div></section>`;
  requestAnimationFrame(()=>document.getElementById('portfolio-search-input')?.focus());
}
