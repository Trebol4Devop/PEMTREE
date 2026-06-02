import CourseChip from './CourseChip';

export default function VacationBlock({ vacNum, courses, onDrop, onRemoveChip }) {
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
                <span className="planner-block-capacity">{courses.length}/2</span>
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
                    />
                ))}
            </div>
        </div>
    );
}
