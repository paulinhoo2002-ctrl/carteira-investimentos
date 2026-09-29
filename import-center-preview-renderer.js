(function attachImportCenterPreviewRenderer(root, factory){
  const api=factory();
  if(root) root.ImportCenterPreviewRenderer=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterPreviewRendererApi(){
  const render=({files=[],result=null,escapeText}={})=>{
    if(typeof escapeText!=='function') throw new TypeError('Import Center preview renderer requer escapeText');
    if(!result) return '';
    const status=String(result.status||'UNKNOWN');
    const tone=['FAILED','UNSUPPORTED','REVIEW_REQUIRED'].includes(status)?'warning':'';
    const message=escapeText(result.message||result.reason||status);
    const provider=escapeText(result.provider||'UNKNOWN');
    const sourceType=escapeText(result.sourceType||'UNKNOWN');
    const recordCount=Number.isInteger(result.recordCount)?String(result.recordCount):'não informado';
    const writes=status==='REVIEW_OPEN'||status==='CANCELLED'||status==='FAILED'||status==='UNSUPPORTED'||status==='REVIEW_REQUIRED'?0:(Number.isInteger(result.writeCount)?result.writeCount:'—');
    return `<div class="import-review-list" role="status" aria-live="polite"><div class="import-review-item ${tone}"><strong>${escapeText(status)}</strong><br>${message}</div><div class="import-safety-result" aria-label="Estado real da análise"><span><b>Arquivo</b> ${escapeText(result.fileName||files[0]?.name||'—')}</span><span><b>Fonte</b> ${provider}</span><span><b>Tipo</b> ${sourceType}</span><span><b>Registros gravados</b> ${escapeText(writes)}</span></div>${status==='REVIEW_OPEN'?`<p class="import-muted">Prévia e confirmação estão abertas no fluxo protegido da fonte. Cancelar ou fechar não aplica registros.</p>`:''}</div>`;
  };
  return Object.freeze({render});
});
