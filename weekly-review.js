// Calendar dates describe this review; the planner's numbered workout week is never dated.
let reviewWeekDate='';
function weeklyLocalDate(value){const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12)}
function weeklyShiftDate(value,days){const date=weeklyLocalDate(value);date.setDate(date.getDate()+days);return localDateKey(date)}
function weeklyDates(value){
 const date=validLocalDay(value)?value:localDateKey(),start=weeklyShiftDate(date,-dateRoutineDay(date));
 return Array.from({length:7},(_,index)=>weeklyShiftDate(start,index));
}
function weeklyDateLabel(value){return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric'}).format(weeklyLocalDate(value))}
function weeklyRecordedActivities(date,state){
 if(closedDay(date,state))return true;
 return Object.keys(state.tasks||{}).some(key=>key.startsWith(date+'-'))||Object.keys(state.meals?.[date]||{}).length>0||(state.custom||[]).some(task=>task[3]===date);
}
function weeklyWeights(dates,state){
 const live=new Map();for(const entry of state.body||[])if(dates.includes(entry.date)&&optionalNumber(entry.kg)>0)live.set(entry.date,{date:entry.date,value:Number(entry.kg)});
 const points=dates.flatMap(date=>{
  const snapshot=closedDay(date,state);if(!snapshot)return live.has(date)?[live.get(date)]:[];
  const entry=snapshot.weightToday;return entry?.date===date&&optionalNumber(entry.kg)>0?[{date,value:Number(entry.kg)}]:[];
 });
 const first=points[0]||null,last=points.at(-1)||null;
 return {points,count:points.length,first,last,difference:points.length>=2?Math.round((last.value-first.value)*10)/10:null};
}
function weeklyStrengthComparison(start,end,state){
 const byExercise=new Map();
 for(const date of Object.keys(state.closedDays||{}).filter(date=>validLocalDay(date)&&date<=end).sort()){
  const snapshot=closedDay(date,state);if(!snapshot)continue;
  // At most one example per exercise and date; revisions and multiple slots are not sessions.
  const onDate=new Map();for(const exercise of snapshot.exercises||[])if(exercise.done&&typeof exercise.name==='string'&&exercise.name&&optionalNumber(exercise.load)>0){
   const identity=exercise.name+'\u0000'+String(exercise.equipment||'');
   onDate.set(identity,{name:exercise.name,date,load:Number(exercise.load),reps:optionalNumber(exercise.reps)});
  }
  for(const [identity,record] of onDate){if(!byExercise.has(identity))byExercise.set(identity,[]);byExercise.get(identity).push(record)}
 }
 const examples=[];
 for(const records of byExercise.values()){
  const after=records.at(-1),before=records.at(-2);if(!before||after.date<start||after.date>end||before.date===after.date)continue;
  examples.push({name:after.name,before,after,loadDifference:Math.round((after.load-before.load)*10)/10,repsDifference:before.reps!==null&&after.reps!==null?after.reps-before.reps:null});
 }
 return examples.sort((a,b)=>b.after.date.localeCompare(a.after.date)||a.name.localeCompare(b.name,'es'))[0]||null;
}
function weeklyReview(value,state=S){
 const dates=weeklyDates(value),start=dates[0],end=dates.at(-1),periods={morning:0,afternoon:0,night:0,unspecified:0};
 const days=dates.map(date=>{
  const snapshot=closedDay(date,state),visit=gymVisitForDay(date,state),activities=dayActivitySummary(date,state),foodLog=snapshot?(snapshot.foods||[]):(state.foodLog||[]).filter(entry=>entry.date===date),checks=dayMealChecks(date,state);
  const mealTypes=new Set(foodLog.filter(entry=>Number.isInteger(+entry.type)&&+entry.type>=0&&+entry.type<4).map(entry=>+entry.type));
  for(let index=0;index<4;index++)if(checks[index])mealTypes.add(index);
  if(visit.done)periods[Object.hasOwn(gymPeriods,visit.period)?visit.period:'unspecified']++;
  return {date,closed:!!snapshot,snapshot,visit,activities,hasActivities:weeklyRecordedActivities(date,state),strengthSession:!!snapshot&&(snapshot.exercises||[]).some(exercise=>exercise.done),mealCount:mealTypes.size,foodDescriptions:foodLog.length};
 });
 const visits=days.filter(day=>day.visit.done).length,sessions=days.filter(day=>day.strengthSession).length,closed=days.filter(day=>day.closed).length,activityDays=days.filter(day=>day.hasActivities),activities=activityDays.reduce((total,day)=>total+day.activities.done,0),meals=days.reduce((total,day)=>total+day.mealCount,0),foodDescriptions=days.reduce((total,day)=>total+day.foodDescriptions,0),weights=weeklyWeights(dates,state),strength=weeklyStrengthComparison(start,end,state);
 let advice;
 if(strength)advice='Tienes dos registros de '+strength.name+'. Revisa carga y repeticiones juntas; compáralas si usaste el mismo equipo y recorrido.';
 else if(sessions)advice='Guardaste '+sessions+' '+(sessions===1?'sesión de fuerza':'sesiones de fuerza')+' esta semana. Al repetir un ejercicio y cerrar otro día podrás comparar cargas y repeticiones, sin cambiar todos los ejercicios cada sesión.';
 else if(visits)advice='Registraste '+visits+' '+(visits===1?'visita al gym':'visitas al gym')+' esta semana. Si hiciste fuerza, puedes cerrar el día para conservar sus cargas y repeticiones. Deja también espacio para descansar.';
 else if(weights.count>=2)advice='Tienes '+weights.count+' mediciones de peso esta semana. Puedes mirar la tendencia con calma: una variación de pocos días no explica por sí sola los cambios de tu cuerpo.';
 else if(meals)advice='Registraste '+meals+' '+(meals===1?'comida':'comidas')+' esta semana. Añadir ingredientes a tus próximas descripciones te dará sugerencias más concretas; no necesitas compensar comidas.';
 else advice='Todavía no hay visitas ni sesiones cerradas en esta semana. Empieza por registrar lo que hagas; un día sin marcas no nos dice si entrenaste o descansaste.';
 return {start,end,dates,days,visits,periods,sessions,closed,activities,activityDays:activityDays.length,meals,foodDescriptions,weights,strength,advice};
}
function weeklySignedNumber(value){return (value>0?'+':'')+Number(value.toFixed(1)).toLocaleString('es-PE')}
function weeklyStrengthMarkup(example){
 if(!example)return '<div class="weekly-empty"><span class="weekly-small-icon">'+uiIcon('dumbbell')+'</span><p>Necesitamos dos días cerrados con carga del mismo ejercicio para mostrar una comparación. Los registros antiguos sin fecha siguen disponibles en Fuerza.</p></div>';
 const record=entry=>`<div><time>${esc(weeklyDateLabel(entry.date))}</time><strong>${esc(entry.load)}<small> kg</small></strong><span>${entry.reps===null?'Repeticiones sin registrar':esc(entry.reps)+' reps'}</span></div>`;
 return `<div class="weekly-strength"><h4>${esc(example.name)}</h4><div class="weekly-strength-pair">${record(example.before)}<span aria-hidden="true">${uiIcon('arrow')}</span>${record(example.after)}</div><p class="weekly-strength-change">Carga ${esc(weeklySignedNumber(example.loadDifference))} kg${example.repsDifference===null?' · No hay dos registros de repeticiones':' · Repeticiones '+esc(weeklySignedNumber(example.repsDifference))}</p><p class="weekly-note">Mismo ejercicio, en cierres activos. Comprueba que usaste el mismo equipo y recorrido; no se estiman máximos ni volumen total.</p></div>`;
}
function renderWeeklyReview(){
 if(!validLocalDay(reviewWeekDate))reviewWeekDate=validLocalDay(selectedDate)?selectedDate:localDateKey();
 const review=weeklyReview(reviewWeekDate),weight=review.weights,periodSummary=Object.entries(review.periods).filter(([,count])=>count).map(([period,count])=>(period==='unspecified'?'Sin franja':gymPeriodLabel(period))+' '+count).join(' · ');
 const weightText=weight.count>=2?weeklySignedNumber(weight.difference)+' kg':weight.count===1?weight.first.value+' kg':'Sin registros';
 const weightNote=weight.count>=2?'Del '+weeklyDateLabel(weight.first.date)+' al '+weeklyDateLabel(weight.last.date):weight.count===1?'Una medición · '+weeklyDateLabel(weight.first.date):'No se añaden mediciones automáticamente.';
 return `<section class="weekly-review" aria-labelledby="weekly-review-title"><div class="weekly-review-heading"><p class="eyebrow">TU SEMANA EN FECHAS REALES</p><h3 id="weekly-review-title">Un vistazo a tu constancia</h3><p>Registros que hiciste, sin suponer lo que pasó en los días sin marcas.</p></div><div class="weekly-toolbar"><button data-review-week="-1" class="weekly-week-arrow" aria-label="Semana anterior">‹</button><div><span>LUNES A DOMINGO</span><h4>${esc(weeklyDateLabel(review.start))}<br>${esc(weeklyDateLabel(review.end))}</h4></div><button data-review-week="1" class="weekly-week-arrow" aria-label="Semana siguiente">›</button></div><button class="text-link weekly-today" data-review-week="today">Volver a esta semana ${uiIcon('calendar')}</button><div class="weekly-metrics"><article data-weekly-metric="visits"><span class="weekly-small-icon">${uiIcon('dumbbell')}</span><span>Visitas al gym</span><strong>${review.visits}</strong><small>${periodSummary?esc(periodSummary):'Asistencia sin marcar'}</small></article><article data-weekly-metric="sessions"><span class="weekly-small-icon">${uiIcon('check')}</span><span>Fuerza guardada</span><strong>${review.sessions}</strong><small>${review.closed} ${review.closed===1?'día cerrado':'días cerrados'} en este rango</small></article></div><p class="weekly-note">Mañana, tarde y noche cuentan una visita por fecha. Fuerza guardada cuenta cierres con al menos un ejercicio marcado y se muestra por separado.</p><div class="weekly-days" aria-label="Registro de lunes a domingo">${review.days.map((day,index)=>`<button data-recommend-tab="dia" data-recommend-date="${day.date}" aria-label="${esc(weeklyDateLabel(day.date))}${day.visit.done?' · Fuiste al gym':''}${day.closed?' · Día cerrado':''} · ${day.activities.done} actividades marcadas"><span>${['L','M','M','J','V','S','D'][index]}</span><b>${Number(day.date.slice(-2))}</b><i class="${day.visit.done?'has-visit':day.closed?'has-closure':''}" aria-hidden="true">${day.visit.done?uiIcon('dumbbell'):day.closed?'✓':'—'}</i></button>`).join('')}</div><div class="weekly-section"><div class="weekly-section-title"><span class="weekly-small-icon">${uiIcon('weight')}</span><h4>Peso en esta semana</h4></div><div class="weekly-weight-value" data-weekly-metric="weight"><strong>${esc(weightText)}</strong><span>${weight.count>=2?'Cambio entre mediciones':weight.count===1?'Aún no hay comparación':'Añade tu peso cuando lo midas'}</span></div><p class="weekly-note">${esc(weightNote)}</p>${weight.count>=2?'<div class="weekly-weight-range"><span>'+esc(weight.first.value)+' kg</span>'+uiIcon('arrow')+'<span>'+esc(weight.last.value)+' kg</span></div><p class="weekly-note">Una subida o bajada no indica por sí sola si ganaste músculo o grasa.</p>':''}</div><div class="weekly-section"><div class="weekly-section-title"><span class="weekly-small-icon">${uiIcon('chart')}</span><h4>Un registro de fuerza</h4></div>${weeklyStrengthMarkup(review.strength)}</div><div class="weekly-records"><div><span>${uiIcon('calendar')} Actividades marcadas</span><b>${review.activities}</b><small>En ${review.activityDays} ${review.activityDays===1?'día con registro':'días con registro'}</small></div><div><span>${uiIcon('food')} Comidas con registro</span><b>${review.meals}</b><small>${review.foodDescriptions} ${review.foodDescriptions===1?'descripción':'descripciones'} de platos</small></div></div><p class="weekly-note">Una marca o descripción del mismo tipo de comida cuenta una vez por fecha. Sin registro no significa que no comiste.</p><aside class="weekly-advice"><span class="daily-icon">${uiIcon('arrow')}</span><div><h4>Para tu próxima semana</h4><p>${esc(review.advice)}</p></div></aside><p class="weekly-source-note">Los días cerrados usan su resumen guardado. Las versiones anteriores y los días reabiertos no se cuentan como nuevas sesiones.</p></section>`;
}
function attachWeeklyReview(){document.addEventListener('click',event=>{
 const button=event.target.closest('[data-review-week]');if(!button||button.disabled||S.tab!=='progreso'||!['resumen','entrenos'].includes(progressTab))return;
 const action=button.dataset.reviewWeek;if(action==='today')reviewWeekDate=localDateKey();else if(action==='1'||action==='-1')reviewWeekDate=weeklyShiftDate(validLocalDay(reviewWeekDate)?reviewWeekDate:localDateKey(),Number(action)*7);else return;
 render();document.querySelector('[data-review-week="'+action+'"]')?.focus({preventScroll:true});
})}
