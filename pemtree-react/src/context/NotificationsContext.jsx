/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { enablePushNotifications, disablePushNotifications, getPushSubscription, isPushSupported } from '../lib/push';

const NotificationsContext = createContext(null);

export const NOTIFICATION_TYPES = {
    comment: { label: 'Comentarios en mis publicaciones', icon: 'comment' },
    reply: { label: 'Respuestas a mis comentarios', icon: 'reply' },
    like: { label: 'Me gusta en mis publicaciones', icon: 'like' },
    new_post: { label: 'Publicaciones nuevas en mis carreras', icon: 'new_post' }
};

const DEFAULT_PREFERENCES = {
    comment_enabled: true,
    reply_enabled: true,
    like_enabled: true,
    new_post_enabled: false,
    carreras: []
};

const CARRERAS = [
    { id: 'todas', label: 'Todas las Carreras / Áreas' },
    { id: 'area_comun', label: 'Área Común (1er - 3er Sem)' },
    { id: 'ambiental', label: 'Ingeniería Ambiental' },
    { id: 'sistemas', label: 'Ingeniería en Ciencias y Sistemas' },
    { id: 'civil', label: 'Ingeniería Civil' },
    { id: 'electrica', label: 'Ingeniería Eléctrica' },
    { id: 'electronica', label: 'Ingeniería Electrónica' },
    { id: 'industrial', label: 'Ingeniería Industrial' },
    { id: 'mecanica', label: 'Ingeniería Mecánica' },
    { id: 'mecanica_electrica', label: 'Ingeniería Mecánica Eléctrica' },
    { id: 'mecanica_industrial', label: 'Ingeniería Mecánica Industrial' },
    { id: 'quimica', label: 'Ingeniería Química' }
];

export function NotificationsProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(isSupabaseConfigured && supabase));
    const [preferences, setPreferences] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [pushState, setPushState] = useState({ supported: isPushSupported(), enabled: false, checking: false });

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read_at).length,
        [notifications]
    );

    const loadPreferences = useCallback(async (userId) => {
        if (!isSupabaseConfigured || !supabase || !userId) return;
        try {
            const { data } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (data) {
                setPreferences(data);
                return;
            }

            const { data: inserted } = await supabase
                .from('notification_preferences')
                .upsert({ user_id: userId, ...DEFAULT_PREFERENCES })
                .select()
                .maybeSingle();

            if (inserted) setPreferences(inserted);
        } catch (err) {
            console.error('Error cargando preferencias de notificación:', err.message);
        }
    }, []);

    const loadNotifications = useCallback(async (userId) => {
        if (!isSupabaseConfigured || !supabase || !userId) {
            setNotifications([]);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('Error cargando notificaciones:', err.message);
        }
    }, []);

    const checkPushState = useCallback(async () => {
        if (!isPushSupported()) {
            setPushState(prev => ({ ...prev, enabled: false }));
            return;
        }
        const sub = await getPushSubscription();
        setPushState(prev => ({ ...prev, enabled: Boolean(sub) }));
    }, []);

    const refresh = useCallback(async () => {
        if (!user) return;
        await Promise.all([
            loadNotifications(user.id),
            checkPushState()
        ]);
    }, [user, loadNotifications, checkPushState]);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;

        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            const u = session?.user || null;
            setUser(u);
            setLoading(false);
            if (u) {
                loadPreferences(u.id);
                loadNotifications(u.id);
                checkPushState();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            const u = session?.user || null;
            setUser(u);
            setLoading(false);
            if (u) {
                loadPreferences(u.id);
                loadNotifications(u.id);
                checkPushState();
            } else {
                setNotifications([]);
                setPreferences(null);
                setPushState(prev => ({ ...prev, enabled: false }));
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadPreferences, loadNotifications, checkPushState]);

    // Sondeo ligero de la bandeja mientras haya sesión activa
    useEffect(() => {
        if (!user) return;
        const intervalId = setInterval(() => {
            loadNotifications(user.id);
        }, 30000);
        return () => clearInterval(intervalId);
    }, [user, loadNotifications]);

    const markAsRead = useCallback(async (id) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
        ));
        if (!isSupabaseConfigured || !supabase) return;
        await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
        if (!isSupabaseConfigured || !supabase) return;
        await supabase
            .from('user_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .is('read_at', null);
    }, [user]);

    const removeNotification = useCallback(async (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (!isSupabaseConfigured || !supabase) return;
        await supabase.from('user_notifications').delete().eq('id', id);
    }, []);

    const updatePreferences = useCallback(async (patch) => {
        if (!user) return;
        setPreferences(prev => (prev ? { ...prev, ...patch } : { user_id: user.id, ...DEFAULT_PREFERENCES, ...patch }));
        if (!isSupabaseConfigured || !supabase) return;
        const base = { user_id: user.id, ...DEFAULT_PREFERENCES, ...(preferences || {}), ...patch };
        await supabase.from('notification_preferences').upsert(base);
    }, [user, preferences]);

    const togglePush = useCallback(async () => {
        if (!user) return;
        setPushState(prev => ({ ...prev, checking: true }));
        if (pushState.enabled) {
            await disablePushNotifications();
            setPushState(prev => ({ ...prev, enabled: false, checking: false }));
        } else {
            const res = await enablePushNotifications(user.id);
            setPushState(prev => ({
                ...prev,
                enabled: res.ok,
                checking: false,
                lastError: res.ok ? null : res.reason
            }));
        }
    }, [user, pushState.enabled]);

    const value = {
        user,
        loading,
        preferences,
        notifications,
        unreadCount,
        pushState,
        refresh,
        markAsRead,
        markAllAsRead,
        removeNotification,
        updatePreferences,
        togglePush,
        CARRERAS
    };

    return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
    const ctx = useContext(NotificationsContext);
    if (!ctx) {
        throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>');
    }
    return ctx;
}
