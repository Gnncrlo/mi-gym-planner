// Suggested combinations remain within each existing slot's supported alternatives.
const workoutCombinations=[
 {names:['Press de banca','Press inclinado mancuernas','Press hombros mancuernas','Elevaciones laterales','Tríceps en polea'],reason:'Press horizontal e inclinado para pecho, un press para hombros, elevación lateral y una extensión de tríceps.'},
 {names:['Jalón al pecho','Remo con pecho apoyado','Face pull','Curl bíceps','Curl martillo'],reason:'Tracción vertical y horizontal para espalda, deltoides posterior y dos agarres de flexión de codo.'},
 {names:['Sentadilla goblet','Prensa de piernas','Peso muerto rumano','Curl femoral','Plancha'],reason:'Dos movimientos dominantes de rodilla, una bisagra de cadera, flexión de rodilla y estabilidad del core.'},
 {names:['Press inclinado mancuernas','Aperturas en polea','Press hombros en máquina','Elevación lateral en polea','Extensión tríceps'],reason:'Pecho B: press inclinado para la región clavicular y aperturas de polea alta hacia abajo para variar el ángulo esternocostal. Hombros con apoyo, trabajo lateral y tríceps sobre la cabeza.'},
 {names:['Remo con mancuerna','Jalón agarre neutro','Aperturas inversas en máquina','Curl barra','Curl predicador'],reason:'Espalda B: remo unilateral y jalón neutro, más hombro posterior. Bíceps B: curl con barra y predicador con el brazo adelantado; complementan el curl de pie y el martillo del día A.'},
 {names:['Peso muerto rumano','Sentadilla dividida con apoyo','Extensión cuádriceps','Elevación talones','Crunch'],reason:'Bisagra de cadera, trabajo de pierna por lado, cuádriceps, pantorrillas y flexión del tronco.'}
];
function renderWorkoutCombination(){
 const combo=workoutCombinations[S.day];if(!combo)return '';
 const active=combo.names.every((n,i)=>chosenExercise(i)===n);
 return `<details class="combination-panel"><summary><span>${uiIcon('dumbbell')}<b>Combinación sugerida</b></span><span class="combination-status">${active?'Ya seleccionada':'Ver propuesta'} ›</span></summary><div class="combination-body"><p>${esc(combo.reason)}</p><ol>${combo.names.map(n=>'<li>'+esc(n)+'</li>').join('')}</ol><p class="hint">Los días A y B varían ángulos y agarres. Mantén una selección estable varias semanas para comparar tu progreso; no necesitas cambiar todo cada día. Los ejercicios compuestos trabajan varios músculos.</p><p class="hint">Mantiene las series de tu plan. Las variantes cambian los movimientos de esas posiciones: tus marcas y cargas anteriores se conservan como referencia; revisa y ajusta la carga antes de entrenar.</p><button class="btn" data-action="applyCombination" ${active?'disabled':''}>${active?'Esta combinación está en tu rutina':'Usar esta combinación'}</button></div></details>`;
}
function applyWorkoutCombination(day){if(workoutClosure(S.week,day))return;
 const combo=workoutCombinations[day];if(!combo)return;
 S.substitutions??={};
 combo.names.forEach((name,i)=>{const original=plan[day].ex[i][0],key=S.week+'-'+day+'-'+i;if(name===original)delete S.substitutions[key];else if(exerciseGuide[original].variants.includes(name))S.substitutions[key]=name});
}
const cardioOptions={walk:{name:'Caminar',icon:'walk',description:'Camina a un ritmo cómodo. Empieza despacio y termina con unos minutos suaves.'},run:{name:'Correr',icon:'run',description:'Si estás empezando, alterna caminar y trotar. Mantén un ritmo al que todavía puedas hablar.'},bike:{name:'Bicicleta',icon:'bike',description:'Usa poca resistencia al principio y ajusta el asiento. Pedalea con control, sin buscar agotarte.'}};
function cardioKey(day=S.day){return S.week+'-'+day}
function renderCardioFinish(){
 const key=cardioKey(),dayRecord=S.cardio?.[key]||{},kind=cardioOptions[dayRecord.kind]?dayRecord.kind:'walk',record=(workoutClosure()?.cardio||dayRecord.activities)?.[kind]||{},option=cardioOptions[kind],legs=S.day===2||S.day===5,rest=S.day===6;
 return `<section class="card cardio-finish" aria-labelledby="cardio-title"><div class="cardio-heading"><div><p class="eyebrow">${rest?'RECUPERACIÓN OPCIONAL':'PARA TERMINAR'}</p><h3 id="cardio-title">${rest?'Muévete suave, si te apetece':'Un poco de cardio'}</h3></div><span class="cardio-optional">OPCIONAL</span></div><p class="cardio-intro">${legs?'Después de piernas, prioriza recuperarte: empieza con 5–10 minutos suaves caminando o en bicicleta.':rest?'Tu día de descanso sigue siendo descanso. Puedes pasear un poco o dejarlo para otro día.':'Si te sientes bien al terminar, puedes empezar con 10–15 minutos a un ritmo cómodo.'}</p><div class="cardio-options" role="group" aria-label="Actividad de cardio">${Object.entries(cardioOptions).map(([id,v])=>`<button data-action="chooseCardio" data-cardio-kind="${id}" aria-pressed="${kind===id}">${uiIcon(v.icon)}<span>${v.name}</span></button>`).join('')}</div><p class="cardio-guidance">${esc(option.description)}${legs&&kind==='run'?' Si notas las piernas fatigadas, elige caminar o bicicleta suave, o descansa.':''}</p><div class="cardio-controls"><label for="cardioMinutes">Minutos <input id="cardioMinutes" class="field" type="number" min="1" max="180" step="1" data-cardio-minutes value="${esc(record.minutes|| (legs||rest?10:15))}"></label><label class="cardio-completed"><input type="checkbox" data-cardio-done ${record.done?'checked':''}><span>Completado</span></label></div><p class="hint">La intensidad depende de cómo te sientas. Cada actividad se guarda por separado y no cambia tus ejercicios de fuerza.</p></section>`;
}

function chooseCardio(kind){if(!cardioOptions[kind])return;S.cardio??={};const key=cardioKey();S.cardio[key]={...(S.cardio[key]||{}),kind}}
function updateCardioField(input){if(workoutClosure())return false;
 const key=cardioKey(),old=S.cardio?.[key]||{},kind=cardioOptions[old.kind]?old.kind:'walk',record=old.activities?.[kind]||{};
 const updated={minutes:S.day===2||S.day===5||S.day===6?10:15,...record};
 if(input.hasAttribute('data-cardio-minutes')){const minutes=Number(input.value);if(!Number.isInteger(minutes)||minutes<1||minutes>180){input.setCustomValidity('Escribe entre 1 y 180 minutos.');input.reportValidity();return false}input.setCustomValidity('');updated.minutes=minutes}else updated.done=input.checked;
 S.cardio??={};S.cardio[key]={...old,kind,activities:{...(old.activities||{}),[kind]:updated}};return true;
}
