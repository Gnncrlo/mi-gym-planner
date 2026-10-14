const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../meal-ideas.js'),'utf8'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
const select=(type,options)=>plain(context.selectMealIdeas(type,options));
const catalog=()=>plain(vm.runInContext('mealIdeas',context));
const ids=ideas=>ideas.map(idea=>idea.id);
const normalize=value=>context.normalizeMealIngredient(value);
const all=catalog(),snapshot=JSON.stringify(all);
const filters=['all','quick','budget','vegetarian','no-cook','portable'];
assert.equal(all.length,40,'Hay cuarenta ideas completas');
assert.equal(new Set(ids(all)).size,40,'Cada idea tiene un identificador único');
assert.equal(new Set(all.map(idea=>idea.name)).size,40,'Las opciones no repiten el mismo plato');

for(const idea of all){
 assert.match(idea.id,/^[a-z0-9]+(?:-[a-z0-9]+)+$/);
 assert.ok(Number.isInteger(idea.type)&&idea.type>=0&&idea.type<=3,idea.id);
 assert.ok(typeof idea.name==='string'&&idea.name.trim().length>8,idea.id);
 assert.ok(Array.isArray(idea.ingredients)&&idea.ingredients.length>=2,`${idea.id}: ingredientes disponibles`);
 assert.equal(new Set(idea.ingredients.map(normalize)).size,idea.ingredients.length,`${idea.id}: ingredientes sin duplicados`);
 assert.ok(idea.ingredients.every(ingredient=>typeof ingredient==='string'&&ingredient.trim()),idea.id);
 assert.ok(idea.steps.length>=2&&idea.steps.every(step=>typeof step==='string'&&step.trim().length>=10),`${idea.id}: instrucciones utilizables`);
 assert.ok(Number.isInteger(idea.minutes)&&idea.minutes>0&&idea.minutes<=60,`${idea.id}: tiempo aproximado útil`);
 assert.equal(new Set(idea.tags).size,idea.tags.length,`${idea.id}: filtros sin duplicados`);
 assert.ok(idea.tags.every(tag=>filters.includes(tag)&&tag!=='all'),idea.id);
 if(idea.tags.includes('quick'))assert.ok(idea.minutes<=15,`${idea.id}: rápida significa quince minutos o menos`);
 if(idea.tags.includes('vegetarian')){
  assert.doesNotMatch(idea.ingredients.map(normalize).join(' '),/\b(pollo|pescado|atun|carne|res|cerdo|pavo|anchoveta|bonito|jurel|trucha|cuy|pota|mariscos|jamon)\b/,`${idea.id}: vegetariana sin carne ni pescado`);
 }
 if(idea.tags.includes('no-cook')){
  assert.doesNotMatch(normalize(idea.steps.join(' ')),/\b(cocina|hierve|saltea|dora|calienta|hornea|frie|tuesta)\b/,`${idea.id}: los pasos no requieren cocinar`);
  for(const ingredient of idea.ingredients.map(normalize)){
   if(/\b(huevo|huevos|pollo|pechuga|pescado|atun|arroz|quinua|garbanzos|frejoles|lentejas|camote|papa|choclo|avena|cancha)\b/.test(ingredient)){
    assert.match(ingredient,/\b(cocido|cocida|cocidos|cocidas|precocida|preparado|preparada|tostado|tostada|conserva)\b/,`${idea.id}: ${ingredient} debe estar listo para comer`);
   }
  }
  if(idea.tags.includes('portable')&&idea.ingredients.some(ingredient=>/\b(pollo|atun|huevo|queso|yogur|leche)\b/.test(normalize(ingredient)))){
   assert.match(normalize(idea.steps.join(' ')),/\b(frio|fria|refrigerado|refrigerada)\b/,`${idea.id}: al llevar comida perecedera se conserva fría`);
  }
 }
}

for(const type of [0,1,2,3]){
 const options=select(type,{date:'2026-10-14'});
 assert.equal(options.length,10,`Diez opciones para el tipo ${type}`);
 assert.ok(options.every(idea=>idea.type===type));
 for(const filter of filters){
  const filtered=select(type,{filter,date:'2026-10-14'});
  assert.ok(filtered.length>0,`${type}/${filter}: el filtro ofrece al menos una opción`);
  assert.ok(filtered.every(idea=>idea.type===type&&(filter==='all'||idea.tags.includes(filter))),`${type}/${filter}`);
  assert.ok(filtered.every(idea=>options.some(option=>option.id===idea.id)),`${type}/${filter}: sin platos inventados`);
 }
 assert.deepEqual(ids(select(type,{date:'2026-10-14'})),ids(options),'La fecha da recomendaciones estables');
 assert.deepEqual(ids(select(type,{date:'2026-10-15'})),ids([...options.slice(1),options[0]]),'El siguiente día ofrece otro inicio sin perder opciones');
 assert.deepEqual(ids(select(type,{date:'2026-10-14',offset:3})),ids([...options.slice(3),...options.slice(0,3)]),'Ver otras ideas avanza tres platos');
 assert.deepEqual(ids(select(type,{date:'2026-10-14',offset:10})),ids(options),'Tras diez opciones se vuelve al principio');
 assert.deepEqual(ids(select(type,{date:'2026-10-14',offset:-1})),ids([options.at(-1),...options.slice(0,-1)]),'Los desplazamientos negativos siguen siendo válidos');
 assert.deepEqual(ids(select(String(type),{date:'2026-10-14'})),ids(options),'Los tipos de los botones admiten valores de texto');
 const current=select(type,{filter:'quick',date:'2026-10-14'});
 assert.deepEqual(ids(select(type,{filter:'quick',date:'2026-10-14',offset:current.length})),ids(current),'El ciclo usa la cantidad de resultados filtrados');
}

const noBread=select(1,{excludeIngredients:['PAN']});
assert.ok(noBread.some(idea=>idea.id==='lunch-egg-vegetable-rice'),'Excluir pan no excluye espinaca');
assert.equal(noBread.length,10,'Ningún almuerzo contiene pan como ingrediente');
assert.ok(select(0,{excludeIngredients:'pan'}).every(idea=>!idea.ingredients.some(ingredient=>/^pan(?: |$)/.test(normalize(ingredient)))),'La exclusión también admite un texto simple');
const noFish=select(0,{excludeIngredients:['Atún']});
assert.ok(!noFish.some(idea=>idea.id==='breakfast-tuna-bread'),'Los acentos no impiden excluir un ingrediente');
assert.equal(noFish.length,9);
const noEgg=select(0,{excludeIngredients:['huevo']});
assert.ok(!noEgg.some(idea=>/egg|omelet/.test(idea.id)),'La exclusión singular incluye huevos en plural');
assert.deepEqual(ids(select(2,{excludeIngredients:['pollo','queso fresco']})).sort(),all.filter(idea=>idea.type===2&&!idea.ingredients.some(ingredient=>/\bpollo\b|queso fresco/.test(normalize(ingredient)))).map(idea=>idea.id).sort(),'Se respetan varias exclusiones y frases');
assert.deepEqual(ids(select(1,{excludeIngredients:['','','   ',null]})),ids(select(1)),'Las exclusiones vacías no eliminan platos');
assert.deepEqual(select(3,{excludeIngredients:['yogur','mandarina','pan','huevo','hummus','garbanzos','papaya','manzana','choclo','cancha']}),[],'Excluir todos los ingredientes relevantes devuelve una lista vacía');

for(const type of [null,undefined,'', '   ',-1,4,1.5,'foo',NaN,Infinity])assert.deepEqual(select(type),[],`Tipo inválido ${String(type)}`);
assert.deepEqual(select(0,{filter:'unknown'}),[]);
assert.deepEqual(select(0,{filter:null}),[]);
for(const date of ['2026-02-30','2025-02-29','2026-13-01','2026-10-00','14/10/2026','2026-1-1','no-date',null]){
 assert.equal(context.mealIdeaDateIndex(date),0,`Fecha inválida ${date}`);
 assert.deepEqual(ids(select(0,{date})),ids(select(0)),'Las fechas inválidas tienen un inicio estable');
}
assert.equal(context.mealIdeaDateIndex('2024-03-01')-context.mealIdeaDateIndex('2024-02-28'),2,'El calendario respeta años bisiestos');
assert.equal(vm.runInContext("mealIdeaDateIndex(new Date(2026,9,14))",context),context.mealIdeaDateIndex('2026-10-14'),'Las fechas locales y sus claves coinciden');
for(const offset of [NaN,Infinity,'unknown'])assert.deepEqual(ids(select(0,{offset})),ids(select(0)),'Un desplazamiento inválido mantiene opciones utilizables');
assert.deepEqual(ids(select(0,{offset:3.9})),ids(select(0,{offset:3})),'El desplazamiento fraccionario usa un número entero de ideas');

const edited=select(0,{date:'2026-10-14'}),original=JSON.stringify(select(0,{date:'2026-10-14'}));
edited[0].name='modificado';edited[0].ingredients.push('ingrediente añadido');edited[0].steps[0]='paso modificado';edited[0].tags.length=0;edited.pop();
assert.equal(JSON.stringify(select(0,{date:'2026-10-14'})),original,'Editar resultados no altera futuras recomendaciones ni sus arrays internos');
assert.equal(JSON.stringify(catalog()),snapshot,'Navegar, filtrar, excluir y editar resultados nunca modifica el catálogo');
console.log('PASS: cuarenta ideas únicas, diez por comida, recetas completas, filtros útiles, restricciones vegetarianas y sin cocción, rotación diaria, exclusiones con límites de palabra, fechas y tipos inválidos, copias independientes.');
