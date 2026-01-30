// modules/graph/LayoutCalculator.js - Cálculo de posiciones

export class LayoutCalculator {
    constructor(cursos, cursoMap) {
        this.cursos = cursos;
        this.cursoMap = cursoMap;
    }

    getNodeDimensions() {
        const isMobile = window.innerWidth <= 768;
        const baseHeight = isMobile ? 48 : 90;
        const height = Math.round(baseHeight * 0.6); // igual reducción que NodeRenderer
        const width = height * 6; // formato 6:1
        return { width, height };
    }

    calcularLayout(showOptional, currentLayout, viewMode) {
        const dims = this.getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;
        
        let nivelesMap;
        
        if(viewMode === 'semester') {
            nivelesMap = this.calcularNivelesPorSemestre(showOptional);
        } else {
            nivelesMap = this.calcularNivelesTopologicos(showOptional);
        }

        const niveles = Array.from(nivelesMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([_, nodos]) => this.ordenarNodosEnNivel(nodos));
        
        const isVertical = currentLayout === 'vertical';
        const isMobile = window.innerWidth <= 768;
        
        const gapX = isMobile ? (isVertical ? 50 : 180) : (isVertical ? 80 : 300);
        let gapY = isMobile ? (isVertical ? 70 : 15) : (isVertical ? 100 : 20);

        // Si la vista es por semestres, separar más para evitar traslapes
        if (viewMode === 'semester') {
            gapY = Math.round(gapY * 3);
        }

        niveles.forEach((nivel, levelIndex) => {
            const nodesInLevel = nivel.length;
            
            nivel.forEach((nodeId, nodeIndex) => {
                const curso = this.cursoMap.get(nodeId);
                
                if (isVertical) {
                    const levelWidth = nodesInLevel * (nodeWidth + gapX);
                    const startX = 50 + (2000 - levelWidth) / 2;
                    curso.x = startX + nodeIndex * (nodeWidth + gapX);
                    curso.y = 50 + levelIndex * (nodeHeight + gapY);
                } else {
                    const levelHeight = nodesInLevel * (nodeHeight + gapY);
                    const startY = 50 + (1500 - levelHeight) / 2;
                    curso.x = 50 + levelIndex * (nodeWidth + gapX);
                    curso.y = startY + nodeIndex * (nodeHeight + gapY);
                }
            });
        });
    }

    calcularNivelesTopologicos(showOptional) {
        const indegree = new Map();
        const niveles = new Map();
        const queue = [];
        
        const cursosVisibles = this.cursos.filter(curso => 
            showOptional || curso.obligatorio
        );
        
        cursosVisibles.forEach(curso => {
            const prerequisitosVisibles = curso.prerequisitos.filter(id => 
                cursosVisibles.some(c => c.id === id)
            );
            indegree.set(curso.id, prerequisitosVisibles.length);
        });
        
        cursosVisibles.forEach(curso => {
            if (indegree.get(curso.id) === 0) {
                queue.push({ curso, nivel: 0 });
            }
        });
        
        while (queue.length > 0) {
            const { curso, nivel } = queue.shift();
            
            if (!niveles.has(nivel)) {
                niveles.set(nivel, []);
            }
            niveles.get(nivel).push(curso.id);
            curso.nivel = nivel;
            
            curso.posrequisitos.forEach(posreqId => {
                const posreq = this.cursoMap.get(posreqId);
                if (!posreq || (!showOptional && !posreq.obligatorio)) return;
                
                indegree.set(posreqId, indegree.get(posreqId) - 1);
                if (indegree.get(posreqId) === 0) {
                    queue.push({ curso: posreq, nivel: nivel + 1 });
                }
            });
        }
        
        return niveles;
    }

    calcularNivelesPorSemestre(showOptional) {
        const niveles = new Map();
        const cursosVisibles = this.cursos.filter(curso => 
            showOptional || curso.obligatorio
        );
        
        cursosVisibles.forEach(curso => {
            const sem = curso.semestre;
            if(!niveles.has(sem)) niveles.set(sem, []);
            niveles.get(sem).push(curso.id);
            curso.nivel = sem;
        });
        
        return niveles;
    }

    ordenarNodosEnNivel(nivel) {
        return nivel.sort((a, b) => {
            const cursoA = this.cursoMap.get(a);
            const cursoB = this.cursoMap.get(b);
            return cursoA.codigo.localeCompare(cursoB.codigo);
        });
    }
}