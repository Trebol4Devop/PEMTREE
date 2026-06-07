// modules/storage/StorageManager.js - Gestión de almacenamiento

import { getPensumKey } from '../data/cursos.js';

export class StorageManager {
    constructor() {
        this._baseKey = 'pemtree_progreso';
        this._pensumKey = 'pemtree_pensum_actual';
        this._idiomaEquivalenciaKey = 'pemtree_idioma_equivalencia';
    }

    getIdiomaEquivalencia() {
        return localStorage.getItem(this._idiomaEquivalenciaKey) === 'true';
    }

    setIdiomaEquivalencia(val) {
        localStorage.setItem(this._idiomaEquivalenciaKey, val ? 'true' : 'false');
    }

    get storageKey() {
        const pensumKey = getPensumKey();
        return pensumKey ? `${this._baseKey}_${pensumKey}` : this._baseKey;
    }

    guardarProgreso(cursos) {
        const estado = cursos.map(c => ({ 
            id: c.id,
            completado: c.completado,
            cursando: c.cursando
        }));
        localStorage.setItem(this.storageKey, JSON.stringify(estado));
    }

    cargarProgreso(cursos, cursoMap) {
        const guardado = localStorage.getItem(this.storageKey);
        if (guardado) {
            const estado = JSON.parse(guardado);
            estado.forEach(item => {
                const curso = cursoMap.get(item.id);
                if (curso) {
                    curso.completado = item.completado;
                    if (item.cursando !== undefined) curso.cursando = item.cursando;
                }
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
        if (nuevoEstado) curso.cursando = false;
        
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
        const idiomaEquiv = this.getIdiomaEquivalencia();
        let total = 0;
        cursos.forEach(c => {
            if (c.completado) {
                if (idiomaEquiv && c.esIdiomaTecnico) return;
                total += c.creditos;
            }
        });
        
        const counter = document.getElementById('creditos-display');
        if (counter) {
            counter.innerHTML = `<span>Créditos: ${total}</span>`;
        }
    }

    async cycleEstado(cursoId, graphManager, infoCardManager) {
        const curso = graphManager.cursoMap.get(cursoId);
        if (!curso) return;

        if (!curso.completado && !curso.cursando) {
            curso.completado = true;
            this.marcarPrerequisitosComoCompletados(curso, graphManager.cursoMap);
        } else if (curso.completado) {
            curso.completado = false;
            curso.cursando = true;
        } else {
            curso.cursando = false;
        }

        this.guardarProgreso(graphManager.cursos);
        this.actualizarDisponibilidad(graphManager.cursos, graphManager.cursoMap);
        graphManager.needsFullRebuild = true;
        await graphManager.dibujarGrafo();

        if (graphManager.getSelectedNode() && graphManager.getSelectedNode().id === cursoId) {
            infoCardManager.mostrar(curso);
        }
    }

    limpiarProgreso(cursos) {
        cursos.forEach(c => { c.completado = false; c.cursando = false; });
        localStorage.removeItem(this.storageKey);
        this.actualizarDisponibilidad(cursos, new Map(cursos.map(c => [c.id, c])));
        this.actualizarContadorCreditos(cursos);
    }

    // Métodos para guardar y cargar el pensum actual
    guardarPensumActual(pensumFile) {
        if (pensumFile) {
            localStorage.setItem(this._pensumKey, pensumFile);
        }
    }

    cargarPensumGuardado() {
        return localStorage.getItem(this._pensumKey);
    }

}