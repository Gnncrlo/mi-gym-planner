// UI/state integration with the real account module and index listeners.
// Document, Auth and sync doubles avoid network, browser and real account data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const index=read('index.html'),source=read('cloud-accounts.js');
const defaultsExpression=index.match(/const defaults=([\s\S]*?);let S/);
assert.ok(defaultsExpression,'Found the actual application defaults');
const actualDefaults=vm.runInNewContext('('+defaultsExpression[1]+')');
const copy=value=>JSON.parse(JSON.stringify(value));
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const ana={id:ids[0],name:'Ana',email:'ana@example.com'},luis={id:ids[1],name:'Luis',email:'luis@example.com'};
const cache=uid=>'mgp-cloud-v1:gym-project.supabase.co:'+uid;
const legacy={...copy(actualDefaults),profileName:'Giancarlo',done:{'1-0-0':true},loads:{'1-0-0':'50'},reps:{'1-0-0':'12'},body:[{date:'2026-10-15',kg:92}],meals:{'2026-10-15':{0:true}},foodLog:[{id:'owner-food',date:'2026-10-15',type:0,text:'Pollo con arroz'}],closedDays:{'2026-10-14':'owner-close'},dayHistory:[{id:'owner-close',exercises:[],tasks:[],foods:[{text:'Lentejas'}]}]};
const legacyRaw=JSON.stringify(legacy,null,2)+'\n';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
class Storage{
 constructor(values={}){this.values=new Map(Object.entries(values));this.writes=[];this.reads=[];this.fail=null}
 get length(){return this.values.size}
 key(index){return [...this.values.keys()][index]??null}
 getItem(key){this.reads.push(key);return this.values.has(key)?this.values.get(key):null}
 setItem(key,value){if(this.fail===key)throw Error('QuotaExceeded');this.values.set(key,String(value));this.writes.push({key,value:String(value)})}
 removeItem(key){this.values.delete(key)}
 snapshot(){return Object.fromEntries(this.values)}
}
const escaped=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fixture({configured=true,values={},defaults=actualDefaults}={}){
 const storage=new Storage({'mgp-v2':legacyRaw,[cache(ids[1])]:JSON.stringify({privateOtherUser:true}),...values});
 const handlers=new Map(),windowHandlers=new Map(),nodes=new Map(['#root','#nav','#profileAvatar'].map(id=>[id,{innerHTML:'',textContent:''}]));
 const calls={renders:0,welcomes:[],reloads:0,confirms:[],downloads:[],history:[],authCreated:0,controllers:[],sequence:[]};
 const auth={resume:async()=>ana,currentUser:()=>ana,getToken:async()=>{calls.sequence.push('token');return 'PRIVATE_ACCESS_TOKEN'},signIn:async()=>ana,signUp:async()=>({requiresConfirmation:true}),signOut:async()=>{}};
 const document={hidden:false,querySelector:selector=>nodes.get(selector)||null,querySelectorAll:()=>[],addEventListener(type,handler,capture=false){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push({handler,capture})}};
 const context=vm.createContext({URL,URLSearchParams,AbortController,setTimeout,clearTimeout,atob,Date,fetch:()=>{throw Error('Network is forbidden in this test')},document,localStorage:storage,defaults:copy(defaults),S:copy(legacy),foodDraft:{text:'',type:1},foodDrafts:new Map(),foodDraftDate:'',foodNotice:null,esc:escaped,uiIcon:()=>'<svg></svg>',GYM_CLOUD_CONFIG:configured?{url:'https://gym-project.supabase.co',publishableKey:'sb_publishable_public_test_key'}:{url:'',publishableKey:''},
  window:{sessionStorage:new Storage(),location:{protocol:'https:',origin:'https://gnncrlo.github.io',pathname:'/mi-gym-planner/',search:'',hash:'',reload(){calls.reloads++}},history:{replaceState(...args){calls.history.push(args)}},addEventListener(type,handler){if(!windowHandlers.has(type))windowHandlers.set(type,[]);windowHandlers.get(type).push(handler)}},
  navigator:{},confirm:message=>{calls.sequence.push('confirm');calls.confirms.push(message);return true},render:()=>{calls.renders++},attachWelcome:()=>{calls.welcomes.push({ready:run('cloudReady'),state:copy(run('S'))})},
  createGymCloudAuth:()=>{calls.authCreated++;return auth},
  createGymCloudSync:options=>{
   const controller={user:options.uid,saved:[],closed:false,async open(){return options.freshState()},save(value){controller.saved.push(copy(value));storage.setItem(cache(options.uid),JSON.stringify(value))},async sync(){calls.sequence.push('sync')},snapshot:()=>({dirty:false}),close(){controller.closed=true}};
   calls.controllers.push(controller);return controller;
  }
 });
 const run=code=>vm.runInContext(code,context);
 vm.runInContext(read('cloud-api.js'),context,{filename:'cloud-api.js'});
 vm.runInContext(read('device-profiles.js'),context,{filename:'device-profiles.js'});
 vm.runInContext(source,context,{filename:'cloud-accounts.js'});
 const controller={saved:[],syncs:0,state:null,save(value){calls.sequence.push('save');storage.setItem(cache(ids[0]),JSON.stringify(value));controller.saved.push(copy(value));controller.state=copy(value)},async sync(){calls.sequence.push('sync');controller.syncs++},snapshot:()=>({dirty:false,state:controller.state?copy(controller.state):null}),close(){}};
 const api={async readState(uid,token){assert.equal(uid,ids[0]);assert.equal(token,'PRIVATE_ACCESS_TOKEN');calls.sequence.push('read');return null}};
 context.testUser=ana;context.testController=controller;context.testAuth=auth;context.testApi=api;
 function activate(user=ana){context.testUser=user;run('cloudMode=true;cloudReady=true;cloudBusy=false;cloudUser=testUser;cloudController=testController;cloudAuth=testAuth;cloudApi=testApi;S=freshCloudPlannerState(cloudUser)');controller.state=copy(context.S)}
 function dispatch(type,event){let stopped=false;const wrapped={preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){stopped=true},...event};for(const entry of [...(handlers.get(type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){entry.handler(wrapped);if(stopped)break}return wrapped}
 return {context,run,storage,calls,auth,controller,api,activate,nodes,handlers,windowHandlers,dispatch};
}
function file(value){return {text:async()=>JSON.stringify(value)}}
function inputTarget(dataset={}){return {id:'cloudEmail',dataset,value:'ana@example.com',matches:selector=>selector.includes('[data-cloud-field]'),closest:selector=>selector.includes('#cloudAuthForm')?{}:null,hasAttribute:()=>false}}

(async()=>{
 // A new account has its own name and empty weight history, with independent collections.
 const fresh=fixture({defaults:{...copy(actualDefaults),profileName:'Giancarlo',body:[{kg:92}]}});
 fresh.context.firstUser=ana;fresh.context.secondUser=luis;
 const first=fresh.run('freshCloudPlannerState(firstUser)'),second=fresh.run('freshCloudPlannerState(secondUser)');
 assert.equal(first.profileName,'Ana');assert.equal(second.profileName,'Luis');assert.deepEqual(copy(first.body),[]);assert.deepEqual(copy(second.body),[]);assert.equal(first.tab,'mas');
 first.done.exercise=true;first.schedule.wake='10:00';first.foodLog.push({text:'Only Ana'});
 assert.deepEqual(copy(second.done),{});assert.equal(second.schedule.wake,actualDefaults.schedule.wake);assert.deepEqual(copy(second.foodLog),[]);assert.deepEqual(fresh.context.defaults.body,[{kg:92}]);
 assert.equal(fresh.context.defaults.profileName,'Giancarlo');assert.equal(fresh.storage.writes.length,0);

 // Legacy saves target exactly the original key; account saves use only the captured controller.
 const saves=fixture(),beforeSaves=saves.storage.snapshot();saves.context.S=copy(legacy);saves.context.S.loads.bench='55';saves.context.savePlannerState();
 assert.equal(JSON.parse(saves.storage.getItem('mgp-v2')).loads.bench,'55');assert.deepEqual(saves.storage.writes.map(write=>write.key),['mgp-v2']);assert.equal(saves.storage.getItem(cache(ids[1])),beforeSaves[cache(ids[1])]);
 saves.activate();const ownerBefore=saves.storage.getItem('mgp-v2');saves.context.S.foodLog.push({text:'Only Ana'});saves.context.savePlannerState();assert.equal(saves.controller.saved.length,1);assert.equal(saves.storage.getItem('mgp-v2'),ownerBefore);assert.equal(saves.storage.writes.at(-1).key,cache(ids[0]));
 saves.run('cloudReady=false');const blockedBefore=saves.storage.snapshot();assert.throws(()=>saves.context.savePlannerState(),/Espera/);assert.deepEqual(saves.storage.snapshot(),blockedBefore);
 saves.run("cloudMode=false;legacyLoadError='Corrupt legacy'");assert.throws(()=>saves.context.savePlannerState(),/Espera/);assert.deepEqual(saves.storage.snapshot(),blockedBefore);
 // Navigation is local view state, not a dirty account generation. A record
 // change still goes to this UUID's controller once, even after browsing.
 const view=fixture();view.activate();const viewBefore=view.storage.snapshot();view.context.S.tab='rutina';view.context.S.day=3;view.context.S.week=8;view.context.savePlannerState();
 const viewKey='mgp-cloud-view-v1:gym-project.supabase.co:'+ids[0];assert.equal(view.controller.saved.length,0);assert.deepEqual(JSON.parse(view.storage.getItem(viewKey)),{tab:'rutina',day:3,week:8});assert.equal(view.storage.getItem('mgp-v2'),viewBefore['mgp-v2']);assert.equal(view.storage.getItem(cache(ids[1])),viewBefore[cache(ids[1])]);
 view.context.S.loads.bench='60';view.context.savePlannerState();assert.equal(view.controller.saved.length,1);view.context.S.tab='inicio';view.context.savePlannerState();assert.equal(view.controller.saved.length,1);

 // Restores reject malformed backups and never replace S before persistence succeeds.
 for(const data of [null,[],{}, {...legacy,done:[]},{...legacy,schedule:null}]){
  const invalid=fixture();const original=invalid.context.S,before=invalid.storage.snapshot();await invalid.context.restorePlannerAccount(file(data));
  assert.equal(invalid.context.S,original);assert.deepEqual(invalid.storage.snapshot(),before);assert.equal(invalid.calls.confirms.length,0);assert.match(invalid.run('cloudError'),/respaldo válido/);
 }
 for(const cloud of [false,true]){
  const limited=fixture();if(cloud)limited.activate();
  limited.context.foodDraft.text='Do not lose my draft';limited.context.foodDrafts.set('date:0',{text:'Another draft'});
  const original=limited.context.S,before=limited.storage.snapshot();limited.storage.fail=cloud?cache(ids[0]):'mgp-v2';
  await limited.context.restorePlannerAccount(file({...legacy,loads:{...legacy.loads,newLoad:'65'}}));assert.equal(limited.context.S,original);assert.deepEqual(limited.storage.snapshot(),before);assert.equal(limited.context.foodDraft.text,'Do not lose my draft');assert.equal(limited.context.foodDrafts.size,1);assert.match(limited.run('cloudError'),/QuotaExceeded|No se pudo guardar/);
 }
 const restored=fixture();restored.activate();const original=restored.context.S,oldLegacy=restored.storage.getItem('mgp-v2'),otherBefore=restored.storage.getItem(cache(ids[1]));
 const save=restored.controller.save;restored.controller.save=value=>{assert.equal(restored.context.S,original,'Persist the candidate before replacing the rendered state');assert.equal(value.profileName,'Ana');save(value)};
 restored.context.foodDraft.text='Saved only after successful restore';await restored.context.restorePlannerAccount(file(legacy));
 assert.notEqual(restored.context.S,original);assert.equal(restored.context.S.profileName,'Ana');assert.equal(restored.context.S.body[0].kg,92);assert.equal(restored.context.S.loads['1-0-0'],'50');assert.equal(restored.context.S.closedDays['2026-10-14'],'owner-close');assert.equal(restored.context.foodDraft.text,'');assert.equal(restored.storage.getItem('mgp-v2'),oldLegacy);assert.equal(restored.storage.getItem(cache(ids[1])),otherBefore);
 const deviceRestore=fixture(),deviceBefore=deviceRestore.storage.getItem(cache(ids[1]));await deviceRestore.context.restorePlannerAccount(file({...legacy,profileName:'Restored device'}));assert.equal(deviceRestore.context.S.profileName,'Restored device');assert.equal(JSON.parse(deviceRestore.storage.getItem('mgp-v2')).profileName,'Restored device');assert.equal(deviceRestore.storage.getItem(cache(ids[1])),deviceBefore);

 // File reads capture account identity: a late file cannot overwrite a different account.
 const switched=fixture();switched.activate();const pendingFile=deferred(),pendingRestore=switched.context.restorePlannerAccount({text:()=>pendingFile.promise});
 switched.context.testUser=luis;switched.run('cloudUser=testUser;S=freshCloudPlannerState(cloudUser)');const luisState=switched.context.S,beforeSwitch=switched.storage.snapshot();pendingFile.resolve(JSON.stringify(legacy));await pendingRestore;
 assert.equal(switched.context.S,luisState);assert.deepEqual(switched.storage.snapshot(),beforeSwitch);assert.equal(switched.controller.saved.length,0);assert.match(switched.run('cloudError'),/cuenta cambió/);
 const switchedMode=fixture(),modeFile=deferred(),modeRestore=switchedMode.context.restorePlannerAccount({text:()=>modeFile.promise});switchedMode.activate();const afterMode=switchedMode.context.S;modeFile.resolve(JSON.stringify(legacy));await modeRestore;assert.equal(switchedMode.context.S,afterMode);assert.equal(switchedMode.controller.saved.length,0);

 // Importing the old device records is an explicit action, following a successful remote read.
 const implicit=fixture();implicit.activate();const implicitBefore=implicit.storage.snapshot();implicit.context.renderCloudAccountCard();assert.deepEqual(implicit.storage.snapshot(),implicitBefore);assert.equal(implicit.controller.saved.length,0);
 const failedRead=fixture();failedRead.activate();failedRead.api.readState=async()=>{throw Error('Remote unavailable')};const failedReadState=failedRead.context.S,failedReadBefore=failedRead.storage.snapshot();await failedRead.context.importDeviceRecords();assert.equal(failedRead.context.S,failedReadState);assert.deepEqual(failedRead.storage.snapshot(),failedReadBefore);assert.equal(failedRead.calls.confirms.length,0);assert.equal(failedRead.controller.saved.length,0);assert.match(failedRead.run('cloudError'),/Remote unavailable/);
 for(const remoteExisting of [false,true]){
  const existing=fixture();existing.activate();if(remoteExisting)existing.api.readState=async()=>({state:{...copy(legacy),profileName:'Ana'},revision:4});else existing.context.S.foodLog.push({text:'Account already in use'});
  const before=existing.storage.snapshot(),state=existing.context.S;await existing.context.importDeviceRecords();assert.deepEqual(existing.storage.snapshot(),before);assert.equal(existing.context.S,state);assert.equal(existing.controller.saved.length,0);assert.equal(existing.calls.confirms.length,0);assert.match(existing.run('cloudError'),/ya tiene registros/);
 }
 const canceled=fixture();canceled.activate();canceled.context.confirm=()=>false;const cancelState=canceled.context.S;await canceled.context.importDeviceRecords();assert.equal(canceled.context.S,cancelState);assert.equal(canceled.controller.saved.length,0);
 const imported=fixture();imported.activate();const importOwner=imported.storage.getItem('mgp-v2'),importOther=imported.storage.getItem(cache(ids[1]));await imported.context.importDeviceRecords();
 assert.deepEqual(imported.calls.sequence,['sync','token','read','confirm','save','sync']);assert.equal(imported.controller.saved.length,1);assert.equal(imported.context.S.profileName,'Ana');assert.equal(imported.context.S.foodLog[0].text,'Pollo con arroz');assert.equal(imported.context.S.body[0].kg,92);assert.equal(imported.context.S.loads['1-0-0'],'50');assert.equal(imported.storage.getItem('mgp-v2'),importOwner);assert.equal(importOwner,legacyRaw);assert.equal(imported.storage.getItem(cache(ids[1])),importOther);
 const draftImport=fixture();draftImport.activate();draftImport.context.foodDrafts.set('breakfast',{text:'Unsaved meal'});await draftImport.context.importDeviceRecords();assert.equal(draftImport.controller.syncs,0);assert.equal(draftImport.controller.saved.length,0);assert.match(draftImport.run('cloudError'),/sin guardar/);
 // Each await in the import is pinned to the same session/controller. A late
 // response cannot copy the owner's history into another account or new session.
 for(const phase of ['sync','token','read']){
  const late=fixture();late.activate();const gate=deferred(),entered=deferred();
  if(phase==='sync')late.controller.sync=async()=>{entered.resolve();await gate.promise};
  if(phase==='token')late.auth.getToken=async()=>{entered.resolve();await gate.promise;return 'PRIVATE_ACCESS_TOKEN'};
  if(phase==='read')late.api.readState=async()=>{entered.resolve();await gate.promise;return null};
  const importing=late.context.importDeviceRecords();await entered.promise;
  late.context.testUser=luis;late.run('cloudAccountEpoch++;cloudUser=testUser;S=freshCloudPlannerState(cloudUser);cloudBusy=false;cloudError="New session message"');
  const state=late.context.S,before=late.storage.snapshot();gate.resolve();await importing;
  assert.equal(late.context.S,state);assert.deepEqual(late.storage.snapshot(),before);assert.equal(late.controller.saved.length,0);assert.equal(late.calls.confirms.length,0);assert.equal(late.run('cloudError'),'New session message');
 }

 // Normal export includes the selected planner only, never other caches or Auth tokens.
 const exported=fixture({values:{'mgp-auth-session':'PRIVATE_REFRESH_TOKEN'}});exported.activate();exported.context.S.foodLog.push({text:'Only Ana'});
 exported.context.downloadPlannerJSON=(value,filename)=>exported.calls.downloads.push({value:copy(value),filename});exported.context.exportPlannerAccount();
 assert.equal(exported.calls.downloads.length,1);assert.deepEqual(exported.calls.downloads[0].value,copy(exported.context.S));assert.equal(exported.calls.downloads[0].filename,'mi-gym-planner-ana-respaldo.json');
 const exportedText=JSON.stringify(exported.calls.downloads);assert.doesNotMatch(exportedText,/PRIVATE_|Giancarlo|privateOtherUser|mgp-auth-session|access_token|refresh_token/);
 // A recovery download is also scoped: a broken device installation never
 // gathers cached accounts belonging to other people who used this browser.
 const recovery=fixture({values:{[cache(ids[0])]:'OWN_CACHED_STATE',[cache(ids[0])+':recovery:one']:'OWN_RECOVERY_STATE','mgp-auth-session':'PRIVATE_REFRESH_TOKEN'}});
 recovery.context.downloadPlannerJSON=(value,filename)=>recovery.calls.downloads.push({value:copy(value),filename});recovery.context.exportPlannerRecovery();
 assert.deepEqual(recovery.calls.downloads[0].value.records,{'mgp-v2':legacyRaw});recovery.activate();recovery.context.exportPlannerRecovery();
 assert.deepEqual(recovery.calls.downloads[1].value.records,{[cache(ids[0])]:'OWN_CACHED_STATE',[cache(ids[0])+':recovery:one']:'OWN_RECOVERY_STATE'});
 recovery.auth.currentUser=()=>luis;recovery.context.exportPlannerRecovery();assert.deepEqual(recovery.calls.downloads[2].value.records,{});

 // Account text is escaped in markup, including attributes and error messages.
 const html=fixture();html.activate();html.context.S.profileName='<img src=x onerror=alert(1)>';html.context.testUser={...ana,email:'"><svg onload=alert(2)>'};html.run('cloudUser=testUser;cloudError="<script>alert(3)</script>"');
 let markup=html.context.renderCloudAccountCard();assert.ok(markup.includes('&lt;img'));assert.ok(markup.includes('&quot;&gt;&lt;svg'));assert.ok(markup.includes('&lt;script&gt;'));assert.doesNotMatch(markup,/<img|<script|<svg onload/);
 html.context.testEmail='" autofocus onfocus=alert(1) x="';html.run('cloudReady=false;cloudAuthView="signup";cloudEmail=testEmail');markup=html.context.cloudAccountForm();assert.ok(markup.includes('value="&quot; autofocus'));assert.doesNotMatch(markup,/value="" autofocus/);

 // Missing config advertises pending activation and never creates pretend accounts.
 const unconfigured=fixture({configured:false});unconfigured.run('cloudAuthView="signup"');markup=unconfigured.context.renderCloudAccountCard();assert.match(markup,/pendiente de activar/);assert.match(markup,/data-cloud-auth="signin" disabled/);assert.match(markup,/data-cloud-auth="signup" disabled/);assert.match(unconfigured.context.cloudAccountForm(),/id="cloudEmail"[^>]*disabled/);
 const form={querySelector(selector){return {value:selector==='#cloudEmail'?'ana@example.com':selector==='#cloudName'?'Ana':'password123'}}};const noConfigBefore=unconfigured.storage.snapshot();await unconfigured.context.submitCloudAuth(form);assert.equal(unconfigured.calls.authCreated,0);assert.equal(unconfigured.calls.reloads,0);assert.equal(unconfigured.calls.controllers.length,0);assert.deepEqual(unconfigured.storage.snapshot(),noConfigBefore);assert.equal(unconfigured.run('cloudReady'),false);assert.match(unconfigured.run('cloudError'),/configurar/);
 const confirmation=fixture();confirmation.run('cloudAuthView="signup"');const confirmBefore=confirmation.storage.snapshot();await confirmation.context.submitCloudAuth(form);assert.equal(confirmation.calls.controllers.length,0);assert.equal(confirmation.calls.reloads,0);assert.deepEqual(confirmation.storage.snapshot(),confirmBefore);assert.equal(confirmation.run('cloudReady'),false);assert.match(confirmation.run('cloudFormMessage'),/confirmar/);
 const loggedIn=fixture();loggedIn.context.window.sessionStorage.setItem('mgp-cloud-require-login-v1','1');loggedIn.run('cloudAuthView="signin"');await loggedIn.context.submitCloudAuth(form);
 assert.equal(loggedIn.calls.reloads,1);assert.equal(loggedIn.context.window.sessionStorage.getItem('mgp-cloud-require-login-v1'),null);assert.equal(loggedIn.storage.getItem('mgp-cloud-mode-v1'),'cloud');assert.equal(loggedIn.storage.getItem('mgp-v2'),legacyRaw);assert.equal(loggedIn.calls.controllers.length,1);assert.equal(loggedIn.calls.controllers[0].closed,true);assert.equal(loggedIn.calls.controllers[0].saved.length,0);
 // Closing an older tab cannot automatically reopen somebody else's newly
 // stored session when the page reloads, including when network logout fails.
 const logout=fixture();logout.activate();logout.auth.signOut=async()=>{throw Error('Offline sign out')};const logoutBefore=logout.storage.snapshot();await logout.context.logoutPlannerAccount();assert.equal(logout.run('cloudReady'),false);assert.equal(logout.context.window.sessionStorage.getItem('mgp-cloud-require-login-v1'),'1');assert.deepEqual(logout.storage.snapshot(),logoutBefore);
 let resumed=0;logout.auth.resume=async()=>{resumed++;return luis};await logout.context.startCloudAccounts();assert.equal(resumed,0);assert.equal(logout.run('cloudReady'),false);assert.equal(logout.calls.welcomes.length,0);

 // Malformed remote structures remain recoverable; opening must not substitute
 // an empty account or overwrite the saved legacy/current cache.
 for(const malformed of [{...copy(actualDefaults),foodLog:null},{...copy(actualDefaults),body:[42]},{...copy(actualDefaults),dayHistory:[{}]},{...copy(actualDefaults),week:0}]){
  const bad=fixture({values:{[cache(ids[0])]:'KEEP_THIS_CORRUPT_COPY'}});bad.activate();bad.run('cloudReady=false');const before=bad.storage.snapshot(),state=bad.context.S;
  bad.context.createGymCloudSync=()=>({open:async()=>malformed,close(){}});await bad.context.startCloudAccounts();
  assert.equal(bad.run('cloudReady'),false);assert.equal(bad.context.S,state);assert.deepEqual(bad.storage.snapshot(),before);assert.equal(bad.calls.welcomes.length,0);assert.match(bad.run('cloudError'),/formato inesperado/);
 }

 // The actual sync adapter validates remote planner structures before a sync
 // implementation can replace a good cache, and captures its Auth/API/user.
 const adapter=fixture({values:{[cache(ids[0])]:'VALID_CACHE_MUST_SURVIVE'}});adapter.activate();let syncOptions;
 const normalizer=adapter.context.normalizeCloudPlannerState,normalizedUsers=[];
 adapter.context.normalizeCloudPlannerState=(state,user)=>{normalizedUsers.push(user.id);const normalized=normalizer(state,user);assert.equal(normalized.profileName,'Ana');return normalized};
 adapter.context.createGymCloudSync=options=>{
  syncOptions=options;
  return {async open(){const row=await options.api.readState(options.uid,await options.getToken());if(row)options.storage.setItem(cache(options.uid),JSON.stringify(row.state));return row?.state||options.freshState()},close(){}};
 };
 const originalApi=adapter.api,originalAuth=adapter.auth,delegated=[];
 let response={state:{...copy(actualDefaults),profileName:undefined,foodLog:null},revision:4,updatedAt:'2026-10-15T15:00:00Z'};
 originalAuth.getToken=async()=>{delegated.push('original-token');return 'CAPTURED_TOKEN'};
 originalApi.readState=async function(uid,token){assert.equal(this,originalApi);assert.equal(uid,ids[0]);assert.equal(token,'CAPTURED_TOKEN');return response};
 originalApi.insertState=async function(...args){assert.equal(this,originalApi);delegated.push({method:'insert',args});return 'INSERT_RESULT'};
 originalApi.updateState=async function(...args){assert.equal(this,originalApi);delegated.push({method:'update',args});return 'UPDATE_RESULT'};
 const adapted=adapter.context.newCloudController(ana);const adapterBefore=adapter.storage.snapshot();
 adapter.context.otherApi={readState(){throw Error('Wrong API was used')},insertState(){throw Error('Wrong API was used')},updateState(){throw Error('Wrong API was used')}};
 adapter.context.otherAuth={getToken(){throw Error('Wrong account token was used')}};adapter.context.testUser=luis;adapter.run('cloudApi=otherApi;cloudAuth=otherAuth;cloudUser=testUser');
 await assert.rejects(()=>adapted.open(),/formato inesperado/);assert.deepEqual(adapter.storage.snapshot(),adapterBefore);assert.equal(syncOptions.uid,ids[0]);assert.equal(syncOptions.freshState().profileName,'Ana');
 response={state:{done:{},schedule:{}},revision:5,updatedAt:'2026-10-15T16:00:00Z'};const originalRow=response;
 const checked=await syncOptions.api.readState(ids[0],'CAPTURED_TOKEN');assert.equal(checked,originalRow,'Validation does not alter the server JSON used for canonical equality');assert.equal(Object.hasOwn(checked.state,'profileName'),false);assert.deepEqual(normalizedUsers,[ids[0],ids[0]]);
 assert.equal(await syncOptions.getToken(),'CAPTURED_TOKEN');assert.equal(await syncOptions.api.insertState(ids[0],legacy,'CAPTURED_TOKEN'),'INSERT_RESULT');assert.equal(await syncOptions.api.updateState(ids[0],5,legacy,'CAPTURED_TOKEN'),'UPDATE_RESULT');
 assert.deepEqual(delegated.filter(value=>typeof value==='object'),[{method:'insert',args:[ids[0],legacy,'CAPTURED_TOKEN']},{method:'update',args:[ids[0],5,legacy,'CAPTURED_TOKEN']}]);
 response=null;assert.equal(await syncOptions.api.readState(ids[0],'CAPTURED_TOKEN'),null);assert.deepEqual(adapter.storage.snapshot(),adapterBefore);

 // Loading an explicitly selected cloud version hides and blocks the old
 // planner throughout the await; status callbacks must not expose a half swap.
 function replacement(){
  const item=fixture();item.activate();const gate=deferred();let options,closes=0;
  item.context.createGymCloudSync=value=>{options=value;return item.controller};item.run('cloudController=newCloudController(cloudUser,{active:true})');
  item.controller.useRemote=()=>gate.promise;item.controller.close=()=>closes++;
  item.context.downloadPlannerJSON=(value,filename)=>item.calls.downloads.push({value:copy(value),filename});item.context.attachCloudAccounts();
  return {...item,gate,options,getCloses:()=>closes};
 }
 const replacing=replacement(),replaceState=replacing.context.S,replaceBefore=replacing.storage.snapshot();let mutations=0;
 for(const type of ['input','change','click','submit'])replacing.context.document.addEventListener(type,()=>mutations++);
 const replacementPending=replacing.context.useCloudVersion();assert.equal(replacing.run('cloudReplacing'),true);assert.equal(replacing.run('cloudBusy'),true);assert.equal(replacing.context.cloudPageBlocked(),true);assert.match(replacing.context.renderCloudGate(),/Actualizando tus registros/);assert.equal(replacing.calls.downloads.length,1);
 for(const type of ['input','change','click','submit']){
  const event=replacing.dispatch(type,{target:{id:type==='submit'?'foodForm':'exerciseWeight',dataset:{ex:'0',load:'0'},closest:()=>null}});assert.equal(event.defaultPrevented,true);
 }
 assert.equal(mutations,0);assert.throws(()=>replacing.context.savePlannerState(),/Espera/);assert.deepEqual(replacing.storage.snapshot(),replaceBefore);
 replacing.options.onStatus({kind:'synced',stateChanged:true,state:{...copy(actualDefaults),profileName:'New remote name'}});assert.equal(replacing.context.S,replaceState);assert.equal(replacing.run('cloudReady'),true);
 replacing.gate.resolve(copy(actualDefaults));await replacementPending;assert.equal(replacing.getCloses(),1);assert.equal(replacing.calls.reloads,1);assert.equal(replacing.context.S,replaceState);
 const replaceFailure=replacement(),failureState=replaceFailure.context.S,failing=replaceFailure.context.useCloudVersion();replaceFailure.gate.reject(Error('Could not read selected cloud version'));await failing;
 assert.equal(replaceFailure.run('cloudReplacing'),false);assert.equal(replaceFailure.run('cloudBusy'),false);assert.equal(replaceFailure.run('cloudReady'),true);assert.equal(replaceFailure.context.cloudPageBlocked(),false);assert.equal(replaceFailure.context.S,failureState);assert.equal(replaceFailure.calls.reloads,0);assert.equal(replaceFailure.getCloses(),0);assert.match(replaceFailure.run('cloudError'),/Could not read selected/);
 for(const outcome of ['resolve','reject']){
  const late=replacement(),pending=late.context.useCloudVersion();let newCloses=0;
  late.context.replacementController={close(){newCloses++}};late.context.testUser=luis;late.run('cloudAccountEpoch++;cloudUser=testUser;cloudController=replacementController;cloudReplacing=false;cloudBusy=false;cloudReady=true;cloudError="New account stays editable";S=freshCloudPlannerState(cloudUser)');
  const state=late.context.S,before=late.storage.snapshot();late.options.onStatus({kind:'synced',stateChanged:true,state:{...copy(actualDefaults),profileName:'Old account'}});
  if(outcome==='resolve')late.gate.resolve(copy(actualDefaults));else late.gate.reject(Error('Late failure from old account'));await pending;
  assert.equal(late.context.S,state);assert.equal(late.context.S.profileName,'Luis');assert.equal(late.calls.reloads,0);assert.equal(newCloses,0);assert.equal(late.run('cloudReplacing'),false);assert.equal(late.run('cloudBusy'),false);assert.equal(late.run('cloudReady'),true);assert.equal(late.run('cloudError'),'New account stays editable');assert.deepEqual(late.storage.snapshot(),before);
 }
 const unsaved=fixture();unsaved.activate();unsaved.context.attachCloudAccounts();unsaved.context.S.loads.bench='65';unsaved.run('cloudStatus={kind:"error",saveFailed:true}');
 let unloadPrevented=false;const unload={preventDefault(){unloadPrevented=true}};for(const handler of unsaved.windowHandlers.get('beforeunload'))handler(unload);assert.equal(unloadPrevented,true);assert.equal(unload.returnValue,'');
 const unsavedBefore=unsaved.storage.snapshot();await unsaved.context.logoutPlannerAccount();await unsaved.context.importDeviceRecords();await unsaved.context.useCloudVersion();assert.equal(unsaved.calls.reloads,0);assert.equal(unsaved.controller.syncs,0);assert.equal(unsaved.run('cloudReady'),true);assert.deepEqual(unsaved.storage.snapshot(),unsavedBefore);
 await unsaved.context.syncPlannerAccount();assert.deepEqual(unsaved.calls.sequence,['save','sync']);assert.equal(unsaved.controller.saved[0].loads.bench,'65');

 // The actual generic listeners ignore auth fields and a blocked page stops app mutations.
 const events=fixture();let saved=0,rendered=0;events.context.save=()=>saved++;events.context.render=()=>rendered++;events.context.closedMutation=()=>false;
 const generalChange=index.match(/document\.addEventListener\('change',async e=>\{[\s\S]*?\}\);(?=document\.addEventListener\('input')/);assert.ok(generalChange,'Found actual generic change listener');vm.runInContext(generalChange[0],events.context);
 const eventState=JSON.stringify(events.context.S);await events.handlers.get('change')[0].handler({target:inputTarget()});assert.equal(saved,0);assert.equal(rendered,0);assert.equal(JSON.stringify(events.context.S),eventState);
 events.context.attachCloudAccounts();events.run('cloudMode=true;cloudReady=false');const unauthorized=events.dispatch('change',{target:{closest:()=>null}});assert.equal(unauthorized.defaultPrevented,true);assert.equal(saved,0);const allowed=events.dispatch('change',{target:inputTarget()});assert.equal(allowed.defaultPrevented,undefined);assert.equal(saved,0);
 const generalInput=index.match(/document\.addEventListener\('input',e=>\{[\s\S]*?\}\);(?=attachFoodInteractions)/);assert.ok(generalInput,'Found actual generic input listener');vm.runInContext(generalInput[0],events.context);events.run('cloudMode=false');events.dispatch('input',{target:inputTarget()});assert.equal(saved,0);
 // Automatic foreground/network checks must not replace a field being typed.
 const foreground=fixture();foreground.activate();foreground.context.attachCloudAccounts();
 for(const tagName of ['INPUT','TEXTAREA','SELECT']){
  foreground.context.document.activeElement={tagName};foreground.dispatch('visibilitychange',{});for(const handler of foreground.windowHandlers.get('online'))handler();assert.equal(foreground.controller.syncs,0);
 }
 foreground.context.document.activeElement={tagName:'BUTTON'};foreground.context.foodDraft.text='Unsaved meal';foreground.dispatch('visibilitychange',{});for(const handler of foreground.windowHandlers.get('online'))handler();assert.equal(foreground.controller.syncs,0);
 foreground.context.foodDraft.text='';foreground.context.document.hidden=true;foreground.dispatch('visibilitychange',{});assert.equal(foreground.controller.syncs,0);foreground.context.document.hidden=false;foreground.dispatch('visibilitychange',{});assert.equal(foreground.controller.syncs,1);

 // Confirmation URL tokens are removed, and cannot act as an authenticated session.
 const callback=fixture();callback.context.window.location.hash='#access_token=PRIVATE_ACCESS_TOKEN&refresh_token=PRIVATE_REFRESH_TOKEN';callback.context.prepareCloudAccounts();assert.equal(callback.calls.history.length,1);assert.equal(callback.calls.history[0][2],'/mi-gym-planner/');assert.equal(callback.run('cloudReady'),false);assert.equal(callback.calls.authCreated,0);

 // Actual boot initializer and renderer must isolate a remembered cloud session
 // before asynchronous resume/open: no owner view or welcome can flash underneath.
 const boot=fixture({values:{'mgp-cloud-mode-v1':'cloud'}});
 const initializer=index.match(/const defaults=[\s\S]*?(?=let timer=)/);assert.ok(initializer,'Found actual state initializer');vm.runInContext(initializer[0],boot.context);
 boot.context.prepareCloudAccounts();assert.equal(boot.run('cloudMode'),true);assert.notEqual(boot.run('S.profileName'),'Giancarlo');assert.deepEqual(copy(boot.run('S.body')),[]);assert.deepEqual(copy(boot.run('S.done')),{});assert.equal(boot.storage.reads.includes('mgp-v2'),false);
 const resumeGate=deferred();boot.auth.resume=()=>resumeGate.promise;
 const actualRender=index.match(/function render\(\)\{[\s\S]*?\}\n(?=document\.addEventListener\('click')/);assert.ok(actualRender,'Found actual page renderer');
 boot.context.$=selector=>boot.nodes.get(selector);boot.context.nav=()=>{};boot.context.applyClosedControls=()=>{};for(const name of ['renderHome','renderDay','renderRoutine','renderFoods','renderWellbeing','renderProgress','renderCalendar','renderMore'])boot.context[name]=()=>'<p>Own planner</p>';
 vm.runInContext(actualRender[0],boot.context);boot.context.render();assert.match(boot.nodes.get('#root').innerHTML,/Abre tu cuenta/);assert.doesNotMatch(boot.nodes.get('#root').innerHTML,/Giancarlo|owner-food|Pollo con arroz/);
 const starting=boot.context.startCloudAccounts();assert.equal(boot.calls.welcomes.length,0);assert.equal(boot.run('cloudReady'),false);resumeGate.resolve(ana);await starting;
 assert.equal(boot.run('cloudReady'),true,boot.run('cloudError'));assert.equal(boot.run('S.profileName'),'Ana');assert.deepEqual(copy(boot.run('S.body')),[]);assert.equal(boot.calls.welcomes.length,1);assert.equal(boot.calls.welcomes[0].ready,true);assert.equal(boot.calls.welcomes[0].state.profileName,'Ana');assert.equal(boot.storage.getItem('mgp-v2'),legacyRaw);assert.equal(boot.storage.writes.length,0);
 console.log('PASS: UI de cuentas, destinos y navegación, restore/cuota, importación explícita, export seguro, adapter validado/capturado, reemplazo bloqueado y respuestas tardías, reintento de guardado, escapes/configuración/listeners y arranque sin legado.');
})().catch(error=>{console.error(error);process.exitCode=1});
