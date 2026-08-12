/**
 * Módulo de Moderación y Seguridad para el Foro PEMTREE
 * Protege contra lenguaje ofensivo, spam/flooding y enlaces inapropiados.
 *
 * Nota: la clasificación del contenido se hace en la BD (trigger + Supabase);
 * este módulo expone utilidades de presentación y anti-flooding en cliente.
 */

// Estados de moderación automática (igual que el esquema SQL de Supabase)
export const MODERATION_STATUS = {
    PENDING: 0,        // Pendiente: el modelo aún no lo clasifica (normalmente <1 min)
    APPROPRIATE: 1,    // Apropiado: se muestra normalmente
    INAPPROPRIATE: 2,  // No apropiado: ocultar / bloquear interacción
    ERROR: 3           // Error: no se pudo clasificar, mostrar advertencia
};

/**
 * Devuelve la información de visualización para un estado de moderación.
 * Retorna null cuando el contenido es apto (status 1 o ausente) y no requiere UI especial.
 */
export function getModerationInfo(status) {
    const s = Number(status);
    if (s === MODERATION_STATUS.PENDING) {
        return {
            status: s,
            type: 'pending',
            label: 'Verificando',
            badgeVariant: 'warning',
            message: 'Este contenido está siendo verificado por nuestro sistema de moderación.'
        };
    }
    if (s === MODERATION_STATUS.INAPPROPRIATE) {
        return {
            status: s,
            type: 'blocked',
            label: 'Bloqueado',
            badgeVariant: 'danger',
            message: 'Este contenido fue rechazado por infringir las normas de convivencia de la comunidad.'
        };
    }
    if (s === MODERATION_STATUS.ERROR) {
        return {
            status: s,
            type: 'error',
            label: 'Sin verificar',
            badgeVariant: 'warning',
            message: 'Contenido no moderado, puede ser inapropiado.'
        };
    }
    return null;
}

/**
 * Indica si el contenido debe ocultarse/bloquearse para el público general.
 */
export function isContentBlocked(status) {
    return Number(status) === MODERATION_STATUS.INAPPROPRIATE;
}

/**
 * Sistema de Cooldown (Anti-Flooding) local basado en localStorage para evitar spam masivo
 */
export function checkCooldown(actionType = 'post') {
    const now = Date.now();
    const key = actionType === 'post' ? 'pemtree_last_post_timestamp' : 'pemtree_last_comment_timestamp';
    const cooldownSeconds = actionType === 'post' ? 30 : 15; // 30s entre posts, 15s entre comentarios

    const lastTimestamp = parseInt(localStorage.getItem(key) || '0', 10);
    const elapsedSeconds = (now - lastTimestamp) / 1000;

    if (elapsedSeconds < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - elapsedSeconds);
        return {
            allowed: false,
            reason: `Para evitar la saturación del sistema, por favor espera ${remaining} segundo${remaining > 1 ? 's' : ''} antes de enviar otra ${actionType === 'post' ? 'publicación' : 'respuesta'}.`
        };
    }

    return { allowed: true };
}

/**
 * Registra el timestamp del último envío exitoso
 */
export function updateCooldown(actionType = 'post') {
    const key = actionType === 'post' ? 'pemtree_last_post_timestamp' : 'pemtree_last_comment_timestamp';
    localStorage.setItem(key, Date.now().toString());
}

/**
 * Formatea errores técnicos de base de datos a mensajes amigables para el usuario final.
 */
export function formatUserError(error) {
    if (!error) return 'Ocurrió un problema técnico temporal al procesar tu solicitud. Por favor, inténtalo de nuevo.';
    const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();

    // 1. Errores del trigger de moderación en la BD (rechazo duro al INSERT/UPDATE).
    //    Se verifican antes del resto porque algunos mensajes comparten palabras clave.
    if (msg.includes('caracteres repetidos') || msg.includes('flooding') || msg.includes('excesivamente')) {
        return 'El mensaje contiene demasiados caracteres repetidos. Por favor, ajústalo antes de enviar.';
    }
    if (msg.includes('enlace') || msg.includes('link') || msg.includes('url')) {
        return 'El contenido incluye enlaces no permitidos (sitios de adultos, apuestas, acortadores, archivos o dominios sospechosos). Por favor, retira o verifica la dirección web antes de publicar.';
    }
    if (msg.includes('inapropiado') || msg.includes('ofensivo') || msg.includes('grosería') || msg.includes('groserias') || msg.includes('moderación') || msg.includes('prohibido') || msg.includes('lenguaje') || msg.includes('palabras')) {
        return 'No pudimos publicar tu contenido porque nuestro sistema detectó palabras u oraciones que podrían no cumplir con las normas de convivencia de la comunidad. Por favor, revisa tu redacción e inténtalo de nuevo.';
    }
    if (msg.includes('unique') || msg.includes('23505') || msg.includes('ya registrado') || msg.includes('duplicado')) {
        return 'Ya existe un registro o reporte con esta información en el sistema.';
    }
    if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('permiso') || msg.includes('42501') || msg.includes('unauthorized')) {
        return 'No cuentas con los permisos necesarios para realizar esta acción o tu sesión ha expirado. Intenta iniciar sesión nuevamente.';
    }
    if (msg.includes('not null') || msg.includes('violates') || msg.includes('required') || msg.includes('obligatorio')) {
        return 'Por favor asegúrate de completar todos los campos obligatorios correctamente.';
    }
    return 'No se pudo completar la solicitud en este momento. Por favor, verifica tu conexión e inténtalo más tarde.';
}
