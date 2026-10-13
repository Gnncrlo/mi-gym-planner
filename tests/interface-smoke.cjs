const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.APP_URL||'http://127.0.0.1:8000/');
await p.getByRole('heading',{name:'Hola, Giancarlo.'}).waitFor();
await p.locator('#profileAvatar').click();await p.locator('#profileName').fill('Giancarlo Mariñas');await p.locator('#profileName').press('Tab');await p.locator('#nav [data-tab="inicio"]').click();await p.getByRole('heading',{name:'Hola, Giancarlo Mariñas.'}).waitFor();await p.reload();await p.getByRole('heading',{name:'Hola, Giancarlo Mariñas.'}).waitFor();
const savedName=await p.evaluate(()=>JSON.parse(localStorage.getItem('mgp-v2')).profileName);assert.equal(savedName,'Giancarlo Mariñas');
await p.locator('#nav [data-tab="dia"]').click();await p.locator('#taskName').fill('Caminar después de comer');await p.locator('[data-action="addTask"]').click();assert.match(await p.locator('#root').innerText(),/Caminar después de comer/);
await p.locator('#nav [data-tab="progreso"]').click();await p.locator('#newWeight').fill('90.5');await p.locator('[data-action="addWeight"]').click();assert.match(await p.locator('#root').innerText(),/90.5 kg/);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('mgp-v2')).body.at(-1).kg),90.5);
await p.locator('#nav [data-tab="habitos"]').click();await p.locator('[data-action="water"]').click();assert.match(await p.locator('#root').innerText(),/0.25 \/ 2.5 L/);
for(const width of [320,375,390,1024]){await p.setViewportSize({width,height:844});for(const tab of ['inicio','dia','rutina','habitos','progreso','mas']){await p.locator(`#nav [data-tab="${tab}"]`).click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${tab} @ ${width}`);}}
await p.locator('#profileName').fill('<b>Ana</b>');await p.locator('#profileName').press('Tab');await p.locator('#nav [data-tab="inicio"]').click();await p.getByRole('heading',{name:'Hola, <b>Ana</b>.'}).waitFor();assert.equal(await p.locator('.welcome h1 b').count(),0);
assert.deepEqual(errors,[]);console.log('PASS: bienvenida personalizada y persistente, nombre escapado, registro real de actividad y peso, agua, todas las secciones a 320/375/390/1024 px sin desbordamientos.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
