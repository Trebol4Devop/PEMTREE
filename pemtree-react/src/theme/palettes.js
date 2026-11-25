/**
 * Shared course-color palettes.
 * Formerly duplicated in ScheduleBuilder.jsx and ExportModal.jsx.
 */

export const PALETAS = {
  Default: [
    '#E68A49', '#3B6988', '#4A7C6A', '#6B66B8', '#C48F35', '#C45D5D',
    '#2E7D87', '#B86B82', '#7A8B49', '#4F6D9A', '#8D5E8B', '#B56E4C',
    '#3E8A74', '#4B7FA6', '#B8863B', '#7D6E9E', '#3A8580', '#A6586C',
  ],
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
 * Desaturated pastel backgrounds paired with each Default border/sidebar accent.
 */
export const COURSE_SOFT_BACKGROUNDS = {
  '#E68A49': '#FDECE0', // Naranja (Base)
  '#3B6988': '#E6EFF5', // Azul Pizarra
  '#4A7C6A': '#E8F1EE', // Verde Salvia
  '#6B66B8': '#ECEBFA', // Lavanda Apagado
  '#C48F35': '#FAF1DF', // Mostaza Suave
  '#C45D5D': '#F9E6E6', // Terracota / Coral
  '#2E7D87': '#E3F2F4', // Petróleo
  '#B86B82': '#F8E8ED', // Rosa Palo
  '#7A8B49': '#EFF3E4', // Oliva Suave
  '#4F6D9A': '#E8EEF6', // Índigo Pizarra
  '#8D5E8B': '#F3EAF2', // Ciruela Apagado
  '#B56E4C': '#F9ECE6', // Cobre Suave
  '#3E8A74': '#E5F2EE', // Esmeralda Apagado
  '#4B7FA6': '#E6F0F7', // Azul Acero
  '#B8863B': '#F9F0E1', // Ocre Dorado
  '#7D6E9E': '#EEECF5', // Malva Grisáceo
  '#3A8580': '#E4F2F1', // Turquesa Apagado
  '#A6586C': '#F6E7EB', // Granate Suave
};

export const SCHEDULE_BLOCK_TEXT = '#1E293B';

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
 * Returns { border, bg, text, isSoft } for a schedule block.
 * Default palette uses soft pastel backgrounds, 4px left border, and #1E293B text.
 */
export function getCursoBlockColors(codigo, palette) {
  const border = getCursoColor(codigo, palette);
  const softBg = COURSE_SOFT_BACKGROUNDS[border];
  if (softBg) {
    return { border, bg: softBg, text: SCHEDULE_BLOCK_TEXT, isSoft: true };
  }
  return { border, bg: border, text: getTextColor(border), isSoft: false };
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

/**
 * Paleta curada por carrera (filtro en memoria sobre catalogo.json).
 * Permite regenerar catalogo.json sin perder los ajustes visuales por carrera.
 */
export const CAREER_PALETTES = {
  ambiental:           { color1: '#C8726A', color2: '#F7E4E2', color3: '#C8726A' },
  ciencias_y_sistemas: { color1: '#E68A49', color2: '#FCD9BE', color3: '#E68A49' },
  civil:               { color1: '#C94A4A', color2: '#F9DFDF', color3: '#C94A4A' },
  electrica:           { color1: '#2582A6', color2: '#D6ECF4', color3: '#2582A6' },
  electronica:         { color1: '#4A96C4', color2: '#DFEFF8', color3: '#4A96C4' },
  industrial:          { color1: '#6E8A3E', color2: '#E4EDD5', color3: '#6E8A3E' },
  mecanica:            { color1: '#4B8B4B', color2: '#DCEFD9', color3: '#4B8B4B' },
  mecanica_electrica:  { color1: '#4A74A8', color2: '#DCE6F2', color3: '#4A74A8' },
  mecanica_industrial: { color1: '#227C75', color2: '#D3ECEA', color3: '#227C75' },
  quimica:             { color1: '#7A4B9E', color2: '#ECE2F5', color3: '#7A4B9E' },
};

/**
 * Transforma los colores crudos de una carrera provenientes de catalogo.json
 * aplicando la paleta curada del tema sin mutar el archivo fuente.
 */
export function transformarColoresCarrera(carreraId, rawColores = {}) {
  const override = CAREER_PALETTES[carreraId];
  if (!override) return rawColores || {};
  return {
    ...(rawColores || {}),
    ...override,
  };
}

/**
 * Aplica el filtro de paleta de carreras en memoria sobre el objeto catalogo.
 */
export function aplicarFiltroPaletaCarreras(catalogoData) {
  if (!catalogoData || !Array.isArray(catalogoData.carreras)) return catalogoData;
  return {
    ...catalogoData,
    carreras: catalogoData.carreras.map(c => ({
      ...c,
      colores: transformarColoresCarrera(c.id, c.colores),
    })),
  };
}
