function showAppWelcome(){
 if(document.querySelector('.welcome-splash'))return;
 const opener=document.activeElement,dialog=document.createElement('dialog');dialog.className='welcome-splash';dialog.setAttribute('aria-labelledby','splash-title');
 const name=String(S.profileName||'Giancarlo'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const emblem='<svg viewBox="0 0 256 212" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="splash-plate" x1="76" y1="36" x2="187" y2="174" gradientUnits="userSpaceOnUse"><stop stop-color="#6EBCFF"/><stop offset=".45" stop-color="#288BF2"/><stop offset="1" stop-color="#1355B7"/></linearGradient><linearGradient id="splash-edge" x1="67" y1="35" x2="193" y2="174" gradientUnits="userSpaceOnUse"><stop stop-color="#CDEBFF"/><stop offset=".55" stop-color="#65B3FF" stop-opacity=".5"/><stop offset="1" stop-color="#1B63CD"/></linearGradient><radialGradient id="splash-glow"><stop stop-color="#318AFF" stop-opacity=".28"/><stop offset="1" stop-color="#318AFF" stop-opacity="0"/></radialGradient></defs><path d="M11 4H245V208H11z" fill="url(#splash-glow)"/><path d="M33 76 165 18l58 132-132 58z" stroke="#4B86CA" stroke-opacity=".22"/><rect x="69" y="37" width="130" height="136" rx="30" transform="rotate(9 134 105)" fill="#163A68" stroke="#4386CB" stroke-opacity=".6"/><rect x="61" y="32" width="134" height="136" rx="30" transform="rotate(-8 128 100)" fill="url(#splash-plate)" stroke="url(#splash-edge)" stroke-width="1.5"/><path d="M84 48h28" stroke="#DDF3FF" stroke-opacity=".42" stroke-width="2" stroke-linecap="round" transform="rotate(-8 128 100)"/><g transform="rotate(-32 128 101)" stroke="#F1F8FF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M106 101h44"/><rect x="90" y="81" width="16" height="40" rx="5"/><rect x="78" y="88" width="12" height="26" rx="4"/><rect x="150" y="81" width="16" height="40" rx="5"/><rect x="166" y="88" width="12" height="26" rx="4"/></g><path d="m202 35 2.5 7.5 7.5 2.5-7.5 2.5-2.5 7.5-2.5-7.5-7.5-2.5 7.5-2.5z" fill="#A7D4FF"/><path d="M42 158h19m-9.5-9.5v19" stroke="#689FDC" stroke-width="1.5" stroke-linecap="round"/><path d="M88 192h80" stroke="#669BD2" stroke-opacity=".3" stroke-linecap="round"/></svg>';
 dialog.innerHTML='<div class="splash-content"><div class="splash-emblem" aria-hidden="true">'+emblem+'</div><p class="eyebrow splash-brand">MI GYM PLANNER</p><h2 id="splash-title">Bienvenido,<br><span>'+esc(name)+'</span></h2><p class="splash-subtitle">Tu progreso empieza contigo.</p><button class="splash-enter" autofocus>Entrar '+uiIcon('arrow')+'</button><span class="splash-signoff" aria-hidden="true">A TU RITMO · CADA DÍA</span></div>';
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
