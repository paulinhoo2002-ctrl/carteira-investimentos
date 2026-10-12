(function attachImportCenterContext(root, factory){
  const api=factory();
  if(root) root.ImportCenterContext=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterContextApi(){
  const REQUIRED=['readState','escapeText','getSources','getSteps'];
  const create=(capabilities={})=>{
    const context={readState:capabilities.readState,escapeText:capabilities.escapeText,getSources:capabilities.getSources,getSteps:capabilities.getSteps};
    REQUIRED.forEach(key=>{ if(typeof context[key]!=='function') throw new TypeError(`Import Center capability ausente: ${key}`); });
    return Object.freeze(context);
  };
  return Object.freeze({REQUIRED,create});
});
