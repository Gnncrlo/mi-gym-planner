// Authenticated account isolation and CAS synchronization without network or browser dependencies.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({setTimeout,clearTimeout,Date});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cloud-sync.js'),'utf8'),context,{filename:'cloud-sync.js'});
const createSync=context.createGymCloudSync,copy=value=>JSON.parse(JSON.stringify(value));
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const project='gym-project',key=uid=>`mgp-cloud-v1:${project}:${uid}`;
const fresh=()=>({profileName:'',done:{},loads:{},reps:{},body:[],meals:{},foodLog:[],closedDays:{},dayHistory:[]});
const meal=(name,text)=>({...fresh(),profileName:name,foodLog:[{id:'food',date:'2026-10-15',type:0,text}],meals:{'2026-10-15':{0:true}}});
const wrapper=(uid,state,{baseRevision=1,dirty=false,generation=0}={})=>({version:1,uid,state,baseRevision,dirty,generation});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class MemoryStorage{
 constructor(initial={}){this.values=new Map(Object.entries(initial));this.writes=[];this.fail=null}
 getItem(name){return this.values.has(name)?this.values.get(name):null}
 setItem(name,value){if(this.fail?.(name,value))throw Object.assign(new Error('QuotaExceeded'),{name:'QuotaExceededError'});this.values.set(name,String(value));this.writes.push({key:name,value:String(value)})}
 snapshot(){return Object.fromEntries(this.values)}
}
class Backend{
 constructor(initial={}){this.rows=new Map(Object.entries(copy(initial)));this.calls=[];this.offline=false;this.readError=null;this.blockRead=null;this.blockWrite=null;this.writeStarted=null}
 check(uid,token){assert(ids.includes(uid),'Only the captured authenticated UID reaches the backend');assert.equal(token,'token:'+uid);if(this.offline)throw new Error('Offline')}
 async readState(uid,token){this.check(uid,token);this.calls.push({method:'read',uid});if(this.readError)throw this.readError;if(this.blockRead){const barrier=this.blockRead;this.blockRead=null;await barrier.promise}return this.rows.has(uid)?copy(this.rows.get(uid)):null}
 async insertState(uid,state,token){return this.write('insert',uid,0,state,token)}
 async updateState(uid,revision,state,token){return this.write('update',uid,revision,state,token)}
 async write(method,uid,revision,state,token){
  this.check(uid,token);this.calls.push({method,uid,revision,state:copy(state)});this.writeStarted?.();
  if(this.blockWrite){const barrier=this.blockWrite;this.blockWrite=null;await barrier.promise}
  const existing=this.rows.get(uid);
  if((method==='insert'&&existing)||(method==='update'&&(!existing||existing.revision!==revision)))throw Object.assign(new Error('Conflict'),{code:'CONFLICT'});
  const row={state:copy(state),revision:revision+1,updatedAt:'2026-10-15T12:00:00Z'};this.rows.set(uid,row);return copy(row);
 }
}
function fixture({uid=ids[0],projectId=project,storage=new MemoryStorage(),backend=new Backend(),getToken=async()=> 'token:'+uid,freshState=fresh}={}){
 const statuses=[],timers=new Map();let timerId=0;
 const sync=createSync({uid,projectId,storage,api:backend,getToken,freshState,onStatus:status=>statuses.push(copy(status)),setTimeoutImpl:fn=>{timers.set(++timerId,fn);return timerId},clearTimeoutImpl:id=>timers.delete(id)});
 return {sync,storage,backend,statuses,timers};
}
const hasCode=code=>error=>error.code===code;

(async()=>{
 // New accounts never import a device owner's legacy records, name, or initial weight.
 const legacy=JSON.stringify({...meal('Giancarlo','Pollo'),body:[{date:'2026-10-15',kg:92}],loads:{bench:'50'},reps:{bench:'12'},done:{bench:true},closedDays:{'2026-10-15':'closed'}});
 const shared=new MemoryStorage({'mgp-v2':legacy}),backend=new Backend(),anna=fixture({storage:shared,backend}),luis=fixture({uid:ids[1],storage:shared,backend});
 assert.deepEqual(copy(await anna.sync.open()),fresh());assert.deepEqual(copy(await luis.sync.open()),fresh());assert.equal(shared.getItem('mgp-v2'),legacy);assert.equal(backend.calls.filter(call=>call.method!=='read').length,0);
 anna.sync.save(meal('Ana','Avena'));await anna.sync.sync();luis.sync.save(meal('Luis','Pan con huevo'));await luis.sync.sync();
 assert.equal(backend.rows.get(ids[0]).state.profileName,'Ana');assert.equal(backend.rows.get(ids[1]).state.profileName,'Luis');assert.equal(shared.getItem('mgp-v2'),legacy);
 assert(shared.writes.every(write=>write.key===key(ids[0])||write.key===key(ids[1])));assert.equal(anna.sync.dataKey,key(ids[0]));
 const exported=anna.sync.exportState();exported.foodLog[0].text='Mutated outside';assert.equal(anna.sync.exportState().foodLog[0].text,'Avena');const snapshot=anna.sync.snapshot();snapshot.state.meals={};assert.deepEqual(copy(anna.sync.snapshot().state.meals),{'2026-10-15':{0:true}});

 // Real Supabase hostnames and local ports retain independent project/account caches.
 const hostStorage=new MemoryStorage(),hostA=fixture({projectId:'project.supabase.co',storage:hostStorage}),hostB=fixture({projectId:'other.supabase.co',storage:hostStorage}),localHost=fixture({projectId:'localhost:54321',storage:hostStorage});
 await hostA.sync.open();await hostB.sync.open();await localHost.sync.open();hostA.sync.save(meal('Ana','Proyecto A'));await hostA.sync.sync();hostB.sync.save(meal('Ana','Proyecto B'));await hostB.sync.sync();
 assert.equal(hostA.sync.dataKey,`mgp-cloud-v1:project.supabase.co:${ids[0]}`);assert.equal(hostB.sync.dataKey,`mgp-cloud-v1:other.supabase.co:${ids[0]}`);assert.equal(localHost.sync.dataKey,`mgp-cloud-v1:localhost:54321:${ids[0]}`);
 assert.equal(JSON.parse(hostStorage.getItem(hostA.sync.dataKey)).state.foodLog[0].text,'Proyecto A');assert.equal(JSON.parse(hostStorage.getItem(hostB.sync.dataKey)).state.foodLog[0].text,'Proyecto B');assert.equal(JSON.stringify(hostStorage.snapshot()).includes('token:'),false,'Access tokens never enter account state caches');assert.equal(JSON.stringify(hostA.statuses).includes('token:'),false);

 // Valid cached records survive offline opening, editing, reload, and eventual reconnect.
 const offline=fixture();await offline.sync.open();offline.backend.offline=true;offline.sync.save(meal('Ana','Quinua'));const pendingRaw=offline.storage.getItem(key(ids[0]));await offline.sync.sync();assert.equal(offline.sync.snapshot().dirty,true);assert.equal(offline.statuses.at(-1).kind,'offline');offline.sync.close();
 const reload=fixture({storage:offline.storage,backend:offline.backend});assert.equal((await reload.sync.open()).foodLog[0].text,'Quinua');assert.equal(reload.storage.getItem(key(ids[0])),pendingRaw);reload.backend.offline=false;await reload.sync.sync();assert.equal(reload.sync.snapshot().dirty,false);assert.equal(reload.backend.rows.get(ids[0]).state.foodLog[0].text,'Quinua');

 // A failed GET (including an expired session) must never be interpreted as an empty account.
 const unauthorized=fixture({freshState:()=>{throw new Error('Must not create an empty state')}});unauthorized.backend.readError=Object.assign(new Error('Unauthorized'),{status:401});await assert.rejects(unauthorized.sync.open(),hasCode('REMOTE_READ_FAILED'));assert.deepEqual(unauthorized.storage.snapshot(),{});assert.equal(unauthorized.backend.calls.filter(call=>call.method!=='read').length,0);
 const knownState=meal('Ana','Yogur'),cached401=fixture({storage:new MemoryStorage({[key(ids[0])]:JSON.stringify(wrapper(ids[0],knownState))}),backend:unauthorized.backend});assert.deepEqual(copy(await cached401.sync.open()),knownState);assert.equal(cached401.statuses.at(-1).kind,'offline');assert.equal(cached401.storage.writes.length,0);

 // An acknowledgement applies only to the uploaded generation, not later edits.
 const during=fixture();await during.sync.open();during.sync.save(meal('Ana','Primero'));const gate=deferred(),started=deferred();during.backend.blockWrite=gate;during.backend.writeStarted=()=>started.resolve();const upload=during.sync.sync();assert.equal(during.sync.sync(),upload,'Only one synchronization runs at a time');await started.promise;during.sync.save(meal('Ana','Segundo'));assert.equal(during.sync.snapshot().generation,2);gate.resolve();await upload;
 assert.equal(during.backend.rows.get(ids[0]).state.foodLog[0].text,'Segundo');assert.equal(during.sync.snapshot().baseRevision,2);assert.equal(during.sync.snapshot().dirty,false);assert.deepEqual(during.backend.calls.filter(call=>call.method!=='read').map(call=>[call.method,call.revision]),[['insert',0],['update',1]]);

 // Two devices cannot silently replace each other's independently edited records.
 const initial=meal('Ana','Original'),remoteBackend=new Backend({[ids[0]]:{state:initial,revision:1}}),deviceA=fixture({backend:remoteBackend}),deviceB=fixture({backend:remoteBackend});await deviceA.sync.open();await deviceB.sync.open();deviceA.sync.save(meal('Ana','Dispositivo A'));deviceB.sync.save(meal('Ana','Dispositivo B'));await deviceA.sync.sync();await deviceB.sync.sync();assert.equal(deviceB.statuses.at(-1).kind,'conflict');assert.equal(deviceB.sync.snapshot().dirty,true);assert.equal(deviceB.sync.exportState().foodLog[0].text,'Dispositivo B');assert.equal(remoteBackend.rows.get(ids[0]).state.foodLog[0].text,'Dispositivo A');
 const localBefore=deviceB.storage.getItem(key(ids[0]));const chosen=await deviceB.sync.useRemote();assert.equal(chosen.foodLog[0].text,'Dispositivo A');assert.equal(deviceB.sync.snapshot().dirty,false);const recoveryNames=Object.keys(deviceB.storage.snapshot()).filter(name=>name.startsWith(key(ids[0])+':recovery:'));assert.equal(recoveryNames.length,1);assert.equal(deviceB.storage.getItem(recoveryNames[0]),localBefore);

 // CAS also rejects a concurrent write that lands after our successful preflight GET.
 const race=fixture({backend:new Backend({[ids[0]]:{state:initial,revision:1}})});await race.sync.open();race.sync.save(meal('Ana','Mi cambio'));const raceGate=deferred(),raceStarted=deferred();race.backend.blockWrite=raceGate;race.backend.writeStarted=()=>raceStarted.resolve();const racing=race.sync.sync();await raceStarted.promise;race.backend.rows.set(ids[0],{state:meal('Ana','Cambio remoto concurrente'),revision:2});raceGate.resolve();await racing;assert.equal(race.statuses.at(-1).kind,'conflict');assert.equal(race.sync.exportState().foodLog[0].text,'Mi cambio');assert.equal(race.sync.snapshot().dirty,true);assert.equal(race.backend.rows.get(ids[0]).state.foodLog[0].text,'Cambio remoto concurrente');

 // A clean foreground refresh adopts remote changes; an edit made during its GET is retained.
 const cleanDevice=fixture({backend:remoteBackend});await cleanDevice.sync.open();deviceA.sync.save(meal('Ana','Nueva nube'));await deviceA.sync.sync();await cleanDevice.sync.sync();assert.equal(cleanDevice.sync.exportState().foodLog[0].text,'Nueva nube');assert.equal(cleanDevice.statuses.at(-1).stateChanged,true);assert.equal(cleanDevice.statuses.at(-1).state.foodLog[0].text,'Nueva nube');
 const refreshGate=deferred();cleanDevice.backend.blockRead=refreshGate;const refreshing=cleanDevice.sync.sync();await tick();cleanDevice.sync.save(meal('Ana','Mientras cargaba'));refreshGate.resolve();await refreshing;assert.equal(cleanDevice.sync.exportState().foodLog[0].text,'Mientras cargaba');assert.equal(cleanDevice.backend.rows.get(ids[0]).state.foodLog[0].text,'Mientras cargaba');
 const otherGate=deferred();cleanDevice.backend.blockRead=otherGate;const staleRefresh=cleanDevice.sync.sync();await tick();cleanDevice.sync.save(meal('Ana','Mi edición pendiente'));remoteBackend.rows.set(ids[0],{state:meal('Ana','Otro teléfono'),revision:remoteBackend.rows.get(ids[0]).revision+1});otherGate.resolve();await staleRefresh;assert.equal(cleanDevice.statuses.at(-1).kind,'conflict');assert.equal(cleanDevice.sync.exportState().foodLog[0].text,'Mi edición pendiente');

 // Same-account tabs sharing a cache are detected before save, before upload, and before ACK.
 const tabsStorage=new MemoryStorage(),tabsBackend=new Backend(),tabA=fixture({storage:tabsStorage,backend:tabsBackend}),tabB=fixture({storage:tabsStorage,backend:tabsBackend});await tabA.sync.open();await tabB.sync.open();tabA.sync.save(meal('Ana','La pestaña más reciente'));const beforeStale=tabsStorage.snapshot();assert.throws(()=>tabB.sync.save(meal('Ana','Obsoleto')),hasCode('STALE_CACHE'));assert.deepEqual(tabsStorage.snapshot(),beforeStale);assert.equal(tabB.statuses.at(-1).kind,'conflict');assert.equal(tabB.statuses.at(-1).saveFailed,true);assert.match(tabB.statuses.at(-1).message,/último cambio no se guardó/);await tabB.sync.sync();assert.equal(tabB.statuses.at(-1).code,'STALE_CACHE');assert.equal(tabB.statuses.at(-1).saveFailed,true);assert.equal(tabsBackend.calls.filter(call=>call.method!=='read').length,0);
 const lateTab=fixture();await lateTab.sync.open();lateTab.sync.save(meal('Ana','Subiendo'));const lateGate=deferred(),lateStarted=deferred();lateTab.backend.blockWrite=lateGate;lateTab.backend.writeStarted=()=>lateStarted.resolve();const lateUpload=lateTab.sync.sync();await lateStarted.promise;const anotherRaw=JSON.stringify(wrapper(ids[0],meal('Ana','Otra pestaña'),{baseRevision:0,dirty:true,generation:5}));lateTab.storage.values.set(key(ids[0]),anotherRaw);lateGate.resolve();await lateUpload;assert.equal(lateTab.storage.getItem(key(ids[0])),anotherRaw);assert.equal(lateTab.statuses.at(-1).code,'STALE_CACHE');

 // Save quota errors roll back memory as well as the persistent cache.
 const limited=fixture();await limited.sync.open();const beforeQuota=copy(limited.sync.snapshot()),rawBeforeQuota=limited.storage.getItem(key(ids[0]));limited.storage.fail=name=>name===key(ids[0]);assert.throws(()=>limited.sync.save(meal('Ana','No cabe')),hasCode('CACHE_WRITE_FAILED'));assert.deepEqual(copy(limited.sync.snapshot()),beforeQuota);assert.equal(limited.storage.getItem(key(ids[0])),rawBeforeQuota);assert.equal(limited.statuses.at(-1).kind,'error');assert.equal(limited.statuses.at(-1).saveFailed,true);assert.match(limited.statuses.at(-1).message,/último cambio no se guardó/);assert.match(limited.statuses.at(-1).message,/copia anterior sigue intacta/);await limited.sync.sync();assert.equal(limited.statuses.at(-1).saveFailed,true,'Syncing the previous copy does not recover a rejected edit');limited.storage.fail=null;limited.sync.save(meal('Ana','Sí cabe'));assert.equal(limited.sync.snapshot().dirty,true);assert.equal(limited.statuses.at(-1).saveFailed,false);assert.equal(limited.statuses.at(-1).kind,'syncing');

 // A rejected in-memory edit must not be silently rebased by an already pending cloud GET.
 const rejected=fixture({backend:new Backend({[ids[0]]:{state:initial,revision:1}})});await rejected.sync.open();const rejectedBase=copy(rejected.sync.snapshot()),rejectedRaw=rejected.storage.getItem(key(ids[0])),rejectedGate=deferred();rejected.backend.blockRead=rejectedGate;const rejectedRead=rejected.sync.sync();await tick();rejected.storage.fail=name=>name===key(ids[0]);assert.throws(()=>rejected.sync.save(meal('Ana','Edición solo en memoria')),hasCode('CACHE_WRITE_FAILED'));const failedStatusIndex=rejected.statuses.length;rejected.backend.rows.set(ids[0],{state:meal('Ana','Más reciente en la nube'),revision:2});rejectedGate.resolve();assert.equal(await rejectedRead,null);assert.deepEqual(copy(rejected.sync.snapshot()),rejectedBase);assert.equal(rejected.storage.getItem(key(ids[0])),rejectedRaw);assert.equal(rejected.statuses.slice(failedStatusIndex).some(status=>status.stateChanged),false);assert.equal(rejected.statuses.at(-1).saveFailed,true);
 const callsWhileRejected=rejected.backend.calls.length;assert.equal(await rejected.sync.sync(),null);assert.equal(rejected.backend.calls.length,callsWhileRejected,'A rejected edit blocks new synchronization reads');rejected.storage.fail=null;rejected.sync.save(meal('Ana','Edición solo en memoria'));assert.equal(rejected.statuses.at(-1).saveFailed,false);assert.equal(rejected.sync.snapshot().baseRevision,1);await rejected.sync.sync();assert.equal(rejected.statuses.at(-1).kind,'conflict');assert.equal(rejected.sync.exportState().foodLog[0].text,'Edición solo en memoria');assert.equal(rejected.backend.rows.get(ids[0]).state.foodLog[0].text,'Más reciente en la nube');

 // A quota failure while acknowledging an upload retains a recoverable dirty copy.
 const ackQuota=fixture();await ackQuota.sync.open();ackQuota.sync.save(meal('Ana','Confirmación pendiente'));const ackRaw=ackQuota.storage.getItem(key(ids[0])),ackGate=deferred(),ackStarted=deferred();ackQuota.backend.blockWrite=ackGate;ackQuota.backend.writeStarted=()=>ackStarted.resolve();const ackUpload=ackQuota.sync.sync();await ackStarted.promise;ackQuota.storage.fail=name=>name===key(ids[0]);ackGate.resolve();await ackUpload;assert.equal(ackQuota.sync.snapshot().dirty,true);assert.equal(ackQuota.sync.snapshot().baseRevision,0);assert.equal(ackQuota.storage.getItem(key(ids[0])),ackRaw);assert.equal(ackQuota.statuses.at(-1).kind,'error');ackQuota.storage.fail=null;await ackQuota.sync.sync();assert.equal(ackQuota.sync.snapshot().dirty,false);assert.equal(ackQuota.sync.snapshot().baseRevision,1);assert.equal(ackQuota.backend.calls.filter(call=>call.method!=='read').length,1,'A lost ACK is recognized without a duplicate insert');

 // Selecting the cloud copy requires an archived local copy before replacing it.
 const recoveryQuota=fixture({backend:new Backend({[ids[0]]:{state:initial,revision:1}})});await recoveryQuota.sync.open();recoveryQuota.sync.save(meal('Ana','Conservar copia local'));const originalRecoveryRaw=recoveryQuota.storage.getItem(key(ids[0])),originalRecoveryState=copy(recoveryQuota.sync.snapshot());recoveryQuota.storage.fail=name=>name.includes(':recovery:');await assert.rejects(recoveryQuota.sync.useRemote(),hasCode('RECOVERY_WRITE_FAILED'));assert.equal(recoveryQuota.storage.getItem(key(ids[0])),originalRecoveryRaw);assert.deepEqual(copy(recoveryQuota.sync.snapshot()),originalRecoveryState);
 recoveryQuota.storage.fail=name=>name===key(ids[0]);await assert.rejects(recoveryQuota.sync.useRemote(),hasCode('CACHE_WRITE_FAILED'));assert.equal(recoveryQuota.storage.getItem(key(ids[0])),originalRecoveryRaw);assert.deepEqual(copy(recoveryQuota.sync.snapshot()),originalRecoveryState);assert(Object.keys(recoveryQuota.storage.snapshot()).some(name=>name.startsWith(key(ids[0])+':recovery:')));recoveryQuota.storage.fail=null;await recoveryQuota.sync.useRemote();assert.deepEqual(copy(recoveryQuota.sync.exportState()),initial);

 // Corrupt or foreign caches are never overwritten automatically or treated as empty installs.
 for(const raw of ['{broken','null','[]',JSON.stringify(wrapper(ids[1],initial)),JSON.stringify({...wrapper(ids[0],initial),generation:-1}),JSON.stringify({...wrapper(ids[0],initial),state:[]})]){
  const broken=fixture({storage:new MemoryStorage({[key(ids[0])]:raw}),backend:new Backend({[ids[0]]:{state:initial,revision:1}})});await assert.rejects(broken.sync.open(),hasCode('CORRUPT_CACHE'));assert.equal(broken.storage.getItem(key(ids[0])),raw);assert.equal(broken.storage.writes.length,0);assert.equal(broken.backend.calls.length,0);assert.throws(()=>broken.sync.save(initial),hasCode('NOT_OPEN'));
 }
 const corrupt=fixture({storage:new MemoryStorage({[key(ids[0])]:'{broken'}),backend:new Backend({[ids[0]]:{state:initial,revision:1}})});await assert.rejects(corrupt.sync.open(),hasCode('CORRUPT_CACHE'));await corrupt.sync.useRemote();const corruptBackup=Object.keys(corrupt.storage.snapshot()).find(name=>name.includes(':recovery:'));assert.equal(corrupt.storage.getItem(corruptBackup),'{broken');assert.deepEqual(copy(corrupt.sync.exportState()),initial);

 // A missing remote row is safe only for a never-uploaded cache (base zero).
 const deleted=fixture({storage:new MemoryStorage({[key(ids[0])]:JSON.stringify(wrapper(ids[0],initial,{dirty:true,baseRevision:4}))})});await deleted.sync.open();await deleted.sync.sync();assert.equal(deleted.statuses.at(-1).kind,'conflict');assert.equal(deleted.backend.calls.filter(call=>call.method!=='read').length,0);assert.equal(deleted.sync.exportState().foodLog[0].text,'Original');

 // JSONB key reordering still recognizes an uploaded payload after a lost response.
 const reorderedState={foodLog:[],profileName:'Ana',nested:{b:2,a:1}},reordered=fixture({storage:new MemoryStorage({[key(ids[0])]:JSON.stringify(wrapper(ids[0],reorderedState,{dirty:true,baseRevision:0,generation:1}))}),backend:new Backend({[ids[0]]:{state:{nested:{a:1,b:2},profileName:'Ana',foodLog:[]},revision:1}})});await reordered.sync.open();assert.equal(reordered.sync.snapshot().dirty,false);assert.equal(reordered.backend.calls.filter(call=>call.method!=='read').length,0);

 // Closing a session invalidates late callbacks and never deletes its cache.
 const closing=fixture();await closing.sync.open();closing.sync.save(meal('Ana','Queda guardado'));const closeRaw=closing.storage.getItem(key(ids[0])),closeGate=deferred(),closeStarted=deferred();closing.backend.blockWrite=closeGate;closing.backend.writeStarted=()=>closeStarted.resolve();const closingUpload=closing.sync.sync();await closeStarted.promise;closing.sync.close();const statusesAtClose=closing.statuses.length;closeGate.resolve();assert.equal(await closingUpload,null);assert.equal(closing.statuses.length,statusesAtClose);assert.equal(closing.storage.getItem(key(ids[0])),closeRaw);assert.equal(closing.timers.size,0);assert.throws(()=>closing.sync.save(initial),hasCode('CLOSED'));assert.equal(closing.statuses.length,statusesAtClose,'A rejected save on a closed session emits no callbacks');
 const openingGate=deferred(),closingOpen=fixture();closingOpen.backend.blockRead=openingGate;const openingPromise=closingOpen.sync.open();await tick();closingOpen.sync.close();openingGate.resolve();await assert.rejects(openingPromise,hasCode('CLOSED'));assert.deepEqual(closingOpen.storage.snapshot(),{});assert.equal(closingOpen.statuses.length,0);

 // Identifiers and remote account mismatches cannot redirect another user's data.
 for(const uid of ['legacy','../other','11111111-1111-4111-8111-111111111111:extra',ids[0]+'\n',''])assert.throws(()=>fixture({uid}),hasCode('INVALID_UID'));
 for(const projectId of ['https://project.supabase.co','project.supabase.co/path','project.supabase.co:65536','project.supabase.co:0','project..supabase.co','project.supabase.co ','project.supabase.co\n','a'.repeat(64)+'.supabase.co','/other','project.supabase.co:443:80',''])assert.throws(()=>fixture({projectId}),hasCode('INVALID_PROJECT'));
 const foreign=fixture({backend:new Backend({[ids[0]]:{state:initial,revision:1,user_id:ids[1]}})});await assert.rejects(foreign.sync.open(),hasCode('REMOTE_READ_FAILED'));assert.equal(foreign.storage.writes.length,0);
 for(const item of [anna,luis,hostA,hostB,localHost,reload,during,deviceA,deviceB,race,cleanDevice,tabA,tabB,lateTab,limited,rejected,ackQuota,recoveryQuota,corrupt,deleted,reordered,cached401,foreign])item.sync.close();
 console.log('PASS: cuentas aisladas sin importar mgp-v2, offline/reapertura, GET 401, generaciones y CAS, conflictos entre dispositivos/pestañas, actualización foreground, rollback quota en save/ACK/recuperación, copias corruptas, recuperación explícita y cierre seguro.');
})().catch(error=>{console.error(error);process.exitCode=1});
