# Site Viewer Lite — Frontend

Visor web 3D para gemelos digitales de edificios: muestra los espacios de un proyecto como cajas, carga la nube de puntos del escaneo (PTS1) en un Web Worker y permite reportar un problema. Consume la API de `../Backend`.

**Estado en una línea:** los 7 puntos de la Parte B están implementados, el build es 100% offline (Tailwind CSS v4 y fuentes locales, sin CDN), incluye 14 pruebas unitarias en Vitest, parseo en streaming en el worker, barajado Fisher-Yates para LOD uniforme por `setDrawRange` con medición de FPS en vivo, y todos los controles cumplen `>= 44 px` / `16 px` en inputs. Lo que aún falta verificar está en [Limitaciones conocidas](#limitaciones-conocidas).

## Arrancar

Requiere Node 18+ y el backend corriendo en `http://localhost:3000` (puerto por defecto de la API; Vite le hace proxy a `/api`).

```bash
# terminal 1 — API (desde la raíz del repo)
cd Backend && npm install && npm run dev

# terminal 2 — visor
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Otros scripts: `npm test` (Vitest, 14 pruebas), `npm run build` (tsc + vite), `npm run preview`, `npm run lint`.

Las nubes del kit se generan con `node kit/tools/make-cloud.js 1201-30001` (2 M de puntos, ~30 MB) y `... 1201-30002 400000`. Agrega `--truncate` para probar el archivo cortado.

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
| 1 | Usuario, lista y ficha | Hecho | Selector de token/usuario en la barra superior (`Navbar`, con `LoginView` al cerrar sesión), selector de proyecto y ficha con cliente, estado y fechas. Fecha vacía → "Not recorded". |
| 2 | Espacios en 3D | Hecho | Una caja por espacio, color por nivel, `OrbitControls` con mouse y dedos. Al tocar una caja (raycast, ignora arrastres > 6 px) el panel muestra nombre, uso, nivel y área (ancho × fondo) con botón m² / ft². Filtro por nivel. |
| 3 | Nube de puntos | Hecho | "Load point cloud" → worker descarga y parsea en streaming (`Pts1StreamParser`) con progreso real en MB y %, "Cancel download". Se dibuja con `THREE.Points` con LOD dinámico (`setDrawRange` al 25 % durante órbita y adaptativo por FPS). |
| 4 | Cambiar de proyecto a mitad de carga | Hecho | Al cambiar de proyecto se hace `worker.terminate()` (corta la descarga) y se limpia la nube antes de pedir el nuevo proyecto. |
| 5 | Errores honestos | Hecho | 404, 401, red caída, magic inválido y archivo truncado muestran un mensaje claro y "Try again". El truncado se detecta comparando el conteo del encabezado con los bytes recibidos. |
| 6 | Reportar problema | Hecho | Modal propio (sin `alert`/`prompt`), título 1–120 con contador, nivel, espacio opcional preseleccionado; muestra éxito o error del POST. |
| 7 | iPad | Hecho (sin prueba física) | Layout sin scroll horizontal, `touch-action: manipulation`, todos los botones y controles `>= 44 px` (`min-h-[44px]`/`min-w-[44px]`), e inputs/selects de `16 px` (`text-base`) para evitar zoom accidental en Safari sin bloquear el viewport. |

Detalles de comportamiento:

- **Coordenadas:** el kit usa Z arriba; Three.js usa Y arriba. Caja: posición `(x + w/2, z + h/2, y + d/2)`, tamaño `(w, h, d)`. El worker aplica el mismo cambio a los puntos.
- **Filtro por nivel y nube:** al cargar, cada punto se asigna al nivel de la caja que lo contiene; si no cae en ninguna, al nivel más cercano por altura (no se descarta ninguno). Cada nivel es un `THREE.Points` aparte, y el filtro solo cambia `visible`: no reasigna memoria.
- **Tema claro/oscuro:** `setTheme()` actualiza fondo, grilla y aristas sin recrear el renderer ni la geometría. Se guarda en `localStorage` con `try/catch`.

## Cómo viaja la nube de puntos

```
fetch (en el worker) → Pts1StreamParser (trozo a trozo, sin archivo completo en RAM)
  → valida PTS1 y N (submuestreo por zancada si > 4 M pts) → bloques por nivel
  → compacta en { level, Float32Array, Uint8Array } + barajado Fisher-Yates in-place
  → postMessage con transferencia zero-copy → hilo principal: un THREE.Points por nivel
```

El `postMessage` final transfiere los buffers de cada nivel sin copiarlos. Al barajar los puntos en el worker, el LOD por `setDrawRange` (25 % al orbitar y 100 % al soltar, o adaptativo si FPS < 24) siempre muestra una muestra uniforme de todo el edificio aunque el escaneo original esté ordenado espacialmente.

## Decisiones

- **React + Vite + TypeScript estricto + Three.js (^0.187).** Estado de la app en `App.tsx`; la escena vive aparte en `three/ViewerScene.ts` para que React no re-renderice el canvas.
- **Parseo en un worker.** El hilo principal solo recibe arrays ya listos.
- **Cancelar = terminar el worker.** Más simple y robusto que propagar un `AbortController`: cierra la conexión y descarta cualquier parseo en curso.
- **`fetch` nativo** para la API, con `ApiError` que normaliza mensajes (401, red caída, cuerpo de error del servidor).
- **Sin librerías extra:** ni axios, ni gestor de estado, ni react-router.

## Limitaciones conocidas

Ordenadas por importancia.

1. **Sin prueba en iPad físico.** Todos los controles cumplen `>= 44 px` e inputs `16 px` en CSS/DOM, y se implementó LOD adaptativo + parseo en streaming + barajado uniforme, pero falta validación manual en un iPad real con Safari.

## Con un día más

1. Medir FPS y memoria reales en un iPad físico con escaneos de 2 M y 300 MB.
2. Añadir LOD espacial por octree con *frustum culling* si escaneos aún mayores lo requieren.
3. Añadir pruebas de componentes UI con Testing Library además de las pruebas unitarias actuales de Vitest (`pts1Parser` y `api/client`).

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