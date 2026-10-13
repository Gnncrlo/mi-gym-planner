// Presentation metadata only: slot indices and stored workout keys never change.
const muscleSectors={
 chest:{name:'Pecho',location:'Parte anterior del tórax',description:'Pectoral mayor; el ángulo del movimiento puede cambiar el énfasis.'},
 back:{name:'Espalda',location:'Dorsales y parte media de la espalda',description:'Movimientos de tracción vertical y horizontal.'},
 shoulders:{name:'Hombros',location:'Parte anterior, lateral y posterior del hombro',description:'Deltoides y músculos que estabilizan la escápula.'},
 triceps:{name:'Tríceps',location:'Parte posterior del brazo',description:'Extensión del codo; las tres cabezas colaboran.'},
 biceps:{name:'Bíceps y brazos',location:'Parte anterior del brazo y antebrazo',description:'Flexión del codo con distintos agarres.'},
 quads:{name:'Cuádriceps',location:'Parte anterior del muslo',description:'Extensión de rodilla; en movimientos compuestos también participan glúteos.'},
 hamstrings:{name:'Femorales',location:'Parte posterior del muslo',description:'Isquiotibiales: flexión de rodilla y extensión de cadera.'},
 glutes:{name:'Glúteos',location:'Parte posterior de la cadera',description:'Extensión y estabilización de la cadera.'},
 calves:{name:'Pantorrillas',location:'Parte posterior de la pierna',description:'Gastrocnemio y sóleo: elevación del talón.'},
 core:{name:'Abdomen y core',location:'Zona central del tronco',description:'Estabilidad del tronco y control del movimiento.'}
};
const exerciseTargets={};
function setTargets(names,sector,zone,secondary,detail){
 for(const name of names)exerciseTargets[name]={sector,zone,secondary,detail:detail||'Es la zona de énfasis; otros músculos también participan.'};
}
setTargets(['Press de banca','Press con mancuernas','Press de pecho en máquina'],'chest','Pectoral mayor · porción esternocostal','Tríceps y deltoides anterior','El press horizontal trabaja el pecho en conjunto, con énfasis en la región esternocostal.');
setTargets(['Press inclinado mancuernas','Press inclinado','Press inclinado con barra','Press inclinado en máquina'],'chest','Pecho superior · porción clavicular','Tríceps y deltoides anterior','La inclinación cambia el énfasis hacia la región clavicular, sin aislarla del resto del pecho.');
setTargets(['Flexiones inclinadas'],'chest','Pectoral mayor · pecho en conjunto','Tríceps, deltoides anterior y core','La altura del apoyo modifica la dificultad. Acercar las manos puede aumentar la participación del tríceps.');
setTargets(['Aperturas','Aperturas en polea','Aperturas en máquina','Aperturas con banda'],'chest','Pectoral mayor · aproximación de los brazos','Deltoides anterior','El movimiento de abrazo trabaja el pectoral mayor; no existe una separación que permita aislar un «pecho interno».');
setTargets(['Press militar','Press hombros mancuernas','Press hombros en máquina','Press con banda'],'shoulders','Deltoides anterior y medio','Tríceps y estabilizadores del tronco');
setTargets(['Elevaciones laterales','Elevación lateral','Elevación lateral en polea','Elevación lateral con banda','Elevación lateral en máquina'],'shoulders','Deltoides medio · lateral del hombro','Supraespinoso y trapecio','Elevar el brazo al lado enfatiza el deltoides medio; controla el movimiento sin encoger los hombros.');
setTargets(['Face pull','Face pull con banda'],'shoulders','Deltoides posterior · parte trasera del hombro','Trapecio medio, romboides y rotadores externos','El gesto combina tracción y rotación externa, por lo que también trabaja la espalda superior.');
setTargets(['Pájaros posteriores','Aperturas inversas en máquina','Aperturas inversas con banda'],'shoulders','Deltoides posterior · parte trasera del hombro','Romboides y trapecio medio');
setTargets(['Tríceps en polea','Extensión tríceps con banda'],'triceps','Tríceps braquial · parte posterior del brazo','Estabilizadores del hombro','Al extender el codo trabajan las tres cabezas del tríceps; mantén los brazos superiores estables.');
setTargets(['Extensión tríceps','Extensión tríceps sobre cabeza'],'triceps','Tríceps · énfasis en la cabeza larga','Las otras cabezas del tríceps y estabilizadores del hombro','La posición del brazo sobre la cabeza alarga la cabeza larga y cambia su estímulo, sin aislarla por completo.');
setTargets(['Flexiones con manos juntas'],'triceps','Tríceps · extensión del codo con manos cercanas','Pectoral mayor, deltoides anterior y core','El agarre más cerrado cambia el énfasis hacia el tríceps; el pecho sigue participando.');
setTargets(['Jalón al pecho','Jalón agarre neutro','Jalón con banda','Dominadas asistidas','Dominadas asistidas con agarre neutro','Jalón unilateral en polea'],'back','Dorsal ancho · laterales de la espalda','Redondo mayor, bíceps y músculos de la escápula');
setTargets(['Remo sentado','Remo con mancuerna','Remo con banda','Remo con pecho apoyado'],'back','Dorsales y zona media · romboides y trapecio medio','Bíceps y deltoides posterior','El remo trabaja dorsales y músculos que acercan las escápulas; el recorrido del codo modifica el énfasis.');
setTargets(['Curl bíceps','Curl barra','Curl concentrado','Curl en polea','Curl con banda','Curl bíceps sentado','Curl predicador','Curl unilateral en polea'],'biceps','Bíceps braquial · parte anterior del brazo','Braquial y braquiorradial','Ambas cabezas del bíceps participan; controlar el codo y evitar impulso importa más que buscar una zona aislada.');
setTargets(['Curl martillo','Curl martillo con cuerda','Curl martillo con banda','Curl martillo sentado'],'biceps','Braquial y braquiorradial · brazo y antebrazo','Bíceps braquial','El agarre neutro aumenta la participación del braquial y del braquiorradial, además del bíceps.');
setTargets(['Sentadilla goblet','Prensa de piernas','Sentadilla a un banco','Sentadilla sin peso','Zancadas','Sentadilla dividida con apoyo','Subida a un escalón bajo'],'quads','Cuádriceps · parte anterior del muslo','Glúteo mayor, aductores y core','Rodilla y cadera trabajan juntas. La profundidad, el paso y la postura pueden cambiar el énfasis entre muslo y glúteos.');
setTargets(['Extensión cuádriceps'],'quads','Cuádriceps · extensión de rodilla','Estabilizadores de la cadera','La máquina dirige el esfuerzo a los cuatro componentes del cuádriceps; alinea el eje con la rodilla.');
setTargets(['Peso muerto rumano','Peso muerto rumano con mancuernas','Bisagra de cadera con banda'],'hamstrings','Isquiotibiales · parte posterior del muslo','Glúteo mayor y erectores espinales','La bisagra de cadera carga isquiotibiales y glúteos; la espalda sostiene la postura, no debe impulsar el movimiento.');
setTargets(['Curl femoral','Curl femoral con banda','Curl femoral con toalla deslizante','Curl femoral con pelota'],'hamstrings','Isquiotibiales · flexión de rodilla','Gastrocnemio; glúteos y core en variantes con cadera elevada');
setTargets(['Puente de glúteos'],'glutes','Glúteo mayor · extensión de cadera','Isquiotibiales y core','Esta sustitución cambia el énfasis hacia el glúteo respecto al peso muerto rumano.');
setTargets(['Elevación talones','Elevación talones a una pierna con apoyo','Elevación talones en prensa'],'calves','Gastrocnemio y sóleo · pantorrilla','Estabilizadores del pie y tobillo','Con rodilla casi extendida participa más el gastrocnemio; el sóleo también trabaja.');
setTargets(['Elevación talones sentado'],'calves','Sóleo · músculo profundo de la pantorrilla','Gastrocnemio y estabilizadores del tobillo','La rodilla flexionada reduce la contribución del gastrocnemio y desplaza el énfasis al sóleo.');
setTargets(['Plancha','Plancha con rodillas apoyadas','Plancha inclinada en banco'],'core','Core · estabilidad abdominal y del tronco','Oblicuos, glúteos y estabilizadores del hombro','La tarea principal es resistir el movimiento y mantener el tronco estable, no flexionarlo.');
setTargets(['Dead bug'],'core','Core · control abdominal y estabilidad lumbar','Oblicuos y flexores de cadera','Al alternar brazo y pierna, el abdomen resiste la extensión lumbar y mantiene el tronco estable.');
setTargets(['Crunch','Crunch en polea'],'core','Recto abdominal · parte anterior del abdomen','Oblicuos','Acercar costillas y pelvis flexiona el tronco. No aísla una zona superior o inferior del abdomen.');
function workoutSectors(day,state=S){
 const groups=new Map();
 plan[day].ex.forEach(([original,sets],index)=>{
  const selected=state.substitutions?.[state.week+'-'+day+'-'+index];
  const name=exerciseGuide[original].variants.includes(selected)?selected:original;
  const target=exerciseTargets[name],key=target.sector;
  if(!groups.has(key))groups.set(key,{key,...muscleSectors[key],exercises:[]});
  groups.get(key).exercises.push({original,name,sets,index,target});
 });
 return [...groups.values()];
}
function renderSectorExercise({original,name,sets,index:i,target}){
 return `<div class="item sector-exercise"><div class="row"><input class="exercise-check" aria-label="Completar ${esc(name)}" type="checkbox" data-ex="${i}" ${S.done[wk(i)]?'checked':''}><button class="exercise-open" data-guide="${i}" aria-haspopup="dialog"><img class="exercise-thumb" loading="lazy" src="${esc((exercisePhotos[name]||exercisePhotos[original]).images[0])}" alt=""><span class="exercise-label"><b>${esc(name)}</b><span class="small muted">${esc(sets)} · Técnica y variantes →</span></span></button></div><p class="exercise-zone"><span>Zona de énfasis</span>${esc(target.zone)}</p><div class="row exercise-records"><label for="load-${i}">Peso (kg)</label><input id="load-${i}" class="field" type="number" min="0" step="0.5" data-load="${i}" aria-label="Peso en kg de ${esc(name)}" placeholder="0" value="${esc(S.loads[wk(i)]||'')}"><label for="reps-${i}">Reps</label><input id="reps-${i}" class="field" type="number" min="0" data-reps="${i}" aria-label="Repeticiones de ${esc(name)}" placeholder="10" value="${esc(S.reps[wk(i)]||'')}"></div></div>`;
}
function renderWorkoutSectors(){
 const groups=workoutSectors(S.day);
 if(!groups.length)return '<div class="card routine-rest"><span class="daily-icon">'+uiIcon('moon')+'</span><h3>Recuperación y descanso</h3><p class="hint">Hoy no tienes ejercicios programados. Puedes hacer movilidad suave si te apetece.</p></div>';
 return '<div class="muscle-overview"><p class="eyebrow">ÁREAS DE ESTE DÍA</p><div class="muscle-links">'+groups.map(g=>'<a href="#sector-'+g.key+'">'+esc(g.name)+' <span>'+g.exercises.length+'</span></a>').join('')+'</div><p class="hint">Cada ejercicio aparece una vez, por su énfasis principal. La ficha muestra también los músculos que colaboran.</p></div>'+groups.map(g=>{
  const done=g.exercises.filter(e=>S.done[wk(e.index)]).length;
  return '<section class="card muscle-sector" id="sector-'+g.key+'" data-sector="'+g.key+'" aria-labelledby="sector-title-'+g.key+'"><header class="muscle-sector-head"><span class="muscle-sector-icon">'+uiIcon('dumbbell')+'</span><div><h3 id="sector-title-'+g.key+'">'+esc(g.name)+'</h3><p>'+esc(g.location)+'</p></div><span class="sector-count">'+done+'/'+g.exercises.length+'</span></header><p class="sector-description">'+esc(g.description)+'</p>'+g.exercises.map(renderSectorExercise).join('')+'</section>';
 }).join('');
}
