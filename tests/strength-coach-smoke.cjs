const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');

const repository=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(repository,'index.html'),'utf8');
const context=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('const plan='),html.indexOf('const defaults=')),context);
for(const file of ['exercises.js','recommendations.js','day-journal.js','strength-coach.js'])vm.runInContext(fs.readFileSync(path.join(repository,file),'utf8'),context);
let sequence=0;
const session=(date,week,changes={})=>({id:'session-'+(++sequence),date,week,day:0,exercises:[{slot:0,original:'Press de banca',name:'Press de banca',sets:'3 × 8–10',done:true,load:40,reps:10,feeling:'controlled',...changes}]});
const setHistory=(state,entries)=>{state.dayHistory=entries;state.closedDays=Object.fromEntries(entries.map(entry=>[entry.date,entry.id]));return state};
const addSession=(state,entry)=>{state.dayHistory.push(entry);state.closedDays[entry.date]=entry.id};
const fixture=()=>setHistory({week:3,day:0,loads:{},reps:{},done:{},substitutions:{},exerciseFeelings:{},exerciseFeelingNames:{}},[session('2026-10-01',1),session('2026-10-08',2)]);
function advice(state,name='Press de banca'){
 const before=JSON.stringify(state);context.caseState=state;context.caseName=name;
 const result=vm.runInContext('strengthCoachAdvice(caseName,caseState)',context);
 assert.equal(JSON.stringify(state),before,'Advice must not modify any record.');return result;
}

const ready=advice(fixture());assert.equal(ready.status,'consider');
assert.match(ready.message,/Si completaste todas las series/);assert.match(ready.message,/incremento mínimo/);assert.doesNotMatch(ready.message,/\d+\s*kg|1RM/);
let state=fixture();setHistory(state,state.dayHistory.slice(0,1));state.loads['3-0-0']=40;state.reps['3-0-0']=10;state.done['3-0-0']=true;assert.equal(advice(state).status,'insufficient');
state=fixture();setHistory(state,[session('2026-10-08',2),session('2026-10-08',2,{reps:12})]);assert.equal(advice(state).status,'insufficient');
state=fixture();setHistory(state,[session('2026-10-01',1),session('2026-10-08',1)]);assert.equal(advice(state).status,'insufficient');
state=fixture();addSession(state,session('2026-10-10',2,{name:'Press de pecho en máquina'}));assert.equal(advice(state).status,'insufficient','A later variant revision supersedes an older workout even when its date changed.');
state=fixture();setHistory(state,[session('2026-10-01',1),session('2026-10-10',2),session('2026-10-08',2,{feeling:'high'})]);assert.equal(advice(state).status,'high','A corrected earlier date must not resurrect the replaced later date.');
state=fixture();delete state.closedDays['2026-10-08'];assert.equal(advice(state).status,'insufficient','A reopened day does not qualify while it is being corrected.');
state=fixture();addSession(state,session('2026-10-08',2,{feeling:'high'}));assert.equal(advice(state).status,'high','Only the active revision qualifies.');
for(const [changes,status] of [[{feeling:'high'},'high'],[{feeling:'pain'},'pain'],[{reps:9},'maintain'],[{reps:999},'maintain'],[{reps:10.5},'maintain'],[{feeling:''},'maintain'],[{done:false},'maintain'],[{load:45},'maintain'],[{sets:'3 × 30 s'},'maintain'],[{equipment:'Otra máquina'},'maintain']]){
 state=fixture();addSession(state,session('2026-10-10',3,changes));assert.equal(advice(state).status,status,'Latest difficulty or incomplete data must prevail.');
}
for(const load of [0,'',null,-1,NaN,Infinity]){state=fixture();state.dayHistory[1].exercises[0].load=load;assert.notEqual(advice(state).status,'consider');}
for(const name of ['Plancha','Dominadas asistidas','Curl con banda','Flexiones inclinadas','Crunch','Zancadas','Elevación talones']){state=fixture();for(const entry of state.dayHistory)entry.exercises[0].name=name;assert.equal(advice(state,name).status,'unsupported');}
state=fixture();state.dayHistory[1].exercises[0].name='Press de pecho en máquina';assert.equal(advice(state).status,'insufficient');
state=fixture();delete state.dayHistory[1].exercises[0].feeling;assert.equal(advice(state).status,'maintain');
state=fixture();state.dayHistory[1].exercises[0].sets='3 × 12';assert.equal(advice(state).status,'maintain');
state=fixture();state.dayHistory[1].exercises.push({...state.dayHistory[1].exercises[0],slot:1});assert.equal(advice(state).status,'maintain');
state=fixture();state.dayHistory[1].exercises.push({...state.dayHistory[1].exercises[0],slot:1,feeling:'pain'});assert.equal(advice(state).status,'pain');
state=fixture();setHistory(state,[session('2099-10-01',1),session('2099-10-08',2)]);assert.equal(advice(state).status,'insufficient','Future imported dates cannot supply completed past sessions.');
state=fixture();state.exerciseFeelings['3-0-0']='pain';state.exerciseFeelingNames['3-0-0']='Press de banca';assert.equal(advice(state).status,'pain');
state.exerciseFeelings['3-0-0']='high';assert.equal(advice(state).status,'high');
state.exerciseFeelingNames['3-0-0']='Press con mancuernas';assert.equal(advice(state).status,'consider','An old variant feeling must not be assigned to another exercise.');
state=fixture();state.loads['3-0-0']=42.5;assert.equal(advice(state).status,'maintain');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Lima'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8000/');await page.locator('.welcome-splash').waitFor({state:'detached'});
  await page.locator('#nav [data-tab="rutina"]').click();await page.locator('[data-day="0"]').click();
  await page.locator('[data-load="0"]').fill('40');await page.locator('[data-load="0"]').press('Tab');
  await page.locator('[data-reps="0"]').fill('10');await page.locator('[data-reps="0"]').press('Tab');
  await page.locator('[data-ex="0"]').check();await page.locator('[data-exercise-feeling="0"]').selectOption('controlled');
  assert.equal(await page.evaluate(()=>S.exerciseFeelings[wk(0)]),'controlled');
  assert.equal(await page.evaluate(()=>S.exerciseFeelingNames[wk(0)]),'Press de banca');
  const snapshot=await page.evaluate(()=>{const entry=makeDaySnapshot('2026-10-10',0);S.dayHistory.push(entry);S.closedDays[entry.date]=entry.id;save();render();return entry});
  assert.equal(snapshot.exercises[0].feeling,'controlled');assert.equal(await page.locator('[data-exercise-feeling="0"]').isDisabled(),true);
  await page.evaluate(()=>{const field=document.querySelector('[data-exercise-feeling="0"]');field.value='pain';field.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.evaluate(()=>S.exerciseFeelings[wk(0)]),'controlled');
  assert.equal(await page.evaluate(()=>S.dayHistory[0].exercises[0].feeling),'controlled');
  await page.evaluate(()=>{delete S.closedDays['2026-10-10'];S.substitutions[wk(0)]='Press con mancuernas';render()});
  assert.equal(await page.locator('[data-exercise-feeling="0"]').inputValue(),'');
  assert.equal(await page.evaluate(()=>makeDaySnapshot('2026-10-10',0).exercises[0].feeling),'');
  const before=await page.evaluate(()=>({feelings:JSON.stringify(S.exerciseFeelings),names:JSON.stringify(S.exerciseFeelingNames),storage:localStorage.getItem('mgp-v2')}));
  await page.evaluate(()=>{window.originalStorageSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});
  await page.locator('[data-exercise-feeling="0"]').selectOption('pain');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSetItem;delete window.originalStorageSetItem});
  assert.deepEqual(await page.evaluate(()=>({feelings:JSON.stringify(S.exerciseFeelings),names:JSON.stringify(S.exerciseFeelingNames),storage:localStorage.getItem('mgp-v2')})),before);
  await page.locator('[data-exercise-feeling="0"]').selectOption('high');
  assert.equal(await page.evaluate(()=>S.exerciseFeelingNames[wk(0)]),'Press con mancuernas');
  assert.equal(await page.evaluate(()=>S.loads[wk(0)]),'40');assert.equal(await page.evaluate(()=>S.reps[wk(0)]),'10');
  await page.evaluate(f=>{S={...S,...f,tab:'progreso'};progressTab='fuerza';strengthExercise='Press de banca';render()},fixture());
  assert.match(await page.locator('.strength-coach').textContent(),/Si completaste todas las series/);
  assert.deepEqual(errors,[]);
  console.log('PASS: fuerza prudente, sesiones comparables, sensaciones, variantes, cierre inmutable, bloqueo y rollback sin modificar cargas.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
