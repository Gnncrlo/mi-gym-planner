// REST contract and failure handling with in-memory fetch mocks: no account,
// network, browser or production data is used by this test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../cloud-api.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const uid='1ab23456-7890-4123-a456-789012345678',otherUid='2ab23456-7890-4123-a456-789012345678';
const key='sb_publishable_test_public_key',url='https://sample-project.supabase.co',access='PRIVATE_ACCESS_TOKEN',refresh='PRIVATE_REFRESH_TOKEN';
const authSession={access_token:access,refresh_token:refresh,expires_in:3600,expires_at:1792044000,token_type:'bearer',user:{id:uid,email:'ana@example.com',user_metadata:{full_name:'Ana'}}};
const saved={profileName:'Ana',done:{'1-0-0':true},loads:{'1-0-0':'42.5'},reps:{'1-0-0':'12'},body:[{date:'2026-10-15',kg:64}],meals:{'2026-10-15':{0:true}},foodLog:[{id:'meal',type:0,text:'Avena con yogur'}],closedDays:{'2026-10-14':'closed'},dayHistory:[{id:'closed',foods:[{text:'Lentejas'}]}]};
const record=(revision=1,state=saved)=>({user_id:uid,state:structuredClone(state),revision,updated_at:'2026-10-15T12:30:00.000Z'});
function load(overrides={}){
 const context=vm.createContext({URL,URLSearchParams,AbortController,setTimeout,clearTimeout,atob,...overrides});
 vm.runInContext(source,context,{filename:'cloud-api.js'});
 return context.createGymCloudClient;
}
const create=load();
function setup(extra={}){
 const calls=[],answers=[];
 const fetchImpl=async(target,init)=>{
  calls.push({url:target,...init,body:init.body===undefined?undefined:JSON.parse(init.body)});
  assert.ok(answers.length,'Unexpected REST request');
  const answer=answers.shift();
  if(answer instanceof Error)throw answer;
  if(typeof answer==='function')return answer(target,init);
  const {status=200,data,invalidJson=false}=answer;
  return {status,ok:status>=200&&status<300,json:async()=>{if(invalidJson)throw new Error('PRIVATE_RESPONSE_BODY');return structuredClone(data)}};
 };
 return {calls,answers,client:create({url,publishableKey:key,fetchImpl,...extra})};
}
function errorCode(fn,code){assert.throws(fn,error=>error.code===code,code)}
async function rejects(fn,code,status){
 let caught;
 await assert.rejects(fn,error=>{caught=error;return error.code===code&&(status===undefined||error.status===status)},code);
 for(const secret of [access,refresh,'PRIVATE_RESPONSE_BODY','PRIVATE_AUTH_ERROR_BODY','sb_secret_private_admin_key']){
  assert.equal(String(caught).includes(secret),false,'Error messages must not include credentials or server error bodies');
  assert.equal(JSON.stringify(caught).includes(secret),false);
 }
 assert.equal(caught.cause,undefined,'A fetch cause can contain a token or URL and must not be re-exposed');
 return caught;
}
const jwt=role=>Buffer.from(JSON.stringify({alg:'HS256'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({role,iss:'supabase'})).toString('base64url')+'.signature';

(async()=>{
 // Bad configuration is rejected synchronously, before any network access.
 for(const invalidUrl of [undefined,'','not a URL','http://sample-project.supabase.co','https://sample-project.supabase.co/path','https://u:p@sample-project.supabase.co','https://sample-project.supabase.co/?secret=1','https://sample-project.supabase.co/#token']){
  errorCode(()=>create({url:invalidUrl,publishableKey:key,fetchImpl:()=>{throw new Error('Must not fetch')}}),'CONFIG');
 }
 for(const invalidKey of [undefined,'','service_role','sb_secret_private_admin_key','sb_publishable_','sb_publishable_bad\nheader','arbitrary-public-looking-key',jwt('service_role'),jwt('authenticated'),'eyJ.fake.signature']){
  errorCode(()=>create({url,publishableKey:invalidKey,fetchImpl:()=>{throw new Error('Must not fetch')}}),'CONFIG');
 }
 assert.ok(create({url:url+'/',publishableKey:jwt('anon'),fetchImpl:()=>{}}));
 errorCode(()=>create({url,publishableKey:key,fetchImpl:null}),'CONFIG');
 for(const redirectUrl of ['not a URL','http://unsafe.example.com/','https://user:password@example.com/','https://example.com/#access_token=private'])errorCode(()=>setup({redirectUrl}),'CONFIG');

 // Sign up keeps the app callback and display name separate from Auth identity.
 const auth=setup({redirectUrl:'https://gnncrlo.github.io/mi-gym-planner/'});
 auth.answers.push({data:{id:uid,email:'ana@example.com',user_metadata:{full_name:'Ana'}}});
 const pending=await auth.client.signUp('  ana@example.com  ','correct horse battery staple','  Ana  ');
 assert.equal(pending.user.id,uid);assert.equal(pending.access_token,undefined);
 let call=auth.calls.at(-1),target=new URL(call.url);
 assert.equal(target.pathname,'/auth/v1/signup');assert.equal(target.searchParams.get('redirect_to'),'https://gnncrlo.github.io/mi-gym-planner/');
 assert.equal(call.method,'POST');assert.deepEqual(call.body,{email:'ana@example.com',password:'correct horse battery staple',data:{full_name:'Ana'}});
 assert.equal(call.headers.apikey,key);assert.equal(call.headers.Authorization,undefined);assert.equal(call.headers['Content-Type'],'application/json');assert.equal(call.headers.Accept,'application/json');
 assert.ok(call.signal instanceof AbortSignal);
 auth.answers.push({data:authSession});assert.deepEqual(plain(await auth.client.signUp('ana@example.com','password','Ana')),authSession);
 auth.answers.push({data:{user:authSession.user}});assert.equal((await auth.client.signUp('ana@example.com','password','Ana')).user.id,uid);

 // Password sessions and refreshed sessions retain standard Supabase fields.
 auth.answers.push({data:authSession});assert.deepEqual(plain(await auth.client.signIn('ana@example.com',' password ')),authSession);
 call=auth.calls.at(-1);target=new URL(call.url);assert.equal(target.pathname,'/auth/v1/token');assert.equal(target.searchParams.get('grant_type'),'password');assert.deepEqual(call.body,{email:'ana@example.com',password:' password '});
 auth.answers.push({data:{...authSession,access_token:'NEW_ACCESS',refresh_token:'NEW_REFRESH'}});
 assert.equal((await auth.client.refresh(refresh)).access_token,'NEW_ACCESS');
 call=auth.calls.at(-1);assert.equal(new URL(call.url).searchParams.get('grant_type'),'refresh_token');assert.deepEqual(call.body,{refresh_token:refresh});assert.equal(call.headers.Authorization,undefined);
 auth.answers.push({data:authSession.user});assert.deepEqual(plain(await auth.client.getUser(access)),authSession.user);
 call=auth.calls.at(-1);assert.equal(new URL(call.url).pathname,'/auth/v1/user');assert.equal(call.method,'GET');assert.equal(call.headers.Authorization,'Bearer '+access);assert.equal(call.body,undefined);
 let parsedLogout=false;auth.answers.push(()=>({status:204,ok:true,json:async()=>{parsedLogout=true;throw new Error('No JSON body')}}));
 assert.equal(await auth.client.signOut(access),undefined);assert.equal(parsedLogout,false);
 call=auth.calls.at(-1);assert.equal(call.method,'POST');assert.equal(call.url,url+'/auth/v1/logout?scope=local');assert.equal(call.headers.Authorization,'Bearer '+access);

 // A browser callback default strips query/hash, including any old auth token.
 let defaultRedirect;
 const browserCreate=load({location:{protocol:'https:',origin:'https://example.com',pathname:'/planner/',search:'?private=secret',hash:'#access_token=secret'}});
 const browserClient=browserCreate({url,publishableKey:key,fetchImpl:async target=>{defaultRedirect=target;return {ok:true,status:200,json:async()=>({id:uid})}}});
 await browserClient.signUp('ana@example.com','password','Ana');assert.equal(new URL(defaultRedirect).searchParams.get('redirect_to'),'https://example.com/planner/');

 // Invalid auth input and malformed success responses cannot be accepted as a session.
 const invalidAuth=setup();
 for(const operation of [()=>invalidAuth.client.signIn('not-an-email','password'),()=>invalidAuth.client.signIn('ana@example.com',''),()=>invalidAuth.client.signUp('ana@example.com','password','  '),()=>invalidAuth.client.refresh(''),()=>invalidAuth.client.getUser('bad\r\nAuthorization: token'),()=>invalidAuth.client.signOut(null)])await rejects(operation,'INPUT');
 assert.equal(invalidAuth.calls.length,0);
 for(const malformed of [null,[],{},authSession.user,{...authSession,user:{email:'ana@example.com'}},{...authSession,user:{id:'ana@example.com'}},{...authSession,access_token:''},{...authSession,refresh_token:''},{...authSession,expires_in:'3600'},{...authSession,expires_in:0},{...authSession,expires_at:-1}]){
  invalidAuth.answers.push({data:malformed});await rejects(()=>invalidAuth.client.signIn('ana@example.com','password'),'RESPONSE');
 }
 invalidAuth.answers.push({data:{id:'not-a-uuid'}});await rejects(()=>invalidAuth.client.getUser(access),'RESPONSE');

 // Existing state is read only through its UUID and represented without mutating it.
 const sync=setup();sync.answers.push({data:[]});assert.equal(await sync.client.readState(uid,access),null);
 call=sync.calls.at(-1);target=new URL(call.url);assert.equal(call.method,'GET');assert.equal(target.pathname,'/rest/v1/planner_accounts');assert.equal(target.searchParams.get('user_id'),'eq.'+uid);assert.equal(target.searchParams.get('select'),'state,revision,updated_at');assert.equal(call.headers.Authorization,'Bearer '+access);assert.equal(call.headers.apikey,key);
 sync.answers.push({data:[record(4)]});assert.deepEqual(plain(await sync.client.readState(uid.toUpperCase(),access)),{state:saved,revision:4,updatedAt:'2026-10-15T12:30:00.000Z'});
 assert.equal(new URL(sync.calls.at(-1).url).searchParams.get('user_id'),'eq.'+uid);
 const before=structuredClone(saved);sync.answers.push({status:201,data:[record()]});
 assert.deepEqual(plain(await sync.client.insertState(uid,saved,access)),{state:saved,revision:1,updatedAt:'2026-10-15T12:30:00.000Z'});
 call=sync.calls.at(-1);assert.equal(call.method,'POST');assert.equal(call.url,url+'/rest/v1/planner_accounts');assert.equal(call.headers.Prefer,'return=representation');assert.deepEqual(call.body,{user_id:uid,state:saved,revision:1});assert.deepEqual(saved,before);

 // Updating uses one conditional PATCH; it can never silently overwrite a new revision.
 sync.answers.push({data:[record(5)]});assert.equal((await sync.client.updateState(uid,4,saved,access)).revision,5);
 call=sync.calls.at(-1);target=new URL(call.url);assert.equal(call.method,'PATCH');assert.equal(target.searchParams.get('user_id'),'eq.'+uid);assert.equal(target.searchParams.get('revision'),'eq.4');assert.deepEqual(call.body,{state:saved,revision:5});assert.equal(call.headers.Prefer,'return=representation');assert.deepEqual(saved,before);
 sync.answers.push({data:[]});await rejects(()=>sync.client.updateState(uid,4,saved,access),'CONFLICT');
 sync.answers.push({status:409,data:{message:'PRIVATE_AUTH_ERROR_BODY'}});await rejects(()=>sync.client.insertState(uid,saved,access),'CONFLICT',409);
 sync.answers.push({status:409,data:{message:'PRIVATE_AUTH_ERROR_BODY'}});await rejects(()=>sync.client.updateState(uid,4,saved,access),'CONFLICT',409);

 // A network/server/parsing failure is never mistaken for a new, empty account.
 for(const answer of [new Error('Network failure '+access),{status:503,data:[]},{status:404,data:[]},{invalidJson:true}]){
  sync.answers.push(answer);await rejects(()=>sync.client.readState(uid,access),answer instanceof Error?'NETWORK':answer.invalidJson?'RESPONSE':'HTTP',answer.status);
 }
 for(const malformed of [null,{},[record(),record()],[[record()]], [{...record(),state:null}],[{...record(),state:[]}],[{...record(),revision:0}],[{...record(),revision:'1'}],[{...record(),revision:Number.MAX_SAFE_INTEGER+1}],[{...record(),updated_at:'not a date'}],[{...record(),updated_at:undefined}],[{...record(),user_id:otherUid}]]){
  sync.answers.push({data:malformed});await rejects(()=>sync.client.readState(uid,access),'RESPONSE');
 }
 sync.answers.push({data:[]});await rejects(()=>sync.client.insertState(uid,saved,access),'RESPONSE');
 sync.answers.push({data:[record(9)]});await rejects(()=>sync.client.updateState(uid,4,saved,access),'RESPONSE');
 sync.answers.push({data:[record(2)]});await rejects(()=>sync.client.insertState(uid,saved,access),'RESPONSE');

 // Injection attempts and malformed local data are rejected before a REST request.
 const local=setup();
 for(const badUid of [null,'Ana','ana@example.com',uid+'&user_id=neq.'+otherUid,uid+'/../other',uid+' ',{},'../../../']){
  for(const operation of [()=>local.client.readState(badUid,access),()=>local.client.insertState(badUid,saved,access),()=>local.client.updateState(badUid,1,saved,access)])await rejects(operation,'INPUT');
 }
 const cyclic={};cyclic.self=cyclic;
 for(const badState of [null,[],42,'text',cyclic,{toJSON:()=>null}])await rejects(()=>local.client.insertState(uid,badState,access),'INPUT');
 for(const badRevision of [0,-1,1.5,'1',null,Infinity,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1])await rejects(()=>local.client.updateState(uid,badRevision,saved,access),'INPUT');
 for(const badToken of [undefined,null,'','bad\nheader']){
  for(const operation of [()=>local.client.getUser(badToken),()=>local.client.signOut(badToken),()=>local.client.readState(uid,badToken),()=>local.client.insertState(uid,saved,badToken),()=>local.client.updateState(uid,1,saved,badToken)])await rejects(operation,'INPUT');
 }
 assert.equal(local.calls.length,0);

 // HTTP errors deliberately ignore provider bodies, which can contain user data.
 const errors=setup();let errorBodyReads=0;
 for(const status of [400,401,403,422,429,500]){
  errors.answers.push(()=>({status,ok:false,json:async()=>{errorBodyReads++;return {message:'PRIVATE_AUTH_ERROR_BODY '+access}}}));
  await rejects(()=>errors.client.signIn('ana@example.com','password'),'HTTP',status);
 }
 assert.equal(errorBodyReads,0);

 // Both fetch and body parsing have a bounded deadline and abort the request.
 for(const phase of ['fetch','json']){
  const timers=[],cleared=[];let signal;
  const timedCreate=load({setTimeout:(callback,ms)=>{assert.equal(ms,15000);timers.push(callback);return timers.length},clearTimeout:id=>cleared.push(id)});
  const timedClient=timedCreate({url,publishableKey:key,fetchImpl:async(target,init)=>{signal=init.signal;if(phase==='fetch')return new Promise(()=>{});return {ok:true,status:200,json:()=>new Promise(()=>{})}}});
  const pending=rejects(()=>timedClient.readState(uid,access),'TIMEOUT');
  await Promise.resolve();assert.equal(timers.length,1);timers[0]();await pending;
  assert.equal(signal.aborted,true);assert.deepEqual(cleared,[1]);
 }
 console.log('PASS: Auth REST, signup/confirmación, claves públicas, identidad UUID, aislamiento de cuenta, CAS/revisiones, errores seguros y timeouts (sin red ni datos reales).');
})().catch(error=>{console.error(error);process.exitCode=1});
