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
    const previewStatusHtml=renderers.preview.render({files,result,history:Array.isArray(session.history)?session.history:[],escapeText:context.escapeText,supportLabel,renderNotePreview:renderers.notePreview});
    return `<section class="import-center-shell" aria-labelledby="import-center-title">
      <div class="import-center-hero">
        <div><h1 class="import-center-title" id="import-center-title">Importar dados</h1><div class="import-center-sub">Entrada única para leitura e revisão. A confirmação e a gravação continuam nos fluxos protegidos de cada fonte.</div></div>
        <div class="import-center-safety" role="status" aria-live="polite">Nenhum dado é gravado ao selecionar ou analisar um arquivo.</div>
      </div>
      <div class="import-center-steps" aria-label="Etapas da importação"><div class="import-center-step-mobile"><span>Etapa ${session.step} de ${stepLabels.length}</span><strong>${context.escapeText(currentStepLabel||'Arquivo')}</strong></div>${steps}</div>
      <div class="import-center-grid">
        <div class="import-center-panel import-center-select-panel">
          <h2>Selecionar arquivo</h2>
          <p>Escolha um arquivo local para iniciar a leitura. A seleção não analisa nem grava dados.</p>
          <div class="import-center-actions"><label class="btn bp" for="import-center-file-input">Selecionar arquivo</label><input id="import-center-file-input" type="file" accept=".xlsx,.xls,.csv,.pdf" hidden data-import-action="files"><button type="button" class="btn bgh" data-import-action="reset" ${session.pendingReview?'disabled':''}>Limpar sessão</button></div>
        </div>
        <div class="import-center-panel ${files.length?'':'empty'}">
          <h2>Arquivo da sessão</h2>
          <p>O arquivo fica apenas em memória nesta sessão. Use a ação abaixo para abrir a leitura e a revisão protegida.</p>
          <div class="import-file-list">${fileRows}</div>
          ${files.length?`<div class="import-center-actions"><button type="button" class="btn bp" data-import-action="dryRun" ${session.result?.status==='PARSING'||session.pendingReview?'disabled':''}>Ler e abrir revisão</button></div>`:''}
        </div>
      </div>
      <details class="import-center-source-catalog">
        <summary>Fontes disponíveis e níveis de suporte</summary>
        <p>O suporte depende do formato e da evidência reconhecida no conteúdo. Formatos sem parser confirmado não seguem para gravação.</p>
        <div class="import-source-list">${sourceListHtml}</div>
      </details>
      ${previewStatusHtml}
    </section>`;
  };
  return Object.freeze({render});
});
