import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    MessageSquare, Plus, Search, ExternalLink, Copy, CheckCircle2, 
    AlertTriangle, Trash2, LogOut, Check, 
    Filter, BookOpen, X, AlertCircle, Edit3, ShieldCheck, UserCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { moderateSubmission } from '../lib/moderation';
import { cursos } from '../modules/data/cursos';

const ADMIN_UID = '10884922-e583-409e-b3e8-8a875ddaa5d9';

const CARRERAS = [
    { id: 'todas', label: 'Todas las Carreras / Áreas', badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
    { id: 'area_comun', label: 'Área Común (1er - 3er Sem)', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    { id: 'sistemas', label: 'Ciencias y Sistemas', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    { id: 'civil', label: 'Ingeniería Civil', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    { id: 'industrial', label: 'Ingeniería Industrial', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    { id: 'mecanica', label: 'Mecánica & M. Industrial', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    { id: 'electronica', label: 'Ingeniería Electrónica', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    { id: 'quimica', label: 'Ingeniería Química', badgeBg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
];

export default function WhatsAppGroups() {
    const [groups, setGroups] = useState(() => {
        if (!isSupabaseConfigured || !supabase) {
            return [
                {
                    id: 'sample-1',
                    title: 'Matemática Básica 1 - Sección A (Ing. Pérez)',
                    carrera: 'area_comun',
                    curso: 'Área Matemática Básica 1',
                    section: 'Sección A',
                    link: 'https://chat.whatsapp.com/sample_link_mate1',
                    description: 'Grupo oficial de WhatsApp para resolución de tareas, cortos y exámenes parciales.',
                    author_alias: 'Estudiante MB #204',
                    upvotes: 14,
                    reported_count: 0,
                    created_at: new Date().toISOString()
                },
                {
                    id: 'sample-2',
                    title: 'Estructuras de Datos - Sección Única (Comunidad & Proyectos)',
                    carrera: 'sistemas',
                    curso: 'Estructuras de Datos',
                    section: 'Sección Única',
                    link: 'https://discord.gg/sample_link_edd',
                    description: 'Servidor de Discord y material en Drive para debates sobre proyectos en C++, árboles AVL y laboratorios.',
                    author_alias: 'Estudiante CS #811',
                    upvotes: 28,
                    reported_count: 0,
                    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
                }
            ];
        }
        return [];
    });
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [upvotedGroupIds, setUpvotedGroupIds] = useState(new Set());
    const [reportedGroupIds, setReportedGroupIds] = useState(new Set());
    const [copiedId, setCopiedId] = useState(null);

    // Filters
    const [selectedCarrera, setSelectedCarrera] = useState('todas');
    const [selectedCursoFilter, setSelectedCursoFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const [reportReason, setReportReason] = useState('');

    // Custom Alert / Confirm
    const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [customConfirm, setCustomConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showAlert = useCallback((title, message, type = 'info') => {
        setCustomAlert({ isOpen: true, title, message, type });
    }, []);

    const showConfirm = useCallback((title, message, onConfirm) => {
        setCustomConfirm({ isOpen: true, title, message, onConfirm });
    }, []);

    // Form inputs
    const [newTitle, setNewTitle] = useState('');
    const [newCarrera, setNewCarrera] = useState('area_comun');
    const [newCurso, setNewCurso] = useState('');
    const [newSection, setNewSection] = useState('A');
    const [newLink, setNewLink] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [cursoSearchText, setCursoSearchText] = useState('');
    const [showCursoDropdown, setShowCursoDropdown] = useState(false);

    // Profile pseudonym
    const [savedAlias, setSavedAlias] = useState(() => localStorage.getItem('pemtree_forum_alias') || '');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileInputText, setProfileInputText] = useState('');

    const activeAlias = useMemo(() => {
        if (savedAlias && savedAlias.trim()) return savedAlias.trim();
        if (user && user.user_metadata?.full_name) {
            const initials = user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
            const idCode = user.id ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100 : 482;
            return `Estudiante ${initials} #${idCode}`;
        }
        return 'Estudiante Anónimo';
    }, [savedAlias, user]);

    // Check auth state
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setIsAdmin(session?.user?.id === ADMIN_UID);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setIsAdmin(session?.user?.id === ADMIN_UID);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load groups, upvotes, and reports
    const fetchGroups = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) return;

        setLoading(true);
        try {
            const { data: groupsData, error } = await supabase
                .from('whatsapp_groups')
                .select('*')
                .order('upvotes', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (groupsData) setGroups(groupsData);

            if (user) {
                const { data: upvotesData } = await supabase
                    .from('whatsapp_group_upvotes')
                    .select('group_id')
                    .eq('user_id', user.id);
                if (upvotesData) {
                    setUpvotedGroupIds(new Set(upvotesData.map(u => u.group_id)));
                }

                const { data: reportsData } = await supabase
                    .from('whatsapp_group_reports')
                    .select('group_id')
                    .eq('user_id', user.id);
                if (reportsData) {
                    setReportedGroupIds(new Set(reportsData.map(r => r.group_id)));
                }
            }
        } catch (err) {
            console.error('Error al cargar grupos de WhatsApp:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGroups();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchGroups]);

    const handleLogin = async () => {
        if (!isSupabaseConfigured || !supabase) {
            showAlert('Servicio temporalmente deshabilitado', 'El servicio de autenticación se encuentra en mantenimiento en este momento. Por favor, intenta más tarde.', 'warning');
            return;
        }
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { 
                    redirectTo: window.location.origin + '/grupos',
                    queryParams: { prompt: 'select_account' }
                }
            });
        } catch (err) {
            console.error('Error de login:', err);
        }
    };

    const handleLogout = async () => {
        if (supabase) {
            await supabase.auth.signOut();
            setUser(null);
            setUpvotedGroupIds(new Set());
            setReportedGroupIds(new Set());
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const trimmed = profileInputText.trim();
        if (!trimmed) return;

        const modResult = moderateSubmission({ title: trimmed, content: '' });
        if (!modResult.valid) {
            showAlert('Seudónimo no válido', modResult.reason, 'error');
            return;
        }
        const cleanAlias = modResult.censoredTitle;

        localStorage.setItem('pemtree_forum_alias', cleanAlias);
        setSavedAlias(cleanAlias);
        setIsProfileModalOpen(false);

        if (user && isSupabaseConfigured && supabase) {
            try {
                await supabase.from('posts').update({ author_alias: cleanAlias }).eq('user_id', user.id);
                await supabase.from('comments').update({ author_alias: cleanAlias }).eq('user_id', user.id);
                await supabase.from('whatsapp_groups').update({ author_alias: cleanAlias }).eq('user_id', user.id);
                await fetchGroups();
            } catch {
                showAlert('No se pudo actualizar el alias', 'Ocurrió un problema al sincronizar tu alias. Inténtalo más tarde.', 'error');
            }
        }
    };

    // Filter courses from cursos.js for autocomplete
    const filteredCursoOptions = useMemo(() => {
        if (!cursoSearchText.trim()) return [];
        const q = cursoSearchText.toLowerCase();
        return cursos
            .filter(c => c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q))
            .slice(0, 8);
    }, [cursoSearchText]);

    // Create Group Handler
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newLink.trim() || !newCurso.trim()) {
            showAlert('Campos obligatorios', 'Por favor completa el Título del grupo, el Curso y el Enlace web o de invitación.', 'warning');
            return;
        }

        // Validate URL format (WhatsApp, Telegram, Discord, Drive, Classroom, Facebook, etc.)
        const cleanLink = newLink.trim();
        let isValidUrl = false;
        try {
            const urlObj = new URL(cleanLink);
            isValidUrl = urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
        } catch {
            // URL inválida
        }

        if (!isValidUrl) {
            showAlert('Enlace no válido', 'El enlace debe ser una URL válida (ej. https://chat.whatsapp.com/..., https://t.me/..., https://discord.gg/..., https://drive.google.com/...).', 'error');
            return;
        }

        const modResult = moderateSubmission({ title: `${newTitle.trim()} ${newCurso.trim()} ${newSection.trim()}`, content: `${newDescription.trim()} ${cleanLink} ${activeAlias || ''}` });
        if (!modResult.valid) {
            showAlert('Contenido no permitido', modResult.reason, 'error');
            return;
        }

        if (!user && isSupabaseConfigured) {
            showAlert('Acceso requerido', 'Debes iniciar sesión con Google (Anónima y segura) en la esquina superior para agregar un nuevo grupo a la comunidad.', 'warning');
            return;
        }

        const finalTitle = moderateSubmission({ title: newTitle.trim(), content: '' }).censoredTitle;
        const finalCurso = moderateSubmission({ title: newCurso.trim(), content: '' }).censoredTitle;
        const finalSection = moderateSubmission({ title: newSection.trim() || 'General', content: '' }).censoredTitle;
        const finalAlias = moderateSubmission({ title: activeAlias || 'Anónimo', content: '' }).censoredTitle;
        const finalDesc = newDescription.trim() ? moderateSubmission({ title: '', content: newDescription.trim() }).censoredContent : null;

        if (isSupabaseConfigured && supabase) {
            try {
                const { error } = await supabase.from('whatsapp_groups').insert([{
                    title: finalTitle,
                    carrera: newCarrera,
                    curso: finalCurso,
                    section: finalSection,
                    link: cleanLink,
                    description: finalDesc,
                    user_id: user?.id || null,
                    author_alias: finalAlias,
                    upvotes: 1
                }]);

                if (error) {
                    console.warn('Detalle interno de base de datos Supabase al insertar grupo:', error);
                    showAlert('No se pudo guardar el grupo', 'Ocurrió un problema temporal al publicar tu grupo estudiantil. Por favor, verifica tu conexión e inténtalo de nuevo.', 'error');
                    return;
                }
                await fetchGroups();
            } catch {
                showAlert('No se pudo agregar el grupo', 'Ocurrió un inconveniente al procesar tu solicitud. Por favor, inténtalo más tarde.', 'error');
                return;
            }
        } else {
            // Local state mode when offline
            const newEntry = {
                id: 'local-' + Date.now(),
                title: newTitle.trim(),
                carrera: newCarrera,
                curso: newCurso.trim(),
                section: newSection.trim() || 'General',
                link: cleanLink,
                description: newDescription.trim() || null,
                user_id: user?.id || 'anon',
                author_alias: activeAlias,
                upvotes: 1,
                reported_count: 0,
                created_at: new Date().toISOString()
            };
            setGroups(prev => [newEntry, ...prev]);
        }

        // Reset form
        setNewTitle('');
        setNewCurso('');
        setCursoSearchText('');
        setNewLink('');
        setNewDescription('');
        setIsAddModalOpen(false);
        showAlert('¡Grupo Agregado!', 'Tu grupo estudiantil se ha publicado correctamente y está listo para que otros estudiantes se unan.', 'success');
    };

    // Toggle Upvote / Verificado
    const handleToggleUpvote = async (groupId) => {
        if (!user && isSupabaseConfigured) {
            showAlert('Inicia sesión para votar', 'Debes iniciar sesión con tu cuenta de Google en la esquina superior para verificar o dar upvote a un grupo.', 'warning');
            return;
        }

        const isUpvoted = upvotedGroupIds.has(groupId);
        const delta = isUpvoted ? -1 : 1;

        // Optimistic UI update
        setUpvotedGroupIds(prev => {
            const next = new Set(prev);
            if (isUpvoted) next.delete(groupId);
            else next.add(groupId);
            return next;
        });

        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, upvotes: Math.max(0, (g.upvotes || 0) + delta) };
            }
            return g;
        }));

        if (isSupabaseConfigured && supabase && user) {
            try {
                if (isUpvoted) {
                    await supabase.from('whatsapp_group_upvotes').delete().eq('group_id', groupId).eq('user_id', user.id);
                    await supabase.from('whatsapp_groups').update({ upvotes: Math.max(0, (groups.find(g => g.id === groupId)?.upvotes || 1) - 1) }).eq('id', groupId);
                } else {
                    await supabase.from('whatsapp_group_upvotes').insert([{ group_id: groupId, user_id: user.id }]);
                    await supabase.from('whatsapp_groups').update({ upvotes: (groups.find(g => g.id === groupId)?.upvotes || 0) + 1 }).eq('id', groupId);
                }
            } catch (err) {
                console.error('Error al actualizar upvote en Supabase:', err);
            }
        }
    };

    // Copy link
    const handleCopyLink = (groupId, linkText) => {
        navigator.clipboard.writeText(linkText);
        setCopiedId(groupId);
        setTimeout(() => setCopiedId(null), 2500);
    };

    // Delete group
    const handleDeleteGroup = async (groupId) => {
        const target = groups.find(g => g.id === groupId);
        if (!target) return;
        const canDelete = isAdmin || (user && target.user_id === user.id);
        if (!canDelete) {
            showAlert('Acceso denegado', 'Solo el autor del grupo o un moderador pueden eliminar este enlace.', 'error');
            return;
        }

        showConfirm(
            isAdmin && target.user_id !== user?.id ? 'Moderador: ¿Eliminar grupo estudiantil?' : '¿Eliminar grupo estudiantil?',
            `¿Estás seguro de que deseas eliminar permanentemente el grupo "${target.title}" de la plataforma?`,
            async () => {
                if (isSupabaseConfigured && supabase) {
                    try {
                        const { error } = await supabase.from('whatsapp_groups').delete().eq('id', groupId);
                        if (error) throw error;
                        await fetchGroups();
                    } catch {
                        showAlert('No se pudo eliminar el grupo', 'Ocurrió un problema temporal al intentar eliminar el grupo. Por favor, inténtalo de nuevo más tarde.', 'error');
                        return;
                    }
                }
                setGroups(prev => prev.filter(g => g.id !== groupId));
            }
        );
    };

    // Submit Report
    const handleOpenReportModal = (group) => {
        if (!user && isSupabaseConfigured) {
            showAlert('Inicia sesión para reportar', 'Debes haber iniciado sesión con Google para reportar enlaces caídos o falsos.', 'warning');
            return;
        }
        if (reportedGroupIds.has(group.id)) {
            showAlert('Grupo ya reportado', 'Ya has enviado un reporte sobre este grupo anteriormente. Nuestro equipo de moderación lo está revisando.', 'info');
            return;
        }
        setReportTarget(group);
        setReportReason('Enlace expirado o caído');
        setIsReportModalOpen(true);
    };

    const handleConfirmReport = async (e) => {
        e.preventDefault();
        if (!reportTarget || !user) return;

        setReportedGroupIds(prev => new Set([...prev, reportTarget.id]));
        setIsReportModalOpen(false);

        if (isSupabaseConfigured && supabase) {
            try {
                await supabase.from('whatsapp_group_reports').insert([{
                    group_id: reportTarget.id,
                    user_id: user.id,
                    reason: reportReason
                }]);
                await supabase.from('whatsapp_groups').update({
                    reported_count: (reportTarget.reported_count || 0) + 1
                }).eq('id', reportTarget.id);
                await fetchGroups();
            } catch (err) {
                console.error('Error al registrar reporte:', err);
            }
        }
        showAlert('Reporte Enviado', `Gracias por notificar. Hemos registrado el reporte sobre "${reportTarget.title}".`, 'success');
    };

    // Filtered lists
    const displayedGroups = useMemo(() => {
        return groups.filter(g => {
            if (selectedCarrera !== 'todas' && g.carrera !== selectedCarrera) {
                return false;
            }
            if (selectedCursoFilter && selectedCursoFilter !== 'todos') {
                if (g.curso.toLowerCase() !== selectedCursoFilter.toLowerCase()) {
                    return false;
                }
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = g.title?.toLowerCase().includes(q);
                const matchCurso = g.curso?.toLowerCase().includes(q);
                const matchSection = g.section?.toLowerCase().includes(q);
                const matchDesc = g.description?.toLowerCase().includes(q);
                if (!matchTitle && !matchCurso && !matchSection && !matchDesc) return false;
            }
            return true;
        });
    }, [groups, selectedCarrera, selectedCursoFilter, searchQuery]);

    // Unique courses list present in current groups for filter dropdown
    const availableCursosInGroups = useMemo(() => {
        const setCursos = new Set();
        groups.forEach(g => {
            if (selectedCarrera === 'todas' || g.carrera === selectedCarrera) {
                if (g.curso) setCursos.add(g.curso);
            }
        });
        return Array.from(setCursos).sort();
    }, [groups, selectedCarrera]);

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Recientemente';
        const date = new Date(dateStr);
        const now = new Date();
        const diffSecs = Math.floor((now - date) / 1000);
        if (diffSecs < 60) return 'Hace un momento';
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `Hace ${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Hace ${diffHours} h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 30) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0E1624] overflow-y-auto">
            {/* Header section */}
            <div className="bg-gradient-to-r from-[#0052CC] to-[#0747A6] dark:from-[#0C295E] dark:to-[#143A7B] text-white py-8 px-4 sm:px-8 shadow-md">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shadow-lg transform -rotate-6">
                                <MessageSquare size={22} className="text-white fill-white" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                                Grupos Estudiantiles
                            </h1>
                        </div>
                        <p className="text-sm sm:text-base text-blue-100 dark:text-slate-300 max-w-2xl font-medium leading-relaxed">
                            Encuentra, verifica y únete a grupos de estudio, comunidades en WhatsApp/Telegram/Discord, laboratorios y repositorios de tu carrera o curso semestral.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
                        {user ? (
                            <div className="flex items-center gap-3.5 bg-white/15 dark:bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className={`${isAdmin ? 'text-[#FFD700]' : 'text-[#79F2B8]'} shrink-0`} />
                                    <div className="text-left min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-blue-200 dark:text-slate-400">
                                            {isAdmin ? 'Admin PEMTREE' : 'Sesión Verificada'}
                                        </p>
                                        <p className="text-xs font-extrabold truncate max-w-[130px] sm:max-w-none text-white">{activeAlias}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => {
                                            setProfileInputText(activeAlias);
                                            setIsProfileModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg transition text-white cursor-pointer bg-transparent border-none"
                                        title="Editar mi seudónimo sincronizado con el foro"
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        title="Cerrar sesión"
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-white transition cursor-pointer border-none bg-transparent"
                                    >
                                        <LogOut size={15} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleLogin}
                                className="flex items-center gap-2 bg-white text-[#172B4D] hover:bg-blue-50 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95 cursor-pointer border-none"
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
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-white/30 backdrop-blur-xs"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Agregar Grupo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-6">
                {/* Search and Filters Bar */}
                <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-3.5 sm:p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A869A] dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por curso, sección, título o descripción..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 placeholder-[#7A869A] dark:placeholder-slate-500 text-xs sm:text-sm font-medium border border-transparent focus:border-[#0052CC] dark:focus:border-[#4C9AFF] focus:outline-none transition"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-none cursor-pointer p-0 flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Filter size={16} className="text-[#7A869A] dark:text-slate-400 hidden sm:block" />
                        <select
                            value={selectedCursoFilter}
                            onChange={(e) => setSelectedCursoFilter(e.target.value)}
                            className="bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF] cursor-pointer w-full sm:w-auto max-w-[260px] truncate"
                        >
                            <option value="">Todos los Cursos</option>
                            {availableCursosInGroups.map(cursoName => (
                                <option key={cursoName} value={cursoName}>{cursoName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Career Tabs (igual que Forum.jsx) */}
                <div className="flex items-center gap-1.5 sm:gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 sm:pb-1 sm:flex-wrap hide-scrollbar">
                    {CARRERAS.map(carrera => {
                        const isSelected = selectedCarrera === carrera.id;
                        return (
                            <button
                                key={carrera.id}
                                onClick={() => {
                                    setSelectedCarrera(carrera.id);
                                    setSelectedCursoFilter('');
                                }}
                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer border shrink-0 sm:shrink ${
                                    isSelected
                                        ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/30 dark:border-[#4C9AFF]/30 shadow-xs'
                                        : 'bg-white dark:bg-[#1C2636] text-[#5E6C84] dark:text-slate-300 border-[#DFE1E6] dark:border-[#3E4C5E] hover:bg-[#F4F5F7] dark:hover:bg-[#2E3C50]'
                                }`}
                            >
                                {carrera.label}
                            </button>
                        );
                    })}
                </div>

                {/* Groups Grid / List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-3 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-semibold text-[#5E6C84] dark:text-slate-400">Cargando grupos disponibles...</span>
                    </div>
                ) : displayedGroups.length === 0 ? (
                    <div className="bg-white dark:bg-[#1C2636] rounded-2xl p-10 border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col items-center justify-center text-center gap-4 shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-[#EAE6FF] dark:bg-[#201E36] flex items-center justify-center text-[#6554C0] dark:text-[#9F8FEF]">
                            <MessageSquare size={32} />
                        </div>
                        <div className="flex flex-col gap-1 max-w-md">
                            <h3 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                                {searchQuery || selectedCursoFilter ? 'No se encontraron grupos para tu búsqueda' : 'Aún no hay grupos clasificados en esta carrera'}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400">
                                ¿Tienes el enlace (WhatsApp, Telegram, Discord, Drive) del grupo de tu sección o curso? ¡Agrégalo ahora para ayudar a tus compañeros!
                            </p>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-2 flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer border-none"
                        >
                            <Plus size={16} />
                            <span>Agregar Enlace Ahora</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedGroups.map(group => {
                            const carreraObj = CARRERAS.find(c => c.id === group.carrera) || CARRERAS[0];
                            const isUpvoted = upvotedGroupIds.has(group.id);
                            const canDelete = isAdmin || (user && group.user_id === user.id);

                            return (
                                <div
                                    key={group.id}
                                    className="bg-white dark:bg-[#161F2E] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between gap-4"
                                >
                                    <div className="flex flex-col gap-2.5">
                                        {/* Top Badges */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${carreraObj.badgeBg}`}>
                                                    {carreraObj.label}
                                                </span>
                                                {group.section && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        Secc. {group.section}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                                {formatTimeAgo(group.created_at)}
                                            </span>
                                        </div>

                                        {/* Course Name & Group Title */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <BookOpen size={13} />
                                                <span>{group.curso}</span>
                                            </span>
                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                                {group.title}
                                            </h3>
                                        </div>

                                        {/* Description */}
                                        {group.description && (
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                {group.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Bottom Info & Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
                                            <span className="font-medium flex items-center gap-1">
                                                <span>Por</span>
                                                <strong className="text-slate-700 dark:text-slate-300">{group.author_alias}</strong>
                                            </span>

                                            {/* Upvotes badge */}
                                            <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 text-xs">
                                                <CheckCircle2 size={14} className="text-slate-500" />
                                                <span>{group.upvotes || 0} útiles</span>
                                            </div>
                                        </div>

                                        {/* Actions row */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-1">
                                            {/* Minimalist Join Button */}
                                            <a
                                                href={group.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-grow flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm py-2 px-4 rounded-xl transition no-underline text-center"
                                            >
                                                <MessageSquare size={15} />
                                                <span>Abrir enlace</span>
                                                <ExternalLink size={13} />
                                            </a>

                                            {/* Copy button */}
                                            <button
                                                onClick={() => handleCopyLink(group.id, group.link)}
                                                title="Copiar enlace"
                                                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                                    copiedId === group.id
                                                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-800 dark:text-slate-200'
                                                        : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                {copiedId === group.id ? <Check size={15} /> : <Copy size={15} />}
                                                <span className="hidden sm:inline">{copiedId === group.id ? 'Copiado' : 'Copiar'}</span>
                                            </button>

                                            {/* Verify/Confirm Button */}
                                            <button
                                                onClick={() => handleToggleUpvote(group.id)}
                                                title={isUpvoted ? 'Quitar confirmación' : 'Confirmar que este enlace funciona y es útil'}
                                                className={`py-2 px-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                                                    isUpvoted
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-bold'
                                                        : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                <CheckCircle2 size={15} />
                                            </button>

                                            {/* Report Button */}
                                            <button
                                                onClick={() => handleOpenReportModal(group)}
                                                title="Reportar enlace caído o spam"
                                                className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 hover:text-rose-500 transition cursor-pointer flex items-center justify-center"
                                            >
                                                <AlertTriangle size={15} />
                                            </button>

                                            {/* Delete button for author/admin */}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    title="Eliminar grupo"
                                                    className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer flex items-center justify-center"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ADD GROUP MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center text-white">
                                    <MessageSquare size={18} className="fill-white" />
                                </div>
                                <h3 className="text-lg font-black text-[#172B4D] dark:text-slate-100">
                                    Compartir Grupo Estudiantil
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] text-[#5E6C84] dark:text-slate-300 cursor-pointer border-none bg-transparent"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                            {/* Carrera */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                    Carrera o Área <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={newCarrera}
                                    onChange={(e) => setNewCarrera(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-semibold text-[#172B4D] dark:text-slate-200 focus:ring-2 focus:ring-[#0052CC] outline-none cursor-pointer"
                                >
                                    {CARRERAS.filter(c => c.id !== 'todas').map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Curso Autocomplete / Free text */}
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                    Curso <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. Matemática Básica 1, Estructuras de Datos..."
                                    value={newCurso || cursoSearchText}
                                    onChange={(e) => {
                                        setNewCurso(e.target.value);
                                        setCursoSearchText(e.target.value);
                                        setShowCursoDropdown(true);
                                    }}
                                    onFocus={() => setShowCursoDropdown(true)}
                                    className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-medium text-[#172B4D] dark:text-slate-200 focus:ring-2 focus:ring-[#0052CC] outline-none"
                                />
                                {showCursoDropdown && filteredCursoOptions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 flex flex-col">
                                        {filteredCursoOptions.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    setNewCurso(c.nombre);
                                                    setCursoSearchText('');
                                                    setShowCursoDropdown(false);
                                                }}
                                                className="w-full text-left p-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] text-xs font-semibold text-[#172B4D] dark:text-slate-200 border-b last:border-b-0 border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50 cursor-pointer bg-transparent"
                                            >
                                                <span className="text-[#0052CC] dark:text-[#4C9AFF] font-extrabold mr-1.5">[{c.codigo}]</span>
                                                <span>{c.nombre}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section & Title in grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                        Sección
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. A, B, N, Única"
                                        value={newSection}
                                        onChange={(e) => setNewSection(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-semibold text-[#172B4D] dark:text-slate-200 focus:ring-2 focus:ring-[#0052CC] outline-none"
                                    />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                        Título descriptivo <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Matemática Básica 1 - Secc A (Ing. Pérez)"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-medium text-[#172B4D] dark:text-slate-200 focus:ring-2 focus:ring-[#0052CC] outline-none"
                                    />
                                </div>
                            </div>

                            {/* Link web / invitación */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200 flex items-center justify-between">
                                    <span>Enlace de Invitación o Recurso <span className="text-rose-500">*</span></span>
                                    <span className="text-[10px] text-emerald-600 font-semibold">WhatsApp, Telegram, Discord, Drive, etc.</span>
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://chat.whatsapp.com/... o https://t.me/..."
                                    value={newLink}
                                    onChange={(e) => setNewLink(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-mono text-[#172B4D] dark:text-slate-200 focus:ring-2 focus:ring-[#25D366] outline-none"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                    Descripción o notas (Opcional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej. Grupo para compartir resoluciones, información de cortos y laboratorios..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-medium text-[#172B4D] dark:text-slate-200 focus:ring-2 focus:ring-[#0052CC] outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] hover:bg-[#F4F5F7] dark:hover:bg-[#0E1624] text-xs font-bold text-[#5E6C84] dark:text-slate-300 transition cursor-pointer bg-transparent"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-black shadow-md transition transform active:scale-95 cursor-pointer border-none flex items-center gap-1.5"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    <span>Publicar Grupo Ahora</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REPORT MODAL */}
            {isReportModalOpen && reportTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-black text-[#172B4D] dark:text-slate-100">Reportar Grupo</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300">
                            ¿Por qué razón deseas reportar el grupo <strong className="text-[#172B4D] dark:text-slate-100">"{reportTarget.title}"</strong>?
                        </p>
                        <select
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full p-3 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-xs sm:text-sm font-semibold text-[#172B4D] dark:text-slate-200 outline-none cursor-pointer"
                        >
                            <option value="Enlace expirado o caído">Enlace expirado o caído</option>
                            <option value="Contenido spam o ajeno a los cursos">Contenido spam o ajeno a los cursos</option>
                            <option value="Grupo duplicado">Grupo duplicado</option>
                            <option value="Enlace engañoso o malicioso">Enlace engañoso o malicioso</option>
                        </select>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsReportModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] hover:bg-[#F4F5F7] text-xs font-bold text-slate-500 transition cursor-pointer bg-transparent"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmReport}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer border-none"
                            >
                                Enviar Reporte
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PROFILE / PSEUDONYM MODAL */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2.5 text-[#0052CC] dark:text-[#4C9AFF]">
                            <UserCheck size={24} />
                            <h3 className="text-lg font-black text-[#172B4D] dark:text-slate-100">Mi Seudónimo en la Comunidad</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300">
                            Tu seudónimo está sincronizado con el Foro Estudiantil y se utilizará cada vez que compartas un nuevo grupo o respondas a la comunidad:
                        </p>
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 mt-1">
                            <div>
                                <label className="text-xs font-bold text-[#172B4D] dark:text-slate-200 block mb-1">
                                    Seudónimo Público
                                </label>
                                <input
                                    type="text"
                                    value={profileInputText}
                                    onChange={(e) => setProfileInputText(e.target.value)}
                                    placeholder="Ej. Estudiante CS #123, Dev_GT, etc."
                                    maxLength={30}
                                    className="w-full p-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624] text-sm font-bold text-[#172B4D] dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#0052CC]"
                                    autoFocus
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Los cambios se verán reflejados al instante en el Foro y en tus Grupos compartidos.</span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                                <button
                                    type="button"
                                    onClick={() => setIsProfileModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] hover:bg-[#F4F5F7] text-xs font-bold text-slate-500 transition cursor-pointer bg-transparent"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs font-bold shadow-md transition cursor-pointer border-none"
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
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2">
                            {customAlert.type === 'error' && <AlertCircle className="text-rose-500 shrink-0" size={20} />}
                            {customAlert.type === 'warning' && <AlertTriangle className="text-amber-500 shrink-0" size={20} />}
                            {customAlert.type === 'success' && <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />}
                            {customAlert.type === 'info' && <MessageSquare className="text-blue-500 shrink-0" size={20} />}
                            <h3 className="text-base font-bold text-[#172B4D] dark:text-slate-100">{customAlert.title}</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{customAlert.message}</p>
                        <div className="flex justify-end pt-1">
                            <button
                                onClick={() => setCustomAlert({ ...customAlert, isOpen: false })}
                                className="px-4 py-1.5 rounded-xl bg-[#0052CC] hover:bg-[#0747A6] text-white font-bold text-xs shadow-xs transition cursor-pointer border-none"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {customConfirm.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1C2636] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <AlertTriangle size={20} />
                            <h3 className="text-base font-bold text-[#172B4D] dark:text-slate-100">{customConfirm.title}</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{customConfirm.message}</p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setCustomConfirm({ ...customConfirm, isOpen: false })}
                                className="px-3.5 py-1.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] hover:bg-[#F4F5F7] dark:hover:bg-[#0E1624] text-xs font-bold text-[#5E6C84] dark:text-slate-300 transition cursor-pointer bg-transparent"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (customConfirm.onConfirm) customConfirm.onConfirm();
                                    setCustomConfirm({ ...customConfirm, isOpen: false });
                                }}
                                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer border-none"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
