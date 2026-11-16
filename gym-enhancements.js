// Optional presentation and interaction helpers. Existing storage identities stay unchanged.
function enhancementActor(){return (cloudMode?'cloud:'+cloudUser?.id:'device:'+deviceProfileIdentity())+':'+cloudAccountEpoch}
function enhancementSaved(){return !cloudPageBlocked()&&!(cloudMode?cloudStatus?.saveFailed:deviceSaveFailed)}
function enhancementReduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches}
function priorExerciseMarks(name,state=S){
 const records=[],captured=new Set(),before=(week,day)=>Number.isInteger(week)&&week>=1&&(week<state.week||week===state.week&&day<state.day);
 for(const date of Object.keys(state.closedDays||{}).filter(date=>validLocalDay(date)&&date<=localDateKey()).sort()){
  const snapshot=closedDay(date,state);if(!snapshot)continue;
  for(const entry of snapshot.exercises||[]){
   captured.add(snapshot.week+'-'+snapshot.day+'-'+entry.slot);
   if(before(snapshot.week,snapshot.day)&&entry.name===name&&entry.done&&strengthCoachNumber(entry.load)!==null)records.push({name,week:snapshot.week,day:snapshot.day,date,load:Number(entry.load),reps:strengthCoachNumber(entry.reps)});
  }
 }
 for(const [key,value] of Object.entries(state.loads||{})){
  const match=key.match(/^(\d+)-([0-6])-(\d+)$/);if(!match||captured.has(key)||!state.done?.[key]||strengthCoachNumber(value)===null)continue;
  const [,w,d,i]=match,week=Number(w),day=Number(d),original=plan[day]?.ex[Number(i)]?.[0];if(!original||!before(week,day))continue;
  const variant=state.substitutions?.[key],selected=exerciseGuide[original]?.variants.includes(variant)?variant:original;
  if(selected===name)records.push({name,week,day,date:null,load:Number(value),reps:strengthCoachNumber(state.reps?.[key])});
 }
 return records.sort((a,b)=>a.week-b.week||a.day-b.day||String(a.date||'').localeCompare(String(b.date||'')));
}
function renderPreviousMark(index,name){
 const previous=priorExerciseMarks(name).at(-1);if(!previous)return '';
 const current=strengthCoachNumber(S.loads?.[wk(index)]),difference=current===null?0:Math.round((current-previous.load)*100)/100;
 return `<span class="mark-chip">Anterior: ${esc(previous.load)} kg × ${previous.reps===null?'—':esc(previous.reps)}${difference?` <em>${difference>0?'▲ +':'▼ −'}${esc(Math.abs(difference))} kg</em>`:''}</span>`;
}
function renderQuickLoads(index,name){return `<div class="quick-loads" role="group" aria-label="Ajustar peso de ${esc(name)}">${[-2.5,2.5,5].map(delta=>`<button type="button" data-quick-load="${index}" data-load-delta="${delta}" ${workoutClosure()?'disabled':''} aria-label="${delta<0?'Reducir':'Aumentar'} ${Math.abs(delta)} kg de ${esc(name)}">${delta>0?'+':'−'}${Math.abs(delta)}</button>`).join('')}</div>`}
function attachGymEnhancements(){
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-quick-load]');if(!button||button.disabled||cloudPageBlocked()||workoutClosure())return;
  const index=Number(button.dataset.quickLoad),delta=Number(button.dataset.loadDelta),field=document.querySelector(`[data-load="${index}"]`);
  if(!field||field.disabled||closedMutation(field)||![-2.5,2.5,5].includes(delta))return;
  const current=Number(field.value||0);if(!Number.isFinite(current)||current<0)return;
  field.value=String(Math.max(0,Math.round((current+delta)*100)/100));field.dispatchEvent(new Event('input',{bubbles:true}));
  if(!enhancementSaved())return;
  const holder=document.querySelector(`[data-previous-mark="${index}"]`);if(holder)holder.innerHTML=renderPreviousMark(index,chosenExercise(index));
  if(!enhancementReduced()){button.classList.add('quick-pressed');field.classList.remove('load-pop');void field.offsetWidth;field.classList.add('load-pop');setTimeout(()=>button.classList.remove('quick-pressed'),300)}
 });
 document.addEventListener('input',event=>{
  if(!event.target.matches('[data-load]')||!enhancementSaved()||workoutClosure())return;
  const index=Number(event.target.dataset.load),holder=document.querySelector(`[data-previous-mark="${index}"]`);if(holder)holder.innerHTML=renderPreviousMark(index,chosenExercise(index));
 });
}

let gymRestVisible=false,gymRestTotal=90,gymTimerDeadline=0,gymTimerActor='',gymRestDismiss=null;
function updateGymTimer(){
 if(playing){seconds=Math.max(0,Math.ceil((gymTimerDeadline-Date.now())/1000));if(!seconds){playing=false;clearInterval(timer);timer=null;if(gymRestVisible){try{navigator.vibrate?.([120,60,120])}catch{}clearTimeout(gymRestDismiss);gymRestDismiss=setTimeout(closeGymRest,3000)}}}
 const clock=document.querySelector('#clock');if(clock)clock.textContent=formatTimer(seconds);
 const time=document.querySelector('[data-rest-time]');if(time)time.textContent=formatTimer(seconds);
 const ring=document.querySelector('[data-rest-ring]');if(ring)ring.style.strokeDashoffset=String(131.95*(1-Math.min(1,seconds/(gymRestTotal||1))));
 const panel=document.querySelector('#gymRest');if(panel){panel.classList.toggle('is-done',seconds===0);const label=panel.querySelector('[data-rest-label]'),skip=panel.querySelector('[data-rest-skip]');label.textContent=seconds===0?'¡A TRABAJAR!':'DESCANSO';skip.textContent=seconds===0?'Listo':'Saltar'}
}
function startGymTimer(){
 if(playing)return;if(seconds<=0)seconds=Number(S.seconds)||90;
 gymTimerActor=enhancementActor();gymTimerDeadline=Date.now()+seconds*1000;playing=true;
 clearInterval(timer);timer=setInterval(()=>{if(gymTimerActor!==enhancementActor()||cloudPageBlocked()||passwordRecoveryToken){closeGymRest();return}updateGymTimer()},250);updateGymTimer();
}
function toggleGymTimer(){if(playing){updateGymTimer();playing=false;clearInterval(timer);timer=null}else startGymTimer()}
function shiftGymTimer(delta){if(playing)updateGymTimer();seconds=Math.max(0,seconds+delta);gymRestTotal=Math.max(gymRestTotal,seconds);if(playing)gymTimerDeadline=Date.now()+seconds*1000;if(gymRestVisible){clearTimeout(gymRestDismiss);if(seconds>0&&!playing)startGymTimer()}updateGymTimer()}
function openGymRest(){
 if(gymRestVisible)return;gymRestVisible=true;gymRestTotal=playing?seconds:Number(S.seconds)||90;
 if(!playing){seconds=Math.max(1,gymRestTotal);startGymTimer()}
 renderGymRest();
}
function closeGymRest(){clearTimeout(gymRestDismiss);clearInterval(timer);timer=null;playing=false;gymRestVisible=false;document.querySelector('#gymRest')?.remove();document.body.classList.remove('has-gym-rest')}
function renderGymRest(){
 if(!gymRestVisible)return;
 if(gymTimerActor!==enhancementActor()||cloudPageBlocked()||passwordRecoveryToken){closeGymRest();return}
 let panel=document.querySelector('#gymRest');if(!panel){panel=document.createElement('aside');panel.id='gymRest';panel.className='gym-rest';panel.setAttribute('aria-label','Descanso entre ejercicios');panel.innerHTML='<div class="rest-ring"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="21"/><circle cx="25" cy="25" r="21" data-rest-ring/></svg></div><div class="rest-grow"><span data-rest-label>DESCANSO</span><b data-rest-time role="timer" aria-label="Tiempo de descanso"></b></div><button data-rest-shift="-30" aria-label="Restar 30 segundos de descanso">−30s</button><button data-rest-shift="30" aria-label="Añadir 30 segundos de descanso">+30s</button><button data-rest-skip>Saltar</button>';document.body.append(panel)}
 const navHeight=document.querySelector('.nav')?.getBoundingClientRect().height||80;document.body.style.setProperty('--rest-nav-height',navHeight+'px');document.body.classList.add('has-gym-rest');updateGymTimer();
}
function attachGymRest(){
 document.addEventListener('change',event=>{const field=event.target;if(field.matches('[data-ex]')&&field.checked&&!field.disabled&&!workoutClosure()&&enhancementSaved())openGymRest()});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-rest-shift]');if(button)shiftGymTimer(Number(button.dataset.restShift));if(event.target.closest('[data-rest-skip]'))closeGymRest()});
 window.addEventListener('resize',renderGymRest);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&gymRestVisible)updateGymTimer()});
}

let gymStreakSeen=new Map();
function gymActiveDates(state=S,today=localDateKey()){
 const dates=new Set(),add=date=>{if(validLocalDay(date)&&date<=today)dates.add(date)};
 for(const [key,done] of Object.entries(state.tasks||{}))if(done)add(key.slice(0,10));
 for(const [date,checks] of Object.entries(state.meals||{}))if(Object.values(checks||{}).some(Boolean))add(date);
 for(const date of Object.keys(state.gymVisits||{}))if(gymVisitForDay(date,state).done)add(date);
 for(const date of Object.keys(state.closedDays||{}))if(closedDay(date,state))add(date);
 // A reopened snapshot still documents dated activity; use only the latest version per date.
 const latest=new Map();for(const entry of state.dayHistory||[])if(entry&&validLocalDay(entry.date))latest.set(entry.date,entry);
 for(const entry of latest.values())if((entry.exercises||[]).some(record=>record.done))add(entry.date);
 return dates;
}
function gymStreak(state=S,today=localDateKey()){
 const dates=gymActiveDates(state,today);let day=dates.has(today)?today:weeklyShiftDate(today,-1),count=0;
 while(dates.has(day)){count++;day=weeklyShiftDate(day,-1)}
 return {count,dates,week:weeklyDates(today)};
}
function renderGymStreak(){
 const streak=gymStreak(),actor=enhancementActor(),previous=gymStreakSeen.get(actor),increased=previous!==undefined&&streak.count>previous;gymStreakSeen.set(actor,streak.count);
 return `<section class="card gym-streak ${increased?'streak-increased':''}" aria-label="Racha de actividad"><span class="streak-flame" aria-hidden="true">${uiIcon('flame')}</span><div><p class="streak-kicker">RACHA ACTUAL</p><span class="streak-number">${streak.count}</span> <b>${streak.count===1?'día seguido':'días seguidos'}</b><p class="hint">${streak.count?'Cada acción que registras cuenta.':'Empieza hoy tu racha, a tu ritmo.'}</p><div class="streak-days">${streak.week.map((date,index)=>`<span class="${streak.dates.has(date)?'on':''} ${date===localDateKey()?'is-today':''}" aria-label="${esc(date)}${streak.dates.has(date)?' · Con actividad':' · Sin actividad registrada'}">${streak.dates.has(date)?'✓':['L','M','M','J','V','S','D'][index]}</span>`).join('')}</div><p class="streak-note">Registros con fecha. Los ejercicios sin fecha se conservan en Fuerza.</p></div></section>`;
}

const gymRecordsShown=new Set();let gymRecordPending=null,gymRecordDismiss=null,gymRecordFrame=null,gymRecordActor='';
function gymRecordCandidate(index,state=S){
 if(!plan[state.day]?.ex[index])return null;
 const key=state.week+'-'+state.day+'-'+index,original=plan[state.day].ex[index][0],variant=state.substitutions?.[key],name=exerciseGuide[original]?.variants.includes(variant)?variant:original;
 const load=strengthCoachNumber(state.loads?.[key]),marks=priorExerciseMarks(name,state);if(load===null||!marks.length)return null;
 const best=Math.max(...marks.map(mark=>mark.load));return load>best?{name,load,reps:strengthCoachNumber(state.reps?.[key]),best,delta:Math.round((load-best)*100)/100,key}:null;
}
function closeGymRecord(){clearTimeout(gymRecordDismiss);cancelAnimationFrame(gymRecordFrame);const panel=document.querySelector('#gymRecordToast');if(panel){panel.id='';panel.style.pointerEvents='none';if(!enhancementReduced()){panel.animate([{opacity:1},{opacity:0}],{duration:180}).finished.then(()=>panel.remove(),()=>panel.remove())}else panel.remove()}}
function refreshGymEnhancementScope(){if(gymRecordActor&&gymRecordActor!==enhancementActor())closeGymRecord();if(cloudPageBlocked()||passwordRecoveryToken){closeGymRest();closeGymRecord()}}
function showGymRecord(record){
 const actor=enhancementActor(),identity=actor+':'+S.week+':'+S.day+':'+record.name;
 if(gymRecordsShown.has(identity))return;gymRecordsShown.add(identity);closeGymRecord();gymRecordActor=actor;
 const panel=document.createElement('aside');panel.id='gymRecordToast';panel.className='gym-record-toast';panel.setAttribute('role','status');
 panel.innerHTML=`<span class="record-trophy" aria-hidden="true">${uiIcon('trophy')}</span><div class="record-copy"><span>NUEVO RÉCORD PERSONAL</span><h3>${esc(record.name)}</h3><p>${esc(record.load)} kg × ${record.reps===null?'reps sin registrar':esc(record.reps)} · <b>+${esc(record.delta)} kg</b> vs. tu marca anterior</p><small>Mayor carga anotada; compara también técnica y repeticiones.</small></div><button aria-label="Cerrar aviso de récord" data-record-close>×</button><i class="record-shine" aria-hidden="true"></i>`;
 document.body.append(panel);
 if(!enhancementReduced()){
  const colors=['#c4f542','#5aa7ff','#fff','#7be0a4','#e6ff9a'],particles=[];let seed=7;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
  for(let i=0;i<34;i++){const element=document.createElement('i'),angle=-Math.PI/2+(rnd()-.5)*2.6,speed=150+rnd()*220;element.className='record-confetti';element.setAttribute('aria-hidden','true');element.style.background=colors[i%colors.length];panel.append(element);particles.push({element,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,rotation:rnd()*720,delay:rnd()*.08})}
  const start=performance.now();function frame(now){const elapsed=(now-start)/1000;for(const p of particles){const t=Math.max(0,elapsed-p.delay);p.element.style.transform=`translate(${60+p.vx*t}px,${44+p.vy*t+420*t*t}px) rotate(${p.rotation*t}deg)`;p.element.style.opacity=String(t<=0||t>=1.2?0:1-Math.max(0,(t-.8)/.4))}if(elapsed<1.3&&panel.isConnected)gymRecordFrame=requestAnimationFrame(frame)}gymRecordFrame=requestAnimationFrame(frame);
 }
 gymRecordDismiss=setTimeout(closeGymRecord,4200);
}
function attachGymRecords(){
 document.addEventListener('input',event=>{
  if(!event.target.matches('[data-load]')||event.target.disabled||workoutClosure()||!enhancementSaved())return;
  clearTimeout(gymRecordPending);const index=Number(event.target.dataset.load),actor=enhancementActor(),week=S.week,day=S.day,state=S,key=wk(index),expectedLoad=S.loads[key],expectedName=chosenExercise(index);
  gymRecordPending=setTimeout(()=>{if(actor!==enhancementActor()||week!==S.week||day!==S.day||S!==state||S.loads[key]!==expectedLoad||chosenExercise(index)!==expectedName||workoutClosure()||!enhancementSaved())return;const candidate=gymRecordCandidate(index);if(candidate)showGymRecord(candidate)},650);
 });
 document.addEventListener('click',event=>{if(event.target.closest('#gymRecordToast'))closeGymRecord()});
}

function gymActivityMetrics(state=S,today=localDateKey()){
 const archive=closedDay(today,state),day=dateRoutineDay(today),exercises=archive?.exercises||plan[day].ex,total=exercises.length;
 const done=archive?exercises.filter(entry=>entry.done).length:plan[day].ex.filter((_,index)=>state.done?.[state.week+'-'+day+'-'+index]).length;
 const checks=dayMealChecks(today,state),meals=[0,1,2,3].filter(index=>checks[index]).length,water=Math.max(0,Number(archive?.water??state.water?.[today])||0)/1000;
 return [{id:'training',label:total?'Entreno':'Descanso',value:done,total,ratio:total?done/total:1,color:'#c4f542'}, {id:'meals',label:'Comidas',value:meals,total:4,ratio:meals/4,color:'#5aa7ff'}, {id:'water',label:'Agua',value:water,total:2,ratio:water/2,color:'#4fd8e6'}];
}
function renderGymActivityRings(){
 const metrics=gymActivityMetrics();
 return `<section class="card gym-rings" aria-label="Actividad registrada de hoy"><div class="activity-rings-art"><svg viewBox="0 0 150 150" role="img" aria-label="Anillos de entrenamiento, comidas y agua">${metrics.map((entry,index)=>{const radius=64-index*18,circumference=2*Math.PI*radius;return `<circle class="ring-track" cx="75" cy="75" r="${radius}"/><circle class="activity-ring" cx="75" cy="75" r="${radius}" style="stroke:${entry.color};stroke-dasharray:${circumference};stroke-dashoffset:${circumference*(1-Math.min(1,entry.ratio))}" data-ring-circumference="${circumference}" data-ring-ratio="${Math.min(1,entry.ratio)}"/>`}).join('')}</svg><span>HOY</span></div><div class="activity-legend"><h3>Tu actividad</h3>${metrics.map(entry=>`<div><i style="background:${entry.color}" aria-hidden="true"></i><span>${entry.label}</span><b data-activity-counter data-value="${entry.value}" data-total="${entry.total}" data-water="${entry.id==='water'}" aria-label="${esc(entry.label)}: ${entry.id==='training'&&!entry.total?'día de descanso':esc(entry.value)+' de '+entry.total+(entry.id==='water'?' litros':'')}">${entry.id==='training'&&!entry.total?'✓':(entry.id==='water'?entry.value.toFixed(1):entry.value)+'/'+entry.total+(entry.id==='water'?' L':'')}</b></div>`).join('')}<p>Comidas incluye snacks. Agua: referencia de 2 L.</p></div></section>`;
}
function animateGymActivity(){
 const panel=document.querySelector('.gym-rings');if(!panel||panel.dataset.animated||enhancementReduced())return;panel.dataset.animated='true';
 const rings=[...panel.querySelectorAll('.activity-ring')],counters=[...panel.querySelectorAll('[data-activity-counter]')],start=performance.now(),actor=enhancementActor();
 function frame(now){if(!panel.isConnected||actor!==enhancementActor())return;const elapsed=now-start;
  rings.forEach((ring,index)=>{const t=Math.min(1,Math.max(0,(elapsed-index*80)/600)),ease=1-Math.pow(1-t,3);ring.style.strokeDashoffset=String(Number(ring.dataset.ringCircumference)*(1-Number(ring.dataset.ringRatio)*ease));const counter=counters[index],value=Number(counter.dataset.value)*ease,total=Number(counter.dataset.total);if(total)counter.textContent=(counter.dataset.water==='true'?value.toFixed(1):Math.round(value))+'/'+total+(counter.dataset.water==='true'?' L':'')});
  if(elapsed<800)requestAnimationFrame(frame)
 }requestAnimationFrame(frame);
}

function gymWeeklyRecords(state,start,end){
 const best=new Map(),records=new Map();
 for(const date of Object.keys(state.closedDays||{}).filter(date=>validLocalDay(date)&&date<=end).sort()){
  const snapshot=closedDay(date,state);if(!snapshot)continue;
  const onDate=new Map();
  for(const exercise of snapshot.exercises||[]){
   const load=strengthCoachNumber(exercise.load);if(!exercise.done||load===null||!exercise.name)continue;
   const identity=exercise.name+'\u0000'+String(exercise.equipment||'');
   if(!onDate.has(identity)||load>onDate.get(identity).load)onDate.set(identity,{name:exercise.name,load});
  }
  for(const [identity,exercise] of onDate){
   const previous=best.get(identity),load=exercise.load;
   if(previous!==undefined&&load>previous&&date>=start)records.set(identity,{name:exercise.name,load,delta:Math.round((load-previous)*100)/100});
   best.set(identity,Math.max(previous||0,load));
  }
 }
 return [...records.values()];
}
function gymWeeklyShareData(date=reviewWeekDate,state=S){
 const review=weeklyReview(date,state),weights=(state.body||[]).filter(entry=>validLocalDay(entry.date)&&entry.date<=review.end&&strengthCoachNumber(entry.kg)!==null).sort((a,b)=>a.date.localeCompare(b.date)),weight=weights.at(-1)||null;
 return {review,weight,records:gymWeeklyRecords(state,review.start,review.end),name:String(state.profileName||'Mi perfil')};
}
function renderGymWeekShare(){
 const {review,weight,records}=gymWeeklyShareData();
 return `<section class="gym-week-share"><p class="eyebrow">MI GYM PLANNER</p><h3>Tu semana, para recordar</h3><p>${esc(weeklyDateLabel(review.start))} — ${esc(weeklyDateLabel(review.end))}</p><div class="week-share-metrics"><div><b data-week-count="${review.visits}">${review.visits}</b><span>Visitas al gym</span></div><div><b>${weight?esc(weight.kg)+' kg':'—'}</b><span>${weight?'Peso · '+esc(weight.date):'Sin peso registrado'}</span></div><div><b data-week-count="${records.length}">${records.length}</b><span>Récords de carga</span></div></div><div class="week-share-bars" aria-label="Actividades marcadas por día">${review.days.map((day,index)=>`<div><span aria-label="${esc(day.date)}: ${day.activities.done} de ${day.activities.total} actividades" style="height:${Math.max(4,day.activities.percent)}%;animation-delay:${index*60}ms"></span><small>${['L','M','M','J','V','S','D'][index]}</small></div>`).join('')}</div><p class="hint">Récords: mayor carga en cierres fechados del mismo ejercicio y equipo, con referencia anterior. No son una estimación de fuerza máxima.</p><button class="btn" data-share-week>${uiIcon('share')} Compartir mi semana</button><p class="hint" data-share-week-status role="status"></p></section>`;
}
function gymShareCanvas(data){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Este navegador no puede preparar la imagen.');
 const {review,weight,records,name}=data;
 const gradient=ctx.createLinearGradient(0,0,1080,1350);gradient.addColorStop(0,'#16304a');gradient.addColorStop(.55,'#0d1928');gradient.addColorStop(1,'#070c15');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 const text=(value,x,y,size=30,color='#f1f6ff',bold=false)=>{ctx.fillStyle=color;ctx.font=`${bold?'800':'500'} ${size}px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`;ctx.fillText(String(value),x,y)};
 const shorten=(value,max)=>{let result=String(value);while(result.length&&ctx.measureText(result).width>max)result=result.slice(0,-1);return result===String(value)?result:result.slice(0,-1)+'…'};
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,28);else ctx.rect(x,y,w,h);ctx.fill()};
 box(72,70,60,60,'#c4f542');text('✦',85,113,40,'#0b1604',true);text('MI GYM PLANNER',154,111,28,'#c4f542',true);
 text('Mi semana',72,235,78,'#f1f6ff',true);ctx.font='500 32px sans-serif';text(shorten(name,900),72,292,32,'#b9cbe1');text(weeklyDateLabel(review.start)+' — '+weeklyDateLabel(review.end),72,340,28,'#9aabc2');
 const metrics=[[review.visits,'VISITAS AL GYM'],[weight?Number(weight.kg)+' kg':'—','PESO REGISTRADO'],[records.length,'RÉCORDS DE CARGA']];
 metrics.forEach(([value,label],i)=>{const x=72+i*320;box(x,400,296,175,'#172739');text(value,x+25,477,50,i===1?'#f1f6ff':'#c4f542',true);text(label,x+25,530,20,'#b9cbe1')});
 text('ACTIVIDADES MARCADAS',72,655,27,'#b9cbe1',true);
 review.days.forEach((day,i)=>{const x=85+i*133,height=Math.max(8,day.activities.percent*2.3);box(x,960-height,92,height,day.activities.done?'#c4f542':'#24354b');text(['L','M','M','J','V','S','D'][i],x+33,1005,28,'#b9cbe1',true);text(day.activities.done+'/'+day.activities.total,x+12,1050,23,'#9aabc2')});
 const line=records.length?records[0].name+' · '+records[0].load+' kg':'Cada paso que registras cuenta.';ctx.font='500 30px sans-serif';text(shorten(line,930),72,1140,30,'#c4f542',true);
 text(weight?'Peso registrado el '+weight.date:'No se añadieron mediciones de peso.',72,1195,24,'#9aabc2');text('TU CONSTANCIA · TU PROGRESO',72,1280,25,'#b9cbe1',true);
 return canvas;
}
let gymWeekSharing=false;
async function shareGymWeek(){
 if(gymWeekSharing||cloudPageBlocked())return;
 const actor=enhancementActor(),data=gymWeeklyShareData(),status=document.querySelector('[data-share-week-status]');gymWeekSharing=true;
 try{
  if(status)status.textContent='Preparando tu imagen…';
  const canvas=gymShareCanvas(data),blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('No se pudo preparar la imagen.')),'image/png'));
  if(actor!==enhancementActor()||cloudPageBlocked())return;
  const file=new File([blob],'mi-gym-semana-'+data.review.start+'.png',{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Mi semana en Mi Gym Planner'});if(status?.isConnected)status.textContent='Tu resumen está listo.'}
  else{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(status?.isConnected)status.textContent='Imagen descargada. Puedes compartirla desde tus archivos.'}
 }catch(error){if(error.name!=='AbortError'&&status?.isConnected)status.textContent='No pudimos compartir la imagen. Vuelve a intentarlo o descarga una copia de tus registros.';else if(status?.isConnected)status.textContent='Puedes compartirla cuando quieras.'}
 finally{gymWeekSharing=false}
}
function animateGymWeekCounts(){
 const nodes=[...document.querySelectorAll('[data-week-count]')];if(!nodes.length||enhancementReduced())return;
 const start=performance.now();function frame(now){const ease=1-Math.pow(1-Math.min(1,(now-start)/600),3);for(const node of nodes)if(node.isConnected)node.textContent=String(Math.round(Number(node.dataset.weekCount)*ease));if(now-start<600&&nodes.some(node=>node.isConnected))requestAnimationFrame(frame)}requestAnimationFrame(frame);
}
function attachGymWeekShare(){document.addEventListener('click',event=>{if(event.target.closest('[data-share-week]'))shareGymWeek()})}
