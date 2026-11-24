# Site Viewer Lite — Full Stack 3D Platform

Plataforma web de ingeniería y gemelos digitales BIM/LiDAR para visualizar modelos arquitectónicos 3D, inspeccionar áreas de espacios y renderizar nubes de puntos en formato binario PTS1 de forma fluida y segura en navegadores de escritorio y tablets en obra (**iPad**).

---

## Inicio Rápido (Un Solo Comando)

Requiere **Node.js 18+**. Desde la raíz del repositorio (`pruebaTecnicaMantis`):

```bash
npm run quickstart
```

Este único comando ejecuta en orden:
1. `npm run setup`: instala dependencias de la raíz (`concurrently`), `Backend/` y `frontend/`.
2. `npm run setup:clouds`: genera las nubes binarias PTS1 del kit (`1201-30001` con 2,000,000 puntos y `1201-30002` con 400,000 puntos).
3. `npm run dev`: inicia simultáneamente el Backend API (`http://localhost:3000`) y el Frontend (`http://localhost:5173`).

*(También puedes usar `npm start` en lugar de `npm run dev` para correr el Backend con `node index.js`).*

### Pruebas Automatizadas desde la Raíz

```bash
npm test
```

Ejecuta las **55 pruebas automatizadas** del proyecto (45 de la API en Jest + Supertest y 10 del Frontend en Vitest).

### Generación Manual de Nubes de Puntos (Opcional)

```bash
# Proyecto 1201-30001 (410 Harbor Ave) — 2,000,000 puntos (~30.5 MB)
node kit/tools/make-cloud.js 1201-30001 2000000

# Proyecto 1201-30002 (77 Mill St Warehouse) — 400,000 puntos (~6.1 MB)
node kit/tools/make-cloud.js 1201-30002 400000

# Archivo truncado al 60 % para probar errores honestos en el visor
node kit/tools/make-cloud.js 1201-30001 2000000 --truncate
```

---

## Cómo Probar la Aplicación

1. **Accede a `http://localhost:5173`** en tu navegador o iPad.
2. **Selecciona un Usuario:**
   - **Dana Ortiz (`staff`):** Ve los 3 proyectos (`1201-30001 - 410 Harbor Ave`, `1201-30002 - 77 Mill St Warehouse`, `0980-41007 - Brickyard Lofts`) junto con el correo y teléfono de los contactos.
   - **Sam Lee (`client` — Acme Builders):** Solo ve `1201-30001` y `1201-30002`. Los contactos omiten correo y teléfono.
   - **Rita Gomez (`client` — Brick & Co):** Solo ve `0980-41007` (`Brickyard Lofts`, sin nube, ideal para probar el 404 con *"Try again"*).
3. **Explora en 3D:**
   - **Navegación:** Rota con clic izquierdo / un dedo; panea con clic derecho / dos dedos; zoom con rueda / pellizco.
   - **Inspección de Cuartos:** Toca cualquier volumen 3D para abrir el inspector, alternar entre $\text{m}^2$ y $\text{ft}^2$, o reportar un problema.
   - **Filtro de Nivel:** Aísla geometrías y nubes de puntos por planta (`All Levels`, `Level 1`, `Level 2`, etc.).
   - **Cargar Nube LiDAR:** Pulsa *"Load point cloud"* para ver el progreso real en MB y %, o *"Cancel download"* para abortar.

---

## Qué Quedó Hecho

- **Parte A — API Node.js (Express):**
  - Autenticación `Bearer <token>` (401 si falta o es inválido) con cabecera `Vary: Authorization` en todas las respuestas autenticadas.
  - Serialización por **lista blanca** en [Backend/src/utils/sanitize.js](./Backend/src/utils/sanitize.js): `internal` nunca sale del servidor y `client` no recibe `email` ni `phone` de contactos.
  - Aislamiento multi-cliente: un proyecto ajeno responde `404 { "error": "Project not found" }`, idéntico byte a byte a uno inexistente.
  - Validación estricta de IDs (`NNNN-NNNNN`), JSON roto (400), título de 1–120 caracteres, nivel y `spaceId` válidos (siempre 4xx, nunca 500).
  - Revalidación en `GET /api/projects/:id`: ETag MD5 fuerte (`"<hash>"`) con `Cache-Control: private, no-cache`, `Vary: Authorization` y soporte en `If-None-Match` para listas, `*` y prefijo débil `W/`.
  - Streaming binario de nubes PTS1 con soporte `Range` (`206 Partial Content`) usando `stream.pipeline` para cerrar el descriptor de archivo si el cliente aborta la descarga.
  - **45 pruebas automatizadas** en Jest + Supertest cubriendo todas las reglas.
- **Parte B — Visor Web 3D (React 19 + TypeScript + Three.js):**
  - Interfaz en inglés, selector de usuario/proyecto, ficha de proyecto con *"Not recorded"* para fechas nulas.
  - Escena 3D con conversión $Z$-up a $Y$-up, raycast en cuartos, inspector lateral con cambio $\text{m}^2 \leftrightarrow \text{ft}^2$ y filtro por nivel.
  - Web Worker dedicado ([frontend/src/workers/cloudParser.worker.ts](./frontend/src/workers/cloudParser.worker.ts)) que descarga, valida el encabezado PTS1, clasifica los puntos por nivel fuera del hilo principal y transfiere los buffers `Float32Array`/`Uint8Array` sin copiar memoria (`Transferable`).
  - Cancelación segura al cambiar de proyecto (`worker.terminate()` para la nube + `AbortController` y control de versión de petición para detalle/espacios).
  - Errores honestos con botón *"Try again"* y modal de reporte de issues sin `alert()`/`prompt()`.
  - Controles táctiles `>= 44 px` en toda la interfaz, inputs/selects de `16 px` para evitar zoom en Safari, layout sin scroll horizontal y `OrbitControls` multitáctil para iPad.
  - Build 100% offline con Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource` y `material-symbols` empaquetados localmente (sin CDN).
  - **10 pruebas unitarias en Vitest** cubriendo `parsePts1Buffer` (Z-up→Y-up, niveles, `N=0`, truncado, magic inválido) y `api/client` (Bearer, 401, errores JSON, red caída y `AbortError`).
- **Parte C — Preguntas Cortas:**
  - Respondidas en [ANSWERS.md](./ANSWERS.md) dentro del límite de 120 palabras por pregunta.

---

## Decisiones Técnicas Tomadas

1. **Lista blanca de campos en lugar de `delete`:** Garantiza que si se agregan campos sensibles al JSON en el futuro, nunca se filtren por omisión.
2. **Clasificación por nivel en el Web Worker:** Evita congelar el hilo principal al terminar de descargar 2M de puntos; el hilo principal solo instancia un `THREE.Points` por nivel y filtra cambiando `visible` en 0 ms.
3. **`AbortController` + contador de petición en `App.tsx`:** Evita condiciones de carrera si el usuario cambia rápido entre proyectos antes de que respondan `/api/projects/:id` o `/spaces`.
4. **`stream.pipeline` en `/cloud`:** Maneja errores de disco y destruye el `ReadStream` si el cliente cancela la descarga a mitad de camino.
5. **Sin librerías innecesarias:** `fetch` nativo y estado local en React para mantener el bundle ligero y fácil de auditar.

---

## Qué Falta y Qué Haría con un Día Más

### Qué falta (limitaciones conocidas)
- **Rendimiento sin medir ni LOD/submuestreo:** No se midieron FPS formales con 2,000,000 de puntos ni en computador normal ni en iPad físico. No hay LOD ni submuestreo: se dibujan los 2 M de puntos completos.
- **Prueba en iPad físico:** Todos los controles cumplen `>= 44 px` e inputs `16 px` en el DOM, pero falta validación manual en hardware real.
- **Persistencia de issues:** Los reportes se guardan en memoria (se pierden al reiniciar el servidor).

### Qué haría con un día más
1. Medir FPS y memoria en un iPad real e implementar submuestreo adaptativo (`setDrawRange`) durante gestos de órbita para mantener 60 FPS fluidos.
2. Parsear y transferir la nube por trozos (*streaming parsing*) para reducir el pico de RAM en archivos >100 MB.
3. Agregar pruebas de integración UI con Testing Library y persistir los issues en disco.

---

## Resumen de Módulos

| Componente | Descripción | Documentación |
| :--- | :--- | :--- |
| **Backend API** | API RESTful en Node.js (ES Modules) + Express. | [./Backend/README.md](./Backend/README.md) |
| **Frontend 3D** | Visor web en React 19, TypeScript y Three.js. | [./frontend/README.md](./frontend/README.md) |
| **Preguntas Parte C** | Respuestas técnicas (< 120 palabras c/u). | [./ANSWERS.md](./ANSWERS.md) |

---

## Declaración sobre Uso de Asistentes de IA

En cumplimiento con las reglas de la prueba técnica (*"Puedes usar asistentes de código. Di en el README cuáles usaste y para qué"*):

- **Herramienta utilizada:** Antigravity (Google DeepMind Agentic AI Assistant).
- **Usos específicos:**
  1. Aceleración en la escritura de las pruebas automatizadas con Jest y Supertest en el backend.
  2. Asistencia en la conversión de sistemas de coordenadas ($Z$-up metros a $Y$-up en Three.js).
  3. Implementación y optimización del Web Worker con buffers transferibles (`Transferable`) para parseo y partición por nivel de PTS1.
  4. Depuración de condiciones de carrera (`AbortController`), accesibilidad táctil (`44 px`) y scripts monorepo en la raíz.
