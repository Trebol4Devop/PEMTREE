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

function extractRestriccionDetalle(detalleCell) {
    if (!detalleCell) return false;
    if (detalleCell.includes('disabled') && !detalleCell.includes('verRestricciones')) return false;
    if (!/verRestricciones|restriccion/i.test(detalleCell)) return false;

    // 1) Atributo title con el detalle (muchos tooltips de Bootstrap lo usan)
    const titleMatch = detalleCell.match(/\btitle=["']([^"']+)["']/i);
    if (titleMatch && titleMatch[1] && !/^\s*ver\s+restr/i.test(titleMatch[1])) {
        return titleMatch[1].trim();
    }

    // 2) data-original-title / data-title (Bootstrap tooltip)
    const dataTitleMatch = detalleCell.match(/data-(?:original-)?title=["']([^"']+)["']/i);
    if (dataTitleMatch && dataTitleMatch[1] && !/^\s*ver\s+restr/i.test(dataTitleMatch[1])) {
        return dataTitleMatch[1].trim();
    }

    // 3) data-restriccion o data-restricciones (atributo custom)
    const dataRestr = detalleCell.match(/data-restricci(?:on|ones)?=["']([^"']+)["']/i);
    if (dataRestr && dataRestr[1]) return dataRestr[1].trim();

    // 4) data-content (popover de Bootstrap) — suele contener HTML
    const dataContent = detalleCell.match(/data-content=["']([^"']+)["']/i);
    if (dataContent && dataContent[1]) {
        const text = dataContent[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) return text;
    }

    // 5) Contenido de texto visible que no sea solo el botón
    const text = detalleCell.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleaned = text.replace(/ver\s+restricciones?/gi, '').replace(/^\s+|\s+$/g, '').trim();
    if (cleaned && cleaned.length > 2) return cleaned;

    // 6) No se pudo extraer el detalle, pero sabemos que tiene restricciones
    return true;
}

function extractPeriodoFromOnclick(detalleCell) {
    const match = detalleCell.match(/verRestricciones\s*\([^)]*'(\d+)'\s*\)/);
    return match ? match[1] : null;
}

function parseDias(diasTexto) {
    const dias = [];
    for (const [abrev, nombre] of Object.entries(DIAS_MAP)) {
        if (diasTexto.includes(abrev)) dias.push(nombre);
    }
    return dias;
}

function normalizeHeader(text) {
    return text.toLowerCase()
        .replace(/\s+/g, ' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function parseTheadColumns(tableHtml) {
    const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
    if (!theadMatch) return null;
    const thMatches = theadMatch[1].match(/<th[^>]*>([\s\S]*?)<\/th>/g);
    if (!thMatches) return null;
    return thMatches.map(th => normalizeHeader(th.replace(/<[^>]*>/g, '')));
}

function buildColumnMap(columns) {
    const map = new Map();
    columns.forEach((name, i) => map.set(name, i));
    return map;
}

function getCell(cells, colMap, headerName) {
    const idx = colMap.get(headerName);
    if (idx == null || !cells[idx]) return '';
    return cells[idx].replace(/<[^>]*>/g, '').trim();
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

    const columns = parseTheadColumns(tableHtml);
    const colMap = columns ? buildColumnMap(columns) : new Map();

    const rows = tbody.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
    const horarios = [];
    const errores = [];

    for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
        if (cells.length < 1) continue;

        const cell0 = cells[0];
        const codigoMatch = cell0.match(/(\d{4})/);
        if (!codigoMatch) continue;

        const codigo = codigoMatch[1];
        const tipo = extractBadgeType(cell0);
        const nombre = cell0.replace(/<[^>]*>/g, '').replace(codigo, '').trim().replace(/\s+/g, ' ');

        const seccion = getCell(cells, colMap, 'seccion');

        let modalidad;
        const modalidadRaw = getCell(cells, colMap, 'modalidad');
        if (colMap.has('modalidad')) {
            modalidad = normalizeModalidad(modalidadRaw);
        } else {
            const edificioCell = getCell(cells, colMap, 'edificio').toUpperCase();
            if (edificioCell === 'MEET' || edificioCell === 'VIRTUAL') {
                modalidad = 'VIRTUAL';
            } else {
                modalidad = 'PRESENCIAL';
            }
        }

        const edificio = getCell(cells, colMap, 'edificio');
        const salon = getCell(cells, colMap, 'salon');
        const inicioRaw = getCell(cells, colMap, 'inicio');
        const finalRaw = getCell(cells, colMap, 'final');
        const diasRaw = getCell(cells, colMap, 'dias');
        const dias = parseDias(diasRaw);
        const catedratico = getCell(cells, colMap, 'catedratico');
        const auxiliar = getCell(cells, colMap, 'auxiliar');
        const detalleCell = cells[colMap.get('detalle')] || '';
        const restricciones = extractRestriccionDetalle(detalleCell);
        const periodoRestr = restricciones === true ? extractPeriodoFromOnclick(detalleCell) : null;

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
            restricciones,
            fuente,
            ...(periodoRestr ? { periodo_restriccion: periodoRestr } : {}),
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

function loadExistingRestricciones(filePath) {
    const map = new Map();
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
            for (const h of data) {
                // Only preserve string values (enriched details)
                if (typeof h.restricciones === 'string') {
                    const key = `${h.codigo}|${h.seccion || ''}|${h.tipo || ''}|${h.inicio || ''}|${(h.dias || [])[0] || ''}`;
                    map.set(key, h.restricciones);
                }
            }
        }
    } catch {}
    return map;
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
        const filePath = `${outDir}/${nombre}.json`;
        const existingRestr = loadExistingRestricciones(filePath);
        let preserved = 0;
        for (const h of horarios) {
            if (typeof h.restricciones !== 'string') {
                const key = `${h.codigo}|${h.seccion || ''}|${h.tipo || ''}|${h.inicio || ''}|${(h.dias || [])[0] || ''}`;
                const existing = existingRestr.get(key);
                if (existing) { h.restricciones = existing; preserved++; }
            }
        }
        if (preserved > 0) console.log(`  -> preservadas ${preserved} restricciones existentes`);
        writeFileSync(filePath, JSON.stringify(horarios, null, 2), 'utf-8');
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