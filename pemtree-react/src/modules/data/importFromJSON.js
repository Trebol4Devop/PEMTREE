// modules/data/importFromJSON.js - Construcción de NodoCurso desde el catálogo unificado
//
// Tras la migración a catálogo (schema v4), el grafo/planificador construyen los cursos
// desde `catalogo.json` con `construirCursosDesdeCatalogo`. La antigua `importarCursosDesdeJSON`
// (que leía los archivos de pensum) se eliminó; `test_import.mjs` quedó obsoleto.

import { NodoCurso } from './cursos.js';

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
