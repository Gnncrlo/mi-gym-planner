// Daily advice is computed locally; it never modifies or uploads saved records.
function localDateKey(date=new Date()) {
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function dailyRecommendations(state, date=new Date()) {
 const key=localDateKey(date), day=(date.getDay()+6)%7, routine=plan[day];
 const waterValue=Number(state.water?.[key]), water=Number.isFinite(waterValue)?Math.max(0,waterValue):0;
 const sleepValue=state.sleep?.[key], hours=Number(sleepValue);
 const hasSleep=sleepValue!==undefined&&sleepValue!==null&&String(sleepValue).trim()!==''&&Number.isFinite(hours)&&hours>=0&&hours<=24;
 const done=routine.ex.filter((_,i)=>state.done?.[state.week+'-'+day+'-'+i]).length;
 const lowSleep=hasSleep&&hours<6;
 let training={icon:'dumbbell',tag:'MOVIMIENTO',title:'Hoy toca '+routine.title,text:routine.muscle+'. Empieza con movilidad suave y una serie ligera antes de aumentar la carga.',action:'Ver rutina de hoy',tab:'rutina',day};
 if(!routine.ex.length)training={icon:'moon',tag:'RECUPERACIÓN',title:'Hoy también cuenta descansar',text:'Tu plan marca descanso. Si te apetece, camina un poco o haz movilidad suave, sin convertirlo en otra sesión intensa.',action:'Organizar mi día',tab:'dia'};
 else if(done===routine.ex.length)training={icon:'check',tag:'SESIÓN COMPLETADA',title:'Buen trabajo, sesión terminada',text:'Ya marcaste todos los ejercicios de '+routine.title+' en la semana '+state.week+'. Ahora deja espacio para recuperarte.',action:'Ver mi progreso',tab:'progreso'};
 else if(lowSleep)training={...training,title:'Hoy, prioriza recuperarte',text:'Registraste '+hours+' h de sueño. Si te notas cansado, reduce la intensidad o descansa; no necesitas compensarlo entrenando más.'};
 else if(done>0)training={...training,title:'Avanza a tu ritmo',text:'Llevas '+done+' de '+routine.ex.length+' ejercicios de '+routine.title+' en la semana '+state.week+'. Mantén la técnica y toma tus descansos entre series.'};
 const hydration={icon:'drop',tag:'HIDRATACIÓN',title:water>=2500?'Tu registro de agua va al día':'Haz una pausa para hidratarte',text:water>=2500?'Registraste '+(water/1000).toFixed(2)+' L y alcanzaste la referencia de 2.5 L de la app. Ajusta lo que bebes a tu sed, actividad y necesidades.':water>0?'Llevas '+(water/1000).toFixed(2)+' L registrados hoy. Ten agua a mano y distribúyela durante el día; la referencia de la app es 2.5 L.':'Todavía no registraste agua hoy. Ten una botella a mano y anota lo que vayas bebiendo.',action:'Registrar agua',tab:'bienestar'};
 const tips=[
  {title:'La técnica antes que la carga',text:'Elige un peso que te permita controlar cada repetición. Revisa las fotos y los pasos de la ficha si tienes dudas.',tab:'rutina',action:'Consultar los ejercicios'},
  {title:'Prepara lo sencillo',text:'Deja lista tu ropa, una botella y lo que necesitas para entrenar. Menos decisiones pueden ayudarte a empezar.',tab:'dia',action:'Planificar mi día'},
  {title:'Dale espacio a tus comidas',text:'Reserva un momento para comer con calma. Una comida con una fuente de proteína, vegetales y energía puede acompañar tu entrenamiento.',tab:'comidas',action:'Ver comidas'},
  {title:'Haz una pausa activa',text:'Si llevas mucho tiempo sentado, levántate y camina un poco cuando puedas. Un pequeño descanso también suma.',tab:'dia',action:'Agregar una actividad'},
  {title:'Tu progreso tiene más de una medida',text:'Mira también cómo mejora tu técnica y tu constancia. Un registro aislado de peso no cuenta toda tu evolución.',tab:'progreso',action:'Ver mi progreso'},
  {title:'Descansa entre series',text:'Respira con calma y recupera el control antes de la siguiente serie. Puedes usar el temporizador de tu rutina.',tab:'rutina',action:'Abrir el temporizador'}
 ];
 const ordinal=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 let wellbeing={icon:'calendar',tag:'IDEA DEL DÍA',...tips[((ordinal%tips.length)+tips.length)%tips.length],day};
 if(!hasSleep)wellbeing={icon:'moon',tag:'DESCANSO',title:'¿Cómo descansaste?',text:'Registra tus horas de sueño para que las recomendaciones de hoy tengan en cuenta tu descanso.',tab:'bienestar',action:'Registrar mi sueño'};
 else if(hours<7)wellbeing={icon:'moon',tag:'DESCANSO',title:'Regálate una noche más tranquila',text:'Hoy anotaste '+hours+' h de sueño. Si puedes, reserva tiempo para descansar y reduce las distracciones antes de acostarte.',tab:'mas',action:'Revisar mi horario'};
 return {date:key,day,cards:[training,hydration,wellbeing]};
}
function renderDailyRecommendations(state) {
 const daily=dailyRecommendations(state);
 return '<section class="daily-section" aria-labelledby="daily-title"><div class="section-heading"><h2 id="daily-title">Para ti, hoy</h2><span class="daily-badge">'+uiIcon('calendar')+' CADA DÍA</span></div><p class="daily-intro">Ideas según tu rutina y lo que registras hoy.</p><div class="daily-grid">'+daily.cards.map((c,i)=>'<article class="daily-card '+(i===0?'daily-featured':'')+'"><div class="daily-card-top"><span class="daily-icon">'+uiIcon(c.icon)+'</span><span class="daily-tag">'+esc(c.tag)+'</span></div><h3>'+esc(c.title)+'</h3><p>'+esc(c.text)+'</p><button class="daily-action" data-recommend-tab="'+c.tab+'" data-recommend-date="'+daily.date+'" '+(c.day!==undefined?'data-recommend-day="'+c.day+'"':'')+'>'+esc(c.action)+uiIcon('arrow')+'</button></article>').join('')+'</div></section>';
}
