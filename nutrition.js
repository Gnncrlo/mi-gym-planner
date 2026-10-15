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
// Drafts and expanded panels are view state only; persisted fields keep their format.
let foodDraft={text:'',type:1},foodDraftDate='',foodPanelOpen=1,foodNotice=null;
const foodDrafts=new Map();
function rememberFoodDraft(){if(foodDraftDate)foodDrafts.set(foodDraftDate+':'+foodDraft.type,{...foodDraft})}
function syncFoodDraftDate(){
 if(foodDraftDate===selectedDate)return;
 rememberFoodDraft();foodDraftDate=selectedDate;
 foodDraft={...(foodDrafts.get(selectedDate+':'+foodDraft.type)||{text:'',type:foodDraft.type})};
 mealExplorer.referenceId='';mealExplorer.expanded=false;
}
function selectFoodPanel(type,{draw=true,focus=false}={}){
 if(!Number.isInteger(type)||type<0||type>3)return;
 syncFoodDraftDate();rememberFoodDraft();
 foodDraft={...(foodDrafts.get(selectedDate+':'+type)||{text:'',type})};
 foodPanelOpen=type;mealExplorer.type=type;mealExplorer.offset=0;mealExplorer.referenceId='';mealExplorer.expanded=false;foodNotice=null;
 if(draw){render();if(focus)focusMealDescription()}
}
function stageMealMark(date,type,marked){
 S.meals={...(S.meals||{}),[date]:{...(S.meals?.[date]||{}),[type]:marked}};
 if(type<3)S.tasks={...(S.tasks||{}),[date+'-'+dailyMealIds[type]]:marked};
}
function renderFoodForm(readonly){
 return `<form id="foodForm" class="card food-form"><div class="food-log-meta"><span class="pill">${foodDraft.editId?'Editando: ':''}${esc(mealNames[foodDraft.type])}</span></div><h3>${foodDraft.editId?'Añade un detalle a tu comida':'¿Qué comiste, '+esc(S.profileName||'Giancarlo')+'?'}</h3>${renderChosenMealIdea()}<label class="label" for="foodDescription">Escribe lo que comiste</label><textarea id="foodDescription" class="field" rows="4" maxlength="1500" required ${readonly?'disabled':''} placeholder="${esc(['Ej. Pan con huevo y café. Quedé satisfecho.','Ej. Arroz con pollo y ensalada. Me quedé con hambre.','Ej. Tortilla de verduras con pan. Quedé satisfecho.','Ej. Yogur con fruta.'][foodDraft.type])}">${esc(foodDraft.text)}</textarea><p class="hint">Incluye los ingredientes y si quedaste con hambre o satisfecho.${foodDraft.editId?'':' Al guardar, esta comida también quedará marcada.'}</p><p id="foodError" class="food-error" role="alert" hidden></p><button class="btn food-submit" type="submit" ${readonly?'disabled':''}>${foodDraft.editId?'Actualizar y recibir sugerencias':'Guardar y recibir sugerencias'} ${uiIcon('arrow')}</button>${foodDraft.editId?'<button class="text-link" type="button" data-food-cancel '+(readonly?'disabled':'')+'>Cancelar edición</button>':''}</form>`;
}
function renderFoodLogs(logs,readonly){
 return logs.slice().reverse().map(entry=>{
  const advice=reviewMeal(entry.text,entry.type);
  return `<article class="card food-log" id="foodLog-${esc(entry.id)}" tabindex="-1"><div class="food-log-meta"><span class="pill">Lo que comiste</span><time>${esc(entry.time||'')}</time></div><p class="food-description">${esc(entry.text)}</p><div class="food-feedback"><div class="food-kicker">${uiIcon('food')} QUÉ PODRÍAS AGREGAR O MEJORAR</div><h3>${esc(advice.title)}</h3>${advice.found.length?'<p class="food-detected">Lo que mencionaste: '+advice.found.map(group=>esc(group.label)).join(' · ')+'</p>':''}<ul>${advice.suggestions.map(text=>'<li>'+esc(text)+'</li>').join('')}</ul><p class="hint">${esc(advice.question)}</p><button class="text-link" type="button" data-food-detail="${esc(entry.id)}" ${readonly?'disabled':''}>Añadir un detalle ${uiIcon('arrow')}</button></div></article>`;
 }).join('');
}
function renderMealPanel(type,checks,logs,readonly){
 const entries=logs.filter(entry=>+entry.type===type),idea=selectMealIdeas(type,{date:selectedDate})[0],active=foodDraft.type===type;
 return `<details class="card meal-panel" data-meal-panel="${type}" ${foodPanelOpen===type?'open':''}><summary class="meal-panel-summary"><span class="meal-panel-icon">${uiIcon(type===2?'moon':'food')}</span><span class="meal-panel-title"><b>${esc(mealNames[type])}${type===3?' · opcional':''}</b><small>${checks[type]?'Comida marcada':'Sin marcar'}${entries.length?' · '+entries.length+' '+(entries.length===1?'registro':'registros'):''}</small></span><span class="meal-panel-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></summary><div class="meal-panel-body"><label class="meal-mark"><input type="checkbox" data-meal="${type}" data-food-check ${checks[type]?'checked':''} ${readonly?'disabled':''}><span class="meal-mark-copy"><b>Ya ${type===0?'desayuné':type===1?'almorcé':type===2?'cené':'comí este snack'}</b><small>La marca se guarda para esta fecha.</small></span></label><article class="meal-daily-idea"><p class="meal-daily-label">IDEA PARA ESTE DÍA · ${esc(selectedDate)}</p><h4>${esc(idea.name)}</h4><p>${esc(idea.ingredients.join(' · '))}</p><button class="text-link" type="button" data-meal-recipe="${esc(idea.id)}" aria-haspopup="dialog">Ingredientes y preparación ${uiIcon('arrow')}</button></article>${active?renderFoodForm(readonly):''}${foodNotice?.date===selectedDate&&foodNotice.type===type?'<p class="food-save-confirmation" role="status">'+esc(foodNotice.text)+'</p>':''}<div class="meal-panel-logs"><h4>${entries.length?'Tu '+esc(mealNames[type].toLowerCase())+' y sus recomendaciones':'Tus recomendaciones'}</h4>${entries.length?renderFoodLogs(entries,readonly):'<p class="hint">Cuando guardes lo que comiste, aquí verás qué podrías agregar según los ingredientes y cómo te sentiste. Una marca por sí sola no indica qué había en tu plato.</p>'}</div>${active?'<button class="text-link meal-options-toggle" type="button" data-meal-show-options="'+type+'" aria-expanded="'+!!mealExplorer.expanded+'">'+(mealExplorer.expanded?'Ocultar otras ideas':'Más opciones para '+esc(mealNames[type].toLowerCase()))+'</button>'+(mealExplorer.expanded?'<div class="meal-panel-options">'+renderMealExplorer(type,{embedded:true})+'</div>':''):''}</div></details>`;
}
function renderFoods(){
 syncFoodDraftDate();
 if(mealExplorer.date!==selectedDate){mealExplorer.date=selectedDate;mealExplorer.offset=0;mealExplorer.referenceId=''}
 const closed=closedDay(selectedDate),checks=dayMealChecks(selectedDate),logs=(closed?closed.foods:Array.isArray(S.foodLog)?S.foodLog:[]).filter(entry=>entry.date===selectedDate);
 const count=[0,1,2].filter(type=>checks[type]).length;
 return `<div class="food-page-heading"><div><p class="eyebrow">A TU RITMO</p><h2>Comidas</h2></div></div><p class="section-subtitle">Abre una comida para anotar tu plato y descubrir qué comer o agregar.</p><div class="card food-date"><label class="label" for="foodDate">Fecha de tus comidas</label><input id="foodDate" class="field" type="date" data-field="date" value="${esc(selectedDate)}"></div><div class="meal-day-heading"><h3>Tus comidas del día</h3><span class="meal-tracker-count">${count}/3 marcadas</span></div><p id="mealTrackingError" class="food-error" role="alert" hidden></p><div class="meal-accordion">${mealNames.map((_,type)=>renderMealPanel(type,checks,logs,!!closed)).join('')}</div><p class="meal-day-note">Tus platos y marcas se guardan por fecha y se comparten con Mi Día. Quitar una marca no borra lo que comiste. El snack es opcional y no entra en el contador de las tres comidas principales.</p>`;
}
function attachFoodInteractions(){
 document.addEventListener('toggle',event=>{
  const panel=event.target;if(!panel.hasAttribute('data-meal-panel')||!panel.isConnected)return;
  const type=Number(panel.dataset.mealPanel);if(!Number.isInteger(type)||type<0||type>3)return;
  if(panel.open){if(type!==foodDraft.type)selectFoodPanel(type);else foodPanelOpen=type}
  else if(foodPanelOpen===type)foodPanelOpen=null;
 },true);
 document.addEventListener('change',event=>{
  const input=event.target;if(!input.hasAttribute('data-food-check'))return;
  const type=Number(input.dataset.meal);if(input.disabled||closedDay(selectedDate)||!validLocalDay(selectedDate)||!Number.isInteger(type)||type<0||type>3){render();return}
  const previousMeals=S.meals,previousTasks=S.tasks;stageMealMark(selectedDate,type,input.checked);
  try{save()}catch{S.meals=previousMeals;S.tasks=previousTasks;input.checked=!!dayMealChecks(selectedDate)[type];const error=document.querySelector('#mealTrackingError');if(error){error.hidden=false;error.textContent='No se pudo guardar la marca. Tus comidas anteriores siguen intactas.'}return}
  foodNotice=null;render();document.querySelector('[data-food-check][data-meal="'+type+'"]')?.focus({preventScroll:true});
 });
 document.addEventListener('input',event=>{if(event.target.id==='foodDescription'){foodDraft.text=event.target.value;rememberFoodDraft();foodNotice=null;document.querySelector('.food-save-confirmation')?.remove()}});
 document.addEventListener('click',event=>{
  const record=event.target.closest('[data-food-record-type],[data-food-type],[data-food-form-type]');if(record&&!record.disabled){selectFoodPanel(Number(record.dataset.foodRecordType??record.dataset.foodType??record.dataset.foodFormType),{focus:true});return}
  const options=event.target.closest('[data-meal-show-options]');if(options&&!options.disabled){mealExplorer.expanded=!mealExplorer.expanded;render();document.querySelector('[data-meal-show-options]')?.focus({preventScroll:true});return}
  if(event.target.closest('[data-food-cancel]')){foodDraft={text:'',type:foodDraft.type};rememberFoodDraft();mealExplorer.referenceId='';render();focusMealDescription();return}
  const detail=event.target.closest('[data-food-detail]');if(detail&&!detail.disabled&&!closedDay(selectedDate)){const entry=S.foodLog?.find(item=>item.id===detail.dataset.foodDetail&&item.date===selectedDate);if(entry){selectFoodPanel(+entry.type,{draw:false});foodDraft={text:entry.text+'\n',type:+entry.type,editId:entry.id,editDate:entry.date};rememberFoodDraft();render();focusMealDescription()}}
 });
 document.addEventListener('submit',event=>{
  if(event.target.id!=='foodForm')return;event.preventDefault();const error=document.querySelector('#foodError');
  if(closedDay(selectedDate)||foodDraft.editDate&&closedDay(foodDraft.editDate)){error.hidden=false;error.textContent='Este día está cerrado. Reábrelo para editar su comida.';return}
  const text=foodDraft.text.trim().slice(0,1500);
  if(!text){error.hidden=false;error.textContent='Cuéntame los ingredientes de tu comida para poder orientarte.';return}
  if(!Number.isInteger(foodDraft.type)||foodDraft.type<0||foodDraft.type>3||!validLocalDay(selectedDate)){error.hidden=false;error.textContent='Elige una comida y una fecha válidas para guardar.';return}
  const previousLog=S.foodLog,previousMeals=S.meals,previousTasks=S.tasks,log=Array.isArray(previousLog)?previousLog:[];
  if(foodDraft.editId&&!log.some(entry=>entry.id===foodDraft.editId&&entry.date===foodDraft.editDate)){error.hidden=false;error.textContent='El registro que estabas editando ya no está disponible. Cancela la edición para continuar.';return}
  const entry={id:foodDraft.editId||crypto.randomUUID(),date:foodDraft.editDate||selectedDate,type:foodDraft.type,text,time:new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(new Date())};
  S.foodLog=foodDraft.editId?log.map(item=>item.id===foodDraft.editId?entry:item):[...log,entry];
  if(!foodDraft.editId)stageMealMark(entry.date,entry.type,true);
  try{save()}catch{S.foodLog=previousLog;S.meals=previousMeals;S.tasks=previousTasks;error.hidden=false;error.textContent='No se pudo guardar. Tus registros anteriores siguen intactos; exporta un respaldo antes de liberar espacio.';return}
  foodNotice={date:entry.date,type:entry.type,text:foodDraft.editId?'Cambios guardados. Tus marcas se conservan.':'Comida guardada y marcada. Aquí tienes tus recomendaciones.'};
  selectedDate=entry.date;foodDraftDate=entry.date;foodPanelOpen=entry.type;foodDraft={text:'',type:entry.type};rememberFoodDraft();mealExplorer.referenceId='';render();const article=document.getElementById('foodLog-'+entry.id);article?.focus({preventScroll:true});article?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 });
}
