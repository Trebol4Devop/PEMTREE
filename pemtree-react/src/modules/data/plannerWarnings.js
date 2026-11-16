// modules/data/plannerWarnings.js
//
// Avisos del planificador basados en el catálogo:
//  - Apertura: ¿el curso abrió en el último ciclo registrado de su periodo (par/impar)?
//  - Traslapes: ¿el horario del curso (misma sección) tuvo traslapes en ese periodo?
//    Se clasifican con las reglas de horarios (lab/práctica permiten traslape).
//  - Reputación: ¿las recomendaciones de los catedráticos de ese ciclo son favorables?
//  - Vacaciones: horas de cursos MAGISTRALES por día (máx 4h; lab/práctica/complementarios no cuentan).

import { getCursoInfo, getCicloConDatos, getReputacionSeccion } from './catalogo';
import { calcularTraslapeMinutos, esTraslapePermitido, duracionMinutos } from './scraper';

const MAX_MAGISTRAL_VACACIONES = 4; // horas

/**
 * Tipo de periodo de un bloque del planificador: 'sem-1' -> 'semestre-impar'.
 */
export function tipoPeriodoDeBloque(blockId) {
    const m = /^(sem|vac)-(\d+)$/.exec(blockId || '');
    if (!m) return null;
    const n = parseInt(m[2], 10);
    const paridad = n % 2 === 1 ? 'impar' : 'par';
    return m[1] === 'sem' ? `semestre-${paridad}` : `vacaciones-${paridad}`;
}

/**
 * Avisos de un curso para un periodo concreto (usa el último ciclo con datos).
 * @returns {{avisos: Array<{tipo:string,nivel:'info'|'warn'|'error',texto:string}>, reputacion: object|null}}
 */
export function advertenciasDeCurso(codigo, tipoPeriodo) {
    const curso = getCursoInfo(codigo);
    if (!curso) return { avisos: [], reputacion: null };

    const cicloInfo = getCicloConDatos(tipoPeriodo);
    const cicloId = cicloInfo ? cicloInfo.cicloId : null;
    const avisos = [];

    // 1) Apertura en el último ciclo registrado del periodo
    if (cicloId) {
        const obs = (curso.observaciones || []).find(o => o.ciclo === cicloId && o.tipoPeriodo === tipoPeriodo);
        if (obs) {
            if (obs.abrio === false) {
                avisos.push({ tipo: 'noAbrio', nivel: 'error', texto: 'No abrió en el último ciclo registrado de este periodo.' });
            }
        } else if (!(curso.observaciones || []).some(o => o.tipoPeriodo === tipoPeriodo)) {
            avisos.push({ tipo: 'sinHistorial', nivel: 'info', texto: 'Sin historial de apertura en este periodo.' });
        }
    }

    // 2) Traslapes dentro de la misma sección (el horario real del estudiante)
    const secciones = (curso.secciones || []).filter(s => s.tipoPeriodo === tipoPeriodo && (!cicloId || s.ciclo === cicloId));
    const porSeccion = {};
    for (const s of secciones) (porSeccion[s.seccion] = porSeccion[s.seccion] || []).push(s);

    let traslapeNoPermitido = null;
    let traslapePermitido = null;
    for (const lista of Object.values(porSeccion)) {
        for (let i = 0; i < lista.length; i++) {
            for (let j = i + 1; j < lista.length; j++) {
                const min = calcularTraslapeMinutos(lista[i], lista[j]);
                if (min <= 0) continue;
                const permitido = esTraslapePermitido(lista[i]) || esTraslapePermitido(lista[j]);
                const info = { min, permitido, entre: `${lista[i].tipoSeccion} y ${lista[j].tipoSeccion}` };
                if (!permitido && !traslapeNoPermitido) traslapeNoPermitido = info;
                else if (permitido && !traslapePermitido) traslapePermitido = info;
            }
        }
    }
    if (traslapeNoPermitido) {
        avisos.push({
            tipo: 'traslapeNoPermitido',
            nivel: 'error',
            texto: `Su horario tuvo traslape de ${traslapeNoPermitido.min} min entre ${traslapeNoPermitido.entre} (no permitido).`,
        });
    } else if (traslapePermitido) {
        avisos.push({
            tipo: 'traslapePermitido',
            nivel: 'warn',
            texto: `Su horario tuvo traslape de ${traslapePermitido.min} min entre ${traslapePermitido.entre} (permitido por ser laboratorio/práctica).`,
        });
    }

    // 3) Reputación de las secciones de ese ciclo
    const pcts = [];
    const seccionesVistas = new Set();
    for (const s of secciones) {
        if (!s.seccion || seccionesVistas.has(s.seccion)) continue;
        seccionesVistas.add(s.seccion);
        const rep = getReputacionSeccion(codigo, s.seccion);
        if (rep && rep.total > 0 && rep.pct_recomienda != null) pcts.push(rep.pct_recomienda);
    }
    let reputacion = null;
    if (pcts.length > 0) {
        const promedio = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
        const niveles = pcts.map(p => (p >= 70 ? 'buena' : p >= 50 ? 'mixta' : 'mala'));
        let nivel;
        if (niveles.every(n => n === 'buena')) nivel = 'soloBuenos';
        else if (niveles.every(n => n === 'mala')) nivel = 'negativo';
        else nivel = 'variado';
        reputacion = { promedio, votantes: pcts.length, nivel };
        if (nivel === 'negativo') {
            avisos.push({ tipo: 'reputacionNegativa', nivel: 'warn', texto: `Recomendaciones desfavorables de sus secciones (${promedio}%).` });
        }
    }

    return { avisos, reputacion };
}

/**
 * Horas MAGISTRALES por día de un curso en un periodo de vacaciones
 * (máximo entre sus secciones; lab/práctica/complementarios no cuentan).
 * @returns {number} horas (0 si no tiene magistrales en el periodo)
 */
export function horasMagistralesCurso(codigo, tipoPeriodo) {
    if (!tipoPeriodo.startsWith('vacaciones')) return 0;
    const curso = getCursoInfo(codigo);
    if (!curso) return 0;
    const cicloInfo = getCicloConDatos(tipoPeriodo);
    const cicloId = cicloInfo ? cicloInfo.cicloId : null;
    const mags = (curso.secciones || []).filter(s =>
        s.tipoPeriodo === tipoPeriodo &&
        (!cicloId || s.ciclo === cicloId) &&
        s.tipoSeccion === 'MAGISTRAL'
    );
    let maxMin = 0;
    for (const m of mags) maxMin = Math.max(maxMin, duracionMinutos(m));
    return Math.round((maxMin / 60) * 100) / 100;
}

/**
 * Total de horas magistrales por día de un conjunto de cursos en un periodo
 * de vacaciones, y si excede el máximo permitido (4h).
 * @returns {{horas:number, max:number, excede:boolean}}
 */
export function totalMagistralVacaciones(codigos, tipoPeriodo) {
    const horas = (codigos || []).reduce((acc, c) => acc + horasMagistralesCurso(c, tipoPeriodo), 0);
    return {
        horas: Math.round(horas * 100) / 100,
        max: MAX_MAGISTRAL_VACACIONES,
        excede: horas > MAX_MAGISTRAL_VACACIONES,
    };
}
