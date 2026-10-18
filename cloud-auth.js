/* Account credentials are separate from the planner. Access tokens stay in memory. */
function createGymCloudAuth({client,storage,projectId,now=()=>Date.now()}={}){
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const required=['signIn','signUp','refresh','getUser','signOut'];
  function error(code,message){const problem=new Error(message);problem.code=code;return problem}
  if(!client||required.some(method=>typeof client[method]!=='function')||!storage||['getItem','setItem','removeItem'].some(method=>typeof storage[method]!=='function')||typeof projectId!=='string'||!projectId.trim()||typeof now!=='function'){
    throw error('AUTH_CONFIG','No se pudo configurar el inicio de sesión.');
  }
  const key=`mgp-cloud-auth-v1:${projectId}`;
  let generation=0,closed=false,session=null,pendingRefresh=null,rememberedCredentials=null;
  const validToken=value=>typeof value==='string'&&value.length>0&&value.length<=16384&&!/\s/.test(value);
  const validUid=value=>typeof value==='string'&&uuid.test(value);
  const currentUser=()=>session&&!closed?{...session.user}:null;
  function assertOpen(){if(closed)throw error('AUTH_CLOSED','La conexión de la cuenta está cerrada.')}
  function assertActive(expected){assertOpen();if(generation!==expected)throw error('AUTH_STALE','La operación de la cuenta fue reemplazada.')}
  function begin(){assertOpen();generation++;pendingRefresh=null;return generation}
  function readRaw(){try{return storage.getItem(key)}catch(_){throw error('AUTH_STORAGE','No se pudo leer la sesión guardada.')}}
  function parseCredentials(raw){
    if(typeof raw!=='string'||!raw)return null;
    try{
      const stored=JSON.parse(raw);
      if(!stored||typeof stored!=='object'||Array.isArray(stored)||!validToken(stored.refreshToken)||!validUid(stored.uid))return null;
      return {refreshToken:stored.refreshToken,uid:stored.uid.toLowerCase()};
    }catch(_){return null}
  }
  function clock(){const timestamp=now();if(typeof timestamp!=='number'||!Number.isFinite(timestamp))throw error('AUTH_CONFIG','No se pudo comprobar la vigencia de la sesión.');return timestamp}
  function publicUser(user){
    const metadata=user.user_metadata;
    return {
      id:user.id.toLowerCase(),
      email:typeof user.email==='string'?user.email.trim().slice(0,320):'',
      name:metadata&&typeof metadata.full_name==='string'?metadata.full_name.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,120):''
    };
  }
  async function verify(raw,expectedGeneration,expectedUid){
    assertActive(expectedGeneration);
    if(!raw||typeof raw!=='object'||!validToken(raw.access_token)||!validToken(raw.refresh_token)||!raw.user||!validUid(raw.user.id)){
      throw error('AUTH_INVALID','El servidor devolvió una sesión no válida.');
    }
    const candidateUid=raw.user.id.toLowerCase();
    if(expectedUid&&candidateUid!==expectedUid)throw error('AUTH_INVALID','La sesión no corresponde a la cuenta solicitada.');
    const receivedAt=clock();
    const expiresAt=typeof raw.expires_at==='number'&&Number.isFinite(raw.expires_at)?raw.expires_at*1000:
      typeof raw.expires_in==='number'&&Number.isFinite(raw.expires_in)&&raw.expires_in>0?receivedAt+raw.expires_in*1000:NaN;
    if(!Number.isFinite(expiresAt)||expiresAt<=receivedAt)throw error('AUTH_INVALID','La sesión recibida ya no está vigente.');
    const user=await client.getUser(raw.access_token);
    assertActive(expectedGeneration);
    if(!user||!validUid(user.id)||user.id.toLowerCase()!==candidateUid||(expectedUid&&user.id.toLowerCase()!==expectedUid)){
      throw error('AUTH_INVALID','No se pudo verificar la identidad de la cuenta.');
    }
    return {user:publicUser(user),accessToken:raw.access_token,refreshToken:raw.refresh_token,expiresAt};
  }
  function commit(candidate,expectedGeneration){
    assertActive(expectedGeneration);
    // A failed storage write must leave the previous account usable.
    try{storage.setItem(key,JSON.stringify({refreshToken:candidate.refreshToken,uid:candidate.user.id}))}
    catch(_){throw error('AUTH_STORAGE','No se pudo guardar la sesión. Tus datos anteriores se conservan.');}
    session=candidate;
    rememberedCredentials={uid:candidate.user.id,refreshToken:candidate.refreshToken};
    return currentUser();
  }
  function forgetRejected(credentials,expectedGeneration){
    assertActive(expectedGeneration);
    const stored=parseCredentials(readRaw());
    if(stored&&stored.uid===credentials.uid&&stored.refreshToken===credentials.refreshToken){
      try{storage.removeItem(key)}catch(_){throw error('AUTH_STORAGE','No se pudo eliminar la sesión no válida.');}
    }
    if(session&&session.user.id===credentials.uid&&session.refreshToken===credentials.refreshToken)session=null;
  }
  async function refreshCredentials(credentials,expectedGeneration){
    const sourceSession=session;
    try{
      const raw=await client.refresh(credentials.refreshToken);
      assertActive(expectedGeneration);
      const verified=await verify(raw,expectedGeneration,credentials.uid);
      const stored=parseCredentials(readRaw());
      if(session!==sourceSession||!stored||stored.uid!==credentials.uid||stored.refreshToken!==credentials.refreshToken){
        throw error('AUTH_STALE','La sesión guardada ha cambiado.');
      }
      return commit(verified,expectedGeneration);
    }catch(problem){
      assertActive(expectedGeneration);
      if(session!==sourceSession)throw error('AUTH_STALE','La cuenta activa ha cambiado.');
      if(problem&&(problem.status===400||problem.status===401||problem.code==='AUTH_INVALID'))forgetRejected(credentials,expectedGeneration);
      throw problem;
    }
  }
  async function signIn(email,password){
    const operation=begin();
    try{
      const raw=await client.signIn(email,password);
      assertActive(operation);
      return commit(await verify(raw,operation),operation);
    }catch(problem){assertActive(operation);throw problem}
  }
  async function signUp(email,password,name){
    const operation=begin();
    try{
      const raw=await client.signUp(email,password,name);
      assertActive(operation);
      if(raw&&raw.access_token==null&&raw.refresh_token==null){
        const user=raw.user||raw;
        if(!validUid(user.id))throw error('AUTH_INVALID','No se pudo confirmar la creación de la cuenta.');
        return {requiresConfirmation:true};
      }
      return {requiresConfirmation:false,user:commit(await verify(raw,operation),operation)};
    }catch(problem){assertActive(operation);throw problem}
  }
  async function resume(){
    const operation=begin();
    const credentials=parseCredentials(readRaw());
    if(!credentials)return null;
    rememberedCredentials=credentials;
    return refreshCredentials(credentials,operation);
  }
  async function getToken(){
    assertOpen();
    if(!session)throw error('NOT_AUTHENTICATED','Inicia sesión para sincronizar tus datos.');
    if(session.expiresAt-clock()>60000)return session.accessToken;
    const operation=generation,credentials={uid:session.user.id,refreshToken:session.refreshToken};
    let refresh=pendingRefresh;
    if(!refresh||refresh.generation!==operation||refresh.refreshToken!==credentials.refreshToken){
      refresh={generation:operation,refreshToken:credentials.refreshToken,promise:null};
      refresh.promise=refreshCredentials(credentials,operation);
      pendingRefresh=refresh;
    }
    try{await refresh.promise;assertActive(operation);if(!session||session.user.id!==credentials.uid)throw error('AUTH_STALE','La cuenta activa ha cambiado.');return session.accessToken}
    finally{if(pendingRefresh===refresh)pendingRefresh=null}
  }
  async function signOut(){
    const operation=begin(),previousToken=session&&session.accessToken;
    const own=session?{uid:session.user.id,refreshToken:session.refreshToken}:rememberedCredentials;
    const raw=readRaw(),stored=parseCredentials(raw);
    // Another tab may have replaced this shared key after this controller signed in.
    // Never delete its credentials when closing only this controller's account.
    const stale=!!stored&&(!own||stored.uid!==own.uid||stored.refreshToken!==own.refreshToken);
    if(!stale&&raw!==null){
      try{storage.removeItem(key)}catch(_){throw error('AUTH_STORAGE','No se pudo cerrar la sesión guardada.');}
    }
    session=null;
    rememberedCredentials=null;
    const localWarning=stale?'Cerraste tu sesión en esta pestaña. Se conservó la sesión guardada desde otra pestaña.':'';
    if(!previousToken)return {remoteSignedOut:true,stale,warning:localWarning};
    try{
      await client.signOut(previousToken);
      assertActive(operation);
      return {remoteSignedOut:true,stale,warning:localWarning};
    }catch(problem){
      assertActive(operation);
      return {remoteSignedOut:false,stale,warning:localWarning?`${localWarning} No se pudo confirmar el cierre en el servidor.`:'La sesión se cerró en este dispositivo. No se pudo confirmar el cierre en el servidor.'};
    }
  }
  function close(){closed=true;generation++;session=null;pendingRefresh=null;rememberedCredentials=null}
  return {signIn,signUp,resume,getToken,signOut,currentUser,close};
}
