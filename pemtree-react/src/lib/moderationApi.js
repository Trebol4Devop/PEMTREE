import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Acciones de moderación vía RPC seguras (SECURITY DEFINER).
 * - ocultar: autor/admin/moderador (moderador ajeno requiere justificación)
 * - restaurar: SOLO admin/moderador (el autor NO puede desocultar lo que ocultó)
 * - eliminar: SOLO admin (última palabra desde el panel de administración)
 */

export const hideContent = async (table, id, justification = null) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Servicio no disponible.');
    const { error } = await supabase.rpc('ocultar_contenido_moderado', {
        p_tabla: table,
        p_item_id: id,
        p_justificacion: justification
    });
    if (error) throw error;
};

export const restoreContent = async (table, id) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Servicio no disponible.');
    const { error } = await supabase.rpc('restaurar_contenido_moderado', {
        p_tabla: table,
        p_item_id: id
    });
    if (error) throw error;
};

export const deleteContentAdmin = async (table, id, justification = null) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Servicio no disponible.');
    const { error } = await supabase.rpc('eliminar_contenido_moderado', {
        p_tabla: table,
        p_item_id: id,
        p_justificacion: justification
    });
    if (error) throw error;
};
