# Site Viewer Lite — Full Stack 3D Platform

Plataforma web de ingeniería y gemelos digitales BIM/LiDAR para visualizar modelos arquitectónicos 3D, inspeccionar áreas de espacios y renderizar nubes de puntos de millones de vértices de forma fluida y segura en navegadores de escritorio y tablets en obra (**iPad**).

---

## Inicio Rápido (Quickstart)

Para ejecutar la aplicación completa en tu máquina local solo necesitas **Node.js 18+** y seguir estos sencillos pasos:

### 1. Clonar o Abrir el Repositorio
Abre una terminal en la raíz del proyecto `pruebaTecnicaMantis`:
```bash
cd pruebaTecnicaMantis
```

### 2. Generar Nubes de Puntos de Prueba (Opcional)
Si deseas generar o regenerar los archivos binarios de nubes de puntos LiDAR (`.pts1`):
```bash
node kit/tools/make-cloud.js --project proj-tower --points 2000000
node kit/tools/make-cloud.js --project proj-warehouse --points 1500000
```
*(Nota: Para probar manejo de errores de archivos truncados puedes usar `--truncate`).*

---

### 3. Poner en Marcha el Backend (API)

Abre una terminal y ejecuta:

```bash
cd Backend
npm install
npm run dev
```

- **URL de la API:** `http://localhost:3001`
- **Para ejecutar la suite de 44 pruebas automatizadas:**
  ```bash
  npm test
  ```

---

### 4. Poner en Marcha el Frontend (Visor Web 3D)

Abre una segunda terminal y ejecuta:

```bash
cd frontend
npm install
npm run dev
```

- **URL de la Aplicación:** `http://localhost:5173`
- **Para compilar para producción:**
  ```bash
  npm run build
  ```
- **Para previsualizar el build de producción:**
  ```bash
  npm run preview
  ```

---

## Cómo Probar la Aplicación

1. **Accede a `http://localhost:5173`** en tu navegador o iPad.
2. **Selecciona un Usuario:**
   - **Dana Ortiz (Staff):** Tiene visibilidad global de todos los proyectos (`proj-tower`, `proj-warehouse`, `proj-retail`) y ve teléfonos y correos en la ficha de contactos.
   - **Sam Lee (Client - Acme Corp):** Solo puede ver los proyectos de su cuenta (`proj-tower` y `proj-warehouse`). Sus contactos no muestran teléfonos ni correos privados.
   - **Rita Gomez (Client - Brick & Mortar):** Solo ve el proyecto `proj-retail`.
3. **Explora en 3D:**
   - **Navegación:** Rota con clic izquierdo / un dedo; panea con clic derecho / dos dedos; haz zoom con rueda / gesto de pellizco.
   - **Inspección de Cuartos:** Toca o haz clic sobre cualquier habitación para abrir el panel lateral, alternar entre $\text{m}^2$ y $\text{ft}^2$, o reportar una incidencia.
   - **Filtro de Nivel:** Selecciona "Todos", "Nivel 1" o "Nivel 2" para aislar geometrías y nubes de puntos de cada planta.
   - **Cargar Nube LiDAR:** Haz clic en "Load point cloud" para ver la barra de progreso en MB y %, o cancela la descarga en cualquier momento.
   - **Alternar Tema:** Cambia entre modo Claro (papel milimetrado CAD) y modo Oscuro (carbón técnico) sin perder la escena 3D ni los objetos cargados.

---

## Resumen Funcional de los Módulos

| Componente | Rol y Funcionalidad | Documentación Detallada |
| :--- | :--- | :--- |
| **Backend API** | API RESTful en Node.js (ES Modules) y Express con arquitectura MVC. Implementa autenticación Bearer, sanitización recursiva del bloque `internal`, filtrado de contactos por rol, aislamiento estricto multicliente (anti-enumeración), validación de entradas (siempre 4xx, nunca 500), ETags débiles con revalidación 304, y streaming binario de nubes PTS1 con soporte de cabecera `Range: bytes=0-15`. | [Backend/README.md](file:///c:/Users/Perso/Documents/personal/pruebaTecnicaMantis/Backend/README.md) |
| **Frontend 3D** | Visor web interactivo en React 19, TypeScript y Three.js con diseño CAD Studio. Incluye Web Worker con memoria transferible (`Transferable ArrayBuffer`) para decodificar nubes PTS1 de ~2M de puntos sin congelar la UI, partición de nubes por nivel para aislamiento instantáneo (0 ms de latencia), soporte multitáctil para iPad (1180×820 y 820×1180), y modal de reporte de issues. | [frontend/README.md](file:///c:/Users/Perso/Documents/personal/pruebaTecnicaMantis/frontend/README.md) |
| **Respuestas a Preguntas Teóricas** | Respuestas técnicas y de criterio de ingeniería (< 120 palabras c/u) a las 5 preguntas de arquitectura, WebGL, cachés y diagnóstico de la Parte C. | [ANSWERS.md](file:///c:/Users/Perso/Documents/personal/pruebaTecnicaMantis/ANSWERS.md) |

---

## Declaración sobre Uso de Asistentes de IA

En cumplimiento con las reglas de la prueba técnica (*"Puedes usar asistentes de código. Di en el README cuáles usaste y para qué"*):

- **Herramienta utilizada:** Antigravity (Google DeepMind Agentic AI Assistant).
- **Usos específicos:**
  1. Aceleración en la escritura de los 44 casos de prueba automatizados con Jest y Supertest en el backend.
  2. Asistencia en la formulación matemática de conversión de sistemas de coordenadas ($Z$-up metros a $Y$-up en Three.js).
  3. Optimización del Web Worker con buffers de memoria transferibles para el parseo binario de PTS1.
  4. Depuración del ciclo de vida de Three.js para la partición por niveles y la persistencia de escena durante el cambio de tema claro/oscuro.
  5. Asistencia en la organización y formateo cronológico de los commits en Git siguiendo Conventional Commits y Gitmoji.
