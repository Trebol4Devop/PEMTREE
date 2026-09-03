import { supabase, isSupabaseConfigured } from './supabase';

const DEFAULT_COMMUNITY_URL = 'http://localhost:3000';

export const getCommunityAuthUrl = () => {
    return (
        import.meta.env.VITE_COMMUNITY_AUTH_URL ||
        DEFAULT_COMMUNITY_URL
    ).replace(/\/+$/, '');
};

/**
 * Inicia el flujo de SSO hacia la web comunitaria.
 * Genera un state criptográfico seguro para evitar ataques CSRF y guarda el retorno previsto.
 */
export const initiateCommunityLogin = (returnTo = window.location.pathname + window.location.search) => {
    // 1. Generar token de estado seguro anti-CSRF
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

    // 2. Guardar en sessionStorage para validarlo a la vuelta
    sessionStorage.setItem('pemtree_auth_state', state);
    sessionStorage.setItem('pemtree_auth_return_to', returnTo);

    // 3. Callback URL de PEMTREE
    const redirectUri = `${window.location.origin}/auth/callback`;

    // 4. Redirigir a la web comunitaria con los parámetros necesarios
    const communityBase = getCommunityAuthUrl();
    const authorizeUrl = new URL(`${communityBase}/auth/authorize`);
    authorizeUrl.searchParams.set('client_id', 'pemtree');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);

    window.location.href = authorizeUrl.toString();
};

/**
 * Procesa el callback que proviene de la web comunitaria.
 * Extrae y valida el state anti-CSRF, procesa los tokens de sesión de Supabase y limpia la URL.
 */
export const handleCommunityAuthCallback = async () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado en esta instancia.');
    }

    // Extraer parámetros desde URL (soporta hash fragment # y search params ?)
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const state = hashParams.get('state') || searchParams.get('state');
    const code = searchParams.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

    // 1. Verificar si la comunidad reportó un error o canceló el consentimiento
    if (errorDescription) {
        throw new Error(decodeURIComponent(errorDescription));
    }

    // 2. Validar State Anti-CSRF si venía presente
    const savedState = sessionStorage.getItem('pemtree_auth_state');
    if (savedState) {
        sessionStorage.removeItem('pemtree_auth_state');
        if (state && state !== savedState) {
            throw new Error('Validación de seguridad fallida (State mismatch). Por favor intenta de nuevo.');
        }
    }

    let session;

    // 3. Caso A: Recibió ?code= (flujo PKCE de Supabase)
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        session = data.session;
    } 
    // Caso B: Recibió access_token y refresh_token directamente
    else if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });
        if (error) throw error;
        session = data.session;
    } else {
        throw new Error('No se recibieron credenciales de autorización válidas.');
    }

    // 5. Recuperar ruta de retorno y limpiar
    const returnTo = sessionStorage.getItem('pemtree_auth_return_to') || '/';
    sessionStorage.removeItem('pemtree_auth_return_to');

    // Limpiar hash y parámetros sensibles del historial del navegador
    window.history.replaceState({}, document.title, window.location.pathname);

    return { session, returnTo };
};
