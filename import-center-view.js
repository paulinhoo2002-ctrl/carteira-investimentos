(function attachImportCenterView(root, factory){
  const api=factory();
  if(root) root.ImportCenterView=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterViewApi(){
  const render=({context,renderers}={})=>{
    if(!context || typeof context.readState!=='function' || typeof context.escapeText!=='function' || typeof context.getSources!=='function' || typeof context.getSteps!=='function') throw new TypeError('Import Center view requer contexto explícito completo');
    if(!renderers?.preview?.render || !renderers?.fileList?.render || !renderers?.sourceList?.render) throw new TypeError('Import Center view requer renderers explícitos');
    const session=context.readState()||{};
    const files=Array.isArray(session.files)?session.files:[];
    const result=session.result||null;
    const supportLabel=value=>['FULLY_SUPPORTED','SUPPORTED','FULL'].includes(value)?'Suporte completo':value==='REVIEW_REQUIRED'?'Revisão necessária':value==='FIXTURE_REQUIRED'?'Fixture necessária':value==='UNSUPPORTED'?'Não suportado':'Suporte parcial';
    const stepLabels=context.getSteps();
    const currentStepLabel=stepLabels[Math.max(0,Math.min(stepLabels.length-1,Number(session.step)||1)-1)];
    const steps=stepLabels.map((label,index)=>`<div class="import-center-step ${session.step===index+1?'on':''} ${session.step>index+1?'done':''}"${session.step===index+1?' aria-current="step"':''}><span>${session.step>index+1?'✓':index+1}</span>${context.escapeText(label)}</div>`).join('');
    const fileRows=renderers.fileList.render({files,escapeText:context.escapeText,supportLabel});
    const sourceListHtml=renderers.sourceList.render({items:context.getSources(),escapeText:context.escapeText,supportLabel});
    const previewStatusHtml=renderers.preview.render({files,result,history:Array.isArray(session.history)?session.history:[],escapeText:context.escapeText,supportLabel});
    return `<section class="import-center-shell" aria-labelledby="import-center-title"><div class="import-center-hero"><div><h1 class="import-center-title" id="import-center-title">Importar dados</h1><div class="import-center-sub">Central profissional para revisar fontes, duplicidades, conflitos e reconciliação antes de qualquer futura autorização de escrita.</div></div><div class="import-center-safety" role="status" aria-live="polite">Modo seguro: esta simulação não altera sua carteira.</div></div><div class="import-center-steps" aria-label="Etapas da simulação"><div class="import-center-step-mobile"><span>Etapa ${session.step} de ${stepLabels.length}</span><strong>${context.escapeText(currentStepLabel||'Arquivos')}</strong></div>${steps}</div><div class="import-center-grid"><div class="import-center-panel"><h2>Fontes suportadas</h2><p>Selecione arquivos sanitizados. O status abaixo usa linguagem simples e formatos desconhecidos sempre ficam em revisão.</p><div class="import-source-list">${sourceListHtml}</div><div class="import-center-actions"><label class="btn bp" for="import-center-file-input">Selecionar arquivos</label><input id="import-center-file-input" type="file" multiple accept=".xlsx,.xls,.pdf" hidden data-import-action="files"><button type="button" class="btn bgh" data-import-action="reset">Limpar sessão</button></div></div><div class="import-center-panel ${files.length?'':'empty'}"><h2>Arquivos da sessão</h2><p>Detecção e parser ficam visíveis; nenhuma seleção é persistida.</p><div class="import-file-list">${fileRows}</div>${files.length?`<div class="import-center-actions"><button type="button" class="btn bp" data-import-action="dryRun">Executar simulação</button></div>`:''}</div></div>${previewStatusHtml}</section>`;
  };
  return Object.freeze({render});
});
