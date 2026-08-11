import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://redesestudio.ingenieria.usac.edu.gt';
const LANDING_URL = `${BASE_URL}/redesDeEstudio`;
const OUT_DIR = resolve(__dirname, 'pemtree-react', 'public', 'json');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

const CARD_START = '<div class="col-md-5 col-xl-2 mx-3 mt-3 mb-3 card-red-curricular">';
const ROW_START = '<div class="row row-cols-5 py-2 pb-2 body-red-curricular">';

const ORDINALES = {
    PRIMER: 1, SEGUNDO: 2, TERCER: 3, CUARTO: 4, QUINTO: 5, SEXTO: 6,
    SÉPTIMO: 7, OCTAVO: 8, NOVENO: 9, DÉCIMO: 10, UNDÉCIMO: 11, DUODÉCIMO: 12,
};

// Slug de carrera (de la URL) -> base de archivo y nombre mostrable
const CARRERAS = {
    ingenieriaAmbiental: { base: 'ambiental', nombre: 'Ingeniería Ambiental' },
    ingenieriaEnCienciasYSistemas: { base: 'ciencias_y_sistemas', nombre: 'Ingeniería en Ciencias y Sistemas' },
    ingenieriaCivil: { base: 'civil', nombre: 'Ingeniería Civil' },
    ingenieriaElectrica: { base: 'electrica', nombre: 'Ingeniería Eléctrica' },
    ingenieriaElectronica: { base: 'electronica', nombre: 'Ingeniería Electrónica' },
    ingenieriaIndustrial: { base: 'industrial', nombre: 'Ingeniería Industrial' },
    ingenieriaMecanica: { base: 'mecanica', nombre: 'Ingeniería Mecánica' },
    ingenieriaMecanicaElectrica: { base: 'mecanica_electrica', nombre: 'Ingeniería Mecánica Eléctrica' },
    ingenieriaMecanicaIndustrial: { base: 'mecanica_industrial', nombre: 'Ingeniería Mecánica Industrial' },
    ingenieriaQuimica: { base: 'quimica', nombre: 'Ingeniería Química' },
};

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchHTML(url) {
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
    return resp.text();
}

function allIndexes(text, needle) {
    const indexes = [];
    let from = 0;
    while (true) {
        const idx = text.indexOf(needle, from);
        if (idx < 0) break;
        indexes.push(idx);
        from = idx + needle.length;
    }
    return indexes;
}

function normalize(text) {
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Descubre los pensum de la landing page.
 * Cada enlace pertenece a la sección (<h2>) que lo precede.
 * @returns {Array<{href, seccion}>}
 */
function discoverPensums(html) {
    const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
        .map(m => normalize(m[1].replace(/<[^>]+>/g, ' ')).toUpperCase());
    const links = [...html.matchAll(/href="(\/redesDeEstudio\/[^"]+)"/gi)]
        .map(m => m[1]);

    const h2Positions = [...html.matchAll(/<h2[^>]*>/gi)].map(m => m.index);
    const linkPositions = [...html.matchAll(/href="(\/redesDeEstudio\/[^"]+)"/gi)].map(m => m.index);

    // Sección corriente: se actualiza solo con h2 que contienen el año ("ingresaron 2025", etc.)
    // Los h2 auxiliares (p. ej. "Créditos CLAR") no cambian la sección.
    let seccionActual = 'ANTERIOR';
    let h2Idx = 0;

    const result = [];
    const seen = new Set();
    for (let i = 0; i < links.length; i++) {
        const href = links[i];
        const pos = linkPositions[i];
        if (seen.has(href)) continue;
        seen.add(href);

        while (h2Idx < h2Positions.length && h2Positions[h2Idx] < pos) {
            const text = h2s[h2Idx];
            if (text.includes('ANTES DE 2022')) seccionActual = 'ANTERIOR';
            else if (text.includes('2025')) seccionActual = '2025';
            else if (text.includes('2022')) seccionActual = '2022';
            h2Idx++;
        }

        const m = href.match(/^\/redesDeEstudio\/([^/]+)\/(\d+)(?:\/(clar))?$/);
        if (!m) {
            console.warn(`  [WARN] URL no reconocida: ${href}`);
            continue;
        }
        result.push({ href, carrera: m[1], id: m[2], clar: !!m[3], seccion: seccionActual });
    }
    return result;
}

/**
 * Extrae la vigencia de la página de pensum ("Vigente para estudiantes con...").
 */
function extractVigencia(html) {
    const m = html.match(/<small[^>]*class="[^"]*red-title[^"]*"[^>]*>[\s\S]*?Vigente para[^<]*/i);
    if (!m) return '';
    const seg = m[0].slice(m[0].indexOf('Vigente para'));
    return normalize(seg.replace(/<[^>]+>/g, ' '));
}

/**
 * Parsea una página de pensum en una lista de cursos.
 * @returns {Array<{codigo, semestre, nombre, creditos, obligatorio, prereqFragments}>}
 */
function parsePensumPage(html) {
    const cardPositions = allIndexes(html, CARD_START);
    const rowPositions = allIndexes(html, ROW_START);

    const rows = [];
    for (let i = 0; i < rowPositions.length; i++) {
        const start = rowPositions[i];
        const end = i + 1 < rowPositions.length ? rowPositions[i + 1] : html.length;
        const blk = html.slice(start, end);

        const codeMatch = blk.match(/body-red-codigo-division">\s*<small>([^<]+)<\/small>/);
        const credMatch = blk.match(/creditos="(\d+)"/);
        const nameMatch = blk.match(/body-red-descripcion">\s*<small>([^<]+)<\/small>/);
        const dot = blk.includes('bi bi-dot');
        // Fragmentos crudos del prerrequisito en orden (pueden ser trozos como "(0039", "|0031)")
        const prereqFragments = [...blk.matchAll(/body-red-prerrequisito-item">\s*<small>([\s\S]*?)<\/small>/gi)]
            .map(m => normalize(m[1]));

        // Semestre: buscar la tarjeta que precede a este curso
        let semestre = null;
        let semIdx = 0;
        while (semIdx < cardPositions.length && cardPositions[semIdx] < start) semIdx++;
        // semIdx = número de tarjetas antes del curso -> la tarjeta es cardPositions[semIdx-1]
        if (semIdx > 0) {
            const cstart = cardPositions[semIdx - 1];
            const cend = semIdx < cardPositions.length ? cardPositions[semIdx] : html.length;
            const cblock = html.slice(cstart, cend);
            const hdr = cblock.match(/header-red-title">([\s\S]*?)<\/div>/);
            if (hdr) {
                const text = normalize(hdr[1].replace(/<[^>]+>/g, ' ')).toUpperCase();
                const words = text.match(/[A-ZÁÉÍÓÚÑ]+/g) || [];
                for (const palabra of Object.keys(ORDINALES)) {
                    if (words.includes(palabra)) { semestre = ORDINALES[palabra]; break; }
                }
            }
        }

        rows.push({
            codigo: normalize(codeMatch ? codeMatch[1] : ''),
            semestre,
            nombre: (nameMatch ? normalize(nameMatch[1]) : '').toUpperCase(),
            creditos: credMatch ? parseInt(credMatch[1], 10) : 0,
            obligatorio: dot,
            prereqFragments,
        });
    }
    return rows;
}

/**
 * Convierte fragmentos crudos del prerrequisito (ej. ["(0039","|0031)"]) en
 * el texto canónico del pensum. Ejemplos de salida:
 *   ["0732","0152","(0354","|0348)"] -> "0732, 0152, (0354|0348)"
 *   ["(0039","|0031)"]               -> "(0039|0031)"
 *   ["200CR"]                         -> "200CR"
 */
function joinPrereqFragments(fragments) {
    // Unir fragmentos con un espacio; los grupos OR "(0354 |0348)" se dividen
    // en fragmentos, así que colapsamos solo el espacio interno del paréntesis.
    let joined = fragments.join(' ');
    joined = joined.replace(/\(\s*([^)]*?)\s*\)/g, (_, inner) => `(${inner.replace(/\s+/g, '')})`);
    joined = joined.replace(/\s+/g, ' ').trim();
    return joined.split(' ').filter(Boolean).join(', ');
}

/**
 * Extrae todos los códigos de curso (4 dígitos) presentes en los fragmentos,
 * incluidos los que están dentro de grupos OR "(0039|0031)".
 */
function prereqCodes(fragments) {
    return [...fragments.join(' ').matchAll(/\b(\d{4})\b/g)].map(m => m[1]);
}

/**
 * Convierte cursos parseados al formato JSON de los pensum existentes.
 * post_requisitos = nombres de los cursos que listan este como prerrequisito.
 */
function buildJSON(rows) {
    const post = new Map(rows.map(r => [r.codigo, []]));
    for (const r of rows) {
        for (const p of prereqCodes(r.prereqFragments)) {
            if (post.has(p)) post.get(p).push(r.nombre);
        }
    }
    return rows.map(r => {
        const pre = joinPrereqFragments(r.prereqFragments);
        return {
            codigo: r.codigo,
            semestre: String(r.semestre),
            nombre: r.nombre,
            creditos: r.creditos,
            tipo: r.obligatorio ? 'Obligatorio' : 'Electivo',
            pre_requisitos: pre || 'Ninguno',
            post_requisitos: post.get(r.codigo).length ? post.get(r.codigo).join(', ') : 'Ninguno',
        };
    });
}

/**
 * Determina nombre de archivo y nombre mostrable para un pensum.
 */
function naming(pensum, vigencia) {
    const carrera = CARRERAS[pensum.carrera];
    if (!carrera) throw new Error(`Carrera desconocida: ${pensum.carrera}`);

    let sufijo;
    let etiqueta;
    if (pensum.seccion === '2025') {
        sufijo = '_25';
        etiqueta = ' (2025)';
    } else if (pensum.seccion === '2022') {
        sufijo = '_22';
        etiqueta = ' (2022)';
    } else {
        // Anterior a 2022; civil tiene dos variantes según vigencia
        const vig = vigencia.toUpperCase();
        if (pensum.carrera === 'ingenieriaCivil' && vig.includes('ANTES DEL 2017')) {
            sufijo = '_ant17';
            etiqueta = ' (Antiguo)';
        } else if (pensum.carrera === 'ingenieriaCivil' && vig.includes('A PARTIR DEL AÑO 2017')) {
            sufijo = '_2017';
            etiqueta = ' (Antiguo 2017)';
        } else {
            sufijo = '_ant';
            etiqueta = ' (Antiguo)';
        }
    }

    return {
        file: `${carrera.base}${sufijo}.json`,
        name: `${carrera.nombre}${etiqueta}`,
    };
}

async function main() {
    console.log('=== SCRAPER DE PENSUM - REDES DE ESTUDIO FIUSAC ===\n');

    console.log(`Fetching landing page: ${LANDING_URL}`);
    const landingHtml = await fetchHTML(LANDING_URL);
    const pensums = discoverPensums(landingHtml);
    console.log(`  -> ${pensums.length} pensum detectados\n`);

    const index = [];
    const errores = [];

    for (let i = 0; i < pensums.length; i++) {
        const p = pensums[i];
        const url = `${BASE_URL}${p.href}`;
        console.log(`[${i + 1}/${pensums.length}] ${url}`);

        try {
            const html = await fetchHTML(url);
            const vigencia = extractVigencia(html);
            const rows = parsePensumPage(html);

            const bad = rows.filter(r => !r.codigo || r.semestre === null);
            if (bad.length > 0) {
                throw new Error(`${bad.length} filas sin código/semestre válido`);
            }

            const json = buildJSON(rows);
            const { file, name } = naming(p, vigencia);
            const filePath = resolve(OUT_DIR, file);

            // El orden de campos del JSON existente es: codigo, semestre, nombre, creditos, tipo, pre_requisitos, post_requisitos
            writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
            index.push({ file, name });

            console.log(`    -> ${file} (${json.length} cursos)`);
        } catch (e) {
            errores.push({ url: p.href, error: e.message });
            console.log(`    -> ERROR: ${e.message}`);
        }

        await sleep(200 + Math.random() * 300);
    }

    if (errores.length > 0) {
        console.log(`\n=== ERRORES (${errores.length}) ===`);
        errores.forEach(e => console.log(`  - ${e.url}: ${e.error}`));
    }

    // Ordenar index alfabéticamente por archivo y escribir
    index.sort((a, b) => a.file.localeCompare(b.file));
    const indexPath = resolve(OUT_DIR, 'index.json');
    writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

    console.log(`\n=== COMPLETADO ===`);
    console.log(`Archivos en: ${OUT_DIR}`);
    console.log(`index.json con ${index.length} pensums`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
