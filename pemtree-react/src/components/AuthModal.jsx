import { useState, useEffect, useCallback } from 'react';
import {
    ThumbsUp, ShieldCheck, LogOut,
    Sparkles, AlertTriangle, User
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

    const handleGoogleLogin = async () => {
        if (!isSupabaseConfigured || !supabase) {
            setErrorMsg('El servicio de autenticación se encuentra temporalmente en mantenimiento. Por favor, intenta más tarde.');
            return;
        }
        setLoading(true);
        setErrorMsg(null);
        try {
            const redirectUrl = window.location.origin + window.location.pathname;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: { prompt: 'select_account' }
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error('Error al iniciar sesión con Google:', err);
            setErrorMsg(err.message || 'Ocurrió un error al conectar con Google.');
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
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-[#1C2636] hover:bg-slate-50 dark:hover:bg-[#253245] text-[#172B4D] dark:text-slate-100 border-2 border-[#DFE1E6] dark:border-[#3E4C5E] font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>{loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
