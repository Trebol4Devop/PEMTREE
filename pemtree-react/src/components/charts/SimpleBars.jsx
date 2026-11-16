/**
 * Gráfica de barras ligera, sin dependencias, que respeta el modo claro/oscuro.
 * - horizontal: filas con etiqueta + barra + valor (ideal para rankings/listas).
 * - vertical:   columnas con valor encima y etiqueta debajo (ideal para series temporales).
 */
export default function SimpleBars({
    data = [],
    orientation = 'horizontal',
    isDark = false,
    height = 180,
    emptyText = 'Aún no hay datos para mostrar'
}) {
    const values = data.map(d => Number(d.value) || 0);
    const max = Math.max(...values, 1);

    const fill = isDark ? '#4C9AFF' : '#0052CC';
    const track = isDark ? 'rgba(76, 154, 255, 0.16)' : 'rgba(0, 82, 204, 0.10)';
    const textColor = isDark ? '#CBD5E1' : '#172B4D';
    const mutedColor = isDark ? '#94A3B8' : '#7A869A';

    if (!data || data.length === 0) {
        return (
            <div className="text-xs italic text-[#7A869A] dark:text-slate-400 py-8 text-center">
                {emptyText}
            </div>
        );
    }

    if (orientation === 'horizontal') {
        return (
            <div className="flex flex-col gap-2.5">
                {data.map((d, i) => {
                    const v = Number(d.value) || 0;
                    const pct = Math.max((v / max) * 100, 2.5);
                    return (
                        <div key={i} className="flex items-center gap-2.5">
                            <span
                                className="w-24 sm:w-32 shrink-0 text-[11px] font-bold truncate"
                                style={{ color: textColor }}
                                title={d.label}
                            >
                                {d.label}
                            </span>
                            <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ backgroundColor: track }}>
                                <div
                                    className="h-full rounded-md transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: fill }}
                                />
                            </div>
                            <span className="w-8 shrink-0 text-right text-[11px] font-extrabold" style={{ color: fill }}>
                                {v}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // vertical
    const topPad = 18;   // espacio para el valor
    const bottomPad = 22; // espacio para la etiqueta
    const barArea = Math.max(height - topPad - bottomPad, 40);

    return (
        <div className="flex items-stretch gap-1 sm:gap-2" style={{ height }}>
            {data.map((d, i) => {
                const v = Number(d.value) || 0;
                const barH = Math.max(Math.round((v / max) * barArea), 3);
                return (
                    <div key={i} className="flex-1 min-w-0 h-full flex flex-col">
                        <div className="flex items-end justify-center" style={{ height: topPad }}>
                            <span className="text-[10px] font-extrabold" style={{ color: fill }}>{v}</span>
                        </div>
                        <div className="flex-1 flex items-end justify-center" style={{ minHeight: 0 }}>
                            <div
                                className="w-full max-w-[28px] rounded-t-md"
                                style={{ height: barH, backgroundColor: fill }}
                                title={`${d.label}: ${v}`}
                            />
                        </div>
                        <div className="flex items-start justify-center" style={{ height: bottomPad }}>
                            <span
                                className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center"
                                style={{ color: mutedColor }}
                                title={d.label}
                            >
                                {d.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
