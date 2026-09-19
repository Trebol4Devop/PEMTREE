// src/pages/Recuento.jsx - Vista de resumen académico del estudiante y comunidad
import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    GraduationCap,
    Clock,
    AlertTriangle,
    Users,
    MessageSquare,
    ArrowRight,
    CheckCircle2,
    BookOpen,
    CalendarRange,
    Calendar,
    ExternalLink,
    ThumbsUp,
    RefreshCw
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

            // Extraer carrera del pensum cargado
            const carreraId = data.pensum?.carrera?.id || null;

            // Extraer códigos de cursos relevantes: enCurso, disponibles o los primeros del plan
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
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="h-9 w-44 bg-slate-200 dark:bg-[#1C2636] rounded-md animate-pulse" />
                    <div className="h-36 bg-slate-200 dark:bg-[#1C2636] rounded-xl animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-8 h-80 bg-slate-200 dark:bg-[#1C2636] rounded-xl animate-pulse" />
                        <div className="lg:col-span-4 h-80 bg-slate-200 dark:bg-[#1C2636] rounded-xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // Estado de error
    if (error || !data) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] p-4 sm:p-6 transition-colors duration-300">
                <div className="max-w-md mx-auto my-12">
                    <Card className="flex flex-col items-center gap-3 p-6 text-center">
                        <AlertTriangle className="w-10 h-10 text-[#BF2600] dark:text-[#FF6369]" />
                        <h2 className="text-base font-bold text-[#172B4D] dark:text-slate-100">
                            No pudimos cargar tu recuento
                        </h2>
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400">
                            {error || 'Ocurrió un error inesperado al consolidar los datos de tu pensum.'}
                        </p>
                        <Button variant="primary" onClick={handleRetry} className="mt-2 text-xs">
                            Reintentar
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    const { pensum, progreso, plan, horario, avisos } = data;
    const periodoLegible = PERIOD_LABELS[horario.periodo] || horario.periodo;

    // Semestre con menor avance
    const flojo = [...progreso.porSemestre]
        .filter(s => s.total > 0)
        .sort((a, b) => (a.aprobados / a.total) - (b.aprobados / b.total))[0];

    const planFechaFormateada = plan.actualizadoEl
        ? (() => {
            try {
                return new Date(plan.actualizadoEl).toLocaleDateString('es-GT', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
            } catch {
                return null;
            }
        })()
        : null;

    // Bloques restantes del plan (excluyendo el bloque actual destacado)
    const otrosBloquesPlan = (plan.lineas[0]?.blocks || []).filter(
        b => b.blockId !== plan.bloqueActual?.blockId
    );

    return (
        <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] transition-colors duration-300">
            <Seo
                pathname="/recuento"
                title="Recuento académico"
                description="Resumen de tu avance en el pensum: créditos, plan por semestre, horario y avisos."
            />

            <div className="max-w-7xl mx-auto p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-5">
                {/* 1. Cabecera */}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B4D] dark:text-slate-100 tracking-tight">
                                Recuento
                            </h1>
                            {pseudonimoComunidad && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]">
                                    Hola, {pseudonimoComunidad}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400 mt-0.5">
                            {pensum.carrera?.nombre || 'Ingeniería'}
                            {pensum.pensumInfo?.cohort ? ` · Cohorte ${pensum.pensumInfo.cohort}` : ''}
                        </p>
                    </div>
                    <HelpButton onClick={openHelp} className="shrink-0" title="Ayuda del recuento" />
                </div>

                {/* 2. Resumen Ejecutivo: Avance en Créditos y Métricas Clave */}
                <Card className="p-4 sm:p-5 flex flex-col gap-4">
                    {/* Barra de progreso global con desglose segmentado */}
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-baseline gap-2.5">
                                <span className="text-2xl sm:text-3xl font-extrabold text-[#0052CC] dark:text-[#4C9AFF] tracking-tight">
                                    {progreso.porcentaje}%
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-[#5E6C84] dark:text-slate-300">
                                    avance en créditos ({progreso.creditosAprobados} de {progreso.totalCreditos} CR)
                                </span>
                            </div>
                            {plan.simultanea && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border border-[#0052CC]/20">
                                    Carrera simultánea
                                </span>
                            )}
                        </div>

                        <div className="w-full h-2.5 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden flex">
                            {progreso.totalCreditos > 0 && (
                                <>
                                    <div
                                        className="h-full bg-[#0052CC] dark:bg-[#4C9AFF] transition-all duration-500"
                                        style={{ width: `${Math.min(100, (progreso.obligatorios.creditosAprobados / progreso.totalCreditos) * 100)}%` }}
                                        title={`Obligatorios aprobados: ${progreso.obligatorios.creditosAprobados} CR`}
                                    />
                                    <div
                                        className="h-full bg-[#5243AA] dark:bg-[#8777D9] transition-all duration-500"
                                        style={{ width: `${Math.min(100, (progreso.optativos.creditosAprobados / progreso.totalCreditos) * 100)}%` }}
                                        title={`Optativos aprobados: ${progreso.optativos.creditosAprobados} CR`}
                                    />
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#5E6C84] dark:text-slate-400 gap-x-4 gap-y-1">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                    <span>Obligatorios: <strong className="text-[#172B4D] dark:text-slate-200">{progreso.obligatorios.creditosAprobados}</strong>/{progreso.obligatorios.creditosTotal} CR ({progreso.obligatorios.aprobados} de {progreso.obligatorios.total})</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#5243AA] dark:bg-[#8777D9]" />
                                    <span>Optativos: <strong className="text-[#172B4D] dark:text-slate-200">{progreso.optativos.creditosAprobados}</strong>/{progreso.optativos.creditosTotal} CR ({progreso.optativos.aprobados} de {progreso.optativos.total})</span>
                                </span>
                            </div>
                            {progreso.idiomaEquivalencia && (
                                <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">
                                    Equivalencia de idioma incluida
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 4 KPIs de estado académico */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[#DFE1E6] dark:border-[#3E4C5E]">
                        <div className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#006644] dark:text-[#57D9A3]">
                                <CheckCircle2 size={13} />
                                <span>Aprobados</span>
                            </div>
                            <span className="text-xl font-bold text-[#172B4D] dark:text-slate-100 mt-0.5">
                                {progreso.aprobados}
                            </span>
                            <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">
                                cursos acreditados
                            </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0052CC] dark:text-[#4C9AFF]">
                                <Clock size={13} />
                                <span>En curso</span>
                            </div>
                            <span className="text-xl font-bold text-[#172B4D] dark:text-slate-100 mt-0.5">
                                {progreso.enCurso}
                            </span>
                            <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">
                                {progreso.creditosEnCurso} CR en asignación
                            </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#D97706] dark:text-[#FBBF24]">
                                <BookOpen size={13} />
                                <span>Disponibles</span>
                            </div>
                            <span className="text-xl font-bold text-[#172B4D] dark:text-slate-100 mt-0.5">
                                {progreso.disponibles}
                            </span>
                            <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">
                                {progreso.bloqueados} bloqueados
                            </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5243AA] dark:text-[#8777D9]">
                                <GraduationCap size={13} />
                                <span>Promedio</span>
                            </div>
                            <span className="text-xl font-bold text-[#172B4D] dark:text-slate-100 mt-0.5">
                                {plan.promedio !== null ? plan.promedio.toFixed(1) : '—'}
                            </span>
                            <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">
                                {plan.promedio !== null ? 'Ponderado' : 'Sin configurar'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* 3. Estructura Principal en 2 Columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                    {/* Columna Izquierda: Avance detallado y Planificación */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 sm:gap-5">
                        {/* A. Avance por semestre */}
                        <Card className="flex flex-col gap-3.5 p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                        Avance por semestre
                                    </h2>
                                    <p className="text-xs text-[#5E6C84] dark:text-slate-400">
                                        Cursos aprobados por ciclo
                                    </p>
                                </div>

                                {/* Selector de vista compacto */}
                                <div className="flex items-center gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-lg border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs font-semibold self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('todos')}
                                        className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer border-none ${
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
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'obligatorios'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                        <span>Obligatorios</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroSemestre('optativos')}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer border-none ${
                                            filtroSemestre === 'optativos'
                                                ? 'bg-white dark:bg-[#1C2636] text-[#5243AA] dark:text-[#8777D9] shadow-xs'
                                                : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#5243AA] dark:bg-[#8777D9]" />
                                        <span>Optativos</span>
                                    </button>
                                </div>
                            </div>

                            {progreso.porSemestre.length === 0 ? (
                                <div className="text-xs italic text-[#5E6C84] dark:text-slate-400 py-6 text-center">
                                    Marca cursos como completados para visualizar tu avance por semestre.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                                className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-1.5"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-[#172B4D] dark:text-slate-100">
                                                            Semestre {s.semestre}
                                                        </span>
                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-[#5E6C84] dark:text-slate-300">
                                                            {semPct}%
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-[#5E6C84] dark:text-slate-400">
                                                        {semAprob}/{semTotal} cursos
                                                    </span>
                                                </div>

                                                {/* Mini barra de progreso segmentada */}
                                                <div className="w-full h-2 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden flex">
                                                    {filtroSemestre === 'todos' ? (
                                                        <>
                                                            {obligPct > 0 && (
                                                                <div
                                                                    className="h-full bg-[#0052CC] dark:bg-[#4C9AFF] transition-all duration-500"
                                                                    style={{ width: `${obligPct}%` }}
                                                                    title={`Obligatorios: ${obligAprob}/${obligTotal}`}
                                                                />
                                                            )}
                                                            {optPct > 0 && (
                                                                <div
                                                                    className="h-full bg-[#5243AA] dark:bg-[#8777D9] transition-all duration-500"
                                                                    style={{ width: `${optPct}%` }}
                                                                    title={`Optativos: ${optAprob}/${optTotal}`}
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

                                                {/* Desglose compacto en vista general */}
                                                {filtroSemestre === 'todos' && (
                                                    <div className="flex items-center justify-between text-[10px] text-[#5E6C84] dark:text-slate-400 pt-0.5">
                                                        <span>{obligAprob}/{obligTotal} oblig.</span>
                                                        {optTotal > 0 ? (
                                                            <span>{optAprob}/{optTotal} opt.</span>
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

                            {flojo && progreso.aprobados > 0 && (
                                <div className="text-[11px] text-[#5E6C84] dark:text-slate-400 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E] flex items-center justify-between">
                                    <span>
                                        Menor avance general: <strong className="text-[#172B4D] dark:text-slate-200">Semestre {flojo.semestre}</strong> ({flojo.aprobados} de {flojo.total} aprobados).
                                    </span>
                                    <span className="hidden sm:inline text-[10px] opacity-80">
                                        Oblig: {flojo.obligatoriosAprobados}/{flojo.obligatoriosTotal} · Opt: {flojo.optativosAprobados}/{flojo.optativosTotal}
                                    </span>
                                </div>
                            )}
                        </Card>

                        {/* B. Mi plan */}
                        <Card className="flex flex-col gap-4 p-4 sm:p-5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                            Mi plan
                                        </h2>
                                        {plan.periodoActual && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAE6FF] dark:bg-[#352C63]/50 text-[#5243AA] dark:text-[#C0B6F2] border border-[#C0B6F2] dark:border-[#5243AA]">
                                                <Calendar size={12} />
                                                <span>Ciclo actual: {plan.periodoActual.nombre}</span>
                                            </span>
                                        )}
                                    </div>
                                    {plan.existe && (
                                        <p className="text-xs text-[#5E6C84] dark:text-slate-400 mt-1">
                                            {plan.totalCreditos} créditos · {plan.totalCursos} cursos proyectados
                                            {planFechaFormateada && ` · Actualizado el ${planFechaFormateada}`}
                                        </p>
                                    )}
                                </div>
                                <Link
                                    to="/visualizador?view=planner"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
                                >
                                    <span>Ir al Planificador</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>

                            {!plan.existe ? (
                                <EmptyState
                                    icon={CalendarRange}
                                    title="Aún no has armado tu plan"
                                    description="Organiza tus cursos por semestre y escuela de vacaciones en el planificador para proyectar tu graduación."
                                    actionLabel="Ir al Planificador"
                                    onAction={() => navigate('/visualizador?view=planner')}
                                />
                            ) : (
                                <div className="flex flex-col gap-3.5">
                                    {/* Bloque destacado (Ciclo activo o próximo disponible) */}
                                    {plan.bloqueActual && (
                                        <div
                                            className={`p-3.5 rounded-xl flex flex-col gap-2.5 transition-all ${
                                                plan.esBloquePeriodoActual
                                                    ? 'bg-[#E3FCEF] dark:bg-[#064223]/30 border border-[#ABF5D1] dark:border-[#0E5832]'
                                                    : 'bg-[#DEEBFF] dark:bg-[#0C295E]/40 border border-[#B3D4FF] dark:border-[#0C295E]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span
                                                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                            plan.esBloquePeriodoActual
                                                                ? 'bg-[#006644] text-white dark:bg-[#57D9A3] dark:text-[#0E1624]'
                                                                : 'bg-[#0052CC] text-white dark:bg-[#4C9AFF] dark:text-[#0E1624]'
                                                        }`}
                                                    >
                                                        {plan.esBloquePeriodoActual ? 'Plan del ciclo activo' : 'Próximo plan'}
                                                    </span>
                                                    <span
                                                        className={`text-xs font-bold ${
                                                            plan.esBloquePeriodoActual
                                                                ? 'text-[#006644] dark:text-[#57D9A3]'
                                                                : 'text-[#0052CC] dark:text-[#4C9AFF]'
                                                        }`}
                                                    >
                                                        {plan.bloqueActual.tipo === 'semestre'
                                                            ? `Semestre ${plan.bloqueActual.numero}`
                                                            : `Vacaciones ${plan.bloqueActual.numero}`}
                                                        {' '}
                                                        <span className="opacity-80 font-normal">
                                                            ({plan.bloqueActual.paridad === 'impar' ? 'Impar' : 'Par'})
                                                        </span>
                                                    </span>
                                                    {!plan.esBloquePeriodoActual && plan.periodoActual && (
                                                        <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">
                                                            (Sin cursos en {plan.periodoActual.etiquetaCorta})
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-xs font-extrabold ${
                                                        plan.esBloquePeriodoActual
                                                            ? 'text-[#006644] dark:text-[#57D9A3]'
                                                            : 'text-[#0052CC] dark:text-[#4C9AFF]'
                                                    }`}
                                                >
                                                    {plan.bloqueActual.creditos} CR
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {plan.bloqueActual.cursos.map(c => (
                                                    <Link
                                                        key={c.id}
                                                        to="/visualizador?view=planner"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-slate-200 hover:border-[#0052CC] dark:hover:border-[#4C9AFF] transition-colors no-underline"
                                                    >
                                                        <span>{c.nombre}</span>
                                                        <span className="text-[10px] font-bold text-[#5E6C84] dark:text-slate-400">
                                                            {c.creditos} CR
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Otros bloques planificados (sin duplicar el bloque actual) */}
                                    {otrosBloquesPlan.length > 0 && (
                                        <div className="flex flex-col gap-2 pt-1">
                                            <span className="text-xs font-bold text-[#5E6C84] dark:text-slate-300">
                                                Siguientes bloques proyectados
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {otrosBloquesPlan.map(b => (
                                                    <div
                                                        key={b.blockId}
                                                        className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-1.5"
                                                    >
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-[#172B4D] dark:text-slate-200">
                                                                    {b.tipo === 'semestre' ? `Semestre ${b.numero}` : `Vacaciones ${b.numero}`}
                                                                </span>
                                                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#EBECF0] dark:bg-[#1C2636] text-[#5E6C84] dark:text-slate-400">
                                                                    {b.paridad === 'impar' ? 'Impar' : 'Par'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-[#5E6C84] dark:text-slate-400">
                                                                {b.creditos} CR
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {b.cursos.map(c => (
                                                                <Link
                                                                    key={c.id}
                                                                    to="/visualizador?view=planner"
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-slate-200 hover:border-[#0052CC] dark:hover:border-[#4C9AFF] transition-colors no-underline"
                                                                >
                                                                    <span className="truncate max-w-[150px]">{c.nombre}</span>
                                                                    <span className="text-[9px] text-[#5E6C84] dark:text-slate-400">
                                                                        {c.creditos}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Columna Derecha: Contexto Operativo y Comunidad */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 sm:gap-5">
                        {/* C. Mi horario */}
                        <Card className="flex flex-col gap-3 p-4 sm:p-5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                    Mi horario ({periodoLegible})
                                </h2>
                                <Link
                                    to="/visualizador?view=schedule"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
                                >
                                    <span>{horario.secciones === 0 ? 'Armar' : 'Editar'}</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>

                            {horario.secciones === 0 ? (
                                <div className="p-3 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-2 text-xs text-[#5E6C84] dark:text-slate-400">
                                    <span>Aún no tienes secciones seleccionadas para {periodoLegible}.</span>
                                    <Link
                                        to="/visualizador?view=schedule"
                                        className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#0052CC] hover:bg-[#0747A6] text-white no-underline transition-colors self-start"
                                    >
                                        <span>Armar horario</span>
                                        <ArrowRight size={12} />
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">Cursos</span>
                                        <span className="text-base sm:text-lg font-bold text-[#172B4D] dark:text-slate-100">{horario.cursos}</span>
                                    </div>
                                    <div className="flex flex-col border-x border-[#DFE1E6] dark:border-[#3E4C5E] px-1">
                                        <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">Secciones</span>
                                        <span className="text-base sm:text-lg font-bold text-[#172B4D] dark:text-slate-100">{horario.secciones}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">Carga</span>
                                        <span className="text-base sm:text-lg font-bold text-[#0052CC] dark:text-[#4C9AFF]">{horario.horasSemana} h/sem</span>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* D. Avisos del planificador */}
                        <Card className="flex flex-col gap-3 p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                    Avisos del planificador
                                </h2>
                                {avisos.length > 0 && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFEBE6] dark:bg-[#5E1A1A] text-[#BF2600] dark:text-[#FF6369]">
                                        {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
                                    </span>
                                )}
                            </div>

                            {avisos.length === 0 ? (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#E3FCEF] dark:bg-[#064223]/25 border border-[#ABF5D1] dark:border-[#0E5832] text-xs text-[#006644] dark:text-[#57D9A3]">
                                    <CheckCircle2 size={14} className="shrink-0" />
                                    <span>Plan sin traslapes ni advertencias de apertura.</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {avisos.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-1.5"
                                        >
                                            <div className="flex items-center justify-between text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                                <span>{item.nombre}</span>
                                                <span className="text-[10px] font-medium text-[#5E6C84] dark:text-slate-400">
                                                    Bloque {item.blockId}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
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
                                                            className={`flex items-start gap-1.5 p-1.5 rounded text-[11px] border ${badgeClasses}`}
                                                        >
                                                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
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

                        {/* E. Bloque Comunidad */}
                        <Card className="flex flex-col gap-3.5 p-4 sm:p-5">
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                    Comunidad USAC
                                </h2>
                                <p className="text-xs text-[#5E6C84] dark:text-slate-400">
                                    Grupos sugeridos y foro
                                </p>
                            </div>

                            {!isSupabaseConfigured || !supabase ? (
                                <EmptyState
                                    icon={Users}
                                    title="Comunidad no disponible"
                                    description="Servicios comunitarios no configurados temporalmente."
                                />
                            ) : communityLoading ? (
                                <div className="flex items-center justify-center py-6 text-xs text-[#5E6C84] dark:text-slate-400 gap-2">
                                    <RefreshCw size={13} className="animate-spin text-[#0052CC] dark:text-[#4C9AFF]" />
                                    <span>Cargando comunidad…</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3.5">
                                    {/* Grupos sugeridos */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6C84] dark:text-slate-400">
                                            Grupos de estudio
                                        </span>

                                        {grupos.length === 0 ? (
                                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 italic py-1">
                                                Aún no hay grupos registrados para tus cursos.
                                            </p>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {grupos.map(g => (
                                                    <div
                                                        key={g.id}
                                                        className="p-2.5 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex items-center justify-between gap-2"
                                                    >
                                                        <div className="min-w-0 flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]">
                                                                    {formatPlatform(g.platform)}
                                                                </span>
                                                                <h4 className="text-xs font-bold text-[#172B4D] dark:text-slate-100 truncate">
                                                                    {g.title}
                                                                </h4>
                                                            </div>
                                                            {g.curso && (
                                                                <span className="text-[10px] font-semibold text-[#0052CC] dark:text-[#4C9AFF] truncate">
                                                                    {g.curso}{g.section ? ` · Sec. ${g.section}` : ''}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {g.link && (
                                                            <a
                                                                href={g.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="shrink-0 inline-flex items-center gap-1 py-1 px-2.5 rounded-md text-[11px] font-bold bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] no-underline transition-colors"
                                                            >
                                                                <span>Unirme</span>
                                                                <ExternalLink size={10} />
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Post destacado */}
                                    {destacado && (
                                        <div className="p-3 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-[10px] text-[#5E6C84] dark:text-slate-400">
                                                <span className="font-extrabold uppercase text-[#FFAB00]">
                                                    {destacado.is_pinned ? 'Destacado en foro' : 'Popular en foro'}
                                                </span>
                                                <span>Por {destacado.author_alias || 'Anónimo'}</span>
                                            </div>

                                            <h4 className="text-xs font-bold text-[#172B4D] dark:text-slate-100 line-clamp-1">
                                                {destacado.title}
                                            </h4>

                                            <p className="text-[11px] text-[#5E6C84] dark:text-slate-300 leading-relaxed line-clamp-2">
                                                {truncateText(destacado.content, 120)}
                                            </p>

                                            <div className="flex items-center gap-3 text-[10px] font-semibold text-[#5E6C84] dark:text-slate-400 pt-0.5">
                                                <span className="inline-flex items-center gap-1">
                                                    <ThumbsUp size={11} />
                                                    {destacado.likes || 0}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <MessageSquare size={11} />
                                                    {destacado.comment_count || 0}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* CTA de sesión si no autenticado */}
                                    {!user && (
                                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-1.5 text-center">
                                            <p className="text-[11px] text-[#5E6C84] dark:text-slate-300">
                                                Inicia sesión para ver grupos adaptados a tus cursos actuales.
                                            </p>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => window.dispatchEvent(new Event('pemtree-open-auth-modal'))}
                                                className="w-full text-xs py-1"
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
            </div>
        </div>
    );
}
