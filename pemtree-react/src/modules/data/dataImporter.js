// modules/data/dataImporter.js - Utilidad para importar datos

import { importarCursosDesdeJSON, combinarConCursosExistentes, reemplazarCursosDesdeJSON } from './importFromJSON.js';
import { cursos, cursoMap } from './cursos.js';

/**
 * Clase para manejar la importación de datos desde múltiples fuentes
 */
export class DataImporter {
    constructor() {
        this.cursosImportados = [];
    }

    /**
     * Importa cursos desde un JSON string
     * @param {string} jsonString - JSON como string
     * @param {string} mode - 'replace' o 'combine'
     * @returns {Array} Array de cursos importados
     */
    importFromJSONString(jsonString, mode = 'replace') {
        try {
            const jsonData = JSON.parse(jsonString);
            
            if (mode === 'replace') {
                this.cursosImportados = reemplazarCursosDesdeJSON(jsonData);
            } else {
                this.cursosImportados = combinarConCursosExistentes(jsonData, cursos);
            }
            
            console.log(`✅ Importados ${this.cursosImportados.length} cursos`);
            return this.cursosImportados;
        } catch (error) {
            console.error('❌ Error importando JSON:', error);
            throw error;
        }
    }

    /**
     * Importa cursos desde una URL
     * @param {string} url - URL del JSON
     * @param {string} mode - 'replace' o 'combine'
     * @returns {Promise<Array>} Promesa con los cursos importados
     */
    async importFromURL(url, mode = 'replace') {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jsonData = await response.json();
            
            if (mode === 'replace') {
                this.cursosImportados = reemplazarCursosDesdeJSON(jsonData);
            } else {
                this.cursosImportados = combinarConCursosExistentes(jsonData, cursos);
            }
            
            console.log(`✅ Importados ${this.cursosImportados.length} cursos desde ${url}`);
            return this.cursosImportados;
        } catch (error) {
            console.error('❌ Error importando desde URL:', error);
            throw error;
        }
    }

    /**
     * Obtiene el mapa de cursos importados
     * @returns {Map} Mapa de cursos
     */
    getCursoMap() {
        const map = new Map();
        this.cursosImportados.forEach(curso => map.set(curso.id, curso));
        return map;
    }

    /**
     * Exporta los cursos actuales a JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        const cursosParaExportar = this.cursosImportados.length > 0 
            ? this.cursosImportados 
            : cursos;
        
        const datosExportar = cursosParaExportar.map(curso => ({
            id: curso.id,
            codigo: curso.codigo,
            nombre: curso.nombre,
            creditos: curso.creditos,
            tipo: curso.obligatorio ? "Obligatorio" : "Opcional",
            semestre: curso.semestre,
            prerequisitos: curso.prerequisitos.map(id => {
                const preCurso = cursosParaExportar.find(c => c.id === id);
                return preCurso ? preCurso.codigo : '';
            }).filter(cod => cod !== '').join(', ')
        }));

        return JSON.stringify(datosExportar, null, 2);
    }
}

// Ejemplo de uso en tu aplicación principal:
/*
import { DataImporter } from './modules/data/dataImporter.js';

const importer = new DataImporter();

// Importar desde un string JSON
const jsonString = `[...tu JSON aquí...]`;
importer.importFromJSONString(jsonString, 'combine');

// O importar desde una URL
importer.importFromURL('https://ejemplo.com/cursos.json', 'replace');

// Obtener los cursos importados
const cursosImportados = importer.cursosImportados;
const nuevoMapa = importer.getCursoMap();

// Exportar a JSON
const jsonExportado = importer.exportToJSON();
console.log(jsonExportado);
*/