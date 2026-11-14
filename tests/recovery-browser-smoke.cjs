const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
 await page.locator('.welcome-splash').waitFor({state:'detached'});
 await page.evaluate(()=>{S.loads={'1-0-0':'40'};S.done={'1-0-0':false};S.tab='mas';save();render()});
 await page.locator('[data-checkpoint-create]').click();assert.equal(await page.evaluate(()=>plannerCheckpoints().length),1);
 const backup=await page.evaluate(()=>({...S,loads:{'1-0-0':'90','2-0-0':'45'},done:{'1-0-0':true,'2-0-0':true}}));
 await page.locator('[data-recover-missing]').setInputFiles({name:'respaldo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await page.waitForFunction(()=>S.loads['2-0-0']==='45');
 assert.deepEqual(await page.evaluate(()=>({load:S.loads['1-0-0'],done:S.done['1-0-0'],copies:plannerCheckpoints().length})),{load:'40',done:false,copies:2});
 await page.reload();assert.equal(await page.evaluate(()=>S.loads['2-0-0']),'45');
 await page.locator('#nav [data-tab="rutina"]').click();await page.locator('[data-day="0"]').click();assert.ok(await page.getByText('Tu siguiente paso',{exact:true}).count());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS: mobile recovery, checkpoints, conflict preservation, persistence, in-workout suggestions and no overflow.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
