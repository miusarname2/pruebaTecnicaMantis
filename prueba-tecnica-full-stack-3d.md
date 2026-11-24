# Prueba técnica Full Stack 3D

Nov 3, 2026 · @Cristhian Durán

Una prueba de 4 horas como máximo para medir si sabes construir, de punta a punta, una plataforma web que muestra edificios escaneados en 3D a clientes de forma segura.

## Contexto

Escaneamos edificios y entregamos a nuestros clientes un gemelo digital que abren en el navegador: el modelo BIM, la nube de puntos del escaneo, los espacios con su área y los datos del proyecto. Lo usan en computador y sobre todo en iPad, en obra.

Tres cosas nos importan en el día a día y esta prueba las mide:

- **Datos seguros por cliente.** Un cliente ve solo sus proyectos y nunca ve datos internos (precios, facturas, notas, correos de otros).
- **3D que no se rompe.** Archivos de decenas de MB que cargan con progreso, se pueden cancelar y no cuelgan la pestaña, también en Safari de iPad.
- **Código que otro puede mantener.** Validación, errores honestos y pruebas.

## Qué vas a construir

**Site Viewer Lite:** una API y un visor web donde una persona elige un proyecto, ve sus espacios en 3D, carga su nube de puntos y reporta un problema.

El límite es 4 horas de trabajo. Si no alcanzas todo, entrega lo que tengas y escribe en el README qué falta y cómo lo harías: preferimos poco y sólido a mucho y frágil.

**Stack:** Node.js 18 o superior en el servidor (Express, Fastify o http nativo). En el navegador, JavaScript o TypeScript con el framework que prefieras, o ninguno; three.js desde npm o CDN. Sin base de datos: los datos vienen en archivos JSON.

| Parte | Qué | Tiempo sugerido |
|-------|-----|-----------------|
| A | API en Node.js | 1 h 30 min |
| B | Visor web con three.js | 2 h |
| C | Cinco preguntas escritas | 30 min |

**Kit inicial** (te lo enviamos en un .zip): `data/users.json` (tres usuarios con su token), `data/projects.json` (tres proyectos), `data/spaces/<id>.json` (los cuartos de cada proyecto como cajas) y `tools/make-cloud.js`, que genera la nube de puntos en formato binario PTS1. El README del kit describe cada formato.

## Parte A — API

Cada petición trae `Authorization: Bearer <token>` con un token de `users.json`. Hay dos roles: `staff` (nuestro equipo, ve todo) y `client` (ve solo los proyectos de su `account`).

Reglas que vamos a verificar:

1. Sin token o con token inválido: 401.
2. El bloque `internal` de cada proyecto (precio, factura, margen, notas) nunca sale del servidor, para nadie.
3. Un cliente no ve correo ni teléfono de los contactos; el staff sí.
4. Un proyecto que existe pero no es de ese cliente responde igual que uno que no existe.
5. Ids mal formados, cuerpos inválidos o JSON roto responden 4xx, nunca 500. El título va de 1 a 120 caracteres y el nivel debe existir en el proyecto.
6. El detalle del proyecto se puede revalidar barato: ETag y 304 con `If-None-Match`. La respuesta es por usuario, así que no debe quedar en cachés compartidas.
7. `Range: bytes=0-15` sobre la nube responde 206 con los 16 bytes del encabezado. Un proyecto sin nube responde 404.

Incluye pruebas automáticas de al menos las reglas 2, 4 y 5.

| Método y ruta | Qué devuelve |
|---------------|--------------|
| `GET /api/projects` | Los proyectos que esa persona puede ver: id, nombre, dirección, estado, nombre del cliente |
| `GET /api/projects/:id` | El detalle: lo anterior más fechas, niveles y contactos |
| `GET /api/projects/:id/spaces` | Los cuartos del proyecto |
| `GET /api/projects/:id/cloud` | El archivo binario de la nube de puntos, con soporte de Range |
| `POST /api/projects/:id/issues` | Crea un reporte `{ title, level, spaceId? }` y responde 201 con su id |

## Parte B — Visor web

Una sola página, en inglés, que consume tu API.

1. **Elegir quién eres y el proyecto.** Un selector de token (staff, acme, brick) y la lista de proyectos que ese usuario ve. Al abrir uno, una ficha con nombre, cliente, estado y fechas; una fecha vacía dice "Not recorded".
2. **Espacios en 3D.** Cada cuarto es una caja (x, y, z = esquina mínima en metros, Z hacia arriba; w, d, h = tamaño), con un color por nivel. Orbitar, acercar y desplazar con mouse y con dedos. Al tocar una caja, un panel lateral muestra nombre, uso, nivel y área en ft² o m² (un botón alterna la unidad). Un filtro muestra un solo nivel.
3. **Nube de puntos.** Un botón "Load point cloud" descarga el archivo y lo interpreta en un Web Worker, con una barra de progreso real y un botón Cancel. Se dibuja con `THREE.Points` en la misma escena, alineada con las cajas.
4. **Cambiar de proyecto a mitad de carga.** Si la persona abre otro proyecto mientras la nube descarga, esa descarga se cancela y ningún punto del proyecto anterior aparece en el nuevo.
5. **Errores honestos.** Un archivo cortado (genéralo con `--truncate`), un 404 o la red caída muestran un mensaje claro con "Try again"; la página nunca queda en blanco ni con una excepción en consola.
6. **Reportar un problema.** Un formulario corto (título, nivel, el espacio seleccionado) que llama al POST y muestra el resultado. Nada de `alert()` ni `prompt()`.
7. **iPad.** Usable a 1180×820 y 820×1180: controles de al menos 44 px, sin scroll horizontal y sin zoom accidental al tocar un campo.

La nube de 2 millones de puntos debe orbitar con fluidez en un computador normal. Si bajas puntos o calidad para lograrlo, explícalo en el README.

## Parte C — Preguntas cortas

Responde cada una en máximo 120 palabras, en un archivo `ANSWERS.md`. Buscamos criterio, no teoría.

1. Un cliente reporta que en su iPad la pestaña se recarga sola mientras abre un escaneo de 300 MB; en el computador funciona. ¿Cómo lo diagnosticas y qué cambiarías?
2. Después de publicar una versión nueva, algunos usuarios siguen viendo la anterior durante días aunque el servidor ya tiene el código nuevo. Los archivos se sirven con caché larga. ¿Qué pasa y cómo lo evitas de forma definitiva?
3. Agregamos un asistente con un modelo de lenguaje que opera la interfaz por medio de herramientas ("abre el inspector", "aísla el nivel 2"). A veces responde "listo, lo abrí" y no pasó nada. ¿Cómo diseñas las herramientas para que eso no pueda pasar?
4. Un cliente ve en la pestaña de red del navegador el nombre de un proyecto de otro cliente. ¿Dónde buscas la causa y qué regla de diseño lo evita?
5. Con 2 millones de puntos el visor baja a 15 cuadros por segundo al orbitar. Nombra tres técnicas en orden de lo que probarías primero, y por qué.

## Entrega y reglas

Envía un repositorio Git (enlace o .zip con la carpeta `.git`) en las 48 horas siguientes a recibir el kit.

- **README:** cómo instalar y arrancar con un solo comando, qué quedó hecho, qué falta, qué harías con un día más, y las decisiones que tomaste.
- **Commits** pequeños con mensajes claros: queremos ver cómo avanzaste, no un solo commit final.
- **Pruebas** que corran con `npm test`.
- **IA permitida.** Puedes usar asistentes de código. Di en el README cuáles usaste y para qué. En la entrevista de revisión te pediremos explicar y modificar cualquier parte en vivo.
- Nada de secretos en el repositorio ni de servicios pagos.

**Cómo evaluamos:** correremos tu servidor con el kit y una batería de pruebas automáticas sobre la API, probaremos el visor en computador y en iPad, y leeremos el código y tus respuestas. Pesa más que los datos de un cliente nunca lleguen a otro, que nada se rompa con entradas malas y que la carga 3D sea cancelable, que el acabado visual.

Después haremos una revisión de 30 minutos contigo sobre tu entrega.
