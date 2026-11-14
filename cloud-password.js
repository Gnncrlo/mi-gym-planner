// Recovery credentials live only in memory and are removed from the address bar.
let passwordRecoveryToken='',passwordRecoveryBusy=false,passwordRecoveryError='';
function capturePasswordRecovery(){
 const fragment=new URLSearchParams(window.location.hash.slice(1));
 if(fragment.get('type')==='recovery'&&fragment.get('access_token')){
  passwordRecoveryToken=fragment.get('access_token');
  ++cloudAccountEpoch;cloudController?.close();cloudController=null;cloudReady=false;cloudUser=null;cloudBusy=false;cloudOpening=false;
  try{window.sessionStorage?.setItem(gymCloudRequireLoginKey,'1')}catch{}
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
 }
 if(fragment.has('error_code')){window.history.replaceState(null,'',window.location.pathname+window.location.search);cloudError='El enlace no es válido o ya venció. Solicita otro en Olvidé mi contraseña.'}
}
function renderPasswordRequestForm(){
 return `<form id="passwordRequestForm" class="profile-create-form"><h3>Recupera tu acceso</h3><p class="hint">Escribe el mismo correo con el que creaste tu cuenta. Recuperar el acceso no reemplaza tus registros.</p><label class="label" for="resetEmail">Correo electrónico</label><input class="field" id="resetEmail" data-cloud-field type="email" autocomplete="email" maxlength="254" value="${esc(cloudEmail)}" required><button class="btn" type="submit">Enviar enlace de recuperación</button><p class="hint">Abre el enlace del correo en este teléfono. Revisa spam. La entrega depende del servicio de correo; si no llega, no crees otra cuenta para recuperar tus registros.</p></form>`;
}
function renderPasswordResetForm(){
 return `<section class="card"><p class="eyebrow">RECUPERA TU ACCESO</p><h2>Elige tu nueva contraseña</h2><p>Tus entrenamientos y registros se conservan.</p><form id="passwordResetForm"><label class="label" for="resetPassword">Nueva contraseña · mínimo 8 caracteres</label><input class="field" id="resetPassword" data-cloud-field type="password" autocomplete="new-password" minlength="8" maxlength="4096" required ${passwordRecoveryBusy?'disabled':''}><button type="button" class="text-link" data-password-toggle="resetPassword">Mostrar contraseña</button><label class="label" for="resetPasswordConfirm">Repite la contraseña</label><input class="field" id="resetPasswordConfirm" data-cloud-field type="password" autocomplete="new-password" minlength="8" maxlength="4096" required ${passwordRecoveryBusy?'disabled':''}><p class="food-error" role="alert">${esc(passwordRecoveryError)}</p><button class="btn" ${passwordRecoveryBusy?'disabled':''}>${passwordRecoveryBusy?'Guardando…':'Guardar contraseña'}</button><button type="button" class="text-link" data-password-cancel ${passwordRecoveryBusy?'disabled':''}>Volver</button></form></section>`;
}
function passwordRecoveryClient(){return createGymCloudClient({...GYM_CLOUD_CONFIG,redirectUrl:'https://gnncrlo.github.io/mi-gym-planner/'})}
async function requestPlannerPassword(form){
 if(cloudBusy)return;
 const email=form.querySelector('#resetEmail').value.trim(),epoch=cloudAccountEpoch;
 cloudEmail=email;cloudBusy=true;cloudError='';cloudFormMessage='';render();
 try{
  await passwordRecoveryClient().requestPasswordReset(email);
  if(epoch===cloudAccountEpoch)cloudFormMessage='Si ese correo tiene una cuenta, recibirás un enlace para cambiar tu contraseña. Revisa también spam. Si no llega, puede ser un límite de envío o la configuración del correo.';
 }catch(error){if(epoch===cloudAccountEpoch)cloudError=cloudErrorText(error)}
 finally{if(epoch===cloudAccountEpoch){cloudBusy=false;render()}}
}
async function resetPlannerPassword(form){
 if(passwordRecoveryBusy||!passwordRecoveryToken)return;
 const password=form.querySelector('#resetPassword').value,confirmation=form.querySelector('#resetPasswordConfirm').value,token=passwordRecoveryToken;
 if(password!==confirmation){passwordRecoveryError='Las contraseñas no coinciden.';render();return}
 passwordRecoveryBusy=true;passwordRecoveryError='';render();
 try{
  const client=passwordRecoveryClient(),user=await client.getUser(token),updated=await client.updatePassword(token,password);
  if(user.id!==updated.id)throw Error('No se pudo verificar la cuenta. Solicita un enlace nuevo.');
  passwordRecoveryToken='';cloudFormMessage='Contraseña actualizada. Inicia sesión con el mismo correo para abrir tus registros de la nube.';cloudAuthView='signin';S.tab='mas';
 }catch(error){passwordRecoveryError=cloudErrorText(error)+' Si el enlace venció, vuelve y solicita uno nuevo.'}
 finally{passwordRecoveryBusy=false;render()}
}
function attachCloudPassword(){
 window.addEventListener('hashchange',()=>{capturePasswordRecovery();if(passwordRecoveryToken)render()});
 document.addEventListener('submit',event=>{
  if(event.target.id==='passwordRequestForm'){event.preventDefault();requestPlannerPassword(event.target)}
  if(event.target.id==='passwordResetForm'){event.preventDefault();resetPlannerPassword(event.target)}
 });
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-password-toggle]');if(toggle){const field=document.getElementById(toggle.dataset.passwordToggle);if(field){field.type=field.type==='password'?'text':'password';toggle.textContent=field.type==='text'?'Ocultar contraseña':'Mostrar contraseña'}}
  if(event.target.closest('[data-password-cancel]')&&!passwordRecoveryBusy){passwordRecoveryToken='';cloudAuthView='recover';S.tab='mas';render()}
 });
}
