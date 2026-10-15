// A cloud session is permanently attached to one authenticated account and one cache key.
// The legacy mgp-v2 store is deliberately never read or written by this module.
function createGymCloudSync({uid,projectId,storage,api,getToken,freshState,onStatus=()=>{},debounceMs=500,setTimeoutImpl=(fn,ms)=>setTimeout(fn,ms),clearTimeoutImpl=id=>clearTimeout(id)}={}){
 const fail=(code,message,cause)=>Object.assign(new Error(message),{code,...(cause?{cause}:{})});
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 function validProjectId(value){
  if(typeof value!=='string'||value.length>260||value.trim()!==value)return false;
  const match=/^([^:]+)(?::([0-9]{1,5}))?$/.exec(value);
  if(!match||match[0]!==value||(match[2]!==undefined&&(Number(match[2])<1||Number(match[2])>65535)))return false;
  const host=match[1];if(host.length>253)return false;
  // Keep simple identifiers used by local installs, and accept the configured Supabase host.
  if(!host.includes('.'))return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(host);
  return host.split('.').every(label=>/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
 }
 if(typeof uid!=='string'||uid.length!==36||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))throw fail('INVALID_UID','No se pudo identificar la cuenta autenticada.');
 if(!validProjectId(projectId))throw fail('INVALID_PROJECT','El proyecto de sincronización no es válido.');
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||!api||['readState','insertState','updateState'].some(method=>typeof api[method]!=='function')||typeof getToken!=='function'||typeof freshState!=='function')throw fail('INVALID_CONFIG','No se pudo preparar la sincronización.');
 const key=`mgp-cloud-v1:${projectId}:${uid}`;
 let record=null,baseRaw=null,opened=false,closed=false,epoch=0,timer=null,pendingSync=null,opening=null,restoring=false,conflicted=false,saveFailed=false,lastSaveError=null,recoverySequence=0;
 const clone=value=>JSON.parse(JSON.stringify(value));
 function stateCopy(value){
  if(!object(value))throw fail('INVALID_STATE','Los datos de esta cuenta no son válidos. No se han reemplazado.');
  let result;try{result=clone(value)}catch(error){throw fail('INVALID_STATE','Los datos no se pueden guardar como una copia válida.',error)}
  if(!object(result))throw fail('INVALID_STATE','Los datos de esta cuenta no son válidos.');
  return result;
 }
 function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(object(value))return '{'+Object.keys(value).sort().map(name=>JSON.stringify(name)+':'+canonical(value[name])).join(',')+'}';
  return JSON.stringify(value);
 }
 const sameState=(left,right)=>canonical(left)===canonical(right);
 function readRaw(){try{return storage.getItem(key)}catch(error){throw fail('CACHE_READ_FAILED','No se pudo leer la copia de esta cuenta en el dispositivo.',error)}}
 function parseCache(raw){
  let value;try{value=JSON.parse(raw)}catch(error){throw fail('CORRUPT_CACHE','La copia local no se puede leer. Se conserva intacta para recuperarla.',error)}
  if(!object(value)||value.version!==1||value.uid!==uid||!object(value.state)||!Number.isSafeInteger(value.baseRevision)||value.baseRevision<0||typeof value.dirty!=='boolean'||!Number.isSafeInteger(value.generation)||value.generation<0)throw fail('CORRUPT_CACHE','La copia local de esta cuenta no es válida. Se conserva intacta.');
  return {version:1,uid,state:stateCopy(value.state),baseRevision:value.baseRevision,dirty:value.dirty,generation:value.generation};
 }
 function remoteRow(value){
  if(value===null)return null;
  if(!object(value)||!object(value.state)||!Number.isSafeInteger(value.revision)||value.revision<1||(value.uid!==undefined&&value.uid!==uid)||(value.user_id!==undefined&&value.user_id!==uid))throw fail('INVALID_REMOTE','La respuesta de la nube no corresponde a una copia válida de esta cuenta.');
  return {state:stateCopy(value.state),revision:value.revision,updatedAt:value.updatedAt};
 }
 function active(operationEpoch=epoch){if(closed||operationEpoch!==epoch)throw fail('CLOSED','Esta sesión de sincronización ya no está activa.')}
 function loaded(){active();if(!opened||!record)throw fail('NOT_OPEN','Abre primero los datos de la cuenta para guardar cambios.');if(restoring)throw fail('BUSY','Espera a que termine la recuperación de esta cuenta.')}
 function emit(kind,message,extra={}){
  if(closed)return;
  try{onStatus({kind,message,uid,dirty:!!record?.dirty,revision:record?.baseRevision??0,saveFailed,...extra})}catch{}
 }
 function unchanged(){if(readRaw()!==baseRaw)throw fail('STALE_CACHE','Esta cuenta cambió en otra pestaña. Recarga para conservar los cambios más recientes.')}
 function persist(next){
  active();unchanged();const raw=JSON.stringify(next);unchanged();
  try{storage.setItem(key,raw)}catch(error){throw fail('CACHE_WRITE_FAILED','No se pudo guardar la copia local. Los datos anteriores se conservan.',error)}
  record=next;baseRaw=raw;
 }
 function cancelTimer(){if(timer!==null){clearTimeoutImpl(timer);timer=null}}
 function schedule(){
  cancelTimer();if(closed||restoring||!opened||!record?.dirty||conflicted||saveFailed||pendingSync)return;
  const operationEpoch=epoch;
  timer=setTimeoutImpl(()=>{timer=null;if(!closed&&operationEpoch===epoch)void sync()},Math.max(0,Number(debounceMs)||0));
 }
 async function tokenFor(operationEpoch){const token=await getToken();active(operationEpoch);if(typeof token!=='string'||!token)throw fail('NO_TOKEN','Inicia sesión de nuevo para sincronizar tu cuenta.');return token}
 async function readRemote(operationEpoch){const token=await tokenFor(operationEpoch),row=await api.readState(uid,token);active(operationEpoch);return {row:remoteRow(row),token}}
 function markConflict(code='CONFLICT',extra={}){
  const message=extra.saveFailed?'El último cambio no se guardó. La copia anterior sigue intacta. Esta cuenta cambió en otra pestaña; recarga para conservar sus cambios.':'Hay cambios diferentes en la nube o en otra pestaña. Conservamos tu copia; revisa cuál quieres recuperar.';
  conflicted=true;cancelTimer();emit('conflict',message,{code,...extra});
 }
 // A matching payload acknowledges an upload whose reply may have been lost.
 // JSON keys are compared independently of their order (Postgres JSONB may reorder them).
 function reconcile(remote){
  unchanged();
  if(record.dirty){
   if(remote&&remote.revision>=record.baseRevision&&sameState(remote.state,record.state)){
    persist({...record,baseRevision:remote.revision,dirty:false});conflicted=false;return {changed:false,upload:false};
   }
   if((remote===null&&record.baseRevision===0)||(remote&&remote.revision===record.baseRevision)){conflicted=false;return {changed:false,upload:true}}
   markConflict();return {changed:false,upload:false,conflict:true};
  }
  if((remote===null&&record.baseRevision>0)||(remote&&remote.revision<record.baseRevision)){markConflict();return {changed:false,upload:false,conflict:true}}
  if(remote){
   const changed=!sameState(remote.state,record.state);
   if(changed||remote.revision!==record.baseRevision)persist({...record,state:remote.state,baseRevision:remote.revision,generation:record.generation+(changed?1:0),dirty:false});
   conflicted=false;return {changed,upload:false};
  }
  conflicted=false;return {changed:false,upload:false};
 }
 function reportFailure(error,extra={}){
  if(closed||error?.code==='CLOSED')return;
  if(error?.code==='CONFLICT'||error?.code==='STALE_CACHE'){markConflict(error.code,extra);return}
  if(extra.saveFailed)emit('error','El último cambio no se guardó en este dispositivo. La copia anterior sigue intacta; vuelve a intentar guardarlo.',{code:error?.code||'SAVE_FAILED',...extra});
  else if(['CACHE_WRITE_FAILED','CACHE_READ_FAILED','RECOVERY_WRITE_FAILED','INVALID_REMOTE','INVALID_STATE','CORRUPT_CACHE'].includes(error?.code))emit('error','No se pudo completar la sincronización. Tu copia local se conserva.',{code:error.code,...extra});
  else emit('offline',record?'Guardado en este dispositivo. Revisa tu conexión o inicia sesión de nuevo para sincronizar.':'No se pudo abrir tu cuenta. Revisa tu conexión o inicia sesión de nuevo.',{code:error?.code==='NO_TOKEN'?'NO_TOKEN':'REMOTE_UNAVAILABLE',...extra});
 }
 async function open(){
  active();if(opened)return clone(record.state);if(opening)return opening;if(restoring)throw fail('BUSY','La recuperación de esta cuenta sigue en curso.');
  const operationEpoch=epoch;
  const operation=(async()=>{
   baseRaw=readRaw();record=baseRaw===null?null:parseCache(baseRaw);
   let remote;
   try{remote=(await readRemote(operationEpoch)).row}catch(error){
    active(operationEpoch);unchanged();
    if(record){opened=true;reportFailure(error);return clone(record.state)}
    reportFailure(error);throw fail('REMOTE_READ_FAILED','No se pudieron abrir tus datos en la nube. No se creó una cuenta vacía.',error);
   }
   active(operationEpoch);unchanged();
   if(!record){
    const initial={version:1,uid,state:remote?remote.state:stateCopy(freshState()),baseRevision:remote?remote.revision:0,dirty:false,generation:0};
    try{persist(initial)}catch(error){reportFailure(error);throw error}
    opened=true;emit('synced',remote?'Tu cuenta está actualizada.':'Tu cuenta está lista. Tus datos anteriores del dispositivo se conservan aparte.');return clone(record.state);
   }
   opened=true;
   try{
    const outcome=reconcile(remote);
    if(!outcome.conflict){if(outcome.upload){emit('syncing','Tus cambios guardados están pendientes de sincronizar.');schedule()}else emit('synced','Tu cuenta está actualizada.',outcome.changed?{stateChanged:true,state:clone(record.state)}:{})}
   }catch(error){reportFailure(error)}
   return clone(record.state);
  })();
  opening=operation;
  try{return await operation}finally{if(opening===operation)opening=null}
 }
 function save(state){
  try{
   loaded();const nextState=stateCopy(state);
   persist({...record,state:nextState,dirty:true,generation:record.generation+1});
   saveFailed=false;lastSaveError=null;
  }catch(error){if(!closed&&error?.code!=='CLOSED'){saveFailed=true;lastSaveError=error;cancelTimer();reportFailure(error,{saveFailed:true})}throw error}
  if(conflicted)markConflict();else{emit('syncing','Guardado en este dispositivo. Sincronizando tu cuenta…');schedule()}
 }
 function pauseForUnsavedChange(){
  if(!saveFailed)return false;
  reportFailure(lastSaveError||fail('SAVE_FAILED','El último cambio no se guardó.'),{saveFailed:true});return true;
 }
 function sync(){
  loaded();if(pauseForUnsavedChange())return Promise.resolve(null);if(pendingSync)return pendingSync.promise;cancelTimer();
  const operationEpoch=epoch,operation={promise:null};
  operation.promise=(async()=>{
   try{
    while(true){
     active(operationEpoch);if(pauseForUnsavedChange())return null;unchanged();emit('syncing','Sincronizando tu cuenta…');
     if(pauseForUnsavedChange())return null;
     const {row:remote,token}=await readRemote(operationEpoch);active(operationEpoch);
     // A rejected save may exist only in the caller's memory. Keep its original base revision
     // until that edit is saved successfully; a concurrent cloud response must not rebase it.
     if(pauseForUnsavedChange())return null;
     const outcome=reconcile(remote);
     if(outcome.conflict)return clone(record);
     if(!record.dirty){emit('synced','Tu cuenta está actualizada.',outcome.changed?{stateChanged:true,state:clone(record.state)}:{});return clone(record)}
     const sent=clone(record),row=remoteRow(await (sent.baseRevision===0?api.insertState(uid,sent.state,token):api.updateState(uid,sent.baseRevision,sent.state,token)));
     active(operationEpoch);
     if(pauseForUnsavedChange())return null;
     if(!row||row.revision!==sent.baseRevision+1||!sameState(row.state,sent.state))throw fail('INVALID_REMOTE','No se pudo confirmar la versión guardada en la nube.');
     unchanged();
     // Saves during the request remain dirty and use this newly acknowledged revision.
     persist({...record,baseRevision:row.revision,dirty:record.generation!==sent.generation});
     conflicted=false;
     if(!record.dirty){emit('synced','Tu cuenta está actualizada.');return clone(record)}
    }
   }catch(error){if(closed||operationEpoch!==epoch)return null;reportFailure(error);return record?clone(record):null}
  })();
  pendingSync=operation;
  operation.promise=operation.promise.finally(()=>{if(pendingSync===operation)pendingSync=null});
  return operation.promise;
 }
 async function useRemote(){
  active();if(restoring)throw fail('BUSY','La recuperación de esta cuenta sigue en curso.');
  restoring=true;cancelTimer();const operationEpoch=++epoch;pendingSync=null;
  try{
   if(!opened&&!record)baseRaw=readRaw();
   unchanged();const {row:remote}=await readRemote(operationEpoch);active(operationEpoch);unchanged();
   const next={version:1,uid,state:remote?remote.state:stateCopy(freshState()),baseRevision:remote?remote.revision:0,dirty:false,generation:(record?.generation??0)+1};
   if(baseRaw!==null){
    let recoveryKey;
    do{recoveryKey=key+':recovery:'+Date.now().toString(36)+'-'+(++recoverySequence)}while(storage.getItem(recoveryKey)!==null);
    try{storage.setItem(recoveryKey,baseRaw)}catch(error){throw fail('RECOVERY_WRITE_FAILED','No se pudo guardar una copia de recuperación. Tus datos locales siguen intactos.',error)}
   }
   active(operationEpoch);persist(next);opened=true;conflicted=false;saveFailed=false;lastSaveError=null;emit('synced','Se recuperó la copia de la nube. Tu copia anterior se conservó en este dispositivo.',{stateChanged:true,state:clone(record.state)});return clone(record.state);
  }catch(error){if(!closed&&operationEpoch===epoch)reportFailure(error);throw error}finally{if(operationEpoch===epoch)restoring=false}
 }
 return {
  get dataKey(){return key},
  open,save,sync,useRemote,
  snapshot(){return record?clone(record):null},
  exportState(){loaded();return clone(record.state)},
  close(){if(closed)return;closed=true;epoch++;cancelTimer();pendingSync=null}
 };
}
