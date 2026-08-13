// scripts/seed-docentes.mjs
// Siembra/actualiza el registro de docentes (catedráticos y auxiliares) en Supabase
// desde el catálogo local (public/json/catalogo.json), con upsert por (nombre, rol).
//
// Requiere:
//   - SUPABASE_SERVICE_ROLE_KEY (service_role; NO usar la anon/publishable)
//   - SUPABASE_URL o VITE_SUPABASE_URL (toma el .env de pemtree-react si existe)
//
// Uso (desde pemtree-react/):
//   SUPABASE_SERVICE_ROLE_KEY=svc_xxx node scripts/seed-docentes.mjs [--depurar]
//
//   --depurar: además, marca activo=false en Supabase a los docentes que ya no
//              existen en el catálogo local (refleja la depuración del pipeline).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOGO_PATH = join(ROOT, 'public', 'json', 'catalogo.json');
const ENV_PATH = join(ROOT, '.env');

const DEPURAR = process.argv.includes('--depurar');
const BATCH = 100;

// Carga ligera de .env (evita depender de dotenv)
function loadEnv() {
    try {
        const raw = readFileSync(ENV_PATH, 'utf-8');
        for (const line of raw.split('\n')) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (m && m[1] && !process.env[m[1]]) {
                process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
            }
        }
    } catch { /* sin .env, usar vars del entorno */ }
}

function normalizarNombre(n) {
    return String(n || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function main() {
    loadEnv();

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!url) {
        console.error('Falta SUPABASE_URL (o VITE_SUPABASE_URL).');
        process.exit(1);
    }
    if (!key) {
        console.error(
            'Falta SUPABASE_SERVICE_ROLE_KEY.\n' +
            'El seed necesita la clave de service_role (NO la anon/publishable) para escribir en la tabla docentes.\n' +
            'Ejecuta: SUPABASE_SERVICE_ROLE_KEY=svc_xxx node scripts/seed-docentes.mjs'
        );
        process.exit(1);
    }

    const catalogo = JSON.parse(readFileSync(CATALOGO_PATH, 'utf-8'));
    if (!Array.isArray(catalogo.docentes)) {
        console.error('El catálogo no contiene docentes:', CATALOGO_PATH);
        process.exit(1);
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const filas = catalogo.docentes.map(d => ({
        nombre: normalizarNombre(d.nombre),
        rol: d.rol,
        nombre_variantes: (d.variantes || []).map(normalizarNombre),
        activo: !!d.activo,
        updated_at: new Date().toISOString(),
    }));

    let insertados = 0;
    for (const lote of chunk(filas, BATCH)) {
        const { data, error } = await supabase
            .from('docentes')
            .upsert(lote, { onConflict: 'nombre,rol' })
            .select('id');
        if (error) {
            console.error('Error en upsert de docentes:', error.message);
            process.exit(1);
        }
        insertados += data ? data.length : 0;
    }
    console.log(`Docentes sincronizados: ${insertados}/${filas.length}`);

    if (DEPURAR) {
        const presentes = new Set(
            catalogo.docentes.map(d => `${normalizarNombre(d.nombre)}|${d.rol}`)
        );
        const { data: dbDocentes, error: listError } = await supabase
            .from('docentes')
            .select('id, nombre, rol');
        if (listError) {
            console.error('Error listando docentes:', listError.message);
            process.exit(1);
        }
        const aDesactivar = (dbDocentes || []).filter(
            d => !presentes.has(`${normalizarNombre(d.nombre)}|${d.rol}`)
        );
        for (const lote of chunk(aDesactivar, BATCH)) {
            const ids = lote.map(d => d.id);
            const { error } = await supabase
                .from('docentes')
                .update({ activo: false, updated_at: new Date().toISOString() })
                .in('id', ids);
            if (error) {
                console.error('Error desactivando docentes:', error.message);
                process.exit(1);
            }
        }
        console.log(`Docentes desactivados por depuración: ${aDesactivar.length}`);
    } else {
        console.log('(--depurar no usado; los docentes ausentes del catálogo no se tocan)');
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
