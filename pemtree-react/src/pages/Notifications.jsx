import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Bell, BellOff, CheckCheck, Trash2, MessageSquare, ThumbsUp,
    CornerDownRight, Megaphone, Info, AlertTriangle, ShieldCheck, LogOut
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNotifications, NOTIFICATION_TYPES } from '../context/NotificationsContext';
import { EmptyState } from '../components/ui';
import Seo from '../components/seo/Seo';

const TYPE_ICONS = {
    comment: MessageSquare,
    reply: CornerDownRight,
    like: ThumbsUp,
    new_post: Megaphone
};

const TYPE_COLORS = {
    comment: 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]',
    reply: 'bg-[#E6FFFA] dark:bg-[#042F2E] text-[#00875A] dark:text-[#4ADE80]',
    like: 'bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369]',
    new_post: 'bg-[#FFF0B3] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24]'
};

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'hace un momento';
    const diffSecs = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diffSecs < 60) return 'hace unos segundos';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} d`;
};

const PUSH_ERROR_MESSAGES = {
    unsupported: 'Tu navegador no admite notificaciones. Podrás ver la bandeja desde esta página de todos modos.',
    service: 'El servicio de notificaciones no está disponible en este momento. Inténtalo más tarde.',
    denied: 'El permiso de notificaciones está bloqueado por tu navegador. Habilítalo desde la configuración del sitio (icono de candado) y vuelve a intentar.',
    sw: 'No se pudo completar la activación. Recarga la página e inténtalo de nuevo.',
    subscribe: 'Tu navegador o red no permite recibir notificaciones de este sitio por ahora. Puedes intentarlo de nuevo más tarde; mientras tanto, la bandeja de esta página te mostrará la actividad de tu foro.',
    save: 'No se pudieron guardar las notificaciones. Inténtalo de nuevo en unos momentos.'
};

const getFriendlyPushError = (reason) =>
    PUSH_ERROR_MESSAGES[reason] || 'No se pudo activar. Inténtalo de nuevo más tarde.';

function ToggleSwitch({ checked, onChange, label, description }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-[#172B4D] dark:text-slate-200">{label}</p>
                {description && (
                    <p className="text-[11px] text-[#7A869A] dark:text-slate-400 mt-0.5">{description}</p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={onChange}
                className={`relative w-11 h-6 rounded-full transition shrink-0 cursor-pointer border-none ${checked ? 'bg-[#0052CC] dark:bg-[#4C9AFF]' : 'bg-[#DFE1E6] dark:bg-[#3E4C5E]'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

export default function Notifications() {
    const navigate = useNavigate();
    const {
        user, loading, preferences, notifications, unreadCount, pushState,
        markAsRead, markAllAsRead, removeNotification, updatePreferences, togglePush, CARRERAS
    } = useNotifications();

    const [showCarreras, setShowCarreras] = useState(true);

    const handleLogin = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) return;
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/notificaciones',
                    queryParams: { prompt: 'select_account' }
                }
            });
        } catch (err) {
            console.error('Error al iniciar sesión con Google:', err);
        }
    }, []);

    const handleLogout = useCallback(async () => {
        if (supabase) await supabase.auth.signOut();
    }, []);

    const handleOpenNotification = useCallback((n) => {
        if (!n.read_at) markAsRead(n.id);
        if (n.post_id) {
            navigate(`/foro?post=${n.post_id}`);
        } else {
            navigate('/foro');
        }
    }, [navigate, markAsRead]);

    const toggleCarrera = useCallback((carreraId) => {
        const current = Array.isArray(preferences?.carreras) ? preferences.carreras : [];
        let next;
        if (carreraId === 'todas') {
            next = current.includes('todas') ? [] : ['todas'];
        } else {
            const withoutTodas = current.filter(c => c !== 'todas');
            next = withoutTodas.includes(carreraId)
                ? withoutTodas.filter(c => c !== carreraId)
                : [...withoutTodas, carreraId];
        }
        updatePreferences({ carreras: next });
    }, [preferences, updatePreferences]);

    const pushPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto w-full bg-[#F4F5F7] dark:bg-[#0F1726] hide-scrollbar select-none">
            <Seo title="Notificaciones del Foro" description="Revisa las notificaciones del foro de PEMTREE y configura las alertas del navegador." pathname="/notificaciones" />

            {/* Header Banner */}
            <div className="w-full bg-gradient-to-r from-[#0052CC] to-[#0747A6] dark:from-[#0E1624] dark:to-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-8 px-4 shrink-0 text-white shadow-sm">
                <div className="max-w-5xl mx-auto flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-[#4C9AFF]/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                        <Bell size={24} className="text-white dark:text-[#4C9AFF]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Notificaciones del Foro</h1>
                            {unreadCount > 0 && (
                                <span className="text-[11px] font-extrabold bg-white/20 dark:bg-[#4C9AFF]/20 text-white dark:text-[#7DD3FC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {unreadCount} sin leer
                                </span>
                            )}
                            <span className="text-[11px] font-bold bg-black/25 dark:bg-black/40 text-white/90 px-2.5 py-0.5 rounded-full border border-white/15">
                                Espacio estudiantil independiente no oficial
                            </span>
                        </div>
                        <p className="text-sm text-blue-100 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                            Consulta la actividad reciente de tus publicaciones y configura las alertas que deseas recibir en tu navegador.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
                {loading ? (
                    <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-12 border border-[#DFE1E6] dark:border-[#3E4C5E] text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold text-[#5E6C84] dark:text-slate-400">Cargando notificaciones...</p>
                    </div>
                ) : !user ? (
                    <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs overflow-hidden">
                        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center">
                                <Bell size={30} />
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-[#172B4D] dark:text-slate-100">Inicia sesión para ver tus notificaciones</h2>
                                <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 max-w-md mt-1.5 leading-relaxed">
                                    Al ingresar con Google manteniendo tu identidad oculta tras tu alias, podrás ver la actividad en tus publicaciones y activar las alertas del navegador.
                                </p>
                            </div>
                            <button
                                onClick={handleLogin}
                                className="flex items-center justify-center gap-2 bg-white text-[#172B4D] hover:bg-blue-50 text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl transition shadow-md cursor-pointer border border-[#DFE1E6] dark:border-[#3E4C5E]"
                            >
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>Iniciar sesión con Google</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Configuración */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Notificaciones del navegador */}
                            <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs p-5 sm:p-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bell size={18} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-[#172B4D] dark:text-slate-100">Notificaciones del navegador</h3>
                                </div>
                                <p className="text-[11px] sm:text-xs text-[#5E6C84] dark:text-slate-400 mb-4 leading-relaxed">
                                    Recibe avisos del foro incluso con la pestaña cerrada. Puedes activarlas o desactivarlas cuando quieras.
                                </p>

                                {!pushState.supported ? (
                                    <div className="flex items-start gap-2 bg-[#FFF0B3]/60 dark:bg-[#422006]/40 border border-amber-300/50 dark:border-amber-700/40 text-[#B45309] dark:text-[#FBBF24] rounded-xl px-3 py-2.5 text-[11px] font-semibold leading-snug">
                                        <Info size={14} className="shrink-0 mt-0.5" />
                                        <span>Tu navegador no soporta notificaciones push. Podrás ver la bandeja desde esta página de todos modos.</span>
                                    </div>
                                ) : pushState.enabled ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 text-[#059669] dark:text-[#10b981] text-xs font-bold">
                                            <Bell size={15} />
                                            <span>Notificaciones del navegador activadas</span>
                                        </div>
                                        <button
                                            onClick={togglePush}
                                            disabled={pushState.checking}
                                            className="flex items-center justify-center gap-2 bg-[#F4F5F7] hover:bg-[#EBECF0] dark:bg-[#0E1624] dark:hover:bg-[#2E3C50] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-60"
                                        >
                                            <BellOff size={15} />
                                            <span>{pushState.checking ? 'Procesando...' : 'Desactivar notificaciones'}</span>
                                        </button>
                                    </div>
                                ) : pushPermission === 'denied' ? (
                                    <div className="flex items-start gap-2 bg-[#FFEBE6]/60 dark:bg-[#450A0A]/40 border border-red-300/50 dark:border-red-700/40 text-[#BF2600] dark:text-[#FF6369] rounded-xl px-3 py-2.5 text-[11px] font-semibold leading-snug">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>El permiso de notificaciones está bloqueado por tu navegador. Habilítalo desde la configuración del sitio (icono de candado) y vuelve a intentar.</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={togglePush}
                                        disabled={pushState.checking}
                                        className="flex items-center justify-center gap-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer w-full disabled:opacity-60"
                                    >
                                        <Bell size={16} />
                                        <span>{pushState.checking ? 'Activando...' : 'Activar notificaciones del navegador'}</span>
                                    </button>
                                )}

                                {pushState.lastError && !pushState.enabled && (
                                    <div className="mt-3 flex items-start gap-2 bg-[#FFEBE6]/60 dark:bg-[#450A0A]/40 border border-red-300/50 dark:border-red-700/40 text-[#BF2600] dark:text-[#FF6369] rounded-xl px-3 py-2.5 text-[11px] font-semibold leading-snug">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>{getFriendlyPushError(pushState.lastError.reason)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Preferencias por tipo */}
                            <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs p-5 sm:p-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck size={18} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-[#172B4D] dark:text-slate-100">Qué notificaciones recibir</h3>
                                </div>
                                <p className="text-[11px] sm:text-xs text-[#5E6C84] dark:text-slate-400 mb-2 leading-relaxed">
                                    Se aplican tanto a la bandeja como a las alertas del navegador.
                                </p>

                                <div className="divide-y divide-[#DFE1E6]/60 dark:divide-[#3E4C5E]/60">
                                    <ToggleSwitch
                                        label={NOTIFICATION_TYPES.comment.label}
                                        checked={Boolean(preferences?.comment_enabled)}
                                        onChange={() => updatePreferences({ comment_enabled: !preferences?.comment_enabled })}
                                    />
                                    <ToggleSwitch
                                        label={NOTIFICATION_TYPES.reply.label}
                                        checked={Boolean(preferences?.reply_enabled)}
                                        onChange={() => updatePreferences({ reply_enabled: !preferences?.reply_enabled })}
                                    />
                                    <ToggleSwitch
                                        label={NOTIFICATION_TYPES.like.label}
                                        checked={Boolean(preferences?.like_enabled)}
                                        onChange={() => updatePreferences({ like_enabled: !preferences?.like_enabled })}
                                    />
                                    <ToggleSwitch
                                        label={NOTIFICATION_TYPES.new_post.label}
                                        checked={Boolean(preferences?.new_post_enabled)}
                                        onChange={() => updatePreferences({ new_post_enabled: !preferences?.new_post_enabled })}
                                    />
                                </div>

                                {preferences?.new_post_enabled && (
                                    <div className="mt-3 pt-3 border-t border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60">
                                        <button
                                            type="button"
                                            onClick={() => setShowCarreras(prev => !prev)}
                                            className="text-[11px] font-bold text-[#0052CC] dark:text-[#4C9AFF] cursor-pointer bg-transparent border-none flex items-center gap-1"
                                        >
                                            <span>Elige las carreras a seguir</span>
                                            <span className={`transition-transform duration-200 ${showCarreras ? 'rotate-180' : ''}`}>▾</span>
                                        </button>
                                        {showCarreras && (
                                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                {CARRERAS.map(c => {
                                                    const selected = Array.isArray(preferences?.carreras) && preferences.carreras.includes(c.id);
                                                    return (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => toggleCarrera(c.id)}
                                                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                                                                selected
                                                                    ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/30 dark:border-[#4C9AFF]/30'
                                                                    : 'bg-[#F4F5F7] dark:bg-[#0E1624] text-[#42526E] dark:text-slate-300 border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 hover:bg-[#EBECF0] dark:hover:bg-[#2E3C50]'
                                                            }`}
                                                        >
                                                            {c.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p className="text-[10px] text-[#7A869A] dark:text-slate-500 mt-2 leading-snug">
                                            Recibirás un aviso cuando alguien publique en estas áreas. "Todas las Carreras" cubre todo el foro.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bandeja de notificaciones */}
                        <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs overflow-hidden">
                            <div className="flex items-center justify-between gap-3 p-5 sm:p-6 pb-4 border-b border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60">
                                <div>
                                    <h3 className="text-sm sm:text-base font-extrabold text-[#172B4D] dark:text-slate-100">Bandeja de notificaciones</h3>
                                    <p className="text-[11px] sm:text-xs text-[#5E6C84] dark:text-slate-400 mt-0.5">
                                        Se muestran las últimas 20 y se eliminan automáticamente después de 3 meses.
                                    </p>
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#0052CC] hover:underline dark:text-[#4C9AFF] bg-transparent border-none cursor-pointer shrink-0"
                                    >
                                        <CheckCheck size={14} />
                                        <span>Marcar todas como leídas</span>
                                    </button>
                                )}
                            </div>

                            {notifications.length === 0 ? (
                                <EmptyState
                                    icon={Bell}
                                    title="Sin notificaciones todavía"
                                    description="Cuando alguien comente, responda o dé me gusta a tus publicaciones (o se publique en las carreras que sigues), aquí verás el aviso."
                                    actionLabel="Ir al foro"
                                    onAction={() => navigate('/foro')}
                                />
                            ) : (
                                <ul className="divide-y divide-[#DFE1E6]/60 dark:divide-[#3E4C5E]/60">
                                    {notifications.map(n => {
                                        const Icon = TYPE_ICONS[n.type] || Bell;
                                        const color = TYPE_COLORS[n.type] || TYPE_COLORS.comment;
                                        const isUnread = !n.read_at;
                                        return (
                                            <li key={n.id} className="group">
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleOpenNotification(n)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleOpenNotification(n);
                                                        }
                                                    }}
                                                    className={`w-full text-left flex items-start gap-3 p-4 sm:p-5 cursor-pointer transition ${isUnread ? 'bg-[#F4F5F7]/70 dark:bg-[#0E1624]/40' : 'hover:bg-[#F4F5F7]/50 dark:hover:bg-[#0E1624]/30'} ${n.post_id ? '' : 'cursor-default'}`}
                                                >
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                                                        <Icon size={17} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs sm:text-sm font-extrabold text-[#172B4D] dark:text-slate-100 truncate">
                                                                {n.title}
                                                            </p>
                                                            <span className="text-[10px] text-[#7A869A] dark:text-slate-500 font-semibold shrink-0">
                                                                {formatTimeAgo(n.created_at)}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] sm:text-xs text-[#42526E] dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                                                            {n.body}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            {n.type === 'new_post' && (
                                                                <Link
                                                                    to={`/foro?post=${n.post_id}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="text-[10px] font-bold text-[#0052CC] dark:text-[#4C9AFF] hover:underline no-underline"
                                                                >
                                                                    Ver publicación →
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isUnread && (
                                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF] shrink-0 mt-2" title="Sin leer" />
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeNotification(n.id);
                                                        }}
                                                        className="shrink-0 p-1.5 rounded-lg text-[#7A869A] dark:text-slate-500 hover:text-[#BF2600] dark:hover:text-[#FF6369] hover:bg-[#FFEBE6] dark:hover:bg-[#450A0A]/50 transition cursor-pointer bg-transparent border-none opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                                                        title="Eliminar notificación"
                                                        aria-label="Eliminar notificación"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {user && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#7A869A] dark:text-slate-400 hover:text-[#BF2600] dark:hover:text-[#FF6369] bg-transparent border-none cursor-pointer"
                                >
                                    <LogOut size={13} />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
