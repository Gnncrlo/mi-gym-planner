# mi-gym-planner
Mi aplicación personal de gimnasio

## Desarrollo

Aplicación estática, sin compilación ni dependencias de producción. Desde este directorio:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`index.html`, `exercises.js` y `exercise-dialog.js` deben publicarse juntos en GitHub Pages.

## Fichas y datos

Toca el nombre de un ejercicio en Rutinas para ver fotografías de personas reales en dos posiciones, técnica, músculos, errores y tres alternativas. La variante se aplica solo a esa semana, día y posición. Puedes volver al ejercicio original desde la ficha.

El modo de guardado en el dispositivo conserva la clave `mgp-v2`. Las cuentas usan una caché separada por proyecto y UUID, como se describe en Cuentas y sincronización. Solo se añade `substitutions`; las claves de cargas, repeticiones, completados, hábitos y peso no cambian. Cambiar de variante conserva la carga como referencia: ajústala al nuevo equipo. Los respaldos anteriores siguen siendo compatibles y los nuevos incluyen las sustituciones.

## Verificación

Con el servidor anterior activo, Node.js, Playwright y Chromium instalados:

```sh
node tests/browser-smoke.cjs
```

Opcionalmente configura `APP_URL` o `CHROMIUM_PATH`. La prueba usa un navegador temporal con datos anteriores de ejemplo; no toca los datos del navegador del usuario. Comprueba las 30 fichas, variantes, persistencia, conservación de registros, exportación/restauración, temporizador y pantalla móvil de 390 × 844.

## Fotografías

Las imágenes se incluyen en `assets/exercises/` y se sirven desde GitHub Pages, sin conexiones a servicios de imágenes externos. Proceden de Free Exercise DB (Unlicense); la licencia y las fuentes están en esa carpeta. `exercise-photos.js` contiene la correspondencia con las fichas. Si una alternativa no tiene una foto exacta, la ficha identifica la referencia del ejercicio original; no la presenta como una foto de la variante. Las diferencias de equipo o postura también se indican explícitamente.

Publica también `exercise-photos.js` y la carpeta `assets/exercises/`.

## Interfaz y bienvenida

La bienvenida utiliza `profileName` del usuario abierto. Los registros anteriores de Giancarlo conservan su nombre; un dispositivo nuevo empieza con «Mi perfil» y sin una medición de peso inventada. Una cuenta nueva usa su propio nombre y empieza vacía. Se puede cambiar desde Más → Tu perfil y se incluye en los respaldos. No cambia las claves ni los registros anteriores. `design.css` aplica el diseño oscuro y azul a todas las secciones; se publica junto con los otros archivos.

Prueba adicional de la interfaz: `node tests/interface-smoke.cjs` (mismos requisitos que la prueba de fichas). Verifica nombre y persistencia, registros de actividad y peso, agua y navegación a 320, 375, 390 y 1024 px.

## Recomendaciones diarias

Inicio muestra tres recomendaciones locales: movimiento según el día real de la semana, hidratación según el agua registrada hoy y descanso o una idea que cambia cada día. El sueño ausente se distingue de cero horas registradas. Una sesión completada invita a recuperarse; un descanso corto invita a reducir intensidad si hay cansancio. La referencia de agua de la app no es una prescripción personalizada.

Las tarjetas se recalculan al abrir Inicio y al volver a la app. Sus botones abren la sección correspondiente en la fecha de hoy, aunque antes se consultara otra fecha o rutina. Se usa la fecha local del dispositivo. No se migran, eliminan ni reescriben registros anteriores para generar recomendaciones. Se calculan en el dispositivo; las cuentas sincronizan sus registros con el proyecto configurado.

Publicar también `recommendations.js`. Prueba de escenarios: `node tests/recommendations-smoke.cjs`, con los mismos requisitos y variables de las otras pruebas.

## Comidas

La navegación reemplaza Hábitos por Comidas. Hay 40 ideas: diez desayunos, diez almuerzos, diez cenas y diez snacks de media mañana o tarde. Cada receta muestra ingredientes, preparación y tiempo aproximado; cuando usa ingredientes ya cocidos o preparados, lo indica. Puedes filtrar por rápidas (hasta 15 minutos), económicas, vegetarianas, sin cocinar o para llevar. El orden cambia según la fecha y «Ver otras opciones» recorre las alternativas.

Comidas se organiza en apartados plegables de Desayuno, Almuerzo y Cena, más Snack opcional. Cada uno incluye una idea para la fecha elegida con ingredientes y preparación, la marca de comida realizada, el formulario y los registros con recomendaciones de qué agregar o mejorar. La idea diaria es estable para esa fecha y comida: no cambia al explorar filtros u otras recetas. «Más opciones» abre las alternativas dentro del mismo apartado.

Abrir un apartado elige su formulario sin guardar ni reclasificar otros registros. Los borradores quedan separados en memoria por fecha y tipo de comida al plegar, cambiar de apartado, consultar recetas o cambiar de fecha; se guardan en el diario al enviar el formulario. Las marcas usan los campos existentes `meals` y `tasks` de Mi Día; el snack no entra en el contador de tres comidas principales. Quitar una marca conserva todas las descripciones. Guardar una descripción nueva marca esa comida y su actividad correspondiente en la misma operación. Editar un registro conserva su tipo, su fecha y sus marcas, incluso si lo habías desmarcado. Un fallo de almacenamiento restaura conjuntamente el diario y las marcas; los días cerrados mantienen su copia y sus controles bloqueados. Los registros anteriores se consultan sin migraciones ni marcado automático al abrir la app.

«Describir mi plato» lleva al diario y conserva cualquier texto que ya estuvieras escribiendo. Elegir una receta solo deja una referencia temporal: no registra ingredientes consumidos, no marca comidas y no guarda preferencias. Para registrar lo que realmente comiste, escribe tu descripción y pulsa «Guardar y recibir sugerencias». Los días cerrados permiten consultar recetas y conservan bloqueado su diario.

El diario permite describir ingredientes, preparación y hambre/saciedad, recibir sugerencias concretas para cada tipo de comida y añadir detalles a un registro existente. Por ejemplo, pan con café en el desayuno propone opciones de proteína y fruta; arroz con pollo ofrece verduras para acompañar; un snack de fruta puede complementarse de forma opcional. Reconoce más ingredientes habituales en Perú y distingue negaciones, bebidas vegetales y saciedad. Las sugerencias se calculan localmente con las palabras de la descripción; no reconocen fotos, no son un chat con un modelo de IA ni estiman calorías o cantidades. En el modo de dispositivo no se envían registros a un servidor. Si usas una cuenta, sus registros se sincronizan con el proyecto configurado; las sugerencias siguen calculándose en el dispositivo.

`foodLog` se añade a `mgp-v2` y se incluye en exportación/restauración. Los datos anteriores de alimentos (`meals`), agua y sueño se conservan. Agua y descanso está en Más; las recomendaciones de Inicio enlazan allí cuando corresponde. El identificador anterior `habitos` sigue funcionando como alias de Comidas. Si no hay espacio para guardar una comida, se conserva el diario anterior y se muestra un error.

Publicar también `nutrition.js`, `meal-advice.js`, `meal-ideas.js`, `meal-explorer.js` y `design.css` junto a `index.html`. Se conserva el formato de `foodLog` y la clave `mgp-v2`; las nuevas ideas no requieren migrar datos.

Pruebas de lógica sin servidor ni navegador:

```sh
node tests/meal-advice-smoke.cjs
node tests/meal-ideas-smoke.cjs
node tests/meal-flows-smoke.cjs
```

Comprueban ingredientes, negaciones, hambre/saciedad, variedad y filtros, navegación sin guardar, plegado y borradores separados por comida/fecha, ideas diarias independientes de filtros, marcas persistentes por fecha, sincronización con Mi Día, una sola escritura por operación, edición sin remarcar, fallo de almacenamiento y protección de la fecha original de una comida cerrada. Las pruebas de eventos incluyen el manejador general de cambios de `index.html` y usan un documento simulado: no verifican diseño ni comportamiento real de iOS. Para la integración en navegador: `node tests/foods-smoke.cjs` y `node tests/meal-recovery-smoke.cjs`, con los mismos requisitos que las otras pruebas. Incluyen diario, edición, preservación de datos anteriores, respaldos, HTML escapado y fallo de almacenamiento.

## Configuración

Más presenta perfil y grupos de ajustes con filas táctiles, horarios desplegables, preferencia de recordatorios y acciones de respaldo. Los horarios y preferencias mantienen sus campos originales. La preferencia de recordatorios no activa notificaciones automáticas. Prueba de ajustes y respaldos: `node tests/settings-smoke.cjs`.

## Rutinas por sectores musculares

Cada día de Rutinas agrupa sus ejercicios por el músculo de énfasis principal. Los accesos de áreas llevan a Pecho, Espalda, Hombros, Tríceps, Bíceps y brazos, Cuádriceps, Femorales, Glúteos, Pantorrillas o Abdomen y core según corresponda. Cada ejercicio muestra su zona; su ficha y sus tres alternativas explican el énfasis y los músculos que colaboran, sin prometer aislamiento de zonas.

Una variante puede cambiar de sector (por ejemplo, peso muerto rumano → puente de glúteos). El índice original del ejercicio se conserva al agrupar: `done`, `loads`, `reps` y `substitutions` siguen usando las mismas claves de semana, día y posición. No se duplican ejercicios ni se migra ningún registro. Domingo sigue siendo descanso.

Publicar también `muscle-sectors.js`. Prueba: `node tests/sectors-smoke.cjs`; verifica las 30 posiciones y las 90 alternativas, todos los sectores, cambios de sector sin perder registros y pantallas móviles.

## Combinaciones y cardio

Las tarjetas de ejercicios muestran foto, series, zona y controles de registro en un diseño compacto. «Combinación sugerida» propone movimientos complementarios dentro de las variantes ya disponibles para cada posición. Aplicarla es una acción explícita; conserva cargas, repeticiones y marcas de completado como referencia y avisa de revisar la carga al cambiar de movimiento. Las propuestas no sustituyen automáticamente la selección actual.

Al final de cada día se puede elegir caminar, correr o bicicleta, anotar minutos y marcar completado. `cardio` guarda cada actividad de forma independiente por semana y día, sin mezclarse con los registros de fuerza. Se incluye en los respaldos. En días de piernas se propone empezar más suave; domingo mantiene el descanso y cualquier actividad es opcional.

Publicar también `workout-finish.js`. Prueba: `node tests/workout-finish-smoke.cjs`; cubre combinaciones válidas, registros de fuerza intactos, cardio por actividad/semana/día, exportación/restauración y móvil.

## Cierre del día, estadísticas y bienvenida

Mi Día y el final de Rutinas permiten elegir fecha y rutina, revisar un resumen y confirmar el cierre. `dayHistory` conserva una copia independiente de ejercicios, variantes, cargas y repeticiones, cardio, peso de esa fecha, agua, sueño, comidas y actividades. `closedDays` identifica el cierre activo por fecha. Reabrir quita la marca de cerrado pero conserva versiones anteriores; volver a cerrar añade una revisión. Los registros originales no se borran ni se completan automáticamente. Se puede cerrar un día parcial o de descanso; no se añaden mediciones de peso ausentes ni se cierran fechas futuras. Los cambios posteriores de los registros originales no reescriben el resumen guardado.

Progreso muestra gráfica de peso, cargas y repeticiones por ejercicio, y un historial de días con sus versiones. La fuerza se compara por nombre de ejercicio, sin sumar movimientos distintos ni estimar máximos o volumen. Los registros antiguos sin fecha mantienen su semana; una posición que ya tiene un cierre usa su copia guardada para evitar cambiar estadísticas históricas al editar datos actuales. Las gráficas por fecha usan los cierres. Una fecha con varias versiones cuenta una sola vez, con la última versión guardada. Los cierres y sus versiones se incluyen en los respaldos; un fallo de almacenamiento conserva los registros y muestra un error.

La bienvenida animada muestra el nombre del perfil al cargar la app y al regresar después de 30 minutos en segundo plano. Se cierra sola, tiene botón Entrar y respeta movimiento reducido. No se repite al cambiar de sección.

Publicar también `day-journal.js`, `progress-tracker.js` y `welcome.js`. Pruebas: `node tests/day-journal-smoke.cjs` y `node tests/welcome-smoke.cjs` (mismos requisitos y variables que las otras pruebas).

## Bloqueo de días cerrados

Un cierre activo bloquea checks y registros de la fecha (actividades, comidas, agua, sueño y el peso de hoy si está cerrado) y los registros de fuerza/cardio de su semana y rutina, incluso al cambiar la fecha visible. Se siguen pudiendo consultar las fichas y las actividades de cardio, sin editar cargas, repeticiones o variantes. Las marcas y los valores visibles de una rutina cerrada proceden de su resumen guardado, sin sobrescribir datos anteriores. El calendario muestra una marca de cierre.

Reabrir mediante confirmación habilita la edición y conserva el resumen anterior. Las semanas y fechas abiertas siguen siendo editables. Además de desactivar controles, los manejadores bloquean cambios sobre registros cerrados. Prueba: `node tests/closed-locks-smoke.cjs`.

## Entrada fluida y variación A/B

La bienvenida usa una entrada coordinada de opacidad/desplazamiento y una salida de opacidad hacia la app ya renderizada. Se han quitado las animaciones separadas de escala/rotación del logo y el aro. Entrar y Escape usan la misma salida; movimiento reducido sigue sin animaciones. El cierre del diálogo conserva un temporizador de seguridad y restaura el foco.

La propuesta de Push B incluye aperturas de polea alta hacia abajo para variar el énfasis esternocostal respecto al press inclinado. Pull B propone curl con barra y predicador para variar la posición del brazo respecto al curl de pie y martillo del día A. Las instrucciones y fotos de polea coinciden. Estas propuestas se aplican solo al elegir Usar esta combinación en una rutina abierta, sin cambiar selecciones o registros existentes automáticamente. No se promete aislar partes del pecho o cabezas del bíceps; la variación es planificada y una selección estable permite comparar la progresión.


## Mi día, asistencia y calendario

Mi Día muestra las actividades esenciales: levantarme, desayunar, trabajar, almorzar, cenar, dormir e ir al gym, más los pendientes añadidos. La asistencia se registra con un toque en Mañana, Tarde o Noche: cualquiera cuenta una sola actividad, sin duplicarla al cambiar de franja y sin marcar los ejercicios automáticamente. Se elimina el horario fijo de gimnasio de la agenda y de los ajustes visibles.

`gymVisits[fecha].period` registra la franja. La asistencia mantiene la fuente original `tasks[fecha+'-gym']`. Los horarios antiguos de `schedule` y `gymVisits` permanecen en el almacenamiento y los respaldos; no se borran. Las visitas antiguas con hora se muestran en la franja correspondiente. Los días cerrados mantienen las actividades y porcentajes de `snapshot.tasks`, incluso si su organización anterior era distinta.

Las marcas de desayuno, almuerzo y cena se comparten con Comidas mediante `meals`. Se consultan los checks antiguos compatibles sin migrarlos ni reescribirlos. Marcar o desmarcar una comida actualiza sus registros actuales. Los datos anteriores de tareas retiradas de la agenda se conservan. Los pendientes nuevos guardan la fecha como cuarto elemento de `custom`, con hora opcional; los pendientes anteriores de tres elementos mantienen su funcionamiento habitual en todos los días.

El calendario muestra el mes completo, porcentajes, marcas de gimnasio y días cerrados con una leyenda. Seleccionar una fecha mantiene el calendario y acerca su detalle; Volver al mes regresa a la cuadrícula. El detalle permite abrir Mi Día, la rutina de la semana archivada correcta o el resumen guardado. Navegar el calendario no cambia registros ni guarda datos.

El bloque de horario del desayuno se retiró de Comidas. Las notas anteriores de desayuno tardío u omitido permanecen en `mealAdjustments`, en los respaldos y en los cierres (`mealAdjustment`); no se borran ni se migran. Los cierres siguen conservando también la visita al gimnasio y bloquean los registros de comida hasta reabrir el día.

La bienvenida destaca el nombre y una frase propia de disciplina que cambia según la fecha local del dispositivo; la misma frase aparece en Inicio. Conserva la transición suave y respeta movimiento reducido. La entrada automática da tiempo para ver el saludo y el botón permite continuar al momento.

Publicar también `daily-planner.js`, `calendar-planner.js`, `welcome.js`, `nutrition.js`, `day-journal.js` y `design.css`. Pruebas: `node tests/daily-planner-smoke.cjs`, `node tests/calendar-smoke.cjs`, `node tests/meal-recovery-smoke.cjs` y `node tests/welcome-smoke.cjs`, con las mismas variables `APP_URL` y `CHROMIUM_PATH`. Verifican datos anteriores, progreso coherente, marcas de comidas, franjas equivalentes, pendientes por fecha, persistencia, respaldos, fallos de almacenamiento, cierres históricos, navegación y pantallas móviles.


## Resumen semanal y progresión

Inicio enlaza a Progreso → Resumen. La revisión usa una semana de calendario local, de lunes a domingo, independiente del número de semana de la rutina. Cuenta visitas explícitas al gym y sesiones de fuerza cerradas por separado, compara mediciones de peso realmente guardadas y muestra un ejemplo de cargas y repeticiones del mismo ejercicio. Los días cerrados usan su copia; los reabiertos y las versiones anteriores no cuentan como nuevas sesiones. Sin marcas no se interpreta que faltó entrenamiento o una comida.

Rutinas añade una sensación opcional: controlado y sin molestias, esfuerzo alto o molestia/dolor. `exerciseFeelings` y `exerciseFeelingNames` guardan el valor junto al nombre exacto de la variante; cambiar de variante no aplica la sensación anterior al nuevo movimiento. Cada cierre conserva `feeling` y el control se bloquea junto a cargas y repeticiones. El respaldo incluye estos campos y las copias anteriores siguen funcionando sin ellos.

Progreso → Fuerza muestra una sugerencia con los cierres activos más recientes de fechas diferentes y el mismo ejercicio. Valorar un incremento exige registros comparables, misma carga, repeticiones al tope y sensación de control en ambos. La recomendación pide comprobar todas las series y la técnica: el campo de repeticiones no demuestra que cada serie alcanzó el objetivo. Nunca se aumentan pesos automáticamente, se fijan kg ni se estiman máximos. Los datos incompletos, molestias, esfuerzo alto, variantes distintas, días reabiertos, revisiones y ejercicios por tiempo/asistencia/bandas no justifican un aumento.

Publicar `weekly-review.js` y `strength-coach.js`. Pruebas: `node tests/weekly-review-smoke.cjs` y `node tests/strength-coach-smoke.cjs`, con las mismas variables opcionales de las otras pruebas.

## Vista muscular y fondo

Las fichas conservan las fotos originales de personas haciendo el ejercicio en dos posiciones y añaden una pestaña Músculos. El mapa usa una ilustración anatómica frontal/posterior consistente con regiones principales en azul y colaboradores en turquesa. Las 79 fichas y sus variantes tienen una correspondencia anatómica; las fotos de referencia conservan su aviso. Las vistas Frente, Espalda y Ambas y el control de colaboradores sólo cambian la visualización, sin escribir datos.

Las zonas son orientativas y no representan porcentajes de activación o aislamiento. Los músculos que quedan ocultos por ropa, postura o banco se explican con el mapa separado, sin pintar regiones inventadas sobre la fotografía de técnica. El sóleo se identifica como profundo. El fondo incorpora luces azules, una cuadrícula tenue y líneas diagonales estáticas, sin animaciones de fondo ni conexiones externas.

Publicar `muscle-atlas.js` y `assets/anatomy/muscle-atlas.png`. Prueba: `node tests/muscle-atlas-smoke.cjs`; cubre los 79 mapas, variantes que cambian de músculo, vistas, controles, técnica original, foco, conservación de registros y móvil.


## Usuarios de este dispositivo

En **Más → Usuarios de este dispositivo**, crea un perfil con el nombre de otra persona o vuelve a abrir uno existente. Cada perfil guarda por separado pesos, cargas, repeticiones, comidas, actividades y días cerrados. La bienvenida usa el nombre del perfil abierto. Los perfiles nuevos empiezan sin registros de Giancarlo.

El perfil original conserva `mgp-v2` sin mover ni importar sus registros. Los nuevos usan `mgp-device-profile-v1:<UUID>`. El nombre se puede modificar sin cambiar el identificador. Cada pestaña queda ligada a su propio perfil; elegir otro usuario en una pestaña no redirige los guardados de las demás. Una edición antigua de la misma persona desde otra pestaña se rechaza para conservar la copia más reciente.

El cambio de usuario recarga la app para limpiar formularios, diálogos y temporizadores. Los borradores de comidas deben guardarse o vaciarse antes de cambiar. Un fallo de almacenamiento conserva la copia anterior, mantiene las ediciones visibles y ofrece exportación y reintento. Los respaldos y su restauración corresponden al perfil abierto; una lectura de archivo tardía no puede reemplazar al usuario siguiente.

Son perfiles locales, accesibles para quienes compartan ese navegador, sin contraseñas ni sincronización entre teléfonos. Compartir la URL no envía registros. Las cuentas autenticadas siguen siendo una opción independiente, pendiente de configurar Supabase. Su importación explícita utiliza el perfil local seleccionado y comprueba su nombre en la confirmación.

Publicar también `device-profiles.js`. Prueba sin red ni navegador: `node tests/device-profiles-smoke.cjs`; cubre aislamiento, reapertura, datos anteriores intactos, perfiles con el mismo nombre, pestañas, cuota, reintento, respaldos, restauración tardía y recuperación sin reinicios. La comprobación visual en iPhone permanece pendiente.

## Cuentas y sincronización

La conexión apunta al proyecto Supabase nuevo y exclusivo de Mi Gym Planner. `cloud-config.js` contiene únicamente su URL y clave pública; nunca una clave secreta, token de administración o `service_role`. La migración y las pruebas SQL reales de RLS, separación entre cuentas y revisiones ya pasaron. La activación pública sigue pendiente de completar las URLs y las pruebas de Auth/REST por HTTPS. La guía [CUENTAS_Y_SINCRONIZACION.md](docs/CUENTAS_Y_SINCRONIZACION.md) describe la configuración y el despliegue. El registro directo no envía confirmación de correo mientras no hay SMTP configurado; las direcciones no quedan verificadas.

Más incluye Crear cuenta e Iniciar sesión. Tras autenticar y verificar la identidad, cada cuenta usa su UUID, una fila privada y una caché local propia. Las actualizaciones usan revisiones para detectar conflictos entre dispositivos. El estado distingue guardado local pendiente, sincronización y conflicto; una respuesta fallida no se interpreta como una cuenta vacía. Los cambios hechos mientras sube una versión siguen pendientes para la siguiente subida. Volver a la app puede cargar cambios remotos si no hay borradores de comidas sin enviar.

`mgp-v2` no se sube automáticamente ni se borra al entrar o salir de una cuenta. La importación requiere una acción y confirmación explícitas, una lectura remota correcta y una cuenta sin registros. Se conserva el nombre de la cuenta y el original del dispositivo. Cada persona debe crear su propia cuenta; compartir el enlace no comparte registros. Los respaldos normales incluyen únicamente el usuario abierto. Restaurar una copia guarda primero el candidato y después cambia el estado visible, conservando los otros usuarios.

Cerrar sesión invalida el controlador de sincronización y recarga la interfaz, limpiando formularios, temporizadores y diálogos. Las cachés pendientes se conservan para el mismo UUID. No se cambia de cuenta mientras haya borradores de comidas sin enviar. Si falla un guardado local, se avisa y pausa la sincronización hasta reintentar; los cambios en memoria se pueden exportar. Se validan los registros remotos antes de reemplazar una caché válida. Si hay conflicto, primero se puede descargar la copia local; cargar la versión de la nube conserva además una copia de recuperación y bloquea las ediciones mientras termina.

Pruebas locales sin red ni navegador:

```sh
node tests/cloud-api-smoke.cjs
node tests/cloud-auth-smoke.cjs
node tests/cloud-sync-smoke.cjs
node tests/cloud-accounts-smoke.cjs
```

Estas pruebas usan respuestas simuladas. La seguridad RLS y el flujo real de correo/sincronización requieren ejecutar [rls.sql](supabase/tests/rls.sql) y la comprobación entre cuentas y dispositivos de la guía. Las pruebas de navegador siguen necesitando el servidor y Chromium descritos al principio.
