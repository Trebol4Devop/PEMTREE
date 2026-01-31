// modules/graph/GraphManager.js - Gestión del grafo

import { LayoutCalculator } from './LayoutCalculator.js';
import { NodeRenderer } from './NodeRenderer.js';
import { EdgeRenderer } from './EdgeRenderer.js';
import { CriticalPathAnalyzer } from './CriticalPathAnalyzer.js';

export class GraphManager {
    constructor(cursos, cursoMap) {
        this.cursos = cursos;
        this.cursoMap = cursoMap;
        this.selectedNode = null;
        this.showOptional = true;
        this.currentLayout = 'horizontal';
        this.viewMode = 'topological';
        this.showCriticalPath = false;
        this.temaOscuro = false;
        
        // Componentes
        this.layoutCalculator = new LayoutCalculator(cursos, cursoMap);
        this.nodeRenderer = new NodeRenderer();
        this.edgeRenderer = new EdgeRenderer();
        this.criticalPathAnalyzer = new CriticalPathAnalyzer(cursos, cursoMap);
        
        // Managers que se asignan después (en UIController)
        this.storageManager = null;
        this.infoCardManager = null;
        
        // Inicializar análisis
        this.init();
    }

    init() {
        this.criticalPathAnalyzer.calcularPosrequisitos();
        this.criticalPathAnalyzer.calcularRutaCritica();
    }

    /**
     * Actualiza los cursos y el mapa, reconfigura calculadores y recalcula la ruta
     * @param {Array} nuevosCursos
     * @param {Map} nuevoMapa
     */
    updateCursos(nuevosCursos, nuevoMapa) {
        this.cursos = nuevosCursos;
        this.cursoMap = nuevoMapa;
        // Reinstanciar calculadores que dependen de la estructura de cursos
        this.layoutCalculator = new LayoutCalculator(this.cursos, this.cursoMap);
        this.criticalPathAnalyzer = new CriticalPathAnalyzer(this.cursos, this.cursoMap);
        // Recalcular análisis
        this.init();
    } 

    async dibujarGrafo() {
        const graphGroup = document.getElementById('grafica-group');
        if (!graphGroup) return;

        // Limpiar contenido
        while (graphGroup.firstChild) {
            graphGroup.removeChild(graphGroup.firstChild);
        }

        // Calcular layout
        this.layoutCalculator.calcularLayout(
            this.showOptional,
            this.currentLayout,
            this.viewMode
        );

        console.debug(`[GraphManager] Cursos totales: ${this.cursos.length}`);

        // Dibujar aristas
        this.cursos.forEach(curso => {
            if (!this.showOptional && !curso.obligatorio) return;
            
            curso.posrequisitos.forEach(posreqId => {
                const posreq = this.cursoMap.get(posreqId);
                if (!posreq || (!this.showOptional && !posreq.obligatorio)) return;
                
                this.edgeRenderer.dibujarArista(
                    graphGroup,
                    curso,
                    posreq,
                    this.currentLayout,
                    this.selectedNode,
                    this.showCriticalPath,
                    this.temaOscuro
                );
            });
        });

        // Dibujar nodos en paralelo
        const nodePromises = this.cursos
            .filter(curso => this.showOptional || curso.obligatorio)
            .map(curso => this.nodeRenderer.dibujarNodo(
                graphGroup,
                curso,
                this.showCriticalPath,
                this.temaOscuro,
                (c) => this.onNodeClick(c, graphGroup),
                (c) => this.onNodeDoubleClick(c, graphGroup)
            ));

        await Promise.all(nodePromises);

        // Contar nodos dibujados (compatibilidad con distintos renderers)
        const nodeCount = graphGroup.querySelectorAll('.node-rect, .node-group, .node-composite').length;
        console.debug(`[GraphManager] Nodos dibujados: ${nodeCount}`);

        // Ajustar tamaño SVG
        this.ajustarTamanioSVG();
    }

    seleccionarNodo(curso, graphGroup) {
        if (this.selectedNode) {
            this.selectedNode.selected = false;
        }
        
        curso.selected = true;
        this.selectedNode = curso;
        
        // Resetear highlights
        this.cursos.forEach(c => c.highlighted = false);
        
        // Marcar ruta hasta el curso
        const ruta = this.encontrarRutaHastaCurso(curso);
        ruta.forEach(id => {
            const c = this.cursoMap.get(id);
            if(c) c.highlighted = true;
        });

        this.dibujarGrafo();
        return curso;
    }

    encontrarRutaHastaCurso(cursoObjetivo) {
        const visitados = new Set();
        const ruta = new Set();
        
        const buscarPrerequisitos = (curso) => {
            if (visitados.has(curso.id)) return;
            visitados.add(curso.id);
            ruta.add(curso.id);
            
            curso.prerequisitos.forEach(prereqId => {
                const prereq = this.cursoMap.get(prereqId);
                if (prereq) {
                    buscarPrerequisitos(prereq);
                }
            });
        };
        
        buscarPrerequisitos(cursoObjetivo);
        return ruta;
    }

    onNodeClick(curso, graphGroup) {
        return this.seleccionarNodo(curso, graphGroup);
    }

    onNodeDoubleClick(curso, graphGroup) {
        // Usar toggleCompletado del storageManager si está disponible
        if (this.storageManager) {
            this.storageManager.toggleCompletado(curso.id, this, this.infoCardManager);
        } else {
            // Fallback: alternar el estado directamente
            curso.completado = !curso.completado;
            this.dibujarGrafo();
        }
    }

    desseleccionarNodo() {
        if (this.selectedNode) {
            this.selectedNode.selected = false;
            this.selectedNode = null;
            this.cursos.forEach(c => c.highlighted = false);
            this.dibujarGrafo();
        }
    }

    ajustarTamanioSVG() {
        const svg = document.getElementById('svg-grafica');
        if (!svg) return;

        let maxX = 0, maxY = 0;
        
        this.cursos.forEach(c => {
            if(!this.showOptional && !c.obligatorio) return;
            const dims = this.layoutCalculator.getNodeDimensions();
            maxX = Math.max(maxX, c.x + dims.width);
            maxY = Math.max(maxY, c.y + dims.height);
        });

        svg.setAttribute("width", `${Math.max(maxX + 100, 2000)}px`);
        svg.setAttribute("height", `${Math.max(maxY + 100, 2000)}px`);
    }

    // Setters para cambiar modos de vista
    setShowOptional(value) {
        this.showOptional = value;
        this.dibujarGrafo();
    }

    setCurrentLayout(layout) {
        this.currentLayout = layout;
        this.dibujarGrafo();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.dibujarGrafo();
    }

    setShowCriticalPath(value) {
        this.showCriticalPath = value;
        this.dibujarGrafo();
    }

    setTemaOscuro(value) {
        this.temaOscuro = value;
        this.dibujarGrafo();
    }

    getSelectedNode() {
        return this.selectedNode;
    }
}