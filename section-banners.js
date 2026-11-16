// Presentation only. These banners never write planner state or account storage.
function renderSectionBanner(tab){
 const banners={
  dia:{icon:'calendar',label:'TU DÍA, A TU RITMO',title:'Cada paso cuenta',text:'Organiza tu día y celebra lo que sí pudiste hacer.'},
  rutina:{icon:'dumbbell',label:'FUERZA CON PROPÓSITO',title:'Construye tu mejor versión',text:'Técnica, constancia y un pequeño avance cada sesión.'},
  comidas:{icon:'food',label:'ENERGÍA PARA AVANZAR',title:'Alimenta tu progreso',text:'Registra tu comida y descubre qué puedes agregar.'},
  habitos:{icon:'food',label:'ENERGÍA PARA AVANZAR',title:'Alimenta tu progreso',text:'Registra tu comida y descubre qué puedes agregar.'},
  progreso:{icon:'chart',label:'TU CONSTANCIA SE VE',title:'Mira cuánto has avanzado',text:'Tu propia evolución es la mejor referencia.'}
 };
 const banner=banners[tab];if(!banner)return '';
 return `<aside class="section-banner" aria-label="${esc(banner.label)}"><div><span class="section-banner-kicker">${esc(banner.label)}</span><p class="section-banner-title">${esc(banner.title)}</p><p class="section-banner-description">${esc(banner.text)}</p></div><span class="section-banner-symbol" aria-hidden="true">${uiIcon(banner.icon)}</span></aside>`;
}
