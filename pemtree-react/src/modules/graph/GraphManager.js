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
        this.viewMode = 'semester';
        this.showCriticalPath = false;
        this.temaOscuro = false;

        // Tracking de elementos DOM para mutación selectiva
        this.nodeElements = new Map();
        this.edgeElements = new Map();
        this.needsFullRebuild = true;

        // Componentes
        this.layoutCalculator = new LayoutCalculator(cursos, cursoMap);
        this.nodeRenderer = new NodeRenderer();
        this.edgeRenderer = new EdgeRenderer();
        this.criticalPathAnalyzer = new CriticalPathAnalyzer(cursos, cursoMap);

        // Managers que se asignan después
        this.storageManager = null;
        this.infoCardManager = null;
        this.onCreditsChange = null;

        // Inicializar análisis
        this.init();
    }

    init() {
        this.cursos.forEach(curso => curso.posrequisitos = []);
        this.cursos.forEach(curso => {
            curso.prerequisitos.forEach(prereqId => {
                const prereq = this.cursoMap.get(prereqId);
                if (prereq && !prereq.posrequisitos.includes(curso.id)) {
                    prereq.posrequisitos.push(curso.id);
                }
            });
        });
        this.criticalPathAnalyzer.calcularRutaCritica();
    }

    updateCursos(nuevosCursos, nuevoMapa) {
        this.cursos = nuevosCursos;
        this.cursoMap = nuevoMapa;
        this.layoutCalculator = new LayoutCalculator(this.cursos, this.cursoMap);
        this.criticalPathAnalyzer = new CriticalPathAnalyzer(this.cursos, this.cursoMap);
        this.selectedNode = null;
        this.nodeElements.clear();
        this.edgeElements.clear();
        this.needsFullRebuild = true;
        this.init();
    }

    async dibujarGrafo() {
        const graphGroup = document.getElementById('grafica-group');
        if (!graphGroup) return;

        if (this.needsFullRebuild) {
            this.layoutCalculator.calcularLayout(
                this.showOptional,
                this.currentLayout,
                this.viewMode
            );
            graphGroup.replaceChildren();
            this.nodeElements.clear();
            this.edgeElements.clear();

            await this._fullRebuild(graphGroup);
            this.needsFullRebuild = false;
            this.ajustarTamanioSVG();
        } else {
            this._updateVisualState();
        }
    }

    async _fullRebuild(graphGroup) {
        const visibleCursos = this.cursos.filter(c => this.showOptional || c.obligatorio);

        if (this.viewMode === 'semester') {
            this._dibujarEncabezadosSemestre(graphGroup, visibleCursos);
        }

        const edgesFragment = document.createDocumentFragment();
        const nodesFragment = document.createDocumentFragment();

        visibleCursos.forEach(curso => {
            curso.posrequisitos.forEach(posreqId => {
                const posreq = this.cursoMap.get(posreqId);
                if (!posreq || (!this.showOptional && !posreq.obligatorio)) return;

                const path = this.edgeRenderer.dibujarArista(
                    edgesFragment, curso, posreq, this.currentLayout,
                    this.selectedNode, this.showCriticalPath, this.temaOscuro
                );
                this.edgeElements.set(path, `${curso.id}->${posreqId}`);
            });
        });

        const nodePromises = visibleCursos.map(curso =>
            this.nodeRenderer.dibujarNodo(
                nodesFragment, curso, this.showCriticalPath, this.temaOscuro,
                (c) => this.onNodeClick(c),
                (c) => this.onNodeDoubleClick(c),
                (c) => this.onNodeLongPress(c),
                this.selectedNode
            ).then(group => {
                this.nodeElements.set(curso.id, group);
            })
        );

        await Promise.all(nodePromises);

        graphGroup.appendChild(edgesFragment);
        graphGroup.appendChild(nodesFragment);

        // Construir índice reverso: key -> path element
        this._edgeKeyToPath = new Map();
        this.edgeElements.forEach((key, path) => {
            this._edgeKeyToPath.set(key, path);
        });
    }

    _dibujarEncabezadosSemestre(graphGroup, visibleCursos) {
        const dims = this.layoutCalculator.getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;
        const isVertical = this.currentLayout === 'vertical';
        const semestres = new Map();

        visibleCursos.forEach(curso => {
            const sem = curso.semestre;
            if (!semestres.has(sem)) semestres.set(sem, []);
            semestres.get(sem).push(curso);
        });

        Array.from(semestres.entries()).sort(([a], [b]) => a - b).forEach(([sem, cursos]) => {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;

            cursos.forEach(curso => {
                minX = Math.min(minX, curso.x);
                maxX = Math.max(maxX, curso.x + nodeWidth);
                minY = Math.min(minY, curso.y);
                maxY = Math.max(maxY, curso.y + nodeHeight);
            });

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('class', 'semester-label');
            label.textContent = `Semestre ${sem}`;

            if (isVertical) {
                const x = Math.max(minX - 16, 10);
                const y = minY + (maxY - minY) / 2;
                label.setAttribute('x', x.toString());
                label.setAttribute('y', y.toString());
                label.setAttribute('text-anchor', 'end');
                label.setAttribute('dominant-baseline', 'middle');
            } else {
                const x = minX + (maxX - minX) / 2;
                const y = Math.max(minY - 14, 16);
                label.setAttribute('x', x.toString());
                label.setAttribute('y', y.toString());
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('dominant-baseline', 'alphabetic');
            }

            label.setAttribute('fill', this.temaOscuro ? '#ffffff' : '#42526E');
            graphGroup.appendChild(label);
        });
    }

    _updateVisualState() {
        const visibleCursos = this.cursos.filter(c => this.showOptional || c.obligatorio);

        visibleCursos.forEach(curso => {
            const group = this.nodeElements.get(curso.id);
            if (group) {
                this.nodeRenderer.actualizarNodo(
                    group, curso, this.showCriticalPath, this.temaOscuro, this.selectedNode
                );
            }

            curso.posrequisitos.forEach(posreqId => {
                const posreq = this.cursoMap.get(posreqId);
                if (!posreq || (!this.showOptional && !posreq.obligatorio)) return;
                const key = `${curso.id}->${posreqId}`;
                const path = this._edgeKeyToPath.get(key);
                if (path) {
                    this.edgeRenderer.actualizarArista(
                        path, curso, posreq, this.selectedNode,
                        this.showCriticalPath, this.temaOscuro
                    );
                }
            });
        });
    }

    seleccionarNodo(curso) {
        if (this.selectedNode && this.selectedNode.id === curso.id) {
            this.desseleccionarNodo();
            if (this.infoCardManager) {
                this.infoCardManager.ocultar?.();
            }
            return null;
        }

        if (this.selectedNode) {
            this.selectedNode.selected = false;
        }

        curso.selected = true;
        this.selectedNode = curso;

        this.cursos.forEach(c => c.highlighted = false);

        const ruta = this.encontrarRutaHastaCurso(curso);
        ruta.forEach(id => {
            const c = this.cursoMap.get(id);
            if (c) c.highlighted = true;
        });

        // También resaltar los posrequisitos (cursos que dependen de este)
        this.cursos.forEach(c => {
            if (c.prerequisitos.includes(curso.id)) {
                c.highlighted = true;
            }
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

    onNodeClick(curso) {
        return this.seleccionarNodo(curso);
    }

    onNodeLongPress(curso) {
        if (this.selectedNode && this.selectedNode.id === curso.id) {
            if (this.infoCardManager) {
                this.infoCardManager.mostrar(curso);
            }
            return curso;
        }
        const result = this.seleccionarNodo(curso);
        if (result && this.infoCardManager) {
            this.infoCardManager.mostrar(curso);
        }
        return result;
    }

    async onNodeDoubleClick(curso) {
        if (this.storageManager) {
            await this.storageManager.cycleEstado(curso.id, this, this.infoCardManager);
            if (this.onCreditsChange) this.onCreditsChange();
        } else {
            if (!curso.completado && !curso.cursando) {
                curso.completado = true;
            } else if (curso.completado) {
                curso.completado = false;
                curso.cursando = true;
            } else {
                curso.cursando = false;
            }
            await this.dibujarGrafo();
            if (this.onCreditsChange) this.onCreditsChange();
        }

        if (window.innerWidth <= 768 && this.infoCardManager) {
            this.infoCardManager.ocultar?.();
        }
    }

    desseleccionarNodo() {
        if (this.selectedNode) {
            this.selectedNode.selected = false;
            this.selectedNode = null;
            this.cursos.forEach(c => c.highlighted = false);
            this.dibujarGrafo();
        }
        const infoCard = document.getElementById('infoCard');
        if (infoCard) infoCard.classList.add('hidden');
    }

    ajustarTamanioSVG() {
        const svg = document.getElementById('svg-grafica');
        if (!svg) return;

        let maxX = 0, maxY = 0;
        this.cursos.forEach(c => {
            if (!this.showOptional && !c.obligatorio) return;
            const dims = this.layoutCalculator.getNodeDimensions();
            maxX = Math.max(maxX, c.x + dims.width);
            maxY = Math.max(maxY, c.y + dims.height);
        });

        svg.setAttribute("width", `${Math.max(maxX + 100, 2000)}px`);
        svg.setAttribute("height", `${Math.max(maxY + 100, 2000)}px`);
    }

    setShowOptional(value) {
        this.showOptional = value;
        this.needsFullRebuild = true;
        this.dibujarGrafo();
    }

    setCurrentLayout(layout) {
        this.currentLayout = layout;
        this.needsFullRebuild = true;
        this.dibujarGrafo();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.needsFullRebuild = true;
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
