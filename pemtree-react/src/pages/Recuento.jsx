// src/pages/Recuento.jsx - Vista de resumen académico del estudiante y comunidad
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    GraduationCap,
    Clock,
    AlertTriangle,
    Users,
    MessageSquare,
    ArrowRight,
    CheckCircle2,
    BookOpen,
    ExternalLink,
    ThumbsUp,
    RefreshCw
} from 'lucide-react';
import Seo from '../components/seo/Seo';
import HelpButton from '../components/onboarding/HelpButton';
import { Card, Button } from '../components/ui';
import { useScreenWelcome } from '../context/OnboardingContext';
import { prepararRecuento, buildRecuento } from '../modules/data/recuento';
import { fetchGruposSugeridos, fetchMensajeDestacado } from '../lib/recuentoCommunity';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PERIOD_LABELS = {
    semestre1: 'Semestre 1',
    semestre2: 'Semestre 2',
    vacaciones1: 'Vacaciones 1',
    vacaciones2: 'Vacaciones 2',
};

function formatPlatform(platform) {
    if (!platform) return 'Grupo';
    const p = String(platform).toLowerCase();
    if (p === 'whatsapp') return 'WhatsApp';
    if (p === 'telegram') return 'Telegram';
    if (p === 'discord') return 'Discord';
    return p.charAt(0).toUpperCase() + p.slice(1);
}

function getPlatformLabel(group) {
    const rawPlatform = String(group?.platform || '').toLowerCase().trim();
    const link = String(group?.link || '').toLowerCase().trim();
    const title = String(group?.title || '').toLowerCase().trim();
    const desc = String(group?.description || '').toLowerCase().trim();

    if (
        rawPlatform.includes('whatsapp') ||
        rawPlatform === 'wa' ||
        link.includes('chat.whatsapp.com') ||
        link.includes('wa.me') ||
        link.includes('whatsapp.com') ||
        title.includes('whatsapp') ||
        desc.includes('whatsapp')
    ) {
        return 'WhatsApp';
    }
    if (
        rawPlatform.includes('discord') ||
        link.includes('discord.gg') ||
        link.includes('discord.com') ||
        title.includes('discord') ||
        desc.includes('discord')
    ) {
        return 'Discord';
    }
    if (
        rawPlatform.includes('telegram') ||
        rawPlatform === 'tg' ||
        link.includes('t.me') ||
        link.includes('telegram.me') ||
        link.includes('telegram.org') ||
        title.includes('telegram') ||
        desc.includes('telegram')
    ) {
        return 'Telegram';
    }
    if (
        rawPlatform.includes('classroom') ||
        link.includes('classroom.google.com') ||
        title.includes('classroom')
    ) {
        return 'Classroom';
    }
    if (
        rawPlatform.includes('drive') ||
        link.includes('drive.google.com') ||
        link.includes('docs.google.com') ||
        title.includes('drive') ||
        desc.includes('drive')
    ) {
        return 'Drive';
    }
    if (
        rawPlatform.includes('teams') ||
        link.includes('teams.microsoft.com') ||
        link.includes('teams.live.com') ||
        title.includes('teams')
    ) {
        return 'MS Teams';
    }
    if (
        rawPlatform.includes('facebook') ||
        rawPlatform.includes('messenger') ||
        link.includes('facebook.com') ||
        link.includes('messenger.com') ||
        link.includes('m.me') ||
        link.includes('fb.me')
    ) {
        return 'Facebook';
    }
    return formatPlatform(group?.platform);
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
}

export default function Recuento() {
    const { openHelp } = useScreenWelcome('recuento');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [filtroSemestre, setFiltroSemestre] = useState('obligatorios');
    const [horarioPeriodoFiltro, setHorarioPeriodoFiltro] = useState(null);
    const [activeTab, setActiveTab] = useState('avance');

    const [communityLoading, setCommunityLoading] = useState(true);
    const [grupos, setGrupos] = useState([]);
    const [destacado, setDestacado] = useState(null);
    const [user, setUser] = useState(null);

    const pseudonimoComunidad = useMemo(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('pemtree_forum_alias') : null;
        if (saved && saved.trim()) return saved.trim();

        const metaAlias = user?.user_metadata?.alias || user?.user_metadata?.pseudonimo || user?.user_metadata?.author_alias;
        if (metaAlias && metaAlias.trim()) return metaAlias.trim();

        if (user) {
            const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || '';
            const initials = rawName
                ? rawName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()
                : 'USAC';
            const idCode = user.id
                ? Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100
                : 482;
            return `Estudiante ${initials} #${idCode}`;
        }

        return null;
    }, [user]);

    const handleRetry = () => {
        setLoading(true);
        setError(null);
        setRetryCount(c => c + 1);
    };

    // Carga de sesión de Supabase
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;

        supabase.auth.getSession().then(({ data: sessionData }) => {
            setUser(sessionData?.session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Carga de datos locales (Fase 1)
    useEffect(() => {
        let cancelled = false;

        async function loadData() {
            try {
                setLoading(true);
                const ctx = await prepararRecuento();
                const result = buildRecuento(ctx);
                if (!cancelled) {
                    setData(result);
                    setError(null);
                }
            } catch (err) {
                console.error('Error cargando datos de recuento:', err);
                if (!cancelled) {
                    setError('No se pudieron cargar los datos de tu avance.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, [retryCount]);

    // Carga comunitaria de Supabase (Fase 2)
    useEffect(() => {
        let cancelled = false;

        async function loadCommunity() {
            if (!data) return;

            const carrerasSet = new Set();
            const pensumCarreraId = data.pensum?.carrera?.id;
            if (pensumCarreraId) carrerasSet.add(pensumCarreraId);

            try {
                const pensumActual = localStorage.getItem('pemtree_pensum_actual');
                if (pensumActual) carrerasSet.add(pensumActual);

                const tieneSimultanea = localStorage.getItem('pemtree_schedule_simultanea') === 'true' || Boolean(data.plan?.simultanea);
                if (tieneSimultanea) {
                    const segCarrera = localStorage.getItem('pemtree_schedule_segunda_carrera') || localStorage.getItem('pemtree_plan_segunda_carrera');
                    if (segCarrera) carrerasSet.add(segCarrera);
                }
            } catch {
                // Ignore localStorage read errors
            }

            const cursosMap = new Map();

            if (data.horario?.cursosDetalle && Array.isArray(data.horario.cursosDetalle)) {
                for (const c of data.horario.cursosDetalle) {
                    if (c.codigo) {
                        cursosMap.set(String(c.codigo), {
                            codigo: String(c.codigo),
                            nombre: c.nombre || '',
                            seccion: c.secciones?.[0] || null,
                            estado: 'horario'
                        });
                    }
                }
            }

            if (data.progreso?.cursosCursando && Array.isArray(data.progreso.cursosCursando)) {
                for (const c of data.progreso.cursosCursando) {
                    const cod = String(c.codigo);
                    if (!cursosMap.has(cod)) {
                        cursosMap.set(cod, {
                            codigo: cod,
                            nombre: c.nombre || '',
                            seccion: null,
                            estado: 'cursando',
                            semestre: c.semestre
                        });
                    }
                }
            }

            if (data.plan && Array.isArray(data.plan.lineas)) {
                for (const line of data.plan.lineas) {
                    for (const block of line.blocks || []) {
                        for (const c of block.cursos || []) {
                            const cod = String(c.codigo);
                            if (cod && !cursosMap.has(cod)) {
                                cursosMap.set(cod, {
                                    codigo: cod,
                                    nombre: c.nombre || '',
                                    seccion: null,
                                    estado: 'plan',
                                    semestre: c.semestre
                                });
                            }
                        }
                    }
                }
            }

            if (data.progreso?.cursosDisponibles && Array.isArray(data.progreso.cursosDisponibles)) {
                for (const c of data.progreso.cursosDisponibles.slice(0, 10)) {
                    const cod = String(c.codigo);
                    if (!cursosMap.has(cod)) {
                        cursosMap.set(cod, {
                            codigo: cod,
                            nombre: c.nombre || '',
                            seccion: null,
                            estado: 'disponible',
                            semestre: c.semestre
                        });
                    }
                }
            }

            const semestresActivos = Array.from(cursosMap.values()).map(c => c.semestre).filter(Boolean);
            const tieneAreaComun = semestresActivos.some(s => s <= 3) ||
                (data.progreso?.porSemestre || []).slice(0, 3).some(s => (s.aprobados < s.total) || s.enCurso > 0);
            if (tieneAreaComun) {
                carrerasSet.add('area_comun');
            }

            const listaCarreras = Array.from(carrerasSet);
            const listaCursos = Array.from(cursosMap.values());

            setCommunityLoading(true);

            try {
                const [gruposRes, postRes] = await Promise.all([
                    fetchGruposSugeridos({
                        carreras: listaCarreras,
                        cursos: listaCursos,
                        limit: 3
                    }),
                    fetchMensajeDestacado({
                        carreras: listaCarreras,
                        cursos: listaCursos
                    })
                ]);

                if (!cancelled) {
                    setGrupos(gruposRes || []);
                    setDestacado(postRes || null);
                }
            } catch (err) {
                console.warn('Error cargando datos comunitarios en Recuento:', err);
                if (!cancelled) {
                    setGrupos([]);
                    setDestacado(null);
                }
            } finally {
                if (!cancelled) setCommunityLoading(false);
            }
        }

        loadCommunity();

        return () => {
            cancelled = true;
        };
    }, [data, user]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center overflow-y-auto w-full bg-[#F4F5F7] dark:bg-[#0E1624] hide-scrollbar">
                <div className="w-full bg-[#E6EFF5] dark:bg-[#1A2B38] py-8 px-4 shrink-0">
                    <div className="max-w-5xl mx-auto h-14 bg-[#3B6988]/10 dark:bg-white/10 rounded-xl animate-pulse" />
                </div>
                <div className="max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
                    <div className="h-44 bg-white dark:bg-[#1C2636] rounded-2xl animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 h-80 bg-white dark:bg-[#1C2636] rounded-2xl animate-pulse" />
                        <div className="lg:col-span-5 h-80 bg-white dark:bg-[#1C2636] rounded-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] p-4 sm:p-6">
                <div className="max-w-md mx-auto my-14">
                    <Card className="flex flex-col items-center gap-3.5 p-6 text-center !border-0">
                        <AlertTriangle className="w-12 h-12 text-[#3B6988] dark:text-[#6BA3C8]" />
                        <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                            No pudimos cargar tu recuento
                        </h2>
                        <p className="text-sm text-[#5E6C84] dark:text-slate-400">
                            {error || 'Ocurrió un error al consolidar los datos de tu pensum.'}
                        </p>
                        <Button variant="primary" onClick={handleRetry} className="mt-2 text-sm font-semibold !bg-[#3B6988] hover:!bg-[#2C526B] dark:!bg-[#6BA3C8] dark:hover:!bg-[#5690B6] dark:!text-[#0E1624]">
                            Reintentar
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    const { pensum, progreso, plan, horario, avisos } = data;
    const periodoSeleccionadoId = horarioPeriodoFiltro || horario.periodoActivo || horario.periodo || 'semestre1';
    const datosHorarioPeriodo = horario.periodos?.[periodoSeleccionadoId] || horario;
    const nombrePeriodoSeleccionado = PERIOD_LABELS[periodoSeleccionadoId] || periodoSeleccionadoId;

    const handleIrAHorario = (pId = periodoSeleccionadoId) => {
        localStorage.setItem('pemtree_schedule_period', pId);
        navigate('/visualizador?view=schedule');
    };

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto w-full bg-[#F4F5F7] dark:bg-[#0E1624] hide-scrollbar">
            <Seo
                pathname="/recuento"
                title="Recuento académico"
                description="Resumen de tu avance en el pensum: créditos, horario y avisos."
            />

            {/* Header Banner */}
            <div className="w-full bg-[#E6EFF5] dark:bg-[#1A2B38] py-8 px-4 shrink-0">
                <div className="max-w-5xl mx-auto flex items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#3B6988]/12 dark:bg-[#6BA3C8]/15 flex items-center justify-center shrink-0">
                            <GraduationCap size={24} className="text-[#3B6988] dark:text-[#6BA3C8]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1E3A4C] dark:text-slate-100">
                                Recuento Académico
                            </h1>
                            <p className="text-sm text-[#475569] dark:text-slate-300 mt-1 leading-relaxed truncate">
                                {pensum.carrera?.nombre || 'Ingeniería'}
                                {pseudonimoComunidad ? ` · ${pseudonimoComunidad}` : ''}
                            </p>
                        </div>
                    </div>
                    <HelpButton onClick={openHelp} className="shrink-0" title="Ayuda del recuento" />
                </div>
            </div>

            <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">
                {/* 1. Resumen de Progreso y Métricas */}
                <Card className="flex flex-col gap-7 !border-0">
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#5E6C84] dark:text-slate-400">
                                    Avance total
                                </span>
                                <span className="text-4xl sm:text-5xl font-extrabold text-[#3B6988] dark:text-[#6BA3C8] tracking-tight leading-none">
                                    {progreso.porcentaje}%
                                </span>
                            </div>

                            <div className="flex flex-col sm:items-end gap-1">
                                <span className="text-base sm:text-lg font-bold text-[#172B4D] dark:text-slate-100">
                                    {progreso.creditosAprobados} de {progreso.totalCreditos} créditos
                                </span>
                                {plan.simultanea && (
                                    <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400">
                                        Carrera simultánea
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="w-full h-3 rounded-full bg-[#DFE1E6] dark:bg-[#0E1624] overflow-hidden flex">
                            {progreso.totalCreditos > 0 && (
                                <>
                                    <div
                                        className="h-full bg-[#3B6988] dark:bg-[#6BA3C8] transition-all duration-500"
                                        style={{ width: `${Math.min(100, (progreso.obligatorios.creditosAprobados / progreso.totalCreditos) * 100)}%` }}
                                        title={`Obligatorios: ${progreso.obligatorios.creditosAprobados} CR`}
                                    />
                                    <div
                                        className="h-full bg-[#3B6988]/45 dark:bg-[#6BA3C8]/45 transition-all duration-500"
                                        style={{ width: `${Math.min(100, (progreso.optativos.creditosAprobados / progreso.totalCreditos) * 100)}%` }}
                                        title={`Optativos: ${progreso.optativos.creditosAprobados} CR`}
                                    />
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 gap-x-10 gap-y-2.5 pt-1">
                            <div className="flex items-center gap-x-10 gap-y-2 flex-wrap">
                                <span className="inline-flex items-center gap-2.5 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B6988] dark:bg-[#6BA3C8]" />
                                    <span>Obligatorios: <strong className="text-[#172B4D] dark:text-slate-100 font-bold">{progreso.obligatorios.creditosAprobados}</strong> / {progreso.obligatorios.creditosTotal} CR</span>
                                </span>
                                <span className="inline-flex items-center gap-2.5 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B6988]/45 dark:bg-[#6BA3C8]/45" />
                                    <span>Optativos: <strong className="text-[#172B4D] dark:text-slate-100 font-bold">{progreso.optativos.creditosAprobados}</strong> / {progreso.optativos.creditosTotal} CR</span>
                                </span>
                            </div>
                            {progreso.idiomaEquivalencia && (
                                <span className="text-xs text-[#5E6C84] dark:text-slate-400">
                                    Incluye equivalencia de idioma
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-center">
                        <div className="flex flex-col items-center justify-center py-1">
                            <div className="flex items-center justify-center gap-2.5 text-sm sm:text-base font-bold text-[#3B6988] dark:text-[#6BA3C8]">
                                <CheckCircle2 size={18} />
                                <span>Aprobados</span>
                            </div>
                            <div className="mt-2.5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-[#172B4D] dark:text-slate-100 leading-none">
                                    {progreso.aprobados}
                                </span>
                                <span className="text-sm font-medium text-[#5E6C84] dark:text-slate-400 ml-2">
                                    cursos
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-1">
                            <div className="flex items-center justify-center gap-2.5 text-sm sm:text-base font-bold text-[#3B6988] dark:text-[#6BA3C8]">
                                <Clock size={18} />
                                <span>En curso</span>
                            </div>
                            <div className="mt-2.5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-[#172B4D] dark:text-slate-100 leading-none">
                                    {progreso.enCurso}
                                </span>
                                <span className="text-sm font-medium text-[#5E6C84] dark:text-slate-400 ml-2">
                                    cursos ({progreso.creditosEnCurso} CR)
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-1">
                            <div className="flex items-center justify-center gap-2.5 text-sm sm:text-base font-bold text-[#5E6C84] dark:text-slate-300">
                                <BookOpen size={18} />
                                <span>Disponibles</span>
                            </div>
                            <div className="mt-2.5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-[#172B4D] dark:text-slate-100 leading-none">
                                    {progreso.disponibles}
                                </span>
                                <span className="text-sm font-medium text-[#5E6C84] dark:text-slate-400 ml-2">
                                    cursos
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Navegación por pestañas para evitar saturación visual */}
                <div className="flex items-center gap-1 overflow-x-auto">
                    {[
                        { id: 'avance', label: 'Avance por semestre' },
                        {
                            id: 'horario',
                            label: avisos.length > 0 ? `Horario y avisos (${avisos.length})` : 'Horario y avisos',
                        },
                        { id: 'zanate', label: 'Zanate' },
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-bold whitespace-nowrap cursor-pointer border-0 rounded-lg transition-colors ${
                                    isActive
                                        ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8]'
                                        : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* 2. Avance por Semestre */}
                {activeTab === 'avance' && (
                    <Card className="flex flex-col gap-5 !border-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h2 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-slate-100">
                                    Avance por semestre
                                </h2>

                                <div className="flex items-center gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-lg text-xs font-bold self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('todos')}
                                        className={`px-3 py-1 transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'todos'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#3B6988] dark:text-[#6BA3C8] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('obligatorios')}
                                        className={`px-3 py-1 transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'obligatorios'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#3B6988] dark:text-[#6BA3C8] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        Obligatorios
                                    </button>
                                </div>
                            </div>

                            {progreso.porSemestre.length === 0 ? (
                                <div className="text-sm text-[#5E6C84] dark:text-slate-400 py-8 text-center">
                                    Marca cursos como completados para visualizar tu avance por ciclo.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                                    {progreso.porSemestre.map(s => {
                                        const obligTotal = s.obligatoriosTotal;
                                        const obligAprob = s.obligatoriosAprobados;
                                        const optTotal = s.optativosTotal;
                                        const optAprob = s.optativosAprobados;

                                        const semTotal = filtroSemestre === 'obligatorios' ? obligTotal : s.total;
                                        const semAprob = filtroSemestre === 'obligatorios' ? obligAprob : s.aprobados;
                                        const semPct = semTotal > 0 ? Math.round((semAprob / semTotal) * 100) : 0;

                                        const obligPct = s.total > 0 ? (obligAprob / s.total) * 100 : 0;
                                        const optPct = s.total > 0 ? (optAprob / s.total) * 100 : 0;

                                        return (
                                            <div
                                                key={s.semestre}
                                                className="pb-3.5 flex flex-col gap-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-bold text-[#172B4D] dark:text-slate-100">
                                                            Semestre {s.semestre}
                                                        </span>
                                                        <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400">
                                                            {semPct}%
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-[#172B4D] dark:text-slate-300">
                                                        {semAprob} / {semTotal}
                                                    </span>
                                                </div>

                                                <div className="w-full h-2 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden flex">
                                                    {filtroSemestre === 'todos' ? (
                                                        <>
                                                            {obligPct > 0 && (
                                                                <div
                                                                    className="h-full bg-[#3B6988] dark:bg-[#6BA3C8] transition-all duration-500"
                                                                    style={{ width: `${obligPct}%` }}
                                                                />
                                                            )}
                                                            {optPct > 0 && (
                                                                <div
                                                                    className="h-full bg-[#3B6988]/45 dark:bg-[#6BA3C8]/45 transition-all duration-500"
                                                                    style={{ width: `${optPct}%` }}
                                                                />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div
                                                            className="h-full bg-[#3B6988] dark:bg-[#6BA3C8] transition-all duration-500"
                                                            style={{ width: `${semPct}%` }}
                                                        />
                                                    )}
                                                </div>

                                                {filtroSemestre === 'todos' && (
                                                    <div className="flex items-center justify-between text-xs text-[#5E6C84] dark:text-slate-400">
                                                        <span>{obligAprob}/{obligTotal} obligatorios</span>
                                                        {optTotal > 0 ? (
                                                            <span>{optAprob}/{optTotal} optativos</span>
                                                        ) : (
                                                            <span className="opacity-60">Sin optativos</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                )}

                {/* 3. Horario y Avisos */}
                {activeTab === 'horario' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Mi horario */}
                        <Card className="flex flex-col gap-5 !border-0">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-slate-100">
                                    Mi horario
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => handleIrAHorario(periodoSeleccionadoId)}
                                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#3B6988] dark:text-[#6BA3C8] hover:underline cursor-pointer bg-transparent border-none p-0"
                                >
                                    <span>{datosHorarioPeriodo.secciones === 0 ? 'Armar' : 'Editar'}</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-lg text-center text-xs font-bold">
                                {[
                                    { id: 'semestre1', label: 'Sem 1' },
                                    { id: 'semestre2', label: 'Sem 2' },
                                    { id: 'vacaciones1', label: 'Vac 1' },
                                    { id: 'vacaciones2', label: 'Vac 2' },
                                ].map(p => {
                                    const isSelected = periodoSeleccionadoId === p.id;
                                    const isActivo = (horario.periodoActivo || horario.periodo) === p.id;
                                    const tieneDatos = (horario.periodos?.[p.id]?.secciones || 0) > 0;

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setHorarioPeriodoFiltro(p.id)}
                                            className={`py-1.5 px-1 transition-all cursor-pointer border-none flex items-center justify-center gap-1 ${
                                                isSelected
                                                    ? 'bg-white dark:bg-[#1C2636] text-[#3B6988] dark:text-[#6BA3C8] shadow-xs'
                                                    : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span>{p.label}</span>
                                            {(isActivo || tieneDatos) && (
                                                <span
                                                    className={`rounded-full bg-[#3B6988] dark:bg-[#6BA3C8] ${isActivo ? 'w-1.5 h-1.5' : 'w-1 h-1 opacity-60'}`}
                                                    title={isActivo ? 'Periodo actual según calendario' : undefined}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {datosHorarioPeriodo.secciones === 0 ? (
                                <div className="py-2 flex flex-col gap-3 text-sm text-[#5E6C84] dark:text-slate-400">
                                    <span>Sin secciones armadas para {nombrePeriodoSeleccionado}.</span>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleIrAHorario(periodoSeleccionadoId)}
                                        className="self-start gap-1.5 !bg-[#3B6988] hover:!bg-[#2C526B] dark:!bg-[#6BA3C8] dark:hover:!bg-[#5690B6] dark:!text-[#0E1624]"
                                    >
                                        <span>Armar {nombrePeriodoSeleccionado}</span>
                                        <ArrowRight size={14} />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-3 gap-2 py-3 text-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">Cursos</span>
                                            <span className="text-xl font-extrabold text-[#172B4D] dark:text-slate-100 mt-1">{datosHorarioPeriodo.cursos}</span>
                                        </div>
                                        <div className="flex flex-col px-1">
                                            <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">Secciones</span>
                                            <span className="text-xl font-extrabold text-[#172B4D] dark:text-slate-100 mt-1">{datosHorarioPeriodo.secciones}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">Carga</span>
                                            <span className="text-base sm:text-lg font-extrabold text-[#3B6988] dark:text-[#6BA3C8] mt-1">{datosHorarioPeriodo.horasSemana} h/sem</span>
                                        </div>
                                    </div>

                                    {datosHorarioPeriodo.cursosDetalle && datosHorarioPeriodo.cursosDetalle.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {datosHorarioPeriodo.cursosDetalle.map(c => (
                                                <div
                                                    key={c.codigo}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-200"
                                                >
                                                    <span className="truncate max-w-[150px]">{c.nombre}</span>
                                                    <span className="text-[11px] font-bold text-[#3B6988] dark:text-[#6BA3C8]">
                                                        Sec. {c.secciones.join(', ')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* Avisos */}
                        <Card className="flex flex-col gap-4 !border-0">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-slate-100">
                                    Avisos
                                </h2>
                                {avisos.length > 0 && (
                                    <span className="text-xs font-semibold text-[#3B6988] dark:text-[#6BA3C8]">
                                        {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
                                    </span>
                                )}
                            </div>

                            {avisos.length === 0 ? (
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 py-1">
                                    <CheckCircle2 size={16} className="text-[#3B6988] dark:text-[#6BA3C8] shrink-0" />
                                    <span>Sin advertencias de apertura ni traslapes.</span>
                                </div>
                            ) : (
                                <div className="flex flex-col divide-y divide-[#DFE1E6] dark:divide-[#3E4C5E]">
                                    {avisos.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2"
                                        >
                                            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#172B4D] dark:text-slate-200">
                                                <span>{item.nombre}</span>
                                                <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">
                                                    Bloque {item.blockId}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {item.avisos.map((av, aIdx) => (
                                                    <div
                                                        key={aIdx}
                                                        className="flex items-start gap-2 text-xs text-[#5E6C84] dark:text-slate-300 leading-relaxed"
                                                    >
                                                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#3B6988] dark:text-[#6BA3C8]" />
                                                        <span>{av.texto}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-3 flex items-center justify-between gap-2">
                                <span className="text-xs text-[#5E6C84] dark:text-slate-400">
                                    ¿Ya llevaste estas secciones?
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleIrAHorario()}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#3B6988] dark:text-[#6BA3C8] hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0"
                                >
                                    <span>Recomendar en Horarios</span>
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* 4. Comunidad (Zanate) */}
                {activeTab === 'zanate' && (
                    <Card className="flex flex-col gap-5 !border-0">
                        <div className="flex items-center justify-between flex-wrap gap-3 pb-4">
                            <div className="flex items-center gap-2.5">
                                <Users className="w-5 h-5 text-[#3B6988] dark:text-[#6BA3C8]" />
                                <h2 className="text-lg sm:text-xl font-extrabold text-[#172B4D] dark:text-slate-100 tracking-tight">
                                    Zanate
                                </h2>
                            </div>
                            <div className="flex items-center gap-4 text-xs sm:text-sm font-bold">
                                <Link to="/grupos" className="text-[#3B6988] dark:text-[#6BA3C8] hover:underline no-underline">
                                    Ver grupos
                                </Link>
                                <a
                                    href="https://zanate.pages.dev"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#3B6988] dark:text-[#6BA3C8] hover:underline no-underline"
                                >
                                    Ir al foro
                                </a>
                            </div>
                        </div>

                        {!isSupabaseConfigured || !supabase ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-sm text-[#5E6C84] dark:text-slate-400">
                                <Users className="w-8 h-8 text-[#5E6C84]/70 dark:text-slate-500" />
                                <span>Los servicios comunitarios no están configurados temporalmente.</span>
                            </div>
                        ) : communityLoading ? (
                            <div className="flex items-center justify-center py-10 text-sm font-semibold text-[#5E6C84] dark:text-slate-400 gap-2.5">
                                <RefreshCw size={16} className="animate-spin text-[#3B6988] dark:text-[#6BA3C8]" />
                                <span>Cargando comunidad...</span>
                            </div>
                        ) : (
                        <div className="flex flex-col gap-5">
                            {/* Grupos sugeridos */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-200">
                                        Grupos sugeridos
                                    </h3>
                                    <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">
                                        {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}
                                    </span>
                                </div>

                                {grupos.length === 0 ? (
                                    <div className="p-5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] text-center text-sm text-[#5E6C84] dark:text-slate-400">
                                        Aún no hay grupos registrados para los cursos de tu pensum actual.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {grupos.map(g => {
                                            const platformLabel = getPlatformLabel(g);
                                            return (
                                                <div
                                                    key={g.id}
                                                    className="bg-[#F4F5F7] dark:bg-[#0E1624] rounded-xl p-4 flex flex-col justify-between gap-3.5"
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between gap-2 text-xs text-[#5E6C84] dark:text-slate-400">
                                                            <span className="font-bold uppercase tracking-wider">
                                                                {platformLabel}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 font-semibold">
                                                                <ThumbsUp size={12} />
                                                                <span>{g.upvotes || 0}</span>
                                                            </span>
                                                        </div>

                                                        {g.image_url && (
                                                            <div className="overflow-hidden rounded-lg max-h-36 bg-black/5 dark:bg-black/20 flex items-center justify-center">
                                                                <img
                                                                    src={g.image_url}
                                                                    alt={g.title}
                                                                    onError={(e) => {
                                                                        e.currentTarget.parentElement.style.display = 'none';
                                                                    }}
                                                                    className="w-full h-36 object-cover"
                                                                />
                                                            </div>
                                                        )}

                                                        {g.curso && (
                                                            <span className="text-xs font-bold text-[#3B6988] dark:text-[#6BA3C8]">
                                                                {g.curso}{g.section ? ` · Secc. ${g.section}` : ''}
                                                            </span>
                                                        )}

                                                        <h4 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100 leading-snug line-clamp-2">
                                                            {g.title}
                                                        </h4>

                                                        {g.description && (
                                                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 leading-relaxed line-clamp-2">
                                                                {truncateText(g.description, 120)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {g.link && (
                                                        <a
                                                            href={g.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md text-xs sm:text-sm font-bold bg-[#3B6988] hover:bg-[#2C526B] dark:bg-[#6BA3C8] dark:hover:bg-[#5690B6] text-white dark:text-[#0E1624] no-underline transition-colors"
                                                        >
                                                            <span>Abrir enlace</span>
                                                            <ExternalLink size={13} />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Publicación destacada del Foro */}
                            {destacado && (
                                <div className="p-4 sm:p-5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[#3B6988] dark:text-[#6BA3C8]">
                                            {destacado.is_pinned ? 'Destacado en el foro' : 'Popular en el foro'}
                                        </span>
                                        <span className="font-medium text-[#5E6C84] dark:text-slate-400">
                                            Por {destacado.author_alias || 'Anónimo'}
                                        </span>
                                    </div>

                                    <h4 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                        {destacado.title}
                                    </h4>

                                    <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                                        {truncateText(destacado.content, 200)}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs font-semibold text-[#5E6C84] dark:text-slate-400 pt-1">
                                        <span className="inline-flex items-center gap-1.5">
                                            <ThumbsUp size={13} />
                                            <span>{destacado.likes || 0}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <MessageSquare size={13} />
                                            <span>{destacado.comment_count || 0}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Acceso si no autenticado */}
                            {!user && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4">
                                    <span className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400">
                                        Inicia sesión para ver grupos personalizados según tus cursos.
                                    </span>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => window.dispatchEvent(new Event('pemtree-open-auth-modal'))}
                                        className="shrink-0 !bg-[#3B6988] hover:!bg-[#2C526B] dark:!bg-[#6BA3C8] dark:hover:!bg-[#5690B6] dark:!text-[#0E1624]"
                                    >
                                        Iniciar sesión
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
                )}
            </div>
        </div>
    );
}
