(() => {
 const dialog=document.createElement('dialog');
 dialog.className='exercise-dialog'; dialog.setAttribute('aria-labelledby','exercise-title');
 document.body.append(dialog);
 let slot=null, returnFocus=null, previousOverflow='';
 function photoMarkup(name, original) {
  const exact=exercisePhotos[name], photo=exact||exercisePhotos[original];
  const visualName=exact?name:original;
  const note=exact?(photo.note||'Fotos de una persona realizando el ejercicio.'): `Referencia visual: ${original}. El equipo o la postura de esta variante son distintos; consulta sus pasos.`;
  return `<div class="guide-art"><div class="guide-visual-controls" role="group" aria-label="Vista del ejercicio"><button data-guide-visual="technique" aria-pressed="true">Técnica</button><button data-guide-visual="muscles" aria-pressed="false">Músculos ${uiIcon('arrow')}</button></div><div class="guide-technique-view"><img class="exercise-photo" src="${esc(photo.images[0])}" alt="${esc(visualName)}: posición 1" decoding="async" width="850" height="567"><div class="photo-error" hidden>No se pudo cargar la foto. Las instrucciones siguen disponibles debajo.</div>
   <div class="photo-controls" role="group" aria-label="Posiciones de ${esc(visualName)}">${photo.images.map((src,i)=>`<button type="button" data-photo="${esc(src)}" data-photo-position="${i+1}" data-photo-name="${esc(visualName)}" aria-pressed="${i===0}">Posición ${i+1}</button>`).join('')}</div><p class="photo-caption">${esc(note)}</p></div><div class="guide-muscles-view" hidden>${renderMuscleAtlas(name)}</div></div>`;
 }
 function openGuide(index, opener) {
  slot=index; returnFocus=opener;
  const original=plan[S.day].ex[index][0], name=chosenExercise(index), guide=exerciseGuide[name];
  const variants=exerciseGuide[original].variants;const locked=workoutClosure();
  const target=exerciseTargets[name],sector=muscleSectors[target.sector];
  dialog.innerHTML=`<div class="guide-head"><h2 id="exercise-title">${esc(name)}</h2><button class="guide-close" aria-label="Cerrar ficha" autofocus>×</button></div>
   ${name!==original?`<p class="guide-note">Sustituye a ${esc(original)} en esta semana y día.</p>`:''}
   ${photoMarkup(name,original)}<p class="guide-note">Sigue los pasos y empieza con poca resistencia.</p>
   <div class="target-panel"><span class="food-kicker">ZONA QUE TRABAJAS · ${esc(sector.name.toUpperCase())}</span><h3>${esc(target.zone)}</h3><p>${esc(target.detail)}</p><p><b>También participan:</b> ${esc(target.secondary)}.</p></div><h3>Músculos principales</h3><p>${esc(guide.muscles)}</p>
   <h3>Paso a paso</h3><ol>${guide.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
   <h3>Errores frecuentes</h3><ul>${guide.mistakes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
   ${locked?'<p class="closed-lock-note">Día cerrado. Reábrelo desde Rutinas para elegir otra variante.</p>':''}<h3>Tres alternativas</h3><p class="guide-note">Conservas las series y repeticiones previstas. La carga registrada se conserva como referencia: ajústala al equipo y al ejercicio elegido.</p>
   ${variants.map((v,i)=>`<div class="variant-option"><b>${esc(v)}</b><p class="variant-zone">${esc(muscleSectors[exerciseTargets[v].sector].name)} · ${esc(exerciseTargets[v].zone)}</p><p class="guide-note">${esc(exerciseGuide[v].steps.join(' '))}</p><button class="btn ${v===name?'secondary':''}" data-variant="${i}" ${v===name||locked?'disabled':''}>${v===name?'En tu rutina':'Usar esta variante'}</button></div>`).join('')}
   ${name!==original?`<button class="btn secondary" data-original ${locked?'disabled':''}>Volver al ejercicio original</button>`:''}`;
  dialog.querySelector('.exercise-photo').addEventListener('error',()=>{dialog.querySelector('.photo-error').hidden=false});
  dialog.querySelector('.exercise-photo').addEventListener('load',()=>{dialog.querySelector('.photo-error').hidden=true});
  previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();dialog.scrollTop=0;
 }
 document.addEventListener('click',e=>{const button=e.target.closest('[data-guide]');if(button)openGuide(+button.dataset.guide,button)});
 dialog.addEventListener('click',e=>{
  if(e.target.closest('.guide-close'))dialog.close();
  const visual=e.target.closest('[data-guide-visual]');if(visual){const muscles=visual.dataset.guideVisual==='muscles';dialog.querySelector('.guide-technique-view').hidden=muscles;dialog.querySelector('.guide-muscles-view').hidden=!muscles;dialog.querySelectorAll('[data-guide-visual]').forEach(b=>b.setAttribute('aria-pressed',String(b===visual)))}
  const view=e.target.closest('[data-atlas-view]');if(view){dialog.querySelector('.muscle-atlas').dataset.view=view.dataset.atlasView;dialog.querySelectorAll('[data-atlas-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===view)))}
  const photoButton=e.target.closest('[data-photo]');
  if(photoButton){
   const img=dialog.querySelector('.exercise-photo');
   img.src=photoButton.dataset.photo;img.alt=photoButton.dataset.photoName+': posición '+photoButton.dataset.photoPosition;
   dialog.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b===photoButton)));
  }
  const button=e.target.closest('[data-variant],[data-original]');
  if(!button||workoutClosure())return;
  const original=plan[S.day].ex[slot][0];
  S.substitutions??={};
  if(button.hasAttribute('data-original'))delete S.substitutions[wk(slot)];
  else S.substitutions[wk(slot)]=exerciseGuide[original].variants[+button.dataset.variant];
  save();render();returnFocus=document.querySelector(`[data-guide="${slot}"]`);dialog.close();
 });
 dialog.addEventListener('change',e=>{if(e.target.hasAttribute('data-atlas-secondary'))dialog.querySelector('.muscle-atlas').classList.toggle('hide-secondary',!e.target.checked)});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;returnFocus?.focus()});
})();
