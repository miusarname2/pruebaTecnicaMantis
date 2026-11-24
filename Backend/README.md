# Site Viewer Lite — Backend API

Backend RESTful de alto rendimiento y grado de producción para **Site Viewer Lite**, diseñado para servir modelos BIM arquitectónicos, espacios 3D y nubes de puntos LiDAR binarias (PTS1) a clientes y equipos de obra bajo estrictos controles de seguridad, aislamiento de datos entre clientes y revalidación HTTP eficiente.

Construido con **Node.js (ES Modules nativo)** y **Express**, siguiendo una arquitectura por capas **MVC (Model-View-Controller)** sin bases de datos externas, operando sobre almacenes de datos en memoria y archivos JSON del kit BIM.

---

## Índice

1. [Arquitectura y Diseño](#arquitectura-y-diseño)
2. [Cumplimiento de Requerimientos y Reglas de Negocio](#cumplimiento-de-requerimientos-y-reglas-de-negocio)
3. [Endpoints de la API](#endpoints-de-la-api)
4. [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
5. [Pruebas Automatizadas](#pruebas-automatizadas)
6. [Estructura del Proyecto](#estructura-del-proyecto)

---

## Arquitectura y Diseño

El backend está estructurado bajo principios de separación de responsabilidades y defensa en profundidad:

- **Native ES Modules (`"type": "module"`):** Modernizado para aprovechar importaciones estáticas y compatibilidad total con el ecosistema moderno de Node.js.
- **Patrón MVC Desacoplado:**
  - **Rutas (`src/routes/`):** Enrutamiento declarativo y asociación de controladores.
  - **Controladores (`src/controllers/`):** Orquestación del flujo de petición/respuesta y códigos HTTP.
  - **Modelos (`src/models/`):** Gestión de lectura y clonación atómica de datos en memoria (`projects.json`, `users.json`, `spaces/*.json`).
  - **Middlewares (`src/middleware/`):** Autenticación Bearer, control de errores centralizado y validación de sintaxis JSON.
  - **Utilidades (`src/utils/`):** Sanitización profunda inmutable y generación de ETags criptográficos débiles (`W/"..."`).
- **In-Memory Store con Aislamiento Inmutable:** Los modelos devuelven copias profundas (`deep clone`) de los datos en memoria para garantizar que ninguna petición pueda mutar o contaminar el estado de los datos compartidos.

---

## Cumplimiento de Requerimientos y Reglas de Negocio

El diseño de la API satisface de forma estricta las 7 reglas requeridas por la evaluación técnica:

### Regla 1: Autenticación por Token Bearer
- **Mecanismo:** El middleware `authenticate` inspecciona el header `Authorization`.
- **Comportamiento:** Si falta el header, no empieza con `Bearer `, el token está vacío o no coincide con ningún usuario en `users.json`, responde inmediatamente con código **`401 Unauthorized`** (`{ "error": "Invalid or missing token" }`).

### Regla 2: Eliminación Garantizada del Bloque `internal`
- **Mecanismo:** La función utilitaria pura `sanitizeProject` elimina recursivamente la propiedad `internal` (que contiene márgenes comerciales, precios, números de factura y notas privadas).
- **Garantía:** El bloque `internal` **nunca sale del servidor para ningún rol**, ni para clientes (`client`) ni para el equipo interno (`staff`). Se verifica tanto en el listado de proyectos como en el detalle individual.

### Regla 3: Filtrado de Datos de Contacto según Rol
- **Mecanismo:** `sanitizeContacts` evalúa el rol del usuario autenticado:
  - **`staff`:** Tiene visibilidad completa del contacto (`name`, `role`, `email`, `phone`).
  - **`client`:** Se suprimen de forma estricta las propiedades `email` y `phone`, entregando únicamente `name` y `role` para proteger la privacidad de los subcontratistas y miembros del equipo.

### Regla 4: Aislamiento Multicliente y Anti-Enumeración
- **Mecanismo:** Los clientes solo tienen acceso a los proyectos cuyo `account` coincida exactamente con el de su usuario.
- **Protección contra Fuga de Información:** Si un cliente solicita un proyecto existente pero perteneciente a otra cuenta (ej. usuario de `acme` intentando acceder al proyecto de `brick`), la API responde con **`404 Not Found`**, devolviendo un payload y cabeceras **idénticos byte por byte** a los de un proyecto que realmente no existe. Esto previene ataques de fuerza bruta o enumeración de identificadores de proyectos ajenos.

### Regla 5: Validación Robusta de Entradas (Siempre 4xx, Nunca 500)
- **Mecanismo:** Validación defensiva en todos los parámetros de ruta y cuerpos de petición:
  - IDs de proyecto validados contra formato seguro (`^[a-zA-Z0-9_-]+$`), bloqueando de raíz ataques de *Path Traversal* (`../`).
  - Middleware de captura de `SyntaxError` para JSON malformados o truncados.
  - Creación de incidencias (`POST /api/projects/:id/issues`):
    - `title`: Obligatorio, cadena de 1 a 120 caracteres recortados (`trim()`).
    - `level`: Obligatorio, verificado contra los niveles reales existentes en el modelo del proyecto (`project.levels`).
    - `spaceId`: Opcional, pero si se envía debe existir en el archivo de espacios del proyecto.
  - **Respuesta:** Toda entrada no válida o malformada retorna `400 Bad Request` o `404 Not Found`, impidiendo excepciones no controladas o respuestas `500 Internal Server Error`.

### Regla 6: Revalidación HTTP Eficiente con ETag y Caché Privada
- **Mecanismo:** El endpoint `GET /api/projects/:id` genera un hash MD5 a partir de la representación serializada del proyecto sanitizado y emite una cabecera `ETag: W/"<hash>"`.
- **Caché Segura:** Se envía `Cache-Control: private, no-cache`, asegurando que proxies o CDNs compartidas nunca almacenen en caché datos privados de un cliente.
- **Respuesta 304:** Si el cliente envía la cabecera `If-None-Match` coincidente con el ETag actual, el servidor retorna **`304 Not Modified`** con cuerpo vacío, ahorrando ancho de banda. Como los datos se sanitizan por rol (Regla 3), los ETags generados para `staff` y `client` son distintos, impidiendo envenenamiento de caché entre roles.

### Regla 7: Streaming Binario PTS1 y Soporte de HTTP 206 (Range Requests)
- **Mecanismo:** El endpoint `GET /api/projects/:id/cloud` sirve nubes de puntos LiDAR binarias utilizando `fs.createReadStream`.
- **Soporte de Rangos:** Soporta la cabecera `Range` (ej. `Range: bytes=0-15`). Al recibirla, responde con **`206 Partial Content`**, cabeceras `Content-Range: bytes 0-15/<total>` y `Accept-Ranges: bytes`, entregando exactamente los 16 bytes del encabezado mágico PTS1 sin cargar el archivo de 30 MB en memoria RAM.
- Si el proyecto no cuenta con archivo de nube (`cloud: null`), responde **`404 Not Found`**.

---

## Endpoints de la API

Todas las rutas requieren la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Rol | Códigos | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/projects` | Todos | 200, 401 | Lista proyectos autorizados (`id`, `name`, `address`, `status`, `clientName`). |
| `GET` | `/api/projects/:id` | Todos | 200, 304, 400, 401, 404 | Detalle con fechas, niveles y contactos (contactos sanitizados según rol). Soporta ETag / 304. |
| `GET` | `/api/projects/:id/spaces` | Todos | 200, 400, 401, 404 | Geometría de espacios del proyecto (cajas 3D en metros). |
| `GET` | `/api/projects/:id/cloud` | Todos | 200, 206, 400, 401, 404 | Descarga o streaming binario PTS1 con soporte de cabecera `Range`. |
| `POST` | `/api/projects/:id/issues` | Todos | 201, 400, 401, 404 | Reporta un issue `{ title, level, spaceId? }`. Valida 1-120 caracteres y nivel existente. |

---

## Instalación y Puesta en Marcha

### Requisitos Previos
- **Node.js 18.0.0 o superior**
- **npm** (incluido con Node.js)

### Pasos de Instalación

1. Navega a la carpeta del backend:
   ```bash
   cd Backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Variables de entorno (opcional):
   Crea un archivo `.env` o define variables de entorno si deseas personalizar el puerto (por defecto `3001`):
   ```env
   PORT=3001
   NODE_ENV=development
   ```

4. Inicia el servidor:
   - **Modo Desarrollo (con auto-reload):**
     ```bash
     npm run dev
     ```
   - **Modo Producción:**
     ```bash
     npm start
     ```
   El servidor estará disponible en `http://localhost:3001`.

---

## Pruebas Automatizadas

La suite de pruebas automatizadas está construida con **Jest** y **Supertest**, ejecutándose sobre módulos ES nativos (`--experimental-vm-modules`).

Cubre minuciosamente las 7 reglas de negocio y seguridad con **44 pruebas unitarias y de integración**:

- **Autenticación (Regla 1):** Tokens faltantes, vacíos, inválidos y válidos para ambos roles.
- **Sanitización Interna (Regla 2):** Ausencia estricta de `internal` en listas y detalles para `staff` y `client`.
- **Contactos por Rol (Regla 3):** Presencia de teléfono/email para `staff` y supresión total para `client`.
- **Aislamiento Multicliente (Regla 4):** Coincidencia byte a byte entre proyecto no perteneciente a la cuenta y proyecto inexistente.
- **Validación de Entradas (Regla 5):** Bloqueo de path traversal, validación de longitudes de títulos (1 a 120 caracteres), niveles inexistentes y JSON roto con respuestas 4xx.
- **Caché y ETags (Regla 6):** Emisión de ETag débil, cabecera `private`, revalidación 304 e independencia de ETags entre roles.
- **Streaming y Rangos (Regla 7):** Descarga completa, soporte de `Range: bytes=0-15` con respuesta 206 y 404 ante proyectos sin nube.

### Ejecutar las pruebas:
```bash
npm test
```

Salida esperada:
```text
Test Suites: 3 passed, 3 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        ~1.5 s
```

---

## Estructura del Proyecto

```text
Backend/
├── package.json               # Configuración ("type": "module"), scripts y dependencias
├── src/
│   ├── app.js                 # Inicialización de Express, CORS y middlewares globales
│   ├── index.js               # Punto de entrada HTTP y arranque del listener
│   ├── config/
│   │   └── index.js           # Rutas del sistema de archivos y configuración de entorno
│   ├── controllers/
│   │   ├── authController.js    # Manejo de sesión y verificación de tokens
│   │   ├── issueController.js   # Creación y validación de reportes de obra
│   │   └── projectController.js # Lógica de proyectos, espacios y nubes de puntos
│   ├── middleware/
│   │   ├── auth.js            # Middleware de autenticación Bearer
│   │   └── errorHandler.js    # Captura centralizada de 404, 400 y errores de parseo
│   ├── models/
│   │   ├── issueModel.js      # Persistencia de incidencias en memoria
│   │   ├── projectModel.js    # Carga y consultas sobre projects.json
│   │   ├── spaceModel.js      # Carga de archivos de espacios por proyecto
│   │   └── userModel.js       # Autenticación y mapeo de tokens
│   ├── routes/
│   │   ├── authRoutes.js      # Definición de rutas /api/auth
│   │   └── projectRoutes.js   # Definición de rutas /api/projects
│   └── utils/
│       ├── etag.js            # Generación de ETag y verificación If-None-Match
│       └── sanitize.js        # Filtrado recursivo inmutable de datos sensibles
└── tests/
    ├── auth.test.js           # Tests de autenticación (Regla 1)
    ├── issues.test.js         # Tests de validación estricta de issues (Regla 5)
    ├── projects.test.js       # Tests de reglas 2, 3, 4, 5, 6 y 7
    └── globalSetup.js         # Setup de entorno y mocks para tests
```
