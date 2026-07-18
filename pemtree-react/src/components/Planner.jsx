import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, BookOpen, Copy, Pencil, Trash2, Share2, Upload, Download, Check, MessageCircle, Mail } from 'lucide-react';
import { cursoMap, getPensumKey, listAvailablePensums } from '../modules/data/cursos';
import { importarCursosDesdeJSON } from '../modules/data/importFromJSON';
import CoursePool from './CoursePool';
import SemesterBlock from './SemesterBlock';
import VacationBlock from './VacationBlock';
import ToastNotification from './ToastNotification';
import { useToast } from '../hooks/useToast';
import { WarningBanner, Modal, Button } from './ui';

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

function buildBlocks(semesterCount, hiddenVacations = []) {
    const blocks = [];
    for (let i = 1; i <= semesterCount; i++) {
        blocks.push({ id: `sem-${i}`, type: 'semester', semester: i });
        if (i < semesterCount) {
            if (!hiddenVacations.includes(i)) {
                blocks.push({ id: `vac-${i}`, type: 'vacation', vacNum: i });
            } else {
                blocks.push({ id: `vac-${i}`, type: 'vacation_hidden', vacNum: i });
            }
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
                    hiddenVacations: Array.isArray(l.hiddenVacations) ? l.hiddenVacations : [],
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
            hiddenVacations: [],
        }];
    }

    return [{
        id: `line-${Date.now()}`,
        name: 'Línea 1',
        plan: {},
        semesterCount: INITIAL_SEMESTERS,
        hiddenVacations: [],
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

function encodePlanPayload(payload) {
    try {
        const str = JSON.stringify(payload);
        return btoa(unescape(encodeURIComponent(str)));
    } catch {
        return '';
    }
}

function decodePlanPayload(code) {
    try {
        const str = decodeURIComponent(escape(atob(code)));
        return JSON.parse(str);
    } catch {
        return null;
    }
}

export default function Planner({ currentPensum }) {
    const { toasts, addToast, removeToast } = useToast();
    const [showPool, setShowPool] = useState(false);
    const [showWarning, setShowWarning] = useState(() => {
        return localStorage.getItem(getWarningDismissedKey()) !== 'true';
    });

    const [lines, setLines] = useState(() => loadLinesFromStorage());
    const [selectedLineId, setSelectedLineId] = useState(() => lines[0]?.id ?? null);
    const [renamingLineId, setRenamingLineId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, lineId: null, lineName: '' });

    // Estados para compartir e importar planificación
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharedPlanData, setSharedPlanData] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        let code = params.get('sharePlan') || params.get('plan');
        if (!code && window.location.hash) {
            const hashParts = window.location.hash.split('?');
            if (hashParts.length > 1) {
                const hashParams = new URLSearchParams(hashParts[1]);
                code = hashParams.get('sharePlan') || hashParams.get('plan');
            } else if (window.location.hash.includes('sharePlan=')) {
                code = window.location.hash.split('sharePlan=')[1]?.split('&')[0];
            } else if (window.location.hash.includes('plan=')) {
                code = window.location.hash.split('plan=')[1]?.split('&')[0];
            }
        }
        if (code) {
            const decoded = decodePlanPayload(code);
            if (decoded && (decoded.lines || decoded.plan)) {
                return decoded;
            }
        }
        return null;
    });
    const [showImportModal, setShowImportModal] = useState(() => sharedPlanData !== null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [pastedCodeInput, setPastedCodeInput] = useState('');

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

            // Cargar color del segundo pensum
            const basename = file.split('/').pop().replace('.json', '');
            const base = basename.replace(/_\d{2,4}$/, '');
            const colorRes = await fetch(`/pensum_color/${base}_color.json`);
            let colorData = null;
            if (colorRes.ok) {
                const cJson = await colorRes.json();
                colorData = Array.isArray(cJson) ? cJson[0] : cJson;
            }

            const cursos = importarCursosDesdeJSON(json);
            const map = new Map();
            cursos.forEach(c => {
                c.id += 10000;
                if (c.prerequisitos) {
                    c.prerequisitos = c.prerequisitos.map(p => typeof p === 'number' ? p + 10000 : p);
                }
                c.isSimultaneous = true;
                if (colorData) {
                    c.colors = c.colors || {};
                    c.colors.leftTop = { fill: colorData.color1 };
                    c.colors.leftBottom = { fill: colorData.color2 };
                }
                map.set(c.id, c);
            });
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

    const currentShareLink = useMemo(() => {
        const pk = getPensumKey() || currentPensum || 'ciencias_y_sistemas_22.json';
        const payload = {
            v: 2,
            pk,
            lines: lines.map(l => ({
                id: l.id,
                name: l.name,
                plan: l.plan || {},
                semesterCount: l.semesterCount || INITIAL_SEMESTERS,
                hiddenVacations: l.hiddenVacations || []
            })),
            prom: promedio || 0,
            sim: simultaneous || false,
            spk: secondPensum || null,
            suf: suficiencias || []
        };
        const encoded = encodePlanPayload(payload);
        return `${window.location.origin}${window.location.pathname}?view=planner&sharePlan=${encodeURIComponent(encoded)}`;
    }, [lines, promedio, simultaneous, secondPensum, suficiencias, currentPensum]);

    const handleConfirmImport = useCallback((replaceExisting = true) => {
        if (!sharedPlanData) return;
        const targetPk = sharedPlanData.pk || getPensumKey() || currentPensum || 'ciencias_y_sistemas_22.json';

        let newLinesToSet = [];
        if (sharedPlanData.lines && Array.isArray(sharedPlanData.lines) && sharedPlanData.lines.length > 0) {
            if (replaceExisting) {
                newLinesToSet = sharedPlanData.lines;
            } else {
                const appended = sharedPlanData.lines.map(l => ({
                    ...l,
                    id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    name: `${l.name} (Importada)`
                }));
                newLinesToSet = [...lines, ...appended];
            }
        } else if (sharedPlanData.plan) {
            const singleLine = {
                id: `line-${Date.now()}`,
                name: 'Plan Importado',
                plan: sharedPlanData.plan,
                semesterCount: inferSemesterCount(sharedPlanData.plan),
                hiddenVacations: []
            };
            newLinesToSet = replaceExisting ? [singleLine] : [...lines, singleLine];
        }

        if (newLinesToSet.length > 0) {
            setLines(newLinesToSet);
            setSelectedLineId(newLinesToSet[0].id);
            localStorage.setItem(`pemtree_plan_lines_${targetPk}`, JSON.stringify(newLinesToSet));
            localStorage.setItem(`pemtree_plan_updated_${targetPk}`, new Date().toISOString());
        }

        if (replaceExisting) {
            if (sharedPlanData.prom !== undefined) {
                setPromedio(sharedPlanData.prom);
                localStorage.setItem(`pemtree_promedio_${targetPk}`, String(sharedPlanData.prom));
            }
            if (sharedPlanData.sim !== undefined) {
                setSimultaneous(sharedPlanData.sim);
                localStorage.setItem(`pemtree_simultaneous_${targetPk}`, String(sharedPlanData.sim));
            }
            if (sharedPlanData.spk) {
                setSecondPensum(sharedPlanData.spk);
            }
            if (sharedPlanData.suf) {
                setSuficiencias(sharedPlanData.suf);
                localStorage.setItem(`pemtree_suficiencias_${targetPk}`, JSON.stringify(sharedPlanData.suf));
            }
        }

        if (targetPk !== currentPensum) {
            localStorage.setItem('pemtree_pensum_actual', targetPk);
            addToast('¡Planificación importada! Cargando la carrera correspondiente...');
            setTimeout(() => {
                window.location.href = `${window.location.origin}${window.location.pathname}?view=planner`;
            }, 800);
            return;
        }

        const cleanUrl = `${window.location.origin}${window.location.pathname}?view=planner`;
        window.history.replaceState({}, document.title, cleanUrl);

        setSharedPlanData(null);
        setShowImportModal(false);
        addToast('¡Planificación importada y lista en tu pantalla!');
    }, [sharedPlanData, currentPensum, lines, addToast]);

    const handleDownloadJSON = useCallback(() => {
        const pk = getPensumKey() || currentPensum || 'ciencias_y_sistemas_22.json';
        const payload = {
            v: 2,
            pk,
            lines: lines.map(l => ({
                id: l.id,
                name: l.name,
                plan: l.plan || {},
                semesterCount: l.semesterCount || INITIAL_SEMESTERS,
                hiddenVacations: l.hiddenVacations || []
            })),
            prom: promedio || 0,
            sim: simultaneous || false,
            spk: secondPensum || null,
            suf: suficiencias || []
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planificacion_pemtree_${pk.replace('.json', '')}.json`;
        a.click();
        URL.createObjectURL(url);
        addToast('¡Archivo JSON descargado exitosamente!');
    }, [lines, promedio, simultaneous, secondPensum, suficiencias, currentPensum, addToast]);

    const currentCursos = useMemo(() => {
        const primary = Array.from(cursoMap.values());
        if (!simultaneous || secondCursoMap.size === 0) return primary;
        // Mostrar cursos de ambas carreras (cursos comunes aparecerán con IDs diferentes)
        const extra = Array.from(secondCursoMap.values());
        return [...primary, ...extra];
    }, [simultaneous, secondCursoMap]);

    const selectedLine = useMemo(
        () => lines.find(l => l.id === selectedLineId) || lines[0] || null,
        [lines, selectedLineId]
    );

    const selectedLinePlannedIds = useMemo(() => {
        return getPlannedIds(selectedLine?.plan || {});
    }, [selectedLine]);

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
            hiddenVacations: [],
        };
        setLines(prev => [...prev, newLine]);
        setSelectedLineId(newId);
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
                hiddenVacations: [...(source.hiddenVacations || [])],
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
        if (lineId === selectedLineId) {
            const remaining = lines.filter(l => l.id !== lineId);
            setSelectedLineId(remaining[0]?.id ?? null);
        }
    }, [addToast, selectedLineId, lines]);

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
        const lineBlocks = buildBlocks(lineSemesterCount, line.hiddenVacations || []);

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

    const makeHandleToggleVacation = useCallback((lineId) => (vacNum) => {
        updateLine(lineId, l => {
            const hidden = l.hiddenVacations || [];
            if (hidden.includes(vacNum)) {
                // Show vacation
                return { ...l, hiddenVacations: hidden.filter(n => n !== vacNum) };
            } else {
                // Hide vacation
                const nextPlan = { ...l.plan };
                delete nextPlan[`vac-${vacNum}`]; // Remove courses from that block just in case
                return { ...l, plan: nextPlan, hiddenVacations: [...hidden, vacNum] };
            }
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
                <WarningBanner
                    onClose={dismissWarning}
                    className="mb-3"
                >
                    <strong>Este sitio no es oficial de la Facultad de Ingeniería.</strong>
                    <span> Los horarios y planes de estudio reflejados aquí podrían no estar actualizados con respecto al portal oficial. Verifica siempre en <a href="https://portal.ingenieria.usac.edu.gt" target="_blank" rel="noopener noreferrer">portal.ingenieria.usac.edu.gt</a>.</span>
                </WarningBanner>
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
                <CoursePool cursos={currentCursos} plannedIds={selectedLinePlannedIds} lineName={selectedLine?.name} mergedMap={simultaneous ? mergedCursoMap : null} />
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
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border shadow-sm bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] border-[#0052CC]/30 dark:border-[#4C9AFF]/30 hover:bg-[#DEEBFF] dark:hover:bg-[#0C295E]"
                        onClick={() => setShowShareModal(true)}
                        title="Compartir o exportar tu planificación"
                    >
                        <Share2 size={15} />
                        <span className="hidden sm:inline">Compartir / Exportar</span>
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border shadow-sm bg-white dark:bg-[#1C2636] text-[#059669] dark:text-[#34D399] border-[#059669]/30 dark:border-[#34D399]/30 hover:bg-[#D1FAE5] dark:hover:bg-[#064E3B]"
                        onClick={() => { setSharedPlanData(null); setShowImportModal(true); }}
                        title="Importar planificación"
                    >
                        <Upload size={15} />
                        <span className="hidden sm:inline">Importar</span>
                    </button>
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
                        const lineBlocks = buildBlocks(lineSemesterCount, line.hiddenVacations || []);
                        const isRenaming = renamingLineId === line.id;
                        const isSelected = line.id === (selectedLine?.id ?? null);
                        return (
                            <div
                                key={line.id}
                                className={`planner-line-section ${isSelected ? 'planner-line-section-active' : ''}`}
                                data-line-id={line.id}
                                onClick={(e) => {
                                    if (e.target.closest('button, input, .planner-block')) return;
                                    setSelectedLineId(line.id);
                                }}
                            >
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
                                                    setConfirmDeleteModal({ isOpen: true, lineId: line.id, lineName: line.name });
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
                                        } else if (block.type === 'vacation') {
                                            el = (
                                                <VacationBlock
                                                    key={block.id}
                                                    vacNum={block.vacNum}
                                                    courses={courseObjs}
                                                    onDrop={makeHandleDrop(line.id)}
                                                    onRemoveChip={makeHandleRemoveChip(line.id)}
                                                    mergedMap={simultaneous ? mergedCursoMap : null}
                                                    onToggle={makeHandleToggleVacation(line.id)}
                                                />
                                            );
                                        } else if (block.type === 'vacation_hidden') {
                                            el = (
                                                <div key={block.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem' }}>
                                                    <button 
                                                        className="planner-add-semester"
                                                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', height: 'fit-content' }}
                                                        onClick={() => makeHandleToggleVacation(line.id)(block.vacNum)}
                                                        title={`Agregar Vacaciones ${block.vacNum}`}
                                                    >
                                                        <Plus size={14} /> Vac
                                                    </button>
                                                </div>
                                            );
                                        }

                                        const isYearEnd = block.type === 'vacation' || block.type === 'vacation_hidden';
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

            {/* Confirm Delete Line Modal */}
            <Modal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, lineId: null, lineName: '' })}
                title="¿Eliminar línea de planificación?"
            >
                <p className="text-sm text-[#172B4D] dark:text-[#CBD5E1] mb-6 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar la línea <strong>"{confirmDeleteModal.lineName}"</strong>? Todos los cursos planificados en esta ruta se perderán permanentemente.
                </p>
                <div className="flex justify-end gap-2.5">
                    <Button 
                        variant="secondary" 
                        onClick={() => setConfirmDeleteModal({ isOpen: false, lineId: null, lineName: '' })}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={() => {
                            if (confirmDeleteModal.lineId) handleDeleteLine(confirmDeleteModal.lineId);
                            setConfirmDeleteModal({ isOpen: false, lineId: null, lineName: '' });
                        }}
                    >
                        Sí, eliminar
                    </Button>
                </div>
            </Modal>

            {/* Modal de Compartir y Exportar Planificación */}
            <Modal
                isOpen={showShareModal}
                onClose={() => { setShowShareModal(false); setLinkCopied(false); }}
                title="Compartir y Exportar tu Planificación"
            >
                <div className="text-sm text-[#172B4D] dark:text-[#CBD5E1] space-y-4">
                    <p className="leading-relaxed">
                        Envía tu planificación universitaria y ruta de cursos por tu medio preferido. Al hacer clic en el enlace, <strong>cualquier compañero podrá abrir y cargar tu ruta de estudio exactamente como la armaste</strong>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Opción WhatsApp */}
                        <button
                            type="button"
                            onClick={() => {
                                const text = encodeURIComponent('¡Hola! Te comparto mi planificación de cursos en PEMTREE. Ábrela directamente aquí: ' + currentShareLink);
                                window.open('https://api.whatsapp.com/send?text=' + text, '_blank');
                            }}
                            className="flex items-center gap-3 p-3.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 dark:bg-[#25D366]/15 hover:bg-[#25D366]/20 transition cursor-pointer text-left"
                        >
                            <div className="p-2 rounded-full bg-[#25D366] text-white shrink-0">
                                <MessageCircle size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-[#172B4D] dark:text-slate-100">Enviar por WhatsApp</div>
                                <div className="text-[0.68rem] text-slate-600 dark:text-slate-300 leading-tight truncate">Abre chat con enlace prellenado</div>
                            </div>
                        </button>

                        {/* Opción Correo */}
                        <button
                            type="button"
                            onClick={() => {
                                const subject = encodeURIComponent('Mi Planificación de Cursos - PEMTREE');
                                const body = encodeURIComponent('¡Hola!\n\nTe comparto mi planificación universitaria de cursos en PEMTREE. Puedes abrirla directamente en este enlace:\n\n' + currentShareLink);
                                window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
                            }}
                            className="flex items-center gap-3 p-3.5 rounded-lg border border-[#0052CC]/40 bg-[#0052CC]/10 dark:bg-[#4C9AFF]/15 hover:bg-[#0052CC]/20 transition cursor-pointer text-left"
                        >
                            <div className="p-2 rounded-full bg-[#0052CC] dark:bg-[#4C9AFF] text-white shrink-0">
                                <Mail size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-[#172B4D] dark:text-slate-100">Enviar por Correo</div>
                                <div className="text-[0.68rem] text-slate-600 dark:text-slate-300 leading-tight truncate">Abre app de e-mail lista</div>
                            </div>
                        </button>
                    </div>

                    {/* Copiar enlace directo */}
                    <div className="pt-2">
                        <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-1.5">
                            Enlace de acceso directo a tu planificación:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={currentShareLink}
                                className="flex-1 px-3 py-2 text-xs border rounded-md bg-slate-50 dark:bg-[#1C2636] border-slate-300 dark:border-[#3E4C5E] text-slate-600 dark:text-slate-300 select-all font-mono truncate"
                                onClick={e => e.target.select()}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(currentShareLink);
                                    setLinkCopied(true);
                                    addToast('¡Enlace copiado al portapapeles!');
                                    setTimeout(() => setLinkCopied(false), 3000);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition shrink-0 cursor-pointer ${linkCopied ? 'bg-[#059669] text-white' : 'bg-[#0052CC] dark:bg-[#4C9AFF] text-white hover:bg-[#003D99]'}`}
                            >
                                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                                <span>{linkCopied ? '¡Copiado!' : 'Copiar'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Descargar JSON */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                            ¿O prefieres guardar un archivo físico de respaldo?
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadJSON}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition cursor-pointer border border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399] hover:bg-[#059669]/10 w-full sm:w-auto justify-center"
                        >
                            <Download size={15} />
                            <span>Descargar Archivo (.json)</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Importar Planificación */}
            <Modal
                isOpen={showImportModal}
                onClose={() => { setShowImportModal(false); setSharedPlanData(null); }}
                title="Importar o Cargar Planificación"
            >
                {sharedPlanData ? (
                    <div className="text-sm text-[#172B4D] dark:text-[#CBD5E1] space-y-4">
                        <div className="p-4 rounded-lg bg-[#DEEBFF] dark:bg-[#0C295E] border border-[#0052CC]/30">
                            <h4 className="font-bold text-sm text-[#0052CC] dark:text-[#4C9AFF] flex items-center gap-2 mb-1">
                                <Check size={18} /> Planificación encontrada lista para importar
                            </h4>
                            <p className="text-xs text-[#172B4D] dark:text-slate-200 mt-1">
                                <strong>Carrera:</strong> {sharedPlanData.pk || currentPensum}<br />
                                <strong>Líneas/Rutas incluidas:</strong> {sharedPlanData.lines ? sharedPlanData.lines.length : 1} línea(s) planificada(s)<br />
                                {sharedPlanData.prom !== undefined && <span><strong>Promedio meta:</strong> {sharedPlanData.prom} pts</span>}
                            </p>
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed">
                            Puedes optar por reemplazar toda tu planificación actual o sumar estas rutas importadas a tus líneas existentes.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3">
                            <Button
                                variant="secondary"
                                onClick={() => handleConfirmImport(false)}
                            >
                                Sumar a mis líneas actuales
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => handleConfirmImport(true)}
                            >
                                Reemplazar mi plan actual
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-[#172B4D] dark:text-[#CBD5E1] space-y-5">
                        {/* Subir archivo */}
                        <div>
                            <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-2">
                                1. Selecciona un archivo (.json) descargado previamente:
                            </label>
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] dark:border-[#3E4C5E] rounded-lg p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1C2636] transition-colors">
                                <Upload size={28} className="text-[#0052CC] dark:text-[#4C9AFF] mb-2" />
                                <span className="text-xs sm:text-sm font-bold text-[#172B4D] dark:text-slate-200 text-center">Haz clic para buscar o arrastra tu archivo JSON</span>
                                <span className="text-[0.68rem] text-slate-500 mt-1">Archivo exportado desde PEMTREE</span>
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const text = await file.text();
                                            const parsed = JSON.parse(text);
                                            if (parsed && (parsed.lines || parsed.plan)) {
                                                setSharedPlanData(parsed);
                                            } else {
                                                addToast('El archivo no contiene un formato válido de PEMTREE.');
                                            }
                                        } catch {
                                            addToast('Error al leer el archivo JSON.');
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {/* Pegar código o link */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <label className="block text-xs font-bold text-[#172B4D] dark:text-slate-300 mb-1.5">
                                2. ¿Recibiste un enlace o código largo? Pégalo aquí:
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Pega el enlace https://... o código aquí..."
                                    value={pastedCodeInput}
                                    onChange={e => setPastedCodeInput(e.target.value)}
                                    className="flex-1 px-3 py-2 text-xs border rounded-md bg-white dark:bg-[#1C2636] border-slate-300 dark:border-[#3E4C5E] text-slate-800 dark:text-slate-100 font-mono truncate"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        let code = pastedCodeInput.trim();
                                        if (code.includes('sharePlan=')) {
                                            code = code.split('sharePlan=')[1]?.split('&')[0] || code;
                                        } else if (code.includes('plan=')) {
                                            code = code.split('plan=')[1]?.split('&')[0] || code;
                                        }
                                        const decoded = decodePlanPayload(code);
                                        if (decoded && (decoded.lines || decoded.plan)) {
                                            setSharedPlanData(decoded);
                                            setPastedCodeInput('');
                                        } else {
                                            addToast('El código no se pudo procesar. Verifica que esté completo.');
                                        }
                                    }}
                                    className="px-3.5 py-2 rounded-md bg-[#0052CC] dark:bg-[#4C9AFF] text-white text-xs font-bold hover:bg-[#003D99] transition cursor-pointer"
                                >
                                    Cargar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
