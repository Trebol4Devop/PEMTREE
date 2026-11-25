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
    completado: '#4A7C6A',     // success_base
    disponible: '#3B6988',    // slate_primary
    bloqueado: '#bdc3c7',
    selected: '#e67e22',
    highlighted: '#f39c12',
    critical: '#C45D5D',      // terracotta_error
  },
  dark: {
    fill: '#1a1f2e',
    stroke: '#2c3e50',
    text: '#f1f5f9',          // target: text_primary dark
    completado: '#6BA892',    // success_base dark
    disponible: '#6BA3C8',    // slate_primary dark
    bloqueado: '#9ca3af',
    selected: '#f59e0b',
    highlighted: '#fbbf24',
    critical: '#E88B8B',      // terracotta_error dark
  },
};

export function getBaseColors(isDark) {
  return isDark ? { ...BASE_COLORS.dark } : { ...BASE_COLORS.light };
}

/* ── Node fill colours used by NodeRenderer.determinarColores() ─ */

export const NODE_FILLS = {
  selected:       { light: '#FFFFFF', dark: '#2d3748' },
  completado:     { light: '#E8F1EE', dark: '#1A2B25' },
  disponible:     { light: '#FFFFFF', dark: '#1A2B38' },
  highlighted:    { light: '#e8f6f3', dark: '#1f3c7a' },
  critical:       { light: '#F9E6E6', dark: '#3D1E1E' },
  pathSocialHum:  { light: '#E6EFF5', dark: '#1A2B38' },
  pathIdioma:     { light: '#fef3c7', dark: '#78350f' },
  pathGeneric:    { light: '#fef3c7', dark: '#78350f' },
  default:        { light: '#F4F5F7', dark: '#1f2937' }, // target: surface_secondary
};

export const NODE_STROKES = {
  highlighted:    { light: '#4A7C6A', dark: '#6BA3C8' },
  pathSocialHum:  { light: '#3B6988', dark: '#6BA3C8' },
  pathIdioma:     { light: '#d97706', dark: '#fbbf24' },
  pathGeneric:    { light: '#d97706', dark: '#fbbf24' },
};

export const SECTION_TEXT = {
  light: '#172B4D',   // target: text_primary
  dark: '#f1f5f9',    // target: text_primary dark
};

export const PRIMARY_SECTION_TEXT = '#ffffff';

export const CODE_COMPLETED = {
  light: '#ffffff',
  dark: '#ffffff',
};

/* ── Edge / arrow colours used by EdgeRenderer ───────────────── */

export const EDGE_COLORS = {
  light: {
    default: '#bdc3c7',
    selected: '#f39c12',
    active: '#172B4D',       // target: text_primary
    critical: '#C45D5D',     // terracotta_error
    suggested: '#d97706',
    opacity: '0.4',
  },
  dark: {
    default: '#7f8c8d',
    selected: '#f39c12',
    active: '#6BA3C8',       // slate_primary dark
    critical: '#E88B8B',     // terracotta_error dark
    suggested: '#fbbf24',
    opacity: '0.5',
  },
};

/* ── GraphManager semester label colour ──────────────────────── */

export const SEMESTER_LABEL = {
  light: '#5E6C84',   // target: text_secondary
  dark: '#f1f5f9',    // target: text_primary dark
};

/* ── Advertencia (warning icon) colours ─────────────────────── */

export const WARNING_COLORS = {
  socialHum: '#3B6988',
  idioma: '#d97706',
  critica: '#C45D5D',
};

/* ── Schedule Builder UI tokens (aligned with vacation cards) ── */

export const SCHEDULE_TOKENS = {
  light: {
    dayHeaderBg: '#E6EFF5',
    dayHeaderText: '#3B6988',
    dayHeaderDivider: 'rgba(59, 105, 136, 0.15)',
    slatePrimary: '#3B6988',
    slateSurface: '#E6EFF5',
    blockText: '#1E293B',
    labStripeSoft: 'rgba(30, 41, 59, 0.045)',
    labStripeSolid: 'rgba(255, 255, 255, 0.1)',
  },
  dark: {
    dayHeaderBg: '#1A2B38',
    dayHeaderText: '#6BA3C8',
    dayHeaderDivider: 'rgba(255, 255, 255, 0.12)',
    slatePrimary: '#6BA3C8',
    slateSurface: '#1A2B38',
    blockText: '#1E293B',
    labStripeSoft: 'rgba(30, 41, 59, 0.045)',
    labStripeSolid: 'rgba(255, 255, 255, 0.1)',
  },
};

/* ── Recuento Académico UI tokens ───────────────────────────── */

export const RECUENTO_TOKENS = {
  light: {
    headerBg: '#E6EFF5',
    headerTitle: '#1E3A4C',
    headerSubtitle: '#475569',
    headerIcon: '#3B6988',
    accent: '#3B6988',
    accentHover: '#2C526B',
  },
  dark: {
    headerBg: '#1A2B38',
    headerTitle: '#f1f5f9',
    headerSubtitle: '#cbd5e1',
    headerIcon: '#6BA3C8',
    accent: '#6BA3C8',
    accentHover: '#5690B6',
  },
};

/* ── Global Checkbox tokens (borderless) ────────────────────── */

export const CHECKBOX_TOKENS = {
  light: {
    uncheckedBg: '#DFE1E6',
    checkedBg: '#3B6988',
    checkMark: '#FFFFFF',
  },
  dark: {
    uncheckedBg: '#2D333B',
    checkedBg: '#6BA3C8',
    checkMark: '#0E1624',
  },
};
