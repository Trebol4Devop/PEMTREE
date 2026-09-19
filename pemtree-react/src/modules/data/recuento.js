// modules/data/recuento.js - Lógica y consolidación de datos para la sección Recuento
//
// Módulo JS puro sin JSX ni efectos secundarios en StorageManager.
// Lee el catálogo, estado de cursos, plan académico, horario armado y avisos
// para construir un resumen unificado del avance del estudiante.

import {
    cursos,
    cursoMap,
    initializeCursos,
    loadPensum,
    getPensumKey,
    STARTUP_LOADED_PENSUM
} from './cursos';
import {
    cargarCatalogo,
    getCarreraDePensum,
    getPensumInfo
} from './catalogo';
import {
    advertenciasDeCurso,
    totalMagistralVacaciones,
    tipoPeriodoDeBloque
} from './plannerWarnings';

/**
 * Prepara el entorno cargando el catálogo y el pensum actual o guardado.
 * No llama a StorageManager.cargarProgreso para evitar alterar el estado global.
 * @returns {Promise<{ catalogo: object, cursos: Array, cursoMap: Map, pensumFile: string }>}
 */
export async function prepararRecuento() {
    const catalogo = await cargarCatalogo();
    if (!cursos || cursos.length === 0) {
        await initializeCursos();
    }
    // Normalizar el pensum guardado: puede venir como '/json/x.json' o 'x'
    const guardado = localStorage.getItem('pemtree_pensum_actual') || '';
    const fileGuardado = guardado.split('/').pop().replace(/\.json$/i, '');
    const fileActual = (getPensumKey() || '').replace(/\.json$/i, '');
    if (fileGuardado && fileGuardado !== fileActual) {
        try {
            await loadPensum(`/json/${fileGuardado}.json`);
        } catch (e) {
            console.warn('Recuento: no se pudo cargar el pensum guardado, se usa el actual', e);
        }
    }
    const pensumFile = (STARTUP_LOADED_PENSUM || '').split('/').pop();
    return { catalogo, cursos, cursoMap, pensumFile };
}

/**
 * Determina el periodo académico actual según la fecha del sistema:
 * - Vacaciones: 1 dic - 31 dic (par), 1 jun - 30 jun (impar)
 * - Semestres: 15 ene - 15 may (impar), 15 jul - 15 nov (par)
 * @param {Date|string|number} [fecha=new Date()]
 */
export function obtenerPeriodoAcademicoActual(fecha = new Date()) {
    const d = new Date(fecha);
    const m = d.getMonth() + 1; // 1-12
    const dia = d.getDate(); // 1-31

    // 1 de diciembre a 31 de diciembre: Vacaciones de Diciembre (Par)
    if (m === 12) {
        return {
            tipoPeriodo: 'vacaciones-par',
            schedulePeriod: 'vacaciones2',
            tipo: 'vacaciones',
            paridad: 'par',
            nombre: 'Vacaciones de Diciembre (Par)',
            etiquetaCorta: 'Vacaciones Par'
        };
    }

    // 1 de enero a 15 de mayo: Semestre Impar (Primer Semestre)
    // (del 1 al 14 de enero es interciclo preparativo hacia Semestre 1)
    if (m >= 1 && m <= 4) {
        return {
            tipoPeriodo: 'semestre-impar',
            schedulePeriod: 'semestre1',
            tipo: 'semestre',
            paridad: 'impar',
            nombre: 'Primer Semestre (Impar)',
            etiquetaCorta: 'Semestre Impar'
        };
    }
    if (m === 5) {
        if (dia <= 15) {
            return {
                tipoPeriodo: 'semestre-impar',
                schedulePeriod: 'semestre1',
                tipo: 'semestre',
                paridad: 'impar',
                nombre: 'Primer Semestre (Impar)',
                etiquetaCorta: 'Semestre Impar'
            };
        } else {
            // 16 a 31 de mayo: previo a vacaciones de junio
            return {
                tipoPeriodo: 'vacaciones-impar',
                schedulePeriod: 'vacaciones1',
                tipo: 'vacaciones',
                paridad: 'impar',
                nombre: 'Vacaciones de Junio (Impar)',
                etiquetaCorta: 'Vacaciones Impar'
            };
        }
    }

    // 1 de junio a 30 de junio: Vacaciones de Junio (Impar)
    if (m === 6) {
        return {
            tipoPeriodo: 'vacaciones-impar',
            schedulePeriod: 'vacaciones1',
            tipo: 'vacaciones',
            paridad: 'impar',
            nombre: 'Vacaciones de Junio (Impar)',
            etiquetaCorta: 'Vacaciones Impar'
        };
    }

    // 1 de julio a 15 de noviembre: Semestre Par (Segundo Semestre)
    // (del 1 al 14 de julio es interciclo preparativo hacia Semestre 2)
    if (m >= 7 && m <= 10) {
        return {
            tipoPeriodo: 'semestre-par',
            schedulePeriod: 'semestre2',
            tipo: 'semestre',
            paridad: 'par',
            nombre: 'Segundo Semestre (Par)',
            etiquetaCorta: 'Semestre Par'
        };
    }
    if (m === 11) {
        if (dia <= 15) {
            return {
                tipoPeriodo: 'semestre-par',
                schedulePeriod: 'semestre2',
                tipo: 'semestre',
                paridad: 'par',
                nombre: 'Segundo Semestre (Par)',
                etiquetaCorta: 'Semestre Par'
            };
        } else {
            // 16 a 30 de noviembre: previo a vacaciones de diciembre
            return {
                tipoPeriodo: 'vacaciones-par',
                schedulePeriod: 'vacaciones2',
                tipo: 'vacaciones',
                paridad: 'par',
                nombre: 'Vacaciones de Diciembre (Par)',
                etiquetaCorta: 'Vacaciones Par'
            };
        }
    }

    return {
        tipoPeriodo: 'semestre-par',
        schedulePeriod: 'semestre2',
        tipo: 'semestre',
        paridad: 'par',
        nombre: 'Segundo Semestre (Par)',
        etiquetaCorta: 'Semestre Par'
    };
}

export function tipoPeriodoASchedulePeriod(tipoPeriodo) {
    switch (tipoPeriodo) {
        case 'semestre-impar':
            return 'semestre1';
        case 'semestre-par':
            return 'semestre2';
        case 'vacaciones-impar':
            return 'vacaciones1';
        case 'vacaciones-par':
            return 'vacaciones2';
        default:
            return 'semestre1';
    }
}

/**
 * Calcula la duración en horas entre dos cadenas 'HH:MM'.
 */
function duracionHoras(inicio, final) {
    if (!inicio || !final) return 0;
    const [h1, m1] = String(inicio).split(':').map(Number);
    const [h2, m2] = String(final).split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const min1 = h1 * 60 + m1;
    const min2 = h2 * 60 + m2;
    const diff = min2 - min1;
    return diff > 0 ? diff / 60 : 0;
}

/**
 * Construye síncronamente el objeto de recuento a partir del estado actual y localStorage.
 * @param {{ catalogo: object, cursos: Array, cursoMap: Map, pensumFile: string }} param0
 */
export function buildRecuento({ catalogo, cursos = [], cursoMap = new Map(), pensumFile }) {
    void catalogo;
    const file = pensumFile || (STARTUP_LOADED_PENSUM || '').split('/').pop() || null;
    const key = getPensumKey() || (file ? file.replace(/\.json$/i, '') : 'default');
    const carrera = file ? getCarreraDePensum(file) : null;
    const pensumInfo = file ? getPensumInfo(file) : null;

    // 1. Progreso
    let estadoPorId = new Map();
    try {
        const raw = localStorage.getItem(`pemtree_progreso_${key}`);
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
                arr.forEach(item => {
                    if (item && item.id != null) {
                        estadoPorId.set(item.id, {
                            completado: Boolean(item.completado),
                            cursando: Boolean(item.cursando)
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Recuento: error leyendo progreso de localStorage', e);
    }

    const idiomaEquivalencia = localStorage.getItem('pemtree_idioma_equivalencia') === 'true';

    let totalCreditos = 0;
    let creditosAprobados = 0;
    let creditosEnCurso = 0;
    let aprobados = 0;
    let enCurso = 0;
    let disponibles = 0;
    const totalCursos = (cursos || []).length;

    const obligatorios = { total: 0, aprobados: 0, creditosTotal: 0, creditosAprobados: 0 };
    const optativos = { total: 0, aprobados: 0, creditosTotal: 0, creditosAprobados: 0 };
    const semestreMap = new Map();

    for (const c of cursos) {
        const cr = Number(c.creditos) || 0;
        totalCreditos += cr;

        if (c.obligatorio) {
            obligatorios.total++;
            obligatorios.creditosTotal += cr;
        } else {
            optativos.total++;
            optativos.creditosTotal += cr;
        }

        if (c.semestre && c.semestre >= 1) {
            if (!semestreMap.has(c.semestre)) {
                semestreMap.set(c.semestre, {
                    semestre: c.semestre,
                    total: 0,
                    aprobados: 0,
                    enCurso: 0,
                    creditosTotal: 0,
                    creditosAprobados: 0,
                    obligatoriosTotal: 0,
                    obligatoriosAprobados: 0,
                    obligatoriosEnCurso: 0,
                    optativosTotal: 0,
                    optativosAprobados: 0,
                    optativosEnCurso: 0,
                    creditosObligatoriosTotal: 0,
                    creditosObligatoriosAprobados: 0,
                    creditosOptativosTotal: 0,
                    creditosOptativosAprobados: 0
                });
            }
            const s = semestreMap.get(c.semestre);
            s.total++;
            s.creditosTotal += cr;
            if (c.obligatorio) {
                s.obligatoriosTotal++;
                s.creditosObligatoriosTotal += cr;
            } else {
                s.optativosTotal++;
                s.creditosOptativosTotal += cr;
            }
        }

        const estado = estadoPorId.get(c.id);
        const isCompletado = Boolean(estado?.completado);
        const isAprobado = isCompletado || (idiomaEquivalencia && Boolean(c.esIdiomaTecnico));
        const isCursando = !isAprobado && Boolean(estado?.cursando);

        if (isAprobado) {
            aprobados++;
            creditosAprobados += cr;
            if (c.obligatorio) {
                obligatorios.aprobados++;
                obligatorios.creditosAprobados += cr;
            } else {
                optativos.aprobados++;
                optativos.creditosAprobados += cr;
            }
            if (c.semestre && c.semestre >= 1) {
                const s = semestreMap.get(c.semestre);
                if (s) {
                    s.aprobados++;
                    s.creditosAprobados += cr;
                    if (c.obligatorio) {
                        s.obligatoriosAprobados++;
                        s.creditosObligatoriosAprobados += cr;
                    } else {
                        s.optativosAprobados++;
                        s.creditosOptativosAprobados += cr;
                    }
                }
            }
        } else if (isCursando) {
            enCurso++;
            creditosEnCurso += cr;
            if (c.semestre && c.semestre >= 1) {
                const s = semestreMap.get(c.semestre);
                if (s) {
                    s.enCurso++;
                    if (c.obligatorio) {
                        s.obligatoriosEnCurso++;
                    } else {
                        s.optativosEnCurso++;
                    }
                }
            }
        } else {
            let disp = true;
            if (Array.isArray(c.prerequisitos) && c.prerequisitos.length > 0) {
                disp = c.prerequisitos.every(pid => {
                    const pEstado = estadoPorId.get(pid);
                    const pCurso = cursoMap.get(pid);
                    return Boolean(pEstado?.completado) || (idiomaEquivalencia && Boolean(pCurso?.esIdiomaTecnico));
                });
            }
            if (disp) {
                disponibles++;
            }
        }
    }

    const bloqueados = Math.max(0, totalCursos - aprobados - enCurso - disponibles);
    const porcentaje = totalCreditos > 0 ? Math.round((creditosAprobados / totalCreditos) * 100) : 0;
    const porSemestre = Array.from(semestreMap.values()).sort((a, b) => a.semestre - b.semestre);

    // 2. Plan
    let linesRaw = null;
    try {
        const raw = localStorage.getItem(`pemtree_plan_lines_${key}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                linesRaw = parsed;
            }
        }
    } catch (e) {
        console.warn('Recuento: error leyendo líneas de plan', e);
    }

    if (!linesRaw) {
        try {
            const oldRaw = localStorage.getItem(`pemtree_plan_${key}`);
            if (oldRaw) {
                const parsedOld = JSON.parse(oldRaw);
                if (parsedOld && typeof parsedOld === 'object' && Object.keys(parsedOld).length > 0) {
                    linesRaw = [{
                        id: 'legacy',
                        name: 'Línea 1',
                        plan: parsedOld,
                        semesterCount: 3,
                        hiddenVacations: []
                    }];
                }
            }
        } catch (e) {
            console.warn('Recuento: error leyendo plan legacy', e);
        }
    }

    let suficiencias = [];
    try {
        const rawSuf = localStorage.getItem(`pemtree_suficiencias_${key}`);
        if (rawSuf) {
            const parsedSuf = JSON.parse(rawSuf);
            if (Array.isArray(parsedSuf)) suficiencias = parsedSuf;
        }
    } catch {
        suficiencias = [];
    }
    const sufSet = new Set(suficiencias);

    const promedioRaw = localStorage.getItem(`pemtree_promedio_${key}`);
    const parsedPromedio = promedioRaw !== null ? parseFloat(promedioRaw) : NaN;
    const promedio = !isNaN(parsedPromedio) ? parsedPromedio : null;

    const simultanea = localStorage.getItem(`pemtree_simultaneous_${key}`) === 'true';
    const actualizadoEl = localStorage.getItem(`pemtree_plan_updated_${key}`) || null;

    const periodoActual = obtenerPeriodoAcademicoActual();

    const lineas = [];
    if (Array.isArray(linesRaw)) {
        for (const line of linesRaw) {
            const semesterCount = typeof line.semesterCount === 'number' ? line.semesterCount : 3;
            const hiddenVac = Array.isArray(line.hiddenVacations) ? line.hiddenVacations : [];
            const blocks = [];
            let lineCredits = 0;

            for (let i = 1; i <= semesterCount; i++) {
                // Semestre
                const semId = `sem-${i}`;
                const semCourseIds = (line.plan && Array.isArray(line.plan[semId])) ? line.plan[semId] : [];
                const semCourses = [];
                let semCredits = 0;
                for (const cid of semCourseIds) {
                    const c = cursoMap.get(cid);
                    if (c) {
                        semCourses.push({ id: c.id, codigo: c.codigo, nombre: c.nombre, creditos: c.creditos });
                        if (!sufSet.has(cid)) {
                            semCredits += Number(c.creditos) || 0;
                        }
                    }
                }
                const semParidad = i % 2 === 1 ? 'impar' : 'par';
                const semTipoPeriodo = `semestre-${semParidad}`;
                const semEsPeriodoActual = (semTipoPeriodo === periodoActual.tipoPeriodo);
                if (semCourses.length > 0) {
                    blocks.push({
                        blockId: semId,
                        tipo: 'semestre',
                        numero: i,
                        paridad: semParidad,
                        tipoPeriodo: semTipoPeriodo,
                        esPeriodoActual: semEsPeriodoActual,
                        cursos: semCourses,
                        creditos: semCredits
                    });
                    lineCredits += semCredits;
                }

                // Vacaciones
                if (!hiddenVac.includes(i)) {
                    const vacId = `vac-${i}`;
                    const vacCourseIds = (line.plan && Array.isArray(line.plan[vacId])) ? line.plan[vacId] : [];
                    const vacCourses = [];
                    let vacCredits = 0;
                    for (const cid of vacCourseIds) {
                        const c = cursoMap.get(cid);
                        if (c) {
                            vacCourses.push({ id: c.id, codigo: c.codigo, nombre: c.nombre, creditos: c.creditos });
                            if (!sufSet.has(cid)) {
                                vacCredits += Number(c.creditos) || 0;
                            }
                        }
                    }
                    const vacParidad = i % 2 === 1 ? 'impar' : 'par';
                    const vacTipoPeriodo = `vacaciones-${vacParidad}`;
                    const vacEsPeriodoActual = (vacTipoPeriodo === periodoActual.tipoPeriodo);
                    if (vacCourses.length > 0) {
                        blocks.push({
                            blockId: vacId,
                            tipo: 'vacaciones',
                            numero: i,
                            paridad: vacParidad,
                            tipoPeriodo: vacTipoPeriodo,
                            esPeriodoActual: vacEsPeriodoActual,
                            cursos: vacCourses,
                            creditos: vacCredits
                        });
                        lineCredits += vacCredits;
                    }
                }
            }

            lineas.push({
                id: line.id || 'line-1',
                name: line.name || 'Línea 1',
                blocks,
                totalCreditos: lineCredits
            });
        }
    }

    const existe = lineas.length > 0 && lineas.some(l => l.blocks.length > 0);
    const primeraLinea = lineas[0] || null;

    let bloqueActual = null;
    let esBloquePeriodoActual = false;

    if (primeraLinea && Array.isArray(primeraLinea.blocks)) {
        // Buscar el bloque de la primera línea que corresponda al periodo actual (par o impar)
        const matchingBlocks = primeraLinea.blocks.filter(b => b.tipoPeriodo === periodoActual.tipoPeriodo);
        if (matchingBlocks.length > 0) {
            // Preferir el primer bloque que tenga cursos no completados
            const pendiente = matchingBlocks.find(b => b.cursos.some(c => estadoPorId.get(c.id)?.completado !== true));
            bloqueActual = pendiente || matchingBlocks[0];
            esBloquePeriodoActual = true;
        }

        // Si no hay cursos planificados para este tipoPeriodo, tomar el primer bloque planificado
        if (!bloqueActual && primeraLinea.blocks.length > 0) {
            bloqueActual = primeraLinea.blocks[0];
            esBloquePeriodoActual = false;
        }
    }

    const planTotalCreditos = primeraLinea ? primeraLinea.totalCreditos : 0;
    const planTotalCursos = primeraLinea ? primeraLinea.blocks.reduce((acc, b) => acc + b.cursos.length, 0) : 0;

    // 3. Horario (determinado por el periodo académico activo según calendario de fechas)
    const periodoActivoScheduleId = periodoActual.schedulePeriod || tipoPeriodoASchedulePeriod(periodoActual.tipoPeriodo);

    const procesarHorarioPeriodo = (pId) => {
        let schObj = {};
        try {
            const rawSch = localStorage.getItem(`pemtree_schedule_${key}_${pId}`);
            if (rawSch) schObj = JSON.parse(rawSch) || {};
        } catch (e) {
            console.warn(`Recuento: error leyendo horario ${pId}`, e);
        }

        let cCount = 0;
        let sCount = 0;
        let tHoras = 0;
        const cursosList = [];

        for (const [code, arr] of Object.entries(schObj)) {
            if (Array.isArray(arr) && arr.length > 0) {
                cCount++;
                const cModel = cursos.find(c => String(c.codigo) === String(code));
                const secNombres = arr.map(s => s.seccion).filter(Boolean);
                cursosList.push({
                    codigo: code,
                    nombre: cModel?.nombre || `Curso ${code}`,
                    creditos: cModel?.creditos || 0,
                    secciones: secNombres,
                    totalSecciones: arr.length
                });

                for (const sec of arr) {
                    sCount++;
                    const diasCount = Array.isArray(sec.dias) && sec.dias.length > 0 ? sec.dias.length : 1;
                    const dur = duracionHoras(sec.inicio, sec.final);
                    tHoras += dur * diasCount;
                }
            }
        }

        return {
            periodo: pId,
            cursos: cCount,
            secciones: sCount,
            horasSemana: Math.round(tHoras * 10) / 10,
            cursosDetalle: cursosList
        };
    };

    const metricasPeriodoActivo = procesarHorarioPeriodo(periodoActivoScheduleId);

    const periodosHorario = {
        semestre1: procesarHorarioPeriodo('semestre1'),
        semestre2: procesarHorarioPeriodo('semestre2'),
        vacaciones1: procesarHorarioPeriodo('vacaciones1'),
        vacaciones2: procesarHorarioPeriodo('vacaciones2')
    };

    // 4. Avisos
    let avisos = [];
    try {
        if (primeraLinea && Array.isArray(primeraLinea.blocks)) {
            for (const b of primeraLinea.blocks) {
                const tp = tipoPeriodoDeBloque(b.blockId);
                if (tp) {
                    for (const c of b.cursos) {
                        const est = estadoPorId.get(c.id);
                        if (est?.completado !== true) {
                            const res = advertenciasDeCurso(c.codigo, tp);
                            if (res && Array.isArray(res.avisos) && res.avisos.length > 0) {
                                avisos.push({
                                    blockId: b.blockId,
                                    codigo: c.codigo,
                                    nombre: c.nombre,
                                    avisos: res.avisos.slice(0, 3)
                                });
                            }
                        }
                    }
                    if (b.tipo === 'vacaciones') {
                        const codigos = b.cursos.map(c => c.codigo);
                        const resMag = totalMagistralVacaciones(codigos, tp);
                        if (resMag && resMag.excede) {
                            avisos.push({
                                blockId: b.blockId,
                                codigo: '',
                                nombre: `Bloque ${b.blockId}`,
                                avisos: [{
                                    tipo: 'excesoMagistral',
                                    nivel: 'error',
                                    texto: 'Excede el máximo de 4h magistrales por día en vacaciones.'
                                }]
                            });
                        }
                    }
                }
            }
        }
        avisos = avisos.slice(0, 8);
    } catch (e) {
        console.warn('Recuento: error calculando avisos de recuento', e);
        avisos = [];
    }

    return {
        pensum: {
            file,
            key,
            carrera,
            pensumInfo
        },
        progreso: {
            idiomaEquivalencia,
            totalCreditos,
            creditosAprobados,
            creditosEnCurso,
            porcentaje,
            totalCursos,
            aprobados,
            enCurso,
            disponibles,
            bloqueados,
            obligatorios,
            optativos,
            porSemestre
        },
        plan: {
            existe,
            actualizadoEl,
            promedio,
            simultanea,
            totalCreditos: planTotalCreditos,
            totalCursos: planTotalCursos,
            lineas,
            proximoBloque: bloqueActual,
            bloqueActual,
            esBloquePeriodoActual,
            periodoActual,
            suficiencias
        },
        horario: {
            periodo: periodoActivoScheduleId,
            periodoActivo: periodoActivoScheduleId,
            nombrePeriodoActivo: periodoActual.nombre,
            paridad: periodoActual.paridad,
            cursos: metricasPeriodoActivo.cursos,
            secciones: metricasPeriodoActivo.secciones,
            horasSemana: metricasPeriodoActivo.horasSemana,
            cursosDetalle: metricasPeriodoActivo.cursosDetalle,
            periodos: periodosHorario,
            actualizadoEl: null
        },
        avisos
    };
}
