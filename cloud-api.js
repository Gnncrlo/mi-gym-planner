// Supabase REST transport. Only the public project key belongs in this app.
// Account identity comes from Auth's user UUID, never from an email or a name.
function createGymCloudClient(options={}){
 const fail=(code,message,status)=>{const error=new Error(message);error.code=code;if(status!==undefined)error.status=status;return error};
 const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const invalid=()=>fail('INPUT','Los datos para sincronizar no son válidos.');
 let project;
 try{project=new URL(options.url)}catch{throw fail('CONFIG','Falta configurar la dirección segura del proyecto de sincronización.')}
 if(project.protocol!=='https:'||project.username||project.password||project.pathname!=='/'||project.search||project.hash)throw fail('CONFIG','La dirección del proyecto debe ser HTTPS y no incluir rutas ni credenciales.');
 const base=project.origin,key=options.publishableKey;
 if(typeof key!=='string'||key.length>4096||key.startsWith('sb_secret_'))throw fail('CONFIG','Configura únicamente la clave pública del proyecto.');
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)){
  let payload;
  try{
   const parts=key.split('.');
   if(parts.length!==3||!parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part)))throw new Error();
   const encoded=parts[1].replace(/-/g,'+').replace(/_/g,'/');
   payload=JSON.parse(atob(encoded+'='.repeat((4-encoded.length%4)%4)));
  }catch{throw fail('CONFIG','La clave del proyecto debe ser pública: publishable o anon.')}
  if(!isObject(payload)||payload.role!=='anon')throw fail('CONFIG','Configura únicamente la clave pública del proyecto.');
 }
 const fetcher=options.fetchImpl===undefined?globalThis.fetch:options.fetchImpl;
 if(typeof fetcher!=='function')throw fail('CONFIG','Este dispositivo no permite conectar con la sincronización.');
 let redirect;
 if(options.redirectUrl!==undefined){
  try{redirect=new URL(options.redirectUrl)}catch{throw fail('CONFIG','La dirección de confirmación de la cuenta no es válida.')}
  const local=redirect.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(redirect.hostname);
  if((redirect.protocol!=='https:'&&!local)||redirect.username||redirect.password||redirect.hash)throw fail('CONFIG','La dirección de confirmación de la cuenta no es válida.');
 }else if(globalThis.location?.protocol==='https:'){
  redirect=new URL(globalThis.location.origin+globalThis.location.pathname);
 }
 const uuid=value=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw invalid();return value.toLowerCase()};
 const token=value=>{if(typeof value!=='string'||!value.length||value.length>16384||!/^[\x21-\x7e]+$/.test(value))throw fail('INPUT','La sesión no es válida. Vuelve a iniciar sesión.');return value};
 const revision=value=>{if(!Number.isSafeInteger(value)||value<1)throw invalid();return value};
 const state=value=>{
  if(!isObject(value))throw invalid();
  let copied;
  try{copied=JSON.parse(JSON.stringify(value))}catch{throw invalid()}
  if(!isObject(copied))throw invalid();
  return copied;
 };
 const credentials=(email,password)=>{
  if(typeof email!=='string'||email.trim().length>254||!/^\S+@\S+\.\S+$/.test(email.trim())||typeof password!=='string'||!password.length||password.length>4096)throw fail('INPUT','Escribe un correo y una contraseña válidos.');
  return {email:email.trim(),password};
 };
 const responseError=()=>fail('RESPONSE','El servidor devolvió datos inesperados. Tus datos guardados no se han reemplazado.');
 const httpError=(status,operation)=>{
  if(status===409&&(operation==='insert'||operation==='update'))return fail('CONFLICT','Hay cambios más recientes en tu cuenta. Revisa la versión guardada antes de sincronizar.',status);
  let message='No se pudo completar la conexión. Inténtalo de nuevo.';
  if(status===401||status===403)message='La sesión no es válida o no tiene acceso. Vuelve a iniciar sesión.';
  else if(status===429)message='Hay demasiados intentos. Espera un momento antes de volver a intentarlo.';
  else if(operation==='signIn'&&(status===400||status===422))message='No se pudo iniciar sesión. Revisa tu correo y contraseña, y confirma tu correo si está pendiente.';
  else if(operation==='signUp'&&(status===400||status===422))message='No se pudo crear la cuenta. Revisa los datos y los requisitos de la contraseña.';
  return fail('HTTP',message,status);
 };
 async function request(path,{method='GET',body,accessToken,operation,noBody=false,representation=false}={}){
  const headers={apikey:key,Accept:'application/json'};
  if(accessToken!==undefined)headers.Authorization='Bearer '+token(accessToken);
  let serialized;
  if(body!==undefined){headers['Content-Type']='application/json';try{serialized=JSON.stringify(body)}catch{throw invalid()}}
  if(representation)headers.Prefer='return=representation';
  const controller=new AbortController();
  let timeout;
  const deadline=new Promise((resolve,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(fail('TIMEOUT','La conexión tardó demasiado. Tus datos siguen guardados en este dispositivo.'))},15000)});
  const run=async()=>{
   let response;
   try{response=await fetcher(base+path,{method,headers,body:serialized,signal:controller.signal})}
   catch{if(controller.signal.aborted)throw fail('TIMEOUT','La conexión tardó demasiado. Tus datos siguen guardados en este dispositivo.');throw fail('NETWORK','No se pudo conectar. Revisa tu conexión; tus datos siguen guardados en este dispositivo.')}
   if(!response||typeof response.ok!=='boolean'||!Number.isInteger(response.status))throw responseError();
   if(!response.ok)throw httpError(response.status,operation);
   if(noBody)return;
   try{return await response.json()}catch{if(controller.signal.aborted)throw fail('TIMEOUT','La conexión tardó demasiado. Tus datos siguen guardados en este dispositivo.');throw responseError()}
  };
  try{return await Promise.race([run(),deadline])}finally{clearTimeout(timeout)}
 }
 const user=value=>{
  if(!isObject(value))throw responseError();
  try{uuid(value.id)}catch{throw responseError()}
  return value;
 };
 const session=value=>{
  if(!isObject(value)||typeof value.access_token!=='string'||typeof value.refresh_token!=='string')throw responseError();
  try{token(value.access_token);token(value.refresh_token)}catch{throw responseError()}
  user(value.user);
  if(value.expires_in!==undefined&&(!Number.isFinite(value.expires_in)||value.expires_in<=0))throw responseError();
  if(value.expires_at!==undefined&&(!Number.isFinite(value.expires_at)||value.expires_at<=0))throw responseError();
  return value;
 };
 const row=(rows,uid,{empty=false,conflict=false,expectedRevision}={})=>{
  if(!Array.isArray(rows)||rows.length>1)throw responseError();
  if(!rows.length){if(conflict)throw fail('CONFLICT','Hay cambios más recientes en tu cuenta. Revisa la versión guardada antes de sincronizar.');if(empty)return null;throw responseError()}
  const value=rows[0];
  if(!isObject(value)||!isObject(value.state)||!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.updated_at!=='string'||!Number.isFinite(Date.parse(value.updated_at))||(value.user_id!==undefined&&value.user_id!==uid)||(expectedRevision!==undefined&&value.revision!==expectedRevision))throw responseError();
  return {state:value.state,revision:value.revision,updatedAt:value.updated_at};
 };
 const tablePath=uid=>'/rest/v1/planner_accounts?user_id=eq.'+uuid(uid);
 return Object.freeze({
  async signUp(email,password,name){
   const login=credentials(email,password);
   if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw fail('INPUT','Escribe el nombre que quieres usar en tu cuenta.');
   const query=redirect?'?'+new URLSearchParams({redirect_to:redirect.href}).toString():'';
   const value=await request('/auth/v1/signup'+query,{method:'POST',body:{...login,data:{full_name:name.trim()}},operation:'signUp'});
   if(isObject(value)&&value.access_token!==undefined)return session(value);
   return {user:user(isObject(value)&&value.user!==undefined?value.user:value)};
  },
  async signIn(email,password){return session(await request('/auth/v1/token?grant_type=password',{method:'POST',body:credentials(email,password),operation:'signIn'}))},
  async refresh(refreshToken){return session(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:token(refreshToken)},operation:'refresh'}))},
  async getUser(accessToken){return user(await request('/auth/v1/user',{accessToken:token(accessToken),operation:'user'}))},
  async signOut(accessToken){await request('/auth/v1/logout?scope=local',{method:'POST',accessToken:token(accessToken),operation:'signOut',noBody:true})},
  async readState(uid,accessToken){uid=uuid(uid);return row(await request(tablePath(uid)+'&select=state,revision,updated_at',{accessToken:token(accessToken),operation:'read'}),uid,{empty:true})},
  async insertState(uid,value,accessToken){
   uid=uuid(uid);
   return row(await request('/rest/v1/planner_accounts',{method:'POST',accessToken:token(accessToken),body:{user_id:uid,state:state(value),revision:1},operation:'insert',representation:true}),uid,{expectedRevision:1});
  },
  async updateState(uid,baseRevision,value,accessToken){
   uid=uuid(uid);
   const expected=revision(baseRevision);
   if(expected===Number.MAX_SAFE_INTEGER)throw invalid();
   return row(await request(tablePath(uid)+'&revision=eq.'+expected,{method:'PATCH',accessToken:token(accessToken),body:{state:state(value),revision:expected+1},operation:'update',representation:true}),uid,{conflict:true,expectedRevision:expected+1});
  }
 });
}
