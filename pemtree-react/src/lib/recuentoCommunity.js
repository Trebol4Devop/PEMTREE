// src/lib/recuentoCommunity.js - Consultas y recomendaciones inteligentes para Recuento
//
// Proporciona grupos de estudio y mensaje destacado del foro contextualizados
// a la carrera activa, carrera simultánea, cursos del horario vigente y estado de avance.

import { supabase, isSupabaseConfigured } from './supabase';
import { MODERATION_STATUS } from './moderation';
import { claveNombre } from '../modules/data/catalogo';

const CACHE_TTL_MS = 3 * 60 * 1000;

// Mapeo catálogo local / pensum -> slug de comunidad (student_groups.carrera / v_public_posts.carrera)
export const CARRERA_A_COMUNIDAD = {
    ambiental: 'ambiental',
    ciencias_y_sistemas: 'sistemas',
    sistemas: 'sistemas',
    civil: 'civil',
    electrica: 'electrica',
    electronica: 'electronica',
    industrial: 'industrial',
    mecanica: 'mecanica',
    mecanica_electrica: 'mecanica_electrica',
    mecanica_industrial: 'mecanica_industrial',
    quimica: 'quimica',
    area_comun: 'area_comun',
    todas: 'todas',
};

const cache = { grupos: null, gruposAt: 0, destacado: null, destacadoAt: 0 };

export function invalidarCacheRecuento() {
    cache.grupos = null;
    cache.gruposAt = 0;
    cache.destacado = null;
    cache.destacadoAt = 0;
}

/**
 * Normaliza cualquier identificador de carrera o archivo pensum al slug de comunidad.
 * @param {string} raw
 * @returns {string}
 */
export function normalizarSlugCarrera(raw) {
    if (!raw || typeof raw !== 'string') return 'todas';
    const clean = raw
        .trim()
        .toLowerCase()
        .replace(/\.json$/, '')
        .replace(/_\d+$/, '');
    return CARRERA_A_COMUNIDAD[clean] || clean;
}

/**
 * Genera variantes de búsqueda y acrónimos para un curso (e.g. AYD2, IPC1, MB1).
 * @param {string} nombre
 * @param {string|number} [codigo]
 * @returns {{ nombreClave: string, tokens: string[], acronimos: string[], codigoClean: string }}
 */
function extraerVariantesCurso(nombre = '', codigo = '') {
    const nombreClave = claveNombre(nombre);
    const codigoClean = codigo ? String(codigo).replace(/^0+/, '') : '';
    const codigoPad = codigo ? String(codigo).padStart(4, '0') : '';

    const stopWords = new Set(['de', 'la', 'el', 'y', 'en', 'para', 'del', 'al', 'los', 'las', 'area', 'e']);
    const rawTokens = nombreClave.split(/[^a-z0-9]+/).filter(Boolean);
    const tokens = rawTokens.filter(t => !stopWords.has(t) && t.length >= 3);

    const acronimos = [];
    if (rawTokens.length >= 2) {
        const letters = rawTokens
            .filter(t => !stopWords.has(t))
            .map(t => t[0])
            .join('');
        if (letters.length >= 2) {
            acronimos.push(letters);
        }
    }

    // Acrónimos específicos y populares de la FIUSAC
    if (/analisis.*diseno.*sistemas.*2/i.test(nombreClave)) acronimos.push('ayd2', 'ayd 2');
    if (/analisis.*diseno.*sistemas.*1/i.test(nombreClave)) acronimos.push('ayd1', 'ayd 1');
    if (/seminario.*sistemas.*1/i.test(nombreClave)) acronimos.push('semi1', 'semi 1');
    if (/seminario.*sistemas.*2/i.test(nombreClave)) acronimos.push('semi2', 'semi 2');
    if (/redes.*computadoras.*1/i.test(nombreClave)) acronimos.push('redes1', 'redes 1');
    if (/redes.*computadoras.*2/i.test(nombreClave)) acronimos.push('redes2', 'redes 2');
    if (/introduccion.*programacion.*computacion.*1/i.test(nombreClave)) acronimos.push('ipc1', 'ipc 1');
    if (/introduccion.*programacion.*computacion.*2/i.test(nombreClave)) acronimos.push('ipc2', 'ipc 2');
    if (/estructuras.*datos/i.test(nombreClave)) acronimos.push('edd');
    if (/organizacion.*computacional/i.test(nombreClave)) acronimos.push('orga');
    if (/sistemas.*operativos.*1/i.test(nombreClave)) acronimos.push('sopes1', 'so1');
    if (/matematica.*basica.*1/i.test(nombreClave)) acronimos.push('mb1', 'mate1', 'mate 1');
    if (/matematica.*basica.*2/i.test(nombreClave)) acronimos.push('mb2', 'mate2', 'mate 2');
    if (/matematica.*intermedia.*1/i.test(nombreClave)) acronimos.push('mi1', 'inter1', 'inter 1');
    if (/matematica.*intermedia.*2/i.test(nombreClave)) acronimos.push('mi2', 'inter2', 'inter 2');
    if (/matematica.*intermedia.*3/i.test(nombreClave)) acronimos.push('mi3', 'inter3', 'inter 3');
    if (/fisica.*1/i.test(nombreClave)) acronimos.push('f1', 'fisica1', 'fisica 1');
    if (/fisica.*2/i.test(nombreClave)) acronimos.push('f2', 'fisica2', 'fisica 2');

    return {
        nombreClave,
        tokens,
        acronimos,
        codigoClean,
        codigoPad
    };
}

/**
 * Obtiene grupos de estudio sugeridos según las carreras y cursos vigentes del estudiante.
 * @param {{ carreras?: string[], carrera?: string, cursos?: Array<string|object>, limit?: number }} opts
 * @returns {Promise<Array>}
 */
export async function fetchGruposSugeridos({ carreras = [], carrera = null, cursos = [], limit = 3 } = {}) {
    if (!isSupabaseConfigured || !supabase) {
        return [];
    }

    try {
        if (!cache.grupos || (Date.now() - cache.gruposAt >= CACHE_TTL_MS)) {
            const { data, error } = await supabase
                .from('student_groups')
                .select('id,title,carrera,curso,section,link,description,platform,upvotes,author_alias,image_url,created_at,moderation_status')
                .order('upvotes', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) {
                console.error('Recuento: error cargando grupos', error.message);
                return [];
            }
            cache.grupos = data || [];
            cache.gruposAt = Date.now();
        }
    } catch (err) {
        console.error('Recuento: error cargando grupos', err.message);
        return [];
    }

    const rawList = (cache.grupos || []).filter(
        g => Number(g.moderation_status) !== MODERATION_STATUS.INAPPROPRIATE
    );

    // Preparar conjunto de carreras del estudiante
    const listaCarreras = Array.isArray(carreras) ? [...carreras] : [];
    if (carrera && !listaCarreras.includes(carrera)) listaCarreras.push(carrera);
    const carrerasMapeadas = new Set(listaCarreras.map(normalizarSlugCarrera));
    const carreraPrimaria = listaCarreras[0] ? normalizarSlugCarrera(listaCarreras[0]) : null;

    // Normalizar cursos del estudiante
    const cursosProcesados = (cursos || []).map(item => {
        if (typeof item === 'string') {
            return {
                variantes: extraerVariantesCurso(item, item),
                seccion: null,
                estado: 'general'
            };
        }
        return {
            variantes: extraerVariantesCurso(item.nombre || '', item.codigo || ''),
            seccion: item.seccion ? String(item.seccion).toUpperCase().trim() : null,
            estado: item.estado || 'general' // 'horario' | 'cursando' | 'plan' | 'disponible'
        };
    });

    const scored = rawList.map(g => {
        let score = 0;
        const gCursoClave = claveNombre(g.curso || '');
        const gTitleClave = claveNombre(g.title || '');
        const gDescClave = claveNombre(g.description || '');
        const gFullText = `${gCursoClave} ${gTitleClave} ${gDescClave}`;
        const gSection = (g.section || '').toUpperCase().trim();
        const gCarreraNorm = normalizarSlugCarrera(g.carrera);

        let cursoCoincidio = false;
        let mejorNivelCurso = 0;

        // 1. Evaluación por coincidencia de curso y sección
        for (const c of cursosProcesados) {
            const { nombreClave, tokens, acronimos, codigoClean, codigoPad } = c.variantes;
            let match = false;

            // Coincidencia exacta o contenida de nombre
            if (nombreClave && (gCursoClave === nombreClave || gFullText.includes(nombreClave))) {
                match = true;
            } else if (gCursoClave && nombreClave.includes(gCursoClave) && gCursoClave.length >= 6) {
                match = true;
            }

            // Coincidencia por código de curso (e.g. 770 o 0770)
            if (!match && codigoClean) {
                const regexCod = new RegExp(`(^|[^0-9])${codigoClean}([^0-9]|$)`);
                const regexPad = codigoPad ? new RegExp(`(^|[^0-9])${codigoPad}([^0-9]|$)`) : null;
                if (regexCod.test(gFullText) || (regexPad && regexPad.test(gFullText))) {
                    match = true;
                }
            }

            // Coincidencia por acrónimos populares (e.g. AYD2, IPC1, MB1)
            if (!match && acronimos.length > 0) {
                for (const acr of acronimos) {
                    const regexAcr = new RegExp(`(^|[^a-z0-9])${acr}([^a-z0-9]|$)`);
                    if (regexAcr.test(gFullText)) {
                        match = true;
                        break;
                    }
                }
            }

            // Coincidencia por tokens clave si no hubo match directo
            if (!match && tokens.length >= 2) {
                const tokensEncontrados = tokens.filter(tok => gFullText.includes(tok));
                if (tokensEncontrados.length >= 2) {
                    match = true;
                }
            }

            if (match) {
                cursoCoincidio = true;
                let pesoEstado = 20;
                if (c.estado === 'horario') pesoEstado = 70; // Cursos en horario activo vigente
                else if (c.estado === 'cursando') pesoEstado = 55; // Marcados como cursando
                else if (c.estado === 'plan') pesoEstado = 35; // En planificador
                else if (c.estado === 'disponible') pesoEstado = 20;

                // Bonus si la sección coincide exactamente
                let bonusSeccion = 0;
                if (c.seccion && (gSection === c.seccion || gFullText.includes(`seccion ${c.seccion.toLowerCase()}`))) {
                    bonusSeccion = 25;
                }

                const totalMatch = pesoEstado + bonusSeccion;
                if (totalMatch > mejorNivelCurso) {
                    mejorNivelCurso = totalMatch;
                }
            }
        }

        score += mejorNivelCurso;

        // 2. Evaluación por carrera
        if (carreraPrimaria && gCarreraNorm === carreraPrimaria) {
            score += 25;
        } else if (carrerasMapeadas.has(gCarreraNorm)) {
            score += 18;
        } else if (gCarreraNorm === 'todas') {
            score += 6;
        } else if (!cursoCoincidio) {
            // Penalizar grupos de una carrera totalmente ajena si no coincide el curso
            score -= 25;
        }

        // 3. Votos comunitarios como criterio de desempate
        score += Math.min(Number(g.upvotes) || 0, 10);

        return { group: g, score, upvotes: Number(g.upvotes) || 0 };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
        return new Date(b.group.created_at || 0) - new Date(a.group.created_at || 0);
    });

    return scored.slice(0, limit).map(item => item.group);
}

/**
 * Obtiene la publicación destacada para mostrar en el bloque de comunidad.
 * Prioriza publicaciones afines a la carrera, cursos vigentes y mayor interacción.
 * @param {{ carreras?: string[], carrera?: string, cursos?: Array<string|object> }} opts
 * @returns {Promise<object|null>}
 */
export async function fetchMensajeDestacado({ carreras = [], carrera = null, cursos = [] } = {}) {
    if (!isSupabaseConfigured || !supabase) {
        return null;
    }

    try {
        if (!cache.destacado || (Date.now() - cache.destacadoAt >= CACHE_TTL_MS)) {
            const { data, error } = await supabase
                .from('v_public_posts')
                .select('id,title,content,author_alias,likes,carrera,created_at,is_pinned,comment_count,moderation_status')
                .order('is_pinned', { ascending: false })
                .order('likes', { ascending: false })
                .limit(15);

            if (error) {
                console.error('Recuento: error cargando post destacado', error.message);
                return null;
            }
            cache.destacado = data || [];
            cache.destacadoAt = Date.now();
        }
    } catch (err) {
        console.error('Recuento: error cargando post destacado', err.message);
        return null;
    }

    const listaCarreras = Array.isArray(carreras) ? [...carreras] : [];
    if (carrera && !listaCarreras.includes(carrera)) listaCarreras.push(carrera);
    const carrerasMapeadas = new Set(listaCarreras.map(normalizarSlugCarrera));
    const carreraPrimaria = listaCarreras[0] ? normalizarSlugCarrera(listaCarreras[0]) : null;

    const candidatos = (cache.destacado || []).filter(
        p => Number(p.moderation_status) === MODERATION_STATUS.APPROPRIATE
    );

    if (candidatos.length === 0) return null;

    // Normalizar cursos para detectar menciones en el foro
    const cursosProcesados = (cursos || []).map(item => {
        if (typeof item === 'string') {
            return extraerVariantesCurso(item, item);
        }
        return extraerVariantesCurso(item.nombre || '', item.codigo || '');
    });

    const scored = candidatos.map(p => {
        let score = 0;
        const pCarreraNorm = normalizarSlugCarrera(p.carrera);
        const pTitleClave = claveNombre(p.title || '');
        const pContentClave = claveNombre(p.content || '');
        const pFullText = `${pTitleClave} ${pContentClave}`;

        // 1. Alineación de carrera
        if (carreraPrimaria && pCarreraNorm === carreraPrimaria) {
            score += 40;
        } else if (carrerasMapeadas.has(pCarreraNorm)) {
            score += 25;
        } else if (pCarreraNorm === 'todas') {
            score += 8;
        } else {
            score -= 20; // De otra carrera no afín
        }

        // 2. Mención de cursos o acrónimos del estudiante en el título o contenido
        for (const c of cursosProcesados) {
            if (c.nombreClave && pFullText.includes(c.nombreClave)) {
                score += 30;
                break;
            }
            if (c.acronimos.some(acr => new RegExp(`(^|[^a-z0-9])${acr}([^a-z0-9]|$)`).test(pFullText))) {
                score += 30;
                break;
            }
        }

        // 3. Destacado fijado
        if (p.is_pinned) {
            score += 25;
        }

        // 4. Interacción social
        const likes = Number(p.likes) || 0;
        const comments = Number(p.comment_count) || 0;
        score += likes * 3 + comments * 2;

        return { post: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.post || candidatos[0] || null;
}
