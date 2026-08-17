import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart3, MessageSquare, ThumbsUp, Users, Clock, Trash2, ExternalLink,
    ShieldCheck, LogOut, AlertTriangle, Info, Plus, CornerDownRight, Activity, EyeOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getModerationInfo, isContentBlocked } from '../lib/moderation';
import { hideContent } from '../lib/moderationApi';
import { useTheme } from '../theme/ThemeContext';
import Seo from '../components/seo/Seo';
import SimpleBars from '../components/charts/SimpleBars';
import { Card, EmptyState, Button } from '../components/ui';

export default function MyPosts() {
    const { isDarkMode } = useTheme();
    const [user, setUser] = useState(null);

    const [myPosts, setMyPosts] = useState([]);
    const [myComments, setMyComments] = useState([]);
    const [likesOnMyPosts, setLikesOnMyPosts] = useState([]);
    const [commentsOnMyPosts, setCommentsOnMyPosts] = useState([]);
    const [repliesToMyComments, setRepliesToMyComments] = useState([]);
    const [loading, setLoading] = useState(false);

    const [savedAlias] = useState(() => localStorage.getItem('pemtree_forum_alias') || '');
    const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [customConfirm, setCustomConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showAlert = useCallback((title, message, type = 'info') => {
        setCustomAlert({ isOpen: true, title, message, type });
    }, []);

    const showConfirm = useCallback((title, message, onConfirm) => {
        setCustomConfirm({ isOpen: true, title, message, onConfirm });
    }, []);

    const activeAlias = useMemo(() => {
        if (savedAlias && savedAlias.trim()) return savedAlias.trim();
        const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
        if (name && name.trim()) {
            const initials = name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase();
            const idCode = user.id ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
            return `Estudiante ${initials} #${idCode}`;
        }
        const idCode = user?.id ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
        return `Estudiante #${idCode}`;
    }, [savedAlias, user]);

    const checkUser = useCallback((sessionUser) => {
        setUser(sessionUser ?? null);
        if (!sessionUser) {
            setMyPosts([]);
            setMyComments([]);
            setLikesOnMyPosts([]);
            setCommentsOnMyPosts([]);
            setRepliesToMyComments([]);
        }
    }, []);

    const loadData = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase || !user) return;
        setLoading(true);
        try {
            const { data: postsData } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            setMyPosts((postsData || []).filter(p => !isContentBlocked(p.moderation_status)));

            const { data: commentsData } = await supabase
                .from('comments')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });
            setMyComments(commentsData || []);

            const postIds = (postsData || []).map(p => p.id);
            const commentIds = (commentsData || []).map(c => c.id);

            let likes = [];
            let commentsReceived = [];
            let replies = [];

            if (postIds.length > 0) {
                const [likesRes, commentsRes] = await Promise.all([
                    supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
                    supabase.from('comments').select('*').in('post_id', postIds).order('created_at', { ascending: false })
                ]);
                likes = likesRes.data || [];
                commentsReceived = commentsRes.data || [];
            }
            if (commentIds.length > 0) {
                const repliesRes = await supabase.from('comments').select('*').in('parent_id', commentIds);
                replies = repliesRes.data || [];
            }

            setLikesOnMyPosts(likes);
            setCommentsOnMyPosts(commentsReceived);
            setRepliesToMyComments(replies);
        } catch (err) {
            console.error('Error cargando mis publicaciones:', err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

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

    useEffect(() => {
        if (user) {
            queueMicrotask(() => { loadData(); });
        }
    }, [user, loadData]);

    const handleGoogleLogin = async () => {
        if (!isSupabaseConfigured || !supabase) {
            showAlert('Inicio de sesión temporalmente deshabilitado', 'El servicio de autenticación se encuentra en mantenimiento en este momento. Por favor, intenta más tarde.', 'warning');
            return;
        }
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/mis-publicaciones',
                    queryParams: { prompt: 'select_account' }
                }
            });
        } catch (err) {
            console.error('Error al iniciar sesión con Google:', err);
        }
    };

    const handleLogout = async () => {
        if (supabase) await supabase.auth.signOut();
        setUser(null);
    };

    const handleHidePost = (postId) => {
        const target = myPosts.find(p => p.id === postId);
        if (!target) return;
        showConfirm(
            '¿Ocultar publicación?',
            `¿Confirmas que deseas ocultar tu publicación «${target.title}»? Quedará oculta para la comunidad y para ti. Una vez oculta, solo el equipo de administración o un moderador podrá restaurarla.`,
            async () => {
                if (!isSupabaseConfigured || !supabase) return;
                try {
                    await hideContent('posts', postId, null);
                    await loadData();
                } catch (err) {
                    console.error('Error al ocultar publicación:', err);
                    showAlert('No se pudo ocultar', 'Ocurrió un problema al ocultar la publicación. Por favor, inténtalo de nuevo.', 'error');
                }
            }
        );
    };

    // Interacciones de OTROS participantes (excluyendo al usuario actual)
    const commentsFromOthers = useMemo(() => {
        if (!user) return [];
        return (commentsOnMyPosts || []).filter(c => c.user_id !== user.id);
    }, [commentsOnMyPosts, user]);

    const repliesFromOthers = useMemo(() => {
        if (!user) return [];
        return (repliesToMyComments || []).filter(c => c.user_id !== user.id);
    }, [repliesToMyComments, user]);

    const likersFromOthers = useMemo(() => {
        if (!user) return [];
        return (likesOnMyPosts || []).filter(l => l.user_id !== user.id);
    }, [likesOnMyPosts, user]);

    const kpis = useMemo(() => {
        const participantsMap = new Map();
        const addParticipant = (uid, alias) => {
            const key = uid || alias || 'anon';
            const cur = participantsMap.get(key) || { alias: alias || 'Participante', count: 0 };
            cur.count += 1;
            participantsMap.set(key, cur);
        };
        commentsFromOthers.forEach(c => addParticipant(c.user_id, c.author_alias));
        repliesFromOthers.forEach(c => addParticipant(c.user_id, c.author_alias));
        likersFromOthers.forEach(l => addParticipant(l.user_id, null));
        const participants = Array.from(participantsMap.values()).sort((a, b) => b.count - a.count);
        return {
            totalPosts: myPosts.length,
            totalMyComments: myComments.length,
            totalLikesReceived: likersFromOthers.length,
            totalCommentsReceived: commentsFromOthers.length,
            totalRepliesReceived: repliesFromOthers.length,
            participants
        };
    }, [myPosts, myComments, commentsFromOthers, repliesFromOthers, likersFromOthers]);

    const likesPerPostData = useMemo(() => {
        return myPosts
            .map(p => ({ label: p.title || 'Sin título', value: p.likes || 0, id: p.id }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [myPosts]);

    const commentsPerPostData = useMemo(() => {
        const byPost = {};
        commentsFromOthers.forEach(c => {
            byPost[c.post_id] = (byPost[c.post_id] || 0) + 1;
        });
        return myPosts
            .map(p => ({ label: p.title || 'Sin título', value: byPost[p.id] || 0, id: p.id }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [myPosts, commentsFromOthers]);

    const activityData = useMemo(() => {
        const weeks = 8;
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);

        const buckets = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const startWeek = new Date(start);
            startWeek.setDate(startWeek.getDate() - i * 7);
            const endWeek = new Date(startWeek);
            endWeek.setDate(endWeek.getDate() + 7);
            buckets.push({
                startTs: startWeek.getTime(),
                endTs: endWeek.getTime(),
                label: startWeek.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' }),
                value: 0
            });
        }
        const countEvent = (dateStr) => {
            if (!dateStr) return;
            const t = new Date(dateStr).getTime();
            const bucket = buckets.find(b => t >= b.startTs && t < b.endTs);
            if (bucket) bucket.value += 1;
        };
        myPosts.forEach(p => countEvent(p.created_at));
        myComments.forEach(c => countEvent(c.created_at));
        return buckets.map(({ label, value }) => ({ label, value }));
    }, [myPosts, myComments]);

    const participantsBarData = useMemo(() => {
        return kpis.participants.slice(0, 6).map(p => ({ label: p.alias, value: p.count }));
    }, [kpis.participants]);

    const recentInteractions = useMemo(() => {
        const postTitle = (postId) => myPosts.find(p => p.id === postId)?.title || 'una publicación';
        const events = [];
        commentsFromOthers.forEach(c => events.push({
            id: 'c-' + c.id,
            createdAt: c.created_at,
            type: 'comment',
            icon: MessageSquare,
            text: `${c.author_alias || 'Alguien'} comentó en tu publicación «${postTitle(c.post_id)}»`,
            content: c.content
        }));
        repliesFromOthers.forEach(r => {
            const parentComment = myComments.find(mc => mc.id === r.parent_id);
            const postId = parentComment?.post_id || r.post_id;
            events.push({
                id: 'r-' + r.id,
                createdAt: r.created_at,
                type: 'reply',
                icon: CornerDownRight,
                text: `${r.author_alias || 'Alguien'} respondió a tu comentario en «${postTitle(postId)}»`,
                content: r.content
            });
        });
        likersFromOthers.forEach(l => events.push({
            id: 'l-' + l.post_id + '-' + l.user_id,
            createdAt: l.created_at || myPosts.find(p => p.id === l.post_id)?.created_at,
            type: 'like',
            icon: ThumbsUp,
            text: `A un participante le gustó tu publicación «${postTitle(l.post_id)}»`,
            content: ''
        }));
        return events
            .filter(e => e.createdAt)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
    }, [commentsFromOthers, repliesFromOthers, likersFromOthers, myPosts, myComments]);

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

    const kpiCards = [
        { label: 'Publicaciones', value: kpis.totalPosts, icon: MessageSquare, color: 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' },
        { label: 'Comentarios míos', value: kpis.totalMyComments, icon: CornerDownRight, color: 'text-[#0284C7] dark:text-[#38BDF8] bg-sky-50 dark:bg-[#0C3E5F]' },
        { label: 'Me gusta recibidos', value: kpis.totalLikesReceived, icon: ThumbsUp, color: 'text-[#D97706] dark:text-[#FBBF24] bg-[#FFF3C4] dark:bg-[#422006]' },
        { label: 'Comentarios recibidos', value: kpis.totalCommentsReceived, icon: MessageSquare, color: 'text-[#059669] dark:text-[#10B981] bg-[#E3FCEF] dark:bg-[#0A3622]' },
        { label: 'Respuestas a mis comentarios', value: kpis.totalRepliesReceived, icon: Users, color: 'text-[#7C3AED] dark:text-[#B8ACFF] bg-[#F3E8FF] dark:bg-[#281E5B]' },
        { label: 'Participantes', value: kpis.participants.length, icon: Users, color: 'text-[#BF2600] dark:text-[#FF6369] bg-[#FFEBE6] dark:bg-[#450A0A]' }
    ];

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto w-full bg-[#F4F5F7] dark:bg-[#0F1726] hide-scrollbar select-none">
            <Seo title="Mis Publicaciones" description="Administra tus publicaciones y consulta tus interacciones con la comunidad en el foro de PEMTREE." pathname="/mis-publicaciones" />

            {/* Header Banner */}
            <div className="w-full bg-gradient-to-r from-[#0052CC] to-[#0747A6] dark:from-[#0E1624] dark:to-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-10 px-4 shrink-0 text-white shadow-sm">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 dark:bg-[#4C9AFF]/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                            <BarChart3 size={28} className="text-white dark:text-[#4C9AFF]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Mis Publicaciones</h1>
                                <span className="text-[11px] font-extrabold bg-white/20 dark:bg-[#4C9AFF]/20 text-white dark:text-[#7DD3FC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    Panel de interacción
                                </span>
                            </div>
                            <p className="text-sm text-blue-100 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                                Administra tus publicaciones en el foro y descubre cómo participan los demás estudiantes con tu contenido.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0 justify-start sm:justify-end mt-2 md:mt-0">
                        {user ? (
                            <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 bg-white/15 dark:bg-[#0E1624]/80 px-3.5 py-2 rounded-xl border border-white/20">
                                <div className="flex items-center gap-2 min-w-0">
                                    <ShieldCheck size={16} className="text-[#79F2B8] shrink-0" />
                                    <div className="text-left min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-blue-200 dark:text-slate-400">Sesión Verificada</p>
                                        <p className="text-xs font-extrabold truncate max-w-[130px] sm:max-w-none">{activeAlias}</p>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="p-1.5 hover:bg-white/20 rounded-lg transition text-white cursor-pointer" title="Cerrar sesión">
                                    <LogOut size={15} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleGoogleLogin}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white text-[#172B4D] hover:bg-blue-50 text-xs sm:text-sm font-extrabold px-3.5 sm:px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer border border-transparent hover:scale-[1.02]"
                            >
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>Acceder</span>
                            </button>
                        )}

                        <Link to="/foro" className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition cursor-pointer no-underline border border-white/25">
                            <MessageSquare size={15} />
                            <span>Ir al Foro</span>
                        </Link>
                        {user && (
                            <Link to="/foro" className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer shrink-0 no-underline">
                                <Plus size={16} />
                                <span>Nueva Publicación</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
                {!isSupabaseConfigured || !supabase ? (
                    <Card className="text-center py-16 flex flex-col items-center gap-3">
                        <Info size={36} className="text-[#7A869A] dark:text-slate-400" />
                        <p className="text-sm font-bold text-[#172B4D] dark:text-slate-200">Servicio temporalmente no disponible</p>
                        <p className="text-xs text-[#7A869A] dark:text-slate-400">La conexión con el servidor del foro no está activa en este momento.</p>
                    </Card>
                ) : !user ? (
                    <Card className="text-center py-16 px-6 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center">
                            <BarChart3 size={32} />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-[#172B4D] dark:text-white">Inicia sesión para ver tu panel</h2>
                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 mt-1.5 max-w-md leading-relaxed">
                                Con tu sesión de Google podrás administrar tus publicaciones y consultar las interacciones que otros estudiantes tienen con tu contenido.
                            </p>
                        </div>
                        <button
                            onClick={handleGoogleLogin}
                            className="flex items-center gap-2 bg-white dark:bg-[#1C2636] text-[#172B4D] dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#2E3C50] text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl transition shadow-md cursor-pointer border border-[#DFE1E6] dark:border-[#3E4C5E]"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>Acceder con Google</span>
                        </button>
                    </Card>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-3 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-semibold text-[#5E6C84] dark:text-slate-400">Cargando tu panel...</span>
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {kpiCards.map(kpi => (
                                <Card key={kpi.label} padding="p-3.5" className="flex flex-col gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                                        <kpi.icon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xl font-extrabold text-[#172B4D] dark:text-white leading-none">{kpi.value}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A869A] dark:text-slate-400 mt-1">{kpi.label}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Charts row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <ThumbsUp size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">Me gusta por publicación</h3>
                                </div>
                                <SimpleBars data={likesPerPostData} isDark={isDarkMode} emptyText="Todavía no has recibido me gusta." />
                            </Card>
                            <Card className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">Comentarios recibidos por publicación</h3>
                                </div>
                                <SimpleBars data={commentsPerPostData} isDark={isDarkMode} emptyText="Aún no has recibido comentarios." />
                            </Card>
                        </div>

                        {/* Charts row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Clock size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">Mi actividad (últimas 8 semanas)</h3>
                                </div>
                                <SimpleBars data={activityData} orientation="vertical" height={180} isDark={isDarkMode} emptyText="Aún no tienes actividad." />
                            </Card>
                            <Card className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Users size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">Participantes más activos</h3>
                                </div>
                                <SimpleBars data={participantsBarData} isDark={isDarkMode} emptyText="Aún nadie ha interactuado con tu contenido." />
                            </Card>
                        </div>

                        {/* Interacciones recientes */}
                        <Card className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <Activity size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">Interacciones recientes de otros estudiantes</h3>
                                </div>
                                <span className="text-[10px] font-bold text-[#7A869A] dark:text-slate-400">Últimas {recentInteractions.length}</span>
                            </div>
                            {recentInteractions.length === 0 ? (
                                <p className="text-xs italic text-[#7A869A] dark:text-slate-400 py-3 text-center">
                                    Aún no hay interacciones de otros participantes con tu contenido.
                                </p>
                            ) : (
                                <div className="flex flex-col divide-y divide-[#DFE1E6]/60 dark:divide-[#3E4C5E]/60">
                                    {recentInteractions.map(item => (
                                        <div key={item.id} className="py-2.5 flex items-start gap-3">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                item.type === 'like'
                                                    ? 'bg-[#FFF3C4] dark:bg-[#422006] text-[#D97706] dark:text-[#FBBF24]'
                                                    : 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]'
                                            }`}>
                                                <item.icon size={14} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-[#172B4D] dark:text-slate-200 leading-snug">{item.text}</p>
                                                {item.content && (
                                                    <p className="text-[11px] text-[#7A869A] dark:text-slate-400 mt-0.5 line-clamp-2 whitespace-pre-line">{item.content}</p>
                                                )}
                                                <p className="text-[10px] text-[#7A869A] dark:text-slate-500 mt-0.5 font-semibold">{formatTimeAgo(item.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Mis publicaciones */}
                        <div className="flex flex-col gap-3">
                            <h2 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-white">Mis publicaciones ({myPosts.length})</h2>
                            {myPosts.length === 0 ? (
                                <EmptyState
                                    icon={BarChart3}
                                    title="Aún no has publicado nada en el foro"
                                    description="Crea tu primera consulta o aporte para comenzar a recibir interacciones de la comunidad."
                                    actionLabel="Ir al Foro"
                                    onAction={() => { window.location.href = '/foro'; }}
                                />
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {myPosts.map(post => {
                                        const modInfo = getModerationInfo(post.moderation_status);
                                        const postCommentsCount = (commentsOnMyPosts || []).filter(c => c.post_id === post.id).length;
                                        return (
                                            <Card key={post.id} className="flex flex-col gap-2.5">
                                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-sm sm:text-base font-extrabold text-[#172B4D] dark:text-slate-100 leading-snug">{post.title}</h3>
                                                            {modInfo && (
                                                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                                                    modInfo.type === 'pending'
                                                                        ? 'bg-[#FFF3C4] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50'
                                                                        : modInfo.type === 'blocked'
                                                                            ? 'bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50'
                                                                            : 'bg-[#FFF0B3] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50'
                                                                }`}>
                                                                    {modInfo.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {post.content && (
                                                            <p className="text-xs text-[#42526E] dark:text-slate-300 mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">{post.content}</p>
                                                        )}
                                                        {modInfo && modInfo.type === 'blocked' && (
                                                            <div className="flex items-start gap-1.5 bg-[#FFEBE6] dark:bg-[#450A0A]/40 border border-red-200/60 dark:border-[#FF6369]/30 text-[#BF2600] dark:text-[#FF6369] rounded-lg px-2 py-1 text-[10px] font-semibold leading-snug mt-1.5">
                                                                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                                                                <span>Esta publicación fue rechazada por el sistema de moderación y está oculta para el resto de la comunidad.</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold text-[#7A869A] dark:text-slate-400 flex-wrap">
                                                            <span className="flex items-center gap-1"><Clock size={11} /> {formatTimeAgo(post.created_at)}</span>
                                                            <span className="flex items-center gap-1"><ThumbsUp size={11} /> {post.likes || 0} me gusta</span>
                                                            <span className="flex items-center gap-1"><MessageSquare size={11} /> {postCommentsCount} comentarios</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Link to="/foro" className="p-2 rounded-lg text-[#7A869A] hover:text-[#0052CC] dark:text-slate-400 dark:hover:text-[#4C9AFF] hover:bg-[#DEEBFF] dark:hover:bg-[#0C295E] transition cursor-pointer" title="Ver en el foro">
                                                            <ExternalLink size={15} />
                                                        </Link>
                                                        <button onClick={() => handleHidePost(post.id)} className="p-2 rounded-lg text-[#7A869A] hover:text-[#B45309] dark:text-slate-400 dark:hover:text-[#FBBF24] hover:bg-amber-500/10 transition cursor-pointer" title="Ocultar publicación">
                                                            <EyeOff size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Alerts */}
            {customAlert.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                            customAlert.type === 'error' ? 'bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369]' :
                            customAlert.type === 'warning' ? 'bg-[#FFF0B3] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24]' :
                            customAlert.type === 'success' ? 'bg-[#E3FCEF] dark:bg-[#0A3622] text-[#059669] dark:text-[#10b981]' :
                            'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]'
                        }`}>
                            {customAlert.type === 'error' ? <AlertTriangle size={28} /> : <Info size={28} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">{customAlert.title}</h3>
                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed mt-1">{customAlert.message}</p>
                        </div>
                        <Button variant="primary" onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))} className="w-full mt-1">
                            Entendido
                        </Button>
                    </div>
                </div>
            )}

            {customConfirm.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369] flex items-center justify-center">
                            <Trash2 size={28} />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-[#172B4D] dark:text-white">{customConfirm.title}</h3>
                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed mt-1">{customConfirm.message}</p>
                        </div>
                        <div className="flex items-center gap-3 w-full mt-1">
                            <Button variant="secondary" onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))} className="flex-grow">
                                Cancelar
                            </Button>
                            <Button variant="danger" onClick={() => {
                                const callback = customConfirm.onConfirm;
                                setCustomConfirm(prev => ({ ...prev, isOpen: false }));
                                if (callback) callback();
                            }} className="flex-grow">
                                Eliminar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
