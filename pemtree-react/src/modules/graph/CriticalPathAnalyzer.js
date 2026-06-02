// modules/graph/CriticalPathAnalyzer.js

export class CriticalPathAnalyzer {
    constructor(cursos, cursoMap) {
        this.cursos = cursos;
        this.cursoMap = cursoMap;
        this.MIN_CREDITOS = 300;
        this.MIN_SOCIAL_HUM = 8;
        this.rutas = [];
        this.rutaActivaIndex = 0;
    }

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

    _ordenTopologico() {
        const gradoEntrada = new Map(
            this.cursos.map(c => [c.id, c.prerequisitos.length])
        );
        const cola = this.cursos
            .filter(c => c.prerequisitos.length === 0)
            .map(c => c.id);
        const orden = [];

        while (cola.length > 0) {
            const id = cola.shift();
            orden.push(id);
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

    _calcularLate(ordenAdelante, early, posreqs, maxSem) {
        const maxSemestre = maxSem || Math.max(...early.values());
        const late = new Map();
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

    _creditosContables(curso, idiomaEquivalencia) {
        if (curso.esIdiomaTecnico && idiomaEquivalencia) return 0;
        return curso.creditos;
    }

    _seleccionarElectivos(tipo, idiomaEquivalencia) {
        const obligatorios = this.cursos.filter(c => c.obligatorio);
        const electivos = this.cursos.filter(c => !c.obligatorio);

        let creditosObligatorios = 0;
        let socialHumObligatorios = 0;
        obligatorios.forEach(c => {
            creditosObligatorios += this._creditosContables(c, idiomaEquivalencia);
            if (c.esSocialHum) socialHumObligatorios += c.creditos;
        });

        const electivosSH = electivos
            .filter(c => c.esSocialHum)
            .sort((a, b) => b.creditos - a.creditos);

        const electivosPrioritarios = electivos
            .filter(c => !c.esSocialHum && !c.esIdiomaTecnico)
            .sort((a, b) => b.creditos - a.creditos);

        const electivosIdioma = electivos
            .filter(c => c.esIdiomaTecnico)
            .sort((a, b) => a.semestre - b.semestre);

        const seleccionados = new Set();
        let creditosAcumulados = creditosObligatorios;
        let socialHumAcumulados = socialHumObligatorios;

        electivosSH.forEach(c => {
            seleccionados.add(c.id);
            creditosAcumulados += this._creditosContables(c, idiomaEquivalencia);
            socialHumAcumulados += c.creditos;
        });

        if (tipo === 'minima') {
            for (const c of electivosPrioritarios) {
                if (creditosAcumulados >= this.MIN_CREDITOS) break;
                seleccionados.add(c.id);
                creditosAcumulados += this._creditosContables(c, idiomaEquivalencia);
            }
            if (!idiomaEquivalencia) {
                for (const c of electivosIdioma) {
                    if (creditosAcumulados >= this.MIN_CREDITOS) break;
                    seleccionados.add(c.id);
                    creditosAcumulados += this._creditosContables(c, idiomaEquivalencia);
                }
            } else {
                electivosIdioma.forEach(c => seleccionados.add(c.id));
            }
        } else if (tipo === 'completa') {
            electivosPrioritarios.forEach(c => {
                seleccionados.add(c.id);
                creditosAcumulados += this._creditosContables(c, idiomaEquivalencia);
            });
            if (!idiomaEquivalencia) {
                electivosIdioma.forEach(c => {
                    seleccionados.add(c.id);
                    creditosAcumulados += this._creditosContables(c, idiomaEquivalencia);
                });
            } else {
                electivosIdioma.forEach(c => seleccionados.add(c.id));
            }
        }

        return {
            seleccionados,
            creditosTotales: creditosAcumulados,
            socialHumCreditos: socialHumAcumulados,
            idiomaEquivalencia
        };
    }

    _distribuirCarga(cursosIds, early, idiomaEquivalencia, maxCarga) {
        const cursoById = new Map();
        this.cursos.forEach(c => cursoById.set(c.id, c));

        const resultado = new Map();
        const semCarga = new Map();
        const ordenados = [...cursosIds].sort((a, b) => {
            const ea = early.get(a) ?? 1;
            const eb = early.get(b) ?? 1;
            if (ea !== eb) return ea - eb;
            const ca = cursoById.get(a);
            const cb = cursoById.get(b);
            return (cb?.creditos ?? 0) - (ca?.creditos ?? 0);
        });

        for (const id of ordenados) {
            const curso = cursoById.get(id);
            if (!curso) continue;
            const minSem = early.get(id) ?? 1;
            let sem = minSem;
            while (true) {
                let prereqsOk = true;
                for (const pid of curso.prerequisitos) {
                    if (!cursosIds.has(pid)) continue;
                    const ps = resultado.get(pid);
                    if (ps === undefined || ps >= sem) {
                        prereqsOk = false;
                        break;
                    }
                }
                const carga = semCarga.get(sem) || 0;
                const cr = this._creditosContables(curso, idiomaEquivalencia);
                if (prereqsOk && (carga + cr <= maxCarga || sem <= minSem)) {
                    resultado.set(id, sem);
                    semCarga.set(sem, carga + cr);
                    break;
                }
                sem++;
            }
        }
        return resultado;
    }

    calcularRutasCriticas(idiomaEquivalencia = false) {
        const posreqs = this._construirPosrequisitos();
        const orden = this._ordenTopologico();
        const early = this._calcularEarly(orden);
        const late = this._calcularLate(orden, early, posreqs);

        const cursoById = new Map();
        this.cursos.forEach(c => cursoById.set(c.id, c));
        const obligatoriosIds = new Set(this.cursos.filter(c => c.obligatorio).map(c => c.id));

        // Filtrar posreqs solo para cursos en cada ruta
        const posreqsEnRuta = (cursosIds) => {
            const pr = new Map();
            cursosIds.forEach(id => pr.set(id, new Set()));
            cursosIds.forEach(id => {
                const curso = cursoById.get(id);
                if (!curso) return;
                curso.prerequisitos.forEach(pid => {
                    if (cursosIds.has(pid) && pr.has(pid)) {
                        pr.get(pid).add(id);
                    }
                });
            });
            return pr;
        };

        const calcularHolgura = (cursosIds, earlyBase, lateBase) => {
            const enRutaCritica = new Set();
            cursosIds.forEach(id => {
                const e = earlyBase.get(id) ?? 0;
                const l = lateBase.get(id) ?? 0;
                if (e > 0 && l > 0 && e === l) {
                    enRutaCritica.add(id);
                }
            });
            return enRutaCritica;
        };

        const calcularHolguraDistribuida = (cursosIds, distribucion, earlyBase) => {
            const maxSem = Math.max(...distribucion.values());
            const lateDist = new Map();
            const prEnRuta = posreqsEnRuta(cursosIds);

            [...cursosIds].sort((a, b) => (distribucion.get(b) ?? 0) - (distribucion.get(a) ?? 0))
                .forEach(id => {
                    const sucesores = [...(prEnRuta.get(id) ?? [])];
                    if (sucesores.length === 0) {
                        lateDist.set(id, maxSem);
                    } else {
                        const minSuc = Math.min(...sucesores.map(sid => lateDist.get(sid) ?? maxSem));
                        lateDist.set(id, minSuc - 1);
                    }
                });

            const enRutaCritica = new Set();
            cursosIds.forEach(id => {
                const e = distribucion.get(id) ?? (earlyBase.get(id) ?? 0);
                const l = lateDist.get(id) ?? 0;
                if (e > 0 && l > 0 && e === l) {
                    enRutaCritica.add(id);
                }
            });
            return enRutaCritica;
        };

        // === PATH A: Mas Rapida - minima seleccion de electivos ===
        const selMinima = this._seleccionarElectivos('minima', idiomaEquivalencia);
        const cursosA = new Set([...obligatoriosIds, ...selMinima.seleccionados]);
        const holguraA = calcularHolgura(cursosA, early, late);

        // === PATH B: Mas Flexible - misma seleccion, redistribuida ===
        const distribucionB = this._distribuirCarga(cursosA, early, idiomaEquivalencia, 25);
        const holguraB = calcularHolguraDistribuida(cursosA, distribucionB, early);
        const cargaPorSemB = new Map();
        distribucionB.forEach((sem, id) => {
            const curso = cursoById.get(id);
            if (!curso) return;
            const cr = this._creditosContables(curso, idiomaEquivalencia);
            cargaPorSemB.set(sem, (cargaPorSemB.get(sem) || 0) + cr);
        });
        const maxCargaB = Math.max(...cargaPorSemB.values());
        const minCargaB = Math.min(...cargaPorSemB.values());
        const maxSemB = Math.max(...distribucionB.values());

        // === PATH C: Balanceada - todos los electivos ===
        const selCompleta = this._seleccionarElectivos('completa', idiomaEquivalencia);
        const cursosC = new Set([...obligatoriosIds, ...selCompleta.seleccionados]);
        const holguraC = calcularHolgura(cursosC, early, late);

        const makePath = (cursosIds, nombre, criterio, enRutaCritica, creditos, shCreds, opts = {}) => {
            const advertencias = [];
            let maxSemestre = 0;
            cursosIds.forEach(id => {
                const e = early.get(id) ?? 0;
                if (e > maxSemestre) maxSemestre = e;
            });

            if (creditos < this.MIN_CREDITOS) {
                advertencias.push(`Créditos insuficientes: ${creditos}/${this.MIN_CREDITOS}. Faltan ${this.MIN_CREDITOS - creditos} créditos.`);
            }
            if (shCreds < this.MIN_SOCIAL_HUM) {
                advertencias.push(`Social Humanística insuficiente: ${shCreds}/${this.MIN_SOCIAL_HUM} créditos.`);
            }
            if (idiomaEquivalencia) {
                const idiomaCursos = this.cursos.filter(c => c.esIdiomaTecnico);
                const idiomaCreditos = idiomaCursos.reduce((s, c) => s + c.creditos, 0);
                advertencias.push(`Equivalencia de idioma: ${idiomaCreditos} créditos de Idioma Técnico no contables.`);
            }

            const electivosSugeridos = [];
            cursosIds.forEach(id => {
                const curso = cursoById.get(id);
                if (curso && !curso.obligatorio) {
                    let motivo = 'Electivo sugerido';
                    if (curso.esSocialHum) motivo = 'Social Humanística';
                    else if (curso.esIdiomaTecnico) motivo = idiomaEquivalencia ? 'Idioma (equivalencia)' : 'Idioma Técnico';
                    electivosSugeridos.push({ id, codigo: curso.codigo, nombre: curso.nombre, creditos: curso.creditos, motivo });
                }
            });

            return {
                id: nombre.toLowerCase().replace(/\s+/g, '_'),
                nombre,
                criterio,
                cursos: [...cursosIds],
                semestres: opts.semestres || maxSemestre,
                creditosTotales: creditos,
                socialHumCreditos: shCreds,
                enRutaCritica,
                electivosSugeridos,
                advertencias,
                idiomaEquivalencia,
                ...opts
            };
        };

        const pathA = makePath(
            cursosA, 'Mas Rapida', 'Minimiza semestres hasta graduacion',
            holguraA, selMinima.creditosTotales, selMinima.socialHumCreditos,
            { semestres: Math.max(...[...cursosA].map(id => early.get(id) ?? 0)) }
        );

        const pathB = makePath(
            cursosA, 'Mas Flexible', `Distribuye carga (max ${maxCargaB} cr/sem, min ${minCargaB} cr/sem)`,
            holguraB, selMinima.creditosTotales, selMinima.socialHumCreditos,
            { semestres: maxSemB, maxCargaPorSemestre: maxCargaB, minCargaPorSemestre: minCargaB }
        );

        const pathC = makePath(
            cursosC, 'Balanceada', 'Incluye todos los electivos disponibles',
            holguraC, selCompleta.creditosTotales, selCompleta.socialHumCreditos,
            { semestres: Math.max(...[...cursosC].map(id => early.get(id) ?? 0)) }
        );

        this.rutas = [pathA, pathB, pathC];

        this.cursos.forEach(c => {
            c.semestreMasTemprano = early.get(c.id) ?? 0;
            c.semestreMasTardio = late.get(c.id) ?? 0;
        });

        return this.rutas;
    }

    setRutaActiva(index) {
        if (index >= 0 && index < this.rutas.length) {
            this.rutaActivaIndex = index;
            this._aplicarRutaActiva();
        }
    }

    _aplicarRutaActiva() {
        const ruta = this.rutas[this.rutaActivaIndex];
        if (!ruta) return;

        this.cursos.forEach(c => {
            c.enRutaCritica = ruta.enRutaCritica.has(c.id);
            c.enRuta = ruta.cursos.includes(c.id);
        });
    }

    getRutaActiva() {
        return this.rutas[this.rutaActivaIndex] || null;
    }

    getRutas() {
        return this.rutas;
    }

    calcularRutaCritica() {
        this.calcularRutasCriticas(false);
        this._aplicarRutaActiva();
    }
}