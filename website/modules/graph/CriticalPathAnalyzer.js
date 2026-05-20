// modules/graph/CriticalPathAnalyzer.js - Análisis de ruta crítica (CPM)

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
        const cursos = this.cursos;
        // Inicializar: 1 para los sin prerrequisitos
        cursos.forEach(c => {
            c.semestreMasTemprano = c.prerequisitos.length === 0 ? 1 : 0;
        });

        let changed = true;
        while (changed) {
            changed = false;
            cursos.forEach(curso => {
                if (curso.prerequisitos.length === 0) return;
                let maxPrereqSemestre = 0;
                curso.prerequisitos.forEach(pid => {
                    const p = this.cursoMap.get(pid);
                    if (p && p.semestreMasTemprano > 0) {
                        maxPrereqSemestre = Math.max(maxPrereqSemestre, p.semestreMasTemprano);
                    }
                });
                const nuevoSemestre = maxPrereqSemestre > 0 ? maxPrereqSemestre + 1 : 0;
                if (nuevoSemestre > 0 && nuevoSemestre !== curso.semestreMasTemprano) {
                    curso.semestreMasTemprano = nuevoSemestre;
                    changed = true;
                }
            });
        }
    }

    calcularSemestreMasTardio() {
        const cursos = this.cursos;
        const maxSemestre = Math.max(...cursos.map(c => c.semestreMasTemprano || 1));

        // Inicializar: maxSemestre para los que no tienen posrequisitos, 0 para el resto
        cursos.forEach(c => {
            c.semestreMasTardio = c.posrequisitos.length === 0 ? maxSemestre : 0;
        });

        let changed = true;
        while (changed) {
            changed = false;
            cursos.forEach(curso => {
                if (curso.posrequisitos.length === 0) return;
                let minPosreqSemestre = Infinity;
                curso.posrequisitos.forEach(pid => {
                    const p = this.cursoMap.get(pid);
                    if (p && p.semestreMasTardio > 0) {
                        minPosreqSemestre = Math.min(minPosreqSemestre, p.semestreMasTardio);
                    }
                });
                const nuevoTardio = minPosreqSemestre < Infinity ? minPosreqSemestre - 1 : 0;
                if (nuevoTardio > 0 && nuevoTardio !== curso.semestreMasTardio) {
                    curso.semestreMasTardio = nuevoTardio;
                    changed = true;
                }
            });
        }
    }

    calcularRutaCritica() {
        this.calcularSemestreMasTemprano();
        this.calcularSemestreMasTardio();

        // Cursos obligatorios siempre están en ruta crítica (son indispensables para graduarse).
        // Cursos optativos solo si tienen holgura cero (CPM: semestreMasTemprano == semestreMasTardio).
        this.cursos.forEach(c => {
            const zeroSlack = c.semestreMasTemprano > 0 &&
                               c.semestreMasTardio > 0 &&
                               c.semestreMasTemprano === c.semestreMasTardio;
            c.enRutaCritica = c.obligatorio || zeroSlack;
        });
    }
}