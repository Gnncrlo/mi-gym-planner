const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../meal-advice.js'),'utf8'),context);
const analyze=text=>JSON.parse(JSON.stringify(context.analyzeMealIngredients(text)));
const review=(text,type)=>JSON.parse(JSON.stringify(context.reviewMeal(text,type)));
const groups=text=>analyze(text).found.map(group=>group.id).sort();
const advice=(text,type)=>review(text,type).suggestions.join('\n');

for(const food of ['pallares','habas','tarwi','lentejas','frejoles','garbanzos','menestras'])assert.deepEqual(groups(food),['energy','protein'],food);
for(const food of ['pota','anchoveta','bonito','cuy','quesillo','sangrecita','jurel','trucha','huevo','yogur'])assert.deepEqual(groups(food),['protein'],food);
for(const food of ['arroz integral','choclo','causa','olluco','kiwicha','tallarines','quinua','yuca','camote','tortilla de trigo','tortillas de trigo','cancha serrana'])assert.deepEqual(groups(food),['energy'],food);
for(const food of ['papaya','aguaymanto','granadilla','lúcuma','chirimoya','maracuyá','betarraga','vainitas','zapallo','palta'])assert.deepEqual(groups(food),['plants'],food);
assert.deepEqual(groups('Maní, nueces y mantequilla de maní'),['protein']);assert.deepEqual(groups('Aceite y palta'),['plants']);
assert.deepEqual(groups('Leche de avena con café'),['energy']);assert.deepEqual(groups('Leche de almendras con café'),[]);assert.deepEqual(groups('Leche de soya'),['protein']);assert.deepEqual(groups('Leche sin lactosa con avena'),['energy','protein']);

for(const phrase of ['Arroz sin pollo','Arroz, no comí pollo','Arroz, no incluí pollo','Arroz, no tengo pollo','Arroz, no me gusta el pollo','Arroz; no puedo comer pollo'])assert.deepEqual(groups(phrase),['energy'],phrase);
for(const phrase of ['Avena sin huevo ni leche','Avena sin huevo y sin leche','Avena, no incluí huevo ni leche','Avena sin huevo, leche ni yogur'])assert.deepEqual(groups(phrase),['energy'],phrase);
assert.deepEqual(groups('Sin arroz con pollo'),[]);assert.deepEqual(groups('No comí arroz con pollo'),[]);assert.deepEqual(groups('Quisiera arroz con pollo'),[]);
assert.deepEqual(groups('Avena sin leche ni yogur, con papaya'),['energy','plants']);assert.deepEqual(groups('Avena sin leche ni yogur y con papaya'),['energy','plants']);
assert.deepEqual(groups('No comí pollo, pero comí arroz con tomate'),['energy','plants']);assert.deepEqual(groups('No comí pollo. Después comí huevo con pan'),['energy','protein']);
assert.deepEqual(groups('Arroz y pollo no lo comí'),['energy']);assert.deepEqual(groups('Arroz con pollo, ensalada no.'),['energy','protein']);
assert.deepEqual(groups('Sin huevo; después comí huevo'),['protein']);assert.deepEqual(groups('No solo pollo, también arroz y ensalada'),['energy','plants','protein']);
assert.deepEqual(groups('Arroz chaufa'),['energy']);assert.deepEqual(groups('Lomo saltado'),['protein']);assert.deepEqual(groups('Ceviche'),[]);
const causa=analyze('Causa con pota');assert.deepEqual(causa.mentionedIngredients,['causa','pota']);assert.equal(causa.mentionedIngredients.includes('papa'),false);
assert.deepEqual(groups('Ensalada con pollo'),['plants','protein']);assert.deepEqual(groups('Panadería, papayo, arrocito, empanada'),[]);
assert.deepEqual(groups('Un plato muy bonito'),[]);assert.deepEqual(groups('Llegué tarde por causa del trabajo'),[]);assert.deepEqual(groups('Te cuento que estuvo rico'),[]);

assert.equal(analyze('Arroz. Me quedé con hambre').hungry,true);assert.equal(analyze('Arroz. Sigo teniendo hambre').hungry,true);
assert.equal(analyze('Arroz. No tengo hambre').hungry,false);assert.equal(analyze('Arroz. No me quedé con hambre').hungry,false);
assert.equal(analyze('Arroz. Quedé satisfecho').satisfied,true);assert.equal(analyze('Arroz. No quedé satisfecho').satisfied,false);
assert.equal(analyze('Tenía hambre. Comí arroz y quedé satisfecho').hungry,false);assert.equal(analyze('Tenía hambre. Comí arroz y quedé satisfecho').satisfied,true);
assert.equal(analyze('Quedé satisfecho, pero ahora tengo hambre').hungry,true);assert.equal(analyze('Quedé satisfecho, pero ahora tengo hambre').satisfied,false);
assert.equal(analyze('Quedé satisfecho y no tengo hambre').satisfied,true);assert.equal(analyze('Quedé satisfecho, pero sigo con hambre').hungry,true);
assert.equal(analyze('Plato lleno de arroz').satisfied,false);

const breakfast=advice('Pan con café',0);assert.match(breakfast,/huevo/);assert.match(breakfast,/yogur/);assert.match(breakfast,/papaya|plátano/);
const coffee=advice('Sólo café',0);assert.match(coffee,/bebida/);assert.match(coffee,/hambre/);
const coffeeSatisfied=advice('Solo café, no tolero huevo ni yogur y quedé satisfecho',0);assert.doesNotMatch(coffeeSatisfied,/huevo|yogur/);assert.match(coffeeSatisfied,/quesillo|hummus|tofu/);
assert.match(advice('Sólo café',2),/tu cena/);assert.doesNotMatch(advice('Sólo café',2),/tu desayuno/);
const lunch=advice('Arroz con pollo',1);assert.match(lunch,/No mencionaste fruta/);assert.match(lunch,/tomate/);assert.match(lunch,/pepino/);assert.match(lunch,/brócoli/);
const snack=advice('Papaya',3);assert.match(snack,/yogur/);assert.match(snack,/maní/);assert.match(snack,/hummus/);assert.match(snack,/opcional/);assert.doesNotMatch(snack,/No mencionaste una fuente de proteína|fuente de energía|necesitas.*tres/);
const dinner=advice('Arroz con tomate',2);assert.match(dinner,/pescado/);assert.match(dinner,/menestras/);assert.match(dinner,/tofu/);assert.doesNotMatch(dinner,/prohib|evita.*arroz|sin carbohidratos/);
const satisfied=advice('Pan con café. Quedé satisfecho',0);assert.match(satisfied,/quedaste satisfecho/);assert.match(satisfied,/otra comida|próxima comida/);assert.doesNotMatch(satisfied,/puedes comer más|añadir.*ahora|debes/);
assert.match(advice('Papaya. Quedé satisfecho',3),/Para otro snack/);
assert.match(advice('Arroz con pollo, sin ensalada. Me quedé con hambre.',1),/todavía tienes hambre/);assert.match(advice('Arroz con pollo, ensalada y tomate. Quedé satisfecho.',1),/combinación variada/);
assert.match(review('Comí algo rico',1).title,/más/);assert.match(review('Ceviche',1).question,/ingredientes/);assert.equal(review(null,1).found.length,0);
assert.doesNotMatch(advice('Pan sin huevo ni leche',0),/puedes elegir huevo/);assert.deepEqual(analyze('Pan sin huevo ni leche').negatedIngredients,['huevo','leche']);
for(const input of ['pan','arroz con pollo','fruta','comí algo rico','aceite','palta','sin leche','pallares con arroz y ensalada'])for(const type of [0,1,2,3]){
 const result=review(input,type);assert.ok(Array.isArray(result.found));assert.ok(Array.isArray(result.suggestions));assert.ok(result.suggestions.length>0);assert.equal(typeof result.title,'string');assert.equal(typeof result.question,'string');assert.ok(result.found.every(group=>['protein','plants','energy'].includes(group.id)));
 assert.doesNotMatch(result.suggestions.join(' '),/\b\d+\s*(?:kcal|calorias|gramos|g\b)|diagnost|diabet|anemia/i);
}
console.log('PASS: ingredientes peruanos, grupos sin ingredientes inventados, negaciones y listas, bebidas vegetales, hambre/saciedad, sugerencias concretas por comida y snack opcional, API compatible sin cantidades ni calorías inferidas.');
