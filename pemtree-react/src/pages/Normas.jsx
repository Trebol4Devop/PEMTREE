import { Link } from 'react-router-dom';
import {
    ShieldCheck, MessageSquare, Users, Flag, Info,
    ExternalLink, BookOpen, Ban, Scale, ArrowLeft
} from 'lucide-react';
import Seo from '../components/seo/Seo';
import { Card } from '../components/ui';
import { DISCLAIMER } from '../onboarding/normativo';

const GENERAL_RULES = [
    'Trata a los demás con respeto. No acoses, insultes ni ataques personalmente a otros usuarios.',
    'Publica contenido académico: dudas de cursos, catedráticos, horarios, prerrequisitos, apuntes y exámenes.',
    'Prohibido el spam, la autopromoción repetitiva, la venta de productos o servicios y los enlaces no académicos.',
    'No publiques información personal (nombre, teléfono, correo) de terceros ni de docentes.',
    'No te hagas pasar por autoridades de la universidad, por moderadores o por otras personas.',
    'Prohibido el contenido ilegal, ofensivo, discriminatorio, de odio o con fines de estafa.',
];

const FORUM_RULES = [
    'Publica en la categoría correcta (Prerrequisitos & Pensum, Catedráticos & Auxiliares, Horarios & Secciones, Apuntes & Exámenes, Consultas Generales).',
    'Tu identidad está protegida tras un seudónimo (alias). Elige uno que no revele datos personales.',
    'Elige bien el título de tu consulta para que otros estudiantes puedan encontrarla y ayudarte.',
    'Los mensajes con más de 3 meses de antigüedad se eliminan automáticamente. Guarda o exporta la información importante antes de que expire.',
    'Vota con "Me gusta" las publicaciones y respuestas útiles para destacar el contenido de calidad.',
];

const GROUPS_RULES = [
    'Comparte únicamente enlaces de grupos de estudio, comunidades, laboratorios o repositorios académicos.',
    'Los enlaces son revisados por moderadores antes de publicarse; los que estén caídos o no sean académicos se eliminan.',
    'No compartas enlaces de spam, cadenas, ventas ni contenido no relacionado con el estudio.',
    'Reporta los grupos que consideres inválidos o dañinos para que la comunidad los mantenga verificada.',
];

const MODERATION_RULES = [
    'La plataforma cuenta con un sistema automático de filtrado de contenido ofensivo.',
    'Los usuarios pueden reportar publicaciones, comentarios y grupos. Los reportes son revisados por moderadores y administradores.',
    'El contenido que viole las normas puede ser ocultado o eliminado por moderadores o administradores.',
    'Las cuentas que reincidan en las faltas pueden quedar bloqueadas de la comunidad.',
    'Las decisiones de moderación buscan mantener un ambiente respetuoso y libre de spam para toda la comunidad.',
];

const TERMS_OF_SERVICE = [
    'Responsabilidad legal exclusiva del autor: Cada usuario es el único y exclusivo responsable legal de cualquier publicación, mensaje, comentario, enlace, imagen o dato que comparta en la plataforma.',
    'Exención de responsabilidad de PEMTREE y administradores: PEMTREE y su equipo de desarrollo actúan como un espacio técnico e informativo comunitario independiente ("Espacio estudiantil independiente no oficial") y no asumen responsabilidad alguna (civil, penal o administrativa) por el contenido o conducta de terceros.',
    'Aceptación expresa de términos: Al crear publicaciones, publicar comentarios, proponer enlaces o interactuar en cualquier módulo, el usuario declara y acepta expresamente estos Términos de Servicio.',
    'Prohibición de material ilícito: Queda estrictamente prohibido compartir material confidencial, datos privados de terceros sin su consentimiento, contenido que infrinja derechos de propiedad intelectual, difamatorio o contrario a la ley.',
    'Facultad de moderación: Los moderadores y administradores podrán suspender, bloquear u ocultar contenido y cuentas que infrinjan estas reglas, sin que ello implique supervisión previa obligatoria ni corresponsabilidad sobre lo publicado.',
];

const SOURCES = [
    { label: 'Portal de Ingeniería (FIUSAC)', url: 'https://portal.ingenieria.usac.edu.gt' },
    { label: 'Redes de Estudio FIUSAC', url: 'https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio' },
    { label: 'Normativo PDF (Acta 33-2021)', url: 'https://portal.ingenieria.usac.edu.gt/reglamentos/NormativoGeneral_Evaluacion_y_Promocion.pdf' },
];

function SectionTitle({ icon: Icon, title, subtitle }) {
    return (
        <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={18} />
            </div>
            <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
        </div>
    );
}

function RuleList({ items }) {
    return (
        <ul className="flex flex-col gap-2.5">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F4F5F7] dark:bg-[#0E1624] text-[#0052CC] dark:text-[#4C9AFF] text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{item}</span>
                </li>
            ))}
        </ul>
    );
}

export default function Normas() {
    return (
        <>
            <Seo
                title="Normas de la Comunidad"
                description="Reglas y buenas prácticas del Foro Estudiantil y los Grupos de WhatsApp de PEMTREE. Conoce cómo se modera la comunidad, el descargo de responsabilidad y las fuentes de datos académicos."
                pathname="/normas"
            />
            <div className="flex-1 flex flex-col items-center overflow-y-auto w-full hide-scrollbar bg-[#FAFBFC] dark:bg-[#0E1624]">
                {/* Header Banner */}
                <div className="w-full bg-gradient-to-r from-[#0052CC] to-[#0747A6] dark:from-[#0E1624] dark:to-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-10 px-4 shrink-0 text-white shadow-sm">
                    <div className="max-w-4xl mx-auto">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-100 dark:text-slate-300 hover:text-white dark:hover:text-white transition no-underline mb-4"
                        >
                            <ArrowLeft size={14} /> Inicio
                        </Link>
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 dark:bg-[#4C9AFF]/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                                <ShieldCheck size={28} className="text-white dark:text-[#4C9AFF]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Normas de la Comunidad</h1>
                                    <span className="text-[11px] font-extrabold bg-white/20 dark:bg-[#4C9AFF]/20 text-white dark:text-[#7DD3FC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        Red Estudiantil de Ingeniería
                                    </span>
                                    <span className="text-[11px] font-bold bg-black/25 dark:bg-black/40 text-white/90 px-2.5 py-0.5 rounded-full border border-white/15">
                                        Espacio estudiantil independiente no oficial
                                    </span>
                                </div>
                                <p className="text-sm text-blue-100 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                                    Reglas y buenas prácticas para el Foro Estudiantil y los Grupos de WhatsApp. Léelas antes de participar: un ambiente sano depende de todos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
                    {/* Principios generales */}
                    <Card>
                        <SectionTitle
                            icon={Scale}
                            title="Principios generales"
                            subtitle="Reglas que aplican a toda la plataforma y a todos los usuarios."
                        />
                        <RuleList items={GENERAL_RULES} />
                    </Card>

                    {/* Foro */}
                    <Card>
                        <SectionTitle
                            icon={MessageSquare}
                            title="Foro Estudiantil"
                            subtitle="Comunidad anónima para resolver dudas académicas entre estudiantes."
                        />
                        <RuleList items={FORUM_RULES} />
                    </Card>

                    {/* Grupos de WhatsApp */}
                    <Card>
                        <SectionTitle
                            icon={Users}
                            title="Grupos de WhatsApp, Telegram y Discord"
                            subtitle="Directorio comunitario de grupos de estudio, laboratorios y repositorios."
                        />
                        <RuleList items={GROUPS_RULES} />
                    </Card>

                    {/* Moderación */}
                    <Card>
                        <SectionTitle
                            icon={Ban}
                            title="Moderación y sanciones"
                            subtitle="Cómo se mantiene la comunidad segura y qué ocurre cuando se infringen las normas."
                        />
                        <RuleList items={MODERATION_RULES} />
                        <div className="mt-5 flex items-start gap-2.5 bg-sky-50 dark:bg-[#0C3E5F]/40 border border-sky-200/70 dark:border-[#38BDF8]/30 text-[#0369A1] dark:text-[#7DD3FC] rounded-xl px-3.5 py-2.5 text-[11px] sm:text-xs font-semibold leading-snug">
                            <Info size={15} className="shrink-0 mt-0.5" />
                            <span className="flex-1">
                                El contenido bloqueado por moderación queda oculto para toda la comunidad, incluso para su autor. Los moderadores y administradores pueden restaurarlo si la decisión fue errónea.
                            </span>
                        </div>
                    </Card>

                    {/* Términos de Servicio y Responsabilidad Legal */}
                    <Card id="terminos">
                        <SectionTitle
                            icon={Scale}
                            title="Términos de Servicio y Responsabilidad Legal del Contenido"
                            subtitle="Condiciones de uso y responsabilidad exclusiva del usuario sobre el material publicado."
                        />
                        <RuleList items={TERMS_OF_SERVICE} />
                        <div className="mt-5 flex items-start gap-2.5 bg-amber-50 dark:bg-[#4A3A1A]/40 border border-amber-200/70 dark:border-[#F59E0B]/30 text-[#92400E] dark:text-[#FCD34D] rounded-xl px-3.5 py-2.5 text-[11px] sm:text-xs font-semibold leading-snug">
                            <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                            <span className="flex-1">
                                <strong>Aceptación expresa:</strong> Al publicar cualquier contenido o enlace en PEMTREE, el usuario acepta de forma vinculante que es el único y exclusivo responsable legal por dicho material.
                            </span>
                        </div>
                    </Card>

                    {/* Descargo */}
                    <Card id="descargo">
                        <SectionTitle
                            icon={ShieldCheck}
                            title={DISCLAIMER.title}
                            subtitle="Relación de PEMTREE con la universidad y alcance de la información."
                        />
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed mb-3">{DISCLAIMER.text}</p>
                        <ul className="flex flex-col gap-2 mb-4">
                            {DISCLAIMER.points.map((point, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="w-4 h-4 rounded-full bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                        ✓
                                    </span>
                                    <span className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed">{point}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {DISCLAIMER.links.map((link) => (
                                <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-[#F4F5F7] dark:bg-[#0E1624] hover:bg-[#EBECF0] dark:hover:bg-[#263346] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs font-bold px-3.5 py-2 rounded-lg transition no-underline"
                                >
                                    <ExternalLink size={13} className="text-[#0052CC] dark:text-[#4C9AFF] shrink-0" />
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </Card>

                    {/* Fuentes */}
                    <Card>
                        <SectionTitle
                            icon={BookOpen}
                            title="Fuentes de datos"
                            subtitle="De dónde proviene la información académica mostrada en PEMTREE."
                        />
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed mb-4">
                            Los pensums, horarios, secciones y docentes se basan en las publicaciones oficiales que la Facultad de Ingeniería de la Universidad de San Carlos de Guatemala (FIUSAC) emite cada semestre y escuela de vacaciones. PEMTREE organiza y transforma esa información pública para facilitar su consulta; para información oficial y vigente consulta siempre los portales de la Facultad.
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {SOURCES.map((link) => (
                                <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-[#F4F5F7] dark:bg-[#0E1624] hover:bg-[#EBECF0] dark:hover:bg-[#263346] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs font-bold px-3.5 py-2 rounded-lg transition no-underline"
                                >
                                    <ExternalLink size={13} className="text-[#0052CC] dark:text-[#4C9AFF] shrink-0" />
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <div className="mt-5 flex items-start gap-2.5 bg-amber-50 dark:bg-[#4A3A1A]/40 border border-amber-200/70 dark:border-[#F59E0B]/30 text-[#92400E] dark:text-[#FCD34D] rounded-xl px-3.5 py-2.5 text-[11px] sm:text-xs font-semibold leading-snug">
                            <Flag size={15} className="shrink-0 mt-0.5" />
                            <span className="flex-1">
                                <strong>Espacio estudiantil independiente no oficial:</strong> PEMTREE no es una página oficial de la Universidad de San Carlos de Guatemala ni de la Facultad de Ingeniería. Es una herramienta comunitaria creada por y para estudiantes.
                            </span>
                        </div>
                    </Card>

                    <div className="text-center pb-2">
                        <Link
                            to="/visualizador"
                            className="inline-flex items-center gap-2 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-md no-underline"
                        >
                            <ArrowLeft size={15} />
                            Ir al Visualizador
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
