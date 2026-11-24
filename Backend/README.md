# Site Viewer Lite — Backend API

API REST en Node.js (ES Modules) + Express que sirve proyectos BIM, espacios 3D
y nubes de puntos PTS1 con aislamiento de datos por cliente. Sin base de datos:
lee los JSON del kit al arrancar y guarda los reportes en memoria.

## Arranque rápido

Requiere Node.js 18+. Desde esta carpeta (`Backend/`):

```bash
npm install && npm start      # http://localhost:3000
```

| Comando | Qué hace |
| :--- | :--- |
| `npm start` | Servidor (`node index.js`) |
| `npm run dev` | Servidor con auto-reload (`node --watch`) |
| `npm run setup:clouds` | Genera las dos nubes del kit en `kit/data/clouds/` (2 M y 400 k puntos) |
| `npm test` | Jest + Supertest (45 pruebas) |

- **Puerto:** `PORT` (por defecto `3000`; el proxy de Vite del frontend apunta a `3000`).
- **Nubes de puntos:** `GET /api/projects/:id/cloud` responde 404 si el `.pts` no
  existe en disco. Si no están en el repo, corre `npm run setup:clouds` antes de arrancar.
  Las pruebas no lo necesitan: `tests/globalSetup.js` genera nubes mínimas (1 000 puntos) si faltan.
- No se usa `.env`: la única variable leída es `PORT`.

## Datos y roles

Los datos salen de `../kit/data/` (`users.json`, `projects.json`, `spaces/<id>.json`, `clouds/`).

| Token | Usuario | Rol | Proyectos visibles |
| :--- | :--- | :--- | :--- |
| `staff-token` | Dana Ortiz | `staff` | Todos (3) |
| `acme-token` | Sam Lee | `client` (acme) | `1201-30001`, `1201-30002` |
| `brick-token` | Rita Gomez | `client` (brick) | `0980-41007` |

## Endpoints

Todos requieren `Authorization: Bearer <token>`.

| Método | Ruta | Códigos | Devuelve |
| :--- | :--- | :--- | :--- |
| GET | `/api/projects` | 200, 401 | `id`, `name`, `address`, `status`, `clientName` de los proyectos visibles |
| GET | `/api/projects/:id` | 200, 304, 400, 401, 404 | Lo anterior + `dates`, `levels`, `contacts` (según rol). ETag |
| GET | `/api/projects/:id/spaces` | 200, 400, 401, 404 | Espacios como cajas (metros, Z arriba) |
| GET | `/api/projects/:id/cloud` | 200, 206, 400, 401, 404, 416 | Binario PTS1, con soporte de `Range` |
| POST | `/api/projects/:id/issues` | 201, 400, 401, 404 | Crea `{ title, level, spaceId? }`, responde `{ id }` |

Cualquier otra ruta bajo `/api` responde 404 `{ "error": "Endpoint not found" }`.
Las rutas `/api/*` pasan primero por autenticación, así que sin token incluso una ruta inexistente responde 401.

## Las 7 reglas: cómo se cumplen

| # | Regla | Cómo | Dónde |
| :-: | :--- | :--- | :--- |
| 1 | Sin token o inválido → 401 | Exige `Bearer <token>` no vacío y presente en `users.json`; si no, 401 | `middlewares/auth.js` |
| 2 | `internal` nunca sale | Las respuestas se construyen con **lista blanca** de campos (`formatProjectList`, `formatProjectDetail`); `internal` y `account` no están en la lista, por lo que un campo nuevo en el JSON no se filtra solo | `utils/sanitize.js` |
| 3 | Contactos según rol | Para `client` se descartan `email` y `phone` de cada contacto; `staff` recibe el contacto completo | `utils/sanitize.js` |
| 4 | Ajeno = inexistente | `getById` devuelve `null` en ambos casos y los controladores responden con el mismo helper: 404 `{ "error": "Project not found" }`. Aplica a detalle, spaces, cloud e issues | `models/projectModel.js`, controladores |
| 5 | Entradas malas → 4xx | ID con formato `NNNN-NNNNN` (400 si no); JSON roto → 400; `title` string de 1–120 caracteres tras `trim()`; `level` debe estar en `project.levels`; `spaceId` string y existente en los espacios del proyecto. Errores 4xx con `status` se respetan; el resto → 500 genérico sin detalles | `middlewares/validators.js`, `errorHandler.js`, `issueController.js` |
| 6 | ETag y caché privada | ETag = MD5 del JSON ya sanitizado (`"<hash>"`); `Cache-Control: private, no-cache` y `Vary: Authorization`; 304 con cuerpo vacío si `If-None-Match` coincide (soporta listas, `*` y prefijo `W/`). Staff y client producen cuerpos distintos, por lo tanto ETags distintos | `controllers/projectController.js`, `utils/etag.js`, `middlewares/auth.js` |
| 7 | Range sobre la nube | `fs.createReadStream` con `{ start, end }` y `stream.pipeline`; 206 + `Content-Range` + `Content-Length`; `Accept-Ranges: bytes` siempre. Proyecto con `cloud: null` → 404 | `controllers/projectController.js` |

Orden de las comprobaciones: autenticación → formato del ID → pertenencia (404) → validación del cuerpo.
Un cliente que escribe en un proyecto ajeno recibe 404 antes de que se valide su cuerpo.

## Límites conocidos

- **Range:** se aceptan `bytes=a-b` y `bytes=a-`. No hay rangos de sufijo (`bytes=-N`) ni múltiples; un rango fuera del archivo responde 416 en lugar de recortarse.
- **Reportes:** viven en memoria (se pierden al reiniciar) y no hay endpoint para listarlos.
- **CORS** abierto a cualquier origen (`cors()` sin opciones). La autenticación es por cabecera, no por cookie.
- Sin límite de peticiones (rate limiting) ni logs estructurados.

## Con un día más

- Soportar rangos de sufijo (`bytes=-N`) y ETag/`If-Range` también para la nube.
- Persistir los reportes y exponer su consulta, con pruebas.
- Restringir CORS al origen del visor y añadir rate limiting.

## Pruebas

```bash
npm test
```

Jest + Supertest sobre ES Modules nativos (`--experimental-vm-modules`). 45 pruebas en 3 archivos:

| Archivo | Pruebas | Cubre |
| :--- | :-: | :--- |
| `tests/auth.test.js` | 6 | Regla 1: sin token, token inválido, sin prefijo `Bearer`, valor vacío, token válido staff y client |
| `tests/issues.test.js` | 14 | Regla 5 y creación: título vacío/solo espacios/121 y 120 caracteres, nivel faltante o inexistente, `spaceId` inválido o numérico, JSON roto, proyecto ajeno → 404 |
| `tests/projects.test.js` | 25 | Reglas 2, 3, 4, 6 (ETag, `Vary: Authorization`, listas/`W/`) y 7, ID mal formado y path traversal, y filtrado de la lista por rol |

La regla 4 se prueba comparando status y cuerpo de "ajeno" frente a "inexistente".

```text
[PEGAR AQUÍ la salida real de npm test]
```

## Estructura

```text
Backend/
├── index.js                    # Arranque del servidor
├── jest.config.js
├── package.json
├── src/
│   ├── app.js                  # Express, CORS, JSON, auth, rutas y manejo de errores
│   ├── config/index.js         # Puerto y ruta a kit/data
│   ├── controllers/
│   │   ├── issueController.js
│   │   └── projectController.js
│   ├── middlewares/
│   │   ├── auth.js             # Bearer
│   │   ├── errorHandler.js     # JSON roto, 4xx y 500 genérico
│   │   └── validators.js       # Formato del ID de proyecto
│   ├── models/                 # issueModel · projectModel · spaceModel · userModel
│   ├── routes/                 # projectRoutes · issueRoutes
│   └── utils/
│       ├── etag.js
│       └── sanitize.js         # Listas blancas de campos por rol
└── tests/                      # auth · issues · projects · globalSetup
```

## Uso de IA

Ver la declaración en el README de la raíz del repositorio.