# Site Viewer Lite — Frontend

Visor web 3D para gemelos digitales de edificios: muestra los espacios de un proyecto como cajas, carga la nube de puntos del escaneo (PTS1) en un Web Worker y permite reportar un problema. Consume la API de `../Backend`.

**Estado en una línea:** los 7 puntos de la Parte B están implementados y el proyecto compila (`npm run build` OK). Lo que **no** hice o no pude verificar está en [Limitaciones conocidas](#limitaciones-conocidas); lo escribo aquí a propósito.

## Arrancar

Requiere Node 18+ y el backend corriendo en `http://localhost:3000` (puerto por defecto de la API; Vite le hace proxy a `/api`).

```bash
# terminal 1 — API (desde la raíz del repo)
cd Backend && npm install && npm run dev

# terminal 2 — visor
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Otros scripts: `npm run build` (tsc + vite), `npm run preview`, `npm run lint`.

Las nubes del kit se generan con `node kit/tools/make-cloud.js 1201-30001` (2 M de puntos, ~30 MB) y `... 1201-30002 400000`. Agrega `--truncate` para probar el archivo cortado.

> El `index.html` carga Tailwind (Play CDN) y fuentes de Google en tiempo de ejecución, así que el visor necesita internet. Ver limitaciones.

## Usuarios de prueba

La pantalla de entrada tiene un campo de nombre y tres chips; cada uno usa el token del kit.

| Usuario | Rol | Proyectos que ve |
|---|---|---|
| Dana Ortiz | staff | los tres; ve correo y teléfono de contactos |
| Sam Lee | client (`acme`) | `410 Harbor Ave` (1201-30001), `77 Mill St Warehouse` (1201-30002) |
| Rita Gomez | client (`brick`) | `Brickyard Lofts` (0980-41007) |

`Brickyard Lofts` no tiene nube: sirve para ver el caso 404 con "Try again".

## Qué hay hecho (Parte B)

| # | Requisito | Estado | Cómo está resuelto |
|---|---|---|---|
| 1 | Usuario, lista y ficha | Hecho | Chips de usuario, selector de proyecto en la barra superior, ficha con cliente, estado y fechas. Fecha vacía → "Not recorded". |
| 2 | Espacios en 3D | Hecho | Una caja por espacio, color por nivel, `OrbitControls` con mouse y dedos. Al tocar una caja (raycast, ignora arrastres > 6 px) el panel muestra nombre, uso, nivel y área (ancho × fondo) con botón m² / ft². Filtro por nivel. |
| 3 | Nube de puntos | Hecho | "Load point cloud" → worker descarga con `fetch` + stream, progreso real en MB y %, "Cancel download". Se dibuja con `THREE.Points` alineada con las cajas. |
| 4 | Cambiar de proyecto a mitad de carga | Hecho | Al cambiar de proyecto se hace `worker.terminate()` (corta la descarga) y se limpia la nube antes de pedir el nuevo proyecto. |
| 5 | Errores honestos | Hecho | 404, 401, red caída, magic inválido y archivo truncado muestran un mensaje claro y "Try again". El truncado se detecta comparando el conteo del encabezado con los bytes recibidos. |
| 6 | Reportar problema | Hecho | Modal propio (sin `alert`/`prompt`), título 1–120 con contador, nivel, espacio opcional preseleccionado; muestra éxito o error del POST. |
| 7 | iPad | **Parcial** | Layout sin scroll horizontal y `touch-action: manipulation`. Los 44 px y los 16 px en inputs **no se cumplen** todavía (ver abajo). |

Detalles de comportamiento:

- **Coordenadas:** el kit usa Z arriba; Three.js usa Y arriba. Caja: posición `(x + w/2, z + h/2, y + d/2)`, tamaño `(w, h, d)`. El worker aplica el mismo cambio a los puntos.
- **Filtro por nivel y nube:** al cargar, cada punto se asigna al nivel de la caja que lo contiene; si no cae en ninguna, al nivel más cercano por altura (no se descarta ninguno). Cada nivel es un `THREE.Points` aparte, y el filtro solo cambia `visible`: no reasigna memoria.
- **Tema claro/oscuro:** `setTheme()` actualiza fondo, grilla y aristas sin recrear el renderer ni la geometría. Se guarda en `localStorage` con `try/catch`.

## Cómo viaja la nube de puntos

```
fetch (en el worker) → trozos en memoria → un Uint8Array → valida PTS1 y N
  → Float32Array de posiciones + Uint8Array de colores → postMessage con transferencia
  → hilo principal: clasifica por nivel → un THREE.Points por nivel
```

El `postMessage` final transfiere los buffers sin copiarlos. El resto del pipeline **sí hace copias** (ver limitaciones).

## Decisiones

- **React + Vite + TypeScript estricto + Three.js (^0.187).** Estado de la app en `App.tsx`; la escena vive aparte en `three/ViewerScene.ts` para que React no re-renderice el canvas.
- **Parseo en un worker.** El hilo principal solo recibe arrays ya listos.
- **Cancelar = terminar el worker.** Más simple y robusto que propagar un `AbortController`: cierra la conexión y descarta cualquier parseo en curso.
- **`fetch` nativo** para la API, con `ApiError` que normaliza mensajes (401, red caída, cuerpo de error del servidor).
- **Sin librerías extra:** ni axios, ni gestor de estado, ni react-router.

## Limitaciones conocidas

Ordenadas por importancia.

1. **iPad, parcial.** Los botones de nivel y vista miden ~22–34 px de alto (`py` de 4–8 px con texto de 11–13 px), no 44. Los inputs usan 14 px, por debajo de los 16 px con que Safari evita el zoom al enfocar. Solo se previene con `maximum-scale=1, user-scalable=no` en el viewport, que además perjudica la accesibilidad. **No lo probé en un iPad real.**
2. **Rendimiento sin medir.** No medí FPS con 2 M de puntos ni en iPad. No hay LOD, culling ni submuestreo: se dibujan todos los puntos (tamaño fijo de 1,5 px, antialias activo, `pixelRatio` limitado a 2) y el bucle de render corre siempre.
3. **La clasificación por nivel bloquea el hilo principal.** El worker no congela la UI, pero `setPointCloud` recorre los 2 M de puntos contra todas las cajas en el hilo principal. Hay un tirón al terminar la carga.
4. **Picos de memoria.** Durante la carga coexisten: trozos descargados, el buffer unido, `positions` + `colors` y las copias por nivel. Con el archivo de 30 MB es aceptable; con uno de 300 MB en iPad es el primer sospechoso de que Safari mate la pestaña.
5. **Peticiones de API sin cancelar.** Al cambiar de proyecto rápido, la respuesta lenta del proyecto anterior podría pisar la del nuevo (detalle y espacios). La nube sí queda protegida (punto 4 de la prueba); esto no.
6. **Sin pruebas en el frontend.** Solo `lint` y `tsc`. Las pruebas automáticas están en el backend.
7. **Dependencia de internet:** Tailwind por CDN (pensado para desarrollo, no producción) y Google Fonts. Un build de producción debería compilar Tailwind y alojar las fuentes.
8. **Textos decorativos de la pantalla de entrada** ("IFC4 · E57 Compatible", "0.02m · 2.0M PTS") son estáticos: el visor solo lee PTS1 y no importa IFC ni E57.

## Con un día más

1. Subir controles a 44 px y inputs a 16 px, quitar `user-scalable=no`, y probar en iPad real.
2. Medir FPS y memoria; luego, en este orden: submuestreo durante el gesto, menos `pixelRatio`/antialias en táctil, y LOD por octree solo si hace falta.
3. Mover la clasificación por nivel al worker (o a un segundo worker) y parsear por trozos en vez de unir todo el archivo.
4. `AbortController` en las peticiones de API y un test del cambio de proyecto a mitad de carga.
5. Pruebas con Vitest para el cliente de API y el parser PTS1 (casos: truncado, magic inválido, N = 0).
6. Compilar Tailwind en el build y alojar las fuentes.

## Estructura

```
frontend/src/
├── App.tsx                 estado, carga de proyecto y ciclo de vida del worker
├── api/client.ts           fetch con token, ApiError, mensajes de error
├── three/ViewerScene.ts    escena, cajas, raycast, filtro por nivel, nube por nivel
├── workers/cloudParser.worker.ts   descarga + validación + parseo PTS1
├── components/             LoginView, Navbar, ProjectInfoCard, LevelFilter,
│                           SpaceInspector, PointCloudLoader, IssueModal
└── types.ts
```

## Uso de IA

Ver el README de la raíz (herramientas usadas y para qué).