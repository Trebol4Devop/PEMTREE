# AGENTS.md — PEMTREE2

## Quick facts
- **Zero dependencies, zero build step.** Pure vanilla JS ES modules. No `package.json`, no npm, no bundler.
- **Entry point:** `website/index.html` imports only `website/main.js` (a `<script type="module">`).
- **Dead code:** `website/script.js` is an older entry point — it is **not imported anywhere**. Ignore it.
- **Redundant file:** `website/modules/graph/styles.css` is an identical copy of `website/styles.css`. Only the top-level one is used.

## Running locally
- **Netlify dev server:** `netlify dev` (serves `website/`, port 8888 by default).
- **Any static server works:** `python3 -m http.server 8000 --directory website`, `npx serve website`, etc.
- **Node test script:** `node test_import.mjs` — tests the JSON-to-course import logic directly in Node.

## Architecture
- All app logic lives under `website/modules/` with these packages:
  - `data/` — `NodoCurso` model, JSON loading (`cursos.js`), and conversion (`importFromJSON.js`).
  - `graph/` — graph layout, rendering (SVG nodes + bezier edges), critical-path analysis.
  - `ui/` — pan/zoom, info cards, tooltips, theme, search, and pensum selector.
  - `storage/` — `localStorage` persistence for course completion progress.
  - `events/` — wires toolbar buttons to graph and UI actions.
  - `utils/` — text normalization and word-wrapping helpers.
- `website/main.js` (`class PemtreeApp`) orchestrates initialization: load data → instantiate managers → wire events → draw graph.
- All JS import paths are **relative to `website/`** (e.g., `./modules/data/cursos.js`).

## Data files
- **Pensum JSONs:** `website/modules/json/*.json` — course data per engineering program. `index.json` is an array of `{file, name}` objects listing available pensums with their human-readable names.
- **Color theme JSONs:** `website/modules/pensum_color/*_color.json` — per-program colors (primary, secondary, accent). On load, `applyPensumColors()` sets CSS custom properties `--primary`, `--accent`, `--border` on `:root`, which drive toolbar, navbar, and UI accent colors.
- Default pensum loaded at startup: `ciencias_y_sistemas_22.json`. Falls back to hardcoded `DEFAULT_CURSOS` in `cursos.js`.
- Default view mode is `semester` (not topological). Graph viewer opens in fullscreen immediately on page load.

## localStorage keys
- `pemtree_progreso` — array of `{id, completado}` for course completion state.
- `pemtree_tema` — dark/light theme preference.

## Known quirks
- `EdgeRenderer.dibujarArista()` hardcodes node dimensions (140×90 desktop) that differ from the 60%-reduced dimensions used by `NodeRenderer` and `LayoutCalculator`. Edge endpoints may be slightly misaligned.
- The app has **no typecheck, no linter, no tests** (beyond the one-off `test_import.mjs`). Make changes conservatively.
- Netlify config (`website/netlify.toml`) uses an SPA redirect (`/* → /index.html`, status 200). The publish directory is `website/`.

## Deploy
- `netlify deploy --prod` from the repo root or `website/` directory. The `netlify.toml` in `website/` handles config.
