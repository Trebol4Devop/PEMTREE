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

        prepararRecuento()
            .then(({ catalogo, cursos, cursoMap, pensumFile }) => {
                if (cancelled) return;
                const res = buildRecuento({ catalogo, cursos, cursoMap, pensumFile });
                setData(res);
                setLoading(false);
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Error cargando recuento:', err);
                setError('No se pudo cargar el recuento de tu pensum.');
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [retryCount]);

    // Carga del bloque comunitario (Fase 2)
    useEffect(() => {
        if (!data) return;
        let cancelled = false;

        const carreras = [data.pensum?.carrera?.id].filter(Boolean);
        const cursosSet = new Set();

        if (data.plan && Array.isArray(data.plan.lineas)) {
            for (const line of data.plan.lineas) {
                for (const b of line.blocks || []) {
                    for (const c of b.cursos || []) {
                        if (c.nombre) cursosSet.add(c.nombre);
                    }
                }
            }
        }

        const cursosList = Array.from(cursosSet);

        Promise.all([
            fetchGruposSugeridos({ carreras, cursos: cursosList, limit: 3 }),
            fetchMensajeDestacado({ carreras })
        ])
            .then(([grps, dest]) => {
                if (cancelled) return;
                setGrupos(grps || []);
                setDestacado(dest || null);
                setCommunityLoading(false);
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Error cargando comunidad en recuento:', err);
                setGrupos([]);
                setDestacado(null);
                setCommunityLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [data]);

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] transition-colors duration-300">
                <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
                    <RefreshCw className="w-8 h-8 text-[#0052CC] dark:text-[#4C9AFF] animate-spin" />
                    <p className="text-sm font-semibold text-[#5E6C84] dark:text-slate-300">
                        Cargando tu recuento…
                    </p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] transition-colors duration-300">
                <div className="max-w-md mx-auto p-6 mt-12">
                    <Card className="text-center p-6 flex flex-col items-center gap-4">
                        <AlertTriangle className="w-12 h-12 text-[#BF2600] dark:text-[#FF6369]" />
                        <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                            {error || 'Error desconocido'}
                        </h2>
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400">
                            Ocurrió un problema al leer tus datos del pensum.
                        </p>
                        <Button variant="primary" onClick={handleRetry}>
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

    return (
        <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] transition-colors duration-300">
            <Seo
                pathname="/recuento"
                title="Recuento académico"
                description="Resumen de tu avance en el pensum: créditos, plan por semestre, horario y avisos."
            />

            <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
                {/* 1. Cabecera */}
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] dark:text-slate-100 tracking-tight">
                            Recuento
                        </h1>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 mt-1">
                            {pensum.carrera?.nombre || 'Ingeniería'}
                            {pensum.pensumInfo?.cohort ? ` · Cohorte ${pensum.pensumInfo.cohort}` : ''}
                        </p>
                        {pseudonimoComunidad && (
                            <p className="text-xs sm:text-sm font-semibold text-[#0052CC] dark:text-[#4C9AFF] mt-0.5">
                                Hola, {pseudonimoComunidad}
                            </p>
                        )}
                    </div>
                    <HelpButton onClick={openHelp} className="shrink-0" title="Ayuda del recuento" />
                </div>

                {/* 2. Barra de avance */}
                <Card className="flex flex-col gap-3 p-4 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl sm:text-4xl font-extrabold text-[#0052CC] dark:text-[#4C9AFF]">
                                {progreso.porcentaje}%
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-[#5E6C84] dark:text-slate-300">
                                {progreso.creditosAprobados} / {progreso.totalCreditos} créditos aprobados
                            </span>
                        </div>
                        {plan.simultanea && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] border border-[#0052CC]/20">
                                Carrera simultánea
                            </span>
                        )}
                    </div>

                    <div className="w-full h-3 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 bg-[#0052CC] dark:bg-[#4C9AFF]"
                            style={{ width: `${Math.min(100, Math.max(0, progreso.porcentaje))}%` }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-[#5E6C84] dark:text-slate-400 pt-1">
                        <span>
                            Obligatorios: {progreso.obligatorios.creditosAprobados} / {progreso.obligatorios.creditosTotal} CR ({progreso.obligatorios.aprobados} de {progreso.obligatorios.total})
                        </span>
                        <span>
                            Optativos: {progreso.optativos.creditosAprobados} / {progreso.optativos.creditosTotal} CR ({progreso.optativos.aprobados} de {progreso.optativos.total})
                        </span>
                    </div>
                </Card>

                {/* 3. Tarjetas KPI */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="flex flex-col gap-1 p-3.5 sm:p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#059669] dark:text-[#10B981]">
                            <CheckCircle2 size={16} />
                            <span>Aprobados</span>
                        </div>
                        <span className="text-2xl font-bold text-[#172B4D] dark:text-slate-100">
                            {progreso.aprobados}
                        </span>
                        <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">
                            {progreso.creditosAprobados} créditos
                        </span>
                    </Card>

                    <Card className="flex flex-col gap-1 p-3.5 sm:p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#0052CC] dark:text-[#4C9AFF]">
                            <Clock size={16} />
                            <span>En curso</span>
                        </div>
                        <span className="text-2xl font-bold text-[#172B4D] dark:text-slate-100">
                            {progreso.enCurso}
                        </span>
                        <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">
                            {progreso.creditosEnCurso} créditos
                        </span>
                    </Card>

                    <Card className="flex flex-col gap-1 p-3.5 sm:p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#D97706] dark:text-[#FBBF24]">
                            <BookOpen size={16} />
                            <span>Disponibles</span>
                        </div>
                        <span className="text-2xl font-bold text-[#172B4D] dark:text-slate-100">
                            {progreso.disponibles}
                        </span>
                        <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">
                            {progreso.bloqueados} bloqueados
                        </span>
                    </Card>

                    <Card className="flex flex-col gap-1 p-3.5 sm:p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#7C3AED] dark:text-[#A78BFA]">
                            <GraduationCap size={16} />
                            <span>Promedio</span>
                        </div>
                        <span className="text-2xl font-bold text-[#172B4D] dark:text-slate-100">
                            {plan.promedio !== null ? plan.promedio.toFixed(1) : '—'}
                        </span>
                        <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">
                            {plan.promedio !== null ? 'Ponderado' : 'Sin promedio configurado'}
                        </span>
                    </Card>
                </div>

                {/* 4. Avance por semestre */}
                <Card className="flex flex-col gap-3.5 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                Avance por semestre
                            </h2>
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 mt-0.5">
                                Cursos aprobados distinguiendo obligatorios y no obligatorios
                            </p>
                        </div>

                        {/* Selector de vista */}
                        <div className="flex items-center gap-1 bg-[#F4F5F7] dark:bg-[#0E1624] p-1 rounded-lg border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs font-semibold self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setFiltroSemestre('todos')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border-none ${
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
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer border-none ${
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
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer border-none ${
                                    filtroSemestre === 'optativos'
                                        ? 'bg-white dark:bg-[#1C2636] text-[#7C3AED] dark:text-[#A78BFA] shadow-xs'
                                        : 'bg-transparent text-[#5E6C84] dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA]" />
                                <span>No obligatorios</span>
                            </button>
                        </div>
                    </div>

                    {/* Leyenda general cuando está en 'todos' */}
                    {filtroSemestre === 'todos' && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#5E6C84] dark:text-slate-300 pb-1.5 border-b border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                <span className="font-semibold text-[#172B4D] dark:text-slate-200">Obligatorios:</span>
                                <span>{progreso.obligatorios.aprobados} de {progreso.obligatorios.total} ({progreso.obligatorios.creditosAprobados} CR)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA]" />
                                <span className="font-semibold text-[#172B4D] dark:text-slate-200">No obligatorios:</span>
                                <span>{progreso.optativos.aprobados} de {progreso.optativos.total} ({progreso.optativos.creditosAprobados} CR)</span>
                            </div>
                        </div>
                    )}

                    {progreso.porSemestre.length === 0 ? (
                        <div className="text-xs italic text-[#7A869A] dark:text-slate-400 py-8 text-center">
                            Marca cursos como completados para ver tu avance
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
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
                                        className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E]"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[#172B4D] dark:text-slate-100">
                                                    Semestre {s.semestre}
                                                </span>
                                                <span className="text-[11px] font-extrabold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-[#5E6C84] dark:text-slate-300">
                                                    {semPct}%
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-semibold text-[#5E6C84] dark:text-slate-300">
                                                {filtroSemestre === 'todos' && `${s.aprobados} de ${s.total} cursos (${s.creditosAprobados}/${s.creditosTotal} CR)`}
                                                {filtroSemestre === 'obligatorios' && `${obligAprob} de ${obligTotal} obligatorios (${s.creditosObligatoriosAprobados}/${s.creditosObligatoriosTotal} CR)`}
                                                {filtroSemestre === 'optativos' && (optTotal > 0 ? `${optAprob} de ${optTotal} no obligatorios (${s.creditosOptativosAprobados}/${s.creditosOptativosTotal} CR)` : 'Sin cursos optativos')}
                                            </span>
                                        </div>

                                        {/* Barra de progreso visual segmentada */}
                                        <div className="w-full h-3 rounded-full bg-[#DFE1E6] dark:bg-[#1C2636] overflow-hidden flex">
                                            {filtroSemestre === 'todos' ? (
                                                <>
                                                    {obligPct > 0 && (
                                                        <div
                                                            className="h-full bg-[#0052CC] dark:bg-[#4C9AFF] transition-all duration-500"
                                                            style={{ width: `${obligPct}%` }}
                                                            title={`Obligatorios aprobados: ${obligAprob} de ${obligTotal}`}
                                                        />
                                                    )}
                                                    {optPct > 0 && (
                                                        <div
                                                            className="h-full bg-[#7C3AED] dark:bg-[#A78BFA] transition-all duration-500"
                                                            style={{ width: `${optPct}%` }}
                                                            title={`No obligatorios aprobados: ${optAprob} de ${optTotal}`}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <div
                                                    className={`h-full transition-all duration-500 ${
                                                        filtroSemestre === 'obligatorios'
                                                            ? 'bg-[#0052CC] dark:bg-[#4C9AFF]'
                                                            : 'bg-[#7C3AED] dark:bg-[#A78BFA]'
                                                    }`}
                                                    style={{ width: `${semPct}%` }}
                                                />
                                            )}
                                        </div>

                                        {/* Badges de desglose en vista 'todos' */}
                                        {filtroSemestre === 'todos' && (
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] pt-0.5">
                                                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF]" />
                                                    <span className="font-medium text-[#0052CC] dark:text-[#4C9AFF]">Obligatorios:</span>
                                                    <span>{obligAprob} / {obligTotal}</span>
                                                </span>
                                                {optTotal > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA]" />
                                                        <span className="font-medium text-[#7C3AED] dark:text-[#A78BFA]">No obligatorios:</span>
                                                        <span>{optAprob} / {optTotal}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                                        Sin optativos
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {flojo && progreso.aprobados > 0 && (
                        <div className="text-xs text-[#5E6C84] dark:text-slate-400 pt-2 border-t border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span>
                                Semestre con menor avance general: <strong className="text-[#172B4D] dark:text-slate-200">Sem {flojo.semestre}</strong> ({flojo.aprobados} de {flojo.total} aprobados).
                            </span>
                            <span>
                                Obligatorios: {flojo.obligatoriosAprobados}/{flojo.obligatoriosTotal} · No obligatorios: {flojo.optativosAprobados}/{flojo.optativosTotal}
                            </span>
                        </div>
                    )}
                </Card>

                {/* 5. Mi plan */}
                <Card className="flex flex-col gap-4 p-4 sm:p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                                    Mi plan
                                </h2>
                                {plan.periodoActual && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAE6FF] dark:bg-[#352C63]/50 text-[#403294] dark:text-[#C0B6F2] border border-[#C0B6F2] dark:border-[#5243AA]">
                                        <Calendar size={12} />
                                        <span>Ciclo actual: {plan.periodoActual.nombre}</span>
                                    </span>
                                )}
                            </div>
                            {plan.existe && (
                                <p className="text-xs text-[#5E6C84] dark:text-slate-400 mt-1">
                                    {plan.totalCreditos} créditos totales · {plan.totalCursos} cursos planificados
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
                        <div className="flex flex-col gap-4">
                            {/* Bloque destacado según fecha actual o próximo disponible */}
                            {plan.bloqueActual && (
                                <div
                                    className={`p-3.5 sm:p-4 rounded-xl flex flex-col gap-2.5 transition-all ${
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
                                                {plan.esBloquePeriodoActual ? 'Plan del periodo actual' : 'Próximo plan disponible'}
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
                                                    (Sin cursos planificados para {plan.periodoActual.etiquetaCorta})
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

                            {/* Detalle de líneas */}
                            <div className="flex flex-col gap-4">
                                {plan.lineas.map(line => (
                                    <div key={line.id} className="flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between text-xs font-bold text-[#5E6C84] dark:text-slate-300 border-b border-[#DFE1E6] dark:border-[#3E4C5E] pb-1">
                                            <span>{line.name}</span>
                                            <span>{line.totalCreditos} CR</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            {line.blocks.map(b => {
                                                const esActual = b.esPeriodoActual;
                                                return (
                                                    <div
                                                        key={b.blockId}
                                                        className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                                                            esActual
                                                                ? 'bg-[#E3FCEF]/30 dark:bg-[#064223]/15 border-[#57D9A3] dark:border-[#0E5832] ring-1 ring-[#57D9A3]/40 dark:ring-[#0E5832]'
                                                                : 'bg-[#F4F5F7] dark:bg-[#0E1624] border-[#DFE1E6] dark:border-[#3E4C5E]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-[#172B4D] dark:text-slate-200">
                                                                    {b.tipo === 'semestre' ? `Semestre ${b.numero}` : `Vacaciones ${b.numero}`}
                                                                </span>
                                                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#EBECF0] dark:bg-[#1C2636] text-[#5E6C84] dark:text-slate-400">
                                                                    {b.paridad === 'impar' ? 'Impar' : 'Par'}
                                                                </span>
                                                                {esActual && (
                                                                    <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.2 rounded bg-[#006644] text-white dark:bg-[#57D9A3] dark:text-[#0E1624]">
                                                                        Periodo actual
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-[#5E6C84] dark:text-slate-400">
                                                                {b.creditos} CR
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {b.cursos.map(c => (
                                                                <Link
                                                                    key={c.id}
                                                                    to="/visualizador?view=planner"
                                                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-slate-200 hover:border-[#0052CC] dark:hover:border-[#4C9AFF] transition-colors no-underline"
                                                                >
                                                                    <span className="truncate max-w-[170px]">{c.nombre}</span>
                                                                    <span className="text-[10px] text-[#5E6C84] dark:text-slate-400">
                                                                        {c.creditos}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* 6. Mi horario */}
                <Card className="flex flex-col gap-3 p-4 sm:p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                            Mi horario ({periodoLegible})
                        </h2>
                        <Link
                            to="/visualizador?view=schedule"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
                        >
                            <span>{horario.secciones === 0 ? 'Armar horario' : 'Editar horario'}</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>

                    {horario.secciones === 0 ? (
                        <div className="flex items-center justify-between flex-wrap gap-3 py-2 text-xs text-[#5E6C84] dark:text-slate-400">
                            <span>Aún no has armado un horario para {periodoLegible}.</span>
                            <Link
                                to="/visualizador?view=schedule"
                                className="font-semibold text-[#0052CC] dark:text-[#4C9AFF] hover:underline"
                            >
                                Ir al Armador de Horarios
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E]">
                            <div className="flex flex-col">
                                <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">Cursos seleccionados</span>
                                <span className="text-lg font-bold text-[#172B4D] dark:text-slate-100">{horario.cursos}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">Secciones inscritas</span>
                                <span className="text-lg font-bold text-[#172B4D] dark:text-slate-100">{horario.secciones}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-[#5E6C84] dark:text-slate-400">Carga semanal</span>
                                <span className="text-lg font-bold text-[#0052CC] dark:text-[#4C9AFF]">{horario.horasSemana} h/semana</span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* 7. Avisos */}
                <Card className="flex flex-col gap-3 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                            Avisos del planificador
                        </h2>
                        {avisos.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFEBE6] dark:bg-[#5E1A1A] text-[#BF2600] dark:text-[#FF6369]">
                                {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
                            </span>
                        )}
                    </div>

                    {avisos.length === 0 ? (
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400 py-1">
                            Sin avisos para tu plan actual.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {avisos.map((item, idx) => {
                                return (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between text-xs font-bold text-[#172B4D] dark:text-slate-200">
                                            <span>{item.nombre}</span>
                                            <span className="text-[11px] font-medium text-[#5E6C84] dark:text-slate-400">
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
                                                        className={`flex items-start gap-2 p-2 rounded text-xs border ${badgeClasses}`}
                                                    >
                                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                                        <span>{av.texto}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* 8. Bloque Comunidad */}
                <Card className="flex flex-col gap-4 p-4 sm:p-6">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-[#172B4D] dark:text-slate-100">
                            Comunidad
                        </h2>
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400 mt-0.5">
                            Grupos que te pueden interesar y lo destacado del foro
                        </p>
                    </div>

                    {!isSupabaseConfigured || !supabase ? (
                        <EmptyState
                            icon={Users}
                            title="Comunidad no disponible"
                            description="La integración comunitaria no está configurada por el momento."
                        />
                    ) : communityLoading ? (
                        <div className="flex items-center justify-center py-8 text-xs text-[#5E6C84] dark:text-slate-400 gap-2">
                            <RefreshCw size={14} className="animate-spin text-[#0052CC] dark:text-[#4C9AFF]" />
                            <span>Cargando comunidad…</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {/* Grupos sugeridos */}
                            <div className="flex flex-col gap-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5E6C84] dark:text-slate-400">
                                    Grupos de estudio sugeridos
                                </h3>

                                {grupos.length === 0 ? (
                                    <p className="text-xs text-[#5E6C84] dark:text-slate-400 italic py-2">
                                        Aún no hay grupos para tus cursos.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {grupos.map(g => (
                                            <div
                                                key={g.id}
                                                className="p-3.5 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between gap-2.5"
                                            >
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between gap-1.5">
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF]">
                                                            {formatPlatform(g.platform)}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E6C84] dark:text-slate-400">
                                                            <ThumbsUp size={12} />
                                                            {g.upvotes || 0}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-xs font-bold text-[#172B4D] dark:text-slate-100 leading-snug line-clamp-1">
                                                        {g.title}
                                                    </h4>

                                                    {g.curso && (
                                                        <p className="text-[11px] font-semibold text-[#0052CC] dark:text-[#4C9AFF]">
                                                            {g.curso}{g.section ? ` · Sec. ${g.section}` : ''}
                                                        </p>
                                                    )}

                                                    {g.description && (
                                                        <p className="text-[11px] text-[#5E6C84] dark:text-slate-400 leading-relaxed line-clamp-2">
                                                            {truncateText(g.description, 120)}
                                                        </p>
                                                    )}
                                                </div>

                                                {g.link && (
                                                    <a
                                                        href={g.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] no-underline transition-colors"
                                                    >
                                                        <span>Unirme</span>
                                                        <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Post destacado */}
                            <div className="flex flex-col gap-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5E6C84] dark:text-slate-400">
                                    Publicación destacada
                                </h3>

                                {destacado ? (
                                    <div className="p-4 rounded-xl bg-[#F4F5F7] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col gap-2">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FFAB00]/20 text-[#FFAB00] dark:bg-[#FFAB00]/30">
                                                    {destacado.is_pinned ? 'Destacado' : 'Popular'}
                                                </span>
                                                <span className="text-[10px] font-semibold text-[#5E6C84] dark:text-slate-400 px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                                                    Foro en mantenimiento · solo lectura
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-[#5E6C84] dark:text-slate-400 font-medium">
                                                Por {destacado.author_alias || 'Anónimo'}
                                            </span>
                                        </div>

                                        <h4 className="text-sm font-bold text-[#172B4D] dark:text-slate-100">
                                            {destacado.title}
                                        </h4>

                                        <p className="text-xs text-[#5E6C84] dark:text-slate-300 leading-relaxed">
                                            {truncateText(destacado.content, 220)}
                                        </p>

                                        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#5E6C84] dark:text-slate-400 pt-1">
                                            <span className="inline-flex items-center gap-1">
                                                <ThumbsUp size={12} />
                                                {destacado.likes || 0}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <MessageSquare size={12} />
                                                {destacado.comment_count || 0}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#5E6C84] dark:text-slate-400 italic py-2">
                                        Sin publicaciones destacadas por el momento.
                                    </p>
                                )}
                            </div>

                            {/* CTA de sesión */}
                            {!user && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E]">
                                    <div className="text-xs text-[#5E6C84] dark:text-slate-300">
                                        Inicia sesión para recibir sugerencias de grupos adaptadas a tu carrera y cursos.
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => window.dispatchEvent(new Event('pemtree-open-auth-modal'))}
                                        className="shrink-0 text-xs"
                                    >
                                        Inicia sesión para personalizar
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
