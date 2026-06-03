let cachedData = {};

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const TIPO_LAB = 'LABORATORIO';
const TIPOS_NO_LAB = ['MAGISTRAL', 'TRABAJO_DIRIGIDO', 'DIBUJO', 'PRACTICA'];

export async function cargarHorarios(periodId) {
    if (cachedData[periodId]) return cachedData[periodId];
    
    const response = await fetch(`/json/horarios/${periodId}.json`);
    if (!response.ok) throw new Error(`No se pudo cargar ${periodId}`);
    
    const data = await response.json();
    cachedData[periodId] = data;
    return data;
}

export async function cargarTodosLosHorarios() {
    const [s1, s2, v1, v2] = await Promise.all([
        cargarHorarios('semestre1').catch(() => []),
        cargarHorarios('semestre2').catch(() => []),
        cargarHorarios('vacaciones1').catch(() => []),
        cargarHorarios('vacaciones2').catch(() => [])
    ]);
    
    return { semestre1: s1, semestre2: s2, vacaciones1: v1, vacaciones2: v2 };
}

export function getTipo(horario) {
    return horario.tipo || 'MAGISTRAL';
}

export function esLaboratorio(horario) {
    return getTipo(horario) === TIPO_LAB;
}

export function esNoLaboratorio(horario) {
    return TIPOS_NO_LAB.includes(getTipo(horario));
}

export function minutos(hora) {
    if (!hora || typeof hora !== 'string') return 0;
    const [h, m] = hora.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

export function duracionMinutos(horario) {
    return minutos(horario.final) - minutos(horario.inicio);
}

export function calcularTraslapeMinutos(h1, h2) {
    const diasComunes = (h1.dias || []).filter(d => (h2.dias || []).includes(d));
    if (diasComunes.length === 0) return 0;
    
    const ini1 = minutos(h1.inicio);
    const fin1 = minutos(h1.final);
    const ini2 = minutos(h2.inicio);
    const fin2 = minutos(h2.final);
    
    if (fin1 <= ini2 || fin2 <= ini1) return 0;
    
    return Math.min(fin1, fin2) - Math.max(ini1, ini2);
}

export function hayTraslape(h1, h2) {
    return calcularTraslapeMinutos(h1, h2) > 0;
}

function agruparPorDia(horarios) {
    const porDia = {};
    for (const dia of DIAS_SEMANA) porDia[dia] = [];
    
    for (const h of horarios) {
        for (const dia of (h.dias || [])) {
            if (porDia[dia]) porDia[dia].push(h);
        }
    }
    return porDia;
}

export function detectarConflictosSemestral(horarios) {
    const conflictos = [];
    const traslapesMenores = [];
    const porDia = agruparPorDia(horarios);
    
    for (const [dia, cursos] of Object.entries(porDia)) {
        if (cursos.length < 2) continue;
        
        for (let i = 0; i < cursos.length; i++) {
            for (let j = i + 1; j < cursos.length; j++) {
                const a = cursos[i];
                const b = cursos[j];
                
                // Labs siempre permitidos
                if (esLaboratorio(a) || esLaboratorio(b)) continue;
                
                const traslape = calcularTraslapeMinutos(a, b);
                if (traslape === 0) continue;
                
                const info = { dia, curso1: a, curso2: b, minutos: traslape };
                
                if (traslape >= 50) {
                    conflictos.push(info);
                } else {
                    traslapesMenores.push(info);
                }
            }
        }
    }
    
    return {
        conflictos,
        traslapesMenores50: traslapesMenores,
        tieneTraslapeMayor50: conflictos.length > 0,
        unicoTraslapeMenor50: traslapesMenores.length === 1 ? traslapesMenores[0] : null
    };
}

export function validarReglasVacaciones(horarios) {
    const errores = [];
    const porDia = agruparPorDia(horarios);
    
    for (const [dia, cursos] of Object.entries(porDia)) {
        const noLabs = cursos.filter(esNoLaboratorio);
        
        // Verificar traslapes entre no-labs (no permitido ninguno)
        for (let i = 0; i < noLabs.length; i++) {
            for (let j = i + 1; j < noLabs.length; j++) {
                if (hayTraslape(noLabs[i], noLabs[j])) {
                    errores.push({
                        tipo: 'TRASLAPE',
                        dia,
                        curso1: noLabs[i],
                        curso2: noLabs[j]
                    });
                }
            }
        }
        
        // Verificar límite de 4 horas (solo no-labs cuentan)
        let totalMinutos = 0;
        for (const c of noLabs) {
            totalMinutos += duracionMinutos(c);
        }
        
        const horas = totalMinutos / 60;
        if (horas > 4) {
            errores.push({
                tipo: 'LIMITE_HORAS',
                dia,
                horas: parseFloat(horas.toFixed(2)),
                max: 4
            });
        }
    }
    
    return {
        errores,
        tieneErrores: errores.length > 0,
        traslapes: errores.filter(e => e.tipo === 'TRASLAPE'),
        limitesHoras: errores.filter(e => e.tipo === 'LIMITE_HORAS')
    };
}

export function validarHorarioCompleto(horarios, esVacaciones) {
    if (esVacaciones) {
        return validarReglasVacaciones(horarios);
    }
    return detectarConflictosSemestral(horarios);
}

export function buscarHorariosPorCodigo(horarios, codigo) {
    return horarios.filter(h => h.codigo === codigo);
}

export function getSeccionesDisponibles(horarios, codigo) {
    return buscarHorariosPorCodigo(horarios, codigo);
}

export function formatearHorario(horario) {
    const diasStr = (horario.dias || []).map(d => d.substring(0, 2).toUpperCase()).join(' ');
    return `${diasStr} ${horario.inicio}-${horario.final}`;
}

export function formatearDuracion(horario) {
    const min = duracionMinutos(horario);
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}