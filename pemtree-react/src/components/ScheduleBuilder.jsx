import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { Calendar, Download, RefreshCw, Search, AlertTriangle, Check, X, ChevronRight, Clock, Pin, BookOpen } from 'lucide-react';
import {
    cargarHorarios,
    minutos as mins,
    calcularTraslapeMinutos,
    esLaboratorio,
    esTraslapePermitido,
    validarHorarioCompleto,
    formatearHorario,
        formatearDuracion
} from '../modules/data/scraper';
import { getPensumKey } from '../modules/data/cursos';
import { cargarCatalogo, getCatalogo, getCarreraDePensum, getPensumInfo } from '../modules/data/catalogo';
import { PALETAS, getCursoColor, getTextColor, getPaletteAccent } from '../theme/palettes';
import ExportModal from './ExportModal';
import DocenteReviews from './DocenteReviews';
import { WarningBanner } from './ui';
import HelpButton from './onboarding/HelpButton';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const HORA_INICIO = 6;

const PERIODS = [
    { id: 'semestre1', label: 'Semestre 1', shortLabel: 'Sem 1' },
    { id: 'semestre2', label: 'Semestre 2', shortLabel: 'Sem 2' },
    { id: 'vacaciones1', label: 'Vacaciones 1', shortLabel: 'Vac 1' },
    { id: 'vacaciones2', label: 'Vacaciones 2', shortLabel: 'Vac 2' },
];

function nombreCorto(nombre) {
    if (!nombre || nombre === 'STAFF' || nombre === 'SIN AUXILIAR') return '';
    const parts = nombre.split(' ');
    const apellidos = parts.slice(-2).join(' ');
    return apellidos.length > 14 ? apellidos.substring(0, 12) + '...' : apellidos;
}

function tipoAbrev(tipo) {
    return tipo === 'LABORATORIO' ? 'LAB'
    : tipo === 'TRABAJO_DIRIGIDO' ? 'TD'
    : tipo === 'DIBUJO' ? 'DIB'
    : tipo === 'PRACTICA' ? 'PRA'
    : 'MAG';
}



function truncarNombre(nombre) {
    if (!nombre) return '';
    return nombre.length > 25 ? nombre.substring(0, 23) + '...' : nombre;
}

function getScheduleStorageKey(period) {
    const pensum = getPensumKey() || 'default';
    return `pemtree_schedule_${pensum}_${period}`;
}

function migrateOldKeys() {
    const pensum = getPensumKey() || 'default';
    const oldToNew = {
        'semestre': 'semestre1',
        'vacaciones': 'vacaciones1',
    };
    for (const [oldPeriod, newPeriod] of Object.entries(oldToNew)) {
        const oldKey = `pemtree_schedule_${pensum}_${oldPeriod}`;
        const newKey = `pemtree_schedule_${pensum}_${newPeriod}`;
        if (!localStorage.getItem(newKey)) {
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
                localStorage.setItem(newKey, oldData);
            }
        }
    }
}

function parseSavedSections(raw) {
    if (!raw) return {};
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const cleaned = {};
    for (const [code, arr] of Object.entries(parsed)) {
        if (!Array.isArray(arr)) continue;
        const valid = arr.filter(s =>
            s && typeof s === 'object' &&
            Array.isArray(s.dias) && s.dias.length > 0 &&
            typeof s.inicio === 'string' && s.inicio &&
            typeof s.final === 'string' && s.final
        );
        if (valid.length > 0) cleaned[code] = valid;
    }
    return cleaned;
}

export default function ScheduleBuilder({ openHelp }) {
    const [currentPeriod, setCurrentPeriod] = useState(() => {
        return localStorage.getItem('pemtree_schedule_period') || 'semestre1';
    });
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSections, setSelectedSections] = useState(() => {
        migrateOldKeys();
        return parseSavedSections(localStorage.getItem(getScheduleStorageKey('semestre1')));
    });
    const sectionsPeriodRef = useRef('semestre1');
    const [expandedCourses, setExpandedCourses] = useState({});
    const [pinnedCourses, setPinnedCourses] = useState({});
    const [courseSearch, setCourseSearch] = useState('');
    const [modalidadFilter, setModalidadFilter] = useState('todas');
    const [clusterEnabled, setClusterEnabled] = useState(true);
    const [showWarning, setShowWarning] = useState(() => {
        return localStorage.getItem('pemtree_horario_warning_dismissed') !== 'true';
    });
    const gridRef = useRef(null);
    const savedSettingsRef = useRef(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showCourses, setShowCourses] = useState(false);
    const [exportSettings, setExportSettings] = useState({
        paletteName: 'Default',
        fontFamily: 'Segoe UI',
        bgImage: null,
        bgMode: 'stretch',
        bgApply: 'grid',
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    });

    const isVacaciones = currentPeriod.startsWith('vacaciones');

    useEffect(() => {
        loadHorarios(currentPeriod);
    }, [currentPeriod]);

    // getPensumKey() (en cursos.js) depende de un fetch async totalmente
    // independiente de cargarHorarios(), así que no hay garantía de cuál
    // termina primero. Si el pensum queda listo DESPUÉS de que este
    // componente ya intentó leer localStorage con la clave equivocada
    // ('default'), este evento nos avisa para re-sincronizar selectedSections
    // con la clave correcta en cuanto esté disponible.
    useEffect(() => {
        function handlePensumReady() {
            setSelectedSections(parseSavedSections(localStorage.getItem(getScheduleStorageKey(sectionsPeriodRef.current))));
            setPensumFile(getPensumKey() || '');
        }
        window.addEventListener('pemtree-pensum-ready', handlePensumReady);
        return () => window.removeEventListener('pemtree-pensum-ready', handlePensumReady);
    }, []);

    // Carga del catálogo + carrera actual (filtro por carrera)
    const [catalogoListo, setCatalogoListo] = useState(false);
    const [pensumFile, setPensumFile] = useState(() => getPensumKey() || '');

    useEffect(() => {
        let active = true;
        cargarCatalogo()
            .then(() => { if (active) setCatalogoListo(true); })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const carreraInfo = useMemo(() => {
        if (!catalogoListo || !pensumFile) return null;
        const carrera = getCarreraDePensum(pensumFile);
        if (!carrera) return null;
        return { nombre: carrera.nombre, codes: new Set(carrera.cursos || []) };
    }, [catalogoListo, pensumFile]);

    // Carreras simultáneas: permite incluir cursos de una segunda carrera
    const [simultanea, setSimultanea] = useState(() => localStorage.getItem('pemtree_schedule_simultanea') === 'true');
    const [segundaCarrera, setSegundaCarrera] = useState(() => localStorage.getItem('pemtree_schedule_segunda_carrera') || '');

    useEffect(() => { localStorage.setItem('pemtree_schedule_simultanea', String(simultanea)); }, [simultanea]);
    useEffect(() => { localStorage.setItem('pemtree_schedule_segunda_carrera', segundaCarrera); }, [segundaCarrera]);

    const pensumsDisponibles = useMemo(() => {
        if (!catalogoListo || !pensumFile) return [];
        const catalogo = getCatalogo();
        return (catalogo?.pensums || []).filter(p => p.id !== pensumFile && p.file !== pensumFile);
    }, [catalogoListo, pensumFile]);

    const segundaCarreraInfo = useMemo(() => {
        if (!catalogoListo || !simultanea || !segundaCarrera) return null;
        const carrera = getCarreraDePensum(segundaCarrera);
        const info = getPensumInfo(segundaCarrera);
        if (!carrera) return null;
        return { nombre: info ? info.nombre : carrera.nombre, codes: new Set(carrera.cursos || []) };
    }, [catalogoListo, simultanea, segundaCarrera]);

    // persist current period to localStorage for cross-component communication
    useEffect(() => {
        localStorage.setItem('pemtree_schedule_period', currentPeriod);
        window.dispatchEvent(new CustomEvent('pemtree-schedule-period-changed'));
    }, [currentPeriod]);

    // persist selected sections to localStorage (uses ref to avoid cross-period corruption)
    useEffect(() => {
        const key = getScheduleStorageKey(sectionsPeriodRef.current);
        if (Object.keys(selectedSections).length > 0) {
            localStorage.setItem(key, JSON.stringify(selectedSections));
        } else {
            localStorage.removeItem(key);
        }
    }, [selectedSections]);

    async function loadHorarios(periodId) {
        setLoading(true);
        setError(null);
        try {
            const data = await cargarHorarios(periodId);
            setHorarios(data || []);
            // Always re-sync selectedSections from localStorage once cargarHorarios
            // resolves, even on the very first mount. getPensumKey() can depend on
            // data that isn't ready yet during the initial synchronous render (the
            // useState lazy initializer), so the key used there may briefly compute
            // as the wrong pensum ('default') and miss the real saved schedule. By
            // the time cargarHorarios resolves, getPensumKey() is reliable, so we
            // simply re-read localStorage with the now-correct key. This is safe to
            // do unconditionally: the course list hasn't loaded yet before this
            // point, so the user can't have made a selection to lose.
            const saved = parseSavedSections(localStorage.getItem(getScheduleStorageKey(periodId)));
            setSelectedSections(saved);
            sectionsPeriodRef.current = periodId;
        } catch {
            setError('No pudimos cargar los horarios disponibles en este momento. Por favor, intenta de nuevo más tarde.');
            setHorarios([]);
        }
        setLoading(false);
    }

    const filteredCourses = useMemo(() => {
        const normalize = (s) => {
            if (!s) return '';
            return s.toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };
        const searchWords = normalize(courseSearch).split(/\s+/).filter(Boolean);
        const grouped = {};
        for (const h of horarios) {
            if (carreraInfo && !carreraInfo.codes.has(String(h.codigo))) {
                if (!(segundaCarreraInfo && segundaCarreraInfo.codes.has(String(h.codigo)))) continue;
            }
            const haystackWords = normalize([
                h.codigo,
                h.nombre,
                h.seccion,
                h.tipo,
                h.edificio,
                h.salon,
                h.catedratico,
                h.auxiliar,
                h.modalidad,
                h.dias ? h.dias.join(' ') : '',
            ].filter(Boolean).join(' ')).split(/\s+/).filter(Boolean);
            const matchSearch = !searchWords.length || searchWords.every(sw =>
                haystackWords.some(hw => hw.includes(sw))
            );
            const matchModalidad = modalidadFilter === 'todas' || h.modalidad === modalidadFilter;
            if (!matchSearch || !matchModalidad) continue;
            if (!grouped[h.codigo]) {
                grouped[h.codigo] = { codigo: h.codigo, nombre: h.nombre, secciones: [] };
            }
            grouped[h.codigo].secciones.push(h);
        }
        return Object.values(grouped).sort((a, b) => {
            const aPin = pinnedCourses[a.codigo] ? 1 : 0;
            const bPin = pinnedCourses[b.codigo] ? 1 : 0;
            if (aPin !== bPin) return bPin - aPin;
            const aSel = selectedSections[a.codigo]?.length ? 1 : 0;
            const bSel = selectedSections[b.codigo]?.length ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel;
            return a.codigo.localeCompare(b.codigo);
        });
    }, [horarios, courseSearch, modalidadFilter, pinnedCourses, selectedSections, carreraInfo, segundaCarreraInfo]);

    const allSelected = useMemo(() => {
        return Object.values(selectedSections).flat();
    }, [selectedSections]);

    const validation = useMemo(() => {
        if (allSelected.length === 0) return { conflictos: [], warnings: [], isValid: true };
        return validarHorarioCompleto(allSelected, isVacaciones);
    }, [allSelected, isVacaciones]);

    const overlapGroups = useMemo(() => {
        if (isVacaciones) return [];
        const allIndex = new Map(allSelected.map((s, i) => [s, i]));
        const groups = [];
        for (const dia of DIAS_SEMANA) {
            const cursosDelDia = allSelected.filter(s => (s.dias || []).includes(dia));
            if (cursosDelDia.length < 2) continue;

            const adj = new Map(cursosDelDia.map(s => [s, new Set()]));
            for (let i = 0; i < cursosDelDia.length; i++) {
                for (let j = i + 1; j < cursosDelDia.length; j++) {
                    const a = cursosDelDia[i];
                    const b = cursosDelDia[j];
                    const t = calcularTraslapeMinutos(a, b);
                    if (t <= 0) continue;
                    const aFlex = esTraslapePermitido(a);
                    const bFlex = esTraslapePermitido(b);
                    if (!(aFlex || bFlex) && t >= 50) continue;
                    adj.get(a).add(b);
                    adj.get(b).add(a);
                }
            }

            const visited = new Set();
            for (const s of cursosDelDia) {
                if (visited.has(s)) continue;
                const comp = [];
                const stack = [s];
                visited.add(s);
                while (stack.length) {
                    const cur = stack.pop();
                    comp.push(cur);
                    for (const nb of adj.get(cur)) {
                        if (!visited.has(nb)) {
                            visited.add(nb);
                            stack.push(nb);
                        }
                    }
                }
                if (comp.length < 2) continue;
                comp.sort((x, y) => (allIndex.get(x) ?? 0) - (allIndex.get(y) ?? 0));
                const startMin = Math.min(...comp.map(c => mins(c.inicio)));
                const endMin = Math.max(...comp.map(c => mins(c.final)));
                let overlapStart = Math.max(...comp.map(c => mins(c.inicio)));
                let overlapEnd = Math.min(...comp.map(c => mins(c.final)));
                if (overlapStart >= overlapEnd) {
                    overlapStart = startMin;
                    overlapEnd = endMin;
                }
                groups.push({ day: dia, sections: comp, startMin, endMin, overlapStart, overlapEnd });
            }
        }
        return groups;
    }, [allSelected, isVacaciones]);

    const courseCounts = useMemo(() => {
        const uniqueIds = new Set();
        const counts = { MAG: 0, LAB: 0, PRA: 0, TD: 0, DIB: 0 };
        for (const s of allSelected) {
            const key = `${s.codigo}|${s.tipo || ''}`;
            if (uniqueIds.has(key)) continue;
            uniqueIds.add(key);
            const abrev = tipoAbrev(s.tipo);
            if (counts[abrev] !== undefined) counts[abrev]++;
            else counts.MAG++;
        }
        return { ...counts, total: uniqueIds.size };
    }, [allSelected]);

    const hasConflict = (seccion) => {
        if (allSelected.length === 0) return { status: 'valid', reason: null };

        const others = allSelected.filter(s => s !== seccion && s.codigo !== seccion.codigo);

        for (const other of others) {
            if (esTraslapePermitido(seccion) || esTraslapePermitido(other)) continue;

            const traslape = calcularTraslapeMinutos(seccion, other);
            if (traslape >= 50) {
                return { status: 'error', reason: `Traslape ${traslape}min con ${other.codigo} ${other.seccion}` };
            }
            if (traslape > 0 && traslape < 50) {
                if (validation.traslapesMenores50 && validation.traslapesMenores50.length > 0) {
                    return { status: 'warning', reason: `Traslape ${traslape}min (aceptable)` };
                }
                return { status: 'warning', reason: `Traslape ${traslape}min` };
            }
        }

        if (isVacaciones) {
            const noLabs = allSelected.filter(s => !esTraslapePermitido(s) && s !== seccion);
            for (const other of noLabs) {
                if (calcularTraslapeMinutos(seccion, other) > 0) {
                    return { status: 'error', reason: 'No permitido en vacaciones' };
                }
            }
        }

        return { status: 'valid', reason: null };
    };

    function getSectionId(s) {
        return `${s.codigo}|${s.seccion}|${s.tipo || ''}|${(s.dias || []).join(',')}|${s.inicio || ''}|${s.final || ''}`;
    }

    function seccionGroups(slots) {
        const groups = {};
        for (const s of slots) {
            const key = `${s.seccion}|${s.catedratico || ''}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        }
        return Object.values(groups);
    }

    function toggleSectionGroup(slots) {
        if (slots.length === 0) return;
        const codigo = slots[0].codigo;
        const allSelected = slots.every(s => isSectionSelected(s));

        setSelectedSections(prev => {
            const existing = prev[codigo] || [];
            const slotIds = new Set(slots.map(s => getSectionId(s)));
            if (allSelected) {
                return { ...prev, [codigo]: existing.filter(s => !slotIds.has(getSectionId(s))) };
            } else {
                const typesInGroup = new Set(slots.map(s => s.tipo || ''));
                const filtered = existing.filter(s => !typesInGroup.has(s.tipo || ''));
                return { ...prev, [codigo]: [...filtered, ...slots] };
            }
        });
    }

    function groupKey(group) {
        return `${group.day}|${group.sections.map(s => getSectionId(s)).join('__')}`;
    }

    function getGroupActiveIndex(group) {
        const idx = group.sections.findIndex(s => isSectionSelected(s));
        return idx === -1 ? 0 : idx;
    }

    function cycleGroup(group) {
        const activeIdx = getGroupActiveIndex(group);
        const next = group.sections[(activeIdx + 1) % group.sections.length];
        for (const s of group.sections) {
            if (isSectionSelected(s)) toggleSection(s);
        }
        toggleSection(next);
    }

    function toggleSection(seccion) {
        setSelectedSections(prev => {
            const key = seccion.codigo;
            const id = getSectionId(seccion);
            const tipoKey = `${seccion.codigo}|${seccion.tipo || ''}`;
            const existing = prev[key] || [];
            const isSelected = existing.some(s => getSectionId(s) === id);

            if (isSelected) {
                return { ...prev, [key]: existing.filter(s => getSectionId(s) !== id) };
            } else {
                const filtered = existing.filter(s => `${s.codigo}|${s.tipo || ''}` !== tipoKey);
                return { ...prev, [key]: [...filtered, seccion] };
            }
        });
    }

    function isSectionSelected(seccion) {
        const key = seccion.codigo;
        const existing = selectedSections[key] || [];
        return existing.some(s => getSectionId(s) === getSectionId(seccion));
    }

    function toggleCourseExpand(codigo) {
        setExpandedCourses(prev => ({ ...prev, [codigo]: !prev[codigo] }));
    }

    function togglePinCourse(codigo) {
        setPinnedCourses(prev => ({ ...prev, [codigo]: !prev[codigo] }));
        if (!pinnedCourses[codigo]) {
            setExpandedCourses(prev => ({ ...prev, [codigo]: true }));
        }
    }

    function openExport() {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const fresh = { ...exportSettings, theme: currentTheme };
        setExportSettings(fresh);
        savedSettingsRef.current = { ...fresh };
        setShowExportModal(true);
    }

    function closeExportModal() {
        if (savedSettingsRef.current) {
            setExportSettings(savedSettingsRef.current);
        }
        setShowExportModal(false);
    }

    function dismissWarning() {
        setShowWarning(false);
        localStorage.setItem('pemtree_horario_warning_dismissed', 'true');
    }

    /**
     * Renders the schedule to an offscreen <canvas> without touching the live DOM.
     * Returns the canvas element (or null on failure).
     */
    async function renderToCanvas(settingsOverride, scale = 2) {
        if (allSelected.length === 0) return null;

        const activePalette = PALETAS[settingsOverride.paletteName] || PALETAS.Default;
        const isDark = settingsOverride.theme === 'dark';
        const font = settingsOverride.fontFamily || 'Segoe UI';
        const bgApply = settingsOverride.bgApply || 'grid';

        // ── layout constants (flattened for export image) ─────────────────────
        const slotMinutes = 10;
        const ROW_H = 18;
        const COL_W = 90;
        const TIME_W = 50;
        const HEADER_H = 18;
        const PAD = 12;
        const SEP_H = 18;

        // Use the same compact-layout logic as the DOM grid
        const layout = computeCompactLayout(allSelected);
        if (!layout) return null;
        const { clusters, collapsedSlots: collapsedSlotsC, collapseMarkers: collapseMarkersC, rowMeta: rowMetaC } = layout;

        // Calculate canvas height: each rowMeta entry is 1 visual row.
        // cluster-sep rows use SEP_H; everything else (slot + collapse-marker) uses ROW_H.
        const totalSeps = Math.max(0, clusters.length - 1);
        const nonSepRows = rowMetaC.filter(m => m.type !== 'cluster-sep').length;

        const W = PAD * 2 + TIME_W + COL_W * DIAS_SEMANA.length;
        const H = PAD * 2 + HEADER_H + nonSepRows * ROW_H + totalSeps * SEP_H;

        const canvas = document.createElement('canvas');
        canvas.width  = W * scale;
        canvas.height = H * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        // ── theme colours (matching CSS custom properties) ────────────────────
        const BG      = isDark ? '#0E1624' : '#FAFBFC';
        const SURFACE = isDark ? '#1C2636' : '#ffffff';
        const BORDER  = isDark ? '#3E4C5E' : '#DFE1E6';
        const TEXT_MUTED = isDark ? '#94a3b8' : '#7A869A';
        const TIME_BG = isDark ? '#0E1624' : '#F4F5F7';
        const CARD_R = 6;

        // ── background ────────────────────────────────────────────────────────
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        let bgImg = null;
        if (settingsOverride.bgImage) {
            bgImg = await new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = settingsOverride.bgImage;
            });
        }

        function roundRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        function drawText(text, x, y, maxW, fontSize, color, align = 'left', fontWeight = 'normal') {
            ctx.save();
            ctx.font = `${fontWeight} ${fontSize}px "${font}", sans-serif`;
            ctx.fillStyle = color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = align;
            ctx.beginPath();
            const clipX = align === 'center' ? x - maxW / 2 : (align === 'right' ? x - maxW : x);
            ctx.rect(clipX, y - fontSize * 1.3, maxW, fontSize * 2.6);
            ctx.clip();
            ctx.fillText(text, x, y, maxW);
            ctx.restore();
        }

        // ── outer card (clip for rounded corners) ─────────────────────────────
        ctx.save();
        roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, CARD_R);
        ctx.clip();

        if (bgImg && bgApply === 'grid') {
            const bm = settingsOverride.bgMode;
            if (bm === 'stretch') {
                ctx.drawImage(bgImg, PAD, PAD, W - PAD * 2, H - PAD * 2);
            } else if (bm === 'tile') {
                const pat = ctx.createPattern(bgImg, 'repeat');
                ctx.save();
                ctx.translate(PAD, PAD);
                ctx.fillStyle = pat;
                ctx.fillRect(0, 0, W - PAD * 2, H - PAD * 2);
                ctx.restore();
            } else {
                const cardW = W - PAD * 2;
                const cardH = H - PAD * 2;
                const ratio = Math.min(cardW / bgImg.width, cardH / bgImg.height);
                const dw = bgImg.width * ratio;
                const dh = bgImg.height * ratio;
                ctx.drawImage(bgImg, PAD + (cardW - dw) / 2, PAD + (cardH - dh) / 2, dw, dh);
            }
        } else {
            ctx.fillStyle = SURFACE;
            ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);
        }

        const gridX = PAD + TIME_W;
        const gridY = PAD + HEADER_H;

        // ── day headers (palette accent color) ────────────────────────────
        const headerBg = getPaletteAccent(settingsOverride.paletteName);
        const headerTextColor = getTextColor(headerBg);
        ctx.fillStyle = headerBg;
        ctx.fillRect(PAD, PAD, W - PAD * 2, HEADER_H);

        DIAS_SEMANA.forEach((dia, i) => {
            const x = gridX + i * COL_W;
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, PAD);
            ctx.lineTo(x, PAD + HEADER_H);
            ctx.stroke();
            drawText(
                dia.substring(0, 3).toUpperCase(),
                x + COL_W / 2, PAD + HEADER_H / 2,
                COL_W - 4, 10, headerTextColor, 'center', '600'
            );
        });

        // ── grid lines, time labels, vertical lines (driven by rowMeta) ─────
        // Build slotIdx → absolute Y pixel map while drawing the background grid
        const slotYMap = new Map(); // slotIdx → absolute Y on canvas
        let curY = gridY;
        for (const meta of rowMetaC) {
            if (meta.type === 'top-spacer') {
                ctx.fillStyle = SURFACE;
                ctx.fillRect(PAD, curY, W - PAD * 2, 14);
                curY += 14;
            } else if (meta.type === 'cluster-sep' || meta.type === 'collapse-marker') {
                const h = meta.type === 'cluster-sep' ? SEP_H : ROW_H;
                ctx.fillStyle = SURFACE;
                ctx.fillRect(PAD, curY, W - PAD * 2, h);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.moveTo(PAD, curY + 3);
                ctx.lineTo(W - PAD, curY + 3);
                ctx.moveTo(PAD, curY + h - 3);
                ctx.lineTo(W - PAD, curY + h - 3);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold 11px "${font}", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(meta.type === 'cluster-sep' ? '······' : '···', W / 2, curY + h / 2);
                curY += h;
            } else {
                // type === 'slot' — store Y and draw time cell
                const sl = meta.sl;
                slotYMap.set(sl, curY);

                const hora   = HORA_INICIO + Math.floor(sl / 6);
                const minuto = (sl % 6) * 10;
                const isHourStart = minuto === 0;

                const anyCourseStartsHere = allSelected.some(h => {
                    const iniMin = mins(h.inicio);
                    return Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes) === sl;
                });
                const anyCourseEndsHere = allSelected.some(h => {
                    const finMin = mins(h.final);
                    return Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes) === sl || Math.floor((finMin - HORA_INICIO * 60) / slotMinutes) === sl;
                });

                const isCourseBoundary = !isHourStart && (anyCourseStartsHere || anyCourseEndsHere);

                // time cell background
                ctx.fillStyle = TIME_BG;
                ctx.fillRect(PAD, curY + 1, TIME_W, ROW_H - 2);

                // horizontal grid line (drawn exactly across at Y = curY)
                if (isHourStart) {
                    ctx.strokeStyle = BORDER;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(PAD, curY);
                    ctx.lineTo(W - PAD, curY);
                    ctx.stroke();
                } else if (isCourseBoundary) {
                    ctx.strokeStyle = BORDER;
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    ctx.moveTo(PAD, curY);
                    ctx.lineTo(W - PAD, curY);
                    ctx.stroke();
                }

                let timeLabel = '';
                if (isHourStart) {
                    timeLabel = `${String(hora).padStart(2, '0')}:00`;
                } else if (isCourseBoundary) {
                    timeLabel = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
                }

                if (timeLabel) {
                    drawText(
                        timeLabel,
                        PAD + 4, curY,
                        TIME_W - 6, isHourStart ? 9 : 7.5, TEXT_MUTED, 'left', isHourStart ? 'bold' : 'normal'
                    );
                }

                curY += ROW_H;
            }
        }

        // vertical grid lines spanning full canvas height (minus header and padding)
        DIAS_SEMANA.forEach((_, i) => {
            const x = gridX + i * COL_W;
            ctx.strokeStyle = BORDER;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(x, gridY);
            ctx.lineTo(x, H - PAD);
            ctx.stroke();
        });

        // ── outer card border ─────────────────────────────────────────────────
        ctx.restore();
        ctx.save();
        roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, CARD_R);
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // ── course blocks ─────────────────────────────────────────────────────

        const blockHasBg = bgImg && bgApply === 'blocks';
        const renderedGroupKeysCanvas = new Set();

        function fillBlockBackground(blockX, blockY, bw, bh) {
            if (!blockHasBg) return;
            const bm = settingsOverride.bgMode;
            if (bm === 'stretch') {
                ctx.drawImage(bgImg, 0, 0, W, H);
            } else if (bm === 'tile') {
                const pat = ctx.createPattern(bgImg, 'repeat');
                ctx.save();
                ctx.translate(blockX, blockY - 0.5);
                ctx.fillStyle = pat;
                ctx.fillRect(0, 0, bw, bh);
                ctx.restore();
            } else {
                const ratio = Math.min(W / bgImg.width, H / bgImg.height);
                const dw = bgImg.width * ratio;
                const dh = bgImg.height * ratio;
                ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
            }
        }

        function drawLabStripes(blockX, blockY, bw, bh) {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 3;
            const sp = 6;
            for (let sy = -bh * 2; sy < bh * 2; sy += sp) {
                ctx.beginPath();
                ctx.moveTo(blockX - bh * 2, sy + bh * 2);
                ctx.lineTo(blockX + bw * 2, sy - bw * 2);
                ctx.stroke();
            }
        }


        const BLOCK_R = 6;

        function drawBlockShell(blockX, blockY, bw, bh, color) {
            ctx.save();
            roundRect(blockX + 1.5, blockY + 0.5, bw - 3, bh - 1, BLOCK_R);
            ctx.clip();
            fillBlockBackground(blockX + 1.5, blockY + 0.5, bw - 3, bh - 1);
            ctx.fillStyle = blockHasBg ? (color + 'CC') : color;
            ctx.fill();
            ctx.restore();
        }

        function drawGroupContent(sections, activeIdx, blockX, blockY, bw, bh, tc) {
            const padX = 6;
            const padY = 4;
            const fSize = 9;
            const lineH = fSize * 1.2;
            const isLight = tc !== '#ffffff';
            const tcActive = tc;
            const tcName = isLight ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)';
            const tcProf = isLight ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)';
            const tcRoom = isLight ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)';
            const tcTipo = isLight ? 'rgba(30,41,59,1.0)' : 'rgba(255,255,255,1.0)';

            const n = sections.length;
            const activeShare = Math.max(0.25, Math.min(0.55, 1.1 / n));
            const otherShare = n > 1 ? (1 - activeShare) / (n - 1) : 1;

            const badges = sections
                .map((s, i) => (i !== activeIdx ? s.codigo : null))
                .filter(Boolean);

            if (isDark) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetY = 1;
            }

            let y = blockY;
            sections.forEach((sec, idx) => {
                const hh = bh * (idx === activeIdx ? activeShare : otherShare);
                const yStart = y;
                const isActive = idx === activeIdx;
                const yCode = yStart + padY + fSize * 0.5;
                const codeText = `${sec.codigo}-${(sec.seccion || '').trim() || '?'}`;

                drawText(codeText, blockX + padX, yCode, bw - padX * 2 - (isActive && badges.length ? 26 : 0), fSize, isActive ? tcActive : tcName, 'left', 'bold');

                if (isActive && badges.length) {
                    ctx.save();
                    ctx.font = `800 7px "${font}", sans-serif`;
                    const badgeText = `↔ ${badges.join(',')}`;
                    const textW = ctx.measureText(badgeText).width;
                    const badgeW = textW + 5;
                    const badgeH = 10;
                    const badgeX = blockX + bw - padX - badgeW;
                    const badgeY = yCode - 5;
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    roundRect(badgeX, badgeY, badgeW, badgeH, 3);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
                    ctx.restore();
                }

                if (hh >= 40) {
                    drawText(truncarNombre(sec.nombre), blockX + padX, yCode + lineH, bw - padX * 2, fSize * 0.85, tcName, 'left');
                    drawText(nombreCorto(sec.catedratico), blockX + padX, yCode + lineH * 2, bw - padX * 2, fSize * 0.85, tcProf, 'left');
                } else if (hh >= 26) {
                    drawText(truncarNombre(sec.nombre), blockX + padX, yCode + lineH, bw - padX * 2, fSize * 0.85, tcName, 'left');
                }

                if (hh >= 26) {
                    const yBottom = yStart + hh - padY - fSize * 0.5;
                    drawText(`${sec.edificio} ${sec.salon}`.trim(), blockX + padX, yBottom, bw - padX * 2 - 20, fSize * 0.85, tcRoom, 'left');
                    drawText(tipoAbrev(sec.tipo), blockX + bw - padX, yBottom, 45, fSize * 0.85, tcTipo, 'right', 'bold');
                } else if (hh >= 14) {
                    const yBottom = yStart + hh - padY - fSize * 0.5;
                    drawText(tipoAbrev(sec.tipo), blockX + bw - padX, yBottom, 45, fSize * 0.85, tcTipo, 'right', 'bold');
                }

                if (idx < n - 1) {
                    const dividerY = yStart + hh;
                    ctx.save();
                    ctx.strokeStyle = tc;
                    ctx.globalAlpha = 0.35;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(blockX + 6, dividerY);
                    ctx.lineTo(blockX + bw - 6, dividerY);
                    ctx.stroke();
                    ctx.restore();
                }

                y += hh;
            });

            if (isDark) {
                ctx.restore();
            }
        }

        // ── 1. Render merged group blocks ────────────────────────────────────
        for (const group of overlapGroups) {
          try {
            const gk = groupKey(group);
            if (renderedGroupKeysCanvas.has(gk)) continue;
            const diaIdx = DIAS_SEMANA.indexOf(group.day);
            if (diaIdx === -1) continue;

            const activeIdx = getGroupActiveIndex(group);
            const activo = group.sections[activeIdx];

            const groupStartSlot = Math.floor((group.startMin - HORA_INICIO * 60) / slotMinutes);
            const groupEndSlot   = Math.ceil((group.endMin - HORA_INICIO * 60) / slotMinutes);
            let visibleRows = 0;
            for (let s = groupStartSlot; s < groupEndSlot; s++) {
                if (!collapsedSlotsC.has(s)) visibleRows++;
                if (collapseMarkersC.has(s)) visibleRows++;
            }
            visibleRows = Math.max(1, visibleRows);
            const minPairHeight = 80;
            const blockH = Math.max(visibleRows * ROW_H, minPairHeight);
            const blockY = slotYMap.has(groupStartSlot) ? slotYMap.get(groupStartSlot) : gridY;
            const blockX = gridX + diaIdx * COL_W - 0.5;
            const bw = COL_W + 1;
            const bh = blockH + 1;

            const color = getCursoColor(activo.codigo, activePalette);
            
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            drawBlockShell(blockX, blockY, bw, bh, color);
            ctx.restore();

            if (esLaboratorio(activo)) {
                drawLabStripes(blockX, blockY, bw, bh);
            }

            ctx.save();
            roundRect(blockX + 0.5, blockY - 0.5, bw - 1, bh + 1, BLOCK_R + 1);
            ctx.strokeStyle = 'rgba(217,119,6,0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            ctx.save();
            roundRect(blockX + 1.5, blockY + 0.5, bw - 3, bh - 1, BLOCK_R);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            const tc = getTextColor(color);
            drawGroupContent(group.sections, activeIdx, blockX, blockY, bw, bh, tc);

            renderedGroupKeysCanvas.add(gk);
          } catch (err) {
            console.warn('Exportación de horario: no se pudo dibujar un bloque combinado por datos incompletos.', err, group);
          }
        }

        // ── 2. Render individual sections, excluding pair-overlap windows ──
        for (const seccion of allSelected) {
            const color = getCursoColor(seccion.codigo, activePalette);
            const iniMin = mins(seccion.inicio);
            const finMin = mins(seccion.final);

            // Algunas secciones pueden traer datos incompletos (horas mal
            // formadas, sin días, etc.). Si no se puede calcular su horario,
            // se omite solo esa sección — el resto del horario exportado no
            // debe verse afectado por un dato faltante en un curso puntual.
            if (!Number.isFinite(iniMin) || !Number.isFinite(finMin)) {
                console.warn(`Exportación de horario: se omitió ${seccion.codigo || 'un curso'} por tener horas incompletas o inválidas.`, seccion);
                continue;
            }

            (seccion.dias || []).forEach(dia => {
              try {
                const diaIdx = DIAS_SEMANA.indexOf(dia);
                if (diaIdx === -1) return;

                // Collect group windows for this section on this day
                const overlaps = overlapGroups
                    .filter(g => g.day === dia && g.sections.includes(seccion))
                    .map(g => ({ start: g.startMin, end: g.endMin }));

                // Subtract pair windows from the section's range
                const segments = [{ start: iniMin, end: finMin }];
                for (const ov of overlaps) {
                    const next = [];
                    for (const seg of segments) {
                        if (ov.end <= seg.start || ov.start >= seg.end) {
                            next.push(seg);
                        } else {
                            if (ov.start > seg.start) next.push({ start: seg.start, end: ov.start });
                            if (ov.end < seg.end) next.push({ start: ov.end, end: seg.end });
                        }
                    }
                    segments.length = 0;
                    segments.push(...next);
                }

                const blockX = gridX + diaIdx * COL_W - 0.5;
                const bw = COL_W + 1;

                for (const seg of segments) {
                    if (seg.end - seg.start <= 0) continue;
                    const segStartSlot = Math.floor((seg.start - HORA_INICIO * 60) / slotMinutes);
                    const segEndSlot   = Math.ceil((seg.end   - HORA_INICIO * 60) / slotMinutes);
                    let segVisibleRows = 0;
                    for (let s = segStartSlot; s < segEndSlot; s++) {
                        if (!collapsedSlotsC.has(s)) segVisibleRows++;
                        if (collapseMarkersC.has(s)) segVisibleRows++;
                    }
                    segVisibleRows = Math.max(1, segVisibleRows);
                    const segBlockH = segVisibleRows * ROW_H;
                    const segBlockY = slotYMap.has(segStartSlot) ? slotYMap.get(segStartSlot) : gridY;
                    const bh = segBlockH + 1;
                    const blockY = segBlockY;

                const blocksBg = bgImg && bgApply === 'blocks';

                // block background
                ctx.save();
                roundRect(blockX + 1.5, blockY + 0.5, bw - 3, bh - 1, BLOCK_R);
                ctx.clip();

                if (blocksBg) {
                    const bm = settingsOverride.bgMode;
                    if (bm === 'stretch') {
                        ctx.drawImage(bgImg, 0, 0, W, H);
                    } else if (bm === 'tile') {
                        const pat = ctx.createPattern(bgImg, 'repeat');
                        ctx.fillStyle = pat;
                        ctx.fillRect(blockX, blockY - 0.5, bw, bh);
                    } else {
                        const ratio = Math.min(W / bgImg.width, H / bgImg.height);
                        const dw = bgImg.width * ratio;
                        const dh = bgImg.height * ratio;
                        ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
                    }
                }

                ctx.fillStyle = blocksBg ? (color + 'CC') : color;
                ctx.fill();

                // lab stripe pattern
                if (esLaboratorio(seccion)) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 3;
                    const sp = 6;
                    for (let sy = -bh * 2; sy < bh * 2; sy += sp) {
                        ctx.beginPath();
                        ctx.moveTo(blockX - bh * 2, sy + bh * 2);
                        ctx.lineTo(blockX + bw * 2, sy - bw * 2);
                        ctx.stroke();
                    }
                }

                ctx.restore();

                // conflict border
                const conf = hasConflict(seccion);
                if (conf.status !== 'valid') {
                    ctx.save();
                    roundRect(blockX + 1.5, blockY + 0.5, bw - 3, bh - 1, BLOCK_R);
                    ctx.strokeStyle = conf.status === 'error' ? '#e74c3c' : '#d97706';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                }

                // text content
                const padX = 5;
                const padY = 3;
                const fSize = 10;
                const tc = getTextColor(color);
                const tcProf = tc === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(30,41,59,0.75)';
                const tcRoom = tc === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(30,41,59,0.75)';
                const tcTipo = tc === '#ffffff' ? 'rgba(255,255,255,1.0)' : 'rgba(30,41,59,1.0)';

                if (isDark) {
                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 2;
                    ctx.shadowOffsetY = 1;
                }

                if (bh >= 50) {
                    const lineH = fSize * 1.25;
                    drawText(`${seccion.codigo}-${(seccion.seccion || '').trim() || '?'}`,
                        blockX + padX, blockY + padY + fSize * 0.6,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                    drawText(truncarNombre(seccion.nombre),
                        blockX + padX, blockY + padY + fSize * 0.6 + lineH,
                        bw - padX * 2, fSize * 0.65, tc, 'left');
                    drawText(nombreCorto(seccion.catedratico),
                        blockX + padX, blockY + padY + fSize * 0.6 + lineH * 2,
                        bw - padX * 2, fSize * 0.8, tcProf, 'left');
                    const bottomY = blockY + bh - padY - fSize * 0.6;
                    drawText(`${seccion.edificio} ${seccion.salon}`.trim(),
                        blockX + padX, bottomY,
                        bw - padX * 2 - 18, fSize * 0.85, tcRoom, 'left');
                    drawText(tipoAbrev(seccion.tipo),
                        blockX + bw - padX, bottomY,
                        45, fSize * 0.85, tcTipo, 'right', 'bold');
                } else if (bh >= 30) {
                    const lineH = fSize * 1.15;
                    drawText(`${seccion.codigo}-${(seccion.seccion || '').trim() || '?'}`,
                        blockX + padX, blockY + padY + fSize * 0.6,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                    drawText(truncarNombre(seccion.nombre),
                        blockX + padX, blockY + padY + fSize * 0.6 + lineH,
                        bw - padX * 2, fSize * 0.65, tc, 'left');
                    const bottomY = blockY + bh - padY - fSize * 0.6;
                    drawText(`${seccion.edificio} ${seccion.salon}`.trim(),
                        blockX + padX, bottomY,
                        bw - padX * 2 - 18, fSize * 0.8, tcRoom, 'left');
                    drawText(tipoAbrev(seccion.tipo),
                        blockX + bw - padX, bottomY,
                        45, fSize * 0.8, tcTipo, 'right', 'bold');
                } else if (bh >= 25) {
                    const midY = blockY + bh / 2;
                    drawText(`${seccion.codigo}-${(seccion.seccion || '').trim() || '?'}`,
                        blockX + padX, midY - fSize * 0.5,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                    drawText(`${seccion.edificio} ${seccion.salon}`.trim(),
                        blockX + padX, midY + fSize * 0.5,
                        bw - padX * 2 - 18, fSize * 0.85, tcRoom, 'left');
                    drawText(tipoAbrev(seccion.tipo),
                        blockX + bw - padX, midY + fSize * 0.5,
                        45, fSize * 0.8, tcTipo, 'right', 'bold');
                } else {
                    const midY = blockY + bh / 2;
                    drawText(seccion.codigo,
                        blockX + padX, midY,
                        bw - padX * 2 - 24, fSize * 0.85, tc, 'left', 'bold');
                    drawText(tipoAbrev(seccion.tipo),
                        blockX + bw - padX, midY,
                        45, fSize * 0.8, tcTipo, 'right', 'bold');
                }

                if (isDark) {
                    ctx.restore();
                }
                }
              } catch (err) {
                console.warn(`Exportación de horario: no se pudo dibujar ${seccion.codigo || 'un curso'} (${dia}) por datos incompletos.`, err);
              }
            });
        }

        return canvas;
    }

    async function doPreview(settingsOverride) {
        try {
            const canvas = await renderToCanvas(settingsOverride, 1.5);
            if (!canvas) return null;
            return canvas.toDataURL('image/png');
        } catch (err) {
            console.error('No se pudo generar la vista previa del horario:', err);
            return null;
        }
    }

    async function doExport() {
        setShowExportModal(false);
        try {
            const canvas = await renderToCanvas(exportSettings, 3);
            if (!canvas) return;

            // Use blob + object URL for reliable cross-browser download
            canvas.toBlob(blob => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `horario_${currentPeriod}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // revoke after a short delay to ensure the download starts
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }, 'image/png');
        } catch (err) {
            console.error('No se pudo generar la imagen del horario:', err);
        }
    }

    /**
     * Shared compact-layout computation used by both renderGrid (DOM) and
     * renderToCanvas (image export).
     *
     * For long blocks (>6 slots), only the first 2 rows and the last 3 rows
     * (5 total) stay visible; the collapsed middle becomes a single "···"
     * marker row. A slot only collapses if EVERY course occupying it (across
     * all days, since grid rows are shared across columns) independently
     * agrees the slot is hideable for its own compaction — two courses with
     * the exact same long block on different days will collapse together
     * fine, but a shorter course (or one whose own head/tail lands there)
     * keeps the slot visible for everyone. Visual coherence between courses
     * always wins over maximum compactness (this can split one block's
     * hidden middle into more than one "···" run if another course pokes
     * into it).
     *
     * Returns:
     *   clusters        – array of { start, end } slot ranges (with padding)
     *   collapsedSlots  – Set<slotIdx>  slots that are hidden (middle of long block)
     *   collapseMarkers – Set<slotIdx>  slots that show the "···" row BEFORE them
     *   slotToVisualRow – Map<slotIdx, gridRow>  (1-based, skipping row 1 = header)
     *                     also stores special entries: "sep-N" → row for inter-cluster separator
     *                     and "cm-N-S" → row for the collapse-marker pseudo-row
     *   totalRows       – total visual rows produced (excluding header row 1)
     */
    function computeCompactLayout(sections) {
        const slotMinutes = 10;

        // ── 1. occupied slots ──────────────────────────────────────────────────
        const occupiedSlots = new Set();
        for (const s of sections) {
            const ss = Math.floor((mins(s.inicio) - HORA_INICIO * 60) / slotMinutes);
            const es = Math.ceil((mins(s.final)  - HORA_INICIO * 60) / slotMinutes);
            for (let sl = ss; sl < es; sl++) occupiedSlots.add(sl);
        }

        if (occupiedSlots.size === 0) return null;

        // ── 2. cluster occupied slots ──────────────────────────────────────────
        const sorted = [...occupiedSlots].sort((a, b) => a - b);
        let clusters;
        if (clusterEnabled) {
            clusters = [{
                start: sorted[0],
                end: Math.min(Math.floor((23 - HORA_INICIO) * 6), sorted[sorted.length - 1] + 1)
            }];
        } else {
            const firstHourSlot = Math.floor(sorted[0] / 6) * 6;
            clusters = [{
                start: firstHourSlot,
                end: Math.min(Math.floor((23 - HORA_INICIO) * 6), Math.max(86, sorted[sorted.length - 1] + 1))
            }];
        }

        // ── 3. collapsed slots ────────────────────────────────────────────────
        const collapsedSlots  = new Set();
        const collapseMarkers = new Set();

        if (clusterEnabled) {
            // 3a. Find contiguous runs of unoccupied slots (!occupiedSlots.has(sl)).
            // If an empty gap is > 1 slot (> 10 minutes), we place exactly 1 small space (1 slot = 22px)
            // where the top shows the end time of the previous course (`hora de inicio del espacio en blanco`)
            // and the very next row shows the start time of the new courses (`hora que inician los nuevos cursos`).
            let runStart = null;
            for (let sl = clusters[0].start; sl <= clusters[0].end + 1; sl++) {
                if (sl <= clusters[0].end && !occupiedSlots.has(sl)) {
                    if (runStart === null) runStart = sl;
                } else {
                    if (runStart !== null) {
                        const runLen = sl - runStart;
                        if (runLen > 1) {
                            // Keep exactly 1 small slot (runStart), collapse the rest until sl - 1
                            for (let k = runStart + 1; k < sl; k++) {
                                collapsedSlots.add(k);
                            }
                        }
                        runStart = null;
                    }
                }
            }

            // 3b. In compact mode (`modo compacto`), we only maintain full course height (`ese tamaño`) for slots
            // where two or more courses overlap simultaneously on the exact same day (`dos cursos al mismo tiempo en un día`).
            // For all other courses that do not have a same-day overlap (`sin traslape en el mismo día`),
            // we compress them to half their size (`la mitad del tamaño`), unless another course on another day
            // shares those time slots and requires them uncollapsed (`a menos que haya un curso otro día a la misma hora que estén dos a la misma hora`).
            const candidateRange = new Map();
            const slotOccupants  = new Map();
            for (const s of sections) {
                const ss = Math.floor((mins(s.inicio) - HORA_INICIO * 60) / slotMinutes);
                const es = Math.ceil((mins(s.final)  - HORA_INICIO * 60) / slotMinutes);
                for (let sl = ss; sl < es; sl++) {
                    if (!slotOccupants.has(sl)) slotOccupants.set(sl, new Set());
                    slotOccupants.get(sl).add(s);
                }
            }

            // Check if a time slot has multiple courses overlapping on the exact same day
            const hasSameDayOverlapAtSlot = (sl) => {
                const occupants = slotOccupants.get(sl);
                if (!occupants || occupants.size <= 1) return false;
                const arr = Array.from(occupants);
                for (let i = 0; i < arr.length; i++) {
                    for (let j = i + 1; j < arr.length; j++) {
                        const diasA = arr[i].dias || [];
                        const diasB = arr[j].dias || [];
                        if (diasA.some(dia => diasB.includes(dia))) {
                            return true;
                        }
                    }
                }
                return false;
            };

            for (const s of sections) {
                const ss = Math.floor((mins(s.inicio) - HORA_INICIO * 60) / slotMinutes);
                const es = Math.ceil((mins(s.final)  - HORA_INICIO * 60) / slotMinutes);
                const span = es - ss;
                let hasSameDayOverlap = false;
                for (let sl = ss; sl < es; sl++) {
                    if (hasSameDayOverlapAtSlot(sl)) {
                        hasSameDayOverlap = true;
                        break;
                    }
                }

                if (hasSameDayOverlap || span <= 5) {
                    candidateRange.set(s, null);
                } else {
                    // Collapse half of the course's slots so it gets half the height (`la mitad del tamaño`)
                    const collapseCount = Math.floor(span / 2);
                    const headRows = Math.ceil((span - collapseCount) / 2);
                    const tailRows = span - collapseCount - headRows;
                    candidateRange.set(s, { start: ss + headRows, end: es - tailRows });
                }
            }

            for (const [sl, occupants] of slotOccupants) {
                let canHide = true;
                for (const o of occupants) {
                    const range = candidateRange.get(o);
                    if (!range || sl < range.start || sl >= range.end) {
                        canHide = false;
                        break;
                    }
                }
                if (canHide) collapsedSlots.add(sl);
            }

            // Protect course start and end boundaries so that non-exact end times (e.g. 08:50 vs 09:00) maintain distinct visual rows
            // without uncollapsing extra surrounding gaps (`es + 1`) that inflate compact mode height.
            for (const s of sections) {
                const ss = Math.floor((mins(s.inicio) - HORA_INICIO * 60) / slotMinutes);
                const es = Math.ceil((mins(s.final)  - HORA_INICIO * 60) / slotMinutes);
                collapsedSlots.delete(ss);
                if (es - 1 >= 0) collapsedSlots.delete(es - 1);
                collapsedSlots.delete(es);
            }
        }

        // ── 4. build slot→visualRow map (grid rows, 1-based; row 1 = header) ─
        const slotToRow  = new Map(); // slotIdx → CSS gridRow number
        const rowMeta    = [];        // ordered list of { type, sl?, ci, row }
        let   rowCounter = 2;         // CSS grid rows start at 2 (row 1 = header)

        // ALWAYS insert a dedicated blank top-spacer row right below the day header
        rowMeta.push({ type: 'top-spacer', row: rowCounter++ });

        for (let ci = 0; ci < clusters.length; ci++) {
            const c = clusters[ci];
            for (let sl = c.start; sl <= c.end; sl++) {
                if (collapsedSlots.has(sl)) {
                    continue;
                }
                slotToRow.set(sl, rowCounter);
                rowMeta.push({ type: 'slot', sl, ci, row: rowCounter });
                rowCounter++;
            }
        }

        return { clusters, collapsedSlots, collapseMarkers, slotToRow, rowMeta, rowCounter };
    }

    function renderGrid() {
        const blocks = [];
        const slotMinutes = 10;
        const slotsPerHour = 60 / slotMinutes;
        const activePalette = PALETAS[exportSettings.paletteName] || PALETAS.Default;
        const renderedGroupKeys = new Set();

        if (allSelected.length === 0) {
            blocks.push(
                <div key="empty" className="schedule-empty" style={{ gridColumn: '1 / -1', gridRow: '2 / span 8' }}>
                <span>Selecciona cursos para armar tu horario</span>
                </div>
            );
            return blocks;
        }

        const layout = computeCompactLayout(allSelected);
        if (!layout) return blocks;

        const { collapsedSlots, collapseMarkers, rowMeta } = layout;

        // ── render meta rows (separators, collapse markers, time cells) ────────
        for (const meta of rowMeta) {
            if (meta.type === 'top-spacer') {
                blocks.push(
                    <div key="top-spacer" className="schedule-cell schedule-top-spacer"
                        style={{ gridColumn: '1 / -1', gridRow: meta.row }} />
                );
            } else if (meta.type === 'cluster-sep') {
                blocks.push(
                    <div key={`sep-${meta.ci}`} className="schedule-separator"
                        style={{ gridColumn: '1 / -1', gridRow: meta.row }}>
                        <span className="schedule-separator-dots">······</span>
                    </div>
                );
            } else if (meta.type === 'collapse-marker') {
                blocks.push(
                    <div key={`cm-${meta.ci}-${meta.sl}`} className="schedule-separator"
                        style={{ gridColumn: '1 / -1', gridRow: meta.row, zIndex: 2 }}>
                        <span className="schedule-separator-dots">···</span>
                    </div>
                );
            } else if (meta.type === 'slot') {
                const sl  = meta.sl;
                const row = meta.row;
                const hora   = HORA_INICIO + Math.floor(sl / slotsPerHour);
                const minuto = (sl % slotsPerHour) * slotMinutes;
                
                const isHourStart = minuto === 0;
                const isHalfHour = minuto === 30;

                const anyCourseStartsHere = allSelected.some(h => {
                    const iniMin = mins(h.inicio);
                    return Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes) === sl;
                });
                const anyCourseEndsHere = allSelected.some(h => {
                    const finMin = mins(h.final);
                    return Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes) === sl || Math.floor((finMin - HORA_INICIO * 60) / slotMinutes) === sl;
                });

                const isCourseBoundary = !isHourStart && (anyCourseStartsHere || anyCourseEndsHere);
                const boundaryClass = isHourStart ? ' schedule-hour-boundary' : (isCourseBoundary ? ' schedule-subhour-boundary' : (isHalfHour ? ' schedule-halfhour-boundary' : ''));

                let timeLabel = '';
                if (isHourStart) {
                    timeLabel = `${String(hora).padStart(2, '0')}:00`;
                } else if (isCourseBoundary) {
                    timeLabel = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
                }

                blocks.push(
                    <div key={`time-${sl}`} className={`schedule-cell schedule-time-cell${boundaryClass}`}
                        style={{ gridColumn: 1, gridRow: row }}>
                        {timeLabel && <span className={isHourStart ? 'time-label-hour' : 'time-label-sub'}>{timeLabel}</span>}
                    </div>
                );

                DIAS_SEMANA.forEach((dia, diaIdx) => {
                    const slotStartMin = hora * 60 + minuto;
                    const slotEndMin   = slotStartMin + slotMinutes;

                    // ── Check for an overlap group starting at this slot+dia ──
                    let groupForSlot = null;
                    for (const group of overlapGroups) {
                        if (group.day !== dia) continue;
                        if (renderedGroupKeys.has(groupKey(group))) continue;
                        if (slotStartMin >= group.startMin && slotStartMin < group.endMin) {
                            groupForSlot = group;
                            break;
                        }
                    }

                    if (groupForSlot) {
                        renderedGroupKeys.add(groupKey(groupForSlot));
                        const activeIdx = getGroupActiveIndex(groupForSlot);
                        const activo = groupForSlot.sections[activeIdx];
                        const otros = groupForSlot.sections.filter((_, i) => i !== activeIdx);

                        const groupStartSlot = Math.floor((groupForSlot.startMin - HORA_INICIO * 60) / slotMinutes);
                        const groupEndSlot   = Math.ceil((groupForSlot.endMin   - HORA_INICIO * 60) / slotMinutes);

                        let visibleRowSpan = 0;
                        for (let s = groupStartSlot; s < groupEndSlot; s++) {
                            if (!collapsedSlots.has(s)) visibleRowSpan++;
                            if (collapseMarkers.has(s)) visibleRowSpan++;
                        }
                        visibleRowSpan = Math.max(1, visibleRowSpan);

                        const color     = getCursoColor(activo.codigo, activePalette);
                        const textColor = getTextColor(color);

                        const blockContent = (
                            <>
                                <div className="schedule-block-pair-half schedule-block-pair-active">
                                    <div className="schedule-block-pair-row">
                                        <span className="schedule-block-code">{activo.codigo}-{(activo.seccion || '').trim() || '?'}</span>
                                        {otros.length > 0 && (
                                            <span className="schedule-block-pair-badge" title={`Traslape(s) permitido(s) con ${otros.map(o => o.codigo).join(', ')}`}>↔ {otros.map(o => o.codigo).join(', ')}</span>
                                        )}
                                    </div>
                                    <span className="schedule-block-name">{truncarNombre(activo.nombre)}</span>
                                    <span className="schedule-block-prof">{nombreCorto(activo.catedratico)}</span>
                                    <span className="schedule-block-bottom">
                                        <span className="schedule-block-room">{activo.edificio} {activo.salon}</span>
                                        <span className="schedule-block-tipo">{tipoAbrev(activo.tipo)}</span>
                                    </span>
                                </div>
                                {otros.map((otro, i) => (
                                    <Fragment key={`${otro.codigo}-${otro.seccion}-${i}`}>
                                        <div className="schedule-block-pair-divider" />
                                        <div className="schedule-block-pair-half schedule-block-pair-inactive">
                                            <div className="schedule-block-pair-row">
                                                <span className="schedule-block-code">{otro.codigo}-{(otro.seccion || '').trim() || '?'}</span>
                                                <span className="schedule-block-pair-indicator">{tipoAbrev(otro.tipo)}</span>
                                            </div>
                                            <span className="schedule-block-name">{truncarNombre(otro.nombre)}</span>
                                            <span className="schedule-block-prof">{nombreCorto(otro.catedratico)}</span>
                                            <span className="schedule-block-bottom">
                                                <span className="schedule-block-room">{otro.edificio} {otro.salon}</span>
                                            </span>
                                        </div>
                                    </Fragment>
                                ))}
                            </>
                        );

                        const overlapDur = (groupForSlot.overlapEnd ?? groupForSlot.endMin) - (groupForSlot.overlapStart ?? groupForSlot.startMin);
                        const blockTitle = `${activo.codigo} - ${activo.seccion}\n${activo.nombre}\n${activo.inicio}-${activo.final}\n${activo.edificio} ${activo.salon}\n${activo.catedratico}\n\n${otros.length > 0 ? `Traslape permitido (${overlapDur} min) con:\n${otros.map(o => `${o.codigo} - ${o.seccion} · ${o.nombre}\n${o.inicio}-${o.final} · ${o.catedratico}`).join('\n')}` : ''}`;

                        blocks.push(
                            <div key={`group-block-${groupKey(groupForSlot)}`}
                                className={`schedule-block schedule-block-merged schedule-block-group ${groupForSlot.sections.length > 2 ? 'schedule-block-group-multi' : ''} ${esLaboratorio(activo) ? 'lab' : ''}`}
                                title={blockTitle}
                                style={{
                                    gridColumn: diaIdx + 2,
                                    gridRow: `${row} / span ${visibleRowSpan}`,
                                    backgroundColor: color,
                                    color: textColor,
                                    border: '2px solid #d97706',
                                    zIndex: 2,
                                    position: 'relative',
                                    minHeight: '80px'
                                }}
                                onClick={() => cycleGroup(groupForSlot)}>
                                {blockContent}
                            </div>
                        );
                        return;
                    }

                    const cursosEnSlot = allSelected.filter(h => {
                        if (!(h.dias || []).includes(dia)) return false;
                        const ini = mins(h.inicio);
                        const fin = mins(h.final);
                        if (!(slotEndMin > ini && slotStartMin < fin)) return false;
                        for (const group of overlapGroups) {
                            if (group.day !== dia) continue;
                            if (!group.sections.includes(h)) continue;
                            if (slotEndMin > group.startMin && slotStartMin < group.endMin) {
                                return false;
                            }
                        }
                        return true;
                    });

                    if (cursosEnSlot.length === 0) {
                        blocks.push(
                            <div key={`cell-${sl}-${dia}`} className={`schedule-cell${boundaryClass}`}
                                style={{ gridColumn: diaIdx + 2, gridRow: row }} />
                        );
                        return;
                    }

                    const seccion = cursosEnSlot[0];
                    const iniMin  = mins(seccion.inicio);
                    const isBlockStart = iniMin >= slotStartMin && iniMin < slotEndMin;

                    if (!isBlockStart) {
                        // block started on an earlier row — render placeholder so grid stays intact
                        blocks.push(
                            <div key={`span-${sl}-${dia}`} className={`schedule-cell${boundaryClass}`}
                                style={{ gridColumn: diaIdx + 2, gridRow: row, visibility: 'hidden' }} />
                        );
                        return;
                    }

                    // ── Block starts here ──────────────────────────────────────
                    const finMin       = mins(seccion.final);
                    const startSlotIdx = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
                    const endSlotIdx   = Math.ceil((finMin  - HORA_INICIO * 60) / slotMinutes);

                    // Count visible rows this block will span in the current layout
                    let visibleRowSpan = 0;
                    for (let s = startSlotIdx; s < endSlotIdx; s++) {
                        if (!collapsedSlots.has(s)) visibleRowSpan++;
                    }
                    visibleRowSpan = Math.max(1, visibleRowSpan);

                    const color       = getCursoColor(seccion.codigo, activePalette);
                    const textColor   = getTextColor(color);
                    const conf        = hasConflict(seccion);
                    const borderColor = conf.status === 'error' ? '#e74c3c' : conf.status === 'warning' ? '#d97706' : 'transparent';

                    const blockContent = (
                        <>
                            <span className="schedule-block-code">{seccion.codigo}-{(seccion.seccion || '').trim() || '?'}</span>
                            <span className="schedule-block-name">{truncarNombre(seccion.nombre)}</span>
                            <span className="schedule-block-prof">{nombreCorto(seccion.catedratico)}</span>
                            <span className="schedule-block-bottom">
                                <span className="schedule-block-room">{seccion.edificio} {seccion.salon}</span>
                                <span className="schedule-block-tipo">{tipoAbrev(seccion.tipo)}</span>
                            </span>
                        </>
                    );

                    const blockTitle = `${seccion.codigo} - ${seccion.seccion}\n${seccion.nombre}\n${seccion.inicio}-${seccion.final}\n${seccion.edificio} ${seccion.salon}\n${seccion.catedratico}`;

                    blocks.push(
                        <div key={`block-${sl}-${dia}`}
                            className={`schedule-block ${esLaboratorio(seccion) ? 'lab' : ''}`}
                            data-type={seccion.tipo}
                            title={blockTitle}
                            style={{
                                gridColumn: diaIdx + 2,
                                gridRow: `${row} / span ${visibleRowSpan}`,
                                backgroundColor: color,
                                color: textColor,
                                border: `1px solid ${borderColor}`,
                                zIndex: 2,
                                position: 'relative'
                            }}
                            onClick={() => toggleSection(seccion)}>
                            {blockContent}
                        </div>
                    );
                });
            }
        }

        return blocks;
    }

    return (
        <div className="schedule-container">
        {showWarning && (
            <WarningBanner
                onClose={dismissWarning}
                className="mb-3"
            >
                <strong>Espacio estudiantil independiente no oficial.</strong>
                <span> Este sitio es un proyecto comunitario independiente y no es una página oficial de la Facultad de Ingeniería ni de la Universidad de San Carlos de Guatemala. Los horarios y planes reflejados aquí son de referencia pública y podrían diferir del portal oficial. Verifica siempre en <a href="https://portal.ingenieria.usac.edu.gt" target="_blank" rel="noopener noreferrer">portal.ingenieria.usac.edu.gt</a>.</span>
            </WarningBanner>
        )}
        <div className="schedule-toolbar bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-slate-100 transition-colors duration-300">
        <div className="schedule-toolbar-title">
        <Calendar size={18} className="max-sm:hidden" />
        <h3 className="max-sm:hidden">Armador de Horarios</h3>
        {courseCounts.total > 0 && (
            <div className="schedule-course-counts max-sm:hidden">
            {courseCounts.MAG > 0 && <span className="schedule-count-mag">MAG {courseCounts.MAG}</span>}
            {courseCounts.LAB > 0 && <span className="schedule-count-lab">LAB {courseCounts.LAB}</span>}
            {courseCounts.PRA > 0 && <span className="schedule-count-pra">PRA {courseCounts.PRA}</span>}
            {courseCounts.TD > 0 && <span className="schedule-count-other">TD {courseCounts.TD}</span>}
            {courseCounts.DIB > 0 && <span className="schedule-count-other">DIB {courseCounts.DIB}</span>}
            </div>
        )}
        </div>

        <div className="schedule-period-tabs">
        {PERIODS.map(p => (
            <button
            key={p.id}
            className={`schedule-period-tab ${currentPeriod === p.id ? 'active' : ''}`}
            onClick={() => setCurrentPeriod(p.id)}
            >
            <span className="max-sm:hidden">{p.label}</span>
            <span className="sm:hidden">{p.shortLabel}</span>
            </button>
        ))}
        </div>

        <div className="schedule-toolbar-actions">
        <button
          className="planner-pool-toggle-bar schedule-courses-toggle"
          onClick={() => setShowCourses(v => !v)}
          title={showCourses ? 'Ocultar cursos' : 'Ver cursos'}
        >
          <BookOpen size={14} />
          <span className="planner-pool-toggle-label">Cursos</span>
        </button>
        <button
          className={`schedule-btn ${clusterEnabled ? 'cluster-active' : ''}`}
          onClick={() => setClusterEnabled(!clusterEnabled)}
          title={clusterEnabled ? 'Mostrar horario completo' : 'Compactar tiempo muerto'}
          style={{ fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          {clusterEnabled ? 'Compacto' : 'Completo'}
        </button>
        <button className="schedule-btn" onClick={() => loadHorarios(currentPeriod)} title="Recargar">
        <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
        <button className="schedule-btn" onClick={openExport} disabled={allSelected.length === 0} title="Descargar imagen del horario">
        <Download size={14} />
        </button>
        {openHelp && <HelpButton onClick={openHelp} className="schedule-help-btn" />}
        </div>
        </div>

        {horarios.length > 0 && horarios[0].datoAnterior && (
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '0.35rem 0.9rem',
                    fontSize: '0.68rem', color: '#B45309', background: '#FEF9E7',
                    borderBottom: '1px solid #FCD34D', flexWrap: 'wrap',
                }}
                title="El portal oficial no publicó este periodo en el ciclo vigente; se muestran los datos del ciclo anterior conservados."
            >
                <Clock size={12} />
                <span>Datos del ciclo anterior (<strong>{horarios[0].ciclo}</strong>): el ciclo vigente no publicó este periodo.</span>
            </div>
        )}

        <div className="schedule-filters">
        <label className="schedule-simultanea-toggle" title="Incluir cursos de una segunda carrera">
            <input
                type="checkbox"
                checked={simultanea}
                onChange={e => setSimultanea(e.target.checked)}
            />
            Simultáneas
        </label>
        {simultanea && (
            <select
                className="schedule-modalidad-select"
                value={segundaCarrera}
                onChange={e => setSegundaCarrera(e.target.value)}
            >
                <option value="">Seleccione 2ª carrera...</option>
                {pensumsDisponibles.map(p => (
                    <option key={p.id} value={p.file}>{p.nombre}</option>
                ))}
            </select>
        )}
        <select
        className="schedule-modalidad-select"
        value={modalidadFilter}
        onChange={e => setModalidadFilter(e.target.value)}
        >
        <option value="todas">Todas las modalidades</option>
        <option value="PRESENCIAL">Presencial</option>
        <option value="SEMIPRESENCIAL">Semipresencial</option>
        <option value="VIRTUAL">Virtual</option>
        </select>
        </div>

        {loading && (
            <div className="schedule-loading">
            <Clock size={24} className="spin" />
            <span>Cargando horarios...</span>
            </div>
        )}

        {error && (
            <div className="schedule-error">
            <AlertTriangle size={20} />
            <span>{error}</span>
            </div>
        )}

        {!loading && !error && (
            <div className="schedule-content">
            <div className="schedule-grid-container" ref={gridRef}>
            {(validation.conflictos?.length > 0 || validation.errores?.length > 0 || validation.traslapesMenores50?.length > 0) && (
                <div className="schedule-conflict-banner">
                <div className="schedule-conflict-banner-icon">
                    <AlertTriangle size={14} />
                </div>
                <div className="schedule-conflict-banner-text">
                    <strong>¡Conflictos detectados!</strong>
                    <span>
                    {validation.conflictos?.slice(0, 3).map((c, i) => (
                        <span key={i}>{c.curso1.codigo} ↔ {c.curso2.codigo} ({c.minutos}min){i < Math.min(validation.conflictos.length, 3) - 1 ? ', ' : ''}</span>
                    ))}
                    {validation.traslapesMenores50?.length > 0 && ` (+${validation.traslapesMenores50.length} menores de 50min)`}
                    {validation.conflictos?.length > 3 && ` y ${validation.conflictos.length - 3} más`}
                    </span>
                </div>
                </div>
            )}
            <div className={`schedule-grid ${clusterEnabled ? 'cluster-active-grid' : ''}`} style={{ display: 'grid', gridTemplateColumns: `50px repeat(7, 1fr)` }}>
            {(() => {
                const headerBg = getPaletteAccent(exportSettings.paletteName);
                const headerColor = getTextColor(headerBg);
                return <>
                <div className="schedule-cell schedule-header-cell" style={{ backgroundColor: headerBg }}></div>
                {DIAS_SEMANA.map(dia => (
                    <div key={dia} className="schedule-cell schedule-header-cell" style={{ backgroundColor: headerBg, color: headerColor }}>
                    {dia.substring(0, 3).toUpperCase()}
                    </div>
                ))}
                </>;
            })()}
            {renderGrid()}
            </div>
            </div>

            <div className="schedule-sidebar">
            <div className={`schedule-course-list ${showCourses ? 'schedule-courses-open' : ''}`}>
            <div className="schedule-courses-header">
            <span className="schedule-courses-header-title">Cursos disponibles</span>
            <button
                type="button"
                className="schedule-courses-close"
                onClick={() => setShowCourses(false)}
                title="Ocultar cursos"
                aria-label="Ocultar cursos"
            >
                <X size={16} />
            </button>
            </div>
            <div className="schedule-search">
                <Search size={14} />
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                />
            </div>
            {filteredCourses.map(curso => (
                <div key={curso.codigo} className="schedule-course-item">
                <div
                className="schedule-course-header"
                onClick={() => !pinnedCourses[curso.codigo] && toggleCourseExpand(curso.codigo)}
                >
                <div className="schedule-course-color" style={{ backgroundColor: getCursoColor(curso.codigo, PALETAS[exportSettings.paletteName] || PALETAS.Default) }}></div>
                <div className="schedule-course-info">
                <span className="schedule-course-code">{curso.codigo}</span>
                <span className="schedule-course-name">{curso.nombre}</span>
                </div>
                <button
                  className={`schedule-pin-btn ${pinnedCourses[curso.codigo] ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); togglePinCourse(curso.codigo); }}
                  title={pinnedCourses[curso.codigo] ? 'Desfijar curso' : 'Fijar curso para cambiar sección'}
                >
                  <Pin size={11} />
                </button>
                <ChevronRight
                size={14}
                style={{
                    transform: expandedCourses[curso.codigo] ? 'rotate(90deg)' : 'none',
                                           transition: 'transform 0.15s'
                }}
                onClick={e => { e.stopPropagation(); toggleCourseExpand(curso.codigo); }}
                />
                </div>

                {expandedCourses[curso.codigo] && (
                    <div className="schedule-course-sections">
                    {seccionGroups(curso.secciones).map((group, gIdx) => {
                        const first = group[0];
                        const allSlotsSelected = group.every(s => isSectionSelected(s));
                        const anySelected = group.some(s => isSectionSelected(s));
                        const conf = hasConflict(first);
                        const hasRestrictions = !!first.restricciones;
                        const restrictionDetail = typeof first.restricciones === 'string' ? first.restricciones : null;
                        const restrictionHover = restrictionDetail || 'Esta sección tiene restricciones. Verifica los requisitos con tu catedrático o en el portal oficial de la Facultad.';
                        const displaySlots = group.length <= 1 ? group : group;
                        return (
                            <div
                            key={`${first.codigo}-${first.seccion}-g${gIdx}`}
                            className={`schedule-section-item schedule-section-group ${allSlotsSelected ? 'selected' : ''} ${anySelected && !allSlotsSelected ? 'schedule-section-partial' : ''}`}
                            onClick={() => toggleSectionGroup(group)}
                            title={hasRestrictions ? restrictionHover : undefined}
                            >
                            <div className="schedule-section-check">
                            {allSlotsSelected && <Check size={10} />}
                            </div>
                            <div className="schedule-section-slots">
                            {displaySlots.map((sec, sIdx) => {
                                const isFirst = sIdx === 0;
                                const showBadge = sec.tipo && sec.tipo !== 'MAGISTRAL';
                                return (
                                    <Fragment key={`${sec.dias?.[0] || ''}-${sec.inicio}`}>
                                    {showBadge && (
                                        <span className={`schedule-section-badge type-${tipoAbrev(sec.tipo).toLowerCase()}`}>{tipoAbrev(sec.tipo)}</span>
                                    )}
                                    {!showBadge && !isFirst && (
                                        <span className="schedule-section-badge-spacer" />
                                    )}
                                    <div className="schedule-section-info">
                                    <span className="schedule-section-time">
                                    <span className="schedule-section-label">{isFirst ? `Sec. ${(first.seccion || '').trim() || '?'}` : ''}</span> {formatearHorario(sec)} · {sec.salon}
                                    {isFirst && hasRestrictions && (
                                        <span className="schedule-section-restr" title={restrictionHover}>
                                            <AlertTriangle size={9} className="inline-block mr-0.5" />Con restricciones
                                        </span>
                                    )}
                                    </span>
                                    <span className="schedule-section-prof">
                                    {sec.catedratico} · {formatearDuracion(sec)}
                                    </span>
                                    {isFirst && anySelected && hasRestrictions && (
                                        <div className="schedule-section-restrictions-panel" role="note">
                                            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                                            <span>
                                                {restrictionDetail
                                                    ? <>Restricciones: <strong>{restrictionDetail}</strong></>
                                                    : 'Esta sección tiene restricciones. Verifica los requisitos con tu catedrático o en el portal oficial de la Facultad antes de confirmar.'}
                                            </span>
                                        </div>
                                    )}
                                    </div>
                                    </Fragment>
                                );
                            })}
                            </div>
                            {conf.status !== 'valid' && (
                                <span className={`schedule-section-status ${conf.status}`} style={{ marginTop: 0, alignSelf: 'center' }}>
                                {conf.status === 'error' ? <X size={10} /> : <AlertTriangle size={10} />}
                                </span>
                            )}
                            {conf.status === 'valid' && allSlotsSelected && (
                                <span className="schedule-section-status valid" style={{ marginTop: 0, alignSelf: 'center' }}>
                                <Check size={10} />
                                </span>
                            )}
                            <DocenteReviews cursoCodigo={curso.codigo || first.codigo} seccion={first.seccion} />
                            </div>
                        );
                    })}
                    </div>
                )}
                </div>
            ))}

            {filteredCourses.length === 0 && (
                <div className="schedule-empty">
                <span>No hay cursos que coincidan</span>
                </div>
            )}
            </div>

            {(validation.conflictos?.length > 0 || validation.errores?.length > 0 || validation.traslapesMenores50?.length > 0) && (
                <div className="schedule-validation">
                {isVacaciones ? (
                    validation.errores?.map((err, i) => (
                        <div key={i} className={`schedule-validation-item ${err.tipo === 'TRASLAPE' ? 'error' : 'error'}`}>
                        <AlertTriangle size={12} />
                        <span>
                        {err.tipo === 'TRASLAPE'
                            ? `${err.curso1.codigo} y ${err.curso2.codigo} se traslapan`
                            : `${err.dia}: ${err.horas}h (máx 4h)`}
                            </span>
                            </div>
                    ))
                ) : (
                    <>
                    {validation.conflictos?.map((c, i) => (
                        <div key={`c${i}`} className="schedule-validation-item error">
                        <AlertTriangle size={12} />
                        <span>{c.curso1.codigo} y {c.curso2.codigo} se traslapan {c.minutos}min</span>
                        </div>
                    ))}
                    {validation.traslapesMenores50?.map((t, i) => (
                        <div key={`t${i}`} className="schedule-validation-item warning">
                        <AlertTriangle size={12} />
                        <span>{t.curso1.codigo} y {t.curso2.codigo} se traslapan {t.minutos}min</span>
                        </div>
                    ))}
                    </>
                )}
                </div>
            )}
            </div>
            </div>
        )}

        {showExportModal && (
            <ExportModal
            settings={exportSettings}
            onSettingsChange={setExportSettings}
            onDownload={doExport}
            onPreview={doPreview}
            onClose={closeExportModal}
            />
        )}
        </div>
    );
}
