import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    MessageSquare, Plus, Search, ThumbsUp, User, ShieldCheck, 
    Send, LogOut, ChevronDown, BookOpen, Clock, Trash2, Edit3,
    AlertCircle, Info, CheckCircle2, AlertTriangle, Flag, CornerDownRight,
    Image as ImageIcon, X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { checkCooldown, updateCooldown, formatUserError } from '../lib/moderation';
import { sendFormspreeNotification } from '../lib/notification';
import { uploadOrCompressImage } from '../lib/imageUtils';
import { Modal, Input, Textarea, Select, Button, EmptyState } from '../components/ui';

const CATEGORIES = [
    { id: 'todos', label: 'Todas las áreas' },
    { id: 'prerrequisitos', label: 'Prerrequisitos & Pensum' },
    { id: 'catedraticos', label: 'Catedráticos & Auxiliares' },
    { id: 'horarios', label: 'Horarios & Secciones' },
    { id: 'apuntes', label: 'Apuntes & Exámenes' },
    { id: 'general', label: 'Consultas Generales' }
];

const CARRERAS = [
    { id: 'todas', label: 'Todas las Carreras / Áreas' },
    { id: 'area_comun', label: 'Área Común (1er - 3er Sem)' },
    { id: 'sistemas', label: 'Ciencias y Sistemas' },
    { id: 'civil', label: 'Ingeniería Civil' },
    { id: 'industrial', label: 'Ingeniería Industrial' },
    { id: 'mecanica', label: 'Mecánica & M. Industrial' },
    { id: 'electronica', label: 'Ingeniería Electrónica' },
    { id: 'quimica', label: 'Ingeniería Química' }
];

const ADMIN_UID = '10884922-e583-409e-b3e8-8a875ddaa5d9';

const buildCommentTree = (comments = []) => {
    const map = {};
    const roots = [];

    comments.forEach(c => {
        map[c.id] = { ...c, children: [] };
    });

    const getDepthAndAncestor5 = (id, visited = new Set()) => {
        if (!id || !map[id] || visited.has(id)) return { depth: 0, ancestor5: null };
        visited.add(id);
        const parentId = map[id].parent_id;
        if (!parentId || !map[parentId]) return { depth: 0, ancestor5: null };

        const parentInfo = getDepthAndAncestor5(parentId, visited);
        const myDepth = parentInfo.depth + 1;
        let myAncestor5 = parentInfo.ancestor5;
        if (myDepth === 5) {
            myAncestor5 = id;
        }
        return { depth: myDepth, ancestor5: myAncestor5 };
    };

    comments.forEach(c => {
        const { depth, ancestor5 } = getDepthAndAncestor5(c.id);
        if (depth === 0) {
            roots.push(map[c.id]);
        } else if (depth <= 6) {
            if (map[c.parent_id]) {
                map[c.parent_id].children.push(map[c.id]);
            } else {
                roots.push(map[c.id]);
            }
        } else {
            // depth > 6: Límite máximo de 6 capas.
            // Para que se queden en la misma capa 6 sin seguir anidándose en padding ni márgenes,
            // los colocamos en el array de children de su ancestro de capa 5 (como hermanos en capa 6).
            if (ancestor5 && map[ancestor5]) {
                map[ancestor5].children.push(map[c.id]);
            } else if (map[c.parent_id]) {
                map[c.parent_id].children.push(map[c.id]);
            } else {
                roots.push(map[c.id]);
            }
        }
    });

    return roots;
};

const CommentLayerItem = ({
    comment,
    post,
    depth = 0,
    user,
    isAdmin,
    canModerate,
    reportedUserIds,
    openReplyBoxes,
    setOpenReplyBoxes,
    commentReplyTexts,
    setCommentReplyTexts,
    handleAddComment,
    handleDeleteComment,
    handleOpenReportModal,
    formatTimeAgo,
    showAlert
}) => {
    const isReplying = openReplyBoxes[comment.id] || false;
    const isOwner = user && comment.user_id === user.id;

    return (
        <div className={`flex flex-col ${depth > 0 ? 'ml-3 pl-2.5 border-l-2 border-[#DFE1E6] dark:border-[#2D3A4F]' : ''}`}>
            {/* Main comment pill container */}
            <div className={`p-2.5 rounded-xl transition text-xs flex flex-col gap-1.5 ${
                depth === 0 
                    ? 'bg-[#F4F5F7] dark:bg-[#1E293B]/70 border border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 shadow-2xs' 
                    : depth === 1
                        ? 'bg-white dark:bg-[#0E1624]/60 border border-[#DFE1E6]/40 dark:border-[#2D3A4F]/40'
                        : 'bg-[#F4F5F7]/50 dark:bg-[#1E293B]/40'
            }`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#172B4D] dark:text-[#E2E8F0] tracking-tight flex items-center gap-1">
                            {comment.author_alias || 'Estudiante'}
                            {comment.user_id === post.user_id && (
                                <span className="bg-[#0052CC]/10 text-[#0052CC] dark:bg-[#4C9AFF]/20 dark:text-[#4C9AFF] text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                    Autor
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#7A869A] dark:text-slate-500 font-semibold">
                            {formatTimeAgo(comment.created_at)}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!user) {
                                    showAlert('Acceso necesario', 'Debes iniciar sesión con Google en la barra superior para responder a un comentario.', 'warning');
                                    return;
                                }
                                setOpenReplyBoxes(prev => ({ ...prev, [comment.id]: !prev[comment.id] }));
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                                isReplying 
                                    ? 'bg-[#0052CC] text-white dark:bg-[#4C9AFF] dark:text-[#0E1624]' 
                                    : 'text-[#0052CC] hover:bg-[#DEEBFF] dark:text-[#4C9AFF] dark:hover:bg-[#0C295E]'
                            }`}
                            title="Comentar sobre esta respuesta"
                        >
                            <CornerDownRight size={12} />
                            <span>Responder</span>
                        </button>
                        {(isOwner || canModerate) && (
                            <button
                                onClick={(e) => handleDeleteComment(post.id, comment.id, e)}
                                className={`p-0.5 rounded transition cursor-pointer ${canModerate && !isOwner ? 'text-[#FF6369] bg-red-500/10 hover:bg-red-500/20' : 'text-[#7A869A] hover:text-[#E5484D] dark:hover:text-[#FF6369]'}`}
                                title={canModerate && !isOwner ? "Moderación: Eliminar comentario con justificación" : "Eliminar mi comentario y sub-capas"}
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                        {comment.user_id && (!user || comment.user_id !== user.id) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReportModal(comment.user_id, comment.author_alias);
                                }}
                                className={`p-0.5 rounded transition cursor-pointer ml-0.5 ${
                                    reportedUserIds.includes(comment.user_id)
                                        ? 'text-amber-500 cursor-not-allowed'
                                        : 'text-[#7A869A] hover:text-amber-500'
                                }`}
                                title={reportedUserIds.includes(comment.user_id) ? "Usuario reportado" : "Reportar usuario"}
                                disabled={reportedUserIds.includes(comment.user_id)}
                            >
                                <Flag size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <p className="text-[#172B4D] dark:text-[#CBD5E1] whitespace-pre-line leading-relaxed font-normal mt-0.5">
                    {comment.content}
                </p>

                {/* Reply Form */}
                {isReplying && (
                    <div className="mt-2 pt-2 border-t border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 flex items-center gap-1.5">
                        <input
                            type="text"
                            placeholder="Escribe tu respuesta a este comentario..."
                            value={commentReplyTexts[comment.id] || ''}
                            onChange={(e) => setCommentReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post.id, comment.id);
                                }
                            }}
                            className="flex-1 bg-white dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-lg px-2.5 py-1.5 text-xs text-[#172B4D] dark:text-white placeholder-[#7A869A] focus:outline-none focus:border-[#0052CC] transition"
                            autoFocus
                        />
                        <button
                            onClick={() => handleAddComment(post.id, comment.id)}
                            className="bg-[#0052CC] hover:bg-[#003D99] text-white px-2.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                            title="Enviar respuesta en capa"
                        >
                            <Send size={13} />
                            <span>Enviar</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Render nested children layers */}
            {comment.children && comment.children.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                    {comment.children.map(child => (
                        <CommentLayerItem
                            key={child.id}
                            comment={child}
                            post={post}
                            depth={Math.min(6, depth + 1)}
                            user={user}
                            isAdmin={isAdmin}
                            canModerate={canModerate}
                            reportedUserIds={reportedUserIds}
                            openReplyBoxes={openReplyBoxes}
                            setOpenReplyBoxes={setOpenReplyBoxes}
                            commentReplyTexts={commentReplyTexts}
                            setCommentReplyTexts={setCommentReplyTexts}
                            handleAddComment={handleAddComment}
                            handleDeleteComment={handleDeleteComment}
                            handleOpenReportModal={handleOpenReportModal}
                            formatTimeAgo={formatTimeAgo}
                            showAlert={showAlert}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Forum() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const canModerate = isAdmin || isModerator;
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userLikes, setUserLikes] = useState([]); // Array con los IDs de posts a los que el usuario dio like
    const [reportedUserIds, setReportedUserIds] = useState([]); // IDs de usuarios ya reportados por el usuario actual
    const [adminReports, setAdminReports] = useState([]); // Lista de reportes para el admin
    const [reportModal, setReportModal] = useState({ isOpen: false, reportedUserId: null, reportedUserAlias: '', reason: '' });
    const [isAdminReportsModalOpen, setIsAdminReportsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [selectedCarrera, setSelectedCarrera] = useState('todas');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'likes'
    
    // UI state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [customConfirm, setCustomConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [customPrompt, setCustomPrompt] = useState({ isOpen: false, title: '', message: '', value: '', placeholder: '', onSubmit: null });

    const showAlert = useCallback((title, message, type = 'info') => {
        setCustomAlert({ isOpen: true, title, message, type });
    }, []);

    const showConfirm = useCallback((title, message, onConfirm) => {
        setCustomConfirm({ isOpen: true, title, message, onConfirm });
    }, []);

    const showPrompt = useCallback((title, message, placeholder, onSubmit) => {
        setCustomPrompt({ isOpen: true, title, message, value: '', placeholder, onSubmit });
    }, []);
    
    // New post form
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('prerrequisitos');
    const [newCarrera, setNewCarrera] = useState('sistemas');
    const [newContent, setNewContent] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [isCompressingImg, setIsCompressingImg] = useState(false);
    
    // Profile / Pseudonym state
    const [savedAlias, setSavedAlias] = useState(() => localStorage.getItem('pemtree_forum_alias') || '');
    const [profileInputText, setProfileInputText] = useState('');
    
    // New comment form per post
    const [commentTexts, setCommentTexts] = useState({});
    const [commentReplyTexts, setCommentReplyTexts] = useState({}); // Textos por cada ID de comentario al responder
    const [openReplyBoxes, setOpenReplyBoxes] = useState({}); // Qué cajas de respuesta (por ID de comentario) están abiertas

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

    const fetchUserReports = useCallback(async (userId) => {
        if (!isSupabaseConfigured || !supabase || !userId) {
            setReportedUserIds([]);
            return;
        }
        try {
            const { data } = await supabase.from('user_reports').select('reported_user_id').eq('reporter_id', userId);
            if (data) setReportedUserIds(data.map(item => item.reported_user_id));
        } catch (err) {
            console.error('Error cargando reportes de usuario:', err.message);
        }
    }, []);

    const fetchAdminReports = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase || !isAdmin) return;
        try {
            const { data } = await supabase.from('user_reports').select('*').order('created_at', { ascending: false });
            if (data) setAdminReports(data);
        } catch (err) {
            console.error('Error cargando reportes admin:', err.message);
        }
    }, [isAdmin]);

    const handleOpenReportModal = (targetUserId, targetAlias) => {
        if (!user) {
            showAlert('Acceso necesario', 'Debes iniciar sesión con Google en la barra superior para poder reportar a un usuario.', 'warning');
            return;
        }
        if (user.id === targetUserId) return;
        if (reportedUserIds.includes(targetUserId)) {
            showAlert('Usuario ya reportado', `Ya has enviado un reporte anteriormente sobre "${targetAlias}". Nuestro equipo de moderación tiene registrado el caso. Solo se permite un reporte por usuario.`, 'info');
            return;
        }
        setReportModal({
            isOpen: true,
            reportedUserId: targetUserId,
            reportedUserAlias: targetAlias || 'Usuario anónimo',
            reason: ''
        });
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        const reasonText = reportModal.reason.trim();
        if (!reasonText) {
            showAlert('Descripción requerida', 'Por favor detalla en la descripción la razón del reporte (ej. spam, lenguaje ofensivo, acoso, contenido inapropiado).', 'warning');
            return;
        }
        if (!user) return;
        if (reportedUserIds.includes(reportModal.reportedUserId)) {
            showAlert('Usuario ya reportado', 'Ya has reportado anteriormente a este usuario. Solo se puede reportar una vez al mismo usuario.', 'warning');
            return;
        }

        if (!isSupabaseConfigured || !supabase) {
            showAlert('Servicio no disponible temporalmente', 'La conexión con el servidor del foro no se encuentra activa en este momento. Por favor, intenta más tarde.', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('user_reports')
                .insert([{
                    reporter_id: user.id,
                    reported_user_id: reportModal.reportedUserId,
                    reported_user_alias: reportModal.reportedUserAlias,
                    reason: reasonText,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                if (error.code === '23505' || error.message?.toLowerCase().includes('unique')) {
                    setReportedUserIds(prev => [...prev, reportModal.reportedUserId]);
                    setReportModal({ isOpen: false, reportedUserId: null, reportedUserAlias: '', reason: '' });
                    showAlert('Reporte ya registrado', 'El sistema ya tenía registrado un reporte tuyo sobre este usuario. Solo puedes reportar una vez al mismo usuario.', 'info');
                } else {
                    showAlert('Error al enviar reporte', 'No pudimos registrar tu reporte en este momento. Por favor, verifica tu conexión e inténtalo de nuevo.', 'error');
                }
                return;
            }

            setReportedUserIds(prev => [...prev, reportModal.reportedUserId]);
            setReportModal({ isOpen: false, reportedUserId: null, reportedUserAlias: '', reason: '' });
            if (isAdmin) fetchAdminReports();
            sendFormspreeNotification({
                tipo_evento: 'REPORTE EN FORO DE DISCUSIÓN',
                a_quien: `Usuario reportado: "${reportModal.reportedUserAlias}" (ID: ${reportModal.reportedUserId})`,
                por_quien: user?.email || user?.id || 'Estudiante',
                porque: reasonText
            });
            showAlert('Reporte enviado con éxito', `Hemos recibido tu reporte sobre "${reportModal.reportedUserAlias}". Nuestro equipo de moderación revisará su comportamiento. Gracias por ayudar a mantener la comunidad segura.`, 'success');
        } catch {
            showAlert('Error al enviar reporte', 'No se pudo procesar tu reporte. Por favor, intenta de nuevo en unos momentos.', 'error');
        }
    };

    const handleDeleteReportAdmin = async (reportId) => {
        if (!isSupabaseConfigured || !supabase || !isAdmin) return;
        showConfirm('¿Descartar reporte?', '¿Confirmas que deseas eliminar este reporte del sistema?', async () => {
            try {
                const { error } = await supabase.from('user_reports').delete().eq('id', reportId);
                if (error) {
                    showAlert('Error al eliminar', 'No pudimos eliminar el reporte en este momento. Inténtalo más tarde.', 'error');
                } else {
                    setAdminReports(prev => prev.filter(r => r.id !== reportId));
                }
            } catch {
                showAlert('Error en la solicitud', 'No se pudo completar la operación. Inténtalo más tarde.', 'error');
            }
        });
    };

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

    const checkUserRoles = useCallback(async (sessionUser) => {
        setUser(sessionUser ?? null);
        let isAdminUser = sessionUser?.id === ADMIN_UID || sessionUser?.email === 'emanu@gmail.com';
        let isModUser = Boolean(
            isAdminUser ||
            sessionUser?.user_metadata?.role === 'moderator' ||
            sessionUser?.user_metadata?.is_moderator === true ||
            localStorage.getItem('pemtree_moderator') === 'true'
        );
        if (sessionUser && isSupabaseConfigured && supabase) {
            try {
                const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', sessionUser.id).maybeSingle();
                if (roleData?.role === 'admin') {
                    isAdminUser = true;
                    isModUser = true;
                } else if (roleData?.role === 'moderator') {
                    isModUser = true;
                }
            } catch { /* ignorar si la tabla aún no existe */ }
        }
        setIsAdmin(Boolean(isAdminUser));
        setIsModerator(Boolean(isModUser));
    }, []);

    useEffect(() => {
        if (isSupabaseConfigured && supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const u = session?.user || null;
                checkUserRoles(u);
                if (u) {
                    fetchUserLikes(u.id);
                    fetchUserReports(u.id);
                    if (u.id === ADMIN_UID) fetchAdminReports();
                    checkAndPromptProfile(u);
                }
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                const u = session?.user || null;
                checkUserRoles(u);
                if (u) {
                    fetchUserLikes(u.id);
                    fetchUserReports(u.id);
                    if (u.id === ADMIN_UID || isAdmin) {
                        fetchAdminReports();
                    } else {
                        setAdminReports([]);
                    }
                    checkAndPromptProfile(u);
                } else {
                    setUserLikes([]);
                    setReportedUserIds([]);
                    setAdminReports([]);
                }
            });

            queueMicrotask(() => {
                fetchSupabasePosts();
            });

            return () => subscription.unsubscribe();
        }
    }, [fetchSupabasePosts, fetchUserLikes, fetchUserReports, fetchAdminReports, checkAndPromptProfile]);

    const handleGoogleLogin = async () => {
        if (!isSupabaseConfigured || !supabase) {
            showAlert('Inicio de sesión temporalmente deshabilitado', 'El servicio de autenticación se encuentra en mantenimiento en este momento. Por favor, intenta más tarde.', 'warning');
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

        const cleanAlias = trimmed;

        localStorage.setItem('pemtree_forum_alias', cleanAlias);
        setSavedAlias(cleanAlias);
        setIsProfileModalOpen(false);

        // Propagar el cambio de nombre a todas las publicaciones y comentarios hechos por este usuario en la BD de Supabase
        if (user && isSupabaseConfigured && supabase) {
            try {
                await supabase
                    .from('posts')
                    .update({ author_alias: cleanAlias })
                    .eq('user_id', user.id);

                await supabase
                    .from('comments')
                    .update({ author_alias: cleanAlias })
                    .eq('user_id', user.id);

                await supabase
                    .from('whatsapp_groups')
                    .update({ author_alias: cleanAlias })
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
        const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
        if (name && name.trim()) {
            const initials = name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase();
            const idCode = user.id ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
            return `Estudiante ${initials} #${idCode}`;
        }
        const idCode = user?.id ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
        return `Estudiante #${idCode}`;
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

        const newPostObj = {
            title: newTitle.trim(),
            category: newCategory,
            carrera: newCarrera,
            content: newContent.trim(),
            image_url: newImageUrl.trim() || null,
            author_alias: activeAlias || 'Estudiante Anónimo',
            likes: 0,
            user_id: user?.id || null,
            created_at: new Date().toISOString()
        };

        if (!isSupabaseConfigured || !supabase) {
            showAlert('Servicio no disponible', 'No se pudo conectar con el servidor para publicar. Verificando tu conexión e inténtalo más tarde.', 'error');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('posts')
                .insert([newPostObj])
                .select();

            if (error) {
                console.error('Error publicando post en Supabase:', error);
                showAlert('No se pudo publicar', formatUserError(error), 'error');
                return;
            }

            if (data && data[0]) {
                updateCooldown('post');
                setPosts(prev => [{ ...data[0], comments: [] }, ...prev]);
                resetModal();
            }
        } catch {
            showAlert('No se pudo publicar', 'Ocurrió un inconveniente al procesar tu publicación. Por favor, inténtalo de nuevo.', 'error');
        }
    };

    const handleImageFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsCompressingImg(true);
            const imageUrl = await uploadOrCompressImage(file, 'forum');
            setNewImageUrl(imageUrl);
        } catch (err) {
            showAlert('Error al adjuntar imagen', err.message || 'No se pudo procesar la imagen.', 'error');
        } finally {
            setIsCompressingImg(false);
        }
    };

    const resetModal = () => {
        setNewTitle('');
        setNewContent('');
        setNewCarrera('todas');
        setNewImageUrl('');
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
        
        const targetPost = posts.find(p => p.id === postId);
        const canDelete = canModerate || targetPost?.user_id === user.id;
        if (!canDelete) {
            showAlert('Acceso denegado', 'No tienes permisos para eliminar esta publicación.', 'error');
            return;
        }

        const isModDeletingOther = canModerate && targetPost?.user_id !== user.id;

        const executeDelete = async (justification = null) => {
            if (isModDeletingOther && user.id !== ADMIN_UID && (!justification || !justification.trim())) {
                showAlert('Borrado cancelado', 'Como moderador, es obligatorio ingresar una justificación para eliminar contenido de otros usuarios.', 'warning');
                return;
            }

            if (isSupabaseConfigured && supabase) {
                try {
                    if (isModDeletingOther && justification) {
                        const { error: modErr } = await supabase.rpc('eliminar_contenido_moderado', {
                            p_tabla: 'posts',
                            p_item_id: postId,
                            p_justificacion: justification.trim()
                        });
                        if (modErr) throw modErr;
                        sendFormspreeNotification({
                            tipo_evento: 'MODERADOR ELIMINÓ POST DEL FORO',
                            a_quien: `Publicación: "${targetPost?.title}" (Autor original: ${targetPost?.author_alias})`,
                            por_quien: user?.email || user?.id || 'Moderador/Admin',
                            porque: justification.trim()
                        });
                    } else {
                        let query = supabase.from('posts').delete().eq('id', postId);
                        if (!canModerate) {
                            query = query.eq('user_id', user.id);
                        }
                        const { error } = await query;
                        if (error) throw error;
                    }
                    await fetchSupabasePosts();
                } catch (err) {
                    console.error('Error al eliminar post:', err);
                    showAlert('No se pudo eliminar', formatUserError(err), 'error');
                    return;
                }
            }
            setPosts(prev => prev.filter(p => p.id !== postId));
        };

        if (isModDeletingOther && user.id !== ADMIN_UID) {
            showPrompt(
                'Moderación: Justificación obligatoria',
                `Estás eliminando la publicación "${targetPost?.title}" de ${targetPost?.author_alias}. Ingresa la razón para el registro de auditoría:`,
                'Ej: Contenido fuera de tema, spam, lenguaje ofensivo...',
                (justificationText) => executeDelete(justificationText)
            );
        } else {
            showConfirm(
                isModDeletingOther ? 'Admin: ¿Eliminar publicación?' : '¿Eliminar publicación?',
                isModDeletingOther 
                    ? '¿Confirmas la eliminación administrativa de esta publicación y todas sus respuestas?'
                    : '¿Estás seguro de que deseas eliminar permanentemente tu publicación y todas sus respuestas? Esta acción no se puede deshacer.',
                () => executeDelete(null)
            );
        }
    };

    const handleDeleteComment = async (postId, commentId, e) => {
        if (e) e.stopPropagation();
        if (!user) return;
        
        const targetPost = posts.find(p => p.id === postId);
        const targetComment = targetPost?.comments?.find(c => c.id === commentId);
        const canDeleteComment = canModerate || targetComment?.user_id === user.id;
        if (!canDeleteComment) {
            showAlert('Acceso denegado', 'No tienes permisos para eliminar este comentario.', 'error');
            return;
        }

        const isModDeletingOther = canModerate && targetComment?.user_id !== user.id;

        const executeDelete = async (justification = null) => {
            if (isModDeletingOther && user.id !== ADMIN_UID && (!justification || !justification.trim())) {
                showAlert('Borrado cancelado', 'Como moderador, es obligatorio ingresar una justificación para eliminar contenido de otros usuarios.', 'warning');
                return;
            }

            const idsToDelete = new Set([commentId]);
            let added = true;
            while (added) {
                added = false;
                (targetPost?.comments || []).forEach(c => {
                    if (c.parent_id && idsToDelete.has(c.parent_id) && !idsToDelete.has(c.id)) {
                        idsToDelete.add(c.id);
                        added = true;
                    }
                });
            }
            const idsArray = Array.from(idsToDelete);

            if (isSupabaseConfigured && supabase) {
                try {
                    if (isModDeletingOther && justification) {
                        const { error: modErr } = await supabase.rpc('eliminar_contenido_moderado', {
                            p_tabla: 'comments',
                            p_item_id: commentId,
                            p_justificacion: justification.trim()
                        });
                        if (modErr) throw modErr;
                        sendFormspreeNotification({
                            tipo_evento: 'MODERADOR ELIMINÓ COMENTARIO DEL FORO',
                            a_quien: `Comentario de ${targetComment?.author_alias || 'Estudiante'} en post "${targetPost?.title}"`,
                            por_quien: user?.email || user?.id || 'Moderador/Admin',
                            porque: justification.trim()
                        });
                    } else {
                        let query = supabase.from('comments').delete().in('id', idsArray);
                        if (!canModerate) {
                            query = query.in('id', idsArray);
                        }
                        const { error } = await query;
                        if (error) throw error;
                    }
                    await fetchSupabasePosts();
                } catch (err) {
                    console.error('Error al eliminar comentario:', err);
                    showAlert('No se pudo eliminar', formatUserError(err), 'error');
                    return;
                }
            }
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, comments: (p.comments || []).filter(c => !idsToDelete.has(c.id)) };
                }
                return p;
            }));
        };

        if (isModDeletingOther && user.id !== ADMIN_UID) {
            showPrompt(
                'Moderación: Justificación obligatoria',
                `Estás eliminando el comentario de ${targetComment?.author_alias}. Ingresa la razón para el registro de auditoría:`,
                'Ej: Comentario ofensivo, spam, acoso...',
                (justificationText) => executeDelete(justificationText)
            );
        } else {
            showConfirm(
                isModDeletingOther ? 'Admin: ¿Eliminar comentario?' : '¿Eliminar comentario y respuestas?',
                isModDeletingOther 
                    ? '¿Confirmas la eliminación administrativa de este comentario y de TODAS sus respuestas anidadas en la comunidad?'
                    : '¿Estás seguro de que deseas eliminar permanentemente tu comentario junto con todas las respuestas que dependen de él? Esta acción no se puede deshacer.',
                () => executeDelete(null)
            );
        }
    };

    const handleAddComment = async (postId, parentId = null) => {
        const text = (parentId ? commentReplyTexts[parentId] : commentTexts[postId] || '').trim();
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

        const newCommentObj = {
            post_id: postId,
            author_alias: activeAlias || 'Estudiante Anónimo',
            content: text,
            user_id: user?.id || null,
            parent_id: parentId || null,
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([newCommentObj])
                .select();

            if (error) {
                console.error('Error publicando comentario en Supabase:', error);
                showAlert('No se pudo enviar el comentario', formatUserError(error), 'error');
                return;
            }
            if (data && data[0]) {
                updateCooldown('comment');
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), data[0]] } : p));
                if (parentId) {
                    setCommentReplyTexts(prev => ({ ...prev, [parentId]: '' }));
                    setOpenReplyBoxes(prev => ({ ...prev, [parentId]: false }));
                } else {
                    setCommentTexts(prev => ({ ...prev, [postId]: '' }));
                }
            }
        } catch {
            showAlert('No se pudo enviar el comentario', 'Ocurrió un inconveniente al procesar tu comentario. Por favor, inténtalo de nuevo en unos momentos.', 'error');
        }
    };

    const filteredPosts = posts.filter(p => {
        const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
        const matchesCarrera = selectedCarrera === 'todas' || p.carrera === selectedCarrera || (!p.carrera && selectedCarrera === 'todas');
        
        if (!searchQuery.trim()) return matchesCategory && matchesCarrera;

        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = (p.title || '').toLowerCase().includes(query);
        const matchesContent = (p.content || '').toLowerCase().includes(query);
        const matchesAuthor = (p.author_alias || '').toLowerCase().includes(query);
        const matchesComments = (p.comments || []).some(c => 
            (c.content || '').toLowerCase().includes(query) || 
            (c.author_alias || '').toLowerCase().includes(query)
        );

        return matchesCategory && matchesCarrera && (matchesTitle || matchesContent || matchesAuthor || matchesComments);
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
                                    <ShieldCheck size={16} className={`${isAdmin ? 'text-[#FFD700]' : 'text-[#79F2B8]'} shrink-0`} />
                                    <div className="text-left min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-blue-200 dark:text-slate-400">
                                            {isAdmin ? 'Admin PEMTREE' : 'Sesión Verificada'}
                                        </p>
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
                                setNewCarrera(selectedCarrera || 'todas');
                                setIsCreateModalOpen(true);
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer shrink-0"
                        >
                            <Plus size={16} />
                            <span>Crear Publicación</span>
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setIsAdminReportsModalOpen(true)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#FFD700] hover:bg-[#FACC15] text-[#172B4D] font-extrabold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition shadow-md cursor-pointer shrink-0"
                                title="Panel de Administración de Reportes"
                            >
                                <Flag size={16} />
                                <span>Reportes ({adminReports.length})</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
                
                {/* Search and Filters Bar */}
                <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-3.5 sm:p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A869A] dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por curso, catedrático, palabra en comentarios o alias..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 placeholder-[#7A869A] dark:placeholder-slate-500 text-xs sm:text-sm font-medium border border-transparent focus:border-[#0052CC] dark:focus:border-[#4C9AFF] focus:outline-none transition"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
                        {/* Selector de Carrera */}
                        <select
                            value={selectedCarrera}
                            onChange={(e) => setSelectedCarrera(e.target.value)}
                            className="bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl border border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF] cursor-pointer"
                        >
                            {CARRERAS.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>

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
                        <EmptyState
                            icon={BookOpen}
                            title="No se encontraron consultas"
                            description="Sé el primero en hacer una pregunta en esta categoría o intenta con otros términos en la búsqueda."
                            actionLabel="Crear Nueva Publicación"
                            onAction={() => {
                                if (!user) {
                                    showAlert('Acceso necesario', 'Debes iniciar sesión con Google en la barra superior para poder crear una consulta o publicación en el foro.', 'warning');
                                    return;
                                }
                                setNewCarrera(selectedCarrera || 'todas');
                                setIsCreateModalOpen(true);
                            }}
                        />
                    ) : (
                        filteredPosts.map(post => {
                            const isExpanded = expandedPostId === post.id;
                            const catLabel = CATEGORIES.find(c => c.id === post.category)?.label || post.category;
                            const carreraObj = CARRERAS.find(c => c.id === post.carrera);
                            const hasCommentMatch = searchQuery.trim() && (post.comments || []).some(c => 
                                (c.content || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
                                (c.author_alias || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
                            );
                            return (
                                <div 
                                    key={post.id}
                                    className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs hover:border-[#0052CC]/40 dark:hover:border-[#4C9AFF]/40 transition-all overflow-hidden"
                                >
                                    <div className="p-5 sm:p-6 flex flex-col gap-3">
                                        
                                        {/* Meta Header */}
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center text-xs font-bold shrink-0">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-xs font-extrabold text-[#172B4D] dark:text-slate-200">
                                                    {post.author_alias}
                                                </span>
                                                <span className="text-[#DFE1E6] dark:text-[#3E4C5E]">•</span>
                                                <span className="text-xs font-semibold text-[#7A869A] dark:text-slate-400">
                                                    {formatTimeAgo(post.created_at)}
                                                </span>
                                                {user && (post.user_id === user.id || canModerate) && (
                                                    <button
                                                        onClick={(e) => handleDeletePost(post.id, e)}
                                                        className={`p-1 rounded-lg transition cursor-pointer ml-1 ${canModerate && post.user_id !== user.id ? 'text-[#FF6369] bg-red-500/10 hover:bg-red-500/20' : 'text-[#7A869A] hover:text-[#E5484D] dark:hover:text-[#FF6369]'}`}
                                                        title={canModerate && post.user_id !== user.id ? "Moderación: Eliminar publicación con justificación" : "Eliminar mi publicación"}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                                {post.user_id && (!user || post.user_id !== user.id) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenReportModal(post.user_id, post.author_alias);
                                                        }}
                                                        className={`p-1 rounded-lg transition cursor-pointer ml-1 ${
                                                            reportedUserIds.includes(post.user_id)
                                                                ? 'text-[#D97706] dark:text-[#FBBF24] bg-amber-500/10 hover:bg-amber-500/20'
                                                                : 'text-[#7A869A] hover:text-[#D97706] dark:hover:text-[#FBBF24]'
                                                        }`}
                                                        title={
                                                            reportedUserIds.includes(post.user_id)
                                                                ? "Ya has reportado a este usuario (Solo se permite 1 reporte)"
                                                                : "Reportar usuario por mal comportamiento"
                                                        }
                                                    >
                                                        <Flag size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {carreraObj && post.carrera !== 'todas' && (
                                                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50">
                                                        {carreraObj.label}
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] text-[#42526E] dark:text-[#94A3B8] border border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50">
                                                    {catLabel}
                                                </span>
                                                {hasCommentMatch && (
                                                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#FFF3C4] dark:bg-[#5E4C1C] text-[#D97706] dark:text-[#FBBF24] flex items-center gap-1">
                                                        <Search size={11} />
                                                        <span>Encontrado en comentarios</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title and Content */}
                                        <h3 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-white leading-snug">
                                            {post.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-[#42526E] dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {post.content}
                                        </p>

                                        {post.image_url && (
                                            <div className="mt-2 rounded-2xl overflow-hidden border border-[#DFE1E6] dark:border-[#3E4C5E] max-h-96 flex items-center justify-center bg-black/5 dark:bg-black/20">
                                                <img
                                                    src={post.image_url}
                                                    alt={post.title}
                                                    className="max-h-96 w-auto object-contain rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
                                                    onClick={() => window.open(post.image_url, '_blank')}
                                                />
                                            </div>
                                        )}

                                        {/* Actions Footer */}
                                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 mt-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleLike(post.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-bold text-xs cursor-pointer border ${
                                                        userLikes.includes(post.id)
                                                            ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/30 dark:border-[#4C9AFF]/30 shadow-sm'
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
                                                        {buildCommentTree(post.comments).map(rootComment => (
                                                            <CommentLayerItem
                                                                key={rootComment.id}
                                                                comment={rootComment}
                                                                post={post}
                                                                depth={0}
                                                                user={user}
                                                                isAdmin={isAdmin}
                                                                canModerate={canModerate}
                                                                reportedUserIds={reportedUserIds}
                                                                openReplyBoxes={openReplyBoxes}
                                                                setOpenReplyBoxes={setOpenReplyBoxes}
                                                                commentReplyTexts={commentReplyTexts}
                                                                setCommentReplyTexts={setCommentReplyTexts}
                                                                handleAddComment={handleAddComment}
                                                                handleDeleteComment={handleDeleteComment}
                                                                handleOpenReportModal={handleOpenReportModal}
                                                                formatTimeAgo={formatTimeAgo}
                                                                showAlert={showAlert}
                                                            />
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

            {isCreateModalOpen && (
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={resetModal}
                    title="Nueva Publicación en la Comunidad"
                    icon={Plus}
                    size="md"
                >
                    <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select
                                label="Carrera / Área"
                                value={newCarrera}
                                onChange={(e) => setNewCarrera(e.target.value)}
                            >
                                {CARRERAS.map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </Select>

                            <Select
                                label="Categoría temática"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            >
                                {CATEGORIES.filter(c => c.id !== 'todos').map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </Select>
                        </div>

                        <Input
                            label="Título de tu consulta o recomendación"
                            required
                            placeholder="Ej. ¿Opiniones de la sección A de Lenguajes Formales?"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />

                        <Textarea
                            label="Detalle del aporte o pregunta"
                            required
                            rows={4}
                            placeholder="Describe tu duda, comparte tu experiencia sobre proyectos, exámenes o cátedra..."
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                        />

                        {/* Image upload section */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-extrabold text-[#172B4D] dark:text-slate-200 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <ImageIcon size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <span>Adjuntar imagen (Opcional)</span>
                                </span>
                                {isCompressingImg && <span className="text-[11px] text-[#0052CC] dark:text-[#4C9AFF] animate-pulse">Procesando imagen...</span>}
                            </label>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F4F5F7] hover:bg-[#DEEBFF] dark:bg-[#0E1624] dark:hover:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl font-extrabold text-xs cursor-pointer transition shadow-2xs w-full sm:w-auto">
                                    <ImageIcon size={15} />
                                    <span>Seleccionar imagen desde tu dispositivo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageFileSelect}
                                        disabled={isCompressingImg}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            {newImageUrl && (
                                <div className="relative mt-1.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-black/5 dark:bg-black/20 p-2 flex items-center justify-center max-h-48 overflow-hidden">
                                    <img src={newImageUrl} alt="Vista previa" className="max-h-44 rounded-lg object-contain" />
                                    <button
                                        type="button"
                                        onClick={() => setNewImageUrl('')}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition cursor-pointer"
                                        title="Quitar imagen"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-[#F4F5F7] dark:bg-[#0E1624]/60 p-3.5 rounded-2xl border border-[#DFE1E6]/80 dark:border-[#3E4C5E]/80 flex items-center justify-between gap-2">
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
                                className="text-[11px] font-bold text-[#0052CC] dark:text-[#4C9AFF] hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-none"
                            >
                                <Edit3 size={12} />
                                <span>Cambiar</span>
                            </button>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={resetModal}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                            >
                                Publicar ahora
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isProfileModalOpen && (
                <Modal
                    isOpen={isProfileModalOpen}
                    onClose={() => { if (savedAlias) setIsProfileModalOpen(false); }}
                    title="Perfil Estudiantil Anónimo"
                    icon={ShieldCheck}
                    size="sm"
                >
                    <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 mb-3 leading-relaxed">
                                Este es el apodo único con el que publicarás dudas y comentarás en el foro. Tu nombre y correo de Google permanecerán 100% ocultos.
                            </p>
                            <Input
                                label="Elige tu Seudónimo de Estudiante"
                                required
                                placeholder="Ej. Estudiante CS #315..."
                                value={profileInputText}
                                onChange={(e) => setProfileInputText(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            {savedAlias && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsProfileModalOpen(false)}
                                    size="sm"
                                >
                                    Cancelar
                                </Button>
                            )}
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                            >
                                Guardar Seudónimo
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {customAlert.isOpen && (
                <Modal
                    isOpen={customAlert.isOpen}
                    onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
                    title={customAlert.title}
                    size="sm"
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                            customAlert.type === 'error' ? 'bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369]' :
                            customAlert.type === 'warning' ? 'bg-[#FFF0B3] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24]' :
                            customAlert.type === 'success' ? 'bg-[#E3FCEF] dark:bg-[#0A3622] text-[#059669] dark:text-[#10b981]' :
                            'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]'
                        }`}>
                            {customAlert.type === 'error' ? <AlertCircle size={28} /> :
                             customAlert.type === 'warning' ? <AlertTriangle size={28} /> :
                             customAlert.type === 'success' ? <CheckCircle2 size={28} /> :
                             <Info size={28} />}
                        </div>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                            {customAlert.message}
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
                            className="w-full mt-2"
                        >
                            Entendido
                        </Button>
                    </div>
                </Modal>
            )}

            {customConfirm.isOpen && (
                <Modal
                    isOpen={customConfirm.isOpen}
                    onClose={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                    title={customConfirm.title}
                    size="sm"
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369] flex items-center justify-center">
                            <Trash2 size={28} />
                        </div>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                            {customConfirm.message}
                        </p>
                        <div className="flex items-center gap-3 w-full mt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                                className="flex-grow"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    const callback = customConfirm.onConfirm;
                                    setCustomConfirm(prev => ({ ...prev, isOpen: false }));
                                    if (callback) callback();
                                }}
                                className="flex-grow"
                            >
                                Eliminar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {customPrompt.isOpen && (
                <Modal
                    isOpen={customPrompt.isOpen}
                    onClose={() => setCustomPrompt(prev => ({ ...prev, isOpen: false }))}
                    title={customPrompt.title}
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                            {customPrompt.message}
                        </p>
                        <Textarea
                            placeholder={customPrompt.placeholder || "Escribe tu justificación aquí..."}
                            value={customPrompt.value}
                            onChange={(e) => setCustomPrompt(prev => ({ ...prev, value: e.target.value }))}
                            rows={3}
                            className="text-xs sm:text-sm"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCustomPrompt(prev => ({ ...prev, isOpen: false }))}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    const val = customPrompt.value;
                                    const cb = customPrompt.onSubmit;
                                    setCustomPrompt(prev => ({ ...prev, isOpen: false }));
                                    if (cb) cb(val);
                                }}
                                size="sm"
                            >
                                Confirmar y Eliminar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {reportModal.isOpen && (
                <Modal
                    isOpen={reportModal.isOpen}
                    onClose={() => setReportModal({ isOpen: false, reportedUserId: null, reportedUserAlias: '', reason: '' })}
                    title="Reportar Usuario"
                    icon={Flag}
                    size="md"
                >
                    <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs font-bold text-[#172B4D] dark:text-slate-300">
                                    Usuario reportado:
                                </span>
                                <span className="text-xs font-extrabold text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] px-2.5 py-0.5 rounded-full">
                                    {reportModal.reportedUserAlias}
                                </span>
                            </div>
                            <p className="text-[11px] text-[#5E6C84] dark:text-slate-400 mb-3 leading-relaxed">
                                Para mantener la comunidad libre de spam, insultos o mal comportamiento, detalla el motivo del reporte. <strong className="text-[#B45309] dark:text-[#FBBF24]">Recuerda que solo se permite reportar una vez al mismo usuario.</strong>
                            </p>
                            <Textarea
                                label="Descripción del mal comportamiento"
                                required
                                rows={4}
                                placeholder="Explica en detalle el motivo de tu denuncia (ej: utiliza lenguaje ofensivo y acoso en sus respuestas, publica enlaces de spam o publicidad)..."
                                value={reportModal.reason}
                                onChange={(e) => setReportModal(prev => ({ ...prev, reason: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setReportModal({ isOpen: false, reportedUserId: null, reportedUserAlias: '', reason: '' })}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                size="sm"
                            >
                                Enviar Reporte
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isAdminReportsModalOpen && (
                <Modal
                    isOpen={isAdminReportsModalOpen}
                    onClose={() => setIsAdminReportsModalOpen(false)}
                    title="Panel de Administración de Reportes"
                    icon={Flag}
                    size="lg"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs text-[#7A869A] dark:text-slate-400 -mt-2">Moderación de usuarios reportados por mal comportamiento</p>
                        <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-3 pr-1">
                            {adminReports.length === 0 ? (
                                <div className="text-center py-10 flex flex-col items-center gap-2">
                                    <CheckCircle2 size={36} className="text-[#059669] dark:text-[#10b981]" />
                                    <p className="text-sm font-bold text-[#172B4D] dark:text-slate-200">¡Todo en orden!</p>
                                    <p className="text-xs text-[#7A869A] dark:text-slate-400">Actualmente no hay reportes de mal comportamiento registrados en la base de datos.</p>
                                </div>
                            ) : (
                                adminReports.map((report) => (
                                    <div key={report.id} className="bg-[#F4F5F7] dark:bg-[#0E1624]/60 rounded-2xl p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-[#FFEBE6] dark:bg-[#450A0A] text-[#BF2600] dark:text-[#FF6369]">
                                                    Reportado: {report.reported_user_alias || 'Anónimo'}
                                                </span>
                                                <span className="text-[10px] text-[#7A869A] dark:text-slate-400 font-semibold">
                                                    ID: {report.reported_user_id?.slice(0, 8)}...
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-[#7A869A] dark:text-slate-400 font-semibold">
                                                    {formatTimeAgo(report.created_at)}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteReportAdmin(report.id)}
                                                    className="text-xs text-[#BF2600] dark:text-[#FF6369] hover:underline font-bold cursor-pointer flex items-center gap-1 ml-2 bg-transparent border-none"
                                                    title="Eliminar o descartar reporte"
                                                >
                                                    <Trash2 size={13} /> Descartar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-[#1C2636] p-3 rounded-xl border border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50">
                                            <p className="text-[11px] font-bold text-[#7A869A] dark:text-slate-400 uppercase mb-1">Motivo del reporte:</p>
                                            <p className="text-xs text-[#172B4D] dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{report.reason}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <Button
                                variant="primary"
                                onClick={() => setIsAdminReportsModalOpen(false)}
                                size="sm"
                            >
                                Cerrar Panel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}
