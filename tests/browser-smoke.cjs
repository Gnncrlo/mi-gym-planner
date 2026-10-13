// Run against the static server: node tests/browser-smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8000/');
  const legacy={tab:'rutina',day:0,week:3,done:{'3-0-0':true,'1-4-2':true},loads:{'3-0-0':'42.5'},reps:{'3-0-0':'9'},body:[{date:'2026-01-02',kg:88.7}],water:{'2026-01-02':1250},meals:{'2026-01-02':{0:true}},sleep:{'2026-01-02':'7.5'},tasks:{'2026-01-02-wake':true},schedule:{wake:'05:30',gym:'06:30',work:'08:00',lunch:'13:00',finish:'17:00',bed:'22:00'},custom:[['custom123','18:00','Caminar']],reminders:true,seconds:90};
  await page.evaluate(data=>localStorage.setItem('mgp-v2',JSON.stringify(data)),legacy);await page.reload();
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mgp-v2')));
  async function recordsIntact(){const data=await stored();for(const k of ['done','loads','reps','body','water','meals','sleep','tasks','schedule','custom','reminders'])assert.deepEqual(data[k],legacy[k],k)}
  const catalogValid=await page.evaluate(()=>plan.every(day=>day.ex.every(([name])=>{const g=exerciseGuide[name];return g&&g.variants.length===3&&new Set(g.variants).size===3&&g.variants.every(v=>exerciseGuide[v]?.steps.length>=3&&exercisePhotos[name]?.images.length===2);})));
  assert.equal(catalogValid,true);
  const assetCount=await page.evaluate(async()=>{
   const paths=[...new Set(Object.values(exercisePhotos).flatMap(p=>p.images))];
   await Promise.all(paths.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error('Foto no disponible: '+src));img.src=src;})));
   return paths.length;
  });
  assert.ok(assetCount>=60);
  await recordsIntact();assert.equal(await page.locator('[data-ex="0"]').isChecked(),true);
  await page.locator('[data-guide="0"]').click();await page.locator('dialog').waitFor();
  assert.equal(await page.locator('dialog [data-variant]').count(),3);
  await page.locator('[data-variant="0"]').click();assert.match(await page.locator('[data-guide="0"]').innerText(),/Press con mancuernas/);
  await recordsIntact();await page.reload();assert.match(await page.locator('[data-guide="0"]').innerText(),/Press con mancuernas/);assert.equal(await page.locator('[data-load="0"]').inputValue(),'42.5');assert.equal(await page.locator('[data-reps="0"]').inputValue(),'9');assert.equal(await page.locator('[data-ex="0"]').isChecked(),true);
  await page.locator('[data-action="nextWeek"]').click();assert.match(await page.locator('[data-guide="0"]').innerText(),/Press de banca/);await page.locator('[data-action="prevWeek"]').click();
  let count=0;
  for(let day=0;day<6;day++){
   await page.locator(`[data-day="${day}"]`).click();
   for(let slot=0;slot<5;slot++){
    await page.locator(`[data-guide="${slot}"]`).click();
    assert.equal(await page.locator('dialog .exercise-photo').count(),1);
    await page.locator('dialog .exercise-photo').evaluate(img=>img.decode());
    assert.ok(await page.locator('dialog .exercise-photo').evaluate(img=>img.naturalWidth>0));
    await page.locator('dialog [data-photo-position="2"]').click();
    await page.locator('dialog .exercise-photo').evaluate(img=>img.decode());
    assert.match(await page.locator('dialog .exercise-photo').getAttribute('alt'),/posición 2/);
    assert.equal(await page.locator('dialog [data-photo-position="2"]').getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator('dialog ol li').count()>=3);
    assert.equal(await page.locator('dialog [data-variant]').count(),3);
    assert.equal(await page.evaluate(()=>document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator(`[data-guide="${slot}"]`).evaluate(el=>el===document.activeElement),true);count++;
   }
  }
  await recordsIntact();await page.locator('[data-day="0"]').click();await page.locator('[data-guide="0"]').click();await page.locator('[data-original]').click();assert.match(await page.locator('[data-guide="0"]').innerText(),/Press de banca/);await recordsIntact();
  await page.locator('#nav [data-tab="mas"]').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const download=await downloadPromise;const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const backup=JSON.parse(Buffer.concat(chunks));assert.deepEqual(backup.body,legacy.body);assert.deepEqual(backup.loads,legacy.loads);
  page.on('dialog',d=>d.accept());await page.locator('#restore').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...legacy,tab:'mas'}))});await recordsIntact();await page.locator('#nav [data-tab="rutina"]').click();await page.locator('[data-guide="0"]').click();await page.locator('[data-variant="1"]').click();await recordsIntact();
  await page.locator('[data-guide="0"]').click();await page.locator('dialog .exercise-photo').evaluate(img=>img.decode());
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth),true);
  await page.keyboard.press('Escape');
  await page.locator('[data-action="timer"]').click();await page.waitForTimeout(1100);assert.equal(await page.locator('#clock').innerText(),'01:29');await page.locator('[data-action="timer"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log(`PASS: ${count} fichas, tres variantes, fotografías reales en dos posiciones, iPhone sin desbordamiento, teclado/foco, selección persistente, aislamiento semanal, datos anteriores intactos, exportación/restauración y temporizador.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
