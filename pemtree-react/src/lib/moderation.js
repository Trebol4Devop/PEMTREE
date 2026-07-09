/**
 * Módulo de Moderación y Seguridad para el Foro PEMTREE
 * Protege contra lenguaje ofensivo, spam/flooding y enlaces inapropiados.
 */

// Lista masiva de palabras ofensivas, insultos y groserías en español e inglés (y coloquialismos de Guatemala/Latinoamérica)
const BAD_WORDS = [
    // Español & Guatemaltequismos / Centroamérica
    'cerote', 'cerotes', 'cerota', 'cerotas', 'mula', 'mulas', 'mulada', 'muladas', 'pendejo', 'pendeja', 'pendejos', 'pendejas',
    'pisado', 'pisada', 'pisados', 'pisadas', 'shumo', 'shuma', 'marote', 'taliche', 'huevon', 'huevona', 'huevones',
    'estupido', 'estupida', 'estupidos', 'estupidas', 'idiota', 'idiotas', 'imbecil', 'imbeciles',
    'mierda', 'mierdas', 'mierdero', 'caca', 'cacas', 'cagada', 'cagadas', 'cagar', 'cagon', 'cagona',
    'puta', 'putas', 'puto', 'putos', 'putazo', 'putazos', 'putero', 'cabron', 'cabrona', 'cabrones',
    'malparido', 'malparida', 'malparidos', 'hijueputa', 'hijueputas', 'hijo de puta', 'hp', 'hdp', 'ptm', 'alv', 'vtl',
    'pija', 'pijas', 'pijazo', 'verga', 'vergas', 'vergazo', 'verguiza', 'culero', 'culeros', 'culera', 'culo', 'culito',
    'mongol', 'mongoles', 'mongolito', 'mongolita', 'bastardo', 'bastarda', 'maricon', 'maricones', 'marica', 'maricas',
    'joder', 'jodido', 'jodida', 'chingar', 'chinga', 'chingada', 'chingadazo', 'pinche', 'pinches',
    'gonorrea', 'mamahuevos', 'mamada', 'mamadas', 'tarado', 'tarada', 'tarados', 'zorete', 'zorra', 'zorras',
    'perra', 'perras', 'perro maldito', 'asqueroso', 'asquerosa', 'puerco', 'puerca',
    'pito', 'pitos', 'pitero', 'chupala', 'chupalo', 'chupame', 'subnormal', 'subnormales',
    'lacra', 'lacras', 'maldito', 'maldita', 'miserable', 'baboso', 'babosa', 'babosos', 'mamon', 'mamona',
    // Inglés (Curse words, slurs, acronyms, insults & variations)
    'fuck', 'fucked', 'fucker', 'fuckers', 'fucking', 'motherfucker', 'motherfuckers', 'motherfucking', 'fucktard',
    'shit', 'shits', 'shitty', 'shitting', 'bullshit', 'horseshit', 'dipshit', 'shithead', 'shitbag',
    'bitch', 'bitches', 'bitching', 'bitchy', 'son of a bitch',
    'ass', 'asses', 'asshole', 'assholes', 'jackass', 'dumbass', 'smartass', 'fatass', 'assclown', 'asswipe',
    'bastard', 'bastards', 'crap', 'crappy', 'scum', 'scumbag',
    'dick', 'dicks', 'dickhead', 'dickheads', 'dickbag', 'cock', 'cocks', 'cocky', 'cocksucker', 'cocksuckers',
    'pussy', 'pussies', 'cunt', 'cunts', 'twat', 'twats', 'wanker', 'wankers', 'prick', 'pricks',
    'whore', 'whores', 'slut', 'sluts', 'slutty', 'douche', 'douchebag', 'douchebags', 'skank',
    'retard', 'retards', 'retarded', 'tard', 'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'fag', 'fags',
    'stfu', 'gtfo', 'wtf', 'lmfao', 'ffs', 'bs', 'kms'
];

// Dominios, extensiones y palabras clave en URLs que están prohibidos (adultos, apuestas, acortadores, malware)
const BLOCKED_LINK_KEYWORDS = [
    'porn', 'xxx', 'xvideos', 'pornhub', 'onlyfans', 'xhamster', 'redtube', 'brazzers', 'chaturbate',
    'casino', 'bet365', '1xbet', 'poker', 'slots', 'apuestas', 'rushbet', 'betway', 'sportingbet', 'betfair',
    'bit.ly', 'tinyurl.com', 't.co/', 'is.gd', 'cutt.ly', 'shorte.st', 'adf.ly', 'shrinkme',
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
 * Verifica si el texto contiene palabras ofensivas o intentos de evasión (leetspeak, espaciados, acentos)
 */
export function checkBadWords(text) {
    if (!text || typeof text !== 'string') return { valid: true };

    // 1. Normalizar texto: minúsculas y sin acentos (diacríticos)
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 2. Checar leetspeak básico y sin espacios ni símbolos
    const leetNormalized = normalized
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/@/g, 'a')
        .replace(/\$/g, 's')
        .replace(/!/g, 'i');

    const compactLeet = leetNormalized.replace(/[\s\-_\\.*+?!]/g, '');

    // 3. Comprobar contra lista masiva (tanto palabra exacta como en subcadena compacta para palabras graves/largas)
    for (const word of BAD_WORDS) {
        if (word.length >= 4) {
            if (compactLeet.includes(word)) {
                return {
                    valid: false,
                    reason: `Tu mensaje contiene lenguaje inapropiado u ofensivo ("${word}"). Por favor mantén un ambiente de respeto en la comunidad.`
                };
            }
            const letters = word.split('');
            const regexPattern = '\\b' + letters.join('[\\s\\-_\\.*+?!]*') + '\\b';
            try {
                if (new RegExp(regexPattern, 'i').test(normalized)) {
                    return {
                        valid: false,
                        reason: `Tu mensaje contiene lenguaje inapropiado u ofensivo ("${word}"). Por favor mantén un ambiente de respeto en la comunidad.`
                    };
                }
            } catch {
                // Ignore invalid regex
            }
        } else {
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(normalized)) {
                return {
                    valid: false,
                    reason: `Tu mensaje contiene lenguaje inapropiado u ofensivo ("${word}"). Por favor mantén un ambiente de respeto en la comunidad.`
                };
            }
        }
    }

    const SEVERE_WORDS = [
        'cerote', 'cerota', 'pisado', 'pisada', 'shumo', 'shuma', 'taliche', 'pendejo', 'pendeja', 'mierda', 'caca',
        'hijueputa', 'malparido', 'culero', 'culera', 'puta', 'puto', 'verga', 'pija', 'gonorrea', 'bastardo', 'maricon',
        'idiota', 'estupido', 'imbecil', 'chingar', 'pinche', 'zorra', 'perra', 'fuck', 'shit', 'bitch', 'asshole',
        'cunt', 'nigger', 'faggot', 'retard'
    ];
    for (const sWord of SEVERE_WORDS) {
        if (compactLeet.includes(sWord)) {
            return {
                valid: false,
                reason: 'Hemos detectado un intento de evasión de filtro de lenguaje inapropiado. Por favor utiliza un lenguaje respetuoso.'
            };
        }
    }

    return { valid: true };
}

/**
 * Función principal para moderar y limpiar texto antes de publicar
 */
export function moderateSubmission({ title = '', content = '' }) {
    const combined = `${title} ${content}`;

    // 1. Verificar enlaces peligrosos o inapropiados
    const linkCheck = checkInappropriateLinks(combined);
    if (!linkCheck.valid) return { valid: false, reason: linkCheck.reason };

    // 2. Verificar palabras ofensivas o intentos de evasión (leetspeak, espaciado, acentos)
    const titleWords = checkBadWords(title);
    if (!titleWords.valid) return { valid: false, reason: titleWords.reason };

    const contentWords = checkBadWords(content);
    if (!contentWords.valid) return { valid: false, reason: contentWords.reason };

    // 3. Verificar patrones de spam (teclado golpeado, mayúsculas)
    const titleSpam = checkSpamPatterns(title);
    if (!titleSpam.valid) return { valid: false, reason: titleSpam.reason };

    const contentSpam = checkSpamPatterns(content);
    if (!contentSpam.valid) return { valid: false, reason: contentSpam.reason };

    // 4. Censurar palabras ofensivas manteniendo la estructura original
    const censoredTitle = censorText(title);
    const censoredContent = censorText(content);

    return {
        valid: true,
        censoredTitle,
        censoredContent
    };
}
