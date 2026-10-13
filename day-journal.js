// Closing a day creates an immutable copy. Live workout keys remain unchanged.
let dayClosingSelection={};
function validLocalDay(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;
 const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);
 return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d;
}
function dateRoutineDay(value){const [y,m,d]=value.split('-').map(Number);return (new Date(y,m-1,d).getDay()+6)%7}
function closedDay(date,state=S){const id=state.closedDays?.[date];return id?(state.dayHistory||[]).find(e=>e.id===id)||null:null}
function dailyHistory(state=S){
 const byDate=new Map();for(const entry of state.dayHistory||[])if(entry&&validLocalDay(entry.date))byDate.set(entry.date,entry);
 return [...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
function optionalNumber(value){if(value===undefined||value===null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null}
function makeDaySnapshot(date,day,state=S){
 if(!validLocalDay(date)||date>localDateKey())throw Error('Elige una fecha válida, de hoy o anterior.');
 if(!Number.isInteger(day)||day<0||day>6)throw Error('Elige una rutina válida.');
 const routine=plan[day],week=state.week;
 const exercises=routine.ex.map(([original,sets],index)=>{const key=week+'-'+day+'-'+index,variant=state.substitutions?.[key];return {slot:index,original,name:exerciseGuide[original].variants.includes(variant)?variant:original,sets,done:!!state.done?.[key],load:optionalNumber(state.loads?.[key]),reps:optionalNumber(state.reps?.[key])}});
 const weights=(state.body||[]).filter(e=>validLocalDay(e.date)&&e.date<=date&&optionalNumber(e.kg)>0).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const schedule=state.schedule||{},base=[['wake',schedule.wake,'Despertar y tomar agua'],['bath','05:10','Aseo personal'],['leave','05:50','Salir al gimnasio'],['gym',schedule.gym,'Entrenamiento '+routine.title],['shower','06:50','Ducha y desayuno'],['work',schedule.work,'Inicio del trabajo'],['lunch',schedule.lunch,'Almuerzo'],['finish',schedule.finish,'Fin del trabajo'],['dinner','19:00','Cena'],['bed',schedule.bed,'Prepararme para dormir']];
 const tasks=[...base,...(state.custom||[])].map(([id,time,name])=>({id,time,name,done:!!state.tasks?.[date+'-'+id]}));
 return JSON.parse(JSON.stringify({id:crypto.randomUUID(),date,closedAt:new Date().toISOString(),week,day,title:routine.title,exercises,cardio:state.cardio?.[week+'-'+day]?.activities||{},weightToday:weights.filter(e=>e.date===date).at(-1)||null,lastWeight:weights.at(-1)||null,water:optionalNumber(state.water?.[date])??0,sleep:optionalNumber(state.sleep?.[date]),meals:state.meals?.[date]||{},foods:(state.foodLog||[]).filter(e=>e.date===date),tasks}));
}
function snapshotCounts(snapshot){return {done:snapshot.exercises.filter(e=>e.done).length,total:snapshot.exercises.length,cardio:Object.values(snapshot.cardio||{}).filter(e=>e.done).reduce((n,e)=>n+(optionalNumber(e.minutes)||0),0),tasks:snapshot.tasks.filter(e=>e.done).length}}
function renderDayClosePanel(date=selectedDate){
 const saved=closedDay(date),day=S.tab==='rutina'?S.day:(dayClosingSelection[date]??(validLocalDay(date)?dateRoutineDay(date):0));
 return `<section class="card day-close-panel"><div class="day-close-heading"><span class="daily-icon">${uiIcon(saved?'check':'calendar')}</span><div><h3>${saved?'Día cerrado y guardado':'Guarda tu día'}</h3><p>${saved?esc(saved.date)+' · '+esc(saved.title):'Conserva un resumen de tu esfuerzo y tus registros.'}</p></div></div><label class="label" for="closingDate">Fecha que vas a cerrar</label><input class="field" id="closingDate" type="date" data-field="date" max="${localDateKey()}" value="${esc(date)}">${saved?`<p class="hint">Tu resumen está guardado. Los cambios posteriores no lo modifican; para actualizarlo, reabre y vuelve a cerrar.</p><div class="close-panel-actions"><button class="btn" data-day-summary="${esc(saved.id)}">Ver resumen</button><button class="btn secondary" data-reopen-day="${esc(date)}">Reabrir día</button></div>`:`<label class="label" for="closingRoutine">Rutina que realizaste · Semana ${S.week}</label><select class="field" id="closingRoutine" data-closing-day>${plan.map((p,i)=>`<option value="${i}" ${i===day?'selected':''}>${p.day} · ${p.title}</option>`).join('')}</select><p class="hint">Revisa que la semana y la rutina correspondan al entrenamiento que realizaste. También puedes guardar un día parcial o de descanso.</p><button class="btn day-close-button" data-close-date="${esc(date)}" data-close-day="${day}" ${!validLocalDay(date)||date>localDateKey()?'disabled':''}>Revisar y cerrar el día ${uiIcon('check')}</button>`}</section>`;
}
function snapshotMarkup(snapshot){
 const c=snapshotCounts(snapshot);
 return `<div class="archive-summary-grid"><div><span>Ejercicios</span><b>${c.done}/${c.total}</b></div><div><span>Cardio completado</span><b>${c.cardio}<small> min</small></b></div><div><span>Peso de ese día</span><b>${snapshot.weightToday?esc(snapshot.weightToday.kg)+'<small> kg</small>':'—'}</b></div><div><span>Agua registrada</span><b>${(snapshot.water/1000).toFixed(2)}<small> L</small></b></div></div>${!snapshot.weightToday?'<p class="hint">No hay peso registrado para esta fecha. El cierre no añade una medición.</p>':''}${c.done<c.total?'<p class="archive-partial">Sesión parcial: se guardarán solo las marcas que registraste, sin completar ejercicios automáticamente.</p>':''}<h3>Fuerza · cargas y repeticiones</h3>${snapshot.exercises.length?snapshot.exercises.map(e=>`<div class="archive-exercise"><span>${e.done?'✓':'○'} ${esc(e.name)}</span><b>${e.load===null?'—':esc(e.load)+' kg'} · ${e.reps===null?'—':esc(e.reps)+' reps'}</b></div>`).join(''):'<p class="hint">Día de descanso, sin ejercicios de fuerza.</p>'}<details class="archive-details"><summary>Más registros de este día</summary><p>${c.tasks}/${snapshot.tasks.length} actividades marcadas · ${snapshot.foods.length} comidas descritas · ${snapshot.sleep===null?'Sueño sin registrar':esc(snapshot.sleep)+' h de sueño'}</p>${Object.entries(snapshot.cardio||{}).map(([kind,v])=>`<p>${esc(cardioOptions[kind]?.name||kind)}: ${v.done?'completado':'sin completar'} · ${optionalNumber(v.minutes)??'—'} min</p>`).join('')}<h4>Actividades</h4>${snapshot.tasks.map(t=>`<p>${t.done?'✓':'○'} ${esc(t.time||'—')} · ${esc(t.name)}</p>`).join('')}${snapshot.foods.length?'<h4>Comidas descritas</h4>'+snapshot.foods.map(f=>`<p class="archive-food">${esc(mealNames[f.type]||'Comida')}: ${esc(f.text)}</p>`).join(''):''}</details>`;
}
function dayJournalDialog(snapshot,review=false){
 const opener=document.activeElement,dialog=document.createElement('dialog');dialog.className='exercise-dialog day-close-dialog';dialog.setAttribute('aria-labelledby','day-summary-title');
 dialog.innerHTML=`<div class="guide-head"><h2 id="day-summary-title">${review?'Revisa tu cierre':'Resumen guardado'}</h2><button class="guide-close" aria-label="Cerrar resumen" autofocus>×</button></div><p class="eyebrow">${esc(snapshot.date)} · SEMANA ${esc(snapshot.week)} · ${esc(snapshot.title)}</p>${snapshotMarkup(snapshot)}<p class="journal-error" role="alert" hidden></p>${review?'<p class="hint">Se guardará una copia con los nombres de los ejercicios, sus variantes y los valores registrados. Tus registros originales se conservan.</p><button class="btn day-close-button" data-confirm-close>Confirmar cierre</button>':''}`;
 document.body.append(dialog);const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;dialog.remove();opener?.isConnected&&opener.focus()});
 dialog.addEventListener('click',e=>{
  if(e.target.closest('.guide-close'))dialog.close();
  if(!e.target.closest('[data-confirm-close]'))return;
  const error=dialog.querySelector('.journal-error');
  if(closedDay(snapshot.date)){error.hidden=false;error.textContent='Este día ya está cerrado. Reábrelo si quieres guardar una revisión.';return}
  const history=S.dayHistory,active=S.closedDays;
  S.dayHistory=[...(history||[]),JSON.parse(JSON.stringify({...snapshot,closedAt:new Date().toISOString()}))];S.closedDays={...(active||{}),[snapshot.date]:snapshot.id};
  try{save()}catch{S.dayHistory=history;S.closedDays=active;error.hidden=false;error.textContent='No se pudo guardar el cierre. Tus registros anteriores siguen intactos. Exporta un respaldo antes de liberar espacio.';return}
  dialog.close();render();document.querySelector('.day-close-panel [data-day-summary]')?.focus({preventScroll:true});document.querySelector('.day-close-panel')?.scrollIntoView({block:'center',behavior:'smooth'});
 });
}
function attachDayJournal(){
 document.addEventListener('click',e=>{
  const close=e.target.closest('[data-close-date]');if(close){try{dayJournalDialog(makeDaySnapshot(close.dataset.closeDate,+close.dataset.closeDay),true)}catch(error){alert(error.message)}}
  const summary=e.target.closest('[data-day-summary]');if(summary){const snapshot=S.dayHistory?.find(e=>e.id===summary.dataset.daySummary);if(snapshot)dayJournalDialog(snapshot)}
  const reopen=e.target.closest('[data-reopen-day]');if(reopen&&confirm('¿Reabrir este día? Su resumen anterior seguirá guardado en el historial.')){const before=S.closedDays;const next={...(before||{})};delete next[reopen.dataset.reopenDay];S.closedDays=next;try{save();render()}catch{S.closedDays=before;alert('No se pudo reabrir el día. Tus registros siguen intactos.')}}
 });
}
