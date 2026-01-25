// modules/graph/CriticalPathAnalyzer.js - Análisis de ruta crítica

export class CriticalPathAnalyzer {
    constructor(cursos, cursoMap) {
        this.cursos = cursos;
        this.cursoMap = cursoMap;
    }

    calcularPosrequisitos() {
        this.cursos.forEach(curso => {
            curso.prerequisitos.forEach(prereqId => {
                const prereq = this.cursoMap.get(prereqId);
                if (prereq && !prereq.posrequisitos.includes(curso.id)) {
                    prereq.posrequisitos.push(curso.id);
                }
            });
        });
    }

    calcularSemestreMasTemprano() {
        let changed = true;
        
        this.cursos.forEach(c => c.semestreMasTemprano = 1);

        while(changed) {
            changed = false;
            this.cursos.forEach(curso => {
                let maxPrereqSemestre = 0;
                curso.prerequisitos.forEach(pid => {
                    const p = this.cursoMap.get(pid);
                    if(p) maxPrereqSemestre = Math.max(maxPrereqSemestre, p.semestreMasTemprano);
                });
                
                const nuevoSemestre = curso.prerequisitos.length > 0 ? maxPrereqSemestre + 1 : 1;
                
                if(nuevoSemestre > curso.semestreMasTemprano) {
                    curso.semestreMasTemprano = nuevoSemestre;
                    changed = true;
                }
            });
        }
    }

    calcularRutaCritica() {
        this.calcularSemestreMasTemprano();
        
        const maxSemestre = Math.max(...this.cursos.map(c => c.semestreMasTemprano));
        
        this.cursos.forEach(c => c.enRutaCritica = false);
        
        let nodosCandidatos = this.cursos.filter(c => c.semestreMasTemprano === maxSemestre);
        
        const visitados = new Set();
        const cola = [...nodosCandidatos];
        
        while(cola.length > 0) {
            const actual = cola.shift();
            if(visitados.has(actual.id)) continue;
            visitados.add(actual.id);
            
            actual.enRutaCritica = true;
            
            actual.prerequisitos.forEach(pid => {
                const prereq = this.cursoMap.get(pid);
                if(prereq && prereq.semestreMasTemprano === actual.semestreMasTemprano - 1) {
                    cola.push(prereq);
                }
            });
        }
    }
}