import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { cursoMap, getPensumKey } from '../modules/data/cursos';
import CoursePool from './CoursePool';
import SemesterBlock from './SemesterBlock';
import VacationBlock from './VacationBlock';
import ToastNotification from './ToastNotification';
import { useToast } from '../hooks/useToast';

const INITIAL_SEMESTERS = 3;
const SIMULTANEOUS_BONUS = 5;


function getStorageKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_plan_${pk}` : 'pemtree_plan_default';
}

function getPromedioKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_promedio_${pk}` : 'pemtree_promedio_default';
}

function getSimultaneousKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_simultaneous_${pk}` : 'pemtree_simultaneous_default';
}

function getSuficienciasKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_suficiencias_${pk}` : 'pemtree_suficiencias_default';
}

function getSuficienciaFailsKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_suf_fails_${pk}` : 'pemtree_suf_fails_default';
}

function getMaxCredits(promedio, simultaneous) {
    let base;
    if (promedio <= 70) base = 32;
    else if (promedio <= 85) base = 37;
    else base = 42;
    return simultaneous ? base + SIMULTANEOUS_BONUS : base;
}

function buildBlocks(semesterCount) {
    const blocks = [];
    for (let i = 1; i <= semesterCount; i++) {
        blocks.push({ id: `sem-${i}`, type: 'semester', semester: i });
        if (i < semesterCount) {
            blocks.push({ id: `vac-${i}`, type: 'vacation', vacNum: i });
        }
    }
    return blocks;
}

function loadPlanForKey(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            const plan = {};
            for (const [key, val] of Object.entries(parsed)) {
                if (Array.isArray(val)) plan[key] = val;
            }
            return plan;
        }
    } catch { /* ignore */ }
    return {};
}

function loadArrayFromStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch { /* ignore */ }
    return [];
}

function getPlannedIds(plan) {
    const ids = new Set();
    for (const courseIds of Object.values(plan)) {
        for (const id of courseIds) ids.add(id);
    }
    return ids;
}

export default function Planner() {
    const { toasts, addToast, removeToast } = useToast();

    const [plan, setPlan] = useState(() => loadPlanForKey(getStorageKey()));
    const [semesterCount, setSemesterCount] = useState(() => {
        let max = INITIAL_SEMESTERS;
        for (const key of Object.keys(loadPlanForKey(getStorageKey()))) {
            const match = key.match(/^(?:sem|vac)-(\d+)$/);
            if (match) max = Math.max(max, parseInt(match[1], 10));
        }
        return Math.max(max, INITIAL_SEMESTERS);
    });
    const [promedio, setPromedio] = useState(() => {
        try {
            const raw = localStorage.getItem(getPromedioKey());
            const val = raw ? parseFloat(raw) : NaN;
            return isNaN(val) ? 0 : val;
        } catch { return 0; }
    });
    const [simultaneous, setSimultaneous] = useState(() => {
        try {
            return localStorage.getItem(getSimultaneousKey()) === 'true';
        } catch { return false; }
    });
    const [suficiencias, setSuficiencias] = useState(() => loadArrayFromStorage(getSuficienciasKey()));
    const [suficienciaFails] = useState(() => loadArrayFromStorage(getSuficienciaFailsKey()));

    const maxCredits = useMemo(() => getMaxCredits(promedio, simultaneous), [promedio, simultaneous]);
    const blocks = useMemo(() => buildBlocks(semesterCount), [semesterCount]);

    useEffect(() => {
        localStorage.setItem(getStorageKey(), JSON.stringify(plan));
    }, [plan]);

    useEffect(() => {
        localStorage.setItem(getPromedioKey(), String(promedio));
    }, [promedio]);

    useEffect(() => {
        localStorage.setItem(getSimultaneousKey(), String(simultaneous));
    }, [simultaneous]);

    useEffect(() => {
        localStorage.setItem(getSuficienciasKey(), JSON.stringify(suficiencias));
    }, [suficiencias]);

    useEffect(() => {
        localStorage.setItem(getSuficienciaFailsKey(), JSON.stringify(suficienciaFails));
    }, [suficienciaFails]);

    const plannedIds = useMemo(() => getPlannedIds(plan), [plan]);

    const currentCursos = useMemo(() => {
        return Array.from(cursoMap.values());
    }, []);

    const validatePrereqs = useCallback((courseId, targetBlockId) => {
        const course = cursoMap.get(courseId);
        if (!course) return true;

        const targetBlock = blocks.find(b => b.id === targetBlockId);
        if (!targetBlock) return true;

        const targetOrder = blocks.indexOf(targetBlock);

        const prereqIds = [];
        for (const pid of (course.prerequisitos || [])) {
            if (typeof pid === 'number') {
                prereqIds.push(pid);
            }
        }

        for (const prereqId of prereqIds) {
            let found = false;
            for (let i = 0; i < targetOrder; i++) {
                const blockCourses = plan[blocks[i].id] || [];
                if (blockCourses.includes(prereqId)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                const prereqCourse = cursoMap.get(prereqId);
                const code = prereqCourse ? prereqCourse.codigo : `#${prereqId}`;
                return { valid: false, message: `Falta prerequisito: ${code}` };
            }
        }

        return { valid: true };
    }, [blocks, plan]);

    const handleDrop = useCallback((courseId, targetBlockId, sourceBlockId) => {
        const isVac = targetBlockId.startsWith('vac');
        const targetCourses = plan[targetBlockId] || [];

        if (isVac && targetCourses.length >= 2) {
            addToast('Máximo 2 cursos por escuela de vacaciones');
            return;
        }

        if (!isVac) {
            const course = cursoMap.get(courseId);
            if (course) {
                const currentCredits = targetCourses
                    .filter(id => !suficiencias.includes(id))
                    .map(id => cursoMap.get(id))
                    .filter(Boolean)
                    .reduce((sum, c) => sum + (c.creditos || 0), 0);
                const newTotal = currentCredits + (course.creditos || 0);
                if (newTotal > maxCredits) {
                    addToast(`Límite de ${maxCredits} créditos excedido (${newTotal}/${maxCredits})`);
                    return;
                }
            }
        }

        for (const [blockId, ids] of Object.entries(plan)) {
            if (blockId !== sourceBlockId && ids.includes(courseId)) {
                addToast('Este curso ya está planificado');
                return;
            }
        }

        if (suficiencias.includes(courseId)) {
            addToast('Este curso ya fue aprobado por suficiencia');
            return;
        }

        const prereqCheck = validatePrereqs(courseId, targetBlockId);
        if (!prereqCheck.valid) {
            addToast(prereqCheck.message);
            return;
        }

        setPlan(prev => {
            const next = { ...prev };

            if (sourceBlockId && sourceBlockId !== targetBlockId) {
                next[sourceBlockId] = (next[sourceBlockId] || []).filter(id => id !== courseId);
            }

            if (!next[targetBlockId]) next[targetBlockId] = [];
            if (!next[targetBlockId].includes(courseId)) {
                next[targetBlockId] = [...next[targetBlockId], courseId];
            }

            return next;
        });
    }, [plan, addToast, validatePrereqs, maxCredits, suficiencias]);

    const handleRemoveChip = useCallback((courseId) => {
        setPlan(prev => {
            const next = {};
            for (const [blockId, ids] of Object.entries(prev)) {
                next[blockId] = ids.filter(id => id !== courseId);
            }
            return next;
        });
        setSuficiencias(prev => prev.filter(id => id !== courseId));
    }, []);

    const handleAddSemester = useCallback(() => {
        setSemesterCount(prev => prev + 1);
    }, []);

    const handlePromedioChange = useCallback((e) => {
        const val = parseFloat(e.target.value);
        setPromedio(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
    }, []);

    const handleSimultaneousChange = useCallback((e) => {
        setSimultaneous(e.target.checked);
    }, []);

    const handleToggleSuficiencia = useCallback((courseId, semesterNum) => {
        const blockId = `sem-${semesterNum}`;

        if (suficiencias.includes(courseId)) {
            setSuficiencias(prev => prev.filter(id => id !== courseId));
            return;
        }

        if (suficienciaFails.includes(courseId)) {
            addToast('Suficiencia reprobada — debes cursarlo normalmente (Art. 55)');
            return;
        }

        const semesterSuficiencias = (plan[blockId] || []).filter(id => suficiencias.includes(id));
        if (semesterSuficiencias.length >= 1) {
            addToast('Solo 1 suficiencia por semestre');
            return;
        }

        setSuficiencias(prev => [...prev, courseId]);
    }, [suficiencias, suficienciaFails, plan, addToast]);

    return (
        <div className="planner-container">
            <ToastNotification toasts={toasts} onRemove={removeToast} />
            <CoursePool cursos={currentCursos} plannedIds={plannedIds} />
            <div className="planner-main">
                <div className="planner-promedio-bar">
                    <label className="planner-promedio-label">Promedio:</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={promedio || ''}
                        onChange={handlePromedioChange}
                        placeholder="0-100"
                        className="planner-promedio-input"
                    />
                    <label className="planner-simultaneous-label">
                        <input
                            type="checkbox"
                            checked={simultaneous}
                            onChange={handleSimultaneousChange}
                            className="planner-simultaneous-checkbox"
                        />
                        Carreras simultáneas
                    </label>
                    <span className="planner-promedio-limit">Máx: {maxCredits} cr/sem</span>
                </div>
                <div className="planner-blocks-row">
                    {blocks.map(block => {
                        const courseIds = plan[block.id] || [];
                        const courseObjs = courseIds
                            .map(id => cursoMap.get(id))
                            .filter(Boolean);

                        if (block.type === 'semester') {
                            return (
                                <SemesterBlock
                                    key={block.id}
                                    semesterNum={block.semester}
                                    courses={courseObjs}
                                    maxCredits={maxCredits}
                                    suficiencias={suficiencias}
                                    onDrop={handleDrop}
                                    onRemoveChip={handleRemoveChip}
                                    onToggleSuficiencia={handleToggleSuficiencia}
                                />
                            );
                        }

                        return (
                            <VacationBlock
                                key={block.id}
                                vacNum={block.vacNum}
                                courses={courseObjs}
                                onDrop={handleDrop}
                                onRemoveChip={handleRemoveChip}
                            />
                        );
                    })}
                    <button className="planner-add-semester" onClick={handleAddSemester}>
                        <Plus size={18} />
                        <span>Semestre {semesterCount + 1}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
