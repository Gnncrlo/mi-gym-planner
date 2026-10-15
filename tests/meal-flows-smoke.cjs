// Unit-level event and persistence checks; these do not replace browser/layout tests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');

const handlers=new Map(),nodes=new Map();
let activeDialog=null,html='',writes=0,stored='',failSave=false;
const node=(extra={})=>({disabled:false,isConnected:true,value:'',hidden:true,textContent:'',focus(){this.focused=true},scrollIntoView(){},setSelectionRange(){},closest(selector){return selector==='#foodForm'?nodes.get('#foodForm'):null},...extra});
for(const id of ['#foodForm','#foodDescription','#foodError','#mealTrackingError','#mealAdjustmentError','.food-log','.meal-idea-list','[data-meal-more]'])nodes.set(id,node());
const document={
 getElementById(id){return nodes.get('#'+id)||null},
 body:{style:{overflow:''},append(dialog){activeDialog=dialog}},
 addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn)},
 querySelector(selector){
  if(selector==='.meal-recipe-dialog[open]')return activeDialog?.open?activeDialog:null;
  if(selector.startsWith('[data-meal-filter=')||selector.startsWith('[data-food-type='))return node();
  return nodes.get(selector)||null;
 },
 createElement(tag){
  assert.equal(tag,'dialog');const events=new Map();
  return node({innerHTML:'',open:false,setAttribute(){},showModal(){this.open=true},addEventListener(type,fn){events.set(type,fn)},close(){this.open=false;events.get('close')?.()},remove(){if(activeDialog===this)activeDialog=null},events});
 }
};
const fixture={tab:'comidas',profileName:'Giancarlo',done:{'2-1-0':true},loads:{'2-1-0':'45'},reps:{'2-1-0':'12'},body:[{date:'2026-10-01',kg:90}],water:{'2026-10-01':1000},sleep:{'2026-10-01':7},meals:{'2026-10-01':{0:true}},substitutions:{'2-1-0':'Press con mancuernas'},tasks:{'2026-10-01-gym':true},custom:[['task','Pendiente','', '2026-10-01']],cardio:{'2-1':{activities:{walk:{minutes:15,done:true}}}},gymVisits:{'2026-10-01':{period:'night'}},mealAdjustments:{'2026-10-01':{breakfast:'late'}},foodLog:[{id:'old-food',date:'2026-10-01',type:0,text:'Pan con huevo',time:'08:00'}],closedDays:{},dayHistory:[]};
const context=vm.createContext({document,crypto:{randomUUID},matchMedia:()=>({matches:true}),localDateKey:()=> '2026-10-04',S:structuredClone(fixture),selectedDate:'2026-10-01',uiIcon:()=>'<svg></svg>',esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
const run=code=>vm.runInContext(code,context);
context.save=()=>{if(failSave)throw Error('QuotaExceeded');stored=JSON.stringify(context.S);writes++};
context.render=()=>{html=context.renderFoods();nodes.get('#foodDescription').value=run('foodDraft.text')};
for(const file of ['meal-advice.js','meal-ideas.js','meal-explorer.js','nutrition.js','day-journal.js','daily-planner.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
// Include the real general change listener to detect duplicate saves and Mi Día regressions.
const generalChange=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/document\.addEventListener\('change',async e=>\{[\s\S]*?\}\);(?=document\.addEventListener\('input')/);
assert.ok(generalChange,'Se encontró el manejador general de cambios');vm.runInContext(generalChange[0],context);
context.dkey=type=>context.selectedDate+'-'+type;
context.attachFoodInteractions();context.attachMealExplorer();context.render();
const state=()=>JSON.stringify(context.S);
const initial=state();stored=initial;
function target(dataset={},extra={}){return node({dataset,hasAttribute(attribute){return Object.hasOwn(dataset,attribute.replace(/^data-/, '').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))},matches(selector){return selector.split(',').some(part=>part.startsWith('[')&&this.hasAttribute(part.slice(1,-1)))},closest(selector){return this.matches(selector)?this:null},...extra})}
function dispatch(type,event){for(const fn of handlers.get(type)||[])fn(event)}
const click=(dataset,extra)=>dispatch('click',{target:target(dataset,extra)});
function input(text){const element=nodes.get('#foodDescription');element.id='foodDescription';element.value=text;dispatch('input',{target:element})}
function submit(){dispatch('submit',{target:{id:'foodForm'},preventDefault(){}})}
function recipeClick(dataset){activeDialog.events.get('click')({target:target(dataset)})}

// Browsing every category/filter and opening recipes is read-only, including drafts.
input('Mi plato pendiente: arroz con pollo');
for(let type=0;type<4;type++){
 click({foodType:String(type)});
 for(const filter of ['all','quick','budget','vegetarian','no-cook','portable']){
  click({mealFilter:filter});assert.match(html,/¿Qué te apetece comer\?/);
  const beforeIds=[...html.matchAll(/data-meal-recipe="([^"]+)"/g)].map(m=>m[1]);assert.ok(beforeIds.length);
  click({mealMore:''});
  const ideaId=[...html.matchAll(/data-meal-recipe="([^"]+)"/g)][0][1];
  const opener=target({mealRecipe:ideaId});dispatch('click',{target:opener});
  assert.ok(activeDialog.open);assert.match(activeDialog.innerHTML,/Ingredientes/);assert.match(activeDialog.innerHTML,/Cómo prepararlo/);
  assert.equal(document.body.style.overflow,'hidden');recipeClick({mealRecipeClose:''});
  assert.equal(activeDialog,null);assert.equal(opener.focused,true);assert.equal(document.body.style.overflow,'');
 }
}
assert.equal(state(),initial);assert.equal(stored,initial);assert.equal(writes,0);
assert.equal(run('foodDraft.text'),'Mi plato pendiente: arroz con pollo');

// Choosing a recipe is only a reference; the user's actual description is retained.
click({foodType:'3'});click({mealFilter:'all'});
const recipeId=[...html.matchAll(/data-meal-recipe="([^"]+)"/g)][0][1];
click({mealRecipe:recipeId});recipeClick({mealDescribe:''});
assert.equal(run('mealExplorer.referenceId'),recipeId);assert.equal(run('foodDraft.type'),3);
assert.equal(run('foodDraft.text'),'Mi plato pendiente: arroz con pollo');
assert.match(html,/elegir una idea no registra una comida/);assert.equal(state(),initial);assert.equal(writes,0);
input('Yogur con papaya. Quedé satisfecho.');submit();
assert.equal(writes,1);assert.equal(context.S.foodLog.length,2);assert.equal(context.S.foodLog[1].type,3);assert.match(context.S.foodLog[1].text,/Yogur/);
assert.equal(run('mealExplorer.referenceId'),'');
const expectedAfterSnack=structuredClone(fixture);expectedAfterSnack.meals['2026-10-01'][3]=true;
for(const key of Object.keys(fixture).filter(key=>key!=='foodLog'))assert.deepEqual(JSON.parse(JSON.stringify(context.S[key])),expectedAfterSnack[key],key);

// Quota failures roll back the new record and keep its draft for another attempt.
const beforeFailure=state(),storedBeforeFailure=stored;
input('Papa y pescado');failSave=true;submit();failSave=false;
assert.equal(state(),beforeFailure);assert.equal(stored,storedBeforeFailure);assert.equal(run('foodDraft.text'),'Papa y pescado');assert.match(nodes.get('#foodError').textContent,/No se pudo guardar/);

// An existing record can be edited without dropping unrelated records or data.
click({foodDetail:'old-food'});click({foodType:'3'});
assert.equal(run('mealExplorer.type'),3,'Se pueden consultar snacks durante la edición');
assert.equal(run('foodDraft.type'),0,'Consultar snacks no reclasifica un desayuno existente');
click({foodPlanType:'2'});assert.equal(run('foodDraft.type'),0,'El enlace a próxima comida no reclasifica una edición en curso');
assert.match(html,/Editando: Desayuno/);
click({mealRecipe:recipeId});assert.doesNotMatch(activeDialog.innerHTML,/data-meal-describe/);recipeClick({mealRecipeClose:''});
input('Pan con huevo y tomate');submit();
assert.equal(context.S.foodLog.length,2);assert.equal(context.S.foodLog[0].id,'old-food');assert.equal(context.S.foodLog[0].text,'Pan con huevo y tomate');
assert.equal(context.S.foodLog[0].type,0);
for(const key of Object.keys(fixture).filter(key=>key!=='foodLog'))assert.deepEqual(JSON.parse(JSON.stringify(context.S[key])),expectedAfterSnack[key],key);

// A close that happens during editing locks the SOURCE date, even on another date.
click({foodDetail:'old-food'});input('No debe sustituir el cierre');
context.S.dayHistory=[{id:'closed-1',date:'2026-10-01',foods:structuredClone(context.S.foodLog),meals:{0:true},mealAdjustment:{breakfast:'late'}}];
context.S.closedDays={'2026-10-01':'closed-1'};
context.selectedDate='2026-10-02';context.render();const beforeClosed=state(),writesBeforeClosed=writes;submit();
assert.equal(state(),beforeClosed);assert.equal(writes,writesBeforeClosed);assert.match(nodes.get('#foodError').textContent,/cerrado/);
click({foodCancel:''});context.selectedDate='2026-10-01';context.render();
assert.match(html,/Pan con huevo y tomate/);
click({mealRecipe:recipeId});assert.doesNotMatch(activeDialog.innerHTML,/data-meal-describe/);assert.match(activeDialog.innerHTML,/Reabre este día/);
recipeClick({mealDescribe:''});assert.ok(activeDialog.open);recipeClick({mealRecipeClose:''});
input('Intento sintético');submit();click({breakfastStatus:'skipped-work'});
assert.equal(state(),beforeClosed);assert.equal(writes,writesBeforeClosed);

// Stale edit IDs are rejected instead of discarding a replacement silently.
context.selectedDate='2026-10-02';run("foodDraft={text:'Nueva descripción',type:1,editId:'missing',editDate:'2026-10-02'}");context.render();submit();
assert.equal(state(),beforeClosed);assert.match(nodes.get('#foodError').textContent,/ya no está disponible/);

// Descriptions and profile names are escaped in generated markup.
run("foodDraft={text:'<img src=x onerror=alert(1)>',type:1}");context.S.profileName='<script>bad()</script>';context.render();
assert.doesNotMatch(html,/<img src=x|<script>bad/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
// Marks persist by date, synchronize with Mi Día and never delete descriptions.
context.S=structuredClone(fixture);context.selectedDate='2026-10-01';run("foodDraft={text:'',type:1}");context.render();writes=0;stored=state();
assert.ok(html.indexOf('meal-tracker')<html.indexOf('meal-explorer'),'El seguimiento aparece antes de las recetas');
const mark=(type,checked)=>{const input=target({meal:String(type),foodCheck:''},{checked});dispatch('change',{target:input});return input};
mark(1,true);assert.equal(writes,1);assert.equal(context.S.meals['2026-10-01'][1],true);assert.equal(context.S.tasks['2026-10-01-lunch'],true);
context.S=JSON.parse(stored);context.render();assert.equal(context.dayMealChecks('2026-10-01')[1],true);assert.match(html,/2\/3 marcadas/);
assert.equal(context.dailyActivityItems('2026-10-01').find(item=>item.id==='lunch').done,true);
mark(1,false);assert.equal(writes,2);assert.equal(context.S.tasks['2026-10-01-lunch'],false);assert.deepEqual(context.S.foodLog,fixture.foodLog);
const untouched=state(),storedBeforeMarkFailure=stored;failSave=true;const failedMark=mark(2,true);failSave=false;
assert.equal(state(),untouched);assert.equal(stored,storedBeforeMarkFailure);assert.equal(failedMark.checked,false);assert.match(nodes.get('#mealTrackingError').textContent,/No se pudo guardar/);
mark(3,true);assert.equal(context.S.tasks['2026-10-01-undefined'],undefined);assert.match(html,/1\/3 marcadas/);
// Mi Día's original input uses both attributes and must also save exactly once.
const dayWrites=writes;dispatch('change',{target:target({meal:'2',task:'dinner'},{checked:true})});
assert.equal(writes,dayWrites+1);assert.equal(context.dayMealChecks('2026-10-01')[2],true);assert.equal(context.S.tasks['2026-10-01-dinner'],true);
mark(2,false);assert.equal(context.dayMealChecks('2026-10-01')[2],false);
context.S.tasks['2026-10-01-shower']=true;mark(0,false);assert.equal(context.dayMealChecks('2026-10-01')[0],false);
context.selectedDate='2026-10-02';context.render();assert.match(html,/0\/3 marcadas/);assert.equal(context.dayMealChecks('2026-10-01')[3],true);

// New descriptions, their mark and the matching activity use ONE atomic save.
click({foodRecordType:'0'});assert.equal(run('foodDraft.type'),0);input('Pan con café');const beforeBreakfastWrites=writes;submit();
assert.equal(writes,beforeBreakfastWrites+1);assert.equal(context.S.meals['2026-10-02'][0],true);assert.equal(context.S.tasks['2026-10-02-breakfast'],true);
assert.match(html,/Desayuno guardado y marcado/);assert.match(html,/huevo/);assert.match(html,/papaya|plátano/);
const breakfastEntry=context.S.foodLog.at(-1);mark(0,false);click({foodDetail:breakfastEntry.id});input('Pan con café y fruta');submit();
assert.equal(context.S.meals['2026-10-02'][0],false,'Editar no vuelve a marcar una comida desmarcada');
assert.equal(context.S.foodLog.at(-1).type,0);assert.equal(context.S.foodLog.at(-1).date,'2026-10-02');
click({foodFormType:'2'});input('Arroz con pollo');const beforeAtomicFailure=state(),storedAtomicFailure=stored;
failSave=true;submit();failSave=false;assert.equal(state(),beforeAtomicFailure);assert.equal(stored,storedAtomicFailure);assert.equal(context.dayMealChecks('2026-10-02')[2],false);
submit();assert.equal(context.dayMealChecks('2026-10-02')[2],true);assert.equal(context.S.tasks['2026-10-02-dinner'],true);assert.match(html,/tomate/);
for(const key of ['done','loads','reps','body','water','sleep','substitutions','custom','cardio','gymVisits','mealAdjustments'])assert.deepEqual(context.S[key],fixture[key],key);

// Closed snapshots and disabled controls resist synthetic checkbox events.
context.S.dayHistory=[{id:'locked',date:'2026-10-02',foods:structuredClone(context.S.foodLog.filter(entry=>entry.date==='2026-10-02')),meals:{0:false,2:true},tasks:[]}];context.S.closedDays={'2026-10-02':'locked'};context.render();
const locked=state(),lockedWrites=writes;mark(2,false);input('No guardar en cierre');submit();assert.equal(state(),locked);assert.equal(writes,lockedWrites);
context.selectedDate='2026-10-03';context.render();dispatch('change',{target:target({meal:'1',foodCheck:''},{checked:true,disabled:true})});assert.equal(state(),locked);
console.log('PASS: recetas sin escritura, borradores, marcas por fecha y Mi Día, snack opcional, alta y marcas atómicas, edición sin reclasificar ni remarcar, datos anteriores, rollback, cierres y HTML escapado (lógica sin navegador).');
