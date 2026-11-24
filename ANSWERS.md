# ANSWERS.md

## 1. La pestaña se recarga en iPad con un escaneo de 300 MB

Casi seguro es Safari matando la pestaña por memoria (jetsam): en iPad el
límite por pestaña es mucho menor que en un computador, y la recarga
automática con "ocurrió un problema" es su firma. Lo confirmo conectando el
iPad a un Mac y mirando la pestaña Memory del Web Inspector mientras abro
el escaneo.

Lo más probable es que haya varias copias de los 300 MB (descarga completa,
paso al worker, Float32Array final). Cambiaría: leer por trozos (la API ya
soporta Range), parsear en el worker y transferir los buffers sin copiarlos,
submuestrear al cargar en iPad y soltar referencias en cuanto la geometría
está en la GPU.

## 2. Siguen viendo la versión vieja durante días

El `index.html` quedó en caché con `max-age` largo: el navegador ni pregunta
al servidor y sigue pidiendo los JS viejos que ese HTML referencia. Un
service worker mal configurado produce lo mismo.

Solución definitiva: separar por tipo de archivo. Los assets llevan hash en
el nombre (`app.3fa9c1.js`) y `Cache-Control: public, max-age=31536000,
immutable`. El `index.html` va con `no-cache`: se guarda, pero siempre
revalida con ETag y responde 304 barato. Así cada despliegue cambia el HTML
y este apunta a archivos nuevos. Quien ya lo tiene cacheado solo se arregla
cuando expire, por eso esto se hace desde el primer despliegue.

## 3. El asistente dice "listo, lo abrí" y no pasó nada

El fallo es dejar que el modelo narre en vez de reportar. Mi diseño:

- Cada herramienta ejecuta y devuelve el estado leído de la UI *después* de
  actuar, no un "ok": `{ ok: true, inspectorOpen: true, visibleLevel: 2 }`.
- Si falla, error explícito y accionable:
  `{ ok: false, error: "Level 2 does not exist", available: [0, 1, 3] }`.
- Valido argumentos antes de actuar (nivel y espacio del proyecto actual).
- Una herramienta de solo lectura `get_ui_state` para verificar.
- Regla del prompt: solo afirmar lo que el resultado confirme.

Y una prueba automática: si una herramienta responde `ok` sin que el estado
cambie, la prueba falla.

## 4. Un cliente ve el nombre de un proyecto de otro cliente

Empiezo por la respuesta cruda en la pestaña de red y busco:

1. Un endpoint (lista, búsqueda, exportación) sin filtro por cuenta.
2. Serialización del objeto completo: el nombre llega "de paso" dentro de
   un campo anidado.
3. Caché compartida: respuesta por usuario sin `Cache-Control: private` ni
   `Vary: Authorization`.

Regla de diseño: la autorización se decide en un solo punto del servidor,
con la identidad que sale del token (nunca un id de cuenta enviado por el
cliente). Todo acceso a datos pasa por una función que ya filtra por cuenta,
y las respuestas se arman con lista blanca de campos. Además, "no existe" y
"no es tuyo" responden igual: 404.

## 5. 15 fps al orbitar con 2 millones de puntos

Primero mido: ¿el cuello está en vértices, en píxeles o en CPU? Luego:

1. **Píxeles:** limitar `pixelRatio` a 2, desactivar antialias y reducir
   `pointSize`. Son minutos de trabajo y en iPad suele ganar mucho.
2. **Menos puntos mientras se orbita:** `setDrawRange` durante el gesto y
   100 % al soltar. Antes barajo los puntos en el worker; si no, solo
   dibujaría una zona del edificio.
3. **Octree/LOD con frustum culling:** lo más potente, pero lo más caro.
   Solo si lo medido lo justifica.

Primero lo barato y reversible.