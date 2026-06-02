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
  - `data/` — `NodoCurso` model, JSON loading (`cursos.js`), import (`importFromJSON.js`). `cursos` and `cursoMap` are mutable module-level exports.
  - `graph/` — `GraphManager`, `LayoutCalculator`, `NodeRenderer`, `EdgeRenderer`, `CriticalPathAnalyzer`, `dimensions.js`
  - `storage/` — `StorageManager` (localStorage persistence, per-pensum keys)
  - `ui/` — `PanZoomManager`, `TooltipManager`
  - `utils/` — `TextUtils`
- **React pages:** `src/pages/Home.jsx` (landing), `src/pages/Visualizer.jsx` (graph viewer + toolbar + planner — ~650 lines, main interactive page)
- **React components:** `src/components/Navbar.jsx`, plus planner components: `Planner.jsx`, `CoursePool.jsx`, `SemesterBlock.jsx`, `VacationBlock.jsx`, `CourseChip.jsx`, `ToastNotification.jsx`
- **Custom hooks:** `src/hooks/useToast.js` (toast notification state)
- Graph rendering uses raw SVG DOM manipulation (not React) inside `GraphManager` and friends. React owns the toolbar/info-card UI; SVG nodes/edges are created imperatively.
- **Planner:** Tab-based view in Visualizer (`activeView: 'graph' | 'planner'`). Planner uses HTML drag-and-drop to let users plan courses by semester and vacation school. Chips replicate the node aesthetic (4-section layout with pensum colors). Validates prerequisites on drop. Persists to localStorage.
- `test_import.mjs` at repo root tests the old vanilla JS import path (`website/modules/...`) — it is **stale and will not work** with the current React app.

## Data files (`public/`)
- `json/` — Pensum JSONs per engineering program. `index.json` lists available pensums as `[{file, name}]`.
- `pensum_color/` — Per-program color themes (`*_color.json` with `color1`/`color2`/`color3`). Loaded at runtime via `applyPensumColors()`, which sets CSS custom properties `--primary`, `--accent`, `--border` and dark-mode palette vars on `:root`.
- `images/` — Static assets (logo, guide images, background).

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