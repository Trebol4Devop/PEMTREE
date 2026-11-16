/**
 * Envía una notificación por correo mediante Formspree (https://formspree.io/f/xaqreklj)
 * Se ejecuta de forma asíncrona cuando:
 * 1. Un usuario hace un reporte (sobre un grupo o un post/usuario del foro).
 * 2. Un moderador elimina contenido de la comunidad con justificación.
 * 
 * Requiere especificar: a_quien (afectado), por_quien (actor), y porque (justificación/motivo).
 */
export async function sendFormspreeNotification({ tipo_evento, a_quien, por_quien, porque, detalles_extra = {} }) {
    try {
        await fetch('https://formspree.io/f/xaqreklj', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `[PEMTREE2] ${tipo_evento}: ${a_quien}`,
                tipo_evento: tipo_evento || 'Notificación PEMTREE',
                a_quien: a_quien || 'Desconocido',
                por_quien: por_quien || 'Usuario Anónimo / Desconocido',
                porque: porque || 'Sin justificación especificada',
                fecha_y_hora: new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' }),
                ...detalles_extra
            })
        });
    } catch (err) {
        console.error('Error temporal enviando notificación a Formspree:', err);
    }
}
