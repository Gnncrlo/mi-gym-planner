// The old device data stays in mgp-v2. Authenticated accounts use only their UUID cache.
const gymCloudModeKey='mgp-cloud-mode-v1';
const gymCloudRequireLoginKey='mgp-cloud-require-login-v1';
let cloudAccountEpoch=0;
let cloudMode=false,cloudReady=false,cloudBusy=false,cloudOpening=false,cloudReplacing=false,cloudError='',legacyLoadError='';
let cloudAuth=null,cloudApi=null,cloudController=null,cloudUser=null,cloudStatus=null;
let cloudAuthView='',cloudEmail='',cloudFormMessage='';
function cloudConfigured(){return !!GYM_CLOUD_CONFIG.url&&!!GYM_CLOUD_CONFIG.publishableKey}
function cloudProjectId(){return new URL(GYM_CLOUD_CONFIG.url).host}
function freshCloudPlannerState(user){
 const state=JSON.parse(JSON.stringify(defaults));
 return {...state,tab:'mas',body:[],profileName:String(user?.name||'Mi perfil').trim().slice(0,40)||'Mi perfil'};
}
function normalizeCloudPlannerState(state,user){
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const invalid=()=>Error('Los registros de esta cuenta tienen un formato inesperado. Se conservan intactos; descarga una copia antes de recuperarlos.');
 if(!object(state))throw invalid();
 for(const [key,value] of Object.entries(defaults)){
  if(state[key]===undefined)continue;
  if(Array.isArray(value)&&!Array.isArray(state[key])||object(value)&&!object(state[key]))throw invalid();
 }
 for(const key of ['body','foodLog','dayHistory'])if(state[key]?.some(entry=>!object(entry)))throw invalid();
 if(state.custom?.some(entry=>!Array.isArray(entry)))throw invalid();
 if(state.dayHistory?.some(entry=>!Array.isArray(entry.exercises)||!Array.isArray(entry.tasks)||!Array.isArray(entry.foods)))throw invalid();
 const fresh=freshCloudPlannerState(user),result={...fresh,...state};
 if(!Number.isInteger(result.week)||result.week<1||!Number.isInteger(result.day)||result.day<0||result.day>6)throw invalid();
 result.profileName=typeof state.profileName==='string'&&state.profileName.trim()?state.profileName.trim():fresh.profileName;
 return result;
}
function cloudHasRecords(state){
 const empty=freshCloudPlannerState(cloudUser);
 return Object.keys(state).some(key=>!['tab','day','week','profileName'].includes(key)&&JSON.stringify(state[key])!==JSON.stringify(empty[key]));
}
function cloudViewKey(){return 'mgp-cloud-view-v1:'+cloudProjectId()+':'+cloudUser.id}
function cloudView(state){return {tab:state.tab,day:state.day,week:state.week}}
function readCloudView(state){
 try{const value=JSON.parse(localStorage.getItem(cloudViewKey())||'null');if(value&&['inicio','dia','rutina','habitos','comidas','bienestar','progreso','calendario','mas'].includes(value.tab)&&Number.isInteger(value.day)&&value.day>=0&&value.day<7&&Number.isInteger(value.week)&&value.week>=1)return {...state,...cloudView(value)}}catch{}
 return state;
}
function plannerRecordsJSON(state){
 function sorted(value){if(Array.isArray(value))return value.map(sorted);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]));return value}
 return JSON.stringify(sorted(Object.fromEntries(Object.entries(state).filter(([key])=>!['tab','day','week'].includes(key)))));
}
function pendingMealDrafts(){return !!foodDraft.text.trim()||[...foodDrafts.values()].some(draft=>String(draft.text||'').trim())}
function assertNoPendingMealDrafts(){
 if(pendingMealDrafts())throw Error('Tienes comidas sin guardar. Guárdalas o vacía sus borradores antes de cambiar de cuenta o cargar otros registros.');
 if(!cloudMode&&deviceSaveFailed)throw Error('Este perfil tiene cambios sin guardar. Descarga una copia y usa Reintentar guardado antes de cambiar de usuario o iniciar sesión.');
 if(cloudStatus?.saveFailed)throw Error('Hay cambios que no se pudieron guardar. Descarga una copia y usa Sincronizar ahora para volver a intentar guardarlos antes de continuar.');
}
function cloudStatusText(){
 if(!cloudMode)return deviceSaveFailed?'Hay cambios que aún no se han guardado en este dispositivo.':'En este dispositivo';
 if(!cloudReady)return cloudBusy?'Abriendo tu cuenta':'Inicia sesión';
 return cloudStatus?.message||'Comprobando sincronización';
}
function updateCloudStatus(){
 const compact=!cloudMode?deviceSaveFailed?'Revisar guardado':'Este dispositivo':!cloudReady?cloudBusy?'Conectando…':'Inicia sesión':({syncing:'Guardando…',synced:'Nube al día',offline:'Pendiente',conflict:'Revisar cambios',error:'Revisar guardado'}[cloudStatus?.kind]||'Comprobando…');
 document.querySelectorAll('[data-cloud-status]').forEach(element=>{element.textContent=element.classList.contains('profile-active-tag')?compact:cloudStatusText()});
 document.querySelectorAll('[data-cloud-conflict-ui]').forEach(element=>{element.hidden=cloudStatus?.kind!=='conflict'});
 document.querySelectorAll('[data-cloud-save-notice]').forEach(element=>{element.hidden=cloudMode?!cloudReady||!cloudStatus?.saveFailed:!deviceSaveFailed});
}
function cloudErrorText(error){return error?.message||'No se pudo completar la operación. Tus registros guardados se conservan.'}
function cloudAccountForm(){
 const signup=cloudAuthView==='signup',disabled=cloudBusy||!cloudConfigured();
 return `<form id="cloudAuthForm" class="profile-create-form"><h3>${signup?'Crear mi cuenta':'Iniciar sesión'}</h3>${signup?'<label class="label" for="cloudName">Tu nombre</label><input class="field" id="cloudName" data-cloud-field autocomplete="given-name" maxlength="40" required '+(disabled?'disabled':'')+'>':''}<label class="label" for="cloudEmail">Correo electrónico</label><input class="field" id="cloudEmail" data-cloud-field type="email" autocomplete="email" maxlength="254" value="${esc(cloudEmail)}" required ${disabled?'disabled':''}><label class="label" for="cloudPassword">Contraseña</label><input class="field" id="cloudPassword" data-cloud-field type="password" autocomplete="${signup?'new-password':'current-password'}" ${signup?'minlength="8"':''} required ${disabled?'disabled':''}><button class="btn" type="submit" ${disabled?'disabled':''}>${cloudBusy?'Conectando…':signup?'Crear cuenta':'Entrar'} ${uiIcon('arrow')}</button></form>`;
}
function renderCloudAccountCard({gate=false}={}){
 const configured=cloudConfigured();
 if(cloudMode&&cloudReady){
  const conflict=cloudStatus?.kind==='conflict';let hasLegacy=false;try{hasLegacy=!!deviceImportSource().raw}catch{}
  return `<section class="card profile-manager"><div class="profile-manager-heading"><h3>Tu cuenta</h3><p>${esc(S.profileName)} · ${esc(cloudUser?.email||'')}</p></div><p data-cloud-status role="status">${esc(cloudStatusText())}</p><p class="profile-help">Tus registros se guardan para esta cuenta. Entra con el mismo correo para abrirlos en otro dispositivo.</p><button class="btn secondary" data-cloud-sync ${cloudBusy?'disabled':''}>Sincronizar ahora</button>${'<div class="profile-storage-notice" data-cloud-conflict-ui '+(conflict?'':'hidden')+'><p>Hay cambios distintos en otro dispositivo. Conservamos tus cambios locales; descarga una copia antes de elegir la versión de la nube.</p><button class="btn secondary" data-cloud-export>Descargar mis cambios locales</button><button class="btn secondary" data-cloud-use-remote>Cargar la versión de la nube</button></div>'}${hasLegacy?'<div class="profile-import-legacy"><h4>Perfil local de este dispositivo</h4><p class="profile-help">Puedes copiar el perfil local seleccionado a tu cuenta vacía. La confirmación muestra de quién son los registros. El original se conserva.</p><button class="btn secondary" data-cloud-import-local '+(cloudBusy?'disabled':'')+'>Importar mi perfil local</button></div>':''}<p class="food-error" role="alert">${esc(cloudError)}</p><button class="text-link" data-cloud-logout ${cloudBusy?'disabled':''}>Cerrar sesión</button><button class="btn secondary profile-share-btn" data-cloud-share>Compartir la app ${uiIcon('arrow')}</button><p id="cloudShareStatus" class="profile-help" role="status"></p></section>`;
 }
 return `<section class="card profile-manager"><div class="profile-manager-heading"><h3>${gate?'Abre tu cuenta':'Tu cuenta y tus registros'}</h3><p>Un correo y una contraseña para recuperar tus registros en otros dispositivos.</p></div>${configured?'':'<p class="profile-storage-notice">El servicio de cuentas todavía está pendiente de activar. Tus registros actuales siguen guardados en este dispositivo.</p>'}${cloudBusy?'<p role="status">Abriendo tus registros…</p>':''}<div class="cloud-auth-actions"><button class="btn secondary" data-cloud-auth="signin" ${!configured||cloudBusy?'disabled':''}>Iniciar sesión</button><button class="btn secondary" data-cloud-auth="signup" ${!configured||cloudBusy?'disabled':''}>Crear cuenta</button></div>${cloudAuthView&&!cloudBusy?cloudAccountForm():''}<p class="food-error" role="alert">${esc(cloudError)}</p><p class="profile-help" role="status">${esc(cloudFormMessage)}</p>${gate?'<button class="text-link" data-cloud-retry '+(!configured||cloudBusy?'disabled':'')+'>Reintentar conexión</button><button class="text-link" data-cloud-device '+(cloudBusy?'disabled':'')+'>Ver los registros de este dispositivo</button>':''}<p class="profile-help">Crear una cuenta no copia los datos anteriores del dispositivo. Cada usuario empieza con sus propios registros.</p></section>`;
}
function renderCloudGate(){
 if(cloudReplacing)return '<section class="card profile-manager" role="status"><h2>Actualizando tus registros</h2><p>Espera a que termine de cargar la versión de la nube.</p></section>';
 if(legacyLoadError&&!cloudMode)return `<div class="profile-storage-notice" role="alert"><h2>No pudimos abrir los registros de este perfil</h2><p>No los hemos borrado ni reiniciado.</p><button class="btn" data-cloud-recovery>Descargar copia de recuperación</button><button class="btn secondary" data-cloud-reload>Volver a cargar</button></div>${renderDeviceProfilesCard()}${renderCloudAccountCard({gate:true})}`;
 return renderCloudAccountCard({gate:true});
}
function cloudPageBlocked(){return cloudReplacing||cloudMode&&!cloudReady||!cloudMode&&!!legacyLoadError}
function prepareCloudAccounts(){
 try{cloudMode=localStorage.getItem(gymCloudModeKey)==='cloud'}catch{cloudError='No se pudo abrir el almacenamiento de este navegador.'}
 if(cloudMode){cloudBusy=true;cloudAuthView='signin'}
 // Confirmation emails may return URL tokens; sign-in still requires the password form.
 const fragment=new URLSearchParams(window.location.hash.slice(1));
 if(fragment.has('access_token')||fragment.has('refresh_token')){window.history.replaceState(null,'',window.location.pathname+window.location.search);cloudFormMessage='Si ya confirmaste tu correo, puedes iniciar sesión.'}
}
function ensureCloudAuth(){
 if(!cloudApi)cloudApi=createGymCloudClient({...GYM_CLOUD_CONFIG,redirectUrl:'https://gnncrlo.github.io/mi-gym-planner/'});
 if(!cloudAuth)cloudAuth=createGymCloudAuth({client:cloudApi,storage:localStorage,projectId:cloudProjectId()});
 return cloudAuth;
}
function newCloudController(user,{active=false}={}){
 const api=cloudApi,auth=cloudAuth;
 // Reject malformed planner data before the synchronizer can replace a valid cache.
 const checkedApi={
  async readState(...args){const row=await api.readState(...args);if(row){try{normalizeCloudPlannerState(row.state,user)}catch(error){error.code='INVALID_REMOTE';throw error}}return row},
  insertState:(...args)=>api.insertState(...args),updateState:(...args)=>api.updateState(...args)
 };
 const controller=createGymCloudSync({uid:user.id,projectId:cloudProjectId(),storage:localStorage,api:checkedApi,getToken:()=>auth.getToken(),freshState:()=>freshCloudPlannerState(user),onStatus:status=>{
  if(!active||cloudController!==controller)return;
  cloudStatus=status;
  if(status.stateChanged&&!status.saveFailed&&!cloudOpening&&!cloudReplacing&&cloudReady){
   try{const view={tab:S.tab,day:S.day,week:S.week};S={...normalizeCloudPlannerState(status.state,user),...view};render()}
   catch(error){cloudError=cloudErrorText(error);cloudReady=false;controller.close();render()}
  }
  updateCloudStatus();
 }});
 return controller;
}
async function startCloudAccounts(){
 if(!cloudMode){attachWelcome();return}
 const epoch=++cloudAccountEpoch;
 cloudBusy=true;cloudError='';render();
 try{
  const auth=ensureCloudAuth();
  const user=window.sessionStorage.getItem(gymCloudRequireLoginKey)==='1'?null:await auth.resume();
  if(epoch!==cloudAccountEpoch)return;
  if(!user){cloudAuthView='signin';cloudReady=false;return}
  cloudUser=user;cloudOpening=true;cloudController?.close();cloudController=newCloudController(user,{active:true});
  const controller=cloudController,state=await controller.open();if(epoch!==cloudAccountEpoch){controller.close();return}S=readCloudView(normalizeCloudPlannerState(state,user));cloudReady=true;cloudOpening=false;
 }catch(error){if(epoch===cloudAccountEpoch){cloudError=cloudErrorText(error);cloudController?.close();cloudController=null;cloudReady=false;cloudOpening=false}}
 finally{if(epoch===cloudAccountEpoch){cloudBusy=false;render();if(cloudReady)attachWelcome()}}
}
async function submitCloudAuth(form){
 if(cloudBusy)return;
 const epoch=++cloudAccountEpoch;
 const email=form.querySelector('#cloudEmail').value.trim(),password=form.querySelector('#cloudPassword').value,name=form.querySelector('#cloudName')?.value.trim();
 cloudEmail=email;
 try{
  assertNoPendingMealDrafts();if(cloudAuthView==='signup'&&(!name||name.length>40))throw Error('Escribe un nombre de entre 1 y 40 caracteres.');
  cloudBusy=true;cloudError='';cloudFormMessage='';render();const auth=ensureCloudAuth();
  let user;
  if(cloudAuthView==='signup'){const result=await auth.signUp(email,password,name);if(epoch!==cloudAccountEpoch)return;if(result.requiresConfirmation){cloudFormMessage='Revisa tu correo para confirmar la cuenta. Después vuelve e inicia sesión.';cloudAuthView='signin';return}user=result.user}
  else user=await auth.signIn(email,password);
  if(epoch!==cloudAccountEpoch)return;
  const controller=newCloudController(user);
  try{await controller.open();if(epoch!==cloudAccountEpoch)return;window.sessionStorage.removeItem(gymCloudRequireLoginKey);localStorage.setItem(gymCloudModeKey,'cloud')}finally{controller.close()}
  window.location.reload();
 }catch(error){if(epoch===cloudAccountEpoch)cloudError=cloudErrorText(error)}finally{if(epoch===cloudAccountEpoch){cloudBusy=false;render()}}
}
function savePlannerState(){
 if(cloudPageBlocked())throw Error('Espera a que se abran tus registros antes de guardar.');
 if(cloudMode){
  if(!cloudController)throw Error('Tu cuenta aún no está abierta.');
  try{localStorage.setItem(cloudViewKey(),JSON.stringify(cloudView(S)))}catch{}
  const current=cloudController.snapshot()?.state;
  if(!cloudStatus?.saveFailed&&current&&plannerRecordsJSON(current)===plannerRecordsJSON(S))return;
  cloudController.save(S);
 }
 else saveDevicePlannerState(S);
}
function downloadPlannerJSON(value,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportPlannerAccount(){
 const name=String(S.profileName||'perfil').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'perfil';
 downloadPlannerJSON(S,'mi-gym-planner-'+name+'-respaldo.json');
}
async function restorePlannerAccount(file){
 const destination=cloudMode?cloudUser?.id:deviceProfileIdentity(),epoch=cloudAccountEpoch,controller=cloudController;
 try{
  const data=JSON.parse(await file.text());
  if(epoch!==cloudAccountEpoch||destination!==(cloudMode?cloudUser?.id:deviceProfileIdentity())||controller!==cloudController)throw Error('La cuenta cambió. Vuelve a elegir tu archivo.');
  if(!data||Array.isArray(data)||typeof data!=='object'||!data.done||Array.isArray(data.done)||typeof data.done!=='object'||!data.schedule||Array.isArray(data.schedule)||typeof data.schedule!=='object')throw Error('El archivo no es un respaldo válido de Mi Gym Planner.');
  if(!confirm('¿Restaurar esta copia '+(cloudMode?'en la cuenta de '+cloudUser.email:'en el perfil de '+S.profileName+' de este dispositivo')+'? Reemplazará sus registros; no cambia los de otros usuarios.'))return;
  let candidate={...(cloudMode?freshCloudPlannerState(cloudUser):JSON.parse(JSON.stringify(defaults))),...data,...(cloudMode?{profileName:S.profileName}:{})};
  if(cloudMode)candidate=normalizeCloudPlannerState(candidate,cloudUser);
  if(cloudMode)cloudController.save(candidate);else{if(legacyLoadError)throw Error('Conserva primero una copia de los datos que no se pueden abrir.');saveDevicePlannerState(candidate)}
  if(!cloudMode){deviceSaveFailed=false;deviceProfileError=''}
  S=candidate;foodDrafts.clear();foodDraft={text:'',type:1};foodDraftDate='';foodNotice=null;render();
 }catch(error){cloudError=cloudErrorText(error);render()}
}
async function importDeviceRecords(){
 if(!cloudMode||!cloudReady||!cloudUser||cloudBusy)return;
 const user=cloudUser,controller=cloudController,auth=cloudAuth,api=cloudApi,epoch=cloudAccountEpoch;
 const sameAccount=()=>epoch===cloudAccountEpoch&&cloudReady&&cloudUser?.id===user.id&&cloudController===controller;
 try{
  assertNoPendingMealDrafts();const source=deviceImportSource(),raw=source.raw,legacy=raw?JSON.parse(raw):null;
  if(!legacy||Array.isArray(legacy)||typeof legacy!=='object')throw Error('No hay registros anteriores válidos que importar.');
  cloudBusy=true;cloudError='';render();await controller.sync();if(!sameAccount())return;
  const token=await auth.getToken();if(!sameAccount())return;
  const remote=await api.readState(user.id,token);if(!sameAccount())return;
  if(cloudHasRecords(S)||remote&&cloudHasRecords(normalizeCloudPlannerState(remote.state,cloudUser)))throw Error('Esta cuenta ya tiene registros. Exporta una copia antes de reemplazarlos mediante Restaurar una copia. No se ha importado nada.');
  if(localStorage.getItem(source.key)!==raw)throw Error('El perfil local cambió mientras se preparaba la importación. Vuelve a intentarlo para copiar su versión actual.');
  if(!confirm('¿Copiar los registros de '+String(legacy.profileName||'Giancarlo')+' de este dispositivo a la cuenta '+user.email+'? El original del dispositivo se conserva.'))return;
  const candidate=normalizeCloudPlannerState({...freshCloudPlannerState(user),...legacy,profileName:S.profileName,tab:'mas'},user);
  controller.save(candidate);S=candidate;await controller.sync();
 }catch(error){if(sameAccount())cloudError=cloudErrorText(error)}finally{if(sameAccount()){cloudBusy=false;render()}}
}
async function syncPlannerAccount(){
 if(!cloudController||cloudBusy)return;
 if(pendingMealDrafts()&&!cloudController.snapshot().dirty){cloudError='Guarda o vacía tus borradores de comida antes de cargar cambios de otro dispositivo.';render();return}
 if(cloudStatus?.saveFailed){try{savePlannerState()}catch(error){cloudError=cloudErrorText(error);render();return}}
 cloudError='';await cloudController.sync();updateCloudStatus();
}
function cloudFieldFocused(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
async function useCloudVersion(){
 if(!cloudController||cloudBusy)return;
 const controller=cloudController,epoch=cloudAccountEpoch,userId=cloudUser?.id;
 const sameAccount=()=>epoch===cloudAccountEpoch&&controller===cloudController&&userId===cloudUser?.id;
 try{
  assertNoPendingMealDrafts();if(!confirm('¿Cargar los registros de tu cuenta en la nube? Primero descargaremos una copia de tus cambios locales para conservarlos.'))return;
  exportPlannerAccount();cloudReplacing=true;cloudBusy=true;render();await controller.useRemote();if(!sameAccount())return;controller.close();window.location.reload();
 }catch(error){if(sameAccount()){cloudError=cloudErrorText(error);cloudReplacing=false;cloudBusy=false;render()}}
}
async function logoutPlannerAccount(){
 if(cloudBusy)return;
 try{
  assertNoPendingMealDrafts();if(cloudController?.snapshot().dirty&&!confirm('Hay cambios guardados en este dispositivo que aún no se han subido. Se conservarán para tu próxima sesión en este dispositivo. ¿Cerrar sesión?'))return;
  window.sessionStorage.setItem(gymCloudRequireLoginKey,'1');const epoch=++cloudAccountEpoch;
  cloudBusy=true;cloudReady=false;cloudEmail='';cloudController?.close();render();await cloudAuth?.signOut();if(epoch===cloudAccountEpoch)window.location.reload();
 }catch(error){cloudError=cloudErrorText(error);cloudBusy=false;render()}
}
async function sharePlannerApp(){
 const url='https://gnncrlo.github.io/mi-gym-planner/',status=document.querySelector('#cloudShareStatus');
 try{if(navigator.share)await navigator.share({title:'Mi Gym Planner',text:'Crea tu cuenta y lleva tus propios registros.',url});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);if(status)status.textContent='Enlace copiado. No incluye tus registros.'}else if(status)status.textContent=url}catch(error){if(error.name!=='AbortError'&&status)status.textContent='Comparte este enlace: '+url}
}
function exportPlannerRecovery(){
 const records={};
 if(!cloudMode){const key=ensureDeviceProfiles().keyFor(deviceProfileIdentity()),raw=localStorage.getItem(key);if(raw!==null)records[key]=raw}
 else if(cloudUser&&cloudAuth?.currentUser()?.id===cloudUser.id){const key='mgp-cloud-v1:'+cloudProjectId()+':'+cloudUser.id;for(let index=0;index<localStorage.length;index++){const name=localStorage.key(index);if(name===key||name?.startsWith(key+':recovery:'))records[name]=localStorage.getItem(name)}}
 downloadPlannerJSON({format:'mi-gym-planner-recovery',records},'mi-gym-planner-recuperacion.json');
}
function attachCloudAccounts(){
 document.addEventListener('submit',event=>{if(event.target.id==='cloudAuthForm'){event.preventDefault();submitCloudAuth(event.target)}});
 document.addEventListener('click',event=>{
  const auth=event.target.closest('[data-cloud-auth]');if(auth&&!auth.disabled){cloudAuthView=auth.dataset.cloudAuth;cloudError='';render();return}
  if(event.target.closest('[data-cloud-sync]')){if(cloudMode)syncPlannerAccount();else retryDevicePlannerSave()}
  if(event.target.closest('[data-cloud-logout]'))logoutPlannerAccount();
  if(event.target.closest('[data-cloud-import-local]'))importDeviceRecords();
  if(event.target.closest('[data-cloud-export]'))exportPlannerAccount();
  if(event.target.closest('[data-cloud-use-remote]'))useCloudVersion();
  if(event.target.closest('[data-cloud-share]'))sharePlannerApp();
  if(event.target.closest('[data-cloud-recovery]'))exportPlannerRecovery();
  if(event.target.closest('[data-cloud-reload]'))window.location.reload();
  if(event.target.closest('[data-cloud-retry]'))startCloudAccounts();
  if(event.target.closest('[data-cloud-device]')){localStorage.setItem(gymCloudModeKey,'device');window.location.reload()}
 });
 for(const type of ['input','change','submit','click'])document.addEventListener(type,event=>{
  if(!cloudPageBlocked())return;
  if(!cloudMode&&event.target.closest('#deviceProfileForm,[data-device-profile]'))return;
  if(event.target.closest('#cloudAuthForm,[data-cloud-auth],[data-cloud-retry],[data-cloud-device],[data-cloud-recovery],[data-cloud-reload]'))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 window.addEventListener('online',()=>{if(cloudReady&&!cloudFieldFocused()&&!pendingMealDrafts())syncPlannerAccount()});
 window.addEventListener('beforeunload',event=>{if(cloudMode?cloudReady&&cloudStatus?.saveFailed:deviceSaveFailed){event.preventDefault();event.returnValue=''}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloudReady&&!cloudFieldFocused()&&!pendingMealDrafts())syncPlannerAccount()});
}
