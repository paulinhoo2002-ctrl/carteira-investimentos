(function attachImportCenterPreviewRenderer(root, factory){
  const api=factory();
  if(root) root.ImportCenterPreviewRenderer=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterPreviewRendererApi(){
  const render=({files=[],result=null,escapeText,renderNotePreview}={})=>{
    if(typeof escapeText!=='function') throw new TypeError('Import Center preview renderer requer escapeText');
    if(!result) return '';
    const status=String(result.status||'UNKNOWN');
    const statusLabels={REVIEW_OPEN:'Revisão aberta',REVIEW_REQUIRED:'Revisão necessária',READY_FOR_REVIEW:'Pronta para revisão',FAILED:'Falha na leitura',UNSUPPORTED:'Formato não suportado',CANCELLED:'Cancelada',IMPORTED:'Importada',NO_NEW_RECORDS:'Nenhum registro novo'};
    const statusLabel=statusLabels[status]||status;
    const tone=['FAILED','UNSUPPORTED','REVIEW_REQUIRED'].includes(status)?'warning':'';
    const rawMessage=String(result.message||result.reason||'');
    const message=rawMessage&&rawMessage!==status&&rawMessage!==statusLabel?escapeText(rawMessage):'';
    const provider=escapeText(result.provider||'UNKNOWN');
    const sourceType=escapeText(result.sourceType||'UNKNOWN');
    const recordCount=Number.isInteger(result.recordCount)?String(result.recordCount):'não informado';
    const writes=status==='REVIEW_OPEN'||status==='CANCELLED'||status==='FAILED'||status==='UNSUPPORTED'||status==='REVIEW_REQUIRED'?0:(Number.isInteger(result.writeCount)?result.writeCount:'—');
    const noteHtml=result.notePreview&&typeof renderNotePreview==='function'?renderNotePreview(result.notePreview,escapeText):'';
    return `<div class="import-review-list" role="status" aria-live="polite"><div class="import-review-item ${tone}"><strong>${escapeText(statusLabel)}</strong>${message?`<br>${message}`:''}</div><div class="import-safety-result" aria-label="Estado real da análise"><span><b>Arquivo</b> ${escapeText(result.fileName||files[0]?.name||'—')}</span><span><b>Fonte</b> ${provider}</span><span><b>Tipo</b> ${sourceType}</span><span><b>Registros gravados</b> ${escapeText(writes)}</span></div>${noteHtml}${status==='REVIEW_OPEN'?`<p class="import-muted">Prévia e confirmação estão abertas no fluxo protegido da fonte. Cancelar ou fechar não aplica registros.</p>`:''}</div>`;
  };
  return Object.freeze({render});
});
