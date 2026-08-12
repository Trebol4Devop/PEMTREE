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
let reputacionCache = null;   // Map<docente_id uuid Supabase, { docente_id, total, recomendados, pct_recomienda, miVoto }>
let reputacionPromise = null;
let docenteIdPorClave = null; // Map<`${claveNombre}|${rol}`, uuid Supabase> — une el id `doc_*` del catálogo con el uuid de Supabase
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

// ---------- Reputación (Supabase) ----------

export async function cargarReputacion(force = false) {
    if (reputacionCache && !force) return reputacionCache;
    if (reputacionPromise && !force) return reputacionPromise;
    if (!isSupabaseConfigured || !supabase) {
        reputacionCache = new Map();
        return reputacionCache;
    }
    reputacionPromise = (async () => {
        const map = new Map();
        const idPorClave = new Map();
        try {
            const { data, error } = await supabase
                .from('docente_reputation')
                .select('docente_id, nombre, rol, total, recomendados, pct_recomienda');
            if (error) throw error;
            for (const fila of data || []) {
                map.set(fila.docente_id, {
                    docente_id: fila.docente_id,
                    total: fila.total,
                    recomendados: fila.recomendados,
                    pct_recomienda: fila.pct_recomienda,
                    miVoto: null,
                });
                const clave = `${claveNombre(fila.nombre)}|${fila.rol}`;
                if (!idPorClave.has(clave)) idPorClave.set(clave, fila.docente_id);
            }

            // El catálogo referencia docentes con ids `doc_rol_slug`, pero Supabase
            // usa uuids. Se indexa por (claveNombre|rol) desde la tabla `docentes`
            // (incluye variantes) para poder unir reputación y votos con el catálogo.
            const { data: dbDocentes, error: errDocentes } = await supabase
                .from('docentes')
                .select('id, nombre, rol, nombre_variantes');
            if (errDocentes) throw errDocentes;
            const setClave = (nombre, rol, uuid) => {
                const clave = `${claveNombre(nombre)}|${rol}`;
                if (!idPorClave.has(clave)) idPorClave.set(clave, uuid);
            };
            for (const d of dbDocentes || []) {
                setClave(d.nombre, d.rol, d.id);
                for (const v of d.nombre_variantes || []) setClave(v, d.rol, d.id);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: misVotos, error: errVotos } = await supabase
                    .from('docente_reviews')
                    .select('docente_id, recomienda')
                    .eq('user_id', user.id);
                if (!errVotos) {
                    for (const voto of misVotos || []) {
                        const rec = map.get(voto.docente_id) || {
                            docente_id: voto.docente_id,
                            total: 0,
                            recomendados: 0,
                            pct_recomienda: null,
                            miVoto: null,
                        };
                        rec.miVoto = voto.recomienda;
                        map.set(voto.docente_id, rec);
                    }
                }
            }
        } catch (err) {
            console.warn('No se pudo cargar la reputación de docentes:', err.message);
        }
        reputacionCache = map;
        docenteIdPorClave = idPorClave;
        return map;
    })();
    return reputacionPromise;
}

export function getReputacionDocente(docente) {
    if (!reputacionCache || !docente) return null;
    const uuid = docenteIdPorClave
        ? docenteIdPorClave.get(`${claveNombre(docente.nombre)}|${docente.rol}`)
        : null;
    if (!uuid) return null;
    return reputacionCache.get(uuid) || null;
}

export function reputacionPorNombre(nombreRaw, rol) {
    if (!reputacionCache) return null;
    const docente = getDocente(nombreRaw, rol);
    return docente ? getReputacionDocente(docente) : null;
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

export function docentesDeCursoConReputacion(codigo, { rol, activos = true } = {}) {
    const docentes = getDocentesDeCurso(codigo, { rol, activos });
    return docentes.map(d => ({ ...d, reputacion: getReputacionDocente(d) }));
}

/**
 * Registra/actualiza el voto del usuario actual sobre un docente (1 por usuario/docente).
 * `docente` es el objeto del catálogo; se resuelve su uuid de Supabase por (nombre, rol).
 * @returns {{data:object|null, error:object|null}}
 */
export async function recomendarDocente(docente, recomienda) {
    if (!isSupabaseConfigured || !supabase) {
        return { data: null, error: { message: 'Supabase no está configurado' } };
    }
    if (!docenteIdPorClave) {
        try {
            await cargarReputacion();
        } catch { /* se reporta como no sincronizado */ }
    }
    const docenteId = docenteIdPorClave
        ? docenteIdPorClave.get(`${claveNombre(docente.nombre)}|${docente.rol}`)
        : null;
    if (!docenteId) {
        return { data: null, error: { message: 'Este docente aún no está sincronizado; no se puede opinar sobre él.' } };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: { message: 'Necesitas iniciar sesión para opinar' } };
    }
    const { data, error } = await supabase
        .from('docente_reviews')
        .upsert(
            { docente_id: docenteId, user_id: user.id, recomienda: !!recomienda },
            { onConflict: 'docente_id,user_id' }
        );
    if (!error) {
        reputacionCache = null;
        reputacionPromise = null;
        docenteIdPorClave = null;
    }
    return { data, error };
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
