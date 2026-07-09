import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { Calendar, Download, RefreshCw, Search, AlertTriangle, Check, X, ChevronRight, Clock, Pin } from 'lucide-react';
import {
    cargarHorarios,
    minutos as mins,
    calcularTraslapeMinutos,
    esLaboratorio,
    validarHorarioCompleto,
    formatearHorario,
        formatearDuracion
} from '../modules/data/scraper';
import { getPensumKey } from '../modules/data/cursos';
import { PALETAS, getCursoColor, getTextColor, getPaletteAccent } from '../theme/palettes';
import ExportModal from './ExportModal';

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

export default function ScheduleBuilder() {
    const [currentPeriod, setCurrentPeriod] = useState('semestre1');
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSections, setSelectedSections] = useState(() => {
        migrateOldKeys();
        const saved = localStorage.getItem(getScheduleStorageKey('semestre1'));
        return saved ? JSON.parse(saved) : {};
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
            const saved = localStorage.getItem(getScheduleStorageKey(sectionsPeriodRef.current));
            setSelectedSections(saved ? JSON.parse(saved) : {});
        }
        window.addEventListener('pemtree-pensum-ready', handlePensumReady);
        return () => window.removeEventListener('pemtree-pensum-ready', handlePensumReady);
    }, []);

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
            const saved = localStorage.getItem(getScheduleStorageKey(periodId));
            setSelectedSections(saved ? JSON.parse(saved) : {});
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
    }, [horarios, courseSearch, modalidadFilter, pinnedCourses, selectedSections]);

    const allSelected = useMemo(() => {
        return Object.values(selectedSections).flat();
    }, [selectedSections]);

    const validation = useMemo(() => {
        if (allSelected.length === 0) return { conflictos: [], warnings: [], isValid: true };
        return validarHorarioCompleto(allSelected, isVacaciones);
    }, [allSelected, isVacaciones]);

    const overlapPairs = useMemo(() => {
        if (isVacaciones) return [];
        const pairs = [];
        for (const dia of DIAS_SEMANA) {
            const cursosDelDia = allSelected.filter(s => (s.dias || []).includes(dia));
            for (let i = 0; i < cursosDelDia.length; i++) {
                for (let j = i + 1; j < cursosDelDia.length; j++) {
                    const a = cursosDelDia[i];
                    const b = cursosDelDia[j];
                    const t = calcularTraslapeMinutos(a, b);
                    if (t <= 0) continue;
                    const aLab = esLaboratorio(a);
                    const bLab = esLaboratorio(b);
                    if (!(aLab || bLab) && t >= 50) continue;
                    const iniMin = Math.min(mins(a.inicio), mins(b.inicio));
                    const finMin = Math.max(mins(a.final), mins(b.final));
                    const overlapStart = Math.max(mins(a.inicio), mins(b.inicio));
                    const overlapEnd = Math.min(mins(a.final), mins(b.final));
                    pairs.push({ day: dia, a, b, startMin: iniMin, endMin: finMin, overlapStart, overlapEnd });
                }
            }
        }
        return pairs;
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
            if (esLaboratorio(seccion) || esLaboratorio(other)) continue;

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
            const noLabs = allSelected.filter(s => !esLaboratorio(s) && s !== seccion);
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

    function cyclePair(pair) {
        const { a, b } = pair;
        const aSel = isSectionSelected(a);
        const bSel = isSectionSelected(b);
        if (aSel && !bSel) {
            toggleSection(a);
            toggleSection(b);
        } else if (!aSel && bSel) {
            toggleSection(b);
            toggleSection(a);
        } else if (!aSel && !bSel) {
            toggleSection(a);
        } else {
            toggleSection(a);
        }
    }

    function pairKey(a, b) {
        return `${a.codigo}|${a.seccion}|${a.tipo || ''}__${b.codigo}|${b.seccion}|${b.tipo || ''}`;
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
            ctx.rect(x - (align === 'center' ? maxW / 2 : 0), y - fontSize, maxW, fontSize * 2);
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
            if (meta.type === 'cluster-sep') {
                // draw separator
                ctx.fillStyle = SURFACE;
                ctx.fillRect(PAD, curY, W - PAD * 2, SEP_H);
                ctx.fillStyle = TEXT_MUTED;
                ctx.font = `11px "${font}", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('······', W / 2, curY + SEP_H / 2);
                curY += SEP_H;
            } else if (meta.type === 'collapse-marker') {
                // draw "···" collapse marker row
                ctx.fillStyle = SURFACE;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(PAD, curY, W - PAD * 2, ROW_H);
                ctx.globalAlpha = 1;
                ctx.fillStyle = TEXT_MUTED;
                ctx.font = `10px "${font}", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('···', W / 2, curY + ROW_H / 2);
                curY += ROW_H;
            } else {
                // type === 'slot' — store Y and draw time cell
                const sl = meta.sl;
                slotYMap.set(sl, curY);

                const hora   = HORA_INICIO + Math.floor(sl / 6);
                const minuto = (sl % 6) * 10;

                // horizontal grid line
                ctx.strokeStyle = BORDER;
                ctx.lineWidth = minuto === 0 ? 0.8 : 0.3;
                ctx.beginPath();
                ctx.moveTo(PAD, curY);
                ctx.lineTo(W - PAD, curY);
                ctx.stroke();

                // time cell background
                ctx.fillStyle = TIME_BG;
                ctx.fillRect(PAD, curY + 1, TIME_W, ROW_H - 2);

                drawText(
                    `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
                    PAD + 4, curY + ROW_H / 2,
                    TIME_W - 6, minuto === 0 ? 9 : 8, TEXT_MUTED
                );

                curY += ROW_H;
            }
        }

        // vertical grid lines spanning full canvas height (minus header and padding)
        DIAS_SEMANA.forEach((_, i) => {
            const x = gridX + i * COL_W;
            ctx.strokeStyle = BORDER;
            ctx.lineWidth = 0.5;
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
        const renderedPairKeysCanvas = new Set();

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


        function drawBlockShell(blockX, blockY, bw, bh, color) {
            ctx.save();
            roundRect(blockX, blockY - 0.5, bw, bh, 0);
            ctx.clip();
            fillBlockBackground(blockX, blockY, bw, bh);
            ctx.fillStyle = blockHasBg ? (color + 'CC') : color;
            ctx.fill();
            ctx.restore();
        }

        function drawPairContent(activo, otro, blockX, blockY, bw, bh, tc) {
            const padX = 3;
            const padY = 2;
            const fSize = 9;
            const lineH = fSize * 1.1;
            const isLight = tc === '#ffffff' ? false : true;
            const tcActive = tc;
            const tcDim = isLight ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.55)';
            const tcProf = isLight ? 'rgba(30,41,59,0.75)' : 'rgba(255,255,255,0.75)';

            if (isDark) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetY = 1;
            }

            // Active course: code + name on one line, prof on second line
            const codeText = `${activo.codigo}-${activo.seccion.trim() || '?'}`;
            drawText(codeText, blockX + padX, blockY + padY + fSize * 0.6,
                bw - padX * 2 - 22, fSize, tcActive, 'left', 'bold');
            drawText(truncarNombre(activo.nombre),
                blockX + padX, blockY + padY + fSize * 0.6 + lineH,
                bw - padX * 2, fSize * 0.85, tcActive, 'left');
            drawText(`${nombreCorto(activo.catedratico)} · ${activo.edificio} ${activo.salon}`,
                blockX + padX, blockY + padY + fSize * 0.6 + lineH * 2,
                bw - padX * 2, fSize * 0.7, tcProf, 'left');

            // Pair indicator badge in top-right of active section
            drawText(`↔${otro.codigo}`,
                blockX + bw - padX - 20, blockY + padY + fSize * 0.6,
                18, fSize * 0.7, tcActive, 'right', 'bold');

            // Divider line
            const dividerY = blockY + padY + fSize * 0.6 + lineH * 3 + 2;
            ctx.save();
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(blockX + padX, dividerY);
            ctx.lineTo(blockX + bw - padX, dividerY);
            ctx.stroke();
            ctx.restore();

            // Inactive course: dimmed
            const codeText2 = `${otro.codigo}-${otro.seccion.trim() || '?'}`;
            drawText(codeText2, blockX + padX, dividerY + 4 + fSize * 0.6,
                bw - padX * 2 - 22, fSize, tcDim, 'left', 'bold');
            drawText(truncarNombre(otro.nombre),
                blockX + padX, dividerY + 4 + fSize * 0.6 + lineH,
                bw - padX * 2, fSize * 0.85, tcDim, 'left');
            drawText(`${nombreCorto(otro.catedratico)} · ${otro.edificio} ${otro.salon}`,
                blockX + padX, dividerY + 4 + fSize * 0.6 + lineH * 2,
                bw - padX * 2, fSize * 0.7, tcProf, 'left');

            if (isDark) {
                ctx.restore();
            }
        }

        // ── 1. Render merged pair blocks ────────────────────────────────────
        for (const pair of overlapPairs) {
            const pk = pairKey(pair.a, pair.b);
            if (renderedPairKeysCanvas.has(pk)) continue;
            const diaIdx = DIAS_SEMANA.indexOf(pair.day);
            if (diaIdx === -1) continue;

            const aSel = isSectionSelected(pair.a);
            const bSel = isSectionSelected(pair.b);
            const activo = aSel ? pair.a : (bSel ? pair.b : pair.a);
            const otro = activo === pair.a ? pair.b : pair.a;

            const pairStartSlot = Math.floor((pair.startMin - HORA_INICIO * 60) / slotMinutes);
            const pairEndSlot   = Math.ceil((pair.endMin - HORA_INICIO * 60) / slotMinutes);
            let visibleRows = 0;
            for (let s = pairStartSlot; s < pairEndSlot; s++) {
                if (!collapsedSlotsC.has(s)) visibleRows++;
                if (collapseMarkersC.has(s)) visibleRows++;
            }
            visibleRows = Math.max(1, visibleRows);
            const minPairHeight = 80;
            const blockH = Math.max(visibleRows * ROW_H, minPairHeight);
            const blockY = slotYMap.has(pairStartSlot) ? slotYMap.get(pairStartSlot) : gridY;
            const blockX = gridX + diaIdx * COL_W - 0.5;
            const bw = COL_W + 1;
            const bh = blockH + 1;

            const color = getCursoColor(activo.codigo, activePalette);
            drawBlockShell(blockX, blockY, bw, bh, color);
            if (esLaboratorio(activo)) {
                drawLabStripes(blockX, blockY, bw, bh);
            }

            // Warning border (pair overlap indicator)
            ctx.save();
            roundRect(blockX, blockY - 0.5, bw, bh, 0);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            const tc = getTextColor(color);
            drawPairContent(activo, otro, blockX, blockY, bw, bh, tc);

            renderedPairKeysCanvas.add(pk);
        }

        // ── 2. Render individual sections, excluding pair-overlap windows ──
        for (const seccion of allSelected) {
            const color = getCursoColor(seccion.codigo, activePalette);
            const iniMin = mins(seccion.inicio);
            const finMin = mins(seccion.final);


            seccion.dias.forEach(dia => {
                const diaIdx = DIAS_SEMANA.indexOf(dia);
                if (diaIdx === -1) return;

                // Collect pair-overlap windows for this section on this day
                const overlaps = overlapPairs
                    .filter(p => p.day === dia && (p.a === seccion || p.b === seccion))
                    .map(p => ({ start: p.startMin, end: p.endMin }));

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
                roundRect(blockX, blockY - 0.5, bw, bh, 0);
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
                    roundRect(blockX, blockY - 0.5, bw, bh, 0);
                    ctx.strokeStyle = conf.status === 'error' ? '#e74c3c' : '#d97706';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                }

                // text content
                const padX = 3;
                const padY = 1;
                const fSize = 10;
                const tc = getTextColor(color);
                const tcProf = tc === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(30,41,59,0.75)';
                const tcRoom = tc === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(30,41,59,0.75)';
                const tcTipo = tc === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(30,41,59,0.65)';

                if (isDark) {
                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 2;
                    ctx.shadowOffsetY = 1;
                }

                if (bh >= 50) {
                    const lineH = fSize * 1.1;
                    drawText(`${seccion.codigo}-${seccion.seccion.trim() || '?'}`,
                        blockX + padX, blockY + padY + fSize * 0.6,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                    drawText(truncarNombre(seccion.nombre),
                        blockX + padX, blockY + padY + fSize * 0.6 + lineH,
                        bw - padX * 2, fSize * 0.65, tc, 'left');
                    drawText(nombreCorto(seccion.catedratico),
                        blockX + padX, blockY + padY + fSize * 0.6 + lineH * 2,
                        bw - padX * 2, fSize * 0.8, tcProf, 'left');
                    const bottomY = blockY + bh - padY - fSize * 0.6;
                    drawText(seccion.salon,
                        blockX + padX, bottomY,
                        bw - padX * 2 - 18, fSize * 0.85, tcRoom, 'left');
                    drawText(tipoAbrev(seccion.tipo),
                        blockX + bw - padX, bottomY,
                        16, fSize * 0.8, tcTipo, 'right', 'bold');
                } else if (bh >= 30) {
                    const lineH = fSize * 1.05;
                    drawText(`${seccion.codigo}-${seccion.seccion.trim() || '?'}`,
                        blockX + padX, blockY + padY + fSize * 0.6,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                    drawText(truncarNombre(seccion.nombre),
                        blockX + padX, blockY + padY + fSize * 0.6 + lineH,
                        bw - padX * 2, fSize * 0.65, tc, 'left');
                    const bottomY = blockY + bh - padY - fSize * 0.6;
                    drawText(seccion.salon,
                        blockX + padX, bottomY,
                        bw - padX * 2 - 18, fSize * 0.8, tcRoom, 'left');
                    drawText(tipoAbrev(seccion.tipo),
                        blockX + bw - padX, bottomY,
                        16, fSize * 0.75, tcTipo, 'right', 'bold');
                } else if (bh >= 25) {
                    const midY = blockY + bh / 2;
                    drawText(`${seccion.codigo}-${seccion.seccion.trim() || '?'}`,
                        blockX + padX, midY - fSize * 0.5,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                    drawText(seccion.salon,
                        blockX + padX, midY + fSize * 0.5,
                        bw - padX * 2, fSize * 0.85, tcRoom, 'left');
                } else {
                    const midY = blockY + bh / 2;
                    drawText(seccion.codigo,
                        blockX + padX, midY,
                        bw - padX * 2, fSize, tc, 'left', 'bold');
                }

                if (isDark) {
                    ctx.restore();
                }
                }
            });
        }

        return canvas;
    }

    async function doPreview(settingsOverride) {
        const canvas = await renderToCanvas(settingsOverride, 1.5);
        if (!canvas) return null;
        return canvas.toDataURL('image/png');
    }

    async function doExport() {
        setShowExportModal(false);
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
            clusters = [];
            let cur = { start: sorted[0], end: sorted[0] };
            for (let i = 1; i < sorted.length; i++) {
                const sl = sorted[i];
                if (sl - cur.end <= 12) { cur.end = sl; }
                else { clusters.push({ ...cur }); cur = { start: sl, end: sl }; }
            }
            clusters.push({ ...cur });
        } else {
            clusters = [{ start: sorted[0], end: sorted[sorted.length - 1] }];
        }
        // No padding: exact occupied slot bounds, no dead rows around clusters.

        // ── 3. collapsed slots ────────────────────────────────────────────────
        // In compact mode every slot within a cluster that has NO course on ANY
        // day is hidden. Additionally, the middle rows of long (>6 slot) blocks
        // are also hidden (keeping 2 head + 3 tail rows visible per block, i.e.
        // 5 rows total). Hidden runs of slots are replaced by a single "···"
        // marker row.
        const collapsedSlots  = new Set();
        const collapseMarkers = new Set();

        if (clusterEnabled) {
            // ── 3a. hide unoccupied slots inside clusters ──────────────────────
            for (const c of clusters) {
                for (let sl = c.start; sl <= c.end; sl++) {
                    if (!occupiedSlots.has(sl)) {
                        collapsedSlots.add(sl);
                    }
                }
            }

            // ── 3b. also hide middle rows of long blocks (>6 slots) ───────────
            // Keep the first HEAD_ROWS_LONG rows and the last TAIL_ROWS_LONG
            // rows visible (5 total) — see doc comment above for the "unless
            // another course is in the middle" exception.
            const HEAD_ROWS_LONG = 2;
            const TAIL_ROWS_LONG = 3;

            // Per-section candidate collapse range — the slots THAT section
            // alone would be happy to hide. null = too short to ever compact.
            const candidateRange = new Map(); // section → {start,end} | null
            const slotOccupants  = new Map(); // slotIdx → Set of sections
            for (const s of sections) {
                const ss = Math.floor((mins(s.inicio) - HORA_INICIO * 60) / slotMinutes);
                const es = Math.ceil((mins(s.final)  - HORA_INICIO * 60) / slotMinutes);
                for (let sl = ss; sl < es; sl++) {
                    if (!slotOccupants.has(sl)) slotOccupants.set(sl, new Set());
                    slotOccupants.get(sl).add(s);
                }
                const span = es - ss;
                candidateRange.set(s, span <= 6 ? null : { start: ss + HEAD_ROWS_LONG, end: es - TAIL_ROWS_LONG });
            }

            // A slot can only be hidden if EVERY course occupying it (across
            // all days, since rows are shared) agrees it's hideable for its
            // own compaction. If two courses share the exact same long block
            // across different days, both agree and the slot collapses fine.
            // If a shorter course — or a longer one whose own head/tail
            // touches this slot — needs it visible, it stays visible for all.
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

            // ── 3c. mark the first slot of each contiguous collapsed run ───────
            let inRun = false;
            for (const c of clusters) {
                for (let sl = c.start; sl <= c.end; sl++) {
                    if (collapsedSlots.has(sl) && !inRun) {
                        collapseMarkers.add(sl);
                        inRun = true;
                    } else if (!collapsedSlots.has(sl)) {
                        inRun = false;
                    }
                }
                inRun = false; // reset between clusters
            }
        }

        // ── 4. build slot→visualRow map (grid rows, 1-based; row 1 = header) ─
        // Visual rows start at 2.
        const slotToRow  = new Map(); // slotIdx → CSS gridRow number
        const rowMeta    = [];        // ordered list of { type, sl?, ci, row }
        let   rowCounter = 2;         // CSS grid rows start at 2 (row 1 = header)

        for (let ci = 0; ci < clusters.length; ci++) {
            if (ci > 0) {
                rowMeta.push({ type: 'cluster-sep', ci, row: rowCounter });
                rowCounter++;
            }
            const c = clusters[ci];
            for (let sl = c.start; sl <= c.end; sl++) {
                if (collapsedSlots.has(sl)) {
                    // Emit collapse-marker row at the START of each collapsed run,
                    // then skip all slots in that run.
                    if (collapseMarkers.has(sl)) {
                        rowMeta.push({ type: 'collapse-marker', sl, ci, row: rowCounter });
                        rowCounter++;
                    }
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
        const renderedPairKeys = new Set();

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
            if (meta.type === 'cluster-sep') {
                blocks.push(
                    <div key={`sep-${meta.ci}`} className="schedule-separator"
                        style={{ gridColumn: '1 / -1', gridRow: meta.row }}>
                        <span className="schedule-separator-dots">······</span>
                    </div>
                );
            } else if (meta.type === 'collapse-marker') {
                blocks.push(
                    <div key={`cm-${meta.ci}-${meta.sl}`} className="schedule-separator"
                        style={{ gridColumn: '1 / -1', gridRow: meta.row, zIndex: 2, background: 'transparent' }}>
                        <span className="schedule-separator-dots">···</span>
                    </div>
                );
            } else if (meta.type === 'slot') {
                const sl  = meta.sl;
                const row = meta.row;
                const hora   = HORA_INICIO + Math.floor(sl / slotsPerHour);
                const minuto = (sl % slotsPerHour) * slotMinutes;
                const timeLabel = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;

                blocks.push(
                    <div key={`time-${sl}`} className="schedule-cell schedule-time-cell"
                        style={{ gridColumn: 1, gridRow: row }}>
                        {timeLabel}
                    </div>
                );

                DIAS_SEMANA.forEach((dia, diaIdx) => {
                    const slotStartMin = hora * 60 + minuto;
                    const slotEndMin   = slotStartMin + slotMinutes;

                    // ── Check for a pair starting at this slot+dia ────────────
                    let pairForSlot = null;
                    for (const pair of overlapPairs) {
                        if (pair.day !== dia) continue;
                        const pk = pairKey(pair.a, pair.b);
                        if (renderedPairKeys.has(pk)) continue;
                        if (slotStartMin >= pair.startMin && slotStartMin < pair.endMin) {
                            pairForSlot = pair;
                            break;
                        }
                    }

                    if (pairForSlot) {
                        renderedPairKeys.add(pairKey(pairForSlot.a, pairForSlot.b));
                        const aSel = isSectionSelected(pairForSlot.a);
                        const bSel = isSectionSelected(pairForSlot.b);
                        const activo = aSel ? pairForSlot.a : (bSel ? pairForSlot.b : pairForSlot.a);
                        const otro = activo === pairForSlot.a ? pairForSlot.b : pairForSlot.a;

                        const pairStartSlot = Math.floor((pairForSlot.startMin - HORA_INICIO * 60) / slotMinutes);
                        const pairEndSlot   = Math.ceil((pairForSlot.endMin   - HORA_INICIO * 60) / slotMinutes);

                        let visibleRowSpan = 0;
                        for (let s = pairStartSlot; s < pairEndSlot; s++) {
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
                                        <span className="schedule-block-code">{activo.codigo}-{activo.seccion.trim() || '?'}</span>
                                        <span className="schedule-block-pair-badge" title={`Traslape permitido con ${otro.codigo}-${otro.seccion.trim() || '?'}`}>↔ {otro.codigo}</span>
                                    </div>
                                    <span className="schedule-block-name">{truncarNombre(activo.nombre)}</span>
                                    <span className="schedule-block-prof">{nombreCorto(activo.catedratico)}</span>
                                    <span className="schedule-block-bottom">
                                        <span className="schedule-block-room">{activo.edificio} {activo.salon}</span>
                                        <span className="schedule-block-tipo">{tipoAbrev(activo.tipo)}</span>
                                    </span>
                                </div>
                                <div className="schedule-block-pair-divider" />
                                <div className="schedule-block-pair-half schedule-block-pair-inactive">
                                    <div className="schedule-block-pair-row">
                                        <span className="schedule-block-code">{otro.codigo}-{otro.seccion.trim() || '?'}</span>
                                    </div>
                                    <span className="schedule-block-name">{truncarNombre(otro.nombre)}</span>
                                    <span className="schedule-block-prof">{nombreCorto(otro.catedratico)}</span>
                                    <span className="schedule-block-bottom">
                                        <span className="schedule-block-room">{otro.edificio} {otro.salon}</span>
                                        <span className="schedule-block-tipo">{tipoAbrev(otro.tipo)}</span>
                                    </span>
                                </div>
                            </>
                        );

                        const overlapDur = (pairForSlot.overlapEnd ?? pairForSlot.endMin) - (pairForSlot.overlapStart ?? pairForSlot.startMin);
                        const blockTitle = `${activo.codigo} - ${activo.seccion}\n${activo.nombre}\n${activo.inicio}-${activo.final}\n${activo.edificio} ${activo.salon}\n${activo.catedratico}\n\nTraslape permitido (${overlapDur} min) con:\n${otro.codigo} - ${otro.seccion} · ${otro.nombre}\n${otro.inicio}-${otro.final} · ${otro.catedratico}`;

                        blocks.push(
                            <div key={`pair-block-${pairKey(pairForSlot.a, pairForSlot.b)}`}
                                className={`schedule-block schedule-block-merged ${esLaboratorio(activo) ? 'lab' : ''}`}
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
                                onClick={() => cyclePair(pairForSlot)}>
                                {blockContent}
                            </div>
                        );
                        return;
                    }

                    const cursosEnSlot = allSelected.filter(h => {
                        if (!h.dias.includes(dia)) return false;
                        const ini = mins(h.inicio);
                        const fin = mins(h.final);
                        if (!(slotEndMin > ini && slotStartMin < fin)) return false;
                        for (const pair of overlapPairs) {
                            if (pair.day !== dia) continue;
                            if (pair.a !== h && pair.b !== h) continue;
                            if (slotEndMin > pair.startMin && slotStartMin < pair.endMin) {
                                return false;
                            }
                        }
                        return true;
                    });

                    if (cursosEnSlot.length === 0) {
                        blocks.push(
                            <div key={`cell-${sl}-${dia}`} className="schedule-cell"
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
                            <div key={`span-${sl}-${dia}`} className="schedule-cell"
                                style={{ gridColumn: diaIdx + 2, gridRow: row, visibility: 'hidden' }} />
                        );
                        return;
                    }

                    // ── Block starts here ──────────────────────────────────────
                    const finMin       = mins(seccion.final);
                    const startSlotIdx = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
                    const endSlotIdx   = Math.ceil((finMin  - HORA_INICIO * 60) / slotMinutes);
                    const originalSpan = Math.max(1, endSlotIdx - startSlotIdx);
                    const isLong       = clusterEnabled && originalSpan > 6;

                    // Count visible rows this block will span in the current layout
                    let visibleRowSpan = 0;
                    for (let s = startSlotIdx; s < endSlotIdx; s++) {
                        if (!collapsedSlots.has(s)) visibleRowSpan++;
                        if (collapseMarkers.has(s)) visibleRowSpan++; // marker row counts
                    }
                    visibleRowSpan = Math.max(1, visibleRowSpan);

                    const color       = getCursoColor(seccion.codigo, activePalette);
                    const textColor   = getTextColor(color);
                    const conf        = hasConflict(seccion);
                    const borderColor = conf.status === 'error' ? '#e74c3c' : conf.status === 'warning' ? '#d97706' : 'transparent';

                    const blockContent = (
                        <>
                            <span className="schedule-block-code">{seccion.codigo}-{seccion.seccion.trim() || '?'}</span>
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
                                zIndex: isLong ? 0 : 1,
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
            <div className="planner-warning-banner">
                <AlertTriangle size={18} className="planner-warning-icon" />
                <div className="planner-warning-text">
                    <strong>Este sitio no es oficial de la Facultad de Ingeniería.</strong>
                    <span> Los horarios y planes de estudio reflejados aquí podrían no estar actualizados con respecto al portal oficial. Verifica siempre en <a href="https://portal.ingenieria.usac.edu.gt" target="_blank" rel="noopener noreferrer">portal.ingenieria.usac.edu.gt</a>.</span>
                </div>
                <button className="planner-warning-close" onClick={dismissWarning} title="Cerrar">
                    <X size={16} />
                </button>
            </div>
        )}
        <div className="schedule-toolbar">
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
          className={`schedule-btn ${clusterEnabled ? 'cluster-active' : ''}`}
          onClick={() => setClusterEnabled(!clusterEnabled)}
          title={clusterEnabled ? 'Mostrar horario completo' : 'Compactar tiempo muerto'}
          style={{ fontSize: '0.7rem', fontWeight: 500 }}
        >
          {clusterEnabled ? 'Compac' : 'Compl'}
        </button>
        <button className="schedule-btn" onClick={() => loadHorarios(currentPeriod)} title="Recargar">
        <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
        <button className="schedule-btn" onClick={openExport} disabled={allSelected.length === 0} title="Descargar imagen del horario">
        <Download size={14} />
        </button>
        </div>
        </div>

        <div className="schedule-filters">
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
        <div className="schedule-search">
        <Search size={14} />
        <input
        type="text"
         placeholder="Buscar..."
        value={courseSearch}
        onChange={e => setCourseSearch(e.target.value)}
        />
        </div>
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
            <div className="schedule-grid" style={{ display: 'grid', gridTemplateColumns: `50px repeat(7, 1fr)` }}>
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
            <div className="schedule-course-list">
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
                                    <span className="schedule-section-label">{isFirst ? `Sec. ${first.seccion.trim() || '?'}` : ''}</span> {formatearHorario(sec)} · {sec.salon}
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
