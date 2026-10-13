function showAppWelcome(){
 if(document.querySelector('.welcome-splash'))return;
 const opener=document.activeElement,dialog=document.createElement('dialog');dialog.className='welcome-splash';dialog.setAttribute('aria-labelledby','splash-title');
 const name=String(S.profileName||'Giancarlo');
 dialog.innerHTML='<div class="splash-content"><div class="splash-mark" aria-hidden="true">✦</div><p class="eyebrow">MI GYM PLANNER</p><h2 id="splash-title">Bienvenido,<br><span>'+esc(name)+'</span></h2><p>Un nuevo día para avanzar a tu ritmo.</p><button class="splash-enter" autofocus>Entrar '+uiIcon('arrow')+'</button></div>';
 document.body.append(dialog);dialog.showModal();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const timeout=setTimeout(()=>dialog.isConnected&&dialog.close(),reduced?350:1700);
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{clearTimeout(timeout);dialog.remove();if(opener?.isConnected&&opener!==document.body)opener.focus()});
}
function attachWelcome(){
 showAppWelcome();let welcomeHiddenAt=null;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)welcomeHiddenAt=Date.now();else if(welcomeHiddenAt&&Date.now()-welcomeHiddenAt>30*60*1000){welcomeHiddenAt=null;showAppWelcome()}});
}
