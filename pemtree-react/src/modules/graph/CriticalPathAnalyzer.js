// modules/graph/CriticalPathAnalyzer.js

export class CriticalPathAnalyzer {
    constructor(cursos, cursoMap) {
        this.cursos = cursos;
        this.cursoMap = cursoMap;
    }

    // ---------- Utilidades ----------

    /**
     * Devuelve un mapa id → Set<id> de posrequisitos, sin mutar los cursos.
     */
    _construirPosrequisitos() {
        const posreqs = new Map(this.cursos.map(c => [c.id, new Set()]));

        this.cursos.forEach(curso => {
            curso.prerequisitos.forEach(prereqId => {
                if (posreqs.has(prereqId)) {
                    posreqs.get(prereqId).add(curso.id);
                }
            });
        });

        return posreqs;
    }

    /**
     * Orden topológico usando Kahn's algorithm.
     * Lanza un error si detecta un ciclo (dato inválido).
     * @returns {string[]} ids en orden topológico
     */
    _ordenTopologico() {
        // grado de entrada = número de prerequisitos resueltos pendientes
        const gradoEntrada = new Map(
            this.cursos.map(c => [c.id, c.prerequisitos.length])
        );

        // Cola de cursos listos (sin prerequisitos pendientes)
        const cola = this.cursos
            .filter(c => c.prerequisitos.length === 0)
            .map(c => c.id);

        const orden = [];

        while (cola.length > 0) {
            const id = cola.shift();
            orden.push(id);

            // Reducir grado de entrada de posrequisitos
            const curso = this.cursoMap.get(id);
            curso.prerequisitos; // solo para referencia; los posreqs están abajo
            this.cursos
                .filter(c => c.prerequisitos.includes(id))
                .forEach(c => {
                    const nuevo = gradoEntrada.get(c.id) - 1;
                    gradoEntrada.set(c.id, nuevo);
                    if (nuevo === 0) cola.push(c.id);
                });
        }

        if (orden.length !== this.cursos.length) {
            throw new Error(
                `Ciclo detectado: ${this.cursos.length - orden.length} curso(s) no resolubles.`
            );
        }

        return orden;
    }

    // ---------- Pasada hacia adelante ----------

    _calcularEarly(ordenAdelante) {
        const early = new Map();

        ordenAdelante.forEach(id => {
            const curso = this.cursoMap.get(id);
            if (curso.prerequisitos.length === 0) {
                early.set(id, 1);
            } else {
                const maxPrereq = Math.max(
                    ...curso.prerequisitos.map(pid => early.get(pid) ?? 1)
                );
                early.set(id, maxPrereq + 1);
            }
        });

        return early;
    }

    // ---------- Pasada hacia atrás ----------

    _calcularLate(ordenAdelante, early, posreqs) {
        const maxSemestre = Math.max(...early.values());
        const late = new Map();

        // Recorrer en orden inverso (topológico al revés = orden correcto para late)
        [...ordenAdelante].reverse().forEach(id => {
            const sucesores = [...(posreqs.get(id) ?? [])];

            if (sucesores.length === 0) {
                late.set(id, maxSemestre);
            } else {
                const minSucesor = Math.min(
                    ...sucesores.map(sid => late.get(sid) ?? maxSemestre)
                );
                late.set(id, minSucesor - 1);
            }
        });

        return late;
    }

    // ---------- API pública ----------

    calcularRutaCritica() {
        const posreqs = this._construirPosrequisitos();
        const orden = this._ordenTopologico();
        const early = this._calcularEarly(orden);
        const late = this._calcularLate(orden, early, posreqs);

        this.cursos.forEach(c => {
            c.semestreMasTemprano = early.get(c.id) ?? 0;
            c.semestreMasTardio   = late.get(c.id)  ?? 0;

            const holguraCero =
                c.semestreMasTemprano > 0 &&
                c.semestreMasTardio   > 0 &&
                c.semestreMasTemprano === c.semestreMasTardio;

            c.enRutaCritica = c.obligatorio && holguraCero;
        });
    }
}