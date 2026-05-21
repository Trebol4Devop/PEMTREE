import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = new URL('./website/modules/json/ambiental_25.json', import.meta.url).pathname;
const importerURL = new URL('./website/modules/data/importFromJSON.js', import.meta.url).href;

const { importarCursosDesdeJSON } = await import(importerURL);

const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
const cursos = importarCursosDesdeJSON(data);

console.log('Cursos importados:', cursos.length);
console.log('Primeros 5 (codigo -> id -> semestre -> prerequisitos):');
for (let i = 0; i < Math.min(5, cursos.length); i++) {
  const c = cursos[i];
  console.log(` - ${c.codigo} -> ${c.id} -> semestre:${c.semestre} -> prereqIDs:${JSON.stringify(c.prerequisitos)}`);
}

// Buscar un curso con prerequisitos y mostrar su prereq codes and mapped ids
const withPre = cursos.find(c => c.prerequisitos && c.prerequisitos.length > 0);
if (withPre) {
  console.log('\nEjemplo de curso con prerequisitos:');
  console.log(` ${withPre.codigo} (${withPre.nombre}) -> prereq IDs: ${withPre.prerequisitos.join(', ')}`);
}
