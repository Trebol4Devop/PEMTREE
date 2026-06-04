import { useState, useEffect, useMemo, Fragment } from 'react';
import { Calendar, Download, RefreshCw, Search, AlertTriangle, Check, X, ChevronRight, Clock } from 'lucide-react';
import {
    cargarHorarios,
    minutos as mins,
    calcularTraslapeMinutos,
    esLaboratorio,
    validarHorarioCompleto,
    formatearHorario,
    formatearDuracion
} from '../modules/data/scraper';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const HORA_INICIO = 6;
const HORA_FIN = 22;
const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2;

const PERIODS = [
    { id: 'semestre', label: 'Semestre' },
    { id: 'vacaciones', label: 'Vacaciones' },
];

const PALETA = [
    '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777',
    '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#be123c', '#0d9488',
    '#b45309', '#9333ea', '#0284c7', '#16a34a', '#e11d48', '#ca8a04'
];

function getCursoColor(codigo) {
    let hash = 0;
    for (let i = 0; i < codigo.length; i++) {
        hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETA[Math.abs(hash) % PALETA.length];
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

export default function ScheduleBuilder() {
    const [currentPeriod, setCurrentPeriod] = useState('semestre');
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSections, setSelectedSections] = useState({});
    const [expandedCourses, setExpandedCourses] = useState({});
    const [courseSearch, setCourseSearch] = useState('');
    const [modalidadFilter, setModalidadFilter] = useState('todas');

    const isVacaciones = currentPeriod.startsWith('vacaciones');

    useEffect(() => {
        loadHorarios(currentPeriod);
    }, [currentPeriod]);

    async function loadHorarios(periodId) {
        setLoading(true);
        setError(null);
        try {
            const data = await cargarHorarios(periodId);
            setHorarios(data || []);
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

    function toggleSection(seccion) {
        setSelectedSections(prev => {
            const key = seccion.codigo;
            const existing = prev[key] || [];
            const isSelected = existing.some(s => s.codigo + s.seccion === seccion.codigo + seccion.seccion);
            
            if (isSelected) {
                return { ...prev, [key]: existing.filter(s => s.codigo + s.seccion !== seccion.codigo + seccion.seccion) };
            } else {
                return { ...prev, [key]: [seccion] };
            }
        });
    }

    function isSectionSelected(seccion) {
        const key = seccion.codigo;
        const existing = selectedSections[key] || [];
        return existing.some(s => s.codigo + s.seccion === seccion.codigo + seccion.seccion);
    }

    function toggleCourseExpand(codigo) {
        setExpandedCourses(prev => ({ ...prev, [codigo]: !prev[codigo] }));
    }

    function exportSchedule() {
        const data = {
            periodo: currentPeriod,
            cursos: allSelected.map(c => ({
                codigo: c.codigo,
                nombre: c.nombre,
                seccion: c.seccion,
                tipo: c.tipo,
                horario: formatearHorario(c),
                edificio: c.edificio,
                salon: c.salon,
                catedratico: c.catedratico,
                duracion: formatearDuracion(c)
            })),
            validacion: validation
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `horario_${currentPeriod}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function renderGrid() {
        const blocks = [];
        const slotMinutes = 30;

        for (let slotIdx = 0; slotIdx < TOTAL_SLOTS; slotIdx++) {
            const hora = HORA_INICIO + Math.floor(slotIdx / 2);
            const minuto = (slotIdx % 2) * 30;
            const esHoraExacta = minuto === 0;

            blocks.push(
                <Fragment key={`time-${slotIdx}`}>
                    {esHoraExacta && (
                        <div className="schedule-cell schedule-time-cell" style={{ gridColumn: 1, gridRow: slotIdx + 2 }}>
                            {String(hora).padStart(2, '0')}:00
                        </div>
                    )}
                    {!esHoraExacta && (
                        <div className="schedule-cell schedule-time-cell" style={{ gridColumn: 1, gridRow: slotIdx + 2 }}></div>
                    )}
                </Fragment>
            );

            DIAS_SEMANA.forEach((dia, diaIdx) => {
                const cellKey = `${slotIdx}-${dia}`;
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
                        <div key={`cell-${cellKey}`} className="schedule-cell" style={{ gridColumn: diaIdx + 2, gridRow: slotIdx + 2 }}></div>
                    );
                } else {
                    const seccion = cursosEnSlot[0];
                    const iniMin = mins(seccion.inicio);
                    const finMin = mins(seccion.final);
                    const isBlockStart = iniMin >= slotStart && iniMin < slotStart + slotMinutes;
                    
                    if (isBlockStart) {
                        const totalDuration = finMin - iniMin;
                        const rowSpan = Math.max(1, Math.ceil(totalDuration / slotMinutes));
                        const color = getCursoColor(seccion.codigo);
                        const conf = hasConflict(seccion);
                        const borderColor = conf.status === 'error' ? '#dc2626' : conf.status === 'warning' ? '#d97706' : 'transparent';
                        const gridStart = Math.floor((iniMin - HORA_INICIO * 60) / slotMinutes) + 2;

                        blocks.push(
                            <div
                                key={`block-${cellKey}`}
                                className={`schedule-block ${esLaboratorio(seccion) ? 'lab' : ''}`}
                                data-type={seccion.tipo}
                                style={{
                                    gridColumn: diaIdx + 2,
                                    gridRow: `${gridStart} / span ${rowSpan}`,
                                    backgroundColor: color,
                                    border: `1px solid ${borderColor}`,
                                    zIndex: 1,
                                    position: 'relative'
                                }}
                                title={`${seccion.codigo} - ${seccion.seccion}\n${seccion.nombre}\n${seccion.inicio}-${seccion.final}\n${seccion.edificio} ${seccion.salon}\n${seccion.catedratico}`}
                                onClick={() => toggleSection(seccion)}
                            >
                                <span className="schedule-block-code">{seccion.codigo}-{seccion.seccion.trim() || '?'}</span>
                                <span className="schedule-block-prof">{nombreCorto(seccion.catedratico)}</span>
                                <span className="schedule-block-bottom">
                                    <span className="schedule-block-room">{seccion.salon}</span>
                                    <span className="schedule-block-tipo">{tipoAbrev(seccion.tipo)}</span>
                                </span>
                            </div>
                        );
                    } else {
                        blocks.push(
                            <div key={`span-${cellKey}`} className="schedule-cell" style={{ gridColumn: diaIdx + 2, gridRow: slotIdx + 2, visibility: 'hidden' }}></div>
                        );
                    }
                }
            });
        }

        return blocks;
    }

    return (
        <div className="schedule-container">
            <div className="schedule-toolbar">
                <div className="schedule-toolbar-title">
                    <Calendar size={18} />
                    <h3>Armador de Horarios</h3>
                </div>

                <div className="schedule-period-tabs">
                    {PERIODS.map(p => (
                        <button
                            key={p.id}
                            className={`schedule-period-tab ${currentPeriod === p.id ? 'active' : ''}`}
                            onClick={() => setCurrentPeriod(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="schedule-toolbar-actions">
                    <button className="schedule-btn" onClick={() => loadHorarios(currentPeriod)} title="Recargar">
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                    <button className="schedule-btn" onClick={exportSchedule} disabled={allSelected.length === 0} title="Exportar">
                        <Download size={14} />
                    </button>
                </div>
            </div>

            <div className="schedule-filters">
                <div className="schedule-search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Buscar curso por código o nombre..."
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
                    <div className="schedule-grid-container">
                        <div className="schedule-grid" style={{ display: 'grid', gridTemplateColumns: `50px repeat(7, 1fr)` }}>
                            <div className="schedule-cell schedule-header-cell"></div>
                            {DIAS_SEMANA.map(dia => (
                                <div key={dia} className="schedule-cell schedule-header-cell">
                                    {dia.substring(0, 3).toUpperCase()}
                                </div>
                            ))}
                            {renderGrid()}
                        </div>
                    </div>

                    <div className="schedule-sidebar">
                        <div className="schedule-course-list">
                            {filteredCourses.map(curso => (
                                <div key={curso.codigo} className="schedule-course-item">
                                    <div
                                        className="schedule-course-header"
                                        onClick={() => toggleCourseExpand(curso.codigo)}
                                    >
                                        <div
                                            className="schedule-course-color"
                                            style={{ backgroundColor: getCursoColor(curso.codigo) }}
                                        ></div>
                                        <div className="schedule-course-info">
                                            <span className="schedule-course-code">{curso.codigo}</span>
                                            <span className="schedule-course-name">{curso.nombre}</span>
                                        </div>
                                        <ChevronRight
                                            size={14}
                                            style={{
                                                transform: expandedCourses[curso.codigo] ? 'rotate(90deg)' : 'none',
                                                transition: 'transform 0.15s'
                                            }}
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
                                                         <div className="schedule-section-info">
                                                            <span className="schedule-section-time">
                                                                {formatearHorario(sec)} · {sec.salon}
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
        </div>
    );
}