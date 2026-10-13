const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Lima'});
  await page.addInitScript(()=>{
   window.seenWelcomes=[];
   new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
     if(node instanceof Element&&node.classList.contains('welcome-splash'))window.seenWelcomes.push(node.textContent);
    }
   }).observe(document,{childList:true,subtree:true});
  });
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8000/');
  await page.locator('.welcome-splash').waitFor({state:'detached'});
  assert.match((await page.evaluate(()=>window.seenWelcomes))[0],/Giancarlo/);
  assert.match((await page.evaluate(()=>window.seenWelcomes))[0],/DISCIPLINA DEL DÍA/);
  assert.equal(await page.evaluate(()=>window.seenWelcomes[0].includes(disciplineQuote())),true);
  const quotes=await page.evaluate(()=>Array.from({length:7},(_,i)=>disciplineQuote('2026-10-'+String(13+i))));
  assert.equal(new Set(quotes).size,7);
  assert.equal(await page.evaluate(()=>disciplineQuote('2026-10-13')===disciplineQuote('2026-10-13')),true);
  assert.equal(await page.evaluate(()=>disciplineQuote(new Date('2026-10-14T00:30:00Z'))===disciplineQuote('2026-10-13')),true);

  await page.locator('#nav [data-tab="mas"]').click();
  await page.locator('#profileName').fill('Ana');
  await page.locator('#profileName').press('Tab');
  await page.locator('#nav [data-tab="inicio"]').click();
  assert.equal(await page.evaluate(()=>window.seenWelcomes.length),1);
  await page.reload();
  await page.locator('.welcome-splash').waitFor({state:'detached'});
  assert.match((await page.evaluate(()=>window.seenWelcomes))[0],/Ana/);
  assert.equal(await page.evaluate(()=>S.profileName),'Ana');
  await page.locator('#nav [data-tab="inicio"]').focus();
  await page.evaluate(()=>showAppWelcome());
  await page.locator('.splash-enter').click();
  assert.equal(await page.locator('.welcome-splash').evaluate(element=>element.classList.contains('is-exiting')),true);
  await page.locator('.welcome-splash').waitFor({state:'detached'});
  assert.equal(await page.locator('#nav [data-tab="inicio"]').evaluate(element=>element===document.activeElement),true);

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{S.profileName='<img src=x onerror="window.splashInjected=true">';showAppWelcome()});
  assert.equal(await page.locator('.splash-content').evaluate(element=>getComputedStyle(element).animationName),'none');
  assert.equal(await page.locator('.splash-content h2 img').count(),0);
  assert.equal(await page.locator('.splash-content h2 span').textContent(),'<img src=x onerror="window.splashInjected=true">');
  await page.locator('.welcome-splash').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>Boolean(window.splashInjected)),false);

  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>{S.profileName='Giancarlo Mariñas Fonseca';showAppWelcome()});
  const geometry=await page.locator('.splash-enter').boundingBox();
  assert.ok(geometry.y>=0&&geometry.y+geometry.height<=568,'The welcome button should fit on a compact iPhone.');
  assert.equal(await page.locator('.welcome-splash').evaluate(element=>element.scrollWidth<=element.clientWidth),true);
  await page.locator('.splash-enter').click();
  await page.locator('.welcome-splash').waitFor({state:'detached'});
  console.log('PASS: bienvenida personalizada, frase diaria local, salida suave, foco, movimiento reducido y pantalla compacta.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
