// A one-day change of gym time keeps the usual schedule and workout records intact.
function validGymTime(value){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value))}
function dayGymPlan(date,state=S){
 const entry=state.gymVisits?.[date]||{},usual=validGymTime(state.schedule?.gym)?state.schedule.gym:'06:00';
 return {mode:entry.mode==='alternate'?'alternate':'usual',time:entry.mode==='alternate'&&validGymTime(entry.time)?entry.time:usual,plannedTime:usual};
}
function gymVisitForDay(date=selectedDate,state=S){
 const archive=closedDay(date,state);
 if(archive){const task=archive.tasks.find(t=>t.id==='gym'),saved=archive.gymVisit;return {...(saved||{mode:'usual',time:task?.time||'',plannedTime:task?.time||''}),done:!!task?.done}}
 return {...dayGymPlan(date,state),done:!!state.tasks?.[date+'-gym']};
}
function shiftGymTime(time,minutes){const [h,m]=time.split(':').map(Number),total=(h*60+m+minutes+1440)%1440;return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')}
function gymAgendaTime(time,minutes){const [h,m]=time.split(':').map(Number),total=h*60+m+minutes;return shiftGymTime(time,minutes)+(total<0?' · día anterior':total>=1440?' · día siguiente':'')}
function agendaTimeOrder(time){const [h,m]=String(time).slice(0,5).split(':').map(Number);return h*60+m+(String(time).includes('día anterior')?-1440:String(time).includes('día siguiente')?1440:0)}
function renderGymVisit(){
 const visit=gymVisitForDay(),alternate=visit.mode==='alternate',locked=!!closedDay(selectedDate);
 return `<section class="card gym-visit"><div class="gym-visit-heading"><span class="daily-icon">${uiIcon('dumbbell')}</span><div><p class="eyebrow">TU HORARIO, TU RITMO</p><h3>El gym también cuenta más tarde</h3></div></div><p class="gym-visit-intro">Si la mañana se complica por trabajo o tiempo, puedes mover tu visita a la noche o a otra hora.</p><div class="gym-time-options" role="group" aria-label="Horario del gimnasio"><button data-gym-mode="usual" aria-pressed="${!alternate}" ${locked?'disabled':''}>Habitual <span>${esc(visit.plannedTime)}</span></button><button data-gym-mode="alternate" aria-pressed="${alternate}" ${locked?'disabled':''}>Otro horario ${uiIcon('moon')}</button></div>${alternate?`<label class="label" for="gymVisitTime">Hora de tu visita</label><input class="field" id="gymVisitTime" type="time" data-gym-time value="${esc(visit.time)}" ${locked?'disabled':''}>`:''}<label class="gym-attended"><input type="checkbox" data-gym-attended ${visit.done?'checked':''} ${locked?'disabled':''}><span>${alternate?'Fui al gym en otro horario':'Fui al gym'}<small>${visit.done?'Asistencia registrada':'Marca cuando hayas ido'} · ${esc(visit.time||'Hora no registrada')}</small></span></label><p class="hint">Este cambio es solo para esta fecha. La asistencia y los ejercicios completados se registran por separado.</p><p class="gym-visit-error" role="alert" hidden></p></section>`;
}
function saveGymVisit(mode,time,done){
 if(closedDay(selectedDate)||!validLocalDay(selectedDate))return;
 const previousVisits=S.gymVisits,previousTasks=S.tasks,visit=dayGymPlan(selectedDate);
 const usual=validGymTime(S.schedule?.gym)?S.schedule.gym:'06:00';
 const entry={mode:mode||visit.mode,time:time||visit.time,plannedTime:usual};
 if(!['usual','alternate'].includes(entry.mode)||!validGymTime(entry.time))return;
 S.gymVisits={...(previousVisits||{}),[selectedDate]:entry};
 if(done!==undefined)S.tasks={...(previousTasks||{}),[selectedDate+'-gym']:!!done};
 try{save()}catch{S.gymVisits=previousVisits;S.tasks=previousTasks;const error=document.querySelector('.gym-visit-error');if(error){error.hidden=false;error.textContent='No se pudo guardar el horario. Tus registros anteriores siguen intactos.'}return}
 render();
}
function attachDailyPlanner(){
 document.addEventListener('click',e=>{const mode=e.target.closest('[data-gym-mode]');if(!mode||mode.disabled||closedDay(selectedDate))return;const visit=dayGymPlan(selectedDate);saveGymVisit(mode.dataset.gymMode,mode.dataset.gymMode==='alternate'?(visit.mode==='alternate'?visit.time:'20:00'):S.schedule.gym)});
 document.addEventListener('change',e=>{const t=e.target;if(t.matches('[data-gym-time]'))saveGymVisit('alternate',t.value);if(t.matches('[data-gym-attended]'))saveGymVisit(undefined,undefined,t.checked)});
}
