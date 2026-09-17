(function attachImportCenterFileListRenderer(root, factory){
  const api=factory();
  if(root) root.ImportCenterFileListRenderer=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterFileListRendererApi(){
  const render=({files=[],escapeText,supportLabel}={})=>{
    if(typeof escapeText!=='function' || typeof supportLabel!=='function') throw new TypeError('Import Center file renderer requer capacidades explícitas');
    if(!files.length) return '<div class="import-review-item">Nenhum arquivo selecionado. A sessão permanece apenas em memória.</div>';
    const supportClass=value=>value==='FULLY_SUPPORTED'?'full':'partial';
    return files.map(file=>`<div class="import-file-row"><div><strong>${escapeText(file.name||'Arquivo sem nome')}</strong><small>${escapeText(file.detected?.label||'Formato não reconhecido')} · ${escapeText(file.detected?.parser||'nenhum')} · ${supportLabel(file.detected?.support)}</small></div><span class="import-support ${supportClass(file.detected?.support)}">${escapeText(supportLabel(file.detected?.support))}</span></div>`).join('');
  };
  return Object.freeze({render});
});
