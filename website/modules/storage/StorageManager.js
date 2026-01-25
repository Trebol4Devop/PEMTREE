// modules/storage/StorageManager.js - Gestión de almacenamiento

export class StorageManager {
    constructor() {
        this.storageKey = 'pemtree_progreso';
    }

    guardarProgreso(cursos) {
        const estado = cursos.map(c => ({ 
            id: c.id, 
            completado: c.completado 
        }));
        localStorage.setItem(this.storageKey, JSON.stringify(estado));
    }

    cargarProgreso(cursos, cursoMap) {
        const guardado = localStorage.getItem(this.storageKey);
        if (guardado) {
            const estado = JSON.parse(guardado);
            estado.forEach(item => {
                const curso = cursoMap.get(item.id);
                if (curso) curso.completado = item.completado;
            });
        }
        this.actualizarDisponibilidad(cursos, cursoMap);
        this.actualizarContadorCreditos(cursos);
    }

    toggleCompletado(cursoId, graphManager, infoCardManager) {
        const curso = graphManager.cursoMap.get(cursoId);
        if (!curso) return;
        
        const nuevoEstado = !curso.completado;
        curso.completado = nuevoEstado;
        
        if (nuevoEstado) {
            this.marcarPrerequisitosComoCompletados(curso, graphManager.cursoMap);
        }

        this.guardarProgreso(graphManager.cursos);
        this.actualizarDisponibilidad(graphManager.cursos, graphManager.cursoMap);
        this.actualizarContadorCreditos(graphManager.cursos);
        
        graphManager.dibujarGrafo();
        
        if (graphManager.getSelectedNode() && graphManager.getSelectedNode().id === cursoId) {
            infoCardManager.mostrar(curso);
        }
    }

    marcarPrerequisitosComoCompletados(curso, cursoMap) {
        curso.prerequisitos.forEach(prereqId => {
            const prereq = cursoMap.get(prereqId);
            if (prereq && !prereq.completado) {
                prereq.completado = true;
                this.marcarPrerequisitosComoCompletados(prereq, cursoMap);
            }
        });
    }

    actualizarDisponibilidad(cursos, cursoMap) {
        cursos.forEach(curso => {
            if (curso.completado) {
                curso.disponible = false;
                return;
            }
            
            if (curso.prerequisitos.length === 0) {
                curso.disponible = true;
            } else {
                const prerequisiosCumplidos = curso.prerequisitos.every(pid => {
                    const prereq = cursoMap.get(pid);
                    return prereq && prereq.completado;
                });
                curso.disponible = prerequisiosCumplidos;
            }
        });
    }

    actualizarContadorCreditos(cursos) {
        let total = 0;
        cursos.forEach(c => {
            if (c.completado) total += c.creditos;
        });
        
        const counter = document.getElementById('creditos-display');
        if (counter) {
            counter.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span>Créditos: ${total}</span>
            `;
        }
    }

    limpiarProgreso(cursos) {
        cursos.forEach(c => c.completado = false);
        localStorage.removeItem(this.storageKey);
        this.actualizarDisponibilidad(cursos, new Map(cursos.map(c => [c.id, c])));
        this.actualizarContadorCreditos(cursos);
    }
}