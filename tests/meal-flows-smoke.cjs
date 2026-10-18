// Event and persistence checks with a document double; these do not test browser layout.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const handlers=new Map(),nodes=new Map(),panels=new Map(),pending=[];
let activeDialog=null,html='',writes=0,stored='',failSave=false;
const node=(extra={})=>({disabled:false,isConnected:true,value:'',hidden:true,textContent:'',focus(){this.focused=true},scrollIntoView(){},setSelectionRange(){},closest(selector){return selector==='#foodForm'?nodes.get('#foodForm'):null},...extra});
for(const id of ['#foodForm','#foodDescription','#foodError','#mealTrackingError','.meal-idea-list','[data-meal-more]','[data-meal-show-options]'])nodes.set(id,node());
const document={
 getElementById(id){return nodes.get('#'+id)||null},
 body:{style:{overflow:''},append(dialog){activeDialog=dialog}},
 addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn)},
 querySelector(selector){
  if(selector==='.meal-recipe-dialog[open]')return activeDialog?.open?activeDialog:null;
  const panel=selector.match(/^\[data-meal-panel="(\d)"\]$/);if(panel)return panels.get(Number(panel[1]))||null;
  if(selector.startsWith('[data-meal-filter=')||selector.startsWith('[data-food-type='))return node();
  return nodes.get(selector)||null;
 },
 createElement(tag){
  assert.equal(tag,'dialog');const events=new Map();
  return node({innerHTML:'',open:false,setAttribute(){},showModal(){this.open=true},addEventListener(type,fn){events.set(type,fn)},close(){this.open=false;events.get('close')?.()},remove(){if(activeDialog===this)activeDialog=null},events});
 }
};
const fixture={tab:'comidas',profileName:'Giancarlo',done:{'2-1-0':true},loads:{'2-1-0':'45'},reps:{'2-1-0':'12'},body:[{date:'2026-10-01',kg:90}],water:{'2026-10-01':1000},sleep:{'2026-10-01':7},meals:{'2026-10-01':{0:true}},substitutions:{'2-1-0':'Press con mancuernas'},tasks:{'2026-10-01-gym':true},custom:[['task','Pendiente','','2026-10-01']],cardio:{'2-1':{activities:{walk:{minutes:15,done:true}}}},gymVisits:{'2026-10-01':{period:'night'}},mealAdjustments:{'2026-10-01':{breakfast:'late',otherNote:'Nota anterior'}},foodLog:[{id:'old-food',date:'2026-10-01',type:0,text:'Pan con huevo',time:'08:00'}],closedDays:{},dayHistory:[]};
const context=vm.createContext({document,crypto:{randomUUID},matchMedia:()=>({matches:true}),localDateKey:()=> '2026-10-04',S:structuredClone(fixture),selectedDate:'2026-10-01',uiIcon:()=>'<svg></svg>',esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
const run=code=>vm.runInContext(code,context),plain=value=>JSON.parse(JSON.stringify(value));
context.save=()=>{if(failSave)throw Error('QuotaExceeded');stored=JSON.stringify(context.S);writes++};
context.render=()=>{
 html=context.renderFoods();nodes.get('#foodDescription').value=run('foodDraft.text');
 for(const panel of panels.values())panel.isConnected=false;panels.clear();
 for(const match of html.matchAll(/<details\b[^>]*data-meal-panel="(\d)"([^>]*)>/g)){const type=Number(match[1]);panels.set(type,target({mealPanel:String(type)},{open:/\bopen\b/.test(match[2])}))}
 for(const match of html.matchAll(/id="(foodLog-[^"]+)"/g))nodes.set('#'+match[1],node());
};
for(const file of ['meal-advice.js','meal-ideas.js','meal-explorer.js','nutrition.js','day-journal.js','daily-planner.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
// Use the real general listener to detect duplicate saves and Mi Día regressions.
const generalChange=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/document\.addEventListener\('change',async e=>\{[\s\S]*?\}\);(?=document\.addEventListener\('input')/);
assert.ok(generalChange,'Se encontró el manejador general de cambios');vm.runInContext(generalChange[0],context);
context.dkey=type=>context.selectedDate+'-'+type;
context.attachFoodInteractions();context.attachMealExplorer();context.render();
const state=()=>JSON.stringify(context.S);
function target(dataset={},extra={}){return node({dataset,hasAttribute(attribute){return Object.hasOwn(dataset,attribute.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))},matches(selector){return selector.split(',').some(part=>part.startsWith('[')&&this.hasAttribute(part.slice(1,-1)))},closest(selector){return this.matches(selector)?this:null},...extra})}
function dispatch(type,event){for(const fn of handlers.get(type)||[]){const result=fn(event);if(result?.then)pending.push(result)}}
const click=(dataset,extra)=>dispatch('click',{target:target(dataset,extra)});
function input(text){const element=nodes.get('#foodDescription');element.id='foodDescription';element.value=text;dispatch('input',{target:element})}
function submit(){dispatch('submit',{target:{id:'foodForm'},preventDefault(){}})}
function recipeClick(dataset){activeDialog.events.get('click')({target:target(dataset)})}
function toggle(type,open){const panel=panels.get(type);assert.ok(panel,`Existe panel ${type}`);panel.open=open;dispatch('toggle',{target:panel});return panel}
function date(value){dispatch('change',{target:target({field:'date'},{value})})}
function reset(){
 context.S=structuredClone(fixture);context.selectedDate='2026-10-01';
 run("foodDrafts.clear();foodDraft={text:'',type:1};foodDraftDate='';foodPanelOpen=1;foodNotice=null;Object.assign(mealExplorer,{type:null,filter:'all',offset:0,referenceId:'',date:'',expanded:false})");
 context.render();writes=0;stored=state();
}
const activeDraft=()=>plain(run('foodDraft'));
const dailyIdeas=()=>[...html.matchAll(/class="meal-daily-idea">[\s\S]*?data-meal-recipe="([^"]+)"/g)].map(match=>match[1]);
const recipeFor=type=>context.selectMealIdeas(type,{date:context.selectedDate})[0].id;
const mark=(type,checked,extra={})=>{const element=target({meal:String(type),foodCheck:''},{checked,...extra});dispatch('change',{target:element});return element};

reset();const initial=state();
assert.equal(panels.size,4);assert.equal((html.match(/id="foodForm"/g)||[]).length,1);
assert.doesNotMatch(html,/data-breakfast-status|¿Cómo fue tu desayuno\?/,'Se retiró el bloque de horario del desayuno');
assert.deepEqual(context.S.mealAdjustments,fixture.mealAdjustments,'Las notas antiguas se conservan');
assert.equal(context.breakfastAdjustmentLabel('late'),'Desayuné más tarde','Los resúmenes antiguos mantienen su etiqueta');

// Folding and switching categories retains distinct drafts without touching storage.
input('Almuerzo pendiente: arroz con pollo');toggle(1,false);assert.equal(run('foodPanelOpen'),null);
toggle(1,true);assert.equal(activeDraft().text,'Almuerzo pendiente: arroz con pollo');
toggle(0,true);input('Desayuno pendiente: pan con huevo');toggle(2,true);input('Cena pendiente: pescado con papa');toggle(3,true);input('Snack pendiente: yogur con fruta');
toggle(0,true);assert.equal(activeDraft().text,'Desayuno pendiente: pan con huevo');toggle(2,true);assert.equal(activeDraft().text,'Cena pendiente: pescado con papa');toggle(1,true);assert.equal(activeDraft().text,'Almuerzo pendiente: arroz con pollo');
const stalePanel=panels.get(0);context.render();stalePanel.open=true;dispatch('toggle',{target:stalePanel});
assert.equal(activeDraft().type,1,'Toggles retrasados de nodos reemplazados no cambian el formulario activo');
assert.equal(state(),initial);assert.equal(stored,initial);assert.equal(writes,0);

// Date navigation uses the real handler; drafts never enter the persisted state.
date('2026-10-02');assert.equal(writes,1);assert.equal(activeDraft().text,'');input('Almuerzo de otra fecha');toggle(0,true);assert.equal(activeDraft().text,'');input('Desayuno de otra fecha');
date('2026-10-01');assert.equal(activeDraft().text,'Desayuno pendiente: pan con huevo');toggle(1,true);assert.equal(activeDraft().text,'Almuerzo pendiente: arroz con pollo');
date('2026-10-02');assert.equal(activeDraft().text,'Almuerzo de otra fecha');toggle(0,true);assert.equal(activeDraft().text,'Desayuno de otra fecha');
assert.equal(state(),initial);assert.equal(stored,initial);assert.equal(writes,3);

// Daily ideas stay stable across filters, offsets and folding, and rotate by date.
date('2026-10-01');const dateOneIdeas=dailyIdeas();assert.equal(dateOneIdeas.length,4);assert.deepEqual(dateOneIdeas,[0,1,2,3].map(recipeFor));
const beforeBrowse=state(),writesBeforeBrowse=writes;
for(let type=0;type<4;type++){
 toggle(type,true);const draft=activeDraft().text;click({mealShowOptions:String(type)});assert.equal(run('mealExplorer.expanded'),true);assert.match(html,/¿Qué te apetece comer\?/);
 for(const filter of ['all','quick','budget','vegetarian','no-cook','portable']){
  click({mealFilter:filter});click({mealMore:''});assert.deepEqual(dailyIdeas(),dateOneIdeas);
  const ideaId=context.selectMealIdeas(type,{date:context.selectedDate,filter})[0].id,opener=target({mealRecipe:ideaId});dispatch('click',{target:opener});
  assert.ok(activeDialog.open);assert.match(activeDialog.innerHTML,/Ingredientes/);assert.match(activeDialog.innerHTML,/Cómo prepararlo/);assert.equal(document.body.style.overflow,'hidden');recipeClick({mealRecipeClose:''});
  assert.equal(activeDialog,null);assert.equal(opener.focused,true);assert.equal(document.body.style.overflow,'');
 }
 click({mealShowOptions:String(type)});assert.equal(run('mealExplorer.expanded'),false);assert.equal(activeDraft().text,draft);toggle(type,false);toggle(type,true);assert.deepEqual(dailyIdeas(),dateOneIdeas);
}
assert.equal(state(),beforeBrowse);assert.equal(writes,writesBeforeBrowse);
date('2026-10-02');assert.ok(dailyIdeas().every((id,type)=>id!==dateOneIdeas[type]));date('2026-10-01');assert.deepEqual(dailyIdeas(),dateOneIdeas);

// Selecting a recipe is a reference, never invented food or a transferred draft.
toggle(3,true);const snackDraft=activeDraft().text,recipeId=recipeFor(3),beforeReference=state(),beforeReferenceWrites=writes;
click({mealRecipe:recipeId});recipeClick({mealDescribe:''});assert.equal(run('mealExplorer.referenceId'),recipeId);assert.equal(activeDraft().type,3);assert.equal(activeDraft().text,snackDraft);
assert.match(html,/elegir una idea no registra una comida/);assert.equal(state(),beforeReference);assert.equal(writes,beforeReferenceWrites);
input('Yogur con papaya. Quedé satisfecho.');submit();assert.equal(writes,beforeReferenceWrites+1);assert.equal(context.S.foodLog.length,2);assert.equal(context.S.foodLog[1].type,3);assert.match(context.S.foodLog[1].text,/Yogur/);assert.equal(run('mealExplorer.referenceId'),'');
const expectedAfterSnack=structuredClone(fixture);expectedAfterSnack.meals['2026-10-01'][3]=true;
for(const key of Object.keys(fixture).filter(key=>key!=='foodLog'))assert.deepEqual(plain(context.S[key]),expectedAfterSnack[key],key);

// Quota failure rolls back log, marks and tasks, retaining the draft for retry.
const beforeFailure=state(),storedBeforeFailure=stored,writesBeforeFailure=writes;
input('Papa y pescado');failSave=true;submit();failSave=false;assert.equal(state(),beforeFailure);assert.equal(stored,storedBeforeFailure);assert.equal(writes,writesBeforeFailure);assert.equal(activeDraft().text,'Papa y pescado');assert.match(nodes.get('#foodError').textContent,/No se pudo guardar/);

// Edits keep their meal identity while the user consults another panel.
click({foodDetail:'old-food'});input('Pan con huevo y tomate');toggle(3,true);assert.equal(activeDraft().type,3);assert.equal(activeDraft().text,'Papa y pescado');toggle(0,true);assert.equal(activeDraft().type,0);assert.equal(activeDraft().editId,'old-food');assert.equal(activeDraft().text,'Pan con huevo y tomate');assert.match(html,/Editando: Desayuno/);
click({mealRecipe:recipeId});assert.doesNotMatch(activeDialog.innerHTML,/data-meal-describe/);recipeClick({mealRecipeClose:''});submit();
assert.equal(context.S.foodLog.length,2);assert.equal(context.S.foodLog[0].id,'old-food');assert.equal(context.S.foodLog[0].text,'Pan con huevo y tomate');assert.equal(context.S.foodLog[0].type,0);
for(const key of Object.keys(fixture).filter(key=>key!=='foodLog'))assert.deepEqual(plain(context.S[key]),expectedAfterSnack[key],key);

// Closing the source date blocks even a stale edit presented on another date.
click({foodDetail:'old-food'});input('No debe sustituir el cierre');const sourceDraft=activeDraft();
context.S.dayHistory=[{id:'closed-1',date:'2026-10-01',foods:structuredClone(context.S.foodLog),meals:{0:true},mealAdjustment:{breakfast:'late'},tasks:[]}];context.S.closedDays={'2026-10-01':'closed-1'};
context.selectedDate='2026-10-02';context.render();context.staleSource=sourceDraft;run('foodDraft={...staleSource}');
const beforeClosed=state(),writesBeforeClosed=writes;submit();assert.equal(state(),beforeClosed);assert.equal(writes,writesBeforeClosed);assert.match(nodes.get('#foodError').textContent,/cerrado/);
context.selectedDate='2026-10-01';context.render();assert.match(html,/Pan con huevo y tomate/);click({mealRecipe:recipeId});assert.doesNotMatch(activeDialog.innerHTML,/data-meal-describe/);assert.match(activeDialog.innerHTML,/Reabre este día/);recipeClick({mealDescribe:''});assert.ok(activeDialog.open);recipeClick({mealRecipeClose:''});
input('Intento sintético');submit();mark(0,false);assert.equal(state(),beforeClosed);assert.equal(writes,writesBeforeClosed);assert.deepEqual(context.S.mealAdjustments,fixture.mealAdjustments);

// A stale edit ID fails explicitly; written descriptions and names are escaped.
context.selectedDate='2026-10-02';context.render();run("foodDraft={text:'Nueva descripción',type:1,editId:'missing',editDate:'2026-10-02'}");submit();assert.equal(state(),beforeClosed);assert.match(nodes.get('#foodError').textContent,/ya no está disponible/);
run("foodDraft={text:'<img src=x onerror=alert(1)>',type:1}");context.S.profileName='<script>bad()</script>';context.render();assert.doesNotMatch(html,/<img src=x|<script>bad/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);

// Marks persist by date, synchronize with Mi Día and never remove descriptions.
reset();mark(1,true);assert.equal(writes,1);assert.equal(context.S.meals['2026-10-01'][1],true);assert.equal(context.S.tasks['2026-10-01-lunch'],true);
context.S=JSON.parse(stored);context.render();assert.equal(context.dayMealChecks('2026-10-01')[1],true);assert.match(html,/2\/3 marcadas/);assert.equal(context.dailyActivityItems('2026-10-01').find(item=>item.id==='lunch').done,true);
mark(1,false);assert.equal(writes,2);assert.equal(context.S.tasks['2026-10-01-lunch'],false);assert.deepEqual(context.S.foodLog,fixture.foodLog);
const untouched=state(),storedBeforeMarkFailure=stored;failSave=true;const failedMark=mark(2,true);failSave=false;assert.equal(state(),untouched);assert.equal(stored,storedBeforeMarkFailure);assert.equal(failedMark.checked,false);assert.match(nodes.get('#mealTrackingError').textContent,/No se pudo guardar/);
mark(3,true);assert.equal(context.S.tasks['2026-10-01-undefined'],undefined);assert.match(html,/1\/3 marcadas/);
const dayWrites=writes;dispatch('change',{target:target({meal:'2',task:'dinner'},{checked:true})});assert.equal(writes,dayWrites+1);assert.equal(context.dayMealChecks('2026-10-01')[2],true);assert.equal(context.S.tasks['2026-10-01-dinner'],true);
mark(2,false);assert.equal(context.dayMealChecks('2026-10-01')[2],false);context.S.tasks['2026-10-01-shower']=true;mark(0,false);assert.equal(context.dayMealChecks('2026-10-01')[0],false);
context.selectedDate='2026-10-02';context.render();assert.match(html,/0\/3 marcadas/);assert.equal(context.dayMealChecks('2026-10-01')[3],true);

// Real food, its completion mark and its activity use one atomic storage write.
toggle(0,true);input('Pan con café');const beforeBreakfastWrites=writes;submit();assert.equal(writes,beforeBreakfastWrites+1);assert.equal(context.S.meals['2026-10-02'][0],true);assert.equal(context.S.tasks['2026-10-02-breakfast'],true);assert.match(html,/Comida guardada y marcada/);assert.match(html,/huevo/);assert.match(html,/papaya|plátano/);
const breakfastEntry=context.S.foodLog.at(-1);mark(0,false);click({foodDetail:breakfastEntry.id});input('Pan con café y fruta');submit();assert.equal(context.S.meals['2026-10-02'][0],false,'Editar no remarca una comida desmarcada');assert.equal(context.S.foodLog.at(-1).type,0);assert.equal(context.S.foodLog.at(-1).date,'2026-10-02');
toggle(2,true);input('Arroz con pollo');const beforeAtomicFailure=state(),storedAtomicFailure=stored;failSave=true;submit();failSave=false;assert.equal(state(),beforeAtomicFailure);assert.equal(stored,storedAtomicFailure);assert.equal(context.dayMealChecks('2026-10-02')[2],false);
submit();assert.equal(context.dayMealChecks('2026-10-02')[2],true);assert.equal(context.S.tasks['2026-10-02-dinner'],true);assert.match(html,/tomate/);
for(const key of ['done','loads','reps','body','water','sleep','substitutions','custom','cardio','gymVisits','mealAdjustments'])assert.deepEqual(context.S[key],fixture[key],key);

// Snapshots and disabled controls resist synthetic checkbox/submit events.
context.S.dayHistory=[{id:'locked',date:'2026-10-02',foods:structuredClone(context.S.foodLog.filter(entry=>entry.date==='2026-10-02')),meals:{0:false,2:true},tasks:[]}];context.S.closedDays={'2026-10-02':'locked'};context.render();
const locked=state(),lockedWrites=writes;mark(2,false);input('No guardar en cierre');submit();assert.equal(state(),locked);assert.equal(writes,lockedWrites);
context.selectedDate='2026-10-03';context.render();mark(1,true,{disabled:true});assert.equal(state(),locked);
Promise.all(pending).then(()=>console.log('PASS: paneles plegables sin escrituras, borradores por fecha/comida, ideas diarias estables y rotación, recetas sin altas ficticias, guardado y marcas atómicos, Mi Día sin doble save, rollback, edición sin reclasificar ni remarcar, datos antiguos, cierres y HTML escapado (sin navegador).')).catch(error=>{console.error(error);process.exitCode=1});
