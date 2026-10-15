// Recommendations use the written description, without inventing quantities or ingredients.
const mealNames=['Desayuno','Almuerzo','Cena','Snack'];
const breakfastAdjustments={late:'Desayuné más tarde','skipped-work':'No desayuné por trabajo','skipped-time':'No desayuné por falta de tiempo'};
function breakfastAdjustmentLabel(value){return breakfastAdjustments[value]||''}
function dailyMealAdvice(checks,logs,adjustment={}){
 const breakfast=Object.hasOwn(breakfastAdjustments,adjustment.breakfast)?adjustment.breakfast:'';
 const recorded=new Set(logs.filter(e=>Number.isInteger(+e.type)&&+e.type>=0&&+e.type<mealNames.length).map(e=>+e.type));
 mealNames.forEach((_,i)=>{if(checks[i])recorded.add(i)});
 // An explicit breakfast note is separate from the existing completion marks.
 const unrecorded=[0,1,2].filter(i=>!recorded.has(i)&&!(i===0&&breakfast));
 const groups=new Set(logs.flatMap(e=>reviewMeal(e.text,e.type).found.map(g=>g.id)));
 const suggestions=[];
 if(!groups.size)suggestions.push('Para tu próxima comida, una opción práctica es combinar una fuente de proteína, fruta o verduras y arroz, papa, pan u otra fuente de energía, según tus gustos y tu hambre.');
 else{
  if(!groups.has('protein'))suggestions.push('En lo que describiste no aparece una fuente de proteína. Si no la comiste, podrías incluir huevo, yogur, pollo, tofu o menestras en tu próxima comida.');
  if(!groups.has('plants'))suggestions.push('En tus descripciones no aparece fruta ni verduras. Si aún no las comiste, una fruta o verduras que tengas a mano pueden acompañar tu próxima comida.');
  if(!groups.has('energy'))suggestions.push('No mencionaste arroz, papa, pan, avena u otra fuente de energía. Si faltó y tienes hambre, puedes incluir una en tu próxima comida.');
  if(groups.size===3)suggestions.push('En lo que describiste aparecen proteína, fruta o verduras y una fuente de energía. Puedes variar los ingredientes en tu siguiente comida y ajustar las porciones a tu hambre.');
 }
 const breakfastNote=breakfast==='late'?'Desayunaste más tarde. Puedes continuar con tus siguientes comidas según tu hambre y tus horarios. Esta nota no cambia tus marcas.':breakfast?'Si tienes hambre y poco tiempo, puedes elegir yogur con fruta y avena, o pan con huevo y una fruta. Después, continúa con tu siguiente comida habitual.':'Si falta una marca o una descripción, no sabemos si comiste: puede que sólo falte registrarlo.';
 return {breakfast,unrecorded,groups,suggestions,breakfastNote};
}
function renderMealRecovery(checks,logs,adjustment,readonly=false){
 const advice=dailyMealAdvice(checks,logs,adjustment),labels={protein:'Proteína',plants:'Fruta o verduras',energy:'Fuente de energía'};
 return `<section class="card meal-recovery" aria-labelledby="mealRecoveryTitle"><div class="food-kicker">${uiIcon('food')} TU DÍA DE COMIDAS</div><h3 id="mealRecoveryTitle">Tu comida, a tu ritmo</h3><p class="meal-recovery-intro">Si el trabajo cambia tus horarios, puedes anotarlo aquí y elegir una opción que te resulte práctica.</p><h4>¿Cómo fue tu desayuno?</h4><div class="breakfast-options" role="group" aria-label="Horario del desayuno">${[['','Sin aclarar'],...Object.entries(breakfastAdjustments)].map(([value,label])=>`<button type="button" data-breakfast-status="${value}" aria-pressed="${advice.breakfast===value}" ${readonly?'disabled':''}>${esc(label)}</button>`).join('')}</div><p id="mealAdjustmentError" class="food-error" role="alert" hidden></p>${advice.breakfast?`<p class="breakfast-record">${uiIcon('check')} <span>${esc(breakfastAdjustmentLabel(advice.breakfast))}</span></p>`:''}<p class="meal-recovery-note">${esc(advice.breakfastNote)}</p><div class="meal-remaining">${advice.unrecorded.length?'<span>Sin marcar ni describir</span><p>'+advice.unrecorded.map(i=>esc(mealNames[i])).join(' · ')+'</p><small>Esto indica registros pendientes, no comidas que debas recuperar. El snack es opcional.</small>':'<span>Tus comidas principales tienen un registro o una nota.</span>'}</div><h4>Qué podrías sumar</h4>${advice.groups.size?'<div class="meal-group-tags" aria-label="Grupos mencionados">'+[...advice.groups].map(g=>'<span>'+esc(labels[g])+'</span>').join('')+'</div>':''}<ul class="meal-recovery-advice">${advice.suggestions.map(t=>'<li>'+esc(t)+'</li>').join('')}</ul><p class="hint">Estas ideas usan sólo lo que escribiste. Las marcas no indican ingredientes ni porciones, y no permiten saber cuánto necesitas comer.</p>${readonly?'':'<button class="text-link" type="button" data-food-plan-type="'+(advice.unrecorded[0]??1)+'">Contar mi próxima comida '+uiIcon('arrow')+'</button>'}</section>`;
}
function renderMealTracker(checks,logs,readonly=false){
 const count=[0,1,2].filter(type=>checks[type]).length;
 return `<section class="card meal-tracker" aria-labelledby="mealTrackerTitle"><div class="meal-tracker-heading"><h3 id="mealTrackerTitle">Tus comidas del día</h3><span class="meal-tracker-count">${count}/3 marcadas</span></div><p class="meal-tracker-intro">Marca lo que ya comiste y cuéntame tu plato para ver qué podrías mejorar.</p><p id="mealTrackingError" class="food-error" role="alert" hidden></p><div class="meal-tracker-list">${mealNames.map((name,type)=>{
  const entries=logs.filter(entry=>+entry.type===type),last=entries.at(-1),advice=last?reviewMeal(last.text,type):null;
  return `<article class="meal-tracker-item ${checks[type]?'is-marked':''}"><label class="meal-mark"><input type="checkbox" data-meal="${type}" data-food-check aria-describedby="mealStatus${type}" ${checks[type]?'checked':''} ${readonly?'disabled':''}><span class="meal-mark-copy"><b>${esc(name)}${type===3?' · opcional':''}</b><small id="mealStatus${type}">${checks[type]?'Marcada como realizada':'Sin marcar'}${entries.length?' · '+entries.length+' '+(entries.length===1?'registro':'registros'):''}</small></span></label><p class="meal-tracker-description">${last?esc(last.text):checks[type]?'Cuéntame qué comiste para recomendarte qué podrías agregar.':'Cuando comas, puedes marcarla aquí o guardar la descripción de tu plato.'}</p>${advice?'<div class="meal-tracker-feedback"><span>QUÉ PODRÍAS MEJORAR</span><p>'+esc(advice.suggestions[0])+'</p></div>':''}<div class="meal-tracker-actions"><button class="text-link" type="button" data-food-record-type="${type}" ${readonly||foodDraft.editId?'disabled':''}>${last?'Añadir otro registro':'Contar qué comí'} ${uiIcon('arrow')}</button>${last?'<button class="text-link" type="button" data-food-review="'+esc(last.id)+'">Ver recomendaciones</button>':''}</div></article>`;
 }).join('')}</div><p class="meal-tracker-note">Las marcas se guardan por fecha y se comparten con Mi Día. Quitarlas no borra tus platos. El snack no cuenta entre las tres comidas principales.</p></section>`;
}
function stageMealMark(date,type,marked){
 S.meals={...(S.meals||{}),[date]:{...(S.meals?.[date]||{}),[type]:marked}};
 if(type<3)S.tasks={...(S.tasks||{}),[date+'-'+dailyMealIds[type]]:marked};
}
let foodNotice=null;
function renderFoods(){
 const closed=closedDay(selectedDate);const checks=dayMealChecks(selectedDate),logs=(closed?closed.foods:Array.isArray(S.foodLog)?S.foodLog:[]).filter(e=>e.date===selectedDate);
 const adjustment=closed?(closed.mealAdjustment||{}):(S.mealAdjustments?.[selectedDate]||{});
 const type=Number.isInteger(foodDraft.type)&&foodDraft.type>=0&&foodDraft.type<4?foodDraft.type:1,explorer=renderMealExplorer(mealExplorer.type??type);
 return `<div class="food-page-heading"><div><p class="eyebrow">IDEAS PARA CADA MOMENTO</p><h2>Comidas</h2></div><button class="food-log-jump" data-meal-log ${closed?'disabled':''}>Mi plato ${uiIcon('arrow')}</button></div><p class="section-subtitle">Elige qué comer o cuéntame tu plato para ver qué podrías agregar.</p>
 <div class="card food-date"><label class="label" for="foodDate">Fecha de tus comidas</label><input id="foodDate" class="field" type="date" data-field="date" value="${esc(selectedDate)}"></div>
 ${renderMealTracker(checks,logs,!!closed)}
 <form id="foodForm" class="card food-form"><div class="food-log-meta"><span class="pill">${foodDraft.editId?'Editando: ':''}${esc(mealNames[type])}</span></div><h3>${foodDraft.editId?'Añade un detalle a tu comida':'¿Qué estás comiendo, '+esc(S.profileName||'Giancarlo')+'?'}</h3>${foodDraft.editId?'':'<div class="food-form-types" role="group" aria-label="Comida que voy a registrar">'+mealNames.map((name,index)=>'<button type="button" data-food-form-type="'+index+'" aria-pressed="'+(index===type)+'">'+esc(name)+'</button>').join('')+'</div>'}${renderChosenMealIdea()}<label class="label" for="foodDescription">Cuéntame qué hay en tu plato</label><textarea id="foodDescription" class="field" rows="4" maxlength="1500" required placeholder="Ej. Arroz con pollo a la plancha y una ensalada. Comí un plato y quedé satisfecho.">${esc(foodDraft.text)}</textarea><p class="hint">Incluye ingredientes, preparación y cómo te sentiste. Las sugerencias se basan en lo que describes.${foodDraft.editId?'':' Al guardar un nuevo plato también se marcará esta comida como realizada.'}</p><p id="foodError" class="food-error" role="alert" hidden></p><button class="btn food-submit" type="submit">${foodDraft.editId?'Actualizar y recibir sugerencias':'Guardar y recibir sugerencias'} ${uiIcon('arrow')}</button>${foodDraft.editId?'<button class="text-link" type="button" data-food-cancel>Cancelar edición</button>':''}</form>
 ${foodNotice?.date===selectedDate?'<p class="food-save-confirmation" role="status">'+esc(foodNotice.text)+'</p>':''}
 <div class="section-heading"><h2>Lo que me cuentas</h2><span class="subtle-tag">${logs.length} ${logs.length===1?'REGISTRO':'REGISTROS'}</span></div>
 ${logs.length?logs.slice().reverse().map(e=>{const advice=reviewMeal(e.text,e.type);return `<article class="card food-log" id="foodLog-${esc(e.id)}" tabindex="-1"><div class="food-log-meta"><span class="pill">${esc(mealNames[e.type]||'Comida')}</span><time>${esc(e.time||'')}</time></div><p class="food-description">${esc(e.text)}</p><div class="food-feedback"><div class="food-kicker">${uiIcon('food')} SUGERENCIA PARA TI</div><h3>${esc(advice.title)}</h3>${advice.found.length?'<p class="food-detected">Lo que mencionaste: '+advice.found.map(g=>esc(g.label)).join(' · ')+'</p>':''}<ul>${advice.suggestions.map(t=>'<li>'+esc(t)+'</li>').join('')}</ul><p class="hint">${esc(advice.question)}</p><button class="text-link" data-food-detail="${esc(e.id)}">Añadir un detalle ${uiIcon('arrow')}</button></div></article>`}).join(''):'<div class="food-empty">'+uiIcon('food')+'<h3>Tu primera comida empieza aquí</h3><p>Cuéntame qué comiste y aquí verás el registro y una sugerencia para acompañarte.</p></div>'}
 ${explorer}
 ${renderMealRecovery(checks,logs,adjustment,!!closed)}`;
}
let foodDraft={text:'',type:1};
function attachFoodInteractions(){
 document.addEventListener('change',event=>{
  const input=event.target;if(!input.hasAttribute('data-food-check'))return;
  const type=Number(input.dataset.meal);if(input.disabled||closedDay(selectedDate)||!validLocalDay(selectedDate)||!Number.isInteger(type)||type<0||type>3){render();return}
  const previousMeals=S.meals,previousTasks=S.tasks;stageMealMark(selectedDate,type,input.checked);
  try{save()}catch{S.meals=previousMeals;S.tasks=previousTasks;input.checked=!!dayMealChecks(selectedDate)[type];const error=document.querySelector('#mealTrackingError');if(error){error.hidden=false;error.textContent='No se pudo guardar la marca. Tus comidas anteriores siguen intactas.'}return}
  foodNotice=null;render();document.querySelector('[data-food-check][data-meal="'+type+'"]')?.focus({preventScroll:true});
 });
 document.addEventListener('input',e=>{if(e.target.id==='foodDescription'){foodDraft.text=e.target.value;foodNotice=null;document.querySelector('.food-save-confirmation')?.remove()}});
 document.addEventListener('click',e=>{
  const record=e.target.closest('[data-food-record-type],[data-food-form-type]');if(record&&!record.disabled&&!closedDay(selectedDate)&&!foodDraft.editId){const type=Number(record.dataset.foodRecordType??record.dataset.foodFormType);if(Number.isInteger(type)&&type>=0&&type<4){foodDraft.type=type;mealExplorer.type=type;mealExplorer.referenceId='';mealExplorer.offset=0;foodNotice=null;render();focusMealDescription()}return}
  const review=e.target.closest('[data-food-review]');if(review){const article=document.getElementById('foodLog-'+review.dataset.foodReview);article?.focus({preventScroll:true});article?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return}
  const breakfast=e.target.closest('[data-breakfast-status]');if(breakfast){
   if(closedDay(selectedDate)){render();return}
   const value=breakfast.dataset.breakfastStatus;if(value&&!Object.hasOwn(breakfastAdjustments,value))return;
   const previous=S.mealAdjustments,adjustment={...(previous?.[selectedDate]||{})};
   if(value)adjustment.breakfast=value;else delete adjustment.breakfast;
   S.mealAdjustments={...(previous||{}),[selectedDate]:adjustment};
   try{save()}catch{S.mealAdjustments=previous;const error=document.querySelector('#mealAdjustmentError');error.hidden=false;error.textContent='No se pudo guardar esta nota. Tus registros anteriores siguen intactos.';return}
   render();return;
  }
  const planned=e.target.closest('[data-food-plan-type]');if(planned&&!closedDay(selectedDate)){if(foodDraft.editId){document.querySelector('#foodDescription')?.focus();return}foodDraft.type=+planned.dataset.foodPlanType;mealExplorer.type=foodDraft.type;mealExplorer.offset=0;mealExplorer.referenceId='';render();document.querySelector('#foodDescription')?.focus();return}
  if(e.target.closest('[data-food-cancel]')){foodDraft={text:'',type:foodDraft.type};mealExplorer.type=foodDraft.type;mealExplorer.referenceId='';render()}
  const type=e.target.closest('[data-food-type]');if(type){mealExplorer.type=+type.dataset.foodType;if(!foodDraft.editId)foodDraft.type=mealExplorer.type;mealExplorer.offset=0;mealExplorer.referenceId='';render();document.querySelector('[data-food-type="'+mealExplorer.type+'"]')?.focus({preventScroll:true})}
  const detail=e.target.closest('[data-food-detail]');if(detail&&!closedDay(selectedDate)){const entry=S.foodLog?.find(e=>e.id===detail.dataset.foodDetail);if(entry){foodDraft={text:entry.text+'\n',type:+entry.type,editId:entry.id,editDate:entry.date};mealExplorer.type=foodDraft.type;mealExplorer.offset=0;mealExplorer.referenceId='';render();const input=document.querySelector('#foodDescription');input.focus();input.setSelectionRange(input.value.length,input.value.length)}}
 });
 document.addEventListener('submit',e=>{
  if(e.target.id!=='foodForm')return;e.preventDefault();const error=document.querySelector('#foodError');if(closedDay(selectedDate)||foodDraft.editDate&&closedDay(foodDraft.editDate)){if(error){error.hidden=false;error.textContent='Este día está cerrado. Reábrelo para editar su comida.'}return}const text=foodDraft.text.trim().slice(0,1500);
  if(!text){error.hidden=false;error.textContent='Cuéntame los ingredientes de tu comida para poder orientarte.';return}
  if(!Number.isInteger(foodDraft.type)||foodDraft.type<0||foodDraft.type>3){error.hidden=false;error.textContent='Elige desayuno, almuerzo, cena o snack para guardar tu comida.';return}
  const previousLog=S.foodLog,previousMeals=S.meals,previousTasks=S.tasks;const log=Array.isArray(previousLog)?previousLog:[];if(foodDraft.editId&&!log.some(entry=>entry.id===foodDraft.editId&&entry.date===foodDraft.editDate)){error.hidden=false;error.textContent='El registro que estabas editando ya no está disponible. Cancela la edición para continuar.';return}const now=new Date();
  const entry={id:foodDraft.editId||crypto.randomUUID(),date:foodDraft.editDate||selectedDate,type:foodDraft.type,text,time:new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(now)};
  S.foodLog=foodDraft.editId?log.map(e=>e.id===foodDraft.editId?entry:e):[...log,entry];
  if(!foodDraft.editId)stageMealMark(entry.date,entry.type,true);
  try{save()}catch{S.foodLog=previousLog;S.meals=previousMeals;S.tasks=previousTasks;error.hidden=false;error.textContent='No se pudo guardar. Tus registros anteriores siguen intactos; exporta un respaldo antes de liberar espacio.';return}
  foodNotice={date:entry.date,text:mealNames[entry.type]+(foodDraft.editId?' actualizado. Se conservan tus marcas.':' guardado y marcado. Ya puedes ver tus recomendaciones.')};
  selectedDate=entry.date;foodDraft={text:'',type:entry.type};mealExplorer.referenceId='';render();const article=document.getElementById('foodLog-'+entry.id);article?.focus({preventScroll:true});article?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 });
}
