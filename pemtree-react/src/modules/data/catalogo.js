// modules/data/catalogo.js - Catálogo unificado (carreras, cursos, docentes) y reputación
//
// Expone el catálogo local (public/json/catalogo.json) y la reputación de docentes
// agregada desde Supabase (vista docente_reputation + voto del usuario actual).
// La reputación se fusiona en memoria con el catálogo; no bloquea si Supabase
// no está configurado.
//
// Modelo v4: además de la apertura por tipoPeriodo, expone secciones/horarios
// (getSeccionesDeCurso), docentes por (ciclo, tipoPeriodo) con reputación
// (getDocentesDeCursoEnPeriodo), y recomendabilidad de cursos (esCursoRecomendable).
// Nota: el catálogo referencia docentes con ids `doc_rol_...`; Supabase usa uuids.
// La reputación se une por (claveNombre|rol) en cargarReputacion().

import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const CATALOGO_URL = '/json/catalogo.json';

let catalogo = null;          // objeto completo del catálogo (o null si aún no carga)
let catalogoPromise = null;   // evita fetchs duplicados mientras carga
let reputacionCache = null;   // Map<"curso_codigo|seccion", { curso_codigo, seccion, total, recomendados, pct_recomienda, miVoto }>
let reputacionPromise = null;
let docenteIndex = null;      // Map<id catálogo `doc_*`, docente> (caché perezoso)

// ---------- Normalización de nombres (misma regla que el pipeline) ----------

export function normalizarNombre(n) {
    if (!n) return '';
    return String(n).replace(/\s+/g, ' ').trim().toUpperCase();
}

export function claveNombre(n) {
    return normalizarNombre(n)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

// ---------- Catálogo ----------

export async function cargarCatalogo(force = false) {
    if (catalogo && !force) return catalogo;
    if (catalogoPromise && !force) return catalogoPromise;
    catalogoPromise = fetch(CATALOGO_URL)
        .then(res => {
            if (!res.ok) throw new Error(`Catálogo no disponible (${res.status})`);
            return res.json();
        })
        .then(data => {
            catalogo = data;
            docenteIndex = null;
            return catalogo;
        })
        .catch(err => {
            catalogoPromise = null;
            throw err;
        });
    return catalogoPromise;
}

export function getCatalogo() {
    return catalogo;
}

/**
 * Información del pensum en el catálogo por nombre de archivo (p. ej. 'ciencias_y_sistemas_22.json').
 * @returns {{id:string, file:string, carrera:string, nombre:string, cohort:string, vigencia:string, clar:boolean}|null}
 */
export function getPensumInfo(file) {
    if (!catalogo || !Array.isArray(catalogo.pensums)) return null;
    const f = String(file || '').split('/').pop();
    if (!f) return null;
    return catalogo.pensums.find(p => p.file === f || p.id === f) || null;
}

/**
 * Carrera del catálogo a la que pertenece un pensum (por nombre de archivo).
 * @returns {{id:string, nombre:string, pensums:string[], colores:object, cursos:string[]}|null}
 */
export function getCarreraDePensum(file) {
    const info = getPensumInfo(file);
    if (!info || !catalogo || !Array.isArray(catalogo.carreras)) return null;
    return catalogo.carreras.find(c => c.id === info.carrera) || null;
}

export function getCursoInfo(codigo) {
    if (!catalogo || !Array.isArray(catalogo.cursos)) return null;
    const c = String(codigo);
    return catalogo.cursos.find(curso => curso.codigo === c) || null;
}

/**
 * Resumen de apertura de un curso.
 * @param {string} codigo
 * @param {string} [tipoPeriodo] 'semestre-impar'|'semestre-par'|'vacaciones-impar'|'vacaciones-par'
 * @returns {object|null} resumen por tipoPeriodo (si se pasa) o el objeto resumen completo
 */
export function getCursoResumen(codigo, tipoPeriodo) {
    const curso = getCursoInfo(codigo);
    if (!curso || !curso.resumen) return null;
    if (tipoPeriodo) return curso.resumen[tipoPeriodo] || null;
    return curso.resumen;
}

/**
 * Apertura agregada por ámbito ('todos' | 'semestre' | 'vacaciones').
 * Útil para recomendaciones del planificador.
 * @returns {{abrio:number, total:number, frecuencia:number, porTipo:object}|null}
 */
export function getCursoApertura(codigo, ambito = 'todos') {
    const resumen = getCursoResumen(codigo);
    if (!resumen) return null;
    const llaves = Object.keys(resumen);
    const filtro = ambito === 'semestre'
        ? llaves.filter(k => k.startsWith('semestre-'))
        : ambito === 'vacaciones'
            ? llaves.filter(k => k.startsWith('vacaciones-'))
            : llaves;
    if (filtro.length === 0) return null;
    const abrio = filtro.reduce((acc, k) => acc + (resumen[k].abrio || 0), 0);
    const total = filtro.reduce((acc, k) => acc + (resumen[k].abrio || 0) + (resumen[k].noAbrio || 0), 0);
    const porTipo = {};
    for (const k of filtro) porTipo[k] = resumen[k];
    return {
        abrio,
        total,
        frecuencia: total > 0 ? Math.round((abrio / total) * 100) / 100 : 0,
        porTipo,
    };
}

// ---------- Docentes ----------

export function getDocente(nombreRaw, rol) {
    if (!catalogo || !Array.isArray(catalogo.docentes)) return null;
    const clave = claveNombre(nombreRaw);
    if (!clave) return null;
    return catalogo.docentes.find(d => {
        if (rol && d.rol !== rol) return false;
        if (claveNombre(d.nombre) === clave) return true;
        return (d.variantes || []).some(v => claveNombre(v) === clave);
    }) || null;
}

export function getDocentesDeCurso(codigo, { rol, activos = true } = {}) {
    if (!catalogo || !Array.isArray(catalogo.docentes)) return [];
    const c = String(codigo);
    return catalogo.docentes.filter(d => {
        if (activos && d.activo === false) return false;
        if (rol && d.rol !== rol) return false;
        return (d.cursos || []).some(curso => curso.codigo === c);
    });
}

// ---------- Reputación de Secciones (Supabase) ----------

export function claveSeccion(cursoCodigo, seccion) {
    const c = String(cursoCodigo || '').trim();
    const s = String(seccion || '').trim().toUpperCase();
    return `${c}|${s}`;
}

export async function cargarReputacion(force = false) {
    if (reputacionCache && !force) return reputacionCache;
    if (reputacionPromise && !force) return reputacionPromise;
    if (!isSupabaseConfigured || !supabase) {
        reputacionCache = new Map();
        return reputacionCache;
    }
    reputacionPromise = (async () => {
        const map = new Map();
        try {
            const { data, error } = await supabase
                .from('seccion_reputation')
                .select('curso_codigo, seccion, total, recomendados, pct_recomienda');
            if (error) throw error;
            for (const fila of data || []) {
                const key = claveSeccion(fila.curso_codigo, fila.seccion);
                map.set(key, {
                    curso_codigo: String(fila.curso_codigo).trim(),
                    seccion: String(fila.seccion).trim().toUpperCase(),
                    total: fila.total,
                    recomendados: fila.recomendados,
                    pct_recomienda: fila.pct_recomienda,
                    miVoto: null,
                });
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: misVotos, error: errVotos } = await supabase
                    .from('seccion_reviews')
                    .select('curso_codigo, seccion, recomienda')
                    .eq('user_id', user.id);
                if (!errVotos) {
                    for (const voto of misVotos || []) {
                        const key = claveSeccion(voto.curso_codigo, voto.seccion);
                        const rec = map.get(key) || {
                            curso_codigo: String(voto.curso_codigo).trim(),
                            seccion: String(voto.seccion).trim().toUpperCase(),
                            total: 0,
                            recomendados: 0,
                            pct_recomienda: null,
                            miVoto: null,
                        };
                        rec.miVoto = voto.recomienda;
                        map.set(key, rec);
                    }
                }
            }
        } catch (err) {
            console.warn('No se pudo cargar la reputación de secciones:', err.message);
        }
        reputacionCache = map;
        return map;
    })();
    return reputacionPromise;
}

export function getReputacionSeccion(cursoCodigo, seccion) {
    if (!reputacionCache || !cursoCodigo || !seccion) return null;
    return reputacionCache.get(claveSeccion(cursoCodigo, seccion)) || null;
}

/**
 * Clasifica la reputación según el % de recomendación.
 * @returns {'buena'|'regular'|'mala'|null} null si no hay votos o no hay dato
 */
export function nivelReputacion(reputacion) {
    if (!reputacion || !reputacion.total || reputacion.total === 0) return null;
    const pct = reputacion.pct_recomienda;
    if (pct == null) return null;
    if (pct >= 70) return 'buena';
    if (pct >= 50) return 'regular';
    return 'mala';
}

/**
 * Registra/actualiza el voto del usuario actual sobre una sección de curso (1 voto por usuario/curso/sección).
 * @returns {{data:object|null, error:object|null}}
 */
export async function recomendarSeccion(cursoCodigo, seccion, recomienda) {
    if (!isSupabaseConfigured || !supabase) {
        return { data: null, error: { message: 'Supabase no está configurado' } };
    }
    if (!cursoCodigo || !seccion) {
        return { data: null, error: { message: 'Curso o sección no válidos' } };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: { message: 'Necesitas iniciar sesión para opinar' } };
    }
    const c = String(cursoCodigo).trim();
    const s = String(seccion).trim().toUpperCase();
    const { data, error } = await supabase
        .from('seccion_reviews')
        .upsert(
            { curso_codigo: c, seccion: s, user_id: user.id, recomienda: !!recomienda },
            { onConflict: 'curso_codigo,seccion,user_id' }
        );
    if (!error) {
        reputacionCache = null;
        reputacionPromise = null;
    }
    return { data, error };
}

// Compatibilidad / Aliases
export function getReputacionDocente() { return null; }
export function reputacionPorNombre() { return null; }
export function recomendarDocente() { return { data: null, error: { message: 'Las recomendaciones ahora son por sección' } }; }
export function docentesDeCursoConReputacion(codigo, { rol, activos = true } = {}) {
    return getDocentesDeCurso(codigo, { rol, activos });
}

// ---------- Modelo v4: secciones, docentes por periodo y recomendaciones ----------

export function getDocentePorId(docenteId) {
    if (!catalogo || !Array.isArray(catalogo.docentes)) return null;
    if (!docenteIndex) docenteIndex = new Map(catalogo.docentes.map(d => [d.id, d]));
    return docenteIndex.get(docenteId) || null;
}

/**
 * Secciones (horarios) de un curso desde el catálogo, opcionalmente filtradas por
 * (ciclo, tipoPeriodo). Cada sección trae `restricciones`, `periodo_restriccion`,
 * `anio` y referencias a docentes (catedraticoId/auxiliarId). Las de ciclos
 * anteriores quedan etiquetadas con su `ciclo` para distinguir vigente vs. histórico.
 */
export function getSeccionesDeCurso(codigo, { ciclo, tipoPeriodo } = {}) {
    const curso = getCursoInfo(codigo);
    if (!curso || !Array.isArray(curso.secciones)) return [];
    return curso.secciones.filter(s =>
        (!ciclo || s.ciclo === ciclo) &&
        (!tipoPeriodo || s.tipoPeriodo === tipoPeriodo)
    );
}

/**
 * Docentes que imparten un curso, opcionalmente restringidos al (ciclo, tipoPeriodo)
 * que realmente impartieron (usa docentes[].cursos[].secciones del catálogo).
 * Añade la reputación de cada docente. Sin filtros equivale a getDocentesDeCurso.
 */
export function getDocentesDeCursoEnPeriodo(codigo, { ciclo, tipoPeriodo, rol, activos = true } = {}) {
    const base = getDocentesDeCurso(codigo, { rol, activos });
    const matchSeccion = (sec) => {
        if (ciclo && !sec.startsWith(`${ciclo}|`)) return false;
        if (tipoPeriodo && !sec.includes(`|${tipoPeriodo}|`)) return false;
        return true;
    };
    return base
        .filter(d => (!ciclo && !tipoPeriodo) || (d.cursos || []).some(cu =>
            cu.codigo === String(codigo) && (cu.secciones || []).some(matchSeccion)
        ))
        .map(d => ({ ...d, reputacion: getReputacionDocente(d) }));
}

/**
 * ¿Vale la pena recomendar el curso? Un curso recomendable debe haberse abierto
 * en algún horario capturado (vistoEnHorarios del schema v4); los sembrados solo
 * desde pensum sin historial no se recomiendan.
 */
export function esCursoRecomendable(codigo) {
    const curso = getCursoInfo(codigo);
    return !!curso && curso.vistoEnHorarios === true;
}

// ---------- Horarios por periodo (migración Fase 2) ----------

const PERIODO_A_TIPO_PERIODO = {
    semestre1: 'semestre-impar',
    semestre2: 'semestre-par',
    vacaciones1: 'vacaciones-impar',
    vacaciones2: 'vacaciones-par',
};

function ordenCiclo(a, b) {
    return String(a).replace('ciclo-', '').localeCompare(String(b).replace('ciclo-', ''), undefined, { numeric: true });
}

/**
 * Elige el ciclo más reciente que capturó un tipoPeriodo. Si el ciclo vigente
 * no lo capturó (p. ej. el portal borró el periodo), cae al ciclo anterior con
 * `datoAnterior: true` para conservar la última info acumulada.
 */
function cicloConDatos(catalogo, tipoPeriodo) {
    const ciclos = (catalogo.ciclosAcademicos || []).slice().sort((a, b) => ordenCiclo(a.id, b.id));
    const vigente = ciclos[ciclos.length - 1] || null;
    for (let i = ciclos.length - 1; i >= 0; i--) {
        const c = ciclos[i];
        if ((c.periodosCapturados || []).includes(tipoPeriodo)) {
            return {
                cicloId: c.id,
                lastRun: c.lastRun || null,
                vigenteId: vigente ? vigente.id : null,
                datoAnterior: vigente ? c.id !== vigente.id : false,
            };
        }
    }
    return null;
}

/**
 * Ciclo más reciente con datos capturados para un tipoPeriodo (público).
 * @returns {{cicloId:string, datoAnterior:boolean, vigenteId:string}|null}
 */
export function getCicloConDatos(tipoPeriodo) {
    if (!catalogo) return null;
    return cicloConDatos(catalogo, tipoPeriodo);
}

/**
 * Horarios de un periodo desde el catálogo (migración Fase 2): agrega las
 * secciones de todos los cursos para el (ciclo, tipoPeriodo) elegido y las
 * devuelve con el esquema que consume scraper.js/ScheduleBuilder (campo `tipo`
 * = tipoSeccion, `catedratico`/`auxiliar` resueltos por id a nombre).
 * Cada objeto lleva `ciclo` y `datoAnterior` para etiquetar procedencia.
 * @param {string} periodId 'semestre1'|'semestre2'|'vacaciones1'|'vacaciones2'
 * @param {{ciclo?:string}} [opts] forzar un ciclo específico
 * @returns {Promise<Array>}
 */
export async function getHorariosPorPeriodo(periodId, { ciclo } = {}) {
    const catalogo = await cargarCatalogo();
    if (!catalogo || !Array.isArray(catalogo.cursos)) return [];
    const tp = PERIODO_A_TIPO_PERIODO[periodId];
    if (!tp) return [];

    let objetivo;
    if (ciclo) {
        objetivo = { cicloId: ciclo, datoAnterior: false };
    } else {
        objetivo = cicloConDatos(catalogo, tp);
    }
    if (!objetivo) return [];

    const out = [];
    for (const curso of catalogo.cursos) {
        const codigo = String(curso.codigo);
        for (const s of curso.secciones || []) {
            if (s.tipoPeriodo !== tp || s.ciclo !== objetivo.cicloId) continue;
            out.push({
                codigo,
                nombre: curso.nombre || '',
                seccion: s.seccion || '',
                modalidad: s.modalidad || '',
                tipo: s.tipoSeccion || 'MAGISTRAL',
                edificio: s.edificio || '',
                salon: s.salon || '',
                inicio: s.inicio || '',
                final: s.final || '',
                dias: Array.isArray(s.dias) ? [...s.dias] : [],
                catedratico: (getDocentePorId(s.catedraticoId) || {}).nombre || '',
                auxiliar: (getDocentePorId(s.auxiliarId) || {}).nombre || '',
                restricciones: s.restricciones ?? false,
                periodo_restriccion: s.periodo_restriccion || null,
                ciclo: s.ciclo,
                datoAnterior: objetivo.datoAnterior,
            });
        }
    }
    out.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
    return out;
}

/**
 * Última actualización (lastRun del ciclo) de un periodo, o null si nunca se capturó.
 * Reemplaza la lectura de horarios/index.json.
 */
export async function getUltimaActualizacionHorarios(periodId) {
    const catalogo = await cargarCatalogo();
    if (!catalogo) return null;
    const tp = PERIODO_A_TIPO_PERIODO[periodId];
    if (!tp) return null;
    const info = cicloConDatos(catalogo, tp);
    return info ? info.lastRun : null;
}
