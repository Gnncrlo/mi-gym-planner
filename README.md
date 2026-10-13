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

La clave de almacenamiento sigue siendo `mgp-v2`. Solo se añade `substitutions`; las claves de cargas, repeticiones, completados, hábitos y peso no cambian. Cambiar de variante conserva la carga como referencia: ajústala al nuevo equipo. Los respaldos anteriores siguen siendo compatibles y los nuevos incluyen las sustituciones.

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

La bienvenida utiliza `profileName` en el objeto existente `mgp-v2`, con Giancarlo como nombre inicial. Se puede cambiar desde Más → Tu perfil y se incluye en los respaldos. No cambia las claves ni los registros anteriores. `design.css` aplica el diseño oscuro y azul a todas las secciones; se publica junto con los otros archivos.

Prueba adicional de la interfaz: `node tests/interface-smoke.cjs` (mismos requisitos que la prueba de fichas). Verifica nombre y persistencia, registros de actividad y peso, agua y navegación a 320, 375, 390 y 1024 px.

## Recomendaciones diarias

Inicio muestra tres recomendaciones locales: movimiento según el día real de la semana, hidratación según el agua registrada hoy y descanso o una idea que cambia cada día. El sueño ausente se distingue de cero horas registradas. Una sesión completada invita a recuperarse; un descanso corto invita a reducir intensidad si hay cansancio. La referencia de agua de la app no es una prescripción personalizada.

Las tarjetas se recalculan al abrir Inicio y al volver a la app. Sus botones abren la sección correspondiente en la fecha de hoy, aunque antes se consultara otra fecha o rutina. Se usa la fecha local del dispositivo. No se migran, eliminan ni reescriben registros anteriores para generar recomendaciones, y no se envían datos a servicios externos.

Publicar también `recommendations.js`. Prueba de escenarios: `node tests/recommendations-smoke.cjs`, con los mismos requisitos y variables de las otras pruebas.

## Comidas

La navegación reemplaza Hábitos por Comidas. El diario permite describir ingredientes, preparación y hambre/saciedad, recibir sugerencias generales y añadir detalles a un registro existente. Las ideas de desayuno, almuerzo, cena y snack cambian según la fecha. Las sugerencias se calculan con las palabras de la descripción; no reconocen fotos, no son un chat con un modelo de IA ni estiman calorías o cantidades. No se envían los registros a un servidor.

`foodLog` se añade a `mgp-v2` y se incluye en exportación/restauración. Los datos anteriores de alimentos (`meals`), agua y sueño se conservan. Agua y descanso está en Más; las recomendaciones de Inicio enlazan allí cuando corresponde. El identificador anterior `habitos` sigue funcionando como alias de Comidas. Si no hay espacio para guardar una comida, se conserva el diario anterior y se muestra un error.

Publicar también `nutrition.js`. Prueba: `node tests/foods-smoke.cjs`, con los mismos requisitos que las otras pruebas. Incluye diario, edición, negaciones en ingredientes, hambre/saciedad, preservación de datos anteriores, respaldos, HTML escapado y fallo de almacenamiento.

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
