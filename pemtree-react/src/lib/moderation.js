/**
 * Módulo de Moderación y Seguridad para el Foro PEMTREE
 * Protege contra lenguaje ofensivo, spam/flooding y enlaces inapropiados.
 */

// Lista de palabras ofensivas y groserías comunes en español e inglés (y coloquialismos guatemaltecos/latinoamericanos)
const BAD_WORDS = [
    'cerote', 'cerotes', 'mula', 'mulas', 'pendejo', 'pendeja', 'pendejos', 'pendejas',
    'estupido', 'estupida', 'estupidos', 'estupidas', 'idiota', 'idiotas', 'imbecil', 'imbeciles',
    'mierda', 'mierdas', 'puta', 'putas', 'puto', 'putos', 'cabron', 'cabrona', 'cabrones',
    'malparido', 'malparida', 'pija', 'verga', 'vergas', 'culero', 'culeros', 'mongol', 'mongoles',
    'bastardo', 'bastarda', 'maricon', 'maricones', 'hdp', 'joder', 'jodido', 'chingar', 'chinga',
    'chingada', 'pinche', 'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt',
    'whore', 'slut', 'retard', 'retarded', 'nigger', 'faggot'
];

// Dominios, extensiones y palabras clave en URLs que están prohibidos (adultos, apuestas, acortadores, malware)
const BLOCKED_LINK_KEYWORDS = [
    'porn', 'xxx', 'xvideos', 'pornhub', 'onlyfans', 'xhamster', 'redtube', 'brazzers', 'chaturbate',
    'casino', 'bet', 'bet365', '1xbet', 'poker', 'slots', 'apuestas',
    'bit.ly', 'tinyurl.com', 't.co/', 'is.gd', 'cutt.ly', 'shorte.st', 'adf.ly', 'shrinkme',
    'telegram.me', 't.me/', 'wa.me/', 'whatsapp.com', 'discord.gg/',
    '.exe', '.apk', '.bat', '.scr', '.vbs', '.msi', '.xyz', '.top', '.ru', '.tk', '.biz'
];

/**
 * Censura palabras ofensivas reemplazándolas con asteriscos (Ej. c*****e)
 */
export function censorText(text) {
    if (!text || typeof text !== 'string') return text;

    let censored = text;
    BAD_WORDS.forEach(word => {
        // Regex de frontera de palabra insensible a mayúsculas, tolerando acentos y repeticiones
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        censored = censored.replace(regex, (match) => {
            if (match.length <= 2) return '*'.repeat(match.length);
            return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
        });
    });

    return censored;
}

/**
 * Verifica si el texto contiene enlaces no permitidos o peligrosos
 */
export function checkInappropriateLinks(text) {
    if (!text || typeof text !== 'string') return { valid: true };

    // Extraer todas las posibles URLs usando regex
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|net|org|io|gt|es|edu|gob)[^\s]*)/gi;
    const matches = text.match(urlRegex) || [];

    for (const url of matches) {
        const lowerUrl = url.toLowerCase();
        for (const blocked of BLOCKED_LINK_KEYWORDS) {
            if (lowerUrl.includes(blocked)) {
                return {
                    valid: false,
                    reason: `El enlace "${url}" contiene elementos no permitidos (acortadores de URL, sitios de adultos, apuestas, archivos sospechosos o redes de spam). Por favor utiliza únicamente enlaces confiables o académicos.`
                };
            }
        }
    }

    return { valid: true };
}

/**
 * Verifica patrones de spam (repetición excesiva de caracteres, flood, mayúsculas excesivas)
 */
export function checkSpamPatterns(text) {
    if (!text || typeof text !== 'string') return { valid: true };

    // 1. Repetición excesiva de un mismo carácter o puntuación (más de 8 veces seguidas, Ej. aaaaaaaaaaa o !!!!!!!!!!)
    if (/(.)\1{8,}/.test(text)) {
        return {
            valid: false,
            reason: 'Tu mensaje contiene caracteres repetidos excesivamente. Por favor redacta tu consulta de manera clara y natural.'
        };
    }

    // 2. Mayúsculas sostenidas en textos largos (más de 40 caracteres y más del 80% en mayúsculas)
    if (text.length > 40) {
        const lettersOnly = text.replace(/[^a-zA-Z]/g, '');
        if (lettersOnly.length > 20) {
            const uppercaseCount = lettersOnly.split('').filter(c => c === c.toUpperCase()).length;
            if (uppercaseCount / lettersOnly.length > 0.85) {
                return {
                    valid: false,
                    reason: 'Por favor no escribas todo el mensaje en letras MAYÚSCULAS para mantener la legibilidad en el foro.'
                };
            }
        }
    }

    return { valid: true };
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
 * Función principal para moderar y limpiar texto antes de publicar
 */
export function moderateSubmission({ title = '', content = '' }) {
    const combined = `${title} ${content}`;

    // 1. Verificar enlaces peligrosos o inapropiados
    const linkCheck = checkInappropriateLinks(combined);
    if (!linkCheck.valid) return { valid: false, reason: linkCheck.reason };

    // 2. Verificar patrones de spam (teclado golpeado, mayúsculas)
    const titleSpam = checkSpamPatterns(title);
    if (!titleSpam.valid) return { valid: false, reason: titleSpam.reason };

    const contentSpam = checkSpamPatterns(content);
    if (!contentSpam.valid) return { valid: false, reason: contentSpam.reason };

    // 3. Censurar palabras ofensivas manteniendo la estructura original
    const censoredTitle = censorText(title);
    const censoredContent = censorText(content);

    return {
        valid: true,
        censoredTitle,
        censoredContent
    };
}
