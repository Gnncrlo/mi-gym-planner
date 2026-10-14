// Advice reads records only. It never increments a load or treats one reps field as every set.
const exerciseFeelingOptions={controlled:'Controlado y sin molestias',high:'Esfuerzo alto',pain:'Molestia o dolor'};
function exerciseFeelingValue(key,name,state=S){
 const value=state.exerciseFeelings?.[key];
 return state.exerciseFeelingNames?.[key]===name&&Object.hasOwn(exerciseFeelingOptions,value)?value:'';
}
function strengthCoachNumber(value){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const number=Number(value);return Number.isFinite(number)&&number>0?number:null;
}
function strengthCoachRepTop(sets){
 const match=String(sets||'').match(/^\s*(\d+)\s*[×x]\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*$/u);
 if(!match)return null;
 const low=Number(match[2]),high=Number(match[3]||match[2]);
 return Number(match[1])>0&&low>0&&high>=low&&high<=100?high:null;
}
function strengthCoachWeighted(name){
 return !!exerciseGuide[name]&&!/plancha|dead bug|flexiones|asistid|con banda|con toalla|con pelota|sentadilla sin peso|sentadilla a un banco|puente de glúteos|subida a un escalón|sentadilla dividida con apoyo|a una pierna con apoyo|^crunch$|^zancadas$|^elevación talones(?: sentado)?$/i.test(name);
}
function strengthCoachSessions(name,state,asOf=localDateKey()){
 const dates=new Map();
 for(const [index,entry] of (state.dayHistory||[]).entries())if(entry&&validLocalDay(entry.date)&&entry.date<=asOf&&state.closedDays?.[entry.date]===entry.id)dates.set(entry.date,{entry,index});
 const records=[],workouts=new Map();
 // Only active closes inform advice. Pick the last saved revision before ordering its date.
 for(const {entry} of [...dates.values()].sort((a,b)=>a.index-b.index)){
  if(!Number.isInteger(entry.week)||entry.week<1||!Number.isInteger(entry.day)||entry.day<0||entry.day>6)continue;
  workouts.set(entry.week+'-'+entry.day,entry);
 }
 for(const entry of [...workouts.values()].sort((a,b)=>b.date.localeCompare(a.date))){
  const exercises=(entry.exercises||[]).filter(exercise=>exercise.name===name);if(!exercises.length)continue;
  const exercise=exercises[0];
  const feeling=exercises.some(record=>record.feeling==='pain')?'pain':exercises.some(record=>record.feeling==='high')?'high':Object.hasOwn(exerciseFeelingOptions,exercise.feeling)?exercise.feeling:'';
  records.push({date:entry.date,week:entry.week,day:entry.day,name,done:exercise.done===true,load:strengthCoachNumber(exercise.load),reps:strengthCoachNumber(exercise.reps),top:strengthCoachRepTop(exercise.sets),feeling,ambiguous:exercises.length!==1,equipment:String(exercise.equipment||'')});
 }
 return records;
}
function strengthCoachAdvice(name,state=S,asOf=localDateKey()){
 const sessions=strengthCoachSessions(name,state,asOf),latest=sessions[0],pair=sessions.slice(0,2);
 const current=[];
 if(!workoutClosure(state.week,state.day,state)){
  for(const [slot,[original,sets]] of (plan[state.day]?.ex||[]).entries()){
   const key=state.week+'-'+state.day+'-'+slot,choice=state.substitutions?.[key];
   const selected=exerciseGuide[original]?.variants.includes(choice)?choice:original;
   if(selected===name)current.push({load:strengthCoachNumber(state.loads?.[key]),top:strengthCoachRepTop(sets),feeling:exerciseFeelingValue(key,name,state)});
  }
 }
 const result=(status,title,message)=>({status,title,message,sessions:pair});
 if(current.some(record=>record.feeling==='pain')||latest?.feeling==='pain')return result('pain','Primero, cuida la molestia','Detén este ejercicio si hay dolor. Prueba una variante que puedas hacer sin molestias y consulta a un profesional si persiste. No necesitas aumentar la carga.');
 if(current.some(record=>record.feeling==='high')||latest?.feeling==='high')return result('high','Hoy, prioriza el control','Anotaste esfuerzo alto. Mantén o reduce la carga si pierdes técnica; deja descanso suficiente antes de volver a intentarlo.');
 if(!strengthCoachWeighted(name))return result('unsupported','Progresa con la técnica','En ejercicios por tiempo, bandas, asistencia o peso corporal no se deduce una subida de kg con estos campos. Mantén el control y adapta la dificultad con ayuda si la necesitas.');
 if(pair.length<2)return result('insufficient','Construye una referencia','Mantén una carga que puedas controlar y anota cómo se sintió. Aún no hay dos sesiones comparables cerradas con fecha. Los registros antiguos sin fecha no se convierten en sesiones nuevas.');
 if(pair.some(record=>record.top===null))return result('maintain','Revisa el rango de esta rutina','No hay un rango de repeticiones comparable en ambos cierres. Mantén una carga que controles y usa el objetivo de la rutina como referencia, sin deducir una subida con datos incompletos.');
 if(current.some(record=>record.load!==null&&record.load!==latest.load))return result('maintain','Registra esta carga primero','Tu carga abierta es distinta de la última guardada. Comprueba cómo la controlas y registra la sesión antes de valorar otro aumento.');
 const target=Math.max(...pair.map(record=>record.top),...current.map(record=>record.top||0));
 const comparable=pair.every(record=>record.done&&!record.ambiguous&&record.load!==null&&Number.isInteger(record.reps)&&record.reps<=100&&record.reps>=target&&record.feeling==='controlled')&&pair[0].load===pair[1].load&&pair[0].equipment===pair[1].equipment;
 if(comparable)return result('consider','Puedes valorar un pequeño paso','Tus dos últimos registros están al tope del rango, con la misma carga y sensación de control. Si completaste todas las series con buena técnica y sin molestias en ambas sesiones, prueba el incremento mínimo disponible en el mismo equipo. Si pierdes control, vuelve a la carga anterior.');
 return result('maintain','Consolida esta carga','Mantén una carga que puedas controlar. Para valorar un aumento, busca dos sesiones completas comparables al tope del rango y registra una sensación de control sin molestias. Un único valor de repeticiones no confirma todas las series.');
}
function renderStrengthCoach(name=strengthExercise,state=S){
 if(!name)return '';
 const advice=strengthCoachAdvice(name,state),icon=advice.status==='pain'?'moon':advice.status==='consider'?'chart':'dumbbell';
 return `<section class="strength-coach strength-coach-${esc(advice.status)}" aria-labelledby="strength-coach-title"><div class="strength-coach-heading"><span class="daily-icon">${uiIcon(icon)}</span><div><span class="eyebrow">TU SIGUIENTE PASO</span><h4 id="strength-coach-title">${esc(advice.title)}</h4></div></div><p>${esc(advice.message)}</p>${advice.sessions.length?'<div class="strength-coach-reference">'+advice.sessions.map(record=>`<span>${esc(record.date)} · ${record.load===null?'Carga sin registrar':esc(record.load)+' kg'} · ${record.reps===null?'Reps sin registrar':esc(record.reps)+' reps'} · ${esc(exerciseFeelingOptions[record.feeling]||'Sensación sin registrar')}</span>`).join('')+'</div>':''}<p class="strength-coach-note">Compara el mismo ejercicio y equipo, con el mismo recorrido. La app guarda un valor de carga y repeticiones por ejercicio; no verifica cada serie.</p></section>`;
}
function renderExerciseFeeling(index,name){
 const key=wk(index),archive=workoutClosure(),exercise=archive?.exercises.find(record=>record.slot===index);
 const value=archive?(Object.hasOwn(exerciseFeelingOptions,exercise?.feeling)?exercise.feeling:''):exerciseFeelingValue(key,name);
 return `<div class="exercise-feeling"><label for="feeling-${index}">CÓMO SE SINTIÓ <span>· opcional</span></label><select id="feeling-${index}" class="field" data-exercise-feeling="${index}" aria-label="Cómo se sintió ${esc(name)}" ${archive?'disabled':''}><option value="" ${!value?'selected':''}>Sin registrar</option>${Object.entries(exerciseFeelingOptions).map(([choice,label])=>`<option value="${choice}" ${choice===value?'selected':''}>${esc(label)}</option>`).join('')}</select></div>`;
}
function updateExerciseFeeling(index,value){
 if(!Number.isInteger(index)||!plan[S.day]?.ex[index]||(value!==''&&!Object.hasOwn(exerciseFeelingOptions,value))||workoutClosure()){render();return false}
 const feelings=S.exerciseFeelings,names=S.exerciseFeelingNames,key=wk(index);
 S.exerciseFeelings={...(feelings||{})};S.exerciseFeelingNames={...(names||{})};
 if(value){S.exerciseFeelings[key]=value;S.exerciseFeelingNames[key]=chosenExercise(index)}else{delete S.exerciseFeelings[key];delete S.exerciseFeelingNames[key]}
 try{save()}catch{S.exerciseFeelings=feelings;S.exerciseFeelingNames=names;render();alert('No se pudo guardar la sensación. Tus registros anteriores siguen intactos.');return false}
 render();document.querySelector(`[data-exercise-feeling="${index}"]`)?.focus({preventScroll:true});return true;
}
function attachStrengthCoach(){
 document.addEventListener('change',event=>{const field=event.target.closest('[data-exercise-feeling]');if(field&&!field.disabled)updateExerciseFeeling(Number(field.dataset.exerciseFeeling),field.value)});
}
