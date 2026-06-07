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
import ExportModal from './ExportModal';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const HORA_INICIO = 6;
const HORA_FIN = 22;
const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 6;

const PERIODS = [
    { id: 'semestre', label: 'Semestre' },
{ id: 'vacaciones', label: 'Vacaciones' },
];

const PALETAS = {
    Default: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777',
    '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#be123c', '#0d9488',
    '#b45309', '#9333ea', '#0284c7', '#16a34a', '#e11d48', '#ca8a04'],
    Pastel:  ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4',
    '#67e8f9', '#bef264', '#fdba74', '#a5b4fc', '#fda4af', '#5eead4',
    '#d6b5e0', '#d8b4fe', '#7dd3fc', '#a3e635', '#fb7185', '#fbbf24'],
    Oscuro:  ['#1e3a5f', '#064e3b', '#78350f', '#7f1d1d', '#3b0764', '#701a75',
    '#164e63', '#365314', '#431407', '#1e1b4b', '#4a1d2a', '#134e4a',
    '#2d1a0a', '#4c1d95', '#0c4a6e', '#14532d', '#881337', '#713f12'],
    Neon:    ['#00ffcc', '#39ff14', '#ff6600', '#ff0033', '#b300ff', '#ff00ff',
    '#00ccff', '#ccff00', '#ff3300', '#6600ff', '#ff0066', '#00ff99',
    '#ff9900', '#9933ff', '#00aaff', '#33ff33', '#ff0044', '#ffaa00'],
    Calido:  ['#cc3300', '#8b4513', '#daa520', '#cd853f', '#b22222', '#ff6347',
    '#ff8c00', '#9acd32', '#556b2f', '#a0522d', '#d2691e', '#f4a460',
    '#8b0000', '#ff4500', '#b8860b', '#6b8e23', '#c71585', '#ff7f50']
};

function getCursoColor(codigo, palette) {
    let hash = 0;
    for (let i = 0; i < codigo.length; i++) {
        hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

function getTextColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff';
}

function getPaletteAccent(paletteName) {
    return (PALETAS[paletteName] || PALETAS.Default)[0];
}

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

export default function ScheduleBuilder() {
    const [currentPeriod, setCurrentPeriod] = useState('semestre');
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSections, setSelectedSections] = useState(() => {
        const saved = localStorage.getItem(getScheduleStorageKey('semestre'));
        return saved ? JSON.parse(saved) : {};
    });
    const [expandedCourses, setExpandedCourses] = useState({});
    const [pinnedCourses, setPinnedCourses] = useState({});
    const [courseSearch, setCourseSearch] = useState('');
    const [modalidadFilter, setModalidadFilter] = useState('todas');
    const [clusterEnabled, setClusterEnabled] = useState(true);
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

    // persist selected sections to localStorage
    useEffect(() => {
        const key = getScheduleStorageKey(currentPeriod);
        if (Object.keys(selectedSections).length > 0) {
            localStorage.setItem(key, JSON.stringify(selectedSections));
        } else {
            localStorage.removeItem(key);
        }
    }, [selectedSections, currentPeriod]);

    async function loadHorarios(periodId) {
        setLoading(true);
        setError(null);
        try {
            const data = await cargarHorarios(periodId);
            setHorarios(data || []);
            // restore saved sections for this period
            const saved = localStorage.getItem(getScheduleStorageKey(periodId));
            if (saved) {
                const savedSections = JSON.parse(saved);
                setSelectedSections(savedSections);
            } else {
                setSelectedSections({});
            }
        } catch (e) {
            setError('Error cargando horarios: ' + e.message);
            setHorarios([]);
        }
        setLoading(false);
    }

    const filteredCourses = useMemo(() => {
        const grouped = {};
        for (const h of horarios) {
            const matchSearch = !courseSearch ||
            h.nombre.toLowerCase().includes(courseSearch.toLowerCase()) ||
            h.codigo.includes(courseSearch);
            const matchModalidad = modalidadFilter === 'todas' || h.modalidad === modalidadFilter;
            if (!matchSearch || !matchModalidad) continue;
            if (!grouped[h.codigo]) {
                grouped[h.codigo] = { codigo: h.codigo, nombre: h.nombre, secciones: [] };
            }
            grouped[h.codigo].secciones.push(h);
        }
        return Object.values(grouped).sort((a, b) => a.codigo.localeCompare(b.codigo));
    }, [horarios, courseSearch, modalidadFilter]);

    const allSelected = useMemo(() => {
        return Object.values(selectedSections).flat();
    }, [selectedSections]);

    const validation = useMemo(() => {
        if (allSelected.length === 0) return { conflictos: [], warnings: [], isValid: true };
        return validarHorarioCompleto(allSelected, isVacaciones);
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

        // find clusters of occupied slots (max 2h gap)
        const occupiedSlots = new Set();
        for (const s of allSelected) {
            const iniMin = mins(s.inicio);
            const finMin = mins(s.final);
            const ss = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
            const es = Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes);
            for (let sl = ss; sl < es; sl++) occupiedSlots.add(sl);
        }
        const sortedSlots = [...occupiedSlots].sort((a, b) => a - b);
        const clusters = [];
        if (sortedSlots.length > 0) {
            if (clusterEnabled) {
                let cur = { start: sortedSlots[0], end: sortedSlots[0] };
                for (let i = 1; i < sortedSlots.length; i++) {
                    const sl = sortedSlots[i];
                    if (sl - cur.end <= 12) { cur.end = sl; }
                    else { clusters.push({ start: cur.start, end: cur.end }); cur = { start: sl, end: sl }; }
                }
                clusters.push({ start: cur.start, end: cur.end });
            } else {
                clusters.push({ start: sortedSlots[0], end: sortedSlots[sortedSlots.length - 1] });
            }
            for (const c of clusters) {
                c.start = Math.max(0, c.start - 1);
                c.end = Math.min(TOTAL_SLOTS - 1, c.end + 1);
            }
        }

        const collapsedSlotsC = new Set();
        const collapseMarkersC = new Map();
        if (clusterEnabled) {
            for (const s of allSelected) {
                const iniMin = mins(s.inicio);
                const finMin = mins(s.final);
                const ss = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
                const es = Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes);
                const span = es - ss;
                if (span > 6) {
                    for (let sl = ss + 3; sl < es - 2; sl++) {
                        let hasShort = false;
                        for (const other of allSelected) {
                            if (other === s) continue;
                            const oi = mins(other.inicio);
                            const of = mins(other.final);
                            const oss = Math.floor((oi - HORA_INICIO * 60) / slotMinutes);
                            const oes = Math.ceil((of - HORA_INICIO * 60) / slotMinutes);
                            if (sl >= oss && sl < oes && (oes - oss) <= 6) {
                                hasShort = true;
                                break;
                            }
                        }
                        if (!hasShort) collapsedSlotsC.add(sl);
                    }
                    collapseMarkersC.set(ss + 3, true);
                }
            }
        }

        // recalc totalRows accounting for collapsed slots
        let totalRows = 0;
        for (const c of clusters) {
            for (let s = c.start; s <= c.end; s++) {
                if (!collapsedSlotsC.has(s)) totalRows++;
                if (collapseMarkersC.has(s)) totalRows++;
            }
        }
        const totalSeps = Math.max(0, clusters.length - 1);

        const W = PAD * 2 + TIME_W + COL_W * DIAS_SEMANA.length;
        const SEP_H = 18;
        const H = PAD * 2 + HEADER_H + ROW_H * totalRows + totalSeps * SEP_H;

        const canvas = document.createElement('canvas');
        canvas.width  = W * scale;
        canvas.height = H * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        // ── theme colours (matching CSS custom properties) ────────────────────
        const BG      = isDark ? '#121924' : '#f8fafc';
        const SURFACE = isDark ? '#1c2636' : '#ffffff';
        const BORDER  = isDark ? '#334155' : '#d1d5db';
        const TEXT_MUTED = isDark ? '#94a3b8' : '#7a869a';
        const TIME_BG = isDark ? '#0f172a' : '#f4f5f7';
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

        // ── per-cluster grid lines, time labels, vertical lines ─────────────
        function slotToY(slotIdx) {
            let y = 0;
            for (const c of clusters) {
                for (let s = c.start; s <= c.end; s++) {
                    if (collapseMarkersC.has(s)) { y += ROW_H; continue; }
                    if (collapsedSlotsC.has(s)) continue;
                    if (s === slotIdx) return y;
                    y += ROW_H;
                }
                y += SEP_H; // inter-cluster separator
            }
            return y;
        }

        let clusterY = gridY;

        for (let ci = 0; ci < clusters.length; ci++) {
            const c = clusters[ci];
            const cStartY = clusterY;

            for (let slotIdx = c.start; slotIdx <= c.end; slotIdx++) {
                if (collapseMarkersC.has(slotIdx)) {
                    // draw separator on top of blocks
                    ctx.fillStyle = SURFACE;
                    ctx.globalAlpha = 0.3;
                    ctx.fillRect(PAD, clusterY, W - PAD * 2, ROW_H);
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = TEXT_MUTED;
                    ctx.font = `10px "${font}", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('···', W / 2, clusterY + ROW_H / 2);
                    clusterY += ROW_H;
                    continue;
                }
                if (collapsedSlotsC.has(slotIdx)) continue;

                const hora   = HORA_INICIO + Math.floor(slotIdx / 6);
                const minuto = (slotIdx % 6) * 10;

                // horizontal grid line
                ctx.strokeStyle = BORDER;
                ctx.lineWidth = minuto === 0 ? 0.8 : 0.3;
                ctx.beginPath();
                ctx.moveTo(PAD, clusterY);
                ctx.lineTo(W - PAD, clusterY);
                ctx.stroke();

                // time cell background
                ctx.fillStyle = TIME_BG;
                ctx.fillRect(PAD, clusterY + 1, TIME_W, ROW_H - 2);

                drawText(
                    `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
                    PAD + 4, clusterY + ROW_H / 2,
                    TIME_W - 6, minuto === 0 ? 9 : 8, TEXT_MUTED
                );

                clusterY += ROW_H;
            }

            // vertical grid lines for this cluster
            const clusterH = clusterY - cStartY;
            DIAS_SEMANA.forEach((_, i) => {
                const x = gridX + i * COL_W;
                ctx.strokeStyle = BORDER;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x, cStartY);
                ctx.lineTo(x, cStartY + clusterH);
                ctx.stroke();
            });

            // separator between clusters
            if (ci < clusters.length - 1) {
                ctx.fillStyle = SURFACE;
                ctx.fillRect(PAD, clusterY, W - PAD * 2, SEP_H);
                ctx.fillStyle = TEXT_MUTED;
                ctx.font = `11px "${font}", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('······', W / 2, clusterY + SEP_H / 2);
                clusterY += SEP_H;
            }
        }

        // ── outer card border ─────────────────────────────────────────────────
        ctx.restore();
        ctx.save();
        roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, CARD_R);
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // ── course blocks ─────────────────────────────────────────────────────

        for (const seccion of allSelected) {
            const color = getCursoColor(seccion.codigo, activePalette);
            const iniMin = mins(seccion.inicio);
            const finMin = mins(seccion.final);
            const startSlot = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
            const endSlot   = Math.ceil((finMin  - HORA_INICIO * 60) / slotMinutes);
            const originalRowSpan = Math.max(1, endSlot - startSlot);
            const isCollapsed = clusterEnabled && originalRowSpan > 6;
            const blockH = isCollapsed ? (3 + 1 + 2) * ROW_H : originalRowSpan * ROW_H;
            const blockY = gridY + slotToY(startSlot);

            seccion.dias.forEach(dia => {
                const diaIdx = DIAS_SEMANA.indexOf(dia);
                if (diaIdx === -1) return;

                const blockX = gridX + diaIdx * COL_W - 0.5;
                const bw = COL_W + 1;
                const bh = blockH + 1;

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

                // collapsed block: draw "···" overlay in middle
                if (isCollapsed) {
                    const sepY = blockY + 3 * ROW_H + ROW_H / 2;
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.font = `12px "${font}", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('···', blockX + bw / 2, sepY);
                }

                // conflict border
                const conf = hasConflict(seccion);
                if (conf.status !== 'valid') {
                    ctx.save();
                    roundRect(blockX, blockY - 0.5, bw, bh, 0);
                    ctx.strokeStyle = conf.status === 'error' ? '#dc2626' : '#d97706';
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

    function renderGrid() {
        const blocks = [];
        const slotMinutes = 10;
        const slotsPerHour = 60 / slotMinutes;
        const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * slotsPerHour;
        const activePalette = PALETAS[exportSettings.paletteName] || PALETAS.Default;

        if (allSelected.length === 0) {
            blocks.push(
                <div key="empty" className="schedule-empty" style={{ gridColumn: '1 / -1', gridRow: '2 / span 8' }}>
                <span>Selecciona cursos para armar tu horario</span>
                </div>
            );
            return blocks;
        }

        // Step 1: build set of slots that have at least one course on any day
        const occupiedSlots = new Set();
        for (const s of allSelected) {
            const iniMin = mins(s.inicio);
            const finMin = mins(s.final);
            const ss = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
            const es = Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes);
            for (let sl = ss; sl < es; sl++) occupiedSlots.add(sl);
        }

        // Step 2: group into clusters (max 2h gap) or single range if disabled
        const sorted = [...occupiedSlots].sort((a, b) => a - b);
        let clusters;
        if (clusterEnabled) {
            const MAX_GAP_SLOTS = 12;
            clusters = [];
            let cur = { start: sorted[0], end: sorted[0] };
            for (let i = 1; i < sorted.length; i++) {
                const sl = sorted[i];
                if (sl - cur.end <= MAX_GAP_SLOTS) {
                    cur.end = sl;
                } else {
                    clusters.push({ start: cur.start, end: cur.end });
                    cur = { start: sl, end: sl };
                }
            }
            clusters.push({ start: cur.start, end: cur.end });
        } else {
            clusters = [{ start: sorted[0], end: sorted[sorted.length - 1] }];
        }

        // add 1-slot padding around each cluster
        for (const c of clusters) {
            c.start = Math.max(0, c.start - 1);
            c.end = Math.min(TOTAL_SLOTS - 1, c.end + 1);
        }

        // Step 3: pre-calc collapsed slots for long blocks (compact mode)
        // Only collapse slots that are NOT occupied by any short course (span <=6)
        const collapsedSlots = new Set();
        const collapseMarkers = new Map();
        if (clusterEnabled) {
            for (const seccion of allSelected) {
                const iniMin = mins(seccion.inicio);
                const finMin = mins(seccion.final);
                const ss = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
                const es = Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes);
                const span = es - ss;
                if (span > 6) {
                    for (let sl = ss + 3; sl < es - 2; sl++) {
                        let hasShort = false;
                        for (const other of allSelected) {
                            if (other === seccion) continue;
                            const oi = mins(other.inicio);
                            const of = mins(other.final);
                            const oss = Math.floor((oi - HORA_INICIO * 60) / slotMinutes);
                            const oes = Math.ceil((of - HORA_INICIO * 60) / slotMinutes);
                            if (sl >= oss && sl < oes && (oes - oss) <= 6) {
                                hasShort = true;
                                break;
                            }
                        }
                        if (!hasShort) collapsedSlots.add(sl);
                    }
                    collapseMarkers.set(ss + 3, true);
                }
            }
        }

        // Step 4: render clusters with separators
        let currentRow = 2;

        for (let ci = 0; ci < clusters.length; ci++) {
            const cluster = clusters[ci];

            if (ci > 0) {
                blocks.push(
                    <div key={`sep-${ci}`} className="schedule-separator" style={{ gridColumn: '1 / -1', gridRow: currentRow }}>
                    <span className="schedule-separator-dots">······</span>
                    </div>
                );
                currentRow++;
            }

            const cFirst = cluster.start;
            const cLast = cluster.end;

            for (let slotIdx = cFirst; slotIdx <= cLast; slotIdx++) {
                if (collapseMarkers.has(slotIdx)) {
                    blocks.push(
                        <div key={`collapse-${ci}-${slotIdx}`} className="schedule-separator" style={{ gridColumn: '1 / -1', gridRow: currentRow, zIndex: 2, background: 'transparent' }}>
                        <span className="schedule-separator-dots">···</span>
                        </div>
                    );
                    currentRow++;
                }
                if (collapsedSlots.has(slotIdx)) continue;

                const hora = HORA_INICIO + Math.floor(slotIdx / slotsPerHour);
                const minuto = (slotIdx % slotsPerHour) * slotMinutes;
                const visualRow = currentRow;

                const timeLabel = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;

                blocks.push(
                    <Fragment key={`time-${ci}-${slotIdx}`}>
                    <div className="schedule-cell schedule-time-cell" style={{ gridColumn: 1, gridRow: visualRow }}>
                    {timeLabel}
                    </div>
                    </Fragment>
                );

                DIAS_SEMANA.forEach((dia, diaIdx) => {
                    const cellKey = `${ci}-${slotIdx}-${dia}`;
                    const slotStart = hora * 60 + minuto;
                    const slotEnd = slotStart + slotMinutes;

                    const cursosEnSlot = allSelected.filter(h => {
                        if (!h.dias.includes(dia)) return false;
                        const ini = mins(h.inicio);
                        const fin = mins(h.final);
                        return slotEnd > ini && slotStart < fin;
                    });

                    if (cursosEnSlot.length === 0) {
                        blocks.push(
                            <div key={`cell-${cellKey}`} className="schedule-cell" style={{ gridColumn: diaIdx + 2, gridRow: visualRow }}></div>
                        );
                    } else {
                        const seccion = cursosEnSlot[0];
                        const iniMin = mins(seccion.inicio);
                        const finMin = mins(seccion.final);
                        const isBlockStart = iniMin >= slotStart && iniMin < slotStart + slotMinutes;

                        if (isBlockStart) {
                            const gridStartSlot = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes);
                            const gridEndSlot = Math.ceil((finMin - HORA_INICIO * 60) / slotMinutes);
                            const originalRowSpan = Math.max(1, gridEndSlot - gridStartSlot);
                            const gridStart = currentRow;
                            const color = getCursoColor(seccion.codigo, activePalette);
                            const textColor = getTextColor(color);
                            const conf = hasConflict(seccion);
                            const borderColor = conf.status === 'error' ? '#dc2626' : conf.status === 'warning' ? '#d97706' : 'transparent';

                            const blockContent = (
                                <>
                                <span className="schedule-block-code">{seccion.codigo}-{seccion.seccion.trim() || '?'}</span>
                                <span className="schedule-block-name">{truncarNombre(seccion.nombre)}</span>
                                <span className="schedule-block-prof">{nombreCorto(seccion.catedratico)}</span>
                                <span className="schedule-block-bottom">
                                <span className="schedule-block-room">{seccion.salon}</span>
                                <span className="schedule-block-tipo">{tipoAbrev(seccion.tipo)}</span>
                                </span>
                                </>
                            );

                            const blockStyle = {
                                gridColumn: diaIdx + 2,
                                backgroundColor: color,
                                color: textColor,
                                border: `1px solid ${borderColor}`,
                                zIndex: 1,
                                position: 'relative'
                            };

                            const blockTitle = `${seccion.codigo} - ${seccion.seccion}\n${seccion.nombre}\n${seccion.inicio}-${seccion.final}\n${seccion.edificio} ${seccion.salon}\n${seccion.catedratico}`;

                            if (clusterEnabled && originalRowSpan > 6) {
                                const totalSpan = 3 + 1 + 2;
                                blocks.push(
                                    <div key={`block-${cellKey}`} className={`schedule-block ${esLaboratorio(seccion) ? 'lab' : ''}`}
                                    data-type={seccion.tipo} title={blockTitle}
                                    style={{ ...blockStyle, gridRow: `${gridStart} / span ${totalSpan}`, zIndex: 0 }}
                                    onClick={() => toggleSection(seccion)}>{blockContent}</div>
                                );
                            } else {
                                blocks.push(
                                    <div key={`block-${cellKey}`} className={`schedule-block ${esLaboratorio(seccion) ? 'lab' : ''}`}
                                    data-type={seccion.tipo} title={blockTitle}
                                    style={{ ...blockStyle, gridRow: `${gridStart} / span ${originalRowSpan}` }}
                                    onClick={() => toggleSection(seccion)}>{blockContent}</div>
                                );
                            }
                        } else {
                            blocks.push(
                                <div key={`span-${cellKey}`} className="schedule-cell" style={{ gridColumn: diaIdx + 2, gridRow: visualRow, visibility: 'hidden' }}></div>
                            );
                        }
                    }
                });
                currentRow++;
            }

            // currentRow already incremented per slot above
        }

        return blocks;
    }

    return (
        <div className="schedule-container">
        <div className="schedule-toolbar">
        <div className="schedule-toolbar-title">
        <Calendar size={18} />
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
            <span className="sm:hidden">{p.id === 'semestre' ? 'Sem' : 'Vac'}</span>
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
          {clusterEnabled ? 'Compacto' : 'Completo'}
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
        <div className="schedule-search">
        <Search size={14} />
        <input
        type="text"
         placeholder="Buscar código o nombre..."
        value={courseSearch}
        onChange={e => setCourseSearch(e.target.value)}
        />
        </div>
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
                <div className="schedule-course-color"></div>
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
                    {curso.secciones.map(sec => {
                        const selected = isSectionSelected(sec);
                        const conf = hasConflict(sec);
                        return (
                            <div
                            key={`${sec.codigo}-${sec.seccion}-${sec.inicio}-${sec.dias[0]||''}`}
                            className={`schedule-section-item ${selected ? 'selected' : ''}`}
                            onClick={() => toggleSection(sec)}
                            >
                            <div className="schedule-section-check">
                            {selected && <Check size={10} />}
                            </div>
                            {sec.tipo && sec.tipo !== 'MAGISTRAL' && (
                                <span className={`schedule-section-badge type-${tipoAbrev(sec.tipo).toLowerCase()}`}>{tipoAbrev(sec.tipo)}</span>
                            )}
                            <div className="schedule-section-info">
                            <span className="schedule-section-time">
                            <span className="schedule-section-label">Sec. {sec.seccion.trim() || '?'}</span> {formatearHorario(sec)} · {sec.salon}
                            {sec.restricciones && <span className="schedule-section-restr">[Con restricciones]</span>}
                            </span>
                            <span className="schedule-section-prof">
                            {sec.catedratico} · {formatearDuracion(sec)}
                            </span>
                            </div>
                            {conf.status !== 'valid' && (
                                <span className={`schedule-section-status ${conf.status}`}>
                                {conf.status === 'error' ? <X size={10} /> : <AlertTriangle size={10} />}
                                </span>
                            )}
                            {conf.status === 'valid' && selected && (
                                <span className="schedule-section-status valid">
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
