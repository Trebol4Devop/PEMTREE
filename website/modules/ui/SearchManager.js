// modules/ui/SearchManager.js - Gestión de búsqueda

import { TextUtils } from '../utils/TextUtils.js';

export class SearchManager {
    constructor(graphManager, panZoomManager) {
        this.graphManager = graphManager;
        this.panZoomManager = panZoomManager;
        this.init();
    }

    init() {
        const searchInput = document.getElementById('buscadorCurso');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const term = TextUtils.normalizarTexto(e.target.value);
            if (term.length < 2) return;
            
            const resultados = this.buscarCursos(term);
            
            if (resultados.length > 0) {
                const mejorCoincidencia = this.ordenarResultados(resultados, term)[0];
                
                // Mostrar optativos si el curso encontrado es optativo
                if (!this.graphManager.showOptional && !mejorCoincidencia.obligatorio) {
                    this.graphManager.setShowOptional(true);
                    const btnOptativos = document.getElementById('cursosObligatorios');
                    if (btnOptativos) {
                        btnOptativos.innerHTML = "Optativos";
                    }
                }
                
                const graphGroup = document.getElementById('grafica-group');
                const cursoSeleccionado = this.graphManager.seleccionarNodo(mejorCoincidencia, graphGroup);
                this.panZoomManager.centrarEnNodo(cursoSeleccionado);
                
                // Mostrar info card
                const infoCardManager = window.app?.uiController?.getInfoCardManager();
                if (infoCardManager) {
                    infoCardManager.mostrar(cursoSeleccionado);
                }
            }
        });
    }

    buscarCursos(term) {
        return this.graphManager.cursos.filter(c => {
            const codigo = TextUtils.normalizarTexto(c.codigo);
            const nombre = TextUtils.normalizarTexto(c.nombre);
            return codigo.includes(term) || nombre.includes(term);
        });
    }

    ordenarResultados(resultados, term) {
        return resultados.sort((a, b) => {
            const nombreA = TextUtils.normalizarTexto(a.nombre);
            const nombreB = TextUtils.normalizarTexto(b.nombre);
            
            if (nombreA === term) return -1;
            if (nombreB === term) return 1;
            
            const aStarts = nombreA.startsWith(term);
            const bStarts = nombreB.startsWith(term);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return a.nombre.length - b.nombre.length;
        });
    }
}