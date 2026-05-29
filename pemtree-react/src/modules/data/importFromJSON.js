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

    // Helper: convierte nombre de semestre español a número (UNDÉCIMO=11, DUODÉCIMO=12, etc.)
    const parseSemester = (raw) => {
        if (raw === null || raw === undefined) return 0;
        const cleaned = String(raw).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        const num = Number(cleaned);
        if (!isNaN(num)) return num;
        const ordinals = {
            'PRIMERO': 1, 'SEGUNDO': 2, 'TERCERO': 3, 'CUARTO': 4, 'QUINTO': 5,
            'SEXTO': 6, 'SÉPTIMO': 7, 'OCTAVO': 8, 'NOVENO': 9, 'DÉCIMO': 10,
            'UNDÉCIMO': 11, 'DUODÉCIMO': 12
        };
        // Buscar por orden de largo descendente para evitar que DÉCIMO matchee dentro de UNDÉCIMO
        const sorted = Object.entries(ordinals).sort((a,b) => b[0].length - a[0].length);
        for (const [word, value] of sorted) {
            if (cleaned.includes(word)) return value;
        }
        return 0;
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
        const semestre = parseSemester(item.semestre);
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
