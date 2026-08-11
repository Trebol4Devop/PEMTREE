import { supabase, isSupabaseConfigured } from './supabase';

// Clave pública VAPID (solo la pública viaja al navegador; la privada vive en la edge function send-push).
export const VAPID_PUBLIC_KEY = 'BE7gCE2RKGsy9PShbZUPuXV9EJTmIEE8QCa116_u9lJu2Y9AskxRBE5QIEt3WJuW-jucRI2fRPZF210ygUaVCR8';

export const isPushSupported = () =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        if (reg.installing) {
            await new Promise((resolve) => {
                reg.installing.addEventListener('statechange', (e) => {
                    if (e.target.state === 'activated') resolve();
                });
            });
        }
        return reg;
    } catch (err) {
        console.error('Error registrando el service worker:', err);
        return null;
    }
}

export async function getPushSubscription() {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return null;
    return reg.pushManager.getSubscription();
}

const arrayBufferToBase64 = (buffer) => {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

export async function enablePushNotifications(userId) {
    if (!isPushSupported()) {
        return { ok: false, reason: 'unsupported' };
    }
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, reason: 'service' };
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return { ok: false, reason: 'denied' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
        return { ok: false, reason: 'sw' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        try {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });
        } catch (err) {
            console.error('Error suscribiéndose a push:', err);
            return { ok: false, reason: 'subscribe', error: err?.message || String(err) };
        }
    }

    const endpoint = sub.endpoint;
    const p256dh = arrayBufferToBase64(sub.getKey('p256dh'));
    const auth = arrayBufferToBase64(sub.getKey('auth'));

    // Fuerza la renovación del token de sesión antes de escribir en la BD:
    // si la sesión estaba vencida, el INSERT fallaría por RLS (auth.uid() nulo).
    try {
        await supabase.auth.getUser();
    } catch {
        // continuar de todos modos; el error real se captura abajo
    }

    let dbError = null;
    try {
        const { error: upsertError } = await supabase
            .from('notification_subscriptions')
            .upsert(
                {
                    user_id: userId,
                    endpoint,
                    p256dh,
                    auth,
                    user_agent: navigator.userAgent
                },
                { onConflict: 'endpoint' }
            );
        if (upsertError) dbError = upsertError;
    } catch (err) {
        dbError = err;
    }

    if (dbError) {
        console.error('Error guardando suscripción push:', dbError);
        // Revertir la suscripción del navegador para no dejar un estado inconsistente
        try {
            if (sub) await sub.unsubscribe();
        } catch { /* noop */ }
        return { ok: false, reason: 'save', error: dbError?.message || String(dbError) };
    }

    return { ok: true };
}

export async function disablePushNotifications() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
            await sub.unsubscribe();
        }
        if (isSupabaseConfigured && supabase) {
            if (sub) {
                await supabase.from('notification_subscriptions').delete().eq('endpoint', sub.endpoint);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('notification_subscriptions').delete().eq('user_id', user.id);
                }
            }
        }
    } catch (err) {
        console.error('Error desactivando notificaciones push:', err);
    }
}
