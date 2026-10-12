'use strict';

(function exposeCloudSyncState(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CloudSyncState = api;
})(typeof globalThis === 'object' ? globalThis : this, function createCloudSyncState(){
  const STATES = Object.freeze({
    INITIALIZING: 'INITIALIZING',
    AUTHENTICATING: 'AUTHENTICATING',
    SYNCING: 'SYNCING',
    CONNECTED: 'CONNECTED',
    EMPTY_CONFIRMED: 'EMPTY_CONFIRMED',
    OFFLINE: 'OFFLINE',
    ERROR: 'ERROR',
    TIMEOUT: 'TIMEOUT',
  });
  const CONFIRMED = new Set([STATES.CONNECTED, STATES.EMPTY_CONFIRMED]);

  function initial(status=STATES.INITIALIZING){
    return {status, attempt:0, errorCode:'', errorMessage:''};
  }
  function begin(previous=initial()){
    if (previous.status===STATES.SYNCING) return previous;
    return {status:STATES.SYNCING, attempt:Number(previous.attempt||0)+1, errorCode:'', errorMessage:''};
  }
  function resolve(previous, snapshot={}){
    const hasData = snapshot.hasData===true || Number(snapshot.assetCount||0)>0 || Number(snapshot.recordCount||0)>0;
    return {...previous, status:hasData?STATES.CONNECTED:STATES.EMPTY_CONFIRMED, errorCode:'', errorMessage:''};
  }
  function classifyError(error){
    const code=String(error?.code||error?.name||'').toLowerCase();
    const message=String(error?.message||error||'').toLowerCase();
    if (/permission-denied|unauthorized|unauthenticated/.test(code)||/permission|unauthenticated|auth/.test(message)) return 'PERMISSION_DENIED';
    if (/network|offline|unavailable|deadline|aborted|cancelled/.test(code)||/network|offline|unavailable|deadline|aborted|cancelled/.test(message)) return 'NETWORK_OFFLINE';
    if (/timeout/.test(code)||/timeout/.test(message)) return 'TIMEOUT';
    return 'PROVIDER_ERROR';
  }
  function fail(previous, error){
    const errorCode=classifyError(error);
    return {...previous, status:errorCode==='NETWORK_OFFLINE'?STATES.OFFLINE:STATES.ERROR, errorCode, errorMessage:String(error?.message||error||'')};
  }
  function timeout(previous){ return {...previous, status:STATES.TIMEOUT, errorCode:'TIMEOUT', errorMessage:'SYNC_TIMEOUT'}; }
  function retry(previous){ return previous.status===STATES.SYNCING ? previous : begin(previous); }
  function isDataConfirmed(state){ return CONFIRMED.has(state?.status); }
  function displayValue(state, value, unavailable='—'){ return isDataConfirmed(state) ? value : unavailable; }
  return Object.freeze({STATES, initial, begin, resolve, fail, timeout, retry, classifyError, isDataConfirmed, displayValue});
});

