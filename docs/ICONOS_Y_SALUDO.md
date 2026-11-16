# Iconos y saludo personalizado

Integración localizada de los iconos adjuntos y del saludo según la hora, conservando el código actual, las claves de almacenamiento y el formato de los registros.

## Archivos nuevos

- `icons/icon.svg`
- `icons/icon-192.png` (192 × 192)
- `icons/icon-512.png` (512 × 512)
- `icons/icon-maskable-512.png` (512 × 512)
- `icons/apple-touch-icon.png` (180 × 180)
- `icons/favicon-32.png` (32 × 32)
- `manifest.webmanifest`
- `vista-previa-icono.png`
- `tests/icon-greeting-smoke.cjs`
- `tests/icon-greeting-browser.cjs`
- `docs/ICONOS_Y_SALUDO.md`

Los iconos se copiaron byte por byte de la carpeta `icons/` del ZIP anidado; el manifiesto y la vista previa, de los adjuntos. No se copiaron los HTML, JS ni CSS del ZIP. El maskable y el icono Apple tienen todos sus píxeles opacos (alpha 255), no solamente las esquinas.

## Archivos editados

- `index.html`: metadatos y rutas relativas de instalación, tema `#070c15`, saludo de Inicio y enlace condicional para añadir el nombre. No cambia `defaults`, `mgp-v2` ni la persistencia.
- `welcome.js`: `greetingForNow`, `personName` y `homeGreeting`; introducción con saludo pequeño y nombre de pila grande, o «¡Qué bueno verte!» sin nombre.
- `design-v2.css`: estilo del enlace de nombre y del saludo pequeño. La capa visual anterior se conserva.
- `tests/interface-smoke.cjs`: títulos según los tres saludos, nombre de pila, persistencia del nombre completo y escape de HTML.
- `tests/welcome-smoke.cjs`: nuevo texto sin nombre y primer token de los nombres con espacios, conservando comprobaciones de foco, movimiento reducido e inyección.
- `tests/cloud-browser-smoke.cjs`: el perfil genérico saluda «¡Qué bueno verte!»; las comprobaciones de aislamiento de cuentas y legado se conservan.
- `tests/run-browser-suite.cjs`: servidor HTTP en el puerto 8000 (ajustable con `APP_PORT`), tipos MIME de iconos/manifiesto y montaje adicional en `/mi-gym-planner/` para verificar rutas de GitHub Pages.

## Caché

- `welcome.js`: `?v=lime-banners-1` → `?v=personal-greeting-1`.
- `design-v2.css`: `?v=enhancements-1` → `?v=personal-greeting-1`.

## Comportamiento

El saludo usa la hora local del dispositivo: noche antes de las 5, días desde las 5 hasta las 11:59, tardes desde las 12 hasta las 18:59, y noches desde las 19. El nombre completo permanece guardado; solo su primera palabra se usa en el saludo. Vacío y «Mi perfil» (ignorando mayúsculas y espacios exteriores) se consideran sin nombre. El texto sigue pasando por `esc()`.

No se incorpora service worker ni se promete funcionamiento offline. El nombre corto de instalación es «Gym Planner». La instalación real en la pantalla de inicio de iOS debe verificarse en un iPhone: las pruebas de Chromium verifican el manifiesto, los metadatos y los archivos, no el lanzador nativo de iOS.

## Pruebas

```bash
node tests/icon-greeting-smoke.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/run-browser-suite.cjs
# Con un servidor propio en http://127.0.0.1:8000/:
CHROMIUM_PATH=/usr/bin/chromium node tests/interface-smoke.cjs
```

Se comprueban límites horarios, nombres vacíos/genéricos, nombre completo sin modificar, HTML escapado, enlace a Más, rutas relativas bajo `/mi-gym-planner/`, dimensiones de iconos, alpha opaco del maskable/Apple, manifiesto reconocido por Chromium y pantallas 390 × 844 / 360 × 640 con movimiento normal/reducido.

Para añadir el acceso en iPhone: Safari → Compartir → Añadir a pantalla de inicio. Conserva el acceso anterior y un respaldo de tus registros hasta comprobar que el nuevo acceso abre el perfil correcto. No borres los datos del navegador para cambiar el icono.

También se ajustó `tests/foods-smoke.cjs` para esperar el final de la lectura/renderizado de una copia antes de contar los dos platos restaurados. La restauración de la aplicación no se modificó y la comprobación de conservación de ambos registros permanece.

Validación: 13 checks sin navegador aprobados. Los 21 checks de navegador quedaron aprobados en conjunto; el único fallo de la primera ejecución fue la espera de restauración anterior, repetida satisfactoriamente. Las pruebas nuevas cubren cuatro combinaciones de tamaño y movimiento. No se probó la instalación física en un iPhone ni se añadió funcionamiento offline.
