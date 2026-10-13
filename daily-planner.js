// Daily activities share the existing tasks and meal marks; old records stay intact.
const gymPeriods={morning:'Mañana',afternoon:'Tarde',night:'Noche'};
const dailyMealIds=['breakfast','lunch','dinner'];
function validGymTime(value){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value))}
function gymPeriodLabel(period){return gymPeriods[period]||''}
function periodFromGymTime(time){if(!validGymTime(time))return '';const hour=Number(time.slice(0,2));return hour<12?'morning':hour<18?'afternoon':'night'}
function dayGymPlan(date,state=S){
 const entry=state.gymVisits?.[date]||{};
 return {...entry,period:Object.hasOwn(gymPeriods,entry.period)?entry.period:periodFromGymTime(entry.time||(entry.mode==='usual'?state.schedule?.gym:''))};
}
function gymVisitForDay(date=selectedDate,state=S){
 const archive=closedDay(date,state);
 if(archive){const task=archive.tasks.find(t=>t.id==='gym'),entry=archive.gymVisit||{};return {...entry,period:Object.hasOwn(gymPeriods,entry.period)?entry.period:periodFromGymTime(entry.time||task?.time),done:!!task?.done}}
 const done=!!state.tasks?.[date+'-gym'],entry=dayGymPlan(date,state);
 return {...entry,period:entry.period||(done?periodFromGymTime(state.schedule?.gym):''),done};
}
function dailyMealMarked(date,index,state=S){
 const meals=state.meals?.[date]||{},tasks=state.tasks||{},key=date+'-'+dailyMealIds[index];
 if(Object.hasOwn(meals,index))return !!meals[index];
 if(Object.hasOwn(tasks,key))return !!tasks[key];
 return index===0&&state.gymVisits?.[date]?.mode!=='alternate'&&!String(state.mealAdjustments?.[date]?.breakfast||'').startsWith('skipped-')?!!tasks[date+'-shower']:false;
}
function dayMealChecks(date,state=S){const archive=closedDay(date,state);if(archive)return archive.meals||{};return Object.fromEntries([0,1,2,3].map(i=>[i,i<3?dailyMealMarked(date,i,state):!!state.meals?.[date]?.[i]]))}
function dailyActivityItems(date=selectedDate,state=S){
 const archive=closedDay(date,state);
 if(archive)return archive.tasks.map(t=>({...t,time:t.id==='gym'?'':t.time||'',kind:t.id==='gym'?'gym':dailyMealIds.includes(t.id)?'meal':'task',mealIndex:dailyMealIds.indexOf(t.id)}));
 const base=[['wake','Levantarme','moon'],['breakfast','Desayunar','food'],['work','Trabajar','calendar'],['lunch','Almorzar','food'],['dinner','Cenar','food'],['bed','Dormir','moon'],['gym','Ir al gym','dumbbell']];
 const items=base.map(([id,name,icon])=>{const mealIndex=dailyMealIds.indexOf(id),key=date+'-'+id,done=id==='work'&&!Object.hasOwn(state.tasks||{},key)?!!state.tasks?.[date+'-finish']:!!state.tasks?.[key];return {id,name,icon,time:'',kind:id==='gym'?'gym':mealIndex>=0?'meal':'task',mealIndex,done:mealIndex>=0?dailyMealMarked(date,mealIndex,state):done}});
 const pending=(state.custom||[]).filter(t=>!t[3]||t[3]===date).map(([id,time,name])=>({id,time:time||'',name,icon:'check',kind:'task',pending:true,done:!!state.tasks?.[date+'-'+id]}));
 return [...items,...pending];
}
function dayActivitySummary(date=selectedDate,state=S){const items=dailyActivityItems(date,state),done=items.filter(t=>t.done).length,total=items.length;return {items,done,total,percent:total?Math.round(100*done/total):0}}
function gymPeriodArt(period){return period==='night'?uiIcon('moon'):'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(period==='morning'?'<path d="M2 17h20M5 21h14M6 17a6 6 0 0 1 12 0M12 3v4m-8 2 2 2m14-2-2 2M12 10V6m-2 2 2-2 2 2"/>':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>')+'</svg>'}
function renderGymVisit(){
 const visit=gymVisitForDay(),locked=!!closedDay(selectedDate);
 return `<section class="card gym-session"><div class="gym-session-heading"><span class="daily-icon">${uiIcon('dumbbell')}</span><div><p class="eyebrow">UNA VISITA, EL MISMO ESFUERZO</p><h3>¿Cuándo fuiste al gym?</h3></div>${visit.done?'<span class="gym-session-badge">'+uiIcon('check')+'</span>':''}</div><p>Tu entrenamiento cuenta a cualquier hora.</p><div class="gym-period-options" role="group" aria-label="Cuándo fui al gimnasio">${Object.entries(gymPeriods).map(([period,label])=>`<button data-gym-period="${period}" aria-pressed="${visit.done&&visit.period===period}" ${locked?'disabled':''}>${gymPeriodArt(period)}<b>${label}</b><small>${period==='morning'?'Temprano':period==='afternoon'?'Por la tarde':'Por la noche'}</small></button>`).join('')}</div><div class="gym-session-footer"><span role="status">${visit.done?'✓ Asistencia registrada'+(visit.period?' · '+esc(gymPeriodLabel(visit.period)):''):'Elige una opción cuando hayas ido.'}</span>${visit.done&&!locked?'<button class="text-link" data-gym-clear>Quitar marca</button>':''}</div><p class="hint">Cuenta como una actividad. Tus ejercicios mantienen sus propios checks.</p><p class="gym-visit-error" role="alert" hidden></p></section>`;
}
function saveGymAttendance(period,done=true){
 if(closedDay(selectedDate)||!validLocalDay(selectedDate)||period&&!Object.hasOwn(gymPeriods,period))return;
 const previousVisits=S.gymVisits,previousTasks=S.tasks;
 S.gymVisits={...(previousVisits||{}),[selectedDate]:{...(previousVisits?.[selectedDate]||{}),...(period?{period}:{})}};
 S.tasks={...(previousTasks||{}),[selectedDate+'-gym']:done};
 try{save()}catch{S.gymVisits=previousVisits;S.tasks=previousTasks;const error=document.querySelector('.gym-visit-error');if(error){error.hidden=false;error.textContent='No se pudo guardar la asistencia. Tus registros anteriores siguen intactos.'}return}
 render();document.querySelector(period?'[data-gym-period="'+period+'"]':'[data-gym-period]')?.focus({preventScroll:true});
}
function renderDailyActivity(item){
 const archived=!!closedDay(selectedDate),meal=item.kind==='meal'&&item.mealIndex>=0;
 return `<div class="daily-activity ${item.done?'is-complete':''}"><label><input type="checkbox" data-task="${esc(item.id)}" ${meal?'data-meal="'+item.mealIndex+'"':''} ${item.done?'checked':''} ${archived?'disabled':''}><span class="daily-activity-icon">${uiIcon(item.icon||(meal?'food':'check'))}</span><span class="daily-activity-copy"><b>${esc(item.name)}</b>${item.time?'<small>'+esc(item.time)+'</small>':''}</span></label>${item.id.startsWith('custom')?'<button class="pending-delete" data-delete="'+esc(item.id)+'" aria-label="Eliminar '+esc(item.name)+'" '+(archived?'disabled':'')+'>×</button>':''}</div>`;
}
function renderSimpleDay(){
 const summary=dayActivitySummary(),archive=closedDay(selectedDate),date=new Date(selectedDate+'T12:00:00'),start=new Date(date);start.setDate(date.getDate()-dateRoutineDay(selectedDate));
 const weekdays=['L','M','M','J','V','S','D'],week=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return {date:localDateKey(d),day:d.getDate()}});
 const activities=summary.items.filter(t=>t.kind!=='gym'&&!t.pending&&!t.id.startsWith('custom')),pending=summary.items.filter(t=>t.pending||t.id.startsWith('custom'));
 return `<div class="day-page-heading"><div><p class="eyebrow">PASO A PASO</p><h2>Mi Día</h2></div><button class="day-calendar-link" data-tab="calendario">${uiIcon('calendar')}<span>Calendario</span></button></div><div class="day-date-row"><label class="label" for="dayDate">Tu día</label><input id="dayDate" class="field" type="date" data-field="date" value="${esc(selectedDate)}"></div><div class="day-week-strip" aria-label="Días de esta semana">${week.map((d,i)=>`<button data-date="${d.date}" aria-label="${d.date}" aria-pressed="${d.date===selectedDate}"><span>${weekdays[i]}</span><b>${d.day}</b>${closedDay(d.date)?'<small>✓</small>':''}</button>`).join('')}</div><section class="day-progress-card"><div><p class="eyebrow">TU AVANCE</p><h3>${summary.done} de ${summary.total} actividades</h3><p>Una acción a la vez. Cada una cuenta.</p></div><div class="day-progress-ring" style="--day-progress:${summary.percent*3.6}deg"><strong>${summary.percent}<small>%</small></strong></div></section>${renderGymVisit()}<div class="section-heading"><h2>${archive?'Actividades guardadas':'Lo importante de tu día'}</h2><span class="subtle-tag">${activities.filter(t=>t.done).length}/${activities.length}</span></div><section class="card daily-activities">${activities.map(renderDailyActivity).join('')}</section><div class="section-heading"><h2>Pendientes</h2><span class="subtle-tag">${pending.filter(t=>t.done).length}/${pending.length}</span></div><section class="card day-pending">${pending.length?pending.map(renderDailyActivity).join(''):'<p class="pending-empty">Un espacio para las cosas que quieres resolver hoy.</p>'}${!archive?'<div class="pending-form"><label class="label" for="taskName">Nuevo pendiente</label><input class="field" id="taskName" maxlength="120" placeholder="Ej. Preparar mi almuerzo"><div class="pending-form-bottom"><label class="label" for="taskTime">Hora opcional<input class="field" type="time" id="taskTime"></label><button class="btn" data-action="addTask">'+uiIcon('check')+' Añadir</button></div><p class="pending-error" role="alert" hidden></p></div>':''}</section>${renderDayClosePanel()}`;
}
function addDayPending(){
 if(closedDay(selectedDate))return;const name=document.querySelector('#taskName')?.value.trim().slice(0,120),time=document.querySelector('#taskTime')?.value||'',error=document.querySelector('.pending-error');
 if(!name){if(error){error.hidden=false;error.textContent='Escribe el pendiente que quieres añadir.'}return}
 const previous=S.custom;S.custom=[...(previous||[]),['custom'+crypto.randomUUID(),time,name,selectedDate]];
 try{save()}catch{S.custom=previous;if(error){error.hidden=false;error.textContent='No se pudo guardar. Tus pendientes anteriores siguen intactos.'}return}render();
}
function attachDailyPlanner(){document.addEventListener('click',e=>{const period=e.target.closest('[data-gym-period]'),clear=e.target.closest('[data-gym-clear]');if(period&&!period.disabled)saveGymAttendance(period.dataset.gymPeriod);if(clear&&!clear.disabled)saveGymAttendance('',false)})}
