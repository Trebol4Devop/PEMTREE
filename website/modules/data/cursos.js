// modules/data/cursos.js - Definición de datos y modelo

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
        this.x = 0;
        this.y = 0;
        this.selected = false;
        this.nivel = 0;
        this.semestreMasTemprano = 1;
        this.esCritico = false;
        this.highlighted = false;
        this.enRutaCritica = false;
        this.completado = false;
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



// Importador que convierte JSON en instancias de NodoCurso (evita ejecución en carga por la circularidad)
import { importarCursosDesdeJSON } from './importFromJSON.js';

// Exportar cursos como variable mutable para que otros módulos puedan leer la referencia
export let cursos = [];

// Mapa de cursos (se actualiza en initializeCursos)
export const cursoMap = new Map();

// Archivos JSON a intentar cargar desde la carpeta modules/json
/* const JSON_FILES = [
    '../json/Ciencias_y_Sistemas.json',
    '../json/electronica.json',
    '../json/civil.json',
    '../json/electrica.json',
    '../json/industrial.json',
    '../json/mecanica_electrica.json',
    '../json/mecanica_industrial.json',
    '../json/mecanica.json',
    '../json/quimica.json'
];
 */

const JSON_FILES = [];

/**
 * Inicializa `cursos` cargando archivos JSON desde `modules/json`.
 * Si la carga falla, usa `DEFAULT_CURSOS` como fallback.
 */
export async function initializeCursos() {
    try {
        const allJson = [];

        for (const relPath of JSON_FILES) {
            try {
                const url = new URL(relPath, import.meta.url).href;
                const res = await fetch(url);
                if (!res.ok) {
                    console.warn(`No se pudo cargar ${relPath}: ${res.status}`);
                    continue;
                }
                const json = await res.json();
                if (Array.isArray(json)) {
                    allJson.push(...json);
                }
            } catch (innerErr) {
                console.warn(`Error cargando ${relPath}:`, innerErr);
            }
        }

        if (allJson.length > 0) {
            // Convertir y asignar
            const imported = importarCursosDesdeJSON(allJson);
            cursos = imported;
        } else {
            // Si no hay JSON cargado, dejar el fallback
            cursos = DEFAULT_CURSOS.slice();
            console.warn('No se cargaron JSONs; usando datos por defecto.');
        }

        // Reconstruir el mapa
        cursoMap.clear();
        cursos.forEach(curso => cursoMap.set(curso.id, curso));

        console.log(`✅ Cursos inicializados (${cursos.length} cursos)`);
        return cursos;
    } catch (error) {
        console.error('Error inicializando cursos:', error);
        // Fallback
        cursos = DEFAULT_CURSOS.slice();
        cursoMap.clear();
        cursos.forEach(curso => cursoMap.set(curso.id, curso));
        return cursos;
    }
}


// Inicializar `cursos` y `cursoMap` con los valores por defecto para mantener compatibilidad
cursos = DEFAULT_CURSOS.slice();
cursoMap.clear();
cursos.forEach(curso => cursoMap.set(curso.id, curso));

/**
 * Devuelve la lista de pensums disponibles (basada en JSON_FILES)
 * @returns {Array<{file: string, id: string, name: string}>}
 */
export function listAvailablePensums() {
    const pensums = JSON_FILES.map(p => {
        const fileName = p.split('/').pop();
        const id = fileName.replace('.json', '');
        const name = id.replace(/_/g, ' ');
        return { file: p, id, name };
    });
    
    console.log('📋 Pensums disponibles:', pensums.length);
    pensums.forEach(p => {
        console.log(`  - ${p.id}: ${p.name} (${p.file})`);
    });
    
    return pensums;
}

/**
 * Carga un pensum (archivo JSON) individual por su ruta relativa (tal como está en JSON_FILES)
 * Actualiza `cursos` y `cursoMap`.
 * @param {string} relPath
 * @returns {Promise<Array>} cursos
 */
export async function loadPensum(relPath) {
    try {
        const url = new URL(relPath, import.meta.url).href;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error('Formato de JSON inválido');

        const imported = importarCursosDesdeJSON(json);
        cursos = imported;

        // Reconstruir mapa
        cursoMap.clear();
        cursos.forEach(curso => cursoMap.set(curso.id, curso));

        console.log(`✅ Pensum cargado: ${relPath} (${cursos.length} cursos)`);
        return cursos;
    } catch (error) {
        console.error('Error cargando pensum:', error);
        throw error;
    }
} 