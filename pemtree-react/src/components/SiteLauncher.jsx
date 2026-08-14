import { useNavigate } from 'react-router-dom';
import {
    Cpu, CalendarRange, Clock, MessageSquare, Users, ArrowUpRight,
} from 'lucide-react';
import { Modal } from './ui';
import { NodeStyleBar } from './CareerCard';
import { useTheme } from '../theme/ThemeContext';

const SCHEDULE_COLORS = ['#8B5CF6', '#14B8A6', '#F97316', '#EC4899'];
const GREEN = '#22C55E';

function FocalCircle({ icon: Icon, color, bg, size = 20 }) {
    return (
        <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ border: `2px solid ${color}`, backgroundColor: bg }}
        >
            <Icon size={size} strokeWidth={1.75} style={{ color }} />
        </div>
    );
}

function MiniGraph({ color }) {
    return (
        <svg viewBox="0 0 64 48" className="w-10 h-7 shrink-0" aria-hidden="true">
            <circle cx="10" cy="8" r="2.5" fill={color} />
            <circle cx="14" cy="14" r="1.8" fill={color} />
            <path
                d="M10 8 L22 22 L30 14 M14 14 L20 22"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
            />
            <rect x="28" y="6" width="14" height="3" fill={color} transform="rotate(-12 35 7.5)" />
            <path
                d="M44 18 L56 30 M44 22 L52 30"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
            />
            <circle cx="58" cy="32" r="1.8" fill={color} />
        </svg>
    );
}

function VisualizadorSymbol({ primary, secondary }) {
    return (
        <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 min-w-0">
            {[0, 1, 2].map((i) => (
                <NodeStyleBar key={i} primary={primary} secondary={secondary} />
            ))}
        </div>
    );
}

function PlannerSymbol({ primary, secondary }) {
    const block = 'w-full h-2.5 rounded-[3px]';
    return (
        <div className="flex-1 flex items-stretch gap-1.5 min-w-0">
            <div className="w-1.5 rounded-[2px]" style={{ backgroundColor: `${primary}44` }} />
            <div className="flex-1 grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-1.5">
                    <div className={block} style={{ backgroundColor: primary }} />
                    <div className={block} style={{ backgroundColor: secondary }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className={block} style={{ backgroundColor: secondary }} />
                    <div className={block} style={{ backgroundColor: primary }} />
                    <div className={block} style={{ backgroundColor: `${primary}66` }} />
                </div>
            </div>
        </div>
    );
}

function ScheduleSymbol({ blue, neutral }) {
    const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
    const timeLabels = ['07', '08', '09'];
    const blocks = [
        { day: 0, row: 0, span: 1, color: SCHEDULE_COLORS[0] },
        { day: 1, row: 1, span: 2, color: SCHEDULE_COLORS[1] },
        { day: 2, row: 0, span: 1, color: SCHEDULE_COLORS[2] },
        { day: 3, row: 2, span: 1, color: SCHEDULE_COLORS[3] },
        { day: 4, row: 1, span: 1, color: SCHEDULE_COLORS[0] },
        { day: 5, row: 0, span: 1, color: SCHEDULE_COLORS[1] },
    ];

    return (
        <div className="flex-1 flex flex-col gap-[2px] min-w-0">
            <div className="flex gap-[2px]">
                <div className="w-[12px] rounded-[2px]" style={{ backgroundColor: `${blue}44` }} />
                <div className="flex-1 grid grid-cols-7 gap-[2px]">
                    {days.map((d) => (
                        <div
                            key={d}
                            className="h-[7px] rounded-[2px] flex items-center justify-center"
                            style={{ backgroundColor: blue }}
                        >
                            <span className="text-transparent font-bold leading-none" style={{ fontSize: '4px' }}>
                                {d}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex gap-[2px] min-h-0">
                <div className="w-[12px] flex flex-col gap-[2px]">
                    {timeLabels.map((t) => (
                        <div
                            key={t}
                            className="flex-1 rounded-[2px] flex items-center justify-center"
                            style={{ backgroundColor: neutral }}
                        >
                            <span className="leading-none font-semibold" style={{ fontSize: '4px', color: 'transparent' }}>
                                {t}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 gap-[2px]">
                    {days.map((d, di) => (
                        <div key={d} className="grid grid-rows-3 gap-[2px]">
                            {blocks
                                .filter((b) => b.day === di)
                                .map((b) => (
                                    <div
                                        key={`${di}-${b.row}`}
                                        className="rounded-[2px]"
                                        style={{
                                            gridRow: `${b.row + 1} / ${b.row + b.span + 1}`,
                                            backgroundColor: b.color,
                                        }}
                                    />
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ForoSymbol({ blueLight, neutral }) {
    return (
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {[0, 1].map((i) => (
                <div key={i} className="rounded-md border p-1" style={{ borderColor: neutral }}>
                    <div className="flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: neutral }} />
                        <span className="h-1 flex-1 rounded" style={{ backgroundColor: neutral }} />
                    </div>
                    <div className="w-8 h-1.5 rounded" style={{ backgroundColor: blueLight }} />
                </div>
            ))}
        </div>
    );
}

function GroupsSymbol({ blue, greenLight, neutral }) {
    return (
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {[0, 1].map((i) => (
                <div key={i} className="rounded-md border p-1" style={{ borderColor: neutral }}>
                    <div className="w-9 h-1.5 rounded mb-1" style={{ backgroundColor: greenLight }} />
                    <div className="h-2.5 rounded flex items-center justify-end px-1" style={{ backgroundColor: blue }}>
                        <ArrowUpRight size={8} className="text-white" strokeWidth={3} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function DestinationCard({ destination, colors, isDarkMode, onGo }) {
    const blue = isDarkMode ? '#4C9AFF' : '#0052CC';
    const blueLight = isDarkMode ? '#0C295E' : '#DEEBFF';
    const neutral = isDarkMode ? '#3E4C5E' : '#E4E7EC';
    const greenLight = isDarkMode ? 'rgba(34,197,94,0.18)' : '#DCFCE7';
    const pensum = colors?.color1 || blue;
    const pensumSecondary = colors?.color2 || blueLight;

    let headerColor = blue;
    let headerLabel = destination.title;
    let headerDecor = null;
    let focal = null;
    let symbol = null;

    switch (destination.id) {
        case 'visualizador':
            headerColor = pensum;
            headerDecor = <MiniGraph color={pensumSecondary} />;
            focal = <FocalCircle icon={Cpu} color={pensum} bg={`${pensum}1f`} />;
            symbol = <VisualizadorSymbol primary={pensum} secondary={pensumSecondary} />;
            break;
        case 'planificador':
            headerDecor = <CalendarRange size={13} className="text-white" />;
            focal = <FocalCircle icon={CalendarRange} color={blue} bg={`${blue}1f`} />;
            symbol = <PlannerSymbol primary={pensum} secondary={pensumSecondary} />;
            break;
        case 'horarios':
            headerLabel = 'Horarios';
            headerDecor = <Clock size={13} className="text-white" />;
            focal = <FocalCircle icon={Clock} color={blue} bg={`${blue}1f`} />;
            symbol = <ScheduleSymbol blue={blue} neutral={neutral} />;
            break;
        case 'foro':
            headerLabel = 'Foro';
            headerDecor = <MessageSquare size={13} className="text-white" />;
            focal = <FocalCircle icon={MessageSquare} color={blue} bg={blueLight} />;
            symbol = <ForoSymbol blueLight={blueLight} neutral={neutral} />;
            break;
        case 'grupos':
            headerLabel = 'Grupos';
            headerDecor = <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GREEN }} />;
            focal = <FocalCircle icon={Users} color={GREEN} bg={greenLight} />;
            symbol = <GroupsSymbol blue={blue} greenLight={greenLight} neutral={neutral} />;
            break;
        default:
            break;
    }

    return (
        <button
            type="button"
            onClick={() => onGo(destination.route)}
            className="group w-[220px] max-w-full sm:w-full mx-auto text-left p-0 m-0 bg-transparent border-none cursor-pointer"
            aria-label={`Ir a ${destination.title}`}
        >
            <div
                className="relative w-full aspect-[3/2] rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg"
                style={{ borderColor: headerColor }}
            >
                <div
                    className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4"
                    style={{
                        backgroundColor: 'transparent',
                        borderTop: `2px solid ${headerColor}`,
                        borderRight: `2px solid ${headerColor}`,
                        transform: 'translate(-1px, -1px) rotate(45deg) scaleX(0.7) scaleY(0.7)',
                        transformOrigin: 'top left',
                    }}
                />

                <div className="absolute inset-0 m-1.5 sm:m-2 rounded-md overflow-hidden flex flex-col">
                    <div
                        className={`flex-1 flex items-center px-3 ${headerLabel ? 'justify-between' : 'justify-end'}`}
                        style={{ backgroundColor: headerColor, color: '#ffffff' }}
                    >
                        {headerLabel && (
                            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap leading-tight">
                                {headerLabel}
                            </span>
                        )}
                        {headerDecor}
                    </div>

                    <div className="flex-[1.4] flex items-center gap-3 sm:gap-4 px-3 sm:px-4 bg-white dark:bg-[#1C2636]">
                        {focal}
                        {symbol}
                    </div>
                </div>
            </div>

            <div className="mt-2 px-0.5 text-center">
                <h4 className="font-bold text-sm text-[#172B4D] dark:text-slate-100 group-hover:text-[#0052CC] dark:group-hover:text-[#4C9AFF] transition-colors leading-snug">
                    {destination.title}
                </h4>
                <p className="text-[11px] text-[#5E6C84] dark:text-slate-400 mt-0.5 leading-snug">
                    {destination.subtitle}
                </p>
            </div>
        </button>
    );
}

export default function SiteLauncher({ open, onClose, selectedCareer }) {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    const destinations = {
        tools: [
            { id: 'visualizador', title: 'Visualizador', subtitle: 'Explora la ruta de tu pensum', route: '/visualizador' },
            { id: 'planificador', title: 'Planificador', subtitle: 'Arma tu línea académica', route: '/visualizador?view=planner' },
            { id: 'horarios', title: 'Armador de Horarios', subtitle: 'Combina secciones sin traslapes', route: '/visualizador?view=schedule' },
        ],
        community: [
            { id: 'foro', title: 'Foro Estudiantil', subtitle: 'Dudas anónimas de la comunidad', route: '/foro' },
            { id: 'grupos', title: 'Grupos Estudiantiles', subtitle: 'Comunidades y enlaces de tu carrera', route: '/grupos' },
        ],
    };

    const handleGo = (route) => {
        onClose();
        navigate(route);
    };

    const sectionTitle = (text) => (
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-center text-[#5E6C84] dark:text-slate-400">
            {text}
        </h3>
    );

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title="¿A qué sitio deseas ir?"
            size="lg"
            className="max-w-[760px]"
            contentClassName="pb-2"
        >
            <p className="text-xs sm:text-sm text-center text-[#5E6C84] dark:text-slate-400 -mt-2 mb-5">
                {selectedCareer?.name
                    ? `Elegiste ${selectedCareer.name}. ¿Qué quieres hacer ahora?`
                    : 'Elige una herramienta o una comunidad para continuar.'}
            </p>

            <div className="space-y-6">
                <div className="space-y-3">
                    {sectionTitle('Herramientas')}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {destinations.tools.map((d) => (
                            <DestinationCard
                                key={d.id}
                                destination={d}
                                colors={selectedCareer?.colors}
                                isDarkMode={isDarkMode}
                                onGo={handleGo}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    {sectionTitle('Comunidad')}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                        {destinations.community.map((d) => (
                            <DestinationCard
                                key={d.id}
                                destination={d}
                                colors={selectedCareer?.colors}
                                isDarkMode={isDarkMode}
                                onGo={handleGo}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
