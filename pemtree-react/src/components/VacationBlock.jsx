import { Trash2 } from 'lucide-react';
import CourseChip from './CourseChip';

export default function VacationBlock({ vacNum, courses, onDrop, onRemoveChip, mergedMap, onToggle }) {
    const isFull = courses.length >= 2;

    return (
        <div
            className={`planner-block planner-block-vacation ${isFull ? 'planner-block-vacation-full' : ''}`}
            data-block-id={`vac-${vacNum}`}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('planner-block-over'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('planner-block-over'); }}
            onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('planner-block-over');
                const courseId = parseInt(e.dataTransfer.getData('courseId'), 10);
                const sourceBlock = e.dataTransfer.getData('sourceBlock');
                if (!isNaN(courseId)) onDrop(courseId, `vac-${vacNum}`, sourceBlock);
            }}
        >
            <div className="planner-block-header planner-block-header-vacation">
                <span className="planner-block-label">Vac {vacNum}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="planner-block-capacity">{courses.length}/2</span>
                    {onToggle && (
                        <button 
                            type="button" 
                            onClick={() => onToggle(vacNum)}
                            title="Eliminar escuela de vacaciones"
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.6 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>
            <div className="planner-block-body">
                {courses.length === 0 && !isFull && (
                    <div className="planner-block-empty">Max 2</div>
                )}
                {courses.map(curso => (
                    <CourseChip
                        key={curso.id}
                        curso={curso}
                        onRemove={onRemoveChip}
                        sourceBlock={`vac-${vacNum}`}
                        mergedMap={mergedMap}
                    />
                ))}
            </div>
        </div>
    );
}
