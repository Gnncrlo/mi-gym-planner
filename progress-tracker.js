let strengthExercise='';
function weightPoints(state=S){
 const points=new Map();for(const e of state.body||[])if(validLocalDay(e.date)&&optionalNumber(e.kg)>0)points.set(e.date,{date:e.date,value:Number(e.kg)});
 return [...points.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function trendChart(points,unit,label){
 if(!points.length)return '<p class="stats-empty">Todavía no hay datos para esta gráfica.</p>';
 const view=points.slice(-12),values=view.map(e=>e.value),min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.2,.5),low=Math.max(0,min-pad),high=max+pad;
 const first=Date.parse(view[0].date+'T12:00Z'),last=Date.parse(view.at(-1).date+'T12:00Z'),range=last-first;
 const xy=view.map(e=>({x:range?46+((Date.parse(e.date+'T12:00Z')-first)/range)*264:178,y:130-((e.value-low)/(high-low))*100,...e}));
 const format=n=>Number(n.toFixed(1)).toLocaleString('es-PE');
 return `<svg class="trend-chart" viewBox="0 0 330 170" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><path d="M46 30H310M46 80H310M46 130H310" stroke="#2b4160" stroke-width="1"/><text x="3" y="34">${format(high)}</text><text x="3" y="84">${format((low+high)/2)}</text><text x="3" y="134">${format(low)}</text><polyline points="${xy.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#6eb4ff" stroke-width="3" stroke-linejoin="round"/>${xy.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#a0d1ff"><title>${esc(p.date)}: ${format(p.value)} ${unit}</title></circle>`).join('')}<text x="46" y="157">${esc(view[0].date.slice(5))}</text><text x="310" y="157" text-anchor="end">${esc(view.at(-1).date.slice(5))}</text></svg><p class="hint">${view.length} ${view.length===1?'fecha registrada':'fechas registradas'} · ${unit}</p>`;
}
function strengthRecords(state=S){
 const records=[];
 const captured=new Set(dailyHistory(state).flatMap(s=>(s.exercises||[]).map(e=>s.week+'-'+s.day+'-'+e.slot)));
 for(const snapshot of dailyHistory(state))for(const e of snapshot.exercises||[])if(e.done&&optionalNumber(e.load)>0)records.push({name:e.name,date:snapshot.date,load:Number(e.load),reps:optionalNumber(e.reps),source:'cierre',week:snapshot.week});
 for(const [key,value] of Object.entries(state.loads||{})){
  if(captured.has(key))continue;
  const m=key.match(/^(\d+)-([0-6])-(\d+)$/);if(!m||!state.done?.[key]||!(optionalNumber(value)>0))continue;
  const [,week,day,slot]=m,exercise=plan[+day].ex[+slot];if(!exercise)continue;
  const original=exercise[0],variant=state.substitutions?.[key],name=exerciseGuide[original].variants.includes(variant)?variant:original;
  if(records.some(r=>r.week===+week&&r.name===name&&r.load===Number(value)&&r.reps===optionalNumber(state.reps?.[key])))continue;
  records.push({name,date:null,load:Number(value),reps:optionalNumber(state.reps?.[key]),source:'semana',week:+week});
 }
 return records;
}
function renderWeightStatistics(){
 const points=weightPoints(),first=points[0],latest=points.at(-1),difference=latest&&first?latest.value-first.value:null;
 return `<h3>Evolución del peso</h3>${trendChart(points,'kg','Peso registrado por fecha')}<div class="stats-inline"><span>Primer registro <b>${first?esc(first.value)+' kg':'—'}</b></span><span>Cambio registrado <b>${difference===null?'—':(difference>0?'+':'')+Number(difference.toFixed(1))+' kg'}</b></span></div><details class="stats-record-list"><summary>Ver mis registros de peso</summary>${(S.body||[]).slice().reverse().map(e=>`<p>${esc(e.date)} <b>${esc(e.kg)} kg</b></p>`).join('')}</details>`;
}
function renderStrengthStatistics(){
 const records=strengthRecords(),names=[...new Set(records.map(r=>r.name))].sort((a,b)=>a.localeCompare(b,'es'));
 if(!names.includes(strengthExercise))strengthExercise=names[0]||'';
 const selected=records.filter(r=>r.name===strengthExercise),dated=selected.filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date)),best=selected.length?Math.max(...selected.map(r=>r.load)):null;
 return `<h3>Tu fuerza, ejercicio por ejercicio</h3><p class="hint">Compara cargas y repeticiones del mismo ejercicio y equipo. No se suman cargas de movimientos diferentes.</p>${names.length?`<label class="label" for="strengthExercise">Ejercicio</label><select id="strengthExercise" class="field" data-strength-exercise>${names.map(n=>`<option ${n===strengthExercise?'selected':''}>${esc(n)}</option>`).join('')}</select><div class="stats-best"><span>Mejor carga registrada</span><strong>${best}<small> kg</small></strong></div>${trendChart(dated.map(r=>({date:r.date,value:r.load})),'kg','Cargas de '+strengthExercise+' en días cerrados')}<p class="hint">La gráfica usa fechas de cierres. Los registros antiguos conservan su semana y no reciben fechas inventadas. El valor de repeticiones es el que anotaste; no estima máximos ni volumen total.</p><div class="strength-records">${selected.map(r=>`<div><span>${r.date||'Semana '+r.week+' · sin fecha de cierre'}</span><b>${r.load} kg · ${r.reps===null?'—':r.reps} reps</b></div>`).join('')}</div>`:'<p class="stats-empty">Marca un ejercicio como completado y registra su carga para empezar. Al cerrar días, guardarás también su evolución por fecha.</p>'}`;
}
function renderDayHistory(){
 const history=dailyHistory();
 return `<h3>Tus días guardados</h3><p class="hint">Cada cierre conserva una copia del día. Reabrir no borra las versiones anteriores.</p>${history.length?history.map(entry=>{const c=snapshotCounts(entry),active=closedDay(entry.date);return `<article class="history-day"><div><span class="history-date">${esc(entry.date)}</span><h4>${esc(entry.title)} · Semana ${entry.week}</h4><p>${c.done}/${c.total} ejercicios · ${c.cardio} min de cardio · ${entry.weightToday?esc(entry.weightToday.kg)+' kg':'peso sin registrar'}</p><span class="history-status">${active?'Cerrado':'Reabierto · resumen anterior guardado'}</span></div><button class="btn secondary" data-day-summary="${esc(entry.id)}">Ver</button><details class="history-versions"><summary>Versiones guardadas</summary>${(S.dayHistory||[]).filter(e=>e.date===entry.date).slice().reverse().map(e=>`<button class="text-link" data-day-summary="${esc(e.id)}">${esc(new Intl.DateTimeFormat('es-PE',{dateStyle:'short',timeStyle:'short'}).format(new Date(e.closedAt)))} · Ver resumen</button>`).join('')}</details></article>`}).join(''):'<div class="stats-empty">Cuando termines, entra en Mi Día o ve al final de Rutinas y pulsa «Revisar y cerrar el día».</div>'}`;
}
function renderProgressDashboard(){
 const latest=weightPoints().at(-1);
 const tabs=[['peso','Peso'],['fuerza','Fuerza'],['historial','Días'],['entrenos','Semana'],['habitos','Agua']];
 let content=progressTab==='fuerza'?renderStrengthStatistics():progressTab==='historial'?renderDayHistory():progressTab==='peso'?renderWeightStatistics():progressTab==='entrenos'?'<h3>Esta semana</h3><div class="barrow">'+plan.map((p,i)=>'<div title="'+esc(p.day)+': '+completed(i)+' ejercicios" style="height:'+Math.max(4,(completed(i)/(p.ex.length||1))*100)+'%"></div>').join('')+'</div><p class="hint">L · M · M · J · V · S · D</p>':'<h3>Agua últimos 7 registros</h3><div class="barrow">'+Object.entries(S.water).slice(-7).map(([k,v])=>'<div title="'+esc(k)+'" style="height:'+Math.max(4,Math.min(100,v/25))+'%"></div>').join('')+'</div>';
 return `<h2>Mi progreso</h2><p class="section-subtitle">Tu constancia, registrada día a día.</p><div class="grid"><div class="stat"><span class="muted small">Último peso registrado</span><strong>${latest?esc(latest.value)+' kg':'—'}</strong><span class="stat-note">${latest?esc(latest.date):'Registra tu primera medición'}</span></div><div class="stat"><span class="muted small">Días cerrados</span><strong>${Object.keys(S.closedDays||{}).filter(d=>closedDay(d)).length}</strong><span class="stat-note">Con un resumen guardado</span></div></div><div class="card"><h3>Registrar peso</h3><div class="row"><input id="newWeight" aria-label="Peso en kg" type="number" class="field" step="0.1" min="20" placeholder="Peso (kg)"><button class="btn" data-action="addWeight">Guardar</button></div></div><div class="card"><div class="tabline stats-tabs">${tabs.map(([id,label])=>`<button class="${progressTab===id?'active':''}" data-progress="${id}">${label}</button>`).join('')}</div>${content}</div>`;
}
