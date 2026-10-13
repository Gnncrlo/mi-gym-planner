(() => {
 const dialog=document.createElement('dialog');
 dialog.className='exercise-dialog'; dialog.setAttribute('aria-labelledby','exercise-title');
 document.body.append(dialog);
 let slot=null, returnFocus=null, previousOverflow='';
 function openGuide(index, opener) {
  slot=index; returnFocus=opener;
  const original=plan[S.day].ex[index][0], name=chosenExercise(index), guide=exerciseGuide[name];
  const variants=exerciseGuide[original].variants;
  dialog.innerHTML=`<div class="guide-head"><h2 id="exercise-title">${esc(name)}</h2><button class="guide-close" aria-label="Cerrar ficha" autofocus>×</button></div>
   ${name!==original?`<p class="guide-note">Sustituye a ${esc(original)} en esta semana y día.</p>`:''}
   <div class="guide-art">${exerciseIllustration(guide,name)}</div><p class="guide-note">Esquema del movimiento. Sigue los pasos y empieza con poca resistencia.</p>
   <h3>Músculos principales</h3><p>${esc(guide.muscles)}</p>
   <h3>Paso a paso</h3><ol>${guide.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
   <h3>Errores frecuentes</h3><ul>${guide.mistakes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
   <h3>Tres alternativas</h3><p class="guide-note">Conservas las series y repeticiones previstas. La carga registrada se conserva como referencia: ajústala al equipo y al ejercicio elegido.</p>
   ${variants.map((v,i)=>`<div class="variant-option"><b>${esc(v)}</b><p class="guide-note">${esc(exerciseGuide[v].steps.join(' '))}</p><button class="btn ${v===name?'secondary':''}" data-variant="${i}" ${v===name?'disabled':''}>${v===name?'En tu rutina':'Usar esta variante'}</button></div>`).join('')}
   ${name!==original?'<button class="btn secondary" data-original>Volver al ejercicio original</button>':''}`;
  previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();dialog.scrollTop=0;
 }
 document.addEventListener('click',e=>{const button=e.target.closest('[data-guide]');if(button)openGuide(+button.dataset.guide,button)});
 dialog.addEventListener('click',e=>{
  if(e.target.closest('.guide-close'))dialog.close();
  const button=e.target.closest('[data-variant],[data-original]');
  if(!button)return;
  const original=plan[S.day].ex[slot][0];
  S.substitutions??={};
  if(button.hasAttribute('data-original'))delete S.substitutions[wk(slot)];
  else S.substitutions[wk(slot)]=exerciseGuide[original].variants[+button.dataset.variant];
  save();render();returnFocus=document.querySelector(`[data-guide="${slot}"]`);dialog.close();
 });
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;returnFocus?.focus()});
})();
