const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.APP_URL||'http://127.0.0.1:8000/');
 assert.equal(await p.locator('.daily-card').count(),3);
 const results=await p.evaluate(()=>{
  const monday=new Date(2026,9,12,23,55),tuesday=new Date(2026,9,13,0,5),sunday=new Date(2026,9,18,12),key=localDateKey(monday);
  const base={...S,week:3,day:5,water:{},sleep:{},done:{},loads:{'3-0-0':'50'},reps:{'3-0-0':'10'},body:[{date:'2026-10-01',kg:90}]};
  const before=JSON.stringify(base),initial=dailyRecommendations(base,monday),sleep=dailyRecommendations({...base,sleep:{[key]:5}},monday),zero=dailyRecommendations({...base,sleep:{[key]:0}},monday),invalid=dailyRecommendations({...base,sleep:{[key]:'bad'}},monday);
  const done=dailyRecommendations({...base,done:Object.fromEntries(plan[0].ex.map((_,i)=>['3-0-'+i,true]))},monday);
  const water=dailyRecommendations({...base,water:{[key]:2500}},monday);
  const rotated1=dailyRecommendations({...base,sleep:{[key]:8}},monday),nextKey=localDateKey(tuesday),rotated2=dailyRecommendations({...base,sleep:{[nextKey]:8}},tuesday);
  return {initial,sleep,zero,invalid,done,water,rest:dailyRecommendations(base,sunday),rotated1,rotated2,unchanged:before===JSON.stringify(base)};
 });
 assert.equal(results.initial.date,'2026-10-12');assert.equal(results.initial.cards[0].title,'Hoy toca Push A');assert.match(results.sleep.cards[0].title,/recuperarte/);assert.match(results.zero.cards[0].title,/recuperarte/);assert.match(results.invalid.cards[2].title,/descansaste/);assert.match(results.done.cards[0].title,/terminada/);assert.match(results.water.cards[1].title,/al día/);assert.match(results.rest.cards[0].title,/descansar/);assert.notEqual(results.rotated1.cards[2].title,results.rotated2.cards[2].title);assert.equal(results.unchanged,true);
 await p.evaluate(()=>{S.day=6;selectedDate='2020-01-01';render()});await p.getByRole('button',{name:'Registrar mis hábitos',exact:true}).click();assert.equal(await p.locator('[data-field="date"]').inputValue(),await p.evaluate(()=>localDateKey()));
 await p.locator('[data-action="water"]').click();await p.locator('#nav [data-tab="inicio"]').click();assert.match(await p.locator('.daily-card').nth(1).innerText(),/0.25/);
 for(const width of [320,390,1024]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 assert.deepEqual(errors,[]);console.log('PASS: recomendaciones según rutina real, sueño bajo/cero/ausente, sesión completa, hidratación, domingo, cambio diario local, navegación a hoy, actualización y datos intactos.');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
