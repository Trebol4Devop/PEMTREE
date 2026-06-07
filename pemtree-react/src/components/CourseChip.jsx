import { currentPensumColors } from '../modules/data/cursos';
import { Award } from 'lucide-react';

export default function CourseChip({ curso, onDragStart, onRemove, isSuficiencia, onToggleSuficiencia, sourceBlock, mergedMap }) {
    const primary = (curso.colors?.leftTop?.fill) || currentPensumColors.primary || '#fc904f';
    const secondary = (curso.colors?.leftBottom?.fill) || currentPensumColors.secondary || '#ffd0b6';
    const textFill = (curso.colors?.text?.fill) || '#333';

    const lookup = mergedMap || null;
    const prereqCodes = (curso.prerequisitos || [])
        .map(id => { const c = lookup ? lookup.get(id) : null; return c ? c.codigo : null; })
        .filter(Boolean);

    const chipPrimary = isSuficiencia ? '#059669' : primary;
    const chipSecondary = isSuficiencia ? '#d1fae5' : secondary;
    const chipText = isSuficiencia ? '#065f46' : textFill;
    const chipCenter = isSuficiencia ? '#ecfdf5' : secondary;

    const isDark = document.documentElement.classList.contains('dark');
    const codeTextColor = curso.completado
        ? (isDark ? '#10b981' : '#059669')
        : chipText;
    const codeSuffix = curso.completado ? ' ✓' : (curso.cursando ? ' ●' : '');

    return (
        <div
            className={`planner-chip ${isSuficiencia ? 'planner-chip-suficiencia' : ''}`}
            draggable={!isSuficiencia}
            onDragStart={isSuficiencia ? undefined : (e) => {
                e.dataTransfer.setData('courseId', String(curso.id));
                e.dataTransfer.setData('sourceBlock', sourceBlock || '');
                e.dataTransfer.effectAllowed = 'move';
                if (onDragStart) onDragStart(curso.id);
            }}
            onTouchStart={isSuficiencia ? undefined : (e) => {
                e.preventDefault();
                window.__touchDrag = {
                    courseId: curso.id,
                    sourceBlock: sourceBlock || '',
                    ghost: {
                        codigo: curso.codigo,
                        nombre: curso.nombre,
                        creditos: curso.creditos,
                        primary: chipPrimary,
                        secondary: chipSecondary,
                        text: chipText,
                        center: chipCenter,
                        isDark,
                    }
                };
            }}
            onTouchMove={isSuficiencia ? undefined : (e) => {
                if (window.__touchDrag) e.preventDefault();
            }}
        >
            <div className="planner-chip-left">
                <div className="planner-chip-left-top" style={{ backgroundColor: chipPrimary }}>
                    <span className="planner-chip-code" style={{ color: isSuficiencia ? '#fff' : codeTextColor }}>
                        {curso.codigo}{codeSuffix}
                    </span>
                </div>
                <div className="planner-chip-left-bottom" style={{ backgroundColor: chipSecondary }}>
                    <span className="planner-chip-credits" style={{ color: chipText }}>
                        {curso.creditos} cr
                    </span>
                </div>
            </div>
            <div className="planner-chip-center" style={{ backgroundColor: chipCenter }}>
                {curso.obligatorio && !curso.completado && !isSuficiencia && (
                    <span className="planner-chip-obligatorio-marker">●</span>
                )}
                <span className="planner-chip-name" style={{ color: chipText }}>
                    {curso.nombre}
                </span>
            </div>
            <div className="planner-chip-right" style={{ backgroundColor: chipPrimary }}>
                {isSuficiencia ? (
                    <span className="planner-chip-prereq" style={{ color: '#fff', fontSize: '0.5rem', fontWeight: 800 }}>SUF</span>
                ) : prereqCodes.length > 0 ? (
                    prereqCodes.map(code => (
                        <span key={code} className="planner-chip-prereq" style={{ color: textFill }}>
                            {code}
                        </span>
                    ))
                ) : (
                    <span className="planner-chip-prereq planner-chip-prereq-none" style={{ color: textFill }}>
                        —
                    </span>
                )}
            </div>
            {onToggleSuficiencia && (
                <button
                    className={`planner-chip-suf-toggle ${isSuficiencia ? 'planner-chip-suf-toggle-active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onToggleSuficiencia(); }}
                    title={isSuficiencia ? 'Quitar suficiencia' : 'Marcar como suficiencia'}
                >
                    <Award size={11} />
                </button>
            )}
            {onRemove && (
                <button className="planner-chip-remove" onClick={() => onRemove(curso.id)} title="Quitar">
                    ×
                </button>
            )}
        </div>
    );
}
