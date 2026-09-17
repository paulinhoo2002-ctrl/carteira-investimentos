(function attachImportCenterBootstrap(root, factory){
  const api=factory(root?.ImportCenterEvents);
  if(root) root.ImportCenterBootstrap=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createImportCenterBootstrapApi(events){
  const mount=({root,handlers}={})=>{
    if(!events || typeof events.bind!=='function') throw new TypeError('Import Center events ausente');
    return events.bind({root,handlers});
  };
  return Object.freeze({mount});
});
