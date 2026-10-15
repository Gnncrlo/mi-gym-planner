const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({Date,Error,JSON,Number,Object,String});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cloud-auth.js'),'utf8'),context);
const createAuth=context.createGymCloudAuth;
const uidA='11111111-1111-4111-8111-111111111111';
const uidB='22222222-2222-4222-8222-222222222222';
const key='mgp-cloud-auth-v1:project-a';
const timestamp=1800000000000;
const user=(id=uidA,name='Giancarlo')=>({id,email:`${id===uidA?'a':'b'}@example.test`,user_metadata:{full_name:name}});
const session=(id=uidA,suffix='a',expiresIn=3600)=>({access_token:`access-${suffix}`,refresh_token:`refresh-${suffix}`,user:user(id),expires_in:expiresIn});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
const error=(code,status)=>Object.assign(new Error('Request failed'),{code,status});
function storage(initial={}){
  const records=new Map(Object.entries(initial));
  return {records,failWrite:false,failRead:false,failRemove:false,writes:[],removals:[],
    getItem(name){if(this.failRead)throw Error('storage unavailable');return records.has(name)?records.get(name):null},
    setItem(name,value){if(this.failWrite)throw Error('quota');this.writes.push(name);records.set(name,value)},
    removeItem(name){if(this.failRemove)throw Error('storage unavailable');this.removals.push(name);records.delete(name)}
  };
}
function fixture({initial={},client:overrides={}}={}){
  const disk=storage(initial),calls={signIn:0,signUp:0,getUser:0,refresh:0,signOut:0};
  let time=timestamp;
  const base={
    async signIn(){return session()},async signUp(){return {user:user()}},
    async getUser(token){return user(token==='access-b'||token==='access-b2'?uidB:uidA)},
    async refresh(token){return session(token==='refresh-b'?uidB:uidA,token==='refresh-b'?'b2':'a2')},
    async signOut(){}
  };
  const client={};
  for(const method of Object.keys(base))client[method]=async(...args)=>{calls[method]++;return (overrides[method]||base[method])(...args)};
  const auth=createAuth({client,storage:disk,projectId:'project-a',now:()=>time});
  return {auth,disk,calls,advance:ms=>{time+=ms},setTime:value=>{time=value}};
}
const rejectCode=(promise,code)=>assert.rejects(promise,problem=>problem.code===code);

(async()=>{
  // The identity displayed and used for ownership comes from /user verification.
  {
    const {auth,disk,calls}=fixture({client:{getUser:async()=>user(uidA,'Nombre verificado')}});
    const signed=await auth.signIn('a@example.test','password-not-persisted');
    assert.equal(signed.id,uidA);assert.equal(signed.name,'Nombre verificado');assert.equal(calls.getUser,1);
    assert.equal(await auth.getToken(),'access-a');
    assert.deepEqual(JSON.parse(disk.records.get(key)),{refreshToken:'refresh-a',uid:uidA});
    const serialized=JSON.stringify([...disk.records]);
    for(const secret of ['access-a','password-not-persisted','a@example.test'])assert.ok(!serialized.includes(secret));
    signed.id=uidB;assert.equal(auth.currentUser().id,uidA,'callers cannot mutate account ownership');
  }
  // Email and metadata never substitute a UUID, nor can a response claim another user.
  for(const invalid of ['a@example.test','giancarlo','11111111-1111-0111-0111-111111111111',null]){
    const {auth,disk,calls}=fixture({client:{signIn:async()=>({...session(),user:{...user(),id:invalid}})}});
    await rejectCode(auth.signIn('a','p'),'AUTH_INVALID');assert.equal(auth.currentUser(),null);assert.equal(calls.getUser,0);assert.equal(disk.records.size,0);
  }
  {
    const {auth,disk}=fixture({client:{getUser:async()=>user(uidB)}});
    await rejectCode(auth.signIn('a','p'),'AUTH_INVALID');assert.equal(auth.currentUser(),null);assert.equal(disk.records.size,0);
  }
  {
    const {auth,disk}=fixture({client:{getUser:async()=>({...user(),id:'a@example.test'})}});
    await rejectCode(auth.signIn('a','p'),'AUTH_INVALID');assert.equal(disk.records.size,0);
  }
  // Confirmation is not an authenticated session. A successful session is verified.
  {
    const {auth,calls,disk}=fixture();
    assert.equal((await auth.signUp('a','password','Name')).requiresConfirmation,true);
    assert.equal(auth.currentUser(),null);assert.equal(calls.getUser,0);assert.equal(disk.records.size,0);
  }
  {
    const {auth,calls}=fixture({client:{signUp:async()=>session()}});
    const result=await auth.signUp('a','p','Name');assert.equal(result.requiresConfirmation,false);assert.equal(result.user.id,uidA);assert.equal(calls.getUser,1);
  }
  {
    const {auth}=fixture({client:{signUp:async()=>({...session(),access_token:''})}});
    await rejectCode(auth.signUp('a','p','Name'),'AUTH_INVALID');
  }
  // Corrupt or incomplete auth never resets the planner or other account caches.
  for(const raw of ['{bad json','null','[]','{}',JSON.stringify({uid:uidA,refreshToken:''}),JSON.stringify({uid:'email@example.test',refreshToken:'refresh-a'}),JSON.stringify({uid:uidA,refreshToken:' bad '})]){
    const {auth,disk,calls}=fixture({initial:{[key]:raw,'mgp-v2':'original-planner','mgp-cloud-data:other':'other-cache'}});
    assert.equal(await auth.resume(),null);assert.equal(auth.currentUser(),null);assert.equal(calls.refresh,0);
    assert.equal(disk.records.get('mgp-v2'),'original-planner');assert.equal(disk.records.get(key),raw);assert.equal(disk.removals.length,0);
  }
  {
    const {auth,calls}=fixture();assert.equal(await auth.resume(),null);assert.equal(calls.refresh,0);
    await rejectCode(auth.getToken(),'NOT_AUTHENTICATED');
  }
  // Reload uses the stored refresh token, verifies /user, and saves its rotation.
  {
    const {auth,disk,calls}=fixture({initial:{[key]:JSON.stringify({uid:uidA,refreshToken:'refresh-a'})}});
    const restored=await auth.resume();assert.equal(restored.id,uidA);assert.equal(calls.refresh,1);assert.equal(calls.getUser,1);
    assert.equal(await auth.getToken(),'access-a2');assert.equal(JSON.parse(disk.records.get(key)).refreshToken,'refresh-a2');
  }
  // A refresh must match both the original account and the server-verified UUID.
  for(const changedAt of ['refresh','user']){
    const {auth,disk}=fixture({initial:{[key]:JSON.stringify({uid:uidA,refreshToken:'refresh-a'}),'mgp-v2':'original','mgp-cloud-cache:other':'other'},client:{
      refresh:async()=>session(changedAt==='refresh'?uidB:uidA,changedAt==='refresh'?'b':'a'),
      getUser:async()=>user(uidB)
    }});
    await rejectCode(auth.resume(),'AUTH_INVALID');assert.equal(auth.currentUser(),null);assert.ok(!disk.records.has(key));
    assert.deepEqual([...disk.records], [['mgp-v2','original'],['mgp-cloud-cache:other','other']]);assert.deepEqual(disk.removals,[key]);
  }
  // A network error leaves resumable credentials intact. Only auth rejection clears them.
  for(const status of [undefined,400,401,403,500]){
    const raw=JSON.stringify({uid:uidA,refreshToken:'refresh-a'});
    const {auth,disk}=fixture({initial:{[key]:raw,'mgp-v2':'original'},client:{refresh:async()=>{throw error(status?'HTTP':'NETWORK',status)}}});
    await assert.rejects(auth.resume());assert.equal(auth.currentUser(),null);assert.equal(disk.records.get('mgp-v2'),'original');
    assert.equal(disk.records.has(key),status!==400&&status!==401);
  }
  // Quota errors do not replace the old account in memory or its refresh token on disk.
  {
    const {auth,disk,advance}=fixture({client:{signIn:async(email)=>email==='b'?session(uidB,'b'):session()}});
    await auth.signIn('a','p');const previous=disk.records.get(key);disk.failWrite=true;
    await rejectCode(auth.signIn('b','p'),'AUTH_STORAGE');assert.equal(auth.currentUser().id,uidA);assert.equal(disk.records.get(key),previous);assert.equal(await auth.getToken(),'access-a');
    advance(3550000);await rejectCode(auth.getToken(),'AUTH_STORAGE');assert.equal(auth.currentUser().id,uidA);assert.equal(disk.records.get(key),previous);
  }
  // Concurrent token consumers share one refresh and one verification.
  {
    const wait=deferred();const {auth,calls,advance}=fixture({client:{refresh:()=>wait.promise}});
    await auth.signIn('a','p');advance(3550000);
    const first=auth.getToken(),second=auth.getToken(),third=auth.getToken();
    assert.equal(calls.refresh,1);wait.resolve(session(uidA,'a2'));
    assert.deepEqual(await Promise.all([first,second,third]),['access-a2','access-a2','access-a2']);assert.equal(calls.getUser,2);
  }
  // Late sign-in, verification, and refresh results cannot replace a newer account.
  for(const delayedAt of ['signIn','getUser','refresh']){
    const wait=deferred();let releaseOld;
    const overrides={signIn:async email=>email==='b'?session(uidB,'b'):session()};
    if(delayedAt==='signIn')overrides.signIn=email=>email==='a'?wait.promise:Promise.resolve(session(uidB,'b'));
    if(delayedAt==='getUser')overrides.getUser=token=>token==='access-a'?wait.promise:Promise.resolve(user(uidB));
    if(delayedAt==='refresh')overrides.refresh=()=>wait.promise;
    const {auth,disk,advance}=fixture({client:overrides});
    if(delayedAt==='refresh'){await auth.signIn('a','p');advance(3550000);releaseOld=auth.getToken()}
    else releaseOld=auth.signIn('a','p');
    // Mark the pending promise handled before settling it in a later microtask.
    const stale=rejectCode(releaseOld,'AUTH_STALE');
    await Promise.resolve();await auth.signIn('b','p');
    wait.resolve(delayedAt==='getUser'?user(uidA):session(uidA,'a2'));await stale;
    assert.equal(auth.currentUser().id,uidB);assert.equal(await auth.getToken(),'access-b');assert.equal(JSON.parse(disk.records.get(key)).uid,uidB);
  }
  // A rejected late request is also classified as stale, rather than showing an old failure.
  {
    const wait=deferred();const {auth}=fixture({client:{signIn:email=>email==='a'?wait.promise:Promise.resolve(session(uidB,'b'))}});
    const stale=rejectCode(auth.signIn('a','p'),'AUTH_STALE');await auth.signIn('b','p');wait.reject(error('NETWORK'));await stale;assert.equal(auth.currentUser().id,uidB);
  }
  // A refresh begun during sign-in cannot overwrite the account when sign-in finishes first.
  {
    const nextLogin=deferred(),oldRefresh=deferred();
    const {auth,disk,advance}=fixture({client:{signIn:email=>email==='b'?nextLogin.promise:Promise.resolve(session()),refresh:()=>oldRefresh.promise}});
    await auth.signIn('a','p');advance(3550000);
    const login=auth.signIn('b','p'),stale=rejectCode(auth.getToken(),'AUTH_STALE');
    nextLogin.resolve(session(uidB,'b'));await login;oldRefresh.resolve(session(uidA,'a2'));await stale;
    assert.equal(auth.currentUser().id,uidB);assert.equal(JSON.parse(disk.records.get(key)).uid,uidB);
  }
  // Sign-out invalidates in-flight work, only removes auth, and keeps local logout on network failure.
  {
    const wait=deferred();const {auth,disk}=fixture({initial:{'mgp-v2':'planner','mgp-cloud-cache:uid-a':'cache'},client:{signIn:()=>wait.promise}});
    const stale=rejectCode(auth.signIn('a','p'),'AUTH_STALE');await auth.signOut();wait.resolve(session());await stale;
    assert.equal(auth.currentUser(),null);assert.equal(disk.records.get('mgp-v2'),'planner');assert.equal(disk.records.get('mgp-cloud-cache:uid-a'),'cache');assert.ok(!disk.records.has(key));
  }
  {
    const {auth,disk}=fixture({initial:{'mgp-v2':'planner'},client:{signOut:async()=>{throw new Error('contains access-secret-not-for-warning')}}});
    await auth.signIn('a','p');const result=await auth.signOut();assert.equal(result.remoteSignedOut,false);assert.ok(result.warning);assert.ok(!result.warning.includes('secret'));assert.equal(auth.currentUser(),null);assert.ok(!disk.records.has(key));assert.equal(disk.records.get('mgp-v2'),'planner');
    await rejectCode(auth.getToken(),'NOT_AUTHENTICATED');
  }
  // An older sign-out callback cannot clear the next successful sign-in.
  {
    const wait=deferred();const {auth,disk}=fixture({client:{signIn:async email=>session(email==='b'?uidB:uidA,email==='b'?'b':'a'),signOut:()=>wait.promise}});
    await auth.signIn('a','p');const stale=rejectCode(auth.signOut(),'AUTH_STALE');await auth.signIn('b','p');wait.resolve();await stale;
    assert.equal(auth.currentUser().id,uidB);assert.equal(JSON.parse(disk.records.get(key)).uid,uidB);
  }
  // An old tab's logout preserves another tab's new credentials and all planner data.
  {
    const remoteTokens=[];
    const {auth,disk}=fixture({initial:{'mgp-v2':'planner','mgp-cloud-cache:uid-a':'cache-a','mgp-cloud-cache:uid-b':'cache-b'},client:{signOut:async token=>{remoteTokens.push(token)}}});
    await auth.signIn('a','p');
    const nextCredentials=JSON.stringify({uid:uidB,refreshToken:'refresh-b'});
    disk.records.set(key,nextCredentials);
    const result=await auth.signOut();
    assert.equal(result.stale,true);assert.equal(result.remoteSignedOut,true);assert.ok(result.warning);
    assert.equal(auth.currentUser(),null);assert.equal(disk.records.get(key),nextCredentials);assert.equal(disk.removals.length,0);
    assert.equal(disk.records.get('mgp-v2'),'planner');assert.equal(disk.records.get('mgp-cloud-cache:uid-a'),'cache-a');assert.equal(disk.records.get('mgp-cloud-cache:uid-b'),'cache-b');
    assert.deepEqual(remoteTokens,['access-a']);await rejectCode(auth.getToken(),'NOT_AUTHENTICATED');
  }
  // Logging out after a failed resume can forget its own observed credentials.
  {
    const {auth,disk}=fixture({initial:{[key]:JSON.stringify({uid:uidA,refreshToken:'refresh-a'}),'mgp-v2':'planner'},client:{refresh:async()=>{throw error('NETWORK')}}});
    await assert.rejects(auth.resume());const result=await auth.signOut();assert.equal(result.stale,false);assert.ok(!disk.records.has(key));assert.equal(disk.records.get('mgp-v2'),'planner');
  }
  // A controller that never observed the stored account cannot log that account out.
  {
    const credentials=JSON.stringify({uid:uidB,refreshToken:'refresh-b'});
    const {auth,disk}=fixture({initial:{[key]:credentials,'mgp-v2':'planner'}});
    const result=await auth.signOut();assert.equal(result.stale,true);assert.equal(disk.records.get(key),credentials);assert.equal(disk.removals.length,0);
  }
  // Explicit logout may clean only a corrupt auth key, never the saved planner.
  {
    const {auth,disk}=fixture({initial:{[key]:'{corrupt','mgp-v2':'planner'}});
    const result=await auth.signOut();assert.equal(result.stale,false);assert.deepEqual(disk.removals,[key]);assert.equal(disk.records.get('mgp-v2'),'planner');
  }
  // Closing the controller invalidates callbacks but leaves the remembered session for later.
  {
    const wait=deferred();const {auth,disk,advance}=fixture({client:{refresh:()=>wait.promise}});
    await auth.signIn('a','p');const original=disk.records.get(key);advance(3550000);const closed=rejectCode(auth.getToken(),'AUTH_CLOSED');auth.close();wait.resolve(session(uidA,'a2'));await closed;
    assert.equal(auth.currentUser(),null);assert.equal(disk.records.get(key),original);await rejectCode(auth.resume(),'AUTH_CLOSED');
  }
  // A second-tab session update must not be removed by an older rejected refresh.
  {
    const wait=deferred();const {auth,disk}=fixture({initial:{[key]:JSON.stringify({uid:uidA,refreshToken:'refresh-a'})},client:{refresh:()=>wait.promise}});
    const rejected=assert.rejects(auth.resume());disk.records.set(key,JSON.stringify({uid:uidB,refreshToken:'refresh-b'}));wait.reject(error('HTTP',401));await rejected;
    assert.equal(JSON.parse(disk.records.get(key)).uid,uidB);assert.equal(disk.removals.length,0);
  }
  // Nor may a valid response from an old tab overwrite a newly stored account.
  {
    const wait=deferred();const {auth,disk}=fixture({initial:{[key]:JSON.stringify({uid:uidA,refreshToken:'refresh-a'})},client:{refresh:()=>wait.promise}});
    const stale=rejectCode(auth.resume(),'AUTH_STALE');disk.records.set(key,JSON.stringify({uid:uidB,refreshToken:'refresh-b'}));wait.resolve(session(uidA,'a2'));await stale;
    assert.equal(auth.currentUser(),null);assert.equal(JSON.parse(disk.records.get(key)).uid,uidB);
  }
  console.log('cloud-auth smoke: verified identity, separated credentials, refresh races and safe logout passed');
})().catch(problem=>{console.error(problem);process.exitCode=1});
