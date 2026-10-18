// Real browser UI with a simulated Auth/REST server. No real users are created.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cloud=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','cloud-config.js'),'utf8')+';GYM_CLOUD_CONFIG');
const clone=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const accounts=new Map(),rows=new Map(),errors=[],ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 const password='BrowserFixture-2026!';
 const userFromToken=token=>[...accounts.values()].find(user=>'fixture-access-'+user.id===token);
 const session=user=>({user:{id:user.id,email:user.email,user_metadata:{full_name:user.name}},access_token:'fixture-access-'+user.id,refresh_token:'fixture-refresh-'+user.id,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600});
 async function device(){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.route(cloud.url+'/**',async route=>{
   const request=route.request(),url=new URL(request.url()),method=request.method(),body=request.postDataJSON();
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'apikey, authorization, content-type, prefer','access-control-allow-methods':'GET, POST, PATCH, OPTIONS'};
   const reply=(status,value)=>route.fulfill({status,headers,contentType:'application/json',body:value===undefined?'':JSON.stringify(value)});
   if(method==='OPTIONS')return reply(204);
   if(url.pathname==='/auth/v1/signup'){
    assert.equal(accounts.has(body.email),false);const user={id:ids[accounts.size],email:body.email,name:body.data.full_name};accounts.set(body.email,user);return reply(200,session(user));
   }
   if(url.pathname==='/auth/v1/token'){
    const user=url.searchParams.get('grant_type')==='refresh_token'?[...accounts.values()].find(user=>'fixture-refresh-'+user.id===body.refresh_token):accounts.get(body.email);
    if(!user||body.password&&body.password!==password)return reply(400,{message:'Invalid fixture credentials'});
    return reply(200,session(user));
   }
   const user=userFromToken(request.headers().authorization?.replace(/^Bearer /,''));
   if(!user)return reply(401,{});
   if(url.pathname==='/auth/v1/user')return reply(200,session(user).user);
   if(url.pathname==='/auth/v1/logout')return reply(204);
   if(url.pathname==='/rest/v1/planner_accounts'){
    const target=method==='POST'?body.user_id:url.searchParams.get('user_id')?.slice(3);
    if(target!==user.id)return reply(method==='POST'?403:200,method==='POST'?{}:[]);
    const current=rows.get(target);
    if(method==='GET')return reply(200,current?[current]:[]);
    if(method==='POST'&&current)return reply(409,{});
    if(method==='PATCH'&&Number(url.searchParams.get('revision')?.slice(3))!==current?.revision)return reply(200,[]);
    const row={user_id:target,state:clone(body.state),revision:body.revision,updated_at:new Date().toISOString()};rows.set(target,row);return reply(method==='POST'?201:200,[row]);
   }
   throw Error('Unexpected fixture request: '+method+' '+url.pathname);
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8000/');await welcome(page,'Mi perfil');
  return page;
 }
 async function welcome(page,name){const splash=page.locator('.welcome-splash');await splash.waitFor();assert.ok((await splash.innerText()).includes(name));await splash.getByRole('button').click();await splash.waitFor({state:'hidden'})}
 async function signup(page,name){await page.locator('#nav [data-tab="mas"]').click();await page.locator('[data-cloud-auth="signup"]').click();await page.locator('#cloudName').fill(name);await page.locator('#cloudEmail').fill(name.toLowerCase()+'@example.invalid');await page.locator('#cloudPassword').fill(password);await page.locator('#cloudAuthForm button[type="submit"]').click();await welcome(page,name)}
 async function login(page,name){if(await page.locator('#nav [data-tab="mas"]').count())await page.locator('#nav [data-tab="mas"]').click();if(!await page.locator('#cloudEmail').count())await page.locator('[data-cloud-auth="signin"]').click();await page.locator('#cloudEmail').fill(name.toLowerCase()+'@example.invalid');await page.locator('#cloudPassword').fill(password);await page.locator('#cloudAuthForm button[type="submit"]').click();await welcome(page,name)}
 try{
  const a=await device();const legacy=await a.evaluate(()=>({...JSON.parse(JSON.stringify(defaults)),tab:'mas',profileName:'Giancarlo',body:[{date:'2026-10-01',kg:92}],done:{'1-0-0':true},foodLog:[{id:'owner',date:'2026-10-01',type:0,text:'Solo de Giancarlo'}]}));
  await a.evaluate(value=>localStorage.setItem('mgp-v2',JSON.stringify(value)),legacy);await a.reload();await welcome(a,'Giancarlo');const original=await a.evaluate(()=>localStorage.getItem('mgp-v2'));
  await signup(a,'Ana');assert.deepEqual(await a.evaluate(()=>S.body),[]);assert.deepEqual(await a.evaluate(()=>S.foodLog),[]);assert.equal(await a.evaluate(()=>localStorage.getItem('mgp-v2')),original);
  await a.locator('#nav [data-tab="progreso"]').click();await a.locator('#newWeight').fill('65');await a.locator('[data-action="addWeight"]').click();
  await a.waitForFunction(()=>cloudStatus?.kind==='synced');assert.equal(rows.get(ids[0]).state.body[0].kg,65);
  const second=await device();await login(second,'Ana');assert.equal(await second.evaluate(()=>S.body[0].kg),65);assert.equal(await second.evaluate(()=>S.profileName),'Ana');
  const b=await device();await signup(b,'Luis');assert.deepEqual(await b.evaluate(()=>S.body),[]);assert.deepEqual(await b.evaluate(()=>S.done),{});
  await a.locator('#nav [data-tab="mas"]').click();await a.locator('[data-cloud-logout]').click();await a.locator('#cloudEmail').waitFor();assert.ok(!(await a.locator('#root').innerText()).includes('Solo de Giancarlo'));
  await login(a,'Luis');assert.deepEqual(await a.evaluate(()=>S.body),[]);assert.equal(await a.evaluate(()=>localStorage.getItem('mgp-v2')),original);
  assert.deepEqual(errors,[]);console.log('PASS Chromium con Auth/REST simulados: registro con nombre, legado intacto, guardado, segunda sesión, dos cuentas aisladas y cambio de cuenta sin datos ajenos.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
