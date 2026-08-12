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

/**
 * Aplana los prerequisitos normalizados del catálogo (schema v4) a códigos simples:
 *   "0732"            -> ["0732"]
 *   {alternativa:[A,B]} -> [A, B]  (grupos OR: se aplanan a prereqs individuales)
 *   {creditos:150}    -> omitido (el grafo no soporta requisitos de créditos)
 */
function aplanarPreRequisitos(pre) {
    const out = [];
    for (const r of pre || []) {
        if (typeof r === 'string' && r) { out.push(r); continue; }
        if (r && Array.isArray(r.alternativa)) {
            for (const alt of r.alternativa) if (alt && !out.includes(alt)) out.push(alt);
            continue;
        }
        // {creditos:N} se ignora
    }
    return out;
}

/**
 * Construye NodoCurso[] desde el catálogo unificado (schema v4) para un pensum dado.
 * Es la fuente del grafo/planificador tras la migración: sustituye la carga directa
 * del archivo de pensum.
 *
 * - Filtra catalogo.cursos cuyo `pensums[].file === pensumFile`.
 * - `id = pensumInfo.orden + 1` (el pipeline guarda `orden` como índice del archivo
 *   de pensum, por lo que los ids reproducen exactamente los actuales y el progreso
 *   guardado en localStorage no se invalida).
 * - `creditos`/`semestre`/`tipo` vienen del `pensums[]` correspondiente.
 * - Prerequisitos: códigos del catálogo resueltos a ids, con alternativas OR aplanadas.
 *
 * @param {object} catalogo - objeto completo de catalogo.json
 * @param {string} pensumFile - nombre del archivo de pensum (p. ej. 'ciencias_y_sistemas_22.json')
 * @returns {Array<NodoCurso>}
 */
export function construirCursosDesdeCatalogo(catalogo, pensumFile) {
    if (!catalogo || !Array.isArray(catalogo.cursos)) return [];

    const enPensum = catalogo.cursos.filter(c =>
        (c.pensums || []).some(p => p.file === pensumFile)
    );

    const codeToCurso = new Map();
    const cursosConvertidos = [];
    let idCounter = 1;

    // Primera pasada: instanciar NodoCurso con la info del pensum activo
    enPensum.forEach(c => {
        const pensumInfo = (c.pensums || []).find(p => p.file === pensumFile) || {};
        const codigo = c.codigo ? String(c.codigo).trim() : '';
        const id = (typeof pensumInfo.orden === 'number' && pensumInfo.orden >= 0)
            ? pensumInfo.orden + 1
            : idCounter++;
        const curso = new NodoCurso(
            id,
            codigo,
            String(c.nombre || '').trim(),
            Number(pensumInfo.creditos) || 0,
            String(pensumInfo.tipo || '').toLowerCase() === 'obligatorio',
            Number(pensumInfo.semestre) || 0,
            []
        );
        curso._preReqCodes = aplanarPreRequisitos(pensumInfo.preRequisitos);
        cursosConvertidos.push(curso);
        if (codigo) codeToCurso.set(codigo, curso);
    });

    // Segunda pasada: resolver códigos de prerequisito -> ids
    cursosConvertidos.forEach(curso => {
        curso.prerequisitos = (curso._preReqCodes || [])
            .map(code => {
                const pre = codeToCurso.get(String(code).trim());
                return pre ? pre.id : null;
            })
            .filter(id => id !== null);
        delete curso._preReqCodes;
    });

    return cursosConvertidos;
}
