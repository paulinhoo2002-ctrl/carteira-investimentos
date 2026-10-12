(function attachImportCenterSourceListRenderer(root, factory){
  const api=factory();
  if(root) root.ImportCenterSourceListRenderer=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterSourceListRendererApi(){
  const render=({items=[],escapeText,supportLabel}={})=>{
    if(typeof escapeText!=='function' || typeof supportLabel!=='function') throw new TypeError('Import Center source renderer requer capacidades explícitas');
    const supportClass=value=>['FULLY_SUPPORTED','FULL'].includes(value)?'full':value==='FIXTURE_REQUIRED'?'partial':'partial';
    return items.map(item=>`<div class="import-source-card"><strong>${escapeText(item.label)}</strong><span>${escapeText(item.hint)}</span><span class="import-support ${supportClass(item.support)}">${escapeText(supportLabel(item.support))}</span>${item.capability?`<small class="import-muted">Estado factual: ${escapeText(item.capability)}${item.evidence?` · ${escapeText(item.evidence)}`:''}</small>`:''}</div>`).join('');
  };
  return Object.freeze({render});
});
