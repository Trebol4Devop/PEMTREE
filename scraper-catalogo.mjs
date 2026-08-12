// scraper-catalogo.mjs
// Pipeline que procesa y organiza los datos dispersos (pensums, colores, horarios,
// catedráticos y auxiliares) en un único catálogo unificado: public/json/catalogo.json
//
// Schema v4: además de la apertura por (ciclo, tipoPeriodo), el catálogo unifica:
//   - `pensums[]`: registro de cada pensum con carrera, cohort, vigencia y clar
//     (metadata persistida por scraper-pensum.mjs en index.json).
//   - `cursos[].pensums[]`: datos por pensum (semestre, créditos, tipo, prerequisitos
//     y posrequisitos normalizados a códigos). Todos los cursos del pensum se siembran
//     aunque nunca hayan abierto (historial vacío).
//   - `cursos[].secciones[]`: horarios ACUMULADOS por ciclo con su `ciclo` explícito,
//     para conservar la última info aunque el portal la borre. Incluye tipoSeccion,
//     modalidad, días/horas, restricciones (bandera/placeholder), periodo_restriccion,
//     anio y referencias a docentes (catedraticoId/auxiliarId).
//   - `docentes[].cursos[].secciones[]`: asociación catedrático <-> curso <-> sección.
//   - `carreras[].cursos[]`: cierre carrera -> cursos.
// - Restricciones: el texto detallado se enriquece aparte (scraper-restricciones.mjs);
//   el pipeline conserva el texto enriquecido si el snapshot vuelve con solo la bandera.
// - Cada ejecución detecta un ciclo académico nuevo (id generado "ciclo-AAAA-N",
//   no existe identificador oficial) y hace merge del historial por "tipoPeriodo"
//   par/impar: semestre-impar, semestre-par, vacaciones-impar, vacaciones-par.
// - Las observaciones de curso son SOLO "abrió o no" por (ciclo, tipoPeriodo).
//   Los traslapes NO se calculan aquí (obedecen reglas específicas que se manejan aparte).
// - Idempotente por `lastRun` de horarios/index.json (re-ejecutar = no-op).
// - Archiva los snapshots crudos en horarios/history/<ciclo>_<tipoPeriodo>.json.
// - Depura docentes (catedráticos y auxiliares) que llevan DEPURAR_TRAS_CICLOS
//   ciclos sin aparecer: se marcan `activo:false` (nunca se borran).
//
// Uso: node scraper-catalogo.mjs [--force]   (desde la raíz del repo)
//   --force: procesa aunque lastRun no haya cambiado (regenera/reescribe).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_JSON = resolve(__dirname, 'pemtree-react', 'public', 'json');
const HORARIOS_DIR = join(PUBLIC_JSON, 'horarios');
const HISTORY_DIR = join(HORARIOS_DIR, 'history');
const PENSUM_COLOR_DIR = resolve(__dirname, 'pemtree-react', 'public', 'pensum_color');
const CATALOGO_PATH = join(PUBLIC_JSON, 'catalogo.json');

const SCHEMA_VERSION = 4;

// Umbrales configurables
const DEPURAR_TRAS_CICLOS = 3;          // ciclos consecutivos sin aparecer -> activo:false

const FUENTES = ['semestre1', 'semestre2', 'vacaciones1', 'vacaciones2'];
const TIPO_PERIODOS_ORDER = ['semestre-impar', 'semestre-par', 'vacaciones-impar', 'vacaciones-par'];

const TIPO_PERIODO_POR_FUENTE = {
    semestre1: 'semestre-impar',
    semestre2: 'semestre-par',
    vacaciones1: 'vacaciones-impar',
    vacaciones2: 'vacaciones-par',
};

const FORCE = process.argv.includes('--force');

// ---------- Helpers ----------

function leerJSON(ruta, fallback) {
    try {
        if (!existsSync(ruta)) return fallback;
        return JSON.parse(readFileSync(ruta, 'utf-8'));
    } catch (e) {
        console.warn(`  [WARN] No se pudo leer ${ruta}: ${e.message}`);
        return fallback;
    }
}

function escribirJSON(ruta, data) {
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// Nombres: mayúsculas, espacios colapsados, recortado.
function normalizarNombre(n) {
    if (!n) return '';
    return String(n).replace(/\s+/g, ' ').trim().toUpperCase();
}

// Clave de matching: sin acentos, minúsculas (permite unificar variantes).
function claveNombre(n) {
    return normalizarNombre(n)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function slugClave(clave) {
    return clave.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function tipoPeriodoDeFuente(fuente) {
    return TIPO_PERIODO_POR_FUENTE[fuente] || null;
}

function esDocente(nombre) {
    if (!nombre) return false;
    const n = normalizarNombre(nombre);
    return n !== '' && n !== 'STAFF' && n !== 'SIN AUXILIAR';
}

function ordenCiclo(a, b) {
    return a.replace('ciclo-', '').localeCompare(b.replace('ciclo-', ''), undefined, { numeric: true });
}

function ordenTipoPeriodo(a, b) {
    return TIPO_PERIODOS_ORDER.indexOf(a) - TIPO_PERIODOS_ORDER.indexOf(b);
}

// ---------- Helpers del modelo v4 ----------

// Año del ciclo "ciclo-2026-1" -> "2026" (equivale al `anio` que usa el portal para restricciones)
function anioDeCiclo(cicloId) {
    const m = String(cicloId).match(/^ciclo-(\d{4})-/);
    return m ? m[1] : null;
}

// Cohort del pensum desde el filename (_25, _22, _2017, _ant*) con fallback a ANTERIOR
function derivarCohort(file) {
    const stem = file.replace(/\.json$/i, '');
    const m = stem.match(/_(20\d{2})$/);
    if (m) return m[1];
    if (/_25$/.test(stem)) return '2025';
    if (/_22$/.test(stem)) return '2022';
    return 'ANTERIOR';
}

// Id determinista de un docente (misma regla que construirDocentesDesdeSnapshots),
// permite referenciar docentes desde las secciones sin esperar a tener el mapa completo.
function docenteIdDe(nombre, rol) {
    if (!esDocente(nombre)) return null;
    const clave = claveNombre(normalizarNombre(nombre));
    return `doc_${rol}_${slugClave(clave)}`;
}

// Normaliza pre_requisitos (string del pensum) a una lista semántica:
//   "0732, 0152, (0354|0348)" -> ["0732","0152",{alternativa:["0354","0348"]}]
//   "200CR"                   -> [{creditos:200}]
//   "Ninguno" / "PENDIENTE"   -> omitidos
function parsePreRequisitos(str) {
    if (!str) return [];
    const out = [];
    for (const raw of String(str).split(',')) {
        const p = raw.trim();
        if (!p) continue;
        if (/^\d{4}$/.test(p)) { out.push(p); continue; }
        const or = p.match(/^\(([^)]+)\)$/);
        if (or) {
            const alts = or[1].split('|').map(s => s.trim()).filter(Boolean);
            if (alts.length > 0) out.push({ alternativa: alts });
            continue;
        }
        const cr = p.match(/^(\d{2,4})\s*CR$/i);
        if (cr) { out.push({ creditos: parseInt(cr[1], 10) }); continue; }
    }
    return out;
}

// Normaliza post_requisitos (nombres en el pensum) a códigos vía el mapa nombre->código
function parsePosRequisitos(str, nameToCodes) {
    if (!str) return [];
    const out = [];
    for (const raw of String(str).split(',')) {
        const p = raw.trim();
        if (!p || p.toLowerCase() === 'ninguno') continue;
        if (/^\d{4}$/.test(p)) { out.push(p); continue; }
        const codes = nameToCodes.get(normalizarNombre(p));
        if (codes && codes.size > 0) out.push([...codes][0]);
    }
    return out;
}

// Clave estable de una sección dentro de un (ciclo, tipoPeriodo): sin repetir en --force.
function seccionKey(s) {
    return `${s.tipoPeriodo}|${s.seccion || ''}|${s.tipoSeccion || ''}|${s.inicio || ''}|${s.final || ''}|${(s.dias || []).join('')}`;
}

// Registro de pensums + info por-pensum de cada curso (desde index.json + archivos de pensum).
// index.json puede traer cohort/vigencia/clar (si scraper-pensum.mjs se re-corrió) o no
// (fallback: cohort derivado del filename; vigencia/clar null).
function derivarPensums(index) {
    const pensums = [];
    const pensumCursos = new Map(); // codigo -> [{ file, semestre, creditos, tipo, preRequisitos[], posRequisitos[] }]
    const nombres = new Map();      // codigo -> nombre (primer pensum)
    const nameToCodes = new Map();  // nombre normalizado -> Set<codigo>
    const cached = new Map();       // file -> pensum[]

    for (const entry of index) {
        if (!entry.file) continue;
        const pensum = leerJSON(join(PUBLIC_JSON, entry.file), []);
        if (!Array.isArray(pensum) || pensum.length === 0) continue;
        cached.set(entry.file, pensum);
        for (const c of pensum) {
            if (!c.codigo || !c.nombre) continue;
            const nombre = normalizarNombre(c.nombre);
            if (!nameToCodes.has(nombre)) nameToCodes.set(nombre, new Set());
            nameToCodes.get(nombre).add(String(c.codigo));
        }
    }

    for (const entry of index) {
        const file = entry.file;
        const pensum = cached.get(file);
        if (!pensum) continue;
        const stem = file.replace(/\.json$/i, '');
        const base = stem.replace(SUFIJOS_PENSUM, '');
        pensums.push({
            id: stem,
            file,
            carrera: base,
            nombre: String(entry.name || base),
            cohort: entry.cohort || derivarCohort(file),
            vigencia: entry.vigencia || null,
            clar: entry.clar != null ? !!entry.clar : null,
        });
        for (const c of pensum) {
            const codigo = String(c.codigo);
            if (!nombres.has(codigo)) nombres.set(codigo, String(c.nombre || ''));
            if (!pensumCursos.has(codigo)) pensumCursos.set(codigo, []);
            pensumCursos.get(codigo).push({
                file,
                semestre: Number(c.semestre) || 0,
                creditos: Number(c.creditos) || 0,
                tipo: String(c.tipo || ''),
                preRequisitos: parsePreRequisitos(c.pre_requisitos),
                posRequisitos: parsePosRequisitos(c.post_requisitos, nameToCodes),
            });
        }
    }

    for (const arr of pensumCursos.values()) arr.sort((a, b) => a.file.localeCompare(b.file));
    pensums.sort((a, b) => a.id.localeCompare(b.id));
    return { pensums, pensumCursos, nombres, nameToCodes };
}

// Secciones/horarios del ciclo actual desde los snapshots crudos. Cada sección lleva
// su `ciclo` para que la app distinga el horario vigente del histórico conservado.
function construirSecciones(periodos, cicloId) {
    const map = new Map(); // codigo -> Map<seccionKey, seccion>
    for (const fuente of FUENTES) {
        const entries = periodos[fuente] || [];
        if (entries.length === 0) continue;
        const tp = tipoPeriodoDeFuente(fuente);
        for (const h of entries) {
            const codigo = String(h.codigo);
            const seccion = {
                ciclo: cicloId,
                tipoPeriodo: tp,
                seccion: h.seccion || '',
                tipoSeccion: h.tipo || 'MAGISTRAL',
                modalidad: h.modalidad || '',
                edificio: h.edificio || '',
                salon: h.salon || '',
                inicio: h.inicio || '',
                final: h.final || '',
                dias: Array.isArray(h.dias) ? [...h.dias] : [],
                restricciones: typeof h.restricciones === 'string' ? h.restricciones : !!h.restricciones,
                periodo_restriccion: h.periodo_restriccion || null,
                anio: anioDeCiclo(cicloId),
                catedraticoId: docenteIdDe(h.catedratico, 'catedratico'),
                auxiliarId: docenteIdDe(h.auxiliar, 'auxiliar'),
            };
            if (!map.has(codigo)) map.set(codigo, new Map());
            map.get(codigo).set(seccionKey(seccion), seccion);
        }
    }
    return map;
}

// ---------- Carreras (desde index.json + pensum_color) ----------

const SUFIJOS_PENSUM = /(?:_\d{2,4}|_ant\d*)$/;

function derivarCarreras() {
    const index = leerJSON(join(PUBLIC_JSON, 'index.json'), []);
    const carreras = new Map(); // id -> { id, nombre, pensums[], colores{}, cursos Set }

    for (const entry of index) {
        const file = entry.file;
        if (!file) continue;
        const base = file.replace(/\.json$/i, '').replace(SUFIJOS_PENSUM, '');
        if (!carreras.has(base)) {
            let nombre = '';
            const color = leerJSON(join(PENSUM_COLOR_DIR, `${base}_color.json`), null);
            if (color && color.carrera) {
                nombre = color.carrera;
            } else {
                nombre = String(entry.name || base).replace(/\s*\(.*\)\s*$/, '').trim();
            }
            carreras.set(base, {
                id: base,
                nombre,
                pensums: [],
                colores: color
                    ? { color1: color.color1 || null, color2: color.color2 || null, color3: color.color3 || null }
                    : {},
                cursos: new Set(),
            });
        }
        const carrera = carreras.get(base);
        carrera.pensums.push(file);

        const pensum = leerJSON(join(PUBLIC_JSON, file), []);
        if (Array.isArray(pensum)) {
            for (const c of pensum) {
                if (c.codigo) carrera.cursos.add(String(c.codigo));
            }
        }
    }

    const out = [];
    for (const carrera of carreras.values()) {
        out.push({
            id: carrera.id,
            nombre: carrera.nombre,
            pensums: [...carrera.pensums].sort(),
            colores: carrera.colores,
            cursos: [...carrera.cursos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        });
    }
    out.sort((a, b) => a.id.localeCompare(b.id));

    const cursoACarreras = new Map();
    for (const carrera of carreras.values()) {
        for (const codigo of carrera.cursos) {
            if (!cursoACarreras.has(codigo)) cursoACarreras.set(codigo, new Set());
            cursoACarreras.get(codigo).add(carrera.id);
        }
    }
    return { carreras: out, cursoACarreras };
}

// ---------- Ciclos ----------

function generarCicloId(ciclosExistentes, lastRun) {
    const year = new Date(lastRun).getUTCFullYear();
    const prefix = `ciclo-${year}-`;
    const seq = ciclosExistentes.filter(c => c.id.startsWith(prefix)).length + 1;
    return `${prefix}${seq}`;
}

function ordenarCiclos(ciclos) {
    return [...ciclos].sort((a, b) => ordenCiclo(a.id, b.id));
}

// ---------- Observaciones del ciclo (solo "abrió o no") ----------

function construirObservaciones(periodos, cicloId, catalogoCursosPrev) {
    const cursosInfo = new Map(); // codigo -> { codigo, nombre, observaciones: [] }
    // Solo cuentan como historial previo los cursos vistos en ciclos ANTERIORES
    // al actual. Si se re-procesa el mismo ciclo (--force), sus cursos no deben
    // generar "abrio:false" artificiales y la regeneración es determinista.
    const codigosPrev = new Set(
        (catalogoCursosPrev || []).filter(c =>
            (c.observaciones || []).some(o => ordenCiclo(o.ciclo, cicloId) < 0)
        ).map(c => c.codigo)
    );

    for (const fuente of FUENTES) {
        const entries = periodos[fuente] || [];
        if (entries.length === 0) {
            console.warn(`  [WARN] ${fuente}.json está vacío; se omite este tipoPeriodo (¿falló el fetch?)`);
            continue;
        }
        const tp = tipoPeriodoDeFuente(fuente);
        const porCodigo = new Set();
        for (const h of entries) porCodigo.add(h.codigo);

        // Cursos que abrieron
        for (const codigo of porCodigo) {
            if (!cursosInfo.has(codigo)) {
                const first = entries.find(h => h.codigo === codigo);
                cursosInfo.set(codigo, { codigo, nombre: first ? first.nombre || '' : '', observaciones: [] });
            }
            const curso = cursosInfo.get(codigo);
            if (!curso.nombre) {
                const first = entries.find(h => h.codigo === codigo);
                if (first && first.nombre) curso.nombre = first.nombre;
            }
            curso.observaciones.push({ ciclo: cicloId, tipoPeriodo: tp, abrio: true });
        }

        // Cursos con historial previo que NO abrieron en este tipoPeriodo
        for (const codigo of codigosPrev) {
            if (porCodigo.has(codigo)) continue;
            const prev = catalogoCursosPrev.find(c => c.codigo === codigo);
            if (!cursosInfo.has(codigo)) {
                cursosInfo.set(codigo, { codigo, nombre: prev ? prev.nombre : '', observaciones: [] });
            }
            const curso = cursosInfo.get(codigo);
            if (!curso.nombre && prev) curso.nombre = prev.nombre || '';
            curso.observaciones.push({ ciclo: cicloId, tipoPeriodo: tp, abrio: false });
        }
    }

    return cursosInfo;
}

// ---------- Docentes (desde los snapshots crudos) ----------

function construirDocentesDesdeSnapshots(periodos, cicloId, cursoACarreras, docentesPrev) {
    const docentes = new Map(); // `${clave}|${rol}` -> { ... }

    for (const fuente of FUENTES) {
        const entries = periodos[fuente] || [];
        if (entries.length === 0) continue;
        const tp = tipoPeriodoDeFuente(fuente);
        const porCodigo = new Map();
        for (const h of entries) {
            if (!porCodigo.has(h.codigo)) porCodigo.set(h.codigo, []);
            porCodigo.get(h.codigo).push(h);
        }

        for (const [codigo, lista] of porCodigo) {
            const carreras = cursoACarreras.get(codigo) || new Set();
            const nombre = lista[0].nombre || '';
            for (const [campo, rol] of [['catedratico', 'catedratico'], ['auxiliar', 'auxiliar']]) {
                for (const h of lista) {
                    const raw = h[campo];
                    if (!esDocente(raw)) continue;
                    const nombreNorm = normalizarNombre(raw);
                    const clave = claveNombre(nombreNorm);
                    const key = `${clave}|${rol}`;
                    if (!docentes.has(key)) {
                        docentes.set(key, {
                            id: `doc_${rol}_${slugClave(clave)}`,
                            nombre: nombreNorm,
                            rol,
                            variantes: new Set(),
                            ciclos: new Set(),
                            carreras: new Set(),
                            cursos: new Map(), // codigo -> { codigo, nombre, rol, tipoPeriodos Set, ciclos Set }
                        });
                    }
                    const d = docentes.get(key);
                    d.variantes.add(nombreNorm);
                    d.ciclos.add(cicloId);
                    for (const c of carreras) d.carreras.add(c);
                    if (!d.cursos.has(codigo)) {
                        d.cursos.set(codigo, {
                            codigo,
                            nombre,
                            rol,
                            tipoPeriodos: new Set(),
                            ciclos: new Set(),
                            secciones: new Set(),
                        });
                    }
                    const dc = d.cursos.get(codigo);
                    dc.tipoPeriodos.add(tp);
                    dc.ciclos.add(cicloId);
                    dc.secciones.add(`${cicloId}|${tp}|${h.seccion || ''}`);
                }
            }
        }
    }

    // Preservar docentes previos que ya no aparecen (para depuración e historial)
    for (const prev of docentesPrev || []) {
        const key = `${claveNombre(prev.nombre)}|${prev.rol}`;
        if (!docentes.has(key)) {
            docentes.set(key, {
                id: prev.id,
                nombre: prev.nombre,
                rol: prev.rol,
                variantes: new Set(prev.variantes || []),
                ciclos: new Set(prev.ciclos || (prev.ultimoCicloVisto ? [prev.ultimoCicloVisto] : [])),
                carreras: new Set(prev.carreras || []),
                cursos: new Map(),
            });
        }
        const d = docentes.get(key);
        for (const v of prev.variantes || []) d.variantes.add(v);
        for (const ciclo of prev.ciclos || []) d.ciclos.add(ciclo);
        for (const c of prev.carreras || []) d.carreras.add(c);
        for (const pc of prev.cursos || []) {
            if (!d.cursos.has(pc.codigo)) {
                d.cursos.set(pc.codigo, {
                    codigo: pc.codigo,
                    nombre: pc.nombre || '',
                    rol: d.rol,
                    tipoPeriodos: new Set(),
                    ciclos: new Set(),
                    secciones: new Set(),
                });
            }
            const dc = d.cursos.get(pc.codigo);
            for (const tp of pc.tipoPeriodos || []) dc.tipoPeriodos.add(tp);
            for (const ciclo of pc.ciclos || []) dc.ciclos.add(ciclo);
            for (const s of pc.secciones || []) dc.secciones.add(s);
        }
    }

    return docentes;
}

function depurarDocentes(docentes, ciclosOrdenados) {
    for (const d of docentes.values()) {
        let ultimoIdx = -1;
        for (const c of d.ciclos) {
            const idx = ciclosOrdenados.findIndex(cc => cc.id === c);
            if (idx > ultimoIdx) ultimoIdx = idx;
        }

        // Periodos en los que el docente aparece históricamente (de sus cursos).
        const periodosDocente = new Set();
        for (const c of d.cursos.values()) {
            for (const tp of c.tipoPeriodos || []) periodosDocente.add(tp);
        }

        // Un ciclo solo cuenta como ausencia si capturó algún periodo relevante
        // para este docente. Si el portal no publicó esos horarios (p. ej. borró
        // un semestre), no hay dato real de ausencia y el ciclo no debe avanzar
        // la depuración (evita marcar inactivo a alguien por datos faltantes).
        let ciclosDesdeUltimo = 0;
        for (let i = ultimoIdx + 1; i < ciclosOrdenados.length; i++) {
            const capturados = new Set(ciclosOrdenados[i].periodosCapturados || []);
            const hayDatos = [...periodosDocente].some(tp => capturados.has(tp));
            if (hayDatos) ciclosDesdeUltimo++;
        }

        d.activo = ciclosDesdeUltimo < DEPURAR_TRAS_CICLOS;
        d.ultimoCicloVisto = ultimoIdx >= 0 ? ciclosOrdenados[ultimoIdx].id : null;
    }
}

function serializarDocentes(docentes) {
    const out = [];
    for (const d of docentes.values()) {
        const cursos = [...d.cursos.values()]
            .map(c => ({
                codigo: c.codigo,
                nombre: c.nombre,
                rol: c.rol,
                tipoPeriodos: [...c.tipoPeriodos].sort(ordenTipoPeriodo),
                ciclos: [...c.ciclos].sort(ordenCiclo),
                secciones: [...c.secciones].sort(),
            }))
            .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
        out.push({
            id: d.id,
            nombre: d.nombre,
            rol: d.rol,
            variantes: [...d.variantes].sort(),
            activo: !!d.activo,
            ultimoCicloVisto: d.ultimoCicloVisto || null,
            ciclos: [...d.ciclos].sort(ordenCiclo),
            carreras: [...d.carreras].sort(),
            cursos,
        });
    }
    out.sort((a, b) => (a.rol === b.rol ? a.nombre.localeCompare(b.nombre) : a.rol.localeCompare(b.rol)));
    return out;
}

// ---------- Serialización de cursos ----------

function construirResumen(observaciones) {
    const resumen = {};
    const porTp = new Map();
    for (const o of observaciones) {
        if (!porTp.has(o.tipoPeriodo)) porTp.set(o.tipoPeriodo, []);
        porTp.get(o.tipoPeriodo).push(o);
    }
    for (const tp of TIPO_PERIODOS_ORDER) {
        const lista = porTp.get(tp);
        if (!lista || lista.length === 0) continue;
        const abiertos = lista.filter(o => o.abrio);
        resumen[tp] = {
            ciclos: [...new Set(lista.map(o => o.ciclo))].sort(ordenCiclo),
            abrio: abiertos.length,
            noAbrio: lista.length - abiertos.length,
            frecuencia: lista.length > 0 ? Math.round((abiertos.length / lista.length) * 100) / 100 : 0,
            ultimoCicloAbrio: abiertos.length > 0 ? [...abiertos].sort((a, b) => ordenCiclo(a.ciclo, b.ciclo)).pop().ciclo : null,
            ciclosSinAbrir: [...new Set(lista.filter(o => !o.abrio).map(o => o.ciclo))].sort(ordenCiclo),
        };
    }
    return resumen;
}

function main() {
    console.log('=== PROCESAMIENTO DE CATÁLOGO UNIFICADO ===\n');

    const indexHorarios = leerJSON(join(HORARIOS_DIR, 'index.json'), null);
    if (!indexHorarios || !indexHorarios.lastRun) {
        console.error('No se encontró horarios/index.json (¿ya corriste scraper.mjs?).');
        process.exit(1);
    }
    const lastRun = indexHorarios.lastRun;

    const catalogoPrevio = leerJSON(CATALOGO_PATH, null);
    if (!FORCE && catalogoPrevio && catalogoPrevio.ultimoLastRun === lastRun) {
        console.log(`Sin cambios: el catálogo ya incluye lastRun ${lastRun}. Nada que procesar.`);
        return;
    }

    const periodos = {};
    for (const fuente of FUENTES) {
        periodos[fuente] = leerJSON(join(HORARIOS_DIR, `${fuente}.json`), []);
    }

    // Ciclo: si ya existe uno para este lastRun (p. ej. re-ejecución con --force),
    // se reutiliza en lugar de crear un ciclo duplicado con el mismo lastRun.
    const ciclosExistentes = catalogoPrevio && Array.isArray(catalogoPrevio.ciclosAcademicos)
        ? catalogoPrevio.ciclosAcademicos
        : [];
    const periodosCapturados = FUENTES.filter(f => (periodos[f] || []).length > 0).map(f => TIPO_PERIODO_POR_FUENTE[f]);
    const cicloExistente = ciclosExistentes.find(c => c.lastRun === lastRun);
    const periodoCapturadoHoy = periodosCapturados.length;
    const cicloId = cicloExistente ? cicloExistente.id : generarCicloId(ciclosExistentes, lastRun);
    let ciclosAcademicos;
    if (cicloExistente) {
        ciclosAcademicos = ordenarCiclos(ciclosExistentes);
    } else if (periodoCapturadoHoy > 0) {
        ciclosAcademicos = ordenarCiclos([...ciclosExistentes, {
            id: cicloId,
            generadoEl: new Date().toISOString(),
            lastRun,
            periodosCapturados,
        }]);
    } else {
        // Sin datos capturados (portal sin publicar): no registrar ciclo fantasma.
        console.error('No se capturó ningún tipoPeriodo (¿el portal está caído o sin publicar?). No se registra ciclo.');
        return;
    }

    // Archivar snapshots crudos
    mkdirSync(HISTORY_DIR, { recursive: true });
    for (const fuente of FUENTES) {
        const tp = TIPO_PERIODO_POR_FUENTE[fuente];
        const destino = join(HISTORY_DIR, `${cicloId}_${tp}.json`);
        if (!existsSync(destino)) {
            escribirJSON(destino, periodos[fuente]);
        }
    }

    const { carreras, cursoACarreras } = derivarCarreras();
    const catalogoCursosPrev = catalogoPrevio && Array.isArray(catalogoPrevio.cursos) ? catalogoPrevio.cursos : [];
    const cursosInfo = construirObservaciones(periodos, cicloId, catalogoCursosPrev);

    // Modelo v4: registro de pensums + info por-pensum de cada curso + secciones del ciclo actual
    const index = leerJSON(join(PUBLIC_JSON, 'index.json'), []);
    const { pensums, pensumCursos, nombres: nombresPensum } = derivarPensums(index);
    const seccionesActuales = construirSecciones(periodos, cicloId);

    const docentes = construirDocentesDesdeSnapshots(periodos, cicloId, cursoACarreras, catalogoPrevio?.docentes || []);
    depurarDocentes(docentes, ciclosAcademicos);

    // Secciones previas acumuladas (clave completa con ciclo, para conservar el histórico
    // aunque el portal borre datos del ciclo nuevo)
    const seccionesPrevMap = new Map();
    for (const pc of catalogoCursosPrev) {
        const m = new Map();
        for (const s of pc.secciones || []) m.set(`${s.ciclo}|${seccionKey(s)}`, s);
        seccionesPrevMap.set(pc.codigo, m);
    }

    // Fusionar observaciones previas + nuevas
    const cursosPrevMap = new Map(catalogoCursosPrev.map(c => [c.codigo, c]));
    const todosCodigos = new Set([...cursosInfo.keys(), ...cursosPrevMap.keys(), ...pensumCursos.keys()]);

    const cursosOut = [];
    for (const codigo of [...todosCodigos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
        const prev = cursosPrevMap.get(codigo);
        const info = cursosInfo.get(codigo);
        const pensumInfo = pensumCursos.get(codigo) || [];

        const obsMap = new Map();
        // Solo se heredan observaciones de ciclos anteriores; las del ciclo actual
        // se regeneran desde info (permite que --force sea determinista).
        for (const o of prev?.observaciones || []) {
            if (ordenCiclo(o.ciclo, cicloId) < 0) obsMap.set(`${o.ciclo}|${o.tipoPeriodo}`, o);
        }
        for (const o of info?.observaciones || []) obsMap.set(`${o.ciclo}|${o.tipoPeriodo}`, o);
        const observaciones = [...obsMap.values()].sort(
            (a, b) => ordenCiclo(a.ciclo, b.ciclo) || ordenTipoPeriodo(a.tipoPeriodo, b.tipoPeriodo)
        );

        // Secciones acumuladas: heredar todo lo previo (ciclos anteriores) y regenerar el
        // ciclo actual desde los snapshots (determinista). Conserva el texto enriquecido
        // de restricciones si el snapshot vuelve a traer solo la bandera true.
        const secciones = new Map(seccionesPrevMap.get(codigo) || []);
        for (const [key, s] of seccionesActuales.get(codigo) || []) {
            const fullKey = `${cicloId}|${key}`;
            const prevSec = secciones.get(fullKey);
            if (prevSec && typeof prevSec.restricciones === 'string' && typeof s.restricciones !== 'string') {
                s.restricciones = prevSec.restricciones;
            }
            secciones.set(fullKey, s);
        }
        const seccionesOut = [...secciones.values()].sort(
            (a, b) => ordenCiclo(a.ciclo, b.ciclo) || ordenTipoPeriodo(a.tipoPeriodo, b.tipoPeriodo)
                || String(a.seccion).localeCompare(String(b.seccion))
        );

        cursosOut.push({
            codigo,
            nombre: (info && info.nombre) || (prev && prev.nombre) || nombresPensum.get(codigo) || '',
            carreras: cursoACarreras.has(codigo) ? [...cursoACarreras.get(codigo)].sort() : [],
            pensums: pensumInfo,
            creditos: pensumInfo.length > 0 ? pensumInfo[0].creditos : null,
            tipo: pensumInfo.length > 0 ? pensumInfo[0].tipo : null,
            esObligatorio: pensumInfo.length > 0 ? pensumInfo[0].tipo === 'Obligatorio' : null,
            enPensum: pensumInfo.length > 0,
            vistoEnHorarios: observaciones.length > 0,
            observaciones,
            resumen: construirResumen(observaciones),
            secciones: seccionesOut,
        });
    }

    const catalogo = {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        ultimoLastRun: lastRun,
        ciclosAcademicos,
        tipoPeriodos: TIPO_PERIODOS_ORDER,
        pensums,
        carreras,
        cursos: cursosOut,
        docentes: serializarDocentes(docentes),
    };

    escribirJSON(CATALOGO_PATH, catalogo);

    const totalDocentes = catalogo.docentes.length;
    const inactivos = catalogo.docentes.filter(d => !d.activo).length;
    const totalObs = catalogo.cursos.reduce((acc, c) => acc + c.observaciones.length, 0);
    const totalSecciones = catalogo.cursos.reduce((acc, c) => acc + (c.secciones || []).length, 0);
    const soloPensum = catalogo.cursos.filter(c => c.enPensum && !c.vistoEnHorarios).length;

    console.log(`\n=== RESUMEN ===`);
    console.log(`Ciclo procesado: ${cicloId} (lastRun ${lastRun})`);
    console.log(`Pensums: ${pensums.length}`);
    console.log(`Carreras: ${carreras.length}`);
    console.log(`Cursos: ${cursosOut.length} (${soloPensum} solo de pensum, sin historial de horarios)`);
    console.log(`  Observaciones (abrió/no): ${totalObs}`);
    console.log(`  Secciones (horarios): ${totalSecciones}`);
    console.log(`Docentes: ${totalDocentes} (${inactivos} inactivos por depuración)`);
    console.log(`Snapshots archivados en: ${HISTORY_DIR}`);
    console.log(`Catálogo escrito en: ${CATALOGO_PATH}`);
}

try {
    main();
} catch (e) {
    console.error(e);
    process.exit(1);
}
