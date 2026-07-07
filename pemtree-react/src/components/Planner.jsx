import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, BookOpen, AlertTriangle, Copy, Pencil, Trash2 } from 'lucide-react';
import { cursoMap, getPensumKey, listAvailablePensums } from '../modules/data/cursos';
import { importarCursosDesdeJSON } from '../modules/data/importFromJSON';
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

function getLinesStorageKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_plan_lines_${pk}` : 'pemtree_plan_lines_default';
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

function getLastUpdatedKey() {
    const pk = getPensumKey();
    return pk ? `pemtree_plan_updated_${pk}` : 'pemtree_plan_updated_default';
}

function getWarningDismissedKey() {
    return 'pemtree_horario_warning_dismissed';
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

function inferSemesterCount(plan) {
    let max = INITIAL_SEMESTERS;
    for (const key of Object.keys(plan)) {
        const match = key.match(/^(?:sem|vac)-(\d+)$/);
        if (match) max = Math.max(max, parseInt(match[1], 10));
    }
    return max;
}

function loadLinesFromStorage() {
    try {
        const raw = localStorage.getItem(getLinesStorageKey());
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(l => ({
                    id: l.id,
                    name: l.name || 'Línea',
                    plan: (l.plan && typeof l.plan === 'object') ? l.plan : {},
                    semesterCount: typeof l.semesterCount === 'number' ? l.semesterCount : INITIAL_SEMESTERS,
                }));
            }
        }
    } catch { /* ignore */ }

    // Migrate from old single-plan format
    const oldPlan = loadPlanForKey(getStorageKey());
    if (oldPlan && Object.keys(oldPlan).length > 0) {
        return [{
            id: `line-${Date.now()}`,
            name: 'Línea 1',
            plan: oldPlan,
            semesterCount: inferSemesterCount(oldPlan),
        }];
    }

    return [{
        id: `line-${Date.now()}`,
        name: 'Línea 1',
        plan: {},
        semesterCount: INITIAL_SEMESTERS,
    }];
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

function sumLineCredits(line, resolveMap, suficiencias) {
    if (!line || !resolveMap) return 0;
    const sufSet = new Set(suficiencias);
    let total = 0;
    for (const ids of Object.values(line.plan || {})) {
        for (const id of ids) {
            if (sufSet.has(id)) continue;
            const c = resolveMap.get(id);
            if (c) total += parseInt(c.creditos, 10) || 0;
        }
    }
    return total;
}

export default function Planner({ currentPensum }) {
    const { toasts, addToast, removeToast } = useToast();
    const [showPool, setShowPool] = useState(false);
    const [showWarning, setShowWarning] = useState(() => {
        return localStorage.getItem(getWarningDismissedKey()) !== 'true';
    });

    const [lines, setLines] = useState(() => loadLinesFromStorage());
    const [renamingLineId, setRenamingLineId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

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
    const [ignorePrereqs, setIgnorePrereqs] = useState(false);
    const [suficiencias, setSuficiencias] = useState(() => loadArrayFromStorage(getSuficienciasKey()));
    const [suficienciaFails] = useState(() => loadArrayFromStorage(getSuficienciaFailsKey()));

    // second pensum (carrera simultánea)
    const [availablePensums, setAvailablePensums] = useState([]);
    const [secondPensum, setSecondPensum] = useState(null);
    const [secondCursoMap, setSecondCursoMap] = useState(new Map());
    const [secondLoading, setSecondLoading] = useState(false);

    useEffect(() => {
        if (simultaneous && availablePensums.length === 0) {
            listAvailablePensums().then(setAvailablePensums);
        }
    }, [simultaneous, availablePensums.length]);

    function handleSimultaneousChange(e) {
        setSimultaneous(e.target.checked);
        if (!e.target.checked) {
            setSecondPensum(null);
            setSecondCursoMap(new Map());
        }
    }

    async function loadSecondPensum(file) {
        setSecondLoading(true);
        try {
            const res = await fetch(file);
            if (!res.ok) throw new Error('No se pudo cargar el pensum');
            const json = await res.json();
            const cursos = importarCursosDesdeJSON(json);
            const map = new Map();
            cursos.forEach(c => map.set(c.id, c));
            setSecondCursoMap(map);
            setSecondPensum(file);
        } catch (e) {
            console.error('Error cargando segundo pensum:', e);
            setSecondCursoMap(new Map());
            setSecondPensum(null);
        }
        setSecondLoading(false);
    }

    const maxCredits = useMemo(() => getMaxCredits(promedio, simultaneous), [promedio, simultaneous]);

    useEffect(() => {
        localStorage.setItem(getLinesStorageKey(), JSON.stringify(lines));
        localStorage.setItem(getLastUpdatedKey(), new Date().toISOString());
    }, [lines]);

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

    const currentCursos = useMemo(() => {
        const primary = Array.from(cursoMap.values());
        if (!simultaneous || secondCursoMap.size === 0) return primary;
        const seen = new Set(primary.map(c => c.codigo));
        const extra = [];
        for (const c of secondCursoMap.values()) {
            if (!seen.has(c.codigo)) {
                seen.add(c.codigo);
                extra.push(c);
            }
        }
        return [...primary, ...extra];
    }, [simultaneous, secondCursoMap]);

    const mergedCursoMap = useMemo(() => {
        const map = new Map();
        for (const c of cursoMap.values()) map.set(c.id, c);
        for (const c of secondCursoMap.values()) {
            if (!map.has(c.id)) map.set(c.id, c);
        }
        return map;
    }, [secondCursoMap]);

    const lineCredits = useCallback((line) => {
        const resolveMap = simultaneous ? mergedCursoMap : cursoMap;
        return sumLineCredits(line, resolveMap, suficiencias);
    }, [simultaneous, mergedCursoMap, suficiencias]);

    const updateLine = useCallback((lineId, updater) => {
        setLines(prev => {
            const idx = prev.findIndex(l => l.id === lineId);
            if (idx < 0) return prev;
            const current = prev[idx];
            const updated = typeof updater === 'function' ? updater(current) : updater;
            const next = prev.slice();
            next[idx] = updated;
            return next;
        });
    }, []);

    const handleAddLine = useCallback(() => {
        const newId = `line-${Date.now()}`;
        const newLine = {
            id: newId,
            name: `Línea ${lines.length + 1}`,
            plan: {},
            semesterCount: INITIAL_SEMESTERS,
        };
        setLines(prev => [...prev, newLine]);
    }, [lines.length]);

    const handleDuplicateLine = useCallback((lineId) => {
        setLines(prev => {
            const idx = prev.findIndex(l => l.id === lineId);
            if (idx < 0) return prev;
            const source = prev[idx];
            const newId = `line-${Date.now()}`;
            const copy = {
                id: newId,
                name: `${source.name} (copia)`,
                plan: JSON.parse(JSON.stringify(source.plan || {})),
                semesterCount: source.semesterCount || INITIAL_SEMESTERS,
            };
            const next = prev.slice();
            next.splice(idx + 1, 0, copy);
            return next;
        });
    }, []);

    const handleDeleteLine = useCallback((lineId) => {
        setLines(prev => {
            if (prev.length <= 1) {
                addToast('Debe existir al menos una línea de planificación');
                return prev;
            }
            return prev.filter(l => l.id !== lineId);
        });
    }, [addToast]);

    const handleStartRename = useCallback((line) => {
        setRenamingLineId(line.id);
        setRenameValue(line.name);
    }, []);

    const handleCommitRename = useCallback(() => {
        if (!renamingLineId) return;
        const trimmed = renameValue.trim();
        if (trimmed) {
            setLines(prev => prev.map(l => l.id === renamingLineId ? { ...l, name: trimmed } : l));
        }
        setRenamingLineId(null);
        setRenameValue('');
    }, [renamingLineId, renameValue]);

    const makeHandleDrop = useCallback((lineId) => (courseId, targetBlockId, sourceBlockId) => {
        const line = lines.find(l => l.id === lineId);
        if (!line) return;
        const linePlan = line.plan || {};
        const lineSemesterCount = line.semesterCount || INITIAL_SEMESTERS;
        const lineBlocks = buildBlocks(lineSemesterCount);

        const isVac = targetBlockId.startsWith('vac');
        const targetCourses = linePlan[targetBlockId] || [];

        if (isVac && targetCourses.length >= 2) {
            addToast('Máximo 2 cursos por escuela de vacaciones');
            return;
        }

        if (!isVac) {
            const course = mergedCursoMap.get(courseId);
            if (course) {
                const currentCredits = targetCourses
                    .filter(id => !suficiencias.includes(id))
                    .map(id => mergedCursoMap.get(id))
                    .filter(Boolean)
                    .reduce((sum, c) => sum + (c.creditos || 0), 0);
                const newTotal = currentCredits + (course.creditos || 0);
                if (newTotal > maxCredits) {
                    addToast(`Límite de ${maxCredits} créditos excedido (${newTotal}/${maxCredits})`);
                    return;
                }
            }
        }

        for (const [blockId, ids] of Object.entries(linePlan)) {
            if (blockId !== sourceBlockId && ids.includes(courseId)) {
                addToast('Este curso ya está planificado en esta línea');
                return;
            }
        }

        if (suficiencias.includes(courseId)) {
            addToast('Este curso ya fue aprobado por suficiencia');
            return;
        }

        if (!ignorePrereqs) {
            const course = mergedCursoMap.get(courseId);
            const targetBlock = lineBlocks.find(b => b.id === targetBlockId);
            if (course && targetBlock) {
                const targetOrder = lineBlocks.indexOf(targetBlock);
                for (const prereqId of (course.prerequisitos || [])) {
                    if (typeof prereqId !== 'number') continue;
                    let found = false;
                    for (let i = 0; i < targetOrder; i++) {
                        if ((linePlan[lineBlocks[i].id] || []).includes(prereqId)) { found = true; break; }
                    }
                    if (!found) {
                        const pc = mergedCursoMap.get(prereqId);
                        addToast(`Falta prerequisito: ${pc ? pc.codigo : '#' + prereqId}`);
                        return;
                    }
                }
            }
        }

        updateLine(lineId, l => ({
            ...l,
            plan: {
                ...l.plan,
                ...(sourceBlockId && sourceBlockId !== targetBlockId
                    ? { [sourceBlockId]: (l.plan[sourceBlockId] || []).filter(id => id !== courseId) }
                    : {}),
                [targetBlockId]: [
                    ...((l.plan[targetBlockId] || []).filter(id => id !== courseId)),
                    courseId,
                ],
            },
        }));
    }, [lines, addToast, maxCredits, suficiencias, ignorePrereqs, mergedCursoMap, updateLine]);

    const makeHandleRemoveChip = useCallback((lineId) => (courseId) => {
        updateLine(lineId, l => {
            const nextPlan = {};
            for (const [blockId, ids] of Object.entries(l.plan)) {
                nextPlan[blockId] = ids.filter(id => id !== courseId);
            }
            return { ...l, plan: nextPlan };
        });
        setSuficiencias(prev => prev.filter(id => id !== courseId));
    }, [updateLine]);

    const makeHandleAddSemester = useCallback((lineId) => () => {
        updateLine(lineId, l => ({ ...l, semesterCount: (l.semesterCount || INITIAL_SEMESTERS) + 1 }));
    }, [updateLine]);

    const makeHandleRemoveSemester = useCallback((lineId) => () => {
        updateLine(lineId, l => {
            const current = l.semesterCount || INITIAL_SEMESTERS;
            if (current <= INITIAL_SEMESTERS) return l;
            const nextCount = current - 1;
            const nextPlan = {};
            for (const [blockId, ids] of Object.entries(l.plan)) {
                const match = blockId.match(/^(?:sem|vac)-(\d+)$/);
                if (match && parseInt(match[1], 10) > nextCount) continue;
                nextPlan[blockId] = ids;
            }
            return { ...l, semesterCount: nextCount, plan: nextPlan };
        });
    }, [updateLine]);

    const makeHandleToggleSuficiencia = useCallback((lineId) => (courseId, semesterNum) => {
        const line = lines.find(l => l.id === lineId);
        if (!line) return;
        const blockId = `sem-${semesterNum}`;

        if (suficiencias.includes(courseId)) {
            setSuficiencias(prev => prev.filter(id => id !== courseId));
            return;
        }

        if (suficienciaFails.includes(courseId)) {
            addToast('Suficiencia reprobada — debes cursarlo normalmente (Art. 55)');
            return;
        }

        const semesterSuficiencias = (line.plan[blockId] || []).filter(id => suficiencias.includes(id));
        if (semesterSuficiencias.length >= 1) {
            addToast('Solo 1 suficiencia por semestre');
            return;
        }

        setSuficiencias(prev => [...prev, courseId]);
    }, [lines, suficiencias, suficienciaFails, addToast]);

    const handlePromedioChange = useCallback((e) => {
        const val = parseFloat(e.target.value);
        setPromedio(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
    }, []);

    /* Touch drag and drop for mobile */
    const handleDropRef = useRef(null);
    useEffect(() => {
        handleDropRef.current = (lineId, courseId, targetBlockId, sourceBlockId) => {
            const handler = makeHandleDrop(lineId);
            handler(courseId, targetBlockId, sourceBlockId);
        };
    }, [makeHandleDrop]);

    function findBlockEl(el) {
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains('planner-block')) return el;
            el = el.parentElement;
        }
        return null;
    }

    function findLineEl(el) {
        while (el && el !== document.body) {
            if (el.dataset && el.dataset.lineId) return el;
            el = el.parentElement;
        }
        return null;
    }

    useEffect(() => {
        let ghostEl = null;

        function createGhost(data) {
            const g = data.ghost;
            const el = document.createElement('div');
            el.className = 'planner-chip-ghost';
            el.innerHTML = `
                <div class="planner-chip-ghost-left">
                    <div class="planner-chip-ghost-code" style="background:${g.primary}">${g.codigo}</div>
                    <div class="planner-chip-ghost-credits" style="background:${g.secondary}">${g.creditos} cr</div>
                </div>
                <div class="planner-chip-ghost-center" style="background:${g.center}">
                    <span class="planner-chip-ghost-name">${g.nombre}</span>
                </div>
                <div class="planner-chip-ghost-right" style="background:${g.primary}">—</div>
            `;
            el.style.position = 'fixed';
            el.style.zIndex = '9999';
            el.style.pointerEvents = 'none';
            el.style.transform = 'scale(1.05) rotate(2deg)';
            el.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))';
            el.style.opacity = '0.92';
            el.style.transition = 'transform 0.08s';
            document.body.appendChild(el);
            return el;
        }

        function positionGhost(el, x, y) {
            const w = el.offsetWidth;
            el.style.left = (x - w / 2) + 'px';
            el.style.top = (y - 70) + 'px';
        }

        function removeGhost() {
            if (ghostEl) {
                ghostEl.remove();
                ghostEl = null;
            }
        }

        function onTouchMove(e) {
            if (!window.__touchDrag) return;
            e.preventDefault();
            if (!ghostEl) ghostEl = createGhost(window.__touchDrag);
            const touch = e.touches[0];
            positionGhost(ghostEl, touch.clientX, touch.clientY);
            const under = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!under) return;
            const blockEl = findBlockEl(under);
            document.querySelectorAll('.planner-block.planner-block-over').forEach(el => {
                if (el !== blockEl) el.classList.remove('planner-block-over');
            });
            if (blockEl) blockEl.classList.add('planner-block-over');
        }

        function onTouchEnd(e) {
            if (!window.__touchDrag) return;
            const touch = e.changedTouches[0];
            const under = document.elementFromPoint(touch.clientX, touch.clientY);
            if (under) {
                const blockEl = findBlockEl(under);
                if (blockEl) {
                    const blockId = blockEl.dataset.blockId;
                    const lineEl = findLineEl(blockEl);
                    const lineId = lineEl ? lineEl.dataset.lineId : null;
                    const { courseId, sourceBlock } = window.__touchDrag;
                    if (blockId && lineId) {
                        handleDropRef.current(lineId, courseId, blockId, sourceBlock);
                    }
                }
            }
            document.querySelectorAll('.planner-block.planner-block-over').forEach(el => {
                el.classList.remove('planner-block-over');
            });
            window.__touchDrag = null;
            removeGhost();
        }

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
        return () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
            removeGhost();
        };
    }, []);

    function dismissWarning() {
        setShowWarning(false);
        localStorage.setItem(getWarningDismissedKey(), 'true');
    }

    return (
        <div className="planner-container">
            <ToastNotification toasts={toasts} onRemove={removeToast} />

            {showWarning && (
                <div className="planner-warning-banner">
                    <AlertTriangle size={18} className="planner-warning-icon" />
                    <div className="planner-warning-text">
                        <strong>Este sitio no es oficial de FIUSAC.</strong>
                        <span> Los horarios y planes de estudio reflejados aquí podrían no estar actualizados con respecto al portal oficial. Verifica siempre en <a href="https://fiusac.ingenieria.usac.edu.gt" target="_blank" rel="noopener noreferrer">fiusac.ingenieria.usac.edu.gt</a>.</span>
                    </div>
                    <button className="planner-warning-close" onClick={dismissWarning} title="Cerrar">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Pool sidebar / bottom sheet */}
            <div className="planner-body">
            <div className={`planner-pool-wrapper ${showPool ? 'planner-pool-open' : ''}`}>
                <div className="planner-pool-mobile-header">
                    <span className="planner-pool-mobile-title">Cursos disponibles</span>
                    <button className="planner-pool-close" onClick={() => setShowPool(false)}>
                        <X size={18} />
                    </button>
                </div>
                <CoursePool cursos={currentCursos} plannedIds={new Set()} mergedMap={simultaneous ? mergedCursoMap : null} />
            </div>

            <div className="planner-content">
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
                    <label className="planner-simultaneous-label">
                        <input
                            type="checkbox"
                            checked={ignorePrereqs}
                            onChange={e => setIgnorePrereqs(e.target.checked)}
                            className="planner-simultaneous-checkbox"
                        />
                        Sin prerequisitos
                    </label>
                    {simultaneous && availablePensums.length > 0 && (
                        <select
                            className="planner-promedio-input"
                            value={secondPensum || ''}
                            onChange={e => e.target.value ? loadSecondPensum(e.target.value) : setSecondPensum(null)}
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', width: 'auto', minWidth: '140px' }}
                        >
                            <option value="">2do pensum...</option>
                            {availablePensums.filter(p => p.file !== currentPensum).map(p => (
                                <option key={p.file} value={p.file}>{p.name}</option>
                            ))}
                        </select>
                    )}
                    {simultaneous && secondLoading && <span className="planner-promedio-limit">Cargando...</span>}
                    {simultaneous && secondPensum && !secondLoading && (
                        <span className="planner-promedio-limit" style={{ color: '#059669' }}>
                            +{secondCursoMap.size} cursos
                        </span>
                    )}
                    <span className="planner-promedio-limit">Máx: {maxCredits} cr/sem</span>
                    <button
                        className="planner-pool-toggle-bar"
                        onClick={() => setShowPool(v => !v)}
                        title={showPool ? 'Ocultar cursos' : 'Ver cursos'}
                    >
                        <BookOpen size={16} />
                        <span className="planner-pool-toggle-label">Cursos</span>
                    </button>
                </div>
                <div className="planner-main">
                    {lines.map(line => {
                        const credits = lineCredits(line);
                        const lineSemesterCount = line.semesterCount || INITIAL_SEMESTERS;
                        const lineBlocks = buildBlocks(lineSemesterCount);
                        const isRenaming = renamingLineId === line.id;
                        return (
                            <div key={line.id} className="planner-line-section" data-line-id={line.id}>
                                <div className="planner-line-header">
                                    <div className="planner-line-header-left">
                                        {isRenaming ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onBlur={handleCommitRename}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleCommitRename();
                                                    if (e.key === 'Escape') { setRenamingLineId(null); setRenameValue(''); }
                                                }}
                                                className="planner-line-rename-input"
                                            />
                                        ) : (
                                            <h3 className="planner-line-header-name" title={line.name}>{line.name}</h3>
                                        )}
                                        <span
                                            className="planner-line-header-credits"
                                            title="Créditos totales planificados en esta línea"
                                        >
                                            <strong>{credits}</strong> cr
                                        </span>
                                    </div>
                                    <div className="planner-line-header-actions">
                                        <button
                                            type="button"
                                            className="planner-line-action-btn"
                                            onClick={() => handleStartRename(line)}
                                            title="Renombrar línea"
                                            aria-label="Renombrar línea"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className="planner-line-action-btn"
                                            onClick={() => handleDuplicateLine(line.id)}
                                            title="Duplicar línea"
                                            aria-label="Duplicar línea"
                                        >
                                            <Copy size={13} />
                                        </button>
                                        {lines.length > 1 && (
                                            <button
                                                type="button"
                                                className="planner-line-action-btn planner-line-action-btn-danger"
                                                onClick={() => {
                                                    if (confirm(`¿Eliminar la línea "${line.name}"? Esta acción no se puede deshacer.`)) {
                                                        handleDeleteLine(line.id);
                                                    }
                                                }}
                                                title="Eliminar línea"
                                                aria-label="Eliminar línea"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="planner-blocks-row">
                                    {lineBlocks.map((block, idx) => {
                                        const courseIds = line.plan[block.id] || [];
                                        const resolveMap = simultaneous ? mergedCursoMap : cursoMap;
                                        const courseObjs = courseIds
                                            .map(id => resolveMap.get(id))
                                            .filter(Boolean);

                                        let el;
                                        if (block.type === 'semester') {
                                            el = (
                                                <SemesterBlock
                                                    key={block.id}
                                                    semesterNum={block.semester}
                                                    courses={courseObjs}
                                                    maxCredits={maxCredits}
                                                    suficiencias={suficiencias}
                                                    onDrop={makeHandleDrop(line.id)}
                                                    onRemoveChip={makeHandleRemoveChip(line.id)}
                                                    onToggleSuficiencia={makeHandleToggleSuficiencia(line.id)}
                                                    mergedMap={simultaneous ? mergedCursoMap : null}
                                                />
                                            );
                                        } else {
                                            el = (
                                                <VacationBlock
                                                    key={block.id}
                                                    vacNum={block.vacNum}
                                                    courses={courseObjs}
                                                    onDrop={makeHandleDrop(line.id)}
                                                    onRemoveChip={makeHandleRemoveChip(line.id)}
                                                    mergedMap={simultaneous ? mergedCursoMap : null}
                                                />
                                            );
                                        }

                                        const isYearEnd = block.type === 'vacation';
                                        const isLastBlock = idx === lineBlocks.length - 1;

                                        if (isYearEnd && !isLastBlock) {
                                            return (
                                                <div key={`year-group-${line.id}-${block.id}`} className="planner-year-group">
                                                    {el}
                                                    <div className="planner-year-separator" title={`Fin del año ${block.vacNum}`} />
                                                </div>
                                            );
                                        }

                                        return el;
                                    })}
                                    <button
                                        className="planner-add-semester"
                                        onClick={makeHandleAddSemester(line.id)}
                                    >
                                        <Plus size={18} />
                                        <span>Semestre {lineSemesterCount + 1}</span>
                                    </button>
                                    {lineSemesterCount > INITIAL_SEMESTERS && (
                                        <button
                                            className="planner-add-semester planner-remove-semester"
                                            onClick={makeHandleRemoveSemester(line.id)}
                                            title="Quitar el último semestre"
                                        >
                                            <X size={18} />
                                            <span>Quitar semestre</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        className="planner-add-line-bottom"
                        onClick={handleAddLine}
                        title="Crear nueva línea de planificación"
                    >
                        <Plus size={18} />
                        <span>Nueva línea de planificación</span>
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
}
