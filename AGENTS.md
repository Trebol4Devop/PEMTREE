# AGENTS.md — PEMTREE2

## Quick facts
- **React + Vite + Tailwind** app in `pemtree-react/`. No longer vanilla JS.
- **Package manager: pnpm** (required — netlify.toml uses `pnpm run build`).
- **No typecheck step.** No TypeScript; all `.js`/`.jsx`.
- **Lint:** `pnpm lint` (ESLint with react-hooks + react-refresh plugins). No test runner.

## Commands (run from `pemtree-react/`)
- `pnpm dev` — Vite dev server
- `pnpm build` — production build to `dist/`
- `pnpm preview` — preview production build
- `pnpm lint` — ESLint

## Architecture
- **Entry:** `src/main.jsx` → `App.jsx`
- **Routing:** React Router (`/` → Home, `/visualizador` → Visualizer)
- **Core JS modules** (not React components) live in `src/modules/`:
  - `data/` — `NodoCurso` model y carga desde el catálogo unificado (`cursos.js`), import (`importFromJSON.js`). `cursos` y `cursoMap` son exports mutables a nivel de módulo. Tras la migración a catálogo (schema v4), `cursos.js` construye el pensum activo desde `catalogo.json` vía `construirCursosDesdeCatalogo()` en `importFromJSON.js` (ids = `pensums[].orden + 1`, prereqs de códigos resueltos a ids con alternativas OR aplanadas). Ya **no** fetchea los archivos de pensum ni `pensum_color/` (los colores vienen de `carreras[].colores`). `loadPensum`/`listAvailablePensums`/`getPensumKey`/`STARTUP_LOADED_PENSUM` conservan su API para no tocar GraphManager/Planner/StorageManager. El evento `pemtree-pensum-ready` se conserva. `importarCursosDesdeJSON` (leía archivos de pensum) se eliminó con la migración.
  - `data/catalogo.js` — Catálogo unificado: `cargarCatalogo()` (fetch `public/json/catalogo.json` con dedup de promesa), helpers `getCursoInfo`/`getCursoResumen`/`getCursoApertura`, `getDocente` (match por `variantes` tolerante a acentos), `getDocentesDeCurso`, y reputación Supabase (`cargarReputacion()` usa la vista `docente_reputation` + voto propio; `recomendarDocente()` upsert en `docente_reviews`). No bloquea si Supabase no está configurado. Modelo v4: añade `getSeccionesDeCurso` (secciones/horarios del catálogo, filtrables por `ciclo`/`tipoPeriodo`, con restricciones y refs a docentes), `getDocentesDeCursoEnPeriodo` (docentes por `(ciclo, tipoPeriodo)` con reputación), `esCursoRecomendable` (usa `vistoEnHorarios`), `getDocentePorId`, y los horarios por periodo: `getHorariosPorPeriodo(periodId)` (agrega secciones del **ciclo más reciente con datos**, resuelve `catedraticoId`/`auxiliarId` a nombre, traduce `tipoSeccion`→`tipo`; cada objeto lleva `ciclo` y `datoAnterior`) y `getUltimaActualizacionHorarios(periodId)` (lastRun del ciclo; reemplaza `horarios/index.json`). **IDs**: el catálogo usa `doc_rol_slug`; Supabase usa uuids; la reputación se une por `(claveNombre|rol)` en `cargarReputacion()` (indexa la tabla `docentes` incl. variantes), y `recomendarDocente()` recibe el objeto docente del catálogo (no su id).
  - `graph/` — `GraphManager`, `LayoutCalculator`, `NodeRenderer`, `EdgeRenderer`, `CriticalPathAnalyzer`, `dimensions.js`
  - `storage/` — `StorageManager` (localStorage persistence, per-pensum keys)
  - `ui/` — `PanZoomManager`, `TooltipManager`
  - `utils/` — `TextUtils`
- **React pages:** `src/pages/Home.jsx` (landing; las CareerCards leen `pensums`/`carreras[].colores` del catálogo, sin fetch a `index.json` ni `pensum_color/`), `src/pages/Visualizer.jsx` (graph viewer + toolbar + planner — ~650 lines, main interactive page)
- **React components:** `src/components/Navbar.jsx`, plus planner components: `Planner.jsx`, `CoursePool.jsx`, `SemesterBlock.jsx`, `VacationBlock.jsx`, `CourseChip.jsx`, `ToastNotification.jsx`
- **Custom hooks:** `src/hooks/useToast.js` (toast notification state)
- Graph rendering uses raw SVG DOM manipulation (not React) inside `GraphManager` and friends. React owns the toolbar/info-card UI; SVG nodes/edges are created imperatively.
- **Planner:** Tab-based view in Visualizer (`activeView: 'graph' | 'planner'`). Planner uses HTML drag-and-drop to let users plan courses by semester and vacation school. Chips replicate the node aesthetic (4-section layout with pensum colors). Validates prerequisites on drop. Persists to localStorage. El 2º pensum (carreras simultáneas) se construye desde el catálogo (`construirCursosDesdeCatalogo` + `carreras[].colores`).
- **ScheduleBuilder** (`activeView: 'schedule'`): usa `cargarHorarios(periodId)` de `modules/data/scraper.js`, que tras la migración lee del catálogo vía `getHorariosPorPeriodo` (ciclo más reciente con datos por periodo). Cuando el ciclo vigente no publicó el periodo (portal borró datos), muestra un aviso "Datos del ciclo anterior (<ciclo>)". El módulo `scraper.js` conserva las funciones de validación de traslapes sobre los objetos de horario (con `tipo`/`catedratico`/`auxiliar` ya resueltos).
- `test_import.mjs` (repo root) fue eliminado: apuntaba a la antigua app `website/` (ya inexistente).

## Data files (`public/`)
- `json/` — Pensum JSONs per engineering program. `index.json` lists available pensums as `[{file, name, cohort, vigencia, clar}]` (metadata persistida por `scraper-pensum.mjs`).
- `json/horarios/` — Per-period snapshots (`semestre1|2`, `vacaciones1|2`; fuente del pipeline del catálogo). Each entry has `tipoPeriodo` (par/impar), `catedratico` and `auxiliar` normalized (spaces collapsed). Los archivos fusionados `semestre.json`/`vacaciones.json` y el legacy `horarios.json` se eliminaron (la app y el pipeline leen de `catalogo.json`).
- `json/horarios/history/` — Archived raw snapshots per academic cycle (`<ciclo>_<tipoPeriodo>.json`), written by the catalog pipeline.
- `json/catalogo.json` — **Catálogo unificado generado** (schema v4) por `scraper-catalogo.mjs`. Organiza los datos dispersos en: `ciclosAcademicos` (ids generados `ciclo-AAAA-N`, sin id oficial), `tipoPeriodos` (`semestre-impar|par`, `vacaciones-impar|par`), `pensums` (registro de cada pensum con `carrera`, `cohort`, `vigencia`, `clar`), `carreras` (id, nombre, pensums, colores, `cursos`), `cursos` (por código), `docentes`. Los **traslapes no se calculan aquí** (obedecen reglas específicas que se manejan aparte).
  - **`cursos`** — Todo curso del pensum se siembra aunque nunca haya abierto. Campos: `nombre`, `claveNombre` (nombre canónico sin acentos, para correlacionar equivalencias) y `codigos` (todos los códigos que comparten ese nombre; hoy siempre `[codigo]`, sirve de detección de renumérado), `carreras`, `pensums` (datos por pensum: `orden` (índice del archivo de pensum, base de los `id` de NodoCurso), `semestre`, `creditos`, `tipo`, `preRequisitos`/`posRequisitos` normalizados a códigos; los grupos OR `(A|B)` se guardan como `{alternativa:[A,B]}` y los requisitos de créditos `150CR` como `{creditos:150}`), más `creditos`/`tipo`/`esObligatorio` de conveniencia, `enPensum`, `vistoEnHorarios`, `observaciones` (**solo "abrió o no"** por `(ciclo, tipoPeriodo)`), `resumen` de apertura por tipoPeriodo y `secciones`.
  - **`cursos[].secciones`** — Horarios **acumulados por ciclo** (cada sección lleva `ciclo` explícito para procedencia; si el portal borra un periodo, la app puede distinguir vigente vs. anterior). Incluye `tipoSeccion` (MAGISTRAL/LABORATORIO/PRACTICA/DIBUJO/TRABAJO_DIRIGIDO), `modalidad`, `edificio`/`salon`, `inicio`/`final`/`dias`, `restricciones` (bandera `true`/`false` o texto enriquecido), `periodo_restriccion` (código del portal, distinto de `tipoPeriodo`), `anio` y `catedraticoId`/`auxiliarId`. El texto detallado de restricciones se enriquece aparte con `scraper-restricciones.mjs`; el pipeline conserva un string ya guardado si el snapshot vuelve con solo la bandera.
  - **`docentes`** — Catedráticos **y** auxiliares, con `rol`, `variantes`, `activo`, `ultimoCicloVisto`, `ciclos`, `carreras` y `cursos` (cada curso con `tipoPeriodos`, `ciclos` y `secciones: ["<ciclo>|<tipoPeriodo>|<seccion>"]`). La depuración marca `activo:false` a un docente que lleva `DEPURAR_TRAS_CICLOS` (3) ciclos sin aparecer. Umbral configurable al tope del script (`DEPURAR_TRAS_CICLOS`).
  - **Robustez ante datos faltantes:** si el portal no publica un `tipoPeriodo` (fuente vacía, p. ej. `vacaciones2` o un semestre borrado), se omite con un `[WARN]`, no se crean observaciones (ni `abrio:false` falsos) y la depuración de docentes no se adelanta por ese ciclo (solo cuenta ciclos donde se capturó algún periodo relevante del docente). Si no se captura **ningún** tipoPeriodo, el pipeline aborta y **no registra un ciclo fantasma**. Las carreras se derivan automáticamente de `index.json` + `pensum_color/`, así que agregar una pensum nueva es suficiente.
- `pensum_color/` — Per-program color themes (`*_color.json` with `color1`/`color2`/`color3`). Loaded at runtime via `applyPensumColors()`, which sets CSS custom properties `--primary`, `--accent`, `--border` and dark-mode palette vars on `:root`.
- `images/` — Static assets (logo, guide images, background).

## Supabase — docentes y reseñas
- **`docentes`** (tabla sembrada desde `catalogo.json`): `id`, `nombre`, `rol` (`catedratico`|`auxiliar`), `nombre_variantes`, `activo`, timestamps; unique `(nombre, rol)`. RLS: lectura pública, actualización solo admin.
- **`docente_reviews`** (reseñas estilo Steam, sin comentarios): `docente_id` FK, `user_id` FK, `recomienda bool`, timestamps; unique `(docente_id, user_id)` (1 voto por usuario/docente). RLS: lectura pública, insert/update/delete solo del dueño (o admin).
- **`docente_reputation`** (vista `security_invoker`): `total`, `recomendados`, `pct_recomienda` por docente.
- **Seed**: `pemtree-react/scripts/seed-docentes.mjs` — upsert por `(nombre, rol)` leyendo el catálogo local. Requiere `SUPABASE_SERVICE_ROLE_KEY` (NO la anon/publishable). `--depurar` desactiva en Supabase los docentes ausentes del catálogo.
  ```sh
  SUPABASE_SERVICE_ROLE_KEY=svc_xxx node scripts/seed-docentes.mjs [--depurar]
  ```

## Supabase — seguridad y push
- **RLS por rol (anon vs authenticated):** las políticas SELECT de `posts`/`comments`/`whatsapp_groups` están separadas por rol. `anon` solo ve contenido no moderado (`moderation_status IS DISTINCT FROM 2`); `authenticated` además ve su propio contenido y el de moderadores/admin. Los DELETE de posts/comments son solo `authenticated`.
- **Políticas con `(select auth.uid())`:** todas las políticas usan el patrón initplan para evitar re-evaluar `auth.uid()` por fila.
- **SECURITY DEFINER restringidas:** `is_pemtree_admin`, `is_pemtree_moderator` y las RPCs de moderación (`ocultar/restaurar/eliminar_contenido_moderado`) NO son ejecutables por `anon`; solo `authenticated` (validan permisos internamente) y `service_role`.
- **`get_push_secrets()`** (RPC, solo `service_role`): la edge function `send-push` lee sus secretos del Vault vía esta RPC en lugar de tenerlos hardcoded. Secrets en `vault.secrets`: `push_edge_secret`, `vapid_public_key`, `vapid_private_key`, `vapid_subject`.
- **`user_reports`:** `reporter_id` es `uuid` con FK a `auth.users` (CASCADE); `reported_user_id` es `uuid` (sin FK, el reporte debe conservarse aunque el usuario reportado no exista).

## localStorage keys
- `pemtree_progreso_<pensumKey>` — per-pensum course completion state (`[{id, completado, cursando}]`)
- `pemtree_pensum_actual` — currently selected pensum filename
- `pemtree_theme` — `"dark"` or `"light"`
- `pemtree_guia_visto` — whether the onboarding guide has been dismissed
- `pemtree_plan` — planner course assignments as `{ [blockId]: [courseId, ...] }` (blockId: `sem-N` or `vac-N`)

## Known quirks
- `cursos` and `cursoMap` are module-level mutable variables. Modules that import them get the initial reference; re-importing after `initializeCursos()` returns the updated arrays only if the import is re-evaluated. The Visualizer component works around this by calling `updateCursos()` on `GraphManager`.
- Node dimensions in `dimensions.js` are computed at call time from `window.innerWidth` — not reactive to resize.
- Dark mode is toggled by adding/removing `dark` class on `<html>` and dispatching a `themeChanged` event. Both `App.jsx` and `Visualizer.jsx` track `isDarkMode` independently.
- The default pensum at startup is `ciencias_y_sistemas_22.json`.
- `StorageManager.storageKey` is dynamic (depends on current pensum), so course progress is stored **per pensum**.

## Deploy
- Netlify. Config in `pemtree-react/netlify.toml`: build command `pnpm run build`, publish dir `dist`.
- SPA redirect `/* → /index.html` (status 200) is configured in netlify.toml.
- JSON and color files have `no-cache` headers set in netlify.toml.
- Node 20, pnpm 9 specified in build environment.