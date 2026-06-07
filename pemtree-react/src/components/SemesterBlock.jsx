import CourseChip from './CourseChip';

export default function SemesterBlock({ semesterNum, courses, maxCredits, suficiencias, onDrop, onRemoveChip, onToggleSuficiencia, mergedMap }) {
    const regularCourses = courses.filter(c => !suficiencias.includes(c.id));
    const suficienciaCourses = courses.filter(c => suficiencias.includes(c.id));
    const totalCredits = regularCourses.reduce((sum, c) => sum + (c.creditos || 0), 0);
    const ratio = maxCredits > 0 ? totalCredits / maxCredits : 0;
    const isOver = totalCredits > maxCredits;
    const isNear = ratio >= 0.8 && !isOver;
    const hasSuficiencia = suficienciaCourses.length > 0;

    return (
        <div
            className={`planner-block planner-block-semester ${isOver ? 'planner-block-over-limit' : ''} ${isNear ? 'planner-block-near-limit' : ''}`}
            data-block-id={`sem-${semesterNum}`}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('planner-block-over'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('planner-block-over'); }}
            onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('planner-block-over');
                const courseId = parseInt(e.dataTransfer.getData('courseId'), 10);
                const sourceBlock = e.dataTransfer.getData('sourceBlock');
                if (!isNaN(courseId)) onDrop(courseId, `sem-${semesterNum}`, sourceBlock);
            }}
        >
            <div className="planner-block-header planner-block-header-semester">
                <span className="planner-block-label">Sem {semesterNum}</span>
                <span className={`planner-block-credits ${isOver ? 'planner-credits-over' : isNear ? 'planner-credits-near' : ''}`}>
                    {totalCredits}/{maxCredits} cr
                </span>
            </div>
            <div className="planner-credit-bar">
                <div
                    className={`planner-credit-bar-fill ${isOver ? 'planner-credit-bar-over' : isNear ? 'planner-credit-bar-near' : ''}`}
                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                />
            </div>
            <div className="planner-block-body">
                {courses.length === 0 && (
                    <div className="planner-block-empty">Arrastra aquí</div>
                )}
                {regularCourses.map(curso => (
                        <CourseChip
                            key={curso.id}
                            curso={curso}
                            onRemove={onRemoveChip}
                            onToggleSuficiencia={onToggleSuficiencia ? () => onToggleSuficiencia(curso.id, semesterNum) : undefined}
                            sourceBlock={`sem-${semesterNum}`}
                            mergedMap={mergedMap}
                        />
                    ))}
                {hasSuficiencia && (
                    <div className="planner-suficiencia-separator">
                        <span>Suficiencias</span>
                    </div>
                )}
                {suficienciaCourses.map(curso => (
                        <CourseChip
                            key={curso.id}
                            curso={curso}
                            onRemove={onRemoveChip}
                            isSuficiencia
                            onToggleSuficiencia={onToggleSuficiencia ? () => onToggleSuficiencia(curso.id, semesterNum) : undefined}
                            sourceBlock={`sem-${semesterNum}`}
                            mergedMap={mergedMap}
                        />
                    ))}
            </div>
        </div>
    );
}
