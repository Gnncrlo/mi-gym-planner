// Checkpoints belong to one account/profile on this browser. Never include auth tokens.
function plannerRecoveryIdentity(){
 if(cloudPageBlocked())throw Error('Abre primero tus registros.');
 return cloudMode?'cloud:'+cloudProjectId()+':'+cloudUser.id:'device:'+deviceProfileIdentity();
}
function plannerCheckpointKey(){return 'mgp-checkpoints-v1:'+plannerRecoveryIdentity()}
function plannerCheckpoints(){
 const raw=localStorage.getItem(plannerCheckpointKey());
 if(!raw)return [];
 const list=JSON.parse(raw);if(!Array.isArray(list))throw Error('No se puede abrir el historial de copias. No se ha reemplazado.');return list;
}
function savePlannerCheckpoint(reason='Copia manual'){
 const list=plannerCheckpoints(),entry={id:crypto.randomUUID(),date:new Date().toISOString(),reason,state:JSON.parse(JSON.stringify(S))};
 localStorage.setItem(plannerCheckpointKey(),JSON.stringify([entry,...list].slice(0,5)));return entry;
}
// Only absent entries are recovered. Existing values (including false and zero) always win.
function mergeMissingPlannerRecords(current,incoming){
 const result=JSON.parse(JSON.stringify(current));let added=0;
 const safe=key=>!['__proto__','constructor','prototype'].includes(key);
 const workoutMaps=['done','loads','reps','substitutions','exerciseFeelings','exerciseFeelingNames'];
 const occupied=new Set(workoutMaps.flatMap(key=>Object.keys(current[key]||{})));
 const locked=new Set((current.dayHistory||[]).map(entry=>entry.week+'-'+entry.day));
 for(const key of [...workoutMaps,'water','meals','sleep','tasks','gymVisits','mealAdjustments','cardio']){
  result[key]??={};
  for(const [id,value] of Object.entries(incoming[key]||{})){
   if(!safe(id)||Object.hasOwn(result[key],id))continue;
   if(workoutMaps.includes(key)&&(occupied.has(id)||locked.has(id.split('-').slice(0,2).join('-'))))continue;
   result[key][id]=JSON.parse(JSON.stringify(value));added++;
  }
 }
 for(const key of ['body','foodLog','dayHistory','custom']){
  result[key]??=[];
  const identity=item=>key==='body'?item.date:key==='custom'?item[0]:item.id||JSON.stringify(item);
  const known=new Set(result[key].map(identity));
  for(const item of incoming[key]||[]){
   const id=identity(item);
   if(known.has(id)||key==='dayHistory'&&(locked.has(item.week+'-'+item.day)||Object.hasOwn(current.closedDays||{},item.date)))continue;
   result[key].push(JSON.parse(JSON.stringify(item)));known.add(id);added++;
  }
 }
 result.closedDays??={};
 for(const [date,id] of Object.entries(incoming.closedDays||{}))if(safe(date)&&!Object.hasOwn(result.closedDays,date)&&result.dayHistory.some(entry=>entry.id===id&&entry.date===date)){result.closedDays[date]=id;added++}
 return {state:result,added};
}
async function recoverPlannerRecords(file){
 const identity=plannerRecoveryIdentity(),epoch=cloudAccountEpoch;
 try{
  assertNoPendingMealDrafts();
  const raw=JSON.parse(await file.text());
  if(identity!==plannerRecoveryIdentity()||epoch!==cloudAccountEpoch)throw Error('El usuario cambió. Vuelve a elegir la copia.');
  if(!raw||!raw.done||!raw.schedule)throw Error('Elige un respaldo de Mi Gym Planner.');
  const incoming=normalizeCloudPlannerState(raw,cloudUser),merged=mergeMissingPlannerRecords(S,incoming);
  if(!merged.added){alert('No hay registros faltantes que añadir. Los actuales se conservan.');return}
  if(!confirm('Copia de '+String(incoming.profileName)+'. ¿Añadir '+merged.added+' registros faltantes a '+S.profileName+'? Si coinciden, se conservan los actuales. Comprueba que ambos perfiles son tuyos.'))return;
  savePlannerCheckpoint('Antes de recuperar registros');
  if(cloudMode)cloudController.save(merged.state);else saveDevicePlannerState(merged.state);
  S=merged.state;render();alert('Registros añadidos. Revisa también la semana correspondiente en Rutinas. '+(cloudMode?'Comprueba que aparezca Nube al día.':'Guardados en este dispositivo.'));
 }catch(error){alert(error.message||'No se pudo recuperar. Conserva el archivo de respaldo.');render()}
}
function renderPlannerRecovery(){
 if(cloudPageBlocked())return '';
 let list=[],error='';try{list=plannerCheckpoints()}catch(e){error=e.message}
 return `<section class="card"><p class="eyebrow">PROTEGE TU CONSTANCIA</p><h3>Respaldo y recuperación</h3><p class="hint">Últimas 5 copias de este usuario en este navegador. Descárgalas para conservarlas fuera del teléfono; este historial no se sincroniza.</p><button class="btn secondary" data-checkpoint-create>Crear copia en este dispositivo</button><label class="label" for="recoverMissing">Recuperar registros faltantes desde un archivo</label><input class="field" id="recoverMissing" type="file" accept=".json,application/json" data-recover-missing><p class="hint">Añade entradas faltantes; si una fecha o ejercicio ya tiene registros, conserva los actuales. No reemplaza tu perfil, horarios ni días cerrados.</p>${error?'<p role="alert">'+esc(error)+'</p>':''}<details><summary>Historial de copias (${list.length})</summary>${list.map((entry,i)=>`<div class="item"><p>${esc(new Date(entry.date).toLocaleString('es-PE',{timeZone:'America/Lima'}))}<br><span class="hint">${esc(entry.reason)}</span></p><button class="btn secondary" data-checkpoint-download="${i}">Descargar copia</button></div>`).join('')||'<p class="hint">Aún no has creado copias aquí.</p>'}</details></section>`;
}
function attachPlannerRecovery(){
 document.addEventListener('click',event=>{try{
  if(event.target.closest('[data-checkpoint-create]')){assertNoPendingMealDrafts();savePlannerCheckpoint();render()}
  const button=event.target.closest('[data-checkpoint-download]');if(button){const entry=plannerCheckpoints()[Number(button.dataset.checkpointDownload)];if(entry)downloadPlannerJSON(entry.state,'mi-gym-planner-copia-'+entry.date.slice(0,10)+'.json')}
 }catch(error){alert('No se pudo guardar o abrir la copia: '+error.message+'. Descarga un respaldo con Guardar una copia.')}});
 document.addEventListener('change',event=>{if(event.target.matches('[data-recover-missing]')&&event.target.files[0])recoverPlannerRecords(event.target.files[0])});
}
