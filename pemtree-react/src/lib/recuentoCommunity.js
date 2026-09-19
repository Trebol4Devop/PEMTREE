// src/lib/recuentoCommunity.js - Consultas de solo lectura a Supabase para la sección Recuento
//
// Proporciona grupos de estudio sugeridos y el mensaje destacado del foro con caché en memoria.

import { supabase, isSupabaseConfigured } from './supabase';
import { MODERATION_STATUS } from './moderation';
import { claveNombre } from '../modules/data/catalogo';

const CACHE_TTL_MS = 5 * 60 * 1000;

// Mapeo catálogo local -> slug de comunidad (student_groups.carrera / v_public_posts.carrera)
export const CARRERA_A_COMUNIDAD = {
    ambiental: 'ambiental',
    ciencias_y_sistemas: 'sistemas',
    civil: 'civil',
    electrica: 'electrica',
    electronica: 'electronica',
    industrial: 'industrial',
    mecanica: 'mecanica',
    mecanica_electrica: 'mecanica_electrica',
    mecanica_industrial: 'mecanica_industrial',
    quimica: 'quimica',
};

const cache = { grupos: null, gruposAt: 0, destacado: null, destacadoAt: 0 };

export function invalidarCacheRecuento() {
    cache.grupos = null;
    cache.gruposAt = 0;
    cache.destacado = null;
    cache.destacadoAt = 0;
}

/**
 * Obtiene grupos de estudio sugeridos según las carreras y cursos del estudiante.
 * @param {{ carreras?: string[], cursos?: string[], limit?: number }} opts
 * @returns {Promise<Array>}
 */
export async function fetchGruposSugeridos({ carreras = [], cursos = [], limit = 3 } = {}) {
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
                .limit(24);

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

    const cursosNorm = new Set(cursos.filter(Boolean).map(c => claveNombre(c)));
    const carrerasMapeadas = new Set(carreras.filter(Boolean).map(c => CARRERA_A_COMUNIDAD[c] || c));

    const scored = rawList.map(g => {
        let score = 0;
        if (g.curso && cursosNorm.has(claveNombre(g.curso))) {
            score = 2;
        } else if (g.carrera === 'todas' || carrerasMapeadas.has(g.carrera)) {
            score = 1;
        }
        return { group: g, score, upvotes: Number(g.upvotes) || 0 };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.upvotes - a.upvotes;
    });

    return scored.slice(0, limit).map(item => item.group);
}

/**
 * Obtiene la publicación destacada para mostrar en el bloque de comunidad.
 * @param {{ carreras?: string[] }} opts
 * @returns {Promise<object|null>}
 */
export async function fetchMensajeDestacado({ carreras = [] } = {}) {
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
                .limit(6);

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

    const carrerasMapeadas = new Set(carreras.filter(Boolean).map(c => CARRERA_A_COMUNIDAD[c] || c));
    const candidatos = (cache.destacado || []).filter(
        p => Number(p.moderation_status) === MODERATION_STATUS.APPROPRIATE
    );

    if (candidatos.length === 0) return null;

    const matchCarrera = candidatos.find(p => p.carrera === 'todas' || carrerasMapeadas.has(p.carrera));
    return matchCarrera || candidatos[0] || null;
}
