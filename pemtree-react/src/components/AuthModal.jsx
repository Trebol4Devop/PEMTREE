import { useState, useEffect, useCallback } from 'react';
import {
    ThumbsUp, ShieldCheck, LogOut,
    Sparkles, AlertTriangle, User
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initiateCommunityLogin } from '../lib/communityAuth';
import { Modal, Button } from './ui';

export default function AuthModal({ isOpen, onClose }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const checkUser = useCallback((sessionUser) => {
        setUser(sessionUser ?? null);
    }, []);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkUser(session?.user || null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            checkUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, [checkUser]);

    const handleCommunityLogin = () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            initiateCommunityLogin();
        } catch (err) {
            console.error('Error al redirigir al portal de la comunidad:', err);
            setErrorMsg(err.message || 'No se pudo conectar con el portal de autenticación.');
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            if (supabase) await supabase.auth.signOut();
            setUser(null);
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
        } finally {
            setLoading(false);
        }
    };

    const userMetadata = user?.user_metadata || {};
    const displayName = userMetadata.full_name || userMetadata.name || userMetadata.display_name || user?.email || 'Estudiante';
    const email = user?.email || '';
    const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Mi Cuenta · Recomendaciones' : 'Sistema de Recomendaciones'}
            icon={ThumbsUp}
            size="md"
        >
            <div className="flex flex-col gap-4">
                {errorMsg && (
                    <div className="flex items-start gap-2.5 bg-[#FFEBE6] dark:bg-[#450A0A]/50 border border-red-200 dark:border-[#FF6369]/30 text-[#BF2600] dark:text-[#FF6369] p-3 rounded-xl text-xs font-semibold leading-relaxed">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {user ? (
                    // Estado de sesión activa
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#FAFBFC] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E]">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-12 h-12 rounded-full border-2 border-[#0052CC] dark:border-[#4C9AFF] object-cover shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center font-extrabold text-base shrink-0">
                                    <User size={22} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-extrabold text-sm sm:text-base text-[#172B4D] dark:text-white truncate">
                                        {displayName}
                                    </h3>
                                    <ShieldCheck size={16} className="text-[#059669] dark:text-[#10B981] shrink-0" title="Sesión activa verificada" />
                                </div>
                                {email && (
                                    <p className="text-xs text-[#5E6C84] dark:text-slate-400 truncate mt-0.5">
                                        {email}
                                    </p>
                                )}
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-[#059669] dark:text-[#10B981] bg-[#E3FCEF] dark:bg-[#0A3622] px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Listo para opinar
                                </span>
                            </div>
                        </div>

                        <div className="bg-[#DEEBFF]/50 dark:bg-[#0C295E]/40 border border-[#0052CC]/20 dark:border-[#4C9AFF]/20 rounded-xl p-3.5 text-xs text-[#172B4D] dark:text-slate-200 flex flex-col gap-2 leading-relaxed">
                            <div className="flex items-center gap-2 font-bold text-[#0052CC] dark:text-[#4C9AFF]">
                                <Sparkles size={14} className="shrink-0" />
                                <span>¿Cómo participar en las recomendaciones?</span>
                            </div>
                            <p className="text-[#5E6C84] dark:text-slate-300">
                                En el <strong>Armador de Horarios</strong> y en el <strong>Planificador</strong> encontrarás los botones de recomendación en cada sección disponible.
                            </p>
                            <p className="text-[#5E6C84] dark:text-slate-400 text-[11px]">
                                Tus calificaciones son anónimas frente a otros estudiantes y se suman al porcentaje general de la sección para orientar a la comunidad.
                            </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="text-xs"
                            >
                                Cerrar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleLogout}
                                disabled={loading}
                                className="text-xs flex items-center gap-1.5"
                            >
                                <LogOut size={13} />
                                <span>Cerrar sesión</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Estado sin iniciar sesión
                    <div className="flex flex-col gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center mx-auto mb-2.5">
                                <ThumbsUp size={24} />
                            </div>
                            <h3 className="font-extrabold text-base sm:text-lg text-[#172B4D] dark:text-white">
                                Califica y recomienda secciones
                            </h3>
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                                Inicia sesión con tu cuenta de Google para compartir tu experiencia y ayudar a otros estudiantes a elegir las mejores secciones de cada curso.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 p-3 bg-[#FAFBFC] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl text-xs text-[#5E6C84] dark:text-slate-300">
                            <div className="flex items-start gap-2">
                                <ThumbsUp size={14} className="text-[#059669] dark:text-[#10B981] shrink-0 mt-0.5" />
                                <span><strong>Vota en tiempo real:</strong> Recomienda secciones en el Armador de Horarios y Planificador.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <ShieldCheck size={14} className="text-[#0052CC] dark:text-[#4C9AFF] shrink-0 mt-0.5" />
                                <span><strong>Privacidad garantizada:</strong> Tu voto es anónimo ante otros estudiantes; no se publican comentarios ni nombres personales.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Sparkles size={14} className="text-[#D97706] dark:text-[#FBBF24] shrink-0 mt-0.5" />
                                <span><strong>Comunidad estudiantil:</strong> Consulta el porcentaje de satisfacción antes de asignarte tus cursos.</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCommunityLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 bg-[#0052CC] hover:bg-[#0747A6] active:scale-[0.98] text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            <User size={16} className="shrink-0" />
                            <span>{loading ? 'Redirigiendo a la Comunidad...' : 'Iniciar sesión con la Comunidad'}</span>
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
