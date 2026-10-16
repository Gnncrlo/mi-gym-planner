// Local profiles are independent stores, not authenticated cloud accounts.
// The original owner's store remains mgp-v2; it is never moved or copied.
function createGymDeviceProfiles({storage,freshState,normalizeState,newId=()=>globalThis.crypto.randomUUID()}={}){
 const owner='owner',prefix='mgp-device-profile-v1:';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const fail=(code,message)=>Object.assign(new Error(message),{code});
 function keyFor(id){
  if(id===owner)return 'mgp-v2';
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw fail('PROFILE_ID','El perfil seleccionado no es válido.');
  return prefix+id;
 }
 function read(id){
  const key=keyFor(id),raw=storage.getItem(key);
  if(raw===null&&id!==owner)throw fail('PROFILE_MISSING','No se encontraron los registros de este perfil. No se ha creado ni reemplazado nada.');
  let state;
  try{state=raw===null?freshState('Mi perfil'):normalizeState(JSON.parse(raw),id===owner?'Giancarlo':'Mi perfil')}
  catch{throw fail('PROFILE_CORRUPT','No se pueden abrir los registros de este perfil. Se conservan intactos para recuperarlos.')}
  return {id,key,raw,state:clone(state)};
 }
 function comparable(value){
  if(Array.isArray(value))return value.map(comparable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,comparable(value[key])]));
  return value;
 }
 function changed(handle,state){return JSON.stringify(comparable(handle.state))!==JSON.stringify(comparable(state))}
 function save(handle,state){
  const key=keyFor(handle.id);
  if(storage.getItem(key)!==handle.raw)throw fail('PROFILE_STALE','Este perfil cambió en otra pestaña. Descarga tus registros antes de recargar; no se ha sobrescrito la otra copia.');
  const candidate=normalizeState(state,handle.state.profileName);
  if(!changed(handle,candidate))return;
  const raw=JSON.stringify(candidate);
  try{storage.setItem(key,raw)}catch{throw fail('PROFILE_QUOTA','No se pudo guardar este cambio en el dispositivo. La copia anterior se conserva; descarga tus registros antes de recargar.')}
  handle.raw=raw;handle.state=clone(candidate);
 }
 function create(name){
  if(typeof name!=='string'||!name.trim()||name.trim().length>40)throw fail('PROFILE_NAME','Escribe un nombre de entre 1 y 40 caracteres.');
  let id,key;
  for(let attempt=0;attempt<8;attempt++){id=newId();key=keyFor(id);if(id!==owner&&storage.getItem(key)===null)break;key=null}
  if(!key)throw fail('PROFILE_ID','No se pudo crear un identificador nuevo. Inténtalo otra vez.');
  const state=normalizeState(freshState(name.trim()),name.trim()),raw=JSON.stringify(state);
  try{storage.setItem(key,raw)}catch{throw fail('PROFILE_QUOTA','No se pudo crear el perfil. Los registros existentes se conservan.')}
  return {id,key,raw,state:clone(state)};
 }
 function list(){
  const ids=new Set([owner]);
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(prefix)){const id=key.slice(prefix.length);try{keyFor(id);ids.add(id)}catch{}}}
  return [...ids].map(id=>{try{return {id,name:read(id).state.profileName,error:false}}catch{return {id,name:id===owner?'Perfil original':'Perfil pendiente de recuperar',error:true}}});
 }
 return {read,save,create,list,keyFor,changed};
}

const gymDeviceActiveKey='mgp-device-active-v1';
let deviceProfiles=null,deviceProfileHandle=null,deviceProfileId='owner',deviceProfileDraft='',deviceProfileError='',deviceSaveFailed=false;
function ensureDeviceProfiles(){
 if(!deviceProfiles)deviceProfiles=createGymDeviceProfiles({storage:localStorage,
  freshState:name=>({...JSON.parse(JSON.stringify(defaults)),body:[],profileName:name}),
  normalizeState:(state,name)=>normalizeCloudPlannerState(state,{name})});
 return deviceProfiles;
}
function selectedDeviceProfileId(){return window.sessionStorage.getItem(gymDeviceActiveKey)||localStorage.getItem(gymDeviceActiveKey)||'owner'}
function loadDevicePlannerState(){
 deviceProfileId=selectedDeviceProfileId();deviceProfileHandle=ensureDeviceProfiles().read(deviceProfileId);
 return JSON.parse(JSON.stringify(deviceProfileHandle.state));
}
function currentDeviceProfile(){
 if(!deviceProfileHandle){deviceProfileId=selectedDeviceProfileId();deviceProfileHandle=ensureDeviceProfiles().read(deviceProfileId)}
 return deviceProfileHandle;
}
function deviceProfileIdentity(){return deviceProfileHandle?.id||deviceProfileId}
function saveDevicePlannerState(state){
 try{ensureDeviceProfiles().save(currentDeviceProfile(),state);if(state===S){deviceSaveFailed=false;deviceProfileError=''}}
 catch(error){if(state===S){deviceSaveFailed=true;deviceProfileError=cloudErrorText(error);updateCloudStatus()}throw error}
 if(state===S)updateCloudStatus();
}
function retryDevicePlannerSave(){try{saveDevicePlannerState(S)}catch(error){deviceProfileError=cloudErrorText(error)}render()}
function deviceImportSource(){const id=selectedDeviceProfileId(),key=ensureDeviceProfiles().keyFor(id);return {id,key,raw:localStorage.getItem(key)}}
function renderDeviceProfilesCard(){
 if(cloudMode)return '';
 let profiles=[];try{profiles=ensureDeviceProfiles().list()}catch{deviceProfileError='No se pudo consultar la lista de perfiles. Los datos guardados se conservan.'}
 return `<section class="card device-profiles"><div class="profile-manager-heading"><p class="eyebrow">CADA PERSONA, SU PROGRESO</p><h3>Usuarios de este dispositivo</h3><p>Cambia de perfil para consultar sus pesos, fuerza, comidas y días completados.</p></div><div class="device-profile-list">${profiles.map(profile=>`<button class="device-profile-choice" data-device-profile="${esc(profile.id)}" ${profile.id===deviceProfileIdentity()?'aria-current="true"':''} ${profile.error?'disabled':''}><span class="device-profile-avatar" aria-hidden="true">${esc(profile.name.trim().slice(0,1).toUpperCase())}</span><span><b>${esc(profile.name)}</b><small>${profile.error?'Sus registros se conservan; requieren recuperación':profile.id===deviceProfileIdentity()?'Perfil activo':'Abrir su progreso'}</small></span><span aria-hidden="true">${profile.id===deviceProfileIdentity()?'✓':'›'}</span></button>`).join('')}</div><form id="deviceProfileForm" class="profile-create-form"><label for="deviceProfileName">Añadir otro usuario</label><input id="deviceProfileName" class="field" data-device-name autocomplete="off" maxlength="40" value="${esc(deviceProfileDraft)}" placeholder="Nombre de la persona" required><button class="btn" type="submit">Crear perfil separado ${uiIcon('arrow')}</button></form><p class="food-error" role="alert">${esc(deviceProfileError)}</p><p class="profile-help">Cada perfil se guarda en este navegador y empieza sin registros ajenos. No tiene contraseña ni sincronización entre teléfonos. Las cuentas en la nube se configuran por separado.</p></section>`;
}
function selectDeviceProfile(id){
 // Pin each tab to its own identity. Other tabs keep saving to their original key.
 try{window.sessionStorage.setItem(gymDeviceActiveKey,id)}catch{throw Error('Los perfiles siguen guardados, pero no se pudo cambiar de usuario. Revisa el almacenamiento del navegador e inténtalo otra vez.')}
 try{localStorage.setItem(gymDeviceActiveKey,id)}catch{}
 cloudAccountEpoch++;window.location.reload();
}
function prepareDeviceProfileChange(){
 if(cloudMode||cloudBusy||cloudReplacing)throw Error('Espera a terminar la operación de tu cuenta.');
 assertNoPendingMealDrafts();
 if(!legacyLoadError)saveDevicePlannerState(S);
}
function switchDeviceProfile(id){
 try{prepareDeviceProfileChange();ensureDeviceProfiles().read(id);selectDeviceProfile(id)}
 catch(error){deviceProfileError=cloudErrorText(error);render()}
}
function submitDeviceProfile(form){
 deviceProfileDraft=form.querySelector('#deviceProfileName').value;
 try{prepareDeviceProfileChange();const profile=ensureDeviceProfiles().create(deviceProfileDraft);selectDeviceProfile(profile.id)}
 catch(error){deviceProfileError=cloudErrorText(error);render()}
}
function attachDeviceProfiles(){
 document.addEventListener('input',event=>{if(event.target.hasAttribute('data-device-name'))deviceProfileDraft=event.target.value});
 document.addEventListener('submit',event=>{if(event.target.id==='deviceProfileForm'){event.preventDefault();submitDeviceProfile(event.target)}});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-device-profile]');if(button&&!button.disabled&&button.dataset.deviceProfile!==deviceProfileIdentity())switchDeviceProfile(button.dataset.deviceProfile)});
}
