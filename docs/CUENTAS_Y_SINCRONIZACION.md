# Activar las cuentas de Mi Gym Planner

Cada persona podrá crear su cuenta con correo y contraseña. Sus comidas, pesos, ejercicios y días cerrados se guardarán separados, y podrá recuperarlos al iniciar sesión en otro dispositivo.

El código prepara esta conexión, pero **las cuentas no están activadas todavía**. Falta disponer de un proyecto de Supabase, ejecutar su configuración y colocar su URL y clave pública. No se han creado cuentas ni un proyecto, ni se ha verificado una conexión real. La publicación de estos cambios en GitHub Pages también está pendiente del acceso necesario.

Mientras `cloud-config.js` esté vacío, la app conserva el guardado anterior en el dispositivo. Los botones de cuentas permanecen desactivados; no simulan cuentas o sincronización.

## 1. Guarda primero una copia de tus registros

En tu app actual abre **Más → Guardar una copia** y conserva el archivo JSON. No borres los datos de Safari ni reinstales el acceso directo para realizar esta configuración.

Tus datos anteriores están en el navegador donde los registraste. La configuración no borra ni modifica ese original, almacenado como `mgp-v2`. Compartir el enlace de la app no comparte ese archivo ni sus registros.

## 2. Crea el proyecto de Supabase

1. Entra en [supabase.com/dashboard](https://supabase.com/dashboard) con tu propia cuenta.
2. Usa tu cuenta personal y crea una **organización y un proyecto nuevos**, exclusivos para Mi Gym Planner. No reutilices organizaciones, proyectos, repositorios ni credenciales del trabajo. Elige un nombre, una región cercana y una contraseña para la base de datos. Guarda esa contraseña en privado; no se coloca en la app.
3. Espera a que el proyecto termine de prepararse.
4. En **Authentication → Sign In / Providers**, activa el proveedor **Email** y permite crear usuarios con correo y contraseña. Mantén activada la confirmación del correo.
5. En **Authentication → URL Configuration**, configura:

   - **Site URL:** `https://gnncrlo.github.io/mi-gym-planner/`
   - **Redirect URLs:** añade también `https://gnncrlo.github.io/mi-gym-planner/`.

La barra final y el nombre del repositorio forman parte de la dirección. Los nombres de los menús del panel pueden variar ligeramente. No hace falta activar Google u otros proveedores para este cambio.

## 3. Prepara el guardado privado

En el **SQL Editor** de ese proyecto, crea una consulta, copia el contenido completo de [001_planner_accounts.sql](../supabase/migrations/001_planner_accounts.sql) y pulsa **Run**.

La consulta crea `public.planner_accounts`, con una fila por cuenta. Incluye las reglas de seguridad para que cada sesión solo lea y actualice su propio usuario. Los visitantes sin sesión no pueden consultar registros. La app no recibe permiso para borrar filas. La hora de guardado y las revisiones se verifican en la base de datos.

La migración se puede ejecutar nuevamente sin borrar registros. Si informa de un esquema incompatible u otro error, detén la configuración y revisa ese error; no borres la tabla ni desactives la seguridad para continuar.

Después, en otra consulta del SQL Editor, ejecuta **todo** el contenido de [rls.sql](../supabase/tests/rls.sql). La prueba crea dos usuarios ficticios con identificadores aleatorios y comprueba que no pueden acceder a los registros del otro. También comprueba los permisos de visitantes y que un cambio antiguo no sobrescriba una revisión nueva.

El archivo empieza una transacción y termina en `ROLLBACK`: los usuarios y registros ficticios no se conservan. No sustituyas sus identificadores por usuarios reales ni ejecutes fragmentos aislados. El resultado esperado es un mensaje `PASS`. Un error significa que hay que revisar la configuración antes de activar las cuentas.

**Estas pruebas SQL están preparadas, pero no se han ejecutado contra un proyecto de Supabase.** Tampoco prueban el envío de correos ni la experiencia en un iPhone.

## 4. Coloca la configuración pública en la app

En el panel del proyecto busca su **Project URL** y su **Publishable key**, normalmente en **Project Settings → API / API Keys** o en **Connect**. Si el proyecto muestra las claves antiguas, la clave `anon` pública también es compatible.

Edita [cloud-config.js](../cloud-config.js) con este formato:

```js
const GYM_CLOUD_CONFIG = Object.freeze({
  url: 'https://TU-PROYECTO.supabase.co',
  publishableKey: 'sb_publishable_TU_CLAVE_PUBLICA'
});
```

Usa la URL del proyecto, sin rutas adicionales. No copies los textos de ejemplo como valores reales.

La clave pública puede estar en el código publicado: el acceso a cada registro depende de la sesión y de las reglas de seguridad del paso anterior. **Nunca coloques una clave `service_role`, una clave `sb_secret_…`, la contraseña de la base de datos ni contraseñas de usuarios en este archivo, GitHub o este chat.**

Publica los archivos revisados mediante la solicitud de cambio y el despliegue de GitHub Pages. Comprueba que el despliegue terminó correctamente antes de probar el enlace del teléfono. La app seguirá disponible en `https://gnncrlo.github.io/mi-gym-planner/`.

## 5. Abre tu cuenta y copia tus registros anteriores

1. En el dispositivo donde están tus registros de Giancarlo, abre la app actualizada. Si utilizas perfiles locales, selecciona primero el tuyo en **Más → Usuarios de este dispositivo**. Después entra en **Más → Crear cuenta**.
2. Escribe tu nombre, correo y contraseña. Abre el correo de confirmación de Supabase y confirma la cuenta; después vuelve a la app e inicia sesión con tu contraseña.
3. Espera a que termine la lectura de la cuenta. Crear una cuenta no importa los datos del dispositivo automáticamente.
4. Si los registros del perfil local seleccionado son tuyos, usa **Importar mi perfil local** y revisa el nombre de origen y el correo de destino en la confirmación. La importación solo se permite si la cuenta aún no tiene registros y la lectura remota terminó correctamente.
5. Comprueba tus pesos, repeticiones, comidas, marcas y días cerrados. Espera a que el estado indique que los cambios están sincronizados.

El original `mgp-v2` permanece en el navegador. No se mueve ni se borra al importar o cerrar sesión. Si la cuenta ya tiene registros, no se sustituyen mediante esta importación. Para reemplazar datos deliberadamente, conserva antes una copia y utiliza **Restaurar una copia**, comprobando qué cuenta está abierta.

La otra persona debe crear **su propia cuenta y contraseña**. Puede usar el mismo enlace y tendrá registros independientes. Nunca debe importar los registros de Giancarlo como si fueran suyos.

## Cuando no hay conexión o se usan dos dispositivos

Si la app ya está abierta y se pierde la conexión, los cambios se conservan en el navegador, en una caché separada por el identificador de la cuenta. Quedan pendientes de subir. Esto no garantiza que la página pueda abrirse desde cero sin conexión: GitHub Pages y los recursos de la app también deben estar disponibles.

Al volver a conectarte, usa **Sincronizar ahora** y revisa el estado. No borres los datos del navegador mientras existan cambios pendientes. Cerrar sesión conserva esos cambios para la próxima sesión de esa misma cuenta en ese dispositivo.

Si el navegador no permite guardar el último cambio, aparece un aviso y se conserva la copia anterior. Descarga tus registros y usa **Reintentar guardado**; no recargues mientras ese cambio siga solamente en la pantalla. La app pausa la sincronización de esa copia y avisa antes de abandonar la página. No permite cambiar de cuenta o cargar otra versión hasta resolver el guardado.

Si editas la misma cuenta desde dos dispositivos, pueden aparecer versiones distintas. La app conserva los cambios locales y avisa del conflicto; no mezcla comprobaciones o cierres automáticamente. Usa **Descargar mis cambios locales** antes de elegir **Cargar la versión de la nube**. Esta última opción también descarga una copia local antes de sustituirla. Revisa el archivo y el usuario abierto antes de restaurar cualquier respaldo.

## Comprobación final antes de compartirla

Esta revisión necesita cuentas de prueba reales y dos dispositivos; las pruebas locales con respuestas simuladas no la sustituyen.

1. Crea dos cuentas con correos diferentes y confirma ambos. Comprueba que cada una empieza sin los datos de Giancarlo y que al cambiar de cuenta no aparecen comidas o pesos ajenos.
2. En la primera cuenta, guarda una comida, una carga, sus repeticiones y un día cerrado. Abre esa misma cuenta en el segundo dispositivo y comprueba que aparecen después de sincronizar.
3. Entra con la segunda cuenta y confirma que no ve esos registros.
4. Guarda un cambio con la conexión interrumpida y comprueba que permanece al recuperar la sesión y se sube al reconectar.
5. Edita la primera cuenta desde ambos dispositivos para comprobar el aviso de conflicto y la descarga de respaldo antes de cargar otra versión.
6. Comprueba la confirmación de correo, el cierre de sesión y el inicio posterior desde el acceso directo del iPhone.

Hasta completar la configuración y estas comprobaciones no debe anunciarse que las cuentas están activadas o que la sincronización real ha sido validada.
