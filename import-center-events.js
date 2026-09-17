(function attachImportCenterEvents(root, factory){
  const api=factory();
  if(root) root.ImportCenterEvents=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterEventsApi(){
  const boundRoots=new WeakSet();
  const bind=({root,handlers}={})=>{
    if(!root || typeof root.addEventListener!=='function' || typeof root.contains!=='function') throw new TypeError('Import Center root inválido');
    if(boundRoots.has(root)) return false;
    const actions=handlers||{};
    const dispatch=(event)=>{
      const target=event.target?.closest?.('[data-import-action]');
      if(!target || !root.contains(target)) return;
      const action=target.dataset.importAction;
      if(action==='files' && typeof actions.files==='function') actions.files(target.files);
      if(action==='reset' && typeof actions.reset==='function') actions.reset();
      if(action==='dryRun' && typeof actions.dryRun==='function') actions.dryRun();
    };
    root.addEventListener('click',dispatch);
    root.addEventListener('change',dispatch);
    boundRoots.add(root);
    return true;
  };
  return Object.freeze({bind});
});
