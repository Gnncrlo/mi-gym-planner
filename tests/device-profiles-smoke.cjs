// Real profile storage/UI and account integration, with in-memory browser APIs.
// No network, production records, browser layout or real Supabase are used.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'),defaults=vm.runInNewContext('('+html.match(/const defaults=([\s\S]*?);let S/)[1]+')');
const copy=value=>JSON.parse(JSON.stringify(value));
const owner={...copy(defaults),profileName:'Giancarlo',body:[{date:'2026-10-15',kg:92}],done:{'1-0-0':true},loads:{'1-0-0':'60'},reps:{'1-0-0':'10'},foodLog:[{id:'meal-owner',date:'2026-10-15',type:0,text:'Avena y huevo'}],closedDays:{'2026-10-14':'owner-closed'},dayHistory:[{id:'owner-closed',exercises:[],tasks:[],foods:[]}]};
const ownerRaw=JSON.stringify(owner,null,2)+'\n',prefix='mgp-device-profile-v1:',activeKey='mgp-device-active-v1';
class Storage{
 constructor(values={}){this.values=new Map(Object.entries(values));this.writes=[];this.fail=()=>false}
 get length(){return this.values.size}
 key(index){return [...this.values.keys()][index]??null}
 getItem(key){return this.values.get(key)??null}
 setItem(key,value){if(this.fail(key))throw Error('QuotaExceeded');this.values.set(key,String(value));this.writes.push(key)}
 removeItem(key){this.values.delete(key)}
 snapshot(){return Object.fromEntries(this.values)}
}
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function fixture({storage=new Storage({'mgp-v2':ownerRaw,'mgp-cloud-v1:other:private-user':'PRIVATE CLOUD DATA'}),session=new Storage(),boot=true}={}){
 const handlers=new Map(),windowHandlers=new Map(),notice={hidden:true},calls={renders:0,reloads:0,exports:[],confirms:[]};
 const context=vm.createContext({URL,URLSearchParams,crypto:webcrypto,Date,setTimeout,clearTimeout,localStorage:storage,defaults:copy(defaults),S:copy(owner),foodDraft:{text:'',type:1},foodDrafts:new Map(),foodDraftDate:'',foodNotice:null,
  document:{querySelectorAll:selector=>selector==='[data-cloud-save-notice]'?[notice]:[],querySelector:()=>null,addEventListener(type,handler,capture=false){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push({handler,capture})}},
  window:{sessionStorage:session,location:{hash:'',pathname:'/mi-gym-planner/',search:'',reload(){calls.reloads++}},history:{replaceState(){}},addEventListener(type,handler){windowHandlers.set(type,handler)}},
  esc,uiIcon:()=>'<svg></svg>',navigator:{},GYM_CLOUD_CONFIG:{url:'',publishableKey:''},render(){calls.renders++},confirm(message){calls.confirms.push(message);return true}});
 for(const file of ['device-profiles.js','cloud-accounts.js'])vm.runInContext(read(file),context,{filename:file});
 const run=code=>vm.runInContext(code,context);
 run('downloadPlannerJSON=(value,name)=>captureExport(value,name)');context.captureExport=(value,name)=>calls.exports.push({value:copy(value),name});
 if(boot)run('S=loadDevicePlannerState()');
 return {context,run,storage,session,handlers,windowHandlers,notice,calls};
}
const profileForm=name=>({querySelector:()=>({value:name})});
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve}};

(async()=>{
 const first=fixture(),original=first.storage.snapshot();
 assert.equal(first.context.S.profileName,'Giancarlo');assert.equal(first.storage.writes.length,0);
 first.context.submitDeviceProfile(profileForm('Ana'));
 const anaId=first.session.getItem(activeKey),anaKey=prefix+anaId;
 assert.match(anaId,/^[0-9a-f-]{36}$/);assert.equal(first.calls.reloads,1);
 assert.equal(first.storage.getItem('mgp-v2'),ownerRaw);assert.equal(first.storage.getItem('mgp-cloud-v1:other:private-user'),original['mgp-cloud-v1:other:private-user']);
 const ana=fixture({storage:first.storage,session:first.session});
 assert.equal(ana.context.S.profileName,'Ana');
 for(const field of ['body','foodLog','dayHistory','custom'])assert.deepEqual(copy(ana.context.S[field]),[],field);
 for(const field of ['done','loads','reps','meals','tasks','closedDays','substitutions','gymVisits','water'])assert.deepEqual(copy(ana.context.S[field]),{},field);
 ana.context.S.body.push({date:'2026-10-15',kg:65});ana.context.S.done['1-0-1']=true;ana.context.S.loads['1-0-1']='20';ana.context.S.reps['1-0-1']='12';
 ana.context.S.foodLog.push({date:'2026-10-15',type:1,text:'Pollo con verduras'});ana.context.S.closedDays['2026-10-15']='ana-closed';ana.context.S.dayHistory.push({id:'ana-closed',exercises:[],tasks:[],foods:[]});
 ana.context.savePlannerState();const anaRaw=ana.storage.getItem(anaKey);
 assert.equal(ana.storage.getItem('mgp-v2'),ownerRaw);assert.equal(JSON.parse(anaRaw).body[0].kg,65);
 // A new session restores the selected user and their complete progress.
 const reopened=fixture({storage:ana.storage});assert.deepEqual(copy(reopened.context.S),copy(ana.context.S));assert.equal(reopened.run('deviceProfileIdentity()'),anaId);
 const manager=reopened.context.renderDeviceProfilesCard();assert.match(manager,/Usuarios de este dispositivo/);assert.match(manager,/Giancarlo/);assert.match(manager,/Ana/);assert.match(manager,/Perfil activo/);assert.match(manager,/No tiene contraseña ni sincronización/);
 reopened.context.switchDeviceProfile('owner');assert.equal(reopened.calls.reloads,1);
 const ownerAgain=fixture({storage:ana.storage,session:reopened.session});assert.deepEqual(copy(ownerAgain.context.S),owner);assert.equal(ana.storage.getItem(anaKey),anaRaw);
 // Tab identity is pinned: choosing the owner elsewhere cannot redirect Ana's next save.
 ana.context.S.loads['1-0-1']='22.5';ana.context.savePlannerState();assert.equal(JSON.parse(ana.storage.getItem(anaKey)).loads['1-0-1'],'22.5');assert.equal(ana.storage.getItem('mgp-v2'),ownerRaw);
 const anaUpdated=ana.storage.getItem(anaKey);
 // Same names still have independent IDs and empty collections.
 ownerAgain.context.submitDeviceProfile(profileForm('Ana'));const secondId=ownerAgain.session.getItem(activeKey);assert.notEqual(secondId,anaId);
 assert.deepEqual(JSON.parse(ana.storage.getItem(prefix+secondId)).body,[]);assert.equal(ana.storage.getItem(anaKey),anaUpdated);

 // New profile creation cannot commit over existing data, even when storage fails.
 const quota=fixture();quota.storage.fail=key=>key.startsWith(prefix);const beforeQuota=quota.storage.snapshot();quota.context.submitDeviceProfile(profileForm('Luis'));
 assert.deepEqual(quota.storage.snapshot(),beforeQuota);assert.equal(quota.calls.reloads,0);assert.equal(quota.run('deviceProfileDraft'),'Luis');assert.match(quota.run('deviceProfileError'),/No se pudo crear/);
 quota.storage.fail=()=>false;quota.context.foodDraft.text='Comida pendiente';const beforeDraft=quota.storage.snapshot();quota.context.submitDeviceProfile(profileForm('Luis'));assert.deepEqual(quota.storage.snapshot(),beforeDraft);assert.match(quota.run('deviceProfileError'),/comidas sin guardar/);
 for(const name of ['', ' ', 'a'.repeat(41)]){quota.context.foodDraft.text='';quota.context.submitDeviceProfile(profileForm(name));assert.equal(quota.calls.reloads,0);assert.deepEqual(quota.storage.snapshot(),beforeDraft)}
 const selectionFailure=fixture();selectionFailure.session.fail=()=>true;selectionFailure.context.submitDeviceProfile(profileForm('Luis'));assert.equal(selectionFailure.calls.reloads,0);assert.equal(selectionFailure.run('deviceProfileIdentity()'),'owner');assert.equal(selectionFailure.storage.getItem('mgp-v2'),ownerRaw);assert.equal([...selectionFailure.storage.values.keys()].filter(key=>key.startsWith(prefix)).length,1);assert.match(selectionFailure.run('deviceProfileError'),/perfiles siguen guardados/);
 // A quota error keeps the edit in memory, exposes the warning and blocks a switch.
 const unsaved=fixture();unsaved.context.S.loads['1-0-0']='70';unsaved.storage.fail=key=>key==='mgp-v2';assert.throws(()=>unsaved.context.savePlannerState(),/No se pudo guardar/);
 assert.equal(unsaved.storage.getItem('mgp-v2'),ownerRaw);assert.equal(unsaved.run('deviceSaveFailed'),true);assert.equal(unsaved.notice.hidden,false);
 assert.throws(()=>unsaved.context.assertNoPendingMealDrafts(),/perfil tiene cambios sin guardar/);
 unsaved.context.attachCloudAccounts();const unload={preventDefault(){this.prevented=true}};unsaved.windowHandlers.get('beforeunload')(unload);assert.equal(unload.prevented,true);
 unsaved.context.exportPlannerAccount();assert.equal(unsaved.calls.exports[0].value.loads['1-0-0'],'70');assert.equal(JSON.stringify(unsaved.calls.exports[0]).includes('PRIVATE CLOUD DATA'),false);
 unsaved.context.submitDeviceProfile(profileForm('Luis'));assert.equal(unsaved.calls.reloads,0);assert.equal(unsaved.storage.getItem('mgp-v2'),ownerRaw);
 unsaved.storage.fail=()=>false;unsaved.context.retryDevicePlannerSave();assert.equal(unsaved.run('deviceSaveFailed'),false);assert.equal(unsaved.notice.hidden,true);assert.equal(JSON.parse(unsaved.storage.getItem('mgp-v2')).loads['1-0-0'],'70');
 // Concurrent edits to the same local profile are rejected instead of overwriting a newer tab.
 const shared=new Storage({'mgp-v2':ownerRaw}),tabA=fixture({storage:shared}),tabB=fixture({storage:shared});tabA.context.S.body.push({date:'2026-10-16',kg:91});tabA.context.savePlannerState();const latest=shared.getItem('mgp-v2');
 tabB.context.S.body.push({date:'2026-10-16',kg:80});assert.throws(()=>tabB.context.savePlannerState(),/otra pestaña/);assert.equal(shared.getItem('mgp-v2'),latest);assert.equal(tabB.context.S.body.at(-1).kg,80);assert.equal(tabB.run('deviceSaveFailed'),true);

 // Backups and asynchronous restoration remain tied to the selected local profile.
 const backup=fixture({storage:ana.storage,session:ana.session});backup.context.exportPlannerAccount();assert.equal(backup.calls.exports[0].value.profileName,'Ana');assert.equal(backup.calls.exports[0].value.body[0].kg,65);
 backup.context.exportPlannerRecovery();assert.deepEqual(Object.keys(backup.calls.exports[1].value.records),[anaKey]);assert.equal(JSON.stringify(backup.calls.exports[1]).includes('mgp-v2'),false);
 const restoreCandidate={...copy(backup.context.S),loads:{restored:'35'}};await backup.context.restorePlannerAccount({text:async()=>JSON.stringify(restoreCandidate)});
 assert.deepEqual(JSON.parse(backup.storage.getItem(anaKey)).loads,{restored:'35'});assert.equal(backup.storage.getItem('mgp-v2'),ownerRaw);assert.match(backup.calls.confirms[0],/perfil de Ana/);
 const delayed=deferred(),pending=backup.context.restorePlannerAccount({text:()=>delayed.promise}),beforeRestore=backup.storage.getItem(anaKey);backup.context.switchDeviceProfile('owner');delayed.resolve(JSON.stringify(owner));await pending;
 assert.equal(backup.storage.getItem(anaKey),beforeRestore);assert.match(backup.run('cloudError'),/cuenta cambió/);
 // Cloud import source is the selected local profile, never automatically the original owner.
 const source=fixture({storage:ana.storage,session:new Storage({[activeKey]:anaId})});const imported=source.context.deviceImportSource();assert.equal(imported.id,anaId);assert.equal(imported.key,anaKey);assert.equal(JSON.parse(imported.raw).profileName,'Ana');

 // Corrupt or missing selected data blocks opening and preserves the exact raw bytes.
 const brokenStorage=new Storage({'mgp-v2':ownerRaw,[anaKey]:'{broken', [activeKey]:anaId}),broken=fixture({storage:brokenStorage,boot:false});
 assert.throws(()=>broken.run('S=loadDevicePlannerState()'),/conservan intactos/);assert.equal(brokenStorage.getItem(anaKey),'{broken');assert.equal(brokenStorage.writes.length,0);
 broken.run("legacyLoadError='Datos dañados'");broken.context.exportPlannerRecovery();assert.deepEqual(broken.calls.exports[0].value.records,{[anaKey]:'{broken'});assert.match(broken.context.renderCloudGate(),/Usuarios de este dispositivo/);
 broken.context.switchDeviceProfile('owner');assert.equal(broken.calls.reloads,1);assert.equal(brokenStorage.getItem(anaKey),'{broken');assert.equal(brokenStorage.getItem('mgp-v2'),ownerRaw);
 const missing=fixture({storage:new Storage({'mgp-v2':ownerRaw,[activeKey]:anaId}),boot:false});assert.throws(()=>missing.run('S=loadDevicePlannerState()'),/No se encontraron/);assert.equal(missing.storage.writes.length,0);
 const unsafe=fixture();unsafe.context.submitDeviceProfile(profileForm('<b>Ana</b>'));const safe=fixture({storage:unsafe.storage,session:unsafe.session});assert.match(safe.context.renderDeviceProfilesCard(),/&lt;b&gt;Ana&lt;\/b&gt;/);assert.doesNotMatch(safe.context.renderDeviceProfilesCard(),/<b>Ana<\/b>/);
 // The real global change handler must leave the profile form text alone.
 const formEvents=fixture();formEvents.context.closedMutation=()=>false;const generalChange=html.match(/document\.addEventListener\('change',async e=>\{[\s\S]*?\}\);(?=document\.addEventListener\('input')/)[0];vm.runInContext(generalChange,formEvents.context);
 const originalWrites=formEvents.storage.writes.length;const target={matches:selector=>selector.includes('[data-device-name]')};await formEvents.handlers.get('change')[0].handler({target});assert.equal(formEvents.calls.renders,0);assert.equal(formEvents.storage.writes.length,originalWrites);
 console.log('PASS: perfiles aislados y persistentes, legado intacto, pesos/fuerza/comidas/cierres, identidad por pestaña, nombres iguales/escapados, cuota y reintento, conflictos locales, respaldos/restauración, importación al usuario correcto y recuperación sin reinicios.');
})().catch(error=>{console.error(error);process.exitCode=1});
