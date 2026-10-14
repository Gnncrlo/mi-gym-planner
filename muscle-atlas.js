// Regional overlays on an educational anatomical illustration, independent of photo camera angles.
const atlasRegions={
 chest:['M302 224Q337 196 386 199L391 254Q387 284 351 291Q320 288 304 269Z','M402 199Q454 197 485 225L485 269Q467 290 434 292Q404 285 401 255Z'],
 frontShoulders:['M254 232Q258 199 304 193L321 198Q285 223 275 267L258 283Z','M472 197Q511 192 525 224L532 281L512 267Q503 225 472 197Z'],
 rearShoulders:['M998 231Q1009 193 1046 198L1073 220Q1060 248 1038 269L1000 272Z','M1201 220Q1231 191 1260 203Q1280 220 1280 267L1246 272Q1218 252 1201 220Z'],
 biceps:['M251 275Q275 252 290 277L281 324Q274 350 248 355L237 346Z','M498 277Q513 257 532 280L548 345Q529 358 515 339L502 310Z'],
 brachial:['M244 307L252 332L245 356L229 353Z','M539 307L554 350L540 361L529 337Z'],
 forearms:['M230 364Q247 354 250 371L222 436L201 463L195 453L214 397Z','M550 367Q563 356 577 384L601 456L586 465L568 435L546 383Z'],
 triceps:['M989 280L1021 273L1036 327L1019 360L982 351L976 327Z','M1263 279L1290 276L1307 327L1300 358L1267 350L1254 327Z'],
 core:['M343 304Q369 290 386 301L392 378L388 421L340 415L327 369Z','M405 302Q427 291 451 309L461 369L449 417L408 422L401 374Z'],
 obliques:['M312 302L337 324L335 374L349 428L320 420L306 360Z','M454 316L476 301L482 354L469 419L445 428L459 371Z'],
 lats:['M1046 281L1109 302L1125 353L1104 408L1068 394L1049 352Z','M1165 303L1228 281L1224 351L1207 394L1174 408L1151 353Z'],
 midback:['M1094 204L1128 191L1133 282L1121 331L1082 301L1058 267Z','M1142 191L1177 205L1214 265L1189 299L1152 331L1141 283Z'],
 lumbar:['M1106 347L1132 328L1136 411L1101 416L1090 392Z','M1142 328L1174 348L1185 393L1173 414L1142 411Z'],
 quads:['M298 529L341 543L368 533L367 580L350 635L324 659L299 634L286 579Z','M419 534L451 544L486 531L502 579L488 636L461 660L439 640L419 584Z'],
 adductors:['M349 550L370 533L373 576L355 632L343 628Z','M418 536L439 552L448 627L433 634L416 579Z'],
 hamstrings:['M1044 542L1083 550L1120 534L1110 600L1090 670L1067 683L1044 643L1037 588Z','M1156 537L1189 550L1226 543L1240 589L1230 643L1205 681L1185 669L1165 602Z'],
 glutes:['M1060 430Q1091 418 1133 431L1130 510Q1090 521 1053 497L1048 463Z','M1143 431Q1186 418 1219 432L1230 468L1223 498Q1186 521 1144 511Z'],
 calves:['M1034 699Q1067 683 1090 704L1098 754L1082 796L1058 808L1035 784L1026 742Z','M1190 704Q1210 683 1239 699L1248 742L1241 784L1218 809L1195 796L1179 754Z']
};
function muscleAtlasProfile(name){
 const target=exerciseTargets[name],primary={chest:['chest'],back:['lats','midback'],shoulders:['frontShoulders'],triceps:['triceps'],biceps:['biceps'],quads:['quads'],hamstrings:['hamstrings'],glutes:['glutes'],calves:['calves'],core:['core']}[target.sector].slice();
 if(target.sector==='back'&&/Dorsal ancho/.test(target.zone))primary.splice(1);
 if(target.sector==='shoulders'&&/posterior/.test(target.zone))primary.splice(0,1,'rearShoulders');
 if(target.sector==='biceps'&&/Braquial y braquiorradial/.test(target.zone))primary.splice(0,1,'brachial','forearms');
 const secondary=new Set(),text=target.secondary.toLowerCase();
 const patterns=[[/tríceps/,'triceps'],[/bíceps/,'biceps'],[/braquial/,'brachial'],[/braquiorradial|antebrazo/,'forearms'],[/pectoral/,'chest'],[/deltoides posterior/,'rearShoulders'],[/deltoides anterior|estabilizadores del hombro/,'frontShoulders'],[/trapecio|romboides|escápula/,'midback'],[/glúte/,'glutes'],[/isquiotibiales/,'hamstrings'],[/core|tronco|abdomen/,'core'],[/oblicuos/,'obliques'],[/erectores espinales/,'lumbar'],[/aductores/,'adductors'],[/gastrocnemio|sóleo/,'calves']];
 for(const [pattern,region]of patterns)if(pattern.test(text)&&!primary.includes(region))secondary.add(region);
 const backPrimary=primary.some(r=>['lats','midback','rearShoulders','triceps','hamstrings','glutes','calves'].includes(r));
 return {primary,secondary:[...secondary],view:backPrimary?'back':'front',zone:target.zone,detail:target.detail,deep:/profundo/.test(target.zone)};
}
function renderMuscleAtlas(name){
 const profile=muscleAtlasProfile(name),draw=(regions,kind)=>regions.map(region=>`<g class="atlas-${kind}" data-atlas-region="${region}">${atlasRegions[region].map(path=>`<path d="${path}"/>`).join('')}</g>`).join('');
 return `<section class="muscle-atlas-panel" aria-label="Músculos de ${esc(name)}"><div class="atlas-heading"><span class="eyebrow">MAPA MUSCULAR</span><h3>${esc(muscleSectors[exerciseTargets[name].sector].name)}</h3></div><div class="atlas-view-controls" role="group" aria-label="Vista del mapa muscular">${[['front','Frente'],['back','Espalda'],['both','Ambas']].map(([view,label])=>`<button data-atlas-view="${view}" aria-pressed="${view===profile.view}">${label}</button>`).join('')}</div><div class="muscle-atlas" data-view="${profile.view}"><img class="muscle-atlas-image" src="assets/anatomy/muscle-atlas.png" alt="" width="1536" height="1024" decoding="async"><svg class="muscle-atlas-overlay" viewBox="0 0 1536 1024" role="img" aria-label="En azul: ${esc(profile.zone)}. En turquesa: músculos colaboradores."><title>${esc(name)} · ${esc(profile.zone)}</title>${draw(profile.secondary,'secondary')}${draw(profile.primary,'primary')}</svg></div><div class="atlas-legend"><span><i></i>Principal</span><span><i></i>Colaboradores</span></div><label class="atlas-secondary-toggle"><input type="checkbox" data-atlas-secondary checked> Mostrar colaboradores</label><p class="atlas-zone">${esc(profile.zone)}</p><p class="atlas-note">Mapa orientativo de regiones. Los colores no representan un porcentaje de activación${profile.deep?'; el sóleo se encuentra bajo el gastrocnemio':''}.</p></section>`;
}
