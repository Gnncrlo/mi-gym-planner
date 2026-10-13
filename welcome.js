function showAppWelcome(){
 if(document.querySelector('.welcome-splash'))return;
 const opener=document.activeElement,dialog=document.createElement('dialog');dialog.className='welcome-splash';dialog.setAttribute('aria-labelledby','splash-title');
 const name=String(S.profileName||'Giancarlo'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 dialog.innerHTML='<div class="splash-content"><div class="splash-mark" aria-hidden="true">✦</div><p class="eyebrow">MI GYM PLANNER</p><h2 id="splash-title">Bienvenido,<br><span>'+esc(name)+'</span></h2><p>Un nuevo día para avanzar a tu ritmo.</p><button class="splash-enter" autofocus>Entrar '+uiIcon('arrow')+'</button></div>';
 document.body.append(dialog);dialog.showModal();let exiting=false,exitTimeout=null;
 function finish(){if(dialog.isConnected&&dialog.open)dialog.close()}
 function dismiss(){
  if(exiting)return;exiting=true;clearTimeout(timeout);
  if(reduced){finish();return}
  dialog.classList.add('is-exiting');exitTimeout=setTimeout(finish,240);
 }
 // The app is already rendered behind the overlay; fade out without a blank frame.
 const timeout=setTimeout(dismiss,reduced?350:1300);
 dialog.querySelector('button').addEventListener('click',dismiss);
 dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});
 dialog.addEventListener('transitionend',e=>{if(exiting&&e.target===dialog&&e.propertyName==='opacity')finish()});
 dialog.addEventListener('close',()=>{clearTimeout(timeout);clearTimeout(exitTimeout);dialog.remove();if(opener?.isConnected&&opener!==document.body)opener.focus()});
}
function attachWelcome(){
 showAppWelcome();let welcomeHiddenAt=null;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)welcomeHiddenAt=Date.now();else if(welcomeHiddenAt&&Date.now()-welcomeHiddenAt>30*60*1000){welcomeHiddenAt=null;showAppWelcome()}});
}
