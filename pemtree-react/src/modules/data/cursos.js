// modules/data/cursos.js - Definición de datos y modelo
//
// Tras la migración, el modelo se construye desde el catálogo unificado
// (public/json/catalogo.json) en lugar de fetchear los archivos de pensum.
// Se conserva la API pública (cursos, cursoMap, initializeCursos, loadPensum,
// listAvailablePensums, getPensumKey, applyPensumColors, STARTUP_LOADED_PENSUM)
// para que GraphManager, Planner, StorageManager y NodeRenderer sigan igual.

import { construirCursosDesdeCatalogo } from './importFromJSON.js';
import { cargarCatalogo, getCatalogo } from './catalogo.js';

const SOCIAL_HUM_CODES = ['0017', '0019', '0001', '0010', '0018'];
const IDIOMA_TECNICO_CODES = ['0006', '0008', '0009', '0011'];

export class NodoCurso {
    constructor(id, codigo, nombre, creditos, obligatorio, semestre, prerequisitos = []) {
        this.id = id;
        this.codigo = codigo;
        this.nombre = nombre;
        this.creditos = creditos;
        this.obligatorio = obligatorio;
        this.semestre = semestre;
        this.prerequisitos = prerequisitos;
        this.posrequisitos = [];
        this.esSocialHum = SOCIAL_HUM_CODES.includes(codigo);
        this.esIdiomaTecnico = IDIOMA_TECNICO_CODES.includes(codigo);
        this.x = 0;
        this.y = 0;
        this.selected = false;
        this.nivel = 0;
        this.semestreMasTemprano = 1;
        this.esCritico = false;
        this.highlighted = false;
        this.enRutaCritica = false;
        this.enRuta = false;
        this.completado = false;
        this.cursando = false;
        this.disponible = false;
    }
}

const DEFAULT_CURSOS = [
    new NodoCurso(1, "0005", "Técnicas de Estudio e Investigación", 3, true, 1, []),
    new NodoCurso(2, "0017", "Área Social Humanística 1", 3, true, 1, []),
    new NodoCurso(3, "0101", "Área Matemática Básica 1", 9, true, 1, []),
    new NodoCurso(4, "0006", "Idioma Técnico 1", 3, false, 1, []),
    new NodoCurso(5, "0039", "Deportes 1", 2, false, 1, []),
    new NodoCurso(6, "0019", "Área Social Humanística 2", 3, true, 2, [2]),
    new NodoCurso(7, "0103", "Área Matemática Básica 2", 9, true, 2, [3]),
    new NodoCurso(8, "0147", "Física Básica", 5, true, 2, [3]),
    new NodoCurso(9, "0960", "Matemática para Computación 1", 5, true, 2, [3]),
    new NodoCurso(11, "0008", "Idioma Técnico 2", 3, false, 2, [4]),
    new NodoCurso(12, "0040", "Deportes 2", 2, false, 2, [5]),
    new NodoCurso(13, "0107", "Área Matemática Intermedia 1", 9, true, 3, [7]),
    new NodoCurso(14, "0150", "Física", 5, true, 3, [7,8]),
    new NodoCurso(15, "0770", "Introducción a la Programación y Computación 1", 6, true, 3, [7, 8, 9]),
    new NodoCurso(16, "0795", "Lógica de Sistemas", 3, true, 3, [7, 8, 9]),
    new NodoCurso(17, "0962", "Matemática para Computación 2", 5, true, 3, [7, 8, 9]),
    new NodoCurso(18, "0001", "Ética Profesional", 2, false, 3, [6]),
    new NodoCurso(19, "0009", "Idioma Técnico 3", 3, false, 3, [11]),
    new NodoCurso(20, "0112", "Área Matemática Intermedia 2", 6, true, 4, [13]),
    new NodoCurso(21, "0114", "Área Matemática Intermedia 3", 6, true, 4, [13]),
    new NodoCurso(22, "0152", "Física 2", 6, true, 4, [13, 14]),
    new NodoCurso(23, "0771", "Introducción a la Programación y Computación 2", 6, true, 4, [9, 13, 15, 16]),
    new NodoCurso(24, "0796", "Lenguajes Formales y de Programación", 4, true, 4, [9, 15, 16]),
    new NodoCurso(25, "2025", "Prácticas Iniciales", 0, true, 4, [7, 15]),
    new NodoCurso(26, "0010", "Lógica", 1, false, 4, [6]),
    new NodoCurso(27, "0011", "Idioma Técnico 4", 3, false, 4, [19]),
    new NodoCurso(28, "0116", "Matemática Aplicada 3", 5, true, 5, [20, 21]),
    new NodoCurso(29, "0118", "Matemática Aplicada 1", 5, true, 5, [20, 21]),
    new NodoCurso(30, "0732", "Estadística 1", 5, true, 5, [1, 13]),
    new NodoCurso(31, "0772", "Estructuras de Datos", 6, true, 5, [17, 23, 24]),
    new NodoCurso(32, "0777", "Organización de Lenguajes y Compiladores 1", 6, true, 5, [17, 23, 24]),
    new NodoCurso(33, "0964", "Organización Computacional", 4, true, 5, [17, 22, 23]),
    new NodoCurso(34, "0018", "Filosofía de la Ciencia", 1, false, 5, [6]),
    new NodoCurso(35, "0014", "Economía", 3, true, 6, [30]),
    new NodoCurso(36, "0601", "Investigación de Operaciones 1", 6, true, 6, [23, 30]),
    new NodoCurso(37, "0722", "Teoría de Sistemas 1", 4, true, 6, [28, 29, 30, 31]),
    new NodoCurso(38, "0773", "Manejo e Implementación de Archivos", 5, true, 6, [24, 31]),
    new NodoCurso(39, "0778", "Arquitectura de Computadores y Ensambladores 1", 5, true, 6, [24, 33]),
    new NodoCurso(40, "0781", "Organización de Lenguajes y Compiladores 2", 6, true, 6, [31, 32]),
    new NodoCurso(41, "0120", "Matemática Aplicada 2", 5, false, 6, [29]),
    new NodoCurso(42, "0122", "Matemática Aplicada 4", 5, false, 6, [29]),
    new NodoCurso(43, "0200", "Ingeniería Eléctrica 1", 6, false, 6, [21,22]),
    new NodoCurso(44, "0281", "Sistemas Operativos 1", 6, true, 7, [39, 40]),
    new NodoCurso(45, "0603", "Investigación de Operaciones 2", 6, true, 7, [36]),
    new NodoCurso(46, "0724", "Teoría de Sistemas 2", 4, true, 7, [36, 37]),
    new NodoCurso(47, "0774", "Sistemas de Bases de Datos 1", 6, true, 7, [38]),
    new NodoCurso(48, "0779", "Arquitectura de Computadores y Ensambladores 2", 5, true, 7, [39]),
    new NodoCurso(49, "0970", "Redes de Computadoras 1", 5, true, 7, [38, 39]),
    new NodoCurso(50, "2036", "Prácticas Intermedias", 0, true, 7, [25, 32, 38, 39]),
    new NodoCurso(51, "0734", "Estadística 2", 5, false, 7, [30]),
    new NodoCurso(52, "0283", "Análisis y Diseño de Sistemas 1", 6, true, 8, [47]),
    new NodoCurso(53, "0285", "Sistemas Operativos 2", 4, true, 8, [44]),
    new NodoCurso(54, "0775", "Sistemas de Bases de Datos 2", 7, true, 8, [44, 47]),
    new NodoCurso(55, "0797", "Seminario de Sistemas 1", 5, true, 8, [44, 46, 47]),
    new NodoCurso(56, "0975", "Redes de Computadoras 2", 6, true, 8, [49]),
    new NodoCurso(57, "0700", "Ingeniería Económica 1", 4, false, 8, [30]),
    new NodoCurso(58, "0729", "Modelación y Simulación 1", 5, true, 9, [45, 46]),
    new NodoCurso(59, "0785", "Análisis y Diseño de Sistemas 2", 7, true, 9, [52]),
    new NodoCurso(60, "0786", "Sistemas Organizacionales y Gerenciales 1", 5, true, 9, [37, 52]),
    new NodoCurso(61, "0798", "Seminario de Sistemas 2", 5, true, 9, [53, 55]),
    new NodoCurso(62, "0972", "Inteligencia Artificial 1", 7, true, 9, [40, 46, 47]),
    new NodoCurso(63, "2009", "Prácticas Finales Ingeniería Ciencias y Sistemas", 0, false, 9, [50, 52, 53, 56]),
    new NodoCurso(64, "0776", "Bases de Datos Avanzadas", 5, true, 9, [54]),
    new NodoCurso(65, "0788", "Sistemas Aplicados 1", 5, true, 9, [52]),
    new NodoCurso(66, "0966", "Seguridad y Auditoría de Redes de Computadoras", 3, false, 9, [56]),
    new NodoCurso(67, "0720", "Modelación y Simulación 2", 6, true, 10, [58]),
    new NodoCurso(68, "0780", "Software Avanzado", 8, true, 10, [59]),
    new NodoCurso(69, "0787", "Sistemas Organizacionales y Gerenciales 2", 6, true, 10, [60]),
    new NodoCurso(70, "0799", "Seminario de Investigación", 3, true, 10, [59, 60, 61]),
    new NodoCurso(71, "0735", "Auditoría de Proyectos de Software", 6, false, 10, [59]),
    new NodoCurso(72, "0789", "Sistemas Aplicados 2", 5, false, 10, [59,65]),
    new NodoCurso(73, "0790", "Emprendedores de Negocios Informáticos", 6, false, 10, [60]),
    new NodoCurso(74, "0968", "Inteligencia Artificial 2", 5, false, 10, [62]),
    new NodoCurso(75, "0974", "Redes de Nueva Generación", 3, false, 10, [56]),
    new NodoCurso(76, "7999", "Seminario de Investigación E.P.S. Sistemas", 3, false, 10, [59, 60, 61]),
];


// Exportar cursos como variable mutable para que otros módulos puedan leer la referencia
export let cursos = [];

// Mapa de cursos (se actualiza en initializeCursos/loadPensum)
export const cursoMap = new Map();

// Caché compartido de colores del pensum activo (evita re-fetches desde NodeRenderer)
export let currentPensumColors = { primary: '#fc904f', secondary: '#ffd0b6' };

// Nombre del pensum que debe cargarse al iniciar
const DEFAULT_STARTUP_FILENAME = 'ciencias_y_sistemas_22.json';

// Sufijos de versión/cohort en los nombres de archivo de pensum (_22, _25, _ant, _2017...)
const SUFIJOS_PENSUM = /(?:_\d{2,4}|_ant\d*)$/;

// Exporta el pensum cargado al iniciar (para sincronizar la UI)
export let STARTUP_LOADED_PENSUM = '';

// Notifica a cualquier parte de la app (p. ej. ScheduleBuilder) que
// STARTUP_LOADED_PENSUM ya tiene un valor válido, para que quien dependa de
// getPensumKey() pueda re-sincronizarse — sin esto, cualquier componente que
// lea localStorage con una clave basada en getPensumKey() ANTES de que este
// módulo termine de cargar el pensum (fetch async, sin relación con otros
// flujos de carga de la app) usaría la clave incorrecta ('default') y nunca
// se enteraría de que ya está disponible la correcta.
function notifyPensumReady() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pemtree-pensum-ready', { detail: { pensum: STARTUP_LOADED_PENSUM } }));
    }
}

export function getPensumKey() {
    if (!STARTUP_LOADED_PENSUM) return null;
    const fileName = STARTUP_LOADED_PENSUM.split('/').pop();
    return fileName.replace(/\.json$/i, '');
}

/**
 * Inicializa `cursos` construyéndolos desde el catálogo unificado.
 * Si el catálogo no está disponible, usa `DEFAULT_CURSOS` como fallback.
 */
export async function initializeCursos() {
    try {
        const catalogo = await cargarCatalogo();
        let archivo = DEFAULT_STARTUP_FILENAME;
        const existe = (catalogo.pensums || []).some(p => p.file === DEFAULT_STARTUP_FILENAME);
        if (!existe) {
            const primero = catalogo.pensums && catalogo.pensums[0];
            archivo = primero ? primero.file : null;
        }
        if (!archivo) throw new Error('El catálogo no contiene pensums');

        cursos = construirCursosDesdeCatalogo(catalogo, archivo);
        STARTUP_LOADED_PENSUM = `/json/${archivo}`;
        notifyPensumReady();

        try {
            await applyPensumColors(STARTUP_LOADED_PENSUM);
        } catch (e) {
            console.debug('No se aplicaron colores al inicializar:', e);
        }
    } catch (error) {
        console.error('Error inicializando cursos desde el catálogo:', error);
        cursos = DEFAULT_CURSOS.slice();
        console.warn('Usando datos por defecto.');
    }

    cursoMap.clear();
    cursos.forEach(curso => cursoMap.set(curso.id, curso));

    console.log(`Cursos inicializados (${cursos.length} cursos)`);
    return cursos;
}

/**
 * Devuelve la lista de pensums disponibles desde el catálogo.
 * @returns {Promise<Array<{file: string, id: string, name: string}>>}
 */
export async function listAvailablePensums() {
    try {
        const catalogo = await cargarCatalogo();
        if (!catalogo || !Array.isArray(catalogo.pensums)) return [];
        return catalogo.pensums.map(p => ({ file: p.file, id: p.id, name: p.nombre }));
    } catch (err) {
        console.warn('Error listando pensums desde el catálogo:', err.message);
        return [];
    }
}

/**
 * Cambia el pensum activo reconstruyendo `cursos`/`cursoMap` desde el catálogo.
 * @param {string} relPath - ruta del pensum (p. ej. '/json/civil_22.json')
 * @returns {Promise<Array>} cursos
 */
export async function loadPensum(relPath) {
    try {
        const catalogo = await cargarCatalogo();
        const fileName = relPath.split('/').pop();
        const imported = construirCursosDesdeCatalogo(catalogo, fileName);
        if (imported.length === 0) throw new Error(`Pensum no encontrado en el catálogo: ${fileName}`);

        cursos = imported;

        // Reconstruir mapa
        cursoMap.clear();
        cursos.forEach(curso => cursoMap.set(curso.id, curso));

        // Aplicar colores de la carrera desde el catálogo
        try {
            await applyPensumColors(relPath);
        } catch (e) {
            console.debug('No se aplicaron colores para el pensum:', e);
        }

        // Registrar el pensum cargado para la UI
        STARTUP_LOADED_PENSUM = relPath;
        notifyPensumReady();

        console.log(` Pensum cargado: ${relPath} (${cursos.length} cursos)`);
        return cursos;
    } catch (error) {
        console.error('Error cargando pensum:', error);
        throw error;
    }
}

function hexToHSL(hex) {
    let r, g, b;
    const h = hex.replace('#', '');
    if (h.length === 3) {
        r = parseInt(h[0] + h[0], 16) / 255;
        g = parseInt(h[1] + h[1], 16) / 255;
        b = parseInt(h[2] + h[2], 16) / 255;
    } else {
        r = parseInt(h.slice(0, 2), 16) / 255;
        g = parseInt(h.slice(2, 4), 16) / 255;
        b = parseInt(h.slice(4, 6), 16) / 255;
    }
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hDeg = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: hDeg = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
            case g: hDeg = ((b - r) / d + 2) * 60; break;
            case b: hDeg = ((r - g) / d + 4) * 60; break;
        }
    }
    return { h: Math.round(hDeg), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function generateDarkPalette(primaryHex) {
    const hsl = hexToHSL(primaryHex);
    if (!hsl) return {};
    const h = hsl.h;
    const tint = Math.min(hsl.s * 0.28, 18);
    const tintBorder = Math.min(hsl.s * 0.22, 14);
    return {
        '--dark-bg': `hsl(${h}, ${Math.round(tint * 0.55)}%, 7%)`,
        '--dark-surface': `hsl(${h}, ${Math.round(tint * 0.65)}%, 13%)`,
        '--dark-surface2': `hsl(${h}, ${Math.round(tint * 0.7)}%, 20%)`,
        '--dark-border': `hsl(${h}, ${Math.round(tintBorder)}%, 24%)`,
        '--dark-hover': `hsl(${h}, ${Math.round(tint * 0.8)}%, 27%)`,
    };
}

/**
 * Aplica los colores de la carrera del pensum activo desde el catálogo
 * (carreras[].colores), estableciendo CSS custom properties y los colores
 * por curso. No sobrescribe overrides explícitos por curso.
 */
export async function applyPensumColors(relPensumPath) {
    if (!relPensumPath) return;
    try {
        const catalogo = getCatalogo();
        if (!catalogo || !Array.isArray(catalogo.carreras)) return;

        const fileName = relPensumPath.split('/').pop(); // e.g. "ciencias_y_sistemas_22.json"
        const base = fileName.replace(/\.json$/i, '').replace(SUFIJOS_PENSUM, '');
        const carrera = catalogo.carreras.find(cr => cr.id === base);
        const color = (carrera && carrera.colores) || {};
        const primary = color.color1 || null;
        const secondary = color.color2 || primary;
        const accent = color.color3 || primary;

        if (!primary && !secondary) {
            console.debug('Carrera sin colores en el catálogo:', base);
            return false;
        }

        const textForSecondary = pickTextColor(secondary || primary);

        // Aplicar CSS custom properties al :root para que menú y toolbar hereden los colores del pensum
        const root = document.documentElement;
        root.style.setProperty('--primary', primary);
        root.style.setProperty('--accent', accent || primary);
        root.style.setProperty('--border', secondary || primary);

        const darkPalette = generateDarkPalette(primary);
        Object.entries(darkPalette).forEach(([prop, value]) => {
            root.style.setProperty(prop, value);
        });

        // Aplicar a todos los cursos solo si no tienen overrides explícitos
        const nombreCarrera = carrera ? carrera.nombre : '';
        cursos.forEach(c => {
            if (!c.carrera) c.carrera = nombreCarrera;
            c.colors = c.colors || {};
            c.colors.leftTop = c.colors.leftTop || { fill: primary };
            c.colors.right = c.colors.right || { fill: primary };
            c.colors.leftBottom = c.colors.leftBottom || { fill: secondary || primary };
            c.colors.center = c.colors.center || { fill: secondary || primary };
            c.colors.text = c.colors.text || { fill: textForSecondary };
        });

        console.log(`Colores aplicados desde el catálogo para ${base}: primary=${primary}, secondary=${secondary}, text=${textForSecondary}`);
        // Actualizar caché compartido para NodeRenderer
        currentPensumColors = { primary, secondary };
        return true;
    } catch (err) {
        console.debug('Error aplicando colores del pensum:', err);
    }
}

function hexToRgb(hex) {
    if (!hex) return null;
    const h = hex.replace('#','');
    if (h.length === 3) {
        return {
            r: parseInt(h[0]+h[0], 16),
            g: parseInt(h[1]+h[1], 16),
            b: parseInt(h[2]+h[2], 16)
        };
    }
    if (h.length === 6) {
        return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
    }
    return null;
}

function relativeLuminance({r,g,b}) {
    // convertir a sRGB linearizado
    const srgb = [r,g,b].map(v => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function pickTextColor(bgHex) {
    const rgb = hexToRgb(bgHex);
    if (!rgb) return '#333';
    const lum = relativeLuminance(rgb);
    // WCAG contrast approximation: si luminancia baja (oscuro) -> texto blanco
    return lum < 0.5 ? '#ffffff' : '#222222';
}

// Inicializar `cursos` y `cursoMap` con los valores por defecto para mantener
// compatibilidad (estado inicial no vacío mientras carga el catálogo).
cursos = DEFAULT_CURSOS.slice();
cursoMap.clear();
cursos.forEach(curso => cursoMap.set(curso.id, curso));
