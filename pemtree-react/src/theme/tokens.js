/**
 * Centralized colour tokens for imperative JavaScript (SVG graph, Canvas export).
 *
 * Values sourced from color-map.json — the single source of truth for the theme.
 * NO TOCAR: los colores de public/pensum_color/ no están aquí, son datos externos.
 */

/* ── Base colours used by NodeRenderer.getBaseColors() ────────── */

export const BASE_COLORS = {
  light: {
    fill: 'white',
    stroke: '#ccc',
    text: '#172B4D',          // target: text_primary
    completado: '#059669',     // success_base
    disponible: '#0052CC',    // primary
    bloqueado: '#bdc3c7',
    selected: '#e67e22',
    highlighted: '#f39c12',
    critical: '#e74c3c',      // error_base
  },
  dark: {
    fill: '#1a1f2e',
    stroke: '#2c3e50',
    text: '#f1f5f9',          // target: text_primary dark
    completado: '#10b981',    // success_base dark
    disponible: '#4C9AFF',    // primary dark
    bloqueado: '#9ca3af',
    selected: '#f59e0b',
    highlighted: '#fbbf24',
    critical: '#ef4444',      // error_base dark
  },
};

export function getBaseColors(isDark) {
  return isDark ? { ...BASE_COLORS.dark } : { ...BASE_COLORS.light };
}

/* ── Node fill colours used by NodeRenderer.determinarColores() ─ */

export const NODE_FILLS = {
  selected:       { light: '#FFFFFF', dark: '#2d3748' },
  completado:     { light: '#d4efdf', dark: '#064e3b' },
  disponible:     { light: '#FFFFFF', dark: '#1e3a8a' },
  highlighted:    { light: '#e8f6f3', dark: '#1f3c7a' },
  critical:       { light: '#fdedec', dark: '#7f1d1d' },
  pathSocialHum:  { light: '#dbeafe', dark: '#1e3a5f' },
  pathIdioma:     { light: '#fef3c7', dark: '#78350f' },
  pathGeneric:    { light: '#fef3c7', dark: '#78350f' },
  default:        { light: '#F4F5F7', dark: '#1f2937' }, // target: surface_secondary
};

export const NODE_STROKES = {
  highlighted:    { light: '#14ab85', dark: '#4C9AFF' },  // dark: primary
  pathSocialHum:  { light: '#2563eb', dark: '#4C9AFF' },  // dark: primary
  pathIdioma:     { light: '#d97706', dark: '#fbbf24' },
  pathGeneric:    { light: '#d97706', dark: '#fbbf24' },
};

export const SECTION_TEXT = {
  light: '#172B4D',   // target: text_primary
  dark: '#f1f5f9',    // target: text_primary dark
};

export const CODE_COMPLETED = {
  light: '#059669',   // success_base
  dark: '#10b981',    // success_base dark
};

/* ── Edge / arrow colours used by EdgeRenderer ───────────────── */

export const EDGE_COLORS = {
  light: {
    default: '#bdc3c7',
    selected: '#f39c12',
    active: '#172B4D',       // target: text_primary
    critical: '#e74c3c',     // error_base
    suggested: '#d97706',
    opacity: '0.4',
  },
  dark: {
    default: '#7f8c8d',
    selected: '#f39c12',
    active: '#4C9AFF',       // target: primary dark
    critical: '#ef4444',     // target: error_base dark
    suggested: '#fbbf24',
    opacity: '0.5',
  },
};

/* ── GraphManager semester label colour ──────────────────────── */

export const SEMESTER_LABEL = {
  light: '#5E6C84',   // target: text_secondary
  dark: '#f1f5f9',    // target: text_primary dark
};

/* ── Canvas export (ScheduleBuilder.renderToCanvas) ─────────── */

export const CANVAS_COLORS = {
  light: {
    BG: '#FAFBFC',          // target: page
    SURFACE: '#FFFFFF',     // target: surface
    BORDER: '#DFE1E6',      // target: border_default
    TEXT_MUTED: '#7A869A',  // text_muted
    TIME_BG: '#F4F5F7',    // target: surface_secondary
  },
  dark: {
    BG: '#0E1624',          // target: page dark
    SURFACE: '#1C2636',     // target: surface dark
    BORDER: '#3E4C5E',      // target: border_default dark
    TEXT_MUTED: '#94a3b8',  // text_muted dark
    TIME_BG: '#0E1624',     // target: page dark (was #0f172a → unified)
  },
};

/* ── Advertencia (warning icon) colours ─────────────────────── */

export const WARNING_COLORS = {
  socialHum: '#2563eb',
  idioma: '#d97706',
  critica: '#e74c3c',
};
