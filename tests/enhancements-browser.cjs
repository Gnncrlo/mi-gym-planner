// Real app in Chromium. All new features are local; remote traffic is blocked.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':'text/html');res.end(data)})});
 await new Promise(resolve=>server.listen(8771,'127.0.0.1',resolve));let browser;
 try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const reducedMotion of ['no-preference','reduce'])for(const viewport of [{width:390,height:844},{width:360,height:640}]){
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion,timezoneId:'America/Lima'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await context.route('https://**',route=>route.abort());
 await page.goto('http://127.0.0.1:8771/');await page.locator('.welcome-splash').waitFor({state:'detached'});
 const original=await page.evaluate(()=>{const today=localDateKey(),yesterday=weeklyShiftDate(today,-1);const fixture={...S,tab:'rutina',profileName:'Giancarlo',week:2,day:0,done:{'1-0-0':true},loads:{'1-0-0':'40'},reps:{'1-0-0':'10'},body:[{date:yesterday,kg:80}],water:{[today]:1500},meals:{[today]:{0:true,1:true}},tasks:{[yesterday+'-gym']:true},gymVisits:{[yesterday]:{period:'night'}}};localStorage.setItem('mgp-v2',JSON.stringify(fixture));return fixture});
 await page.reload();await page.locator('.welcome-splash').waitFor({state:'detached'});
 assert.match(await page.locator('[data-previous-mark="0"]').textContent(),/40 kg × 10/);
 await page.locator('[data-reps="0"]').fill('8');await page.locator('[data-load="0"]').fill('40');await page.locator('[data-quick-load="0"][data-load-delta="2.5"]').click();
 assert.equal(await page.locator('[data-load="0"]').inputValue(),'42.5');await page.locator('#gymRecordToast').waitFor();assert.match(await page.locator('#gymRecordToast').textContent(),/\+2.5 kg/);
 assert.equal(await page.locator('.record-confetti').count(),reducedMotion==='reduce'?0:34);await page.locator('[data-record-close]').click();
 await page.locator('[data-quick-load="0"][data-load-delta="2.5"]').click();await page.waitForTimeout(750);assert.equal(await page.locator('#gymRecordToast').count(),0);
 await page.locator('[data-ex="0"]').check();await page.locator('#gymRest').waitFor();const deadline=await page.evaluate(()=>gymTimerDeadline);await page.locator('[data-ex="1"]').check();assert.equal(await page.evaluate(()=>gymTimerDeadline),deadline);
 await page.locator('#nav [data-tab="inicio"]').click();assert.equal(await page.locator('.gym-streak').count(),1);assert.equal(await page.locator('.gym-rings').count(),1);if(viewport.width===390&&reducedMotion==='no-preference')await page.screenshot({path:'/tmp/gym-home-enhanced.png',fullPage:true});assert.equal(await page.evaluate(()=>gymTimerDeadline),deadline);
 const bounds=await page.locator('#gymRest').boundingBox(),nav=await page.locator('.nav').boundingBox();assert.ok(bounds.y+bounds.height<=nav.y);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('[data-rest-shift="30"]').click();assert.ok(await page.evaluate(()=>seconds>90));await page.evaluate(()=>{gymTimerDeadline=Date.now()-1;updateGymTimer()});assert.equal(await page.locator('[data-rest-label]').textContent(),'¡A TRABAJAR!');await page.locator('[data-rest-skip]').click();assert.equal(await page.locator('#gymRest').count(),0);
 await page.evaluate(()=>{S.tab='progreso';progressTab='resumen';render()});await page.getByRole('button',{name:'Compartir mi semana'}).waitFor();
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-share-week]').click();const download=await downloadPromise,stream=await download.createReadStream(),parts=[];for await(const chunk of stream)parts.push(chunk);const png=Buffer.concat(parts);if(viewport.width===390&&reducedMotion==='no-preference')fs.writeFileSync('/tmp/gym-week-share.png',png);assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1350);
 await page.locator('#nav [data-tab="rutina"]').click();await page.locator('[data-day="0"]').click();await page.evaluate(()=>{const snapshot=makeDaySnapshot(localDateKey(),0);S.dayHistory.push(snapshot);S.closedDays[snapshot.date]=snapshot.id;save();render()});assert.equal(await page.locator('[data-quick-load="0"]').first().isDisabled(),true);assert.equal(await page.locator('[data-ex="0"]').isDisabled(),true);
 await page.locator('#nav [data-tab="mas"]').click();const backupPromise=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const backupDownload=await backupPromise,backupStream=await backupDownload.createReadStream(),backupParts=[];for await(const chunk of backupStream)backupParts.push(chunk);const backup=JSON.parse(Buffer.concat(backupParts));
 assert.deepEqual(backup.body,original.body);assert.equal(backup.loads['1-0-0'],'40');assert.equal(backup.reps['1-0-0'],'10');const savedBefore=await page.evaluate(()=>JSON.stringify(S));await page.locator('#restore').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});assert.equal(await page.evaluate(()=>JSON.stringify(S)),savedBefore);
 await page.reload();assert.equal(await page.evaluate(()=>S.loads['2-0-0']),'45');assert.equal(await page.evaluate(()=>S.done['2-0-0']),true);
 assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/gym-enhancements-'+viewport.width+'-'+reducedMotion+'.png',fullPage:true});
 console.log('PASS browser '+viewport.width+'×'+viewport.height+' '+reducedMotion+': quick loads, previous mark, one PR, confetti preference, shared timer/re-render, no overlap, rings/streak, PNG, closed locks, backup/restore and old data.');
 await context.close();
 }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
