// Recommendations use the written description, without inventing quantities or ingredients.
const mealNames=['Desayuno','Almuerzo','Cena','Snack'];
const foodExamples={
 0:[['Avena con yogur natural y fruta','Avena, yogur natural y una fruta que te guste.'],['Pan con huevo y tomate','Pan, huevo y tomate; acompáñalo con tu bebida habitual.'],['Tostadas con hummus y fruta','Pan, hummus y una fruta de temporada.']],
 1:[['Arroz con pollo y ensalada','Pollo, arroz y una ensalada de tomate, zanahoria o verduras disponibles.'],['Lentejas con arroz y verduras','Lentejas, arroz y verduras. Una opción sencilla para variar la proteína.'],['Pescado con papa y ensalada','Pescado, papa y una ensalada o verduras cocidas.']],
 2:[['Tortilla con verduras y pan','Huevo, verduras y pan; ajusta la cantidad a tu hambre.'],['Garbanzos con verduras y arroz','Garbanzos, verduras salteadas y arroz.'],['Pollo con camote y verduras','Pollo, camote y verduras; también puedes usar tofu.']],
 3:[['Yogur con fruta','Yogur natural y fruta de temporada.'],['Fruta con frutos secos','Una fruta y frutos secos que toleres.'],['Pan con hummus','Pan con hummus para una opción práctica.']]
};
function reviewMeal(description, type) {
 const text=String(description).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const groups={protein:{label:'Una fuente de proteína',terms:['pollo','pavo','pescado','atun','huevo','huevos','carne','res','cerdo','tofu','yogur','yogurt','queso','leche','lentejas','lenteja','garbanzos','garbanzo','frejoles','frejol','frijoles','frijol','menestra','tempeh']},plants:{label:'Fruta o verduras',terms:['ensalada','verdura','verduras','vegetales','tomate','tomates','zanahoria','zanahorias','brocoli','espinaca','lechuga','pepino','fruta','frutas','manzana','platano','banana','papaya','naranja','mandarina','fresa','fresas','mango','pera','palta','aguacate']},energy:{label:'Una fuente de energía',terms:['arroz','papa','papas','patata','camote','pan','avena','quinua','quinoa','pasta','fideos','tortilla de maiz','choclo','maiz','yuca','cereal','lentejas','garbanzos','frejoles','frijoles']}};
 function mentioned(term){
  const regex=new RegExp('(^|[^a-z])('+term+')(?=$|[^a-z])','g');let match;
  while((match=regex.exec(text))!==null){
   const prefix=text.slice(Math.max(0,match.index-32),match.index+match[1].length);
   if(!/(?:\bsin|\bno(?:\s+comi|\s+inclui|\s+hay|\s+tiene)?|\bnada\s+de)\s+(?:\w+\s+){0,2}$/.test(prefix))return true;
  }return false;
 }
 const found=Object.entries(groups).filter(([,g])=>g.terms.some(mentioned)).map(([id,g])=>({id,label:g.label}));
 const ids=new Set(found.map(g=>g.id));const suggestions=[];const hungry=/\b(?:sigo|quede|estoy|tengo)(?:\s+con)?\s+hambre\b/.test(text),satisfied=/\b(?:satisfech[oa]|lleno|llena)\b/.test(text);
 if(!found.length)return {found,title:'Cuéntame un poco más de tu plato',suggestions:['Añade los ingredientes principales y cómo lo preparaste; por ejemplo: arroz, pollo a la plancha y ensalada.','Si fue un plato con varios ingredientes, descríbelos para que la sugerencia sea más útil.'],question:'¿Qué ingredientes tenía y aproximadamente cuánto comiste?'};
 if(!ids.has('protein'))suggestions.push('No mencionaste una fuente de proteína. Si no la incluiste, puedes acompañar con huevo, yogur, pescado, tofu o menestras, según la comida y tus preferencias.');
 if(!ids.has('plants'))suggestions.push('No mencionaste fruta ni verduras. Si faltaron, podrías añadir una fruta, una ensalada o verduras cocidas que te gusten.');
 if(!ids.has('energy')&&+type!==3)suggestions.push('Si necesitas más energía o sigues con hambre, puedes complementar con papa, arroz, avena, pan o quinua, según el plato.');
 if(ids.size===3)suggestions.push('En tu descripción aparecen proteína, fruta o verduras y una fuente de energía. Es una combinación variada; ajusta las porciones a tu hambre y a cómo te sientes.');
 if(+type===3&&ids.has('plants')&&!ids.has('protein'))suggestions.push('Para un snack más saciante, la fruta puede acompañarse con yogur o una opción de proteína que toleres.');
 if(!suggestions.length)suggestions.push('Puedes variar los ingredientes de tu próxima comida y comer con calma, prestando atención a tu hambre.');
 if(hungry)suggestions.push('Si todavía tienes hambre, puedes comer más o añadir un acompañamiento que te resulte saciante; las porciones dependen también de tu actividad y de cómo te sientes.');else if(satisfied)suggestions.push('Mencionas que quedaste satisfecho. Puedes tomarlo como referencia para tus próximas comidas, sin forzarte a comer más ni restringir después.');
 suggestions.push('No necesitas saltarte la siguiente comida ni hacer ejercicio extra para compensar lo que comiste.');
 return {found,title:'Una idea para complementar tu comida',suggestions,question:hungry||satisfied?'¿Qué te gustaría cambiar o variar en tu próxima comida? Puedes añadir más detalles.':'¿Te quedaste con hambre o satisfecho? Puedes añadir ese detalle a tu descripción.'};
}
function renderFoods(){
 const checks=S.meals[selectedDate]||{},logs=(Array.isArray(S.foodLog)?S.foodLog:[]).filter(e=>e.date===selectedDate);
 const ordinal=Math.floor(Date.parse(selectedDate+'T12:00:00Z')/86400000)||0;
 const type=Number.isInteger(foodDraft.type)?foodDraft.type:1,ideas=foodExamples[type],idea=ideas[((ordinal%ideas.length)+ideas.length)%ideas.length];
 return `<h2>Comidas</h2><p class="section-subtitle">Ideas para comer y un espacio para contarme tu plato.</p>
 <div class="card food-date"><label class="label" for="foodDate">Fecha de tus comidas</label><input id="foodDate" class="field" type="date" data-field="date" value="${esc(selectedDate)}"></div>
 <div class="card food-suggestion"><div class="food-kicker">${uiIcon('food')} UNA IDEA PARA TU ${mealNames[type].toUpperCase()}</div><h3>${esc(idea[0])}</h3><p>${esc(idea[1])}</p><p class="hint">Puedes cambiar ingredientes según tus gustos y lo que tengas disponible.</p><div class="meal-types" role="group" aria-label="Tipo de comida">${mealNames.map((n,i)=>`<button data-food-type="${i}" aria-pressed="${i===type}">${n}</button>`).join('')}</div></div>
 <form id="foodForm" class="card food-form"><h3>${foodDraft.editId?'Añade un detalle a tu comida':'¿Qué estás comiendo, '+esc(S.profileName||'Giancarlo')+'?'}</h3><label class="label" for="foodDescription">Cuéntame qué hay en tu plato</label><textarea id="foodDescription" class="field" rows="4" maxlength="1500" required placeholder="Ej. Arroz con pollo a la plancha y una ensalada. Comí un plato y quedé satisfecho.">${esc(foodDraft.text)}</textarea><p class="hint">Incluye ingredientes, preparación y cómo te sentiste. Las sugerencias se basan en lo que describes.</p><p id="foodError" class="food-error" role="alert" hidden></p><button class="btn food-submit" type="submit">${foodDraft.editId?'Actualizar y recibir sugerencias':'Guardar y recibir sugerencias'} ${uiIcon('arrow')}</button>${foodDraft.editId?'<button class="text-link" type="button" data-food-cancel>Cancelar edición</button>':''}</form>
 <div class="section-heading"><h2>Lo que me cuentas</h2><span class="subtle-tag">${logs.length} ${logs.length===1?'REGISTRO':'REGISTROS'}</span></div>
 ${logs.length?logs.slice().reverse().map(e=>{const advice=reviewMeal(e.text,e.type);return `<article class="card food-log"><div class="food-log-meta"><span class="pill">${esc(mealNames[e.type]||'Comida')}</span><time>${esc(e.time||'')}</time></div><p class="food-description">${esc(e.text)}</p><div class="food-feedback"><div class="food-kicker">${uiIcon('food')} SUGERENCIA PARA TI</div><h3>${esc(advice.title)}</h3>${advice.found.length?'<p class="food-detected">Lo que mencionaste: '+advice.found.map(g=>esc(g.label)).join(' · ')+'</p>':''}<ul>${advice.suggestions.map(t=>'<li>'+esc(t)+'</li>').join('')}</ul><p class="hint">${esc(advice.question)}</p><button class="text-link" data-food-detail="${esc(e.id)}">Añadir un detalle ${uiIcon('arrow')}</button></div></article>`}).join(''):'<div class="food-empty">'+uiIcon('food')+'<h3>Tu primera comida empieza aquí</h3><p>Cuéntame qué comiste y aquí verás el registro y una sugerencia para acompañarte.</p></div>'}
 <div class="card"><h3>Tus comidas del día</h3><p class="hint">Conservamos las marcas que ya tenías guardadas. Puedes registrar varias comidas sin necesidad de marcar todas.</p>${mealNames.map((m,i)=>'<div class="item"><label><input type="checkbox" data-meal="'+i+'" '+(checks[i]?'checked':'')+'>'+m+'</label></div>').join('')}</div>`;
}
let foodDraft={text:'',type:1};
function attachFoodInteractions(){
 document.addEventListener('input',e=>{if(e.target.id==='foodDescription')foodDraft.text=e.target.value});
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-food-cancel]')){foodDraft={text:'',type:foodDraft.type};render()}
  const type=e.target.closest('[data-food-type]');if(type){foodDraft.type=+type.dataset.foodType;render()}
  const detail=e.target.closest('[data-food-detail]');if(detail){const entry=S.foodLog?.find(e=>e.id===detail.dataset.foodDetail);if(entry){foodDraft={text:entry.text+'\n',type:+entry.type,editId:entry.id,editDate:entry.date};render();const input=document.querySelector('#foodDescription');input.focus();input.setSelectionRange(input.value.length,input.value.length)}}
 });
 document.addEventListener('submit',e=>{
  if(e.target.id!=='foodForm')return;e.preventDefault();const text=foodDraft.text.trim().slice(0,1500);const error=document.querySelector('#foodError');
  if(!text){error.hidden=false;error.textContent='Cuéntame los ingredientes de tu comida para poder orientarte.';return}
  const previousLog=S.foodLog;const log=Array.isArray(previousLog)?previousLog:[];const now=new Date();
  const entry={id:foodDraft.editId||crypto.randomUUID(),date:foodDraft.editDate||selectedDate,type:foodDraft.type,text,time:new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(now)};
  S.foodLog=foodDraft.editId?log.map(e=>e.id===foodDraft.editId?entry:e):[...log,entry];
  try{save()}catch{S.foodLog=previousLog;error.hidden=false;error.textContent='No se pudo guardar. Tus registros anteriores siguen intactos; exporta un respaldo antes de liberar espacio.';return}
  selectedDate=entry.date;foodDraft={text:'',type:entry.type};render();document.querySelector('.food-log')?.scrollIntoView({block:'start',behavior:'smooth'});
 });
}
