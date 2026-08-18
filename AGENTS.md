# AGENTS.md — PEMTREE2

## Quick facts
- **React + Vite + Tailwind** app in `pemtree-react/`. No longer vanilla JS.
- **Package manager: pnpm** (required — netlify.toml uses `pnpm run build`).
- **No typecheck step.** No TypeScript; all `.js`/`.jsx`.
- **Lint:** `pnpm lint` (ESLint with react-hooks + react-refresh plugins). No test runner.
- **Env:** `pemtree-react/.env` needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) for community features. `vite.config.js` sets `envPrefix: ['VITE_', 'NEXT_PUBLIC_']`. Without env, `src/lib/supabase.js` exports `supabase = null` and the app degrades gracefully.

## Commands (run from `pemtree-react/`)
- `pnpm dev` — Vite dev server (`host: true`; useful for testing on a phone on the LAN)
- `pnpm build` — production build to `dist/`
- `pnpm preview` — preview production build
- `pnpm lint` — ESLint

## Scraper pipeline (run from repo **root**, not `pemtree-react/`)
Regenerates `public/json/catalogo.json` from the live USAC portal.
- `node scraper-catalogo.mjs [--force]` — main pipeline (schema v4). Idempotent via `lastRun`; `--force` regenerates regardless.
- `node scraper-pensum.mjs` — fetches pensum files → `json/*.json` + `index.json` + `pensum_color/`.
- `node scraper.mjs` — fetches per-period schedule snapshots → `json/horarios/`.
- `node scraper-restricciones.mjs` — enriches `restricciones` text in `catalogo.json` (needs to run after `scraper-catalogo.mjs`).

## Architecture
- **Entry:** `src/main.jsx` → `App.jsx`
- **Routing:** React Router, 7 routes: `/` → Home, `/visualizador` → Visualizer, `/foro` → Forum, `/grupos` → WhatsAppGroups, `/normas` → Normas, `/mis-publicaciones` → MyPosts, `/notificaciones` → Notifications. Wrapped in `HelmetProvider` (SEO via `src/components/seo/Seo.jsx`), `ThemeProvider`, `NotificationsProvider`, `OnboardingProvider`.
- **Core JS modules** (not React components) live in `src/modules/`:
  - `data/` — `NodoCurso` model y carga desde el catálogo unificado (`cursos.js`), import (`importFromJSON.js`). `cursos` y `cursoMap` son exports mutables a nivel de módulo. Tras la migración a catálogo (schema v4), `cursos.js` construye el pensum activo desde `catalogo.json` vía `construirCursosDesdeCatalogo()` en `importFromJSON.js` (ids = `pensums[].orden + 1`, prereqs de códigos resueltos a ids con alternativas OR aplanadas). Ya **no** fetchea los archivos de pensum ni `pensum_color/` (los colores vienen de `carreras[].colores`). `loadPensum`/`listAvailablePensums`/`getPensumKey`/`STARTUP_LOADED_PENSUM` conservan su API para no tocar GraphManager/Planner/StorageManager. El evento `pemtree-pensum-ready` se conserva. `importarCursosDesdeJSON` (leía archivos de pensum) se eliminó con la migración.
  - `data/catalogo.js` — Catálogo unificado: `cargarCatalogo()` (fetch `public/json/catalogo.json` con dedup de promesa), helpers `getCursoInfo`/`getCursoResumen`/`getCursoApertura`, `getDocente` (match por `variantes` tolerante a acentos), `getDocentesDeCurso`, y reputación de secciones Supabase (`cargarReputacion()` usa la vista `seccion_reputation` + voto propio; `recomendarSeccion()` upsert en `seccion_reviews`). No bloquea si Supabase no está configurado. Modelo v4: añade `getSeccionesDeCurso` (secciones/horarios del catálogo, filtrables por `ciclo`/`tipoPeriodo`, con restricciones y refs a docentes), `esCursoRecomendable` (usa `vistoEnHorarios`), `getDocentePorId`, y los horarios por periodo: `getHorariosPorPeriodo(periodId)` (agrega secciones del **ciclo más reciente con datos**, resuelve `catedraticoId`/`auxiliarId` a nombre, traduce `tipoSeccion`→`tipo`; cada objeto lleva `ciclo` y `datoAnterior`) y `getUltimaActualizacionHorarios(periodId)` (lastRun del ciclo; reemplaza `horarios/index.json`). **Recomendaciones**: están vinculadas únicamente a `(curso_codigo, seccion)` sin vincular nombres personales.
  - `data/plannerWarnings.js` — Avisos del planificador por curso/bloque: apertura en el último ciclo del periodo, traslapes de la misma sección (reusa `calcularTraslapeMinutos`/`esTraslapePermitido` de `scraper.js`), reputación de secciones (`seccion_reputation`) y límite de horas magistrales en vacaciones (máx 4h/día). Usado por `Planner.jsx`.
  - `graph/` — `GraphManager`, `LayoutCalculator`, `NodeRenderer`, `EdgeRenderer`, `CriticalPathAnalyzer`, `dimensions.js`
  - `storage/` — `StorageManager` (localStorage persistence, per-pensum keys)
  - `ui/` — `PanZoomManager`, `TooltipManager`
  - `utils/` — `TextUtils`
- **Client-side Supabase helpers** live in `src/lib/`: `supabase.js` (client singleton; `supabase === null` when not configured), `moderation.js`/`moderationApi.js` (moderation status constants + API), `notification.js` (Formspree email alerts on reports/moderator actions), `push.js` (Web Push subscriptions + Service Worker, `public/sw.js`), `imageUtils.js`.
- **Theming:** `src/theme/ThemeContext.jsx` (Context + `useTheme()`), `palettes.js`/`tokens.js`/`color-map.json`; tailwind `darkMode: "class"`.
- **React pages:** `src/pages/Home.jsx` (landing; las CareerCards leen `pensums`/`carreras[].colores` del catálogo, sin fetch a `index.json` ni `pensum_color/`), `src/pages/Visualizer.jsx` (graph viewer + toolbar + planner + schedule), plus community pages `Forum.jsx` (~1900 lines), `WhatsAppGroups.jsx`, `MyPosts.jsx`, `Notifications.jsx`, y la página estática `Normas.jsx` (`/normas` — reglas de la comunidad, descargo y fuentes USAC; usa `DISCLAIMER` de `onboarding/normativo.js` y `Seo`). Los headers del Foro y de Grupos enlazan a `/normas` ("Reglas"), y el footer de la Home enlaza Privacidad / Normas / Descargo (`/normas#descargo`) + atribución de datos al portal de la FIUSAC.
- **React components:** `src/components/Navbar.jsx`, planner components `Planner.jsx`, `CoursePool.jsx`, `SemesterBlock.jsx`, `VacationBlock.jsx`, `CourseChip.jsx`, `ToastNotification.jsx`, `ExportModal.jsx`, `DocenteReviews.jsx` (`SeccionReviews`), shared UI primitives in `components/ui/`, `ScheduleBuilder.jsx` (~2000 lines, the schedule view), and onboarding components in `components/onboarding/`.
- **Custom hooks:** `src/hooks/useToast.js` (toast notification state), `components/onboarding/useCloseOnEscape.js` (cierra modales de onboarding con `Escape`).
- **Sistema de onboarding** (`src/context/OnboardingContext.jsx` + `src/onboarding/` + `src/components/onboarding/`): reemplaza al antiguo `WelcomeModal.jsx` (eliminado; su contenido Normativo/Descargo migró a `src/onboarding/normativo.js` y se muestra vía `NormativoView`/`DescargoView`). El provider global renderiza:
  - **Anuncios** (`AnnouncementsModal`, contenido hardcoded en `src/onboarding/announcements.js`): se muestran UNA sola vez en la primera de las 5 pantallas que se abra (nunca en la Home); clave `pemtree_anuncios_visto`.
  - **Tutorial por pantalla** (`TutorialModal` + `TutorialSlides`, asistente con slides; contenido en `src/onboarding/tutorials.js`): una vez por pantalla, clave `pemtree_bienvenida_<pantalla>`.
  - **Centro de ayuda** (`HelpModal`, botón "?" `HelpButton`): tabs Tutorial / Anuncios / Normativo / Descargo; reabre lo ya visto.
  - Cada pantalla se registra con `useScreenWelcome(key)` (`visualizador` | `planificador` | `horarios` | `foro` | `grupos`); en el Visualizer la key se deriva de `activeView` y `openHelp` se pasa como prop a `Planner`/`ScheduleBuilder`. Foro y Grupos se registran a sí mismos.
- Graph rendering uses raw SVG DOM manipulation (not React) inside `GraphManager` and friends. React owns the toolbar/info-card UI; SVG nodes/edges are created imperatively.
- **Planner:** Tab-based view in Visualizer (`activeView: 'graph' | 'planner'`). Planner uses HTML drag-and-drop to let users plan courses by semester and vacation school. Chips replicate the node aesthetic (4-section layout with pensum colors). Validates prerequisites on drop. Persists to localStorage. El 2º pensum (carreras simultáneas) se construye desde el catálogo (`construirCursosDesdeCatalogo` + `carreras[].colores`).
- **ScheduleBuilder** (`activeView: 'schedule'`, component `src/components/ScheduleBuilder.jsx`): usa `cargarHorarios(periodId)` de `modules/data/scraper.js`, que tras la migración lee del catálogo vía `getHorariosPorPeriodo` (ciclo más reciente con datos por periodo). Cuando el ciclo vigente no publicó el periodo (portal borró datos), muestra un aviso "Datos del ciclo anterior (<ciclo>)". El módulo `scraper.js` conserva las funciones de validación de traslapes sobre los objetos de horario (con `tipo`/`catedratico`/`auxiliar` ya resueltos).
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
- `pensum_color/` — Per-program color themes (`*_color.json` with `color1`/`color2`/`color3`); fuente del pipeline para derivar `carreras[].colores`. At runtime `applyPensumColors()` (en `modules/data/cursos.js`) lee esos colores del catálogo y setea CSS custom properties `--primary`, `--accent`, `--border` y la paleta dark en `:root`.
- `images/` — Static assets (logo, guide images, background).

## Supabase — secciones y reseñas
- **`seccion_reviews`** (reseñas estilo Steam por curso y sección, sin comentarios ni nombres vinculados): `id` PK, `curso_codigo` text, `seccion` text, `user_id` FK, `recomienda` bool, timestamps; unique `(curso_codigo, seccion, user_id)` (1 voto por usuario/curso/sección). RLS: lectura pública, insert/update/delete solo del dueño (o admin).
- **`seccion_reputation`** (vista `security_invoker`): `curso_codigo`, `seccion`, `total`, `recomendados`, `pct_recomienda` agrupado por `(curso_codigo, seccion)`.

## Supabase — comunidad y foro
- **`posts`/`comments`/`post_likes`** — foro (posts, comentarios anidados por `parent_id`, likes por `(post_id, user_id)`). **`whatsapp_groups`/`whatsapp_group_upvotes`/`whatsapp_group_reports`** — grupos de WhatsApp. **`user_reports`** — reportes (moderación). **`user_roles`** — `role` del usuario (p. ej. `moderator`). **`notification_preferences`/`user_notifications`/`notification_subscriptions`** — notificaciones in-app + Web Push (ver `src/context/NotificationsContext.jsx`, `src/lib/push.js`).
- **RLS por rol (anon vs authenticated):** las políticas SELECT de `posts`/`comments`/`whatsapp_groups` están separadas por rol. `anon` solo ve contenido no moderado (`moderation_status IS DISTINCT FROM 2`); `authenticated` ve contenido no moderado más el bloqueado por moderadores/admin, pero **NO su propio contenido bloqueado** (oculto también para el autor). Los DELETE de posts/comments son solo `authenticated`.
- **Políticas con `(select auth.uid())`:** todas las políticas usan el patrón initplan para evitar re-evaluar `auth.uid()` por fila.
- **SECURITY DEFINER restringidas:** `is_pemtree_admin`, `is_pemtree_moderator` y las RPCs de moderación (`ocultar/restaurar/eliminar_contenido_moderado`) NO son ejecutables por `anon`; solo `authenticated` (validan permisos internamente) y `service_role`. `restaurar_contenido_moderado` es SOLO admin/moderador: el autor que oculta su contenido ya no puede desocultarlo (además un trigger `prevent_nonmoderator_restore` bloquea a nivel de UPDATE el cambio de `moderation_status` a un estado ≠ 2 por un no-moderador).
- **`get_push_secrets()`** (RPC, solo `service_role`): la edge function `send-push` lee sus secretos del Vault vía esta RPC en lugar de tenerlos hardcoded. Secrets en `vault.secrets`: `push_edge_secret`, `vapid_public_key`, `vapid_private_key`, `vapid_subject`.
- **`user_reports`:** `reporter_id` es `uuid` con FK a `auth.users` (CASCADE); `reported_user_id` es `uuid` (sin FK, el reporte debe conservarse aunque el usuario reportado no exista).
- La clasificación de moderación (`moderation_status` 0/1/2/3) se hace en la BD (trigger); `src/lib/moderation.js` solo expone constantes y UI. Alertas por email a moderadores: Formspree vía `src/lib/notification.js`.

## localStorage keys
- `pemtree_progreso_<pensumKey>` — per-pensum course completion state (`[{id, completado, cursando}]`)
- `pemtree_pensum_actual` — currently selected pensum filename
- `pemtree_theme` — `"dark"` or `"light"` (leído por `ThemeContext`)
- `pemtree_anuncios_visto` — global: la ventana de anuncios se mostró (una vez en cualquiera de las 5 pantallas)
- `pemtree_bienvenida_<pantalla>` — tutorial visto de esa pantalla (`visualizador`|`planificador`|`horarios`|`foro`|`grupos`)
- `pemtree_plan` — planner course assignments as `{ [blockId]: [courseId, ...] }` (blockId: `sem-N` or `vac-N`)
- `pemtree_active_view` — last tab (`graph`|`planner`|`schedule`); `pemtree_schedule_period` — active schedule period (`semestre1`…); `pemtree_schedule_segunda_carrera`/`pemtree_schedule_simultanea` — schedule options (ScheduleBuilder)
- `pemtree_forum_alias` — community alias; `pemtree_moderator` — moderator flag (Forum/WhatsAppGroups/MyPosts)

## Known quirks
- `cursos` and `cursoMap` are module-level mutable variables. Modules that import them get the initial reference; re-importing after `initializeCursos()` returns the updated arrays only if the import is re-evaluated. The Visualizer component works around this by calling `updateCursos()` on `GraphManager`.
- Node dimensions in `dimensions.js` are computed at call time from `window.innerWidth` — not reactive to resize.
- Dark mode is centralized in `src/theme/ThemeContext.jsx`: toggles the `dark` class on `<html>` and dispatches a `themeChanged` event (kept for non-React listeners). Use `useTheme()` — don't touch the class/event directly.
- The default pensum at startup is `ciencias_y_sistemas_22.json`.
- `StorageManager.storageKey` is dynamic (depends on current pensum), so course progress is stored **per pensum**.

## Deploy
- Netlify. Config in `pemtree-react/netlify.toml`: build command `pnpm run build`, publish dir `dist`.
- SPA redirect `/* → /index.html` (status 200) is configured in netlify.toml.
- JSON and color files have `no-cache` headers set in netlify.toml.
- Node 20, pnpm 9 specified in build environment.