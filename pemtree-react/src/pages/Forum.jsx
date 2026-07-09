import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    MessageSquare, Plus, Search, ThumbsUp, User, ShieldCheck, 
    Send, LogOut, ChevronDown, BookOpen, Clock, Trash2, Edit3,
    AlertCircle, Info, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { moderateSubmission, checkCooldown, updateCooldown } from '../lib/moderation';

const CATEGORIES = [
    { id: 'todos', label: 'Todas las áreas' },
    { id: 'prerrequisitos', label: 'Prerrequisitos & Pensum' },
    { id: 'catedraticos', label: 'Catedráticos & Auxiliares' },
    { id: 'horarios', label: 'Horarios & Secciones' },
    { id: 'apuntes', label: 'Apuntes & Exámenes' },
    { id: 'general', label: 'Consultas Generales' }
];

export default function Forum() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userLikes, setUserLikes] = useState([]); // Array con los IDs de posts a los que el usuario dio like
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'likes'
    
    // UI state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [customConfirm, setCustomConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showAlert = useCallback((title, message, type = 'info') => {
        setCustomAlert({ isOpen: true, title, message, type });
    }, []);

    const showConfirm = useCallback((title, message, onConfirm) => {
        setCustomConfirm({ isOpen: true, title, message, onConfirm });
    }, []);
    
    // New post form
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('prerrequisitos');
    const [newContent, setNewContent] = useState('');
    
    // Profile / Pseudonym state
    const [savedAlias, setSavedAlias] = useState(() => localStorage.getItem('pemtree_forum_alias') || '');
    const [profileInputText, setProfileInputText] = useState('');
    
    // New comment form per post
    const [commentTexts, setCommentTexts] = useState({});

    const fetchSupabasePosts = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) return;
        await Promise.resolve();
        setLoading(true);
        try {
            const { data: postsData, error: postsErr } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (postsErr) throw postsErr;

            if (postsData) {
                const { data: commentsData } = await supabase
                    .from('comments')
                    .select('*')
                    .order('created_at', { ascending: true });

                const formatted = postsData.map(p => ({
                    ...p,
                    comments: (commentsData || []).filter(c => c.post_id === p.id)
                }));
                setPosts(formatted);
            }
        } catch (err) {
            console.error('Error cargando posts de Supabase:', err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUserLikes = useCallback(async (userId) => {
        if (!isSupabaseConfigured || !supabase || !userId) {
            setUserLikes([]);
            return;
        }
        try {
            const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', userId);
            if (data) setUserLikes(data.map(item => item.post_id));
        } catch (err) {
            console.error('Error cargando likes:', err.message);
        }
    }, []);

    const checkAndPromptProfile = useCallback((u) => {
        if (!u) return;
        const existing = localStorage.getItem('pemtree_forum_alias');
        if (existing && existing.trim()) {
            setSavedAlias(existing.trim());
        } else {
            const initials = u.user_metadata?.full_name ? u.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'USAC';
            const idCode = u.id ? Math.abs(u.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
            const suggestion = `Estudiante ${initials} #${idCode}`;
            setProfileInputText(suggestion);
            setIsProfileModalOpen(true);
        }
    }, []);

    useEffect(() => {
        if (isSupabaseConfigured && supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const u = session?.user || null;
                setUser(u);
                if (u) {
                    fetchUserLikes(u.id);
                    checkAndPromptProfile(u);
                }
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                const u = session?.user || null;
                setUser(u);
                if (u) {
                    fetchUserLikes(u.id);
                    checkAndPromptProfile(u);
                } else {
                    setUserLikes([]);
                }
            });

            queueMicrotask(() => {
                fetchSupabasePosts();
            });

            return () => subscription.unsubscribe();
        }
    }, [fetchSupabasePosts, fetchUserLikes, checkAndPromptProfile]);

    const handleGoogleLogin = async () => {
        if (!isSupabaseConfigured || !supabase) {
            showAlert('Configuración requerida', 'Para iniciar sesión con Google, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env con tu proyecto de Supabase.', 'warning');
            return;
        }
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/foro',
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });
        } catch (err) {
            console.error('Error al iniciar sesión con Google:', err);
        }
    };

    const handleLogout = async () => {
        if (supabase) {
            await supabase.auth.signOut();
            setUser(null);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const trimmed = profileInputText.trim();
        if (!trimmed) return;

        // Moderar y censurar groserías en el alias antes de guardarlo
        const modResult = moderateSubmission({ title: trimmed, content: '' });
        if (!modResult.valid) {
            showAlert('Seudónimo no válido', modResult.reason, 'error');
            return;
        }
        const cleanAlias = modResult.censoredTitle;

        localStorage.setItem('pemtree_forum_alias', cleanAlias);
        setSavedAlias(cleanAlias);
        setIsProfileModalOpen(false);

        // Propagar el cambio de nombre a todas las publicaciones y comentarios hechos por este usuario en la BD de Supabase
        if (user && isSupabaseConfigured && supabase) {
            try {
                await supabase
                    .from('posts')
                    .update({ author_alias: trimmed })
                    .eq('user_id', user.id);

                await supabase
                    .from('comments')
                    .update({ author_alias: trimmed })
                    .eq('user_id', user.id);

                // Recargar todo desde la BD para que los cambios se reflejen de inmediato
                await fetchSupabasePosts();
            } catch (err) {
                console.error('Error al actualizar alias en la base de datos:', err);
            }
        }
    };

    const activeAlias = useMemo(() => {
        if (savedAlias && savedAlias.trim()) return savedAlias.trim();
        if (user && user.user_metadata?.full_name) {
            const initials = user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
            const idCode = user.id ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
            return `Estudiante ${initials} #${idCode}`;
        }
    }, [savedAlias, user]);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;
        if (!user) {
            showAlert('Acceso necesario', 'Debes iniciar sesión con Google (Anónimo) en la barra superior para poder publicar en la comunidad.', 'warning');
            return;
        }

        // 1. Control de saturación / Cooldown
        const cooldown = checkCooldown('post');
        if (!cooldown.allowed) {
            showAlert('Espera un momento', cooldown.reason, 'warning');
            return;
        }

        // 2. Moderación de contenido (censura de groserías, links prohibidos y spam)
        const modResult = moderateSubmission({ title: newTitle.trim(), content: newContent.trim() });
        if (!modResult.valid) {
            showAlert('Contenido no permitido', modResult.reason, 'error');
            return;
        }

        const newPostObj = {
            title: modResult.censoredTitle,
            category: newCategory,
            content: modResult.censoredContent,
            author_alias: activeAlias,
            likes: 0,
            user_id: user?.id || null,
            created_at: new Date().toISOString()
        };

        if (!isSupabaseConfigured || !supabase) {
            showAlert('Desconectado', 'Supabase no está conectado o sus credenciales faltan en .env.', 'error');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('posts')
                .insert([newPostObj])
                .select();

            if (error) {
                showAlert('Error de publicación', 'Hubo un error en Supabase al publicar: ' + error.message, 'error');
                return;
            }

            if (data && data[0]) {
                updateCooldown('post');
                setPosts(prev => [{ ...data[0], comments: [] }, ...prev]);
                resetModal();
            }
        } catch (err) {
            showAlert('Error de publicación', 'Hubo un error al intentar publicar: ' + err.message, 'error');
        }
    };

    const resetModal = () => {
        setNewTitle('');
        setNewContent('');
        setIsCreateModalOpen(false);
    };

    const handleLike = async (postId) => {
        if (!user) {
            showAlert('Acceso necesario', 'Debes iniciar sesión con Google en la barra superior para votar (dar o quitar Me gusta) en las publicaciones.', 'warning');
            return;
        }
        if (!isSupabaseConfigured || !supabase) return;

        const hasLiked = userLikes.includes(postId);
        const targetPost = posts.find(p => p.id === postId);
        if (!targetPost) return;

        const newLikes = hasLiked ? Math.max(0, (targetPost.likes || 1) - 1) : (targetPost.likes || 0) + 1;

        // Optimistic UI update
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
        if (hasLiked) {
            setUserLikes(prev => prev.filter(id => id !== postId));
            try {
                await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
                await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
            } catch (err) {
                console.error('Error quitando like:', err.message);
            }
        } else {
            setUserLikes(prev => [...prev, postId]);
            try {
                await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }]);
                await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
            } catch (err) {
                console.error('Error guardando like:', err.message);
            }
        }
    };

    const handleDeletePost = async (postId, e) => {
        if (e) e.stopPropagation();
        if (!user) return;
        showConfirm(
            '¿Eliminar publicación?',
            '¿Estás seguro de que deseas eliminar permanentemente tu publicación y todas sus respuestas de la base de datos de Supabase? Esta acción no se puede deshacer.',
            async () => {
                if (isSupabaseConfigured && supabase) {
                    try {
                        const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
                        if (error) {
                            showAlert('Error al eliminar', 'No se pudo eliminar en la base de datos: ' + error.message, 'error');
                            return;
                        }
                        await fetchSupabasePosts();
                    } catch (err) {
                        showAlert('Error al eliminar', 'Hubo un error en la solicitud: ' + err.message, 'error');
                        return;
                    }
                }
                setPosts(prev => prev.filter(p => p.id !== postId));
            }
        );
    };

    const handleDeleteComment = async (postId, commentId, e) => {
        if (e) e.stopPropagation();
        if (!user) return;
        showConfirm(
            '¿Eliminar comentario?',
            '¿Estás seguro de que deseas eliminar permanentemente tu comentario de la base de datos de Supabase?',
            async () => {
                if (isSupabaseConfigured && supabase) {
                    try {
                        const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id);
                        if (error) {
                            showAlert('Error al eliminar', 'No se pudo eliminar en la base de datos: ' + error.message, 'error');
                            return;
                        }
                        await fetchSupabasePosts();
                    } catch (err) {
                        showAlert('Error al eliminar', 'Hubo un error al eliminar: ' + err.message, 'error');
                        return;
                    }
                }
                setPosts(prev => prev.map(p => {
                    if (p.id === postId) {
                        return { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) };
                    }
                    return p;
                }));
            }
        );
    };

    const handleAddComment = async (postId) => {
        const text = (commentTexts[postId] || '').trim();
        if (!text) return;
        if (!user) {
            showAlert('Acceso necesario', 'Debes iniciar sesión con Google (Anónimo) en la barra superior para poder comentar u aportar una respuesta.', 'warning');
            return;
        }
        if (!isSupabaseConfigured || !supabase) return;

        // 1. Control de saturación / Cooldown de comentarios
        const cooldown = checkCooldown('comment');
        if (!cooldown.allowed) {
            showAlert('Espera un momento', cooldown.reason, 'warning');
            return;
        }

        // 2. Moderación de contenido (censura de groserías, links prohibidos y spam)
        const modResult = moderateSubmission({ title: '', content: text });
        if (!modResult.valid) {
            showAlert('Contenido no permitido', modResult.reason, 'error');
            return;
        }

        const newCommentObj = {
            post_id: postId,
            author_alias: activeAlias,
            content: modResult.censoredContent,
            user_id: user?.id || null,
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([newCommentObj])
                .select();

            if (error) {
                showAlert('Error al comentar', 'No se pudo guardar la respuesta: ' + error.message, 'error');
                return;
            }
            if (data && data[0]) {
                updateCooldown('comment');
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), data[0]] } : p));
                setCommentTexts(prev => ({ ...prev, [postId]: '' }));
            }
        } catch (err) {
            showAlert('Error al comentar', 'No se pudo guardar el comentario: ' + err.message, 'error');
        }
    };

    const filteredPosts = posts.filter(p => {
        const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
        const matchesSearch = !searchQuery.trim() || 
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.author_alias.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    }).sort((a, b) => {
        if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

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

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto w-full bg-[#F4F5F7] dark:bg-[#0F1726] hide-scrollbar select-none">
            
            {/* Header Banner */}
            <div className="w-full bg-gradient-to-r from-[#0052CC] to-[#0747A6] dark:from-[#0E1624] dark:to-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-10 px-4 shrink-0 text-white shadow-sm">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 dark:bg-[#4C9AFF]/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                            <MessageSquare size={28} className="text-white dark:text-[#4C9AFF]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Foro Estudiantil</h1>
                                <span className="text-[11px] font-extrabold bg-white/20 dark:bg-[#4C9AFF]/20 text-white dark:text-[#7DD3FC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    Comunidad Anónima
                                </span>
                            </div>
                            <p className="text-sm text-blue-100 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                                Espacio colaborativo para resolver dudas de prerrequisitos, catedráticos y horarios de forma segura. Inicia sesión con Google manteniendo tu identidad protegida tras un alias.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0 justify-start sm:justify-end mt-2 md:mt-0">

                        {user ? (
                            <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 bg-white/15 dark:bg-[#0E1624]/80 px-3.5 py-2 rounded-xl border border-white/20">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-[#79F2B8] shrink-0" />
                                    <div className="text-left min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-blue-200 dark:text-slate-400">Sesión Verificada</p>
                                        <p className="text-xs font-extrabold truncate max-w-[130px] sm:max-w-none">{activeAlias}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => {
                                            setProfileInputText(activeAlias);
                                            setIsProfileModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
                                        title="Editar mi perfil / seudónimo"
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="p-1.5 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
                                        title="Cerrar sesión"
                                    >
                                        <LogOut size={15} />
                                    </button>
                                </div>
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

                        <button
                            onClick={() => {
                                if (!user) {
                                    showAlert('Acceso necesario', 'Debes iniciar sesión con Google en la barra superior para poder crear una consulta o publicación en el foro.', 'warning');
                                    return;
                                }
                                setIsCreateModalOpen(true);
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#79F2B8] hover:bg-[#57D99A] text-[#0A3622] font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer shrink-0"
                        >
                            <Plus size={16} />
                            <span>Crear Publicación</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
                
                {/* Search and Filters Bar */}
                <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-3.5 sm:p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A869A] dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por palabra clave, curso, catedrático o alias..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 placeholder-[#7A869A] dark:placeholder-slate-500 text-xs sm:text-sm font-medium border border-transparent focus:border-[#0052CC] dark:focus:border-[#4C9AFF] focus:outline-none transition"
                        />
                    </div>

                    <div className="flex items-center gap-3 justify-between md:justify-end shrink-0">
                        <div className="flex items-center gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-xl border border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 text-xs font-bold w-full sm:w-auto">
                            <button
                                onClick={() => setSortBy('recent')}
                                className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${sortBy === 'recent' ? 'bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] shadow-xs' : 'text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D]'}`}
                            >
                                <Clock size={13} />
                                <span>Recientes</span>
                            </button>
                            <button
                                onClick={() => setSortBy('likes')}
                                className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${sortBy === 'likes' ? 'bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] shadow-xs' : 'text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D]'}`}
                            >
                                <ThumbsUp size={13} />
                                <span>Populares</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex items-center gap-1.5 sm:gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 sm:pb-1 sm:flex-wrap hide-scrollbar">
                    {CATEGORIES.map(cat => {
                        const active = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer border shrink-0 sm:shrink ${
                                    active
                                        ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/30 dark:border-[#4C9AFF]/30 shadow-xs'
                                        : 'bg-white dark:bg-[#1C2636] text-[#5E6C84] dark:text-slate-300 border-[#DFE1E6] dark:border-[#3E4C5E] hover:bg-[#F4F5F7] dark:hover:bg-[#2E3C50]'
                                }`}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Posts List */}
                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-12 border border-[#DFE1E6] dark:border-[#3E4C5E] text-center flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-semibold text-[#5E6C84] dark:text-slate-400">Cargando consultas de la comunidad...</p>
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-12 border border-[#DFE1E6] dark:border-[#3E4C5E] text-center flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="font-bold text-base text-[#172B4D] dark:text-white">No se encontraron consultas</h3>
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 max-w-md">
                                Sé el primero en hacer una pregunta en esta categoría o intenta con otros términos en la búsqueda.
                            </p>
                            <button
                                onClick={() => {
                                    if (!user) {
                                        showAlert('Acceso necesario', 'Debes iniciar sesión con Google en la barra superior para poder crear una consulta o publicación en el foro.', 'warning');
                                        return;
                                    }
                                    setIsCreateModalOpen(true);
                                }}
                                className="mt-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:text-[#0E1624] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                            >
                                Crear Nueva Publicación
                            </button>
                        </div>
                    ) : (
                        filteredPosts.map(post => {
                            const isExpanded = expandedPostId === post.id;
                            const catLabel = CATEGORIES.find(c => c.id === post.category)?.label || post.category;
                            return (
                                <div 
                                    key={post.id}
                                    className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs hover:border-[#0052CC]/40 dark:hover:border-[#4C9AFF]/40 transition-all overflow-hidden"
                                >
                                    <div className="p-5 sm:p-6 flex flex-col gap-3">
                                        
                                        {/* Meta Header */}
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-[#E0F2FE] dark:bg-[#0C4A6E] text-[#0369A1] dark:text-[#7DD3FC] flex items-center justify-center text-xs font-bold shrink-0">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-xs font-extrabold text-[#172B4D] dark:text-slate-200">
                                                    {post.author_alias}
                                                </span>
                                                <span className="text-[#DFE1E6] dark:text-[#3E4C5E]">•</span>
                                                <span className="text-xs font-semibold text-[#7A869A] dark:text-slate-400">
                                                    {formatTimeAgo(post.created_at)}
                                                </span>
                                                {user && post.user_id === user.id && (
                                                    <button
                                                        onClick={(e) => handleDeletePost(post.id, e)}
                                                        className="text-[#7A869A] hover:text-[#E5484D] dark:hover:text-[#FF6369] p-1 rounded-lg transition cursor-pointer ml-1"
                                                        title="Eliminar mi publicación"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] text-[#42526E] dark:text-[#94A3B8] border border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50">
                                                {catLabel}
                                            </span>
                                        </div>

                                        {/* Title and Content */}
                                        <h3 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-white leading-snug">
                                            {post.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-[#42526E] dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {post.content}
                                        </p>

                                        {/* Actions Footer */}
                                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 mt-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleLike(post.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-bold text-xs cursor-pointer border ${
                                                        userLikes.includes(post.id)
                                                            ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/40 shadow-2xs'
                                                            : 'bg-[#F4F5F7] hover:bg-[#DEEBFF] dark:bg-[#0E1624] dark:hover:bg-[#0C295E] text-[#42526E] hover:text-[#0052CC] dark:text-slate-300 dark:hover:text-[#4C9AFF] border-transparent'
                                                    }`}
                                                >
                                                    <ThumbsUp size={14} />
                                                    <span>{post.likes || 0} Me gusta</span>
                                                </button>

                                                <button
                                                    onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-bold text-xs cursor-pointer border ${
                                                        isExpanded
                                                            ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/30'
                                                            : 'bg-[#F4F5F7] hover:bg-[#EBECF0] dark:bg-[#0E1624] dark:hover:bg-[#2E3C50] text-[#42526E] dark:text-slate-300 border-transparent'
                                                    }`}
                                                >
                                                    <MessageSquare size={14} />
                                                    <span>{(post.comments?.length || 0)} Comentarios</span>
                                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>

                                            <div className="text-[11px] font-semibold text-[#7A869A] dark:text-slate-500 hidden sm:block">
                                                Identidad anónima protegida
                                            </div>
                                        </div>

                                        {/* Comments Expandable Section */}
                                        {isExpanded && (
                                            <div className="mt-2 pt-4 border-t border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-3 bg-[#FAFBFC] dark:bg-[#0E1624]/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-5 sm:p-6">
                                                <div className="text-xs font-bold text-[#172B4D] dark:text-slate-200 mb-1">
                                                    Respuestas de la comunidad ({post.comments?.length || 0})
                                                </div>

                                                {(post.comments || []).length === 0 ? (
                                                    <p className="text-xs italic text-[#7A869A] dark:text-slate-400 py-2">
                                                        Aún no hay respuestas en esta publicación. ¡Escribe el primer aporte abajo!
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-col gap-2.5">
                                                        {post.comments.map((comment, idx) => (
                                                            <div key={comment.id || idx} className="bg-white dark:bg-[#1C2636] rounded-xl p-3.5 border border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 flex flex-col gap-1.5 shadow-2xs">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-xs font-extrabold text-[#0052CC] dark:text-[#4C9AFF]">
                                                                        {comment.author_alias}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-[#7A869A] dark:text-slate-500 font-semibold">
                                                                            {formatTimeAgo(comment.created_at)}
                                                                        </span>
                                                                        {user && comment.user_id === user.id && (
                                                                            <button
                                                                                onClick={(e) => handleDeleteComment(post.id, comment.id, e)}
                                                                                className="text-[#7A869A] hover:text-[#E5484D] dark:hover:text-[#FF6369] p-0.5 rounded transition cursor-pointer"
                                                                                title="Eliminar mi comentario"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-[#172B4D] dark:text-slate-200 leading-relaxed">
                                                                    {comment.content}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Comment Box */}
                                                {user ? (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder={`Escribe una respuesta como "${activeAlias}"...`}
                                                            value={commentTexts[post.id] || ''}
                                                            onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id); }}
                                                            className="flex-1 bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl px-3.5 py-2 text-xs text-[#172B4D] dark:text-slate-100 placeholder-[#7A869A] focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF]"
                                                        />
                                                        <button
                                                            onClick={() => handleAddComment(post.id)}
                                                            className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:text-[#0E1624] text-white p-2 rounded-xl transition cursor-pointer shrink-0"
                                                            title="Publicar respuesta"
                                                        >
                                                            <Send size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 p-3 rounded-xl bg-[#DEEBFF]/60 dark:bg-[#0C295E]/60 border border-[#0052CC]/30 dark:border-[#4C9AFF]/30 text-center">
                                                        <p className="text-xs font-bold text-[#0052CC] dark:text-[#7DD3FC]">
                                                            Debes iniciar sesión con Google en la parte superior para responder o comentar en esta publicación.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>

            {/* Create Post Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] rounded-3xl max-w-lg w-full border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center">
                                    <Plus size={18} />
                                </div>
                                <h3 className="font-extrabold text-lg text-[#172B4D] dark:text-white">Nueva Publicación en la Comunidad</h3>
                            </div>
                            <button onClick={resetModal} className="text-[#7A869A] hover:text-[#172B4D] dark:hover:text-white p-1 rounded-lg transition cursor-pointer">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreatePost} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-1.5">
                                    Categoría temática
                                </label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF]"
                                >
                                    {CATEGORIES.filter(c => c.id !== 'todos').map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-1.5">
                                    Título de tu consulta o recomendación
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. ¿Opiniones de la sección A de Lenguajes Formales?"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-1.5">
                                    Detalle del aporte o pregunta
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Describe tu duda, comparte tu experiencia sobre proyectos, exámenes o cátedra..."
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="w-full bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF] resize-none"
                                ></textarea>
                            </div>

                            {/* Active Profile Info */}
                            <div className="bg-[#FAFBFC] dark:bg-[#0E1624]/60 p-3.5 rounded-2xl border border-[#DFE1E6]/80 dark:border-[#3E4C5E]/80 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-300">
                                        Publicando bajo tu perfil: <strong className="text-[#0052CC] dark:text-[#4C9AFF]">{activeAlias}</strong>
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileInputText(activeAlias);
                                        setIsProfileModalOpen(true);
                                    }}
                                    className="text-[11px] font-bold text-[#0052CC] dark:text-[#4C9AFF] hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <Edit3 size={12} />
                                    <span>Cambiar</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={resetModal}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5E6C84] hover:bg-[#F4F5F7] dark:text-slate-400 dark:hover:bg-[#0E1624] transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:text-[#0E1624] text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl transition shadow-md cursor-pointer"
                                >
                                    Publicar ahora
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile / Pseudonym Setup Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] rounded-3xl max-w-md w-full border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center">
                                    <ShieldCheck size={18} />
                                </div>
                                <h3 className="font-extrabold text-lg text-[#172B4D] dark:text-white">Perfil Estudiantil Anónimo</h3>
                            </div>
                            {savedAlias && (
                                <button onClick={() => setIsProfileModalOpen(false)} className="text-[#7A869A] hover:text-[#172B4D] dark:hover:text-white p-1 rounded-lg transition cursor-pointer">
                                    ✕
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-1.5">
                                    Elige tu Seudónimo de Estudiante
                                </label>
                                <p className="text-[11px] text-[#5E6C84] dark:text-slate-400 mb-2 leading-relaxed">
                                    Este es el apodo único e irrepetible con el que publicarás dudas y comentarás en el foro. Tu nombre y correo de Google permanecerán 100% ocultos.
                                </p>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Estudiante FIUSAC #315..."
                                    value={profileInputText}
                                    onChange={(e) => setProfileInputText(e.target.value)}
                                    className="w-full bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                {savedAlias && (
                                    <button
                                        type="button"
                                        onClick={() => setIsProfileModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-[#5E6C84] dark:text-slate-300 hover:bg-[#F4F5F7] dark:hover:bg-[#0E1624] transition cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:text-[#0E1624] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md"
                                >
                                    Guardar Seudónimo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Alert Modal */}
            {customAlert.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] rounded-3xl max-w-sm w-full border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 flex flex-col items-center text-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                                customAlert.type === 'error' ? 'bg-[#FFD5D2] dark:bg-[#5E1C1C] text-[#E5484D] dark:text-[#FF6369]' :
                                customAlert.type === 'warning' ? 'bg-[#FFF3C4] dark:bg-[#5E4C1C] text-[#D97706] dark:text-[#FBBF24]' :
                                customAlert.type === 'success' ? 'bg-[#D2FDEB] dark:bg-[#0C3E26] text-[#12A150] dark:text-[#57D99A]' :
                                'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]'
                            }`}>
                                {customAlert.type === 'error' ? <AlertCircle size={28} /> :
                                 customAlert.type === 'warning' ? <AlertTriangle size={28} /> :
                                 customAlert.type === 'success' ? <CheckCircle2 size={28} /> :
                                 <Info size={28} />}
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-[#172B4D] dark:text-white mb-1.5">
                                    {customAlert.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                                    {customAlert.message}
                                </p>
                            </div>
                            <button
                                onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
                                className="w-full mt-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:text-[#0E1624] text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition cursor-pointer shadow-md"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {customConfirm.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] rounded-3xl max-w-sm w-full border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#FFD5D2] dark:bg-[#5E1C1C] text-[#E5484D] dark:text-[#FF6369] flex items-center justify-center">
                                <Trash2 size={28} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-[#172B4D] dark:text-white mb-1.5">
                                    {customConfirm.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                                    {customConfirm.message}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full mt-2">
                                <button
                                    onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold text-[#5E6C84] dark:text-slate-300 hover:bg-[#F4F5F7] dark:hover:bg-[#0E1624] transition cursor-pointer border border-[#DFE1E6] dark:border-[#3E4C5E]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        const callback = customConfirm.onConfirm;
                                        setCustomConfirm(prev => ({ ...prev, isOpen: false }));
                                        if (callback) callback();
                                    }}
                                    className="flex-1 bg-[#E5484D] hover:bg-[#CD2B31] text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition cursor-pointer shadow-md"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
