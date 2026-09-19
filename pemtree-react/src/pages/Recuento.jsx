// src/pages/Recuento.jsx - Vista de resumen académico del estudiante y comunidad
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    RefreshCw,
    Sparkles
} from 'lucide-react';
import Seo from '../components/seo/Seo';
import HelpButton from '../components/onboarding/HelpButton';
import { Card, EmptyState, Button } from '../components/ui';
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
    const [filtroSemestre, setFiltroSemestre] = useState('todos');
    const [horarioPeriodoFiltro, setHorarioPeriodoFiltro] = useState(null);

    const [communityLoading, setCommunityLoading] = useState(true);
    const [grupos, setGrupos] = useState([]);
    const [destacado, setDestacado] = useState(null);
    const [user, setUser] = useState(null);

    // Seudónimo de la comunidad (prioriza alias guardado en localStorage > metadata > alias generado de la comunidad)
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

            const carreraId = data.pensum?.carrera?.id || null;

            const cursosRelevantes = [];
            if (data.plan && Array.isArray(data.plan.lineas)) {
                for (const line of data.plan.lineas) {
                    for (const block of line.blocks || []) {
                        for (const c of block.cursos || []) {
                            if (c.codigo && !cursosRelevantes.includes(c.codigo)) {
                                cursosRelevantes.push(c.codigo);
                            }
                        }
                    }
                }
            }

            setCommunityLoading(true);

            try {
                const [gruposRes, postRes] = await Promise.all([
                    fetchGruposSugeridos({
                        carrera: carreraId,
                        cursos: cursosRelevantes.slice(0, 8),
                        userId: user?.id || null,
                        limit: 3
                    }),
                    fetchMensajeDestacado({
                        carrera: carreraId
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

    // Estado de carga inicial
    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] p-4 sm:p-6 transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex flex-col gap-5">
                    <div className="h-10 w-52 bg-slate-200 dark:bg-[#1C2636] rounded-lg animate-pulse" />
                    <div className="h-44 bg-slate-200 dark:bg-[#1C2636] rounded-2xl animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-8 h-96 bg-slate-200 dark:bg-[#1C2636] rounded-2xl animate-pulse" />
                        <div className="lg:col-span-4 h-96 bg-slate-200 dark:bg-[#1C2636] rounded-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // Estado de error
    if (error || !data) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] p-4 sm:p-6 transition-colors duration-300">
                <div className="max-w-md mx-auto my-14">
                    <Card className="flex flex-col items-center gap-3.5 p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-[#BF2600] dark:text-[#FF6369]" />
                        <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                            No pudimos cargar tu recuento
                        </h2>
                        <p className="text-sm text-[#5E6C84] dark:text-slate-400">
                            {error || 'Ocurrió un error al consolidar los datos de tu pensum.'}
                        </p>
                        <Button variant="primary" onClick={handleRetry} className="mt-2 text-sm font-semibold">
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
    const esPeriodoActivoCalendario = (periodoSeleccionadoId === (horario.periodoActivo || horario.periodo));

    const handleIrAHorario = (pId = periodoSeleccionadoId) => {
        localStorage.setItem('pemtree_schedule_period', pId);
        navigate('/visualizador?view=schedule');
    };

    const flojo = [...progreso.porSemestre]
        .filter(s => s.total > 0)
        .sort((a, b) => (a.aprobados / a.total) - (b.aprobados / b.total))[0];

    return (
        <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] transition-colors duration-300">
            <Seo
                pathname="/recuento"
                title="Recuento académico"
                description="Resumen de tu avance en el pensum: créditos, horario y avisos."
            />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
                {/* 1. Cabecera */}
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#172B4D] dark:text-slate-100 tracking-tight">
                                Recuento
                            </h1>
                            {pseudonimoComunidad && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]">
                                    Hola, {pseudonimoComunidad}
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-[#5E6C84] dark:text-slate-400 mt-1">
                            {pensum.carrera?.nombre || 'Ingeniería'}
                            {pensum.pensumInfo?.cohort ? ` · Cohorte ${pensum.pensumInfo.cohort}` : ''}
                        </p>
                    </div>
                    <HelpButton onClick={openHelp} className="shrink-0" title="Ayuda del recuento" />
                </div>

                {/* 2. Resumen Ejecutivo: Avance General y Métricas Clave */}
                <Card className="p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
                    {/* Barra de progreso global */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0052CC] dark:text-[#4C9AFF] tracking-tight">
                                    {progreso.porcentaje}%
                                </span>
                                <span className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-200">
                                    {progreso.creditosAprobados} de {progreso.totalCreditos} créditos
                                </span>
                            </div>
                            {plan.simultanea && (
                                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border border-[#0052CC]/20">
                                    Carrera simultánea
                                </span>
                            )}
                        </div>

                        {/* Barra de progreso */}
                        <div className="w-full h-3.5 sm:h-4 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden flex shadow-inner">
                            {progreso.totalCreditos > 0 && (
                                <>
                                    <div
                                        className="h-full bg-[#0052CC] dark:bg-[#4C9AFF] transition-all duration-500"
                                        style={{ width: `${Math.min(100, (progreso.obligatorios.creditosAprobados / progreso.totalCreditos) * 100)}%` }}
                                        title={`Obligatorios: ${progreso.obligatorios.creditosAprobados} CR`}
                                    />
                                    <div
                                        className="h-full bg-[#5243AA] dark:bg-[#8777D9] transition-all duration-500"
                                        style={{ width: `${Math.min(100, (progreso.optativos.creditosAprobados / progreso.totalCreditos) * 100)}%` }}
                                        title={`Optativos: ${progreso.optativos.creditosAprobados} CR`}
                                    />
                                </>
                            )}
                        </div>

                        {/* Leyenda de obligatorios / optativos */}
                        <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 gap-x-5 gap-y-1 pt-0.5">
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                    <span>Obligatorios: <strong className="text-[#172B4D] dark:text-slate-100 font-bold">{progreso.obligatorios.creditosAprobados}</strong>/{progreso.obligatorios.creditosTotal} CR</span>
                                </span>
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#5243AA] dark:bg-[#8777D9]" />
                                    <span>Optativos: <strong className="text-[#172B4D] dark:text-slate-100 font-bold">{progreso.optativos.creditosAprobados}</strong>/{progreso.optativos.creditosTotal} CR</span>
                                </span>
                            </div>
                            {progreso.idiomaEquivalencia && (
                                <span className="text-xs text-[#5E6C84] dark:text-slate-400">
                                    Incluye equivalencia de idioma
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 4 KPIs de estado académico */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                        <div className="p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#006644] dark:text-[#57D9A3]">
                                <CheckCircle2 size={16} />
                                <span>Aprobados</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-2xl sm:text-3xl font-black text-[#172B4D] dark:text-slate-100">
                                    {progreso.aprobados}
                                </span>
                                <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400 ml-1.5">
                                    cursos
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0052CC] dark:text-[#4C9AFF]">
                                <Clock size={16} />
                                <span>En curso</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-2xl sm:text-3xl font-black text-[#172B4D] dark:text-slate-100">
                                    {progreso.enCurso}
                                </span>
                                <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400 ml-1.5">
                                    cursos ({progreso.creditosEnCurso} CR)
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#D97706] dark:text-[#FBBF24]">
                                <BookOpen size={16} />
                                <span>Disponibles</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-2xl sm:text-3xl font-black text-[#172B4D] dark:text-slate-100">
                                    {progreso.disponibles}
                                </span>
                                <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400 ml-1.5">
                                    cursos
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#5243AA] dark:text-[#8777D9]">
                                <GraduationCap size={16} />
                                <span>Promedio</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-2xl sm:text-3xl font-black text-[#172B4D] dark:text-slate-100">
                                    {plan.promedio !== null ? plan.promedio.toFixed(1) : '—'}
                                </span>
                                <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400 ml-1.5">
                                    {plan.promedio !== null ? 'Ponderado' : 'Sin configurar'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 3. Panel Central: Avance por Semestre, Horario y Avisos */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Columna Izquierda (Avance detallado) */}
                    <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-6">
                        {/* A. Avance por semestre */}
                        <Card className="flex flex-col gap-4 p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-[#172B4D] dark:text-slate-100">
                                    Avance por semestre
                                </h2>

                                {/* Filtros compactos */}
                                <div className="flex items-center gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-lg border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs sm:text-sm font-bold self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('todos')}
                                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'todos'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('obligatorios')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'obligatorios'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                        <span>Obligatorios</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('optativos')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'optativos'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#5243AA] dark:text-[#8777D9] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[#5243AA] dark:bg-[#8777D9]" />
                                        <span>Optativos</span>
                                    </button>
                                </div>
                            </div>

                            {progreso.porSemestre.length === 0 ? (
                                <div className="text-sm italic text-[#5E6C84] dark:text-slate-400 py-8 text-center">
                                    Marca cursos como completados para visualizar tu avance por ciclo.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {progreso.porSemestre.map(s => {
                                        const obligTotal = s.obligatoriosTotal;
                                        const obligAprob = s.obligatoriosAprobados;
                                        const optTotal = s.optativosTotal;
                                        const optAprob = s.optativosAprobados;

                                        const semTotal = filtroSemestre === 'obligatorios' ? obligTotal : filtroSemestre === 'optativos' ? optTotal : s.total;
                                        const semAprob = filtroSemestre === 'obligatorios' ? obligAprob : filtroSemestre === 'optativos' ? optAprob : s.aprobados;
                                        const semPct = semTotal > 0 ? Math.round((semAprob / semTotal) * 100) : 0;

                                        const obligPct = s.total > 0 ? (obligAprob / s.total) * 100 : 0;
                                        const optPct = s.total > 0 ? (optAprob / s.total) * 100 : 0;

                                        return (
                                            <div
                                                key={s.semestre}
                                                className="p-3 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                                            Semestre {s.semestre}
                                                        </span>
                                                        <span className="text-xs font-black px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#5E6C84] dark:text-slate-300">
                                                            {semPct}%
                                                        </span>
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-bold text-[#172B4D] dark:text-slate-300">
                                                        {semAprob} / {semTotal}
                                                    </span>
                                                </div>

                                                {/* Barra de progreso */}
                                                <div className="w-full h-2.5 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden flex">
                                                    {filtroSemestre === 'todos' ? (
                                                        <>
                                                            {obligPct > 0 && (
                                                                <div
                                                                    className="h-full bg-[#0052CC] dark:bg-[#4C9AFF] transition-all duration-500"
                                                                    style={{ width: `${obligPct}%` }}
                                                                />
                                                            )}
                                                            {optPct > 0 && (
                                                                <div
                                                                    className="h-full bg-[#5243AA] dark:bg-[#8777D9] transition-all duration-500"
                                                                    style={{ width: `${optPct}%` }}
                                                                />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div
                                                            className={`h-full transition-all duration-500 ${
                                                                filtroSemestre === 'obligatorios'
                                                                    ? 'bg-[#0052CC] dark:bg-[#4C9AFF]'
                                                                    : 'bg-[#5243AA] dark:bg-[#8777D9]'
                                                            }`}
                                                            style={{ width: `${semPct}%` }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Desglose conciso */}
                                                {filtroSemestre === 'todos' && (
                                                    <div className="flex items-center justify-between text-xs text-[#5E6C84] dark:text-slate-400">
                                                        <span>{obligAprob}/{obligTotal} obligatorios</span>
                                                        {optTotal > 0 ? (
                                                            <span>{optAprob}/{optTotal} optativos</span>
                                                        ) : (
                                                            <span className="opacity-50 italic">Sin optativos</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {flojo && progreso.aprobados > 0 && (
                                <div className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 pt-3 border-t border-[#DFE1E6] dark:border-[#3E4C5E] flex items-center justify-between">
                                    <span>
                                        Menor avance general: <strong className="text-[#172B4D] dark:text-slate-200">Semestre {flojo.semestre}</strong> ({flojo.aprobados} de {flojo.total} aprobados)
                                    </span>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Columna Derecha (Horario y Avisos) */}
                    <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6">
                        {/* B. Mi horario */}
                        <Card className="flex flex-col gap-4 p-5 sm:p-6 shadow-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-slate-100">
                                        Mi horario
                                    </h2>
                                    {esPeriodoActivoCalendario && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E3FCEF] dark:bg-[#064223]/50 text-[#006644] dark:text-[#57D9A3] border border-[#ABF5D1] dark:border-[#0E5832]">
                                            Ciclo activo
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleIrAHorario(periodoSeleccionadoId)}
                                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0052CC] dark:text-[#4C9AFF] hover:underline cursor-pointer bg-transparent border-none p-0"
                                >
                                    <span>{datosHorarioPeriodo.secciones === 0 ? 'Armar' : 'Editar'}</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Selector de periodo/semestre */}
                            <div className="grid grid-cols-4 gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-xl border border-[#DFE1E6] dark:border-[#3E4C5E] text-center text-xs font-bold">
                                {[
                                    { id: 'semestre1', label: 'Sem 1', full: 'Semestre 1' },
                                    { id: 'semestre2', label: 'Sem 2', full: 'Semestre 2' },
                                    { id: 'vacaciones1', label: 'Vac 1', full: 'Vacaciones 1' },
                                    { id: 'vacaciones2', label: 'Vac 2', full: 'Vacaciones 2' },
                                ].map(p => {
                                    const isSelected = periodoSeleccionadoId === p.id;
                                    const isActivo = (horario.periodoActivo || horario.periodo) === p.id;
                                    const tieneDatos = (horario.periodos?.[p.id]?.secciones || 0) > 0;

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setHorarioPeriodoFiltro(p.id)}
                                            className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer border-none flex items-center justify-center gap-1 ${
                                                isSelected
                                                    ? 'bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] shadow-xs'
                                                    : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span>{p.label}</span>
                                            {isActivo && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#006644] dark:bg-[#57D9A3]" title="Periodo actual según calendario" />
                                            )}
                                            {tieneDatos && !isActivo && (
                                                <span className="w-1 h-1 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Contenido según periodo seleccionado */}
                            {datosHorarioPeriodo.secciones === 0 ? (
                                <div className="p-4 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-3 text-sm text-[#5E6C84] dark:text-slate-400">
                                    <span>Sin secciones armadas para {nombrePeriodoSeleccionado}.</span>
                                    <button
                                        type="button"
                                        onClick={() => handleIrAHorario(periodoSeleccionadoId)}
                                        className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs sm:text-sm font-bold bg-[#0052CC] hover:bg-[#0747A6] text-white no-underline transition-colors self-start shadow-xs cursor-pointer border-none"
                                    >
                                        <span>Armar {nombrePeriodoSeleccionado}</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">Cursos</span>
                                            <span className="text-xl sm:text-2xl font-black text-[#172B4D] dark:text-slate-100 mt-1">{datosHorarioPeriodo.cursos}</span>
                                        </div>
                                        <div className="flex flex-col border-x border-[#DFE1E6] dark:border-[#3E4C5E] px-1">
                                            <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">Secciones</span>
                                            <span className="text-xl sm:text-2xl font-black text-[#172B4D] dark:text-slate-100 mt-1">{datosHorarioPeriodo.secciones}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">Carga</span>
                                            <span className="text-base sm:text-lg font-black text-[#0052CC] dark:text-[#4C9AFF] mt-1">{datosHorarioPeriodo.horasSemana} h/sem</span>
                                        </div>
                                    </div>

                                    {/* Cursos en el horario del semestre */}
                                    {datosHorarioPeriodo.cursosDetalle && datosHorarioPeriodo.cursosDetalle.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {datosHorarioPeriodo.cursosDetalle.map(c => (
                                                <div
                                                    key={c.codigo}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-slate-200"
                                                >
                                                    <span className="truncate max-w-[150px]">{c.nombre}</span>
                                                    <span className="text-[11px] font-bold text-[#0052CC] dark:text-[#4C9AFF]">
                                                        Sec. {c.secciones.join(', ')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* C. Avisos */}
                        <Card className="flex flex-col gap-3.5 p-5 sm:p-6 shadow-xs">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base sm:text-lg font-extrabold text-[#172B4D] dark:text-slate-100">
                                    Avisos
                                </h2>
                                {avisos.length > 0 && (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFEBE6] dark:bg-[#5E1A1A] text-[#BF2600] dark:text-[#FF6369]">
                                        {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
                                    </span>
                                )}
                            </div>

                            {avisos.length === 0 ? (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#E3FCEF] dark:bg-[#064223]/25 border border-[#ABF5D1] dark:border-[#0E5832] text-xs sm:text-sm font-semibold text-[#006644] dark:text-[#57D9A3]">
                                    <CheckCircle2 size={16} className="shrink-0" />
                                    <span>Plan sin advertencias de apertura ni traslapes.</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {avisos.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-2"
                                        >
                                            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#172B4D] dark:text-slate-200">
                                                <span>{item.nombre}</span>
                                                <span className="text-xs font-medium text-[#5E6C84] dark:text-slate-400">
                                                    Bloque {item.blockId}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {item.avisos.map((av, aIdx) => {
                                                    const isError = av.nivel === 'error';
                                                    const isWarn = av.nivel === 'warn';
                                                    const badgeClasses = isError
                                                        ? 'text-[#BF2600] dark:text-[#FF6369] bg-[#FFEBE6] dark:bg-[#5E1A1A] border-[#FFBDAD] dark:border-[#BF2600]'
                                                        : isWarn
                                                        ? 'text-[#B45309] dark:text-[#FBBF24] bg-[#FFFBEB] dark:bg-[#4A3206] border-[#FDE68A] dark:border-[#B45309]'
                                                        : 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] border-[#B3D4FF] dark:border-[#0052CC]';

                                                    return (
                                                        <div
                                                            key={aIdx}
                                                            className={`flex items-start gap-2 p-2 rounded-lg text-xs font-medium border ${badgeClasses}`}
                                                        >
                                                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                                            <span>{av.texto}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                {/* 4. SECCIÓN COMUNIDAD: MÁXIMA NOTORIEDAD Y FOTOS REPRESENTATIVAS */}
                <Card className="flex flex-col gap-6 p-5 sm:p-7 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#DFE1E6] dark:border-[#3E4C5E] pb-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <Users className="w-6 h-6 text-[#0052CC] dark:text-[#4C9AFF]" />
                                <h2 className="text-xl sm:text-2xl font-black text-[#172B4D] dark:text-slate-100 tracking-tight">
                                    Comunidad USAC
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-[#5E6C84] dark:text-slate-400 mt-1">
                                Grupos de estudio con tus compañeros de clase y publicaciones destacadas del foro
                            </p>
                        </div>
                    </div>

                    {!isSupabaseConfigured || !supabase ? (
                        <EmptyState
                            icon={Users}
                            title="Comunidad no disponible"
                            description="Los servicios comunitarios no están configurados temporalmente."
                        />
                    ) : communityLoading ? (
                        <div className="flex items-center justify-center py-12 text-sm font-semibold text-[#5E6C84] dark:text-slate-400 gap-3">
                            <RefreshCw size={16} className="animate-spin text-[#0052CC] dark:text-[#4C9AFF]" />
                            <span>Cargando comunidad estudiantil…</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Grilla de Grupos de Estudio con Imágenes */}
                            <div className="flex flex-col gap-3.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm sm:text-base font-extrabold text-[#172B4D] dark:text-slate-200">
                                        Grupos de estudio sugeridos
                                    </h3>
                                    <span className="text-xs font-semibold text-[#5E6C84] dark:text-slate-400">
                                        {grupos.length} {grupos.length === 1 ? 'grupo disponible' : 'grupos disponibles'}
                                    </span>
                                </div>

                                {grupos.length === 0 ? (
                                    <div className="p-6 rounded-2xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-center text-sm text-[#5E6C84] dark:text-slate-400">
                                        Aún no hay grupos registrados para los cursos de tu pensum actual.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {grupos.map(g => (
                                            <div
                                                key={g.id}
                                                className="rounded-2xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group"
                                            >
                                                {/* Imagen representativa o Banner */}
                                                {g.image_url ? (
                                                    <div className="relative w-full h-36 sm:h-40 overflow-hidden bg-slate-100 dark:bg-black/30">
                                                        <img
                                                            src={g.image_url}
                                                            alt={g.title}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                        <span className="absolute top-3 left-3 text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#0E1624]/90 text-[#0052CC] dark:text-[#4C9AFF] shadow-xs backdrop-blur-xs">
                                                            {formatPlatform(g.platform)}
                                                        </span>
                                                        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#0E1624]/90 text-[#172B4D] dark:text-slate-200 shadow-xs backdrop-blur-xs">
                                                            <ThumbsUp size={12} />
                                                            {g.upvotes || 0}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-24 bg-gradient-to-r from-[#DEEBFF] to-[#EAE6FF] dark:from-[#0C295E]/50 dark:to-[#352C63]/50 flex items-center justify-between px-4 border-b border-[#DFE1E6] dark:border-[#3E4C5E]">
                                                        <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-[#0052CC] text-white dark:bg-[#4C9AFF] dark:text-[#0E1624]">
                                                            {formatPlatform(g.platform)}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5E6C84] dark:text-slate-300 bg-white/70 dark:bg-black/30 px-2 py-0.5 rounded-md">
                                                            <ThumbsUp size={12} />
                                                            {g.upvotes || 0}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Contenido del grupo */}
                                                <div className="p-4 sm:p-5 flex flex-col justify-between gap-3.5 flex-1">
                                                    <div className="flex flex-col gap-1.5">
                                                        {g.curso && (
                                                            <span className="text-xs sm:text-sm font-bold text-[#0052CC] dark:text-[#4C9AFF]">
                                                                {g.curso}{g.section ? ` · Sección ${g.section}` : ''}
                                                            </span>
                                                        )}
                                                        <h4 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100 leading-snug line-clamp-2">
                                                            {g.title}
                                                        </h4>
                                                        {g.description && (
                                                            <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed line-clamp-2 mt-0.5">
                                                                {truncateText(g.description, 130)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {g.link && (
                                                        <a
                                                            href={g.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] no-underline transition-colors shadow-xs"
                                                        >
                                                            <span>Unirme al grupo</span>
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Publicación destacada del Foro */}
                            {destacado && (
                                <div className="p-5 sm:p-6 rounded-2xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#FFAB00]/20 text-[#B45309] dark:text-[#FFAB00]">
                                                <Sparkles size={13} />
                                                <span>{destacado.is_pinned ? 'Destacado en el foro' : 'Popular en el foro'}</span>
                                            </span>
                                        </div>
                                        <span className="text-xs sm:text-sm font-semibold text-[#5E6C84] dark:text-slate-400">
                                            Por {destacado.author_alias || 'Anónimo'}
                                        </span>
                                    </div>

                                    <h4 className="text-base sm:text-lg font-bold text-[#172B4D] dark:text-slate-100">
                                        {destacado.title}
                                    </h4>

                                    <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                                        {truncateText(destacado.content, 220)}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs sm:text-sm font-bold text-[#5E6C84] dark:text-slate-400 pt-1">
                                        <span className="inline-flex items-center gap-1.5">
                                            <ThumbsUp size={14} />
                                            <span>{destacado.likes || 0}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <MessageSquare size={14} />
                                            <span>{destacado.comment_count || 0}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Banner de inicio de sesión si no autenticado */}
                            {!user && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-2xs">
                                    <div className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300">
                                        Inicia sesión con tu cuenta para descubrir grupos de estudio personalizados para tus cursos.
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => window.dispatchEvent(new Event('pemtree-open-auth-modal'))}
                                        className="shrink-0 text-xs sm:text-sm font-bold py-2 px-4"
                                    >
                                        Iniciar sesión
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
