import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HORARIOS_DIR = resolve(__dirname, 'pemtree-react', 'public', 'json', 'horarios');

const FILES = ['semestre1', 'semestre2', 'vacaciones1', 'vacaciones2'];
const RESTRICCIONES_URL = 'https://usuarios.ingenieria.usac.edu.gt/restricciones';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'Accept': 'text/html, */*; q=0.01',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://usuarios.ingenieria.usac.edu.gt',
};

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function randomDelay() {
    return 200 + Math.random() * 300;
}

function extractRestriccion(html, seccionInfo) {
    if (!html || html.length < 100) {
        console.error(`  [WARN] Respuesta vacía para ${seccionInfo} => true`);
        return null;
    }

    const bodyMatch = html.match(/<div class="modal-body"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*$/);
    if (!bodyMatch) {
        console.error(`  [WARN] No se encontró modal-body para ${seccionInfo} => true`);
        return null;
    }

    const text = bodyMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // 'Sin Restricciones' = confirmed no restrictions
    if (!text || text.includes('Sin Restricciones')) {
        return false;
    }

    return text;
}

async function fetchRestriccion(codigo, seccion, anio, periodo) {
    const safeSeccion = encodeURIComponent((seccion || '').trim());
    const body = `codigo=${codigo}&seccion=${safeSeccion}&anio=${anio}&periodo=${periodo}`;

    const resp = await fetch(RESTRICCIONES_URL, {
        method: 'POST',
        headers: { ...HEADERS, Referer: `https://usuarios.ingenieria.usac.edu.gt/horarios/semestre/1` },
        body,
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
}

async function processFile(fileName) {
    const filePath = resolve(HORARIOS_DIR, `${fileName}.json`);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(data)) {
        console.error(`  ✗ ${fileName}.json no es un array válido`);
        return;
    }

    const sectionsWithRestr = data.filter(h => h.restricciones === true);
    if (sectionsWithRestr.length === 0) {
        console.log(`  ${fileName}: 0 secciones con restricciones`);
        return;
    }

    console.log(`\n  ${fileName}: ${sectionsWithRestr.length} secciones a verificar...`);

    let realCount = 0;
    let genericCount = 0;
    let errorCount = 0;
    let processed = 0;

    for (const h of sectionsWithRestr) {
        const seccionInfo = `${h.codigo}-${h.seccion}`;
        try {
            const html = await fetchRestriccion(h.codigo, h.seccion, '2026', h.fuente === 'semestre2' ? '02' : h.fuente === 'vacaciones1' ? '03' : h.fuente === 'vacaciones2' ? '04' : '01');
            const result = extractRestriccion(html, seccionInfo);

            if (result === false) {
                h.restricciones = false;
                genericCount++;
            } else if (typeof result === 'string') {
                h.restricciones = result;
                realCount++;
            } else {
                errorCount++;
            }

            processed++;
            if (processed % 20 === 0) {
                process.stdout.write(`\r    ${processed}/${sectionsWithRestr.length}  real:${realCount}  generic:${genericCount}  err:${errorCount}`);
            }
        } catch (e) {
            errorCount++;
            console.error(`\n    [ERR] ${seccionInfo}: ${e.message}`);
        }

        await sleep(randomDelay());
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\r    ✓ ${processed}/${sectionsWithRestr.length}  real:${realCount}  generic:${genericCount}  err:${errorCount}`);
    console.log(`    ✓ ${fileName}.json actualizado`);
}

async function main() {
    const start = Date.now();
    console.log('=== ENRIQUECIMIENTO DE RESTRICCIONES ===');
    console.log(`Fuente: ${RESTRICCIONES_URL}\n`);

    for (const file of FILES) {
        try {
            await processFile(file);
        } catch (e) {
            console.error(`  ✗ Error procesando ${file}: ${e.message}`);
        }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n=== COMPLETADO (${elapsed}s) ===`);
    console.log(`Archivos: ${HORARIOS_DIR}`);
}

main().catch(console.error);
