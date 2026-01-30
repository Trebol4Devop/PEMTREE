// modules/data/importFromJSON.js - Importador de datos desde JSON

import { NodoCurso } from './cursos.js';

/**
 * Función para extraer y convertir cursos desde un JSON externo
 * @param {Array} jsonData - Array de objetos JSON con datos de cursos
 * @returns {Array} Array de instancias de NodoCurso
 */
export function importarCursosDesdeJSON(jsonData) {
    if (!Array.isArray(jsonData)) return [];

    // Helper: normaliza un campo de prerequisitos (string "Ninguno", string "001,002" o array)
    const parsePrereqField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field.map(s => String(s).trim()).filter(s => s && s.toLowerCase() !== 'ninguno');
        if (typeof field === 'string') {
            const str = field.trim();
            if (str === '' || str.toLowerCase() === 'ninguno') return [];
            return str.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [];
    };

    // Crear instancias de NodoCurso en una primera pasada, guardando códigos de prerequisitos temporalmente
    const codeToCurso = new Map();
    const cursosConvertidos = [];
    let idCounter = 1;

    jsonData.forEach(item => {
        const codigo = item.codigo ? String(item.codigo).trim() : '';
        const nombre = item.nombre ? String(item.nombre).trim() : '';
        const creditos = Number(item.creditos) || 0;
        const obligatorio = String(item.tipo || '').toLowerCase() === 'obligatorio';
        const semestre = item.semestre ? Number(item.semestre) || 0 : 0;
        // Use provided id if present, otherwise generate one
        const id = (typeof item.id === 'number' && item.id > 0) ? item.id : idCounter++;

        const curso = new NodoCurso(id, codigo, nombre, creditos, obligatorio, semestre, []);

        // Guardar códigos de prerequisitos temporalmente para resolver en la siguiente pasada
        curso._preReqCodes = parsePrereqField(item.pre_requisitos);

        cursosConvertidos.push(curso);
        if (codigo) codeToCurso.set(codigo, curso);
    });

    // Segunda pasada: resolver prerequisitos (códigos -> ids)
    cursosConvertidos.forEach(curso => {
        const prereqIds = (curso._preReqCodes || []).map(code => {
            if (!code) return null;
            const normalized = String(code).trim();
            // Buscar por código exacto
            let pre = codeToCurso.get(normalized);
            // Si no se encuentra por código, intentar buscar por nombre (caso poco frecuente)
            if (!pre) {
                pre = cursosConvertidos.find(c => c.nombre === normalized);
            }
            return pre ? pre.id : null;
        }).filter(id => id !== null);

        curso.prerequisitos = prereqIds;
        delete curso._preReqCodes;
    });

    return cursosConvertidos;
}

// Función para combinar con cursos existentes
export function combinarConCursosExistentes(jsonData, cursosExistentes) {
    const cursosImportados = importarCursosDesdeJSON(jsonData);
    
    // Crear mapa de cursos existentes por código
    const mapaExistente = new Map();
    cursosExistentes.forEach(curso => {
        mapaExistente.set(curso.codigo, curso);
    });

    // Filtrar cursos que no existen ya
    const nuevosCursos = cursosImportados.filter(cursoImportado => {
        return !mapaExistente.has(cursoImportado.codigo);
    });

    // Combinar ambos arrays
    return [...cursosExistentes, ...nuevosCursos];
}

// Función para reemplazar completamente los cursos existentes
export function reemplazarCursosDesdeJSON(jsonData) {
    return importarCursosDesdeJSON(jsonData);
}

/**
 * Ejemplo de uso:
 * 
 * // Importar el JSON (asumiendo que está en un archivo o viene de una API)
 * import cursosJSON from './cursos.json' assert { type: 'json' };
 * 
 * // Opción 1: Importar y reemplazar todos los cursos
 * const nuevosCursos = reemplazarCursosDesdeJSON(cursosJSON);
 * 
 * // Opción 2: Combinar con cursos existentes
 * import { cursos } from './cursos.js';
 * const cursosCombinados = combinarConCursosExistentes(cursosJSON, cursos);
 * 
 * // Crear nuevo mapa
 * const nuevoCursoMap = new Map();
 * nuevosCursos.forEach(curso => nuevoCursoMap.set(curso.id, curso));
 */