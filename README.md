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
