class NodoCurso {
    constructor(id, codigo, nombre, creditos, obligatorio, semestre, prerequisitos = []) {
        this.id = id;
        this.codigo = codigo;
        this.nombre = nombre;
        this.creditos = creditos;
        this.obligatorio = obligatorio;
        this.semestre = semestre;
        this.prerequisitos = prerequisitos;
        this.posrequisitos = [];
        this.x = 0;
        this.y = 0;
        this.selected = false;
        this.nivel = 0;
        this.semestreMasTemprano = 1;
        this.esCritico = false;
        this.highlighted = false;
        this.enRutaCritica = false;
        this.completado = false;
        this.disponible = false;
    }
}

const cursos = [
    new NodoCurso(1, "0005", "Técnicas de Estudio e Investigación", 3, true, 1, []),
    new NodoCurso(2, "0017", "Área Social Humanística 1", 3, true, 1, []),
    new NodoCurso(3, "0101", "Área Matemática Básica 1", 9, true, 1, []),
    new NodoCurso(4, "0006", "Idioma Técnico 1", 3, false, 1, []),
    new NodoCurso(5, "0039", "Deportes 1", 2, false, 1, []),
    new NodoCurso(6, "0019", "Área Social Humanística 2", 3, true, 2, [2]),
    new NodoCurso(7, "0103", "Área Matemática Básica 2", 9, true, 2, [3]),
    new NodoCurso(8, "0147", "Física Básica", 5, true, 2, [3]),
    new NodoCurso(9, "0960", "Matemática para Computación 1", 5, true, 2, [3]),
    new NodoCurso(11, "0008", "Idioma Técnico 2", 3, false, 2, [4]),
    new NodoCurso(12, "0040", "Deportes 2", 2, false, 2, [5]),
    new NodoCurso(13, "0107", "Área Matemática Intermedia 1", 9, true, 3, [7]),
    new NodoCurso(14, "0150", "Física", 5, true, 3, [7,8]),
    new NodoCurso(15, "0770", "Introducción a la Programación y Computación 1", 6, true, 3, [7, 8, 9]),
    new NodoCurso(16, "0795", "Lógica de Sistemas", 3, true, 3, [7, 8, 9]),
    new NodoCurso(17, "0962", "Matemática para Computación 2", 5, true, 3, [7, 8, 9]),
    new NodoCurso(18, "0001", "Ética Profesional", 2, false, 3, [6]),
    new NodoCurso(19, "0009", "Idioma Técnico 3", 3, false, 3, [11]),
    new NodoCurso(20, "0112", "Área Matemática Intermedia 2", 6, true, 4, [13]),
    new NodoCurso(21, "0114", "Área Matemática Intermedia 3", 6, true, 4, [13]),
    new NodoCurso(22, "0152", "Física 2", 6, true, 4, [13, 14]),
    new NodoCurso(23, "0771", "Introducción a la Programación y Computación 2", 6, true, 4, [9, 13, 15, 16]),
    new NodoCurso(24, "0796", "Lenguajes Formales y de Programación", 4, true, 4, [9, 15, 16]),
    new NodoCurso(25, "2025", "Prácticas Iniciales", 0, true, 4, [7, 15]),
    new NodoCurso(26, "0010", "Lógica", 1, false, 4, [6]),
    new NodoCurso(27, "0011", "Idioma Técnico 4", 3, false, 4, [19]),
    new NodoCurso(28, "0116", "Matemática Aplicada 3", 5, true, 5, [20, 21]),
    new NodoCurso(29, "0118", "Matemática Aplicada 1", 5, true, 5, [20, 21]),
    new NodoCurso(30, "0732", "Estadística 1", 5, true, 5, [1, 13]),
    new NodoCurso(31, "0772", "Estructuras de Datos", 6, true, 5, [17, 23, 24]),
    new NodoCurso(32, "0777", "Organización de Lenguajes y Compiladores 1", 6, true, 5, [17, 23, 24]),
    new NodoCurso(33, "0964", "Organización Computacional", 4, true, 5, [17, 22, 23]),
    new NodoCurso(34, "0018", "Filosofía de la Ciencia", 1, false, 5, [6]),
    new NodoCurso(35, "0014", "Economía", 3, true, 6, [30]),
    new NodoCurso(36, "0601", "Investigación de Operaciones 1", 6, true, 6, [23, 30]),
    new NodoCurso(37, "0722", "Teoría de Sistemas 1", 4, true, 6, [28, 29, 30, 31]),
    new NodoCurso(38, "0773", "Manejo e Implementación de Archivos", 5, true, 6, [24, 31]),
    new NodoCurso(39, "0778", "Arquitectura de Computadores y Ensambladores 1", 5, true, 6, [24, 33]),
    new NodoCurso(40, "0781", "Organización de Lenguajes y Compiladores 2", 6, true, 6, [31, 32]),
    new NodoCurso(41, "0120", "Matemática Aplicada 2", 5, false, 6, [29]),
    new NodoCurso(42, "0122", "Matemática Aplicada 4", 5, false, 6, [29]),
    new NodoCurso(43, "0200", "Ingeniería Eléctrica 1", 6, false, 6, [21,22]),
    new NodoCurso(44, "0281", "Sistemas Operativos 1", 6, true, 7, [39, 40]),
    new NodoCurso(45, "0603", "Investigación de Operaciones 2", 6, true, 7, [36]),
    new NodoCurso(46, "0724", "Teoría de Sistemas 2", 4, true, 7, [36, 37]),
    new NodoCurso(47, "0774", "Sistemas de Bases de Datos 1", 6, true, 7, [38]),
    new NodoCurso(48, "0779", "Arquitectura de Computadores y Ensambladores 2", 5, true, 7, [39]),
    new NodoCurso(49, "0970", "Redes de Computadoras 1", 5, true, 7, [38, 39]),
    new NodoCurso(50, "2036", "Prácticas Intermedias", 0, true, 7, [25, 32, 38, 39]),
    new NodoCurso(51, "0734", "Estadística 2", 5, false, 7, [30]),
    new NodoCurso(52, "0283", "Análisis y Diseño de Sistemas 1", 6, true, 8, [47]),
    new NodoCurso(53, "0285", "Sistemas Operativos 2", 4, true, 8, [44]),
    new NodoCurso(54, "0775", "Sistemas de Bases de Datos 2", 7, true, 8, [44, 47]),
    new NodoCurso(55, "0797", "Seminario de Sistemas 1", 5, true, 8, [44, 46, 47]),
    new NodoCurso(56, "0975", "Redes de Computadoras 2", 6, true, 8, [49]),
    new NodoCurso(57, "0700", "Ingeniería Económica 1", 4, false, 8, [30]),
    new NodoCurso(58, "0729", "Modelación y Simulación 1", 5, true, 9, [45, 46]),
    new NodoCurso(59, "0785", "Análisis y Diseño de Sistemas 2", 7, true, 9, [52]),
    new NodoCurso(60, "0786", "Sistemas Organizacionales y Gerenciales 1", 5, true, 9, [37, 52]),
    new NodoCurso(61, "0798", "Seminario de Sistemas 2", 5, true, 9, [53, 55]),
    new NodoCurso(62, "0972", "Inteligencia Artificial 1", 7, true, 9, [40, 46, 47]),
    new NodoCurso(63, "2009", "Prácticas Finales Ingeniería Ciencias y Sistemas", 0, false, 9, [50, 52, 53, 56]),
    new NodoCurso(64, "0776", "Bases de Datos Avanzadas", 5, true, 9, [54]),
    new NodoCurso(65, "0788", "Sistemas Aplicados 1", 5, true, 9, [52]),
    new NodoCurso(66, "0966", "Seguridad y Auditoría de Redes de Computadoras", 3, false, 9, [56]),
    new NodoCurso(67, "0720", "Modelación y Simulación 2", 6, true, 10, [58]),
    new NodoCurso(68, "0780", "Software Avanzado", 8, true, 10, [59]),
    new NodoCurso(69, "0787", "Sistemas Organizacionales y Gerenciales 2", 6, true, 10, [60]),
    new NodoCurso(70, "0799", "Seminario de Investigación", 3, true, 10, [59, 60, 61]),
    new NodoCurso(71, "0735", "Auditoría de Proyectos de Software", 6, false, 10, [59]),
    new NodoCurso(72, "0789", "Sistemas Aplicados 2", 5, false, 10, [59,65]),
    new NodoCurso(73, "0790", "Emprendedores de Negocios Informáticos", 6, false, 10, [60]),
    new NodoCurso(74, "0968", "Inteligencia Artificial 2", 5, false, 10, [62]),
    new NodoCurso(75, "0974", "Redes de Nueva Generación", 3, false, 10, [56]),
    new NodoCurso(76, "7999", "Seminario de Investigación E.P.S. Sistemas", 3, false, 10, [59, 60, 61]),
];

let selectedNode = null;
let showOptional = true;
let currentLayout = 'horizontal';
let viewMode = 'topological'; 
let showCriticalPath = false;
let temaOscuro = false;

const nodeWidth = 140;
const nodeHeight = 90;
let scale = 1.0;

let isDragging = false;
let startX, startY;
let translateX = 0, translateY = 0;

let tooltipEl = null;

const cursoMap = new Map();
cursos.forEach(curso => cursoMap.set(curso.id, curso));

function calcularPosrequisitos() {
    cursos.forEach(curso => {
        curso.prerequisitos.forEach(prereqId => {
            const prereq = cursoMap.get(prereqId);
            if (prereq && !prereq.posrequisitos.includes(curso.id)) {
                prereq.posrequisitos.push(curso.id);
            }
        });
    });
}

function calcularSemestreMasTemprano() {
    let changed = true;
    
    cursos.forEach(c => c.semestreMasTemprano = 1);

    while(changed) {
        changed = false;
        cursos.forEach(curso => {
            let maxPrereqSemestre = 0;
            curso.prerequisitos.forEach(pid => {
                const p = cursoMap.get(pid);
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

function calcularRutaCritica() {
    calcularSemestreMasTemprano();
    
    const maxSemestre = Math.max(...cursos.map(c => c.semestreMasTemprano));
    
    cursos.forEach(c => c.enRutaCritica = false);
    
    let nodosCandidatos = cursos.filter(c => c.semestreMasTemprano === maxSemestre);
    
    const visitados = new Set();
    const cola = [...nodosCandidatos];
    
    while(cola.length > 0) {
        const actual = cola.shift();
        if(visitados.has(actual.id)) continue;
        visitados.add(actual.id);
        
        actual.enRutaCritica = true;
        
        actual.prerequisitos.forEach(pid => {
            const prereq = cursoMap.get(pid);
            if(prereq && prereq.semestreMasTemprano === actual.semestreMasTemprano - 1) {
                cola.push(prereq);
            }
        });
    }
}

calcularPosrequisitos();
calcularRutaCritica();

function calcularNivelesTopologicos() {
    const indegree = new Map();
    const niveles = new Map();
    const queue = [];
    
    const cursosVisibles = cursos.filter(curso => showOptional || curso.obligatorio);
    
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
            const posreq = cursoMap.get(posreqId);
            if (!posreq || (!showOptional && !posreq.obligatorio)) return;
            
            indegree.set(posreqId, indegree.get(posreqId) - 1);
            if (indegree.get(posreqId) === 0) {
                queue.push({ curso: posreq, nivel: nivel + 1 });
            }
        });
    }
    
    return niveles;
}

function calcularNivelesPorSemestre() {
    const niveles = new Map();
    const cursosVisibles = cursos.filter(curso => showOptional || curso.obligatorio);
    
    cursosVisibles.forEach(curso => {
        const sem = curso.semestre;
        if(!niveles.has(sem)) niveles.set(sem, []);
        niveles.get(sem).push(curso.id);
        curso.nivel = sem; 
    });
    
    return niveles;
}

function ordenarNodosEnNivel(nivel) {
    return nivel.sort((a, b) => {
        const cursoA = cursoMap.get(a);
        const cursoB = cursoMap.get(b);
        return cursoA.codigo.localeCompare(cursoB.codigo);
    });
}

function calcularLayout() {
    let nivelesMap;
    
    if(viewMode === 'semester') {
        nivelesMap = calcularNivelesPorSemestre();
    } else {
        nivelesMap = calcularNivelesTopologicos();
    }

    const niveles = Array.from(nivelesMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, nodos]) => ordenarNodosEnNivel(nodos));
    
    const isVertical = currentLayout === 'vertical';
    const gapX = isVertical ? 80 : 300; 
    const gapY = isVertical ? 100 : 20;

    niveles.forEach((nivel, levelIndex) => {
        const nodesInLevel = nivel.length;
        
        nivel.forEach((nodeId, nodeIndex) => {
            const curso = cursoMap.get(nodeId);
            
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

function dividirTextoEnLineas(texto, maxChars) {
    const palabras = texto.split(' ');
    const lineas = [];
    let lineaActual = '';
    
    palabras.forEach(palabra => {
        if ((lineaActual + ' ' + palabra).length <= maxChars) {
            lineaActual += (lineaActual ? ' ' : '') + palabra;
        } else {
            if (lineaActual) lineas.push(lineaActual);
            lineaActual = palabra;
        }
    });
    
    if (lineaActual) lineas.push(lineaActual);
    return lineas.slice(0, 3);
}

function encontrarRutaHastaCurso(cursoObjetivo) {
    const visitados = new Set();
    const ruta = new Set();
    
    function buscarPrerequisitos(curso) {
        if (visitados.has(curso.id)) return;
        visitados.add(curso.id);
        ruta.add(curso.id);
        
        curso.prerequisitos.forEach(prereqId => {
            const prereq = cursoMap.get(prereqId);
            if (prereq) {
                buscarPrerequisitos(prereq);
            }
        });
    }
    
    buscarPrerequisitos(cursoObjetivo);
    return ruta;
}

function dibujarArista(graphGroup, fromNode, toNode) {
    const svgNS = "http://www.w3.org/2000/svg";
    const path = document.createElementNS(svgNS, "path");
    
    let fromX, fromY, toX, toY, d;

    const fromHighlighted = fromNode.highlighted || fromNode.selected;
    const toHighlighted = toNode.highlighted || toNode.selected;
    const aristaEnRutaActiva = fromHighlighted && toHighlighted;
    const aristaCritica = showCriticalPath && fromNode.enRutaCritica && toNode.enRutaCritica;

    if (currentLayout === 'vertical') {
        fromX = fromNode.x + nodeWidth / 2;
        fromY = fromNode.y + nodeHeight;
        toX = toNode.x + nodeWidth / 2;
        toY = toNode.y;
        
        const controlY1 = fromY + (toY - fromY) * 0.4;
        const controlY2 = fromY + (toY - fromY) * 0.6;
        d = `M ${fromX} ${fromY} C ${fromX} ${controlY1}, ${toX} ${controlY2}, ${toX} ${toY}`;
    } else {
        fromX = fromNode.x + nodeWidth;
        fromY = fromNode.y + nodeHeight / 2;
        toX = toNode.x;
        toY = toNode.y + nodeHeight / 2;
        
        const controlX1 = fromX + (toX - fromX) * 0.4;
        const controlX2 = fromX + (toX - fromX) * 0.6;
        d = `M ${fromX} ${fromY} C ${controlX1} ${fromY}, ${controlX2} ${toY}, ${toX} ${toY}`;
    }
    
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    
    if (selectedNode && fromNode.id === selectedNode.id) {
        path.setAttribute("stroke", "#f39c12");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-dasharray", "5,5");
        path.setAttribute("marker-end", "url(#arrowhead-yellow)");
    } else if (selectedNode && aristaEnRutaActiva) {
        path.setAttribute("stroke", temaOscuro ? "#95a5a6" : "#2c3e50");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("marker-end", "url(#arrowhead)");
    } else if (aristaCritica) {
        path.setAttribute("stroke", "#e74c3c");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-dasharray", "5,5");
    } else {
        path.setAttribute("stroke", temaOscuro ? "#7f8c8d" : "#bdc3c7");
        path.setAttribute("stroke-width", "1");
        path.setAttribute("opacity", temaOscuro ? "0.5" : "0.4");
    }
    
    graphGroup.appendChild(path);
}

function guardarProgreso() {
    const estado = cursos.map(c => ({ id: c.id, completado: c.completado }));
    localStorage.setItem('pemtree_progreso', JSON.stringify(estado));
}

function cargarProgreso() {
    const guardado = localStorage.getItem('pemtree_progreso');
    if (guardado) {
        const estado = JSON.parse(guardado);
        estado.forEach(item => {
            const curso = cursoMap.get(item.id);
            if (curso) curso.completado = item.completado;
        });
    }
    actualizarDisponibilidad();
    actualizarContadorCreditos();
}

function actualizarDisponibilidad() {
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

function marcarPrerequisitosComoCompletados(curso) {
    curso.prerequisitos.forEach(prereqId => {
        const prereq = cursoMap.get(prereqId);
        if (prereq && !prereq.completado) {
            prereq.completado = true;
            marcarPrerequisitosComoCompletados(prereq);
        }
    });
}

function toggleCompletado(cursoId) {
    const curso = cursoMap.get(cursoId);
    if (curso) {
        const nuevoEstado = !curso.completado;
        curso.completado = nuevoEstado;
        
        if (nuevoEstado) {
            marcarPrerequisitosComoCompletados(curso);
        }

        guardarProgreso();
        actualizarDisponibilidad();
        actualizarContadorCreditos();
        
        const graphGroup = document.getElementById('grafica-group');
        if (graphGroup) dibujarGrafo(graphGroup);
        
        if (selectedNode && selectedNode.id === cursoId) {
            actualizarInfoNodo(curso);
        }
    }
}

function actualizarContadorCreditos() {
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

function mostrarTooltip(e, curso) {
    // Si la pantalla es menor a 768px (móvil), NO mostrar el tooltip
    if (window.innerWidth <= 768) return;

    if (!tooltipEl) return;
    tooltipEl.textContent = `${curso.codigo} - ${curso.nombre}`;
    tooltipEl.style.display = 'block';
    moverTooltip(e);
}

function moverTooltip(e) {
    if (!tooltipEl) return;
    
    const offset = 15;
    tooltipEl.style.left = (e.clientX + offset) + 'px';
    tooltipEl.style.top = (e.clientY + offset) + 'px';
}

function ocultarTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
}

function dibujarNodo(graphGroup, curso) {
    const svgNS = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(svgNS, "g");
    
    let fillColor, strokeColor, strokeWidth;
    
    const isCriticalView = showCriticalPath && curso.enRutaCritica;
    
    // Colores base según el tema
    const baseColors = temaOscuro ? {
        fill: '#2c3e50',
        stroke: '#34495e',
        text: '#ecf0f1',
        completado: '#27ae60',
        disponible: '#3498db',
        bloqueado: '#7f8c8d',
        selected: '#e67e22',
        highlighted: '#f39c12',
        critical: '#e74c3c'
    } : {
        fill: 'white',
        stroke: '#ccc',
        text: '#555',
        completado: '#1e8449',
        disponible: '#3498db',
        bloqueado: '#bdc3c7',
        selected: '#e67e22',
        highlighted: '#f39c12',
        critical: '#e74c3c'
    };

    if (curso.selected) {
        fillColor = "#fff";
        strokeColor = "#2c3e50";
        strokeWidth = "3";
    } else if (curso.completado) {
        fillColor = "#d4efdf"; 
        strokeColor = "#27ae60";
        strokeWidth = "2";
    } else if (curso.disponible) {
        fillColor = "#fff";
        strokeColor = "#f39c12"; 
        strokeWidth = "3"; 
    } else if (curso.highlighted) {
        fillColor = "#e8f6f3";
        strokeColor = "#14ab85";
        strokeWidth = "2";
    } else if (isCriticalView) {
        fillColor = "#fdedec";
        strokeColor = "#e74c3c";
        strokeWidth = "2";
    } else {
        fillColor = "#f4f6f7"; 
        strokeColor = "#bdc3c7"; 
        strokeWidth = "1";
    }
    
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", curso.x);
    rect.setAttribute("y", curso.y);
    rect.setAttribute("width", nodeWidth);
    rect.setAttribute("height", nodeHeight);
    rect.setAttribute("rx", "8");
    rect.setAttribute("ry", "8");
    rect.setAttribute("fill", fillColor);
    rect.setAttribute("stroke", strokeColor);
    rect.setAttribute("stroke-width", strokeWidth);
    rect.setAttribute("class", "node-rect");
    
    if (curso.disponible && !curso.selected) {
        rect.setAttribute("stroke-dasharray", "5,2"); 
    }

    rect.addEventListener("click", (e) => {
        e.stopPropagation();
        seleccionarNodo(curso, graphGroup);
    });

    group.addEventListener('mouseenter', (e) => mostrarTooltip(e, curso));
    group.addEventListener('mousemove', (e) => moverTooltip(e));
    group.addEventListener('mouseleave', () => ocultarTooltip());
    
    group.appendChild(rect);
    
    const textCodigo = document.createElementNS(svgNS, "text");
    textCodigo.setAttribute("x", curso.x + nodeWidth / 2);
    textCodigo.setAttribute("y", curso.y + 20);
    textCodigo.setAttribute("font-family", "Segoe UI, Arial");
    textCodigo.setAttribute("font-size", "12");
    textCodigo.setAttribute("text-anchor", "middle");
    textCodigo.setAttribute("font-weight", "bold");
    textCodigo.setAttribute("fill", curso.completado ? (temaOscuro ? "#2ecc71" : "#1e8449") : (temaOscuro ? "#ecf0f1" : "#555"));
    textCodigo.textContent = curso.codigo;
    
    if(curso.completado) {
        textCodigo.textContent += " ✓";
    }
    
    group.appendChild(textCodigo);
    
    const nombreLines = dividirTextoEnLineas(curso.nombre, 18);
    nombreLines.forEach((line, index) => {
        const textLine = document.createElementNS(svgNS, "text");
        textLine.setAttribute("x", curso.x + nodeWidth / 2);
        textLine.setAttribute("y", curso.y + 40 + (index * 12));
        textLine.setAttribute("font-family", "Segoe UI, Arial");
        textLine.setAttribute("font-size", "10");
        textLine.setAttribute("text-anchor", "middle");
        textLine.setAttribute("fill", temaOscuro ? "#bdc3c7" : "#333");
        textLine.textContent = line;
        group.appendChild(textLine);
    });
    
    if (showCriticalPath && curso.enRutaCritica && !curso.completado) {
        const warning = document.createElementNS(svgNS, "text");
        warning.setAttribute("x", curso.x + nodeWidth - 15);
        warning.setAttribute("y", curso.y + 15);
        warning.setAttribute("fill", "#e74c3c");
        warning.setAttribute("font-size", "14");
        warning.setAttribute("font-weight", "bold");
        warning.textContent = "!";
        group.appendChild(warning);
    }

    graphGroup.appendChild(group);
}

function dibujarGrafo(graphGroup) {
    while (graphGroup.firstChild) {
        graphGroup.removeChild(graphGroup.firstChild);
    }
    
    calcularLayout();
    
    cursos.forEach(curso => {
        if (!showOptional && !curso.obligatorio) return;
        
        curso.posrequisitos.forEach(posreqId => {
            const posreq = cursoMap.get(posreqId);
            if (!posreq || (!showOptional && !posreq.obligatorio)) return;
            dibujarArista(graphGroup, curso, posreq);
        });
    });
    
    cursos.forEach(curso => {
        if (!showOptional && !curso.obligatorio) return;
        dibujarNodo(graphGroup, curso);
    });

    const svg = document.getElementById('svg-grafica');
    ajustarTamanioSVG(svg);
}

function seleccionarNodo(curso, graphGroup) {
    if (selectedNode) {
        selectedNode.selected = false;
    }
    
    curso.selected = true;
    selectedNode = curso;
    
    cursos.forEach(c => c.highlighted = false);
    const ruta = encontrarRutaHastaCurso(curso);
    ruta.forEach(id => {
        const c = cursoMap.get(id);
        if(c) c.highlighted = true;
    });

    actualizarInfoNodo(curso);
    dibujarGrafo(graphGroup);
}

function actualizarInfoNodo(curso) {
    const infoCard = document.getElementById('infoCard');
    const content = infoCard.querySelector('.node-details-content');
    
    infoCard.classList.remove('hidden');
    
    const getNames = (ids) => ids.map(id => {
        const c = cursoMap.get(id);
        const statusColor = c.completado ? '#27ae60' : (c.disponible ? '#f39c12' : '#7f8c8d');
        return c ? `<span class="badge" data-id="${c.id}" style="color:${statusColor}; border:1px solid ${statusColor}20" title="${c.nombre}">${c.codigo}</span>` : '';
    }).join(' ') || '<span style="color:#999; font-size:0.8em">Ninguno</span>';
    
    const estadoTexto = curso.completado ? 'Completado' : (curso.disponible ? 'Disponible' : 'Bloqueado');
    const estadoClase = curso.completado ? 'estado-disponible' : (curso.disponible ? 'estado-disponible' : 'estado-bloqueado');
    
    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
            <h3 style="margin:0; border:none;">${curso.codigo}</h3>
            <span class="estado-badge ${estadoClase}">${estadoTexto}</span>
        </div>
        <div style="color:var(--primary); font-weight:bold; margin-bottom:10px; font-size:1.1em; line-height:1.2;">
            ${curso.nombre}
        </div>

        <div class="detail-row">
            <span><strong>Créditos:</strong> ${curso.creditos}</span>
            <span><strong>Semestre:</strong> ${curso.semestre}</span>
        </div>
        
        <button class="btn-completar ${curso.completado ? 'completado' : 'no-completado'}" 
                onclick="toggleCompletado(${curso.id})">
            ${curso.completado ? 
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Completado' : 
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> Marcar como Ya Cursado'}
        </button>

        <div style="margin-top:15px;">
            <strong style="font-size:0.85rem">Prerrequisitos:</strong>
            <div class="badges">${getNames(curso.prerequisitos)}</div>
        </div>
        
        <div style="margin-top:8px;">
            <strong style="font-size:0.85rem">Habilita:</strong>
            <div class="badges">${getNames(curso.posrequisitos)}</div>
        </div>
        
        ${curso.enRutaCritica && !curso.completado ? '<div class="alert-critical" style="margin-top:10px;">⚠️ Curso Crítico Pendiente</div>' : ''}
    `;

    content.querySelectorAll('.badge').forEach(badge => {
        badge.addEventListener('mouseenter', (e) => {
            const id = badge.getAttribute('data-id');
            const cursoRel = cursoMap.get(parseInt(id));
            if(cursoRel) mostrarTooltip(e, cursoRel);
        });
        badge.addEventListener('mousemove', moverTooltip);
        badge.addEventListener('mouseleave', ocultarTooltip);
    });
}

function cerrarInfo() {
    document.getElementById('infoCard').classList.add('hidden');
    if (selectedNode) {
        selectedNode.selected = false;
        selectedNode = null;
        cursos.forEach(c => c.highlighted = false);
        const graphGroup = document.getElementById('grafica-group');
        if(graphGroup) dibujarGrafo(graphGroup);
    }
}

function crearFlecha(svg) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");
    
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
    polygon.setAttribute("fill", "#2c3e50");
    
    marker.appendChild(polygon);
    
    const markerYellow = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    markerYellow.setAttribute("id", "arrowhead-yellow");
    markerYellow.setAttribute("markerWidth", "10");
    markerYellow.setAttribute("markerHeight", "7");
    markerYellow.setAttribute("refX", "9");
    markerYellow.setAttribute("refY", "3.5");
    markerYellow.setAttribute("orient", "auto");
    
    const polygonYellow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygonYellow.setAttribute("points", "0 0, 10 3.5, 0 7");
    polygonYellow.setAttribute("fill", "#f39c12");
    
    markerYellow.appendChild(polygonYellow);
    
    defs.appendChild(marker);
    defs.appendChild(markerYellow);
    svg.appendChild(defs);
}

function ajustarTamanioSVG(svg) {
    let maxX = 0, maxY = 0;
    
    cursos.forEach(c => {
        if(!showOptional && !c.obligatorio) return;
        maxX = Math.max(maxX, c.x + nodeWidth);
        maxY = Math.max(maxY, c.y + nodeHeight);
    });

    svg.setAttribute("width", `${Math.max(maxX + 100, 2000)}px`);
    svg.setAttribute("height", `${Math.max(maxY + 100, 2000)}px`);
}

function initPanZoom(svg) {
    const container = document.querySelector('.contenedor-grafica');
    
    container.addEventListener('click', (e) => {
        if(e.target.tagName !== 'rect' && e.target.tagName !== 'text' && !e.target.closest('.floating-card')) {
            cerrarInfo();
        }
    });

    container.addEventListener('mousedown', (e) => {
        if(e.target.closest('.floating-card')) return;
        if(e.target.tagName === 'rect' || e.target.tagName === 'text') return;
        
        e.preventDefault();

        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        actualizarTransform();
    });
}

function actualizarTransform() {
    const graphGroup = document.getElementById('grafica-group');
    if(graphGroup) {
        graphGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
    }
    document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
}

function inicializarGrafo() {
    const graphContainer = document.getElementById('grafica');
    if (!graphContainer) return;
    
    graphContainer.innerHTML = '';
    
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("id", "svg-grafica");
    graphContainer.appendChild(svg);
    
    const graphGroup = document.createElementNS(svgNS, "g");
    graphGroup.setAttribute("id", "grafica-group");
    svg.appendChild(graphGroup);
    
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'curso-tooltip';
    document.body.appendChild(tooltipEl);
    
    crearFlecha(svg);
    cargarPreferenciaTema();
    setupControls(graphGroup); 
    cargarProgreso();
    dibujarGrafo(graphGroup);
    initPanZoom(svg);
    
    initTouchEvents();
    setupMobileMenus();
}

function normalizarTexto(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function setupSearch(graphGroup) {
    const searchInput = document.getElementById('buscadorCurso');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = normalizarTexto(e.target.value);
        if (term.length < 2) return; 
        
        const resultados = cursos.filter(c => {
            const codigo = normalizarTexto(c.codigo);
            const nombre = normalizarTexto(c.nombre);
            return codigo.includes(term) || nombre.includes(term);
        });
        
        if (resultados.length > 0) {
            resultados.sort((a, b) => {
                const nombreA = normalizarTexto(a.nombre);
                const nombreB = normalizarTexto(b.nombre);
                
                if (nombreA === term) return -1;
                if (nombreB === term) return 1;
                
                const aStarts = nombreA.startsWith(term);
                const bStarts = nombreB.startsWith(term);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                
                return a.nombre.length - b.nombre.length;
            });
            
            const mejorCoincidencia = resultados[0];
            
            if (!showOptional && !mejorCoincidencia.obligatorio) {
                showOptional = true;
                document.getElementById('cursosObligatorios').innerHTML = "Optativos";
                dibujarGrafo(graphGroup);
            }
            
            seleccionarNodo(mejorCoincidencia, graphGroup);
            centrarEnNodo(mejorCoincidencia);
        }
    });
}

function centrarEnNodo(curso) {
    const container = document.querySelector('.contenedor-grafica');
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    scale = 1.2;
    
    const nodeCenterX = curso.x + nodeWidth / 2;
    const nodeCenterY = curso.y + nodeHeight / 2;
    
    translateX = (width / 2) - (nodeCenterX * scale);
    translateY = (height / 2) - (nodeCenterY * scale);
    
    actualizarTransform();
}

function toggleTemaOscuro() {
    temaOscuro = !temaOscuro;
    const container = document.querySelector('.contenedor-grafica');
    const btnTema = document.getElementById('toggleTema');
    
    if (temaOscuro) {
        container.classList.add('tema-oscuro');
        btnTema.classList.add('active');
    } else {
        container.classList.remove('tema-oscuro');
        btnTema.classList.remove('active');
    }
    
    const graphGroup = document.getElementById('grafica-group');
    if (graphGroup) {
        dibujarGrafo(graphGroup);
    }
    
    // Guardar preferencia
    localStorage.setItem('pemtree_tema', temaOscuro ? 'oscuro' : 'claro');
}

function cargarPreferenciaTema() {
    const temaGuardado = localStorage.getItem('pemtree_tema');
    if (temaGuardado === 'oscuro') {
        temaOscuro = true;
        const container = document.querySelector('.contenedor-grafica');
        const btnTema = document.getElementById('toggleTema');
        if (container) container.classList.add('tema-oscuro');
        if (btnTema) btnTema.classList.add('active');
    }
}

function setupControls(graphGroup) {
    const barra = document.querySelector('.barraHerramienta');
    if(barra) {
        if(!document.getElementById('creditos-display')) {
            const divCreditos = document.createElement('div');
            divCreditos.id = 'creditos-display';
            divCreditos.className = 'creditos-counter';
            divCreditos.innerHTML = '<span>Créditos: 0</span>';
            
            const zoomGroup = barra.querySelector('.zoom-group');
            if(zoomGroup) {
                barra.insertBefore(divCreditos, zoomGroup);
            } else {
                barra.appendChild(divCreditos);
            }
        }
    }
    
    setupSearch(graphGroup);
    
    document.getElementById('toggleTema').addEventListener('click', toggleTemaOscuro);

    document.getElementById('vistaRecetear').addEventListener('click', () => {
        if(confirm("¿Estás seguro de que quieres borrar todo el progreso y reiniciar la vista?")) {
            cursos.forEach(c => c.completado = false);
            localStorage.removeItem('pemtree_progreso');
            
            cerrarInfo();
            
            actualizarDisponibilidad();
            actualizarContadorCreditos();
            
            showOptional = true;
            showCriticalPath = false;
            viewMode = 'topological';
            currentLayout = 'horizontal';
            
            document.getElementById('cursosObligatorios').innerHTML = "Optativos";
            document.getElementById('btnRutaCritica').classList.remove('active');
            document.getElementById('btnVistaSemestre').classList.remove('active');
            
            const searchInput = document.getElementById('buscadorCurso');
            if(searchInput) searchInput.value = '';
            
            scale = 1.0;
            translateX = 0;
            translateY = 0;
            actualizarTransform();

            dibujarGrafo(graphGroup);
        }
    });

    document.getElementById('cursosObligatorios').addEventListener('click', (e) => {
        showOptional = !showOptional;
        e.target.innerHTML = showOptional ? "Optativos" : "Optativos (Ocultos)";
        dibujarGrafo(graphGroup);
    });
    
    document.getElementById('btnRutaCritica').addEventListener('click', (e) => {
        showCriticalPath = !showCriticalPath;
        e.target.classList.toggle('active');
        dibujarGrafo(graphGroup);
    });

    document.getElementById('btnVistaSemestre').addEventListener('click', (e) => {
        viewMode = viewMode === 'topological' ? 'semester' : 'topological';
        e.target.classList.toggle('active');
        dibujarGrafo(graphGroup);
    });

    document.getElementById('disposicionVertical').addEventListener('click', () => {
        currentLayout = 'vertical';
        dibujarGrafo(graphGroup);
    });

    document.getElementById('disposicionHorizontal').addEventListener('click', () => {
        currentLayout = 'horizontal';
        dibujarGrafo(graphGroup);
    });

    const btnEntrar = document.getElementById('btnEntrarGrafo');
    const btnSalir = document.getElementById('btnSalirGrafo');
    const contenedorApp = document.getElementById('contenedorApp');
    const rutasPreview = document.getElementById('rutas-vista');
    
    btnEntrar.addEventListener('click', () => {
        contenedorApp.style.display = 'flex'; 
        
        setTimeout(() => {
            contenedorApp.classList.add('pantalla-completa');
            document.body.classList.add('no-scroll'); 
            
            const svg = document.getElementById('svg-grafica');
            if(svg) ajustarTamanioSVG(svg); 
        }, 10);
    });

    btnSalir.addEventListener('click', () => {
        contenedorApp.classList.remove('pantalla-completa');
        document.body.classList.remove('no-scroll');
        
        setTimeout(() => {
            contenedorApp.style.display = 'none';
        }, 200);
    });

    document.getElementById('zoomIn').addEventListener('click', () => {
        scale = Math.min(scale * 1.2, 3.0);
        actualizarTransform();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        scale = Math.max(scale / 1.2, 0.3);
        actualizarTransform();
    });
    
    document.getElementById('zoomReset').addEventListener('click', () => {
        scale = 1.0;
        translateX = 0;
        translateY = 0;
        actualizarTransform();
    });

    function adaptarInterfazMovil() {
        const isMobile = window.innerWidth <= 768;
        const buscador = document.getElementById('buscador');
        const creditos = document.getElementById('creditos-display');
        const barra = document.getElementById('barraHerramienta');
        const app = document.getElementById('contenedorApp');
        
        if (!buscador || !creditos || !barra || !app) return;

        if (isMobile) {
            if (buscador.parentElement !== app) {
                app.appendChild(buscador);
                app.appendChild(creditos);
                
                buscador.classList.add('modo-flotante');
                creditos.classList.add('modo-flotante');
            }
        } else {
            if (buscador.parentElement !== barra) {
                const closeBtn = document.getElementById('close-tools-btn');
                if (closeBtn && closeBtn.nextSibling) {
                    barra.insertBefore(buscador, closeBtn.nextSibling);
                } else {
                    barra.prepend(buscador);
                }

                const zoomGroup = barra.querySelector('.zoom-group');
                if (zoomGroup) {
                    barra.insertBefore(creditos, zoomGroup);
                } else {
                    barra.appendChild(creditos);
                }

                buscador.classList.remove('modo-flotante');
                creditos.classList.remove('modo-flotante');
            }
        }
    }

    adaptarInterfazMovil();
    window.addEventListener('resize', adaptarInterfazMovil);
}

function initTouchEvents() {
    const container = document.querySelector('.contenedor-grafica');
    
    container.addEventListener('touchstart', (e) => {
        if(e.target.closest('.floating-card')) return;
        if(e.target.tagName === 'rect' || e.target.tagName === 'text') return;

        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        if (e.cancelable) e.preventDefault(); 
        
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        actualizarTransform();
    }, { passive: false });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function setupMobileMenus() {
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    
    if(navToggle && navLinks) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
        });
    }

    const toolsToggle = document.getElementById('tools-toggle');
    const barraHerramienta = document.getElementById('barraHerramienta');
    const closeToolsBtn = document.getElementById('close-tools-btn');

    if(toolsToggle && barraHerramienta) {
        toolsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            barraHerramienta.classList.add('active');
        });

        if(closeToolsBtn) {
            closeToolsBtn.addEventListener('click', () => {
                barraHerramienta.classList.remove('active');
            });
        }
    }

    document.addEventListener('click', (e) => {
        if(navLinks && navLinks.classList.contains('active')) {
            if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        }

        if(barraHerramienta && barraHerramienta.classList.contains('active')) {
            if (!barraHerramienta.contains(e.target) && !toolsToggle.contains(e.target)) {
                barraHerramienta.classList.remove('active');
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', inicializarGrafo);