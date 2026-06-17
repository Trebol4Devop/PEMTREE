/**
 * Shared course-color palettes.
 * Formerly duplicated in ScheduleBuilder.jsx and ExportModal.jsx.
 */

export const PALETAS = {
  Default: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777',
    '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#be123c', '#0d9488',
    '#b45309', '#9333ea', '#0284c7', '#16a34a', '#e11d48', '#ca8a04'],
  Pastel:  ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4',
    '#67e8f9', '#bef264', '#fdba74', '#a5b4fc', '#fda4af', '#5eead4',
    '#d6b5e0', '#d8b4fe', '#7dd3fc', '#a3e635', '#fb7185', '#fbbf24'],
  Oscuro:  ['#1e3a5f', '#064e3b', '#78350f', '#7f1d1d', '#3b0764', '#701a75',
    '#164e63', '#365314', '#431407', '#1e1b4b', '#4a1d2a', '#134e4a',
    '#2d1a0a', '#4c1d95', '#0c4a6e', '#14532d', '#881337', '#713f12'],
  Neon:    ['#00ffcc', '#39ff14', '#ff6600', '#ff0033', '#b300ff', '#ff00ff',
    '#00ccff', '#ccff00', '#ff3300', '#6600ff', '#ff0066', '#00ff99',
    '#ff9900', '#9933ff', '#00aaff', '#33ff33', '#ff0044', '#ffaa00'],
  Calido:  ['#cc3300', '#8b4513', '#daa520', '#cd853f', '#b22222', '#ff6347',
    '#ff8c00', '#9acd32', '#556b2f', '#a0522d', '#d2691e', '#f4a460',
    '#8b0000', '#ff4500', '#b8860b', '#6b8e23', '#c71585', '#ff7f50'],
};

/**
 * Deterministic colour assignment from course code + palette.
 */
export function getCursoColor(codigo, palette) {
  let hash = 0;
  for (let i = 0; i < codigo.length; i++) {
    hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Returns black or white text colour based on background luminance.
 */
export function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff';
}

/**
 * First colour of a palette (used for header accents).
 */
export function getPaletteAccent(paletteName) {
  return (PALETAS[paletteName] || PALETAS.Default)[0];
}
