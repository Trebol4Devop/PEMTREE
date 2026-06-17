import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const URLS = {
    semestre1: 'https://usuarios.ingenieria.usac.edu.gt/horarios/semestre/1',
    semestre2: 'https://usuarios.ingenieria.usac.edu.gt/horarios/semestre/2',
    vacaciones1: 'https://usuarios.ingenieria.usac.edu.gt/horarios/vacaciones/1',
    vacaciones2: 'https://usuarios.ingenieria.usac.edu.gt/horarios/vacaciones/2',
};

const BADGE_TO_TIPO = {
    'badge-blue': 'LABORATORIO',
    'badge-info': 'TRABAJO_DIRIGIDO',
    'badge-success': 'DIBUJO',
    'badge-danger': 'PRACTICA',
    null: 'MAGISTRAL',
};

const DIAS_MAP = {
    'LU': 'lunes', 'MA': 'martes', 'MI': 'miercoles',
    'JU': 'jueves', 'VI': 'viernes', 'SA': 'sabado', 'DO': 'domingo'
};

async function fetchHTML(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
    return resp.text();
}

function extractBadgeType(cell0Content) {
    if (cell0Content.includes('badge-blue')) return 'LABORATORIO';
    if (cell0Content.includes('badge-info')) return 'TRABAJO_DIRIGIDO';
    if (cell0Content.includes('badge-success')) return 'DIBUJO';
    if (cell0Content.includes('badge-danger')) return 'PRACTICA';
    return 'MAGISTRAL';
}

function parseDias(diasTexto) {
    const dias = [];
    for (const [abrev, nombre] of Object.entries(DIAS_MAP)) {
        if (diasTexto.includes(abrev)) dias.push(nombre);
    }
    return dias;
}

function minutos(hora) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function parseRows(html, fuente) {
    const tableStart = html.indexOf('<table');
    const tableEnd = html.indexOf('</table>');
    if (tableStart < 0 || tableEnd < 0) return { horarios: [], errores: [] };

    const tableHtml = html.substring(tableStart, tableEnd + 8);

    // ── Detect if the table has a "Modalidad" column ──────────────────
    // Semester pages have it; vacation pages do NOT.
    const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
    const hasModalidadCol = theadMatch
        ? /Modalidad/i.test(theadMatch[1])
        : true; // default to true for backward compatibility

    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    const tbody = tbodyMatch ? tbodyMatch[1] : tableHtml;

    const rows = tbody.match(/<tr\s*>[\s\S]*?<\/tr>/g) || [];
    const horarios = [];
    const errores = [];

    // Column indices depend on whether Modalidad column is present
    const IDX_SECCION   = 1;
    const IDX_MODALIDAD = hasModalidadCol ? 2 : null;
    const IDX_EDIFICIO  = hasModalidadCol ? 3 : 2;
    const IDX_SALON     = hasModalidadCol ? 4 : 3;
    const IDX_INICIO    = hasModalidadCol ? 5 : 4;
    const IDX_FINAL     = hasModalidadCol ? 6 : 5;
    const IDX_DIAS      = hasModalidadCol ? 7 : 6;
    const IDX_CATEDRATICO = hasModalidadCol ? 8 : 7;
    const IDX_AUXILIAR  = hasModalidadCol ? 9 : 8;
    const IDX_DETALLE   = hasModalidadCol ? 10 : 9;

    const MIN_CELLS = hasModalidadCol ? 10 : 9;

    for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
        if (cells.length < MIN_CELLS) continue;

        const cell0 = cells[0]; // course name + badge
        const codigoMatch = cell0.match(/(\d{4})/);
        if (!codigoMatch) continue;

        const codigo = codigoMatch[1];
        const tipo = extractBadgeType(cell0);
        const nombre = cell0.replace(/<[^>]*>/g, '').replace(codigo, '').trim().replace(/\s+/g, ' ');

        const seccion = (cells[IDX_SECCION] || '').replace(/<[^>]*>/g, '').trim();

        // Modalidad: from dedicated column if present, otherwise infer
        let modalidad;
        if (hasModalidadCol) {
            const modalidadRaw = (cells[IDX_MODALIDAD] || '').replace(/<[^>]*>/g, '').trim();
            modalidad = normalizeModalidad(modalidadRaw);
        } else {
            // Vacaciones: no Modalidad column. The edificio cell often contains
            // "MEET" or "VIRTUAL" for virtual courses — use that to infer.
            const edificioCell = (cells[IDX_EDIFICIO] || '').replace(/<[^>]*>/g, '').trim().toUpperCase();
            if (edificioCell === 'MEET' || edificioCell === 'VIRTUAL') {
                modalidad = 'VIRTUAL';
            } else {
                modalidad = 'PRESENCIAL';
            }
        }

        const edificio = (cells[IDX_EDIFICIO] || '').replace(/<[^>]*>/g, '').trim();
        const salon = (cells[IDX_SALON] || '').replace(/<[^>]*>/g, '').trim();
        const inicioRaw = (cells[IDX_INICIO] || '').replace(/<[^>]*>/g, '').trim();
        const finalRaw = (cells[IDX_FINAL] || '').replace(/<[^>]*>/g, '').trim();
        const diasRaw = (cells[IDX_DIAS] || '').replace(/<[^>]*>/g, '').trim();
        const dias = parseDias(diasRaw);
        const catedratico = (cells[IDX_CATEDRATICO] || '').replace(/<[^>]*>/g, '').trim();
        const auxiliar = (cells[IDX_AUXILIAR] || '').replace(/<[^>]*>/g, '').trim();
        const detalleCell = cells[IDX_DETALLE] || '';
        const tieneRestricciones = !detalleCell.includes('disabled') && detalleCell.includes('verRestricciones');

        const [inicio, final, esCorrupto] = corregirHorario(inicioRaw, finalRaw, diasRaw, dias);

        if (esCorrupto) {
            errores.push({ codigo, nombre, seccion, fuente });
        }

        if (!esHorarioValido(inicio, final, dias)) continue;

        horarios.push({
            codigo,
            nombre,
            seccion,
            modalidad,
            tipo,
            edificio,
            salon,
            inicio,
            final,
            dias,
            catedratico,
            auxiliar,
            restricciones: tieneRestricciones,
            fuente
        });
    }

    return { horarios, errores };
}

function normalizeModalidad(raw) {
    const upper = raw.toUpperCase();
    if (upper.includes('SEMI')) return 'SEMIPRESENCIAL';
    if (upper.includes('VIRTUAL') || upper.includes('MEET')) return 'VIRTUAL';
    if (upper.includes('PRESENCIAL')) return 'PRESENCIAL';
    return raw;
}

function corregirHorario(inicio, final, diasTexto, diasArray) {
    const esHora = (str) => /^\d{2}:\d{2}$/.test(str.trim());
    const inicioVal = inicio.trim();
    const finalVal = final.trim();

    if (esHora(inicioVal) && esHora(finalVal)) {
        return [inicioVal, finalVal, false];
    }

    if (!esHora(inicioVal) && !esHora(finalVal)) {
        const diasMatch = diasTexto.match(/[A-Z]{2}/g);
        if (diasMatch && diasMatch.length > 0 && esHora(inicioVal)) {
            return [inicioVal, finalVal === 'LU MA MI JU VI' ? '18:00' : finalVal, true];
        }
    }

    if (!esHora(inicioVal)) {
        if (esHora(finalVal)) {
            return [finalVal, '13:00', true];
        }
        const posiblesHoras = inicio.match(/\d{2}:\d{2}/g);
        if (posiblesHoras && posiblesHoras.length >= 2) {
            return [posiblesHoras[0], posiblesHoras[1], true];
        }
        return ['08:00', '12:00', true];
    }

    if (!esHora(finalVal)) {
        if (esHora(inicioVal)) {
            return [inicioVal, '12:00', true];
        }
    }

    return [inicioVal, finalVal, true];
}

function esHorarioValido(inicio, final, dias) {
    if (!inicio || !final) return false;
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(final)) return false;
    if (minutos(inicio) >= minutos(final)) return false;
    if (dias.length === 0) return false;
    return true;
}

async function main() {
    const outDir = resolve(__dirname, 'pemtree-react', 'public', 'json', 'horarios');
    mkdirSync(outDir, { recursive: true });

    console.log('=== SCRAPER DE HORARIOS - FIUSAC ===\n');

    const allData = {};
    const allStats = {};
    const allErrores = [];

    // Fetch individual sources
    for (const [nombre, url] of Object.entries(URLS)) {
        console.log(`Fetching ${nombre}...`);
        try {
            const html = await fetchHTML(url);
            const { horarios, errores } = parseRows(html, nombre);
            allData[nombre] = horarios;
            allStats[nombre] = {
                total: horarios.length,
                porTipo: contarPorTipo(horarios)
            };
            if (errores.length > 0) allErrores.push(...errores);
            console.log(`  -> ${horarios.length} horarios`);
        } catch (e) {
            console.log(`  -> ERROR: ${e.message}`);
            allData[nombre] = [];
            allStats[nombre] = { total: 0, error: e.message };
        }
    }

    // Write individual period files (overwrites each run)
    for (const [nombre, horarios] of Object.entries(allData)) {
        writeFileSync(`${outDir}/${nombre}.json`, JSON.stringify(horarios, null, 2), 'utf-8');
    }

    // Merge: semestre1 + semestre2 → semestre
    const semestreData = [
        ...(allData.semestre1 || []).map(h => ({ ...h })),
        ...(allData.semestre2 || []).map(h => ({ ...h }))
    ];
    const vacacionesData = [
        ...(allData.vacaciones1 || []).map(h => ({ ...h })),
        ...(allData.vacaciones2 || []).map(h => ({ ...h }))
    ];

    // Write merged files
    writeFileSync(`${outDir}/semestre.json`, JSON.stringify(semestreData, null, 2), 'utf-8');
    writeFileSync(`${outDir}/vacaciones.json`, JSON.stringify(vacacionesData, null, 2), 'utf-8');

    console.log(`\nIndividuales:`);
    for (const [nombre, horarios] of Object.entries(allData)) {
        console.log(`  ${nombre}.json -> ${horarios.length} horarios`);
    }
    console.log(`\nFusionados:`);
    console.log(`  semestre.json -> ${semestreData.length} horarios`);
    console.log(`  vacaciones.json -> ${vacacionesData.length} horarios`);

    if (allErrores.length > 0) {
        console.log(`\n=== ERRORES ENCONTRADOS (${allErrores.length}) ===`);
        const unicos = [...new Set(allErrores.map(e => `${e.codigo} - ${e.nombre}`))].slice(0, 10);
        unicos.forEach(u => console.log(`  - ${u}`));
    }

    const now = new Date().toISOString();
    writeFileSync(`${outDir}/index.json`, JSON.stringify({
        lastRun: now,
        periods: [
            { id: 'semestre1', name: 'Semestre 1', type: 'semestre', lastUpdated: now },
            { id: 'semestre2', name: 'Semestre 2', type: 'semestre', lastUpdated: now },
            { id: 'vacaciones1', name: 'Vacaciones 1', type: 'vacaciones', lastUpdated: now },
            { id: 'vacaciones2', name: 'Vacaciones 2', type: 'vacaciones', lastUpdated: now },
        ]
    }, null, 2), 'utf-8');

    console.log(`\n=== INDEX CREADO (${now}) ===`);
    console.log(`Archivos en: ${outDir}`);
    console.log(`  index.json, semestre.json, vacaciones.json + individuales`);
}

function contarPorTipo(horarios) {
    const counts = { LABORATORIO: 0, TRABAJO_DIRIGIDO: 0, DIBUJO: 0, PRACTICA: 0, MAGISTRAL: 0 };
    for (const h of horarios) {
        if (counts[h.tipo] !== undefined) counts[h.tipo]++;
    }
    return counts;
}

main().catch(console.error);