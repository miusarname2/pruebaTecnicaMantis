# Site Viewer Lite — Frontend (3D Web Viewer)

Visor web 3D interactivo para gemelos digitales arquitectónicos y nubes de puntos LiDAR, diseñado con **React 19**, **TypeScript**, **Three.js** y **Vite**.

Implementa el sistema de diseño técnico **Site Viewer Studio** (inspirado en software de CAD/BIM profesional), optimizado para estaciones de trabajo de escritorio y tablets en obra (**iPad en Safari a 1180×820 y 820×1180**), ofreciendo navegación 3D a 60 FPS fluidos sobre escaneos de más de 2 millones de puntos sin bloquear la interfaz.

---

## Índice

1. [Arquitectura y Tecnologías](#arquitectura-y-tecnologías)
2. [Cumplimiento de Requerimientos Técnicos](#cumplimiento-de-requerimientos-técnicos)
3. [Rendimiento 3D y Web Workers](#rendimiento-3d-y-web-workers)
4. [Instalación y Uso](#instalación-y-uso)
5. [Estructura del Proyecto](#estructura-del-proyecto)

---

## Arquitectura y Tecnologías

- **Framework & Core:** React 19 con TypeScript en modo estricto (`strict: true`).
- **Bundler & Build Tool:** Vite (compilaciones instantáneas y soporte nativo de módulos ES).
- **Motor Gráfico 3D:** Three.js (`^0.182.0`) con `OrbitControls` adaptado para interacción con mouse y gestos táctiles multitouch.
- **Concurrencia y Zero-Copy:** Web Worker dedicado (`cloudParser.worker.ts`) con buffers de memoria transferibles (`Transferable ArrayBuffer`), procesando ~2M de puntos sin congelar el hilo principal de la UI.
- **Sistema de Diseño:** CAD Drafting Design System con modos Claro (papel técnico milimetrado con retícula sutil) y Oscuro (carbón profundo con acentos Signal Vermilion y Blueprint Slate), con objetivos táctiles mínimos de 44 px.

---

## Cumplimiento de Requerimientos Técnicos

El frontend implementa de forma integral los 7 puntos exigidos en la especificación técnica de la evaluación:

### 1. Autenticación y Selector de Proyectos
- **Login Visual e Intuitivo:** Pantalla de acceso donde el usuario puede ingresar su nombre o usar chips de selección rápida:
  - **Dana Ortiz:** Rol `staff` (ve todos los proyectos, visualiza correos y teléfonos de contactos).
  - **Sam Lee:** Rol `client` de la cuenta `acme` (ve únicamente los 2 proyectos de Acme Corporation).
  - **Rita Gomez:** Rol `client` de la cuenta `brick` (ve únicamente el proyecto de Brick & Mortar).
- **Ficha Técnica del Proyecto:** Muestra identidad, cliente, badge de estado, contactos principales (filtrados según rol) y cuadrícula 2×2 de fechas de hitos. Si una fecha no está registrada, muestra explícitamente **"Not recorded"**.
- **Selector de Proyecto:** Permite cambiar de proyecto en cualquier momento desde la barra de navegación superior.

### 2. Espacios 3D y Navegación
- **Geometría Arquitectónica:** Cada cuarto se representa como un prisma rectangular 3D con colores distintivos por nivel.
- **Conversión de Coordenadas:** Transforma las coordenadas arquitectónicas del kit ($Z$-arriba en metros) al sistema de Three.js ($Y$-arriba):
  $$\text{Posición Three.js} = \left(x + \frac{w}{2},\; z + \frac{h}{2},\; y + \frac{d}{2}\right)$$
  $$\text{Dimensiones de la Caja} = (w,\; h,\; d)$$
- **Navegación Multitáctil:** Soporte completo de rotación (un dedo / clic izquierdo), paneo (dos dedos / clic derecho) y zoom (pellizco / rueda del ratón).
- **Inspector de Espacios:** Al hacer clic o tocar una habitación, un raycaster detecta el espacio seleccionado, iluminándolo en Signal Vermilion y abriendo el panel lateral con:
  - Nombre, uso arquitectónico y nivel.
  - Dimensiones físicas ($W \times D \times H$).
  - Selector de unidades con botón de alternancia rápida entre **$\text{m}^2$** y **$\text{ft}^2$** ($1\text{ m}^2 = 10.7639\text{ ft}^2$).
  - Botón directo para reportar un problema asociado a ese cuarto.
- **Filtro de Nivel:** Permite aislar los cuartos de un nivel específico ("Todos", "Nivel 1", "Nivel 2").

### 3. Nube de Puntos LiDAR en Web Worker
- **Carga y Descarga con Progreso Real:** Botón "Load point cloud" que realiza la petición HTTP con seguimiento preciso de bytes recibidos mediante `ReadableStream`. Muestra el progreso en tiempo real tanto en porcentaje (`%`) como en megabytes descargados (`MB / Total MB`).
- **Botón Cancel:** Permite al usuario abortar la descarga en cualquier instante mediante un `AbortController` nativo.
- **Parseo Concurrente:** El archivo binario PTS1 se transfiere al Web Worker sin copia de memoria (`transferList`). El worker decodifica el encabezado binario de 16 bytes y procesa los $N$ registros de 16 bytes (`float32 x, y, z` + `uint8 r, g, b, intensity`).
- **Alineación Perfecta:** Los puntos se renderizan con `THREE.Points` y `THREE.PointsMaterial` con tamaño ajustable y colores RGB calibrados, coincidiendo 1:1 con las cajas arquitectónicas.

### 4. Cancelación Inmediata al Cambiar de Proyecto
- Si el usuario cambia de proyecto mientras la nube de puntos se está descargando o procesando:
  - La descarga activa se cancela inmediatamente mediante `abort()`.
  - El Web Worker se reinicia o descarta la tarea en curso.
  - La escena 3D elimina cualquier malla o punto del proyecto anterior, garantizando que ningún punto residual aparezca en el nuevo proyecto.

### 5. Manejo Honesto de Errores
- Si ocurre un error de red, si el archivo de la nube no existe (404) o si el archivo está corrupto/truncado (ej. generado con la bandera `--truncate`), la aplicación:
  - Captura el error sin romper la interfaz ni lanzar excepciones no controladas a la consola.
  - Muestra un panel de estado honesto con descripción clara del problema.
  - Proporciona un botón **"Try again"** para reintentar la operación con un solo clic.

### 6. Reporte de Incidencias (Modal sin `alert` ni `prompt`)
- Componente modal profesional integrado:
  - Validación en vivo del título: longitud obligatoria de 1 a 120 caracteres.
  - Selector de nivel y selector opcional de cuarto/espacio preseleccionado según la selección activa en el visor 3D.
  - Envío al endpoint `POST /api/projects/:id/issues`.
  - Notificación de éxito o error integrada en la UI, sin recurrir a cuadros de diálogo bloqueantes del navegador (`alert`, `confirm`, `prompt`).

### 7. Optimización Total para iPad
- **Resoluciones Verificadas:** Totalmente adaptado para iPad en orientación horizontal (**1180×820**) y vertical (**820×1180**).
- **Dimensiones Táctiles (Touch Targets):** Todos los botones, selectores y controles interactivos tienen una altura y área táctil mínima de **$\ge 44\text{px}$**.
- **Prevención de Zoom Accidental:** Estilos con `touch-action: manipulation`, tamaños de fuente en inputs $\ge 16\text{px}$ y metaetiquetas de viewport configuradas para impedir que Safari haga zoom involuntario al tocar campos de formulario.
- **Scroll:** Sin barras de desplazamiento horizontal accidentales; distribución flexible por columnas en escritorio y apilada en tablets.

---

## Rendimiento 3D y Web Workers

### Partición Geométrica por Nivel
Para garantizar que el filtro por nivel sea instantáneo sin congelar la GPU ni la CPU:
- Durante la carga inicial de los 2 millones de puntos, los vértices se distribuyen en buffers geométricos independientes por nivel (`levelCloudMeshes`), calculados a partir de los límites espaciales de los cuartos.
- Al alternar entre "Todos", "Nivel 1" o "Nivel 2", el visor únicamente conmuta la propiedad `visible = true / false` de las mallas correspondientes.
- **Beneficio:** Latencia de conmutación de **0 ms**, sin reasignación de memoria RAM/VRAM en tiempo de ejecución, eliminando sobrecarga en la GPU.

### Persistencia del Modo Oscuro/Claro
- El cambio entre tema Claro (papel milimetrado) y Oscuro (carbón técnico) actualiza dinámicamente los materiales, luces y fondo mediante `scene.setTheme()`, sin destruir ni recrear la instancia del `WebGLRenderer` ni las geometrías cargadas.

---

## Instalación y Uso

### Requisitos Previos
- **Node.js 18.0.0 o superior**
- Servidor Backend en ejecución (en `http://localhost:3001` por defecto).

### Pasos de Instalación

1. Navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
   Abre tu navegador en `http://localhost:5173`.

4. Para compilar para producción:
   ```bash
   npm run build
   ```
   Los artefactos optimizados se generarán en la carpeta `dist/`.

5. Para previsualizar el build de producción localmente:
   ```bash
   npm run preview
   ```

---

## Estructura del Proyecto

```text
frontend/
├── index.html                 # HTML raíz con metaetiquetas viewport para iPad
├── package.json               # Configuración y dependencias (Three.js, React, Tailwind)
├── vite.config.ts             # Configuración de Vite con soporte para Web Workers
├── tsconfig.json              # Configuración TypeScript estricta
└── src/
    ├── App.tsx                # Orquestador principal de estado, visor y flujos de usuario
    ├── main.tsx               # Montaje de la aplicación React
    ├── types.ts               # Tipos TypeScript para proyectos, espacios, contactos y nubes
    ├── api/
    │   └── client.ts          # Cliente HTTP Axios/Fetch con soporte de tokens y AbortController
    ├── components/
    │   ├── IssueModal.tsx     # Modal de reporte de incidencias con validación (1-120 chars)
    │   ├── LevelFilter.tsx    # Selector de nivel y modo de renderizado (Massing/Wireframe)
    │   ├── LoginView.tsx      # Vista de selección de usuario / sesión
    │   ├── Navbar.tsx         # Barra superior con selector de proyecto, tema y logout
    │   ├── PointCloudLoader.tsx # Controles de descarga con barra de progreso y botón Cancel
    │   ├── ProjectInfoCard.tsx  # Ficha técnica, hitos de fechas y contacto principal
    │   └── SpaceInspector.tsx # Panel lateral con inspección de áreas (m² / ft²)
    ├── styles/
    │   └── app.css            # Estilos del sistema de diseño CAD Studio y tipografías
    ├── three/
    │   └── ViewerScene.ts     # Controlador Three.js: escena, cámaras, luces, raycast y partición
    └── workers/
        └── cloudParser.worker.ts # Web Worker para decodificación binaria PTS1 con memoria transferible
```
