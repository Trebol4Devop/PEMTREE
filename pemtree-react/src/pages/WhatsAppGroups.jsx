import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    MessageSquare, Plus, Search, ExternalLink, Copy, CheckCircle2, 
    AlertTriangle, Trash2, LogOut, Check, 
    Filter, BookOpen, X, Edit3, ShieldCheck, UserCheck,
    Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatUserError } from '../lib/moderation';
import { sendFormspreeNotification } from '../lib/notification';
import { uploadOrCompressImage } from '../lib/imageUtils';
import { cursos } from '../modules/data/cursos';
import { Modal, Input, Textarea, Select, Button, EmptyState } from '../components/ui';

const ADMIN_UID = '10884922-e583-409e-b3e8-8a875ddaa5d9';

// UIDs y/o emails de Moderadores autorizados para la gestión y carga masiva por CSV de grupos estudiantiles
const MODERATOR_UIDS = [
    // Puedes agregar UIDs o correos de moderadores aquí
];

const CARRERAS = [
    { id: 'todas', label: 'Todas las Carreras / Áreas', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'area_comun', label: 'Área Común (1er - 3er Sem)', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'sistemas', label: 'Ciencias y Sistemas', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'civil', label: 'Ingeniería Civil', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'industrial', label: 'Ingeniería Industrial', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'mecanica', label: 'Mecánica & M. Industrial', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'electronica', label: 'Ingeniería Electrónica', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' },
    { id: 'quimica', label: 'Ingeniería Química', badgeBg: 'bg-[#EAE6FF] dark:bg-[#281E5B] text-[#403294] dark:text-[#B8ACFF] border-[#DFE1E6]/50 dark:border-[#3E4C5E]/50' }
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
    const [isModerator, setIsModerator] = useState(false);
    const canModerate = isAdmin || isModerator;
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

    // CSV Bulk Upload states
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [csvParsedRows, setCsvParsedRows] = useState([]);
    const [csvError, setCsvError] = useState('');
    const [csvIsUploading, setCsvIsUploading] = useState(false);

    // Custom Alert / Confirm / Prompt
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

    // Form inputs
    const [newTitle, setNewTitle] = useState('');
    const [newCarrera, setNewCarrera] = useState('area_comun');
    const [newCurso, setNewCurso] = useState('');
    const [newSection, setNewSection] = useState('A');
    const [newLink, setNewLink] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [isCompressingImg, setIsCompressingImg] = useState(false);
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

    const checkUserRoles = useCallback(async (sessionUser) => {
        setUser(sessionUser ?? null);
        let isAdminUser = sessionUser?.id === ADMIN_UID || sessionUser?.email === 'emanu@gmail.com';
        let isModUser = Boolean(
            isAdminUser ||
            (sessionUser?.id && MODERATOR_UIDS.includes(sessionUser.id)) ||
            (sessionUser?.email && MODERATOR_UIDS.includes(sessionUser.email)) ||
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

    // Check auth state
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            const timer = setTimeout(() => checkUserRoles(null), 0);
            return () => clearTimeout(timer);
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkUserRoles(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            checkUserRoles(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [checkUserRoles]);

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

        const cleanAlias = trimmed;

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

    // Check limit before opening modal
    const handleOpenAddModal = useCallback(() => {
        if (!canModerate) {
            const userGroupsCount = user 
                ? groups.filter(g => g.user_id === user.id).length 
                : groups.filter(g => g.is_local).length;
            if (userGroupsCount >= 5) {
                showAlert(
                    'Límite de Grupos Alcanzado (5/5)',
                    'Un usuario normal no puede publicar más de 5 grupos en el directorio. Si necesitas agregar más grupos o eres representante de curso, por favor comunícate con los administradores o moderadores del sitio para solicitar asistencia o permisos especiales.',
                    'warning'
                );
                return;
            }
        }
        setNewCarrera(selectedCarrera || 'todas');
        setIsAddModalOpen(true);
    }, [canModerate, user, groups, showAlert, selectedCarrera]);

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

        const finalTitle = newTitle.trim();
        const finalCurso = newCurso.trim();
        const finalSection = newSection.trim() || 'General';
        const finalAlias = activeAlias || 'Anónimo';
        const finalDesc = newDescription.trim() || null;
        const finalImageUrl = newImageUrl.trim() || null;

        if (isSupabaseConfigured && supabase) {
            try {
                const { error } = await supabase.from('whatsapp_groups').insert([{
                    title: finalTitle,
                    carrera: newCarrera,
                    curso: finalCurso,
                    section: finalSection,
                    link: cleanLink,
                    description: finalDesc,
                    image_url: finalImageUrl,
                    user_id: user?.id || null,
                    author_alias: finalAlias,
                    upvotes: 0
                }]);

                if (error) {
                    console.warn('Error al insertar grupo:', error);
                    showAlert('No se pudo guardar el grupo', formatUserError(error), 'error');
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
                image_url: finalImageUrl,
                user_id: user?.id || 'anon',
                author_alias: activeAlias,
                upvotes: 0,
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
        setNewCarrera('todas');
        setNewImageUrl('');
        setIsAddModalOpen(false);
        showAlert('¡Grupo Agregado!', 'Tu grupo estudiantil se ha publicado correctamente y está listo para que otros estudiantes se unan.', 'success');
    };

    const handleImageFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsCompressingImg(true);
            const imageUrl = await uploadOrCompressImage(file, 'groups');
            setNewImageUrl(imageUrl);
        } catch (err) {
            showAlert('Error al adjuntar imagen', err.message || 'No se pudo procesar la imagen.', 'error');
        } finally {
            setIsCompressingImg(false);
        }
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

    const handleDownloadTemplate = useCallback(() => {
        const csvContent = [
            'titulo,carrera,curso,seccion,enlace,descripcion,seudonimo',
            '"Matemática Básica 1 - Sección A",area_comun,"Matemática Básica 1",A,https://chat.whatsapp.com/ejemplo_mate1,"Grupo oficial para resolución de dudas y tareas",Moderador PEMTREE',
            '"Estructuras de Datos - Sección Única",sistemas,"Estructuras de Datos",A,https://chat.whatsapp.com/ejemplo_edd,"Discusión de laboratorio de EDD y proyectos",Moderador PEMTREE',
            '"Física 1 - Sección B",area_comun,"Física 1",B,https://chat.whatsapp.com/ejemplo_fisica1,"Apoyo general del curso",Moderador PEMTREE'
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'plantilla_grupos_pemtree.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        setCsvError('');
        setCsvParsedRows([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target?.result || '';
                if (typeof text !== 'string' || !text.trim()) {
                    setCsvError('El archivo CSV está vacío.');
                    return;
                }

                const lines = [];
                let curLine = [];
                let curField = '';
                let inQuotes = false;

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const nextChar = text[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            curField += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if ((char === ',' || char === ';') && !inQuotes) {
                        curLine.push(curField.trim());
                        curField = '';
                    } else if (char === '\n' && !inQuotes) {
                        curLine.push(curField.trim());
                        if (curLine.some(f => f !== '')) lines.push(curLine);
                        curLine = [];
                        curField = '';
                    } else if (char === '\r' && !inQuotes) {
                        // ignore
                    } else {
                        curField += char;
                    }
                }
                if (curField || curLine.length > 0) {
                    curLine.push(curField.trim());
                    if (curLine.some(f => f !== '')) lines.push(curLine);
                }

                if (lines.length < 2) {
                    setCsvError('El archivo CSV debe contener una fila de encabezados y al menos una fila de datos.');
                    return;
                }

                const headers = lines[0].map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
                const findIndex = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));

                const titleIdx = findIndex('titulo', 'title', 'nombre');
                const carreraIdx = findIndex('carrera', 'area', 'program');
                const cursoIdx = findIndex('curso', 'materia', 'subject');
                const sectionIdx = findIndex('seccion', 'section', 'sec');
                const linkIdx = findIndex('enlace', 'link', 'url', 'whatsapp', 'telegram', 'discord');
                const descIdx = findIndex('descrip', 'description', 'detalle');
                const aliasIdx = findIndex('alias', 'autor', 'author', 'seudonimo');

                if (cursoIdx === -1 && titleIdx === -1) {
                    setCsvError('El CSV debe incluir una columna para el nombre del curso ("curso" o "título"). Encabezados leídos: ' + headers.join(', '));
                    return;
                }
                if (linkIdx === -1) {
                    setCsvError('El CSV debe incluir una columna con los enlaces/URLs del grupo ("enlace" o "link"). Encabezados leídos: ' + headers.join(', '));
                    return;
                }

                const parsed = [];
                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i];
                    if (!row || row.length === 0 || row.every(c => !c)) continue;

                    const rawCurso = cursoIdx !== -1 ? (row[cursoIdx] || '').trim() : '';
                    const rawSection = sectionIdx !== -1 ? (row[sectionIdx] || 'A').trim() || 'A' : 'A';
                    const rawTitle = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : `${rawCurso || 'Curso Estudiantil'} - Sección ${rawSection}`;
                    const rawLink = linkIdx !== -1 ? (row[linkIdx] || '').trim() : '';
                    const rawDesc = descIdx !== -1 ? (row[descIdx] || '').trim() : '';
                    const rawAlias = aliasIdx !== -1 && row[aliasIdx] ? row[aliasIdx].trim() : (isAdmin ? 'Admin PEMTREE' : 'Moderador PEMTREE');

                    let rawCarrera = carreraIdx !== -1 ? (row[carreraIdx] || '').toLowerCase().trim() : 'area_comun';
                    const matchedCarrera = CARRERAS.find(c => c.id === rawCarrera || c.label.toLowerCase().includes(rawCarrera) || rawCarrera.includes(c.id));
                    const finalCarrera = matchedCarrera ? matchedCarrera.id : 'area_comun';

                    const isValidUrl = Boolean(rawLink && (rawLink.startsWith('http://') || rawLink.startsWith('https://')));
                    const isValidTitle = Boolean(rawCurso || rawTitle);

                    parsed.push({
                        id: 'csv-row-' + i,
                        rowNum: i + 1,
                        title: rawTitle,
                        carrera: finalCarrera,
                        curso: rawCurso || rawTitle,
                        section: rawSection,
                        link: rawLink,
                        description: rawDesc || null,
                        author_alias: rawAlias,
                        isValid: isValidUrl && isValidTitle,
                        errorMsg: !isValidUrl ? 'URL inválida (debe iniciar con http:// o https://)' : (!isValidTitle ? 'Título o Curso faltante' : '')
                    });
                }

                if (parsed.length === 0) {
                    setCsvError('No se encontraron filas de datos en el CSV.');
                } else {
                    setCsvParsedRows(parsed);
                }
            } catch (err) {
                setCsvError('Error al procesar el archivo: ' + (err.message || err));
            }
        };
        reader.readAsText(file, 'UTF-8');
    }, [isAdmin]);

    const handleCsvUploadSubmit = useCallback(async () => {
        const validRows = csvParsedRows.filter(r => r.isValid);
        if (validRows.length === 0) {
            setCsvError('No hay filas válidas listas para importar. Por favor verifica tu archivo.');
            return;
        }

        setCsvIsUploading(true);
        setCsvError('');

        if (isSupabaseConfigured && supabase) {
            try {
                const recordsToInsert = validRows.map(r => ({
                    title: r.title,
                    carrera: r.carrera,
                    curso: r.curso,
                    section: r.section,
                    link: r.link,
                    description: r.description,
                    user_id: user?.id || null,
                    author_alias: r.author_alias || (isAdmin ? 'Admin PEMTREE' : 'Moderador PEMTREE'),
                    upvotes: 0
                }));

                const { error } = await supabase.from('whatsapp_groups').insert(recordsToInsert);
                if (error) {
                    console.warn('Detalle interno al insertar CSV en Supabase:', error);
                    setCsvError('Error de base de datos de Supabase: ' + (error.message || 'Error desconocido'));
                    setCsvIsUploading(false);
                    return;
                }
                await fetchGroups();
            } catch (e) {
                setCsvError('Ocurrió un error al cargar masivamente: ' + (e.message || e));
                setCsvIsUploading(false);
                return;
            }
        } else {
            const newEntries = validRows.map((r, idx) => ({
                id: 'local-csv-' + Date.now() + '-' + idx,
                title: r.title,
                carrera: r.carrera,
                curso: r.curso,
                section: r.section,
                link: r.link,
                description: r.description,
                user_id: user?.id || 'mod-' + Date.now(),
                author_alias: r.author_alias || (isAdmin ? 'Admin PEMTREE' : 'Moderador PEMTREE'),
                upvotes: 0,
                reported_count: 0,
                created_at: new Date().toISOString()
            }));
            setGroups(prev => [...newEntries, ...prev]);
        }

        setCsvIsUploading(false);
        setIsCsvModalOpen(false);
        setCsvFile(null);
        setCsvParsedRows([]);
        showAlert('¡Carga Masiva Exitosa!', `Se importaron ${validRows.length} cursos/grupos estudiantiles correctamente al directorio.`, 'success');
    }, [csvParsedRows, user, isAdmin, fetchGroups, showAlert]);

    // Delete group
    const handleDeleteGroup = async (groupId) => {
        const target = groups.find(g => g.id === groupId);
        if (!target) return;
        const canDelete = canModerate || (user && target.user_id === user.id);
        if (!canDelete) {
            showAlert('Acceso denegado', 'Solo el autor del grupo, un administrador o un moderador pueden eliminar este enlace.', 'error');
            return;
        }

        const isModDeletingOther = isModerator && !isAdmin && target.user_id !== user?.id;

        const executeDelete = async (justification = null) => {
            if (isModDeletingOther && (!justification || !justification.trim())) {
                showAlert('Borrado cancelado', 'Como moderador, es obligatorio ingresar una justificación para eliminar contenido de otros usuarios.', 'warning');
                return;
            }

            if (isSupabaseConfigured && supabase) {
                try {
                    if (isModDeletingOther && justification) {
                        const { error: modErr } = await supabase.rpc('eliminar_contenido_moderado', {
                            p_tabla: 'whatsapp_groups',
                            p_item_id: groupId,
                            p_justificacion: justification.trim()
                        });
                        if (modErr) throw modErr;
                        sendFormspreeNotification({
                            tipo_evento: 'MODERADOR ELIMINÓ GRUPO',
                            a_quien: `Grupo: "${target.title}" (Autor: ${target.author_alias})`,
                            por_quien: user?.email || user?.id || 'Moderador',
                            porque: justification.trim()
                        });
                    } else {
                        const { error } = await supabase.from('whatsapp_groups').delete().eq('id', groupId);
                        if (error) throw error;
                    }
                    await fetchGroups();
                } catch (e) {
                    console.error('Error al eliminar grupo:', e);
                    showAlert('No se pudo eliminar el grupo', formatUserError(e), 'error');
                    return;
                }
            }
            setGroups(prev => prev.filter(g => g.id !== groupId));
        };

        if (isModDeletingOther) {
            showPrompt(
                'Moderación: Justificación obligatoria',
                `Estás eliminando el grupo "${target.title}" (de ${target.author_alias}). Como moderador, ingresa la justificación para la auditoría y notificación:`,
                'Ej: Spam, enlace roto, contenido inapropiado...',
                (justificationText) => executeDelete(justificationText)
            );
        } else {
            showConfirm(
                '¿Eliminar grupo estudiantil?',
                `¿Estás seguro de que deseas eliminar permanentemente el grupo "${target.title}" de la plataforma?`,
                () => executeDelete(null)
            );
        }
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
        sendFormspreeNotification({
            tipo_evento: 'REPORTE DE GRUPO ESTUDIANTIL',
            a_quien: `Grupo reportado: "${reportTarget.title}" (${reportTarget.curso}) - Autor original: ${reportTarget.author_alias}`,
            por_quien: user?.email || user?.id || 'Estudiante',
            porque: reportReason
        });
        showAlert('Reporte Enviado', `Gracias por notificar. Hemos registrado el reporte sobre "${reportTarget.title}".`, 'success');
    };

    // Filtered lists
    const displayedGroups = useMemo(() => {
        return groups.filter(g => {
            if (selectedCarrera !== 'todas' && g.carrera !== selectedCarrera && g.carrera !== 'todas') {
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
                                    <ShieldCheck size={16} className={`${isAdmin ? 'text-[#FFD700]' : isModerator ? 'text-[#38BDF8]' : 'text-[#79F2B8]'} shrink-0`} />
                                    <div className="text-left min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-blue-200 dark:text-slate-400">
                                            {isAdmin ? 'Admin PEMTREE' : isModerator ? 'Moderador PEMTREE' : 'Sesión Verificada'}
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
                            onClick={handleOpenAddModal}
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

                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter size={16} className="text-[#7A869A] dark:text-slate-400 hidden sm:block shrink-0" />
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

                        {canModerate && (
                            <button
                                onClick={() => {
                                    setCsvFile(null);
                                    setCsvParsedRows([]);
                                    setCsvError('');
                                    setIsCsvModalOpen(true);
                                }}
                                className="flex items-center justify-center gap-2 bg-[#0052CC] hover:bg-[#0043A4] dark:bg-[#0C295E] dark:hover:bg-[#1A3A75] text-white dark:text-[#4C9AFF] border border-transparent dark:border-[#4C9AFF]/30 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer w-full sm:w-auto"
                                title="Cargar masivamente cursos desde archivo CSV"
                            >
                                <FileSpreadsheet size={16} strokeWidth={2.5} />
                                <span>Cargar CSV</span>
                            </button>
                        )}
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
                    <EmptyState
                        icon={MessageSquare}
                        title={searchQuery || selectedCursoFilter ? 'No se encontraron grupos para tu búsqueda' : 'Aún no hay grupos clasificados en esta carrera'}
                        description="¿Tienes el enlace (WhatsApp, Telegram, Discord, Drive) del grupo de tu sección o curso? ¡Agrégalo ahora para ayudar a tus compañeros!"
                        actionLabel="Agregar Enlace Ahora"
                        onAction={handleOpenAddModal}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedGroups.map(group => {
                            const carreraObj = CARRERAS.find(c => c.id === group.carrera) || CARRERAS[0];
                            const isUpvoted = upvotedGroupIds.has(group.id);
                            const canDelete = canModerate || (user && group.user_id === user.id);

                            return (
                                <div
                                    key={group.id}
                                    className="bg-white dark:bg-[#1C2636] rounded-2xl p-5 border border-[#DFE1E6] dark:border-[#3E4C5E] hover:border-[#DFE1E6]/80 dark:hover:border-[#3E4C5E]/80 shadow-sm transition-all duration-150 flex flex-col justify-between gap-4"
                                >
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${carreraObj.badgeBg}`}>
                                                    {carreraObj.label}
                                                </span>
                                                {group.section && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F5F7] dark:bg-[#0E1624] text-[#5E6C84] dark:text-slate-350 border border-[#DFE1E6] dark:border-[#3E4C5E]">
                                                        Secc. {group.section}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-[#7A869A] dark:text-slate-400 font-medium">
                                                {formatTimeAgo(group.created_at)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-[#5E6C84] dark:text-slate-400 flex items-center gap-1">
                                                <BookOpen size={13} />
                                                <span>{group.curso}</span>
                                            </span>
                                            <h3 className="text-base sm:text-lg font-bold text-[#172B4D] dark:text-slate-100 leading-snug">
                                                {group.title}
                                            </h3>
                                        </div>

                                        {group.description && (
                                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed line-clamp-2">
                                                {group.description}
                                            </p>
                                        )}

                                        {group.image_url && (
                                            <div className="mt-1 rounded-xl overflow-hidden border border-[#DFE1E6] dark:border-[#3E4C5E] max-h-48 flex items-center justify-center bg-black/5 dark:bg-black/20">
                                                <img
                                                    src={group.image_url}
                                                    alt={group.title}
                                                    className="max-h-48 w-auto object-cover rounded-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                                                    onClick={() => window.open(group.image_url, '_blank')}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 pt-3 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                                        <div className="flex items-center justify-between gap-2 text-xs text-[#7A869A] dark:text-slate-400">
                                            <span className="font-medium flex items-center gap-1">
                                                <span>Por</span>
                                                <strong className="text-[#172B4D] dark:text-slate-200">{group.author_alias}</strong>
                                            </span>

                                            <div className="flex items-center gap-1 font-semibold text-[#5E6C84] dark:text-slate-300 text-xs">
                                                <CheckCircle2 size={14} className="text-[#059669] dark:text-[#10b981]" />
                                                <span>{group.upvotes || 0} útiles</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-1">
                                            <a
                                                href={group.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-grow flex items-center justify-center gap-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] font-bold text-xs sm:text-sm py-2 px-4 rounded-xl transition no-underline text-center shadow-sm"
                                            >
                                                <MessageSquare size={15} />
                                                <span>Abrir enlace</span>
                                                <ExternalLink size={13} />
                                            </a>

                                            <button
                                                onClick={() => handleCopyLink(group.id, group.link)}
                                                title="Copiar enlace"
                                                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                                    copiedId === group.id
                                                        ? 'bg-[#F4F5F7] dark:bg-[#2D333B] border-[#0052CC]/50 dark:border-[#4C9AFF]/50 text-[#0052CC] dark:text-[#4C9AFF]'
                                                        : 'bg-transparent hover:bg-[#F4F5F7] dark:hover:bg-[#2D333B] border-[#DFE1E6] dark:border-[#3E4C5E] text-[#5E6C84] dark:text-slate-300'
                                                }`}
                                            >
                                                {copiedId === group.id ? <Check size={15} /> : <Copy size={15} />}
                                                <span className="hidden sm:inline">{copiedId === group.id ? 'Copiado' : 'Copiar'}</span>
                                            </button>

                                            <button
                                                onClick={() => handleToggleUpvote(group.id)}
                                                title={isUpvoted ? 'Quitar confirmación' : 'Confirmar que este enlace funciona y es útil'}
                                                className={`py-2 px-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                                                    isUpvoted
                                                        ? 'bg-[#0052CC] dark:bg-[#4C9AFF] text-white dark:text-[#0E1624] border-[#0052CC] dark:border-[#4C9AFF] font-bold'
                                                        : 'bg-transparent hover:bg-[#F4F5F7] dark:hover:bg-[#2D333B] border-[#DFE1E6] dark:border-[#3E4C5E] text-[#7A869A] dark:text-slate-400'
                                                }`}
                                            >
                                                <CheckCircle2 size={15} />
                                            </button>

                                            <button
                                                onClick={() => handleOpenReportModal(group)}
                                                title="Reportar enlace caído o spam"
                                                className="py-2 px-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-transparent hover:bg-[#F4F5F7] dark:hover:bg-[#2D333B] text-[#7A869A] dark:text-slate-400 hover:text-[#BF2600] dark:hover:text-[#FF6369] transition cursor-pointer flex items-center justify-center"
                                            >
                                                <AlertTriangle size={15} />
                                            </button>

                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    title="Eliminar grupo"
                                                    className="py-2 px-2.5 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] bg-transparent hover:bg-[#FFEBE6] dark:hover:bg-[#450A0A]/40 text-[#7A869A] dark:text-slate-400 hover:text-[#BF2600] dark:hover:text-[#FF6369] transition cursor-pointer flex items-center justify-center"
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
            {isAddModalOpen && (
                <Modal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    title="Compartir Grupo Estudiantil"
                    icon={MessageSquare}
                    size="md"
                >
                    <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                        <Select
                            label="Carrera o Área"
                            value={newCarrera}
                            onChange={(e) => setNewCarrera(e.target.value)}
                        >
                            {CARRERAS.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </Select>

                        <div className="flex flex-col gap-1.5 relative w-full">
                            <Input
                                label="Curso"
                                placeholder="Ej. Matemática Básica 1, Estructuras de Datos..."
                                value={newCurso || cursoSearchText}
                                onChange={(e) => {
                                    setNewCurso(e.target.value);
                                    setCursoSearchText(e.target.value);
                                    setShowCursoDropdown(true);
                                }}
                                onFocus={() => setShowCursoDropdown(true)}
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

                        <div className="grid grid-cols-3 gap-3">
                            <Input
                                label="Sección"
                                placeholder="Ej. A, B, N, Única"
                                value={newSection}
                                onChange={(e) => setNewSection(e.target.value)}
                            />
                            <Input
                                label="Título descriptivo"
                                placeholder="Ej. Matemática Básica 1 - Secc A (Ing. Pérez)"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="col-span-2"
                            />
                        </div>

                        <Input
                            label="Enlace de Invitación o Recurso"
                            placeholder="https://chat.whatsapp.com/... o https://t.me/..."
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            type="url"
                        />

                        <Textarea
                            label="Descripción o notas (Opcional)"
                            rows={2}
                            placeholder="Ej. Grupo para compartir resoluciones, información de cortos y laboratorios..."
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                        />

                        {/* Image upload section */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-extrabold text-[#172B4D] dark:text-slate-200 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <ImageIcon size={15} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <span>Adjuntar imagen representativa (Opcional)</span>
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

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsAddModalOpen(false)}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="success"
                                size="sm"
                                className="bg-[#25D366] hover:bg-[#1EBE5D] text-white"
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span>Publicar Grupo Ahora</span>
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isReportModalOpen && reportTarget && (
                <Modal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    title="Reportar Grupo"
                    icon={AlertTriangle}
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300">
                            ¿Por qué razón deseas reportar el grupo <strong className="text-[#172B4D] dark:text-slate-100">"{reportTarget.title}"</strong>?
                        </p>
                        <Select
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                        >
                            <option value="Enlace expirado o caído">Enlace expirado o caído</option>
                            <option value="Contenido spam o ajeno a los cursos">Contenido spam o ajeno a los cursos</option>
                            <option value="Grupo duplicado">Grupo duplicado</option>
                            <option value="Enlace engañoso o malicioso">Enlace engañoso o malicioso</option>
                        </Select>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setIsReportModalOpen(false)}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleConfirmReport}
                                size="sm"
                            >
                                Enviar Reporte
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {isProfileModalOpen && (
                <Modal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    title="Mi Seudónimo en la Comunidad"
                    icon={UserCheck}
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300">
                            Tu seudónimo está sincronizado con el Foro Estudiantil y se utilizará cada vez que compartas un nuevo grupo o respondas a la comunidad:
                        </p>
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                            <Input
                                label="Seudónimo Público"
                                value={profileInputText}
                                onChange={(e) => setProfileInputText(e.target.value)}
                                placeholder="Ej. Estudiante CS #123, Dev_GT, etc."
                                maxLength={30}
                                autoFocus
                            />
                            <span className="text-[10px] text-[#7A869A] mt-1 block">Los cambios se verán reflejados al instante en el Foro y en tus Grupos compartidos.</span>

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsProfileModalOpen(false)}
                                    size="sm"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                >
                                    Guardar Seudónimo
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}

            {customAlert.isOpen && (
                <Modal
                    isOpen={customAlert.isOpen}
                    onClose={() => setCustomAlert({ ...customAlert, isOpen: false })}
                    title={customAlert.title}
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{customAlert.message}</p>
                        <div className="flex justify-end pt-1">
                            <Button
                                variant="primary"
                                onClick={() => setCustomAlert({ ...customAlert, isOpen: false })}
                                size="sm"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Carga Masiva por CSV (Admin & Moderadores) */}
            {isCsvModalOpen && (
                <Modal
                    isOpen={isCsvModalOpen}
                    onClose={() => !csvIsUploading && setIsCsvModalOpen(false)}
                    title="Carga Masiva de Cursos / Grupos (CSV)"
                    size="lg"
                >
                    <div className="flex flex-col gap-5">
                        {/* Guía rápida y Plantilla */}
                        <div className="bg-gradient-to-r from-amber-50/80 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-300/60 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                                    <p className="font-bold text-[#172B4D] dark:text-slate-100 mb-1">Permisos de Administrador / Moderador Activos</p>
                                    <p>Sube un archivo <code className="font-semibold text-amber-700 dark:text-amber-300">.csv</code> para publicar múltiples cursos de golpe. Puedes incluir columnas como: <span className="font-bold">curso, seccion, enlace, carrera, descripcion</span>.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-2 bg-white dark:bg-[#1C2636] hover:bg-amber-50 dark:hover:bg-[#283548] text-amber-700 dark:text-amber-300 font-extrabold text-xs px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 shadow-xs transition shrink-0 cursor-pointer"
                            >
                                <Download size={14} />
                                <span>Descargar Plantilla CSV</span>
                            </button>
                        </div>

                        {/* Zona de Drop / Input de Archivo */}
                        <div className="relative border-2 border-dashed border-[#DFE1E6] dark:border-[#3E4C5E] hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-6 transition bg-[#F4F5F7]/50 dark:bg-[#0E1624]/50 flex flex-col items-center justify-center text-center gap-3">
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                disabled={csvIsUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                            />
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Upload size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#172B4D] dark:text-slate-100">
                                    {csvFile ? csvFile.name : 'Haz clic o arrastra tu archivo CSV aquí'}
                                </p>
                                <p className="text-xs text-[#7A869A] dark:text-slate-400 mt-1">
                                    {csvFile ? `Tamaño: ${(csvFile.size / 1024).toFixed(1)} KB` : 'Formato compatible: .csv (codificado en UTF-8)'}
                                </p>
                            </div>
                        </div>

                        {/* Mensaje de Error si hay */}
                        {csvError && (
                            <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl p-3.5 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs font-semibold">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{csvError}</span>
                            </div>
                        )}

                        {/* Vista previa de las filas analizadas */}
                        {csvParsedRows.length > 0 && (
                            <div className="flex flex-col gap-2.5 max-h-[280px] overflow-hidden border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-2xl bg-white dark:bg-[#1C2636]">
                                <div className="bg-[#F4F5F7] dark:bg-[#0E1624] px-4 py-2.5 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex items-center justify-between text-xs font-bold text-[#5E6C84] dark:text-slate-300">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-emerald-500" />
                                        <span>Filas listas para importar ({csvParsedRows.filter(r => r.isValid).length} de {csvParsedRows.length} válidas)</span>
                                    </span>
                                    <span className="text-[11px] text-[#7A869A]">Vista Previa</span>
                                </div>
                                <div className="overflow-y-auto max-h-[230px] p-2 divide-y divide-[#DFE1E6]/60 dark:divide-[#3E4C5E]/60">
                                    {csvParsedRows.map((row) => (
                                        <div key={row.id} className="py-2.5 px-3 flex items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-6 h-6 rounded-md bg-[#F4F5F7] dark:bg-[#0E1624] flex items-center justify-center font-bold text-[#7A869A] shrink-0 text-[10px]">
                                                    {row.rowNum}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#172B4D] dark:text-slate-100 truncate">{row.curso} <span className="text-amber-600 dark:text-amber-400">({row.section})</span></p>
                                                    <p className="text-[11px] text-[#7A869A] dark:text-slate-400 truncate">{row.link}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {row.isValid ? (
                                                    <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-extrabold text-[10px]">Válido</span>
                                                ) : (
                                                    <span className="bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold text-[10px]" title={row.errorMsg}>Error: {row.errorMsg}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer de Acciones del Modal */}
                        <div className="flex justify-end items-center gap-3 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <Button
                                variant="secondary"
                                onClick={() => setIsCsvModalOpen(false)}
                                disabled={csvIsUploading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCsvUploadSubmit}
                                disabled={csvIsUploading || csvParsedRows.filter(r => r.isValid).length === 0}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold shadow-md border-none"
                            >
                                {csvIsUploading ? 'Importando Cursos...' : `Importar ${csvParsedRows.filter(r => r.isValid).length} Grupos Ahora`}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {customConfirm.isOpen && (
                <Modal
                    isOpen={customConfirm.isOpen}
                    onClose={() => setCustomConfirm({ ...customConfirm, isOpen: false })}
                    title={customConfirm.title}
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{customConfirm.message}</p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCustomConfirm({ ...customConfirm, isOpen: false })}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    if (customConfirm.onConfirm) customConfirm.onConfirm();
                                    setCustomConfirm({ ...customConfirm, isOpen: false });
                                }}
                                size="sm"
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {customPrompt.isOpen && (
                <Modal
                    isOpen={customPrompt.isOpen}
                    onClose={() => setCustomPrompt({ ...customPrompt, isOpen: false })}
                    title={customPrompt.title}
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{customPrompt.message}</p>
                        <input
                            type="text"
                            value={customPrompt.value}
                            onChange={(e) => setCustomPrompt({ ...customPrompt, value: e.target.value })}
                            placeholder={customPrompt.placeholder}
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#DFE1E6] dark:border-[#2D3A4F] bg-white dark:bg-[#0E1624] text-[#172B4D] dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCustomPrompt({ ...customPrompt, isOpen: false })}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    if (!customPrompt.value.trim()) return;
                                    if (customPrompt.onSubmit) customPrompt.onSubmit(customPrompt.value.trim());
                                    setCustomPrompt({ ...customPrompt, isOpen: false });
                                }}
                                size="sm"
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
