// Local suggestions describe ingredient groups, never portions, calories or a diagnosis.
const mealGroupLabels={protein:'Una fuente de proteína',plants:'Fruta o verduras',energy:'Una fuente de energía'};
const mealIngredientCatalog=[
 {id:'pollo',terms:['pollo','gallina'],groups:['protein']},
 {id:'pavo',terms:['pavo'],groups:['protein']},
 {id:'pescado',terms:['pescado','pescados','atun','atunes','bonito','anchoveta','anchovetas','jurel','caballa','trucha','merluza','sardina','sardinas','pejerrey'],groups:['protein']},
 {id:'pota',terms:['pota','calamar','calamares','pulpo','langostino','langostinos','mariscos'],groups:['protein']},
 {id:'huevo',terms:['huevo','huevos'],groups:['protein']},
 {id:'carne',terms:['carne','res','lomo','bistec','cerdo','chancho','charqui'],groups:['protein']},
 {id:'cuy',terms:['cuy'],groups:['protein']},
 {id:'sangrecita',terms:['sangrecita','higado'],groups:['protein']},
 {id:'tofu',terms:['tofu','tempeh'],groups:['protein']},
 {id:'yogur',terms:['yogur','yogurt','yoghurt'],groups:['protein']},
 {id:'queso',terms:['queso','quesillo','requeson'],groups:['protein']},
 {id:'leche',terms:['leche'],groups:['protein']},
 // The longer beverage names take precedence over "leche" and over whole nuts.
 {id:'bebida-avena',terms:['leche de avena','bebida de avena'],groups:['energy']},
 {id:'bebida-almendra',terms:['leche de almendra','leche de almendras','bebida de almendras','leche de coco','bebida de coco'],groups:[]},
 {id:'bebida-soya',terms:['leche de soya','leche de soja','bebida de soya','bebida de soja'],groups:['protein']},
 {id:'lentejas',terms:['lenteja','lentejas'],groups:['protein','energy']},
 {id:'frejoles',terms:['frejol','frejoles','frijol','frijoles','frejoles negros','frijoles negros'],groups:['protein','energy']},
 {id:'garbanzos',terms:['garbanzo','garbanzos'],groups:['protein','energy']},
 {id:'pallares',terms:['pallar','pallares'],groups:['protein','energy']},
 {id:'habas',terms:['haba','habas'],groups:['protein','energy']},
 {id:'tarwi',terms:['tarwi','chocho','chochos'],groups:['protein','energy']},
 {id:'menestras',terms:['menestra','menestras'],groups:['protein','energy']},
 {id:'hummus',terms:['hummus','humus'],groups:['protein','energy']},
 {id:'mani',terms:['mani','mantequilla de mani','crema de mani','mantequilla de cacahuate','cacahuate','cacahuetes'],groups:['protein']},
 {id:'nueces',terms:['nuez','nueces','almendra','almendras','pecana','pecanas','frutos secos'],groups:['protein']},
 {id:'arroz',terms:['arroz integral','arroz'],groups:['energy']},
 {id:'papa',terms:['papa','papas','patata','patatas'],groups:['energy']},
 {id:'camote',terms:['camote','camotes'],groups:['energy']},
 {id:'pan',terms:['pan integral','pan','tostada','tostadas'],groups:['energy']},
 {id:'avena',terms:['avena'],groups:['energy']},
 {id:'quinua',terms:['quinua','quinoa'],groups:['energy']},
 {id:'kiwicha',terms:['kiwicha','canihua','kaniwa'],groups:['energy']},
 {id:'pasta',terms:['pasta','pastas','fideo','fideos','tallarin','tallarines'],groups:['energy']},
 {id:'choclo',terms:['choclo','maiz','tortilla de maiz','cancha','cancha serrana'],groups:['energy']},
 {id:'tortilla-trigo',terms:['tortilla de trigo','tortillas de trigo'],groups:['energy']},
 {id:'yuca',terms:['yuca'],groups:['energy']},
 {id:'olluco',terms:['olluco','ollucos','oca','ocas'],groups:['energy']},
 {id:'causa',terms:['causa'],groups:['energy']},
 {id:'cereal',terms:['cereal','cereales'],groups:['energy']},
 {id:'verduras',terms:['ensalada','ensaladas','verdura','verduras','vegetal','vegetales'],groups:['plants']},
 {id:'tomate',terms:['tomate','tomates'],groups:['plants']},
 {id:'pepino',terms:['pepino','pepinos'],groups:['plants']},
 {id:'brocoli',terms:['brocoli'],groups:['plants']},
 {id:'zanahoria',terms:['zanahoria','zanahorias'],groups:['plants']},
 {id:'hojas',terms:['espinaca','espinacas','lechuga','acelga','acelgas','col','repollo'],groups:['plants']},
 {id:'otras-verduras',terms:['zapallo','zapallito','betarraga','beterraga','remolacha','vainita','vainitas','coliflor','berenjena','pimiento','pimientos','cebolla','cebollas','rabanito','rabanitos','esparrago','esparragos'],groups:['plants']},
 {id:'fruta',terms:['fruta','frutas'],groups:['plants']},
 {id:'platano',terms:['platano','platanos','banana','bananas'],groups:['plants']},
 {id:'papaya',terms:['papaya'],groups:['plants']},
 {id:'manzana',terms:['manzana','manzanas','pera','peras'],groups:['plants']},
 {id:'naranja',terms:['naranja','naranjas','mandarina','mandarinas','limon','limones'],groups:['plants']},
 {id:'frutos-rojos',terms:['fresa','fresas','arandano','arandanos','mora','moras'],groups:['plants']},
 {id:'frutas-locales',terms:['mango','mangos','maracuya','lucuma','aguaymanto','aguaymantos','granadilla','granadillas','chirimoya','guanabana','pitahaya','tumbo','sandia','melon','uva','uvas','durazno','duraznos','melocoton','ciruela','ciruelas','pina'],groups:['plants']},
 {id:'palta',terms:['palta','paltas','aguacate'],groups:['plants']},
 {id:'aceite',terms:['aceite','aceite de oliva'],groups:[]},
 {id:'cafe',terms:['cafe'],groups:[]},
 {id:'te',terms:['te verde','te negro','te de hierbas','infusion','mate'],groups:[]},
 {id:'agua',terms:['agua'],groups:[]}
];
function normalizeMealText(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function mealWordStates(text){
 const tokens=[...text.matchAll(/[a-z]+|[,.;!?\n]/g)].map(m=>({word:m[0],start:m.index,end:m.index+m[0].length}));
 let negative=false,hypothetical=false,cueEnd=-1;
 const positive=new Set(['comi','como','comiendo','desayune','desayuno','almorce','almuerzo','cene','ceno','tome','bebi','inclui','agregue','anadi','lleva','tiene']);
 for(let i=0;i<tokens.length;i++){
  const word=tokens[i].word,next=tokens.slice(i+1,i+5).map(t=>t.word);
  if(/[.;!?\n]/.test(word)||['pero','aunque','ademas','luego','despues'].includes(word)){negative=false;hypothetical=false;cueEnd=-1}
  if(word==='sin'||word==='ni'||['ningun','ninguna','ninguno'].includes(word)||(word==='nada'&&next[0]==='de')){negative=true;cueEnd=i}
  if(word==='no'&&!['solo','solamente'].includes(next[0])){
   negative=true;cueEnd=i;
   // A verb within the negative phrase must not reset its own negation.
   for(let j=i+1;j<Math.min(tokens.length,i+5);j++){
    if(positive.has(tokens[j].word)||['tengo','gusta','gustan','gusto','quiero','tolero','puedo','comer','hay'].includes(tokens[j].word))cueEnd=j;
    else if(!['me','lo','la','los','las','puedo','suelo'].includes(tokens[j].word))break;
   }
  }
  if(['falto','falta','faltaria','alergico','alergica'].includes(word)){negative=true;cueEnd=i}
  if(['quiero','quisiera','podria','deberia','gustaria','planeo','pensaba'].includes(word)&&i>cueEnd){hypothetical=true}
  const positiveAccompaniment=word==='con'&&[',','y','lactosa','gluten','azucar','sal','aceite'].includes(tokens[i-1]?.word)&&!hypothetical;
  if((positive.has(word)||positiveAccompaniment)&&i>cueEnd){negative=false;hypothetical=false}
  tokens[i].negative=negative;tokens[i].hypothetical=hypothetical;
 }
 return tokens;
}
function mealFeeling(text){
 const mentions=[];
 const patterns={hungry:/\b(?:(?:sigo|quede|estoy|tengo|tenia)(?:\s+(?:todavia|aun))?(?:\s+con)?\s+hambre|sigo\s+teniendo\s+hambre|me\s+dio\s+hambre|con\s+hambre|hambrient[oa])\b/g,satisfied:/\b(?:(?:quede|estoy|siento|sali)\s+(?:muy\s+)?(?:satisfech[oa]|llen[oa])|satisfech[oa])\b/g};
 for(const [feeling,regex]of Object.entries(patterns))for(const match of text.matchAll(regex)){
  const prefix=text.slice(Math.max(0,match.index-40),match.index).split(/[.,;!?\n]/).at(-1);
  const denied=/\b(?:no|sin|nunca)\s+(?:me\s+|he\s+|haber\s+|haberme\s+)?$/.test(prefix);
  mentions.push({feeling,active:!denied,position:match.index});
 }
 mentions.sort((a,b)=>a.position-b.position);
 // Hunger before eating is not hunger afterward; "no tengo hambre" does not undo satiety.
 let hungry=false,satisfied=false;
 for(const mention of mentions){
  if(mention.feeling==='hungry'){hungry=mention.active;if(mention.active)satisfied=false}
  else{satisfied=mention.active;if(mention.active)hungry=false}
 }
 return {hungry,satisfied};
}
function analyzeMealIngredients(description){
 const text=normalizeMealText(description),tokens=mealWordStates(text),matches=[];
 for(const ingredient of mealIngredientCatalog)for(const term of ingredient.terms){
  const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+');
  const regex=new RegExp('(^|[^a-z])('+escaped+')(?=$|[^a-z])','g');
  for(const match of text.matchAll(regex))matches.push({ingredient,start:match.index+match[1].length,end:match.index+match[0].length});
 }
 // Recognize "leche de almendras" as a beverage, not as milk plus whole nuts.
 matches.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start);
 const selected=[];
 for(const match of matches)if(!selected.some(other=>match.start<other.end&&match.end>other.start))selected.push(match);
 selected.sort((a,b)=>a.start-b.start);
 const mentioned=new Set(),negated=new Set(),groups=new Set();
 for(const {ingredient,start,end}of selected){
  if(ingredient.id==='causa'&&/\bpor\s+$/.test(text.slice(0,start)))continue;
  if(ingredient.id==='pescado'&&text.slice(start,end)==='bonito'&&(/\b(?:muy|mas|que|plato|quedo|esta|era)\s+$/.test(text.slice(0,start))||/^\s+(?:plato|dia)\b/.test(text.slice(end))))continue;
  const words=tokens.filter(token=>token.start>=start&&token.end<=end);
  const explicitlyDeniedAfter=/^\s+no(?:\s+(?:lo|la|los|las))?\s+(?:comi|inclui|tome|bebi)\b|^\s+no\s*(?:$|[.,;!?])/.test(text.slice(end));
  if(explicitlyDeniedAfter||words.some(token=>token.negative||token.hypothetical)){negated.add(ingredient.id);continue}
  mentioned.add(ingredient.id);ingredient.groups.forEach(group=>groups.add(group));
 }
 for(const id of mentioned)negated.delete(id);
 const found=Object.keys(mealGroupLabels).filter(id=>groups.has(id)).map(id=>({id,label:mealGroupLabels[id]}));
 return {found,mentionedIngredients:[...mentioned],negatedIngredients:[...negated],...mealFeeling(text)};
}
function mealAdviceExamples(candidates,negated){return candidates.filter(([id])=>!negated.has(id)).slice(0,3).map(([,label])=>label).join(', ')}
function reviewMeal(description,type){
 const analysis=analyzeMealIngredients(description),{found,hungry,satisfied}=analysis,ids=new Set(found.map(group=>group.id)),ingredients=new Set(analysis.mentionedIngredients),excluded=new Set(analysis.negatedIngredients);
 const meal=[0,1,2,3].includes(+type)?+type:1,suggestions=[];
 const proteins=[
  [['huevo','huevo'],['yogur','yogur'],['queso','quesillo'],['hummus','hummus'],['tofu','tofu']],
  [['menestras','menestras'],['pescado','pescado'],['pollo','pollo'],['tofu','tofu']],
  [['pescado','pescado'],['menestras','menestras'],['tofu','tofu'],['huevo','huevo']],
  [['yogur','yogur'],['mani','maní'],['hummus','hummus'],['queso','quesillo']]
 ];
 const protein=mealAdviceExamples(proteins[meal],excluded)||'una opción de proteína que te guste y toleres';
 const fruit=mealAdviceExamples([['papaya','papaya'],['platano','plátano'],['naranja','naranja'],['manzana','manzana']],excluded)||'una fruta que te guste';
 const vegetables=mealAdviceExamples([['tomate','tomate'],['pepino','pepino'],['brocoli','brócoli cocido'],['zanahoria','zanahoria']],excluded)||'verduras que te gusten';
 const energy=mealAdviceExamples(meal===0?[['avena','avena'],['pan','pan'],['quinua','quinua']]:[['papa','papa'],['arroz','arroz'],['camote','camote'],['pan','pan']],excluded)||'un acompañamiento que te guste';
 const when=satisfied?'En otra comida, si te apetece':'Si no lo incluiste y te apetece';
 const knownDrink=[...ingredients].some(id=>['cafe','te','agua','bebida-almendra'].includes(id));
 if(!found.length&&!knownDrink)return {found,title:'Cuéntame un poco más de tu plato',suggestions:['Describe los ingredientes principales y cómo lo preparaste. El nombre de un plato, por sí solo, no permite conocer todo lo que llevaba.','Por ejemplo: arroz, pollo a la plancha y ensalada. Si sólo escribiste una bebida o un acompañamiento, cuéntame qué más comiste.'],question:'¿Qué ingredientes tenía y cómo te sentiste después de comer?'};
 if(!found.length&&knownDrink){
  suggestions.push(satisfied?'Mencionaste una bebida y que quedaste satisfecho. Si comiste algo más, puedes añadirlo al registro. Para otra comida, puedes combinar '+energy+' con '+protein+', según tus preferencias.':'Sólo mencionaste una bebida. Si tienes hambre y no comiste otra cosa, puedes acompañarla con '+(meal===3?fruit:energy)+' y '+protein+', o contarme qué más comiste en tu '+['desayuno','almuerzo','cena','snack'][meal]+'.');
 }else{
  if(!ids.has('protein')){
   if(meal===3)suggestions.push((satisfied?'Para otro snack, si deseas una opción más saciante':'Si deseas un snack más saciante')+', '+(ids.has('plants')?'la fruta':'lo que comiste')+' puede acompañarse con '+protein+', si te gusta y lo toleras. Es opcional; un snack no necesita reunir los tres grupos.');
   else suggestions.push('No mencionaste una fuente de proteína. '+when+', puedes elegir '+protein+' para '+(satisfied?'tu próxima comida':['acompañar tu desayuno','acompañar tu almuerzo','acompañar tu cena'][meal])+'.');
  }
  if(!ids.has('plants')){
   if(meal===3)suggestions.push((satisfied?'Para otro snack':'Si te apetece variar')+', puedes elegir una fruta como '+fruit+'. No hace falta añadir algo más si quedaste satisfecho.');
   else if(ingredients.has('arroz')&&ingredients.has('pollo'))suggestions.push('No mencionaste fruta ni verduras. '+(satisfied?'En otra comida':'Si faltaron en tu plato')+', el arroz y el pollo pueden acompañarse con '+vegetables+'.');
   else suggestions.push('No mencionaste fruta ni verduras. '+when+', podrías elegir '+(meal===0?fruit:vegetables)+' '+(satisfied?'en tu siguiente comida':'como acompañamiento')+'.');
  }
  if(!ids.has('energy')&&meal!==3)suggestions.push(satisfied?'Para otra comida, puedes variar los acompañamientos con '+energy+', según tu hambre. No hace falta comer más ahora.':'Si necesitas un acompañamiento y sigues con hambre, puedes elegir '+energy+' para '+['tu desayuno','tu almuerzo','tu cena'][meal]+'.');
  if(ids.size===3)suggestions.push('En tu descripción aparecen proteína, fruta o verduras y una fuente de energía. Es una combinación variada; '+(satisfied?'puedes tomar como referencia cómo te sentiste, sin añadir más comida.':'las cantidades dependen de tu hambre y tus preferencias, y no se pueden valorar sólo con el nombre de los ingredientes.'));
 }
 if(hungry)suggestions.push('Si todavía tienes hambre, puedes comer más de tu comida o añadir un acompañamiento que te resulte saciante. No sabemos las cantidades que comiste; elige según tu hambre y cómo te sientes.');
 else if(satisfied)suggestions.push('Mencionas que quedaste satisfecho. Puedes tomarlo como referencia, sin forzarte a comer más; las ideas anteriores sirven para variar otra comida.');
 if(!suggestions.length)suggestions.push('Puedes variar los ingredientes de tu próxima comida y comer con calma, prestando atención a tu hambre.');
 return {found,title:satisfied?'Una idea para tu próxima comida':meal===3?'Una idea para tu snack':'Una idea para complementar tu comida',suggestions,question:hungry||satisfied?'¿Qué te gustaría variar en tu próxima comida? Puedes añadir más detalles.':'¿Te quedaste con hambre o satisfecho? Puedes añadir ese detalle a tu descripción.'};
}
