import { Leaf, Cpu, Building2, Zap, CircuitBoard, Factory, Cog, FlaskConical, Atom } from 'lucide-react';

const CAREER_ICONS = {
    ambiental: Leaf,
    ciencias_y_sistemas: Cpu,
    civil: Building2,
    electrica: Zap,
    electronica: CircuitBoard,
    industrial: Factory,
    mecanica: Cog,
    mecanica_electrica: Cog,
    mecanica_industrial: Factory,
    quimica: FlaskConical,
};

function NodeStyleBar({ primary, secondary, className = '' }) {
    return (
        <div
            className={`flex w-full h-3.5 sm:h-4 rounded-sm overflow-hidden ${className}`}
            style={{ border: `1px solid ${primary}40` }}
        >
            <div
                className="flex flex-col h-full w-3.5 sm:w-4 shrink-0"
            >
                <div className="flex-1" style={{ backgroundColor: primary }} />
            <div className="w-[42px] sm:w-[48px] shrink-0" style={{ backgroundColor: secondary }} />
            </div>
            <div className="flex-1" style={{ backgroundColor: secondary }} />
            <div className="w-3.5 sm:w-4 shrink-0" style={{ backgroundColor: primary }} />
        </div>
    );
}

function CareerIcon({ base, primary }) {
    const Icon = CAREER_ICONS[base] || Atom;
    return (
        <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0"
            style={{
                border: `2px solid ${primary}`,
                backgroundColor: `${primary}14`,
            }}
        >
            <Icon size={26} className="sm:hidden" strokeWidth={1.75} style={{ color: primary }} />
            <Icon size={30} className="hidden sm:block" strokeWidth={1.75} style={{ color: primary }} />
        </div>
    );
}

export default function CareerCard({ name, shortName, base, jsonFile, colors, year, onSelect }) {
    const primary = colors?.color1 || '#0052CC';
    const secondary = colors?.color2 || primary;

    return (
        <button
            type="button"
            onClick={() => onSelect(jsonFile)}
            className="group relative w-[220px] sm:w-[260px] aspect-[3/2] rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg text-left p-0"
            style={{ borderColor: primary, backgroundColor: 'transparent' }}
            aria-label={`Abrir pensum de ${name}`}
            title={`Abrir ${name}`}
        >
            {year && (
                <span
                    className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-20 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm pointer-events-none"
                    style={{
                        backgroundColor: '#ffffff',
                        color: primary,
                        border: `1.5px solid ${primary}`,
                    }}
                >
                    CLAR {year}
                </span>
            )}

            <div
                className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4"
                style={{
                    backgroundColor: 'transparent',
                    borderTop: `2px solid ${primary}`,
                    borderRight: `2px solid ${primary}`,
                    transform: 'translate(-1px, -1px) rotate(45deg) scaleX(0.7) scaleY(0.7)',
                    transformOrigin: 'top left',
                }}
            />

            <div
                className="absolute inset-0 m-1.5 sm:m-2 rounded-md overflow-hidden flex flex-col"
            >
                <div
                    className="flex-1 flex items-center justify-between px-3 sm:px-4"
                    style={{ backgroundColor: primary, color: '#ffffff' }}
                >
                    <div className="flex flex-col leading-tight">
                        <span className="text-[11px] sm:text-sm font-extrabold uppercase tracking-wider">
                            Ingeniería
                        </span>
                        <span className="text-[11px] sm:text-sm font-extrabold uppercase tracking-wider">
                            {shortName}
                        </span>
                    </div>

                    <div className="relative shrink-0 w-12 h-10 sm:w-16 sm:h-12">
                        <svg viewBox="0 0 64 48" className="w-full h-full" aria-hidden="true">
                            <circle cx="10" cy="8" r="2.5" fill={secondary} />
                            <circle cx="14" cy="14" r="1.8" fill={secondary} />
                            <path
                                d="M10 8 L22 22 L30 14 M14 14 L20 22"
                                stroke={secondary}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <rect
                                x="28"
                                y="6"
                                width="14"
                                height="3"
                                fill={secondary}
                                transform="rotate(-12 35 7.5)"
                            />
                            <path
                                d="M44 18 L56 30 M44 22 L52 30"
                                stroke={secondary}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <circle cx="58" cy="32" r="1.8" fill={secondary} />
                        </svg>
                    </div>
                </div>

                <div className="flex-[1.4] flex items-center gap-3 sm:gap-4 px-3 sm:px-4 bg-white dark:bg-[#1C2636]">
                    <CareerIcon base={base} primary={primary} />

                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 min-w-0">
                        <NodeStyleBar primary={primary} secondary={secondary} />
                        <NodeStyleBar primary={primary} secondary={secondary} />
                        <NodeStyleBar primary={primary} secondary={secondary} />
                    </div>
                </div>
            </div>
        </button>
    );
}
