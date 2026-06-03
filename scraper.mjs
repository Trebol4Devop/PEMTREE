import { writeFileSync, mkdirSync } from 'fs';

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
    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    const tbody = tbodyMatch ? tbodyMatch[1] : tableHtml;
    
    const rows = tbody.match(/<tr\s*>[\s\S]*?<\/tr>/g) || [];
    const horarios = [];
    const errores = [];

    for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
        if (cells.length < 10) continue;

        const cell0 = cells[0]; // course name + badge
        const codigoMatch = cell0.match(/(\d{4})/);
        if (!codigoMatch) continue;

        const codigo = codigoMatch[1];
        const tipo = extractBadgeType(cell0);
        const nombre = cell0.replace(/<[^>]*>/g, '').replace(codigo, '').trim().replace(/\s+/g, ' ');

        const seccion = (cells[1] || '').replace(/<[^>]*>/g, '').trim();
        const modalidadRaw = (cells[2] || '').replace(/<[^>]*>/g, '').trim();
        const modalidad = normalizeModalidad(modalidadRaw);
        const edificio = (cells[3] || '').replace(/<[^>]*>/g, '').trim();
        const salon = (cells[4] || '').replace(/<[^>]*>/g, '').trim();
        const inicioRaw = (cells[5] || '').replace(/<[^>]*>/g, '').trim();
        const finalRaw = (cells[6] || '').replace(/<[^>]*>/g, '').trim();
        const diasRaw = (cells[7] || '').replace(/<[^>]*>/g, '').trim();
        const dias = parseDias(diasRaw);
        const catedratico = (cells[8] || '').replace(/<[^>]*>/g, '').trim();
        const auxiliar = (cells[9] || '').replace(/<[^>]*>/g, '').trim();
        const detalleCell = cells[10] || '';
        const tieneRestricciones = !detalleCell.includes('disabled') && detalleCell.includes('verRestricciones');
        const restriccionesRaw = detalleCell.replace(/<[^>]*>/g, '').trim();

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
    const outDir = '/home/carlos/Escritorio/PEMTREE2/pemtree-react/public/json/horarios';
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

    console.log(`\nFusionados:`);
    console.log(`  semestre.json -> ${semestreData.length} horarios`);
    console.log(`  vacaciones.json -> ${vacacionesData.length} horarios`);

    if (allErrores.length > 0) {
        console.log(`\n=== ERRORES ENCONTRADOS (${allErrores.length}) ===`);
        const unicos = [...new Set(allErrores.map(e => `${e.codigo} - ${e.nombre}`))].slice(0, 10);
        unicos.forEach(u => console.log(`  - ${u}`));
    }

    writeFileSync(`${outDir}/index.json`, JSON.stringify({
        periods: [
            { id: 'semestre', name: 'Semestre', type: 'semestre' },
            { id: 'vacaciones', name: 'Vacaciones', type: 'vacaciones' },
        ]
    }, null, 2), 'utf-8');

    console.log(`\n=== INDEX CREADO ===`);
    console.log(`Archivos en: ${outDir}`);
    console.log(`  index.json, semestre.json, vacaciones.json`);
}

function contarPorTipo(horarios) {
    const counts = { LABORATORIO: 0, TRABAJO_DIRIGIDO: 0, DIBUJO: 0, PRACTICA: 0, MAGISTRAL: 0 };
    for (const h of horarios) {
        if (counts[h.tipo] !== undefined) counts[h.tipo]++;
    }
    return counts;
}

main().catch(console.error);