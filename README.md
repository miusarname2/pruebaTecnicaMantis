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

### 2. Instalar y Poner en Marcha con un Solo Comando 🚀

Instala todas las dependencias del proyecto (raíz, backend y frontend) y arranca ambos servicios de forma concurrente:

```bash
# 1. Instalar dependencias completas (raíz, backend y frontend automáticamente):
npm install

# 2. Generar nubes de puntos de prueba mínimas (si no están generadas aún):
npm run setup:clouds

# 3. Arrancar Backend (puerto 3000) y Frontend (puerto 5173) en una sola terminal:
npm run dev
```

- **Frontend (Visor Web 3D):** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3000](http://localhost:3000)

*(Nota: También puedes arrancarlo con `npm start` para el modo producción de la API).*

---

### 3. Pruebas Automatizadas desde la Raíz

Para ejecutar la suite completa de 44 pruebas unitarias y de integración de la API:

```bash
npm test
```

---

### 4. Generación Manual de Nubes de Puntos LiDAR (Opcional)

Si deseas regenerar manualmente las nubes en formato binario PTS1 con el generador del kit:
```bash
# Proyecto 1201-30001 (410 Harbor Ave) con 2M de puntos:
node kit/tools/make-cloud.js 1201-30001 2000000

# Proyecto 1201-30002 (77 Mill St Warehouse) con 1.5M de puntos:
node kit/tools/make-cloud.js 1201-30002 1500000

# Probar archivos truncados para validar errores honestos en el visor:
node kit/tools/make-cloud.js 1201-30001 2000000 --truncate
```

---

## Cómo Probar la Aplicación

1. **Accede a [http://localhost:5173](http://localhost:5173)** en tu navegador de escritorio o iPad.
2. **Selecciona un Usuario:**
   - **Dana Ortiz (Staff):** Tiene visibilidad global de todos los proyectos (`1201-30001 - 410 Harbor Ave`, `1201-30002 - 77 Mill St Warehouse`, `0980-41007 - Brickyard Lofts`) y ve teléfonos y correos en la ficha de contactos.
   - **Sam Lee (Client - Acme Builders):** Solo puede ver los proyectos de su cuenta (`1201-30001` y `1201-30002`). Sus contactos no muestran teléfonos ni correos privados (regla anti-fuga de datos).
   - **Rita Gomez (Client - Brick & Co):** Solo ve el proyecto `0980-41007`.
3. **Explora en 3D:**
   - **Navegación:** Rota con clic izquierdo / un dedo; panea con clic derecho / dos dedos; haz zoom con rueda / gesto de pellizco.
   - **Inspección de Cuartos:** Toca o haz clic sobre cualquier habitación para abrir el panel lateral, alternar entre $\text{m}^2$ y $\text{ft}^2$, o reportar una incidencia.
   - **Filtro de Nivel:** Selecciona "All", "Level 1" o "Level 2" para aislar geometrías y nubes de puntos de cada planta.
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
